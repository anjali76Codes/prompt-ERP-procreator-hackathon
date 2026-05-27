import { useCallback, useRef, useState } from 'react';
import React from 'react';
import { Database, TrendingUp, Mail } from 'lucide-react';
import type {
  ChatMessage, ExecutionLog, Workflow, WorkflowStep,
  WorkflowTemplate, ActiveModel, ConnectedContext,
} from './types';
import {
  AgentApiError, sendChat, sendChatWithFiles, type AgentToolStep,
} from './agentApi';

/* =============================================================================
 *  Automation engine — wired to the Python LangGraph agent.
 *
 *  The user's prompt goes to POST /agents/chat (or /agents/chat/files when
 *  files are attached). The agent calls ERP tools and returns { reply, steps }.
 *  We render the reply in chat and turn the tool-call `steps` into the live
 *  workflow pipeline + terminal logs.
 * ========================================================================= */

const SUGGESTED_PROMPTS = [
  'Create a 5-question quiz on binary trees for TE-A in Data Structures',
  'Upload notes for Chapter 3 of Data Structures for TE-A',
  'Mark everyone present in today’s DSA lecture for TE-A',
] as const;

const SAVED_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'tpl-quiz-publish',
    name: 'Create & Publish a Quiz',
    description: 'Generates questions for a topic, creates the quiz for a division + subject, and publishes it.',
    author: 'Prof. Adrian Miller',
    tags: ['quiz', 'generate', 'publish'],
    runCount: 4,
    seedPrompt: 'Create and publish a 5-question quiz on sorting algorithms for TE-A in Data Structures',
  },
  {
    id: 'tpl-upload-notes',
    name: 'Upload Lecture Notes',
    description: 'Creates a notes resource for a division + subject (attach a file in the chat to upload it).',
    author: 'Dr. Sarah Johnson',
    tags: ['notes', 'resources'],
    runCount: 11,
    seedPrompt: 'Upload notes for Chapter 3 of Data Structures for TE-A',
  },
  {
    id: 'tpl-mark-attendance',
    name: 'Mark Attendance',
    description: 'Finds today’s lecture and marks the whole class present in one step.',
    author: 'Prof. Adrian Miller',
    tags: ['attendance'],
    runCount: 18,
    seedPrompt: 'Mark all students present in today’s DSA lecture for TE-A',
  },
];

export const STEP_ICON: Record<string, React.ReactNode> = {
  data_retrieval:  React.createElement(Database, { size: 18 }),
  analysis:        React.createElement(TrendingUp, { size: 18 }),
  communication:   React.createElement(Mail, { size: 18 }),
  browser_action:  React.createElement(Database, { size: 18 }),
  human_approval:  React.createElement(TrendingUp, { size: 18 }),
};

export const ACTIVE_MODEL: ActiveModel = { name: 'Gemini 2.0 Flash', badge: 'LANGGRAPH', online: true };
export const CONNECTED_CONTEXT: ConnectedContext = { primary: 'ERP Backend', secondary: 'Quizzes · Notes · Attendance' };

/* ---- tool-call -> pipeline / log mapping -------------------------------- */

// Read-only tools render as "data retrieval"; everything else is an action.
const READ_TOOLS = new Set([
  'list_divisions', 'list_subjects', 'list_resources', 'list_quizzes',
  'get_quiz', 'quiz_metrics', 'list_lectures', 'get_lecture_roster',
  'division_attendance_stats', 'student_attendance',
]);

const kindOf = (tool: string): WorkflowStep['kind'] =>
  READ_TOOLS.has(tool) ? 'data_retrieval' : 'communication';

const prettyTool = (tool: string): string =>
  tool.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const fmtVal = (v: unknown): string => {
  if (Array.isArray(v)) return `${v.length} item(s)`;
  if (v && typeof v === 'object') return '{…}';
  return String(v);
};

const summarizeArgs = (args: Record<string, unknown>): string =>
  Object.entries(args)
    .slice(0, 3)
    .map(([k, v]) => `${k}: ${fmtVal(v)}`)
    .join(' · ') || 'no arguments';

const ts = () => `[${new Date().toTimeString().split(' ')[0]}]`;
const uid = () => Math.random().toString(36).slice(2, 10);
const newSessionId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : uid();

const buildWorkflow = (seed: string, steps: AgentToolStep[]): Workflow | null => {
  if (steps.length === 0) return null;
  return {
    id: uid(),
    name: seed.length > 60 ? seed.slice(0, 57) + '…' : seed,
    description: seed,
    status: 'completed',
    createdAt: Date.now(),
    steps: steps.map((st, i) => ({
      id: `step-${i}`,
      kind: kindOf(st.tool),
      label: prettyTool(st.tool),
      description: summarizeArgs(st.args),
      status: 'completed' as const,
    })),
  };
};

const buildLogs = (steps: AgentToolStep[]): ExecutionLog[] => {
  const out: ExecutionLog[] = steps.map(st => ({
    id: uid(),
    ts: ts(),
    level: 'info' as const,
    message: `→ TOOL ${st.tool}(${summarizeArgs(st.args)})`,
  }));
  out.push({
    id: uid(),
    ts: ts(),
    level: 'success',
    message: `→ Completed ${steps.length} tool call(s)`,
  });
  return out;
};

export interface AutomationEngineState {
  messages: ChatMessage[];
  workflow: Workflow | null;
  logs: ExecutionLog[];
  templates: WorkflowTemplate[];
  isPaused: boolean;
  showLogs: boolean;
  suggestedPrompts: readonly string[];
}

export interface AutomationEngineActions {
  send: (text: string, files?: File[]) => void;
  togglePause: () => void;
  toggleLogs: () => void;
  deploy: () => void;
  runTemplate: (templateId: string) => void;
  highlightStudents: () => void;
}

export const useAutomationEngine = (): AutomationEngineState & AutomationEngineActions => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [isPaused, setPaused] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  // One conversation/session for the lifetime of this mounted page.
  const sessionId = useRef<string>(newSessionId());

  const send = useCallback((rawText: string, files?: File[]) => {
    const text = rawText.trim();
    const hasFiles = !!files && files.length > 0;
    if (!text && !hasFiles) return;

    const userText = text || `Uploading ${files!.length} file(s)`;
    setMessages(prev => [...prev, { id: uid(), role: 'user', text: userText, createdAt: Date.now() }]);

    const loadingId = uid();
    setMessages(prev => [...prev, {
      id: loadingId, role: 'ai', isLoading: true, createdAt: Date.now(),
      text: 'Working on it — detecting intent and calling the right tools…',
    }]);

    const run = hasFiles
      ? sendChatWithFiles(userText, sessionId.current, files!)
      : sendChat(userText, sessionId.current);

    run
      .then(resp => {
        setMessages(prev => prev.filter(m => m.id !== loadingId).concat({
          id: uid(), role: 'ai', text: resp.reply, createdAt: Date.now(),
        }));
        const wf = buildWorkflow(userText, resp.steps);
        if (wf) {
          setWorkflow(wf);
          setLogs(buildLogs(resp.steps));
        }
      })
      .catch((err: unknown) => {
        const message =
          err instanceof AgentApiError ? err.message
          : err instanceof Error ? err.message
          : 'Could not reach the AI backend.';
        setMessages(prev => prev.filter(m => m.id !== loadingId).concat({
          id: uid(), role: 'ai', createdAt: Date.now(),
          text: `⚠️ ${message}`,
        }));
      });
  }, []);

  const togglePause = useCallback(() => setPaused(p => !p), []);
  const toggleLogs = useCallback(() => setShowLogs(s => !s), []);

  const deploy = useCallback(() => {
    if (!workflow) return;
    setLogs(prev => [...prev, {
      id: uid(), ts: ts(), level: 'success',
      message: `→ SAVED "${workflow.name}" as a reusable workflow`,
    }]);
  }, [workflow]);

  const runTemplate = useCallback((id: string) => {
    const tpl = SAVED_TEMPLATES.find(t => t.id === id);
    if (tpl) send(tpl.seedPrompt);
  }, [send]);

  // Kept for the ChatPanel insight-action contract; the live agent doesn't
  // emit insight cards, so this is a no-op.
  const highlightStudents = useCallback(() => {}, []);

  return {
    messages, workflow, logs, isPaused, showLogs,
    templates: SAVED_TEMPLATES,
    suggestedPrompts: SUGGESTED_PROMPTS,
    send, togglePause, toggleLogs, deploy, runTemplate, highlightStudents,
  };
};
