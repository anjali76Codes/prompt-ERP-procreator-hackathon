import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, UserCheck, FileDown } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { useAttendance } from '../lib/AttendanceContext';
import {
  fetchDivisionStats, fetchDivisionSubjectAverages, downloadDivisionReportPdf,
} from '../lib/erp/api';
import type { DivisionStatRow, SubjectAverageRow } from '../lib/erp/types';
import { ApiError } from '../lib/api';

export const AttendanceAnalytics: React.FC = () => {
  const navigate = useNavigate();
  const { divisions, divisionId, selectDivision } = useAttendance();
  const [stats, setStats] = useState<DivisionStatRow[]>([]);
  const [subjectAvgs, setSubjectAvgs] = useState<SubjectAverageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!divisionId) { setStats([]); setSubjectAvgs([]); return; }
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchDivisionStats(divisionId), fetchDivisionSubjectAverages(divisionId)])
      .then(([s, a]) => { if (!cancelled) { setStats(s); setSubjectAvgs(a); } })
      .catch(e => { if (!cancelled) setError(e instanceof ApiError ? e.message : 'Failed to load stats'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [divisionId]);

  const healthScore = stats.length
    ? Math.round(stats.reduce((a, s) => a + s.pct, 0) / stats.length)
    : 0;
  const dashLenLg = 364.42;

  const distribution = [
    { range: '75-100% Attendance', count: stats.filter(s => s.pct >= 75).length, color: '#10B981' },
    { range: '60-75% Attendance',  count: stats.filter(s => s.pct >= 60 && s.pct < 75).length, color: 'var(--primary)' },
    { range: 'Below 60%',          count: stats.filter(s => s.pct < 60).length, color: '#EF4444' },
  ];
  const totalStudents = stats.length || 1;
  const distributionWithPct = distribution.map(d => ({ ...d, pct: Math.round((d.count / totalStudents) * 100) }));

  const defaulters = stats.filter(s => s.pct < 75).slice(0, 10);

  return (
    <AppLayout
      background="#F8FAFC"
      pageIcon={<UserCheck size={18} />}
      pageTitle="Attendance Analytics"
      pageBreadcrumb={
        <>
          <button onClick={() => navigate('/attendance')}>Attendance</button>
          <span> · </span>
          <select
            value={divisionId ?? ''}
            onChange={e => selectDivision(e.target.value || null)}
            style={{ fontSize: '0.75rem', border: '1px solid #E2E8F0', padding: '0.2rem 0.4rem', borderRadius: 4 }}
          >
            {divisions.map(d => <option key={d._id} value={d._id}>{d.code}</option>)}
          </select>
        </>
      }
      pageActions={
        <>
          <span className="status-pill info" style={{ fontSize: '0.625rem' }}>
            {stats.length} students · avg {healthScore}%
          </span>
          <button
            className="btn btn-secondary btn-sm"
            disabled={!divisionId}
            onClick={async () => {
              if (!divisionId) return;
              const code = divisions.find(d => d._id === divisionId)?.code ?? 'division';
              try { await downloadDivisionReportPdf(divisionId, code); }
              catch (e) { setError(e instanceof ApiError ? e.message : 'PDF download failed'); }
            }}
          >
            <FileDown size={14} /> Export PDF
          </button>
        </>
      }
    >
      {error && <div className="status-pill danger" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '32% 65.5%', gap: '2.5%', alignItems: 'flex-start' }}>
        {/* Left */}
        <div className="stack-lg">
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="card-header" style={{ width: '100%', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#334155' }}>Attendance Health Score</span>
              <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp size={14} color="#10B981" />
              </div>
            </div>

            <div style={{ position: 'relative', width: 150, height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="150" height="150" viewBox="0 0 150 150" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="75" cy="75" r="58" fill="none" stroke="#E2E8F0" strokeWidth="12" />
                <circle
                  cx="75" cy="75" r="58" fill="none"
                  stroke={healthScore >= 80 ? '#10B981' : healthScore >= 65 ? 'var(--primary)' : '#EF4444'}
                  strokeWidth="12"
                  strokeDasharray={dashLenLg}
                  strokeDashoffset={dashLenLg - (dashLenLg * healthScore) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '2rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-1px' }}>{healthScore}%</span>
                <span style={{ fontSize: '0.7rem', color: healthScore >= 80 ? '#10B981' : '#F97316', fontWeight: 800, textTransform: 'uppercase' }}>
                  {healthScore >= 80 ? 'Healthy' : healthScore >= 65 ? 'Watch' : 'Critical'}
                </span>
              </div>
            </div>
          </div>

          <div className="card">
            <span className="section-eyebrow">Defaulter Distribution</span>
            <div className="stack-md" style={{ marginTop: '1rem' }}>
              {distributionWithPct.map((item) => (
                <div key={item.range} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
                    <span>{item.range}</span>
                    <span>{item.count} Students</span>
                  </div>
                  <div style={{ height: 8, width: '100%', backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${item.pct}%`, height: '100%', backgroundColor: item.color, borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <span className="section-eyebrow">Subject Comparison</span>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 120, paddingTop: '1rem', paddingBottom: '0.5rem', marginTop: '0.75rem' }}>
              {subjectAvgs.map((s) => (
                <div key={s.subjectId} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', width: `${100 / Math.max(subjectAvgs.length, 1)}%` }}>
                  <div style={{
                    width: '60%', height: `${s.pct}%`,
                    backgroundColor: s.pct >= 80 ? '#10B981' : s.pct >= 65 ? 'var(--primary)' : '#EF4444',
                    borderRadius: '0.25rem 0.25rem 0 0', position: 'relative',
                  }}>
                    <span style={{ position: 'absolute', top: -14, left: 0, right: 0, textAlign: 'center', fontSize: '0.625rem', fontWeight: 800, color: '#475569' }}>
                      {Math.round(s.pct)}%
                    </span>
                  </div>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B' }}>{s.code}</span>
                </div>
              ))}
              {subjectAvgs.length === 0 && (
                <div style={{ color: '#64748B', fontSize: '0.8rem' }}>No subject data yet.</div>
              )}
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="stack-lg">
          <div className="card">
            <div className="card-header">
              <h3>Top Attendance Defaulters</h3>
              <span className="status-pill danger">{defaulters.length}</span>
            </div>

            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>Loading…</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Roll</th>
                      <th>Attendance %</th>
                      <th>P / Total</th>
                      <th className="right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {defaulters.length === 0 && (
                      <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>No students below 75%. 🎉</td></tr>
                    )}
                    {defaulters.map(row => {
                      const colour = row.pct < 60 ? '#EF4444' : '#F59E0B';
                      return (
                        <tr key={row.studentId}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div style={{ width: 34, height: 34, borderRadius: '50%', backgroundColor: '#F1F5F9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.775rem' }}>
                                {row.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                              </div>
                              <span className="strong">{row.name}</span>
                            </div>
                          </td>
                          <td className="num">{row.rollNumber ?? '—'}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: 140 }}>
                              <span style={{ fontSize: '0.815rem', fontWeight: 800, color: colour, width: 40 }}>{Math.round(row.pct)}%</span>
                              <div style={{ flex: 1, height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ width: `${row.pct}%`, height: '100%', backgroundColor: colour, borderRadius: 3 }} />
                              </div>
                            </div>
                          </td>
                          <td className="num">{row.present} / {row.total}</td>
                          <td className="right">
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => alert(`Parent of ${row.name} notified.`)}
                            >
                              Notify Parent
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="btn"
              style={{ backgroundColor: '#1E293B', color: 'white' }}
              onClick={() => navigate('/attendance')}
            >
              ✔ Back to Overview
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
