/**
 * Rubric + AI-assisted grading workflow.
 *
 * Flow:
 *   1. Teacher (or agent) sets a rubric on the assignment    -> setRubric
 *   2. AI proposes a grade per submission                    -> proposeGrade
 *   3. Teacher reviews the proposals on the dashboard
 *   4. Teacher publishes individually OR in bulk             -> publishGrade / bulkPublish
 *
 * "Publishing" copies the proposal's score into the canonical Submission.score
 * field (which is what students see) and flips `status` -> 'graded'.
 */

import { Types } from 'mongoose';
import { Submission, type SubmissionDoc } from '../models/Submission';
import { Resource, type ResourceDoc } from '../models/Resource';
import { BadRequest, Forbidden, NotFound } from '../utils/http-errors';
import type {
  SetRubricInput, ProposeGradeInput, PublishGradeInput, BulkPublishInput,
} from '../validators/grading.validator';

const POPULATE_FIELDS = [
  { path: 'student',  select: 'name email rollNumber' },
  { path: 'resource', select: 'title kind maxMarks dueDate teacher division subject rubric' },
];

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const assertTeacherOwnsResource = async (
  resourceId: string,
  teacherId: string,
): Promise<ResourceDoc> => {
  const resource = await Resource.findById(resourceId);
  if (!resource) throw NotFound('Assignment not found');
  if (resource.kind !== 'assignment') {
    throw BadRequest('Only assignments support rubric grading');
  }
  if (resource.teacher.toString() !== teacherId) {
    throw Forbidden('Only the owner can manage grading for this assignment');
  }
  return resource;
};

const assertTeacherOwnsSubmission = async (
  submission: SubmissionDoc,
  teacherId: string,
): Promise<ResourceDoc> => {
  const resId = submission.resource instanceof Types.ObjectId
    ? submission.resource.toString()
    : (submission.resource as unknown as { _id: Types.ObjectId })._id.toString();
  return assertTeacherOwnsResource(resId, teacherId);
};

/* -------------------------------------------------------------------------- */
/*  Rubric                                                                     */
/* -------------------------------------------------------------------------- */

export const setRubric = async (
  resourceId: string,
  teacherId: string,
  input: SetRubricInput,
): Promise<ResourceDoc> => {
  const resource = await assertTeacherOwnsResource(resourceId, teacherId);
  resource.rubric = {
    criteria:    input.criteria,
    totalPoints: input.totalPoints,
    graderNotes: input.graderNotes,
    updatedAt:   new Date(),
  };
  await resource.save();
  return resource;
};

export const getRubric = async (resourceId: string): Promise<ResourceDoc['rubric'] | null> => {
  const resource = await Resource.findById(resourceId).select('rubric kind');
  if (!resource) throw NotFound('Assignment not found');
  return resource.rubric ?? null;
};

/* -------------------------------------------------------------------------- */
/*  Proposal (AI batch grading writes here)                                   */
/* -------------------------------------------------------------------------- */

export const proposeGrade = async (
  submissionId: string,
  teacherId: string,
  input: ProposeGradeInput,
): Promise<SubmissionDoc> => {
  const doc = await Submission.findById(submissionId);
  if (!doc) throw NotFound('Submission not found');
  const resource = await assertTeacherOwnsSubmission(doc, teacherId);

  if (resource.maxMarks !== undefined && input.proposedScore > resource.maxMarks) {
    throw BadRequest(`Proposed score cannot exceed maxMarks (${resource.maxMarks})`);
  }

  doc.proposal = {
    proposedScore:   input.proposedScore,
    rubricBreakdown: input.rubricBreakdown ?? [],
    feedback:        input.feedback ?? '',
    strengths:       input.strengths ?? [],
    improvements:    input.improvements ?? [],
    flags:           input.flags ?? [],
    notes:           input.notes,
    model:           input.model,
    proposedBy:      input.proposedBy ?? 'ai',
    proposedAt:      new Date(),
  };
  doc.reviewStatus = 'proposed';
  await doc.save();
  return doc.populate(POPULATE_FIELDS);
};

/* -------------------------------------------------------------------------- */
/*  Publish (commit proposal -> visible to student)                           */
/* -------------------------------------------------------------------------- */

export const publishGrade = async (
  submissionId: string,
  teacherId: string,
  input: PublishGradeInput,
): Promise<SubmissionDoc> => {
  const doc = await Submission.findById(submissionId);
  if (!doc) throw NotFound('Submission not found');
  const resource = await assertTeacherOwnsSubmission(doc, teacherId);

  if (!doc.proposal && input.scoreOverride === undefined) {
    throw BadRequest('No proposed grade to publish — provide scoreOverride or run AI grading first');
  }

  const score = input.scoreOverride ?? doc.proposal!.proposedScore;
  if (resource.maxMarks !== undefined && score > resource.maxMarks) {
    throw BadRequest(`Score cannot exceed maxMarks (${resource.maxMarks})`);
  }
  doc.score = score;
  doc.status = 'graded';
  doc.gradedAt = new Date();
  doc.gradedBy = new Types.ObjectId(teacherId);
  doc.reviewStatus = 'published';
  doc.resubmitRequestedAt = undefined;
  await doc.save();
  return doc.populate(POPULATE_FIELDS);
};

export const bulkPublishGrades = async (
  resourceId: string,
  teacherId: string,
  input: BulkPublishInput,
): Promise<{ resourceId: string; published: number }> => {
  const resource = await assertTeacherOwnsResource(resourceId, teacherId);
  const filter: Record<string, unknown> = {
    resource: resourceId,
    reviewStatus: { $in: ['proposed', 'approved'] },
  };
  if (input.submissionIds?.length) {
    filter._id = { $in: input.submissionIds.map(id => new Types.ObjectId(id)) };
  }
  const subs = await Submission.find(filter);

  let published = 0;
  for (const sub of subs) {
    if (!sub.proposal) continue;
    const score = sub.proposal.proposedScore;
    if (resource.maxMarks !== undefined && score > resource.maxMarks) continue;
    sub.score = score;
    sub.status = 'graded';
    sub.gradedAt = new Date();
    sub.gradedBy = new Types.ObjectId(teacherId);
    sub.reviewStatus = 'published';
    sub.resubmitRequestedAt = undefined;
    await sub.save();
    published += 1;
  }
  return { resourceId, published };
};

/* -------------------------------------------------------------------------- */
/*  Dashboard query                                                            */
/* -------------------------------------------------------------------------- */

export const listGradingReview = async (
  resourceId: string,
  teacherId: string,
): Promise<{
  resource: ResourceDoc;
  submissions: SubmissionDoc[];
  counts: Record<string, number>;
}> => {
  const resource = await assertTeacherOwnsResource(resourceId, teacherId);
  const submissions = await Submission
    .find({ resource: resourceId })
    .populate(POPULATE_FIELDS)
    .sort({ submittedAt: -1 });

  const counts = {
    total: submissions.length,
    proposed: 0,
    approved: 0,
    published: 0,
    none: 0,
  };
  for (const s of submissions) {
    const k = s.reviewStatus ?? 'none';
    counts[k as keyof typeof counts] = (counts[k as keyof typeof counts] ?? 0) + 1;
  }
  return { resource, submissions, counts };
};
