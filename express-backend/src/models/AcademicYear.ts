import { Schema, model, type Document, type Model } from 'mongoose';

export interface AcademicYearDoc extends Document {
  _id: import('mongoose').Types.ObjectId;
  code: string;     // e.g. "2024-25"
  startsAt: Date;
  endsAt: Date;
  isCurrent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<AcademicYearDoc>(
  {
    code: { type: String, required: true, unique: true, trim: true },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    isCurrent: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

export const AcademicYear: Model<AcademicYearDoc> = model<AcademicYearDoc>('AcademicYear', schema);
