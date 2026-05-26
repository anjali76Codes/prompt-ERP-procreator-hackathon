import { Types } from 'mongoose';
import { Resource, type ResourceDoc, type ResourceAttachment } from '../models/Resource';
import { Division } from '../models/Division';
import { Teacher } from '../models/Teacher';
import { Student } from '../models/Student';
import { BadRequest, Forbidden, NotFound } from '../utils/http-errors';
import {
  uploadBufferToCloudinary, destroyCloudinaryFile, destroyManyCloudinaryFiles,
} from './cloudinary.service';
import type { CreateResourceInput, UpdateResourceInput } from '../validators/resource.validator';

const POPULATE_FIELDS = [
  { path: 'division', select: 'code name year branch' },
  { path: 'subject',  select: 'code name credits year' },
  { path: 'teacher',  select: 'name email' },
  { path: 'branch',   select: 'code name' },
];

/* -------------------------------------------------------------------------- */
/*  Authorisation helpers                                                     */
/* -------------------------------------------------------------------------- */

const assertTeacherOwns = (doc: ResourceDoc, teacherId: string): void => {
  if (doc.teacher.toString() !== teacherId) {
    throw Forbidden('Only the owner can modify this resource');
  }
};

/**
 * Verify the teacher is allowed to publish into this division+subject,
 * and resolve the branch from the division.
 */
const assertTeacherScope = async (
  teacherId: string,
  divisionId: string,
  subjectId: string
): Promise<{ branchId: Types.ObjectId }> => {
  const division = await Division.findById(divisionId);
  if (!division) throw BadRequest('Division not found');

  const teacher = await Teacher.findById(teacherId).select('divisionRefs subjectRefs');
  if (!teacher) throw Forbidden('Teacher profile not found');

  const teachesDivision = teacher.divisionRefs.some(d => d.toString() === divisionId);
  const teachesSubject  = teacher.subjectRefs.some(s => s.toString() === subjectId);
  if (!teachesDivision) throw Forbidden('You are not assigned to this division');
  if (!teachesSubject)  throw Forbidden('You are not assigned to teach this subject');

  return { branchId: division.branch };
};

/* -------------------------------------------------------------------------- */
/*  Upload helper                                                              */
/* -------------------------------------------------------------------------- */

const uploadFiles = async (
  files: Express.Multer.File[],
  divisionId: string,
  subjectId: string
): Promise<ResourceAttachment[]> => {
  if (!files || files.length === 0) return [];
  const scope = `${divisionId}/${subjectId}`;
  return Promise.all(
    files.map(f =>
      uploadBufferToCloudinary(f.buffer, {
        scope,
        originalName: f.originalname,
        mimeType: f.mimetype,
      })
    )
  );
};

/* -------------------------------------------------------------------------- */
/*  Mutations                                                                  */
/* -------------------------------------------------------------------------- */

export const createResource = async (
  input: CreateResourceInput,
  teacherId: string,
  files: Express.Multer.File[]
): Promise<ResourceDoc> => {
  if (!files || files.length === 0) {
    throw BadRequest('At least one attachment is required');
  }

  const { branchId } = await assertTeacherScope(teacherId, input.division, input.subject);
  const attachments = await uploadFiles(files, input.division, input.subject);

  const doc = await Resource.create({
    kind: input.kind,
    status: 'draft',
    division: input.division,
    subject: input.subject,
    teacher: teacherId,
    branch: branchId,
    title: input.title,
    description: input.description,
    dueDate: input.kind === 'assignment' && input.dueDate ? new Date(input.dueDate) : undefined,
    maxMarks: input.kind === 'assignment' ? input.maxMarks : undefined,
    unit: input.kind === 'notes' ? input.unit : undefined,
    attachments,
  });

  return doc.populate(POPULATE_FIELDS);
};

export const updateResource = async (
  id: string,
  input: UpdateResourceInput,
  teacherId: string
): Promise<ResourceDoc> => {
  const doc = await Resource.findById(id);
  if (!doc) throw NotFound('Resource not found');
  assertTeacherOwns(doc, teacherId);

  if (input.title !== undefined) doc.title = input.title;
  if (input.description !== undefined) doc.description = input.description;

  if (doc.kind === 'assignment') {
    if (input.dueDate !== undefined) {
      doc.dueDate = input.dueDate ? new Date(input.dueDate) : undefined;
    }
    if (input.maxMarks !== undefined) doc.maxMarks = input.maxMarks;
  }
  if (doc.kind === 'notes' && input.unit !== undefined) {
    doc.unit = input.unit;
  }

  await doc.save();
  return doc.populate(POPULATE_FIELDS);
};

export const addAttachments = async (
  id: string,
  teacherId: string,
  files: Express.Multer.File[]
): Promise<ResourceDoc> => {
  if (!files || files.length === 0) throw BadRequest('No files provided');

  const doc = await Resource.findById(id);
  if (!doc) throw NotFound('Resource not found');
  assertTeacherOwns(doc, teacherId);

  const attachments = await uploadFiles(
    files,
    doc.division.toString(),
    doc.subject.toString()
  );
  doc.attachments.push(...attachments);
  await doc.save();
  return doc.populate(POPULATE_FIELDS);
};

export const removeAttachment = async (
  id: string,
  attachmentId: string,
  teacherId: string
): Promise<ResourceDoc> => {
  const doc = await Resource.findById(id);
  if (!doc) throw NotFound('Resource not found');
  assertTeacherOwns(doc, teacherId);

  const att = doc.attachments.find(a => (a as unknown as { _id: Types.ObjectId })._id.toString() === attachmentId);
  if (!att) throw NotFound('Attachment not found');

  await destroyCloudinaryFile(att.publicId, att.resourceType);
  doc.attachments = doc.attachments.filter(
    a => (a as unknown as { _id: Types.ObjectId })._id.toString() !== attachmentId
  );
  await doc.save();
  return doc.populate(POPULATE_FIELDS);
};

export const publishResource = async (id: string, teacherId: string): Promise<ResourceDoc> => {
  const doc = await Resource.findById(id);
  if (!doc) throw NotFound('Resource not found');
  assertTeacherOwns(doc, teacherId);
  if (doc.attachments.length === 0) {
    throw BadRequest('Cannot publish a resource with no attachments');
  }
  doc.status = 'published';
  doc.publishedAt = new Date();
  await doc.save();
  return doc.populate(POPULATE_FIELDS);
};

export const unpublishResource = async (id: string, teacherId: string): Promise<ResourceDoc> => {
  const doc = await Resource.findById(id);
  if (!doc) throw NotFound('Resource not found');
  assertTeacherOwns(doc, teacherId);
  doc.status = 'draft';
  doc.publishedAt = undefined;
  await doc.save();
  return doc.populate(POPULATE_FIELDS);
};

export const deleteResource = async (id: string, teacherId: string): Promise<void> => {
  const doc = await Resource.findById(id);
  if (!doc) throw NotFound('Resource not found');
  assertTeacherOwns(doc, teacherId);
  await destroyManyCloudinaryFiles(doc.attachments);
  await Resource.deleteOne({ _id: id });
};

/* -------------------------------------------------------------------------- */
/*  Queries                                                                    */
/* -------------------------------------------------------------------------- */

export interface ResourceListFilter {
  kind?: 'assignment' | 'notes';
  status?: 'draft' | 'published';
  divisionId?: string;
  subjectId?: string;
  teacherId?: string;
}

export const listResources = async (filter: ResourceListFilter): Promise<ResourceDoc[]> => {
  const q: Record<string, unknown> = {};
  if (filter.kind) q.kind = filter.kind;
  if (filter.status) q.status = filter.status;
  if (filter.divisionId) q.division = filter.divisionId;
  if (filter.subjectId) q.subject = filter.subjectId;
  if (filter.teacherId) q.teacher = filter.teacherId;

  return Resource.find(q).populate(POPULATE_FIELDS).sort({ updatedAt: -1 });
};

export const findResource = async (id: string): Promise<ResourceDoc> => {
  const doc = await Resource.findById(id).populate(POPULATE_FIELDS);
  if (!doc) throw NotFound('Resource not found');
  return doc;
};

/* -------------------------------------------------------------------------- */
/*  Student feed                                                               */
/* -------------------------------------------------------------------------- */

export const listResourcesForStudent = async (
  studentId: string,
  opts: { kind?: 'assignment' | 'notes'; subjectId?: string } = {}
): Promise<ResourceDoc[]> => {
  const student = await Student.findById(studentId).select('divisionRef');
  if (!student || !student.divisionRef) {
    throw BadRequest('Student profile is missing a division assignment');
  }

  const q: Record<string, unknown> = {
    division: student.divisionRef,
    status: 'published',
  };
  if (opts.kind) q.kind = opts.kind;
  if (opts.subjectId) q.subject = opts.subjectId;

  return Resource.find(q)
    .populate(POPULATE_FIELDS)
    .sort({ publishedAt: -1, updatedAt: -1 });
};
