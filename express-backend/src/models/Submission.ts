import { Schema, model, type Document, type Model, type Types } from 'mongoose';
import type { ResourceAttachment, CloudinaryResourceType } from './Resource';

export type SubmissionStatus = 'pending' | 'graded' | 'resubmit_requested';

export interface SubmissionDoc extends Document {
  _id: Types.ObjectId;
  resource: Types.ObjectId;   // ref → Resource (kind === 'assignment')
  student:  Types.ObjectId;   // ref → User (student)
  status: SubmissionStatus;
  attachments: ResourceAttachment[];
  score?: number;
  gradedAt?: Date;
  gradedBy?: Types.ObjectId;        // teacher
  resubmitRequestedAt?: Date;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const attachmentSchema = new Schema<ResourceAttachment>(
  {
    name: { type: String, required: true },
    size: { type: Number, required: true },
    mimeType: { type: String, required: true },
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    resourceType: {
      type: String,
      enum: ['image', 'video', 'raw', 'auto'] satisfies CloudinaryResourceType[],
      default: 'raw',
    },
    format: { type: String },
    uploadedAt: { type: Date, default: () => new Date() },
  },
  { _id: true }
);

const submissionSchema = new Schema<SubmissionDoc>(
  {
    resource: { type: Schema.Types.ObjectId, ref: 'Resource', required: true, index: true },
    student:  { type: Schema.Types.ObjectId, ref: 'User',     required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'graded', 'resubmit_requested'],
      default: 'pending',
      index: true,
    },
    attachments: { type: [attachmentSchema], default: [] },
    score:    { type: Number, min: 0 },
    gradedAt: { type: Date },
    gradedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resubmitRequestedAt: { type: Date },
    submittedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

// One submission per (assignment, student). Resubmissions replace attachments
// on the same row rather than spawning new ones.
submissionSchema.index({ resource: 1, student: 1 }, { unique: true });

export const Submission: Model<SubmissionDoc> =
  model<SubmissionDoc>('Submission', submissionSchema);
