import React, { useState } from 'react';
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

export const QuizCreate: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<number>(1); // 1 to 6

  // Step 1: Academic Context State
  const [branch, setBranch] = useState('Computer Science');
  const [semester, setSemester] = useState('Semester 3');
  const [division, setDivision] = useState('Division A');
  const [subject, setSubject] = useState('Java Programming');
  const [selectedChapters, setSelectedChapters] = useState<string[]>(['Unit 4 - OOP Concepts']);
  const [aiContext, setAiContext] = useState('Focus more on inheritance and polymorphism...');

  // Step 2: Quiz Setup State
  const [quizTitle, setQuizTitle] = useState('Java OOP Quiz 1');
  const [instructions, setInstructions] = useState(
    'Total duration 20 mins, Negative marking applies to all sections. Ensure stable internet connection throughout the quiz session.'
  );
  const [duration, setDuration] = useState('20');
  const [totalMarks, setTotalMarks] = useState(25);
  const [questionType, setQuestionType] = useState('Mixed');
  const [numQuestions, setNumQuestions] = useState(15);
  const [attempts, setAttempts] = useState('1');
  const [negativeMarking, setNegativeMarking] = useState('0.25');
  const [passingMarks, setPassingMarks] = useState(10);
  const [marksDistribution, setMarksDistribution] = useState('equal');
  const [availability, setAvailability] = useState('immediate');

  // Step 3: Add Questions State
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: 1,
      type: 'MCQ',
      marks: 2,
      difficulty: 'Easy',
      text: 'What is polymorphism in Java?',
      options: [
        'A way to hide data',
        'Allows one interface to have multiple implementations',
        'Strict type checking',
        'Automatic memory management'
      ],
      correctOption: 1,
      explanation: 'Polymorphism allows one interface to have multiple implementations, commonly achieved through method overriding and overloading.',
      topics: ['inheritance', 'encapsulation']
    },
    {
      id: 2,
      type: 'Descriptive',
      marks: 5,
      difficulty: 'Med',
      text: 'Describe the process of cellular respiration and its significance in energy production for eukaryotic cells.',
      options: [],
      correctOption: 0,
      explanation: 'Expected answer length: 150-200 words. Key terms: ATP, Mitochondria, Glycolysis.',
      topics: ['biology', 'cellular']
    },
    {
      id: 3,
      type: 'MCQ',
      marks: 3,
      difficulty: 'Hard',
      text: 'Which of the following best describes the Heisenberg Uncertainty Principle in quantum mechanics?',
      options: [
        'It is impossible to know both position and momentum of a particle simultaneously',
        'Energy is quantized in discrete packets',
        'Particles exhibit wave-like behavior under observation',
        'Light speed is constant in all reference frames'
      ],
      correctOption: 0,
      explanation: 'Heisenberg uncertainty principle states that position and momentum cannot be simultaneously measured with arbitrary precision.',
      topics: ['physics', 'quantum']
    }
  ]);

  // Current editing question index in Step 3
  const [editingIndex, setEditingIndex] = useState<number>(0);
  const [editingType, setEditingType] = useState<'MCQ' | 'Descriptive'>('MCQ');
  const [editingMarks, setEditingMarks] = useState<number>(2);
  const [editingDifficulty, setEditingDifficulty] = useState<'Easy' | 'Med' | 'Hard'>('Easy');
  const [editingText, setEditingText] = useState('What is polymorphism in Java?');
  const [editingOptions, setEditingOptions] = useState<string[]>([
    'A way to hide data',
    'Allows one interface to have multiple implementations',
    'Strict type checking',
    'Automatic memory management'
  ]);
  const [editingCorrect, setEditingCorrect] = useState<number>(1);
  const [editingExplanation, setEditingExplanation] = useState('Polymorphism allows one interface to have multiple implementations, commonly achieved through method overriding and overloading.');
  const [editingTopics, setEditingTopics] = useState<string[]>(['inheritance', 'encapsulation']);
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
      const newQ: Question = {
        id: Date.now(),
        type: 'MCQ',
        marks: 2,
        difficulty: 'Easy',
        text: 'New Question Text',
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctOption: 0,
        explanation: 'Add explanation here...',
        topics: ['general']
      };
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
    try {
      const api = await import('../lib/quiz/api');
      const payload = {
        title: quizTitle,
        instructions,
        durationSeconds: Number(duration) * 60,
        totalMarks,
        attempts: Number(attempts),
        negativeMarking: Number(negativeMarking),
        passingMarks,
        availability,
        branch,
        semester,
        division,
        subject,
        selectedChapters,
        aiContext,
        questions: questions.map(q => ({
          type: q.type,
          text: q.text,
          options: q.options || [],
          correctOption: q.correctOption,
          marks: q.marks,
          difficulty: q.difficulty,
          explanation: q.explanation,
          topics: q.topics
        }))
      };
      const res = await api.createQuiz(payload);
      const resAny = res as any;
      const id = resAny?.quiz?._id || resAny?.quiz?.id;
      if (id) {
        await api.publishQuiz(id);
      }
      toast.success(`Successfully published "${quizTitle}" to students!`);
      navigate('/quizzes');
    } catch (err) {
      console.error('Publish failed', err);
      toast.error('Failed to publish quiz');
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
                loadQuestionToEditor(0);
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
              division={division}
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
