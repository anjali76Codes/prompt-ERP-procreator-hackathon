/**
 * Seed published assignments + student submissions in varied review
 * states so the Grade Batch page (and the AI Grading review pages)
 * have realistic demo data without anyone having to upload files
 * through the UI.
 *
 * For each seeded assignment we cover one of these "stages" so the
 * dashboard summary cards and per-row CTAs are exercised:
 *   - no-rubric   → "Define Rubric" CTA
 *   - rubric+pending → "Run AI Grading" CTA
 *   - rubric+proposed → "Review Proposals" CTA
 *   - rubric+mid-review (proposed + published) → "Grade Remaining" CTA
 *   - rubric+all-published → "View Results" CTA
 *
 * Depends on `npm run seed:demo` (teachers, divisions, subjects,
 * students, branch).
 *
 * Idempotent: every seeded Resource carries `unit:'__SEED__GRADE_BATCH'`
 * (we reuse the `unit` text field as a marker — it's free-text on the
 * model so this doesn't conflict with anything). On re-run we delete
 * matching Resources + their submissions before re-inserting.
 *
 *   npm run seed:grade-batch
 */

import { Types } from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/db';
import { logger } from '../utils/logger';
import { Resource, type Rubric, type ResourceAttachment } from '../models/Resource';
import { Submission, type GradeProposal } from '../models/Submission';
import { Teacher } from '../models/Teacher';
import { Division } from '../models/Division';
import { Subject } from '../models/Subject';
import { Student } from '../models/Student';
import { Branch } from '../models/Branch';

const SEED_MARKER = '__SEED__GRADE_BATCH';

/** Stage describes the desired distribution of `reviewStatus` across submissions. */
type Stage =
  | 'no-rubric'
  | 'rubric+pending'
  | 'rubric+proposed'
  | 'rubric+mid-review'
  | 'rubric+all-published';

interface AssignmentSeed {
  teacherEmail: string;
  divisionCode: string;
  subjectCode: string;
  title: string;
  description: string;
  maxMarks: number;
  daysUntilDue: number;     // dueDate offset from today (negative = past)
  stage: Stage;
}

const assignmentSeeds: AssignmentSeed[] = [
  {
    teacherEmail: 'prof.adrian@university.edu',
    divisionCode: 'TE-A',
    subjectCode: 'CS-301',
    title: 'Lab 4 — Linked Lists Implementation',
    description:
      'Implement a singly + doubly linked list in C/C++ with insert, delete, '
      + 'and reverse operations. Submit your code as a PDF.',
    maxMarks: 20,
    daysUntilDue: -2,
    stage: 'rubric+proposed',
  },
  {
    teacherEmail: 'prof.adrian@university.edu',
    divisionCode: 'TE-A',
    subjectCode: 'CS-302',
    title: 'OS Mid-Term — Process Synchronisation',
    description:
      'Solve the producer-consumer + readers-writers problems using '
      + 'semaphores. Show your working and explain race conditions.',
    maxMarks: 25,
    daysUntilDue: 3,
    stage: 'no-rubric',
  },
  {
    teacherEmail: 'prof.adrian@university.edu',
    divisionCode: 'TE-B',
    subjectCode: 'CS-302',
    title: 'CPU Scheduling Comparison',
    description:
      'Compare FCFS, SJF, and Round Robin for a given workload — '
      + 'compute average wait time and turnaround time for each.',
    maxMarks: 15,
    daysUntilDue: -5,
    stage: 'rubric+all-published',
  },
  {
    teacherEmail: 'prof.sarah@university.edu',
    divisionCode: 'TE-A',
    subjectCode: 'CS-303',
    title: 'DBMS Assignment 2 — Normalization',
    description:
      'Given the supplied schema, decompose it through 1NF → 2NF → 3NF, '
      + 'showing the functional dependencies at each step.',
    maxMarks: 20,
    daysUntilDue: -1,
    stage: 'rubric+pending',
  },
  {
    teacherEmail: 'prof.sarah@university.edu',
    divisionCode: 'TE-C',
    subjectCode: 'CS-303',
    title: 'SQL Queries Practical',
    description:
      'Solve the 10 SQL queries given on Moodle against the Northwind '
      + 'database. Submit the .sql file + brief explanation per query.',
    maxMarks: 30,
    daysUntilDue: -4,
    stage: 'rubric+mid-review',
  },
  {
    teacherEmail: 'prof.mark@university.edu',
    divisionCode: 'TE-A',
    subjectCode: 'CS-304',
    title: 'ML Mini-Project — Linear Regression',
    description:
      'Build a linear regression model on the provided housing-prices '
      + 'dataset. Report MSE, R², and explain feature engineering choices.',
    maxMarks: 25,
    daysUntilDue: 5,
    stage: 'rubric+pending',
  },
  {
    teacherEmail: 'prof.mark@university.edu',
    divisionCode: 'TE-B',
    subjectCode: 'CS-304',
    title: 'Classification Report — Imbalanced Data',
    description:
      'Train a classifier on the bank-churn dataset, compute precision '
      + 'recall + F1, and discuss how class imbalance affected your model.',
    maxMarks: 20,
    daysUntilDue: -3,
    stage: 'rubric+proposed',
  },
];

/* ----------------------------------------------------------------------
 *  Realistic stubs
 * ------------------------------------------------------------------- */

/**
 * Stub Cloudinary attachment. The URL doesn't need to resolve for Grade
 * Batch to render (it just reads metadata), and even if a teacher clicks
 * the per-file preview, PdfFrame falls back to "could not load" with an
 * "open in new tab" link. Good enough for demo data.
 */
const stubAssignmentAttachment = (title: string): ResourceAttachment => ({
  name: `${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf`,
  size: 312_240,
  mimeType: 'application/pdf',
  url: 'https://res.cloudinary.com/demo/raw/upload/sample.pdf',
  publicId: `seed/grade-batch/${new Types.ObjectId().toHexString()}`,
  resourceType: 'raw',
  format: 'pdf',
  uploadedAt: new Date(),
});

const stubSubmissionAttachment = (
  studentName: string,
  resourceTitle: string,
): ResourceAttachment => ({
  name: `${studentName.replace(/\s+/g, '-').toLowerCase()}-${resourceTitle
    .split(' ')[0]!.toLowerCase()}.pdf`,
  size: 184_500,
  mimeType: 'application/pdf',
  url: 'https://res.cloudinary.com/demo/raw/upload/sample.pdf',
  publicId: `seed/submissions/${new Types.ObjectId().toHexString()}`,
  resourceType: 'raw',
  format: 'pdf',
  uploadedAt: new Date(),
});

const stubRubric = (maxMarks: number): Rubric => {
  const totalPoints = maxMarks;
  // 4 criteria, weights summing to 100.
  return {
    criteria: [
      {
        name: 'Correctness',
        description: 'Does the solution actually solve the problem?',
        maxPoints: Math.round(totalPoints * 0.4),
        weight: 40,
        mandatory: true,
      },
      {
        name: 'Clarity & Structure',
        description: 'Is the work well-organised and easy to follow?',
        maxPoints: Math.round(totalPoints * 0.25),
        weight: 25,
      },
      {
        name: 'Depth of Reasoning',
        description: 'Does the student justify their approach?',
        maxPoints: Math.round(totalPoints * 0.2),
        weight: 20,
      },
      {
        name: 'Presentation',
        description: 'Formatting, citations, and overall polish.',
        maxPoints: Math.round(totalPoints * 0.15),
        weight: 15,
      },
    ],
    totalPoints,
    graderNotes:
      'Penalise unsupported claims. Reward students who show working clearly.',
    updatedAt: new Date(),
  };
};

const stubProposal = (rubric: Rubric, maxMarks: number, seed: number): GradeProposal => {
  // Deterministic per student: pick a score around 70-92% of maxMarks.
  const pct = 0.7 + ((seed * 7) % 22) / 100;
  const proposedScore = Math.round(maxMarks * pct);
  const rubricBreakdown = rubric.criteria.map((c, i) => ({
    name: c.name,
    score: Math.round(c.maxPoints * (pct + (i % 2 === 0 ? 0.05 : -0.05))),
    maxPoints: c.maxPoints,
    weight: c.weight,
    feedback: `Solid coverage of ${c.name.toLowerCase()}; minor gaps in edge cases.`,
    mandatorySatisfied: true,
  }));
  return {
    proposedScore,
    rubricBreakdown,
    feedback:
      'Overall a strong submission. The reasoning is mostly clear; '
      + 'tighten the conclusion and double-check edge cases for full marks.',
    strengths: [
      'Methodical step-by-step working.',
      'Cited assumptions explicitly.',
    ],
    improvements: [
      'Sanity-check the final answer against a known case.',
      'Tighten the writeup — a few sentences are repetitive.',
    ],
    flags: seed % 9 === 0 ? ['late'] : [],
    proposedAt: new Date(),
    proposedBy: 'ai',
    model: 'gemini-2.0-flash',
  };
};

/* ----------------------------------------------------------------------
 *  Distribute review states per stage
 * ------------------------------------------------------------------- */

interface DistributedSub {
  reviewStatus: 'none' | 'proposed' | 'published';
  // If 'published', we also write a final score.
}

const distributeSubmissions = (count: number, stage: Stage): DistributedSub[] => {
  if (count === 0) return [];
  switch (stage) {
    case 'no-rubric':
    case 'rubric+pending':
      return Array.from({ length: count }, () => ({ reviewStatus: 'none' }));
    case 'rubric+proposed':
      return Array.from({ length: count }, () => ({ reviewStatus: 'proposed' }));
    case 'rubric+mid-review': {
      // Roughly half published, half still proposed (with a couple pending).
      const half = Math.floor(count / 2);
      const out: DistributedSub[] = [];
      for (let i = 0; i < half; i += 1) out.push({ reviewStatus: 'published' });
      for (let i = half; i < count - 1; i += 1) out.push({ reviewStatus: 'proposed' });
      out.push({ reviewStatus: 'none' });
      return out;
    }
    case 'rubric+all-published':
      return Array.from({ length: count }, () => ({ reviewStatus: 'published' }));
  }
};

/* ----------------------------------------------------------------------
 *  Entry
 * ------------------------------------------------------------------- */

const main = async (): Promise<void> => {
  await connectDatabase();
  logger.info('Seeding grade-batch demo data…');

  const branch = await Branch.findOne({ code: 'CS' }).select('_id');
  if (!branch) {
    logger.error('Branch CS not found. Run `npm run seed:demo` first.');
    await disconnectDatabase();
    process.exit(1);
  }

  // Wipe prior seed: delete Resources whose unit is our marker, and any
  // submissions pointing at them.
  const prevResources = await Resource.find({ unit: SEED_MARKER }).select('_id');
  if (prevResources.length) {
    const ids = prevResources.map((r) => r._id);
    const subs = await Submission.deleteMany({ resource: { $in: ids } });
    const res = await Resource.deleteMany({ _id: { $in: ids } });
    logger.info('Cleared previously-seeded grade-batch data', {
      resources: res.deletedCount,
      submissions: subs.deletedCount,
    });
  }

  let createdAssignments = 0;
  let createdSubmissions = 0;
  const skipped: string[] = [];

  for (const seed of assignmentSeeds) {
    const [teacher, division, subject] = await Promise.all([
      Teacher.findOne({ email: seed.teacherEmail }).select('_id name'),
      Division.findOne({ code: seed.divisionCode }).select('_id code'),
      Subject.findOne({ code: seed.subjectCode }).select('_id name'),
    ]);
    if (!teacher || !division || !subject) {
      skipped.push(
        `${seed.title} (teacher:${!!teacher} division:${!!division} subject:${!!subject})`,
      );
      continue;
    }

    const students = await Student
      .find({ divisionRef: division._id })
      .select('_id name')
      .limit(12); // cap per-assignment for the demo so totals look reasonable
    if (students.length === 0) {
      skipped.push(`${seed.title} (no students in ${seed.divisionCode})`);
      continue;
    }

    const dueDate = new Date(Date.now() + seed.daysUntilDue * 24 * 60 * 60 * 1000);
    const publishedAt = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const rubric = seed.stage === 'no-rubric' ? undefined : stubRubric(seed.maxMarks);

    const resource = await Resource.create({
      kind: 'assignment',
      status: 'published',
      division: division._id,
      subject: subject._id,
      teacher: teacher._id,
      branch: branch._id,
      title: seed.title,
      description: seed.description,
      dueDate,
      maxMarks: seed.maxMarks,
      unit: SEED_MARKER,
      attachments: [stubAssignmentAttachment(seed.title)],
      rubric,
      publishedAt,
    });
    createdAssignments += 1;

    // Decide how many students of the cohort actually submitted (80%).
    const submitters = students.slice(0, Math.max(1, Math.round(students.length * 0.8)));
    const distribution = distributeSubmissions(submitters.length, seed.stage);

    const subDocs = submitters.map((student, i) => {
      const dist = distribution[i]!;
      const submittedAt = new Date(
        dueDate.getTime() - (1 + (i % 4)) * 24 * 60 * 60 * 1000,
      );

      if (dist.reviewStatus === 'none' || !rubric) {
        return {
          resource: resource._id,
          student: student._id,
          status: 'pending' as const,
          reviewStatus: 'none' as const,
          attachments: [
            stubSubmissionAttachment(student.name ?? `student-${i}`, seed.title),
          ],
          submittedAt,
        };
      }

      const proposal = stubProposal(rubric, seed.maxMarks, i + 1);

      if (dist.reviewStatus === 'proposed') {
        return {
          resource: resource._id,
          student: student._id,
          status: 'pending' as const,
          reviewStatus: 'proposed' as const,
          attachments: [
            stubSubmissionAttachment(student.name ?? `student-${i}`, seed.title),
          ],
          submittedAt,
          proposal,
        };
      }

      // 'published'
      return {
        resource: resource._id,
        student: student._id,
        status: 'graded' as const,
        reviewStatus: 'published' as const,
        score: proposal.proposedScore,
        gradedAt: new Date(submittedAt.getTime() + 2 * 24 * 60 * 60 * 1000),
        gradedBy: teacher._id,
        attachments: [
          stubSubmissionAttachment(student.name ?? `student-${i}`, seed.title),
        ],
        submittedAt,
        proposal,
      };
    });

    await Submission.insertMany(subDocs);
    createdSubmissions += subDocs.length;
  }

  logger.info('Grade-batch seed complete', {
    assignments: createdAssignments,
    submissions: createdSubmissions,
    skipped: skipped.length ? skipped : 'none',
  });

  if (skipped.length) {
    logger.warn(
      'Some assignments were skipped because their teacher / division / '
      + 'subject was missing, or the division has no students. '
      + 'Run `npm run seed:demo` first, then re-run `npm run seed:grade-batch`.',
    );
  }

  await disconnectDatabase();
  process.exit(0);
};

main().catch((err) => {
  logger.error('Grade-batch seed failed', err as Error);
  process.exit(1);
});
