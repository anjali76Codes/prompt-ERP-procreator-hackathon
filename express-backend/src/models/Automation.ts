import { Schema, model, Types, type Document, type Model } from 'mongoose';

export type StepType =
  | 'click'
  | 'input'
  | 'change'
  | 'submit'
  | 'navigate'
  | 'wait'
  | 'keypress'
  | 'assert'
  | 'loop-start'
  | 'loop-end'
  | 'if-start'
  | 'else'
  | 'if-end';

/** Conditional check evaluated by an `if-start` step. */
export interface IfCondition {
  source: 'variable' | 'element-text' | 'element-exists';
  variable?: string;
  selector?: string;
  operator:
    | '==' | '!=' | '<' | '<=' | '>' | '>='
    | 'contains' | 'not-contains' | 'exists' | 'not-exists';
  value?: string;
}

/** How a per-row variable is extracted from a matched row element. */
export interface RowBinding {
  /** Variable name exposed inside the loop body (e.g. "name"). */
  name: string;
  source: 'index' | 'text' | 'attr';
  /** CSS selector inside the row (used by 'text' + 'attr'). */
  selector?: string;
  /** Attribute name (used by 'attr'). */
  attr?: string;
}

export type SelectorKind = 'testid' | 'id' | 'role' | 'text' | 'css' | 'xpath' | 'label';

export interface Selector {
  kind: SelectorKind;
  /** Primary value: id, css, xpath, text, role-name. */
  value: string;
  /** Optional second axis (e.g. role + name). */
  detail?: string;
}

export interface AutomationStep {
  id: string;
  type: StepType;
  selectors: Selector[];
  visibleText?: string;
  /** May contain {{varName}} placeholders. */
  value?: string;
  url?: string;
  tagName?: string;
  /** Optional ms delay either side of the action. */
  preWaitMs?: number;
  postWaitMs?: number;
  /** Human-readable label, edited by teachers. */
  label?: string;
  /** loop-start only: CSS selector for the iteration set (e.g. "[data-automation-row]"). */
  rowSelector?: string;
  /** loop-start only: per-row variable bindings. */
  rowBindings?: RowBinding[];
  /** loop-start/loop-end pairing id (so the player can find the matching close). */
  loopId?: string;
  /** if-start only: condition evaluated to choose the branch. */
  condition?: IfCondition;
  /** if-start/else/if-end pairing id. */
  ifId?: string;
}

export interface AutomationVariable {
  name: string;          // e.g. "className"
  label?: string;        // e.g. "Class Name"
  type: 'string' | 'number';
  defaultValue?: string;
}

export interface AutomationDoc extends Document {
  _id: Types.ObjectId;
  owner: Types.ObjectId;
  name: string;
  description?: string;
  scope: 'in-app';   // 'external' reserved for Playwright-driven runs later
  status: 'draft' | 'ready' | 'archived';
  steps: AutomationStep[];
  variables: AutomationVariable[];
  shared: boolean;       // visible to other teachers
  createdAt: Date;
  updatedAt: Date;
}

const selectorSchema = new Schema<Selector>(
  {
    kind: { type: String, enum: ['testid', 'id', 'role', 'text', 'css', 'xpath', 'label'], required: true },
    value: { type: String, required: true },
    detail: { type: String },
  },
  { _id: false },
);

const rowBindingSchema = new Schema<RowBinding>(
  {
    name: { type: String, required: true },
    source: { type: String, enum: ['index', 'text', 'attr'], required: true },
    selector: { type: String },
    attr: { type: String },
  },
  { _id: false },
);

const ifConditionSchema = new Schema<IfCondition>(
  {
    source: { type: String, enum: ['variable', 'element-text', 'element-exists'], required: true },
    variable: { type: String },
    selector: { type: String },
    operator: {
      type: String,
      enum: ['==', '!=', '<', '<=', '>', '>=', 'contains', 'not-contains', 'exists', 'not-exists'],
      required: true,
    },
    value: { type: String },
  },
  { _id: false },
);

const stepSchema = new Schema<AutomationStep>(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      enum: [
        'click', 'input', 'change', 'submit', 'navigate', 'wait', 'keypress', 'assert',
        'loop-start', 'loop-end',
        'if-start', 'else', 'if-end',
      ],
      required: true,
    },
    selectors: { type: [selectorSchema], default: [] },
    visibleText: { type: String },
    value: { type: String },
    url: { type: String },
    tagName: { type: String },
    preWaitMs: { type: Number },
    postWaitMs: { type: Number },
    label: { type: String },
    rowSelector: { type: String },
    rowBindings: { type: [rowBindingSchema], default: undefined },
    loopId: { type: String },
    condition: { type: ifConditionSchema, default: undefined },
    ifId: { type: String },
  },
  { _id: false },
);

const variableSchema = new Schema<AutomationVariable>(
  {
    name: { type: String, required: true },
    label: { type: String },
    type: { type: String, enum: ['string', 'number'], default: 'string' },
    defaultValue: { type: String },
  },
  { _id: false },
);

const automationSchema = new Schema<AutomationDoc>(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    scope: { type: String, enum: ['in-app'], default: 'in-app' },
    status: { type: String, enum: ['draft', 'ready', 'archived'], default: 'draft', index: true },
    steps: { type: [stepSchema], default: [] },
    variables: { type: [variableSchema], default: [] },
    shared: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

export const Automation: Model<AutomationDoc> =
  model<AutomationDoc>('Automation', automationSchema);
