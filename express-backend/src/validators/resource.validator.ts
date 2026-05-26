import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD');

/**
 * Form data comes through multipart/form-data so every value is a string.
 * The Zod transforms convert numeric / date fields into the right type.
 */
export const createResourceSchema = z.object({
  kind: z.enum(['assignment', 'notes']),
  division: objectId,
  subject: objectId,
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().trim().min(1, 'Description is required').max(10000),
  dueDate: ymd.optional(),
  maxMarks: z.coerce.number().min(0).optional(),
  unit: z.string().trim().max(120).optional(),
})
.refine(v => v.kind !== 'assignment' || !!v.dueDate, {
  path: ['dueDate'], message: 'Due date is required for assignments',
});

export const updateResourceSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().min(1).max(10000).optional(),
  dueDate: ymd.optional().or(z.literal('').transform(() => undefined)),
  maxMarks: z.coerce.number().min(0).optional(),
  unit: z.string().trim().max(120).optional(),
});

export const listResourceQuerySchema = z.object({
  kind: z.enum(['assignment', 'notes']).optional(),
  status: z.enum(['draft', 'published']).optional(),
  divisionId: objectId.optional(),
  subjectId: objectId.optional(),
  mine: z.string().optional(),
});

export type CreateResourceInput = z.infer<typeof createResourceSchema>;
export type UpdateResourceInput = z.infer<typeof updateResourceSchema>;
export type ListResourceQuery   = z.infer<typeof listResourceQuerySchema>;
