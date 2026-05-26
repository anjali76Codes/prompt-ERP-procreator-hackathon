import { Types } from 'mongoose';
import { Lecture, type LectureDoc } from '../models/Lecture';
import { Schedule, type ScheduleDoc } from '../models/Schedule';
import { NotFound, BadRequest } from '../utils/http-errors';
import type { CreateLectureInput, CreateScheduleInput } from '../validators/attendance.validator';

const toMidnightUTC = (d: string | Date): Date => {
  const date = typeof d === 'string' ? new Date(d) : d;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

/** Mongo ISO weekday: 1 = Mon, …, 7 = Sun. */
const isoWeekday = (d: Date): 1 | 2 | 3 | 4 | 5 | 6 | 7 => {
  const day = d.getUTCDay();         // 0 = Sun … 6 = Sat
  return (day === 0 ? 7 : day) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
};

/* ---------------------------------------------------------------- */
/*  Lectures                                                         */
/* ---------------------------------------------------------------- */

export const createLecture = async (
  input: CreateLectureInput,
  fallbackTeacher: Types.ObjectId
): Promise<LectureDoc> => {
  const teacher = input.teacher ? new Types.ObjectId(input.teacher) : fallbackTeacher;
  const date = toMidnightUTC(input.date);

  const doc = await Lecture.create({
    division: input.division,
    subject: input.subject,
    teacher,
    date,
    startTime: input.startTime,
    endTime: input.endTime,
    room: input.room,
    schedule: input.schedule,
  });
  return doc;
};

export const listLectures = async (filter: {
  divisionId?: string; teacherId?: string;
  from?: string; to?: string; date?: string;
}): Promise<LectureDoc[]> => {
  const q: Record<string, unknown> = {};
  if (filter.divisionId) q.division = filter.divisionId;
  if (filter.teacherId) q.teacher = filter.teacherId;
  if (filter.date) {
    const d = toMidnightUTC(filter.date);
    q.date = d;
  } else if (filter.from || filter.to) {
    const range: Record<string, Date> = {};
    if (filter.from) range.$gte = toMidnightUTC(filter.from);
    if (filter.to) range.$lte = toMidnightUTC(filter.to);
    q.date = range;
  }
  return Lecture.find(q)
    .populate('division subject teacher', 'code name email role startTime')
    .sort({ date: 1, startTime: 1 });
};

export const findLecture = async (id: string): Promise<LectureDoc> => {
  const doc = await Lecture.findById(id).populate('division subject teacher');
  if (!doc) throw NotFound('Lecture not found');
  return doc;
};

export const cancelLecture = async (id: string, note?: string): Promise<LectureDoc> => {
  const doc = await Lecture.findByIdAndUpdate(
    id,
    { status: 'cancelled', notes: note ?? 'Cancelled by teacher' },
    { new: true }
  );
  if (!doc) throw NotFound('Lecture not found');
  return doc;
};

export const restoreLecture = async (id: string): Promise<LectureDoc> => {
  const doc = await Lecture.findByIdAndUpdate(
    id,
    { status: 'scheduled', notes: undefined },
    { new: true }
  );
  if (!doc) throw NotFound('Lecture not found');
  return doc;
};

/* ---------------------------------------------------------------- */
/*  Schedules + Materialisation                                      */
/* ---------------------------------------------------------------- */

export const listSchedules = async (filter: {
  divisionId?: string; teacherId?: string;
}): Promise<ScheduleDoc[]> => {
  const q: Record<string, unknown> = {};
  if (filter.divisionId) q.division = filter.divisionId;
  if (filter.teacherId) q.teacher = filter.teacherId;
  return Schedule.find(q)
    .populate('division subject teacher academicYear', 'code name email role')
    .sort({ weekday: 1, startTime: 1 });
};

export const createSchedule = async (input: CreateScheduleInput): Promise<ScheduleDoc> => {
  let academicYear = input.academicYear;
  if (!academicYear) {
    const { AcademicYear } = await import('../models/AcademicYear');
    const current = await AcademicYear.findOne({ isCurrent: true });
    if (!current) throw BadRequest('No current academic year configured');
    academicYear = current._id.toString();
  }
  return Schedule.create({ ...input, academicYear });
};

export const deleteSchedule = async (id: string): Promise<void> => {
  const result = await Schedule.deleteOne({ _id: id });
  if (result.deletedCount === 0) throw NotFound('Schedule not found');
};

/**
 * Materialise all Schedule entries whose weekday matches `date` into concrete
 * Lecture records. No-op if a lecture already exists for that schedule+date.
 */
export const materialiseLecturesForDate = async (date: Date): Promise<LectureDoc[]> => {
  const day = toMidnightUTC(date);
  const weekday = isoWeekday(day);

  const schedules = await Schedule.find({ weekday });
  const created: LectureDoc[] = [];

  for (const sch of schedules) {
    try {
      const lecture = await Lecture.findOneAndUpdate(
        { schedule: sch._id, date: day },
        {
          $setOnInsert: {
            schedule: sch._id,
            division: sch.division,
            subject: sch.subject,
            teacher: sch.teacher,
            date: day,
            startTime: sch.startTime,
            endTime: sch.endTime,
            room: sch.room,
            status: 'scheduled',
          },
        },
        { upsert: true, new: true }
      );
      if (lecture) created.push(lecture);
    } catch {
      // ignore duplicate-key races
    }
  }
  return created;
};
