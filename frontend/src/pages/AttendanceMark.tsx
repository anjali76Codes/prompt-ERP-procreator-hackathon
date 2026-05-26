import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, ChevronRight, UserCheck, SlidersHorizontal, FileDown } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { useAttendance } from '../lib/AttendanceContext';
import { ApiError } from '../lib/api';
import { downloadLectureRosterPdf } from '../lib/erp/api';

type RosterFilter = 'all' | 'present' | 'absent' | 'late';
const FILTER_LABEL: Record<RosterFilter, string> = {
  all: 'Show: All',
  present: 'Show: Present only',
  absent: 'Show: Absent only',
  late: 'Show: Late only',
};

export const AttendanceMark: React.FC = () => {
  const navigate = useNavigate();
  const {
    lecture, roster, loading, localStatus, localRemarks,
    setLocalStatus, setLocalRemarks, setAllLocalStatus,
    saveAttendance, presentCount, absentCount, presentPct,
  } = useAttendance();
  const [error, setError] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<RosterFilter>('all');
  const [filterOpen, setFilterOpen] = React.useState(false);
  const filterRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!filterOpen) return;
    const onClick = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [filterOpen]);

  const visibleRoster = useMemo(() => {
    if (filter === 'all') return roster;
    return roster.filter(r => (localStatus[r.student._id] ?? 'absent') === filter);
  }, [roster, filter, localStatus]);

  const subj = lecture && typeof lecture.subject !== 'string' ? lecture.subject : null;
  const div  = lecture && typeof lecture.division !== 'string' ? lecture.division : null;

  const dashLen = 339.29;

  if (!lecture && !loading.roster) {
    return (
      <AppLayout
        background="#F8FAFC"
        pageIcon={<UserCheck size={18} />}
        pageTitle="Mark Attendance"
        pageBreadcrumb={<button onClick={() => navigate('/attendance')}>← Back to Overview</button>}
      >
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem', maxWidth: 480, margin: '4rem auto' }}>
          <h3 style={{ margin: 0, marginBottom: '0.5rem' }}>No lecture selected</h3>
          <p style={{ color: '#64748B', margin: 0 }}>
            Pick a lecture from the overview page to start marking attendance.
          </p>
          <button className="btn btn-primary" style={{ marginTop: '1.25rem' }} onClick={() => navigate('/attendance')}>
            Go to Overview
          </button>
        </div>
      </AppLayout>
    );
  }

  const handleSubmit = async () => {
    setError(null);
    try {
      await saveAttendance();
      navigate('/attendance/validate');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to save attendance');
    }
  };

  return (
    <AppLayout
      background="#F8FAFC"
      pageIcon={<UserCheck size={18} />}
      pageTitle={subj ? `${subj.code} · ${subj.name}` : 'Mark Attendance'}
      pageBreadcrumb={
        <>
          <button onClick={() => navigate('/attendance')}>Attendance</button>
          <ChevronRight size={11} />
          <span className="current">Mark Entry</span>
          <span style={{ color: '#94A3B8', margin: '0 0.35rem' }}>•</span>
          <span>{div?.code} · {lecture?.startTime}-{lecture?.endTime} · {lecture?.room}</span>
        </>
      }
      pageActions={
        <>
          <button className="btn btn-primary" onClick={() => setAllLocalStatus('present')}>
            <Check size={14} /> Mark All Present
          </button>
          <button className="btn btn-secondary" onClick={() => setAllLocalStatus('absent')}>
            <X size={14} /> Mark All Absent
          </button>
          <button
            className="btn btn-secondary"
            disabled={!lecture}
            onClick={async () => {
              if (!lecture) return;
              try { await downloadLectureRosterPdf(lecture._id); }
              catch (e) { setError(e instanceof ApiError ? e.message : 'PDF download failed'); }
            }}
            title="Download roster PDF"
          >
            <FileDown size={14} /> PDF
          </button>
          <div ref={filterRef} style={{ position: 'relative' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setFilterOpen(o => !o)}
              aria-haspopup="menu"
              aria-expanded={filterOpen}
            >
              <SlidersHorizontal size={14} /> {FILTER_LABEL[filter]}
            </button>
            {filterOpen && (
              <div
                role="menu"
                style={{
                  position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 20,
                  background: 'white', border: '1px solid #E2E8F0', borderRadius: '0.5rem',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.08)', minWidth: 180, padding: '0.25rem',
                }}
              >
                {(Object.keys(FILTER_LABEL) as RosterFilter[]).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => { setFilter(opt); setFilterOpen(false); }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '0.5rem 0.75rem', fontSize: '0.8rem', fontWeight: 600,
                      background: filter === opt ? '#EFF6FF' : 'transparent',
                      color: filter === opt ? 'var(--primary)' : '#334155',
                      border: 'none', borderRadius: '0.35rem', cursor: 'pointer',
                    }}
                  >
                    {FILTER_LABEL[opt]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      }
      bottomBar={
        <div className="action-bar">
          <span className="action-bar-note">
            {error ? <span style={{ color: '#EF4444' }}>{error}</span> :
              `${roster.length} students · ${presentCount} present · ${absentCount} absent`}
          </span>
          <div className="action-bar-actions">
            <button className="btn btn-secondary" onClick={() => navigate('/attendance')}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={loading.saving || roster.length === 0}>
              {loading.saving ? 'Saving…' : 'Submit Attendance'}
            </button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '66% 31.5%', gap: '2.5%' }}>
        <div className="card card-compact" style={{ overflow: 'hidden' }}>
          {loading.roster ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>Loading roster…</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Roll #</th>
                  <th>Student</th>
                  <th className="center">Status</th>
                  <th className="center">Late</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {visibleRoster.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>
                    No students match the current filter.
                  </td></tr>
                )}
                {visibleRoster.map(({ student }) => {
                  const status = localStatus[student._id] ?? 'absent';
                  const isPresent = status === 'present' || status === 'late';
                  return (
                    <tr key={student._id}>
                      <td className="num" style={{ fontWeight: 700 }}>{student.rollNumber ?? '—'}</td>
                      <td>
                        <span style={{ fontWeight: 700, color: !isPresent ? '#EF4444' : '#1E293B' }}>
                          {student.name}
                        </span>
                        <div style={{ fontSize: '0.7rem', color: '#94A3B8' }}>{student.email}</div>
                      </td>
                      <td className="center">
                        <div style={{ display: 'inline-flex', border: '1px solid #E2E8F0', borderRadius: '0.35rem', overflow: 'hidden', backgroundColor: '#F8FAFC' }}>
                          <button
                            onClick={() => setLocalStatus(student._id, 'present')}
                            style={{
                              border: 'none', width: 34, padding: '0.3rem 0', fontSize: '0.725rem', fontWeight: 800, cursor: 'pointer',
                              backgroundColor: status === 'present' ? '#10B981' : 'transparent',
                              color: status === 'present' ? 'white' : '#64748B',
                            }}
                          >P</button>
                          <button
                            onClick={() => setLocalStatus(student._id, 'absent')}
                            style={{
                              border: 'none', width: 34, padding: '0.3rem 0', fontSize: '0.725rem', fontWeight: 800, cursor: 'pointer',
                              backgroundColor: status === 'absent' ? '#EF4444' : 'transparent',
                              color: status === 'absent' ? 'white' : '#64748B',
                            }}
                          >A</button>
                        </div>
                      </td>
                      <td className="center">
                        <input
                          type="checkbox"
                          checked={status === 'late'}
                          onChange={(e) => setLocalStatus(student._id, e.target.checked ? 'late' : 'present')}
                          style={{ width: 15, height: 15, cursor: 'pointer' }}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={localRemarks[student._id] ?? ''}
                          onChange={e => setLocalRemarks(student._id, e.target.value)}
                          placeholder="Add note..."
                          style={{ width: '90%', border: '1px solid #E2E8F0', padding: '0.3rem 0.6rem', borderRadius: '0.25rem', fontSize: '0.8rem', outline: 'none' }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Live summary */}
        <div className="stack-lg">
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

          {lecture?.attendanceMarkedAt && (
            <div className="card" style={{ background: '#ECFDF5', borderColor: '#A7F3D0' }}>
              <div className="card-header" style={{ marginBottom: 0 }}>
                <span className="section-eyebrow" style={{ color: '#15803D' }}>Already marked</span>
              </div>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: '#166534' }}>
                Attendance for this lecture was previously saved on{' '}
                {new Date(lecture.attendanceMarkedAt).toLocaleString()}. Submitting again will overwrite it.
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};
