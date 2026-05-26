import { z } from 'zod';

export const studentProfileUpdateSchema = z.object({
  name: z.string().min(2).max(80).trim().optional(),
  branch: z.string().min(1).trim().optional(),
  year: z.enum(['FE', 'SE', 'TE', 'BE']).optional(),
  division: z.string().min(1).trim().optional(),
  rollNumber: z.string().trim().optional(),
}).strict();

export const teacherProfileUpdateSchema = z.object({
  name: z.string().min(2).max(80).trim().optional(),
  branch: z.string().min(1).trim().optional(),
  department: z.string().trim().optional(),
  courses: z.array(z.string().trim().min(1)).optional(),
  assignedDivisions: z.array(z.string().trim().min(1)).optional(),
}).strict();

export type StudentProfileUpdateInput = z.infer<typeof studentProfileUpdateSchema>;
export type TeacherProfileUpdateInput = z.infer<typeof teacherProfileUpdateSchema>;
