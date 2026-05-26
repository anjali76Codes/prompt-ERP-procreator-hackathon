import { Schema, model, type Document, type Model, type Types } from 'mongoose';

export type Year = 'FE' | 'SE' | 'TE' | 'BE';

export interface DivisionDoc extends Document {
  _id: Types.ObjectId;
  code: string;          // e.g. "TE-A"
  name: string;          // human-readable
  branch: Types.ObjectId;
  year: Year;
  academicYear: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<DivisionDoc>(
  {
    code: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    year: { type: String, enum: ['FE', 'SE', 'TE', 'BE'], required: true, index: true },
    academicYear: { type: Schema.Types.ObjectId, ref: 'AcademicYear', required: true, index: true },
  },
  { timestamps: true }
);

schema.index({ code: 1, academicYear: 1 }, { unique: true });

export const Division: Model<DivisionDoc> = model<DivisionDoc>('Division', schema);
