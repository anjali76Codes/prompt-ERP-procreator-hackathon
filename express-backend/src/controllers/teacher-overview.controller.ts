import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/async-handler';
import { Unauthorized } from '../utils/http-errors';
import * as overview from '../services/teacher-overview.service';

const requireUser = (req: Request): string => {
  if (!req.auth) throw Unauthorized();
  return req.auth.sub;
};

export const get = asyncHandler(async (req: Request, res: Response) => {
  const teacherId = requireUser(req);
  const data = await overview.getTeacherOverview(teacherId);
  res.json(data);
});
