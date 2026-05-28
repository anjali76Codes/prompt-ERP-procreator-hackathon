/**
 * Notify Class — urgent reminder broadcast page.
 *
 * Same shape as /announcements but the framing is "send an urgent
 * reminder" rather than "share an update". The backend writes
 * Notification docs with kind:'reminder' (vs 'announcement') so the
 * two surfaces stay cleanly separated in students' inboxes.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Send, Plus, X, Loader2, Users, CalendarDays, AlertTriangle, Bell,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { ApiError } from '../lib/api';
import {
  listClassNotifications, notifyClass,
  type ClassNotification,
} from '../lib/classNotify/api';
import { fetchMyDivisions, fetchMySubjects } from '../lib/erp/api';
import type { Division, Subject } from '../lib/erp/types';

const fmtDate = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short', day: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

export const ClassNotify: React.FC = () => {
  const [items, setItems] = useState<ClassNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);

  const refresh = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await listClassNotifications();
      setItems(data.notifications);
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, []);

  return (
    <AppLayout
      pageIcon={<Send size={18} />}
      pageTitle="Notify Class"
      pageBreadcrumb="Send a class reminder"
      pageActions={
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setComposeOpen(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
        >
          <Plus size={14} /> Send Reminder
        </button>
      }
    >
      {loadError && (
        <div className="status-pill danger" style={{ marginBottom: '1rem', textTransform: 'none' }}>
          {loadError}
        </div>
      )}

      <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '0.7rem', padding: '0.85rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
        <Bell size={16} color="#92400E" />
        <span style={{ fontSize: '0.85rem', color: '#92400E', lineHeight: 1.5 }}>
          Use this for time-sensitive prompts ("Submit DSA assignment by 5 PM"). For general updates, use{' '}
          <a href="/announcements" style={{ color: '#92400E', textDecoration: 'underline', fontWeight: 700 }}>Announcements</a>.
        </span>
      </div>

      <div style={{
        background: 'white', border: '1px solid #E2E8F0', borderRadius: '0.85rem',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1.1fr 0.9fr 1.2fr',
          padding: '0.85rem 1.25rem',
          background: '#FAFBFC', borderBottom: '1px solid #F1F5F9',
          fontSize: '0.7rem', fontWeight: 700, color: '#64748B',
          letterSpacing: '0.6px', textTransform: 'uppercase',
        }}>
          <div>Title</div>
          <div>Division</div>
          <div>Recipients</div>
          <div>Sent</div>
        </div>

        {loading ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748B' }}>
            <Loader2 size={16} className="animate-spin" /> Loading…
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
            No reminders sent yet — click <strong>Send Reminder</strong> to notify a class.
          </div>
        ) : (
          items.map(n => (
            <div
              key={n.broadcastId}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1.1fr 0.9fr 1.2fr',
                alignItems: 'flex-start',
                padding: '1rem 1.25rem',
                borderBottom: '1px solid #F1F5F9',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0F172A' }}>
                  {n.title}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '0.25rem', lineHeight: 1.5 }}>
                  {n.body}
                </div>
                {n.subjectLabel && (
                  <div style={{
                    display: 'inline-block', marginTop: '0.4rem',
                    padding: '0.15rem 0.45rem', borderRadius: '0.3rem',
                    background: '#FEF3C7', color: '#92400E',
                    fontSize: '0.7rem', fontWeight: 700,
                  }}>
                    {n.subjectLabel}
                  </div>
                )}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 600 }}>
                {n.divisionLabel ?? '—'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>
                <Users size={13} color="#64748B" /> {n.notified}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: '#64748B' }}>
                <CalendarDays size={12} /> {fmtDate(n.createdAt)}
              </div>
            </div>
          ))
        )}
      </div>

      {composeOpen && (
        <ComposeModal
          onClose={() => setComposeOpen(false)}
          onSent={async () => {
            setComposeOpen(false);
            await refresh();
          }}
        />
      )}
    </AppLayout>
  );
};

/* -------------------------------------------------------------------------- */
/*  Compose modal                                                              */
/* -------------------------------------------------------------------------- */

const ComposeModal: React.FC<{
  onClose: () => void;
  onSent: () => void | Promise<void>;
}> = ({ onClose, onSent }) => {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [divisionId, setDivisionId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [divs, subs] = await Promise.all([fetchMyDivisions(), fetchMySubjects()]);
        setDivisions(divs);
        setSubjects(subs);
      } catch (e) {
        setErr(e instanceof ApiError ? e.message : 'Failed to load divisions/subjects');
      }
    })();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSend = async () => {
    if (!divisionId) { setErr('Pick a division'); return; }
    if (!title.trim()) { setErr('Title is required'); return; }
    if (!body.trim())  { setErr('Body is required'); return; }
    setErr(null);
    setBusy(true);
    try {
      await notifyClass({
        divisionId,
        subjectId: subjectId || undefined,
        title: title.trim(),
        body: body.trim(),
      });
      await onSent();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Failed to send reminder');
    } finally {
      setBusy(false);
    }
  };

  const selectedDivision = useMemo(
    () => divisions.find(d => d._id === divisionId) ?? null,
    [divisionId, divisions],
  );

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem', zIndex: 200,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto',
        background: 'white', borderRadius: '0.75rem',
        boxShadow: '0 18px 40px rgba(15, 23, 42, 0.25)',
        padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
              <Send size={16} style={{ verticalAlign: 'text-bottom' }} /> Send class reminder
            </h3>
            <p style={{ margin: '0.3rem 0 0', fontSize: '0.78rem', color: '#64748B' }}>
              Lands as an urgent reminder in students' in-app inbox.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{
            width: 30, height: 30, borderRadius: '0.4rem',
            background: 'white', border: '1px solid #E2E8F0',
            color: '#475569', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={13} />
          </button>
        </div>

        <div>
          <label style={labelStyle}>Division *</label>
          <select
            value={divisionId}
            onChange={e => setDivisionId(e.target.value)}
            style={inputStyle}
          >
            <option value="">Choose a division…</option>
            {divisions.map(d => (
              <option key={d._id} value={d._id}>
                {d.code ?? d.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Subject tag (optional)</label>
          <select
            value={subjectId}
            onChange={e => setSubjectId(e.target.value)}
            style={inputStyle}
          >
            <option value="">— none —</option>
            {subjects.map(s => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Reminder title *</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Submit DSA assignment by 5 PM"
            maxLength={160}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Message *</label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Short, action-focused message the students will read…"
            rows={5}
            maxLength={2000}
            style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }}
          />
          <div style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: '0.25rem' }}>
            {body.length} / 2000
          </div>
        </div>

        {selectedDivision && (
          <div style={{
            fontSize: '0.78rem', color: '#475569',
            display: 'flex', alignItems: 'center', gap: '0.35rem',
          }}>
            <Users size={13} /> Will ping every student in {selectedDivision.code ?? selectedDivision.name}.
          </div>
        )}

        {err && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            fontSize: '0.8rem', color: '#B91C1C', fontWeight: 600,
          }}>
            <AlertTriangle size={13} /> {err}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.45rem' }}>
          <button onClick={onClose} disabled={busy} style={btnSecondary}>
            Cancel
          </button>
          <button onClick={handleSend} disabled={busy} style={btnPrimary}>
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            {busy ? 'Sending…' : 'Send reminder'}
          </button>
        </div>
      </div>
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.74rem', fontWeight: 700,
  color: '#475569', marginBottom: '0.25rem', letterSpacing: '0.3px',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.55rem 0.75rem',
  border: '1px solid #E2E8F0', borderRadius: '0.45rem',
  fontSize: '0.86rem', outline: 'none', fontWeight: 500, color: '#0F172A',
  boxSizing: 'border-box', background: 'white',
};

const btnPrimary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
  padding: '0.55rem 0.95rem', borderRadius: '0.5rem',
  background: 'var(--primary)', color: 'white',
  border: 'none', fontWeight: 700, fontSize: '0.83rem', cursor: 'pointer',
};

const btnSecondary: React.CSSProperties = {
  padding: '0.55rem 0.95rem', borderRadius: '0.5rem',
  background: 'white', color: '#334155',
  border: '1px solid #E2E8F0', fontWeight: 600,
  fontSize: '0.83rem', cursor: 'pointer',
};
