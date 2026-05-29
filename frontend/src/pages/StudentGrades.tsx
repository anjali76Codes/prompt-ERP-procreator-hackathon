import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Loader2, Award, TrendingUp, FileQuestion } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { fetchStudentOverview, type StudentOverview, type StudentRecentAttempt } from '../lib/studentOverview/api';
import { ApiError } from '../lib/api';

const fmtWhen = (iso?: string): string => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
};

const statusPill = (status: StudentRecentAttempt['status']): { label: string; bg: string; color: string } => {
  if (status === 'graded')    return { label: 'GRADED',     bg: '#DCFCE7', color: '#15803D' };
  if (status === 'submitted') return { label: 'SUBMITTED',  bg: '#DBEAFE', color: '#1D4ED8' };
  return                              { label: 'IN PROGRESS', bg: '#FEF3C7', color: '#92400E' };
};

export const StudentGrades: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<StudentOverview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setData(await fetchStudentOverview());
      } catch (e) {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          setLoadError(null);
        } else {
          setLoadError(e instanceof ApiError ? e.message : 'Failed to load grades');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const attempts = data?.recentAttempts ?? [];
  const avgPct = data?.metrics.avgQuizScorePct ?? 0;
  const gradedCount = attempts.filter(a => typeof a.score === 'number').length;

  return (
    <AppLayout
      background="#F8FAFC"
      pageIcon={<GraduationCap size={18} />}
      pageTitle="My Grades"
      pageBreadcrumb="Academic"
    >
      {loadError && (
        <div className="status-pill danger" style={{ marginBottom: '1rem', textTransform: 'none' }}>
          {loadError}
        </div>
      )}

      {/* Summary banner */}
      <div style={{
        marginBottom: '1.25rem',
        background: 'linear-gradient(120deg, var(--primary) 0%, var(--primary-container) 100%)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem 1.5rem',
        color: 'white',
        display: 'flex', alignItems: 'center', gap: '1.25rem',
        boxShadow: '0 10px 30px -10px rgba(0, 74, 198, 0.4)',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Award size={28} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.6px', color: '#BFDBFE', textTransform: 'uppercase' }}>
            Average Score
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.1, marginTop: 4 }}>
            {loading ? '—' : `${avgPct}%`}
          </div>
          <div style={{ fontSize: '0.82rem', color: '#DBEAFE', marginTop: 2 }}>
            {loading ? 'Loading…'
              : gradedCount === 0
                ? 'No graded attempts yet — take a quiz to see your scores here.'
                : `Across ${gradedCount} graded attempt${gradedCount === 1 ? '' : 's'}`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.85rem' }}>
          <Stat label="Attempts" value={String(attempts.length)} />
          <Stat label="Graded" value={String(gradedCount)} />
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3><TrendingUp size={16} style={{ marginRight: 4, verticalAlign: '-2px' }} /> Recent Quiz Attempts</h3>
        </div>

        {loading ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748B' }}>
            <Loader2 size={16} className="animate-spin" /> Loading…
          </div>
        ) : attempts.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748B' }}>
            <FileQuestion size={32} color="#CBD5E1" style={{ marginBottom: 8 }} />
            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#334155' }}>
              No quiz attempts yet
            </div>
            <div style={{ fontSize: '0.82rem', marginTop: 4 }}>
              Head to <button
                onClick={() => navigate('/student/quizzes')}
                style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', padding: 0 }}
              >
                Quizzes
              </button> to start one.
            </div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2.2fr 1fr 1.4fr 1fr',
            padding: '0.6rem 1rem',
            background: '#FAFBFC',
            borderRadius: '0.5rem',
            fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.5px',
            color: '#64748B', textTransform: 'uppercase',
            marginBottom: '0.5rem',
          }}>
            <div>Quiz</div>
            <div>Status</div>
            <div>Submitted</div>
            <div style={{ textAlign: 'right' }}>Score</div>
          </div>
        )}

        {!loading && attempts.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {attempts.map(a => {
              const pill = statusPill(a.status);
              return (
                <div key={a.attemptId} style={{
                  display: 'grid',
                  gridTemplateColumns: '2.2fr 1fr 1.4fr 1fr',
                  alignItems: 'center', gap: '0.6rem',
                  padding: '0.75rem 1rem',
                  border: '1px solid #E2E8F0',
                  borderRadius: '0.55rem',
                  background: 'white',
                }}>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F172A' }}>
                      {a.quizTitle}
                    </div>
                    {a.subjectLabel && (
                      <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: 2 }}>
                        {a.subjectLabel}
                      </div>
                    )}
                  </div>
                  <div>
                    <span style={{
                      display: 'inline-flex',
                      background: pill.bg, color: pill.color,
                      fontSize: '0.66rem', fontWeight: 800,
                      padding: '0.2rem 0.55rem', borderRadius: '0.3rem',
                      letterSpacing: '0.4px',
                    }}>
                      {pill.label}
                    </span>
                  </div>
                  <div style={{ color: '#475569', fontSize: '0.82rem' }}>{fmtWhen(a.submittedAt)}</div>
                  <div style={{ textAlign: 'right', fontWeight: 800, color: 'var(--primary)' }}>
                    {typeof a.score === 'number'
                      ? (a.maxMarks !== undefined ? `${a.score} / ${a.maxMarks}` : a.score.toFixed(2))
                      : '—'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{
    minWidth: 76,
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: '0.55rem',
    padding: '0.55rem 0.85rem',
    textAlign: 'center',
  }}>
    <div style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.6px', color: '#BFDBFE', textTransform: 'uppercase' }}>
      {label}
    </div>
    <div style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: 2, color: 'white' }}>
      {value}
    </div>
  </div>
);
