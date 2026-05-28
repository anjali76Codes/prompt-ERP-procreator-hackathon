import React, { useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import {
  FileQuestion, Plus, Filter, LayoutGrid, List, Eye, Trash2, EyeOff, Copy, BarChart2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

interface Quiz {
  id: string;
  title: string;
  subject: string;
  chapter: string;
  division: string;
  status: 'Published' | 'Draft' | 'Scheduled';
  questions: number;
  marks: number;
  duration: string;
  submissions: number;
  totalStudents: number;
  avgMarks?: number;
  scheduledTime?: string;
}

const mapQuiz = (q: any): Quiz => ({
  id: q._id || q.id,
  title: q.title,
  subject: q.subject?.name || q.subject || q.subjectRef?.name || '',
  chapter: q.chapter || (q.questions?.[0]?.topics?.[0] || ''),
  division: q.division?.name || q.division?.code || (Array.isArray(q.divisionRefs) ? q.divisionRefs.map((d: any) => d.name || d).join(', ') : q.division) || '',
  status: q.status ? (q.status.charAt(0).toUpperCase() + q.status.slice(1)) : 'Draft',
  questions: q.questions?.length || 0,
  marks: q.totalMarks || q.questions?.reduce((s: number, qq: any) => s + (qq.points || 0), 0) || 0,
  duration: q.settings?.timeLimitMinutes ? `${q.settings.timeLimitMinutes}m` : (q.durationSeconds ? `${Math.round(q.durationSeconds / 60)}m` : '—'),
  submissions: q.stats?.submissions || 0,
  totalStudents: q.stats?.eligible || 0,
  avgMarks: q.stats?.avgMarks,
});

export const TeacherQuizOverview: React.FC = () => {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = React.useState(false);

  const reload = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await (await import('../lib/quiz/api')).listQuizzes();
      setQuizzes((res?.quizzes || []).map(mapQuiz));
    } catch (err) {
      console.error('Failed loading quizzes', err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { reload(); }, [reload]);

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [divisionFilter, setDivisionFilter] = useState('All Divisions');
  const [subjectFilter, setSubjectFilter] = useState('All Subjects');
  const [statusFilter, setStatusFilter] = useState('All Statuses');

  const handleDeleteQuiz = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this quiz?')) return;
    try {
      await (await import('../lib/quiz/api')).deleteQuiz(id);
      toast.success('Quiz deleted');
      setQuizzes(prev => prev.filter(q => q.id !== id));
    } catch (err: any) {
      console.error('Delete failed', err);
      toast.error(err?.message || 'Failed to delete quiz');
    }
  };

  const handleDuplicateQuiz = async (quiz: Quiz) => {
    try {
      const api = await import('../lib/quiz/api');
      // Pull the full quiz so we can recreate it with all its questions.
      const full = (await api.getQuiz(quiz.id)) as any;
      const src = full.quiz;
      const payload = {
        title: `${src.title} (Copy)`,
        description: src.description,
        division: src.division?._id || src.division,
        subject: src.subject?._id || src.subject,
        settings: src.settings || {},
        questions: (src.questions || []).map((qq: any) => ({
          text: qq.text,
          type: qq.type,
          points: qq.points,
          options: (qq.options || []).map((o: any) => ({ text: o.text, isCorrect: !!o.isCorrect })),
        })),
      };
      await api.createQuiz(payload);
      toast.success('Quiz duplicated as a draft');
      reload();
    } catch (err: any) {
      console.error('Duplicate failed', err);
      toast.error(err?.message || 'Failed to duplicate quiz');
    }
  };

  return (
    <AppLayout
      pageIcon={<FileQuestion size={18} />}
      pageTitle="Quiz Management"
      pageBreadcrumb="Evaluation Tools"
      background="#F3F4F6"
      pageActions={
        <button 
          onClick={() => navigate('/quiz/create')}
          style={{ 
            backgroundColor: 'var(--primary)', 
            color: 'white', 
            border: 'none', 
            borderRadius: 'var(--radius-md)', 
            padding: '0.6rem 1.5rem', 
            fontSize: '0.85rem', 
            fontWeight: 700, 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            boxShadow: '0 4px 10px rgba(13,138,188,0.2)'
          }}
        >
          <Plus size={16} /> Create New Quiz
        </button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2rem' }}>
        
        {/* Metric Cards Banner — derived from real quiz data */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1rem' }}>
          {(() => {
            const published = quizzes.filter(q => q.status === 'Published');
            const drafts = quizzes.filter(q => q.status === 'Draft');
            const totalQuestions = quizzes.reduce((s, q) => s + q.questions, 0);
            const totalSubmissions = quizzes.reduce((s, q) => s + q.submissions, 0);
            const scored = quizzes.filter(q => typeof q.avgMarks === 'number');
            const avg = scored.length
              ? Math.round(scored.reduce((s, q) => s + (q.avgMarks || 0), 0) / scored.length)
              : null;
            return [
              { label: 'Total Quizzes', val: String(quizzes.length), change: 'All quizzes', color: 'var(--primary)', bg: '#EFF6FF' },
              { label: 'Published', val: String(published.length), change: 'Live for students', color: '#10B981', bg: '#EFFDF5' },
              { label: 'Drafts', val: String(drafts.length), change: 'Not yet published', color: '#F59E0B', bg: '#FEFBF0' },
              { label: 'Avg. Score', val: avg != null ? `${avg}` : '—', change: 'Across graded', color: '#8B5CF6', bg: '#F5F3FF' },
              { label: 'Questions', val: String(totalQuestions), change: 'Total authored', color: '#EF4444', bg: '#FEF2F2' },
              { label: 'Submissions', val: String(totalSubmissions), change: 'Across all quizzes', color: '#0D8ABC', bg: '#F0F9FF' }
            ];
          })().map((card, i) => (
            <div key={i} style={{ backgroundColor: 'white', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748B' }}>{card.label}</span>
                <span style={{ backgroundColor: card.bg, color: card.color, width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>📊</span>
              </div>
              <span style={{ fontSize: '1.65rem', fontWeight: 800, color: '#1E293B' }}>{card.val}</span>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: card.color }}>{card.change}</span>
            </div>
          ))}
        </div>

        {/* Filters Panel */}
        <div style={{ backgroundColor: 'white', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 800, color: '#334155', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
            <Filter size={16} /> Advanced Filters
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            {(() => {
              // Build dropdown options from the real quizzes that came back from the API.
              const uniqueDivisions = Array.from(new Set(quizzes.map(q => q.division).filter(Boolean)));
              const uniqueSubjects = Array.from(new Set(quizzes.map(q => q.subject).filter(Boolean)));
              return [
                { label: 'Division', val: divisionFilter, set: setDivisionFilter, opts: ['All Divisions', ...uniqueDivisions] },
                { label: 'Subject', val: subjectFilter, set: setSubjectFilter, opts: ['All Subjects', ...uniqueSubjects] },
                { label: 'Status', val: statusFilter, set: setStatusFilter, opts: ['All Statuses', 'Published', 'Draft', 'Archived'] }
              ];
            })().map((filt, idx) => (
              <div key={idx}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '0.35rem' }}>{filt.label}</label>
                <select 
                  value={filt.val} 
                  onChange={e => filt.set(e.target.value)} 
                  style={{ width: '100%', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.75rem', fontSize: '0.8rem', outline: 'none', backgroundColor: '#F8FAFC', cursor: 'pointer', fontWeight: 600, color: '#334155' }}
                >
                  {filt.opts.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* Section Title & View Toggles */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>Active & Recent Quizzes</h3>
          <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: '#E2E8F0', padding: '0.2rem', borderRadius: 'var(--radius-md)' }}>
            <button 
              onClick={() => setViewMode('grid')}
              style={{ border: 'none', background: viewMode === 'grid' ? 'white' : 'transparent', color: '#475569', borderRadius: 'var(--radius-sm)', padding: '0.3rem 0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <LayoutGrid size={15} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              style={{ border: 'none', background: viewMode === 'list' ? 'white' : 'transparent', color: '#475569', borderRadius: 'var(--radius-sm)', padding: '0.3rem 0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <List size={15} />
            </button>
          </div>
        </div>

        {loading && (
          <div style={{ padding: '2rem', textAlign: 'center', fontWeight: 700, color: '#64748B' }}>Loading quizzes…</div>
        )}
        {!loading && quizzes.length === 0 && (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B', fontWeight: 600, backgroundColor: 'white', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
            No quizzes yet. Click <strong>“Create New Quiz”</strong> to build your first one.
          </div>
        )}

        {/* Quiz list card loop */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {quizzes
            .filter(quiz => statusFilter.startsWith('All') || quiz.status === statusFilter)
            .filter(quiz => subjectFilter.startsWith('All') || quiz.subject === subjectFilter)
            .filter(quiz => divisionFilter.startsWith('All') || quiz.division === divisionFilter)
            .map(quiz => (
            <div key={quiz.id} style={{ backgroundColor: 'white', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#1E293B' }}>{quiz.title}</h4>
                    <span style={{ 
                      backgroundColor: quiz.status === 'Published' ? '#EFFDF5' : quiz.status === 'Scheduled' ? '#FEFBF0' : '#F1F5F9',
                      color: quiz.status === 'Published' ? '#10B981' : quiz.status === 'Scheduled' ? '#F59E0B' : '#475569',
                      fontSize: '0.675rem',
                      fontWeight: 800,
                      padding: '0.15rem 0.5rem',
                      borderRadius: '0.25rem'
                    }}>{quiz.status}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.775rem', color: '#64748B', fontWeight: 600 }}>
                    <span>📖 Subject: <strong style={{ color: '#334155' }}>{quiz.subject}</strong></span>
                    <span>📑 Chapter: <strong style={{ color: '#334155' }}>{quiz.chapter}</strong></span>
                    <span>👥 Division: <strong style={{ color: '#334155' }}>{quiz.division}</strong></span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '2rem', textAlign: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>QUESTIONS</span>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1E293B', marginTop: '0.15rem' }}>{quiz.questions}</div>
                  </div>
                  <div style={{ borderLeft: '1px solid #EFF2F5', paddingLeft: '2rem' }}>
                    <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>MARKS</span>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1E293B', marginTop: '0.15rem' }}>{quiz.marks}</div>
                  </div>
                  <div style={{ borderLeft: '1px solid #EFF2F5', paddingLeft: '2rem' }}>
                    <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>DURATION</span>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1E293B', marginTop: '0.15rem' }}>{quiz.duration}</div>
                  </div>
                  <div style={{ borderLeft: '1px solid #EFF2F5', paddingLeft: '2rem' }}>
                    <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SUBMISSIONS</span>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1E293B', marginTop: '0.15rem' }}>
                      {quiz.status === 'Published' ? `${quiz.submissions} / ${quiz.totalStudents}` : '-'}
                    </div>
                  </div>
                  <div style={{ borderLeft: '1px solid #EFF2F5', paddingLeft: '2rem' }}>
                    <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>AVG MARKS</span>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.15rem' }}>
                      {quiz.avgMarks ? quiz.avgMarks : '-'}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #F1F5F9', paddingTop: '1rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {quiz.status === 'Published' && (
                    <button style={{ backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <BarChart2 size={14} /> View Analytics
                    </button>
                  )}
                  {quiz.status === 'Draft' && (
                    <button 
                      onClick={() => navigate('/quiz/create')}
                      style={{ backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', padding: '0.5rem 1.25rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Publish Quiz
                    </button>
                  )}
                  <button 
                    onClick={() => navigate('/quiz/create')}
                    style={{ backgroundColor: 'white', border: '1px solid #CBD5E1', color: '#475569', borderRadius: 'var(--radius-md)', padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDuplicateQuiz(quiz)}
                    style={{ backgroundColor: 'white', border: '1px solid #CBD5E1', color: '#475569', borderRadius: 'var(--radius-md)', padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <Copy size={13} /> Duplicate
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                    <Eye size={18} />
                  </button>
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                    <EyeOff size={18} />
                  </button>
                  <button 
                    onClick={() => handleDeleteQuiz(quiz.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444' }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Load More Button */}
        <button style={{ alignSelf: 'center', backgroundColor: 'white', border: '1px solid #CBD5E1', color: 'var(--primary)', borderRadius: 'var(--radius-md)', padding: '0.65rem 2rem', fontSize: '0.825rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '1rem' }}>
          Load More Quizzes
        </button>
      </div>
    </AppLayout>
  );
};
