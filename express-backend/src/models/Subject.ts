import { Schema, model, type Document, type Model, type Types } from 'mongoose';

export interface SubjectDoc extends Document {
  _id: Types.ObjectId;
  code: string;      // e.g. "CS-301"
  name: string;      // "Data Structures & Algorithms"
  branch: Types.ObjectId;
  year: 'FE' | 'SE' | 'TE' | 'BE';
  credits: number;
  /** Minimum attendance percentage required for exam eligibility. */
  minAttendancePct: number;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<SubjectDoc>(
  {
    code: { type: String, required: true, trim: true, uppercase: true, unique: true },
    name: { type: String, required: true, trim: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    year: { type: String, enum: ['FE', 'SE', 'TE', 'BE'], required: true, index: true },
    credits: { type: Number, default: 3, min: 0 },
    minAttendancePct: { type: Number, default: 75, min: 0, max: 100 },
  },
  { timestamps: true }
);

export const Subject: Model<SubjectDoc> = model<SubjectDoc>('Subject', schema);
