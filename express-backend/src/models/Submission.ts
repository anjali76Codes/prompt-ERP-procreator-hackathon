import { Schema, model, type Document, type Model, type Types } from 'mongoose';
import type { ResourceAttachment, CloudinaryResourceType } from './Resource';

export type SubmissionStatus = 'pending' | 'graded' | 'resubmit_requested';

/**
 * Review state of an AI-proposed grade. Independent of `status` (which is
 * about whether the *teacher's final grade* has landed yet).
 *   - 'none'      — no AI grade yet
 *   - 'proposed'  — the AI scored it; teacher hasn't reviewed
 *   - 'approved'  — teacher accepted (with or without edits) but hasn't published
 *   - 'published' — `score` is final & visible to the student
 */
export type GradeReviewStatus = 'none' | 'proposed' | 'approved' | 'published';

export interface CriterionScore {
  name: string;
  score: number;
  maxPoints: number;
  weight: number;
  feedback?: string;
  mandatorySatisfied?: boolean;
}

export type SubmissionFlag =
  | 'late'
  | 'blank'
  | 'plagiarism_suspected'
  | 'ai_generated_suspected'
  | 'unreadable';

export interface GradeProposal {
  proposedScore: number;
  rubricBreakdown: CriterionScore[];
  feedback: string;
  strengths?: string[];
  improvements?: string[];
  flags: SubmissionFlag[];
  /** Free-form notes from the grader (LLM or teacher edit). */
  notes?: string;
  proposedAt: Date;
  proposedBy?: 'ai' | 'teacher';
  model?: string;
}

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
  /** AI-grading review state (separate from teacher-published `status`). */
  reviewStatus: GradeReviewStatus;
  proposal?: GradeProposal;
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

const criterionScoreSchema = new Schema<CriterionScore>(
  {
    name:               { type: String, required: true },
    score:              { type: Number, required: true, min: 0 },
    maxPoints:          { type: Number, required: true, min: 0 },
    weight:             { type: Number, required: true, min: 0, max: 100 },
    feedback:           { type: String, trim: true },
    mandatorySatisfied: { type: Boolean },
  },
  { _id: false }
);

const proposalSchema = new Schema<GradeProposal>(
  {
    proposedScore:   { type: Number, required: true, min: 0 },
    rubricBreakdown: { type: [criterionScoreSchema], default: [] },
    feedback:        { type: String, trim: true, default: '' },
    strengths:       { type: [String], default: [] },
    improvements:    { type: [String], default: [] },
    flags: {
      type: [{
        type: String,
        enum: [
          'late', 'blank', 'plagiarism_suspected',
          'ai_generated_suspected', 'unreadable',
        ],
      }],
      default: [],
    },
    notes:        { type: String, trim: true },
    proposedAt:   { type: Date, default: () => new Date() },
    proposedBy:   { type: String, enum: ['ai', 'teacher'], default: 'ai' },
    model:        { type: String, trim: true },
  },
  { _id: false }
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
    reviewStatus: {
      type: String,
      enum: ['none', 'proposed', 'approved', 'published'],
      default: 'none',
      index: true,
    },
    proposal: { type: proposalSchema, required: false },
  },
  { timestamps: true }
);

// One submission per (assignment, student). Resubmissions replace attachments
// on the same row rather than spawning new ones.
submissionSchema.index({ resource: 1, student: 1 }, { unique: true });

export const Submission: Model<SubmissionDoc> =
  model<SubmissionDoc>('Submission', submissionSchema);
