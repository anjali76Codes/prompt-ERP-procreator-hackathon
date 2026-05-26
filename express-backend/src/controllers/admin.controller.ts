import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/async-handler';
import { listPendingTeachers, setTeacherStatus } from '../services/user.service';
import { logger } from '../utils/logger';
import { BadRequest } from '../utils/http-errors';

export const getPendingTeachers = asyncHandler(async (_req: Request, res: Response) => {
  const list = await listPendingTeachers();
  res.json({ teachers: list.map(t => t.toJSON()) });
});

export const approveTeacher = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id;
  if (!id) throw BadRequest('Teacher id required');
  const updated = await setTeacherStatus(id, 'active');
  logger.info(`Teacher approved`, { id: updated._id.toString(), by: req.auth?.sub });
  res.json({ teacher: updated.toJSON() });
});

export const rejectTeacher = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id;
  if (!id) throw BadRequest('Teacher id required');
  const updated = await setTeacherStatus(id, 'rejected');
  logger.info(`Teacher rejected`, { id: updated._id.toString(), by: req.auth?.sub });
  res.json({ teacher: updated.toJSON() });
});
