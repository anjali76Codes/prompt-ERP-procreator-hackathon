import React, { useState } from 'react';
import {
  Calendar, Megaphone, FileSpreadsheet, BarChart, Send, CheckSquare, Plus,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';

interface Course {
  name: string;
  status: 'Active' | 'Lab Only';
  students: number;
  avg: string;
  progress: number;
  color: string;
  isLab: boolean;
}

const COURSES: Course[] = [
  { name: 'Computer Science 101', status: 'Active',   students: 128, avg: '78%', progress: 78, color: '#0D8ABC', isLab: false },
  { name: 'AI Algorithms',        status: 'Active',   students: 42,  avg: '84%', progress: 84, color: '#0D8ABC', isLab: false },
  { name: 'Data Visualization',   status: 'Lab Only', students: 35,  avg: '91%', progress: 91, color: '#16A34A', isLab: true  },
];

const HEATMAP: number[][] = [
  [20, 30, 80, 40, 90, 10, 15],
  [35, 95, 60, 45, 50, 12, 10],
];

const AT_RISK = [
  { name: 'Marcus Thorne', id: 'CS-2024-089', absences: 2, grade: 'D- (42%)', percent: 42,
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=100&h=100&q=80' },
];

const QUICK_ACTIONS = [
  { label: 'Announcement', icon: <Megaphone size={20} color="var(--primary)" /> },
  { label: 'Grade Batch',  icon: <FileSpreadsheet size={20} color="var(--primary)" /> },
  { label: 'Gen Report',   icon: <BarChart size={20} color="var(--primary)" /> },
  { label: 'Notify Class', icon: <Send size={20} color="var(--primary)" /> },
];

export const TeacherDashboard: React.FC = () => {
  const [pendingReviews] = useState(42);
  const [tasks, setTasks] = useState([
    { id: 1, text: 'Review AI Algorithms Quiz submissions',  done: false },
    { id: 2, text: 'Upload Mid-Term question paper',         done: true  },
    { id: 3, text: 'Submit departmental research report',    done: false },
  ]);
  const [newTaskText, setNewTaskText] = useState('');

  const toggleTask = (id: number) =>
    setTasks(tasks.map(t => (t.id === id ? { ...t, done: !t.done } : t)));

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    setTasks([...tasks, { id: Date.now(), text: newTaskText, done: false }]);
    setNewTaskText('');
  };

  return (
    <AppLayout>
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
                <h2 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>Good Morning, Professor!</h2>
                <p style={{ margin: '0.75rem 0 0', opacity: 0.9, lineHeight: 1.6, fontSize: '0.975rem' }}>
                  You have 3 lectures today and {pendingReviews} pending reviews. Students are showing high engagement in "AI Algorithms".
                </p>
              </div>
              <button
                className="btn"
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
              <button className="alert-row-cta">Manage Courses</button>
            </div>
            <div className="stack-md">
              {COURSES.map(course => (
                <div
                  key={course.name}
                  style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.925rem' }}>{course.name}</span>
                      <span
                        style={{
                          fontSize: '0.675rem', fontWeight: 700, padding: '0.125rem 0.5rem', borderRadius: '0.25rem',
                          backgroundColor: course.isLab ? '#F3F4F6' : '#EFF6FF',
                          color: course.isLab ? 'var(--text-muted)' : 'var(--primary)',
                        }}
                      >
                        {course.status}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <span>👥 {course.students} Students</span>
                      <span>📈 {course.avg} Avg</span>
                    </div>
                  </div>
                  <div style={{ width: 120, marginLeft: '1rem' }}>
                    <div style={{ height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${course.progress}%`, backgroundColor: course.color, borderRadius: 3 }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Engagement heatmap */}
          <div className="card">
            <div className="card-header" style={{ marginBottom: '0.5rem' }}>
              <h3 className="card-title-lg">Engagement Analytics</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ display: 'inline-block', width: 8, height: 8, backgroundColor: '#EFF6FF', borderRadius: 2 }} /> Low
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ display: 'inline-block', width: 8, height: 8, backgroundColor: '#60A5FA', borderRadius: 2 }} /> Med
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ display: 'inline-block', width: 8, height: 8, backgroundColor: 'var(--primary)', borderRadius: 2 }} /> High
                </div>
                <select style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.25rem 0.5rem', backgroundColor: 'white', fontWeight: 500 }}>
                  <option>Last 4 Weeks</option>
                </select>
              </div>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.815rem', margin: '0 0 1.5rem' }}>
              Weekly attendance & participation heatmap
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(d => <span key={d}>{d}</span>)}
              </div>
              {HEATMAP.map((row, rIdx) => (
                <div key={rIdx} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
                  {row.map((val, cIdx) => {
                    const bg = val > 70 ? 'var(--primary)' : val > 30 ? '#60A5FA' : '#EFF6FF';
                    return (
                      <div
                        key={cIdx}
                        title={`${val}%`}
                        style={{ height: 40, backgroundColor: bg, borderRadius: 'var(--radius-md)', opacity: val / 100 + 0.3 }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>

            <div style={{ marginTop: '1.5rem', backgroundColor: '#F9FAFB', borderRadius: 'var(--radius-md)', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.675rem', fontWeight: 700, color: 'var(--text-muted)' }}>AVERAGE</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>88.4%</div>
              </div>
              <div style={{ fontSize: '0.815rem', color: 'var(--text-muted)', borderLeft: '1px solid var(--border-color)', paddingLeft: '1rem', lineHeight: 1.4 }}>
                Peak engagement occurs on Wednesdays during 10:00 AM sessions. Consider scheduling complex labs during this window.
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="stack-lg">
          {/* Metric cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="metric-card">
              <div className="metric-card-body">
                <span className="metric-card-label" style={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.675rem' }}>Attendance</span>
                <span className="metric-card-value" style={{ fontSize: '1.5rem' }}>94.2%</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#16A34A' }}>+2%</span>
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-card-body">
                <span className="metric-card-label" style={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.675rem' }}>At-Risk</span>
                <span className="metric-card-value" style={{ fontSize: '1.5rem', color: '#DC2626' }}>08</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#DC2626' }}>Alert</span>
              </div>
            </div>
          </div>

          {/* Upcoming Exams */}
          <div className="card">
            <div className="card-header" style={{ marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.975rem', fontWeight: 700 }}>Upcoming Exams</h3>
              <Calendar size={16} color="var(--text-muted)" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ backgroundColor: '#EFF6FF', color: 'var(--primary)', padding: '0.5rem', borderRadius: 'var(--radius-md)', textAlign: 'center', minWidth: 45 }}>
                  <div style={{ fontSize: '0.625rem', fontWeight: 700 }}>OCT</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800 }}>24</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Mid-Term: Data Structures</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>10:00 AM • Exam Hall B</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ backgroundColor: '#F3F4F6', color: 'var(--text-muted)', padding: '0.5rem', borderRadius: 'var(--radius-md)', textAlign: 'center', minWidth: 45 }}>
                  <div style={{ fontSize: '0.625rem', fontWeight: 700 }}>OCT</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800 }}>27</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Project: AI Ethics</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>11:59 PM • Online Portal</div>
                </div>
              </div>
            </div>
          </div>

          {/* At-Risk Students */}
          <div className="card" style={{ position: 'relative' }}>
            <div className="card-header" style={{ marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.975rem', fontWeight: 700 }}>At-Risk Students</h3>
              <button className="alert-row-cta">View All 08 Students</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {AT_RISK.map(student => (
                <div
                  key={student.id}
                  style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.75rem' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                    <img src={student.avatar} alt={student.name} style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', objectFit: 'cover' }} />
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{student.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        ID: {student.id} • {student.absences} Absences
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', marginRight: '0.5rem' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#DC2626' }}>{student.grade}</div>
                    <div style={{ width: 60, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, overflow: 'hidden', marginTop: '0.25rem', display: 'inline-block' }}>
                      <div style={{ height: '100%', width: `${student.percent}%`, backgroundColor: '#DC2626' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              aria-label="Add at-risk student"
              style={{
                position: 'absolute', bottom: '1rem', right: '1rem',
                width: '2.5rem', height: '2.5rem', borderRadius: '50%',
                backgroundColor: 'var(--primary)', color: 'white', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', cursor: 'pointer',
              }}
            >
              <Plus size={20} />
            </button>
          </div>

          {/* Personal Tasks */}
          <div className="card">
            <div className="card-header" style={{ marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.975rem', fontWeight: 700 }}>Personal Agenda & Tasks</h3>
              <CheckSquare size={16} color="var(--primary)" />
            </div>
            <form onSubmit={addTask} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input
                type="text"
                placeholder="Add task..."
                value={newTaskText}
                onChange={e => setNewTaskText(e.target.value)}
                style={{ flex: 1, border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.375rem 0.75rem', fontSize: '0.815rem', outline: 'none' }}
              />
              <button type="submit" className="btn btn-primary btn-sm">Add</button>
            </form>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {tasks.map(task => (
                <label key={task.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', fontSize: '0.815rem' }}>
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() => toggleTask(task.id)}
                    style={{ marginTop: '0.125rem', accentColor: 'var(--primary)' }}
                  />
                  <span style={{ textDecoration: task.done ? 'line-through' : 'none', color: task.done ? 'var(--text-muted)' : 'var(--text-main)', lineHeight: 1.3 }}>
                    {task.text}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
