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

interface LiveOption {
  id: string;   // backend option _id
  text: string;
}

interface LiveQuestion {
  qid: string;  // backend question _id
  text: string;
  type: 'MCQ' | 'Descriptive';
  options: LiveOption[];
  points: number;
}

export const StudentQuizPlay: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();

  const [quizTitle, setQuizTitle] = useState('Quiz');
  const [questions, setQuestions] = useState<LiveQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);

  // Keyed by backend question _id.
  const [answers, setAnswers] = useState<Record<string, string>>({}); // qid -> selected optionId
  const [descriptiveAnswers, setDescriptiveAnswers] = useState<Record<string, string>>({});

  const [flagged, setFlagged] = useState<Record<string, boolean>>({});

  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [startedAtMs, setStartedAtMs] = useState<number>(Date.now());

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

        // Fetch quiz — student-safe variant (server strips correct-answer
        // flags and checks division match).
        const qRes = await api.getStudentQuiz(id);
        const q: any = qRes.quiz;

        const mapped: LiveQuestion[] = (q.questions || []).map((qq: any) => ({
          qid: qq._id,
          text: qq.text,
          type: qq.type === 'single' || qq.type === 'multiple' ? 'MCQ' : 'Descriptive',
          options: (qq.options || []).map((o: any) => ({ id: o._id, text: o.text })),
          points: qq.points || 0,
        }));

        if (!mounted) return;

        setQuizTitle(q.title || 'Quiz');
        setQuestions(mapped);

        const limitSeconds = q.settings?.timeLimitMinutes ? q.settings.timeLimitMinutes * 60 : 0;

        // Resume an existing attempt if one was passed, otherwise start a fresh one.
        const params = new URLSearchParams(location.search);
        const existingAttemptId = params.get('attemptId');

        let attempt: any;
        if (existingAttemptId) {
          const aRes = await api.getStudentAttempt(existingAttemptId);
          attempt = aRes.attempt;
        } else {
          const startRes = await api.startAttempt(id);
          attempt = startRes.attempt;
        }

        if (!mounted) return;

        setAttemptId(attempt._id || attempt.id || null);

        const startMs = attempt.startedAt ? new Date(attempt.startedAt).getTime() : Date.now();
        setStartedAtMs(startMs);

        if (limitSeconds) {
          const elapsed = Math.floor((Date.now() - startMs) / 1000);
          setTimeLeft(Math.max(0, limitSeconds - elapsed));
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
    BUILD SUBMIT PAYLOAD (matches the backend submitAttempt schema)
  */
  const buildPayload = () => {
    const answersList: { questionId: string; selectedOptionIds?: string[]; textAnswer?: string }[] = [];
    for (const q of questions) {
      if (q.type === 'MCQ') {
        const sel = answers[q.qid];
        if (sel) answersList.push({ questionId: q.qid, selectedOptionIds: [sel] });
      } else {
        const txt = descriptiveAnswers[q.qid];
        if (txt && txt.trim() !== '') answersList.push({ questionId: q.qid, textAnswer: txt });
      }
    }
    return {
      quizId: id,
      durationSeconds: Math.max(0, Math.round((Date.now() - startedAtMs) / 1000)),
      answers: answersList,
    };
  };

  /*
    AUTO SUBMIT
  */
  const handleAutoSubmit = async () => {
    toast.warn('Time is up! Submitting your answers automatically.');

    if (!attemptId) {
      navigate('/quizzes');
      return;
    }

    try {
      const api = await import('../lib/quiz/api');
      const res = await api.submitAttempt(buildPayload());
      const resAttempt = res.attempt as any;
      navigate(`/quiz/result/${resAttempt._id || resAttempt.id}`);
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

    const confirmed = window.confirm('Are you sure you want to submit the quiz?');
    if (!confirmed) return;

    try {
      const api = await import('../lib/quiz/api');
      const res = await api.submitAttempt(buildPayload());
      const resAttempt = res.attempt as any;

      toast.success('Quiz submitted successfully!');
      navigate(`/quiz/result/${resAttempt._id || resAttempt.id}`);
    } catch (err: any) {
      console.error('Submit failed', err);
      toast.error(err?.message || 'Submit failed. Please try again.');
    }
  };

  /*
    FLAG QUESTION
  */
  const toggleFlag = (qId: string) => {
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
      pageTitle={quizTitle}
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
                Marks: {activeQuestion.points}
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
                  (opt) => {
                    const isSelected =
                      answers[activeQuestion.qid] === opt.id;

                    return (
                      <label
                        key={opt.id}
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
                              [activeQuestion.qid]: opt.id
                            })
                          }
                        />

                        {opt.text}
                      </label>
                    );
                  }
                )}
              </div>
            ) : (
              <textarea
                value={
                  descriptiveAnswers[
                    activeQuestion.qid
                  ] || ''
                }
                onChange={e =>
                  setDescriptiveAnswers({
                    ...descriptiveAnswers,
                    [activeQuestion.qid]:
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
                  activeQuestion.qid
                )
              }
            >
              {flagged[activeQuestion.qid] ? '🚩 Flagged' : '🚩 Flag'}
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