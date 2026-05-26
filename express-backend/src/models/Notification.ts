import { Schema, model, Types, type Document, type Model } from 'mongoose';

export type NotificationKind = 'attendance' | 'announcement' | 'reminder' | 'alert';

export interface NotificationDoc extends Document {
  _id: Types.ObjectId;
  recipient: Types.ObjectId;
  sender: Types.ObjectId;
  kind: NotificationKind;
  title: string;
  body: string;
  /** Optional in-app link teachers can drop in (e.g. /attendance/students). */
  link?: string;
  /** Optional metadata (e.g. attached PDF URL, division code). */
  meta?: Record<string, unknown>;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<NotificationDoc>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sender:    { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    kind:      { type: String, enum: ['attendance', 'announcement', 'reminder', 'alert'], default: 'announcement', index: true },
    title:     { type: String, required: true, trim: true },
    body:      { type: String, required: true, trim: true },
    link:      { type: String, trim: true },
    meta:      { type: Schema.Types.Mixed },
    read:      { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

export const Notification: Model<NotificationDoc> =
  model<NotificationDoc>('Notification', notificationSchema);
