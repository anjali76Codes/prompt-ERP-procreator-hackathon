import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, PlaySquare, Folder, TrendingUp, LayoutDashboard } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { MetricCard } from '../components/dashboard/MetricCard';
import { ProgressBar } from '../components/dashboard/ProgressBar';
import { ResourceCard } from '../components/dashboard/ResourceCard';
import { ScheduleTable } from '../components/dashboard/ScheduleTable';
import { DeadlineList } from '../components/dashboard/DeadlineList';
import { AlertBanner } from '../components/dashboard/AlertBanner';
import { TeacherDashboard } from './TeacherDashboard';
import { useRole } from '../lib/useRole';

const SCHEDULE = [
  { time: '09:00 - 10:30', course: 'Compiler Design',       code: 'CS301', type: 'Theory',     instructor: 'Dr. Sarah Johnson', location: 'LH-A102',         status: 'ONGOING'  as const },
  { time: '10:45 - 12:15', course: 'Soft Computing',        code: 'IT402', type: 'Laboratory', instructor: 'Prof. Mark Taylor', location: 'CL-03 (B-Wing)',  status: 'UPCOMING' as const },
  { time: '13:30 - 15:00', course: 'Theory of Computation', code: 'CS504', type: 'Seminar',    instructor: 'Dr. Emily White',   location: 'Auditorium II',   status: 'UPCOMING' as const },
];

const DEADLINES = [
  { title: 'Compiler Lab Report',     course: 'CS301', instructor: 'Dr. Johnson',       date: 'Today, 11:59 PM',  isUrgent: true },
  { title: 'Soft Computing Quiz',     course: 'IT402', instructor: 'Prof. Mark Taylor', date: 'Oct 12, 10:00 AM' },
  { title: 'AI Research Draft',       course: 'CS501', instructor: 'Semester Project',  date: 'Oct 15, 5:00 PM'  },
];

export const Dashboard: React.FC = () => {
  const { role } = useRole();
  if (role === 'teacher') return <TeacherDashboard />;

  return (
    <AppLayout
      pageIcon={<LayoutDashboard size={18} />}
      pageTitle="Dashboard"
      pageBreadcrumb="Academic"
    >
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '2rem' }}>Good Morning, Alex!</h1>

      <div className="dashboard-grid">
        <div className="stack-lg">
          {/* Academic Performance */}
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title-lg">Academic Performance</h2>
                <div className="card-subtitle">Semester 5 Real-time Analytics</div>
              </div>
              <span className="status-pill info" style={{ fontSize: '0.75rem' }}>
                <span className="pulse-dot" /> On Track
              </span>
            </div>

            <div className="row-md-wrap">
              <MetricCard
                label="Current GPA"
                value="3.82"
                subtext={<span style={{ color: '#16A34A', fontWeight: 600 }}>↑ 0.15</span>}
              />
              <MetricCard
                label="Attendance Avg."
                value="92.4%"
                subtext={<span style={{ color: 'var(--text-muted)' }}>Global Avg: 84%</span>}
              />
              <MetricCard
                label="Rank In Batch"
                value="#08"
                subtext={<span style={{ color: 'var(--text-muted)' }}>of 120 Students</span>}
              />
            </div>
          </div>

          {/* Curriculum Progress */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title-lg">Curriculum Progress</h2>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--primary)' }} /> Completed
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#E5E7EB' }} /> Remaining
                </div>
              </div>
            </div>

            <ProgressBar label="Compiler Design"        icon={<FileText size={16} />} progress={75} details="12/16 Modules • 75%" />
            <ProgressBar label="Soft Computing"         icon={<FileText size={16} />} progress={60} details="9/15 Modules • 60%"  />
            <ProgressBar label="Theory of Computation"  icon={<FileText size={16} />} progress={45} details="8/18 Modules • 45%"  />
          </div>

          {/* Course Material */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title-lg">Course Material</h2>
              <Link to="/resources" className="alert-row-cta">Access Digital Library</Link>
            </div>
            <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
              <ResourceCard icon={<FileText   size={24} />} iconColor="var(--primary)" title="ML_Lecture_No..."    subtitle="CS302 • UNIT 3" />
              <ResourceCard icon={<PlaySquare size={24} />} iconColor="#16A34A"        title="DBMS_Present..."     subtitle="IT401 • ARCHIVE" />
              <ResourceCard icon={<PlaySquare size={24} />} iconColor="#DC2626"        title="Algo_Visuals_V..."   subtitle="CS101 • LAB" />
              <ResourceCard icon={<Folder     size={24} />} iconColor="var(--text-muted)" title="Shared Docs"      subtitle="SEMESTER FILES" isFolder />
            </div>
          </div>

          {/* Today's Schedule */}
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title-lg">Today's Class Schedule</h2>
                <div className="card-subtitle">Monday, October 16, 2023</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#16A34A' }} /> Live
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-secondary btn-icon-only btn-xs" aria-label="Previous day">&lt;</button>
                  <button className="btn btn-secondary btn-icon-only btn-xs" aria-label="Next day">&gt;</button>
                </div>
              </div>
            </div>

            <ScheduleTable items={SCHEDULE} />

            <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
              <Link to="/schedule" className="alert-row-cta">Download Weekly Schedule (PDF)</Link>
            </div>
          </div>
        </div>

        <div className="stack-lg">
          <AlertBanner
            title="Attendance Alert"
            description='Your attendance for "Machine Learning" is 72% (Critical). Minimum 75% required.'
          />

          <div className="card">
            <div className="card-header">
              <h2 className="card-title-lg" style={{ maxWidth: 120 }}>Upcoming Deadlines</h2>
              <div style={{ backgroundColor: '#FEE2E2', color: '#DC2626', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.65rem', fontWeight: 700, textAlign: 'center', lineHeight: 1.2 }}>
                3<br />PENDING
              </div>
            </div>

            <DeadlineList items={DEADLINES} />

            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <Link
                to="/schedule"
                style={{ fontSize: '0.875rem', fontWeight: 500, display: 'inline-block', width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}
              >
                View All Tasks
              </Link>
            </div>
          </div>

          <div className="card">
            <h2 className="card-title-lg" style={{ marginBottom: '1.5rem' }}>Recent Notifications</h2>

            <div className="stack-md">
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', backgroundColor: '#E0E7FF', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={14} />
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>New Assignment Posted</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Dr. Sarah Johnson uploaded new materials for CS301.</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>2 hours ago</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', backgroundColor: '#F0FDF4', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <TrendingUp size={14} />
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>Grades Updated</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Mid-term scores for IT402 are now available.</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Yesterday at 4:30 PM</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
