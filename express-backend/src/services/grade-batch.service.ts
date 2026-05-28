/**
 * Grade batch service.
 *
 * Powers the teacher dashboard "Grade Batch" page: list every published
 * assignment I own, with aggregated submission counts per AI-review
 * state so the UI can show "X to grade", "Y proposed, awaiting review",
 * "Z published".
 *
 * One Mongo aggregation walks Resource → Submission ($lookup) so we
 * answer the whole page in a single query.
 */

import { Types } from 'mongoose';
import { Resource } from '../models/Resource';
import { Student } from '../models/Student';

const toId = (s: string) => new Types.ObjectId(s);

export interface GradeBatchRow {
  resourceId: string;
  title: string;
  dueDate?: string;
  maxMarks?: number;
  divisionLabel?: string;
  subjectLabel?: string;
  rubricSet: boolean;
  studentCount: number;
  submissionCounts: {
    total: number;
    pending: number;     // submitted, no AI proposal yet
    proposed: number;    // AI proposed, awaiting teacher review
    approved: number;    // teacher accepted but not yet published
    published: number;   // final grade visible to the student
  };
  updatedAt: string;
}

export const listGradeBatchAssignments = async (
  teacherId: string,
): Promise<GradeBatchRow[]> => {
  const rows = await Resource.aggregate([
    {
      $match: {
        teacher: toId(teacherId),
        kind: 'assignment',
        status: 'published',
      },
    },
    {
      $lookup: {
        from: 'submissions',
        localField: '_id',
        foreignField: 'resource',
        as: 'submissions',
      },
    },
    {
      $lookup: {
        from: 'divisions',
        localField: 'division',
        foreignField: '_id',
        as: 'divisionDoc',
      },
    },
    {
      $lookup: {
        from: 'subjects',
        localField: 'subject',
        foreignField: '_id',
        as: 'subjectDoc',
      },
    },
    { $sort: { updatedAt: -1 } },
    { $limit: 100 },
  ]);

  // Pre-fetch division student counts (one query rather than N).
  const divisionIds = Array.from(
    new Set(rows.map((r: any) => String(r.division))),
  ).map(toId);
  const studentCounts = await Student.aggregate([
    { $match: { divisionRef: { $in: divisionIds } } },
    { $group: { _id: '$divisionRef', count: { $sum: 1 } } },
  ]);
  const countByDivision = new Map<string, number>(
    studentCounts.map((s: any) => [String(s._id), s.count]),
  );

  return rows.map((r: any): GradeBatchRow => {
    const subs: any[] = r.submissions ?? [];
    const counts = {
      total: subs.length,
      pending:   subs.filter((s) => s.reviewStatus === 'none').length,
      proposed:  subs.filter((s) => s.reviewStatus === 'proposed').length,
      approved:  subs.filter((s) => s.reviewStatus === 'approved').length,
      published: subs.filter((s) => s.reviewStatus === 'published').length,
    };
    const division = r.divisionDoc?.[0];
    const subject  = r.subjectDoc?.[0];
    return {
      resourceId:   String(r._id),
      title:        r.title,
      dueDate:      r.dueDate ? new Date(r.dueDate).toISOString() : undefined,
      maxMarks:     r.maxMarks,
      divisionLabel: division ? (division.code ?? division.name) : undefined,
      subjectLabel:  subject ? subject.name : undefined,
      rubricSet:    !!(r.rubric && Array.isArray(r.rubric.criteria) && r.rubric.criteria.length > 0),
      studentCount: countByDivision.get(String(r.division)) ?? 0,
      submissionCounts: counts,
      updatedAt:    r.updatedAt ? new Date(r.updatedAt).toISOString() : new Date().toISOString(),
    };
  });
};
