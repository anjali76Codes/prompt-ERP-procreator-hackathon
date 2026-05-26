import React, { useEffect, useRef, useState } from 'react';
import {
  Sparkles, MoreVertical, Loader2, Cpu, User, Paperclip, Image as ImageIcon, Send, TrendingUp,
} from 'lucide-react';
import s from './Automation.module.css';
import type { ChatMessage, ChatInsight } from '../../lib/automation/types';

interface Props {
  messages: ChatMessage[];
  split: boolean;
  suggestedPrompts: readonly string[];
  onSend: (text: string) => void;
  onInsightAction?: (insight: ChatInsight) => void;
}

export const ChatPanel: React.FC<Props> = ({
  messages, split, suggestedPrompts, onSend, onInsightAction,
}) => {
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const submit = (e?: React.FormEvent, override?: string) => {
    e?.preventDefault();
    const v = override ?? text;
    if (!v.trim()) return;
    onSend(v);
    if (!override) setText('');
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
            <div className={s.emptyAvatar}><Sparkles size={30} /></div>
            <h2 className={s.emptyTitle}>What can I automate for you?</h2>
            <p className={s.emptyHint}>
              Describe any academic workflow — attendance reports, grade analysis, personalized student
              letters — and I'll build a live pipeline for you.
            </p>
            <div className={s.suggestionRow}>
              {suggestedPrompts.map(prompt => (
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
              <Paperclip size={18} />
              <ImageIcon size={18} />
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
