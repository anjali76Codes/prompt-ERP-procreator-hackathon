import React, { useEffect, useState } from 'react';
import { UserCheck, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { fetchStudentOverview, type StudentOverview } from '../lib/studentOverview/api';
import { ApiError } from '../lib/api';

const AT_RISK_THRESHOLD = 75;

export const StudentAttendance: React.FC = () => {
  const [data, setData] = useState<StudentOverview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setData(await fetchStudentOverview());
      } catch (e) {
        // 401/403 = role mismatch / stale token. Don't shout — the page
        // already degrades to an empty state on its own.
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          setLoadError(null);
        } else {
          setLoadError(e instanceof ApiError ? e.message : 'Failed to load attendance');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const rows = data?.attendance ?? [];
  const overall = data?.metrics.overallAttendancePct ?? 0;
  const atRisk = rows.filter(r => r.pct < AT_RISK_THRESHOLD);

  return (
    <AppLayout
      background="#F8FAFC"
      pageIcon={<UserCheck size={18} />}
      pageTitle="My Attendance"
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
          <UserCheck size={26} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.6px', color: '#BFDBFE', textTransform: 'uppercase' }}>
            Overall Attendance
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.1, marginTop: 4 }}>
            {loading ? '—' : `${overall}%`}
          </div>
          <div style={{ fontSize: '0.82rem', color: '#DBEAFE', marginTop: 2 }}>
            {loading ? 'Loading…' :
              overall >= AT_RISK_THRESHOLD
                ? `Above the ${AT_RISK_THRESHOLD}% minimum — you're on track.`
                : `Below the ${AT_RISK_THRESHOLD}% minimum — talk to your faculty.`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.85rem' }}>
          <Stat label="Subjects" value={String(rows.length)} />
          <Stat label="At-Risk" value={String(atRisk.length)} tone={atRisk.length > 0 ? '#FCA5A5' : '#86EFAC'} />
        </div>
      </div>

      {/* Per-subject table */}
      <div className="card">
        <div className="card-header"><h3>Per-Subject Breakdown</h3></div>
        {loading ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748B', fontSize: '0.88rem' }}>
            <Loader2 size={16} className="animate-spin" /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748B', fontSize: '0.88rem' }}>
            No attendance records yet — they'll appear once your faculty marks a lecture.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {rows.map(r => {
              const ok = r.pct >= AT_RISK_THRESHOLD;
              return (
                <div key={r.subjectId} style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 2fr 1fr',
                  alignItems: 'center', gap: '1rem',
                  padding: '0.85rem 1rem',
                  border: `1px solid ${ok ? '#E2E8F0' : '#FECACA'}`,
                  background: ok ? 'white' : '#FEF2F2',
                  borderRadius: '0.6rem',
                }}>
                  <div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748B', letterSpacing: '0.4px' }}>
                      {r.subjectCode}
                    </div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0F172A' }}>
                      {r.subjectName}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                    <strong>{r.present}</strong> / {r.total} lectures
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: ok ? '#15803D' : '#B91C1C' }}>
                    {r.pct.toFixed(1)}%
                  </div>
                  <div style={{ height: 10, background: '#E2E8F0', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min(100, r.pct)}%`, height: '100%',
                      background: ok ? '#10B981' : '#EF4444',
                      transition: 'width 0.3s',
                    }} />
                  </div>
                  <div>
                    {ok ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', fontWeight: 800, color: '#15803D' }}>
                        <CheckCircle2 size={14} /> SAFE
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', fontWeight: 800, color: '#B91C1C' }}>
                        <AlertTriangle size={14} /> AT RISK
                      </span>
                    )}
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

const Stat: React.FC<{ label: string; value: string; tone?: string }> = ({ label, value, tone }) => (
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
    <div style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: 2, color: tone ?? 'white' }}>
      {value}
    </div>
  </div>
);
