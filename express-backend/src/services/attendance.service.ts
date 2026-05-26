import { Types } from 'mongoose';
import { Attendance, type AttendanceDoc, type AttendanceStatus } from '../models/Attendance';
import { Lecture } from '../models/Lecture';
import { Student } from '../models/Student';
import { NotFound } from '../utils/http-errors';

interface MarkEntry {
  student: string;
  status: AttendanceStatus;
  remarks?: string;
}

interface MarkInput {
  lectureId: string;
  entries: MarkEntry[];
  markedBy: Types.ObjectId;
}

/** Bulk upsert of attendance for one lecture. */
export const markAttendance = async ({
  lectureId, entries, markedBy,
}: MarkInput): Promise<{ count: number; lectureId: string }> => {
  const lecture = await Lecture.findById(lectureId);
  if (!lecture) throw NotFound('Lecture not found');

  const now = new Date();
  const ops = entries.map((e) => ({
    updateOne: {
      filter: { lecture: lecture._id, student: new Types.ObjectId(e.student) },
      update: {
        $set: {
          status: e.status,
          remarks: e.remarks,
          markedBy,
          markedAt: now,
          division: lecture.division,
          subject: lecture.subject,
        },
        $setOnInsert: {
          lecture: lecture._id,
          student: new Types.ObjectId(e.student),
        },
      },
      upsert: true,
    },
  }));

  const result = await Attendance.bulkWrite(ops, { ordered: false });

  lecture.status = 'completed';
  lecture.attendanceMarkedAt = now;
  await lecture.save();

  const upserted = result.upsertedCount ?? 0;
  const modified = result.modifiedCount ?? 0;
  return { count: upserted + modified, lectureId };
};

export const listAttendanceForLecture = (lectureId: string): Promise<AttendanceDoc[]> =>
  Attendance.find({ lecture: lectureId })
    .populate('student', 'name email rollNumber')
    .sort({ 'student.rollNumber': 1 });

/* ----------------------------------------------------------------------
 *  Aggregations / reports
 * ------------------------------------------------------------------- */

/** Per-student attendance % for a given subject. */
export const studentSubjectAttendance = async (
  studentId: string, subjectId?: string
): Promise<Array<{ subject: Types.ObjectId; total: number; present: number; pct: number }>> => {
  const match: Record<string, unknown> = { student: new Types.ObjectId(studentId) };
  if (subjectId) match.subject = new Types.ObjectId(subjectId);

  return Attendance.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$subject',
        total: { $sum: 1 },
        present: { $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] } },
      },
    },
    { $project: { _id: 0, subject: '$_id', total: 1, present: 1, pct: { $multiply: [{ $divide: ['$present', '$total'] }, 100] } } },
    { $sort: { subject: 1 } },
  ]);
};

/** Division-level statistics across all subjects. */
export const divisionAttendanceStats = async (divisionId: string) => {
  const stats = await Attendance.aggregate([
    { $match: { division: new Types.ObjectId(divisionId) } },
    {
      $group: {
        _id: '$student',
        total: { $sum: 1 },
        present: { $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] } },
      },
    },
    { $addFields: { pct: { $multiply: [{ $divide: ['$present', '$total'] }, 100] } } },
    {
      $lookup: {
        from: 'users', localField: '_id', foreignField: '_id', as: 'student',
      },
    },
    { $unwind: '$student' },
    {
      $project: {
        _id: 0,
        studentId: '$_id',
        name: '$student.name',
        rollNumber: '$student.rollNumber',
        total: 1, present: 1, pct: 1,
      },
    },
    { $sort: { pct: 1 } },
  ]);
  return stats;
};

/** Subject-wise average attendance for a division. */
export const divisionSubjectAverages = async (divisionId: string) => {
  return Attendance.aggregate([
    { $match: { division: new Types.ObjectId(divisionId) } },
    {
      $group: {
        _id: '$subject',
        total: { $sum: 1 },
        present: { $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] } },
      },
    },
    { $addFields: { pct: { $multiply: [{ $divide: ['$present', '$total'] }, 100] } } },
    {
      $lookup: {
        from: 'subjects', localField: '_id', foreignField: '_id', as: 'subject',
      },
    },
    { $unwind: '$subject' },
    {
      $project: {
        _id: 0,
        subjectId: '$subject._id',
        code: '$subject.code',
        name: '$subject.name',
        total: 1, present: 1, pct: 1,
      },
    },
    { $sort: { pct: -1 } },
  ]);
};

export interface EligibilitySubject {
  subjectId: string;
  code: string;
  name: string;
  total: number;
  present: number;
  pct: number;
  threshold: number;
  eligible: boolean;
}

export interface EligibilityRow {
  studentId: string;
  name: string;
  rollNumber?: string;
  subjects: EligibilitySubject[];
  overallEligible: boolean;
}

/**
 * Per-student × per-subject exam eligibility for a division.
 * Uses Subject.minAttendancePct (default 75) as the cut-off.
 */
export const divisionEligibility = async (divisionId: string): Promise<EligibilityRow[]> => {
  const rows = await Attendance.aggregate([
    { $match: { division: new Types.ObjectId(divisionId) } },
    {
      $group: {
        _id: { student: '$student', subject: '$subject' },
        total: { $sum: 1 },
        present: { $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] } },
      },
    },
    { $addFields: { pct: { $multiply: [{ $divide: ['$present', '$total'] }, 100] } } },
    { $lookup: { from: 'users',    localField: '_id.student', foreignField: '_id', as: 'student' } },
    { $lookup: { from: 'subjects', localField: '_id.subject', foreignField: '_id', as: 'subject' } },
    { $unwind: '$student' },
    { $unwind: '$subject' },
    {
      $project: {
        _id: 0,
        studentId: '$student._id',
        name: '$student.name',
        rollNumber: '$student.rollNumber',
        subjectId: '$subject._id',
        code: '$subject.code',
        subjectName: '$subject.name',
        threshold: { $ifNull: ['$subject.minAttendancePct', 75] },
        total: 1, present: 1, pct: 1,
      },
    },
    { $sort: { rollNumber: 1, code: 1 } },
  ]);

  const byStudent = new Map<string, EligibilityRow>();
  for (const r of rows as Array<{
    studentId: { toString(): string }; name: string; rollNumber?: string;
    subjectId: { toString(): string }; code: string; subjectName: string;
    total: number; present: number; pct: number; threshold: number;
  }>) {
    const sid = r.studentId.toString();
    if (!byStudent.has(sid)) {
      byStudent.set(sid, {
        studentId: sid,
        name: r.name,
        rollNumber: r.rollNumber,
        subjects: [],
        overallEligible: true,
      });
    }
    const eligible = r.pct >= r.threshold;
    const row = byStudent.get(sid)!;
    row.subjects.push({
      subjectId: r.subjectId.toString(),
      code: r.code,
      name: r.subjectName,
      total: r.total,
      present: r.present,
      pct: r.pct,
      threshold: r.threshold,
      eligible,
    });
    if (!eligible) row.overallEligible = false;
  }
  return Array.from(byStudent.values());
};

/** Roll-call style fetch: students in division + their attendance for the lecture. */
export const lectureRoster = async (lectureId: string) => {
  const lecture = await Lecture.findById(lectureId);
  if (!lecture) throw NotFound('Lecture not found');

  const [students, attendance] = await Promise.all([
    Student.find({ divisionRef: lecture.division })
      .sort({ rollNumber: 1, name: 1 })
      .lean(),
    Attendance.find({ lecture: lecture._id }).lean(),
  ]);

  const byStudent = new Map<string, typeof attendance[number]>();
  for (const a of attendance) byStudent.set(a.student.toString(), a);

  return students.map((s) => ({
    student: s,
    attendance: byStudent.get(s._id.toString()) ?? null,
  }));
};
