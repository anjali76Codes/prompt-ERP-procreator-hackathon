import React from 'react';
import { ArrowLeft, ArrowRight, ChevronDown } from 'lucide-react';

interface StepQuizSetupProps {
  quizTitle: string;
  setQuizTitle: (v: string) => void;
  instructions: string;
  setInstructions: (v: string) => void;
  duration: string;
  setDuration: (v: string) => void;
  totalMarks: number;
  setTotalMarks: (v: number) => void;
  questionType: string;
  setQuestionType: (v: string) => void;
  numQuestions: number;
  setNumQuestions: (v: number) => void;
  attempts: string;
  setAttempts: (v: string) => void;
  negativeMarking: string;
  setNegativeMarking: (v: string) => void;
  passingMarks: number;
  setPassingMarks: (v: number) => void;
  marksDistribution: string;
  setMarksDistribution: (v: string) => void;
  availability: string;
  setAvailability: (v: string) => void;
  onBack: () => void;
  onSaveDraft: () => void;
  onNext: () => void;
}

export const StepQuizSetup: React.FC<StepQuizSetupProps> = ({
  quizTitle, setQuizTitle, instructions, setInstructions,
  duration, setDuration, totalMarks, setTotalMarks,
  questionType, setQuestionType, numQuestions, setNumQuestions,
  attempts, setAttempts, negativeMarking, setNegativeMarking,
  passingMarks, setPassingMarks, marksDistribution, setMarksDistribution,
  availability, setAvailability, onBack, onSaveDraft, onNext
}) => {
  return (
    <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-lg)', padding: '2rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      {/* General Info */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          ℹ General Info
        </h3>
        <div>
          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.5rem' }}>Quiz Title</label>
          <input 
            type="text" 
            value={quizTitle} 
            onChange={e => setQuizTitle(e.target.value)}
            style={{ width: '100%', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.65rem 1rem', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.5rem' }}>Instructions</label>
          <textarea 
            value={instructions} 
            onChange={e => setInstructions(e.target.value)}
            style={{ width: '100%', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', fontSize: '0.85rem', outline: 'none', height: '60px', resize: 'none', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* Quiz Rules & Advanced Double Layout Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '58% 38%', gap: '4%', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem' }}>
        
        {/* Left: Quiz Rules */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            ⚖ Quiz Rules
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.5rem' }}>Duration (Minutes)</label>
              <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                {['10', '20', '30', 'Custom'].map(dur => {
                  const isAct = duration === dur;
                  return (
                    <button 
                      key={dur} 
                      onClick={() => setDuration(dur)}
                      style={{ flex: 1, border: 'none', borderRight: '1px solid var(--border-color)', padding: '0.5rem 0', fontSize: '0.8rem', fontWeight: 700, backgroundColor: isAct ? 'var(--primary)' : 'white', color: isAct ? 'white' : '#475569', cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                      {dur}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.5rem' }}>Total Marks</label>
              <input 
                type="number" 
                value={totalMarks} 
                onChange={e => setTotalMarks(parseInt(e.target.value) || 0)}
                style={{ width: '100%', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.75rem', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.5rem' }}>Question Type</label>
              <div style={{ position: 'relative' }}>
                <select value={questionType} onChange={e => setQuestionType(e.target.value)} style={{ width: '100%', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.55rem 0.75rem', fontSize: '0.85rem', outline: 'none', backgroundColor: 'white', appearance: 'none' }}>
                  <option>Mixed</option>
                  <option>MCQs Only</option>
                  <option>Descriptive Only</option>
                </select>
                <ChevronDown size={16} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748B', pointerEvents: 'none' }} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.5rem' }}>Number of Questions</label>
              <input 
                type="number" 
                value={numQuestions} 
                onChange={e => setNumQuestions(parseInt(e.target.value) || 0)}
                style={{ width: '100%', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.75rem', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        </div>

        {/* Right: Advanced */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            ⚙ Advanced
          </h3>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.5rem' }}>Attempts Allowed</label>
            <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              {['1', 'Multiple'].map(att => {
                const isAct = attempts === att;
                return (
                  <button 
                    key={att} 
                    onClick={() => setAttempts(att)}
                    style={{ flex: 1, border: 'none', borderRight: '1px solid var(--border-color)', padding: '0.5rem 0', fontSize: '0.8rem', fontWeight: 700, backgroundColor: isAct ? 'var(--primary)' : 'white', color: isAct ? 'white' : '#475569', cursor: 'pointer', transition: 'all 0.2s' }}
                  >
                    {att}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.5rem' }}>Negative Marking</label>
            <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              {['None', '0.25', '0.5', 'Custom'].map(neg => {
                const isAct = negativeMarking === neg;
                return (
                  <button 
                    key={neg} 
                    onClick={() => setNegativeMarking(neg)}
                    style={{ flex: 1, border: 'none', borderRight: '1px solid var(--border-color)', padding: '0.5rem 0', fontSize: '0.8rem', fontWeight: 700, backgroundColor: isAct ? 'var(--primary)' : 'white', color: isAct ? 'white' : '#475569', cursor: 'pointer', transition: 'all 0.2s' }}
                  >
                    {neg}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.5rem' }}>Passing Marks</label>
            <input 
              type="number" 
              value={passingMarks} 
              onChange={e => setPassingMarks(parseInt(e.target.value) || 0)}
              style={{ width: '100%', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.75rem', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        </div>

      </div>

      {/* Marks Distribution & Availability Bottom Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>📊 Marks Distribution</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1.5px solid #E2E8F0', padding: '1rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', backgroundColor: marksDistribution === 'equal' ? '#EFF6FF' : 'white', transition: 'all 0.2s' }}>
            <input type="radio" checked={marksDistribution === 'equal'} onChange={() => setMarksDistribution('equal')} style={{ width: 18, height: 18 }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E293B' }}>Equal marks for all questions</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1.5px solid #E2E8F0', padding: '1rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', backgroundColor: marksDistribution === 'different' ? '#EFF6FF' : 'white', transition: 'all 0.2s' }}>
            <input type="radio" checked={marksDistribution === 'different'} onChange={() => setMarksDistribution('different')} style={{ width: 18, height: 18 }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E293B' }}>Different marks per question</span>
          </label>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>📅 Availability</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1.5px solid #E2E8F0', padding: '1rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', backgroundColor: availability === 'immediate' ? '#EFF6FF' : 'white', transition: 'all 0.2s' }}>
            <input type="radio" checked={availability === 'immediate'} onChange={() => setAvailability('immediate')} style={{ width: 18, height: 18 }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E293B' }}>Publish immediately</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1.5px solid #E2E8F0', padding: '1rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', backgroundColor: availability === 'scheduled' ? '#EFF6FF' : 'white', transition: 'all 0.2s' }}>
            <input type="radio" checked={availability === 'scheduled'} onChange={() => setAvailability('scheduled')} style={{ width: 18, height: 18 }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E293B' }}>Schedule for later</span>
          </label>
        </div>
      </div>

      {/* Step 2 Actions Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: '1rem' }}>
        <button onClick={onBack} style={{ backgroundColor: 'white', border: '1px solid #CBD5E1', color: '#475569', borderRadius: 'var(--radius-md)', padding: '0.6rem 1.5rem', fontSize: '0.825rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <ArrowLeft size={15} /> Back to Context
        </button>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={onSaveDraft} style={{ backgroundColor: '#F1F5F9', border: 'none', color: '#475569', borderRadius: 'var(--radius-md)', padding: '0.6rem 1.5rem', fontSize: '0.825rem', fontWeight: 700, cursor: 'pointer' }}>
            Save as Draft
          </button>
          <button 
            onClick={onNext}
            style={{ backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', padding: '0.6rem 1.75rem', fontSize: '0.825rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 4px 10px rgba(13,138,188,0.15)' }}
          >
            Next: Add Questions <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};
