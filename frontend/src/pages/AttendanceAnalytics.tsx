import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, ChevronRight, UserCheck } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { useAttendance } from '../lib/AttendanceContext';

const RANGES = ['Last 30 Days', 'Current Term', 'Full Year'] as const;
type RangeKey = typeof RANGES[number];

interface DefaulterRow {
  name: string;
  id: string;
  grade: string;
  pct: number;
  details: string;
  color: string;
  initials: string;
}

const TOP_DEFAULTERS: DefaulterRow[] = [
  { name: 'Jameson Dunn',  id: '#2024-089', grade: 'Grade 11-B', pct: 42, details: 'Absent for 4 consecutive days', color: '#EF4444', initials: 'JD' },
  { name: 'Sarah Kinsley', id: '#2024-112', grade: 'Grade 10-A', pct: 51, details: 'Irregular patterns detected',   color: '#F59E0B', initials: 'SK' },
];

export const AttendanceAnalytics: React.FC = () => {
  const navigate = useNavigate();
  const { session } = useAttendance();
  const [range, setRange] = useState<RangeKey>('Last 30 Days');

  const healthScore = 82;
  const dashLenLg = 364.42;
  const wasJustValidated = session.validated;

  return (
    <AppLayout
      background="#F8FAFC"
      pageIcon={<UserCheck size={18} />}
      pageTitle="Attendance Analytics"
      pageBreadcrumb={
        <>
          <button onClick={() => navigate('/attendance')}>Attendance</button>
          <ChevronRight size={11} />
          <span className="current">Analytics &amp; Reports</span>
        </>
      }
      pageActions={
        <>
          <div className="filter-group">
            {RANGES.map(r => (
              <button key={r} className={range === r ? 'active' : ''} onClick={() => setRange(r)}>{r}</button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={() => alert('Custom range picker coming soon')}>
            Custom Range
          </button>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '32% 65.5%', gap: '2.5%', alignItems: 'flex-start' }}>
        {/* LEFT column */}
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
                  cx="75" cy="75" r="58" fill="none" stroke="#10B981" strokeWidth="12"
                  strokeDasharray={dashLenLg}
                  strokeDashoffset={dashLenLg - (dashLenLg * healthScore) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '2rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-1px' }}>{healthScore}%</span>
                <span style={{ fontSize: '0.7rem', color: '#10B981', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>GOOD</span>
              </div>
            </div>

            <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #D1FAE5', borderRadius: 'var(--radius-md)', padding: '0.85rem', marginTop: '1.5rem', width: '100%', boxSizing: 'border-box' }}>
              <p style={{ margin: 0, fontSize: '0.775rem', color: '#15803D', lineHeight: 1.4, fontWeight: 500 }}>
                <strong style={{ color: '#166534' }}>+2.4%</strong> improvement since last month. Overall retention is trending positive across all departments.
              </p>
            </div>

            {wasJustValidated && (
              <div className="status-pill success" style={{ marginTop: '1rem' }}>
                ✓ Latest session validated
              </div>
            )}
          </div>

          <div className="card">
            <span className="section-eyebrow">Defaulter Distribution</span>
            <div className="stack-md" style={{ marginTop: '1rem' }}>
              {[
                { range: '75-80% Attendance', count: 124, pct: 67, color: '#10B981' },
                { range: '60-75% Attendance', count: 48,  pct: 26, color: 'var(--primary)' },
                { range: 'Below 60%',         count: 12,  pct: 7,  color: '#EF4444' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
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
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 100, paddingTop: '1rem', paddingBottom: '0.5rem', marginTop: '0.75rem' }}>
              {[
                { sub: 'CS-401', h: 84, color: '#10B981' },
                { sub: 'CS-402', h: 68, color: '#F59E0B' },
                { sub: 'EL-408', h: 92, color: 'var(--primary)' },
                { sub: 'CS-304', h: 76, color: '#8B5CF6' },
              ].map((s, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', width: '20%' }}>
                  <div style={{ width: '100%', height: `${s.h}px`, backgroundColor: s.color, borderRadius: '0.25rem 0.25rem 0 0', position: 'relative' }}>
                    <span style={{ position: 'absolute', top: -14, left: 0, right: 0, textAlign: 'center', fontSize: '0.625rem', fontWeight: 800, color: '#475569' }}>{s.h}%</span>
                  </div>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B' }}>{s.sub}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT column */}
        <div className="stack-lg">
          <div className="card">
            <div className="card-header">
              <h3>Monthly Attendance Trend</h3>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', fontWeight: 700 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#64748B' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--primary)' }} /> Present
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#64748B' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#EF4444' }} /> Absent
                </span>
              </div>
            </div>

            <div style={{ position: 'relative', width: '100%', height: 180, borderBottom: '1.5px solid #F1F5F9', borderLeft: '1.5px solid #F1F5F9', marginTop: '1rem', boxSizing: 'border-box' }}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: `${i * 45}px`, borderTop: '1px dashed #F1F5F9' }} />
              ))}
              <svg width="100%" height="100%" viewBox="0 0 500 180" preserveAspectRatio="none" style={{ position: 'absolute', top: 0, left: 0 }}>
                <path d="M 20 40 Q 100 20, 180 50 T 340 30 T 480 45" fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" />
                <path d="M 20 40 Q 100 20, 180 50 T 340 30 T 480 45 L 480 180 L 20 180 Z" fill="url(#blue-grad)" opacity="0.05" />
                <path d="M 20 140 Q 100 120, 180 150 T 340 160 T 480 135" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
                <defs>
                  <linearGradient id="blue-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" />
                    <stop offset="100%" stopColor="white" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '1rem', paddingRight: '1rem', fontSize: '0.725rem', fontWeight: 700, color: '#94A3B8', marginTop: '1.25rem' }}>
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map(m => <span key={m}>{m}</span>)}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Top 10 Attendance Defaulters</h3>
              <button className="alert-row-cta" onClick={() => navigate('/directory')}>View All Students</button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Roll No.</th>
                    <th>Grade</th>
                    <th>Attendance %</th>
                    <th className="right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {TOP_DEFAULTERS.map((row, idx) => (
                    <tr key={idx}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', backgroundColor: '#F1F5F9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.775rem' }}>
                            {row.initials}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                            <span className="strong">{row.name}</span>
                            <span style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600 }}>{row.details}</span>
                          </div>
                        </div>
                      </td>
                      <td className="num">{row.id}</td>
                      <td className="num">{row.grade}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: 120 }}>
                          <span style={{ fontSize: '0.815rem', fontWeight: 800, color: row.color, width: 35 }}>{row.pct}%</span>
                          <div style={{ flex: 1, height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${row.pct}%`, height: '100%', backgroundColor: row.color, borderRadius: 3 }} />
                          </div>
                        </div>
                      </td>
                      <td className="right">
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => alert(`Parent of ${row.name} notified successfully.`)}
                        >
                          Notify Parent
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
