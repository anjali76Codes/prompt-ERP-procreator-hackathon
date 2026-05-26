import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/async-handler';
import { BadRequest, Unauthorized } from '../utils/http-errors';
import * as notifications from '../services/notification.service';

const requireUser = (req: Request): string => {
  if (!req.auth) throw Unauthorized();
  return req.auth.sub;
};

export const send = asyncHandler(async (req: Request, res: Response) => {
  const sender = requireUser(req);
  const n = await notifications.sendOne(sender, req.body);
  res.status(201).json({ notification: n });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUser(req);
  const unreadOnly = req.query.unread === '1' || req.query.unread === 'true';
  const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) || 30 : 30;
  const items = await notifications.listMine(userId, { unreadOnly, limit });
  res.json({ notifications: items });
});

export const unreadCount = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUser(req);
  res.json({ count: await notifications.unreadCount(userId) });
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUser(req);
  const id = req.params.id;
  if (!id) throw BadRequest('Notification id required');
  await notifications.markRead(userId, id);
  res.status(204).end();
});

export const markAllRead = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUser(req);
  res.json(await notifications.markAllRead(userId));
});
