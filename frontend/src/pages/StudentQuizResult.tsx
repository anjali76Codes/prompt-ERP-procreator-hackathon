import React, { useEffect, useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { CheckCircle, Award } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';

export const StudentQuizResult: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const api = await import('../lib/quiz/api');
        const res = await api.getAttempt(id);
        if (!mounted) return;
        setAttempt(res.attempt);
      } catch (err) {
        console.error('Failed to load attempt', err);
      } finally { setLoading(false); }
    };
    load();
    return () => { mounted = false; };
  }, [id]);

  const score = attempt?.score ?? null;
  const total = attempt?.totalMarks ?? attempt?.quiz?.totalMarks ?? null;
  const percentage = score != null && total ? Math.round((score / total) * 100) : null;

  return (
    <AppLayout
      pageIcon={<Award size={18} />}
      pageTitle="Quiz Result"
      pageBreadcrumb="My Learning"
      background="#F3F4F6"
    >
      <div style={{ display: 'flex', gap: '2rem', paddingBottom: '2rem' }}>
        <div style={{ flex: 1, background: 'white', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '2rem' }}>
          <h2 style={{ marginTop: 0 }}>Result Summary</h2>
          {loading && <div>Loading...</div>}
          {!loading && attempt && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <CheckCircle size={36} color="#10B981" />
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{score != null ? `${score} / ${total}` : '-'} </div>
                  <div style={{ color: '#64748B' }}>{percentage != null ? `${percentage}%` : ''}</div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 700 }}>Quiz</div>
                  <div>{attempt?.quiz?.title || attempt?.quizTitle || '-'}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 700 }}>Time Taken</div>
                  <div>{attempt?.timeTaken ? `${Math.round(attempt.timeTaken/60)}m` : '-'}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 700 }}>Status</div>
                  <div>{attempt?.status || '-'}</div>
                </div>
              </div>

              <div style={{ marginTop: '1rem' }}>
                <button onClick={() => navigate('/quizzes')} style={{ backgroundColor: 'var(--primary)', color: 'white', border: 'none', padding: '0.6rem 1rem', borderRadius: '6px', fontWeight: 800, cursor: 'pointer' }}>Back to Quizzes</button>
              </div>
            </div>
          )}
          {!loading && !attempt && <div>No result found.</div>}
        </div>
      </div>
    </AppLayout>
  );
};

export default StudentQuizResult;
