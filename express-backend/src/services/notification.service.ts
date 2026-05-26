import { Types } from 'mongoose';
import { Notification, type NotificationDoc } from '../models/Notification';
import type { SendNotificationInput } from '../validators/notification.validator';

const toId = (s: string): Types.ObjectId => new Types.ObjectId(s);

export const sendOne = (sender: string, input: SendNotificationInput): Promise<NotificationDoc> =>
  Notification.create({
    sender: toId(sender),
    recipient: toId(input.recipient),
    kind: input.kind,
    title: input.title,
    body: input.body,
    link: input.link,
    meta: input.meta,
  });

export const listMine = (
  userId: string,
  { unreadOnly = false, limit = 30 }: { unreadOnly?: boolean; limit?: number } = {},
): Promise<NotificationDoc[]> => {
  const filter: Record<string, unknown> = { recipient: toId(userId) };
  if (unreadOnly) filter.read = false;
  return Notification.find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(limit, 1), 100))
    .populate('sender', 'name email role');
};

export const unreadCount = (userId: string): Promise<number> =>
  Notification.countDocuments({ recipient: toId(userId), read: false });

export const markRead = async (userId: string, id: string): Promise<void> => {
  await Notification.updateOne(
    { _id: toId(id), recipient: toId(userId) },
    { $set: { read: true } },
  );
};

export const markAllRead = async (userId: string): Promise<{ count: number }> => {
  const res = await Notification.updateMany(
    { recipient: toId(userId), read: false },
    { $set: { read: true } },
  );
  return { count: res.modifiedCount ?? 0 };
};
