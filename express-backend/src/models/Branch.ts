import { Schema, model, type Document, type Model } from 'mongoose';

export interface BranchDoc extends Document {
  _id: import('mongoose').Types.ObjectId;
  code: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<BranchDoc>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

export const Branch: Model<BranchDoc> = model<BranchDoc>('Branch', schema);
