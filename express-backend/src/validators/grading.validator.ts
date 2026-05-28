import { z } from 'zod';

const flag = z.enum([
  'late', 'blank', 'plagiarism_suspected', 'ai_generated_suspected', 'unreadable',
]);

export const rubricCriterionSchema = z.object({
  name:        z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional(),
  maxPoints:   z.coerce.number().min(0),
  weight:      z.coerce.number().min(0).max(100),
  mandatory:   z.boolean().optional(),
});

export const setRubricSchema = z.object({
  criteria:    z.array(rubricCriterionSchema).min(1, 'At least one criterion is required'),
  totalPoints: z.coerce.number().min(0),
  graderNotes: z.string().trim().max(4000).optional(),
});

export const criterionScoreSchema = z.object({
  name:               z.string().trim().min(1),
  score:              z.coerce.number().min(0),
  maxPoints:          z.coerce.number().min(0),
  weight:             z.coerce.number().min(0).max(100),
  feedback:           z.string().trim().max(2000).optional(),
  mandatorySatisfied: z.boolean().optional(),
});

export const proposeGradeSchema = z.object({
  proposedScore:   z.coerce.number().min(0),
  rubricBreakdown: z.array(criterionScoreSchema).default([]),
  feedback:        z.string().trim().max(8000).optional(),
  strengths:       z.array(z.string().trim()).default([]),
  improvements:    z.array(z.string().trim()).default([]),
  flags:           z.array(flag).default([]),
  notes:           z.string().trim().max(2000).optional(),
  model:           z.string().trim().max(120).optional(),
  proposedBy:      z.enum(['ai', 'teacher']).default('ai'),
});

export const publishGradeSchema = z.object({
  // Optional override; if omitted, uses the existing proposal's score.
  scoreOverride: z.coerce.number().min(0).optional(),
});

export const bulkPublishSchema = z.object({
  // Optional whitelist; if omitted, publishes ALL proposed submissions for the resource.
  submissionIds: z.array(z.string().regex(/^[a-f\d]{24}$/i)).optional(),
});

export type SetRubricInput     = z.infer<typeof setRubricSchema>;
export type ProposeGradeInput  = z.infer<typeof proposeGradeSchema>;
export type PublishGradeInput  = z.infer<typeof publishGradeSchema>;
export type BulkPublishInput   = z.infer<typeof bulkPublishSchema>;
