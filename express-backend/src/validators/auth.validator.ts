import { z } from 'zod';

const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password too long')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[0-9]/, 'Password must contain a digit');

const baseFields = {
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: passwordSchema,
  name: z.string().min(2, 'Name is too short').max(80).trim(),
};

export const studentRegisterSchema = z.object({
  ...baseFields,
  branch: z.string().min(1, 'Branch is required').trim(),
  year: z.enum(['FE', 'SE', 'TE', 'BE']).default('FE'),
  division: z.string().min(1, 'Division is required').trim(),
  rollNumber: z.string().trim().optional(),
});

export const teacherRegisterSchema = z.object({
  ...baseFields,
  branch: z.string().min(1, 'Branch is required').trim(),
  department: z.string().trim().optional(),
  courses: z.array(z.string().trim().min(1)).default([]),
  assignedDivisions: z.array(z.string().trim().min(1)).default([]),
});

export const loginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export type StudentRegisterInput = z.infer<typeof studentRegisterSchema>;
export type TeacherRegisterInput = z.infer<typeof teacherRegisterSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
