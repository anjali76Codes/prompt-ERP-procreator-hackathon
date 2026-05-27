import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { CheckCircle, FileQuestion } from 'lucide-react';
import { toast } from 'react-toastify';

// Import modular step components
import { StepAcademicContext } from '../components/quiz/StepAcademicContext';
import { StepQuizSetup } from '../components/quiz/StepQuizSetup';
import { StepAddQuestions } from '../components/quiz/StepAddQuestions';
import { StepReviewQuiz } from '../components/quiz/StepReviewQuiz';
import { StepStudentPreview } from '../components/quiz/StepStudentPreview';
import { StepPublishQuiz } from '../components/quiz/StepPublishQuiz';
import type { Question } from '../components/quiz/types';
import { fetchMyDivisions, fetchMySubjects } from '../lib/erp/api';
import type { Division, Subject } from '../lib/erp/types';

// A fresh, empty question template — used whenever the teacher adds a new question.
const blankQuestion = (): Question => ({
  id: Date.now(),
  type: 'MCQ',
  marks: 1,
  difficulty: 'Easy',
  text: '',
  options: ['', '', '', ''],
  correctOption: 0,
  explanation: '',
  topics: [],
});

export const QuizCreate: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<number>(1); // 1 to 6

  // Real academic data assigned to the logged-in teacher (loaded from the API).
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // Step 1: Academic Context State — `division`/`subject` hold real Mongo ObjectIds.
  const [branch, setBranch] = useState('');
  const [semester, setSemester] = useState('');
  const [division, setDivision] = useState('');
  const [subject, setSubject] = useState('');
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [aiContext, setAiContext] = useState('');

  // Step 2: Quiz Setup State
  const [quizTitle, setQuizTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [duration, setDuration] = useState('20');
  const [totalMarks, setTotalMarks] = useState(0);
  const [questionType, setQuestionType] = useState('Mixed');
  const [numQuestions, setNumQuestions] = useState(0);
  const [attempts, setAttempts] = useState('1');
  const [negativeMarking, setNegativeMarking] = useState('None');
  const [passingMarks, setPassingMarks] = useState(0);
  const [marksDistribution, setMarksDistribution] = useState('equal');
  const [availability, setAvailability] = useState('immediate');

  // Step 3: Add Questions State — starts empty; questions are added manually.
  const [questions, setQuestions] = useState<Question[]>([]);

  // Load the teacher's real divisions & subjects so the quiz can be saved
  // against valid ObjectIds (and pass the backend's "do you teach this?" check).
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [divs, subs] = await Promise.all([fetchMyDivisions(), fetchMySubjects()]);
        if (!mounted) return;
        setDivisions(divs);
        setSubjects(subs);
      } catch (err) {
        console.error('Failed to load divisions/subjects', err);
        toast.error('Could not load your divisions/subjects');
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Current editing question index in Step 3
  const [editingIndex, setEditingIndex] = useState<number>(0);
  const [editingType, setEditingType] = useState<'MCQ' | 'Descriptive'>('MCQ');
  const [editingMarks, setEditingMarks] = useState<number>(1);
  const [editingDifficulty, setEditingDifficulty] = useState<'Easy' | 'Med' | 'Hard'>('Easy');
  const [editingText, setEditingText] = useState('');
  const [editingOptions, setEditingOptions] = useState<string[]>(['', '', '', '']);
  const [editingCorrect, setEditingCorrect] = useState<number>(0);
  const [editingExplanation, setEditingExplanation] = useState('');
  const [editingTopics, setEditingTopics] = useState<string[]>([]);
  const [newTopicTag, setNewTopicTag] = useState('');

  // Step 5: Student Preview State
  const [selectedStudentAnswers, setSelectedStudentAnswers] = useState<Record<number, number>>({});
  const [previewQIndex, setPreviewQIndex] = useState<number>(0);

  // Load question data to editor
  const loadQuestionToEditor = (index: number) => {
    if (index >= questions.length || index < 0) return;
    setEditingIndex(index);
    const q = questions[index];
    setEditingType(q.type);
    setEditingMarks(q.marks);
    setEditingDifficulty(q.difficulty);
    setEditingText(q.text);
    setEditingOptions([...q.options]);
    setEditingCorrect(q.correctOption);
    setEditingExplanation(q.explanation);
    setEditingTopics([...q.topics]);
  };

  // Save current question back to the list
  const handleSaveQuestion = () => {
    const updated = [...questions];
    updated[editingIndex] = {
      id: updated[editingIndex]?.id || Date.now(),
      type: editingType,
      marks: editingMarks,
      difficulty: editingDifficulty,
      text: editingText,
      options: editingType === 'MCQ' ? editingOptions : [],
      correctOption: editingType === 'MCQ' ? editingCorrect : 0,
      explanation: editingExplanation,
      topics: editingTopics
    };
    setQuestions(updated);
    toast.success(`Question ${editingIndex + 1} saved!`);
  };

  // Save and add next question
  const handleSaveAndNext = () => {
    handleSaveQuestion();
    const nextIdx = editingIndex + 1;
    if (nextIdx < questions.length) {
      loadQuestionToEditor(nextIdx);
    } else {
      // Add a new empty question template
      const newQ: Question = blankQuestion();
      setQuestions([...questions, newQ]);
      setEditingIndex(nextIdx);
      setEditingType(newQ.type);
      setEditingMarks(newQ.marks);
      setEditingDifficulty(newQ.difficulty);
      setEditingText(newQ.text);
      setEditingOptions([...newQ.options]);
      setEditingCorrect(newQ.correctOption);
      setEditingExplanation(newQ.explanation);
      setEditingTopics([...newQ.topics]);
      toast.info('New question template added');
    }
  };

  const handleDuplicateQuestion = () => {
    const q = questions[editingIndex];
    const newQ: Question = {
      ...q,
      id: Date.now(),
      text: `${q.text} (Copy)`
    };
    const updated = [...questions];
    updated.splice(editingIndex + 1, 0, newQ);
    setQuestions(updated);
    toast.info('Question duplicated');
  };

  const handleDeleteQuestion = () => {
    if (questions.length <= 1) {
      toast.error('Must have at least one question');
      return;
    }
    const updated = questions.filter((_, i) => i !== editingIndex);
    setQuestions(updated);
    const newIdx = Math.max(0, editingIndex - 1);
    setEditingIndex(newIdx);
    // load
    const q = updated[newIdx];
    setEditingType(q.type);
    setEditingMarks(q.marks);
    setEditingDifficulty(q.difficulty);
    setEditingText(q.text);
    setEditingOptions([...q.options]);
    setEditingCorrect(q.correctOption);
    setEditingExplanation(q.explanation);
    setEditingTopics([...q.topics]);
    toast.warn('Question deleted');
  };

  const handleAddTopicTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTopicTag.trim()) {
      if (!editingTopics.includes(newTopicTag.trim())) {
        setEditingTopics([...editingTopics, newTopicTag.trim()]);
      }
      setNewTopicTag('');
    }
  };

  const handleRemoveTopicTag = (tag: string) => {
    setEditingTopics(editingTopics.filter(t => t !== tag));
  };

  const handleFinishQuiz = () => {
    setCurrentStep(4);
    toast.success('Questions finalized! Review your quiz.');
  };

  const publishQuiz = async () => {
    // Validate the fields the backend actually requires.
    if (!division) { toast.error('Please select a division'); setCurrentStep(1); return; }
    if (!subject) { toast.error('Please select a subject'); setCurrentStep(1); return; }
    if (!quizTitle.trim()) { toast.error('Please enter a quiz title'); setCurrentStep(2); return; }

    const realQuestions = questions.filter(q => q.text.trim());
    if (realQuestions.length === 0) { toast.error('Add at least one question'); setCurrentStep(3); return; }

    // Map the editor's question model onto the backend schema.
    //   MCQ        -> 'single' (one correct option)
    //   Descriptive-> 'short'  (free-text, graded manually)
    const mappedQuestions = [];
    for (const q of realQuestions) {
      if (q.type === 'MCQ') {
        const filled = q.options
          .map((text, idx) => ({ text: text.trim(), isCorrect: idx === q.correctOption }))
          .filter(o => o.text !== '');
        if (filled.length < 2) {
          toast.error(`"${q.text.slice(0, 30)}…" needs at least 2 options`);
          setCurrentStep(3);
          return;
        }
        if (!filled.some(o => o.isCorrect)) {
          toast.error(`Select the correct option for "${q.text.slice(0, 30)}…"`);
          setCurrentStep(3);
          return;
        }
        mappedQuestions.push({ text: q.text.trim(), type: 'single', points: q.marks, options: filled });
      } else {
        mappedQuestions.push({ text: q.text.trim(), type: 'short', points: q.marks, options: [] });
      }
    }

    // `duration` may be 'Custom' from the setup step — guard the conversion.
    const durationMinutes = Number(duration);
    const timeLimitMinutes = Number.isFinite(durationMinutes) && durationMinutes > 0 ? durationMinutes : undefined;

    const payload = {
      title: quizTitle.trim(),
      description: instructions.trim() || undefined,
      division,
      subject,
      settings: {
        ...(timeLimitMinutes ? { timeLimitMinutes } : {}),
        ...(attempts === '1' ? { maxAttempts: 1 } : {}),
        shuffleQuestions: false,
      },
      questions: mappedQuestions,
    };

    try {
      const api = await import('../lib/quiz/api');
      const res = await api.createQuiz(payload);
      const resAny = res as any;
      const id = resAny?.quiz?._id || resAny?.quiz?.id;
      if (!id) throw new Error('Server did not return a quiz id');

      if (availability === 'immediate') {
        await api.publishQuiz(id);
        toast.success(`Successfully published "${quizTitle}" to students!`);
      } else {
        toast.success(`Saved "${quizTitle}" as a draft.`);
      }
      navigate('/quizzes');
    } catch (err: any) {
      console.error('Publish failed', err);
      toast.error(err?.message || 'Failed to publish quiz');
    }
  };

  return (
    <AppLayout
      pageIcon={<FileQuestion size={18} />}
      pageTitle="Create Quiz"
      pageBreadcrumb="Evaluation Tools"
      background="#F3F4F6"
    >
      <div className="quiz-wizard-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
        
        {/* ================= STEPPER HEADER ================= */}
        <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-lg)', padding: '1rem 1.5rem', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          {currentStep === 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '2px solid var(--primary)', paddingBottom: '0.25rem' }}>
                <span style={{ backgroundColor: 'var(--primary)', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>1</span>
                <span style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: '0.9rem' }}>Academic Context</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.5 }}>
                <span style={{ backgroundColor: '#E5E7EB', color: '#4B5563', borderRadius: '50%', width: '24px', height: '24px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>2</span>
                <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Quiz Parameters</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.5 }}>
                <span style={{ backgroundColor: '#E5E7EB', color: '#4B5563', borderRadius: '50%', width: '24px', height: '24px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>3</span>
                <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Review & Launch</span>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10B981' }}>
                <span style={{ backgroundColor: '#D1FAE5', color: '#10B981', borderRadius: '50%', width: '24px', height: '24px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>✔</span>
                <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Context (Done)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '2px solid var(--primary)', paddingBottom: '0.25rem' }}>
                <span style={{ backgroundColor: 'var(--primary)', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>2</span>
                <span style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: '0.9rem' }}>Quiz Setup (Active)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.5 }}>
                <span style={{ backgroundColor: '#E5E7EB', color: '#4B5563', borderRadius: '50%', width: '24px', height: '24px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>3</span>
                <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Add Questions</span>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.6 }}>
                <span style={{ backgroundColor: '#D1FAE5', color: '#10B981', borderRadius: '50%', width: '24px', height: '24px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>1</span>
                <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Quiz Details</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.6 }}>
                <span style={{ backgroundColor: '#D1FAE5', color: '#10B981', borderRadius: '50%', width: '24px', height: '24px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>2</span>
                <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Settings</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '2px solid var(--primary)', paddingBottom: '0.25rem' }}>
                <span style={{ backgroundColor: 'var(--primary)', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>3</span>
                <span style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: '0.9rem' }}>Add Questions (Active)</span>
              </div>
              <button 
                onClick={handleFinishQuiz}
                style={{ marginLeft: 'auto', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', padding: '0.5rem 1.25rem', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', boxShadow: '0 4px 12px rgba(13,138,188,0.1)' }}
              >
                Finish Quiz <CheckCircle size={16} />
              </button>
            </div>
          )}

          {currentStep === 4 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.6 }}>
                <span style={{ backgroundColor: '#D1FAE5', color: '#10B981', borderRadius: '50%', width: '24px', height: '24px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>1</span>
                <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Details</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.6 }}>
                <span style={{ backgroundColor: '#D1FAE5', color: '#10B981', borderRadius: '50%', width: '24px', height: '24px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>2</span>
                <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Questions</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.6 }}>
                <span style={{ backgroundColor: '#D1FAE5', color: '#10B981', borderRadius: '50%', width: '24px', height: '24px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>3</span>
                <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Settings</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '2px solid var(--primary)', paddingBottom: '0.25rem' }}>
                <span style={{ backgroundColor: 'var(--primary)', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>4</span>
                <span style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: '0.9rem' }}>Review (Active)</span>
              </div>
              <span style={{ marginLeft: 'auto', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>STEP 4 OF 4</span>
            </div>
          )}

          {currentStep === 5 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10B981' }}>
                <span style={{ backgroundColor: '#D1FAE5', color: '#10B981', borderRadius: '50%', width: '24px', height: '24px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>✔ Done</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '2px solid var(--primary)', paddingBottom: '0.25rem' }}>
                <span style={{ backgroundColor: 'var(--primary)', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>5</span>
                <span style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: '0.9rem' }}>Preview Quiz as Student</span>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1rem', width: '250px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.675rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                    <span>PROGRESS</span>
                    <span>Step 5 of 6</span>
                  </div>
                  <div style={{ height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden', marginTop: '0.25rem' }}>
                    <div style={{ height: '100%', width: '83%', backgroundColor: 'var(--primary)', borderRadius: 3 }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 6 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10B981' }}>
                <span style={{ backgroundColor: '#D1FAE5', color: '#10B981', borderRadius: '50%', width: '24px', height: '24px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>✔ 1-5 Done</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '2px solid var(--primary)', paddingBottom: '0.25rem' }}>
                <span style={{ backgroundColor: 'var(--primary)', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>6</span>
                <span style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: '0.9rem' }}>Publish</span>
              </div>
              <span style={{ marginLeft: 'auto', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Draft saved 2 mins ago</span>
            </div>
          )}
        </div>

        {/* ================= STEP CONTENT SWITCHER ================= */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {currentStep === 1 && (
            <StepAcademicContext
              divisions={divisions}
              subjects={subjects}
              branch={branch} setBranch={setBranch}
              semester={semester} setSemester={setSemester}
              division={division} setDivision={setDivision}
              subject={subject} setSubject={setSubject}
              selectedChapters={selectedChapters} setSelectedChapters={setSelectedChapters}
              aiContext={aiContext} setAiContext={setAiContext}
              onNext={() => setCurrentStep(2)}
            />
          )}

          {currentStep === 2 && (
            <StepQuizSetup
              quizTitle={quizTitle} setQuizTitle={setQuizTitle}
              instructions={instructions} setInstructions={setInstructions}
              duration={duration} setDuration={setDuration}
              totalMarks={totalMarks} setTotalMarks={setTotalMarks}
              questionType={questionType} setQuestionType={setQuestionType}
              numQuestions={numQuestions} setNumQuestions={setNumQuestions}
              attempts={attempts} setAttempts={setAttempts}
              negativeMarking={negativeMarking} setNegativeMarking={setNegativeMarking}
              passingMarks={passingMarks} setPassingMarks={setPassingMarks}
              marksDistribution={marksDistribution} setMarksDistribution={setMarksDistribution}
              availability={availability} setAvailability={setAvailability}
              onBack={() => setCurrentStep(1)}
              onSaveDraft={() => toast.info('Draft saved successfully!')}
              onNext={() => {
                setCurrentStep(3);
                if (questions.length === 0) {
                  const first = blankQuestion();
                  setQuestions([first]);
                  setEditingIndex(0);
                  setEditingType(first.type);
                  setEditingMarks(first.marks);
                  setEditingDifficulty(first.difficulty);
                  setEditingText(first.text);
                  setEditingOptions([...first.options]);
                  setEditingCorrect(first.correctOption);
                  setEditingExplanation(first.explanation);
                  setEditingTopics([...first.topics]);
                } else {
                  loadQuestionToEditor(0);
                }
              }}
            />
          )}

          {currentStep === 3 && (
            <StepAddQuestions
              questions={questions}
              editingIndex={editingIndex}
              editingType={editingType} setEditingType={setEditingType}
              editingMarks={editingMarks} setEditingMarks={setEditingMarks}
              editingDifficulty={editingDifficulty} setEditingDifficulty={setEditingDifficulty}
              editingText={editingText} setEditingText={setEditingText}
              editingOptions={editingOptions} setEditingOptions={setEditingOptions}
              editingCorrect={editingCorrect} setEditingCorrect={setEditingCorrect}
              editingExplanation={editingExplanation} setEditingExplanation={setEditingExplanation}
              editingTopics={editingTopics} setEditingTopics={setEditingTopics}
              newTopicTag={newTopicTag} setNewTopicTag={setNewTopicTag}
              totalMarks={totalMarks}
              numQuestions={numQuestions}
              loadQuestionToEditor={loadQuestionToEditor}
              handleSaveQuestion={handleSaveQuestion}
              handleSaveAndNext={handleSaveAndNext}
              handleDuplicateQuestion={handleDuplicateQuestion}
              handleDeleteQuestion={handleDeleteQuestion}
              handleAddTopicTag={handleAddTopicTag}
              handleRemoveTopicTag={handleRemoveTopicTag}
            />
          )}

          {currentStep === 4 && (
            <StepReviewQuiz
              questions={questions}
              duration={duration}
              onBack={() => setCurrentStep(3)}
              onSaveDraft={() => toast.info('Draft saved successfully!')}
              onPreview={() => setCurrentStep(5)}
            />
          )}

          {currentStep === 5 && (
            <StepStudentPreview
              questions={questions}
              quizTitle={quizTitle}
              selectedStudentAnswers={selectedStudentAnswers}
              setSelectedStudentAnswers={setSelectedStudentAnswers}
              previewQIndex={previewQIndex}
              setPreviewQIndex={setPreviewQIndex}
              onBack={() => setCurrentStep(3)}
              onPublish={() => setCurrentStep(6)}
            />
          )}

          {currentStep === 6 && (
            <StepPublishQuiz
              quizTitle={quizTitle}
              totalMarks={questions.reduce((sum, q) => sum + q.marks, 0)}
              duration={duration}
              questionsCount={questions.length}
              branch={branch}
              semester={semester}
              division={divisions.find(d => d._id === division)?.name || ''}
              onBack={() => setCurrentStep(5)}
              onSaveDraft={() => toast.info('Draft saved successfully!')}
              onPublish={publishQuiz}
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
};
