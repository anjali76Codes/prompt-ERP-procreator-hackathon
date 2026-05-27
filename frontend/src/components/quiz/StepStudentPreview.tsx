import React from 'react';
import { BookOpen, FileText } from 'lucide-react';
import type { Question } from './types';

interface StepStudentPreviewProps {
  questions: Question[];
  quizTitle: string;
  selectedStudentAnswers: Record<number, number>;
  setSelectedStudentAnswers: (v: Record<number, number>) => void;
  previewQIndex: number;
  setPreviewQIndex: (idx: number) => void;
  onBack: () => void;
  onPublish: () => void;
}

export const StepStudentPreview: React.FC<StepStudentPreviewProps> = ({
  questions, quizTitle, selectedStudentAnswers, setSelectedStudentAnswers,
  previewQIndex, setPreviewQIndex, onBack, onPublish
}) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '24% 74%', gap: '2%', height: '100%' }}>
      
      {/* Left Student Structure Column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ backgroundColor: 'white', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#EFF6FF', color: 'var(--primary)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '0.825rem', cursor: 'pointer' }}>
            <BookOpen size={16} /> Active Quiz
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.825rem', color: '#475569', cursor: 'pointer' }}>
            <FileText size={16} /> Statistics
          </div>
        </div>

        <div style={{ backgroundColor: 'white', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>QUESTION GRID</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.4rem' }}>
            {questions.map((q, idx) => {
              const isAct = previewQIndex === idx;
              const hasAns = selectedStudentAnswers[q.id] !== undefined;
              return (
                <button 
                  key={q.id}
                  onClick={() => setPreviewQIndex(idx)}
                  style={{ height: 34, borderRadius: 'var(--radius-sm)', border: isAct ? '2px solid var(--primary)' : '1px solid var(--border-color)', backgroundColor: isAct ? 'var(--primary)' : hasAns ? '#EFF6FF' : 'white', color: isAct ? 'white' : '#1E293B', fontWeight: 700, fontSize: '0.775rem', cursor: 'pointer' }}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Middle student preview core card */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ backgroundColor: 'white', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', flex: 1 }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9', paddingBottom: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>{quizTitle || 'Student Preview'}</h3>
              <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, marginTop: '0.25rem' }}>
                Question {(previewQIndex + 1)} of {questions.length}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', color: 'var(--primary)', padding: '0.45rem 1rem', borderRadius: '0.5rem', fontSize: '0.85rem', fontWeight: 800 }}>
              👁 Preview
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {questions[previewQIndex]?.topics?.[0] && (
              <span style={{ alignSelf: 'flex-start', backgroundColor: '#F1F5F9', color: '#475569', fontSize: '0.7rem', fontWeight: 800, padding: '0.2rem 0.55rem', borderRadius: '0.25rem' }}>
                {questions[previewQIndex].topics[0]}
              </span>
            )}
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.4 }}>
              {questions[previewQIndex]?.text}
            </h2>
          </div>

          {questions[previewQIndex]?.type === 'MCQ' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
              {questions[previewQIndex].options.map((opt, oIdx) => {
                const isSelected = selectedStudentAnswers[questions[previewQIndex].id] === oIdx;
                return (
                  <label 
                    key={oIdx}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '1rem', 
                      border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--border-color)', 
                      padding: '1rem', 
                      borderRadius: 'var(--radius-md)', 
                      cursor: 'pointer', 
                      backgroundColor: isSelected ? '#EFF6FF' : 'white',
                      transition: 'all 0.2s',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: '#334155'
                    }}
                  >
                    <input 
                      type="radio" 
                      name="studentAnswers"
                      checked={isSelected}
                      onChange={() => {
                        setSelectedStudentAnswers({
                          ...selectedStudentAnswers,
                          [questions[previewQIndex].id]: oIdx
                        });
                      }}
                      style={{ width: 18, height: 18 }}
                    />
                    {opt}
                  </label>
                );
              })}
            </div>
          ) : (
            <textarea 
              placeholder="Write your explanation here..."
              style={{ width: '100%', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem', fontSize: '0.85rem', height: '140px', outline: 'none', resize: 'none', boxSizing: 'border-box' }}
            />
          )}

          <div style={{ marginTop: 'auto', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.15rem' }}>📋</span>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary)' }}>Ready to finalize?</div>
                <div style={{ fontSize: '0.725rem', color: '#64748B', fontWeight: 600, marginTop: '0.1rem' }}>Review your {questions.length} questions before the final submission.</div>
              </div>
            </div>
            <button onClick={onPublish} style={{ backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', padding: '0.6rem 1.5rem', fontSize: '0.825rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(13,138,188,0.2)' }}>
              Submit Quiz
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
          <span style={{ fontSize: '0.775rem', fontWeight: 600, color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            👁 You are viewing the quiz exactly as students will see it.
          </span>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={onBack} style={{ backgroundColor: 'white', border: '1px solid #CBD5E1', color: '#475569', borderRadius: 'var(--radius-md)', padding: '0.55rem 1.25rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
              Back to Editor
            </button>
            <button 
              onClick={onPublish}
              style={{ backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', padding: '0.55rem 1.5rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', boxShadow: '0 4px 12px rgba(13,138,188,0.1)' }}
            >
              Proceed to Publish 🚀
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};
