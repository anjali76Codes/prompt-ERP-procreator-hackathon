/**
 * Comprehensive demo seed: branch, year, divisions, subjects, teachers, students,
 * timetable, ten weekdays of past lectures + realistic attendance records.
 *
 * Idempotent: drops and re-creates the demo entities by code.
 */

import { Types } from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/db';
import { logger } from '../utils/logger';
import { hashPassword } from '../services/auth.service';
import { Branch } from '../models/Branch';
import { AcademicYear } from '../models/AcademicYear';
import { Division } from '../models/Division';
import { Subject } from '../models/Subject';
import { Schedule } from '../models/Schedule';
import { Lecture } from '../models/Lecture';
import { Attendance, type AttendanceStatus } from '../models/Attendance';
import { Student, type StudentDoc } from '../models/Student';
import { Teacher, type TeacherDoc } from '../models/Teacher';
import { User } from '../models/User';
import type { LectureDoc } from '../models/Lecture';

const TEACHER_PASSWORD = 'Teacher123';
const STUDENT_PASSWORD = 'Student123';

const toMidnightUTC = (d: Date) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

const isoWeekday = (d: Date) => {
  const day = d.getUTCDay();
  return day === 0 ? 7 : day;
};

interface StudentSeed { roll: string; name: string; emailLocal: string }

const studentSeedsA: StudentSeed[] = [
  { roll: 'TE-A-001', name: 'Aarav Sharma',    emailLocal: 'aarav.sharma'    },
  { roll: 'TE-A-002', name: 'Bella Carson',    emailLocal: 'bella.carson'    },
  { roll: 'TE-A-003', name: 'Caleb Daugherty', emailLocal: 'caleb.daugherty' },
  { roll: 'TE-A-004', name: 'Diana Prince',    emailLocal: 'diana.prince'    },
  { roll: 'TE-A-005', name: 'Ethan Hunt',      emailLocal: 'ethan.hunt'      },
  { roll: 'TE-A-006', name: 'Fiona Glenanne',  emailLocal: 'fiona.glenanne'  },
  { roll: 'TE-A-007', name: 'George Miller',   emailLocal: 'george.miller'   },
  { roll: 'TE-A-008', name: 'Hannah Abbott',   emailLocal: 'hannah.abbott'   },
  { roll: 'TE-A-009', name: 'Ian Wright',      emailLocal: 'ian.wright'      },
  { roll: 'TE-A-010', name: 'Julia Roberts',   emailLocal: 'julia.roberts'   },
  { roll: 'TE-A-011', name: 'Kevin Hart',      emailLocal: 'kevin.hart'      },
  { roll: 'TE-A-012', name: 'Lana Del Rey',    emailLocal: 'lana.delrey'     },
];

const studentSeedsB: StudentSeed[] = [
  { roll: 'TE-B-001', name: 'Mateo Alvarez',   emailLocal: 'mateo.alvarez'   },
  { roll: 'TE-B-002', name: 'Nadia Khan',      emailLocal: 'nadia.khan'      },
  { roll: 'TE-B-003', name: 'Owen Park',       emailLocal: 'owen.park'       },
  { roll: 'TE-B-004', name: 'Priya Nair',      emailLocal: 'priya.nair'      },
];

interface SubjectSeed { code: string; name: string; credits: number }
const subjectSeeds: SubjectSeed[] = [
  { code: 'CS-301', name: 'Data Structures & Algorithms', credits: 4 },
  { code: 'CS-302', name: 'Operating Systems',             credits: 4 },
  { code: 'CS-303', name: 'Database Management',           credits: 3 },
  { code: 'CS-304', name: 'Machine Learning Foundations',  credits: 3 },
];

interface TeacherSeed {
  name: string;
  emailLocal: string;
  department: string;
  subjectCodes: string[];
  divisionCodes: string[];
}
const teacherSeeds: TeacherSeed[] = [
  {
    name: 'Prof. Adrian Miller', emailLocal: 'prof.adrian',
    department: 'Department of CS',
    subjectCodes: ['CS-301', 'CS-302'],
    divisionCodes: ['TE-A', 'TE-B'],
  },
  {
    name: 'Dr. Sarah Johnson', emailLocal: 'prof.sarah',
    department: 'Department of CS',
    subjectCodes: ['CS-303'],
    divisionCodes: ['TE-A', 'TE-C'],
  },
  {
    name: 'Prof. Mark Taylor', emailLocal: 'prof.mark',
    department: 'Department of CS',
    subjectCodes: ['CS-304'],
    divisionCodes: ['TE-A', 'TE-B', 'TE-C'],
  },
];

interface SlotSeed { weekday: 1|2|3|4|5; start: string; end: string; subject: string; teacher: string; room: string }
// Monday–Friday slots for TE-A.
const slotSeedsA: SlotSeed[] = [
  { weekday: 1, start: '09:00', end: '10:00', subject: 'CS-301', teacher: 'prof.adrian', room: 'Lab 402'     },
  { weekday: 1, start: '10:15', end: '11:15', subject: 'CS-302', teacher: 'prof.adrian', room: 'Hall 12B'    },
  { weekday: 1, start: '11:30', end: '12:30', subject: 'CS-303', teacher: 'prof.sarah',  room: 'Smart Class 1' },
  { weekday: 1, start: '14:00', end: '15:00', subject: 'CS-304', teacher: 'prof.mark',   room: 'Hall 05A'    },

  { weekday: 2, start: '09:00', end: '10:00', subject: 'CS-302', teacher: 'prof.adrian', room: 'Lab 402'     },
  { weekday: 2, start: '10:15', end: '11:15', subject: 'CS-304', teacher: 'prof.mark',   room: 'Hall 12B'    },
  { weekday: 2, start: '13:00', end: '14:00', subject: 'CS-303', teacher: 'prof.sarah',  room: 'Smart Class 1' },

  { weekday: 3, start: '09:00', end: '10:00', subject: 'CS-301', teacher: 'prof.adrian', room: 'Lab 402'     },
  { weekday: 3, start: '10:15', end: '11:15', subject: 'CS-303', teacher: 'prof.sarah',  room: 'Hall 12B'    },
  { weekday: 3, start: '11:30', end: '12:30', subject: 'CS-304', teacher: 'prof.mark',   room: 'Smart Class 1' },

  { weekday: 4, start: '09:00', end: '10:00', subject: 'CS-302', teacher: 'prof.adrian', room: 'Lab 402'     },
  { weekday: 4, start: '10:15', end: '11:15', subject: 'CS-301', teacher: 'prof.adrian', room: 'Hall 12B'    },
  { weekday: 4, start: '14:00', end: '15:00', subject: 'CS-304', teacher: 'prof.mark',   room: 'Hall 05A'    },

  { weekday: 5, start: '09:00', end: '10:00', subject: 'CS-303', teacher: 'prof.sarah',  room: 'Smart Class 1' },
  { weekday: 5, start: '10:15', end: '11:15', subject: 'CS-301', teacher: 'prof.adrian', room: 'Lab 402'     },
  { weekday: 5, start: '11:30', end: '12:30', subject: 'CS-302', teacher: 'prof.adrian', room: 'Hall 12B'    },
];

// Lighter Mon-Wed timetable for TE-B (a different teacher mix).
const slotSeedsB: SlotSeed[] = [
  { weekday: 1, start: '09:00', end: '10:00', subject: 'CS-301', teacher: 'prof.adrian', room: 'Lab 403'  },
  { weekday: 1, start: '10:15', end: '11:15', subject: 'CS-304', teacher: 'prof.mark',   room: 'Hall 14' },
  { weekday: 2, start: '09:00', end: '10:00', subject: 'CS-302', teacher: 'prof.adrian', room: 'Lab 403'  },
  { weekday: 2, start: '11:30', end: '12:30', subject: 'CS-304', teacher: 'prof.mark',   room: 'Hall 14' },
  { weekday: 3, start: '09:00', end: '10:00', subject: 'CS-301', teacher: 'prof.adrian', room: 'Lab 403'  },
  { weekday: 3, start: '11:30', end: '12:30', subject: 'CS-302', teacher: 'prof.adrian', room: 'Hall 14' },
];

/* ----------------------------------------------------------------------
 *  Helpers
 * ------------------------------------------------------------------- */

const upsertBranch = async () => {
  const doc = await Branch.findOneAndUpdate(
    { code: 'CS' },
    { code: 'CS', name: 'Computer Engineering' },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return doc;
};

const upsertAcademicYear = async () => {
  const code = '2024-25';
  const doc = await AcademicYear.findOneAndUpdate(
    { code },
    {
      code,
      startsAt: new Date(Date.UTC(2024, 5, 1)),
      endsAt: new Date(Date.UTC(2025, 4, 31)),
      isCurrent: true,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return doc;
};

const upsertDivisions = async (branchId: Types.ObjectId, yearId: Types.ObjectId) => {
  const codes = ['TE-A', 'TE-B', 'TE-C'];
  const divisions = await Promise.all(codes.map((code) =>
    Division.findOneAndUpdate(
      { code, academicYear: yearId },
      {
        code,
        name: `Third Year ${code.slice(-1)}`,
        branch: branchId,
        year: 'TE',
        academicYear: yearId,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
  ));
  return Object.fromEntries(divisions.map(d => [d.code, d]));
};

const upsertSubjects = async (branchId: Types.ObjectId) => {
  const subjects = await Promise.all(subjectSeeds.map((s) =>
    Subject.findOneAndUpdate(
      { code: s.code },
      { ...s, branch: branchId, year: 'TE' },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
  ));
  return Object.fromEntries(subjects.map(s => [s.code, s]));
};

const upsertTeachers = async (
  branchId: Types.ObjectId,
  divisions: Record<string, { _id: Types.ObjectId; code: string }>,
  subjects: Record<string, { _id: Types.ObjectId; code: string }>
) => {
  const passwordHash = await hashPassword(TEACHER_PASSWORD);
  const teachers: Record<string, TeacherDoc> = {};
  for (const t of teacherSeeds) {
    const email = `${t.emailLocal}@university.edu`;
    await User.deleteOne({ email });
    const subjectRefs = t.subjectCodes.map((c) => subjects[c]!._id);
    const divisionRefs = t.divisionCodes.map((c) => divisions[c]!._id);
    const doc = await Teacher.create({
      email,
      passwordHash,
      name: t.name,
      branch: 'Computer Engineering',
      department: t.department,
      courses: t.subjectCodes,
      assignedDivisions: t.divisionCodes,
      branchRef: branchId,
      subjectRefs,
      divisionRefs,
      status: 'active',
    });
    teachers[t.emailLocal] = doc;
  }
  return teachers;
};

const upsertStudents = async (
  branchId: Types.ObjectId,
  division: { _id: Types.ObjectId; code: string },
  seeds: StudentSeed[]
) => {
  const passwordHash = await hashPassword(STUDENT_PASSWORD);
  const students: StudentDoc[] = [];
  for (const s of seeds) {
    const email = `${s.emailLocal}@university.edu`;
    await User.deleteOne({ email });
    const doc = await Student.create({
      email,
      passwordHash,
      name: s.name,
      branch: 'Computer Engineering',
      year: 'TE',
      division: division.code,
      rollNumber: s.roll,
      branchRef: branchId,
      divisionRef: division._id,
      status: 'active',
    });
    students.push(doc);
  }
  return students;
};

const upsertSchedules = async (
  division: { _id: Types.ObjectId },
  academicYearId: Types.ObjectId,
  teachers: Record<string, { _id: Types.ObjectId }>,
  subjects: Record<string, { _id: Types.ObjectId }>,
  slots: SlotSeed[]
) => {
  // Wipe ALL existing schedules + lectures + attendance for this division so a
  // re-seed never leaves orphan rows behind (lectures pointing at old schedule
  // ids would otherwise survive forever and double-up in the UI).
  await Attendance.deleteMany({ division: division._id });
  await Lecture.deleteMany({ division: division._id });
  await Schedule.deleteMany({ division: division._id });

  const created = await Schedule.insertMany(
    slots.map((slot) => ({
      division: division._id,
      subject: subjects[slot.subject]!._id,
      teacher: teachers[slot.teacher]!._id,
      weekday: slot.weekday,
      startTime: slot.start,
      endTime: slot.end,
      room: slot.room,
      academicYear: academicYearId,
    }))
  );
  return created;
};

const materialiseLectures = async (
  division: { _id: Types.ObjectId },
  daysBack: number,
  daysAhead: number
) => {
  const today = toMidnightUTC(new Date());
  const dates: Date[] = [];
  for (let offset = -daysBack; offset <= daysAhead; offset++) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() + offset);
    const wd = isoWeekday(d);
    if (wd >= 1 && wd <= 5) dates.push(d);
  }

  // Pull all schedules for the division.
  const schedules = await Schedule.find({ division: division._id });
  const lectures: LectureDoc[] = [];

  for (const date of dates) {
    const weekday = isoWeekday(date);
    const todays = schedules.filter((s) => s.weekday === weekday);
    for (const s of todays) {
      // Delete any existing instance for clean re-seed.
      await Lecture.deleteOne({ schedule: s._id, date });
      const status = date < toMidnightUTC(new Date()) ? 'completed' : 'scheduled';
      const lec = await Lecture.create({
        schedule: s._id,
        division: s.division,
        subject: s.subject,
        teacher: s.teacher,
        date,
        startTime: s.startTime,
        endTime: s.endTime,
        room: s.room,
        status,
        attendanceMarkedAt: status === 'completed' ? date : undefined,
      });
      lectures.push(lec);
    }
  }
  return lectures;
};

const seedAttendance = async (
  lectures: Array<{ _id: Types.ObjectId; division: Types.ObjectId; subject: Types.ObjectId; teacher: Types.ObjectId; status: string }>,
  students: Array<{ _id: Types.ObjectId }>
) => {
  // Clear old records for this set of lectures.
  await Attendance.deleteMany({ lecture: { $in: lectures.map((l) => l._id) } });

  const records: Array<Record<string, unknown>> = [];
  for (const lec of lectures) {
    if (lec.status !== 'completed') continue;
    // ~88% present overall, with two students intentionally weak.
    for (const [idx, student] of students.entries()) {
      let pPresent = 0.92;
      if (idx === 1) pPresent = 0.55; // Bella — chronic absentee
      else if (idx === 4) pPresent = 0.65; // Ethan — borderline
      const r = Math.random();
      let status: AttendanceStatus;
      if (r < pPresent) status = 'present';
      else if (r < pPresent + 0.05) status = 'late';
      else status = 'absent';

      records.push({
        lecture: lec._id,
        student: student._id,
        division: lec.division,
        subject: lec.subject,
        status,
        markedBy: lec.teacher,
        markedAt: new Date(),
      });
    }
  }
  if (records.length) await Attendance.insertMany(records);
  return records.length;
};

/* ----------------------------------------------------------------------
 *  Entry
 * ------------------------------------------------------------------- */

const wipeDemoData = async () => {
  // Full reset: every attendance-related collection + all student/teacher users.
  // Admin accounts (role: 'admin') are intentionally preserved.
  const result = await Promise.all([
    Attendance.deleteMany({}),
    Lecture.deleteMany({}),
    Schedule.deleteMany({}),
    Subject.deleteMany({}),
    Division.deleteMany({}),
    Branch.deleteMany({}),
    AcademicYear.deleteMany({}),
    User.deleteMany({ role: { $in: ['student', 'teacher'] } }),
  ]);
  logger.info('Demo data wiped before re-seed', {
    attendance: result[0].deletedCount,
    lectures: result[1].deletedCount,
    schedules: result[2].deletedCount,
    subjects: result[3].deletedCount,
    divisions: result[4].deletedCount,
    branches: result[5].deletedCount,
    academicYears: result[6].deletedCount,
    users: result[7].deletedCount,
  });
};

const main = async () => {
  await connectDatabase();
  logger.info('Seeding demo data…');

  await wipeDemoData();

  const branch = await upsertBranch();
  const academicYear = await upsertAcademicYear();
  const divisions = await upsertDivisions(branch._id, academicYear._id);
  const subjects = await upsertSubjects(branch._id);

  const teA = divisions['TE-A']!;
  const teB = divisions['TE-B']!;
  const teachers = await upsertTeachers(branch._id, divisions, subjects);

  const studentsA = await upsertStudents(branch._id, teA, studentSeedsA);
  const studentsB = await upsertStudents(branch._id, teB, studentSeedsB);

  const teacherEntries = Object.values(teachers);
  await upsertSchedules(teA, academicYear._id, teachers, subjects, slotSeedsA);
  await upsertSchedules(teB, academicYear._id, teachers, subjects, slotSeedsB);

  const lecturesA = await materialiseLectures(teA, 14, 7);
  const lecturesB = await materialiseLectures(teB, 14, 7);
  const attendanceCountA = await seedAttendance(lecturesA, studentsA);
  const attendanceCountB = await seedAttendance(lecturesB, studentsB);

  logger.info('Seed complete', {
    branch: branch.code,
    academicYear: academicYear.code,
    divisions: Object.keys(divisions),
    subjects: Object.keys(subjects),
    teachers: teacherEntries.length,
    studentsA: studentsA.length,
    studentsB: studentsB.length,
    lecturesA: lecturesA.length,
    lecturesB: lecturesB.length,
    attendanceRecords: attendanceCountA + attendanceCountB,
  });

  logger.info('Sample credentials', {
    teacher: 'prof.adrian@university.edu / ' + TEACHER_PASSWORD,
    studentA: studentSeedsA[0]!.emailLocal + '@university.edu / ' + STUDENT_PASSWORD,
    studentB: studentSeedsB[0]!.emailLocal + '@university.edu / ' + STUDENT_PASSWORD,
  });

  await disconnectDatabase();
  process.exit(0);
};

main().catch((err) => {
  logger.error('Seed failed', err as Error);
  process.exit(1);
});
