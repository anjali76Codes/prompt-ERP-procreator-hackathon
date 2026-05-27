import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { Question } from './types';

interface StepReviewQuizProps {
  questions: Question[];
  duration: string;
  onBack: () => void;
  onSaveDraft: () => void;
  onPreview: () => void;
}

export const StepReviewQuiz: React.FC<StepReviewQuizProps> = ({
  questions, duration, onBack, onSaveDraft, onPreview
}) => {
  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Stat Top Header Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', backgroundColor: 'white', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div>
          <div style={{ fontSize: '0.625rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Questions</div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#1E293B', marginTop: '0.25rem' }}>{questions.length}</div>
        </div>
        <div style={{ borderLeft: '1px solid #E2E8F0', paddingLeft: '1rem' }}>
          <div style={{ fontSize: '0.625rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Marks</div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#1E293B', marginTop: '0.25rem' }}>{totalMarks}</div>
        </div>
        <div style={{ borderLeft: '1px solid #E2E8F0', paddingLeft: '1rem' }}>
          <div style={{ fontSize: '0.625rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Duration</div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#1E293B', marginTop: '0.25rem' }}>{duration} Mins</div>
        </div>
        <div style={{ borderLeft: '1px solid #E2E8F0', paddingLeft: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div>
            <div style={{ fontSize: '0.625rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Reviewing Complexity</div>
            <div style={{ height: 6, width: '100px', backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden', marginTop: '0.35rem' }}>
              <div style={{ height: '100%', width: '70%', backgroundColor: 'var(--primary)', borderRadius: 3 }} />
            </div>
          </div>
        </div>
        <div style={{ borderLeft: '1px solid #E2E8F0', paddingLeft: '1rem' }}>
          <div style={{ fontSize: '0.625rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Difficulty Distribution</div>
          <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.725rem', fontWeight: 700, marginTop: '0.35rem' }}>
            <span style={{ color: '#10B981' }}>Easy({questions.filter(q => q.difficulty === 'Easy').length})</span>
            <span style={{ color: '#F59E0B' }}>Med({questions.filter(q => q.difficulty === 'Med').length})</span>
            <span style={{ color: '#EF4444' }}>Hard({questions.filter(q => q.difficulty === 'Hard').length})</span>
          </div>
        </div>
      </div>

      {/* Questions List previews */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {questions.map((q, idx) => (
          <div key={q.id} style={{ backgroundColor: 'white', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', position: 'relative', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ backgroundColor: '#F1F5F9', color: '#475569', fontSize: '0.725rem', fontWeight: 800, padding: '0.2rem 0.5rem', borderRadius: '0.25rem' }}>Q{idx + 1}</span>
              <span style={{ backgroundColor: '#EFF6FF', color: 'var(--primary)', fontSize: '0.725rem', fontWeight: 800, padding: '0.2rem 0.5rem', borderRadius: '0.25rem' }}>{q.type}</span>
              <span style={{ backgroundColor: q.difficulty === 'Easy' ? '#E1FBF2' : q.difficulty === 'Med' ? '#FEF3C7' : '#FEE2E2', color: q.difficulty === 'Easy' ? '#10B981' : q.difficulty === 'Med' ? '#F59E0B' : '#EF4444', fontSize: '0.725rem', fontWeight: 800, padding: '0.2rem 0.5rem', borderRadius: '0.25rem' }}>{q.difficulty}</span>
              <span style={{ marginLeft: 'auto', fontSize: '0.75rem', fontWeight: 700, color: '#64748B' }}>{q.marks} Marks</span>
            </div>

            <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.925rem', fontWeight: 700, color: '#1E293B', lineHeight: 1.4 }}>{q.text}</h4>

            {q.type === 'MCQ' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                {q.options.map((opt, oIdx) => (
                  <div 
                    key={oIdx} 
                    style={{ 
                      border: q.correctOption === oIdx ? '1.5px solid var(--primary)' : '1px solid var(--border-color)', 
                      padding: '0.6rem 0.85rem', 
                      borderRadius: 'var(--radius-md)', 
                      backgroundColor: q.correctOption === oIdx ? '#EFF6FF' : 'white',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: '#334155',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <span style={{ color: 'var(--primary)', fontWeight: 800 }}>{String.fromCharCode(65 + oIdx)}.</span> {opt}
                    {q.correctOption === oIdx && <span style={{ marginLeft: 'auto', color: 'var(--primary)' }}>✔</span>}
                  </div>
                ))}
              </div>
            )}

            {q.type === 'Descriptive' && (
              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.775rem', color: '#64748B', fontWeight: 600, fontStyle: 'italic', marginBottom: '1rem' }}>
                💡 {q.explanation}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Review Step Actions footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: '1rem' }}>
        <button onClick={onBack} style={{ backgroundColor: 'white', border: '1px solid #CBD5E1', color: '#475569', borderRadius: 'var(--radius-md)', padding: '0.6rem 1.5rem', fontSize: '0.825rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <ArrowLeft size={15} /> Back to Settings
        </button>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={onSaveDraft} style={{ backgroundColor: 'white', border: '1px solid #CBD5E1', color: '#475569', borderRadius: 'var(--radius-md)', padding: '0.6rem 1.5rem', fontSize: '0.825rem', fontWeight: 700, cursor: 'pointer' }}>
            Save as Draft
          </button>
          <button 
            onClick={onPreview}
            style={{ backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', padding: '0.6rem 1.75rem', fontSize: '0.825rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 4px 10px rgba(13,138,188,0.15)' }}
          >
            Preview Quiz <ArrowRight size={15} />
          </button>
        </div>
      </div>

    </div>
  );
};
