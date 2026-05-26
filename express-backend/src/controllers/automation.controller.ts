import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/async-handler';
import { BadRequest, Unauthorized } from '../utils/http-errors';
import * as automation from '../services/automation.service';

const requireUser = (req: Request): string => {
  if (!req.auth) throw Unauthorized();
  return req.auth.sub;
};

export const list = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUser(req);
  res.json({ automations: await automation.listAutomations(userId) });
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUser(req);
  const id = req.params.id;
  if (!id) throw BadRequest('Automation id required');
  res.json({ automation: await automation.findAutomation(id, userId) });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUser(req);
  const a = await automation.createAutomation(userId, req.body);
  res.status(201).json({ automation: a });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUser(req);
  const id = req.params.id;
  if (!id) throw BadRequest('Automation id required');
  const a = await automation.updateAutomation(id, userId, req.body);
  res.json({ automation: a });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUser(req);
  const id = req.params.id;
  if (!id) throw BadRequest('Automation id required');
  await automation.deleteAutomation(id, userId);
  res.status(204).end();
});

export const recordRun = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUser(req);
  const id = req.params.id;
  if (!id) throw BadRequest('Automation id required');
  const run = await automation.recordRun(id, userId, req.body);
  res.status(201).json({ run });
});

export const listRuns = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUser(req);
  const id = req.params.id;
  if (!id) throw BadRequest('Automation id required');
  const limitRaw = req.query.limit;
  const limit = typeof limitRaw === 'string' ? Math.min(Math.max(parseInt(limitRaw, 10) || 20, 1), 100) : 20;
  res.json({ runs: await automation.listRuns(id, userId, limit) });
});
