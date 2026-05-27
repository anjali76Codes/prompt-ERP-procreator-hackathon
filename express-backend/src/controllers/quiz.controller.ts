import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/async-handler';
import { BadRequest, Unauthorized } from '../utils/http-errors';
import * as svc from '../services/quiz.service';
import {
  createQuizSchema, updateQuizSchema, listQuizQuerySchema,
  startAttemptSchema, submitAttemptSchema,
} from '../validators/quiz.validator';

export const createQuiz = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw Unauthorized();
  const parsed = createQuizSchema.safeParse(req.body);
  if (!parsed.success) throw BadRequest('Validation failed', parsed.error.flatten().fieldErrors);
  const quiz = await svc.createQuiz(parsed.data, req.auth.sub);
  res.status(201).json({ quiz });
});

export const updateQuiz = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw Unauthorized();
  const id = req.params.id;
  if (!id) throw BadRequest('Quiz id required');
  const parsed = updateQuizSchema.safeParse(req.body);
  if (!parsed.success) throw BadRequest('Validation failed', parsed.error.flatten().fieldErrors);
  const quiz = await svc.updateQuiz(id, parsed.data, req.auth.sub);
  res.json({ quiz });
});

export const publishQuiz = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw Unauthorized();
  const id = req.params.id;
  if (!id) throw BadRequest('Quiz id required');
  res.json({ quiz: await svc.publishQuiz(id, req.auth.sub) });
});

export const unpublishQuiz = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw Unauthorized();
  const id = req.params.id;
  if (!id) throw BadRequest('Quiz id required');
  res.json({ quiz: await svc.unpublishQuiz(id, req.auth.sub) });
});

export const deleteQuiz = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw Unauthorized();
  const id = req.params.id;
  if (!id) throw BadRequest('Quiz id required');
  await svc.deleteQuiz(id, req.auth.sub);
  res.status(204).end();
});

export const listQuizzes = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw Unauthorized();
  const parsed = listQuizQuerySchema.safeParse(req.query);
  if (!parsed.success) throw BadRequest('Invalid query', parsed.error.flatten().fieldErrors);
  const page = parsed.data.page ? Number(parsed.data.page) : undefined;
  const pageSize = parsed.data.pageSize ? Number(parsed.data.pageSize) : undefined;
  const out = await svc.listQuizzes({
    divisionId: parsed.data.divisionId,
    subjectId: parsed.data.subjectId,
    teacherId: parsed.data.teacherId,
    status: parsed.data.status,
    search: parsed.data.search,
    page,
    pageSize,
  });
  res.json(out);
});

export const getQuiz = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id;
  if (!id) throw BadRequest('Quiz id required');
  res.json({ quiz: await svc.findQuiz(id) });
});

export const listStudentQuizzes = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw Unauthorized();
  const quizzes = await svc.listQuizzesForStudent(req.auth.sub);
  res.json({ quizzes });
});

/* ---------------- Student endpoints ---------------- */
export const startAttempt = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw Unauthorized();
  const parsed = startAttemptSchema.safeParse({ quizId: req.params.id });
  if (!parsed.success) throw BadRequest('Invalid request', parsed.error.flatten().fieldErrors);
  const attempt = await svc.startAttempt(parsed.data.quizId, req.auth.sub);
  res.status(201).json({ attempt });
});

export const submitAttempt = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw Unauthorized();
  const parsed = submitAttemptSchema.safeParse(req.body);
  if (!parsed.success) throw BadRequest('Invalid request', parsed.error.flatten().fieldErrors);
  const attempt = await svc.submitAttempt(parsed.data.quizId, req.auth.sub, parsed.data.answers, parsed.data.durationSeconds);
  res.json({ attempt });
});

/* ---------------- Teacher endpoints ---------------- */
export const listAttempts = asyncHandler(async (req: Request, res: Response) => {
  const quizId = req.params.id;
  if (!quizId) throw BadRequest('Quiz id required');
  res.json({ attempts: await svc.listAttempts(quizId) });
});

export const getAttempt = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id;
  if (!id) throw BadRequest('Attempt id required');
  res.json({ attempt: await svc.findAttempt(id) });
});

export const gradeAttempt = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw Unauthorized();
  const attemptId = req.params.id;
  if (!attemptId) throw BadRequest('Attempt id required');
  const perQuestion = req.body.perQuestion as Record<string, number>;
  if (!perQuestion) throw BadRequest('perQuestion points required');
  const attempt = await svc.gradeAttempt(attemptId, req.auth.sub, perQuestion);
  res.json({ attempt });
});

export const quizMetrics = asyncHandler(async (req: Request, res: Response) => {
  const quizId = req.params.id;
  if (!quizId) throw BadRequest('Quiz id required');
  res.json({ metrics: await svc.quizMetrics(quizId) });
});
