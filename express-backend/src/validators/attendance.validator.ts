import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Must be HH:mm');

export const createLectureSchema = z.object({
  division: objectId,
  subject: objectId,
  teacher: objectId.optional(),  // defaults to caller if absent
  date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD')),
  startTime: hhmm,
  endTime: hhmm,
  room: z.string().min(1).trim(),
  schedule: objectId.optional(),
});

export const createScheduleSchema = z.object({
  division: objectId,
  subject: objectId,
  teacher: objectId.optional(),         // defaults to caller when teacher posts
  weekday: z.number().int().min(1).max(7),
  startTime: hhmm,
  endTime: hhmm,
  room: z.string().min(1).trim(),
  academicYear: objectId.optional(),    // defaults to current AcademicYear
});

export const attendanceEntrySchema = z.object({
  student: objectId,
  status: z.enum(['present', 'absent', 'late', 'excused']),
  remarks: z.string().trim().optional(),
});

export const markAttendanceSchema = z.object({
  entries: z.array(attendanceEntrySchema).min(1),
});

export const lectureListQuerySchema = z.object({
  divisionId: objectId.optional(),
  teacherId: objectId.optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type CreateLectureInput = z.infer<typeof createLectureSchema>;
export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;
export type LectureListQuery = z.infer<typeof lectureListQuerySchema>;
