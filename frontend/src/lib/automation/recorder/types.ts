/* ============================================================================
 * Browser automation — recorder + player domain model.
 *
 * Shared with the Express backend (mirrors src/models/Automation.ts).
 * ========================================================================= */

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

/** Conditional check evaluated by `if-start`. */
export type IfConditionSource = 'variable' | 'element-text' | 'element-exists';
export type IfConditionOperator = '==' | '!=' | '<' | '<=' | '>' | '>=' | 'contains' | 'not-contains' | 'exists' | 'not-exists';

export interface IfCondition {
  /** Where the left-hand side comes from. */
  source: IfConditionSource;
  /** Name of the variable to evaluate when source === 'variable'. */
  variable?: string;
  /** CSS selector to inspect when source === 'element-text' / 'element-exists'. */
  selector?: string;
  operator: IfConditionOperator;
  /** Right-hand side. Numeric comparisons coerce both sides via Number(). */
  value?: string;
}

/** How a per-row variable is extracted from a matched row element. */
export interface RowBinding {
  name: string;                     // exposed inside the loop as {{name}}
  source: 'index' | 'text' | 'attr';
  selector?: string;                // CSS within the row
  attr?: string;                    // attribute name for 'attr'
}

export type SelectorKind = 'testid' | 'id' | 'role' | 'text' | 'css' | 'xpath' | 'label';

export interface Selector {
  kind: SelectorKind;
  value: string;
  detail?: string;
}

export interface RecordedStep {
  id: string;
  type: StepType;
  selectors: Selector[];
  visibleText?: string;
  /** May contain `{{varName}}` placeholders. */
  value?: string;
  url?: string;
  tagName?: string;
  preWaitMs?: number;
  postWaitMs?: number;
  label?: string;
  /** loop-start only: CSS selector for rows to iterate (e.g. "[data-automation-row]"). */
  rowSelector?: string;
  /** loop-start only: variable bindings extracted per row. */
  rowBindings?: RowBinding[];
  /** Pairs a loop-start with its matching loop-end. */
  loopId?: string;
  /** if-start only: condition evaluated to decide which branch runs. */
  condition?: IfCondition;
  /** Pairs an if-start with its matching else / if-end. */
  ifId?: string;
}

export interface AutomationVariable {
  name: string;
  label?: string;
  type: 'string' | 'number';
  defaultValue?: string;
}

export type AutomationStatus = 'draft' | 'ready' | 'archived';

export interface Automation {
  _id: string;
  owner: { _id: string; name: string; email: string } | string;
  name: string;
  description?: string;
  scope: 'in-app';
  status: AutomationStatus;
  steps: RecordedStep[];
  variables: AutomationVariable[];
  shared: boolean;
  createdAt: string;
  updatedAt: string;
}

/* ---------- Run ---------------------------------------------------------- */

export type RunStatus = 'running' | 'success' | 'failed' | 'cancelled';
export type StepRunStatus = 'pending' | 'running' | 'success' | 'skipped' | 'failed';

export interface StepResult {
  stepId: string;
  status: StepRunStatus;
  startedAt?: string;
  finishedAt?: string;
  errorMessage?: string;
  matchedSelectorKind?: string;
}

export interface RunLogEntry {
  ts?: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  stepId?: string;
}

export interface AutomationRun {
  _id: string;
  automation: string;
  runner: { _id: string; name: string; email: string } | string;
  status: RunStatus;
  variables: Record<string, string>;
  stepResults: StepResult[];
  log: RunLogEntry[];
  startedAt: string;
  finishedAt?: string;
}

/* ---------- Recorder runtime state --------------------------------------- */

export type RecorderState = 'idle' | 'recording' | 'paused';
export type PlayerState = 'idle' | 'playing' | 'paused' | 'success' | 'failed';

export interface PlayerStepState {
  stepId: string;
  status: StepRunStatus;
  matchedSelectorKind?: string;
  errorMessage?: string;
}
