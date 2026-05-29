/**
 * Student dashboard aggregate.
 *
 * One call returns everything the student dashboard needs: identity,
 * per-subject attendance, today's lectures, upcoming quizzes, recent
 * quiz attempts (grade preview), and pending assignments.
 *
 * Heavy lifting is delegated to existing service helpers; this file
 * fans them out in parallel and reshapes the results into a stable UI
 * contract.
 */

import { Types } from 'mongoose';
import { Student } from '../models/Student';
import { Subject } from '../models/Subject';
import { Lecture } from '../models/Lecture';
import { Quiz } from '../models/Quiz';
import { QuizAttempt } from '../models/QuizAttempt';
import { Resource } from '../models/Resource';
import { Submission } from '../models/Submission';
import { studentSubjectAttendance } from './attendance.service';

const EMPTY_OVERVIEW = (name = ''): StudentOverview => ({
  greeting: { name },
  identity: {},
  metrics: { overallAttendancePct: 0, avgQuizScorePct: 0, pendingCount: 0 },
  attendance: [],
  todayLectures: [],
  upcomingAssignments: [],
  recentAttempts: [],
});

/** Lectures are stored at UTC midnight of the calendar day. */
const toUtcMidnight = (d: Date): Date =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

/** Combine a calendar date with an "HH:MM" string into an ISO timestamp. */
const isoFromDateAndTime = (date: Date, hhmm: string): string => {
  const [h, m] = hhmm.split(':').map(n => parseInt(n, 10));
  const d = new Date(date);
  d.setUTCHours(h ?? 0, m ?? 0, 0, 0);
  return d.toISOString();
};

export interface StudentSubjectAttendance {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  total: number;
  present: number;
  pct: number;
}

export interface StudentTodayLecture {
  lectureId: string;
  subjectCode: string;
  subjectName: string;
  startsAt: string;
  endsAt: string;
  room?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

export interface StudentRecentAttempt {
  attemptId: string;
  quizId: string;
  quizTitle: string;
  subjectLabel?: string;
  score?: number;
  maxMarks?: number;
  status: 'in_progress' | 'submitted' | 'graded';
  submittedAt?: string;
}

export interface StudentUpcomingAssignment {
  resourceId: string;
  title: string;
  subjectLabel?: string;
  dueDate?: string;
  status: 'pending' | 'submitted' | 'graded' | 'resubmit_requested';
}

export interface StudentOverview {
  greeting: { name: string };
  identity: {
    rollNumber?: string;
    division?: string;
    branch?: string;
  };
  metrics: {
    /** Overall attendance % across all subjects. */
    overallAttendancePct: number;
    /** Average quiz score (out of max), 0-100. */
    avgQuizScorePct: number;
    /** Count of upcoming items the student should act on. */
    pendingCount: number;
  };
  attendance: StudentSubjectAttendance[];
  todayLectures: StudentTodayLecture[];
  upcomingAssignments: StudentUpcomingAssignment[];
  recentAttempts: StudentRecentAttempt[];
}

export const getStudentOverview = async (studentId: string): Promise<StudentOverview> => {
  const student = await Student.findById(studentId)
    .populate<{ divisionRef: { _id: Types.ObjectId; name?: string; code?: string } | null }>('divisionRef', 'name code')
    .populate<{ branchRef: { _id: Types.ObjectId; name?: string; code?: string } | null }>('branchRef', 'name code');
  // Not a student (teacher / admin / stale token) — return a sensible empty
  // shape rather than throwing, so the dashboard never lands on an error.
  if (!student) return EMPTY_OVERVIEW();

  const divisionId = student.divisionRef?._id;

  const dayStart = toUtcMidnight(new Date());

  /* Fan-out the per-section queries in parallel. */
  const [
    attendanceRows,
    lectures,
    upcomingQuizzes,
    recentAttempts,
    assignmentsRaw,
  ] = await Promise.all([
    studentSubjectAttendance(studentId),
    divisionId
      ? Lecture.find({ division: divisionId, date: dayStart })
          .populate('subject', 'code name')
          .sort({ startTime: 1 })
          .lean()
      : Promise.resolve([] as any[]),
    divisionId
      ? Quiz.find({ division: divisionId, status: 'published' })
          .populate('subject', 'code name')
          .sort({ updatedAt: -1 })
          .limit(5)
          .lean()
      : Promise.resolve([] as any[]),
    QuizAttempt.find({ student: new Types.ObjectId(studentId) })
      .populate({ path: 'quiz', select: 'title questions subject', populate: { path: 'subject', select: 'code name' } })
      .sort({ submittedAt: -1, startedAt: -1 })
      .limit(6)
      .lean(),
    divisionId
      ? Resource.find({
          division: divisionId,
          kind: 'assignment',
          status: 'published',
        })
          .populate('subject', 'code name')
          .sort({ dueDate: 1 })
          .limit(8)
          .lean()
      : Promise.resolve([] as any[]),
  ]);

  /* Build subject map for attendance row enrichment. */
  const subjectIds = Array.from(new Set(attendanceRows.map(r => r.subject.toString())));
  const subjects = await Subject.find({ _id: { $in: subjectIds } }).select('code name').lean();
  const subjectMap = new Map(subjects.map(s => [s._id.toString(), s]));

  const attendance: StudentSubjectAttendance[] = attendanceRows.map(r => {
    const sub = subjectMap.get(r.subject.toString());
    return {
      subjectId: r.subject.toString(),
      subjectCode: sub?.code ?? '',
      subjectName: sub?.name ?? 'Unknown',
      total: r.total,
      present: r.present,
      pct: Math.round(r.pct * 10) / 10,
    };
  });

  const overallAttendancePct = attendance.length === 0
    ? 0
    : Math.round(
        (attendance.reduce((s, r) => s + r.present, 0) /
          Math.max(1, attendance.reduce((s, r) => s + r.total, 0))) * 1000,
      ) / 10;

  /* Today's lectures — Lecture stores `date` (midnight) + `startTime`/`endTime`
   * as HH:MM strings, so re-stitch into ISO timestamps the frontend can format. */
  const todayLectures: StudentTodayLecture[] = lectures.map((l: any) => ({
    lectureId: l._id.toString(),
    subjectCode: l.subject?.code ?? '',
    subjectName: l.subject?.name ?? 'Unknown',
    startsAt: isoFromDateAndTime(l.date, l.startTime),
    endsAt:   isoFromDateAndTime(l.date, l.endTime),
    room: l.room ?? undefined,
    status: (l.status as 'scheduled' | 'completed' | 'cancelled') ?? 'scheduled',
  }));

  /* Pull submission status for the upcoming assignments. */
  const resourceIds = assignmentsRaw.map((r: any) => r._id);
  const submissions = resourceIds.length > 0
    ? await Submission.find({
        resource: { $in: resourceIds },
        student: new Types.ObjectId(studentId),
      }).select('resource status').lean()
    : [];
  const submissionByResource = new Map(
    submissions.map(s => [String(s.resource), s.status as 'pending' | 'graded' | 'resubmit_requested']),
  );

  const upcomingAssignments: StudentUpcomingAssignment[] = assignmentsRaw.map((r: any) => ({
    resourceId: r._id.toString(),
    title: r.title,
    subjectLabel: r.subject?.code,
    dueDate: r.dueDate ? new Date(r.dueDate).toISOString() : undefined,
    status: submissionByResource.get(r._id.toString()) ?? 'pending',
  }));

  /* Recent quiz attempts → grade preview. Quiz doesn't store a `totalMarks`
   * field — derive it from the question points so the score reads "8 / 10"
   * rather than just a bare number. */
  const recent: StudentRecentAttempt[] = recentAttempts.map((a: any) => {
    const questions: Array<{ points?: number }> = a.quiz?.questions ?? [];
    const maxMarks = questions.length > 0
      ? questions.reduce((s, q) => s + (q.points ?? 1), 0)
      : undefined;
    return {
      attemptId: a._id.toString(),
      quizId: (a.quiz?._id ?? a.quiz).toString(),
      quizTitle: a.quiz?.title ?? 'Quiz',
      subjectLabel: a.quiz?.subject?.code,
      score: typeof a.score === 'number' ? a.score : undefined,
      maxMarks,
      status: a.status,
      submittedAt: a.submittedAt ? new Date(a.submittedAt).toISOString() : undefined,
    };
  });

  const graded = recent.filter(r => typeof r.score === 'number' && r.maxMarks);
  const avgQuizScorePct = graded.length === 0
    ? 0
    : Math.round(
        (graded.reduce((s, r) => s + (r.score! / r.maxMarks!) * 100, 0) / graded.length) * 10,
      ) / 10;

  const pendingCount =
    upcomingAssignments.filter(a => a.status === 'pending' || a.status === 'resubmit_requested').length
    + upcomingQuizzes.length;

  return {
    greeting: { name: student.name },
    identity: {
      rollNumber: student.rollNumber,
      division: student.divisionRef?.name,
      branch: student.branchRef?.name,
    },
    metrics: {
      overallAttendancePct,
      avgQuizScorePct,
      pendingCount,
    },
    attendance,
    todayLectures,
    upcomingAssignments,
    recentAttempts: recent,
  };
};
