import React, { useEffect, useRef, useState } from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../lib/notifications/NotificationContext';
import type { AppNotification } from '../../lib/notifications/types';

const KIND_DOT: Record<AppNotification['kind'], string> = {
  attendance: '#EF4444',
  alert: '#F59E0B',
  reminder: '#0047FF',
  announcement: '#10B981',
};

const formatTime = (iso: string): string => {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString();
};

const senderName = (s: AppNotification['sender']): string =>
  typeof s === 'string' ? '—' : (s.name || s.email || 'System');

export const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const { notifications, unread, markRead, markAllRead, refresh } = useNotifications();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    void refresh();
    const onClickAway = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, [open, refresh]);

  const onItem = async (n: AppNotification) => {
    if (!n.read) await markRead(n._id);
    if (n.link) {
      setOpen(false);
      navigate(n.link);
    }
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Notifications"
        style={{
          position: 'relative', background: 'transparent', border: 'none',
          padding: 4, cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
          color: 'var(--text-muted, #64748B)',
        }}
      >
        <Bell size={20} />
        {unread > 0 && (
          <span
            style={{
              position: 'absolute', top: -2, right: -2,
              minWidth: 16, height: 16, padding: '0 4px',
              borderRadius: 8, background: '#EF4444',
              color: 'white', fontSize: '0.6rem', fontWeight: 800,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 0 2px white',
            }}
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0,
            width: 360, maxHeight: 480, background: 'white',
            borderRadius: 10, boxShadow: '0 12px 36px rgba(15,23,42,0.18)',
            border: '1px solid #E2E8F0', zIndex: 200,
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            animation: 'bellPop 160ms ease-out',
          }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.6rem 0.85rem', borderBottom: '1px solid #F1F5F9',
          }}>
            <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.85rem' }}>
              Notifications
              {unread > 0 && (
                <span style={{ color: '#64748B', fontWeight: 600, marginLeft: 6, fontSize: '0.75rem' }}>
                  ({unread} unread)
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={() => void markAllRead()}
                className="btn btn-secondary btn-sm"
                title="Mark all read"
              >
                <CheckCheck size={12} /> Read all
              </button>
            )}
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94A3B8', fontSize: '0.8rem' }}>
                <Bell size={26} color="#CBD5E1" style={{ marginBottom: 8 }} />
                <div>No notifications yet</div>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n._id}
                  onClick={() => void onItem(n)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
                    padding: '0.6rem 0.85rem', cursor: 'pointer',
                    background: n.read ? 'transparent' : '#EFF6FF',
                    borderBottom: '1px solid #F1F5F9',
                    transition: 'background 120ms ease',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
                  onMouseLeave={e => (e.currentTarget.style.background = n.read ? 'transparent' : '#EFF6FF')}
                >
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%', marginTop: 6,
                    background: KIND_DOT[n.kind], flexShrink: 0,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'flex', alignItems: 'baseline', gap: 6,
                      justifyContent: 'space-between',
                    }}>
                      <div style={{
                        fontWeight: 700, color: '#0F172A', fontSize: '0.8rem',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {n.title}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: '#94A3B8', flexShrink: 0 }}>
                        {formatTime(n.createdAt)}
                      </div>
                    </div>
                    <div style={{
                      fontSize: '0.75rem', color: '#475569', marginTop: 2,
                      lineHeight: 1.35,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {n.body}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#94A3B8', marginTop: 4 }}>
                      from {senderName(n.sender)}
                    </div>
                  </div>
                  {!n.read && (
                    <button
                      onClick={(e) => { e.stopPropagation(); void markRead(n._id); }}
                      title="Mark as read"
                      style={{
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        color: '#64748B', padding: 4,
                      }}
                    >
                      <Check size={12} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes bellPop {
          from { opacity: 0; transform: translateY(-6px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};
