/**
 * Seed realistic broadcasts so /announcements AND /notify both have
 * content without the teacher having to compose anything manually.
 *
 * Each broadcast = one `meta.broadcastId` shared across N Notification
 * documents (one per student in the target division). The kind field
 * splits them across the two surfaces:
 *   - kind:'announcement' → shows up on /announcements (general updates)
 *   - kind:'reminder'     → shows up on /notify       (urgent prompts)
 *
 * Depends on `npm run seed:demo` (teachers, divisions, students).
 *
 * Idempotent: every doc carries `meta.seed: 'demo-announcements'`. On
 * re-run we delete by that marker first, so the script can be invoked
 * repeatedly without piling up duplicates.
 *
 *   npm run seed:announcements
 */

import { Types } from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/db';
import { logger } from '../utils/logger';
import { Notification } from '../models/Notification';
import { Teacher } from '../models/Teacher';
import { Division } from '../models/Division';
import { Subject } from '../models/Subject';
import { Student } from '../models/Student';

const SEED_MARKER = 'demo-announcements';

interface BroadcastSeed {
  teacherEmail: string;                              // existing seeded teacher
  divisionCode: string;                              // existing seeded division
  subjectCode?: string;                              // optional subject tag
  title: string;
  body: string;
  daysAgo: number;                                   // backdate so the list looks chronological
  kind?: 'announcement' | 'reminder';                // surface; defaults to 'announcement'
}

const announcementSeeds: BroadcastSeed[] = [
  {
    teacherEmail: 'prof.adrian@university.edu',
    divisionCode: 'TE-A',
    subjectCode: 'CS-301',
    title: 'DSA mid-term moved to next Monday',
    body:
      'Heads up — the Data Structures mid-term originally scheduled for '
      + 'this Friday has been moved to next Monday at 10 AM in Lab 402. '
      + 'Syllabus is unchanged (Units 1–3). Please bring your ID cards.',
    daysAgo: 1,
  },
  {
    teacherEmail: 'prof.adrian@university.edu',
    divisionCode: 'TE-A',
    subjectCode: 'CS-302',
    title: 'OS lab attendance is mandatory tomorrow',
    body:
      'Tomorrow\'s OS lab session covers process synchronisation with a '
      + 'graded in-lab exercise. Attendance is mandatory and will count '
      + 'towards internal marks. Please come prepared with Chapter 5.',
    daysAgo: 2,
  },
  {
    teacherEmail: 'prof.adrian@university.edu',
    divisionCode: 'TE-B',
    title: 'Class cancelled this Thursday',
    body:
      'My 11:30 lecture this Thursday is cancelled — I will be at a '
      + 'faculty review. We\'ll cover the missed topic in Friday\'s slot '
      + 'instead. Make a note.',
    daysAgo: 3,
  },
  {
    teacherEmail: 'prof.sarah@university.edu',
    divisionCode: 'TE-A',
    subjectCode: 'CS-303',
    title: 'DBMS assignment due Sunday 11:59 PM',
    body:
      'Reminder: the normalization assignment is due this Sunday at '
      + '11:59 PM. Submit the PDF on the portal — late submissions lose '
      + '20% per day. Office hours Thursday 3–5 PM if you\'re stuck.',
    daysAgo: 1,
  },
  {
    teacherEmail: 'prof.sarah@university.edu',
    divisionCode: 'TE-C',
    subjectCode: 'CS-303',
    title: 'SQL hands-on session this Friday',
    body:
      'We\'ll do a live SQL hands-on this Friday from 11:30 to 12:30 in '
      + 'Smart Class 1. Bring a laptop with MySQL or Postgres installed. '
      + 'Install instructions are pinned in the resources tab.',
    daysAgo: 4,
  },
  {
    teacherEmail: 'prof.mark@university.edu',
    divisionCode: 'TE-A',
    subjectCode: 'CS-304',
    title: 'New ML notes uploaded — Linear Regression',
    body:
      'I\'ve uploaded the Linear Regression notes (Chapters 2 & 3) to '
      + 'the assignments portal. Please go through them before next '
      + 'Tuesday — we\'ll start the bias-variance discussion in class.',
    daysAgo: 2,
  },
  {
    teacherEmail: 'prof.mark@university.edu',
    divisionCode: 'TE-B',
    subjectCode: 'CS-304',
    title: 'ML guest lecture — RSVP by Friday',
    body:
      'We have a guest lecture by an industry ML engineer next '
      + 'Wednesday at 2 PM. Topic: deploying models at scale. RSVP via '
      + 'the form (link below) by Friday — seats are limited to 60.',
    daysAgo: 5,
  },
  {
    teacherEmail: 'prof.mark@university.edu',
    divisionCode: 'TE-C',
    title: 'Important: project group registration closes Saturday',
    body:
      'Last reminder — final-year project group registrations close '
      + 'this Saturday. Groups of 3 only. Submit your group name, '
      + 'roll numbers, and tentative topic via the portal.',
    daysAgo: 6,
  },

  /* -------------------- Class notifications (kind: 'reminder') --------- */
  /* These power the /notify page — urgent, action-focused prompts.       */

  {
    teacherEmail: 'prof.adrian@university.edu',
    divisionCode: 'TE-A',
    subjectCode: 'CS-301',
    title: 'Submit DSA Lab 4 by 5 PM today',
    body:
      'Final reminder — Lab 4 (Linked Lists Implementation) is due by '
      + '5 PM TODAY. Submit the PDF on the portal. Late penalties kick '
      + 'in at 5:01 PM. No extensions.',
    daysAgo: 0,
    kind: 'reminder',
  },
  {
    teacherEmail: 'prof.adrian@university.edu',
    divisionCode: 'TE-B',
    subjectCode: 'CS-302',
    title: 'Quiz tomorrow at 10:15 AM — be on time',
    body:
      'Quick reminder: OS quiz tomorrow at 10:15 AM in Lab 403. '
      + 'Doors close at 10:20. Bring a pen, the rest is on the portal.',
    daysAgo: 0,
    kind: 'reminder',
  },
  {
    teacherEmail: 'prof.sarah@university.edu',
    divisionCode: 'TE-A',
    subjectCode: 'CS-303',
    title: 'Bring laptops to Friday\'s SQL session',
    body:
      'Reminder — Friday\'s SQL hands-on REQUIRES a laptop with '
      + 'MySQL/Postgres installed. Install instructions are pinned. '
      + 'Without a laptop you\'ll have to pair up.',
    daysAgo: 1,
    kind: 'reminder',
  },
  {
    teacherEmail: 'prof.mark@university.edu',
    divisionCode: 'TE-A',
    subjectCode: 'CS-304',
    title: 'RSVP for guest lecture closes tonight',
    body:
      'Last call — RSVP for next Wednesday\'s ML guest lecture closes '
      + 'tonight at 11:59 PM. After that the seat list is locked.',
    daysAgo: 0,
    kind: 'reminder',
  },
  {
    teacherEmail: 'prof.mark@university.edu',
    divisionCode: 'TE-B',
    title: 'Project group names due tomorrow',
    body:
      'Reminder: submit your final-year project group name + roll '
      + 'numbers via the portal by EOD tomorrow. No group = no project.',
    daysAgo: 2,
    kind: 'reminder',
  },
];

const main = async (): Promise<void> => {
  await connectDatabase();
  logger.info('Seeding announcements…');

  // Idempotent: wipe anything we previously seeded.
  const cleared = await Notification.deleteMany({ 'meta.seed': SEED_MARKER });
  if (cleared.deletedCount) {
    logger.info('Cleared previously-seeded announcements', {
      notifications: cleared.deletedCount,
    });
  }

  let broadcasts = 0;
  let totalRecipients = 0;
  const skipped: string[] = [];

  for (const seed of announcementSeeds) {
    const [teacher, division, subject] = await Promise.all([
      Teacher.findOne({ email: seed.teacherEmail }).select('_id name'),
      Division.findOne({ code: seed.divisionCode }).select('_id code'),
      seed.subjectCode
        ? Subject.findOne({ code: seed.subjectCode }).select('_id name')
        : Promise.resolve(null),
    ]);

    if (!teacher || !division) {
      skipped.push(
        `${seed.title} (teacher:${!!teacher} division:${!!division})`,
      );
      continue;
    }
    if (seed.subjectCode && !subject) {
      skipped.push(`${seed.title} (subject ${seed.subjectCode} not found)`);
      continue;
    }

    const students = await Student
      .find({ divisionRef: division._id })
      .select('_id');

    if (students.length === 0) {
      skipped.push(`${seed.title} (no students in ${seed.divisionCode})`);
      continue;
    }

    const broadcastId = new Types.ObjectId();
    const createdAt = new Date(Date.now() - seed.daysAgo * 24 * 60 * 60 * 1000);

    const kind = seed.kind ?? 'announcement';
    const docs = students.map((s) => ({
      sender: teacher._id,
      recipient: s._id,
      kind,
      title: seed.title,
      body: seed.body,
      meta: {
        seed: SEED_MARKER,
        broadcastId,
        divisionId: division._id,
        ...(subject ? { subjectId: subject._id } : {}),
      },
      // Backdate so newer-looking announcements appear first in the list.
      createdAt,
      updatedAt: createdAt,
    }));

    await Notification.insertMany(docs);
    broadcasts += 1;
    totalRecipients += docs.length;
  }

  const announcementCount = announcementSeeds.filter(
    (s) => (s.kind ?? 'announcement') === 'announcement',
  ).length;
  const reminderCount = announcementSeeds.length - announcementCount;

  logger.info('Announcement seed complete', {
    broadcasts,
    totalRecipients,
    announcements: announcementCount,
    reminders: reminderCount,
    skipped: skipped.length ? skipped : 'none',
  });

  if (skipped.length) {
    logger.warn(
      'Some announcements were skipped because their teacher/division/'
      + 'subject was missing, or the division has no students. '
      + 'Run `npm run seed:demo` first, then re-run `npm run seed:announcements`.',
    );
  }

  await disconnectDatabase();
  process.exit(0);
};

main().catch((err) => {
  logger.error('Announcement seed failed', err as Error);
  process.exit(1);
});
