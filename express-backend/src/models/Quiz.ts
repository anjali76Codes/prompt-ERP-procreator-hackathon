import { Schema, model, type Document, type Model, type Types } from 'mongoose';

export type QuizStatus = 'draft' | 'published' | 'archived';

export interface QuizQuestionOption {
  _id?: Types.ObjectId;
  text: string;
  isCorrect?: boolean; // stored for teacher view; omitted for student responses via projections
}

export interface QuizQuestion {
  _id?: Types.ObjectId;
  text: string;
  type: 'single' | 'multiple' | 'short' | 'numeric';
  points: number;
  options?: QuizQuestionOption[];
}

export interface QuizDoc extends Document {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  teacher: Types.ObjectId;
  division: Types.ObjectId;
  subject: Types.ObjectId;
  status: QuizStatus;
  settings: {
    timeLimitMinutes?: number;
    shuffleQuestions?: boolean;
    shuffleOptions?: boolean;
    maxAttempts?: number;
    showAnswersAfter?: boolean;
  };
  questions: QuizQuestion[];
  assignedTo?: Types.ObjectId[]; // optional list of student ids or group ids (future)
  createdAt: Date;
  updatedAt: Date;
}

const optionSchema = new Schema<QuizQuestionOption>({
  text: { type: String, required: true },
  isCorrect: { type: Boolean, default: false },
}, { _id: true });

const questionSchema = new Schema<QuizQuestion>({
  text: { type: String, required: true },
  type: { type: String, enum: ['single', 'multiple', 'short', 'numeric'], required: true },
  points: { type: Number, required: true, default: 1 },
  options: { type: [optionSchema], default: [] },
}, { _id: true });

const quizSchema = new Schema<QuizDoc>(
  {
    title: { type: String, required: true, index: true },
    description: { type: String },
    teacher: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    division: { type: Schema.Types.ObjectId, ref: 'Division', required: true, index: true },
    subject: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft', index: true },
    settings: {
      timeLimitMinutes: { type: Number },
      shuffleQuestions: { type: Boolean, default: false },
      shuffleOptions: { type: Boolean, default: false },
      maxAttempts: { type: Number },
      showAnswersAfter: { type: Boolean, default: false },
    },
    questions: { type: [questionSchema], default: [] },
    assignedTo: { type: [Schema.Types.ObjectId], default: [] },
  },
  { timestamps: true }
);

quizSchema.index({ teacher: 1, subject: 1 });

export const Quiz: Model<QuizDoc> = model<QuizDoc>('Quiz', quizSchema);
