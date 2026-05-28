import React, { useEffect, useRef, useState } from 'react';
import {
  Sparkles, MoreVertical, Loader2, Cpu, User, Paperclip, Image as ImageIcon, Send, TrendingUp, X,
  ClipboardList, BellRing, CloudUpload, Mic,
} from 'lucide-react';
import s from './Automation.module.css';
import type { ChatMessage, ChatInsight } from '../../lib/automation/types';
import type { PermissionResponse } from '../../lib/automation/agentApi';
import { ChatExtras } from './ChatExtras';
import { InlinePipeline } from './InlinePipeline';

/* ------------------------------------------------------------------ *
 *  Landing-screen prompt cards (shown when chat is empty).
 *  Each card categorises the kind of action so a teacher knows what
 *  to expect even before the agent runs.
 * ------------------------------------------------------------------ */
interface PromptCard {
  category: string;
  icon: React.ReactNode;
  prompt: string;
  short: string;
}

const PROMPT_CARDS: PromptCard[] = [
  {
    category: 'RUN AGENT',
    icon: <ClipboardList size={18} />,
    prompt: 'Generate a 5-question quiz on binary trees for TE-A in Data Structures',
    short: 'Generate a quiz for TE-A',
  },
  {
    category: 'RUN WORKFLOW',
    icon: <BellRing size={18} />,
    prompt: 'Notify the students who haven\'t submitted the OS assignment yet',
    short: 'Notify non-submitters',
  },
  {
    category: 'RUN OPERATION',
    icon: <CloudUpload size={18} />,
    prompt: 'Upload Chapter 3 notes for TE-A in Data Structures',
    short: 'Upload notes for a class',
  },
];

/** Slash-command hints rendered under the input. */
const SLASH_COMMANDS: { command: string; description: string }[] = [
  { command: '/quiz',   description: 'generate assessment' },
  { command: '/notify', description: 'broadcast message' },
  { command: '/export', description: 'download analytics' },
];

interface Props {
  messages: ChatMessage[];
  split: boolean;
  onSend: (text: string, files?: File[]) => void;
  onPermissionResponse?: (messageId: string, pr: PermissionResponse) => void;
  onInsightAction?: (insight: ChatInsight) => void;
}

export const ChatPanel: React.FC<Props> = ({
  messages, split, onSend, onPermissionResponse, onInsightAction,
}) => {
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // NB: convert the FileList to an array *here*, synchronously. If we defer
  // it into the setState updater, the input's `value=''` reset below empties
  // the live FileList before the updater runs and we'd store zero files.
  const addFiles = (picked: File[]) => {
    if (picked.length === 0) return;
    setFiles(prev => [...prev, ...picked]);
  };
  const removeFile = (idx: number) =>
    setFiles(prev => prev.filter((_, i) => i !== idx));

  const submit = (e?: React.FormEvent, override?: string) => {
    e?.preventDefault();
    const v = override ?? text;
    // Suggestion chips (override) never carry attachments.
    const attached = override ? [] : files;
    if (!v.trim() && attached.length === 0) return;
    onSend(v, attached.length ? attached : undefined);
    if (!override) { setText(''); setFiles([]); }
  };

  return (
    <div className={`${s.chatCard} ${split ? s.split : s.full}`}>
      <div className={s.chatHeader}>
        <div className={s.chatHeaderLeft}>
          <div className={s.aiAvatar}><Sparkles size={18} /></div>
          <div>
            <div className={s.chatTitle}>Automation Assistant</div>
            <div className={s.chatStatus}>
              <span className={s.dot} /> ONLINE & THINKING
            </div>
          </div>
        </div>
        <MoreVertical size={18} color="#94A3B8" style={{ cursor: 'pointer' }} />
      </div>

      <div className={s.chatList}>
        {messages.length === 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '2rem 1rem', textAlign: 'center',
            gap: '0.75rem', minHeight: '100%',
          }}>
            <div style={{
              width: 60, height: 60, borderRadius: '50%',
              background: 'var(--primary)', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
            }}>
              <Sparkles size={28} />
            </div>
            <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0F172A' }}>
              How can I assist your department today?
            </h2>
            <p style={{ margin: 0, fontSize: '0.83rem', color: '#64748B', maxWidth: 460 }}>
              CampusOS Orchestrator is ready to automate your academic workflows.
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: '0.75rem',
              width: '100%', maxWidth: 720,
              marginTop: '0.75rem',
            }}>
              {PROMPT_CARDS.map(card => (
                <button
                  key={card.category}
                  type="button"
                  onClick={() => submit(undefined, card.prompt)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                    gap: '0.5rem', textAlign: 'left',
                    background: '#FAFBFC', border: '1px solid #E2E8F0',
                    borderRadius: '0.65rem', padding: '0.9rem',
                    cursor: 'pointer',
                    transition: 'background 0.15s, border-color 0.15s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = '#EFF6FF';
                    e.currentTarget.style.borderColor = '#BFDBFE';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = '#FAFBFC';
                    e.currentTarget.style.borderColor = '#E2E8F0';
                  }}
                >
                  <span style={{ color: 'var(--primary)' }}>{card.icon}</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', lineHeight: 1.35 }}>
                    {card.short}
                  </span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748B', letterSpacing: '0.7px' }}>
                    {card.category}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`${s.msgRow} ${msg.role === 'user' ? s.user : s.ai}`}>
            {msg.role === 'user' ? (
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <div className={s.userBubble}>{msg.text}</div>
                <div className={s.userAvatar}><User size={16} color="#64748B" /></div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <div className={s.aiSmAvatar}><Sparkles size={14} /></div>
                  <div className={s.aiBubble}>
                    {msg.isLoading ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Loader2 size={16} className="animate-spin" />
                        {msg.text}
                      </span>
                    ) : msg.text}
                    {!msg.isLoading && (
                      <div className={s.aiBubbleBadge}><Cpu size={12} /></div>
                    )}
                  </div>
                </div>
                {msg.insight && (
                  <div className={s.insightCard}>
                    <div className={s.insightTag}>ANALYZING ANOMALIES</div>
                    <div className={s.insightBody}>
                      <div className={s.insightTitle}>
                        <TrendingUp size={15} /> {msg.insight.title}
                      </div>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#1E293B', lineHeight: 1.5, fontWeight: 500 }}>
                        {msg.insight.body}
                      </p>
                      <button
                        type="button"
                        className={s.insightAction}
                        onClick={() => {
                          msg.insight!.onAction?.();
                          onInsightAction?.(msg.insight!);
                        }}
                      >
                        {msg.insight.buttonText}
                      </button>
                    </div>
                  </div>
                )}
                {!msg.isLoading && (
                  <div style={{
                    marginLeft: 'calc(1.75rem + 0.75rem)',
                    display: 'flex', flexDirection: 'column', gap: '0.6rem',
                  }}>
                    {msg.workflow && msg.workflow.steps.length > 0 && (
                      <InlinePipeline workflow={msg.workflow} />
                    )}
                    {onPermissionResponse && (
                      <ChatExtras
                        messageId={msg.id}
                        tables={msg.tables}
                        attachments={msg.attachments}
                        navigate={msg.navigate}
                        permission={msg.permission}
                        permissionAnswered={msg.permissionAnswered}
                        onPermission={onPermissionResponse}
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className={s.inputWrap}>
        {files.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.5rem' }}>
            {files.map((f, i) => (
              <span
                key={`${f.name}-${i}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                  background: '#EFF6FF', border: '1px solid #DBEAFE', color: 'var(--primary)',
                  borderRadius: '0.5rem', padding: '0.2rem 0.5rem', fontSize: '0.72rem', fontWeight: 700,
                }}
              >
                <Paperclip size={12} />
                {f.name.length > 28 ? f.name.slice(0, 25) + '…' : f.name}
                <X size={13} style={{ cursor: 'pointer' }} onClick={() => removeFile(i)} />
              </span>
            ))}
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          multiple
          hidden
          onChange={e => { addFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }}
        />
        <form onSubmit={submit} className={s.inputBox}>
          <textarea
            placeholder="Type a command (e.g. /quiz) or ask a question..."
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
          />
          <div className={s.inputFooter}>
            <div className={s.inputIcons}>
              <Paperclip
                size={18}
                style={{ cursor: 'pointer' }}
                onClick={() => fileRef.current?.click()}
              />
              <ImageIcon
                size={18}
                style={{ cursor: 'pointer' }}
                onClick={() => fileRef.current?.click()}
              />
              <Mic size={18} color="#94A3B8" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <button type="submit" className={s.sendBtn} aria-label="Send">
                <Send size={15} />
              </button>
            </div>
          </div>
        </form>

        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '0.85rem',
          padding: '0.55rem 0.15rem 0',
          fontSize: '0.74rem',
        }}>
          {SLASH_COMMANDS.map(({ command, description }) => (
            <button
              key={command}
              type="button"
              onClick={() => setText(prev => prev ? prev : `${command} `)}
              style={{
                background: 'transparent', border: 'none',
                padding: 0, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'baseline', gap: '0.35rem',
                color: '#64748B',
              }}
            >
              <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{command}</span>
              <span>{description}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
