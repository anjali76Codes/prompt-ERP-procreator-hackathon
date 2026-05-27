import React, { useState } from 'react';
import { ArrowLeft, Send, FileText, Users, Clock } from 'lucide-react';

interface StepPublishQuizProps {
  quizTitle: string;
  totalMarks: number;
  duration: string;
  questionsCount: number;
  branch: string;
  semester: string;
  division: string;
  onBack: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
}

export const StepPublishQuiz: React.FC<StepPublishQuizProps> = ({
  quizTitle, totalMarks, duration, questionsCount,
  branch, semester, division, onBack, onSaveDraft, onPublish
}) => {
  const [publishTime, setPublishTime] = useState('now'); // 'now' or 'later'
  const [deadlineDate, setDeadlineDate] = useState('2023-11-20');
  const [deadlineTime, setDeadlineTime] = useState('14:00');
  
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [sendReminders, setSendReminders] = useState(true);
  const [dashboardAlert, setDashboardAlert] = useState(true);
  
  const [showScoreImmediately, setShowScoreImmediately] = useState(true);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [disableTabSwitching, setDisableTabSwitching] = useState(true);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '32% 66%', gap: '2%', height: '100%' }}>
      
      {/* Left Column: Quiz Summary */}
      <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-lg)', padding: '1.5rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>Quiz Summary</h3>
          <FileText size={18} color="#64748B" />
        </div>

        <div>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>TITLE</span>
          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1E293B', marginTop: '0.25rem' }}>{quizTitle}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>TARGET AUDIENCE</span>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E293B', marginTop: '0.25rem' }}>CS {semester} {division} · {branch}</div>
          </div>
          <div>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>TOTAL MARKS</span>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E293B', marginTop: '0.25rem' }}>{totalMarks} Marks</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>DURATION</span>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E293B', marginTop: '0.25rem' }}>{duration} Mins</div>
          </div>
          <div>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>QUESTIONS</span>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E293B', marginTop: '0.25rem' }}>{questionsCount} Items</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '0.5rem' }}>Attached Resources</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'white', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #CBD5E1', fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>
            📄 oop_references.pdf
          </div>
        </div>
      </div>

      {/* Right Column: Delivery Settings */}
      <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-lg)', padding: '2rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>Delivery Settings</h3>
          <span style={{ backgroundColor: '#FFF7ED', color: '#C2410C', fontSize: '0.625rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '0.25rem', letterSpacing: '0.5px' }}>DRAFT MODE</span>
        </div>

        {/* Audience */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid #E2E8F0', padding: '1rem', borderRadius: 'var(--radius-md)', backgroundColor: '#F8FAFC' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
            <Users size={20} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: '#1E293B' }}>Audience</h4>
            <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.775rem', color: '#64748B', fontWeight: 600 }}>CS, Sem 3, Division A (64 Students)</p>
          </div>
          <button style={{ marginLeft: 'auto', border: 'none', background: 'none', color: 'var(--primary)', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}>Edit toggle ✏</button>
        </div>

        {/* Publishing Time */}
        <div style={{ border: '1px solid #E2E8F0', borderRadius: 'var(--radius-md)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 800, color: '#334155' }}>
            <Clock size={16} color="var(--primary)" /> Publishing Time
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem', fontWeight: 700 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
              <input type="radio" checked={publishTime === 'now'} onChange={() => setPublishTime('now')} /> Publish Now
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
              <input type="radio" checked={publishTime === 'later'} onChange={() => setPublishTime('later')} /> Schedule Later
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '0.35rem' }}>Deadline Date</label>
              <input type="date" value={deadlineDate} onChange={e => setDeadlineDate(e.target.value)} style={{ width: '100%', border: '1px solid #CBD5E1', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.75rem', fontSize: '0.8rem', outline: 'none' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '0.35rem' }}>Deadline Time</label>
              <input type="time" value={deadlineTime} onChange={e => setDeadlineTime(e.target.value)} style={{ width: '100%', border: '1px solid #CBD5E1', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.75rem', fontSize: '0.8rem', outline: 'none' }} />
            </div>
          </div>
        </div>

        {/* Notifications and Settings side-by-side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4%' }}>
          
          {/* Notifications */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>NOTIFICATIONS</span>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid #E2E8F0', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
              <input type="checkbox" checked={notifyEmail} onChange={e => setNotifyEmail(e.target.checked)} style={{ width: 16, height: 16 }} />
              Notify students via email
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid #E2E8F0', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
              <input type="checkbox" checked={sendReminders} onChange={e => setSendReminders(e.target.checked)} style={{ width: 16, height: 16 }} />
              Send reminders (2h before)
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid #E2E8F0', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
              <input type="checkbox" checked={dashboardAlert} onChange={e => setDashboardAlert(e.target.checked)} style={{ width: 16, height: 16 }} />
              Dashboard alert
            </label>
          </div>

          {/* Settings & Security */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SETTINGS & SECURITY</span>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid #E2E8F0', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
              <input type="checkbox" checked={showScoreImmediately} onChange={e => setShowScoreImmediately(e.target.checked)} style={{ width: 16, height: 16 }} />
              Show score immediately
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid #E2E8F0', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
              <input type="checkbox" checked={shuffleQuestions} onChange={e => setShuffleQuestions(e.target.checked)} style={{ width: 16, height: 16 }} />
              Shuffle questions & options
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid #FCA5A5', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', fontWeight: 600, color: '#9B2C2C', backgroundColor: '#FFF5F5', cursor: 'pointer' }}>
              <input type="checkbox" checked={disableTabSwitching} onChange={e => setDisableTabSwitching(e.target.checked)} style={{ width: 16, height: 16 }} />
              Disable tab switching 🚫
            </label>
          </div>

        </div>

        {/* Step 6 Actions footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: 'auto', gap: '1rem', alignItems: 'center' }}>
          <button onClick={onBack} style={{ backgroundColor: 'white', border: '1px solid #CBD5E1', color: '#475569', borderRadius: 'var(--radius-md)', padding: '0.6rem 1.5rem', fontSize: '0.825rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', marginRight: 'auto' }}>
            <ArrowLeft size={15} /> Back
          </button>
          <button onClick={onSaveDraft} style={{ backgroundColor: 'white', border: '1px solid #CBD5E1', color: '#475569', borderRadius: 'var(--radius-md)', padding: '0.6rem 1.5rem', fontSize: '0.825rem', fontWeight: 700, cursor: 'pointer' }}>
            Save as Draft
          </button>
          <button 
            onClick={onPublish}
            style={{ backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', padding: '0.6rem 1.75rem', fontSize: '0.825rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 4px 10px rgba(13,138,188,0.2)' }}
          >
            Publish Quiz <Send size={15} />
          </button>
        </div>

      </div>
    </div>
  );
};
