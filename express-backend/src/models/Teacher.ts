import { Schema, type Model, type Types } from 'mongoose';
import { User, type UserDoc } from './User';

export interface TeacherDoc extends UserDoc {
  branch: string;
  department?: string;
  courses: string[];
  assignedDivisions: string[];
  // Relational refs
  branchRef?: Types.ObjectId;
  subjectRefs: Types.ObjectId[];
  divisionRefs: Types.ObjectId[];
}

const teacherSchema = new Schema<TeacherDoc>({
  branch: { type: String, required: true, trim: true },
  department: { type: String, trim: true },
  courses: { type: [String], default: [] },
  assignedDivisions: { type: [String], default: [] },
  branchRef: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
  subjectRefs: { type: [Schema.Types.ObjectId], ref: 'Subject', default: [] },
  divisionRefs: { type: [Schema.Types.ObjectId], ref: 'Division', default: [] },
});

export const Teacher: Model<TeacherDoc> =
  User.discriminator<TeacherDoc>('teacher', teacherSchema);
