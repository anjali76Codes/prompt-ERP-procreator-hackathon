import { Schema, model, type Document, type Model, type Types } from 'mongoose';

/**
 * Persistent chat history.
 *
 * One document per conversation; messages live as an embedded array so the
 * common case (open a chat, see its history) is one query.
 *
 * Note: the AI's LangGraph checkpointer is in-process; this collection only
 * persists what the user sees so we can re-hydrate a previous chat. Resuming
 * an old session creates a fresh LangGraph thread, but the UI message log is
 * restored.
 */

export type ChatMessageRole = 'user' | 'ai';

export interface ChatMessageDoc {
  role: ChatMessageRole;
  text: string;
  /** Optional structured side-channels — opaque to the backend; the chat
   *  surface reads these to re-render tables / attachments / dropdowns. */
  meta?: Record<string, unknown>;
  createdAt: Date;
}

export interface ChatSessionDoc extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  /** The id used by the LangGraph thread on the python side. */
  threadId: string;
  title: string;
  /** One-line preview of the last AI reply (for the drawer). */
  preview?: string;
  messages: ChatMessageDoc[];
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<ChatMessageDoc>(
  {
    role:      { type: String, enum: ['user', 'ai'], required: true },
    text:      { type: String, default: '' },
    meta:      { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const chatSessionSchema = new Schema<ChatSessionDoc>(
  {
    user:     { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    threadId: { type: String, required: true, index: true },
    title:    { type: String, required: true, trim: true, maxlength: 120 },
    preview:  { type: String, trim: true, maxlength: 320 },
    messages: { type: [messageSchema], default: [] },
    lastMessageAt: { type: Date, default: () => new Date(), index: true },
  },
  { timestamps: true }
);

chatSessionSchema.index({ user: 1, lastMessageAt: -1 });

export const ChatSession: Model<ChatSessionDoc> =
  model<ChatSessionDoc>('ChatSession', chatSessionSchema);
