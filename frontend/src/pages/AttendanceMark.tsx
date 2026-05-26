import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { useAttendance } from '../lib/AttendanceContext';

const SHORTAGE_ALERTS = [
  { name: 'Bella Carson',  pct: 68,   initials: 'BC' },
  { name: 'Ethan Hunt',    pct: 72,   initials: 'EH' },
  { name: 'George Miller', pct: 74.5, initials: 'GM' },
];

export const AttendanceMark: React.FC = () => {
  const navigate = useNavigate();
  const {
    session, setAllStatus, toggleStatus, toggleLate, updateRemarks,
    saveDraft, presentCount, absentCount, presentPct,
  } = useAttendance();
  const { lecture, roster, draftSavedAt } = session;

  const dashLen = 339.29;

  const TopBarSlot = (
    <div className="dashboard-topbar">
      <div className="page-title-block">
        <div className="breadcrumbs">
          <button onClick={() => navigate('/attendance')}>Attendance</button>
          <ChevronRight size={12} />
          <span className="current">Mark Entry</span>
        </div>
        <h1>{lecture.subject}</h1>
        <div className="page-title-meta">
          <span>👥 {lecture.section}</span>
          <span className="dot">•</span>
          <span>⏰ {lecture.timeSlot}</span>
          <span className="dot">•</span>
          <span>📅 {lecture.date}</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button className="btn btn-primary" onClick={() => setAllStatus('P')}>
          <Check size={14} /> Mark All Present
        </button>
        <button className="btn btn-secondary" onClick={() => setAllStatus('A')}>
          <X size={14} /> Mark All Absent
        </button>
        <button className="btn btn-secondary btn-icon-only" aria-label="Filters">
          <SlidersHorizontal size={15} />
        </button>
      </div>
    </div>
  );

  const BottomBar = (
    <div className="action-bar">
      <span className="action-bar-note" style={{ fontStyle: 'italic' }}>
        💾 Draft last saved at {draftSavedAt ?? '—'}
      </span>
      <div className="action-bar-actions">
        <button className="btn btn-ghost" onClick={saveDraft}>Save Draft</button>
        <button className="btn btn-secondary">Review Attendance</button>
        <button
          className="btn btn-primary"
          onClick={() => { saveDraft(); navigate('/attendance/validate'); }}
        >
          Submit
        </button>
      </div>
    </div>
  );

  return (
    <AppLayout topBar={TopBarSlot} bottomBar={BottomBar} background="#F8FAFC">
      <div style={{ display: 'grid', gridTemplateColumns: '66% 31.5%', gap: '2.5%' }}>
        {/* Roster Table */}
        <div className="card card-compact" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Roll #</th>
                <th>Student Name</th>
                <th className="center">Status</th>
                <th className="center">Late</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {roster.map(student => (
                <tr key={student.roll}>
                  <td className="num" style={{ fontWeight: 700 }}>{student.roll}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <img src={student.avatar} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                      <span style={{ fontWeight: 700, color: student.status === 'A' ? '#EF4444' : '#1E293B' }}>
                        {student.name}
                      </span>
                    </div>
                  </td>
                  <td className="center">
                    <div style={{ display: 'inline-flex', border: '1px solid #E2E8F0', borderRadius: '0.35rem', overflow: 'hidden', backgroundColor: '#F8FAFC' }}>
                      <button
                        onClick={() => toggleStatus(student.roll, 'P')}
                        style={{
                          border: 'none', width: 34, padding: '0.3rem 0', fontSize: '0.725rem', fontWeight: 800, cursor: 'pointer',
                          backgroundColor: student.status === 'P' ? '#10B981' : 'transparent',
                          color: student.status === 'P' ? 'white' : '#64748B',
                        }}
                      >P</button>
                      <button
                        onClick={() => toggleStatus(student.roll, 'A')}
                        style={{
                          border: 'none', width: 34, padding: '0.3rem 0', fontSize: '0.725rem', fontWeight: 800, cursor: 'pointer',
                          backgroundColor: student.status === 'A' ? '#EF4444' : 'transparent',
                          color: student.status === 'A' ? 'white' : '#64748B',
                        }}
                      >A</button>
                    </div>
                  </td>
                  <td className="center">
                    <input
                      type="checkbox"
                      checked={student.late}
                      onChange={() => toggleLate(student.roll)}
                      style={{ width: 15, height: 15, cursor: 'pointer' }}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={student.remarks}
                      onChange={e => updateRemarks(student.roll, e.target.value)}
                      placeholder="Add note..."
                      style={{ width: '90%', border: '1px solid #E2E8F0', padding: '0.3rem 0.6rem', borderRadius: '0.25rem', fontSize: '0.8rem', outline: 'none' }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right column */}
        <div className="stack-lg">
          {/* Live Summary */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span className="section-eyebrow" style={{ alignSelf: 'flex-start', marginBottom: '1.25rem' }}>Live Summary</span>

            <div style={{ position: 'relative', width: 140, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="70" cy="70" r="54" fill="none" stroke="#E2E8F0" strokeWidth="12" />
                <circle
                  cx="70" cy="70" r="54" fill="none" stroke="#0D8ABC" strokeWidth="12"
                  strokeDasharray={dashLen}
                  strokeDashoffset={dashLen - (dashLen * presentPct) / 100}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                />
              </svg>
              <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A' }}>{presentPct}%</span>
                <span style={{ fontSize: '0.675rem', color: '#64748B', fontWeight: 700 }}>Present</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', borderTop: '1px solid #F1F5F9', marginTop: '1.5rem', paddingTop: '1rem', textAlign: 'center' }}>
              <div style={{ flex: 1, borderRight: '1px solid #F1F5F9' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Present</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10B981', marginTop: '0.2rem' }}>
                  {String(presentCount).padStart(2, '0')}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Absent</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#EF4444', marginTop: '0.2rem' }}>
                  {String(absentCount).padStart(2, '0')}
                </div>
              </div>
            </div>
          </div>

          {/* Shortage Alerts */}
          <div className="card">
            <div className="card-header" style={{ marginBottom: '1rem' }}>
              <span className="section-eyebrow">Shortage Alerts</span>
              <span className="status-pill danger">CRITICAL</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {SHORTAGE_ALERTS.map((s, idx) => (
                <div key={idx} style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-md)', padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', backgroundColor: '#FEF2F2', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
                    {s.initials}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.815rem', fontWeight: 700, color: '#1E293B' }}>{s.name}</div>
                    <div style={{ fontSize: '0.725rem', color: '#EF4444', fontWeight: 700, marginTop: '0.1rem' }}>
                      ⚠️ {s.pct}% Attendance
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
