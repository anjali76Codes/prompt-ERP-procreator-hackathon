import React, { useState } from 'react';
import { Copy, Trash2, ChevronDown, ArrowRight, Plus } from 'lucide-react';
import type { Question } from './types';

interface StepAddQuestionsProps {
  questions: Question[];
  editingIndex: number;
  editingType: 'MCQ' | 'Descriptive';
  setEditingType: (v: 'MCQ' | 'Descriptive') => void;
  editingMarks: number;
  setEditingMarks: (v: number) => void;
  editingDifficulty: 'Easy' | 'Med' | 'Hard';
  setEditingDifficulty: (v: 'Easy' | 'Med' | 'Hard') => void;
  editingText: string;
  setEditingText: (v: string) => void;
  editingOptions: string[];
  setEditingOptions: (v: string[]) => void;
  editingCorrect: number;
  setEditingCorrect: (v: number) => void;
  editingExplanation: string;
  setEditingExplanation: (v: string) => void;
  editingTopics: string[];
  setEditingTopics: (v: string[]) => void;
  newTopicTag: string;
  setNewTopicTag: (v: string) => void;
  totalMarks: number;
  numQuestions: number;
  loadQuestionToEditor: (idx: number) => void;
  handleSaveQuestion: () => void;
  handleSaveAndNext: () => void;
  handleDuplicateQuestion: () => void;
  handleDeleteQuestion: () => void;
  handleAddTopicTag: (e: React.KeyboardEvent) => void;
  handleRemoveTopicTag: (tag: string) => void;
}

export const StepAddQuestions: React.FC<StepAddQuestionsProps> = ({
  questions, editingIndex, editingType, setEditingType,
  editingMarks, setEditingMarks, editingDifficulty, setEditingDifficulty,
  editingText, setEditingText, editingOptions, setEditingOptions,
  editingCorrect, setEditingCorrect, editingExplanation, setEditingExplanation,
  editingTopics, setEditingTopics, newTopicTag, setNewTopicTag,
  totalMarks, numQuestions, loadQuestionToEditor, handleSaveQuestion,
  handleSaveAndNext, handleDuplicateQuestion, handleDeleteQuestion,
  handleAddTopicTag, handleRemoveTopicTag
}) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '66% 32%', gap: '2%', height: '100%' }}>
      {/* Question Editor */}
      <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-lg)', padding: '2rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>Question {editingIndex + 1}</h3>
          <div style={{ display: 'flex', gap: '0.5rem', color: '#64748B' }}>
            <button onClick={handleDuplicateQuestion} title="Duplicate Question" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', color: '#475569', borderRadius: '0.25rem' }}>
              <Copy size={16} />
            </button>
            <button onClick={handleDeleteQuestion} title="Delete Question" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', color: '#EF4444', borderRadius: '0.25rem' }}>
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.775rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>Question Type</label>
            <div style={{ position: 'relative' }}>
              <select value={editingType} onChange={e => setEditingType(e.target.value as any)} style={{ width: '100%', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.75rem', fontSize: '0.825rem', outline: 'none', backgroundColor: 'white', appearance: 'none' }}>
                <option>MCQ</option>
                <option>Descriptive</option>
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748B' }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.775rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>Marks</label>
            <input 
              type="number" 
              value={editingMarks} 
              onChange={e => setEditingMarks(parseInt(e.target.value) || 0)}
              style={{ width: '100%', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.75rem', fontSize: '0.825rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.775rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>Difficulty</label>
            <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              {[
                { label: 'Easy', color: '#10B981' },
                { label: 'Med', color: '#F59E0B' },
                { label: 'Hard', color: '#EF4444' }
              ].map(d => {
                const isAct = editingDifficulty === d.label;
                return (
                  <button 
                    key={d.label}
                    onClick={() => setEditingDifficulty(d.label as any)}
                    style={{ flex: 1, border: 'none', padding: '0.5rem 0', fontSize: '0.75rem', fontWeight: 700, backgroundColor: isAct ? d.color : 'white', color: isAct ? 'white' : '#64748B', cursor: 'pointer' }}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          <label style={{ fontSize: '0.775rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>Question Text</label>
          <textarea 
            value={editingText}
            onChange={e => setEditingText(e.target.value)}
            style={{ width: '100%', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.75rem', fontSize: '0.85rem', outline: 'none', height: '65px', resize: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {editingType === 'MCQ' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.775rem', fontWeight: 700, color: '#475569' }}>Options & Correct Answer</label>
            {editingOptions.map((opt, oIdx) => (
              <div key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', border: editingCorrect === oIdx ? '1.5px solid var(--primary)' : '1px solid var(--border-color)', padding: '0.5rem 0.85rem', borderRadius: 'var(--radius-md)', backgroundColor: editingCorrect === oIdx ? '#EFF6FF' : 'white' }}>
                <input 
                  type="radio" 
                  checked={editingCorrect === oIdx}
                  onChange={() => setEditingCorrect(oIdx)}
                  style={{ cursor: 'pointer', width: 16, height: 16 }}
                />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)' }}>{String.fromCharCode(65 + oIdx)}</span>
                <input 
                  type="text" 
                  value={opt}
                  onChange={e => {
                    const newOpts = [...editingOptions];
                    newOpts[oIdx] = e.target.value;
                    setEditingOptions(newOpts);
                  }}
                  style={{ border: 'none', outline: 'none', backgroundColor: 'transparent', width: '100%', fontSize: '0.825rem', fontWeight: 600, color: '#1E293B' }}
                />
              </div>
            ))}
          </div>
        )}

        <div>
          <label style={{ fontSize: '0.775rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>Explanation</label>
          <textarea 
            value={editingExplanation}
            onChange={e => setEditingExplanation(e.target.value)}
            style={{ width: '100%', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.6rem 0.75rem', fontSize: '0.8rem', outline: 'none', height: '45px', resize: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label style={{ fontSize: '0.775rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>Topic Mapping</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem', backgroundColor: '#F8FAFC' }}>
            {editingTopics.map(t => (
              <span key={t} style={{ backgroundColor: '#E2E8F0', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.725rem', fontWeight: 700, color: '#334155', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                {t} <button onClick={() => handleRemoveTopicTag(t)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, fontSize: '0.725rem' }}>×</button>
              </span>
            ))}
            <input 
              type="text" 
              placeholder="Add tag..."
              value={newTopicTag}
              onChange={e => setNewTopicTag(e.target.value)}
              onKeyDown={handleAddTopicTag}
              style={{ border: 'none', background: 'none', outline: 'none', fontSize: '0.75rem', padding: '0.2rem', color: '#1E293B', width: '80px' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: 'auto' }}>
          <button onClick={() => loadQuestionToEditor(editingIndex)} style={{ backgroundColor: 'white', border: '1px solid #CBD5E1', color: '#475569', borderRadius: 'var(--radius-md)', padding: '0.5rem 1.25rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
            Discard Changes
          </button>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={handleSaveQuestion} style={{ backgroundColor: 'white', border: '1px solid #CBD5E1', color: '#475569', borderRadius: 'var(--radius-md)', padding: '0.5rem 1.25rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
              Save Question
            </button>
            <button 
              onClick={handleSaveAndNext}
              style={{ backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', padding: '0.5rem 1.5rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', boxShadow: '0 4px 10px rgba(13,138,188,0.1)' }}
            >
              Save and Add Next <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Quiz Summary Right panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ backgroundColor: 'white', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>Quiz Summary</h3>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>Questions Added</span>
            <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary)' }}>{questions.length.toString().padStart(2, '0')}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600 }}>
              <span style={{ color: '#64748B' }}>Marks Distribution</span>
              <span style={{ color: '#1E293B', fontWeight: 700 }}>
                {questions.reduce((sum, q) => sum + q.marks, 0)} / {totalMarks} Marks
              </span>
            </div>
            <div style={{ height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(100, (questions.reduce((sum, q) => sum + q.marks, 0) / totalMarks) * 100)}%`, backgroundColor: 'var(--primary)', borderRadius: 3 }} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>Remaining Slots</span>
            <span style={{ fontSize: '0.825rem', fontWeight: 800, color: '#F59E0B' }}>
              {Math.max(0, numQuestions - questions.length)} Questions
            </span>
          </div>

          <button style={{ backgroundColor: 'white', border: '1px dashed #CBD5E1', borderRadius: 'var(--radius-md)', padding: '0.6rem', color: 'var(--primary)', fontWeight: 800, fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', cursor: 'pointer' }}>
            <Plus size={14} /> Add Section Placeholder
          </button>
        </div>

        {/* Question Map Grid */}
        <div style={{ backgroundColor: 'white', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>QUESTION MAP</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {questions.map((q, idx) => {
              const isAct = editingIndex === idx;
              return (
                <button 
                  key={idx} 
                  onClick={() => loadQuestionToEditor(idx)}
                  style={{ width: 34, height: 34, borderRadius: 'var(--radius-sm)', border: isAct ? '2px solid var(--primary)' : '1px solid var(--border-color)', backgroundColor: isAct ? 'var(--primary)' : 'white', color: isAct ? 'white' : '#1E293B', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  {idx + 1}
                </button>
              );
            })}
            <button onClick={handleSaveAndNext} style={{ width: 34, height: 34, borderRadius: 'var(--radius-sm)', border: '1px dashed #CBD5E1', backgroundColor: 'transparent', color: '#94A3B8', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
