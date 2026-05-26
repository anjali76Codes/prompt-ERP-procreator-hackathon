import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList, BookOpen, Search, Plus, ChevronRight, ArrowRight,
  FileText, FileCheck2, BarChart3, FolderOpen, Clock,
  Terminal, Database, Network, Slash, Brain, CheckCircle2, PencilLine,
  Building2, MessageSquare
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { useResources, type Resource } from '../lib/resources/ResourcesContext';
import type { Subject } from '../lib/erp/types';

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const subjectIcon = (iconType: string): React.ReactNode => {
  if (iconType === 'os') return <Terminal size={18} />;
  if (iconType === 'dbms') return <Database size={18} />;
  if (iconType === 'network') return <Network size={18} />;
  if (iconType === 'toc') return <Slash size={18} />;
  if (iconType === 'ml') return <Brain size={18} />;
  return <BookOpen size={18} />;
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

  // 1. Division display list mapped to real TE divisions +IT-B fallback
  const divisionList = useMemo(() => {
    return [
      {
        id: divisions.find(d => d.code === 'TE-A')?._id || 'te-a-mock-id',
        code: 'CS-A',
        name: 'COMPUTER SCIENCE',
        realCode: 'TE-A',
      },
      {
        id: divisions.find(d => d.code === 'TE-B')?._id || 'te-b-mock-id',
        code: 'CS-B',
        name: 'COMPUTER SCIENCE',
        realCode: 'TE-B',
      },
      {
        id: divisions.find(d => d.code === 'TE-C')?._id || 'te-c-mock-id',
        code: 'IT-A',
        name: 'INFORMATION TECH',
        realCode: 'TE-C',
      },
      {
        id: 'te-d-mock-id',
        code: 'IT-B',
        name: 'INFORMATION TECH',
        realCode: 'TE-D',
      },
    ];
  }, [divisions]);

  // Subjects filtered to selected division's year + branch
  const scopedSubjects = useMemo(() => {
    if (!divisionId) return [] as Subject[];
    const selectedListDiv = divisionList.find(d => d.id === divisionId);
    const div = divisions.find(d => d._id === divisionId) || divisions.find(d => d.code === selectedListDiv?.realCode);
    if (!div) return subjects;
    const branchId = typeof div.branch === 'string' ? div.branch : div.branch._id;
    return subjects.filter(s => {
      const sb = typeof s.branch === 'string' ? s.branch : s.branch._id;
      return s.year === div.year && sb === branchId;
    });
  }, [divisions, subjects, divisionId, divisionList]);

  // 2. Subject list mapped to specific names and visual representations
  const subjectList = useMemo(() => {
    return [
      {
        id: scopedSubjects.find(s => s.code === 'CS-302')?._id || 'mock-os-id',
        code: 'CS-302',
        name: 'Operating Systems',
        tag: 'Sem V · Core Engineering',
        iconType: 'os',
      },
      {
        id: scopedSubjects.find(s => s.code === 'CS-303')?._id || 'mock-dbms-id',
        code: 'CS-303',
        name: 'DBMS Architecture',
        tag: 'Sem V · Core Engineering',
        iconType: 'dbms',
      },
      {
        id: scopedSubjects.find(s => s.code === 'CS-301')?._id || 'mock-network-id',
        code: 'CS-301',
        name: 'Comp. Networks',
        tag: 'Sem V · Elective',
        iconType: 'network',
      },
      {
        id: 'mock-toc-id',
        code: 'CS-305',
        name: 'Theory of Comp.',
        tag: 'Sem V · Theory',
        iconType: 'toc',
      },
      {
        id: scopedSubjects.find(s => s.code === 'CS-304')?._id || 'mock-ml-id',
        code: 'CS-304',
        name: 'Machine Learning',
        tag: 'Sem V · Advanced',
        iconType: 'ml',
      },
    ];
  }, [scopedSubjects]);

  const filteredSubjects = useMemo(() => {
    const q = subjectQuery.trim().toLowerCase();
    if (!q) return subjectList;
    return subjectList.filter(s =>
      s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
    );
  }, [subjectList, subjectQuery]);

  // Set default selection to CS-B and DBMS Architecture to match the screenshot
  useEffect(() => {
    if (!divisionId && divisions.length > 0) {
      const targetDiv = divisions.find(d => d.code === 'TE-B') || divisions[0];
      if (targetDiv) selectDivision(targetDiv._id);
    }
  }, [divisions, divisionId, selectDivision]);

  useEffect(() => {
    if (divisionId && !subjectId && scopedSubjects.length > 0) {
      const targetSub = scopedSubjects.find(s => s.code === 'CS-303') || scopedSubjects[0];
      if (targetSub) selectSubject(targetSub._id);
    }
  }, [scopedSubjects, divisionId, subjectId, selectSubject]);

  const selectedDivision = divisionList.find(d => d.id === divisionId) ?? null;
  const selectedSubject  = subjectList.find(s => s.id === subjectId) ?? null;
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

  const displayDivCode = selectedDivision ? selectedDivision.code : 'CS-B';
  const displaySubCode = selectedSubject ? (selectedSubject.name === 'DBMS Architecture' ? 'DBMS' : selectedSubject.name) : 'DBMS';

  // Recent Activities
  const recentActivities = useMemo(() => {
    if (currentItems.length > 0) {
      return currentItems.map(item => ({
        _id: item._id,
        title: item.status === 'published' ? `Published: ${item.title}` : `Draft: ${item.title}`,
        subtitle: `${selectedSubject?.name || 'DBMS Architecture'} • ${item.status === 'published' ? 'Uploaded by You' : 'Saved as draft'} • ${relTime(item.updatedAt)}`,
        status: item.status,
      }));
    }
    return [
      {
        _id: 'mock-act-1',
        title: 'Published: Module 3 Notes (Normalization)',
        subtitle: 'DBMS Architecture • Uploaded by You • 2 hours ago',
        status: 'published' as const,
      },
      {
        _id: 'mock-act-2',
        title: 'New Submission: SQL Lab Assignment (34/40 students)',
        subtitle: 'DBMS Architecture • Action Required: Review • 5 hours ago',
        status: 'pending' as const,
      },
      {
        _id: 'mock-act-3',
        title: 'Draft: Final Project Guidelines',
        subtitle: 'Saved as draft • Last edited yesterday at 4:30 PM',
        status: 'draft' as const,
      }
    ];
  }, [currentItems, selectedSubject]);

  return (
    <AppLayout background="#F8FAFC">
      <div style={{ position: 'relative', paddingBottom: '1rem', minHeight: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.6px' }}>
          <span style={{ color: '#64748B' }}>COURSES</span>
          <span style={{ color: '#94A3B8', fontWeight: 400 }}>&gt;</span>
          <span style={{ color: '#0047FF' }}>ASSIGNMENTS & NOTES</span>
        </div>

        {/* Heading */}
        <div style={{ marginBottom: '1.75rem' }}>
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
            gridTemplateColumns: 'minmax(280px, 1fr) minmax(420px, 1.8fr)',
            gap: '1.25rem',
            marginBottom: '1.5rem',
          }}
        >
          {/* Division Selector */}
          <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div
                style={{
                  width: 40, height: 40, borderRadius: 'var(--radius-md)',
                  background: '#EEF2FF', color: '#4F46E5',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Building2 size={18} />
              </div>
              <button
                onClick={() => selectDivision(null)}
                style={{
                  fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.6px',
                  background: 'none', border: 'none', color: '#0047FF', cursor: 'pointer'
                }}
              >
                SELECT DIVISION
              </button>
            </div>

            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>
              Academic Division
            </h2>

            {loading.divisions ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748B', fontSize: '0.85rem' }}>
                Loading divisions…
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                {divisionList.map(d => {
                  const active = d.id === divisionId;
                  return (
                    <button
                      key={d.id}
                      onClick={() => selectDivision(d.id)}
                      style={{
                        textAlign: 'left', cursor: 'pointer',
                        padding: '0.85rem 0.95rem',
                        borderRadius: 'var(--radius-md)',
                        border: `1.5px solid ${active ? '#0047FF' : '#E2E8F0'}`,
                        background: active ? '#EFF6FF' : 'white',
                        display: 'flex', flexDirection: 'column', gap: '0.25rem',
                        transition: 'border-color 0.15s, background 0.15s',
                      }}
                    >
                      <span style={{ fontSize: '0.95rem', fontWeight: 800, color: active ? '#0047FF' : '#0F172A' }}>
                        {d.code}
                      </span>
                      <span
                        style={{
                          fontSize: '0.65rem', fontWeight: 700, color: '#64748B',
                          textTransform: 'uppercase', letterSpacing: '0.5px',
                        }}
                      >
                        {d.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Subject Selector */}
          <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: 40, height: 40, borderRadius: 'var(--radius-md)',
                  background: '#FFE4E6', color: '#E11D48',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}
              >
                <BookOpen size={18} />
              </div>

              <div
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.4rem 0.6rem', border: '1px solid #E2E8F0',
                  borderRadius: 'var(--radius-md)', background: 'white',
                }}
              >
                <Search size={13} color="#94A3B8" />
                <input
                  value={subjectQuery}
                  onChange={e => setSubjectQuery(e.target.value)}
                  placeholder="Filter subjects..."
                  disabled={!divisionId}
                  style={{
                    flex: 1, border: 'none', outline: 'none', background: 'transparent',
                    fontSize: '0.8rem', fontFamily: 'inherit',
                  }}
                />
              </div>

              <button
                onClick={() => selectSubject(null)}
                style={{
                  fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.6px',
                  background: 'none', border: 'none', color: '#0047FF', cursor: 'pointer'
                }}
              >
                SELECT SUBJECT
              </button>
            </div>

            {!divisionId ? (
              <div
                style={{
                  padding: '2.5rem 1rem', textAlign: 'center', color: '#64748B', fontSize: '0.85rem',
                  border: '1.5px dashed #CBD5E1', borderRadius: 'var(--radius-md)', background: '#F8FAFC',
                }}
              >
                Pick a division on the left to see its subjects.
              </div>
            ) : loading.subjects ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748B', fontSize: '0.85rem' }}>
                Loading subjects…
              </div>
            ) : (
              <div
                style={{
                  display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem',
                }}
              >
                {filteredSubjects.map(s => {
                  const active = s.id === subjectId;
                  return (
                    <button
                      key={s.id}
                      onClick={() => selectSubject(s.id)}
                      style={{
                        textAlign: 'left', cursor: 'pointer',
                        padding: '0.8rem 0.85rem',
                        borderRadius: 'var(--radius-md)',
                        border: `1.5px solid ${active ? '#0047FF' : '#E2E8F0'}`,
                        background: active ? '#EFF6FF' : 'white',
                        display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
                        transition: 'border-color 0.15s, background 0.15s',
                      }}
                    >
                      <span
                        style={{
                          width: 28, height: 28, borderRadius: '0.4rem',
                          background: active ? '#DBEAFE' : '#F1F5F9',
                          color: active ? '#0047FF' : '#475569',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {subjectIcon(s.iconType)}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '0.82rem', fontWeight: 800,
                            color: active ? '#0047FF' : '#0F172A',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}
                        >
                          {s.name}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#64748B', marginTop: '0.15rem' }}>
                          {s.tag}
                        </div>
                      </div>
                    </button>
                  );
                })}

                {/* Request subject placeholder tile */}
                <button
                  type="button"
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
        </div>

        {/* ------------------ Row 2 — Action cards ------------------------------- */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '2rem' }}>
          {/* Manage Assignments Card */}
          <div
            className="card"
            style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden', minHeight: 250, display: 'flex', flexDirection: 'column' }}
          >
            {/* Faded Background Icon */}
            <div
              aria-hidden
              style={{
                position: 'absolute', right: -10, top: '0.75rem',
                color: '#F1F5F9', pointerEvents: 'none',
              }}
            >
              <FileCheck2 size={92} />
            </div>

            <div
              style={{
                width: 44, height: 44, borderRadius: 'var(--radius-md)',
                background: '#0047FF', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '1.25rem', zIndex: 1,
              }}
            >
              <ClipboardList size={20} />
            </div>

            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', zIndex: 1 }}>
              Manage Assignments
            </h3>
            <p style={{ margin: '0.5rem 0 1.25rem', color: '#475569', fontSize: '0.85rem', lineHeight: 1.55, zIndex: 1, flex: 1 }}>
              Create new assignments, set deadlines, and evaluate student submissions for {displayDivCode} {displaySubCode}.
            </p>

            <button
              onClick={goUpload('assignment')}
              disabled={!ready}
              style={{
                width: '100%', padding: '0.7rem 1.5rem',
                borderRadius: 'var(--radius-md)', border: 'none',
                background: '#0047FF', color: 'white',
                fontWeight: 700, fontSize: '0.86rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                cursor: ready ? 'pointer' : 'not-allowed',
                opacity: ready ? 1 : 0.6,
                transition: 'opacity 0.15s',
                zIndex: 1,
              }}
            >
              <PencilLine size={14} /> Create & Upload New Assignment
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.65rem', zIndex: 1 }}>
              <button
                onClick={goList('assignment')}
                disabled={!ready}
                style={{
                  padding: '0.55rem 0.75rem',
                  border: '1px solid #E2E8F0', background: 'white',
                  borderRadius: 'var(--radius-md)',
                  color: '#334155', fontSize: '0.78rem', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                  cursor: ready ? 'pointer' : 'not-allowed',
                  opacity: ready ? 1 : 0.55,
                }}
              >
                <FileCheck2 size={13} /> Review Pending
              </button>
              <button
                onClick={goList('assignment')}
                disabled={!ready}
                style={{
                  padding: '0.55rem 0.75rem',
                  border: '1px solid #E2E8F0', background: 'white',
                  borderRadius: 'var(--radius-md)',
                  color: '#334155', fontSize: '0.78rem', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                  cursor: ready ? 'pointer' : 'not-allowed',
                  opacity: ready ? 1 : 0.55,
                }}
              >
                <BarChart3 size={13} /> Grade Reports
              </button>
            </div>
          </div>

          {/* Course Notes Card */}
          <div
            className="card"
            style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden', minHeight: 250, display: 'flex', flexDirection: 'column' }}
          >
            {/* Faded Background Icon */}
            <div
              aria-hidden
              style={{
                position: 'absolute', right: -10, top: '0.75rem',
                color: '#F1F5F9', pointerEvents: 'none',
              }}
            >
              <BookOpen size={92} />
            </div>

            <div
              style={{
                width: 44, height: 44, borderRadius: 'var(--radius-md)',
                background: '#0047FF', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '1.25rem', zIndex: 1,
              }}
            >
              <FileText size={20} />
            </div>

            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', zIndex: 1 }}>
              Course Notes
            </h3>
            <p style={{ margin: '0.5rem 0 1.25rem', color: '#475569', fontSize: '0.85rem', lineHeight: 1.55, zIndex: 1, flex: 1 }}>
              Distribute lecture slides, reading materials, and supplementary PDFs for academic reference.
            </p>

            <button
              onClick={goUpload('notes')}
              disabled={!ready}
              style={{
                width: '100%', padding: '0.7rem 1.5rem',
                borderRadius: 'var(--radius-md)', border: 'none',
                background: '#EEF2FF', color: '#0047FF',
                fontWeight: 700, fontSize: '0.86rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                cursor: ready ? 'pointer' : 'not-allowed',
                opacity: ready ? 1 : 0.6,
                transition: 'opacity 0.15s',
                zIndex: 1,
              }}
            >
              <FileText size={14} /> Upload New Study Materials
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.65rem', zIndex: 1 }}>
              <button
                onClick={goList('notes')}
                disabled={!ready}
                style={{
                  padding: '0.55rem 0.75rem',
                  border: '1px solid #E2E8F0', background: 'white',
                  borderRadius: 'var(--radius-md)',
                  color: '#334155', fontSize: '0.78rem', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                  cursor: ready ? 'pointer' : 'not-allowed',
                  opacity: ready ? 1 : 0.55,
                }}
              >
                <FolderOpen size={13} /> Resource Library
              </button>
              <button
                disabled={true}
                style={{
                  padding: '0.55rem 0.75rem',
                  border: '1px solid #E2E8F0', background: 'white',
                  borderRadius: 'var(--radius-md)',
                  color: '#334155', fontSize: '0.78rem', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                  cursor: 'not-allowed', opacity: 0.55,
                }}
              >
                <Clock size={13} /> Past Semesters
              </button>
            </div>
          </div>
        </div>

        {/* ------------------ Recent activity ------------------------------------ */}
        <div style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
              Recent Activity in {displayDivCode}
            </h3>
            <button
              onClick={() => navigate('/assignments/list')}
              style={{
                background: 'none', border: 'none', color: '#0047FF', cursor: 'pointer',
                fontSize: '0.8rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.3rem'
              }}
            >
              View Full History <ArrowRight size={12} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {recentActivities.slice(0, 3).map(act => {
              // Decide icon / colors based on status
              let bg = '#F1F5F9';
              let color = '#475569';
              let icon = <PencilLine size={16} />;
              let statusLabel = 'DRAFT';
              let statusCls = 'muted';

              if (act.status === 'published') {
                bg = '#DCFCE7';
                color = '#16A34A';
                icon = <CheckCircle2 size={16} />;
                statusLabel = 'PUBLISHED';
                statusCls = 'success';
              } else if (act.status === 'pending') {
                bg = '#FEF3C7';
                color = '#B45309';
                icon = <MessageSquare size={16} />;
                statusLabel = 'PENDING';
                statusCls = 'warning';
              }

              return (
                <div
                  key={act._id}
                  className="card"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.85rem 1rem' }}
                >
                  <div
                    style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: bg, color: color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}
                  >
                    {icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A' }}>
                      {act.title}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.15rem' }}>
                      {act.subtitle}
                    </div>
                  </div>
                  <span
                    className={`status-pill ${statusCls}`}
                    style={{ fontSize: '0.62rem', letterSpacing: '0.6px' }}
                  >
                    {statusLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* FAB */}
        <button
          onClick={goUpload('assignment')}
          disabled={!ready}
          aria-label="Quick upload"
          title={ready ? 'Quick upload' : 'Pick a division and subject first'}
          style={{
            position: 'fixed', right: '2rem', bottom: '2rem',
            width: 52, height: 52, borderRadius: '50%',
            background: ready ? '#0047FF' : '#94A3B8',
            color: 'white', border: 'none', cursor: ready ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 16px rgba(15, 23, 42, 0.15)',
            zIndex: 30,
          }}
        >
          <Plus size={22} />
        </button>

        {/* Footer */}
        <footer style={{
          marginTop: 'auto',
          padding: '2.5rem 0 1.5rem 0',
          borderTop: '1px solid #E2E8F0',
          width: '100%',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.5fr repeat(3, 1fr)',
            gap: '2.5rem',
            marginBottom: '2rem',
          }}>
            {/* Col 1 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0047FF', letterSpacing: '-0.3px' }}>
                Prompt ERP
              </span>
              <p style={{ fontSize: '0.82rem', color: '#64748B', lineHeight: 1.5, margin: 0, maxWidth: '280px' }}>
                An integrated institutional workflow management system designed for systematic academic excellence.
              </p>
            </div>

            {/* Col 2 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                Resources
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <a href="#" style={{ fontSize: '0.82rem', color: '#64748B', textDecoration: 'none' }}>Faculty Handbook</a>
                <a href="#" style={{ fontSize: '0.82rem', color: '#64748B', textDecoration: 'none' }}>Grading Policy</a>
                <a href="#" style={{ fontSize: '0.82rem', color: '#64748B', textDecoration: 'none' }}>Admin Support</a>
              </div>
            </div>

            {/* Col 3 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                Direct Actions
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <a href="#" style={{ fontSize: '0.82rem', color: '#64748B', textDecoration: 'none' }}>Attendance Registry</a>
                <a href="#" style={{ fontSize: '0.82rem', color: '#64748B', textDecoration: 'none' }}>Exam Portal</a>
                <a href="#" style={{ fontSize: '0.82rem', color: '#64748B', textDecoration: 'none' }}>Result Analytics</a>
              </div>
            </div>

            {/* Col 4 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                Institutional
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <a href="#" style={{ fontSize: '0.82rem', color: '#64748B', textDecoration: 'none' }}>Department News</a>
                <a href="#" style={{ fontSize: '0.82rem', color: '#64748B', textDecoration: 'none' }}>Staff Directory</a>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '1.25rem',
            borderTop: '1px solid #E2E8F0',
            fontSize: '0.75rem',
            color: '#94A3B8',
          }}>
            <span>© 2024 Prompt ERP Systems. All intellectual property secured.</span>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <a href="#" style={{ color: '#94A3B8', textDecoration: 'none' }}>Privacy Policy</a>
              <a href="#" style={{ color: '#94A3B8', textDecoration: 'none' }}>Terms of Service</a>
            </div>
          </div>
        </footer>
      </div>
    </AppLayout>
  );
};
