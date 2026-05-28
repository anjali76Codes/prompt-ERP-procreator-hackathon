import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';

import { AppLayout } from '../components/layout/AppLayout';
import { Clock, AlertTriangle } from 'lucide-react';

export const StudentQuizDetails: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();

  const [quiz, setQuiz] = useState<any>(null);
  const [attempt, setAttempt] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadQuizAndMaybeStart = async () => {
      if (!id) return;

      try {
        setLoading(true);

        const api = await import('../lib/quiz/api');

        // Load quiz — student-safe variant (no correct-answer leak, division
        // match enforced server-side).
        const quizRes = await api.getStudentQuiz(id);

        if (!mounted) return;

        setQuiz(quizRes.quiz);

        // Check if attemptId exists in query params
        const params = new URLSearchParams(location.search);
        let attemptId = params.get('attemptId');

        let currentAttempt: any = null;

        // If no attemptId, create new attempt
        if (!attemptId) {
          const startRes = await api.startAttempt(id);

          currentAttempt = startRes.attempt;
          attemptId = currentAttempt?._id || currentAttempt?.id;
        } else {
          // Fetch existing attempt
          const attemptRes = await api.getStudentAttempt(attemptId);
          currentAttempt = attemptRes.attempt;
        }

        if (!mounted) return;

        setAttempt(currentAttempt);
      } catch (err) {
        console.error('Failed to load quiz', err);
        toast.error('Failed to load quiz');
        navigate('/student/quizzes');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadQuizAndMaybeStart();

    return () => {
      mounted = false;
    };
  }, [id, navigate, location.search]);

  if (loading) {
    return (
      <AppLayout
        pageTitle="Loading Quiz"
        pageBreadcrumb="Quiz"
        background="#F8FAFC"
      >
        <div
          style={{
            minHeight: '60vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1rem',
            fontWeight: 700,
            color: '#64748B',
          }}
        >
          Loading quiz...
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      pageTitle={quiz?.title || 'Quiz'}
      pageBreadcrumb="Quiz Attempt"
      background="#F8FAFC"
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'white',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            border: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: '1.4rem',
                fontWeight: 800,
                color: '#0F172A',
              }}
            >
              {quiz?.title}
            </h2>

            <p
              style={{
                margin: '0.35rem 0 0 0',
                color: '#64748B',
                fontSize: '0.9rem',
              }}
            >
              {quiz?.description}
            </p>
          </div>

          <div
            style={{
              background: '#EFF6FF',
              color: '#1D4ED8',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: 700,
            }}
          >
            <Clock size={18} />
            {quiz?.duration || 20} mins
          </div>
        </div>

        {/* Warning */}
        <div
          style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
          }}
        >
          <AlertTriangle
            size={18}
            color="#DC2626"
            style={{ marginTop: 2 }}
          />

          <div>
            <div
              style={{
                fontWeight: 800,
                color: '#991B1B',
                fontSize: '0.9rem',
              }}
            >
              Quiz In Progress
            </div>

            <div
              style={{
                marginTop: '0.25rem',
                fontSize: '0.8rem',
                color: '#7F1D1D',
                lineHeight: 1.5,
              }}
            >
              Do not refresh the page or close the browser window while
              attempting the quiz.
            </div>
          </div>
        </div>

        {/* Placeholder */}
        <div
          style={{
            background: 'white',
            borderRadius: 'var(--radius-lg)',
            padding: '2rem',
            border: '1px solid var(--border-color)',
            minHeight: '400px',
          }}
        >
          <h3
            style={{
              marginTop: 0,
              fontSize: '1rem',
              fontWeight: 800,
              color: '#0F172A',
            }}
          >
            Quiz Questions
          </h3>

          <p
            style={{
              color: '#64748B',
              fontSize: '0.9rem',
            }}
          >
            Render your quiz questions here.
          </p>

          <pre
            style={{
              marginTop: '1rem',
              background: '#F8FAFC',
              padding: '1rem',
              borderRadius: '8px',
              overflow: 'auto',
              fontSize: '0.75rem',
            }}
          >
            {JSON.stringify(attempt, null, 2)}
          </pre>
        </div>
      </div>
    </AppLayout>
  );
};