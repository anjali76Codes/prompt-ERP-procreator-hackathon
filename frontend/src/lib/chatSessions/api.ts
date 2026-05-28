import { apiRequest } from '../api';

export interface ChatSessionSummary {
  _id: string;
  threadId: string;
  title: string;
  preview?: string;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface PersistedMessage {
  role: 'user' | 'ai';
  text: string;
  meta?: Record<string, unknown>;
  createdAt: string;
}

export interface ChatSession extends ChatSessionSummary {
  messages: PersistedMessage[];
}

export const createChatSession = async (
  threadId: string,
  title?: string,
): Promise<ChatSession> => {
  const data = await apiRequest<{ session: ChatSession }>(`/chat-sessions`, {
    method: 'POST',
    body: { threadId, ...(title ? { title } : {}) },
  });
  return data.session;
};

export const listChatSessions = async (limit = 30): Promise<ChatSessionSummary[]> => {
  const data = await apiRequest<{ sessions: ChatSessionSummary[] }>(
    `/chat-sessions?limit=${limit}`
  );
  return data.sessions;
};

export const getChatSession = async (id: string): Promise<ChatSession> => {
  const data = await apiRequest<{ session: ChatSession }>(`/chat-sessions/${id}`);
  return data.session;
};

export const appendChatMessages = async (
  id: string,
  messages: { role: 'user' | 'ai'; text: string; meta?: Record<string, unknown> }[],
): Promise<ChatSession> => {
  const data = await apiRequest<{ session: ChatSession }>(
    `/chat-sessions/${id}/messages`,
    { method: 'POST', body: { messages } }
  );
  return data.session;
};

export const renameChatSession = async (
  id: string,
  title: string,
): Promise<ChatSession> => {
  const data = await apiRequest<{ session: ChatSession }>(
    `/chat-sessions/${id}`,
    { method: 'PATCH', body: { title } }
  );
  return data.session;
};

export const deleteChatSession = async (id: string): Promise<void> => {
  await apiRequest(`/chat-sessions/${id}`, { method: 'DELETE' });
};
