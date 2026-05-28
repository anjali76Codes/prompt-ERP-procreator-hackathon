/**
 * Chat history persistence — list / fetch / append / rename / delete sessions.
 * Sessions are owned by the user that created them; no cross-user access.
 */

import { ChatSession, type ChatSessionDoc, type ChatMessageRole } from '../models/ChatSession';
import { NotFound, Forbidden } from '../utils/http-errors';

const DEFAULT_TITLE = 'New chat';
const MAX_PREVIEW = 280;
const MAX_TITLE_FROM_PROMPT = 80;

const deriveTitle = (firstUserMessage: string): string => {
  const cleaned = firstUserMessage.trim().replace(/\s+/g, ' ');
  if (!cleaned) return DEFAULT_TITLE;
  if (cleaned.length <= MAX_TITLE_FROM_PROMPT) return cleaned;
  return cleaned.slice(0, MAX_TITLE_FROM_PROMPT - 1) + '…';
};

const ensureOwner = (doc: ChatSessionDoc, userId: string): void => {
  if (doc.user.toString() !== userId) throw Forbidden('Not your chat session');
};

/* -------------------------------------------------------------------------- */

export interface AppendMessageInput {
  role: ChatMessageRole;
  text: string;
  meta?: Record<string, unknown>;
}

export const createSession = async (
  userId: string,
  threadId: string,
  initialTitle?: string,
): Promise<ChatSessionDoc> =>
  ChatSession.create({
    user: userId,
    threadId,
    title: initialTitle?.trim() || DEFAULT_TITLE,
    messages: [],
    lastMessageAt: new Date(),
  });

export const listMyRecentSessions = async (
  userId: string,
  limit = 30,
): Promise<ChatSessionDoc[]> =>
  ChatSession
    .find({ user: userId })
    .sort({ lastMessageAt: -1 })
    .limit(Math.min(Math.max(limit, 1), 100))
    .select('-messages');

export const getSession = async (
  id: string,
  userId: string,
): Promise<ChatSessionDoc> => {
  const doc = await ChatSession.findById(id);
  if (!doc) throw NotFound('Chat session not found');
  ensureOwner(doc, userId);
  return doc;
};

export const appendMessages = async (
  id: string,
  userId: string,
  messages: AppendMessageInput[],
): Promise<ChatSessionDoc> => {
  const doc = await ChatSession.findById(id);
  if (!doc) throw NotFound('Chat session not found');
  ensureOwner(doc, userId);

  const now = new Date();
  const rows = messages.map(m => ({
    role: m.role,
    text: m.text,
    meta: m.meta,
    createdAt: now,
  }));
  doc.messages.push(...rows);

  // Auto-derive a title from the first user message.
  if ((doc.title === DEFAULT_TITLE || !doc.title) && doc.messages.length > 0) {
    const firstUser = doc.messages.find(m => m.role === 'user');
    if (firstUser?.text) doc.title = deriveTitle(firstUser.text);
  }

  // Preview from the latest AI message.
  const lastAi = [...doc.messages].reverse().find(m => m.role === 'ai');
  if (lastAi?.text) {
    doc.preview = lastAi.text.length > MAX_PREVIEW
      ? lastAi.text.slice(0, MAX_PREVIEW - 1) + '…'
      : lastAi.text;
  }

  doc.lastMessageAt = now;
  await doc.save();
  return doc;
};

export const renameSession = async (
  id: string,
  userId: string,
  title: string,
): Promise<ChatSessionDoc> => {
  const doc = await ChatSession.findById(id);
  if (!doc) throw NotFound('Chat session not found');
  ensureOwner(doc, userId);
  doc.title = title.trim().slice(0, 120) || DEFAULT_TITLE;
  await doc.save();
  return doc;
};

export const deleteSession = async (id: string, userId: string): Promise<void> => {
  const doc = await ChatSession.findById(id);
  if (!doc) throw NotFound('Chat session not found');
  ensureOwner(doc, userId);
  await ChatSession.deleteOne({ _id: id });
};
