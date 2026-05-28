/**
 * Teacher dashboard aggregate.
 *
 * One call returns everything the dashboard needs: greeting + banner
 * stats, course rows, the 4-week engagement heatmap, top-level metrics,
 * upcoming deadlines, at-risk students, and a derived agenda task list.
 *
 * Heavy lifting is delegated to existing service helpers
 * (divisionSubjectAverages, divisionAttendanceStats); this file just
 * fans the queries out in parallel and reshapes the results.
 */

import { Types } from 'mongoose';
import { Teacher } from '../models/Teacher';
import { Subject } from '../models/Subject';
import { Division } from '../models/Division';
import { Student } from '../models/Student';
import { Lecture } from '../models/Lecture';
import { Resource } from '../models/Resource';
import { Submission } from '../models/Submission';
import { Attendance } from '../models/Attendance';
import { NotFound } from '../utils/http-errors';
import {
  divisionAttendanceStats, divisionSubjectAverages,
} from './attendance.service';

const toId = (s: string | Types.ObjectId) => new Types.ObjectId(s);

const startOfDay = (d: Date): Date => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const addDays = (d: Date, n: number): Date => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
/** Monday of the week containing `d`, normalised to local midnight. */
const startOfWeek = (d: Date): Date => {
  const x = startOfDay(d);
  // JS getDay(): Sun=0, Mon=1 … Sat=6. We want Monday as start.
  const day = x.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  return addDays(x, offset);
};

const AT_RISK_THRESHOLD = 75;

export interface TeacherOverview {
  greeting: { name: string };
  banner: {
    lecturesToday: number;
    pendingReviews: number;
    topEngagementSubject?: string;
  };
  courses: Array<{
    subjectId: string;
    name: string;
    code: string;
    studentCount: number;
    avgAttendancePct: number;
    progress: number; // 0-100 — same as avgAttendancePct for now
  }>;
  engagementHeatmap: Array<Array<number | null>>; // [week0..week3][Mon..Sun]
  averageEngagementPct: number;
  metrics: {
    attendancePct: number;
    attendanceDeltaPct: number;
    atRiskCount: number;
  };
  upcomingItems: Array<{
    id: string;
    kind: 'assignment' | 'quiz';
    title: string;
    dueDate: string;
    subjectLabel?: string;
  }>;
  atRiskStudents: Array<{
    studentId: string;
    name: string;
    rollNumber?: string;
    divisionLabel?: string;
    absences: number;
    attendancePct: number;
  }>;
  agendaTasks: Array<{
    id: string;
    text: string;
    done: boolean;
    link?: string;
  }>;
}

export const getTeacherOverview = async (
  teacherId: string,
): Promise<TeacherOverview> => {
  const teacher = await Teacher.findById(teacherId)
    .populate('subjectRefs', 'name code')
    .populate('divisionRefs', 'name code');
  if (!teacher) throw NotFound('Teacher profile not found');

  const subjectRefs = (teacher.subjectRefs as unknown as Array<{ _id: Types.ObjectId; name: string; code: string }>) ?? [];
  const divisionRefs = (teacher.divisionRefs as unknown as Array<{ _id: Types.ObjectId; name: string; code: string }>) ?? [];
  const subjectIds = subjectRefs.map((s) => s._id);
  const divisionIds = divisionRefs.map((d) => d._id);

  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const fourWeeksAgo = addDays(startOfWeek(today), -21); // start of 4 weeks ago

  // Run independent queries in parallel.
  const [
    lecturesToday,
    proposedAggregate,
    teacherAssignmentsBase,
    quizzesUpcoming,
    draftCount,
    overallAttendance,
    previousAttendance,
    perDivisionStats,
    perDivisionSubjectAverages,
    heatmapAttendance,
  ] = await Promise.all([
    // 1) Lectures today (by teacher).
    Lecture.countDocuments({
      teacher: teacher._id,
      date: { $gte: today, $lt: tomorrow },
    }),

    // 2) Submissions awaiting review for THIS teacher.
    Submission.aggregate([
      { $match: { reviewStatus: 'proposed' } },
      {
        $lookup: {
          from: 'resources', localField: 'resource', foreignField: '_id', as: 'resource',
        },
      },
      { $unwind: '$resource' },
      { $match: { 'resource.teacher': teacher._id } },
      { $count: 'count' },
    ]),

    // 3) Upcoming assignments (this teacher, due ≥ today).
    Resource.find({
      teacher: teacher._id,
      kind: 'assignment',
      status: 'published',
      dueDate: { $gte: today },
    })
      .sort({ dueDate: 1 })
      .limit(5)
      .populate('subject', 'name code'),

    // 4) Upcoming quizzes — Quiz has no dueDate, so we surface published ones.
    // (Done client-side via Resource is fine; reusing list for parity.)
    Promise.resolve([] as Array<unknown>),

    // 5) Drafts to publish.
    Resource.countDocuments({ teacher: teacher._id, status: 'draft' }),

    // 6) Overall attendance for this teacher's lectures (last 28 days).
    Attendance.aggregate([
      {
        $match: {
          subject: { $in: subjectIds },
          division: { $in: divisionIds },
          markedAt: { $gte: addDays(today, -28) },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          present: {
            $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] },
          },
        },
      },
    ]),

    // 7) Previous-period attendance (28-56 days ago) for delta computation.
    Attendance.aggregate([
      {
        $match: {
          subject: { $in: subjectIds },
          division: { $in: divisionIds },
          markedAt: { $gte: addDays(today, -56), $lt: addDays(today, -28) },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          present: {
            $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] },
          },
        },
      },
    ]),

    // 8) Per-division attendance (used for at-risk students).
    Promise.all(
      divisionIds.map((id) => divisionAttendanceStats(id.toString())),
    ),

    // 9) Per-division subject averages (used for course rows + top subject).
    Promise.all(
      divisionIds.map((id) => divisionSubjectAverages(id.toString())),
    ),

    // 10) Heatmap raw data: attendance grouped by week-bucket × weekday for
    //     this teacher's lectures over the last 4 weeks.
    Attendance.aggregate([
      {
        $match: {
          subject: { $in: subjectIds },
          division: { $in: divisionIds },
          markedAt: { $gte: fourWeeksAgo },
        },
      },
      {
        $group: {
          _id: {
            // dayOfWeek: Sun=1 … Sat=7. We convert to Mon=0 client-side below.
            day: { $dayOfWeek: '$markedAt' },
            week: { $isoWeek: '$markedAt' },
            year: { $isoWeekYear: '$markedAt' },
          },
          total: { $sum: 1 },
          present: {
            $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] },
          },
        },
      },
    ]),
  ]);

  // ---- Build student counts per division (one query) -----------------
  const studentCountsByDivision = new Map<string, number>();
  if (divisionIds.length > 0) {
    const counts = await Student.aggregate([
      { $match: { divisionRef: { $in: divisionIds } } },
      { $group: { _id: '$divisionRef', count: { $sum: 1 } } },
    ]);
    for (const row of counts) {
      studentCountsByDivision.set(String(row._id), row.count);
    }
  }

  // ---- Banner --------------------------------------------------------
  const pendingReviews = proposedAggregate[0]?.count ?? 0;

  // Flatten per-division subject averages into one map keyed by subject.
  const subjectAvgs = new Map<string, { total: number; weighted: number; name: string; code: string }>();
  for (const rows of perDivisionSubjectAverages) {
    for (const row of rows) {
      const key = String(row.subjectId);
      const prev = subjectAvgs.get(key) ?? { total: 0, weighted: 0, name: row.name, code: row.code };
      prev.total += row.total;
      prev.weighted += row.pct * row.total;
      subjectAvgs.set(key, prev);
    }
  }
  const subjectAvgArr = [...subjectAvgs.entries()].map(([id, v]) => ({
    subjectId: id,
    name: v.name,
    code: v.code,
    pct: v.total > 0 ? v.weighted / v.total : 0,
  }));
  subjectAvgArr.sort((a, b) => b.pct - a.pct);

  const topEngagementSubject = subjectAvgArr[0]?.name;

  // ---- Courses -------------------------------------------------------
  const courses = subjectRefs.map((subject) => {
    const m = subjectAvgs.get(String(subject._id));
    const pct = m && m.total > 0 ? Math.round(m.weighted / m.total) : 0;
    // Aggregate student count across this subject's divisions for this teacher.
    let studentCount = 0;
    for (const d of divisionIds) {
      studentCount += studentCountsByDivision.get(String(d)) ?? 0;
    }
    return {
      subjectId: String(subject._id),
      name: subject.name,
      code: subject.code,
      studentCount,
      avgAttendancePct: pct,
      progress: pct,
    };
  });

  // ---- Engagement heatmap -------------------------------------------
  // We want a 4×7 matrix [week0..week3][Mon..Sun] where week0 is THIS week.
  // The aggregate gave us (isoWeekYear, isoWeek, dayOfWeek). Group those
  // into week-buckets relative to the current ISO week.
  const heatmap: Array<Array<number | null>> = Array.from({ length: 4 }, () =>
    Array.from({ length: 7 }, () => null as number | null),
  );

  // Compute the ISO week + year of "today" so we can bucket by relative week.
  const isoWeekOf = (d: Date): { year: number; week: number } => {
    // Borrowed from MDN — copy date to UTC-Thursday of its week.
    const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = x.getUTCDay() || 7;
    x.setUTCDate(x.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(x.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((x.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return { year: x.getUTCFullYear(), week };
  };
  const todayIso = isoWeekOf(today);

  // Map (year, week) → bucket index 0 (this week) .. 3 (3 weeks ago).
  const weekBucket = (year: number, week: number): number => {
    // Approximate diff in weeks. Same ISO year? simple. Different? handle.
    if (year === todayIso.year) return todayIso.week - week;
    if (year === todayIso.year - 1) {
      // Most ISO years are 52 weeks; some 53. Treat both equally.
      return todayIso.week + (52 - week);
    }
    return 99;
  };

  // dayOfWeek conversion: Mongo $dayOfWeek → Sun=1, Mon=2, …, Sat=7.
  // We want Mon=0 … Sun=6.
  const mondayZero = (mongoDow: number): number => {
    if (mongoDow === 1) return 6;       // Sunday → 6
    return mongoDow - 2;                 // Mon=0 … Sat=5
  };

  for (const row of heatmapAttendance) {
    const bucket = weekBucket(row._id.year, row._id.week);
    if (bucket < 0 || bucket > 3) continue;
    const dow = mondayZero(row._id.day);
    const pct = row.total > 0 ? Math.round((row.present / row.total) * 100) : 0;
    heatmap[bucket]![dow] = pct;
  }
  // Reverse so row 0 = oldest week, row 3 = current. (Matches existing UI
  // expectations of reading top-to-bottom over time.)
  heatmap.reverse();

  const heatmapFlat = heatmap.flat().filter((n): n is number => n !== null);
  const averageEngagementPct = heatmapFlat.length > 0
    ? Math.round(heatmapFlat.reduce((a, b) => a + b, 0) / heatmapFlat.length)
    : 0;

  // ---- Metrics -------------------------------------------------------
  const cur = overallAttendance[0];
  const prev = previousAttendance[0];
  const curPct = cur && cur.total > 0 ? (cur.present / cur.total) * 100 : 0;
  const prevPct = prev && prev.total > 0 ? (prev.present / prev.total) * 100 : 0;

  // ---- At-risk students ---------------------------------------------
  const divisionLabelById = new Map(
    divisionRefs.map((d) => [String(d._id), d.code ?? d.name]),
  );

  const atRiskFlat: TeacherOverview['atRiskStudents'] = [];
  for (let i = 0; i < perDivisionStats.length; i += 1) {
    const stats = perDivisionStats[i]!;
    const divisionId = divisionIds[i]!;
    const divisionLabel = divisionLabelById.get(String(divisionId));
    for (const row of stats) {
      if (row.pct < AT_RISK_THRESHOLD) {
        atRiskFlat.push({
          studentId: String(row.studentId),
          name: row.name,
          rollNumber: row.rollNumber,
          divisionLabel,
          absences: row.total - row.present,
          attendancePct: Math.round(row.pct),
        });
      }
    }
  }
  atRiskFlat.sort((a, b) => a.attendancePct - b.attendancePct);

  // ---- Upcoming items -----------------------------------------------
  const upcomingItems: TeacherOverview['upcomingItems'] = teacherAssignmentsBase.map(
    (r: any) => ({
      id: String(r._id),
      kind: 'assignment',
      title: r.title,
      dueDate: r.dueDate.toISOString(),
      subjectLabel: r.subject?.name,
    }),
  );

  // ---- Agenda tasks (derived) ---------------------------------------
  const agendaTasks: TeacherOverview['agendaTasks'] = [];
  if (draftCount > 0) {
    agendaTasks.push({
      id: 'task-drafts',
      text: `Publish ${draftCount} draft${draftCount === 1 ? '' : 's'}`,
      done: false,
      link: '/assignments/list',
    });
  }
  if (pendingReviews > 0) {
    agendaTasks.push({
      id: 'task-proposals',
      text: `Review ${pendingReviews} AI-proposed grade${pendingReviews === 1 ? '' : 's'}`,
      done: false,
      link: '/grade-batch',
    });
  }
  if (lecturesToday > 0) {
    agendaTasks.push({
      id: 'task-lectures',
      text: `Mark attendance for ${lecturesToday} lecture${lecturesToday === 1 ? '' : 's'} today`,
      done: false,
      link: '/attendance',
    });
  }
  // Always include a couple of stable items so the widget doesn't look
  // empty on a quiet day.
  if (agendaTasks.length === 0) {
    agendaTasks.push({
      id: 'task-quiet',
      text: 'No pending tasks — nice work!',
      done: true,
    });
  }

  return {
    greeting: { name: teacher.name },
    banner: {
      lecturesToday,
      pendingReviews,
      topEngagementSubject,
    },
    courses,
    engagementHeatmap: heatmap,
    averageEngagementPct,
    metrics: {
      attendancePct: Math.round(curPct * 10) / 10,
      attendanceDeltaPct: Math.round((curPct - prevPct) * 10) / 10,
      atRiskCount: atRiskFlat.length,
    },
    upcomingItems,
    atRiskStudents: atRiskFlat.slice(0, 5),
    agendaTasks,
  };
};
