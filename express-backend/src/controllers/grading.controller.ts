import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/async-handler';
import { BadRequest, Unauthorized } from '../utils/http-errors';
import * as grading from '../services/grading.service';
import {
  setRubricSchema, proposeGradeSchema,
  publishGradeSchema, bulkPublishSchema,
} from '../validators/grading.validator';

export const setRubric = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw Unauthorized();
  const id = req.params.id;
  if (!id) throw BadRequest('Assignment id required');

  const parsed = setRubricSchema.safeParse(req.body);
  if (!parsed.success) {
    throw BadRequest('Validation failed', parsed.error.flatten().fieldErrors);
  }
  const resource = await grading.setRubric(id, req.auth.sub, parsed.data);
  res.json({ resource });
});

export const getRubric = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id;
  if (!id) throw BadRequest('Assignment id required');
  const rubric = await grading.getRubric(id);
  res.json({ rubric });
});

export const proposeGrade = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw Unauthorized();
  const id = req.params.id;
  if (!id) throw BadRequest('Submission id required');

  const parsed = proposeGradeSchema.safeParse(req.body);
  if (!parsed.success) {
    throw BadRequest('Validation failed', parsed.error.flatten().fieldErrors);
  }
  const doc = await grading.proposeGrade(id, req.auth.sub, parsed.data);
  res.json({ submission: doc });
});

export const publishGrade = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw Unauthorized();
  const id = req.params.id;
  if (!id) throw BadRequest('Submission id required');

  const parsed = publishGradeSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    throw BadRequest('Validation failed', parsed.error.flatten().fieldErrors);
  }
  const doc = await grading.publishGrade(id, req.auth.sub, parsed.data);
  res.json({ submission: doc });
});

export const bulkPublish = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw Unauthorized();
  const id = req.params.id;
  if (!id) throw BadRequest('Assignment id required');

  const parsed = bulkPublishSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    throw BadRequest('Validation failed', parsed.error.flatten().fieldErrors);
  }
  const result = await grading.bulkPublishGrades(id, req.auth.sub, parsed.data);
  res.json(result);
});

export const review = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw Unauthorized();
  const id = req.params.id;
  if (!id) throw BadRequest('Assignment id required');
  const data = await grading.listGradingReview(id, req.auth.sub);
  res.json(data);
});
