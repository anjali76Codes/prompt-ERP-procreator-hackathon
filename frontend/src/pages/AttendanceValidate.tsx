import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, FileText, ShieldCheck, BarChart2,
  SlidersHorizontal, ArrowUpRight, Bell, Settings,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { useAttendance } from '../lib/AttendanceContext';

interface CheckRow {
  name: string;
  major: string;
  avatar: string;
  id: string;
  check: string;
  status: 'PRESENT' | 'MISSING DOCS' | 'LATE (12M)';
  trend: number[];
}

const SAMPLE_DETAIL: CheckRow[] = [
  { name: 'Julian Thorne', major: 'Economics Major',  avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&h=80&q=80', id: '#2024-8842-TR', check: '08:54 AM', status: 'PRESENT',      trend: [16, 22, 28] },
  { name: 'Maya Sterling', major: 'Finance Minor',    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&h=80&q=80', id: '#2024-3119-MS', check: '—',        status: 'MISSING DOCS', trend: [24, 18, 12] },
  { name: 'Arthur Linden', major: 'Business Admin',   avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=80&h=80&q=80', id: '#2024-5521-AL', check: '09:12 AM', status: 'LATE (12M)',   trend: [14, 20, 20] },
];

const STATUS_CLASS: Record<CheckRow['status'], string> = {
  PRESENT: 'success',
  'MISSING DOCS': 'danger',
  'LATE (12M)': 'info',
};
const STATUS_FG: Record<CheckRow['status'], string> = {
  PRESENT: '#10B981',
  'MISSING DOCS': '#EF4444',
  'LATE (12M)': 'var(--primary)',
};

export const AttendanceValidate: React.FC = () => {
  const navigate = useNavigate();
  const { session, presentCount, absentCount, markValidated } = useAttendance();
  const { lecture } = session;

  const TopBarSlot = (
    <div className="dashboard-topbar">
      <div className="page-title-block">
        <span className="status-pill info" style={{ alignSelf: 'flex-start' }}>ACTIVE REVIEW SESSION</span>
        <h1 style={{ marginTop: '0.15rem' }}>Advanced Macroeconomics (ECON-402)</h1>
        <div className="page-title-meta">
          <span>Section B</span>
          <span className="dot">•</span>
          <span>Semester 2</span>
          <span className="dot">•</span>
          <span style={{ color: 'var(--primary)' }}>Final Review Phase</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <div style={{ backgroundColor: '#025793', borderRadius: 'var(--radius-md)', padding: '0.5rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', color: 'white', boxShadow: '0 4px 10px rgba(2,87,147,0.15)' }}>
          <div>
            <div style={{ fontSize: '0.575rem', fontWeight: 700, color: '#93C5FD', textTransform: 'uppercase', letterSpacing: '0.5px' }}>CURRENT VALIDATION RATE</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginTop: '0.1rem' }}>
              <span style={{ fontSize: '1.45rem', fontWeight: 800 }}>92.4%</span>
              <span style={{ fontSize: '0.675rem', color: '#6EE7B7', fontWeight: 700 }}>+2.1% from previous week</span>
            </div>
          </div>
          <div style={{ width: 34, height: 34, borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BarChart2 size={16} color="white" />
          </div>
        </div>

        <div className="topbar-icons" style={{ borderLeft: '1px solid #E2E8F0', paddingLeft: '1.25rem' }}>
          <Bell size={20} />
          <Settings size={20} />
        </div>
      </div>
    </div>
  );

  const BottomBar = (
    <div className="action-bar dark">
      <span className="action-bar-note" style={{ color: '#CBD5E1' }}>
        <span style={{ color: '#38BDF8', fontSize: '1.15rem' }}>✔</span>
        Ready for Validation: <strong style={{ color: 'white' }}>{presentCount + absentCount} records ready</strong>.
        {' '}2 discrepancies require manual resolution.
      </span>
      <div className="action-bar-actions">
        <button
          className="btn"
          style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#E2E8F0' }}
          onClick={() => navigate('/attendance/mark')}
        >
          Discard
        </button>
        <button
          className="btn btn-primary"
          onClick={() => { markValidated(); navigate('/attendance/analytics'); }}
        >
          Confirm & Submit <ArrowUpRight size={15} />
        </button>
      </div>
    </div>
  );

  return (
    <AppLayout topBar={TopBarSlot} bottomBar={BottomBar} background="#F8FAFC">
      <div className="stack-lg">
        {/* Subheader info row */}
        <div className="card card-compact" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1.25rem' }}>
          {[
            { label: 'DATE',     val: lecture.date,     icon: '📅' },
            { label: 'ROOM',     val: lecture.room,     icon: '🏢' },
            { label: 'TIME SLOT',val: lecture.timeSlot, icon: '⏰' },
            { label: 'FACULTY',  val: lecture.facultyName, icon: '👨‍🏫' },
            {
              label: 'ENROLLMENT COUNT',
              icon: '👥',
              val: (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>{lecture.totalEnrolled}</span>
                  <span className="status-pill success">{presentCount} Present</span>
                  <span className="status-pill danger">{absentCount} Absent</span>
                </div>
              ),
            },
          ].map((col, idx) => (
            <div key={idx} style={{ borderLeft: idx > 0 ? '1px solid #F1F5F9' : 'none', paddingLeft: idx > 0 ? '1.25rem' : '0' }}>
              <div style={{ fontSize: '0.625rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{col.label}</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E293B', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ opacity: 0.6 }}>{col.icon}</span> {col.val}
              </div>
            </div>
          ))}
        </div>

        {/* Critical Validation Checks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            🛡️ Critical Validation Checks
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
            <div className="card card-compact" style={{ backgroundColor: '#FFF5F5', borderColor: '#FEB2B2', display: 'flex', flexDirection: 'column', minHeight: 140 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', backgroundColor: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={16} color="#EF4444" />
                </div>
                <button
                  className="btn btn-sm"
                  style={{ backgroundColor: '#9B2C2C', color: 'white' }}
                  onClick={() => alert('Discrepancies resolved')}
                >
                  Resolve (2)
                </button>
              </div>
              <div style={{ marginTop: '1rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 800, color: '#9B2C2C' }}>Data Discrepancies</h4>
                <p style={{ margin: '0.3rem 0 0', fontSize: '0.775rem', color: '#C53030', lineHeight: 1.45 }}>
                  Mismatched check-in timestamps detected for students crossing building boundaries.
                </p>
              </div>
            </div>

            <div className="card card-compact" style={{ display: 'flex', flexDirection: 'column', minHeight: 140 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', backgroundColor: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={16} color="var(--primary)" />
                </div>
                <span className="status-pill warning">Required: 4</span>
              </div>
              <div style={{ marginTop: '1rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 800, color: '#334155' }}>Missing Leave Docs</h4>
                <p style={{ margin: '0.3rem 0 0', fontSize: '0.775rem', color: '#64748B', lineHeight: 1.45 }}>
                  Students marked as "Medical" but haven't uploaded verification certificates.
                </p>
              </div>
            </div>

            <div className="card card-compact" style={{ display: 'flex', flexDirection: 'column', minHeight: 140 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', backgroundColor: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={16} color="#10B981" />
                </div>
                <span className="status-pill success">Secure</span>
              </div>
              <div style={{ marginTop: '1rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 800, color: '#334155' }}>Scan Integrity</h4>
                <p style={{ margin: '0.3rem 0 0', fontSize: '0.775rem', color: '#64748B', lineHeight: 1.45 }}>
                  All RFID scan points validated with 0ms latency drop. No manual overrides detected.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Class Roll Details Table */}
        <div className="card">
          <div className="card-header">
            <h3>Class Roll Details</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary btn-sm">
                <SlidersHorizontal size={12} /> Filters
              </button>
              <button className="btn btn-secondary btn-sm">📤 Export</button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student Profile</th>
                  <th>Enrollment ID</th>
                  <th className="center">Previous Trend</th>
                  <th>Check-In</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {SAMPLE_DETAIL.map((row, idx) => (
                  <tr key={idx}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <img src={row.avatar} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                          <span className="strong">{row.name}</span>
                          <span style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600 }}>{row.major}</span>
                        </div>
                      </div>
                    </td>
                    <td className="num">{row.id}</td>
                    <td className="center">
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 3, height: 24, width: 60, margin: '0 auto' }}>
                        {row.trend.map((h, i) => (
                          <div key={i} style={{ width: 6, height: `${h}px`, backgroundColor: STATUS_FG[row.status], borderRadius: 1 }} />
                        ))}
                      </div>
                    </td>
                    <td className="num">{row.check}</td>
                    <td>
                      <span className={`status-pill ${STATUS_CLASS[row.status]}`}>{row.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F1F5F9', marginTop: '1rem', paddingTop: '1rem', fontSize: '0.775rem', color: '#64748B', fontWeight: 600 }}>
            <span>Showing 1-{SAMPLE_DETAIL.length} of {lecture.totalEnrolled} students</span>
            <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
              <button className="btn btn-secondary btn-icon-only btn-xs">&lt;</button>
              <button className="btn btn-primary btn-xs" style={{ width: 26, height: 26, padding: 0 }}>1</button>
              <button className="btn btn-secondary btn-xs" style={{ width: 26, height: 26, padding: 0 }}>2</button>
              <button className="btn btn-secondary btn-xs" style={{ width: 26, height: 26, padding: 0 }}>3</button>
              <button className="btn btn-secondary btn-icon-only btn-xs">&gt;</button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
