import React, { useEffect, useRef, useState } from 'react';
import {
  Sparkles, MoreVertical, Loader2, Cpu, User, Paperclip, Image as ImageIcon, Send, TrendingUp, X,
} from 'lucide-react';
import s from './Automation.module.css';
import type { ChatMessage, ChatInsight } from '../../lib/automation/types';

interface Props {
  messages: ChatMessage[];
  split: boolean;
  suggestedPrompts: readonly string[];
  onSend: (text: string, files?: File[]) => void;
  onInsightAction?: (insight: ChatInsight) => void;
}

export const ChatPanel: React.FC<Props> = ({
  messages, split, suggestedPrompts, onSend, onInsightAction,
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
          <div className={s.emptyState}>
            <div className={s.emptyHero}>
              <div className={s.emptyAvatar}><Sparkles size={30} /></div>
              <div>
                <h2 className={s.emptyTitle}>Welcome to Campus Orchestrator</h2>
                <p className={s.emptyHint}>
                  Kick off a workflow with a prompt or choose one of the suggested operations below.
                </p>
              </div>
            </div>

            <div className={s.emptyCardGrid}>
              {suggestedPrompts.slice(0, 3).map(prompt => (
                <button
                  key={prompt}
                  type="button"
                  className={s.emptyActionCard}
                  onClick={() => submit(undefined, prompt)}
                >
                  <span className={s.emptyActionLabel}>RUN OPERATION</span>
                  <span className={s.emptyActionTitle}>{prompt}</span>
                  <span className={s.emptyActionMeta}>Instantly launch a smart assistant flow</span>
                </button>
              ))}
            </div>

            <div className={s.suggestionRow}>
              {suggestedPrompts.slice(3).map(prompt => (
                <button
                  key={prompt}
                  className={s.suggestionChip}
                  onClick={() => submit(undefined, prompt)}
                  type="button"
                >
                  {prompt}
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
            placeholder="Tell the AI what to automate next..."
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
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <button type="button" className={s.turboBtn}>⚡ TURBO</button>
              <button type="submit" className={s.sendBtn} aria-label="Send">
                <Send size={15} />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
