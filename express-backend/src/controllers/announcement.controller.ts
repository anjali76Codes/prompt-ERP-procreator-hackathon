import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/async-handler';
import { Unauthorized } from '../utils/http-errors';
import * as announcements from '../services/announcement.service';

const requireUser = (req: Request): string => {
  if (!req.auth) throw Unauthorized();
  return req.auth.sub;
};

export const broadcast = asyncHandler(async (req: Request, res: Response) => {
  const teacherId = requireUser(req);
  const summary = await announcements.broadcastAnnouncement(teacherId, req.body);
  res.status(201).json({ announcement: summary });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const teacherId = requireUser(req);
  const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) || 50 : 50;
  const items = await announcements.listMyAnnouncements(teacherId, { limit });
  res.json({ announcements: items });
});
