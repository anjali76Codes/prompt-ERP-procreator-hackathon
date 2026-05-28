import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/async-handler';
import { Unauthorized } from '../utils/http-errors';
import * as gradeBatch from '../services/grade-batch.service';

const requireUser = (req: Request): string => {
  if (!req.auth) throw Unauthorized();
  return req.auth.sub;
};

export const list = asyncHandler(async (req: Request, res: Response) => {
  const teacherId = requireUser(req);
  const items = await gradeBatch.listGradeBatchAssignments(teacherId);
  res.json({ assignments: items });
});
