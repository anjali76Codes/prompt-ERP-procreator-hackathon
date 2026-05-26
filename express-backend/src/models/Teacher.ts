import { Schema, type Model } from 'mongoose';
import { User, type UserDoc } from './User';

export interface TeacherDoc extends UserDoc {
  branch: string;
  department?: string;
  courses: string[];
  assignedDivisions: string[];
}

const teacherSchema = new Schema<TeacherDoc>({
  branch: { type: String, required: true, trim: true },
  department: { type: String, trim: true },
  courses: { type: [String], default: [] },
  assignedDivisions: { type: [String], default: [] },
});

export const Teacher: Model<TeacherDoc> =
  User.discriminator<TeacherDoc>('teacher', teacherSchema);
