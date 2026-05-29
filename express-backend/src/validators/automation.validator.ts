import { z } from 'zod';

const selectorSchema = z.object({
  kind: z.enum(['testid', 'id', 'role', 'text', 'css', 'xpath', 'label']),
  value: z.string().min(1),
  detail: z.string().optional(),
});

const rowBindingZ = z.object({
  name: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Variable name must be a valid identifier'),
  source: z.enum(['index', 'text', 'attr']),
  selector: z.string().optional(),
  attr: z.string().optional(),
});

const ifConditionZ = z.object({
  source: z.enum(['variable', 'element-text', 'element-exists']),
  variable: z.string().optional(),
  selector: z.string().optional(),
  operator: z.enum([
    '==', '!=', '<', '<=', '>', '>=',
    'contains', 'not-contains', 'exists', 'not-exists',
  ]),
  value: z.string().optional(),
});

export const stepSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    'click', 'input', 'change', 'submit', 'navigate', 'wait', 'keypress', 'assert',
    'loop-start', 'loop-end',
    'if-start', 'else', 'if-end',
  ]),
  selectors: z.array(selectorSchema).default([]),
  visibleText: z.string().optional(),
  value: z.string().optional(),
  url: z.string().optional(),
  tagName: z.string().optional(),
  preWaitMs: z.number().int().min(0).max(60_000).optional(),
  postWaitMs: z.number().int().min(0).max(60_000).optional(),
  label: z.string().optional(),
  rowSelector: z.string().optional(),
  rowBindings: z.array(rowBindingZ).optional(),
  loopId: z.string().optional(),
  condition: ifConditionZ.optional(),
  ifId: z.string().optional(),
});

export const variableSchema = z.object({
  name: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Variable name must be a valid identifier'),
  label: z.string().optional(),
  type: z.enum(['string', 'number']).default('string'),
  defaultValue: z.string().optional(),
});

export const createAutomationSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).optional(),
  steps: z.array(stepSchema).default([]),
  variables: z.array(variableSchema).default([]),
});

export const updateAutomationSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(1000).optional(),
  steps: z.array(stepSchema).optional(),
  variables: z.array(variableSchema).optional(),
  status: z.enum(['draft', 'ready', 'archived']).optional(),
  shared: z.boolean().optional(),
});

export const recordRunSchema = z.object({
  status: z.enum(['running', 'success', 'failed', 'cancelled']),
  variables: z.record(z.string(), z.string()).default({}),
  stepResults: z
    .array(
      z.object({
        stepId: z.string(),
        status: z.enum(['pending', 'running', 'success', 'skipped', 'failed']),
        startedAt: z.string().datetime().optional(),
        finishedAt: z.string().datetime().optional(),
        errorMessage: z.string().optional(),
        matchedSelectorKind: z.string().optional(),
      }),
    )
    .default([]),
  log: z
    .array(
      z.object({
        ts: z.string().datetime().optional(),
        level: z.enum(['info', 'warn', 'error']).default('info'),
        message: z.string(),
        stepId: z.string().optional(),
      }),
    )
    .default([]),
  startedAt: z.string().datetime().optional(),
  finishedAt: z.string().datetime().optional(),
});

export type CreateAutomationInput = z.infer<typeof createAutomationSchema>;
export type UpdateAutomationInput = z.infer<typeof updateAutomationSchema>;
export type RecordRunInput = z.infer<typeof recordRunSchema>;
