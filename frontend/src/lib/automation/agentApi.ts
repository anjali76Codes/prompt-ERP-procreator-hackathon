/* =============================================================================
 * Client for the Python AI orchestration backend (LangGraph agent).
 *
 * Talks to the FastAPI service (default :8000), forwarding the same JWT the
 * user logged in with — the agent's tools relay that token to the Express
 * backend, so all the usual role/permission checks still apply.
 * ========================================================================= */

import { getToken } from '../api';

const RAW_AI_BASE =
  (import.meta.env.VITE_AI_API_URL as string | undefined) ?? 'http://localhost:8000/python-app';
export const AI_BASE = RAW_AI_BASE.replace(/\/$/, '');

export interface AgentToolStep {
  tool: string;
  args: Record<string, unknown>;
}

export interface ChatTable {
  title?: string;
  columns: string[];
  rows: (string | number | null)[][];
}

export interface ChatAttachment {
  name: string;
  url: string;
  mimeType?: string;
  sizeBytes?: number;
}

export interface ChatNavigate {
  label: string;
  path: string;
}

export interface ChatPermissionOption {
  value: string;
  label: string;
  description?: string;
}

export interface ChatPermission {
  prompt: string;
  options: ChatPermissionOption[];
  context: Record<string, unknown>;
}

export interface PermissionResponse {
  value: string;
  context: Record<string, unknown>;
  overrideScore?: number;
}

export interface AgentChatResponse {
  reply: string;
  sessionId: string;
  toolsUsed: string[];
  steps: AgentToolStep[];
  tables?: ChatTable[];
  attachments?: ChatAttachment[];
  navigate?: ChatNavigate | null;
  permission?: ChatPermission | null;
}

export class AgentApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'AgentApiError';
  }
}

const authHeader = (): Record<string, string> => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const handle = async (res: Response): Promise<AgentChatResponse> => {
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    // FastAPI error shape: { detail: { message, details } } | { detail: "..." }.
    const detail = (json as { detail?: unknown } | null)?.detail;
    const message =
      typeof detail === 'string'
        ? detail
        : (detail as { message?: string } | undefined)?.message ??
          `Request failed with status ${res.status}`;
    throw new AgentApiError(res.status, message);
  }

  return json as AgentChatResponse;
};

/** Send a text-only prompt to the agent. */
export const sendChat = async (
  message: string,
  sessionId: string,
  permissionResponse?: PermissionResponse,
  signal?: AbortSignal,
): Promise<AgentChatResponse> => {
  const res = await fetch(`${AI_BASE}/agents/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({
      message,
      sessionId,
      ...(permissionResponse ? { permissionResponse } : {}),
    }),
    signal,
  });
  return handle(res);
};

/** Send a prompt with attached files (e.g. notes PDF) via multipart. */
export const sendChatWithFiles = async (
  message: string,
  sessionId: string,
  files: File[],
  signal?: AbortSignal,
): Promise<AgentChatResponse> => {
  const fd = new FormData();
  fd.append('message', message);
  fd.append('session_id', sessionId);
  for (const f of files) fd.append('files', f);
  // NB: don't set Content-Type — the browser sets the multipart boundary.
  const res = await fetch(`${AI_BASE}/agents/chat/files`, {
    method: 'POST',
    headers: authHeader(),
    body: fd,
    signal,
  });
  return handle(res);
};
