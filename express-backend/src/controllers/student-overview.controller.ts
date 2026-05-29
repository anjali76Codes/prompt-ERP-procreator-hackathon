import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/async-handler';
import { Unauthorized } from '../utils/http-errors';
import * as overview from '../services/student-overview.service';

export const get = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw Unauthorized();
  const data = await overview.getStudentOverview(req.auth.sub);
  res.json(data);
});
