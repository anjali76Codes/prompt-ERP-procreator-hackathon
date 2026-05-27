import React, { useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import {
  FileQuestion
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface StudentQuiz {
  id: string;
  title: string;
  subject: string;
  teacher: string;
  questions: number;
  marks: number;
  duration: string;
  deadline: string;
  status: 'Assigned' | 'Upcoming' | 'Completed';
  avatar: string;
  score?: number;
  availableDate?: string;
}

export const StudentQuizList: React.FC = () => {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<StudentQuiz[]>([]);
  const [, setLoading] = React.useState(false);
  const [subjectFilter, setSubjectFilter] = useState('All Subjects');
  const [statusFilter, setStatusFilter] = useState('All Status');

  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const res = await (await import('../lib/quiz/api')).listStudentQuizzes();
        const items = (res?.quizzes || []).map((q: any) => ({
          id: q._id || q.id,
          title: q.title,
          subject: q.subject?.name || q.subject || '',
          teacher: q.teacher?.name || q.teacher || (q.createdBy?.name || ''),
          questions: q.questions?.length || 0,
          marks: q.totalMarks || q.questions?.reduce((s: number, qq: any)=>s + (qq.marks||0), 0) || 0,
          duration: q.durationSeconds ? `${Math.round(q.durationSeconds/60)} Min` : (q.duration || '—'),
          deadline: q.endsAt ? new Date(q.endsAt).toLocaleString() : (q.availableFrom ? new Date(q.availableFrom).toLocaleString() : '-'),
          status: q.status === 'published' ? 'Assigned' : (q.status ? q.status : 'Upcoming'),
          avatar: q.teacher?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(q.teacher?.name||q.createdBy?.name||'Tutor')}&background=0D8ABC&color=fff`,
          score: q.latestAttempt?.score ?? undefined,
          availableDate: q.availableFrom ? new Date(q.availableFrom).toLocaleString() : undefined
        }));
        if (mounted) setQuizzes(items);
      } catch (err) {
        console.error('Failed loading student quizzes', err);
      } finally { setLoading(false); }
    };
    load();
    return () => { mounted = false; };
  }, []);

  return (
    <AppLayout
      pageIcon={<FileQuestion size={18} />}
      pageTitle="Quizzes"
      pageBreadcrumb="My Learning"
      background="#F3F4F6"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2rem' }}>
        
        {/* Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
          {[
            { label: 'ASSIGNED', val: '5', color: '#2563EB', bg: '#EFF6FF' },
            { label: 'PENDING', val: '3', color: '#D97706', bg: '#FEFBF0' },
            { label: 'COMPLETED', val: '12', color: '#16A34A', bg: '#EFFDF5' },
            { label: 'AVG. SCORE', val: '82%', color: '#7C3AED', bg: '#F5F3FF' },
            { label: 'DEADLINES', val: '2 ⏰', color: '#DC2626', bg: '#FEF2F2' }
          ].map((metric, i) => (
            <div key={i} style={{ backgroundColor: 'white', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <span style={{ fontSize: '0.675rem', fontWeight: 800, color: '#64748B', letterSpacing: '0.5px' }}>{metric.label}</span>
              <span style={{ fontSize: '1.85rem', fontWeight: 800, color: metric.color }}>{metric.val}</span>
            </div>
          ))}
        </div>

        {/* Section title & Filters */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>Available Quizzes</h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748B', fontWeight: 500 }}>Review and take your assigned academic assessments.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <select 
              value={subjectFilter} 
              onChange={e => setSubjectFilter(e.target.value)}
              style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem 1rem', fontSize: '0.8rem', outline: 'none', backgroundColor: 'white', fontWeight: 600, color: '#334155', cursor: 'pointer' }}
            >
              <option>All Subjects</option>
              <option>Java Programming</option>
              <option>Data Structures</option>
              <option>UI Design</option>
              <option>DBMS</option>
            </select>
            <select 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value)}
              style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem 1rem', fontSize: '0.8rem', outline: 'none', backgroundColor: 'white', fontWeight: 600, color: '#334155', cursor: 'pointer' }}
            >
              <option>All Status</option>
              <option>Assigned</option>
              <option>Upcoming</option>
              <option>Completed</option>
            </select>
          </div>
        </div>

        {/* Grid layout exactly matching page 3 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
          {quizzes.map(quiz => (
            <div 
              key={quiz.id} 
              style={{ 
                backgroundColor: 'white', 
                border: '1px solid var(--border-color)', 
                borderRadius: 'var(--radius-lg)', 
                padding: '1.5rem', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '1.25rem', 
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
                position: 'relative',
                borderLeft: quiz.status === 'Assigned' ? '4px solid var(--primary)' : quiz.status === 'Completed' ? '4px solid #10B981' : '4px solid #94A3B8'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ 
                  backgroundColor: quiz.status === 'Assigned' ? '#FEFBF0' : quiz.status === 'Completed' ? '#EFFDF5' : '#F1F5F9',
                  color: quiz.status === 'Assigned' ? '#D97706' : quiz.status === 'Completed' ? '#16A34A' : '#475569',
                  fontSize: '0.675rem',
                  fontWeight: 800,
                  padding: '0.2rem 0.5rem',
                  borderRadius: '0.25rem'
                }}>
                  {quiz.status === 'Assigned' ? 'Due Tomorrow' : quiz.status}
                </span>
                <span style={{ color: '#94A3B8' }}>{quiz.status === 'Completed' ? '✔' : '⚡'}</span>
              </div>

              <div>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#1E293B', lineHeight: 1.3 }}>{quiz.title}</h4>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>Subject: {quiz.subject}</p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderTop: '1px solid #F1F5F9', paddingTop: '0.75rem' }}>
                <img src={quiz.avatar} alt={quiz.teacher} style={{ width: '1.75rem', height: '1.75rem', borderRadius: '50%' }} />
                <span style={{ fontSize: '0.775rem', fontWeight: 600, color: '#475569' }}>{quiz.teacher}</span>
              </div>

              {quiz.status === 'Completed' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', fontWeight: 700 }}>
                    <span style={{ color: '#64748B' }}>Your Score</span>
                    <span style={{ color: 'var(--primary)' }}>{quiz.score}%</span>
                  </div>
                  <div style={{ height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${quiz.score}%`, backgroundColor: 'var(--primary)', borderRadius: 3 }} />
                  </div>
                  <button style={{ backgroundColor: 'white', border: '1px solid #CBD5E1', color: 'var(--primary)', padding: '0.55rem', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', marginTop: '0.5rem' }}>
                    View Result
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.775rem', color: '#64748B', fontWeight: 600, marginTop: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>📋 {quiz.questions} Qs</span>
                    <span>🎖 {quiz.marks} Marks</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>⏱ {quiz.duration}</span>
                    <span>⏰ Deadline: {quiz.deadline}</span>
                  </div>

                  {quiz.status === 'Assigned' ? (
                    <button 
                      onClick={() => navigate(`/quiz/take/${quiz.id}/details`)}
                      style={{ backgroundColor: 'var(--primary)', color: 'white', border: 'none', padding: '0.6rem', borderRadius: 'var(--radius-md)', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', marginTop: '0.75rem', boxShadow: '0 4px 8px rgba(13,138,188,0.1)' }}
                    >
                      Start Quiz
                    </button>
                  ) : (
                    <button disabled style={{ backgroundColor: '#E2E8F0', color: '#94A3B8', border: 'none', padding: '0.6rem', borderRadius: 'var(--radius-md)', fontWeight: 800, fontSize: '0.8rem', cursor: 'not-allowed', marginTop: '0.75rem' }}>
                      Available Tomorrow
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};
