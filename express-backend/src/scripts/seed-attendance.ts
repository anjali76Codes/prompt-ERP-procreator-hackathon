/**
 * Seed 4 weeks of attendance records so the teacher dashboard heatmap,
 * "At-Risk Students" widget, and Course Overview averages have real
 * numbers to render — without a teacher having to mark every lecture
 * manually.
 *
 * Strategy:
 *   1. For each of the last 28 days, call materialiseLecturesForDate()
 *      so every weekday slot from the seeded Schedule becomes a concrete
 *      Lecture. Lectures past today get status:'completed' as well so
 *      the dashboard "lectures today / completed" counts behave.
 *   2. For each materialised lecture, write one Attendance doc per
 *      student in that division. Most students get a ~92% present rate;
 *      a deterministic small subset ("at-risk students") get a ~55%
 *      present rate, so they end up below the 75% threshold and show
 *      up on the dashboard's At-Risk widget.
 *
 * Depends on `npm run seed:demo` (teachers, divisions, students,
 * schedules, branch).
 *
 * Idempotent: every seeded Attendance carries `remarks: '__SEED__'`.
 * On re-run we wipe those by marker before re-inserting. Lectures
 * created by `materialiseLecturesForDate` are upserted, so re-running
 * doesn't create duplicates either.
 *
 *   npm run seed:attendance
 */

import { Types } from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/db';
import { logger } from '../utils/logger';
import { Attendance, type AttendanceStatus } from '../models/Attendance';
import { Lecture } from '../models/Lecture';
import { Student } from '../models/Student';
import { Teacher } from '../models/Teacher';
import { materialiseLecturesForDate } from '../services/lecture.service';

const SEED_MARKER = '__SEED__';

/** Per-division: how many students should be deliberately "at-risk". */
const AT_RISK_COUNT_PER_DIVISION = 3;

/** A small, deterministic admin/sender so markedBy is populated. */
const findAnyTeacherId = async (): Promise<Types.ObjectId> => {
  const t = await Teacher.findOne().select('_id');
  if (!t) throw new Error('No teacher found. Run `npm run seed:demo` first.');
  return t._id;
};

/** Choose `present` ~p of the time, otherwise rotate through absent/late/excused. */
const pickStatus = (presentRate: number, seed: number): AttendanceStatus => {
  // Deterministic pseudo-random — same student always behaves the same way.
  const r = ((seed * 9301 + 49297) % 233280) / 233280;
  if (r < presentRate) return 'present';
  // Distribute the remainder: most are absent, some late, rare excused.
  if (r < presentRate + 0.05) return 'late';
  if (r < presentRate + 0.075) return 'excused';
  return 'absent';
};

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

const main = async (): Promise<void> => {
  await connectDatabase();
  logger.info('Seeding 4 weeks of attendance…');

  const adminId = await findAnyTeacherId();

  // Step 1 — wipe prior seeded attendance.
  const cleared = await Attendance.deleteMany({ remarks: SEED_MARKER });
  if (cleared.deletedCount) {
    logger.info('Cleared previously-seeded attendance', {
      records: cleared.deletedCount,
    });
  }

  // Step 2 — materialise lectures for each of the last 28 days, then
  //          mark "completed" for any in the past so the dashboard
  //          status pill matches.
  const today = startOfDay(new Date());
  const startDate = addDays(today, -27);

  let materialisedTotal = 0;
  for (let i = 0; i < 28; i += 1) {
    const day = addDays(startDate, i);
    const created = await materialiseLecturesForDate(day);
    materialisedTotal += created.length;
  }

  // Mark past lectures as completed so today's count is the only "live" one.
  await Lecture.updateMany(
    { date: { $lt: today }, status: 'scheduled' },
    { $set: { status: 'completed' } },
  );
  logger.info('Materialised lectures', { total: materialisedTotal });

  // Step 3 — gather lectures in the window and group their students by
  //          division so we can build attendance rows cheaply.
  const lectures = await Lecture.find({
    date: { $gte: startDate, $lte: today },
  })
    .select('_id division subject date')
    .lean();

  // For each division, pick a deterministic subset of "at-risk" student
  // ids (first AT_RISK_COUNT_PER_DIVISION when sorted by _id) so the
  // dashboard at-risk widget has real candidates.
  const divisionIds = Array.from(new Set(lectures.map((l) => String(l.division))));
  const atRiskByDivision = new Map<string, Set<string>>();
  const allStudentsByDivision = new Map<string, Types.ObjectId[]>();

  for (const divId of divisionIds) {
    const students = await Student
      .find({ divisionRef: new Types.ObjectId(divId) })
      .select('_id')
      .sort({ _id: 1 });
    const ids = students.map((s) => s._id);
    allStudentsByDivision.set(divId, ids);
    atRiskByDivision.set(
      divId,
      new Set(ids.slice(0, AT_RISK_COUNT_PER_DIVISION).map((id) => id.toString())),
    );
  }

  // Step 4 — bulk-insert attendance docs per lecture.
  let totalDocs = 0;
  for (const lec of lectures) {
    const students = allStudentsByDivision.get(String(lec.division)) ?? [];
    if (students.length === 0) continue;

    const atRisk = atRiskByDivision.get(String(lec.division)) ?? new Set();
    // Use the lecture date's day-of-month + student index as the
    // deterministic seed so the same student behaves consistently
    // across lectures but varies between days.
    const dayOffset = Math.floor(
      (new Date(lec.date).getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    const docs = students.map((studentId, idx) => {
      const isAtRisk = atRisk.has(studentId.toString());
      const presentRate = isAtRisk ? 0.55 : 0.92;
      const seed = idx * 31 + dayOffset * 17 + 1;
      const status = pickStatus(presentRate, seed);
      return {
        lecture: lec._id,
        student: studentId,
        division: lec.division,
        subject: lec.subject,
        status,
        remarks: SEED_MARKER,
        markedBy: adminId,
        markedAt: new Date(lec.date),
      };
    });

    if (docs.length > 0) {
      try {
        await Attendance.insertMany(docs, { ordered: false });
        totalDocs += docs.length;
      } catch (e: any) {
        // Duplicate-key collisions from prior runs are non-fatal — we
        // already wiped by SEED_MARKER above, but a non-seeded run might
        // have left some rows. Log and continue.
        if (e?.code !== 11000) throw e;
      }
    }
  }

  logger.info('Attendance seed complete', {
    lectures: lectures.length,
    attendanceRecords: totalDocs,
    divisions: divisionIds.length,
    atRiskPerDivision: AT_RISK_COUNT_PER_DIVISION,
  });

  await disconnectDatabase();
  process.exit(0);
};

main().catch((err) => {
  logger.error('Attendance seed failed', err as Error);
  process.exit(1);
});
