/**
 * Teacher's Grade Batch landing page.
 *
 * Lists every published assignment the caller owns + aggregated
 * submission counts per AI-review state, so the teacher can pick
 * one and either:
 *   - Define a rubric (if missing) — opens the AI Grading review page
 *     where the rubric editor lives.
 *   - Run AI grading on pending submissions.
 *   - Review proposed grades.
 *
 * Every action button navigates to the existing AI Grading review
 * page at /assignments/list/:id/ai-grade — the per-assignment
 * dashboard we already built. No new "batch" UI is invented; this is
 * the queue page that funnels the teacher into existing flows.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet, Loader2, ClipboardList, Sparkles, CheckCircle2,
  AlertTriangle, ListChecks, ArrowRight,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { ApiError } from '../lib/api';
import { listGradeBatch, type GradeBatchAssignment } from '../lib/gradeBatch/api';

const fmtDate = (iso?: string): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' });
};

interface RowStage {
  // Highest-priority next action for this assignment.
  cta: { label: string; tone: 'primary' | 'amber' | 'green' | 'slate'; icon: React.ReactNode };
  hint: string;
}

const stageOf = (a: GradeBatchAssignment): RowStage => {
  const { rubricSet, submissionCounts: c } = a;
  if (!rubricSet) {
    return {
      cta: { label: 'Define Rubric', tone: 'amber', icon: <ListChecks size={14} /> },
      hint: 'A rubric is required before AI grading can run.',
    };
  }
  if (c.pending > 0 && c.proposed === 0 && c.published === 0) {
    return {
      cta: { label: 'Run AI Grading', tone: 'primary', icon: <Sparkles size={14} /> },
      hint: `${c.pending} submission${c.pending === 1 ? '' : 's'} ready to grade.`,
    };
  }
  if (c.proposed > 0) {
    return {
      cta: { label: 'Review Proposals', tone: 'amber', icon: <ClipboardList size={14} /> },
      hint: `${c.proposed} AI-proposed grade${c.proposed === 1 ? '' : 's'} waiting for your review.`,
    };
  }
  if (c.pending > 0 && c.published > 0) {
    return {
      cta: { label: 'Grade Remaining', tone: 'primary', icon: <Sparkles size={14} /> },
      hint: `${c.pending} not yet graded, ${c.published} already published.`,
    };
  }
  if (c.total > 0 && c.published === c.total) {
    return {
      cta: { label: 'View Results', tone: 'green', icon: <CheckCircle2 size={14} /> },
      hint: 'All submissions graded and published.',
    };
  }
  return {
    cta: { label: 'Open', tone: 'slate', icon: <ArrowRight size={14} /> },
    hint: c.total === 0 ? 'No submissions yet.' : 'Open the review page for details.',
  };
};

const ctaStyle = (tone: RowStage['cta']['tone']): React.CSSProperties => {
  const palette = {
    primary: { bg: 'var(--primary)', color: 'white' },
    amber:   { bg: '#F59E0B', color: 'white' },
    green:   { bg: '#16A34A', color: 'white' },
    slate:   { bg: 'white',   color: '#334155' },
  }[tone];
  return {
    display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
    padding: '0.55rem 0.95rem', borderRadius: '0.5rem',
    background: palette.bg, color: palette.color,
    border: tone === 'slate' ? '1px solid #E2E8F0' : 'none',
    fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
    whiteSpace: 'nowrap',
  };
};

export const GradeBatch: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<GradeBatchAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await listGradeBatch();
        setItems(data.assignments);
      } catch (e) {
        setLoadError(e instanceof ApiError ? e.message : 'Failed to load grade batch');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totals = items.reduce(
    (acc, a) => {
      acc.toGrade += a.submissionCounts.pending;
      acc.proposed += a.submissionCounts.proposed;
      acc.published += a.submissionCounts.published;
      acc.rubricMissing += a.rubricSet ? 0 : 1;
      return acc;
    },
    { toGrade: 0, proposed: 0, published: 0, rubricMissing: 0 },
  );

  return (
    <AppLayout
      pageIcon={<FileSpreadsheet size={18} />}
      pageTitle="Grade Batch"
      pageBreadcrumb="Pending grading queue"
    >
      {loadError && (
        <div className="status-pill danger" style={{ marginBottom: '1rem', textTransform: 'none' }}>
          {loadError}
        </div>
      )}

      {/* Summary strip */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem',
        marginBottom: '1.25rem',
      }}>
        <SummaryCard tone="amber" label="Need rubric" value={totals.rubricMissing} />
        <SummaryCard tone="primary" label="Ready to grade" value={totals.toGrade} />
        <SummaryCard tone="purple" label="AI proposed" value={totals.proposed} />
        <SummaryCard tone="green" label="Published" value={totals.published} />
      </div>

      <div style={{
        background: 'white', border: '1px solid #E2E8F0', borderRadius: '0.85rem',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2.2fr 1fr 1fr 1.6fr 1fr auto',
          padding: '0.85rem 1.25rem',
          background: '#FAFBFC', borderBottom: '1px solid #F1F5F9',
          fontSize: '0.7rem', fontWeight: 700, color: '#64748B',
          letterSpacing: '0.6px', textTransform: 'uppercase',
        }}>
          <div>Assignment</div>
          <div>Subject</div>
          <div>Division</div>
          <div>Submissions</div>
          <div>Due</div>
          <div style={{ textAlign: 'right' }}>Action</div>
        </div>

        {loading ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748B' }}>
            <Loader2 size={16} className="animate-spin" /> Loading…
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
            No published assignments yet — create + publish one, or run
            <code style={{ marginLeft: 4, padding: '0.05rem 0.35rem', background: '#F1F5F9', borderRadius: '0.25rem' }}>
              npm&nbsp;run&nbsp;seed:grade-batch
            </code>
            to populate demo data.
          </div>
        ) : (
          items.map(a => {
            const stage = stageOf(a);
            const c = a.submissionCounts;
            return (
              <div
                key={a.resourceId}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2.2fr 1fr 1fr 1.6fr 1fr auto',
                  alignItems: 'center',
                  padding: '1rem 1.25rem',
                  borderBottom: '1px solid #F1F5F9',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0F172A' }}>
                    {a.title}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '0.2rem' }}>
                    {stage.hint}
                  </div>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 600 }}>
                  {a.subjectLabel ?? '—'}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 600 }}>
                  {a.divisionLabel ?? '—'}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#475569' }}>
                  <SubmissionBar counts={c} totalStudents={a.studentCount} />
                  <div style={{ marginTop: '0.3rem', display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
                    {!a.rubricSet && (
                      <Pill tone="amber" icon={<AlertTriangle size={11} />}>No rubric</Pill>
                    )}
                    {c.pending > 0   && <Pill tone="primary">{c.pending} to grade</Pill>}
                    {c.proposed > 0  && <Pill tone="purple">{c.proposed} proposed</Pill>}
                    {c.published > 0 && <Pill tone="green">{c.published} published</Pill>}
                  </div>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                  {fmtDate(a.dueDate)}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <button
                    style={ctaStyle(stage.cta.tone)}
                    onClick={() => navigate(`/assignments/list/${a.resourceId}/ai-grade`)}
                  >
                    {stage.cta.icon} {stage.cta.label}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </AppLayout>
  );
};

/* -------------------------------------------------------------------------- */
/*  Small helpers                                                              */
/* -------------------------------------------------------------------------- */

const SummaryCard: React.FC<{
  tone: 'primary' | 'amber' | 'green' | 'purple';
  label: string;
  value: number;
}> = ({ tone, label, value }) => {
  const palette = {
    primary: { bg: '#EFF6FF', color: 'var(--primary)', value: '#0F172A' },
    amber:   { bg: '#FEF3C7', color: '#B45309',        value: '#7C2D12' },
    green:   { bg: '#DCFCE7', color: '#15803D',        value: '#14532D' },
    purple:  { bg: '#F5F3FF', color: '#7C3AED',        value: '#3B0764' },
  }[tone];
  return (
    <div style={{
      background: palette.bg, borderRadius: '0.7rem',
      padding: '1rem 1.1rem',
    }}>
      <div style={{
        fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.6px',
        color: palette.color, textTransform: 'uppercase',
      }}>
        {label}
      </div>
      <div style={{ fontSize: '1.65rem', fontWeight: 800, color: palette.value, marginTop: '0.3rem', lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
};

const SubmissionBar: React.FC<{
  counts: GradeBatchAssignment['submissionCounts'];
  totalStudents: number;
}> = ({ counts, totalStudents }) => {
  const denom = Math.max(totalStudents, counts.total, 1);
  const pct = (n: number) => `${(n / denom) * 100}%`;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <div style={{
        height: 8, borderRadius: 6, overflow: 'hidden',
        background: '#F1F5F9', display: 'flex',
      }}>
        <div style={{ width: pct(counts.published), background: '#16A34A' }} />
        <div style={{ width: pct(counts.approved),  background: '#3B82F6' }} />
        <div style={{ width: pct(counts.proposed),  background: '#7C3AED' }} />
        <div style={{ width: pct(counts.pending),   background: '#F59E0B' }} />
      </div>
      <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
        {counts.total} submitted of {totalStudents} students
      </div>
    </div>
  );
};

const Pill: React.FC<{
  tone: 'primary' | 'amber' | 'green' | 'purple';
  icon?: React.ReactNode;
  children: React.ReactNode;
}> = ({ tone, icon, children }) => {
  const palette = {
    primary: { bg: '#EFF6FF', color: 'var(--primary)' },
    amber:   { bg: '#FEF3C7', color: '#92400E' },
    green:   { bg: '#DCFCE7', color: '#15803D' },
    purple:  { bg: '#F5F3FF', color: '#7C3AED' },
  }[tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
      padding: '0.15rem 0.45rem', borderRadius: '999px',
      background: palette.bg, color: palette.color,
      fontSize: '0.7rem', fontWeight: 700,
    }}>
      {icon} {children}
    </span>
  );
};
