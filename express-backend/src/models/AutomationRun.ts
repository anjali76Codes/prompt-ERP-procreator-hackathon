import { Schema, model, Types, type Document, type Model } from 'mongoose';

export type RunStatus = 'running' | 'success' | 'failed' | 'cancelled';
export type StepStatus = 'pending' | 'running' | 'success' | 'skipped' | 'failed';

export interface StepResult {
  stepId: string;
  status: StepStatus;
  startedAt?: Date;
  finishedAt?: Date;
  errorMessage?: string;
  /** Which selector kind succeeded — useful for debugging selector drift. */
  matchedSelectorKind?: string;
}

export interface RunLogEntry {
  ts: Date;
  level: 'info' | 'warn' | 'error';
  message: string;
  stepId?: string;
}

export interface AutomationRunDoc extends Document {
  _id: Types.ObjectId;
  automation: Types.ObjectId;
  runner: Types.ObjectId;
  status: RunStatus;
  /** Variable values used for this run. */
  variables: Record<string, string>;
  stepResults: StepResult[];
  log: RunLogEntry[];
  startedAt: Date;
  finishedAt?: Date;
}

const stepResultSchema = new Schema<StepResult>(
  {
    stepId: { type: String, required: true },
    status: { type: String, enum: ['pending', 'running', 'success', 'skipped', 'failed'], required: true },
    startedAt: { type: Date },
    finishedAt: { type: Date },
    errorMessage: { type: String },
    matchedSelectorKind: { type: String },
  },
  { _id: false },
);

const logEntrySchema = new Schema<RunLogEntry>(
  {
    ts: { type: Date, default: () => new Date() },
    level: { type: String, enum: ['info', 'warn', 'error'], default: 'info' },
    message: { type: String, required: true },
    stepId: { type: String },
  },
  { _id: false },
);

const runSchema = new Schema<AutomationRunDoc>(
  {
    automation: { type: Schema.Types.ObjectId, ref: 'Automation', required: true, index: true },
    runner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['running', 'success', 'failed', 'cancelled'], default: 'running', index: true },
    variables: { type: Schema.Types.Mixed, default: {} },
    stepResults: { type: [stepResultSchema], default: [] },
    log: { type: [logEntrySchema], default: [] },
    startedAt: { type: Date, default: () => new Date() },
    finishedAt: { type: Date },
  },
  { timestamps: false },
);

export const AutomationRun: Model<AutomationRunDoc> =
  model<AutomationRunDoc>('AutomationRun', runSchema);
