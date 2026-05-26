import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, ChevronRight, Upload, ClipboardList, FileText, RotateCcw,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { useResources } from '../lib/resources/ResourcesContext';
import { useAuth } from '../lib/auth/AuthContext';

type StepKey = 'division' | 'subject' | 'action';

const StepDot: React.FC<{ idx: number; label: string; active: boolean; done: boolean }> = ({
  idx, label, active, done,
}) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
    <div
      style={{
        width: 26, height: 26, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.75rem', fontWeight: 800,
        background: done ? 'var(--primary)' : active ? '#EFF6FF' : '#F1F5F9',
        color: done ? 'white' : active ? 'var(--primary)' : '#94A3B8',
        border: active && !done ? '1.5px solid var(--primary)' : '1.5px solid transparent',
      }}
    >
      {idx}
    </div>
    <span
      style={{
        fontSize: '0.78rem', fontWeight: 700,
        color: done || active ? '#0F172A' : '#94A3B8',
      }}
    >
      {label}
    </span>
  </div>
);

const StepConnector: React.FC<{ done: boolean }> = ({ done }) => (
  <div
    style={{
      flex: 1, height: 2, margin: '0 0.75rem',
      background: done ? 'var(--primary)' : '#E2E8F0', borderRadius: 1,
    }}
  />
);

export const Resources: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    divisions, subjects, loading, error,
    divisionId, subjectId, selectDivision, selectSubject, resetSelection,
    items,
  } = useResources();

  const teacherBranch = user && user.role === 'teacher' ? user.branch : null;

  // Subjects scoped to the selected division (matches year+branch when possible).
  const visibleSubjects = useMemo(() => {
    if (!divisionId) return [] as typeof subjects;
    const div = divisions.find(d => d._id === divisionId);
    if (!div) return subjects;
    const branchId = typeof div.branch === 'string' ? div.branch : div.branch._id;
    return subjects.filter(s => {
      const sb = typeof s.branch === 'string' ? s.branch : s.branch._id;
      return s.year === div.year && sb === branchId;
    });
  }, [divisions, subjects, divisionId]);

  const currentStep: StepKey =
    !divisionId ? 'division' :
    !subjectId  ? 'subject'  : 'action';

  const selectedDivision = divisions.find(d => d._id === divisionId) ?? null;
  const selectedSubject  = subjects.find(s => s._id === subjectId) ?? null;

  const assignmentsCount = items.filter(i =>
    i.kind === 'assignment' && i.divisionId === divisionId && i.subjectId === subjectId
  ).length;
  const notesCount = items.filter(i =>
    i.kind === 'notes' && i.divisionId === divisionId && i.subjectId === subjectId
  ).length;

  const go = (path: string) => () => navigate(path);

  return (
    <AppLayout
      background="#F8FAFC"
      pageIcon={<BookOpen size={18} />}
      pageTitle="Assignments & Notes"
      pageBreadcrumb={
        <>
          {teacherBranch && <span>Branch · <strong>{teacherBranch}</strong></span>}
          {selectedDivision && (
            <>
              <ChevronRight size={11} />
              <span>{selectedDivision.code}</span>
            </>
          )}
          {selectedSubject && (
            <>
              <ChevronRight size={11} />
              <span className="current">{selectedSubject.code} · {selectedSubject.name}</span>
            </>
          )}
        </>
      }
      pageActions={
        (divisionId || subjectId) ? (
          <button className="btn btn-secondary btn-sm" onClick={resetSelection}>
            <RotateCcw size={14} /> Reset
          </button>
        ) : null
      }
    >
      {error && <div className="status-pill danger" style={{ marginBottom: '1rem' }}>{error}</div>}

      {/* Stepper */}
      <div
        className="card"
        style={{ display: 'flex', alignItems: 'center', padding: '1rem 1.25rem', marginBottom: '1.25rem' }}
      >
        <StepDot idx={1} label="Division" active={currentStep === 'division'} done={!!divisionId} />
        <StepConnector done={!!divisionId} />
        <StepDot idx={2} label="Subject" active={currentStep === 'subject'} done={!!subjectId} />
        <StepConnector done={!!subjectId} />
        <StepDot idx={3} label="Upload / Check" active={currentStep === 'action'} done={false} />
      </div>

      {/* Step 1 — Division */}
      {currentStep === 'division' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title-lg">Select a division</h3>
            <span className="status-pill muted">{divisions.length} assigned</span>
          </div>
          {loading.divisions ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>Loading divisions…</div>
          ) : divisions.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>
              No divisions are assigned to you yet. Ask your admin to assign one.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.85rem' }}>
              {divisions.map(d => (
                <button
                  key={d._id}
                  onClick={() => selectDivision(d._id)}
                  className="card card-compact"
                  style={{
                    cursor: 'pointer', textAlign: 'left', padding: '1rem',
                    display: 'flex', flexDirection: 'column', gap: '0.4rem',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    {d.year}
                  </span>
                  <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>{d.code}</span>
                  <span style={{ fontSize: '0.78rem', color: '#475569' }}>{d.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 2 — Subject */}
      {currentStep === 'subject' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title-lg">Select a subject</h3>
            <button className="alert-row-cta" onClick={() => selectDivision(null)}>← Change division</button>
          </div>
          {loading.subjects ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>Loading subjects…</div>
          ) : visibleSubjects.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>
              No subjects found for {selectedDivision?.code}. Check your teaching assignments.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.85rem' }}>
              {visibleSubjects.map(s => (
                <button
                  key={s._id}
                  onClick={() => selectSubject(s._id)}
                  className="card card-compact"
                  style={{
                    cursor: 'pointer', textAlign: 'left', padding: '1rem',
                    display: 'flex', flexDirection: 'column', gap: '0.4rem',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    {s.code}
                  </span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.3 }}>
                    {s.name}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                    {s.year} · {s.credits} credits
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 3 — Action tiles */}
      {currentStep === 'action' && (
        <div className="stack-lg">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title-lg">What would you like to do?</h3>
              <button className="alert-row-cta" onClick={() => selectSubject(null)}>← Change subject</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <ActionGroup title="Assignments" tint="#EFF6FF" iconColor="var(--primary)">
                <ActionTile
                  icon={<Upload size={18} />}
                  title="Upload Assignment"
                  desc="Create a new assignment with title, instructions, due date and attachments."
                  onClick={go('/assignments/upload/assignment')}
                  primary
                />
                <ActionTile
                  icon={<ClipboardList size={18} />}
                  title="Check Assignments"
                  desc={`Review existing assignments for this subject (${assignmentsCount}).`}
                  badge={assignmentsCount > 0 ? `${assignmentsCount}` : undefined}
                  onClick={go('/assignments/list')}
                />
              </ActionGroup>

              <ActionGroup title="Notes" tint="#ECFDF5" iconColor="#16A34A">
                <ActionTile
                  icon={<FileText size={18} />}
                  title="Upload Notes"
                  desc="Share study material — lecture notes, references, reading material."
                  onClick={go('/assignments/upload/notes')}
                  primary
                  tone="green"
                />
                <ActionTile
                  icon={<ClipboardList size={18} />}
                  title="Check Notes"
                  desc={`Review existing notes for this subject (${notesCount}).`}
                  badge={notesCount > 0 ? `${notesCount}` : undefined}
                  onClick={go('/assignments/notes')}
                  tone="green"
                />
              </ActionGroup>
            </div>
          </div>

          <div className="card" style={{ background: '#F8FAFC' }}>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', lineHeight: 1.55 }}>
              <strong style={{ color: '#0F172A' }}>Tip.</strong> Uploads stay as <em>drafts</em> until you hit
              <strong> Publish</strong> from the preview screen. Students only see published items.
            </p>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

/* ----------------------------- small helpers ----------------------------- */

const ActionGroup: React.FC<{
  title: string; tint: string; iconColor: string; children: React.ReactNode;
}> = ({ title, tint, iconColor, children }) => (
  <div
    style={{
      borderRadius: 'var(--radius-md)', padding: '1rem',
      border: '1px solid #E2E8F0', background: tint,
      display: 'flex', flexDirection: 'column', gap: '0.75rem',
    }}
  >
    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: iconColor, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
      {title}
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {children}
    </div>
  </div>
);

const ActionTile: React.FC<{
  icon: React.ReactNode; title: string; desc: string;
  onClick: () => void; primary?: boolean; badge?: string;
  tone?: 'blue' | 'green';
}> = ({ icon, title, desc, onClick, primary, badge, tone = 'blue' }) => {
  const accent = tone === 'green' ? '#16A34A' : 'var(--primary)';
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
        background: 'white', border: '1px solid #E2E8F0',
        borderRadius: 'var(--radius-md)', padding: '0.9rem 1rem',
        cursor: 'pointer', textAlign: 'left',
        boxShadow: primary ? `0 0 0 1.5px ${accent}` : undefined,
      }}
    >
      <div
        style={{
          width: 36, height: 36, borderRadius: 'var(--radius-md)',
          background: tone === 'green' ? '#DCFCE7' : '#EFF6FF',
          color: accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0F172A' }}>{title}</span>
          {badge && (
            <span
              className="status-pill"
              style={{ background: tone === 'green' ? '#DCFCE7' : '#EFF6FF', color: accent }}
            >
              {badge}
            </span>
          )}
        </div>
        <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '0.2rem', lineHeight: 1.5 }}>
          {desc}
        </div>
      </div>
      <ChevronRight size={16} color="#94A3B8" style={{ marginTop: '0.4rem' }} />
    </button>
  );
};
