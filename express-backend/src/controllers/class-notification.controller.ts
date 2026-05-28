/**
 * "Notify Class" controller — same fan-out as announcements but with
 * `kind:'reminder'`, so it lives in its own inbox slice on the dashboard
 * and is distinguished from general announcements in students' inboxes.
 */

import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/async-handler';
import { Unauthorized } from '../utils/http-errors';
import * as broadcasts from '../services/announcement.service';

const requireUser = (req: Request): string => {
  if (!req.auth) throw Unauthorized();
  return req.auth.sub;
};

export const send = asyncHandler(async (req: Request, res: Response) => {
  const teacherId = requireUser(req);
  const summary = await broadcasts.broadcastAnnouncement(teacherId, req.body, {
    kind: 'reminder',
  });
  res.status(201).json({ notification: summary });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const teacherId = requireUser(req);
  const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) || 50 : 50;
  const items = await broadcasts.listMyAnnouncements(teacherId, {
    limit,
    kind: 'reminder',
  });
  res.json({ notifications: items });
});
