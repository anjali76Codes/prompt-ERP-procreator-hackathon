import { Schema, model, type Document, type Model, type Types } from 'mongoose';

export type AttemptStatus = 'in_progress' | 'submitted' | 'graded' | 'abandoned';

export interface AnswerItem {
  questionId: Types.ObjectId;
  // for single/multiple: array of option ids; for short/numeric: text value
  selectedOptionIds?: Types.ObjectId[];
  textAnswer?: string;
  pointsAwarded?: number;
}

export interface QuizAttemptDoc extends Document {
  _id: Types.ObjectId;
  quiz: Types.ObjectId;
  student: Types.ObjectId;
  startedAt: Date;
  submittedAt?: Date;
  gradedAt?: Date;
  status: AttemptStatus;
  answers: AnswerItem[];
  score?: number;
  durationSeconds?: number; // optional duration for analytics
  createdAt: Date;
  updatedAt: Date;
}

const answerSchema = new Schema<AnswerItem>({
  questionId: { type: Schema.Types.ObjectId, required: true },
  selectedOptionIds: { type: [Schema.Types.ObjectId], default: [] },
  textAnswer: { type: String },
  pointsAwarded: { type: Number },
}, { _id: false });

const attemptSchema = new Schema<QuizAttemptDoc>({
  quiz: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
  student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  startedAt: { type: Date, default: () => new Date() },
  submittedAt: { type: Date },
  gradedAt: { type: Date },
  status: { type: String, enum: ['in_progress', 'submitted', 'graded', 'abandoned'], default: 'in_progress', index: true },
  answers: { type: [answerSchema], default: [] },
  score: { type: Number },
  durationSeconds: { type: Number },
}, { timestamps: true });

attemptSchema.index({ quiz: 1, student: 1 });

export const QuizAttempt: Model<QuizAttemptDoc> = model<QuizAttemptDoc>('QuizAttempt', attemptSchema);
