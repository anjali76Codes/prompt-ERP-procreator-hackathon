import { Schema, model, type Document, type Model, type Types } from 'mongoose';

/** Day of week as ISO weekday: 1 = Monday … 7 = Sunday. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface ScheduleDoc extends Document {
  _id: Types.ObjectId;
  division: Types.ObjectId;
  subject: Types.ObjectId;
  teacher: Types.ObjectId;
  weekday: Weekday;
  startTime: string;     // "HH:mm"
  endTime: string;
  room: string;
  academicYear: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<ScheduleDoc>(
  {
    division: { type: Schema.Types.ObjectId, ref: 'Division', required: true, index: true },
    subject: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    teacher: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    weekday: { type: Number, min: 1, max: 7, required: true, index: true },
    startTime: {
      type: String, required: true,
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'startTime must be HH:mm'],
    },
    endTime: {
      type: String, required: true,
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'endTime must be HH:mm'],
    },
    room: { type: String, required: true, trim: true },
    academicYear: { type: Schema.Types.ObjectId, ref: 'AcademicYear', required: true, index: true },
  },
  { timestamps: true }
);

schema.index({ division: 1, weekday: 1, startTime: 1 });
schema.index({ teacher: 1, weekday: 1, startTime: 1 });

export const Schedule: Model<ScheduleDoc> = model<ScheduleDoc>('Schedule', schema);
