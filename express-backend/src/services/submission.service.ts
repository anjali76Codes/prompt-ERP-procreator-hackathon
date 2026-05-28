import { Types } from 'mongoose';
import { Submission, type SubmissionDoc } from '../models/Submission';
import { Resource } from '../models/Resource';
import { Student } from '../models/Student';
import { Notification } from '../models/Notification';
import { BadRequest, Forbidden, NotFound } from '../utils/http-errors';
import {
  uploadBufferToCloudinary, destroyManyCloudinaryFiles,
} from './cloudinary.service';
import type { ResourceAttachment } from '../models/Resource';
import type { GradeSubmissionInput } from '../validators/submission.validator';

const POPULATE_FIELDS = [
  { path: 'student', select: 'name email rollNumber' },
  { path: 'resource', select: 'title kind maxMarks dueDate teacher division subject' },
];

/* -------------------------------------------------------------------------- */
/*  Upload helper                                                              */
/* -------------------------------------------------------------------------- */

const uploadFiles = async (
  files: Express.Multer.File[],
  resourceId: string,
  studentId: string
): Promise<ResourceAttachment[]> => {
  if (!files || files.length === 0) return [];
  const scope = `submissions/${resourceId}/${studentId}`;
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
/*  Student: submit / resubmit                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Create-or-update the student's submission for an assignment.
 * Resubmission replaces the previous files (and destroys them on Cloudinary).
 */
export const submitToResource = async (
  resourceId: string,
  studentId: string,
  files: Express.Multer.File[]
): Promise<SubmissionDoc> => {
  if (!files || files.length === 0) throw BadRequest('At least one file is required');

  const resource = await Resource.findById(resourceId);
  if (!resource) throw NotFound('Assignment not found');
  if (resource.kind !== 'assignment') throw BadRequest('Only assignments accept submissions');
  if (resource.status !== 'published')  throw BadRequest('This assignment is not open for submission');

  const student = await Student.findById(studentId).select('divisionRef');
  if (!student || !student.divisionRef) throw Forbidden('Student profile is missing a division');
  if (student.divisionRef.toString() !== resource.division.toString()) {
    throw Forbidden('This assignment is not for your division');
  }

  // Upload new files first so we don't drop old ones until the upload succeeds.
  const attachments = await uploadFiles(files, resourceId, studentId);

  const existing = await Submission.findOne({ resource: resourceId, student: studentId });
  if (existing) {
    // Resubmission — clear old files from Cloudinary then replace.
    await destroyManyCloudinaryFiles(existing.attachments);
    existing.attachments = attachments;
    existing.status = 'pending';
    existing.score = undefined;
    existing.gradedAt = undefined;
    existing.gradedBy = undefined;
    existing.resubmitRequestedAt = undefined;
    existing.submittedAt = new Date();
    await existing.save();
    return existing.populate(POPULATE_FIELDS);
  }

  const doc = await Submission.create({
    resource: resourceId,
    student:  studentId,
    status: 'pending',
    attachments,
    submittedAt: new Date(),
  });
  return doc.populate(POPULATE_FIELDS);
};

/* -------------------------------------------------------------------------- */
/*  Student: read their own submission                                         */
/* -------------------------------------------------------------------------- */

export const getMySubmission = async (
  resourceId: string,
  studentId: string
): Promise<SubmissionDoc | null> => {
  return Submission
    .findOne({ resource: resourceId, student: studentId })
    .populate(POPULATE_FIELDS);
};

export const listMySubmissions = async (studentId: string): Promise<SubmissionDoc[]> => {
  return Submission
    .find({ student: studentId })
    .populate(POPULATE_FIELDS)
    .sort({ submittedAt: -1 });
};

/* -------------------------------------------------------------------------- */
/*  Teacher: list / grade / request resubmission                               */
/* -------------------------------------------------------------------------- */

const assertTeacherOwnsResource = async (
  resourceId: string,
  teacherId: string
): Promise<void> => {
  const resource = await Resource.findById(resourceId).select('teacher');
  if (!resource) throw NotFound('Assignment not found');
  if (resource.teacher.toString() !== teacherId) {
    throw Forbidden('Only the owner can review these submissions');
  }
};

const assertTeacherOwnsSubmission = async (
  submission: SubmissionDoc,
  teacherId: string
): Promise<void> => {
  const resourceId = submission.resource instanceof Types.ObjectId
    ? submission.resource.toString()
    : (submission.resource as unknown as { _id: Types.ObjectId })._id.toString();
  await assertTeacherOwnsResource(resourceId, teacherId);
};

export const listSubmissionsForResource = async (
  resourceId: string,
  teacherId: string
): Promise<SubmissionDoc[]> => {
  await assertTeacherOwnsResource(resourceId, teacherId);
  return Submission
    .find({ resource: resourceId })
    .populate(POPULATE_FIELDS)
    .sort({ submittedAt: -1 });
};

export const gradeSubmission = async (
  submissionId: string,
  teacherId: string,
  input: GradeSubmissionInput
): Promise<SubmissionDoc> => {
  const doc = await Submission.findById(submissionId);
  if (!doc) throw NotFound('Submission not found');
  await assertTeacherOwnsSubmission(doc, teacherId);

  // Cap by maxMarks if set.
  const resource = await Resource.findById(doc.resource).select('maxMarks');
  if (resource?.maxMarks !== undefined && input.score > resource.maxMarks) {
    throw BadRequest(`Score cannot exceed maximum marks (${resource.maxMarks})`);
  }

  doc.score = input.score;
  doc.status = 'graded';
  doc.gradedAt = new Date();
  doc.gradedBy = new Types.ObjectId(teacherId);
  doc.resubmitRequestedAt = undefined;
  await doc.save();
  return doc.populate(POPULATE_FIELDS);
};

export const requestResubmission = async (
  submissionId: string,
  teacherId: string
): Promise<SubmissionDoc> => {
  const doc = await Submission.findById(submissionId);
  if (!doc) throw NotFound('Submission not found');
  await assertTeacherOwnsSubmission(doc, teacherId);

  doc.status = 'resubmit_requested';
  doc.resubmitRequestedAt = new Date();
  // Keep existing files so the student can compare; clear the grade.
  doc.score = undefined;
  doc.gradedAt = undefined;
  doc.gradedBy = undefined;
  await doc.save();
  return doc.populate(POPULATE_FIELDS);
};

/* -------------------------------------------------------------------------- */
/*  Teacher: notify students who haven't submitted yet                         */
/* -------------------------------------------------------------------------- */

export const notifyNonSubmitters = async (
  resourceId: string,
  teacherId: string,
  message?: string,
): Promise<{ resourceId: string; notified: number; studentIds: string[] }> => {
  const resource = await Resource.findById(resourceId).populate('subject', 'name code');
  if (!resource) throw NotFound('Assignment not found');
  if (resource.kind !== 'assignment') {
    throw BadRequest('Only assignments have submissions');
  }
  if (resource.teacher.toString() !== teacherId) {
    throw Forbidden('Only the owner can notify on this assignment');
  }

  const submittedIds = await Submission
    .find({ resource: resourceId })
    .distinct('student');
  const submittedSet = new Set(submittedIds.map(id => id.toString()));

  const studentsInDivision = await Student
    .find({ divisionRef: resource.division })
    .select('_id');

  const nonSubmitterIds = studentsInDivision
    .map(s => s._id)
    .filter(id => !submittedSet.has(id.toString()));

  if (nonSubmitterIds.length === 0) {
    return { resourceId, notified: 0, studentIds: [] };
  }

  const subjectName = resource.subject && typeof resource.subject === 'object'
    && 'name' in resource.subject
    ? (resource.subject as { name: string }).name
    : 'your subject';

  const dueStr = resource.dueDate
    ? new Date(resource.dueDate).toISOString().slice(0, 10)
    : 'soon';

  const title = `Reminder: submit "${resource.title}"`;
  const body = message?.trim() || (
    `You haven't submitted "${resource.title}" for ${subjectName}. `
    + `The deadline is ${dueStr}. Please submit as soon as possible.`
  );

  const docs = nonSubmitterIds.map(rid => ({
    sender: new Types.ObjectId(teacherId),
    recipient: rid,
    kind: 'reminder' as const,
    title,
    body,
    link: `/student/assignments/${resourceId}`,
    meta: { resourceId, kind: 'assignment_reminder' },
  }));
  await Notification.insertMany(docs);

  return {
    resourceId,
    notified: nonSubmitterIds.length,
    studentIds: nonSubmitterIds.map(id => id.toString()),
  };
};
