import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserCheck, Plus, AlertCircle, RefreshCw, ChevronRight,
  BarChart3, Users, Ban, Undo2, FileDown, TrendingUp, CalendarClock,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { useAttendance } from '../lib/AttendanceContext';
import { AddLectureModal } from '../components/attendance/AddLectureModal';
import {
  fetchDivisionStats, fetchDivisionSubjectAverages, materialiseDay,
  cancelLecture, restoreLecture, downloadDivisionReportPdf,
} from '../lib/erp/api';
import type { DivisionStatRow, SubjectAverageRow } from '../lib/erp/types';
import { ApiError } from '../lib/api';

const fmtDate = (iso: string): string =>
  new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short' });

const statusClass = (s: string): string =>
  s === 'completed' ? 'success' :
  s === 'cancelled' ? 'danger'  :
  s === 'ongoing'   ? 'info'    : 'muted';

export const AttendanceOverview: React.FC = () => {
  const navigate = useNavigate();
  const {
    divisions, divisionId, selectDivision, selectLecture,
    lectures, refreshLectures, loading,
  } = useAttendance();

  const [stats, setStats] = useState<DivisionStatRow[]>([]);
  const [subjectAvgs, setSubjectAvgs] = useState<SubjectAverageRow[]>([]);
  const [materialising, setMaterialising] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lectureModalOpen, setLectureModalOpen] = useState(false);

  // Pick the first division automatically once they load.
  useEffect(() => {
    if (!divisionId && divisions.length > 0) selectDivision(divisions[0]!._id);
  }, [divisions, divisionId, selectDivision]);

  // Refresh stats whenever the division changes.
  useEffect(() => {
    if (!divisionId) { setStats([]); setSubjectAvgs([]); return; }
    let cancelled = false;
    Promise.all([fetchDivisionStats(divisionId), fetchDivisionSubjectAverages(divisionId)])
      .then(([s, a]) => { if (!cancelled) { setStats(s); setSubjectAvgs(a); } })
      .catch(e => { if (!cancelled) setError(e instanceof ApiError ? e.message : 'Failed to load stats'); });
    return () => { cancelled = true; };
  }, [divisionId]);

  const generateTodaysLectures = async () => {
    setMaterialising(true);
    setError(null);
    try {
      await materialiseDay(new Date());
      await refreshLectures();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to generate today\'s lectures');
    } finally {
      setMaterialising(false);
    }
  };

  const metrics = useMemo(() => {
    const total = stats.length;
    const below75 = stats.filter(s => s.pct < 75).length;
    const avgPct = total ? Math.round(stats.reduce((a, s) => a + s.pct, 0) / total) : 0;
    const completed = lectures.filter(l => l.status === 'completed').length;
    const pending = lectures.filter(l => l.status !== 'completed').length;
    return [
      { label: 'Students',          val: String(total),           tag: 'Active', tagClass: 'info'    },
      { label: 'Avg. Attendance',   val: `${avgPct}%`,            tag: avgPct >= 80 ? 'Stable' : 'Watch', tagClass: avgPct >= 80 ? 'success' : 'warning' },
      { label: 'Below 75%',         val: String(below75),         tag: below75 ? 'Alert' : 'OK', tagClass: below75 ? 'warning' : 'success' },
      { label: 'Lectures Today',    val: String(lectures.length), tag: pending ? `${pending} pending` : 'Done', tagClass: pending ? 'warning' : 'success' },
      { label: 'Submitted Today',   val: String(completed),       tag: 'Completed', tagClass: 'success' },
    ];
  }, [stats, lectures]);

  const goMark = (lectureId: string) => {
    selectLecture(lectureId);
    navigate('/attendance/mark');
  };

  const onCancel = async (lectureId: string) => {
    if (!confirm('Cancel this lecture? Students will see it as cancelled.')) return;
    try { await cancelLecture(lectureId); await refreshLectures(); }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Cancel failed'); }
  };

  const onRestore = async (lectureId: string) => {
    try { await restoreLecture(lectureId); await refreshLectures(); }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Restore failed'); }
  };

  const currentDivisionCode = divisions.find(d => d._id === divisionId)?.code ?? 'division';
  const onExportPdf = async () => {
    if (!divisionId) return;
    try { await downloadDivisionReportPdf(divisionId, currentDivisionCode); }
    catch (e) { setError(e instanceof ApiError ? e.message : 'PDF download failed'); }
  };

  return (
    <AppLayout
      background="#F8FAFC"
      pageIcon={<UserCheck size={18} />}
      pageTitle="Attendance Overview"
      pageBreadcrumb={
        <>
          <span>Division:</span>
          <select
            value={divisionId ?? ''}
            onChange={e => selectDivision(e.target.value || null)}
            style={{ marginLeft: 6, fontSize: '0.75rem', border: '1px solid #E2E8F0', padding: '0.2rem 0.4rem', borderRadius: 4 }}
          >
            {divisions.length === 0 && <option value="">No divisions assigned</option>}
            {divisions.map(d => <option key={d._id} value={d._id}>{d.code}</option>)}
          </select>
        </>
      }
      pageActions={
        <>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/attendance/schedules')}>
            <CalendarClock size={14} /> Manage Schedule
          </button>
          <button className="btn btn-secondary btn-sm" onClick={generateTodaysLectures} disabled={materialising}>
            <RefreshCw size={14} /> {materialising ? 'Generating…' : 'Materialise Today'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onExportPdf} disabled={!divisionId}>
            <FileDown size={14} /> Export PDF
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setLectureModalOpen(true)} disabled={!divisionId}>
            <Plus size={14} /> Add Lecture
          </button>
          <button
            className="btn btn-primary"
            onClick={() => { if (lectures[0]) goMark(lectures[0]._id); }}
            disabled={lectures.length === 0}
          >
            <Plus size={16} /> Mark Attendance
          </button>
        </>
      }
    >
      {error && <div className="status-pill danger" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div className="stack-lg">
        {/* Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
          {metrics.map((m) => (
            <div key={m.label} className="metric-card">
              <div className="metric-card-body">
                <span className="metric-card-label">{m.label}</span>
                <span className="metric-card-value">{m.val}</span>
              </div>
              <div className="metric-card-aside">
                <span className={`status-pill ${m.tagClass}`}>{m.tag}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Quick actions — surface analytics + student-wise navigation without forcing the user through the marking flow */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
          {[
            {
              label: 'View Analytics', desc: 'Health score, defaulters, subject comparison',
              icon: <BarChart3 size={20} color="var(--primary)" />,
              onClick: () => navigate('/attendance/analytics'),
              disabled: !divisionId,
            },
            {
              label: 'Student Attendance', desc: 'Per-student %, subject breakdown, search',
              icon: <Users size={20} color="var(--primary)" />,
              onClick: () => navigate('/attendance/students'),
              disabled: !divisionId,
            },
          ].map(action => (
            <button
              key={action.label}
              onClick={action.onClick}
              disabled={action.disabled}
              className="card card-compact"
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.85rem',
                cursor: action.disabled ? 'not-allowed' : 'pointer',
                opacity: action.disabled ? 0.55 : 1,
                textAlign: 'left',
              }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {action.icon}
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0F172A' }}>{action.label}</div>
                <div style={{ fontSize: '0.725rem', color: '#64748B', marginTop: '0.2rem', lineHeight: 1.4 }}>{action.desc}</div>
              </div>
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '62% 35.5%', gap: '2.5%', alignItems: 'flex-start' }}>
          {/* Today's Lectures */}
          <div className="card">
            <div className="card-header">
              <h3>Today's Lectures</h3>
              <span className="status-pill muted">{lectures.length} scheduled</span>
            </div>

            {loading.lectures ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>Loading…</div>
            ) : lectures.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>
                No lectures for today. Click <strong>Materialise Today</strong> to generate from the timetable.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Time</th>
                      <th>Room</th>
                      <th>Status</th>
                      <th className="right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lectures.map((lec) => {
                      const subj = typeof lec.subject === 'string' ? null : lec.subject;
                      return (
                        <tr key={lec._id}>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span className="strong">{subj?.name ?? '—'}</span>
                              <span style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600 }}>
                                {subj?.code ?? ''} {lec.date && `· ${fmtDate(lec.date)}`}
                              </span>
                            </div>
                          </td>
                          <td className="num">{lec.startTime} - {lec.endTime}</td>
                          <td className="num">{lec.room}</td>
                          <td>
                            <span className={`status-pill ${statusClass(lec.status)}`}>{lec.status}</span>
                          </td>
                          <td className="right">
                            <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                              {lec.status === 'cancelled' ? (
                                <button className="btn btn-secondary btn-sm" onClick={() => void onRestore(lec._id)} title="Restore lecture">
                                  <Undo2 size={12} /> Restore
                                </button>
                              ) : (
                                <>
                                  <button className="btn btn-primary btn-sm" onClick={() => goMark(lec._id)}>
                                    {lec.status === 'completed' ? 'Review' : 'Mark'} <ChevronRight size={12} />
                                  </button>
                                  <button
                                    className="btn btn-secondary btn-icon-only btn-sm"
                                    onClick={() => void onCancel(lec._id)}
                                    title="Cancel lecture"
                                    aria-label="Cancel lecture"
                                  >
                                    <Ban size={12} color="#EF4444" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Subject averages + at-risk students */}
          <div className="stack-lg">
            <div className="card">
              <div className="card-header">
                <h3 style={{ fontSize: '1rem' }}>Low Attendance Students</h3>
                <span className="status-pill danger">{stats.filter(s => s.pct < 75).length}</span>
              </div>
              <div className="alert-list">
                {stats.filter(s => s.pct < 75).slice(0, 4).map(s => (
                  <div key={s.studentId} className="alert-row danger">
                    <div className="alert-row-icon"><AlertCircle size={14} color="#EF4444" /></div>
                    <div>
                      <h4 className="alert-row-title">{s.name}</h4>
                      <p className="alert-row-desc">
                        {s.rollNumber ?? '—'} · {Math.round(s.pct)}% attendance · {s.present}/{s.total} present
                      </p>
                    </div>
                  </div>
                ))}
                {stats.filter(s => s.pct < 75).length === 0 && (
                  <div style={{ padding: '0.75rem 0', color: '#64748B', fontSize: '0.85rem' }}>
                    Everyone is above 75% — nice.
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 style={{ fontSize: '1rem' }}>Subject Averages</h3>
                <TrendingUp size={16} color="#64748B" />
              </div>
              <div className="stack-md">
                {subjectAvgs.length === 0 && (
                  <div style={{ color: '#64748B', fontSize: '0.85rem' }}>No data yet.</div>
                )}
                {subjectAvgs.map(a => (
                  <div key={a.subjectId} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
                      <span>{a.code} · {a.name}</span>
                      <span>{Math.round(a.pct)}%</span>
                    </div>
                    <div style={{ height: 6, width: '100%', backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${a.pct}%`, height: '100%', backgroundColor: a.pct >= 80 ? '#10B981' : a.pct >= 65 ? 'var(--primary)' : '#EF4444', borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <AddLectureModal
        open={lectureModalOpen}
        onClose={() => setLectureModalOpen(false)}
        divisions={divisions}
        defaultDivisionId={divisionId}
        onCreated={async (lectureId) => { await refreshLectures(); selectLecture(lectureId); }}
      />
    </AppLayout>
  );
};
