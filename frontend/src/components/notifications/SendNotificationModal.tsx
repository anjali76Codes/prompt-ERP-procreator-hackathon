import React, { useState } from 'react';
import { Bell, Send, X } from 'lucide-react';
import { sendNotification } from '../../lib/notifications/api';
import { ApiError } from '../../lib/api';
import { toast } from 'react-toastify';

interface Recipient {
  _id: string;
  name: string;
  rollNumber?: string;
  email: string;
  /** Optional extra fields available as placeholders. */
  pct?: number;
}

interface Props {
  open: boolean;
  recipient: Recipient | null;
  onClose: () => void;
  onSent?: () => void;
}

/* `{{name}}`, `{{rollNumber}}`, `{{pct}}`, `{{email}}` get substituted from
   the recipient. Keeps the placeholder syntax aligned with the automation
   engine's variables so a recorded "Send notification" step can be looped
   over rows later without changing template authoring. */
const substitute = (s: string, r: Recipient): string =>
  s.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => {
    if (k === 'pct' && typeof r.pct === 'number') return Math.round(r.pct).toString();
    const v = (r as unknown as Record<string, unknown>)[k];
    return typeof v === 'string' || typeof v === 'number' ? String(v) : `{{${k}}}`;
  });

const KIND_OPTIONS = [
  { value: 'attendance',   label: 'Attendance' },
  { value: 'alert',        label: 'Alert' },
  { value: 'reminder',     label: 'Reminder' },
  { value: 'announcement', label: 'Announcement' },
] as const;

const inputStyle: React.CSSProperties = {
  border: '1px solid #E2E8F0', borderRadius: '0.5rem',
  padding: '0.55rem 0.75rem', fontSize: '0.85rem', outline: 'none',
  background: 'white', fontFamily: 'inherit', width: '100%',
};
const labelStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '0.3rem',
  fontSize: '0.65rem', fontWeight: 700, color: '#475569',
  textTransform: 'uppercase', letterSpacing: '0.4px',
};

export const SendNotificationModal: React.FC<Props> = ({ open, recipient, onClose, onSent }) => {
  const [kind, setKind] = useState<typeof KIND_OPTIONS[number]['value']>('attendance');
  const [title, setTitle] = useState('Attendance Alert');
  const [body, setBody] = useState('Hi {{name}}, your current attendance is {{pct}}%. Please meet your mentor.');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open || !recipient) return null;

  const previewTitle = substitute(title, recipient);
  const previewBody = substitute(body, recipient);

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      await sendNotification({
        recipient: recipient._id,
        kind,
        title: previewTitle,
        body: previewBody,
      });
      toast.success(`Notification sent to ${recipient.name.split(' ')[0]}`);
      onSent?.();
      onClose();
    } catch (e) {
      const message = e instanceof ApiError ? e.message : 'Send failed';
      setError(message);
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  const insertVar = (target: 'title' | 'body', token: string) => {
    if (target === 'title') setTitle(t => t + token);
    else setBody(b => b + token);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(2px)', zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem',
        animation: 'fadeIn 160ms ease-out',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="card"
        style={{
          maxWidth: 540, width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem',
          animation: 'modalRise 220ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div className="card-header" style={{ marginBottom: 0 }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={16} color="var(--primary)" />
            Send Notification
          </h3>
          <button className="btn btn-secondary btn-icon-only btn-sm" onClick={onClose} aria-label="Close">
            <X size={14} />
          </button>
        </div>

        <div style={{
          padding: '0.6rem 0.75rem', background: '#F8FAFC',
          border: '1px solid #E2E8F0', borderRadius: 8,
          fontSize: '0.75rem', color: '#475569',
        }}>
          <strong style={{ color: '#0F172A' }}>To:</strong> {recipient.name}
          {recipient.rollNumber && <span style={{ color: '#94A3B8' }}> · {recipient.rollNumber}</span>}
          <span style={{ color: '#94A3B8' }}> · {recipient.email}</span>
          {typeof recipient.pct === 'number' && (
            <span style={{ marginLeft: 8 }} className={`status-pill ${recipient.pct >= 75 ? 'success' : 'danger'}`}>
              {Math.round(recipient.pct)}%
            </span>
          )}
        </div>

        <label style={labelStyle}>
          Kind
          <select style={inputStyle} value={kind} onChange={e => setKind(e.target.value as typeof kind)}>
            {KIND_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>

        <label style={labelStyle}>
          Title
          <input type="text" style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} />
        </label>

        <label style={labelStyle}>
          Body
          <textarea
            style={{ ...inputStyle, minHeight: 90, resize: 'vertical', fontFamily: 'inherit' }}
            value={body}
            onChange={e => setBody(e.target.value)}
          />
        </label>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: '0.65rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Insert
          </span>
          {(['{{name}}', '{{rollNumber}}', '{{pct}}', '{{email}}'] as const).map(tok => (
            <button
              key={tok}
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => insertVar('body', ' ' + tok)}
              style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.7rem' }}
            >
              {tok}
            </button>
          ))}
        </div>

        <div style={{
          padding: '0.75rem 0.85rem',
          background: '#EFF6FF', border: '1px solid #DBEAFE', borderRadius: 8,
        }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>
            Preview
          </div>
          <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.85rem' }}>{previewTitle}</div>
          <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: 4, lineHeight: 1.45 }}>{previewBody}</div>
        </div>

        {error && <div className="status-pill danger" style={{ textTransform: 'none' }}>{error}</div>}

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem',
          borderTop: '1px solid #F1F5F9', paddingTop: '0.75rem',
        }}>
          <div style={{ fontSize: '0.7rem', color: '#94A3B8' }}>
            Tip: record this in <strong style={{ color: 'var(--primary)' }}>Automation</strong> and run it once to fan out across many students.
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-secondary" onClick={onClose} disabled={sending}>Cancel</button>
            <button
              className="btn btn-primary"
              onClick={() => void send()}
              disabled={sending || !title.trim() || !body.trim()}
              data-automation-id="send-notification-submit"
            >
              <Send size={14} /> {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalRise {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

export type { Recipient as NotificationRecipient };
