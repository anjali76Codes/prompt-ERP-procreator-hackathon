import { Schema, type Model } from 'mongoose';
import { User, type UserDoc } from './User';

export type Year = 'FE' | 'SE' | 'TE' | 'BE';

export interface StudentDoc extends UserDoc {
  branch: string;
  year: Year;
  division: string;
  rollNumber?: string;
}

const studentSchema = new Schema<StudentDoc>({
  branch: { type: String, required: true, trim: true },
  year: { type: String, enum: ['FE', 'SE', 'TE', 'BE'], default: 'FE', required: true },
  division: { type: String, required: true, trim: true },
  rollNumber: { type: String, trim: true },
});

export const Student: Model<StudentDoc> =
  User.discriminator<StudentDoc>('student', studentSchema);
