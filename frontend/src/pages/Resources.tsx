import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList, BookOpen, Search, Plus, ChevronRight, ArrowRight,
  FileText, FileCheck2, BarChart3, FolderOpen, Clock,
  Terminal, Database, Network, Slash, Brain, CheckCircle2, PencilLine,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { useResources, type Resource } from '../lib/resources/ResourcesContext';
import type { Subject } from '../lib/erp/types';

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const subjectIcon = (s: Subject): React.ReactNode => {
  const text = `${s.code} ${s.name}`.toLowerCase();
  if (/(operating|os|system)/.test(text)) return <Terminal size={18} />;
  if (/(database|dbms|sql)/.test(text)) return <Database size={18} />;
  if (/(network|tcp|protocol)/.test(text)) return <Network size={18} />;
  if (/(theory|computation|automata|formal)/.test(text)) return <Slash size={18} />;
  if (/(machine|learning|ai|neural|deep)/.test(text)) return <Brain size={18} />;
  return <BookOpen size={18} />;
};

const subjectTag = (s: Subject): string => {
  if (s.credits >= 4) return 'Core Engineering';
  if (s.credits === 3) return 'Theory';
  if (s.credits === 2) return 'Elective';
  return 'Advanced';
};

const relTime = (iso: string): string => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
};

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

export const Resources: React.FC = () => {
  const navigate = useNavigate();
  const {
    divisions, subjects, loading, error,
    divisionId, subjectId, selectDivision, selectSubject, items,
  } = useResources();

  const [subjectQuery, setSubjectQuery] = useState('');

  // Subjects filtered to selected division's year + branch.
  const scopedSubjects = useMemo(() => {
    if (!divisionId) return [] as Subject[];
    const div = divisions.find(d => d._id === divisionId);
    if (!div) return subjects;
    const branchId = typeof div.branch === 'string' ? div.branch : div.branch._id;
    return subjects.filter(s => {
      const sb = typeof s.branch === 'string' ? s.branch : s.branch._id;
      return s.year === div.year && sb === branchId;
    });
  }, [divisions, subjects, divisionId]);

  const filteredSubjects = useMemo(() => {
    const q = subjectQuery.trim().toLowerCase();
    if (!q) return scopedSubjects;
    return scopedSubjects.filter(s =>
      s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    );
  }, [scopedSubjects, subjectQuery]);

  const selectedDivision = divisions.find(d => d._id === divisionId) ?? null;
  const selectedSubject  = subjects.find(s => s._id === subjectId) ?? null;
  const ready = !!divisionId && !!subjectId;

  const currentItems = useMemo(
    () => items.filter(i => {
      const divId = typeof i.division === 'string' ? i.division : i.division._id;
      const subId = typeof i.subject  === 'string' ? i.subject  : i.subject._id;
      return divId === divisionId && subId === subjectId;
    }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [items, divisionId, subjectId]
  );

  const goUpload = (kind: 'assignment' | 'notes') => () => {
    if (!ready) return;
    navigate(`/assignments/upload/${kind}`);
  };
  const goList = (kind: 'assignment' | 'notes') => () => {
    if (!ready) return;
    navigate(kind === 'assignment' ? '/assignments/list' : '/assignments/notes');
  };

  return (
    <AppLayout
      background="#F8FAFC"
      pageIcon={<ClipboardList size={18} />}
      pageTitle="Assignments & Notes"
      pageBreadcrumb={
        <>
          <span style={{ textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 700 }}>Courses</span>
          <ChevronRight size={11} />
          <span className="current" style={{ textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 700 }}>
            Assignments & Notes
          </span>
        </>
      }
      pageActions={
        <button
          className="btn btn-primary"
          onClick={goUpload('assignment')}
          disabled={!ready}
          title={ready ? 'Start a new upload' : 'Pick a division and subject first'}
        >
          <Plus size={14} /> New Upload
        </button>
      }
    >
      <div style={{ position: 'relative', paddingBottom: '2rem' }}>
        {/* Heading */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
            Academic Resource Center
          </h1>
          <p style={{ margin: '0.4rem 0 0', color: '#64748B', fontSize: '0.92rem' }}>
            Manage your course deliveries, divisional assignments, and study materials.
          </p>
        </div>

        {error && <div className="status-pill danger" style={{ marginBottom: '1rem' }}>{error}</div>}

        {/* ------------------ Row 1 — Division + Subject selectors --------------- */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(320px, 1fr) minmax(520px, 1.8fr)',
            gap: '1.5rem',
            marginBottom: '1.5rem',
          }}
        >
          <DivisionSelector
            divisions={divisions}
            loading={loading.divisions}
            selectedId={divisionId}
            onSelect={selectDivision}
          />

          <SubjectSelector
            subjects={filteredSubjects}
            totalSubjects={scopedSubjects.length}
            divisionPicked={!!divisionId}
            loading={loading.subjects}
            selectedId={subjectId}
            query={subjectQuery}
            onQueryChange={setSubjectQuery}
            onSelect={selectSubject}
          />
        </div>

        {/* ------------------ Row 2 — Action cards ------------------------------- */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '1.5rem', marginBottom: '1.75rem' }}>
          <ActionCard
            tone="blue"
            decorIcon={<FileCheck2 size={96} />}
            title="Manage Assignments"
            description={ready && selectedDivision && selectedSubject
              ? `Create new assignments, set deadlines, and evaluate student submissions for ${selectedDivision.code} ${selectedSubject.code}.`
              : 'Pick a division and subject above to manage its assignments.'}
            primary={{
              label: 'Create & Upload New Assignment',
              icon: <PencilLine size={14} />,
              onClick: goUpload('assignment'),
              disabled: !ready,
            }}
            secondary={[
              { label: 'Review Pending', icon: <FileCheck2 size={13} />, onClick: goList('assignment'), disabled: !ready },
              { label: 'Grade Reports',  icon: <BarChart3 size={13} />, onClick: goList('assignment'), disabled: !ready },
            ]}
          />

          <ActionCard
            tone="lavender"
            decorIcon={<BookOpen size={96} />}
            title="Course Notes"
            description={ready && selectedDivision && selectedSubject
              ? `Distribute lecture slides, reading materials, and supplementary PDFs for ${selectedSubject.name}.`
              : 'Pick a division and subject above to publish study material.'}
            primary={{
              label: 'Upload New Study Materials',
              icon: <FileText size={14} />,
              onClick: goUpload('notes'),
              disabled: !ready,
              variant: 'soft',
            }}
            secondary={[
              { label: 'Resource Library', icon: <FolderOpen size={13} />, onClick: goList('notes'), disabled: !ready },
              { label: 'Past Semesters',   icon: <Clock size={13} />,     onClick: () => { /* placeholder */ }, disabled: true },
            ]}
          />
        </div>

        {/* ------------------ Recent activity ------------------------------------ */}
        <RecentActivity
          divisionLabel={selectedDivision?.code ?? null}
          subjectLabel={selectedSubject?.code ?? null}
          items={currentItems}
        />

      </div>
    </AppLayout>
  );
};

/* -------------------------------------------------------------------------- */
/*  Division selector                                                          */
/* -------------------------------------------------------------------------- */

interface DivisionSelectorProps {
  divisions: ReturnType<typeof useResources>['divisions'];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

const DivisionSelector: React.FC<DivisionSelectorProps> = ({
  divisions, loading, selectedId, onSelect,
}) => (
  <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: 380 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
      <div>
        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748B', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
          Academic Division
        </div>
        <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
          Select Division
        </h2>
      </div>
      <button
        onClick={() => onSelect(null)}
        className="alert-row-cta"
        style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.55px' }}
      >
        SELECT DIVISION
      </button>
    </div>

    {loading ? (
      <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748B', fontSize: '0.85rem' }}>
        Loading divisions…
      </div>
    ) : divisions.length === 0 ? (
      <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748B', fontSize: '0.85rem' }}>
        No divisions assigned to you yet.
      </div>
    ) : (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
        {divisions.map(d => {
          const branch = typeof d.branch === 'string' ? '' : d.branch.name;
          const active = d._id === selectedId;
          return (
            <button
              key={d._id}
              onClick={() => onSelect(d._id)}
              style={{
                textAlign: 'left', cursor: 'pointer',
                padding: '0.85rem 0.95rem',
                borderRadius: 'var(--radius-md)',
                border: `1.5px solid ${active ? 'var(--primary)' : '#E2E8F0'}`,
                background: active ? '#EFF6FF' : 'white',
                display: 'flex', flexDirection: 'column', gap: '0.25rem',
                transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>
                {d.code}
              </span>
              <span
                style={{
                  fontSize: '0.65rem', fontWeight: 700, color: '#64748B',
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                }}
              >
                {branch || d.name}
              </span>
            </button>
          );
        })}
      </div>
    )}
  </div>
);

/* -------------------------------------------------------------------------- */
/*  Subject selector                                                           */
/* -------------------------------------------------------------------------- */

interface SubjectSelectorProps {
  subjects: Subject[];
  totalSubjects: number;
  divisionPicked: boolean;
  loading: boolean;
  selectedId: string | null;
  query: string;
  onQueryChange: (q: string) => void;
  onSelect: (id: string | null) => void;
}

const SubjectSelector: React.FC<SubjectSelectorProps> = ({
  subjects, totalSubjects, divisionPicked, loading, selectedId, query, onQueryChange, onSelect,
}) => (
  <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: 380 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748B', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
          Subject Selection
        </div>
        <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
          Pick a Subject
        </h2>
      </div>
      <button
        onClick={() => onSelect(null)}
        className="alert-row-cta"
        style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.55px' }}
      >
        SELECT SUBJECT
      </button>
    </div>

    <div
      style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '0.75rem 1rem', border: '1px solid #E2E8F0',
        borderRadius: 'var(--radius-md)', background: '#F8FAFC',
      }}
    >
      <Search size={16} color="#94A3B8" />
      <input
        value={query}
        onChange={e => onQueryChange(e.target.value)}
        placeholder="Filter subjects..."
        disabled={!divisionPicked}
        style={{
          flex: 1, border: 'none', outline: 'none', background: 'transparent',
          fontSize: '0.92rem', fontFamily: 'inherit', color: '#0F172A', minWidth: 0,
        }}
      />
    </div>

    {!divisionPicked ? (
      <div
        style={{
          padding: '2rem 1rem', textAlign: 'center', color: '#64748B', fontSize: '0.85rem',
          border: '1.5px dashed #CBD5E1', borderRadius: 'var(--radius-md)', background: '#F8FAFC',
        }}
      >
        Pick a division on the left to see its subjects.
      </div>
    ) : loading ? (
      <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748B', fontSize: '0.85rem' }}>
        Loading subjects…
      </div>
    ) : totalSubjects === 0 ? (
      <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748B', fontSize: '0.85rem' }}>
        No subjects mapped to this division yet.
      </div>
    ) : (
      <div
        style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem',
        }}
      >
        {subjects.map(s => {
          const active = s._id === selectedId;
          return (
            <button
              key={s._id}
              onClick={() => onSelect(s._id)}
              style={{
                textAlign: 'left', cursor: 'pointer',
                padding: '0.8rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                border: `1.5px solid ${active ? 'var(--primary)' : '#E2E8F0'}`,
                background: active ? '#EFF6FF' : 'white',
                display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
                transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              <span
                style={{
                  width: 28, height: 28, borderRadius: '0.4rem',
                  background: active ? '#DBEAFE' : '#F1F5F9',
                  color: active ? 'var(--primary)' : '#475569',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {subjectIcon(s)}
              </span>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '0.82rem', fontWeight: 800,
                    color: active ? 'var(--primary)' : '#0F172A',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                >
                  {s.name}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#64748B', marginTop: '0.15rem' }}>
                  Sem {s.year} · {subjectTag(s)}
                </div>
              </div>
            </button>
          );
        })}

        {/* Request subject placeholder tile */}
        <button
          type="button"
          onClick={() => { /* no-op for now */ }}
          style={{
            textAlign: 'center', cursor: 'pointer',
            padding: '0.8rem', borderRadius: 'var(--radius-md)',
            border: '1.5px dashed #CBD5E1', background: '#F8FAFC',
            color: '#64748B', fontSize: '0.78rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          title="Request a new subject from your department admin"
        >
          + Request Subject
        </button>
      </div>
    )}
  </div>
);

/* -------------------------------------------------------------------------- */
/*  Action card                                                                */
/* -------------------------------------------------------------------------- */

interface ActionButtonSpec {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'solid' | 'soft';
}

interface ActionCardProps {
  tone: 'blue' | 'lavender';
  decorIcon: React.ReactNode;
  title: string;
  description: string;
  primary: ActionButtonSpec;
  secondary: ActionButtonSpec[];
}

const ActionCard: React.FC<ActionCardProps> = ({
  tone, decorIcon, title, description, primary, secondary,
}) => {
  const accent = tone === 'lavender' ? '#6366F1' : 'var(--primary)';
  const iconBg = tone === 'lavender' ? '#EEF2FF' : '#DBEAFE';
  const softBg = tone === 'lavender' ? '#EEF2FF' : '#DBEAFE';
  const softText = tone === 'lavender' ? '#4F46E5' : 'var(--primary)';

  return (
    <div
      className="card"
      style={{ padding: '1.75rem', position: 'relative', overflow: 'hidden', minHeight: 280, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
    >
      {/* Decorative faded icon */}
      <div
        aria-hidden
        style={{
          position: 'absolute', right: -8, top: 10,
          color: '#E2E8F0', opacity: 0.55, pointerEvents: 'none',
        }}
      >
        {decorIcon}
      </div>

      {/* Icon */}
      <div
        style={{
          width: 46, height: 46, borderRadius: 'var(--radius-md)',
          background: iconBg, color: accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '1.5rem',
        }}
      >
        {tone === 'lavender' ? <FileText size={20} /> : <ClipboardList size={20} />}
      </div>

      <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>{title}</h3>
      <p style={{ margin: '0.5rem 0 1.25rem', color: '#475569', fontSize: '0.86rem', lineHeight: 1.55 }}>
        {description}
      </p>

      <button
        onClick={primary.onClick}
        disabled={primary.disabled}
        style={{
          width: '100%', padding: '0.7rem 1rem',
          borderRadius: 'var(--radius-md)', border: 'none',
          background: primary.variant === 'soft' ? softBg : accent,
          color: primary.variant === 'soft' ? softText : 'white',
          fontWeight: 700, fontSize: '0.86rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
          cursor: primary.disabled ? 'not-allowed' : 'pointer',
          opacity: primary.disabled ? 0.6 : 1,
          transition: 'opacity 0.15s',
        }}
      >
        {primary.icon} {primary.label}
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.65rem' }}>
        {secondary.map(btn => (
          <button
            key={btn.label}
            onClick={btn.onClick}
            disabled={btn.disabled}
            style={{
              padding: '0.55rem 0.75rem',
              border: '1px solid #E2E8F0', background: 'white',
              borderRadius: 'var(--radius-md)',
              color: '#334155', fontSize: '0.78rem', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
              cursor: btn.disabled ? 'not-allowed' : 'pointer',
              opacity: btn.disabled ? 0.55 : 1,
            }}
          >
            {btn.icon} {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Recent activity                                                            */
/* -------------------------------------------------------------------------- */

interface RecentActivityProps {
  divisionLabel: string | null;
  subjectLabel: string | null;
  items: Resource[];
}

const activityIcon = (item: Resource): { bg: string; color: string; node: React.ReactNode } => {
  if (item.status === 'published') {
    return { bg: '#DCFCE7', color: '#16A34A', node: <CheckCircle2 size={16} /> };
  }
  return { bg: '#FEF3C7', color: '#B45309', node: <PencilLine size={16} /> };
};

const statusPill = (status: Resource['status']) => {
  if (status === 'published') return { label: 'PUBLISHED', cls: 'success' as const };
  return { label: 'DRAFT', cls: 'warning' as const };
};

const RecentActivity: React.FC<RecentActivityProps> = ({ divisionLabel, items }) => {
  const navigate = useNavigate();
  // Pick the list page that matches the kind of the freshest item. If the
  // most recent activity is a notes upload, "Full history" should land
  // on the notes list; otherwise default to assignments.
  const fullHistoryPath =
    items[0]?.kind === 'notes' ? '/assignments/notes' : '/assignments/list';
  return (
  <div className="card" style={{ padding: '1.5rem' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem' }}>
      <div>
        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748B', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
          Recent Activity
        </div>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>
          {divisionLabel ? `Recent Activity in ${divisionLabel}` : 'Recent Activity'}
        </h3>
      </div>
      <button
        onClick={() => navigate(fullHistoryPath)}
        className="alert-row-cta"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}
      >
        View Full History <ArrowRight size={12} />
      </button>
    </div>

    {items.length === 0 ? (
      <div
        className="card"
        style={{ padding: '1.5rem', textAlign: 'center', color: '#64748B', fontSize: '0.85rem' }}
      >
        {divisionLabel
          ? 'Nothing here yet — upload an assignment or notes above to get started.'
          : 'Pick a division and subject to see its activity.'}
      </div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {items.slice(0, 5).map(item => {
          const ico = activityIcon(item);
          const pill = statusPill(item.status);
          return (
            <div
              key={item._id}
              className="card"
              style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.85rem 1rem' }}
            >
              <div
                style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: ico.bg, color: ico.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}
              >
                {ico.node}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A' }}>
                  {item.status === 'published'
                    ? `Published: ${item.title}`
                    : `Draft: ${item.title}`}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.15rem' }}>
                  {item.kind === 'assignment' ? 'Assignment' : 'Notes'}
                  {' · '}
                  Updated {relTime(item.updatedAt)}
                </div>
              </div>
              <span
                className={`status-pill ${pill.cls}`}
                style={{ fontSize: '0.62rem', letterSpacing: '0.6px' }}
              >
                {pill.label}
              </span>
            </div>
          );
        })}
      </div>
    )}
  </div>
  );
};

