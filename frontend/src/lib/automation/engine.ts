import { useCallback, useEffect, useRef, useState } from 'react';
import React from 'react';
import { Database, TrendingUp, Mail } from 'lucide-react';
import type {
  ChatMessage, ExecutionLog, LogLevel, Workflow, WorkflowStep,
  WorkflowTemplate, ActiveModel, ConnectedContext,
} from './types';

/* =============================================================================
 *  Mock workflow engine.
 *  Designed so the contract (useAutomationEngine) can be reused unchanged when
 *  a real backend orchestrator (Claude / Gemini tool-use) is wired in.
 * ========================================================================= */

const SUGGESTED_PROMPTS = [
  'Analyze CS101 student performance',
  'Draft warning letters for at-risk students',
  'Generate attendance report for Section A',
] as const;

const SAVED_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'tpl-attendance-report',
    name: 'Weekly Attendance Report (Section A)',
    description: 'Generates a section-level attendance roll-up with PDF export and parent emails to under-75% students.',
    author: 'Prof. Adrian Miller',
    tags: ['attendance', 'pdf', 'email'],
    runCount: 18,
    lastRunAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
    seedPrompt: 'Generate attendance report for Section A',
  },
  {
    id: 'tpl-warning-letters',
    name: 'Draft Warning Letters (At-Risk Students)',
    description: 'Identifies students with grade drop > 15% and drafts personalised guardian letters in institutional tone.',
    author: 'Prof. Adrian Miller',
    tags: ['grades', 'risk', 'letter'],
    runCount: 9,
    lastRunAt: Date.now() - 1000 * 60 * 60 * 24 * 7,
    seedPrompt: 'Draft warning letters for at-risk students',
  },
  {
    id: 'tpl-quiz-publish',
    name: 'Publish Quiz with Deadline',
    description: 'Validates chapter coverage, attaches solutions, publishes to class portal with a configurable deadline.',
    author: 'Dr. Sarah Johnson',
    tags: ['quiz', 'curriculum', 'browser'],
    runCount: 4,
    seedPrompt: 'Create a quiz for Chapter 5 and publish it',
  },
];

const PIPELINE_TEMPLATE: WorkflowStep[] = [
  {
    id: 'step-1',
    kind: 'data_retrieval',
    label: 'DATA RETRIEVAL',
    description: 'Fetch student attendance and quiz grades for Section A-12.',
    color: 'var(--primary)',
    iconBg: '#EFF6FF',
    detail: 'GET /api/v2/records?course=CS101&type=hybrid',
    status: 'queued',
  },
  {
    id: 'step-2',
    kind: 'analysis',
    label: 'ANALYSIS',
    description: 'Identifying students with >15% attendance drop and failing grades.',
    color: '#10B981',
    iconBg: '#ECFDF5',
    tags: [
      { text: 'HEURISTIC MODEL 4.0', borderColor: '#F59E0B' },
      { text: 'REAL-TIME CROSS-REF', borderColor: 'var(--primary)' },
    ],
    status: 'queued',
  },
  {
    id: 'step-3',
    kind: 'communication',
    label: 'COMMUNICATION',
    description: 'Generate and send personalized performance reports to student guardians.',
    color: '#F97316',
    iconBg: '#FFF7ED',
    status: 'queued',
  },
];

export const STEP_ICON: Record<string, React.ReactNode> = {
  data_retrieval:  React.createElement(Database, { size: 18 }),
  analysis:        React.createElement(TrendingUp, { size: 18 }),
  communication:   React.createElement(Mail, { size: 18 }),
  browser_action:  React.createElement(Database, { size: 18 }),
  human_approval:  React.createElement(TrendingUp, { size: 18 }),
};

const LOG_POOL = [
  'PARSING context_nodes for CS101',
  'RESOLVING dependency: attendance_ledger',
  'CALCULATING risk_index for student_cohort',
  'SYNAPSE handshake... OK',
  'OPTIMIZING execution_path for Step_3',
  'EVALUATING heuristics threshold... 15%',
  'SECURE tunnel established for report_delivery',
  'COMPILING grade_diff across Quiz 1-3',
  'INDEXING student_profiles... 128 records',
];

const SEED_LOGS: ExecutionLog[] = [
  { id: 'l-1', ts: '[19:24:28]', level: 'info',    message: '→ REFRESHING local_context_cache... done' },
  { id: 'l-2', ts: '[19:25:28]', level: 'info',    message: '→ REFRESHING local_context_cache... done' },
  { id: 'l-3', ts: '[19:26:29]', level: 'info',    message: '→ PUSHING data_fragment_A8 to worker_node_4' },
  { id: 'l-4', ts: '[19:27:28]', level: 'success', message: '→ VALIDATING security_handshake... SECURE' },
  { id: 'l-5', ts: '[19:27:31]', level: 'info',    message: '→ PUSHING data_fragment_A8 to worker_node_4' },
];

const ts = () => `[${new Date().toTimeString().split(' ')[0]}]`;
const uid = () => Math.random().toString(36).slice(2, 10);

const classify = (msg: string): LogLevel =>
  msg.includes('SECURE') ? 'success'
  : msg.includes('REFRESHING') ? 'info'
  : msg.includes('PUSHING') ? 'info'
  : 'warn';

export const ACTIVE_MODEL: ActiveModel = { name: 'Gemini 1.5 Pro', badge: 'RESEARCH', online: true };
export const CONNECTED_CONTEXT: ConnectedContext = { primary: 'S1-2024 Database', secondary: 'CS101 Records' };

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
  send: (text: string) => void;
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
  const tickRef = useRef<number | null>(null);
  const stepTimers = useRef<number[]>([]);

  /* ---- terminal log ticker -------------------------------------------- */
  useEffect(() => {
    if (!workflow || !showLogs || isPaused) {
      if (tickRef.current) window.clearInterval(tickRef.current);
      return;
    }
    if (logs.length === 0) setLogs(SEED_LOGS);
    tickRef.current = window.setInterval(() => {
      const msg = LOG_POOL[Math.floor(Math.random() * LOG_POOL.length)];
      setLogs(prev => [...prev.slice(-14), {
        id: uid(),
        ts: ts(),
        level: classify(msg),
        message: `→ ${msg}`,
      }]);
    }, 4000);
    return () => { if (tickRef.current) window.clearInterval(tickRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflow?.id, showLogs, isPaused]);

  /* ---- pipeline progression ------------------------------------------ */
  const startWorkflow = useCallback((seed: string) => {
    const steps = PIPELINE_TEMPLATE.map(s => ({ ...s, status: 'queued' as const }));
    const wf: Workflow = {
      id: uid(),
      name: seed.length > 60 ? seed.slice(0, 57) + '…' : seed,
      description: seed,
      status: 'running',
      steps,
      createdAt: Date.now(),
    };
    setWorkflow(wf);

    // Clear any pending timers from a previous workflow.
    stepTimers.current.forEach(window.clearTimeout);
    stepTimers.current = [];

    const advance = (index: number, status: 'running' | 'completed') => {
      setWorkflow(prev => {
        if (!prev) return prev;
        const next = prev.steps.map((s, i) => {
          if (i < index) return { ...s, status: 'completed' as const };
          if (i === index) return { ...s, status };
          return s;
        });
        const allDone = next.every(s => s.status === 'completed');
        return { ...prev, steps: next, status: allDone ? 'completed' : 'running' };
      });
    };

    advance(0, 'running');
    stepTimers.current.push(window.setTimeout(() => advance(1, 'running'), 3500));
    stepTimers.current.push(window.setTimeout(() => advance(2, 'running'), 8500));
    stepTimers.current.push(window.setTimeout(() => advance(2, 'completed'), 12000));
  }, []);

  /* ---- send chat message --------------------------------------------- */
  const send = useCallback((rawText: string) => {
    const text = rawText.trim();
    if (!text) return;

    setMessages(prev => [...prev, { id: uid(), role: 'user', text, createdAt: Date.now() }]);
    if (!workflow) startWorkflow(text);

    const loadingId = uid();
    window.setTimeout(() => {
      setMessages(prev => [...prev, {
        id: loadingId, role: 'ai', isLoading: true, createdAt: Date.now(),
        text: 'Analyzing performance metrics & mapping workflow...',
      }]);
    }, 450);

    window.setTimeout(() => {
      setMessages(prev => prev.filter(m => m.id !== loadingId).concat({
        id: uid(),
        role: 'ai',
        createdAt: Date.now(),
        text: "Understood. I've initiated a 3-step workflow. I'm currently cross-referencing Quiz 1-3 grades with physical attendance records. I've identified 14 students who fall below the current threshold. Would you like me to use the standard template for the letters or a personalized tone?",
        insight: {
          title: 'REAL-TIME INSIGHT',
          body: 'Found 3 students with 100% attendance but <40% grades. This suggests possible engagement issues despite presence.',
          buttonText: 'HIGHLIGHT THESE STUDENTS',
        },
      }));
    }, 2400);
  }, [workflow, startWorkflow]);

  const togglePause = useCallback(() => setPaused(p => !p), []);
  const toggleLogs = useCallback(() => setShowLogs(s => !s), []);

  const deploy = useCallback(() => {
    if (!workflow) return;
    setLogs(prev => [...prev, {
      id: uid(), ts: ts(), level: 'success',
      message: `→ DEPLOY "${workflow.name}" → ERP scheduler accepted (job ${uid().toUpperCase()})`,
    }]);
  }, [workflow]);

  const runTemplate = useCallback((id: string) => {
    const tpl = SAVED_TEMPLATES.find(t => t.id === id);
    if (!tpl) return;
    send(tpl.seedPrompt);
  }, [send]);

  const highlightStudents = useCallback(() => {
    setLogs(prev => [...prev, {
      id: uid(), ts: ts(), level: 'warn',
      message: '→ HIGHLIGHT: Aarav Sharma, Priya Nair, Rohan Das (100% attendance, <40% grades)',
    }]);
  }, []);

  return {
    messages, workflow, logs, isPaused, showLogs,
    templates: SAVED_TEMPLATES,
    suggestedPrompts: SUGGESTED_PROMPTS,
    send, togglePause, toggleLogs, deploy, runTemplate, highlightStudents,
  };
};
