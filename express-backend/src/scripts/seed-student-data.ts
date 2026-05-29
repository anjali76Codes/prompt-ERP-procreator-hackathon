/**
 * Seed STUDENT-side data so the student dashboard / grades / schedule pages
 * have something real to show after `seed:demo` (+ optional `seed:quizzes`).
 *
 * Creates:
 *   - Resources of kind `assignment` for TE-A and TE-B, with realistic due
 *     dates spread around today (past, today, future).
 *   - Submissions on a couple of those assignments for each seeded student
 *     so the "graded / pending" mix on the dashboard reads naturally.
 *   - QuizAttempts for every published quiz × every seeded student in the
 *     quiz's division. Most students "submitted+graded" with realistic
 *     scores; a couple stay "in_progress" to exercise the UI's status mix.
 *
 * Depends on `seed:demo` having created branches / divisions / subjects /
 * teachers / students. Quizzes are picked up if `seed:quizzes` ran, but the
 * script is safe to run without quizzes — it just skips that section.
 *
 * Idempotent: deletes everything it creates (by the same selectors) before
 * re-inserting, so re-running gives a fresh deterministic state.
 */

import { Types } from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/db';
import { logger } from '../utils/logger';
import { Branch } from '../models/Branch';
import { Division } from '../models/Division';
import { Subject } from '../models/Subject';
import { Teacher } from '../models/Teacher';
import { Student } from '../models/Student';
import { Resource } from '../models/Resource';
import { Submission } from '../models/Submission';
import { Quiz } from '../models/Quiz';
import { QuizAttempt } from '../models/QuizAttempt';

const toMidnightUTC = (d: Date): Date =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

const offsetDays = (d: Date, n: number): Date => {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
};

/* -------------------------------------------------------------------------- */
/*  Assignment definitions                                                    */
/* -------------------------------------------------------------------------- */

interface AssignmentSeed {
  title: string;
  description: string;
  subjectCode: string;
  divisionCode: string;
  /** Days from today; negative = past, 0 = today, positive = future. */
  dueOffsetDays: number;
  maxMarks: number;
}

const assignmentSeeds: AssignmentSeed[] = [
  {
    title: 'DSA — Binary Trees Practice Set',
    description: 'Solve all 8 problems on tree traversals + balanced-tree rotations.',
    subjectCode: 'CS-301', divisionCode: 'TE-A',
    dueOffsetDays: 3, maxMarks: 25,
  },
  {
    title: 'OS — Process Scheduling Worksheet',
    description: 'Compare FCFS, SJF and Round-Robin on the provided trace tables.',
    subjectCode: 'CS-302', divisionCode: 'TE-A',
    dueOffsetDays: 5, maxMarks: 20,
  },
  {
    title: 'DBMS — Normalisation Case Study',
    description: 'Normalise the bookstore schema up to BCNF; show every step.',
    subjectCode: 'CS-303', divisionCode: 'TE-A',
    dueOffsetDays: -1, maxMarks: 15,
  },
  {
    title: 'ML — Gradient Descent Lab Report',
    description: 'Run the supplied notebook; submit the report with loss curves.',
    subjectCode: 'CS-304', divisionCode: 'TE-A',
    dueOffsetDays: 7, maxMarks: 30,
  },
  {
    title: 'DSA — Heap & Priority Queue Exercises',
    description: 'Implement a min-heap from scratch; submit the source + sample run.',
    subjectCode: 'CS-301', divisionCode: 'TE-B',
    dueOffsetDays: 4, maxMarks: 20,
  },
  {
    title: 'OS — Deadlock Detection Walkthrough',
    description: 'Build the resource-allocation graph for the example, mark cycles.',
    subjectCode: 'CS-302', divisionCode: 'TE-B',
    dueOffsetDays: -2, maxMarks: 15,
  },
];

/* -------------------------------------------------------------------------- */
/*  Seeding                                                                   */
/* -------------------------------------------------------------------------- */

const seedAssignments = async () => {
  const branch = await Branch.findOne({});
  if (!branch) throw new Error('No Branch found — run seed:demo first');

  const divisions = await Division.find({});
  const divisionByCode = new Map(divisions.map(d => [d.code, d]));
  const subjects = await Subject.find({});
  const subjectByCode = new Map(subjects.map(s => [s.code, s]));
  const teachers = await Teacher.find({});
  // Pick any teacher per division/subject pair — the seed-demo teachers
  // are assigned across multiple divisions so we just pick the first
  // teacher that owns the subject. For simplicity, pick the first teacher.
  const firstTeacher = teachers[0];
  if (!firstTeacher) throw new Error('No Teachers found — run seed:demo first');

  // Wipe any previous seeded assignments by title so re-runs stay clean.
  const titles = assignmentSeeds.map(a => a.title);
  await Resource.deleteMany({ title: { $in: titles } });
  // Also delete any submissions on those resources to avoid orphans.
  const oldResources = await Resource.find({ title: { $in: titles } }).select('_id');
  if (oldResources.length > 0) {
    await Submission.deleteMany({ resource: { $in: oldResources.map(r => r._id) } });
  }

  const created: Array<{ _id: Types.ObjectId; division: Types.ObjectId; maxMarks?: number }> = [];
  const now = new Date();
  for (const seed of assignmentSeeds) {
    const division = divisionByCode.get(seed.divisionCode);
    const subject  = subjectByCode.get(seed.subjectCode);
    if (!division || !subject) {
      logger.warn(`Skipping assignment "${seed.title}" — division ${seed.divisionCode} or subject ${seed.subjectCode} not found`);
      continue;
    }
    const due = offsetDays(toMidnightUTC(now), seed.dueOffsetDays);
    const r = await Resource.create({
      kind: 'assignment',
      status: 'published',
      branch: branch._id,
      division: division._id,
      subject:  subject._id,
      teacher:  firstTeacher._id,
      title: seed.title,
      description: seed.description,
      dueDate: due,
      maxMarks: seed.maxMarks,
      attachments: [],
      publishedAt: offsetDays(now, -2),
    });
    created.push({ _id: r._id, division: r.division, maxMarks: r.maxMarks });
  }

  logger.info('Assignments seeded', { count: created.length });
  return created;
};

const seedSubmissions = async (
  assignments: Array<{ _id: Types.ObjectId; division: Types.ObjectId; maxMarks?: number }>,
) => {
  const teachers = await Teacher.find({});
  const grader = teachers[0]?._id;

  let created = 0;
  for (const a of assignments) {
    const studentsInDiv = await Student.find({ divisionRef: a.division });
    // Submit for ~70% of students. Of those, ~70% graded, rest pending.
    for (const [idx, s] of studentsInDiv.entries()) {
      const seedRand = (idx * 31 + parseInt(a._id.toString().slice(-2), 16)) % 100;
      if (seedRand > 70) continue; // didn't submit at all

      const isGraded = seedRand < 50;
      const submittedAt = new Date(Date.now() - (5 + (seedRand % 8)) * 24 * 60 * 60 * 1000);
      const max = a.maxMarks ?? 20;
      // Score: 60–95% range for graded submissions.
      const pct = 0.60 + ((seedRand % 35) / 100);
      const score = Math.round(max * pct);

      await Submission.create({
        resource: a._id,
        student:  s._id,
        status: isGraded ? 'graded' : 'pending',
        attachments: [],
        score: isGraded ? score : undefined,
        gradedAt: isGraded ? new Date(submittedAt.getTime() + 2 * 24 * 60 * 60 * 1000) : undefined,
        gradedBy: isGraded ? grader : undefined,
        submittedAt,
        reviewStatus: 'none',
      });
      created++;
    }
  }
  logger.info('Submissions seeded', { count: created });
};

const seedQuizAttempts = async () => {
  const quizzes = await Quiz.find({ status: 'published' });
  if (quizzes.length === 0) {
    logger.info('No published quizzes found — skipping QuizAttempts seed (run seed:quizzes if you want this section populated)');
    return;
  }

  let created = 0;
  for (const quiz of quizzes) {
    const studentsInDiv = await Student.find({ divisionRef: quiz.division });
    // Wipe any prior attempts on this quiz so re-running stays deterministic.
    await QuizAttempt.deleteMany({
      quiz: quiz._id,
      student: { $in: studentsInDiv.map(s => s._id) },
    });

    for (const [idx, s] of studentsInDiv.entries()) {
      // 80% have attempted. Of those, 75% submitted, half of submitted graded.
      const seedRand = (idx * 17 + parseInt(quiz._id.toString().slice(-2), 16)) % 100;
      if (seedRand > 80) continue;

      const submitted = seedRand < 60;
      const graded = seedRand < 30;
      // Quiz doesn't store a `totalMarks` field — derive from the question
      // point values, with a sane fallback so demos don't divide by zero.
      const max = quiz.questions.reduce((s, q) => s + (q.points ?? 1), 0) || 50;
      const pct = 0.55 + ((seedRand % 40) / 100); // 55-95%
      const score = Math.round(max * pct);

      const startedAt = new Date(Date.now() - (3 + (seedRand % 5)) * 24 * 60 * 60 * 1000);
      const submittedAt = submitted
        ? new Date(startedAt.getTime() + ((10 + seedRand % 20) * 60 * 1000))
        : undefined;

      await QuizAttempt.create({
        quiz: quiz._id,
        student: s._id,
        status: graded ? 'graded' : submitted ? 'submitted' : 'in_progress',
        startedAt,
        submittedAt,
        gradedAt: graded ? new Date((submittedAt?.getTime() ?? Date.now()) + 24 * 60 * 60 * 1000) : undefined,
        score: graded || submitted ? score : undefined,
        durationSeconds: submitted ? (10 + seedRand % 20) * 60 : undefined,
        answers: [],
      });
      created++;
    }
  }

  logger.info('Quiz attempts seeded', { count: created });
};

/* -------------------------------------------------------------------------- */
/*  Entry                                                                     */
/* -------------------------------------------------------------------------- */

const main = async () => {
  await connectDatabase();
  logger.info('Seeding student-side data…');

  const assignments = await seedAssignments();
  await seedSubmissions(assignments);
  await seedQuizAttempts();

  logger.info('Student-side data seed complete');
  await disconnectDatabase();
  process.exit(0);
};

main().catch((err) => {
  logger.error('Seed failed', err as Error);
  process.exit(1);
});
