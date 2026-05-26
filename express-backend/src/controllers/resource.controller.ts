import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/async-handler';
import { BadRequest, Unauthorized } from '../utils/http-errors';
import * as resources from '../services/resource.service';
import {
  createResourceSchema, updateResourceSchema, listResourceQuerySchema,
} from '../validators/resource.validator';

/* -------------------------- multipart helpers ----------------------------- */

const filesFromReq = (req: Request): Express.Multer.File[] => {
  const f = (req as Request & { files?: Express.Multer.File[] | Record<string, Express.Multer.File[]> }).files;
  if (!f) return [];
  return Array.isArray(f) ? f : Object.values(f).flat();
};

/* -------------------------- teacher endpoints ----------------------------- */

export const createResource = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw Unauthorized();

  const parsed = createResourceSchema.safeParse(req.body);
  if (!parsed.success) {
    throw BadRequest('Validation failed', parsed.error.flatten().fieldErrors);
  }

  const doc = await resources.createResource(
    parsed.data,
    req.auth.sub,
    filesFromReq(req)
  );
  res.status(201).json({ resource: doc });
});

export const updateResource = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw Unauthorized();
  const id = req.params.id;
  if (!id) throw BadRequest('Resource id required');

  const parsed = updateResourceSchema.safeParse(req.body);
  if (!parsed.success) {
    throw BadRequest('Validation failed', parsed.error.flatten().fieldErrors);
  }

  const doc = await resources.updateResource(id, parsed.data, req.auth.sub);
  res.json({ resource: doc });
});

export const addAttachments = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw Unauthorized();
  const id = req.params.id;
  if (!id) throw BadRequest('Resource id required');

  const doc = await resources.addAttachments(id, req.auth.sub, filesFromReq(req));
  res.json({ resource: doc });
});

export const removeAttachment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw Unauthorized();
  const { id, attId } = req.params;
  if (!id || !attId) throw BadRequest('Resource id and attachment id required');

  const doc = await resources.removeAttachment(id, attId, req.auth.sub);
  res.json({ resource: doc });
});

export const publishResource = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw Unauthorized();
  const id = req.params.id;
  if (!id) throw BadRequest('Resource id required');
  res.json({ resource: await resources.publishResource(id, req.auth.sub) });
});

export const unpublishResource = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw Unauthorized();
  const id = req.params.id;
  if (!id) throw BadRequest('Resource id required');
  res.json({ resource: await resources.unpublishResource(id, req.auth.sub) });
});

export const deleteResource = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw Unauthorized();
  const id = req.params.id;
  if (!id) throw BadRequest('Resource id required');
  await resources.deleteResource(id, req.auth.sub);
  res.status(204).end();
});

export const listResources = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw Unauthorized();

  const parsed = listResourceQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw BadRequest('Invalid query', parsed.error.flatten().fieldErrors);
  }

  const { kind, status, divisionId, subjectId, mine } = parsed.data;

  const filter: resources.ResourceListFilter = { kind, status, divisionId, subjectId };
  if (mine === '1' || mine === 'true') filter.teacherId = req.auth.sub;

  res.json({ resources: await resources.listResources(filter) });
});

export const getResource = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id;
  if (!id) throw BadRequest('Resource id required');
  res.json({ resource: await resources.findResource(id) });
});

/* -------------------------- student endpoint ------------------------------ */

export const listStudentFeed = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw Unauthorized();
  const { kind, subjectId } = req.query as Record<string, string | undefined>;

  const out = await resources.listResourcesForStudent(req.auth.sub, {
    kind: kind === 'assignment' || kind === 'notes' ? kind : undefined,
    subjectId,
  });
  res.json({ resources: out });
});
