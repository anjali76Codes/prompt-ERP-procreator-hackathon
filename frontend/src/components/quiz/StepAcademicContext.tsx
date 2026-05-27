import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronDown, Sparkles } from 'lucide-react';
import type { Division, Subject } from '../../lib/erp/types';

interface StepAcademicContextProps {
  divisions: Division[];
  subjects: Subject[];
  branch: string;
  setBranch: (v: string) => void;
  semester: string;
  setSemester: (v: string) => void;
  division: string;
  setDivision: (v: string) => void;
  subject: string;
  setSubject: (v: string) => void;
  selectedChapters: string[];
  setSelectedChapters: (v: string[]) => void;
  aiContext: string;
  setAiContext: (v: string) => void;
  onNext: () => void;
}

export const StepAcademicContext: React.FC<StepAcademicContextProps> = ({
  divisions, subjects, branch, setBranch, semester, setSemester, division, setDivision,
  subject, setSubject, selectedChapters, setSelectedChapters,
  aiContext, setAiContext, onNext
}) => {
  const navigate = useNavigate();

  const selectedSubject = subjects.find(s => s._id === subject);
  const selectedDivision = divisions.find(d => d._id === division);
  const canContinue = Boolean(division && subject);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '64% 34%', gap: '2%', height: '100%' }}>
      {/* Left Input Fields Form */}
      <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-lg)', padding: '2rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1E293B', margin: '0 0 0.25rem 0' }}>Create New Quiz</h2>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B' }}>Define the context for your academic evaluation to generate optimal questions.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.5rem' }}>Branch</label>
            <div style={{ position: 'relative' }}>
              <select value={branch} onChange={e => setBranch(e.target.value)} style={{ width: '100%', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.65rem 1rem', fontSize: '0.85rem', outline: 'none', backgroundColor: 'white', appearance: 'none', cursor: 'pointer' }}>
                <option value="">Select branch…</option>
                <option>Computer Science</option>
                <option>Information Technology</option>
                <option>Electronics Engineering</option>
              </select>
              <ChevronDown size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748B' }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.5rem' }}>Semester</label>
            <div style={{ position: 'relative' }}>
              <select value={semester} onChange={e => setSemester(e.target.value)} style={{ width: '100%', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.65rem 1rem', fontSize: '0.85rem', outline: 'none', backgroundColor: 'white', appearance: 'none', cursor: 'pointer' }}>
                <option value="">Select semester…</option>
                <option>Semester 1</option>
                <option>Semester 2</option>
                <option>Semester 3</option>
                <option>Semester 4</option>
              </select>
              <ChevronDown size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748B' }} />
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.5rem' }}>Division</label>
            <div style={{ position: 'relative' }}>
              <select value={division} onChange={e => setDivision(e.target.value)} style={{ width: '100%', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.65rem 1rem', fontSize: '0.85rem', outline: 'none', backgroundColor: 'white', appearance: 'none', cursor: 'pointer' }}>
                <option value="">{divisions.length ? 'Select division…' : 'No divisions assigned'}</option>
                {divisions.map(d => (
                  <option key={d._id} value={d._id}>{d.code} — {d.name}</option>
                ))}
              </select>
              <ChevronDown size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748B' }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.5rem' }}>Subject</label>
            <div style={{ position: 'relative' }}>
              <select value={subject} onChange={e => setSubject(e.target.value)} style={{ width: '100%', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.65rem 1rem', fontSize: '0.85rem', outline: 'none', backgroundColor: 'white', appearance: 'none', cursor: 'pointer' }}>
                <option value="">{subjects.length ? 'Select subject…' : 'No subjects assigned'}</option>
                {subjects.map(s => (
                  <option key={s._id} value={s._id}>{s.code} — {s.name}</option>
                ))}
              </select>
              <ChevronDown size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748B' }} />
            </div>
          </div>
        </div>

        {/* Chapters / topics — optional, comma-separated */}
        <div>
          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.5rem' }}>
            Chapter(s) / Topics <span style={{ color: '#94A3B8', fontWeight: 500 }}>(Optional)</span>
          </label>
          <input
            type="text"
            value={selectedChapters.join(', ')}
            onChange={e => setSelectedChapters(
              e.target.value.split(',').map(c => c.trim()).filter(Boolean)
            )}
            placeholder="E.g., Inheritance, Polymorphism, Exception Handling"
            style={{ width: '100%', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.65rem 1rem', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* AI Helper context */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>AI Context / Additional Notes <span style={{ color: '#94A3B8', fontWeight: 500 }}>(Optional)</span></label>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.2rem', cursor: 'pointer' }}>
              <Sparkles size={13} /> How it helps?
            </span>
          </div>
          <textarea 
            value={aiContext}
            onChange={e => setAiContext(e.target.value)}
            placeholder="E.g., Focus more on inheritance, polymorphism, and abstract classes..."
            style={{ width: '100%', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', fontSize: '0.85rem', outline: 'none', height: '80px', resize: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Actions bottom footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: 'auto' }}>
          <button onClick={() => navigate('/dashboard')} style={{ backgroundColor: 'white', border: '1px solid #CBD5E1', color: '#475569', borderRadius: 'var(--radius-md)', padding: '0.6rem 1.5rem', fontSize: '0.825rem', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
          <button
            onClick={onNext}
            disabled={!canContinue}
            title={canContinue ? '' : 'Select a division and subject to continue'}
            style={{ backgroundColor: canContinue ? 'var(--primary)' : '#CBD5E1', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', padding: '0.6rem 1.75rem', fontSize: '0.825rem', fontWeight: 700, cursor: canContinue ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 4px 10px rgba(13,138,188,0.15)' }}
          >
            Continue <ArrowRight size={15} />
          </button>
        </div>
      </div>

      {/* Right Sidebar Quick Tips Panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Tips Box */}
        <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-lg)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            💡 Quick Tips
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              'Selecting specific units helps the AI generate more relevant technical questions.',
              'Providing AI context allows you to control the difficulty and topic weightage.',
              'You can preview and edit all generated questions in Step 3.'
            ].map((tip, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--primary)', fontSize: '1rem', lineHeight: 1 }}>✔</span>
                <p style={{ margin: 0, fontSize: '0.815rem', color: '#475569', lineHeight: 1.45, fontWeight: 500 }}>{tip}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Status Box */}
        <div style={{ backgroundColor: 'white', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.5px' }}>QUIZ STATUS</span>
            <span style={{ backgroundColor: '#F1F5F9', color: '#475569', fontSize: '0.625rem', fontWeight: 800, padding: '0.15rem 0.45rem', borderRadius: '0.25rem', letterSpacing: '0.5px' }}>DRAFT</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600 }}>
            <span style={{ color: '#64748B' }}>Division:</span>
            <span style={{ color: '#1E293B', fontWeight: 700 }}>{selectedDivision ? `${selectedDivision.code} — ${selectedDivision.name}` : '--'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600 }}>
            <span style={{ color: '#64748B' }}>Subject:</span>
            <span style={{ color: '#1E293B', fontWeight: 700 }}>{selectedSubject ? selectedSubject.name : '--'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600 }}>
            <span style={{ color: '#64748B' }}>Topics:</span>
            <span style={{ color: '#94A3B8', fontWeight: 700 }}>{selectedChapters.length || '--'}</span>
          </div>
        </div>

        {/* Promotional banner block */}
        <div style={{ position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden', height: '160px', marginTop: 'auto' }}>
          <img src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=400&q=80" alt="promo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(2, 87, 147, 0.85)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '1.25rem', color: 'white' }}>
            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800 }}>Empowering Precise Assessment</h4>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.725rem', opacity: 0.9 }}>AI-powered question generators help teachers produce valid evaluation sets instantly.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
