import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserCheck, Calendar as CalIcon, Bell, Settings, Plus, TrendingUp,
  AlertCircle, RefreshCw, Search, Mail, FileSpreadsheet, ChevronRight,
  AlertTriangle, FileUp, Clock, BookOpen,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';

interface MetricDef {
  label: string;
  val: string;
  tag: string;
  tagClass: string;
  icon: React.ReactNode;
}

const METRICS: MetricDef[] = [
  { label: 'Total Lectures',     val: '1,284', tag: '+4%',    tagClass: 'success', icon: <BookOpen size={20} color="var(--primary)" /> },
  { label: 'Pending Submissions',val: '12',    tag: 'High',   tagClass: 'danger',  icon: <FileSpreadsheet size={20} color="#EF4444" /> },
  { label: 'Avg. Attendance',    val: '82.4%', tag: 'Stable', tagClass: 'success', icon: <TrendingUp size={20} color="#10B981" /> },
  { label: 'Below 75%',          val: '48',    tag: '+2',     tagClass: 'warning', icon: <AlertCircle size={20} color="#F97316" /> },
  { label: 'Pending Corrections',val: '08',    tag: 'Normal', tagClass: 'muted',   icon: <RefreshCw size={20} color="#64748B" /> },
];

interface LectureRow {
  code: string;
  name: string;
  div: string;
  time: string;
  room: string;
  status: 'Submitted' | 'Pending' | 'Draft' | 'Upcoming';
}

const LECTURES: LectureRow[] = [
  { code: 'CS-401 | Core Subject', name: 'Data Structures & Algorithms', div: 'Div A (G1)',   time: '09:00 - 10:00', room: 'Lab 402',        status: 'Submitted' },
  { code: 'CS-402 | Theory',       name: 'Operating Systems',            div: 'Div B (Full)', time: '10:15 - 11:15', room: 'Hall 12B',       status: 'Pending'   },
  { code: 'EL-408 | Elective',     name: 'Machine Learning Foundations', div: 'Div A (Full)', time: '11:30 - 12:30', room: 'Smart Class 1',  status: 'Draft'     },
  { code: 'CS-304 | Theory',       name: 'Database Management',          div: 'Div C (G2)',   time: '14:00 - 15:00', room: 'Hall 05A',       status: 'Upcoming'  },
];

const STATUS_CLASS: Record<LectureRow['status'], string> = {
  Submitted: 'success',
  Pending:   'danger',
  Draft:     'muted',
  Upcoming:  'muted',
};

export const AttendanceOverview: React.FC = () => {
  const navigate = useNavigate();
  const [term, setTerm] = useState<'Fall 2023' | 'Spring 2024'>('Fall 2023');

  const TopBarSlot = (
    <div className="dashboard-topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <UserCheck size={22} color="var(--primary)" /> Attendance Overview
        </span>
        <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.4rem', borderLeft: '1px solid #E2E8F0', paddingLeft: '1rem' }}>
          <CalIcon size={14} /> AY 2023-24 <span style={{ color: '#94A3B8' }}>•</span> Semester VII
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <div className="filter-group">
          <button className={term === 'Fall 2023' ? 'active' : ''} onClick={() => setTerm('Fall 2023')}>Fall 2023</button>
          <button className={term === 'Spring 2024' ? 'active' : ''} onClick={() => setTerm('Spring 2024')}>Spring 2024</button>
        </div>

        <button className="btn btn-primary" onClick={() => navigate('/attendance/mark')}>
          <Plus size={16} /> Mark Attendance
        </button>

        <div className="topbar-icons" style={{ borderLeft: '1px solid #E2E8F0', paddingLeft: '1.25rem' }}>
          <Bell size={20} />
          <Settings size={20} />
        </div>
      </div>
    </div>
  );

  return (
    <AppLayout topBar={TopBarSlot} background="#F8FAFC">
      <div className="stack-lg">
        {/* Row 1: Metric cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
          {METRICS.map((m) => (
            <div key={m.label} className="metric-card">
              <div className="metric-card-body">
                <span className="metric-card-label">{m.label}</span>
                <span className="metric-card-value">{m.val}</span>
              </div>
              <div className="metric-card-aside">
                <div className="metric-card-icon">{m.icon}</div>
                <span className={`status-pill ${m.tagClass}`}>{m.tag}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Row 2: Main two-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '62% 35.5%', gap: '2.5%', alignItems: 'flex-start' }}>
          {/* LEFT */}
          <div className="stack-lg">
            <div className="card">
              <div className="card-header">
                <h3>Today's Scheduled Lectures</h3>
                <button
                  className="alert-row-cta"
                  onClick={() => navigate('/schedule')}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  View Full Calendar <ChevronRight size={14} />
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Division</th>
                      <th>Time</th>
                      <th>Room</th>
                      <th>Status</th>
                      <th className="right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {LECTURES.map((lec, idx) => (
                      <tr key={idx}>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <span className="strong">{lec.name}</span>
                            <span style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600 }}>{lec.code}</span>
                          </div>
                        </td>
                        <td className="num">{lec.div}</td>
                        <td className="num">{lec.time}</td>
                        <td className="num">{lec.room}</td>
                        <td>
                          <span className={`status-pill ${STATUS_CLASS[lec.status]}`}>{lec.status}</span>
                        </td>
                        <td className="right">
                          {lec.status === 'Pending' ? (
                            <button className="btn btn-primary btn-sm" onClick={() => navigate('/attendance/mark')}>Mark</button>
                          ) : lec.status === 'Upcoming' ? null : (
                            <button
                              className="btn btn-secondary btn-icon-only"
                              aria-label="Edit"
                              onClick={() => navigate('/attendance/mark')}
                            >
                              ✏️
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>Quick Attendance Actions</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                {[
                  { label: 'Upload CSV',       icon: <FileUp size={22} color="var(--primary)" />,  onClick: () => alert('CSV upload coming soon') },
                  { label: 'Search Student',   icon: <Search size={22} color="var(--primary)" />,  onClick: () => navigate('/directory') },
                  { label: 'View History',     icon: <Clock size={22} color="var(--primary)" />,   onClick: () => navigate('/attendance/analytics') },
                  { label: 'Notify Absentees', icon: <Mail size={22} color="var(--primary)" />,    onClick: () => alert('Absent-student notifications queued') },
                ].map(act => (
                  <button
                    key={act.label}
                    onClick={act.onClick}
                    className="card card-compact"
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}
                  >
                    <div style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {act.icon}
                    </div>
                    <span style={{ fontSize: '0.775rem', fontWeight: 700, color: '#334155' }}>{act.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="stack-lg">
            <div className="card">
              <div className="card-header">
                <h3 style={{ fontSize: '1rem' }}>Operational Alerts</h3>
                <span className="status-pill dark">5 ACTIONABLE</span>
              </div>

              <div className="alert-list">
                <div className="alert-row danger">
                  <div className="alert-row-icon"><AlertTriangle size={14} color="#EF4444" /></div>
                  <div>
                    <h4 className="alert-row-title">Critical Low Attendance</h4>
                    <p className="alert-row-desc">12 students in Division A have dropped below 60% attendance this month.</p>
                    <button className="alert-row-cta" onClick={() => navigate('/attendance/analytics')}>Review List</button>
                  </div>
                </div>

                <div className="alert-row info">
                  <div className="alert-row-icon"><RefreshCw size={14} color="var(--primary)" /></div>
                  <div>
                    <h4 className="alert-row-title">Sync Error: Biometric 04</h4>
                    <p className="alert-row-desc">Biometric logs from Lab 402 failed to sync with the ERP core server.</p>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-primary btn-xs" onClick={() => alert('Sync retry queued')}>Retry Sync</button>
                      <button className="btn btn-secondary btn-xs">Dismiss</button>
                    </div>
                  </div>
                </div>

                <div className="alert-row">
                  <div className="alert-row-icon"><AlertCircle size={14} color="#64748B" /></div>
                  <div>
                    <h4 className="alert-row-title">Correction Requested</h4>
                    <p className="alert-row-desc">Student #CS22094 submitted an attendance grievance for 12/10/2023.</p>
                    <button className="alert-row-cta" onClick={() => navigate('/attendance/validate')}>Investigate</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <span className="section-eyebrow">Department Summary</span>
              <div className="stack-md" style={{ marginTop: '1rem' }}>
                {[
                  { dept: 'COMP SCI',   pct: 88, color: '#10B981' },
                  { dept: 'ELECTRONICS',pct: 74, color: '#EF4444' },
                  { dept: 'MECH ENG',   pct: 82, color: 'var(--primary)' },
                ].map((item) => (
                  <div key={item.dept} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
                      <span>{item.dept}</span>
                      <span>{item.pct}%</span>
                    </div>
                    <div style={{ height: 6, width: '100%', backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${item.pct}%`, height: '100%', backgroundColor: item.color, borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
