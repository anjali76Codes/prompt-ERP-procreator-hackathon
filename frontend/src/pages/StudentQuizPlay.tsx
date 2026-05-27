import React, { useState, useEffect } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import {
  FileQuestion,
  ChevronLeft,
  ChevronRight,
  Clock
} from 'lucide-react';

import {
  useNavigate,
  useParams,
  useLocation
} from 'react-router-dom';

import { toast } from 'react-toastify';

interface LiveQuestion {
  id: number;
  text: string;
  type: 'MCQ' | 'Descriptive';
  options: string[];
  marks: number;
  difficulty: 'Easy' | 'Med' | 'Hard';
}

export const StudentQuizPlay: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();

  const [questions, setQuestions] = useState<LiveQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);

  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [descriptiveAnswers, setDescriptiveAnswers] = useState<
    Record<number, string>
  >({});

  const [flagged, setFlagged] = useState<Record<number, boolean>>({});

  const [attemptId, setAttemptId] = useState<string | null>(null);

  const [timeLeft, setTimeLeft] = useState<number>(0);

  /*
    LOAD QUIZ + ATTEMPT
  */
  useEffect(() => {
    let mounted = true;

    const loadQuizAndMaybeStart = async () => {
      if (!id) return;

      try {
        const api = await import('../lib/quiz/api');

        // Fetch quiz
        const qRes = await api.getQuiz(id);
        const q = qRes.quiz;

        const mapped: LiveQuestion[] = (q.questions || []).map(
          (qq: any, idx: number) => ({
            id: idx + 1,
            text: qq.text,
            type: qq.type === 'MCQ' ? 'MCQ' : 'Descriptive',
            options: qq.options || [],
            marks: qq.marks || 0,
            difficulty: qq.difficulty || 'Easy'
          })
        );

        if (!mounted) return;

        setQuestions(mapped);

        // Check existing attempt
        const params = new URLSearchParams(location.search);
        const existingAttemptId = params.get('attemptId');

        if (existingAttemptId) {
          const aRes = await api.getAttempt(existingAttemptId);
          const attempt = aRes.attempt;

          setAttemptId(existingAttemptId);

          const now = Date.now();

          const endsAt = attempt.endsAt
            ? new Date(attempt.endsAt).getTime()
            : q.durationSeconds
            ? now + q.durationSeconds * 1000
            : null;

          if (endsAt) {
            setTimeLeft(
              Math.max(
                0,
                Math.round((endsAt - now) / 1000)
              )
            );
          }
        } else {
          // Start new attempt
          const startRes = await api.startAttempt(id);
          const attempt = startRes.attempt;

          const newAttemptId =
            attempt._id || attempt.id || null;

          setAttemptId(newAttemptId);

          const now = Date.now();

          const endsAt = attempt.endsAt
            ? new Date(attempt.endsAt).getTime()
            : q.durationSeconds
            ? now + q.durationSeconds * 1000
            : null;

          if (endsAt) {
            setTimeLeft(
              Math.max(
                0,
                Math.round((endsAt - now) / 1000)
              )
            );
          }
        }
      } catch (err) {
        console.error('Failed to load quiz', err);
        toast.error('Failed to load quiz.');
        navigate('/quizzes');
      }
    };

    loadQuizAndMaybeStart();

    return () => {
      mounted = false;
    };
  }, [id, navigate, location.search]);

  /*
    TIMER
  */
  useEffect(() => {
    if (!timeLeft) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  /*
    FORMAT TIMER
  */
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${mins
      .toString()
      .padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  /*
    AUTO SUBMIT
  */
  const handleAutoSubmit = async () => {
    toast.warn(
      'Time is up! Submitting your answers automatically.'
    );

    if (!attemptId) {
      navigate('/quizzes');
      return;
    }

    try {
      const api = await import('../lib/quiz/api');

      const payload = {
        attemptId,
        quizId: id,
        answers: Object.keys(answers).map(k => ({
          questionIndex: Number(k),
          answer: answers[Number(k)]
        })),
        descriptive: Object.keys(
          descriptiveAnswers
        ).map(k => ({
          questionIndex: Number(k),
          text: descriptiveAnswers[Number(k)]
        }))
      };

      await api.submitAttempt(payload);

      navigate('/quizzes');
    } catch (err) {
      console.error('Auto submit failed', err);
      navigate('/quizzes');
    }
  };

  /*
    MANUAL SUBMIT
  */
  const handleSubmit = async () => {
    if (!attemptId) {
      toast.error('Attempt not initialized');
      return;
    }

    const confirmed = window.confirm(
      'Are you sure you want to submit the quiz?'
    );

    if (!confirmed) return;

    try {
      const api = await import('../lib/quiz/api');

      const payload = {
        attemptId,
        quizId: id,
        answers: Object.keys(answers).map(k => ({
          questionIndex: Number(k),
          answer: answers[Number(k)]
        })),
        descriptive: Object.keys(
          descriptiveAnswers
        ).map(k => ({
          questionIndex: Number(k),
          text: descriptiveAnswers[Number(k)]
        }))
      };

      const res = await api.submitAttempt(payload);

      toast.success('Quiz submitted successfully!');

      navigate(
        `/quiz/result/${
          res.attempt._id || res.attempt.id
        }`
      );
    } catch (err) {
      console.error('Submit failed', err);
      toast.error('Submit failed. Please try again.');
    }
  };

  /*
    FLAG QUESTION
  */
  const toggleFlag = (qId: number) => {
    setFlagged(prev => ({
      ...prev,
      [qId]: !prev[qId]
    }));
  };

  /*
    LOADING STATE
  */
  if (!questions.length) {
    return (
      <AppLayout
        pageIcon={<FileQuestion size={18} />}
        pageTitle="Loading Quiz"
        pageBreadcrumb="Evaluation Tools"
        background="#F3F4F6"
      >
        <div
          style={{
            padding: '3rem',
            textAlign: 'center',
            fontWeight: 700
          }}
        >
          Loading quiz...
        </div>
      </AppLayout>
    );
  }

  const activeQuestion = questions[currentIdx];

  return (
    <AppLayout
      pageIcon={<FileQuestion size={18} />}
      pageTitle="Midterm Quiz"
      pageBreadcrumb="Evaluation Tools"
      background="#F3F4F6"
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '74% 24%',
          gap: '2%',
          paddingBottom: '2rem'
        }}
      >
        {/* LEFT COLUMN */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}
        >
          {/* QUESTION CARD */}
          <div
            style={{
              backgroundColor: 'white',
              border:
                '1px solid var(--border-color)',
              borderRadius:
                'var(--radius-lg)',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              minHeight: '380px'
            }}
          >
            {/* HEADER */}
            <div
              style={{
                display: 'flex',
                justifyContent:
                  'space-between',
                alignItems: 'center',
                borderBottom:
                  '1px solid #F1F5F9',
                paddingBottom: '1rem'
              }}
            >
              <span
                style={{
                  backgroundColor: '#EFF6FF',
                  color: 'var(--primary)',
                  fontSize: '0.725rem',
                  fontWeight: 800,
                  padding: '0.2rem 0.5rem',
                  borderRadius: '0.25rem'
                }}
              >
                {activeQuestion.type}
              </span>

              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#64748B'
                }}
              >
                Marks: {activeQuestion.marks}
              </div>
            </div>

            {/* QUESTION */}
            <h2
              style={{
                margin: 0,
                fontSize: '1.35rem',
                fontWeight: 800,
                color: '#0F172A',
                lineHeight: 1.4
              }}
            >
              {activeQuestion.text}
            </h2>

            {/* MCQ */}
            {activeQuestion.type === 'MCQ' ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}
              >
                {activeQuestion.options.map(
                  (opt, oIdx) => {
                    const isSelected =
                      answers[
                        activeQuestion.id
                      ] === oIdx;

                    return (
                      <label
                        key={oIdx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem',
                          border: isSelected
                            ? '1.5px solid var(--primary)'
                            : '1px solid var(--border-color)',
                          padding: '1rem',
                          borderRadius:
                            'var(--radius-md)',
                          cursor: 'pointer',
                          backgroundColor:
                            isSelected
                              ? '#EFF6FF'
                              : 'white'
                        }}
                      >
                        <input
                          type="radio"
                          checked={isSelected}
                          onChange={() =>
                            setAnswers({
                              ...answers,
                              [activeQuestion.id]:
                                oIdx
                            })
                          }
                        />

                        {opt}
                      </label>
                    );
                  }
                )}
              </div>
            ) : (
              <textarea
                value={
                  descriptiveAnswers[
                    activeQuestion.id
                  ] || ''
                }
                onChange={e =>
                  setDescriptiveAnswers({
                    ...descriptiveAnswers,
                    [activeQuestion.id]:
                      e.target.value
                  })
                }
                placeholder="Write your answer here..."
                style={{
                  width: '100%',
                  minHeight: '180px',
                  padding: '1rem',
                  border:
                    '1px solid var(--border-color)',
                  borderRadius:
                    'var(--radius-md)',
                  resize: 'vertical'
                }}
              />
            )}
          </div>

          {/* NAV BUTTONS */}
          <div
            style={{
              display: 'flex',
              justifyContent:
                'space-between'
            }}
          >
            <button
              onClick={() =>
                setCurrentIdx(prev =>
                  Math.max(0, prev - 1)
                )
              }
            >
              <ChevronLeft size={16} /> Previous
            </button>

            <button
              onClick={() =>
                toggleFlag(
                  activeQuestion.id
                )
              }
            >
              🚩 Flag
            </button>

            <button
              onClick={() =>
                setCurrentIdx(prev =>
                  Math.min(
                    questions.length - 1,
                    prev + 1
                  )
                )
              }
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}
        >
          {/* TIMER */}
          <div
            style={{
              backgroundColor: 'white',
              border:
                '1px solid var(--border-color)',
              borderRadius:
                'var(--radius-lg)',
              padding: '1.5rem'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent:
                  'space-between',
                alignItems: 'center'
              }}
            >
              <span
                style={{
                  fontWeight: 800
                }}
              >
                TIME REMAINING
              </span>

              <span
                style={{
                  color: '#EF4444',
                  fontWeight: 800
                }}
              >
                <Clock size={15} />{' '}
                {formatTime(timeLeft)}
              </span>
            </div>

            <button
              onClick={handleSubmit}
              style={{
                width: '100%',
                marginTop: '1rem',
                backgroundColor:
                  'var(--primary)',
                color: 'white',
                border: 'none',
                padding: '0.8rem',
                borderRadius:
                  'var(--radius-md)',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              Submit Quiz
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};