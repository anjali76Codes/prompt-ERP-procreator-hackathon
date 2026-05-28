import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/async-handler';
import { BadRequest, Unauthorized } from '../utils/http-errors';
import * as submissions from '../services/submission.service';
import { gradeSubmissionSchema } from '../validators/submission.validator';

const filesFromReq = (req: Request): Express.Multer.File[] => {
  const f = (req as Request & {
    files?: Express.Multer.File[] | Record<string, Express.Multer.File[]>;
  }).files;
  if (!f) return [];
  return Array.isArray(f) ? f : Object.values(f).flat();
};

/* ------------------------------ Student ---------------------------------- */

export const submit = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw Unauthorized();
  const resourceId = req.params.id;
  if (!resourceId) throw BadRequest('Assignment id required');

  const doc = await submissions.submitToResource(
    resourceId,
    req.auth.sub,
    filesFromReq(req)
  );
  res.status(201).json({ submission: doc });
});

export const getMine = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw Unauthorized();
  const resourceId = req.params.id;
  if (!resourceId) throw BadRequest('Assignment id required');
  const doc = await submissions.getMySubmission(resourceId, req.auth.sub);
  res.json({ submission: doc });
});

export const listMine = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw Unauthorized();
  const docs = await submissions.listMySubmissions(req.auth.sub);
  res.json({ submissions: docs });
});

/* ------------------------------ Teacher ---------------------------------- */

export const listForResource = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw Unauthorized();
  const resourceId = req.params.id;
  if (!resourceId) throw BadRequest('Assignment id required');

  const docs = await submissions.listSubmissionsForResource(resourceId, req.auth.sub);
  res.json({ submissions: docs });
});

export const grade = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw Unauthorized();
  const submissionId = req.params.id;
  if (!submissionId) throw BadRequest('Submission id required');

  const parsed = gradeSubmissionSchema.safeParse(req.body);
  if (!parsed.success) {
    throw BadRequest('Validation failed', parsed.error.flatten().fieldErrors);
  }

  const doc = await submissions.gradeSubmission(submissionId, req.auth.sub, parsed.data);
  res.json({ submission: doc });
});

export const requestResubmit = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw Unauthorized();
  const submissionId = req.params.id;
  if (!submissionId) throw BadRequest('Submission id required');

  const doc = await submissions.requestResubmission(submissionId, req.auth.sub);
  res.json({ submission: doc });
});

export const notifyNonSubmitters = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw Unauthorized();
  const resourceId = req.params.id;
  if (!resourceId) throw BadRequest('Assignment id required');

  const message = typeof req.body?.message === 'string' ? req.body.message : undefined;
  const result = await submissions.notifyNonSubmitters(resourceId, req.auth.sub, message);
  res.json(result);
});
