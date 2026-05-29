import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  BarChart2, ChevronLeft, ChevronRight, Search, Loader2, Award, Clock,
  CheckCircle2, Users,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { ApiError } from '../lib/api';

type AttemptStatus = 'in_progress' | 'submitted' | 'graded';
type FilterTab = 'all' | 'in_progress' | 'submitted' | 'graded';

interface Attempt {
  _id: string;
  status: AttemptStatus;
  score?: number;
  startedAt?: string;
  submittedAt?: string;
  durationSeconds?: number;
  student?: { _id?: string; name?: string; email?: string } | string;
}

interface Metrics {
  totalAttempts: number;
  submitted: number;
  graded: number;
  avgScore: number;
}

const fmtWhen = (iso?: string): string => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
};

const fmtDuration = (s?: number): string => {
  if (!s || s <= 0) return '—';
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}m ${r}s` : `${r}s`;
};

const statusPill = (status: AttemptStatus): { label: string; bg: string; color: string } => {
  if (status === 'graded')      return { label: 'GRADED',     bg: '#DCFCE7', color: '#15803D' };
  if (status === 'submitted')   return { label: 'SUBMITTED',  bg: '#DBEAFE', color: '#1D4ED8' };
  return                              { label: 'IN PROGRESS', bg: '#FEF3C7', color: '#92400E' };
};

export const QuizAnalytics: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [quizTitle, setQuizTitle] = useState<string>('');
  const [maxMarks, setMaxMarks] = useState<number | undefined>(undefined);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [tab, setTab] = useState<FilterTab>('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const api = await import('../lib/quiz/api');
        const [quizRes, attemptsRes, metricsRes] = await Promise.all([
          api.getQuiz(id),
          api.listAttempts(id),
          api.quizMetrics(id),
        ]);
        if (cancelled) return;
        setQuizTitle(quizRes.quiz?.title ?? 'Untitled Quiz');
        setMaxMarks(quizRes.quiz?.totalMarks);
        setAttempts(attemptsRes.attempts ?? []);
        setMetrics(metricsRes.metrics ?? null);
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof ApiError ? e.message : 'Failed to load analytics');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const counts = useMemo(() => ({
    all: attempts.length,
    in_progress: attempts.filter(a => a.status === 'in_progress').length,
    submitted:   attempts.filter(a => a.status === 'submitted').length,
    graded:      attempts.filter(a => a.status === 'graded').length,
  }), [attempts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return attempts
      .filter(a => tab === 'all' ? true : a.status === tab)
      .filter(a => {
        if (!q) return true;
        const stu = typeof a.student === 'string' ? null : a.student;
        return (stu?.name ?? '').toLowerCase().includes(q)
          || (stu?.email ?? '').toLowerCase().includes(q);
      });
  }, [attempts, tab, query]);

  const studentLabel = (a: Attempt) => {
    if (!a.student || typeof a.student === 'string') return 'Unknown student';
    return a.student.name || a.student.email || 'Unknown student';
  };

  return (
    <AppLayout
      background="#F8FAFC"
      pageIcon={<BarChart2 size={18} />}
      pageTitle="Quiz Analytics"
      pageBreadcrumb={
        <>
          <button onClick={() => navigate('/quizzes')}>Quizzes</button>
          <ChevronRight size={11} />
          <span className="current">{quizTitle || 'Loading…'}</span>
        </>
      }
      pageActions={
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/quizzes')}>
          <ChevronLeft size={14} /> Back to quizzes
        </button>
      }
    >
      {loadError && (
        <div className="status-pill danger" style={{ marginBottom: '1rem', textTransform: 'none' }}>
          {loadError}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <h1 style={{ margin: '0 0 0.3rem', fontSize: '1.55rem', fontWeight: 800, color: '#0F172A' }}>
            {quizTitle || 'Quiz Analytics'}
          </h1>
          <p style={{ margin: 0, color: '#64748B', fontSize: '0.85rem' }}>
            Per-student attempts & performance.{maxMarks !== undefined ? ` Out of ${maxMarks} marks.` : ''}
          </p>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          <StatCard
            label="Total Attempts"
            value={loading ? '—' : String(metrics?.totalAttempts ?? attempts.length)}
            icon={<Users size={16} />}
            tone="#2563EB"
            bg="#EFF6FF"
          />
          <StatCard
            label="Submitted"
            value={loading ? '—' : String(metrics?.submitted ?? counts.submitted)}
            icon={<CheckCircle2 size={16} />}
            tone="#1D4ED8"
            bg="#DBEAFE"
          />
          <StatCard
            label="Graded"
            value={loading ? '—' : String(metrics?.graded ?? counts.graded)}
            icon={<Award size={16} />}
            tone="#15803D"
            bg="#DCFCE7"
          />
          <StatCard
            label="Avg. Score"
            value={loading ? '—' : (metrics ? metrics.avgScore.toFixed(2) : '—')}
            icon={<BarChart2 size={16} />}
            tone="#7C3AED"
            bg="#F3E8FF"
          />
        </div>

        {/* Filter tabs */}
        <div style={{
          display: 'inline-flex',
          background: '#F1F5F9', borderRadius: '0.65rem',
          padding: '0.3rem', gap: '0.2rem',
          alignSelf: 'flex-start',
        }}>
          {([
            { key: 'all',         label: 'All',         count: counts.all },
            { key: 'in_progress', label: 'In Progress', count: counts.in_progress },
            { key: 'submitted',   label: 'Submitted',   count: counts.submitted },
            { key: 'graded',      label: 'Graded',      count: counts.graded },
          ] as { key: FilterTab; label: string; count: number }[]).map(t => (
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
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.55rem',
          padding: '0.7rem 0.9rem',
          background: 'white', border: '1px solid #E2E8F0',
          borderRadius: '0.6rem',
          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)',
        }}>
          <Search size={14} color="#94A3B8" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search student name or email..."
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: '0.88rem', fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Attempts table */}
        <div style={{
          background: 'white', border: '1px solid #E2E8F0',
          borderRadius: '0.85rem', boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2.2fr 1fr 1.4fr 1.4fr 1fr',
            padding: '0.85rem 1.25rem',
            borderBottom: '1px solid #F1F5F9',
            fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.6px',
            color: '#64748B', textTransform: 'uppercase',
            background: '#FAFBFC',
          }}>
            <div>Student</div>
            <div>Status</div>
            <div>Submitted</div>
            <div>Duration</div>
            <div style={{ textAlign: 'right' }}>Score</div>
          </div>

          {loading ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748B', fontSize: '0.88rem' }}>
              <Loader2 size={16} className="animate-spin" /> Loading attempts…
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748B', fontSize: '0.88rem' }}>
              {attempts.length === 0
                ? 'No attempts yet — students haven\'t taken this quiz.'
                : 'No attempts match the current filter.'}
            </div>
          ) : filtered.map(a => {
            const pill = statusPill(a.status);
            return (
              <div
                key={a._id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2.2fr 1fr 1.4fr 1.4fr 1fr',
                  padding: '0.95rem 1.25rem',
                  borderBottom: '1px solid #F1F5F9',
                  fontSize: '0.85rem',
                  color: '#0F172A',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>{studentLabel(a)}</div>
                  {typeof a.student !== 'string' && a.student?.email && (
                    <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '0.1rem' }}>
                      {a.student.email}
                    </div>
                  )}
                </div>
                <div>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center',
                    background: pill.bg, color: pill.color,
                    fontSize: '0.66rem', fontWeight: 800,
                    padding: '0.2rem 0.55rem', borderRadius: '0.3rem',
                    letterSpacing: '0.4px',
                  }}>
                    {pill.label}
                  </span>
                </div>
                <div style={{ color: '#475569', fontSize: '0.82rem' }}>{fmtWhen(a.submittedAt)}</div>
                <div style={{ color: '#475569', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Clock size={12} color="#94A3B8" /> {fmtDuration(a.durationSeconds)}
                </div>
                <div style={{ textAlign: 'right', fontWeight: 800, color: 'var(--primary)' }}>
                  {typeof a.score === 'number'
                    ? (maxMarks !== undefined ? `${a.score} / ${maxMarks}` : a.score.toFixed(2))
                    : '—'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
};

const StatCard: React.FC<{
  label: string; value: string;
  icon: React.ReactNode; tone: string; bg: string;
}> = ({ label, value, icon, tone, bg }) => (
  <div style={{
    background: 'white', border: '1px solid #E2E8F0',
    borderRadius: 'var(--radius-lg)', padding: '1rem 1.1rem',
    display: 'flex', flexDirection: 'column', gap: '0.45rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </span>
      <span style={{
        width: 26, height: 26, borderRadius: '50%',
        background: bg, color: tone,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </span>
    </div>
    <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0F172A' }}>{value}</span>
  </div>
);
