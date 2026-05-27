import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const gradeSubmissionSchema = z.object({
  score: z.coerce.number().min(0),
});

export const listSubmissionsQuerySchema = z.object({
  resourceId: objectId.optional(),
  studentId:  objectId.optional(),
  status: z.enum(['pending', 'graded', 'resubmit_requested']).optional(),
});

export type GradeSubmissionInput = z.infer<typeof gradeSubmissionSchema>;
export type ListSubmissionsQuery = z.infer<typeof listSubmissionsQuerySchema>;
