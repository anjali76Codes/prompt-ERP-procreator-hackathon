import { useCallback, useEffect, useRef, useState } from 'react';
import React from 'react';
import { Database, TrendingUp, Mail } from 'lucide-react';
import type {
  ChatMessage, ExecutionLog, Workflow, WorkflowStep,
  WorkflowTemplate, ActiveModel, ConnectedContext,
} from './types';
import {
  AgentApiError, sendChat, sendChatWithFiles,
  type AgentToolStep, type PermissionResponse,
} from './agentApi';
import {
  appendChatMessages, createChatSession, getChatSession,
  listChatSessions, deleteChatSession,
  type ChatSessionSummary,
} from '../chatSessions/api';

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
  'list_divisions', 'list_subjects', 'list_resources', 'get_resource',
  'list_quizzes', 'get_quiz', 'quiz_metrics', 'list_lectures',
  'get_lecture_roster', 'division_attendance_stats', 'student_attendance',
  'list_submissions', 'submission_stats', 'read_resource_text',
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

/**
 * Plain-language labels + descriptions per tool so the pipeline reads to a
 * non-technical teacher. The description uses the tool's args where useful
 * (e.g. "for TE-A" if `division_id` was bound).
 */
const TOOL_LABEL: Record<string, string> = {
  list_divisions:                'Finding the class',
  list_subjects:                 'Finding the subject',
  list_resources:                'Looking up your assignments & notes',
  get_resource:                  'Fetching the assignment details',
  list_lectures:                 'Finding the lecture',
  get_lecture_roster:            'Reading the class roster',
  mark_attendance:               'Marking attendance',
  mark_attendance_for_all:       'Marking the whole class',
  division_attendance_stats:     'Pulling attendance stats',
  student_attendance:            'Looking up a student\'s attendance',
  export_division_attendance_pdf:'Generating the attendance PDF',
  export_lecture_roster_pdf:     'Generating the lecture roster PDF',
  create_resource:               'Creating the resource',
  publish_resource:              'Publishing to students',
  update_resource:               'Updating the assignment',
  notify_non_submitters:         'Notifying students who haven\'t submitted',
  read_resource_text:            'Reading the document text',
  list_submissions:              'Loading student submissions',
  submission_stats:              'Counting submissions',
  grade_submission:              'Saving the grade',
  request_resubmit:              'Asking the student to resubmit',
  generate_assignment_from_notes:'Drafting an assignment from your notes',
  set_rubric:                    'Saving the rubric',
  parse_rubric_from_chat_attachment: 'Reading your rubric PDF',
  grade_submissions_with_rubric: 'Grading every submission against the rubric',
  ask_grading_permission:        'Asking for your approval',
  publish_proposed_grades:       'Publishing grades to students',
  publish_one_grade:             'Publishing this grade',
  create_quiz:                   'Building the quiz',
  publish_quiz:                  'Publishing the quiz',
  list_quizzes:                  'Looking up your quizzes',
  get_quiz:                      'Fetching the quiz',
  quiz_metrics:                  'Pulling quiz results',
};

/** Human-friendly args descriptions per tool (best-effort; falls back to summarizeArgs). */
const describeArgs = (tool: string, args: Record<string, unknown>): string => {
  const val = (k: string) => {
    const v = args[k];
    return v === undefined || v === null || v === '' ? null : String(v);
  };
  switch (tool) {
    case 'list_resources': {
      const kind = val('kind');
      const mine = args.mine ? 'yours' : 'all';
      const div = val('division_id');
      return [kind ? `${kind}s` : 'resources', mine, div ? `division: ${div.slice(-6)}` : ''].filter(Boolean).join(' · ');
    }
    case 'get_resource':
    case 'list_submissions':
    case 'submission_stats':
    case 'publish_resource':
    case 'update_resource':
    case 'request_resubmit':
    case 'grade_submission':
    case 'publish_one_grade':
    case 'set_rubric':
    case 'parse_rubric_from_chat_attachment':
    case 'grade_submissions_with_rubric':
    case 'publish_proposed_grades': {
      const rid = val('resource_id') || val('submission_id');
      return rid ? `id: …${rid.slice(-6)}` : 'no specific id';
    }
    case 'mark_attendance':
    case 'mark_attendance_for_all':
    case 'get_lecture_roster':
    case 'export_lecture_roster_pdf':
      return val('lecture_id') ? `lecture …${val('lecture_id')!.slice(-6)}` : 'this lecture';
    case 'export_division_attendance_pdf':
    case 'division_attendance_stats':
      return val('division_id') ? `division …${val('division_id')!.slice(-6)}` : 'whole division';
    case 'list_lectures': {
      const date = val('date');
      const mine = args.mine ? 'yours' : '';
      return [date && `on ${date}`, mine].filter(Boolean).join(' · ') || 'all lectures';
    }
    case 'ask_grading_permission': {
      const name = val('student_name');
      const score = val('proposed_score');
      const max = val('max_marks');
      return name && score ? `${name} — proposed ${score}/${max ?? '?'}` : 'one student';
    }
    case 'create_resource':
    case 'generate_assignment_from_notes': {
      const kind = val('kind') || 'assignment';
      const title = val('title');
      return title ? `${kind}: "${title}"` : kind;
    }
    case 'create_quiz':
    case 'get_quiz':
    case 'quiz_metrics':
    case 'publish_quiz':
      return val('title') ? `"${val('title')}"` : val('quiz_id') ? `id …${val('quiz_id')!.slice(-6)}` : 'this quiz';
    case 'list_divisions':
    case 'list_subjects':
      return val('query') ? `match: "${val('query')}"` : 'all';
    case 'list_quizzes':
      return val('division_id') ? `division …${val('division_id')!.slice(-6)}` : 'all quizzes';
    default:
      return summarizeArgs(args);
  }
};

const friendlyLabel = (tool: string): string =>
  TOOL_LABEL[tool] ?? prettyTool(tool);

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
      label: friendlyLabel(st.tool),
      description: describeArgs(st.tool, st.args),
      status: 'completed' as const,
    })),
  };
};

const buildLogs = (steps: AgentToolStep[]): ExecutionLog[] => {
  const out: ExecutionLog[] = steps.map(st => ({
    id: uid(),
    ts: ts(),
    level: 'info' as const,
    message: `→ ${friendlyLabel(st.tool)} (${describeArgs(st.tool, st.args)})`,
  }));
  out.push({
    id: uid(),
    ts: ts(),
    level: 'success',
    message: `→ Done — ${steps.length} step${steps.length === 1 ? '' : 's'} completed`,
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
  sessions: ChatSessionSummary[];
  activeSessionId: string | null;
}

export interface AutomationEngineActions {
  send: (text: string, files?: File[]) => void;
  sendPermissionResponse: (messageId: string, pr: PermissionResponse) => void;
  togglePause: () => void;
  toggleLogs: () => void;
  deploy: () => void;
  runTemplate: (templateId: string) => void;
  highlightStudents: () => void;
  newChat: () => void;
  loadSession: (id: string) => Promise<void>;
  refreshSessions: () => Promise<void>;
  removeSession: (id: string) => Promise<void>;
}

export const useAutomationEngine = (): AutomationEngineState & AutomationEngineActions => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [isPaused, setPaused] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  // One conversation/session for the lifetime of this mounted page (until "New chat").
  const sessionId = useRef<string>(newSessionId());
  // Mongo id of the persisted ChatSession — null until the user sends their first
  // message; created on demand so we don't spam empty rows.
  const [dbSessionId, setDbSessionId] = useState<string | null>(null);
  const dbSessionIdRef = useRef<string | null>(null);
  useEffect(() => { dbSessionIdRef.current = dbSessionId; }, [dbSessionId]);

  const refreshSessions = useCallback(async () => {
    try {
      const list = await listChatSessions(30);
      setSessions(list);
    } catch {
      // Drawer is best-effort — don't break chat if the express backend is down.
    }
  }, []);

  // Load the recent-sessions list on mount.
  useEffect(() => { void refreshSessions(); }, [refreshSessions]);

  /** Ensure a ChatSession exists in Mongo; create lazily on first message. */
  const ensureDbSession = useCallback(async (): Promise<string | null> => {
    if (dbSessionIdRef.current) return dbSessionIdRef.current;
    try {
      const created = await createChatSession(sessionId.current);
      setDbSessionId(created._id);
      dbSessionIdRef.current = created._id;
      return created._id;
    } catch {
      return null;
    }
  }, []);

  /** Best-effort persistence — never blocks chat if Express is unreachable. */
  const persistTurn = useCallback(async (
    userText: string,
    aiText: string,
    aiMeta?: Record<string, unknown>,
  ) => {
    const id = await ensureDbSession();
    if (!id) return;
    try {
      await appendChatMessages(id, [
        { role: 'user', text: userText },
        { role: 'ai', text: aiText, meta: aiMeta },
      ]);
      void refreshSessions();
    } catch {
      // ignore
    }
  }, [ensureDbSession, refreshSessions]);

  const dispatch = useCallback((
    userText: string,
    files?: File[],
    permissionResponse?: PermissionResponse,
    showUserBubble = true,
  ) => {
    const hasFiles = !!files && files.length > 0;

    if (showUserBubble) {
      setMessages(prev => [...prev, {
        id: uid(), role: 'user', text: userText, createdAt: Date.now(),
      }]);
    }

    const loadingId = uid();
    setMessages(prev => [...prev, {
      id: loadingId, role: 'ai', isLoading: true, createdAt: Date.now(),
      text: 'Working on it — detecting intent and calling the right tools…',
    }]);

    const run = hasFiles
      ? sendChatWithFiles(userText, sessionId.current, files!)
      : sendChat(userText, sessionId.current, permissionResponse);

    run
      .then(resp => {
        const wf = buildWorkflow(userText, resp.steps);
        setMessages(prev => prev.filter(m => m.id !== loadingId).concat({
          id: uid(),
          role: 'ai',
          text: resp.reply,
          createdAt: Date.now(),
          tables: resp.tables ?? [],
          attachments: resp.attachments ?? [],
          navigate: resp.navigate ?? null,
          permission: resp.permission ?? null,
          workflow: wf ?? undefined,
        }));
        if (wf) {
          // Keep page-level state for the (now legacy) workflow column. Once
          // we're confident nothing reads it, this can be removed.
          setWorkflow(wf);
          setLogs(buildLogs(resp.steps));
        }
        // Persist this turn to Mongo so it shows up in the Recent Activity drawer.
        void persistTurn(userText, resp.reply, {
          tables: resp.tables ?? [],
          attachments: resp.attachments ?? [],
          navigate: resp.navigate ?? null,
          // Don't persist the permission dropdown — once answered it's a
          // one-shot, and rendering a stale dropdown on resume would confuse.
        });
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

  const send = useCallback((rawText: string, files?: File[]) => {
    const text = rawText.trim();
    const hasFiles = !!files && files.length > 0;
    if (!text && !hasFiles) return;
    const userText = text || `Uploading ${files!.length} file(s)`;
    dispatch(userText, files);
  }, [dispatch]);

  const sendPermissionResponse = useCallback((messageId: string, pr: PermissionResponse) => {
    // Lock the dropdown on the message that produced this prompt.
    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, permissionAnswered: true } : m
    ));
    const label = pr.value === 'deny' && pr.overrideScore !== undefined
      ? `Deny — give ${pr.overrideScore}`
      : pr.value === 'allow_for_all'
        ? 'Allow for all'
        : pr.value === 'deny'
          ? 'Deny'
          : 'Allow';
    // Show the user's choice as a bubble so the chat reads naturally.
    dispatch(label, undefined, pr, true);
  }, [dispatch]);

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

  const newChat = useCallback(() => {
    sessionId.current = newSessionId();
    setDbSessionId(null);
    dbSessionIdRef.current = null;
    setMessages([]);
    setWorkflow(null);
    setLogs([]);
  }, []);

  const loadSession = useCallback(async (id: string) => {
    try {
      const full = await getChatSession(id);
      sessionId.current = full.threadId || newSessionId();
      setDbSessionId(full._id);
      dbSessionIdRef.current = full._id;
      setWorkflow(null);
      setLogs([]);
      setMessages(full.messages.map(m => {
        const meta = (m.meta ?? {}) as {
          tables?: ChatMessage['tables'];
          attachments?: ChatMessage['attachments'];
          navigate?: ChatMessage['navigate'];
        };
        return {
          id: uid(),
          role: m.role,
          text: m.text,
          createdAt: new Date(m.createdAt).getTime(),
          tables: meta.tables ?? [],
          attachments: meta.attachments ?? [],
          navigate: meta.navigate ?? null,
        };
      }));
    } catch {
      // ignore
    }
  }, []);

  const removeSession = useCallback(async (id: string) => {
    try {
      await deleteChatSession(id);
      if (dbSessionIdRef.current === id) newChat();
      await refreshSessions();
    } catch {
      // ignore
    }
  }, [newChat, refreshSessions]);

  return {
    messages, workflow, logs, isPaused, showLogs,
    templates: SAVED_TEMPLATES,
    suggestedPrompts: SUGGESTED_PROMPTS,
    sessions,
    activeSessionId: dbSessionId,
    send, sendPermissionResponse,
    togglePause, toggleLogs, deploy, runTemplate, highlightStudents,
    newChat, loadSession, refreshSessions, removeSession,
  };
};
