import { Schema, model, type Document, type Model, type Types } from 'mongoose';

export type LectureStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled';

export interface LectureDoc extends Document {
  _id: Types.ObjectId;
  schedule?: Types.ObjectId;     // optional link back to the recurring template
  division: Types.ObjectId;
  subject: Types.ObjectId;
  teacher: Types.ObjectId;
  date: Date;                    // calendar date (00:00 UTC of the day)
  startTime: string;
  endTime: string;
  room: string;
  status: LectureStatus;
  attendanceMarkedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<LectureDoc>(
  {
    schedule: { type: Schema.Types.ObjectId, ref: 'Schedule' },
    division: { type: Schema.Types.ObjectId, ref: 'Division', required: true, index: true },
    subject: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    teacher: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: Date, required: true, index: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    room: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
      default: 'scheduled',
      index: true,
    },
    attendanceMarkedAt: { type: Date },
    notes: { type: String },
  },
  { timestamps: true }
);

schema.index({ division: 1, date: 1 });
schema.index({ teacher: 1, date: 1 });
// Prevent duplicate concrete lectures for the same template on the same day.
schema.index({ schedule: 1, date: 1 }, { unique: true, sparse: true });

export const Lecture: Model<LectureDoc> = model<LectureDoc>('Lecture', schema);
