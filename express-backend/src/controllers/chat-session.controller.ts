import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/async-handler';
import { BadRequest, Unauthorized } from '../utils/http-errors';
import * as svc from '../services/chat-session.service';

const messageRoleEnum = z.enum(['user', 'ai']);

const createSessionSchema = z.object({
  threadId: z.string().trim().min(1).max(200),
  title:    z.string().trim().max(120).optional(),
});

const appendMessagesSchema = z.object({
  messages: z.array(z.object({
    role: messageRoleEnum,
    text: z.string().default(''),
    meta: z.record(z.string(), z.unknown()).optional(),
  })).min(1),
});

const renameSchema = z.object({
  title: z.string().trim().min(1).max(120),
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw Unauthorized();
  const parsed = createSessionSchema.safeParse(req.body);
  if (!parsed.success) throw BadRequest('Validation failed', parsed.error.flatten().fieldErrors);
  const doc = await svc.createSession(req.auth.sub, parsed.data.threadId, parsed.data.title);
  res.status(201).json({ session: doc });
});

export const listMine = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw Unauthorized();
  const limit = Number(req.query.limit ?? 30);
  const sessions = await svc.listMyRecentSessions(req.auth.sub, Number.isFinite(limit) ? limit : 30);
  res.json({ sessions });
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw Unauthorized();
  const id = req.params.id;
  if (!id) throw BadRequest('Session id required');
  const doc = await svc.getSession(id, req.auth.sub);
  res.json({ session: doc });
});

export const append = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw Unauthorized();
  const id = req.params.id;
  if (!id) throw BadRequest('Session id required');
  const parsed = appendMessagesSchema.safeParse(req.body);
  if (!parsed.success) throw BadRequest('Validation failed', parsed.error.flatten().fieldErrors);
  const doc = await svc.appendMessages(id, req.auth.sub, parsed.data.messages);
  res.json({ session: doc });
});

export const rename = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw Unauthorized();
  const id = req.params.id;
  if (!id) throw BadRequest('Session id required');
  const parsed = renameSchema.safeParse(req.body);
  if (!parsed.success) throw BadRequest('Validation failed', parsed.error.flatten().fieldErrors);
  const doc = await svc.renameSession(id, req.auth.sub, parsed.data.title);
  res.json({ session: doc });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw Unauthorized();
  const id = req.params.id;
  if (!id) throw BadRequest('Session id required');
  await svc.deleteSession(id, req.auth.sub);
  res.status(204).end();
});
