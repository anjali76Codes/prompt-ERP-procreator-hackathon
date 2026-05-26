import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ArrowUpRight, UserCheck } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { useAttendance } from '../lib/AttendanceContext';

const statusToPill: Record<string, string> = {
  present: 'success',
  late: 'info',
  absent: 'danger',
  excused: 'warning',
};

export const AttendanceValidate: React.FC = () => {
  const navigate = useNavigate();
  const { lecture, roster, localStatus, localRemarks, presentCount, absentCount } = useAttendance();

  const subj = lecture && typeof lecture.subject !== 'string' ? lecture.subject : null;
  const div  = lecture && typeof lecture.division !== 'string' ? lecture.division : null;

  if (!lecture) {
    return (
      <AppLayout
        background="#F8FAFC"
        pageIcon={<UserCheck size={18} />}
        pageTitle="Validate Attendance"
        pageBreadcrumb={<button onClick={() => navigate('/attendance')}>← Back to Overview</button>}
      >
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem', maxWidth: 480, margin: '4rem auto' }}>
          <h3>No lecture loaded</h3>
          <button className="btn btn-primary" onClick={() => navigate('/attendance')}>Go to Overview</button>
        </div>
      </AppLayout>
    );
  }

  const flagged = roster.filter(r => {
    const s = localStatus[r.student._id];
    return s === 'absent' && (localRemarks[r.student._id] ?? '').trim() === '';
  });

  return (
    <AppLayout
      background="#F8FAFC"
      pageIcon={<UserCheck size={18} />}
      pageTitle={`${subj?.code ?? ''} · ${subj?.name ?? 'Validate'}`}
      pageBreadcrumb={
        <>
          <button onClick={() => navigate('/attendance')}>Attendance</button>
          <ChevronRight size={11} />
          <span className="current">Validate</span>
          <span style={{ color: '#94A3B8', margin: '0 0.35rem' }}>•</span>
          <span>{div?.code} · {lecture.startTime}-{lecture.endTime} · {lecture.room}</span>
        </>
      }
      pageActions={
        <span className="status-pill info" style={{ fontSize: '0.625rem' }}>
          {presentCount}/{roster.length} present
        </span>
      }
      bottomBar={
        <div className="action-bar dark">
          <span className="action-bar-note" style={{ color: '#CBD5E1' }}>
            <span style={{ color: '#38BDF8', fontSize: '1.15rem' }}>✔</span>
            <strong style={{ color: 'white' }}>{roster.length} records saved.</strong>
            {flagged.length > 0 && <> &nbsp;{flagged.length} absent without remarks.</>}
          </span>
          <div className="action-bar-actions">
            <button
              className="btn"
              style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#E2E8F0' }}
              onClick={() => navigate('/attendance/mark')}
            >
              Edit Again
            </button>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/attendance/analytics')}
            >
              View Analytics <ArrowUpRight size={15} />
            </button>
          </div>
        </div>
      }
    >
      <div className="stack-lg">
        <div className="card card-compact" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1.25rem' }}>
          {[
            { label: 'DATE',     val: new Date(lecture.date).toLocaleDateString(), icon: '📅' },
            { label: 'ROOM',     val: lecture.room,                              icon: '🏢' },
            { label: 'TIME',     val: `${lecture.startTime} - ${lecture.endTime}`, icon: '⏰' },
            { label: 'SUBJECT',  val: subj?.code ?? '—',                          icon: '📘' },
            {
              label: 'COUNT', icon: '👥',
              val: (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>{roster.length}</span>
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

        <div className="card">
          <div className="card-header">
            <h3>Class Roll Details</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Roll No.</th>
                  <th>Status</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {roster.map(({ student }) => {
                  const status = localStatus[student._id] ?? 'absent';
                  const remarks = localRemarks[student._id] ?? '';
                  return (
                    <tr key={student._id}>
                      <td className="strong">{student.name}</td>
                      <td className="num">{student.rollNumber ?? '—'}</td>
                      <td><span className={`status-pill ${statusToPill[status] ?? 'muted'}`}>{status}</span></td>
                      <td className="num">{remarks || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
