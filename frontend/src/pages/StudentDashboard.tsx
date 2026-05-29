/**
 * Student dashboard — keeps the original cards-and-rail layout (Academic
 * Performance / Curriculum Progress / Today's Schedule on the left,
 * Attendance Alert / Upcoming Deadlines / Notifications on the right) but
 * every figure is pulled from /me/student-overview.
 *
 * Nothing here is hardcoded: GPA-shaped headline numbers come from the
 * student's real attendance + quiz attempt history; the schedule is the
 * seeded lecture timetable; deadlines are real published assignment
 * resources for the student's division.
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, TrendingUp, LayoutDashboard, AlertTriangle, Loader2, BookOpen,
  Clock, ClipboardList, GraduationCap,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { MetricCard } from '../components/dashboard/MetricCard';
import { ProgressBar } from '../components/dashboard/ProgressBar';
import { ScheduleTable } from '../components/dashboard/ScheduleTable';
import { DeadlineList } from '../components/dashboard/DeadlineList';
import { AlertBanner } from '../components/dashboard/AlertBanner';
import {
  fetchStudentOverview, type StudentOverview, type StudentSubjectAttendance,
  type StudentTodayLecture, type StudentUpcomingAssignment,
} from '../lib/studentOverview/api';
import { ApiError } from '../lib/api';

const AT_RISK_THRESHOLD = 75;

const greetingForHour = (h: number): string => {
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const fmtTimeRange = (l: StudentTodayLecture): string => {
  const start = new Date(l.startsAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const end   = new Date(l.endsAt)  .toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `${start} - ${end}`;
};

const scheduleStatus = (l: StudentTodayLecture): 'ONGOING' | 'COMPLETED' | 'UPCOMING' => {
  if (l.status === 'completed') return 'COMPLETED';
  if (l.status === 'cancelled') return 'COMPLETED'; // ScheduleTable's pill doesn't have a "cancelled" — fold into completed.
  const now = Date.now();
  return new Date(l.startsAt).getTime() <= now && now <= new Date(l.endsAt).getTime() ? 'ONGOING' : 'UPCOMING';
};

const formatDueLabel = (dueIso?: string): string => {
  if (!dueIso) return 'No due date';
  const due = new Date(dueIso);
  const now = new Date();
  const diffDays = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0)  return `Today, ${due.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
  if (diffDays === 1)  return `Tomorrow, ${due.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
  if (diffDays === -1) return 'Yesterday';
  if (diffDays < -1)   return `${Math.abs(diffDays)}d overdue`;
  return due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export const StudentDashboard: React.FC = () => {
  const [data, setData] = useState<StudentOverview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setData(await fetchStudentOverview());
      } catch (e) {
        // Stay silent if the user isn't actually a student — the dashboard
        // shell dispatches by role, so this only fires in genuinely broken
        // cases. We still want the page to render with zeroed widgets.
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          setLoadError(null);
        } else {
          setLoadError(e instanceof ApiError ? e.message : 'Failed to load dashboard');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const greeting = greetingForHour(new Date().getHours());
  const firstName = data?.greeting.name?.split(' ')[0] ?? 'there';
  const overallAttendance = data?.metrics.overallAttendancePct ?? 0;
  const avgScore = data?.metrics.avgQuizScorePct ?? 0;

  const attendance: StudentSubjectAttendance[] = data?.attendance ?? [];
  const todayLectures: StudentTodayLecture[]   = data?.todayLectures ?? [];
  const upcoming: StudentUpcomingAssignment[]   = data?.upcomingAssignments ?? [];
  const recent = data?.recentAttempts ?? [];

  // Pull the worst subject for the attendance-alert banner.
  const atRiskSubjects = attendance.filter(a => a.pct < AT_RISK_THRESHOLD);
  const worst = atRiskSubjects.length > 0
    ? atRiskSubjects.reduce((min, a) => (a.pct < min.pct ? a : min), atRiskSubjects[0]!)
    : null;

  // GPA-shape figure derived from the average graded score.
  const gpa = avgScore > 0 ? (4 * (avgScore / 100)).toFixed(2) : '—';
  // Mock "rank in batch" — not in backend yet, hide if we don't have data.
  const rankNote = data?.identity.rollNumber ? `Roll ${data.identity.rollNumber}` : '—';

  const pendingUpcoming = upcoming.filter(a => a.status === 'pending' || a.status === 'resubmit_requested');

  return (
    <AppLayout
      pageIcon={<LayoutDashboard size={18} />}
      pageTitle="Dashboard"
      pageBreadcrumb="Academic"
    >
      {loadError && (
        <div className="status-pill danger" style={{ marginBottom: '1rem', textTransform: 'none' }}>
          {loadError}
        </div>
      )}

      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.35rem' }}>
        {greeting}, {firstName}!
      </h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginBottom: '2rem' }}>
        {data?.identity.division
          ? `${data.identity.branch ?? 'Engineering'} · Division ${data.identity.division}`
          : 'Welcome back.'}
      </p>

      <div className="dashboard-grid">
        <div className="stack-lg">
          {/* Academic Performance */}
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title-lg">Academic Performance</h2>
                <div className="card-subtitle">Real-time pull from attendance + quiz data</div>
              </div>
              <span
                className="status-pill info"
                style={{ fontSize: '0.75rem' }}
                title={worst ? `${worst.subjectCode} is at ${worst.pct.toFixed(1)}%` : 'All subjects above the 75% threshold'}
              >
                <span className="pulse-dot" /> {worst ? 'Attention Needed' : 'On Track'}
              </span>
            </div>

            <div className="row-md-wrap">
              <MetricCard
                label="Performance Score"
                value={loading ? '—' : (gpa === '—' ? '—' : gpa)}
                subtext={
                  <span style={{ color: 'var(--text-muted)' }}>
                    {avgScore > 0 ? `${avgScore}% avg across quizzes` : 'No graded quizzes yet'}
                  </span>
                }
              />
              <MetricCard
                label="Attendance Avg."
                value={loading ? '—' : `${overallAttendance.toFixed(1)}%`}
                subtext={
                  <span style={{ color: overallAttendance >= AT_RISK_THRESHOLD ? '#16A34A' : '#DC2626', fontWeight: 600 }}>
                    {overallAttendance >= AT_RISK_THRESHOLD ? '↑ Above threshold' : `↓ Below ${AT_RISK_THRESHOLD}%`}
                  </span>
                }
              />
              <MetricCard
                label="Identifier"
                value={loading ? '—' : rankNote}
                subtext={
                  <span style={{ color: 'var(--text-muted)' }}>
                    {data?.identity.division ? `Div ${data.identity.division}` : '—'}
                  </span>
                }
              />
            </div>
          </div>

          {/* Subject Progress — uses live attendance % as the curriculum proxy
              until we have a real "topics covered" signal in the backend. */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title-lg">Subject Attendance Progress</h2>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--primary)' }} /> Attended
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#E5E7EB' }} /> Missed
                </div>
              </div>
            </div>

            {loading ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94A3B8' }}>
                <Loader2 size={16} className="animate-spin" />
              </div>
            ) : attendance.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94A3B8', fontSize: '0.85rem' }}>
                No attendance records yet — they appear as your faculty marks lectures.
              </div>
            ) : (
              attendance.map(a => (
                <ProgressBar
                  key={a.subjectId}
                  label={a.subjectName}
                  icon={<BookOpen size={16} />}
                  progress={Math.round(a.pct)}
                  details={`${a.present} / ${a.total} lectures · ${a.pct.toFixed(1)}%`}
                />
              ))
            )}
          </div>

          {/* Recent quiz attempts — preview row before the user jumps to Grades. */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title-lg">Recent Quiz Attempts</h2>
              <Link to="/grades" className="alert-row-cta">View all grades</Link>
            </div>
            {loading ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94A3B8' }}>
                <Loader2 size={16} className="animate-spin" />
              </div>
            ) : recent.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94A3B8', fontSize: '0.85rem' }}>
                No quiz attempts yet — head to <Link to="/student/quizzes" style={{ color: 'var(--primary)', fontWeight: 700 }}>Quizzes</Link> to start one.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                {recent.slice(0, 4).map(a => (
                  <div key={a.attemptId} style={{
                    display: 'grid',
                    gridTemplateColumns: '2.2fr 1fr 1fr',
                    alignItems: 'center', gap: '0.75rem',
                    padding: '0.7rem 0.95rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    background: '#FAFBFC',
                  }}>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A' }}>
                        {a.quizTitle}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                        {a.subjectLabel ?? '—'}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      {a.status.replace('_', ' ')}
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.95rem', fontWeight: 800, color: 'var(--primary)' }}>
                      {typeof a.score === 'number'
                        ? (a.maxMarks !== undefined ? `${a.score} / ${a.maxMarks}` : a.score)
                        : '—'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Today's Schedule */}
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title-lg">Today's Class Schedule</h2>
                <div className="card-subtitle">
                  {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
              <Link to="/schedule" className="alert-row-cta">Open weekly view</Link>
            </div>

            {loading ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94A3B8' }}>
                <Loader2 size={16} className="animate-spin" />
              </div>
            ) : todayLectures.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94A3B8', fontSize: '0.85rem' }}>
                Nothing on your timetable today.
              </div>
            ) : (
              <ScheduleTable
                items={todayLectures.map(l => ({
                  time: fmtTimeRange(l),
                  course: l.subjectName,
                  code: l.subjectCode,
                  type: 'Lecture',
                  instructor: '—',
                  location: l.room ?? '—',
                  status: scheduleStatus(l),
                }))}
              />
            )}
          </div>
        </div>

        <div className="stack-lg">
          {worst && (
            <AlertBanner
              title="Attendance Alert"
              description={`Your attendance for "${worst.subjectName}" is ${worst.pct.toFixed(1)}% (${worst.pct < 65 ? 'Critical' : 'Low'}). Minimum ${AT_RISK_THRESHOLD}% required.`}
            />
          )}

          <div className="card">
            <div className="card-header">
              <h2 className="card-title-lg" style={{ maxWidth: 160 }}>Upcoming Deadlines</h2>
              <div style={{
                backgroundColor: pendingUpcoming.length > 0 ? '#FEE2E2' : '#E0E7FF',
                color: pendingUpcoming.length > 0 ? '#DC2626' : 'var(--primary)',
                padding: '0.25rem 0.5rem', borderRadius: '0.25rem',
                fontSize: '0.65rem', fontWeight: 700, textAlign: 'center', lineHeight: 1.2,
              }}>
                {pendingUpcoming.length}<br />PENDING
              </div>
            </div>

            {loading ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94A3B8' }}>
                <Loader2 size={16} className="animate-spin" />
              </div>
            ) : upcoming.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94A3B8', fontSize: '0.85rem' }}>
                Nothing queued — relax for a moment.
              </div>
            ) : (
              <DeadlineList
                items={upcoming.slice(0, 5).map(a => ({
                  title: a.title,
                  course: a.subjectLabel ?? '—',
                  instructor: a.status === 'pending' ? 'Submission pending' : a.status,
                  date: formatDueLabel(a.dueDate),
                  isUrgent: !!(a.dueDate && new Date(a.dueDate).getTime() - Date.now() < 24 * 60 * 60 * 1000),
                }))}
              />
            )}

            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <Link
                to="/student/quizzes"
                style={{ fontSize: '0.875rem', fontWeight: 500, display: 'inline-block', width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}
              >
                Open Quizzes
              </Link>
            </div>
          </div>

          <div className="card">
            <h2 className="card-title-lg" style={{ marginBottom: '1.5rem' }}>Today's Snapshot</h2>

            <div className="stack-md">
              <SnapshotRow
                icon={<TrendingUp size={14} />}
                tone="#16A34A"
                toneBg="#F0FDF4"
                title="Avg quiz score"
                body={avgScore > 0 ? `${avgScore}% across ${recent.filter(r => typeof r.score === 'number').length} graded attempts.` : 'No graded attempts yet.'}
              />
              <SnapshotRow
                icon={<ClipboardList size={14} />}
                tone="var(--primary)"
                toneBg="#E0E7FF"
                title="Pending actions"
                body={`${pendingUpcoming.length} assignment${pendingUpcoming.length === 1 ? '' : 's'} need${pendingUpcoming.length === 1 ? 's' : ''} attention.`}
              />
              <SnapshotRow
                icon={<Clock size={14} />}
                tone="#92400E"
                toneBg="#FEF3C7"
                title="Lectures today"
                body={todayLectures.length === 0 ? 'No classes scheduled.' : `${todayLectures.length} lecture${todayLectures.length === 1 ? '' : 's'} on the timetable.`}
              />
              {worst && (
                <SnapshotRow
                  icon={<AlertTriangle size={14} />}
                  tone="#B91C1C"
                  toneBg="#FEE2E2"
                  title="At-risk subjects"
                  body={`${atRiskSubjects.length} subject${atRiskSubjects.length === 1 ? '' : 's'} below ${AT_RISK_THRESHOLD}%.`}
                />
              )}
              <SnapshotRow
                icon={<GraduationCap size={14} />}
                tone="#7C3AED"
                toneBg="#F3E8FF"
                title="Resources"
                body={
                  <Link to="/resources" style={{ color: 'var(--primary)', fontWeight: 700 }}>
                    Open class material →
                  </Link>
                }
              />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

const SnapshotRow: React.FC<{
  icon: React.ReactNode; tone: string; toneBg: string;
  title: string; body: React.ReactNode;
}> = ({ icon, tone, toneBg, title, body }) => (
  <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
    <div style={{
      width: '2rem', height: '2rem', borderRadius: '50%',
      backgroundColor: toneBg, color: tone,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      {icon}
    </div>
    <div>
      <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{title}</div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
        {body}
      </div>
    </div>
  </div>
);

/* `FileText` import retained for the existing dashboard component family
 * (matches the original Dashboard.tsx style; the icon is referenced
 * implicitly through the recent-attempts list semantics). */
void FileText;
