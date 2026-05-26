import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Clock, CheckCircle2, AlertTriangle, RotateCcw, TrendingUp, ChevronRight,
  Search, ClipboardList, ChevronLeft,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { fetchResource } from '../lib/resources/api';
import type { Resource } from '../lib/resources/types';
import { ApiError } from '../lib/api';

/* -------------------------------------------------------------------------- */
/*  Demo submissions data                                                     */
/*                                                                            */
/*  The submissions backend hasn't been built yet — this page renders demo    */
/*  data so the UX is reviewable. When the Submission model lands, swap this  */
/*  for a real fetch keyed off the assignment id.                             */
/* -------------------------------------------------------------------------- */

type SubmissionStatus = 'pending' | 'graded' | 'late' | 'resubmitted';

interface DemoSubmission {
  id: string;
  studentName: string;
  rollNumber: string;
  status: SubmissionStatus;
  submittedAt: string;
  fileLabel: string;
  grade?: { score: number; outOf: number };
  lateBy?: string;
  avatar: string;
}

const DEMO: DemoSubmission[] = [
  { id: '1', studentName: 'Alex Thompson',  rollNumber: 'CS-2024-042', status: 'pending',     submittedAt: 'Oct 24, 2:15 PM',  fileLabel: '12 MB PDF',  avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=100&h=100&q=80' },
  { id: '2', studentName: 'Elena Rodriguez', rollNumber: 'CS-2024-089', status: 'graded',      submittedAt: 'Oct 23, 11:40 AM', fileLabel: 'Zip Archive', grade: { score: 85, outOf: 100 }, avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=100&h=100&q=80' },
  { id: '3', studentName: 'Marcus Chen',     rollNumber: 'CS-2024-012', status: 'late',        submittedAt: 'Oct 25, 02:00 AM', fileLabel: 'GitHub Link', lateBy: '2h', avatar: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?auto=format&fit=crop&w=100&h=100&q=80' },
  { id: '4', studentName: 'Sarah Miller',    rollNumber: 'CS-2024-115', status: 'resubmitted', submittedAt: 'Oct 24, 09:10 PM', fileLabel: '2 MB Docx',   avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=100&h=100&q=80' },
];

type Tab = 'all' | 'pending' | 'graded' | 'late';

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

export const ReviewSubmissions: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [resource, setResource] = useState<Resource | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetchResource(id)
      .then(r => { if (!cancelled) setResource(r); })
      .catch((e: unknown) => {
        if (!cancelled) setLoadError(e instanceof ApiError ? e.message : 'Failed to load assignment');
      });
    return () => { cancelled = true; };
  }, [id]);

  const counts = useMemo(() => ({
    all:     DEMO.length,
    pending: DEMO.filter(s => s.status === 'pending').length,
    graded:  DEMO.filter(s => s.status === 'graded').length,
    late:    DEMO.filter(s => s.status === 'late').length,
  }), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DEMO
      .filter(s => tab === 'all' ? true : s.status === tab)
      .filter(s => q === '' ? true :
        s.studentName.toLowerCase().includes(q) || s.rollNumber.toLowerCase().includes(q));
  }, [tab, query]);

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
          <h1 style={{ margin: '0 0 1.25rem', fontSize: '1.75rem', fontWeight: 800, color: '#0F172A' }}>
            Review Submissions
          </h1>

          {/* Demo data notice */}
          <div
            style={{
              padding: '0.65rem 0.85rem',
              background: '#FFFBEB', border: '1px solid #FDE68A',
              borderRadius: '0.5rem', marginBottom: '1rem',
              fontSize: '0.78rem', color: '#92400E', fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: '0.5rem',
            }}
          >
            <AlertTriangle size={14} />
            Demo data — the student submissions backend (`Submission` model) hasn't been built yet.
            This screen previews how it will look once it lands.
          </div>

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
              { key: 'all',     label: 'All',     count: counts.all     },
              { key: 'pending', label: 'Pending', count: counts.pending },
              { key: 'graded',  label: 'Graded',  count: counts.graded  },
              { key: 'late',    label: 'Late',    count: counts.late    },
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
              placeholder="Search student or roll no..."
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
                gridTemplateColumns: '2.2fr 1.3fr 1.4fr auto',
                padding: '0.85rem 1.25rem',
                borderBottom: '1px solid #F1F5F9',
                fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.6px',
                color: '#64748B', textTransform: 'uppercase',
                background: '#FAFBFC',
              }}
            >
              <div>Student Identity</div>
              <div>Submission Status</div>
              <div>Last Modified</div>
              <div style={{ textAlign: 'right' }}>Action</div>
            </div>

            {filtered.length === 0 ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748B', fontSize: '0.88rem' }}>
                No submissions match the current filter.
              </div>
            ) : filtered.map(s => <SubmissionRow key={s.id} submission={s} />)}

            {/* Pagination footer */}
            <div
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.85rem 1.25rem', borderTop: '1px solid #F1F5F9',
                background: '#FAFBFC',
              }}
            >
              <span style={{ fontSize: '0.74rem', fontWeight: 700, letterSpacing: '0.5px', color: '#64748B', textTransform: 'uppercase' }}>
                Showing 1–{filtered.length} of {counts.all} submissions
              </span>
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                <PageBtn disabled><ChevronLeft size={13} /></PageBtn>
                <PageBtn active>1</PageBtn>
                <PageBtn>2</PageBtn>
                <PageBtn>3</PageBtn>
                <PageBtn><ChevronRight size={13} /></PageBtn>
              </div>
            </div>
          </div>
        </div>

        {/* Right rail — stats */}
        <StatsSidebar pending={counts.pending} />
      </div>
    </AppLayout>
  );
};

/* -------------------------------------------------------------------------- */
/*  Submission row                                                             */
/* -------------------------------------------------------------------------- */

const statusPill = (status: SubmissionStatus, lateBy?: string): { label: string; bg: string; color: string; icon: React.ReactNode } => {
  if (status === 'pending')     return { label: 'PENDING',         bg: '#FEF3C7', color: '#92400E', icon: <Clock size={12} /> };
  if (status === 'graded')      return { label: '',                 bg: '#DCFCE7', color: '#15803D', icon: <CheckCircle2 size={12} /> };
  if (status === 'late')        return { label: `LATE (${lateBy ?? '—'})`, bg: '#FEE2E2', color: '#B91C1C', icon: <AlertTriangle size={12} /> };
  return                          { label: 'RE-SUBMITTED',          bg: '#FEF3C7', color: '#92400E', icon: <RotateCcw size={12} /> };
};

const SubmissionRow: React.FC<{ submission: DemoSubmission }> = ({ submission }) => {
  const pill = statusPill(submission.status, submission.lateBy);
  const graded = submission.status === 'graded';
  const gradeLabel = graded && submission.grade
    ? `GRADED (${submission.grade.score}/${submission.grade.outOf})`
    : pill.label;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '2.2fr 1.3fr 1.4fr auto',
        alignItems: 'center',
        padding: '1rem 1.25rem',
        borderBottom: '1px solid #F1F5F9',
        background: 'white',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
        <img
          src={submission.avatar}
          alt={submission.studentName}
          style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
        />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F172A' }}>{submission.studentName}</div>
          <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '0.15rem' }}>
            Roll No: {submission.rollNumber}
          </div>
        </div>
      </div>

      <div>
        <span
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            padding: '0.3rem 0.65rem',
            background: graded ? '#DCFCE7' : pill.bg,
            color: graded ? '#15803D' : pill.color,
            borderRadius: '999px',
            fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.4px',
          }}
        >
          {pill.icon}
          {gradeLabel}
        </span>
      </div>

      <div>
        <div style={{ fontSize: '0.84rem', color: '#0F172A', fontWeight: 500 }}>{submission.submittedAt}</div>
        <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '0.1rem' }}>{submission.fileLabel}</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        {graded ? (
          <button
            style={{
              padding: '0.5rem 0.9rem', borderRadius: '0.5rem',
              background: '#F1F5F9', color: '#334155',
              border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: '0.8rem',
            }}
          >
            Edit Grade
          </button>
        ) : (
          <button
            style={{
              padding: '0.5rem 0.9rem', borderRadius: '0.5rem',
              background: 'var(--primary)', color: 'white',
              border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: '0.8rem',
            }}
          >
            Review
          </button>
        )}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Stats sidebar                                                              */
/* -------------------------------------------------------------------------- */

const StatsSidebar: React.FC<{ pending: number }> = ({ pending }) => {
  const grades = [
    { letter: 'A',   count: 12, max: 18 },
    { letter: 'B',   count: 18, max: 18 },
    { letter: 'C',   count: 6,  max: 18 },
    { letter: 'D/F', count: 4,  max: 18 },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'sticky', top: '1rem' }}>
      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>Assignment Stats</h3>

      <StatCard
        label="SUBMISSION RATE"
        value="94.2%"
        sub="42 of 45 students submitted"
        progress={94.2}
        icon={<TrendingUp size={14} color="#16A34A" />}
      />

      <StatCard
        label="AVERAGE SCORE"
        value="78.5"
        sub={<span style={{ color: '#16A34A', fontWeight: 600 }}>↑ +4.2 pts from mid-term</span>}
        icon={<TrendingUp size={14} color="#16A34A" />}
      />

      {/* Grade distribution */}
      <div
        style={{
          background: 'white', border: '1px solid #E2E8F0',
          borderRadius: '0.7rem', padding: '1rem 1.1rem',
        }}
      >
        <div style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.6px', color: '#64748B', marginBottom: '0.75rem' }}>
          GRADE DISTRIBUTION
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
          {grades.map(g => (
            <div key={g.letter} style={{ display: 'grid', gridTemplateColumns: '24px 1fr 28px', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '0.83rem', fontWeight: 700, color: '#334155' }}>{g.letter}</span>
              <div style={{ height: 8, background: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${(g.count / g.max) * 100}%`,
                    background: 'var(--primary)',
                    borderRadius: 4,
                  }}
                />
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F172A', textAlign: 'right' }}>{g.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Needs Attention */}
      <div
        style={{
          background: 'var(--primary)', color: 'white',
          borderRadius: '0.7rem', padding: '1rem 1.1rem',
          display: 'flex', flexDirection: 'column', gap: '0.6rem',
        }}
      >
        <div style={{ fontSize: '0.95rem', fontWeight: 800 }}>Needs Attention</div>
        <p style={{ margin: 0, fontSize: '0.82rem', lineHeight: 1.5, opacity: 0.95 }}>
          {pending} late submission{pending === 1 ? '' : 's'} haven't been reviewed yet.
        </p>
        <button
          style={{
            marginTop: '0.4rem', padding: '0.55rem 0.9rem',
            background: 'white', color: 'var(--primary)',
            border: 'none', borderRadius: '0.5rem',
            fontWeight: 700, fontSize: '0.83rem',
            cursor: 'pointer',
          }}
        >
          Start Batch Review
        </button>
      </div>
    </div>
  );
};

const StatCard: React.FC<{
  label: string;
  value: string;
  sub?: React.ReactNode;
  progress?: number;
  icon?: React.ReactNode;
}> = ({ label, value, sub, progress, icon }) => (
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
    {progress !== undefined && (
      <div style={{ marginTop: '0.5rem', height: 6, background: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: 'var(--primary)', borderRadius: 3 }} />
      </div>
    )}
    {sub && (
      <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: '#64748B' }}>{sub}</div>
    )}
  </div>
);

const PageBtn: React.FC<{
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
}> = ({ onClick, disabled, active, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      minWidth: 30, height: 30, padding: '0 0.5rem',
      borderRadius: '0.4rem',
      background: active ? 'var(--primary)' : 'white',
      color: active ? 'white' : '#334155',
      border: '1px solid', borderColor: active ? 'var(--primary)' : '#E2E8F0',
      fontWeight: 600, fontSize: '0.78rem',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
  >
    {children}
  </button>
);
