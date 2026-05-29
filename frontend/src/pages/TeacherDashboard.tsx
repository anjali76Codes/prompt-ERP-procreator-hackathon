/**
 * Teacher dashboard — fully data-driven.
 *
 * Every widget reads from /me/teacher-overview, which the backend
 * builds in one aggregate call (banner stats, courses, engagement
 * heatmap, metrics, upcoming deadlines, at-risk students, agenda).
 * The only static thing on this page is the QUICK_ACTIONS array,
 * which is just a navigation menu.
 */

import React, { useEffect, useState } from 'react';
import {
  Calendar, Megaphone, FileSpreadsheet, BarChart, Send, CheckSquare,
  LayoutDashboard, Loader2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { ApiError } from '../lib/api';
import {
  fetchTeacherOverview, type TeacherOverview,
} from '../lib/teacherOverview/api';

const QUICK_ACTIONS: { label: string; icon: React.ReactNode; path: string }[] = [
  { label: 'Announcement', icon: <Megaphone size={20} color="var(--primary)" />,      path: '/announcements' },
  { label: 'Grade Batch',  icon: <FileSpreadsheet size={20} color="var(--primary)" />, path: '/grade-batch' },
  { label: 'Gen Report',   icon: <BarChart size={20} color="var(--primary)" />,        path: '/reports' },
  { label: 'Notify Class', icon: <Send size={20} color="var(--primary)" />,            path: '/notify' },
];

const greetingForHour = (h: number): string => {
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const dueDateBlock = (iso: string): { mon: string; day: string; isPast: boolean } => {
  const d = new Date(iso);
  return {
    mon: d.toLocaleDateString(undefined, { month: 'short' }).toUpperCase(),
    day: d.toLocaleDateString(undefined, { day: '2-digit' }),
    isPast: d.getTime() < Date.now(),
  };
};

const dueTimeLabel = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
};

export const TeacherDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<TeacherOverview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setData(await fetchTeacherOverview());
      } catch (e) {
        setLoadError(e instanceof ApiError ? e.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const greeting = greetingForHour(new Date().getHours());

  return (
    <AppLayout
      pageIcon={<LayoutDashboard size={18} />}
      pageTitle="Dashboard"
      pageBreadcrumb="Faculty Overview"
    >
      {loadError && (
        <div className="status-pill danger" style={{ marginBottom: '1rem', textTransform: 'none' }}>
          {loadError}
        </div>
      )}

      <div className="dashboard-grid">
        {/* Left column */}
        <div className="stack-lg">
          {/* Welcome banner */}
          <div
            className="card"
            style={{
              backgroundColor: 'var(--primary)',
              color: 'white',
              padding: '2rem',
              border: 'none',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 2 }}>
              <div style={{ maxWidth: '70%' }}>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>
                  {greeting}, {data?.greeting.name?.split(' ').slice(-1)[0] ?? 'Professor'}!
                </h2>
                <p style={{ margin: '0.75rem 0 0', opacity: 0.9, lineHeight: 1.6, fontSize: '0.975rem' }}>
                  {loading ? 'Loading your day…' : (
                    <>
                      You have <strong>{data?.banner.lecturesToday ?? 0}</strong> lecture{(data?.banner.lecturesToday ?? 0) === 1 ? '' : 's'} today
                      {' '}and <strong>{data?.banner.pendingReviews ?? 0}</strong> pending review{(data?.banner.pendingReviews ?? 0) === 1 ? '' : 's'}.
                      {data?.banner.topEngagementSubject && (
                        <> Students are showing strong engagement in "{data.banner.topEngagementSubject}".</>
                      )}
                    </>
                  )}
                </p>
              </div>
              <button
                className="btn"
                onClick={() => navigate('/attendance/schedules')}
                style={{ backgroundColor: 'white', color: 'var(--primary)', fontWeight: 600 }}
              >
                Daily Agenda
              </button>
            </div>
          </div>

          {/* Quick actions */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            {QUICK_ACTIONS.map(a => (
              <button
                key={a.label}
                onClick={() => navigate(a.path)}
                className="card card-compact"
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer' }}
              >
                {a.icon}
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {a.label}
                </span>
              </button>
            ))}
          </div>

          {/* Course Overview */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title-lg">Course Overview</h3>
              <button
                className="alert-row-cta"
                onClick={() => navigate('/assignments/list')}
              >
                Manage Courses
              </button>
            </div>
            {loading ? (
              <DashLoading />
            ) : !data || data.courses.length === 0 ? (
              <DashEmpty text="No courses linked to your account yet." />
            ) : (
              <div className="stack-md">
                {data.courses.map(course => {
                  const barColor =
                    course.avgAttendancePct >= 85 ? '#16A34A' :
                    course.avgAttendancePct >= 70 ? '#0D8ABC' : '#F59E0B';
                  return (
                    <div
                      key={course.subjectId}
                      style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.925rem' }}>{course.name}</span>
                          <span
                            style={{
                              fontSize: '0.675rem', fontWeight: 700, padding: '0.125rem 0.5rem', borderRadius: '0.25rem',
                              backgroundColor: '#EFF6FF', color: 'var(--primary)',
                            }}
                          >
                            {course.code}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          <span>👥 {course.studentCount} Students</span>
                          <span>📈 {course.avgAttendancePct}% Avg</span>
                        </div>
                      </div>
                      <div style={{ width: 120, marginLeft: '1rem' }}>
                        <div style={{ height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${course.progress}%`, backgroundColor: barColor, borderRadius: 3 }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Engagement heatmap */}
          <div className="card">
            <div className="card-header" style={{ marginBottom: '0.5rem' }}>
              <h3 className="card-title-lg">Engagement Analytics</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                <Legend color="#EFF6FF" label="Low" />
                <Legend color="#60A5FA" label="Med" />
                <Legend color="var(--primary)" label="High" />
                <select style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.25rem 0.5rem', backgroundColor: 'white', fontWeight: 500 }}>
                  <option>Last 4 Weeks</option>
                </select>
              </div>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.815rem', margin: '0 0 1.5rem' }}>
              Weekly attendance heatmap
            </p>

            {loading ? (
              <DashLoading />
            ) : (
              <Heatmap
                rows={data?.engagementHeatmap ?? []}
                avg={data?.averageEngagementPct ?? 0}
              />
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="stack-lg">
          {/* Metric cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="metric-card">
              <div className="metric-card-body">
                <span className="metric-card-label" style={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.675rem' }}>Attendance</span>
                <span className="metric-card-value" style={{ fontSize: '1.5rem' }}>
                  {loading ? '—' : `${data?.metrics.attendancePct ?? 0}%`}
                </span>
                {data && (
                  <span style={{
                    fontSize: '0.75rem', fontWeight: 600,
                    color: (data.metrics.attendanceDeltaPct ?? 0) >= 0 ? '#16A34A' : '#DC2626',
                  }}>
                    {data.metrics.attendanceDeltaPct >= 0 ? '+' : ''}
                    {data.metrics.attendanceDeltaPct}%
                  </span>
                )}
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-card-body">
                <span className="metric-card-label" style={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.675rem' }}>At-Risk</span>
                <span className="metric-card-value" style={{
                  fontSize: '1.5rem',
                  color: (data?.metrics.atRiskCount ?? 0) > 0 ? '#DC2626' : '#0F172A',
                }}>
                  {loading ? '—' : String(data?.metrics.atRiskCount ?? 0).padStart(2, '0')}
                </span>
                <span style={{
                  fontSize: '0.75rem', fontWeight: 600,
                  color: (data?.metrics.atRiskCount ?? 0) > 0 ? '#DC2626' : '#64748B',
                }}>
                  {(data?.metrics.atRiskCount ?? 0) > 0 ? 'Alert' : 'All clear'}
                </span>
              </div>
            </div>
          </div>

          {/* Upcoming deadlines */}
          <div className="card">
            <div className="card-header" style={{ marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.975rem', fontWeight: 700 }}>Upcoming Deadlines</h3>
              <Calendar size={16} color="var(--text-muted)" />
            </div>
            {loading ? (
              <DashLoading />
            ) : !data || data.upcomingItems.length === 0 ? (
              <DashEmpty text="No upcoming deadlines." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {data.upcomingItems.map(item => {
                  const d = dueDateBlock(item.dueDate);
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigate(`/assignments/list/${item.id}/review`)}
                      style={{
                        display: 'flex', gap: '1rem', alignItems: 'flex-start',
                        background: 'transparent', border: 'none', padding: 0,
                        cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <div style={{
                        backgroundColor: d.isPast ? '#FEF3C7' : '#EFF6FF',
                        color: d.isPast ? '#B45309' : 'var(--primary)',
                        padding: '0.5rem', borderRadius: 'var(--radius-md)',
                        textAlign: 'center', minWidth: 45,
                      }}>
                        <div style={{ fontSize: '0.625rem', fontWeight: 700 }}>{d.mon}</div>
                        <div style={{ fontSize: '1rem', fontWeight: 800 }}>{d.day}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{item.title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                          {dueTimeLabel(item.dueDate)}
                          {item.subjectLabel ? ` • ${item.subjectLabel}` : ''}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* At-Risk Students */}
          <div className="card" style={{ position: 'relative' }}>
            <div className="card-header" style={{ marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.975rem', fontWeight: 700 }}>At-Risk Students</h3>
              {(data?.metrics.atRiskCount ?? 0) > 0 && (
                <button
                  className="alert-row-cta"
                  onClick={() => navigate('/attendance')}
                >
                  View all {String(data!.metrics.atRiskCount).padStart(2, '0')}
                </button>
              )}
            </div>
            {loading ? (
              <DashLoading />
            ) : !data || data.atRiskStudents.length === 0 ? (
              <DashEmpty text="No students below 75% attendance — nice work!" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {data.atRiskStudents.map(student => {
                  const initials = student.name
                    .split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
                  return (
                    <div
                      key={student.studentId}
                      style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.75rem' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                        <div style={{
                          width: '2.5rem', height: '2.5rem', borderRadius: '50%',
                          background: '#FEE2E2', color: '#B91C1C',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 800, fontSize: '0.85rem',
                        }}>
                          {initials || '?'}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{student.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {student.rollNumber ? `${student.rollNumber} • ` : ''}
                            {student.divisionLabel ? `${student.divisionLabel} • ` : ''}
                            {student.absences} Absences
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', marginRight: '0.5rem' }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#DC2626' }}>
                          {student.attendancePct}%
                        </div>
                        <div style={{ width: 60, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, overflow: 'hidden', marginTop: '0.25rem', display: 'inline-block' }}>
                          <div style={{ height: '100%', width: `${student.attendancePct}%`, backgroundColor: '#DC2626' }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Agenda */}
          <div className="card">
            <div className="card-header" style={{ marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.975rem', fontWeight: 700 }}>Today's Agenda</h3>
              <CheckSquare size={16} color="var(--primary)" />
            </div>
            {loading ? (
              <DashLoading />
            ) : !data ? (
              <DashEmpty text="—" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {data.agendaTasks.map(task => (
                  <button
                    key={task.id}
                    onClick={() => task.link && navigate(task.link)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.6rem',
                      cursor: task.link ? 'pointer' : 'default',
                      fontSize: '0.85rem',
                      background: 'transparent', border: 'none', padding: 0,
                      textAlign: 'left',
                    }}
                  >
                    <div style={{
                      width: 16, height: 16, borderRadius: 4,
                      border: '1.5px solid #CBD5E1',
                      background: task.done ? 'var(--primary)' : 'white',
                      borderColor: task.done ? 'var(--primary)' : '#CBD5E1',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {task.done && (
                        <CheckSquare size={11} color="white" strokeWidth={3} />
                      )}
                    </div>
                    <span style={{
                      textDecoration: task.done ? 'line-through' : 'none',
                      color: task.done ? 'var(--text-muted)' : 'var(--text-main)',
                      lineHeight: 1.3,
                    }}>
                      {task.text}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

/* -------------------------------------------------------------------------- */
/*  Internal widgets                                                            */
/* -------------------------------------------------------------------------- */

const DashLoading: React.FC = () => (
  <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748B', fontSize: '0.85rem' }}>
    <Loader2 size={14} className="animate-spin" /> Loading…
  </div>
);

const DashEmpty: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ padding: '1.25rem', color: '#64748B', fontSize: '0.85rem', textAlign: 'center' }}>
    {text}
  </div>
);

const Legend: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
    <span style={{ display: 'inline-block', width: 8, height: 8, backgroundColor: color, borderRadius: 2 }} />
    {label}
  </div>
);

const Heatmap: React.FC<{
  rows: Array<Array<number | null>>;
  avg: number;
}> = ({ rows, avg }) => {
  const labels = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  // Render at least one row so the widget isn't an empty grid.
  const displayRows = rows.length > 0 ? rows : [Array(7).fill(null)];

  // Find the day-of-week with the highest avg across all weeks for the
  // "Peak engagement" caller-out below the grid.
  const colAvgs = labels.map((_, i) => {
    const vals = displayRows.map(r => r[i]).filter((v): v is number => v != null);
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  });
  const peakIdx = colAvgs.reduce((maxIdx, v, i) => v > colAvgs[maxIdx]! ? i : maxIdx, 0);
  const peakLabel = labels[peakIdx];

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
          {labels.map(d => <span key={d}>{d}</span>)}
        </div>
        {displayRows.map((row, rIdx) => (
          <div key={rIdx} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
            {row.map((val, cIdx) => {
              const empty = val == null;
              const v = val ?? 0;
              const bg = empty ? '#F8FAFC'
                : v > 70 ? 'var(--primary)'
                : v > 30 ? '#60A5FA'
                : '#EFF6FF';
              return (
                <div
                  key={cIdx}
                  title={empty ? 'No class' : `${v}%`}
                  style={{
                    height: 40, backgroundColor: bg,
                    borderRadius: 'var(--radius-md)',
                    opacity: empty ? 0.6 : (v / 100) + 0.3,
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>

      <div style={{ marginTop: '1.5rem', backgroundColor: '#F9FAFB', borderRadius: 'var(--radius-md)', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.675rem', fontWeight: 700, color: 'var(--text-muted)' }}>AVERAGE</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>{avg}%</div>
        </div>
        <div style={{ fontSize: '0.815rem', color: 'var(--text-muted)', borderLeft: '1px solid var(--border-color)', paddingLeft: '1rem', lineHeight: 1.4 }}>
          {avg > 0
            ? <>Peak engagement occurs on <strong>{peakLabel}</strong>. Consider scheduling complex labs during this window.</>
            : <>No attendance data yet for the last 4 weeks. Mark a few lectures to see patterns emerge.</>}
        </div>
      </div>
    </>
  );
};
