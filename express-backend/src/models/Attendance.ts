import { Schema, model, type Document, type Model, type Types } from 'mongoose';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceDoc extends Document {
  _id: Types.ObjectId;
  lecture: Types.ObjectId;
  student: Types.ObjectId;
  division: Types.ObjectId;
  subject: Types.ObjectId;
  status: AttendanceStatus;
  remarks?: string;
  markedBy: Types.ObjectId;
  markedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<AttendanceDoc>(
  {
    lecture: { type: Schema.Types.ObjectId, ref: 'Lecture', required: true, index: true },
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    division: { type: Schema.Types.ObjectId, ref: 'Division', required: true, index: true },
    subject: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'excused'],
      required: true,
      index: true,
    },
    remarks: { type: String, trim: true },
    markedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    markedAt: { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: true }
);

// One attendance record per (lecture, student).
schema.index({ lecture: 1, student: 1 }, { unique: true });
schema.index({ student: 1, subject: 1 });
schema.index({ division: 1, subject: 1 });

export const Attendance: Model<AttendanceDoc> = model<AttendanceDoc>('Attendance', schema);
