/* =============================================================================
 * Automation domain model.
 *
 * The Automation module is the orchestration layer for AI-driven workflows.
 * A user types a natural-language prompt; the engine turns that into a
 * `Workflow` made of `WorkflowStep`s, each backed by a registered `Tool`
 * (a backend API call or a browser automation routine).
 *
 * Today the engine is mocked. The interfaces here are designed so the mock
 * can be swapped for a real backend (Claude / Gemini tool-use loop) without
 * changes to the UI components.
 * ========================================================================= */

import type { ReactNode } from 'react';
import type {
  ChatAttachment, ChatNavigate, ChatPermission, ChatTable,
} from './agentApi';

/* ---------- Chat ---------------------------------------------------------- */

export type ChatRole = 'user' | 'ai' | 'system';

export interface ChatInsight {
  title: string;
  body: ReactNode;
  buttonText: string;
  onAction?: () => void;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  insight?: ChatInsight;
  isLoading?: boolean;
  createdAt: number;
  // Structured side-channels — rendered below the message bubble.
  tables?: ChatTable[];
  attachments?: ChatAttachment[];
  navigate?: ChatNavigate | null;
  permission?: ChatPermission | null;
  /** Once the user has answered a permission dropdown for this message, lock it. */
  permissionAnswered?: boolean;
  /** The pipeline of tool calls the agent ran to produce this reply — shown
   *  inline under the AI bubble rather than in a separate column. */
  workflow?: Workflow;
}

/* ---------- Workflows ----------------------------------------------------- */

export type StepStatus = 'queued' | 'running' | 'completed' | 'failed' | 'skipped';

export type StepKind =
  | 'data_retrieval'     // call an ERP backend API
  | 'analysis'           // AI / heuristic processing
  | 'communication'      // send mail / notification
  | 'browser_action'     // Playwright / LCA browser step
  | 'human_approval';    // pause and wait for user click

export interface WorkflowStepTag {
  text: string;
  borderColor: string;
}

export interface WorkflowStep {
  id: string;
  kind: StepKind;
  label: string;
  description: string;
  /** Optional accent color override for the step's icon. */
  color?: string;
  iconBg?: string;
  /** Free-form display payload — e.g. an API call preview, code block, etc. */
  detail?: ReactNode;
  tags?: WorkflowStepTag[];
  status: StepStatus;
}

export type WorkflowStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed';

export interface Workflow {
  id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  steps: WorkflowStep[];
  /** Saved workflows can be re-executed by other teachers (LCA-style). */
  isTemplate?: boolean;
  createdAt: number;
}

/* ---------- Saved workflow templates (Low-Code Automation library) ------- */

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  /** Author display name. */
  author: string;
  /** Tags such as "attendance", "grades", "export". */
  tags: string[];
  /** Last time this template was successfully run. */
  lastRunAt?: number;
  runCount: number;
  /** The prompt that originally produced this workflow. */
  seedPrompt: string;
}

/* ---------- Execution logs (terminal panel) ------------------------------- */

export type LogLevel = 'info' | 'success' | 'warn' | 'error';

export interface ExecutionLog {
  id: string;
  ts: string;
  level: LogLevel;
  message: string;
}

/* ---------- Engine / context contract ------------------------------------ */

export interface ActiveModel {
  name: string;
  badge: string;
  online: boolean;
}

export interface ConnectedContext {
  primary: string;
  secondary: string;
}
