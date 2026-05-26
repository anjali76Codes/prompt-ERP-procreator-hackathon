import { Schema, model, type Document, type Model } from 'mongoose';

export type Role = 'student' | 'teacher' | 'admin';
export type AccountStatus = 'pending' | 'active' | 'rejected';

export interface UserDoc extends Document {
  _id: import('mongoose').Types.ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  role: Role;
  status: AccountStatus;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDoc>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ['student', 'teacher', 'admin'], required: true, index: true },
    status: { type: String, enum: ['pending', 'active', 'rejected'], default: 'active', index: true },
  },
  {
    timestamps: true,
    discriminatorKey: 'role',
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const User: Model<UserDoc> = model<UserDoc>('User', userSchema);
