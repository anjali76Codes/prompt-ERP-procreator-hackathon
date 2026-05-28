/**
 * Right-side "Recent Activity" rail — lists past chat sessions newest-first.
 * Click a row to resume that conversation; trash icon deletes it.
 */
import React from 'react';
import { FileText, Plus, Trash2, MessageSquare } from 'lucide-react';
import type { ChatSessionSummary } from '../../lib/chatSessions/api';

const fmtAgo = (iso: string): string => {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diffMs = Date.now() - t;
  const min = Math.round(diffMs / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} ${hr === 1 ? 'hour' : 'hours'} ago`;
  const days = Math.round(hr / 24);
  if (days < 7) return days === 1 ? 'Yesterday' : `${days} days ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

interface Props {
  sessions: ChatSessionSummary[];
  activeSessionId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export const RecentActivityRail: React.FC<Props> = ({
  sessions, activeSessionId, onSelect, onNew, onDelete,
}) => {
  return (
    <aside style={{
      width: 280,
      flexShrink: 0,
      background: 'white',
      border: '1px solid #E2E8F0',
      borderRadius: '0.85rem',
      padding: '0.9rem 0.9rem 0.7rem',
      display: 'flex', flexDirection: 'column',
      maxHeight: 'calc(100vh - 9rem)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
        <div style={{
          fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.7px',
          color: '#475569', textTransform: 'uppercase',
        }}>
          Recent Activity
        </div>
        <button
          type="button"
          onClick={onNew}
          title="New chat"
          aria-label="New chat"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
            background: 'var(--primary)', color: 'white',
            border: 'none', borderRadius: '0.4rem',
            padding: '0.3rem 0.55rem',
            fontWeight: 700, fontSize: '0.7rem',
            cursor: 'pointer',
          }}
        >
          <Plus size={12} /> NEW
        </button>
      </div>

      {sessions.length === 0 ? (
        <div style={{ padding: '1rem 0.25rem', color: '#94A3B8', fontSize: '0.78rem' }}>
          No past chats yet. Send a message to start your history.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', overflowY: 'auto' }}>
          {sessions.map(s => {
            const isActive = s._id === activeSessionId;
            return (
              <div
                key={s._id}
                onClick={() => onSelect(s._id)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '0.55rem',
                  padding: '0.6rem 0.65rem',
                  background: isActive ? '#EFF6FF' : 'transparent',
                  border: `1px solid ${isActive ? '#DBEAFE' : 'transparent'}`,
                  borderRadius: '0.55rem',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#F8FAFC'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{
                  width: 30, height: 30, borderRadius: '0.4rem',
                  background: isActive ? 'white' : '#F1F5F9',
                  color: isActive ? 'var(--primary)' : '#64748B',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {/* Title that came from a "draft letters / report" prompt should still look document-ish. */}
                  {s.title.match(/report|letter|export|pdf/i)
                    ? <FileText size={14} />
                    : <MessageSquare size={14} />
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '0.83rem', fontWeight: 700, color: '#0F172A',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {s.title}
                  </div>
                  {s.preview && (
                    <div style={{
                      fontSize: '0.74rem', color: '#64748B', marginTop: '0.15rem',
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
                    }}>
                      {s.preview}
                    </div>
                  )}
                  <div style={{
                    fontSize: '0.7rem', color: '#94A3B8', marginTop: '0.2rem',
                  }}>
                    {fmtAgo(s.lastMessageAt)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onDelete(s._id); }}
                  title="Delete chat"
                  aria-label="Delete chat"
                  style={{
                    background: 'transparent', border: 'none',
                    color: '#94A3B8', padding: '0.15rem',
                    cursor: 'pointer', opacity: 0.7,
                    display: 'flex', alignItems: 'center',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.opacity = '1'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.opacity = '0.7'; }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
};
