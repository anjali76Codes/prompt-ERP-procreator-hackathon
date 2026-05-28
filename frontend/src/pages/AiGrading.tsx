/**
 * Rubric-based AI grading review dashboard.
 *
 * Flow:
 *   1. Teacher defines the rubric (criteria + weights + max points).
 *   2. Click "Run AI grading" — backend grades every submission and stores
 *      the results as PROPOSED grades (students don't see them yet).
 *   3. Teacher reviews each proposal — accepts, overrides, or skips.
 *   4. Bulk-publish OR per-row publish.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Sparkles, ChevronLeft, ChevronRight, Loader2, ClipboardCheck, Plus, Trash2,
  AlertTriangle, CheckCircle2, X, FileText, ListChecks, Send, Eye,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { ApiError } from '../lib/api';
import {
  fetchGradingReview, setRubric, runAiGrading,
  publishOneGrade, bulkPublishGrades,
} from '../lib/grading/api';
import type {
  GradingReview, GradingSubmission, Rubric, RubricCriterion, SubmissionFlag,
} from '../lib/grading/types';

const flagLabel: Record<SubmissionFlag, string> = {
  late: 'Late',
  blank: 'Blank',
  plagiarism_suspected: 'Plagiarism?',
  ai_generated_suspected: 'AI-generated?',
  unreadable: 'Unreadable',
};

const flagColor: Record<SubmissionFlag, string> = {
  late: '#92400E',
  blank: '#475569',
  plagiarism_suspected: '#B91C1C',
  ai_generated_suspected: '#7C3AED',
  unreadable: '#475569',
};

const flagBg: Record<SubmissionFlag, string> = {
  late: '#FEF3C7',
  blank: '#F1F5F9',
  plagiarism_suspected: '#FEE2E2',
  ai_generated_suspected: '#EDE9FE',
  unreadable: '#F1F5F9',
};

export const AiGrading: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [review, setReview] = useState<GradingReview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [running, setRunning] = useState(false);
  const [rubricOpen, setRubricOpen] = useState(false);
  const [detail, setDetail] = useState<GradingSubmission | null>(null);

  const refresh = async () => {
    if (!id) return;
    setBusy(true);
    setLoadError(null);
    try {
      const r = await fetchGradingReview(id);
      setReview(r);
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : 'Failed to load grading review');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { void refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  const rubric = review?.resource.rubric;
  const hasRubric = !!rubric?.criteria?.length;

  const proposedCount = review?.counts.proposed ?? 0;
  const publishedCount = review?.counts.published ?? 0;

  const onRunAi = async () => {
    if (!id) return;
    if (!hasRubric) {
      // Open the rubric editor instead of silently doing nothing.
      setRubricOpen(true);
      setLoadError('Define a rubric first — the AI needs criteria to grade against.');
      return;
    }
    if ((review?.submissions ?? []).length === 0) {
      setLoadError('No submissions to grade yet.');
      return;
    }
    setRunning(true);
    setLoadError(null);
    try {
      const summary = await runAiGrading(id);
      // eslint-disable-next-line no-console
      console.info('[AI grading] run summary:', summary);
      if (summary.failed > 0 && summary.graded === 0) {
        setLoadError(
          `AI grading failed for all ${summary.failed} submission(s). `
          + (summary.failures[0]?.error ?? 'Check the python backend logs.')
        );
      }
      await refresh();
    } catch (e) {
      const msg = e instanceof ApiError
        ? `${e.message} (HTTP ${e.status})`
        : (e instanceof Error ? e.message : 'AI grading failed');
      // eslint-disable-next-line no-console
      console.error('[AI grading] error:', e);
      setLoadError(
        msg.includes('fetch') || msg.includes('NetworkError')
          ? `Could not reach the AI backend on :8000. Is python-backend running?`
          : msg
      );
    } finally {
      setRunning(false);
    }
  };

  const onPublishAll = async () => {
    if (!id) return;
    if (proposedCount === 0) {
      setLoadError('No proposed grades to publish. Run AI grading first.');
      return;
    }
    if (!confirm(`Publish ${proposedCount} proposed grade${proposedCount === 1 ? '' : 's'} to students?`)) {
      return;
    }
    setBusy(true);
    setLoadError(null);
    try {
      const result = await bulkPublishGrades(id);
      // eslint-disable-next-line no-console
      console.info('[Publish all] result:', result);
      await refresh();
    } catch (e) {
      const msg = e instanceof ApiError
        ? `${e.message} (HTTP ${e.status})`
        : (e instanceof Error ? e.message : 'Publish failed');
      // eslint-disable-next-line no-console
      console.error('[Publish all] error:', e);
      setLoadError(msg);
    } finally {
      setBusy(false);
    }
  };

  const onPublishOne = async (submissionId: string, override?: number) => {
    try {
      await publishOneGrade(submissionId, override);
      await refresh();
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : 'Publish failed');
    }
  };

  return (
    <AppLayout
      background="#F8FAFC"
      pageIcon={<Sparkles size={18} />}
      pageTitle="AI Grading Review"
      pageBreadcrumb={
        <>
          <button onClick={() => navigate('/assignments/list')}>Assignments</button>
          <ChevronRight size={11} />
          <span className="current">{review?.resource.title ?? 'Loading…'}</span>
        </>
      }
      pageActions={
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => navigate(`/assignments/list/${id}/review`)}
        >
          <ChevronLeft size={14} /> Manual review
        </button>
      }
    >
      {loadError && (
        <div className="status-pill danger" style={{ marginBottom: '1rem', textTransform: 'none' }}>
          {loadError}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: '1.25rem', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ margin: '0 0 0.4rem', fontSize: '1.6rem', fontWeight: 800, color: '#0F172A' }}>
            {review?.resource.title ?? 'AI Grading'}
          </h1>
          <p style={{ margin: '0 0 1rem', color: '#64748B', fontSize: '0.85rem' }}>
            {review?.resource.maxMarks !== undefined && `Out of ${review.resource.maxMarks} marks · `}
            {review?.resource.dueDate && `Due ${new Date(review.resource.dueDate).toLocaleDateString()}`}
          </p>

          {/* Action bar */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: '0.55rem',
            padding: '0.85rem', background: 'white',
            border: '1px solid #E2E8F0', borderRadius: '0.75rem',
            marginBottom: '1rem',
          }}>
            <button
              onClick={() => setRubricOpen(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.55rem 0.95rem', borderRadius: '0.5rem',
                background: hasRubric ? 'white' : 'var(--primary)',
                color: hasRubric ? '#0F172A' : 'white',
                border: hasRubric ? '1px solid #E2E8F0' : 'none',
                fontWeight: 700, fontSize: '0.83rem', cursor: 'pointer',
              }}
            >
              <ListChecks size={14} />
              {hasRubric ? `Edit rubric (${rubric!.criteria.length} criteria)` : 'Define rubric'}
            </button>

            <button
              onClick={onRunAi}
              disabled={running}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.55rem 0.95rem', borderRadius: '0.5rem',
                background: '#7C3AED', color: 'white',
                border: 'none', fontWeight: 700, fontSize: '0.83rem',
                cursor: running ? 'wait' : 'pointer',
                opacity: running ? 0.7 : 1,
              }}
              title={!hasRubric ? 'Click to define a rubric first, then grade.' : 'Run AI grading on every submission'}
            >
              {running ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {running ? 'Grading…' : 'Run AI grading'}
            </button>

            <button
              onClick={onPublishAll}
              disabled={busy}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.55rem 0.95rem', borderRadius: '0.5rem',
                background: '#16A34A', color: 'white',
                border: 'none', fontWeight: 700, fontSize: '0.83rem',
                cursor: busy ? 'wait' : 'pointer',
                opacity: proposedCount === 0 ? 0.5 : 1,
              }}
              title={proposedCount === 0 ? 'Run AI grading first to create proposals' : ''}
            >
              <Send size={14} />
              Publish all proposed ({proposedCount})
            </button>
          </div>

          {/* Submissions table */}
          <div style={{
            background: 'white', border: '1px solid #E2E8F0',
            borderRadius: '0.85rem', boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
            overflow: 'hidden',
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1.2fr 1.2fr 1.6fr auto',
              padding: '0.85rem 1.25rem',
              borderBottom: '1px solid #F1F5F9',
              fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.6px',
              color: '#64748B', textTransform: 'uppercase',
              background: '#FAFBFC',
            }}>
              <div>Student</div>
              <div>AI score</div>
              <div>Status</div>
              <div>Flags</div>
              <div style={{ textAlign: 'right' }}>Actions</div>
            </div>

            {busy && !review ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748B' }}>
                <Loader2 size={16} className="animate-spin" /> Loading…
              </div>
            ) : (review?.submissions ?? []).length === 0 ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748B' }}>
                No submissions yet.
              </div>
            ) : review!.submissions.map(sub => (
              <Row
                key={sub._id}
                sub={sub}
                maxMarks={review!.resource.maxMarks}
                onView={() => setDetail(sub)}
                onPublish={(override) => onPublishOne(sub._id, override)}
              />
            ))}
          </div>
        </div>

        <Sidebar review={review} />
      </div>

      {rubricOpen && (
        <RubricEditorModal
          existing={rubric ?? null}
          defaultTotal={review?.resource.maxMarks ?? 20}
          onClose={() => setRubricOpen(false)}
          onSave={async (body) => {
            if (!id) return;
            await setRubric(id, body);
            setRubricOpen(false);
            await refresh();
          }}
        />
      )}

      {detail && (
        <ProposalDetailModal
          submission={detail}
          maxMarks={review?.resource.maxMarks}
          onClose={() => setDetail(null)}
          onPublish={(override) => {
            onPublishOne(detail._id, override);
            setDetail(null);
          }}
        />
      )}
    </AppLayout>
  );
};

/* -------------------------------------------------------------------------- */
/*  Row                                                                        */
/* -------------------------------------------------------------------------- */

const Row: React.FC<{
  sub: GradingSubmission;
  maxMarks?: number;
  onView: () => void;
  onPublish: (override?: number) => void;
}> = ({ sub, maxMarks, onView, onPublish }) => {
  const student = typeof sub.student === 'string' ? null : sub.student;
  const initials = (student?.name ?? '?')
    .split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
  const proposed = sub.proposal?.proposedScore;
  const isPublished = sub.reviewStatus === 'published';
  const isProposed  = sub.reviewStatus === 'proposed';

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '2fr 1.2fr 1.2fr 1.6fr auto',
      alignItems: 'center',
      padding: '1rem 1.25rem',
      borderBottom: '1px solid #F1F5F9',
      background: 'white',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
        <div style={{
          width: 38, height: 38, borderRadius: '50%',
          background: '#F5F3FF', color: '#7C3AED',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: '0.85rem', flexShrink: 0,
        }}>
          {initials || '?'}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F172A' }}>
            {student?.name ?? 'Unknown'}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '0.15rem' }}>
            {student?.rollNumber ? `Roll: ${student.rollNumber}` : student?.email ?? '—'}
          </div>
        </div>
      </div>

      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: proposed === undefined ? '#94A3B8' : '#0F172A' }}>
        {proposed === undefined
          ? '—'
          : `${proposed}${maxMarks !== undefined ? ` / ${maxMarks}` : ''}`}
      </div>

      <div>
        <StatusPill status={sub.reviewStatus} />
        {isPublished && sub.score !== undefined && (
          <div style={{ marginTop: '0.25rem', fontSize: '0.74rem', color: '#16A34A', fontWeight: 600 }}>
            Final: {sub.score}{maxMarks !== undefined ? ` / ${maxMarks}` : ''}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
        {(sub.proposal?.flags ?? []).map(f => (
          <span key={f} style={{
            padding: '0.2rem 0.5rem',
            background: flagBg[f], color: flagColor[f],
            borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700,
          }}>
            {flagLabel[f]}
          </span>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'flex-end' }}>
        <button
          onClick={onView}
          disabled={!sub.proposal}
          title="View AI breakdown"
          style={{
            width: 34, height: 34, borderRadius: '0.45rem',
            background: 'transparent', border: '1px solid #E2E8F0',
            color: sub.proposal ? '#475569' : '#CBD5E1',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: sub.proposal ? 'pointer' : 'not-allowed',
          }}
        >
          <Eye size={15} />
        </button>
        <button
          onClick={() => onPublish()}
          disabled={!isProposed}
          style={{
            padding: '0.5rem 0.9rem', borderRadius: '0.5rem',
            background: isProposed ? '#16A34A' : '#F1F5F9',
            color: isProposed ? 'white' : '#94A3B8',
            border: 'none', cursor: isProposed ? 'pointer' : 'not-allowed',
            fontSize: '0.78rem', fontWeight: 700,
            whiteSpace: 'nowrap',
          }}
        >
          {isPublished ? 'Published' : 'Publish'}
        </button>
      </div>
    </div>
  );
};

const StatusPill: React.FC<{ status: GradingSubmission['reviewStatus'] }> = ({ status }) => {
  const meta = {
    none:      { label: 'NOT GRADED', bg: '#F1F5F9', color: '#64748B' },
    proposed:  { label: 'AI PROPOSED', bg: '#EDE9FE', color: '#7C3AED' },
    approved:  { label: 'APPROVED',    bg: '#DBEAFE', color: '#1D4ED8' },
    published: { label: 'PUBLISHED',   bg: '#DCFCE7', color: '#15803D' },
  }[status] ?? { label: 'NOT GRADED', bg: '#F1F5F9', color: '#64748B' };
  return (
    <span style={{
      padding: '0.3rem 0.65rem',
      background: meta.bg, color: meta.color,
      borderRadius: '999px',
      fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.4px',
    }}>
      {meta.label}
    </span>
  );
};

/* -------------------------------------------------------------------------- */
/*  Sidebar                                                                    */
/* -------------------------------------------------------------------------- */

const Sidebar: React.FC<{ review: GradingReview | null }> = ({ review }) => {
  if (!review) return <div />;
  const { counts, resource } = review;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'sticky', top: '1rem' }}>
      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>Overview</h3>

      <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '0.7rem', padding: '1rem 1.1rem' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.6px', color: '#64748B' }}>SUBMISSIONS</div>
        <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0F172A', marginTop: '0.35rem' }}>{counts.total}</div>
        <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: '#64748B' }}>
          {counts.proposed} proposed · {counts.published} published · {counts.none} not graded
        </div>
      </div>

      {resource.rubric && (
        <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '0.7rem', padding: '1rem 1.1rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.6px', color: '#64748B' }}>RUBRIC</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', marginTop: '0.35rem' }}>
            {resource.rubric.criteria.length} criteria · {resource.rubric.totalPoints} pts
          </div>
          <ul style={{ margin: '0.4rem 0 0', paddingLeft: '1rem', fontSize: '0.78rem', color: '#475569', lineHeight: 1.55 }}>
            {resource.rubric.criteria.map(c => (
              <li key={c.name}>
                {c.name} — {c.weight}% / {c.maxPoints} pts{c.mandatory ? ' · mandatory' : ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '0.7rem', padding: '1rem 1.1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 800, color: '#92400E' }}>
          <AlertTriangle size={14} />
          AI-proposed, not yet visible
        </div>
        <p style={{ margin: '0.4rem 0 0', fontSize: '0.78rem', lineHeight: 1.55, color: '#92400E' }}>
          Students don't see scores until you click <b>Publish</b>. Review the
          breakdown for each submission before publishing.
        </p>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Rubric editor modal                                                        */
/* -------------------------------------------------------------------------- */

const emptyCriterion = (): RubricCriterion => ({
  name: '', description: '', maxPoints: 5, weight: 25, mandatory: false,
});

const RubricEditorModal: React.FC<{
  existing: Rubric | null;
  defaultTotal: number;
  onClose: () => void;
  onSave: (body: { criteria: RubricCriterion[]; totalPoints: number; graderNotes?: string }) => Promise<void>;
}> = ({ existing, defaultTotal, onClose, onSave }) => {
  const [criteria, setCriteria] = useState<RubricCriterion[]>(
    existing?.criteria?.length ? existing.criteria : [emptyCriterion(), emptyCriterion()]
  );
  const [totalPoints, setTotalPoints] = useState<number>(existing?.totalPoints ?? defaultTotal);
  const [graderNotes, setGraderNotes] = useState<string>(existing?.graderNotes ?? '');
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const weightSum = criteria.reduce((a, c) => a + (Number(c.weight) || 0), 0);

  const update = (idx: number, patch: Partial<RubricCriterion>) => {
    setCriteria(prev => prev.map((c, i) => i === idx ? { ...c, ...patch } : c));
  };

  const handleSave = async () => {
    const cleaned = criteria
      .map(c => ({ ...c, name: c.name.trim() }))
      .filter(c => c.name.length > 0);
    if (cleaned.length === 0) { setErr('Add at least one criterion'); return; }
    if (Math.abs(weightSum - 100) > 0.5) {
      setErr(`Weights should sum to 100 (currently ${weightSum})`); return;
    }
    setErr(null);
    setSaving(true);
    try {
      await onSave({
        criteria: cleaned, totalPoints: Number(totalPoints) || 0,
        graderNotes: graderNotes.trim() || undefined,
      });
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Failed to save rubric');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem', zIndex: 120,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 720, maxHeight: '90vh', overflowY: 'auto',
        background: 'white', borderRadius: '0.85rem',
        boxShadow: '0 18px 40px rgba(15, 23, 42, 0.25)',
        padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>
              <ListChecks size={16} style={{ verticalAlign: 'text-bottom' }} /> Rubric
            </h3>
            <p style={{ margin: '0.3rem 0 0', fontSize: '0.8rem', color: '#64748B' }}>
              Each criterion's <b>weight</b> determines what fraction of the final score it contributes.
              Weights should sum to 100.
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label style={labelStyle}>Total points</label>
            <input
              type="number"
              min={0}
              value={totalPoints}
              onChange={e => setTotalPoints(Number(e.target.value))}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Weight sum</label>
            <div style={{
              ...inputStyle,
              background: Math.abs(weightSum - 100) <= 0.5 ? '#DCFCE7' : '#FEF3C7',
              color: Math.abs(weightSum - 100) <= 0.5 ? '#15803D' : '#92400E',
              fontWeight: 700,
            }}>
              {weightSum} {Math.abs(weightSum - 100) <= 0.5 ? <CheckCircle2 size={13} style={{ verticalAlign: 'text-bottom' }} /> : <AlertTriangle size={13} style={{ verticalAlign: 'text-bottom' }} />}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
          {criteria.map((c, idx) => (
            <div key={idx} style={{
              border: '1px solid #E2E8F0', borderRadius: '0.6rem',
              padding: '0.75rem', display: 'grid',
              gridTemplateColumns: '2fr 0.7fr 0.7fr 0.7fr auto',
              gap: '0.5rem', alignItems: 'end',
            }}>
              <div style={{ minWidth: 0 }}>
                <label style={labelStyle}>Criterion name</label>
                <input
                  value={c.name}
                  onChange={e => update(idx, { name: e.target.value })}
                  placeholder="e.g. Correctness"
                  style={inputStyle}
                />
                <input
                  value={c.description ?? ''}
                  onChange={e => update(idx, { description: e.target.value })}
                  placeholder="What this criterion checks (optional)"
                  style={{ ...inputStyle, marginTop: '0.35rem', fontSize: '0.78rem' }}
                />
              </div>
              <div>
                <label style={labelStyle}>Max pts</label>
                <input
                  type="number" min={0}
                  value={c.maxPoints}
                  onChange={e => update(idx, { maxPoints: Number(e.target.value) })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Weight %</label>
                <input
                  type="number" min={0} max={100}
                  value={c.weight}
                  onChange={e => update(idx, { weight: Number(e.target.value) })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Mandatory</label>
                <input
                  type="checkbox"
                  checked={!!c.mandatory}
                  onChange={e => update(idx, { mandatory: e.target.checked })}
                  style={{ width: 18, height: 18, marginTop: '0.45rem' }}
                />
              </div>
              <button
                onClick={() => setCriteria(prev => prev.filter((_, i) => i !== idx))}
                aria-label="Remove criterion"
                style={{
                  height: 38, width: 38, borderRadius: '0.4rem',
                  background: 'white', border: '1px solid #FEE2E2',
                  color: '#B91C1C', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button
            onClick={() => setCriteria(prev => [...prev, emptyCriterion()])}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
              alignSelf: 'flex-start',
              padding: '0.45rem 0.85rem', borderRadius: '0.5rem',
              background: '#F1F5F9', color: '#334155',
              border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem',
            }}
          >
            <Plus size={13} /> Add criterion
          </button>
        </div>

        <div>
          <label style={labelStyle}>Grader notes (optional, sent to AI)</label>
          <textarea
            value={graderNotes}
            onChange={e => setGraderNotes(e.target.value)}
            placeholder={`e.g. "Don't give full marks unless the student gives at least one original example."`}
            rows={3}
            style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }}
          />
        </div>

        {err && (
          <div style={{ fontSize: '0.78rem', color: '#B91C1C', fontWeight: 600 }}>
            {err}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.45rem' }}>
          <button onClick={onClose} disabled={saving} style={btnSecondary}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} style={btnPrimary}>
            {saving ? <Loader2 size={13} className="animate-spin" /> : <ClipboardCheck size={13} />}
            {saving ? 'Saving…' : 'Save rubric'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Proposal detail modal                                                      */
/* -------------------------------------------------------------------------- */

const ProposalDetailModal: React.FC<{
  submission: GradingSubmission;
  maxMarks?: number;
  onClose: () => void;
  onPublish: (override?: number) => void;
}> = ({ submission, maxMarks, onClose, onPublish }) => {
  const student = typeof submission.student === 'string' ? null : submission.student;
  const proposal = submission.proposal!;
  const [override, setOverride] = useState<string>(String(proposal.proposedScore));

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem', zIndex: 120,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 720, maxHeight: '90vh', overflowY: 'auto',
        background: 'white', borderRadius: '0.85rem',
        boxShadow: '0 18px 40px rgba(15, 23, 42, 0.25)',
        padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>
              <FileText size={16} style={{ verticalAlign: 'text-bottom' }} /> {student?.name ?? 'Submission'}
            </h3>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#64748B' }}>
              AI grade: <b>{proposal.proposedScore}</b>{maxMarks !== undefined ? ` / ${maxMarks}` : ''}
              {proposal.model && ` · ${proposal.model}`}
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

        {proposal.flags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
            {proposal.flags.map(f => (
              <span key={f} style={{
                padding: '0.25rem 0.55rem',
                background: flagBg[f], color: flagColor[f],
                borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700,
              }}>
                {flagLabel[f]}
              </span>
            ))}
          </div>
        )}

        <div>
          <h4 style={subhead}>Rubric breakdown</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {proposal.rubricBreakdown.map(b => (
              <div key={b.name} style={{
                border: '1px solid #E2E8F0', borderRadius: '0.55rem',
                padding: '0.65rem 0.85rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F172A' }}>{b.name}</div>
                  <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0F172A' }}>
                    {b.score} / {b.maxPoints} <span style={{ color: '#64748B', fontWeight: 500, fontSize: '0.78rem' }}>· weight {b.weight}%</span>
                  </div>
                </div>
                {b.feedback && (
                  <p style={{ margin: '0.3rem 0 0', fontSize: '0.8rem', color: '#475569', lineHeight: 1.55 }}>
                    {b.feedback}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {proposal.feedback && (
          <div>
            <h4 style={subhead}>Overall feedback</h4>
            <p style={{ margin: 0, fontSize: '0.84rem', color: '#334155', lineHeight: 1.6 }}>
              {proposal.feedback}
            </p>
          </div>
        )}

        {(proposal.strengths.length > 0 || proposal.improvements.length > 0) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            {proposal.strengths.length > 0 && (
              <div>
                <h4 style={subhead}>Strengths</h4>
                <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.82rem', color: '#15803D' }}>
                  {proposal.strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
            {proposal.improvements.length > 0 && (
              <div>
                <h4 style={subhead}>Improvements</h4>
                <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.82rem', color: '#B45309' }}>
                  {proposal.improvements.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
            Publish with score:
          </label>
          <input
            type="number" min={0} max={maxMarks}
            value={override}
            onChange={e => setOverride(e.target.value)}
            style={{ ...inputStyle, width: 100 }}
          />
          <button
            onClick={() => {
              const n = Number(override);
              if (Number.isNaN(n)) return;
              onPublish(n === proposal.proposedScore ? undefined : n);
            }}
            style={{ ...btnPrimary, background: '#16A34A' }}
          >
            <Send size={13} /> Publish
          </button>
          <button onClick={onClose} style={btnSecondary}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Shared inline styles                                                       */
/* -------------------------------------------------------------------------- */

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.74rem', fontWeight: 700,
  color: '#475569', marginBottom: '0.25rem', letterSpacing: '0.3px',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.55rem 0.75rem',
  border: '1px solid #E2E8F0', borderRadius: '0.45rem',
  fontSize: '0.86rem', outline: 'none', fontWeight: 500, color: '#0F172A',
  boxSizing: 'border-box',
};

const subhead: React.CSSProperties = {
  margin: '0 0 0.45rem', fontSize: '0.74rem', fontWeight: 800,
  color: '#64748B', letterSpacing: '0.6px', textTransform: 'uppercase',
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
