import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

const optionSchema = z.object({
  _id: z.string().optional(),
  text: z.string().min(1).max(1000),
  isCorrect: z.boolean().optional(),
});

const questionSchema = z.object({
  _id: z.string().optional(),
  text: z.string().min(1).max(3000),
  type: z.enum(['single', 'multiple', 'short', 'numeric']),
  points: z.coerce.number().min(0),
  options: z.array(optionSchema).optional(),
});

export const createQuizSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(10000).optional(),
  division: objectId,
  subject: objectId,
  settings: z.object({
    timeLimitMinutes: z.coerce.number().min(1).optional(),
    shuffleQuestions: z.boolean().optional(),
    shuffleOptions: z.boolean().optional(),
    maxAttempts: z.coerce.number().min(1).optional(),
    showAnswersAfter: z.boolean().optional(),
  }).optional(),
  questions: z.array(questionSchema).min(0),
});

export const updateQuizSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(10000).optional(),
  settings: z.object({
    timeLimitMinutes: z.coerce.number().min(1).optional(),
    shuffleQuestions: z.boolean().optional(),
    shuffleOptions: z.boolean().optional(),
    maxAttempts: z.coerce.number().min(1).optional(),
    showAnswersAfter: z.boolean().optional(),
  }).optional(),
  questions: z.array(questionSchema).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
});

export const listQuizQuerySchema = z.object({
  divisionId: objectId.optional(),
  subjectId: objectId.optional(),
  teacherId: objectId.optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  search: z.string().optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
});

export const startAttemptSchema = z.object({
  quizId: objectId,
});

export const submitAttemptSchema = z.object({
  quizId: objectId,
  attemptId: objectId.optional(),
  answers: z.array(z.object({
    questionId: objectId,
    selectedOptionIds: z.array(objectId).optional(),
    textAnswer: z.string().optional(),
  })),
  durationSeconds: z.coerce.number().optional(),
});

export type CreateQuizInput = z.infer<typeof createQuizSchema>;
export type UpdateQuizInput = z.infer<typeof updateQuizSchema>;
