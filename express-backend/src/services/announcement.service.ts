/**
 * Broadcast service — powers both Announcement and Notify Class.
 *
 * Both surfaces are the same fan-out: write one Notification doc per
 * student in the target division, sharing a `meta.broadcastId` so the
 * sender list endpoint can aggregate the recipients back into a single
 * "broadcast" row. The only difference is the `kind` field:
 *   - kind:'announcement' → general info, surfaced on /announcements
 *   - kind:'reminder'     → urgent action prompt, surfaced on /notify
 *
 * Keeping one service avoids near-duplicate code; the controllers just
 * pass the right kind in.
 */

import { Types } from 'mongoose';
import { Notification, type NotificationKind } from '../models/Notification';
import { Student } from '../models/Student';
import { Division } from '../models/Division';
import { Subject } from '../models/Subject';
import { BadRequest, NotFound } from '../utils/http-errors';
import type { BroadcastAnnouncementInput } from '../validators/announcement.validator';

const toId = (s: string) => new Types.ObjectId(s);

export type BroadcastKind = Extract<NotificationKind, 'announcement' | 'reminder'>;

export interface BroadcastSummary {
  broadcastId: string;
  divisionId: string;
  subjectId?: string;
  title: string;
  body: string;
  notified: number;
  createdAt: Date;
}

export const broadcastAnnouncement = async (
  teacherId: string,
  input: BroadcastAnnouncementInput,
  { kind = 'announcement' }: { kind?: BroadcastKind } = {},
): Promise<BroadcastSummary> => {
  const division = await Division.findById(input.divisionId).select('_id name code');
  if (!division) throw NotFound('Division not found');

  if (input.subjectId) {
    const subject = await Subject.findById(input.subjectId).select('_id');
    if (!subject) throw NotFound('Subject not found');
  }

  const students = await Student
    .find({ divisionRef: division._id })
    .select('_id');

  if (students.length === 0) {
    throw BadRequest('No students enrolled in this division — nothing to broadcast.');
  }

  const broadcastId = new Types.ObjectId();
  const sender = toId(teacherId);
  const now = new Date();

  const docs = students.map(s => ({
    sender,
    recipient: s._id,
    kind,
    title: input.title,
    body: input.body,
    link: input.link,
    meta: {
      broadcastId,
      divisionId: division._id,
      ...(input.subjectId ? { subjectId: toId(input.subjectId) } : {}),
    },
    createdAt: now,
    updatedAt: now,
  }));
  await Notification.insertMany(docs);

  return {
    broadcastId: broadcastId.toString(),
    divisionId: division._id.toString(),
    subjectId: input.subjectId,
    title: input.title,
    body: input.body,
    notified: students.length,
    createdAt: now,
  };
};

export interface AnnouncementListItem extends BroadcastSummary {
  divisionLabel?: string;
  subjectLabel?: string;
}

export const listMyAnnouncements = async (
  teacherId: string,
  { limit = 50, kind = 'announcement' }: { limit?: number; kind?: BroadcastKind } = {},
): Promise<AnnouncementListItem[]> => {
  const rows = await Notification.aggregate([
    { $match: { sender: toId(teacherId), kind } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$meta.broadcastId',
        title: { $first: '$title' },
        body: { $first: '$body' },
        createdAt: { $first: '$createdAt' },
        notified: { $sum: 1 },
        divisionId: { $first: '$meta.divisionId' },
        subjectId: { $first: '$meta.subjectId' },
      },
    },
    { $sort: { createdAt: -1 } },
    { $limit: Math.min(Math.max(limit, 1), 200) },
    {
      $lookup: {
        from: 'divisions', localField: 'divisionId', foreignField: '_id', as: 'division',
      },
    },
    {
      $lookup: {
        from: 'subjects', localField: 'subjectId', foreignField: '_id', as: 'subject',
      },
    },
  ]);

  return rows.map(r => ({
    broadcastId: r._id ? r._id.toString() : '',
    divisionId: r.divisionId ? r.divisionId.toString() : '',
    subjectId: r.subjectId ? r.subjectId.toString() : undefined,
    title: r.title,
    body: r.body,
    notified: r.notified ?? 0,
    createdAt: r.createdAt,
    divisionLabel: r.division?.[0]
      ? (r.division[0].code ?? r.division[0].name)
      : undefined,
    subjectLabel: r.subject?.[0]?.name,
  }));
};
