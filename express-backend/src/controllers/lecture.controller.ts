import { Types } from 'mongoose';
import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/async-handler';
import * as lectures from '../services/lecture.service';
import { lectureRoster } from '../services/attendance.service';
import { BadRequest, Unauthorized } from '../utils/http-errors';

export const createLecture = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw Unauthorized();
  const lecture = await lectures.createLecture(req.body, new Types.ObjectId(req.auth.sub));
  res.status(201).json({ lecture });
});

export const getLectures = asyncHandler(async (req: Request, res: Response) => {
  const { divisionId, teacherId, from, to, date, mine } =
    req.query as Record<string, string | undefined>;

  const finalTeacherId =
    mine === '1' || mine === 'true'
      ? req.auth?.sub
      : teacherId;

  const list = await lectures.listLectures({
    divisionId,
    teacherId: finalTeacherId,
    from, to, date,
  });
  res.json({ lectures: list });
});

export const getLecture = asyncHandler(async (req, res) => {
  const id = req.params.id;
  if (!id) throw BadRequest('Lecture id required');
  res.json({ lecture: await lectures.findLecture(id) });
});

export const getLectureRoster = asyncHandler(async (req, res) => {
  const id = req.params.id;
  if (!id) throw BadRequest('Lecture id required');
  res.json({ roster: await lectureRoster(id) });
});

/* ---- Schedules ---- */

export const getSchedules = asyncHandler(async (req: Request, res: Response) => {
  const { divisionId, teacherId, mine } = req.query as Record<string, string | undefined>;
  const finalTeacherId =
    mine === '1' || mine === 'true' ? req.auth?.sub : teacherId;
  res.json({ schedules: await lectures.listSchedules({ divisionId, teacherId: finalTeacherId }) });
});

export const createSchedule = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw Unauthorized();
  const body = { ...req.body, teacher: req.body.teacher ?? req.auth.sub };
  res.status(201).json({ schedule: await lectures.createSchedule(body) });
});

export const deleteSchedule = asyncHandler(async (req, res) => {
  const id = req.params.id;
  if (!id) throw BadRequest('Schedule id required');
  await lectures.deleteSchedule(id);
  res.status(204).end();
});

/** Generate concrete lectures from the schedule template for a specific date. */
export const materialiseDay = asyncHandler(async (req, res) => {
  const date = (req.body?.date ?? req.query.date) as string | undefined;
  if (!date) throw BadRequest('date (YYYY-MM-DD) is required');
  const created = await lectures.materialiseLecturesForDate(new Date(date));
  res.json({ created });
});

export const cancelLecture = asyncHandler(async (req, res) => {
  const id = req.params.id;
  if (!id) throw BadRequest('Lecture id required');
  const lecture = await lectures.cancelLecture(id, req.body?.note);
  res.json({ lecture });
});

export const restoreLecture = asyncHandler(async (req, res) => {
  const id = req.params.id;
  if (!id) throw BadRequest('Lecture id required');
  const lecture = await lectures.restoreLecture(id);
  res.json({ lecture });
});
