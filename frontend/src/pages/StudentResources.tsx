import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FolderOpen, FileText, ClipboardList, Paperclip, Download, ExternalLink,
  Search, Filter, Upload, X, CheckCircle2, Clock, RotateCcw, Loader2,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { useAuth } from '../lib/auth/AuthContext';
import {
  fetchStudentResources, fetchMySubmissions, submitToResource,
} from '../lib/resources/api';
import type { Resource, ResourceKind, Submission } from '../lib/resources/types';
import { ApiError } from '../lib/api';

const fmtBytes = (n: number): string => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
};

type KindFilter = 'all' | ResourceKind;

export const StudentResources: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Resource[]>([]);
  const [subs, setSubs]   = useState<Record<string, Submission>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [query, setQuery] = useState('');

  // Load resources + my submissions in parallel.
  useEffect(() => {
    if (!user || user.role !== 'student') return;
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchStudentResources(), fetchMySubmissions()])
      .then(([list, mine]) => {
        if (cancelled) return;
        setItems(list);
        const map: Record<string, Submission> = {};
        for (const s of mine) {
          const rid = typeof s.resource === 'string' ? s.resource : s.resource._id;
          map[rid] = s;
        }
        setSubs(map);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof ApiError ? e.message : 'Failed to load resources');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user]);

  /** Subjects discoverable from what was returned (avoids a second API call). */
  const subjects = useMemo(() => {
    const map = new Map<string, { id: string; label: string }>();
    for (const r of items) {
      const s = r.subject;
      if (typeof s !== 'string') {
        map.set(s._id, { id: s._id, label: `${s.code} · ${s.name}` });
      }
    }
    return Array.from(map.values());
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter(i => kindFilter === 'all' ? true : i.kind === kindFilter)
      .filter(i => subjectFilter === 'all' ? true :
        (typeof i.subject === 'string' ? i.subject : i.subject._id) === subjectFilter)
      .filter(i => q === '' ? true :
        i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q));
  }, [items, kindFilter, subjectFilter, query]);

  const assignmentCount = items.filter(i => i.kind === 'assignment').length;
  const notesCount = items.filter(i => i.kind === 'notes').length;
  const dueSoon = items.filter(i => i.kind === 'assignment' && i.dueDate && new Date(i.dueDate) >= new Date()).length;

  const onSubmissionSaved = (resourceId: string, submission: Submission) => {
    setSubs(prev => ({ ...prev, [resourceId]: submission }));
  };

  return (
    <AppLayout
      background="#F8FAFC"
      pageIcon={<FolderOpen size={18} />}
      pageTitle="Resources"
      pageBreadcrumb={<span>Published assignments and notes from your teachers</span>}
    >
      <div className="stack-lg">
        {error && <div className="status-pill danger" style={{ textTransform: 'none' }}>{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr) auto', gap: '1rem' }}>
          <Metric label="Total"        value={String(items.length)}     tone="muted"   />
          <Metric label="Assignments"  value={String(assignmentCount)} tone="info"    />
          <Metric label="Notes"        value={String(notesCount)}      tone="success" />
          <div
            className="card card-compact"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem' }}
          >
            <Search size={14} color="#64748B" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search title or description"
              style={{
                border: 'none', outline: 'none', background: 'transparent',
                fontSize: '0.85rem', minWidth: 200, fontFamily: 'inherit',
              }}
            />
          </div>
        </div>

        {/* Filter row */}
        <div className="card card-compact" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem' }}>
          <Filter size={14} color="#64748B" />
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            {(['all', 'assignment', 'notes'] as KindFilter[]).map(f => (
              <button
                key={f}
                onClick={() => setKindFilter(f)}
                style={{
                  padding: '0.3rem 0.75rem', borderRadius: '999px',
                  fontSize: '0.72rem', fontWeight: 700, textTransform: 'capitalize',
                  cursor: 'pointer',
                  border: '1px solid',
                  borderColor: kindFilter === f ? 'var(--primary)' : '#E2E8F0',
                  background: kindFilter === f ? '#EFF6FF' : 'white',
                  color: kindFilter === f ? 'var(--primary)' : '#475569',
                }}
              >
                {f === 'all' ? 'All' : f === 'assignment' ? 'Assignments' : 'Notes'}
              </button>
            ))}
          </div>

          {subjects.length > 0 && (
            <select
              value={subjectFilter}
              onChange={e => setSubjectFilter(e.target.value)}
              style={{
                marginLeft: 'auto',
                border: '1px solid #E2E8F0', borderRadius: '0.5rem',
                padding: '0.35rem 0.6rem', fontSize: '0.78rem', fontWeight: 600,
                background: 'white',
              }}
            >
              <option value="all">All subjects</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          )}

          {dueSoon > 0 && (
            <span className="status-pill warning" style={{ marginLeft: '0.5rem' }}>
              {dueSoon} upcoming
            </span>
          )}
        </div>

        {loading ? (
          <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState hasAny={items.length > 0} />
        ) : (
          <div className="stack-md">
            {filtered.map(item => (
              <StudentRow
                key={item._id}
                item={item}
                submission={subs[item._id]}
                onSaved={(s) => onSubmissionSaved(item._id, s)}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

/* ----------------------------- subcomponents ---------------------------- */

const Metric: React.FC<{ label: string; value: string; tone: 'muted' | 'info' | 'success' }> = ({
  label, value, tone,
}) => {
  const color =
    tone === 'success' ? '#16A34A' :
    tone === 'info'    ? 'var(--primary)' : '#0F172A';
  return (
    <div className="metric-card">
      <div className="metric-card-body">
        <span className="metric-card-label">{label}</span>
        <span className="metric-card-value" style={{ color }}>{value}</span>
      </div>
    </div>
  );
};

const EmptyState: React.FC<{ hasAny: boolean }> = ({ hasAny }) => (
  <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
    <div
      style={{
        width: 52, height: 52, borderRadius: '50%',
        background: '#EFF6FF', color: 'var(--primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 0.85rem',
      }}
    >
      <FolderOpen size={20} />
    </div>
    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>
      {hasAny ? 'Nothing matches your filters' : 'No resources yet'}
    </h3>
    <p style={{ margin: '0.5rem 0 0', color: '#64748B', fontSize: '0.86rem' }}>
      {hasAny
        ? 'Try clearing the search or switching the kind filter.'
        : 'Your teachers haven\'t published any assignments or notes for your division yet.'}
    </p>
  </div>
);

const StudentRow: React.FC<{
  item: Resource;
  submission?: Submission;
  onSaved: (s: Submission) => void;
}> = ({ item, submission, onSaved }) => {
  const subj = typeof item.subject === 'string' ? null : item.subject;
  const teacher = typeof item.teacher === 'string' ? null : item.teacher;
  const totalBytes = item.attachments.reduce((a, x) => a + x.size, 0);
  const kindLabel = item.kind === 'assignment' ? 'Assignment' : 'Notes';
  const accent = item.kind === 'assignment' ? 'var(--primary)' : '#16A34A';
  const bg     = item.kind === 'assignment' ? '#EFF6FF' : '#DCFCE7';

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
        <div
          style={{
            width: 38, height: 38, borderRadius: 'var(--radius-md)',
            background: bg, color: accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          {item.kind === 'assignment' ? <ClipboardList size={18} /> : <FileText size={18} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
              {item.title}
            </h3>
            <span className="status-pill info">{kindLabel}</span>
            {subj && <span className="status-pill muted">{subj.code} · {subj.name}</span>}
            {item.kind === 'assignment' && item.dueDate && (
              <span className="status-pill warning">Due {new Date(item.dueDate).toLocaleDateString()}</span>
            )}
            {item.kind === 'assignment' && item.maxMarks !== undefined && (
              <span className="status-pill muted">{item.maxMarks} marks</span>
            )}
            {item.kind === 'notes' && item.unit && (
              <span className="status-pill muted">{item.unit}</span>
            )}
          </div>
          <p style={{ margin: '0.4rem 0 0', color: '#475569', fontSize: '0.83rem', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
            {item.description}
          </p>
          <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>
            Posted by {teacher?.name ?? 'Teacher'}
            {item.publishedAt && ` · ${new Date(item.publishedAt).toLocaleString()}`}
          </div>
        </div>
      </div>

      {item.attachments.length > 0 && (
        <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <Paperclip size={12} /> Attachments · {item.attachments.length} · {fmtBytes(totalBytes)}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {item.attachments.map(a => (
              <a
                key={a._id}
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.45rem 0.75rem', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-md)',
                  background: 'white', color: '#0F172A', textDecoration: 'none',
                  fontSize: '0.78rem', fontWeight: 700,
                }}
              >
                {a.mimeType.startsWith('image/')
                  ? <ExternalLink size={13} color="#475569" />
                  : <Download size={13} color="#475569" />}
                <span style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {a.name}
                </span>
                <span style={{ color: '#94A3B8', fontWeight: 500 }}>· {fmtBytes(a.size)}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {item.kind === 'assignment' && (
        <SubmissionBlock
          resource={item}
          submission={submission}
          onSaved={onSaved}
        />
      )}
    </div>
  );
};

/* ------------------------ Submission block (assignment only) -------------- */

const ACCEPT = '.pdf,.doc,.docx,.png,.jpg,.jpeg,.ppt,.pptx,.zip';

const submissionPillStyle = (
  status: 'pending' | 'graded' | 'resubmit_requested'
): { bg: string; color: string; label: string; icon: React.ReactNode } => {
  if (status === 'graded') {
    return { bg: '#DCFCE7', color: '#15803D', label: 'Graded', icon: <CheckCircle2 size={12} /> };
  }
  if (status === 'resubmit_requested') {
    return { bg: '#FEE2E2', color: '#B91C1C', label: 'Resubmit requested', icon: <RotateCcw size={12} /> };
  }
  return { bg: '#FEF3C7', color: '#92400E', label: 'Submitted — pending review', icon: <Clock size={12} /> };
};

const SubmissionBlock: React.FC<{
  resource: Resource;
  submission?: Submission;
  onSaved: (s: Submission) => void;
}> = ({ resource, submission, onSaved }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const canEdit = !submission || submission.status !== 'graded';
  const isResubmitRequest = submission?.status === 'resubmit_requested';
  const isPending = submission?.status === 'pending';
  const isGraded  = submission?.status === 'graded';

  const onPick = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    setFiles(prev => [...prev, ...Array.from(list)]);
    setErr(null);
  };

  const removeAt = (i: number) =>
    setFiles(prev => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    if (files.length === 0) {
      setErr('Add at least one file');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const saved = await submitToResource(resource._id, files);
      onSaved(saved);
      setFiles([]);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Failed to submit');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        borderTop: '1px solid #F1F5F9', paddingTop: '0.85rem',
        display: 'flex', flexDirection: 'column', gap: '0.6rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          <Upload size={12} /> Your submission
        </div>
        {submission && (() => {
          const pill = submissionPillStyle(submission.status);
          return (
            <span
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                padding: '0.25rem 0.6rem',
                background: pill.bg, color: pill.color,
                borderRadius: '999px',
                fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.3px',
              }}
            >
              {pill.icon} {pill.label}
              {isGraded && submission.score !== undefined && (
                <> · {submission.score}{resource.maxMarks !== undefined && ` / ${resource.maxMarks}`}</>
              )}
            </span>
          );
        })()}
      </div>

      {/* Existing submission files */}
      {submission && submission.attachments.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {submission.attachments.map(a => (
            <a
              key={a._id}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.4rem 0.7rem', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-md)',
                background: '#F8FAFC', color: '#0F172A', textDecoration: 'none',
                fontSize: '0.76rem', fontWeight: 600,
              }}
            >
              <Download size={12} color="#475569" />
              <span style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {a.name}
              </span>
              <span style={{ color: '#94A3B8', fontWeight: 500 }}>· {fmtBytes(a.size)}</span>
            </a>
          ))}
        </div>
      )}

      {isResubmitRequest && (
        <div style={{ fontSize: '0.78rem', color: '#B91C1C', fontWeight: 500 }}>
          Your teacher asked you to resubmit this. Upload a new version below.
        </div>
      )}

      {isGraded && (
        <div style={{ fontSize: '0.78rem', color: '#15803D', fontWeight: 500 }}>
          This submission has been graded. You can no longer change it.
        </div>
      )}

      {/* Upload UI (hidden when graded) */}
      {canEdit && (
        <>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT}
            onChange={e => { onPick(e.target.files); e.target.value = ''; }}
            style={{ display: 'none' }}
          />

          {files.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {files.map((f, i) => (
                <div
                  key={`${f.name}-${i}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.4rem 0.65rem',
                    border: '1px solid #E2E8F0', borderRadius: '0.45rem',
                    background: 'white',
                  }}
                >
                  <Paperclip size={12} color="#475569" />
                  <div style={{ flex: 1, minWidth: 0, fontSize: '0.78rem', fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.name}
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 500 }}>{fmtBytes(f.size)}</span>
                  <button
                    type="button"
                    onClick={() => removeAt(i)}
                    aria-label="Remove"
                    style={{
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: '#94A3B8', display: 'flex', alignItems: 'center',
                    }}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {err && (
            <div style={{ fontSize: '0.76rem', color: '#EF4444', fontWeight: 500 }}>{err}</div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.5rem 0.85rem',
                background: 'white', color: '#334155',
                border: '1px solid #E2E8F0', borderRadius: '0.5rem',
                fontWeight: 600, fontSize: '0.8rem',
                cursor: busy ? 'not-allowed' : 'pointer',
              }}
            >
              <Paperclip size={13} /> Pick files
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={busy || files.length === 0}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.5rem 1rem',
                background: 'var(--primary)', color: 'white',
                border: 'none', borderRadius: '0.5rem',
                fontWeight: 700, fontSize: '0.8rem',
                cursor: busy || files.length === 0 ? 'not-allowed' : 'pointer',
                opacity: busy || files.length === 0 ? 0.6 : 1,
              }}
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
              {busy
                ? 'Uploading…'
                : isPending || isResubmitRequest
                  ? 'Replace submission'
                  : 'Submit'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
