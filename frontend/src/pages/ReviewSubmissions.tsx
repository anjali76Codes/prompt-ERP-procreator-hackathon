import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Clock, CheckCircle2, AlertTriangle, RotateCcw, TrendingUp, ChevronRight,
  Search, ClipboardList, ChevronLeft, Eye, Loader2, Save, X, Download,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { PdfFrame } from '../components/ui/PdfFrame';
import {
  fetchResource, listSubmissionsForResource, gradeSubmission, requestResubmission,
} from '../lib/resources/api';
import type {
  Resource, ResourceAttachment, Submission, SubmissionStatus,
} from '../lib/resources/types';
import { ApiError } from '../lib/api';

const fmtBytes = (n: number): string => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
};

const formatWhen = (iso?: string): string => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
};

type Tab = 'all' | 'pending' | 'graded' | 'resubmit_requested';

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

export const ReviewSubmissions: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [resource, setResource] = useState<Resource | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');

  // Viewer modal + grade modal state.
  const [viewing, setViewing] = useState<{ submission: Submission; idx: number } | null>(null);
  const [grading, setGrading] = useState<Submission | null>(null);

  const refresh = async () => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [r, subs] = await Promise.all([
        fetchResource(id),
        listSubmissionsForResource(id),
      ]);
      setResource(r);
      setSubmissions(subs);
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  const counts = useMemo(() => ({
    all: submissions.length,
    pending: submissions.filter(s => s.status === 'pending').length,
    graded:  submissions.filter(s => s.status === 'graded').length,
    resubmit_requested: submissions.filter(s => s.status === 'resubmit_requested').length,
  }), [submissions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return submissions
      .filter(s => tab === 'all' ? true : s.status === tab)
      .filter(s => {
        if (!q) return true;
        const stu = typeof s.student === 'string' ? null : s.student;
        return (stu?.name ?? '').toLowerCase().includes(q)
          || (stu?.email ?? '').toLowerCase().includes(q)
          || (stu?.rollNumber ?? '').toLowerCase().includes(q);
      });
  }, [submissions, tab, query]);

  const replaceLocal = (next: Submission) => {
    setSubmissions(prev => prev.map(s => s._id === next._id ? next : s));
  };

  const onRequestResubmit = async (submission: Submission) => {
    const stu = typeof submission.student === 'string' ? null : submission.student;
    if (!confirm(`Ask ${stu?.name ?? 'this student'} to resubmit?`)) return;
    try {
      const updated = await requestResubmission(submission._id);
      replaceLocal(updated);
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : 'Failed to request resubmission');
    }
  };

  return (
    <AppLayout
      background="#F8FAFC"
      pageIcon={<ClipboardList size={18} />}
      pageTitle="Review Submissions"
      pageBreadcrumb={
        <>
          <button onClick={() => navigate('/assignments/list')}>Assignments</button>
          <ChevronRight size={11} />
          <span className="current">{resource?.title ?? 'Loading…'}</span>
        </>
      }
      pageActions={
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/assignments/list')}>
          <ChevronLeft size={14} /> Back to list
        </button>
      }
    >
      {loadError && (
        <div className="status-pill danger" style={{ marginBottom: '1rem', textTransform: 'none' }}>
          {loadError}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: '1.25rem', alignItems: 'flex-start' }}>
        {/* Main column */}
        <div>
          <h1 style={{ margin: '0 0 0.4rem', fontSize: '1.6rem', fontWeight: 800, color: '#0F172A' }}>
            {resource?.title ?? 'Review Submissions'}
          </h1>
          {resource && (
            <p style={{ margin: '0 0 1rem', color: '#64748B', fontSize: '0.85rem' }}>
              {resource.maxMarks !== undefined && `Out of ${resource.maxMarks} marks · `}
              {resource.dueDate && `Due ${new Date(resource.dueDate).toLocaleDateString()}`}
            </p>
          )}

          {/* Tabs */}
          <div
            style={{
              display: 'inline-flex',
              background: '#F1F5F9', borderRadius: '0.65rem',
              padding: '0.3rem', gap: '0.2rem',
              marginBottom: '1rem',
            }}
          >
            {([
              { key: 'all',                 label: 'All',     count: counts.all },
              { key: 'pending',             label: 'Pending', count: counts.pending },
              { key: 'graded',              label: 'Graded',  count: counts.graded },
              { key: 'resubmit_requested',  label: 'Resubmit', count: counts.resubmit_requested },
            ] as { key: Tab; label: string; count: number }[]).map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  padding: '0.45rem 0.95rem', borderRadius: '0.5rem',
                  border: 'none', cursor: 'pointer',
                  background: tab === t.key ? 'white' : 'transparent',
                  color: tab === t.key ? '#0F172A' : '#475569',
                  fontWeight: 700, fontSize: '0.83rem',
                  boxShadow: tab === t.key ? '0 1px 2px rgba(15, 23, 42, 0.06)' : 'none',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {t.label} ({t.count})
              </button>
            ))}
          </div>

          {/* Search */}
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: '0.55rem',
              padding: '0.7rem 0.9rem',
              background: 'white', border: '1px solid #E2E8F0',
              borderRadius: '0.6rem', marginBottom: '1rem',
              boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)',
            }}
          >
            <Search size={14} color="#94A3B8" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search student name, email, or roll no..."
              style={{
                flex: 1, border: 'none', outline: 'none', background: 'transparent',
                fontSize: '0.88rem', fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Submissions table */}
          <div
            style={{
              background: 'white', border: '1px solid #E2E8F0',
              borderRadius: '0.85rem', boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '2.2fr 1.4fr 1.4fr auto',
                padding: '0.85rem 1.25rem',
                borderBottom: '1px solid #F1F5F9',
                fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.6px',
                color: '#64748B', textTransform: 'uppercase',
                background: '#FAFBFC',
              }}
            >
              <div>Student</div>
              <div>Status</div>
              <div>Submitted</div>
              <div style={{ textAlign: 'right' }}>Actions</div>
            </div>

            {loading ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748B', fontSize: '0.88rem' }}>
                <Loader2 size={16} className="animate-spin" /> Loading submissions…
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748B', fontSize: '0.88rem' }}>
                {submissions.length === 0
                  ? 'No submissions yet.'
                  : 'No submissions match the current filter.'}
              </div>
            ) : filtered.map(s => (
              <SubmissionRow
                key={s._id}
                submission={s}
                maxMarks={resource?.maxMarks}
                onView={() => setViewing({ submission: s, idx: 0 })}
                onGrade={() => setGrading(s)}
                onRequestResubmit={() => onRequestResubmit(s)}
              />
            ))}
          </div>
        </div>

        {/* Right rail — stats */}
        <StatsSidebar
          counts={counts}
          resource={resource}
          submissions={submissions}
        />
      </div>

      {viewing && (
        <ViewerModal
          submission={viewing.submission}
          activeIdx={viewing.idx}
          onChangeIdx={(i) => setViewing(v => v ? { ...v, idx: i } : v)}
          onClose={() => setViewing(null)}
        />
      )}

      {grading && (
        <GradeModal
          submission={grading}
          maxMarks={resource?.maxMarks}
          onClose={() => setGrading(null)}
          onSaved={(updated) => { replaceLocal(updated); setGrading(null); }}
        />
      )}
    </AppLayout>
  );
};

/* -------------------------------------------------------------------------- */
/*  Submission row                                                             */
/* -------------------------------------------------------------------------- */

const statusPill = (status: SubmissionStatus): { label: string; bg: string; color: string; icon: React.ReactNode } => {
  if (status === 'pending')            return { label: 'PENDING',   bg: '#FEF3C7', color: '#92400E', icon: <Clock size={12} /> };
  if (status === 'graded')             return { label: 'GRADED',    bg: '#DCFCE7', color: '#15803D', icon: <CheckCircle2 size={12} /> };
  return                                  { label: 'RESUBMIT',  bg: '#FEE2E2', color: '#B91C1C', icon: <RotateCcw size={12} /> };
};

const SubmissionRow: React.FC<{
  submission: Submission;
  maxMarks?: number;
  onView: () => void;
  onGrade: () => void;
  onRequestResubmit: () => void;
}> = ({ submission, maxMarks, onView, onGrade, onRequestResubmit }) => {
  const student = typeof submission.student === 'string' ? null : submission.student;
  const pill = statusPill(submission.status);
  const gradedLabel = submission.status === 'graded' && submission.score !== undefined
    ? `GRADED (${submission.score}${maxMarks !== undefined ? `/${maxMarks}` : ''})`
    : pill.label;

  const initials = (student?.name ?? '?')
    .split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '2.2fr 1.4fr 1.4fr auto',
        alignItems: 'center',
        padding: '1rem 1.25rem',
        borderBottom: '1px solid #F1F5F9',
        background: 'white',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
        <div
          style={{
            width: 38, height: 38, borderRadius: '50%',
            background: '#EFF6FF', color: 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, fontWeight: 800, fontSize: '0.85rem',
          }}
        >
          {initials || '?'}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F172A' }}>
            {student?.name ?? 'Unknown student'}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '0.15rem' }}>
            {student?.rollNumber ? `Roll: ${student.rollNumber}` : student?.email ?? '—'}
          </div>
        </div>
      </div>

      <div>
        <span
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            padding: '0.3rem 0.65rem',
            background: pill.bg, color: pill.color,
            borderRadius: '999px',
            fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.4px',
          }}
        >
          {pill.icon}
          {gradedLabel}
        </span>
      </div>

      <div>
        <div style={{ fontSize: '0.84rem', color: '#0F172A', fontWeight: 500 }}>
          {formatWhen(submission.submittedAt)}
        </div>
        <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '0.1rem' }}>
          {submission.attachments.length} file{submission.attachments.length === 1 ? '' : 's'}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'flex-end' }}>
        <IconBtn label="View files" onClick={onView} disabled={submission.attachments.length === 0}>
          <Eye size={15} />
        </IconBtn>
        <IconBtn
          label="Ask to resubmit"
          onClick={onRequestResubmit}
          disabled={submission.status === 'resubmit_requested'}
        >
          <RotateCcw size={15} />
        </IconBtn>
        <button
          onClick={onGrade}
          style={{
            padding: '0.5rem 0.9rem', borderRadius: '0.5rem',
            background: submission.status === 'graded' ? '#F1F5F9' : 'var(--primary)',
            color: submission.status === 'graded' ? '#334155' : 'white',
            border: 'none', cursor: 'pointer',
            fontSize: '0.78rem', fontWeight: 700,
            whiteSpace: 'nowrap',
          }}
        >
          {submission.status === 'graded' ? 'Edit grade' : 'Grade'}
        </button>
      </div>
    </div>
  );
};

const IconBtn: React.FC<{
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}> = ({ label, onClick, disabled, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={label}
    aria-label={label}
    style={{
      width: 34, height: 34, borderRadius: '0.45rem',
      background: 'transparent', border: '1px solid #E2E8F0',
      color: disabled ? '#CBD5E1' : '#475569',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: disabled ? 'not-allowed' : 'pointer',
    }}
  >
    {children}
  </button>
);

/* -------------------------------------------------------------------------- */
/*  Viewer modal                                                               */
/* -------------------------------------------------------------------------- */

const ViewerModal: React.FC<{
  submission: Submission;
  activeIdx: number;
  onChangeIdx: (i: number) => void;
  onClose: () => void;
}> = ({ submission, activeIdx, onChangeIdx, onClose }) => {
  const student = typeof submission.student === 'string' ? null : submission.student;
  const att: ResourceAttachment | undefined = submission.attachments[activeIdx];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem', zIndex: 100,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '92vw', maxWidth: 1100, height: '90vh',
          background: 'white', borderRadius: '0.85rem',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 18px 40px rgba(15, 23, 42, 0.25)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1.1rem', borderBottom: '1px solid #E2E8F0' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>
              {student?.name ?? 'Submission'}
            </div>
            <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '0.15rem' }}>
              {att?.name ?? '—'} {att && `· ${fmtBytes(att.size)}`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {att && (
              <a
                href={att.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                  padding: '0.45rem 0.8rem',
                  background: 'white', color: '#334155',
                  border: '1px solid #E2E8F0', borderRadius: '0.5rem',
                  fontSize: '0.78rem', fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                <Download size={13} /> Open
              </a>
            )}
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                width: 32, height: 32, borderRadius: '0.45rem',
                background: 'white', border: '1px solid #E2E8F0',
                color: '#475569',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {att ? (
            att.mimeType === 'application/pdf' ? (
              <PdfFrame src={att.url} title={att.name} />
            ) : att.mimeType.startsWith('image/') ? (
              <img
                src={att.url}
                alt={att.name}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', background: 'white' }}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#475569' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F172A' }}>
                  No inline preview for this file type
                </div>
                <a
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                    marginTop: '0.85rem',
                    padding: '0.55rem 1rem',
                    background: 'var(--primary)', color: 'white',
                    border: 'none', borderRadius: '0.5rem',
                    fontWeight: 700, fontSize: '0.82rem',
                    textDecoration: 'none',
                  }}
                >
                  <Download size={13} /> Download to view
                </a>
              </div>
            )
          ) : (
            <span style={{ color: '#94A3B8' }}>No file</span>
          )}
        </div>

        {/* File switcher */}
        {submission.attachments.length > 1 && (
          <div style={{ display: 'flex', gap: '0.4rem', padding: '0.6rem 0.75rem', borderTop: '1px solid #E2E8F0', overflowX: 'auto' }}>
            {submission.attachments.map((a, idx) => (
              <button
                key={a._id}
                onClick={() => onChangeIdx(idx)}
                style={{
                  border: '1px solid', borderColor: idx === activeIdx ? 'var(--primary)' : '#E2E8F0',
                  background: idx === activeIdx ? '#EFF6FF' : 'white',
                  color: idx === activeIdx ? 'var(--primary)' : '#475569',
                  padding: '0.35rem 0.7rem', borderRadius: '0.4rem',
                  fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {a.name.length > 24 ? `${a.name.slice(0, 22)}…` : a.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Grade modal                                                                */
/* -------------------------------------------------------------------------- */

const GradeModal: React.FC<{
  submission: Submission;
  maxMarks?: number;
  onClose: () => void;
  onSaved: (s: Submission) => void;
}> = ({ submission, maxMarks, onClose, onSaved }) => {
  const [score, setScore] = useState<string>(
    submission.score !== undefined ? String(submission.score) : ''
  );
  const [busy, setBusy]   = useState(false);
  const [err, setErr]     = useState<string | null>(null);
  const student = typeof submission.student === 'string' ? null : submission.student;

  const handleSave = async () => {
    const n = Number(score);
    if (score === '' || Number.isNaN(n) || n < 0) {
      setErr('Enter a valid score (0 or more)');
      return;
    }
    if (maxMarks !== undefined && n > maxMarks) {
      setErr(`Score cannot exceed ${maxMarks}`);
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const updated = await gradeSubmission(submission._id, n);
      onSaved(updated);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Failed to save grade');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem', zIndex: 110,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 420,
          background: 'white', borderRadius: '0.85rem',
          boxShadow: '0 18px 40px rgba(15, 23, 42, 0.25)',
          padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
              Grade submission
            </h3>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#64748B' }}>
              {student?.name ?? 'Student'}
              {student?.rollNumber && ` · ${student.rollNumber}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 30, height: 30, borderRadius: '0.4rem',
              background: 'white', border: '1px solid #E2E8F0',
              color: '#475569', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={13} />
          </button>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
            Score{maxMarks !== undefined && ` (out of ${maxMarks})`}
          </label>
          <input
            type="number"
            value={score}
            onChange={e => setScore(e.target.value)}
            min={0}
            max={maxMarks}
            placeholder={maxMarks !== undefined ? `0 – ${maxMarks}` : '0+'}
            autoFocus
            style={{
              width: '100%',
              padding: '0.65rem 0.85rem',
              border: '1px solid #E2E8F0',
              borderRadius: '0.55rem',
              fontSize: '0.95rem', fontWeight: 600,
              outline: 'none',
            }}
          />
          {err && (
            <div style={{ marginTop: '0.4rem', fontSize: '0.76rem', color: '#EF4444', fontWeight: 500 }}>
              {err}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.45rem' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            style={{
              padding: '0.55rem 0.95rem',
              background: 'white', color: '#334155',
              border: '1px solid #E2E8F0', borderRadius: '0.5rem',
              fontWeight: 600, fontSize: '0.83rem', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={busy}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.55rem 1.1rem',
              background: 'var(--primary)', color: 'white',
              border: 'none', borderRadius: '0.5rem',
              fontWeight: 700, fontSize: '0.83rem',
              cursor: busy ? 'wait' : 'pointer',
              opacity: busy ? 0.75 : 1,
            }}
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            {busy ? 'Saving…' : 'Save grade'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Stats sidebar                                                              */
/* -------------------------------------------------------------------------- */

const StatsSidebar: React.FC<{
  counts: { all: number; pending: number; graded: number; resubmit_requested: number };
  resource: Resource | null;
  submissions: Submission[];
}> = ({ counts, resource, submissions }) => {
  const graded = submissions.filter(s => s.status === 'graded' && s.score !== undefined);
  const avg = graded.length > 0
    ? (graded.reduce((a, s) => a + (s.score ?? 0), 0) / graded.length).toFixed(1)
    : '—';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'sticky', top: '1rem' }}>
      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>Overview</h3>

      <StatCard
        label="SUBMISSIONS"
        value={String(counts.all)}
        sub={`${counts.pending} pending · ${counts.graded} graded`}
        icon={<TrendingUp size={14} color="#16A34A" />}
      />

      <StatCard
        label="AVERAGE SCORE"
        value={avg}
        sub={resource?.maxMarks !== undefined ? `out of ${resource.maxMarks}` : 'No max marks set'}
        icon={<TrendingUp size={14} color="#16A34A" />}
      />

      {counts.resubmit_requested > 0 && (
        <div
          style={{
            background: '#FEF3C7',
            border: '1px solid #FDE68A',
            borderRadius: '0.7rem', padding: '1rem 1.1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 800, color: '#92400E' }}>
            <AlertTriangle size={14} />
            Awaiting resubmission
          </div>
          <p style={{ margin: '0.4rem 0 0', fontSize: '0.78rem', lineHeight: 1.55, color: '#92400E' }}>
            {counts.resubmit_requested} student{counts.resubmit_requested === 1 ? ' has' : 's have'} been asked to resubmit.
          </p>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{
  label: string;
  value: string;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
}> = ({ label, value, sub, icon }) => (
  <div
    style={{
      background: 'white', border: '1px solid #E2E8F0',
      borderRadius: '0.7rem', padding: '1rem 1.1rem',
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.6px', color: '#64748B' }}>{label}</span>
      {icon}
    </div>
    <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0F172A', marginTop: '0.35rem' }}>{value}</div>
    {sub && (
      <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: '#64748B' }}>{sub}</div>
    )}
  </div>
);
