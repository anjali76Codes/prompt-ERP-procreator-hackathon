import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserCheck, Search, ChevronRight, ShieldCheck, ShieldAlert, X, FileDown, Bell,
} from 'lucide-react';
import { SendNotificationModal, type NotificationRecipient } from '../components/notifications/SendNotificationModal';
import { AppLayout } from '../components/layout/AppLayout';
import { useAttendance } from '../lib/AttendanceContext';
import {
  fetchDivisionStats, fetchDivisionStudents, fetchDivisionEligibility,
  downloadDivisionReportPdf,
} from '../lib/erp/api';
import type {
  DivisionStatRow, EligibilityRow, StudentLite,
} from '../lib/erp/types';
import { ApiError } from '../lib/api';

const pctClass = (pct: number) =>
  pct >= 80 ? 'success' : pct >= 65 ? 'info' : 'danger';

type Bucket = 'all' | 'gte75' | '60to75' | 'below60' | 'noData';
type Eligibility = 'all' | 'eligible' | 'ineligible';
type SortKey = 'pctAsc' | 'pctDesc' | 'nameAsc' | 'rollAsc';

const BUCKET_LABEL: Record<Bucket, string> = {
  all: 'All',
  gte75: '≥75%',
  '60to75': '60–75%',
  below60: 'Below 60%',
  noData: 'No data',
};
const ELIG_LABEL: Record<Eligibility, string> = {
  all: 'All', eligible: 'Eligible', ineligible: 'Ineligible',
};
const SORT_LABEL: Record<SortKey, string> = {
  pctAsc: 'Attendance ↑',
  pctDesc: 'Attendance ↓',
  nameAsc: 'Name A–Z',
  rollAsc: 'Roll #',
};

const filterControlStyle: React.CSSProperties = {
  background: 'white', border: '1px solid #E2E8F0', borderRadius: '0.5rem',
  padding: '0.35rem 0.6rem', fontSize: '0.8rem', fontWeight: 600,
  color: '#334155', outline: 'none', cursor: 'pointer',
};

export const AttendanceStudents: React.FC = () => {
  const navigate = useNavigate();
  const { divisions, divisionId, selectDivision } = useAttendance();

  const [stats, setStats] = useState<DivisionStatRow[]>([]);
  const [students, setStudents] = useState<StudentLite[]>([]);
  const [eligibility, setEligibility] = useState<EligibilityRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [notifyTarget, setNotifyTarget] = useState<NotificationRecipient | null>(null);

  // Filter state
  const [query, setQuery] = useState('');
  const [bucket, setBucket] = useState<Bucket>('all');
  const [elig, setElig] = useState<Eligibility>('all');
  const [subjectId, setSubjectId] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('pctAsc');
  const [expanded, setExpanded] = useState<string | null>(null);

  const resetFilters = () => {
    setQuery(''); setBucket('all'); setElig('all'); setSubjectId('all'); setSortKey('pctAsc');
  };
  const activeFilterCount =
    (query.trim() ? 1 : 0) + (bucket !== 'all' ? 1 : 0) + (elig !== 'all' ? 1 : 0)
    + (subjectId !== 'all' ? 1 : 0);

  useEffect(() => {
    if (!divisionId) { setStats([]); setStudents([]); setEligibility([]); return; }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetchDivisionStats(divisionId),
      fetchDivisionStudents(divisionId),
      fetchDivisionEligibility(divisionId),
    ])
      .then(([s, st, el]) => {
        if (!cancelled) { setStats(s); setStudents(st); setEligibility(el); }
      })
      .catch(e => { if (!cancelled) setError(e instanceof ApiError ? e.message : 'Failed to load students'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [divisionId]);

  const eligibilityById = useMemo(() => {
    const m = new Map<string, EligibilityRow>();
    for (const e of eligibility) m.set(e.studentId, e);
    return m;
  }, [eligibility]);

  /** Combine roster + stats so even students with zero attendance records show up. */
  const merged = useMemo(() => {
    const byId = new Map<string, DivisionStatRow>();
    for (const s of stats) byId.set(s.studentId, s);
    return students.map((student) => {
      const stat = byId.get(student._id);
      const elig = eligibilityById.get(student._id);
      return {
        student,
        total: stat?.total ?? 0,
        present: stat?.present ?? 0,
        pct: stat?.pct ?? 0,
        eligible: elig?.overallEligible ?? (stat ? stat.pct >= 75 : true),
        subjectBreakdown: elig?.subjects ?? [],
      };
    }).sort((a, b) => a.pct - b.pct);
  }, [stats, students, eligibilityById]);

  /** Subject options derived from any student's breakdown (drives the Subject filter). */
  const subjectOptions = useMemo(() => {
    const map = new Map<string, { id: string; code: string; name: string }>();
    for (const e of eligibility) {
      for (const s of e.subjects) {
        if (!map.has(s.subjectId)) map.set(s.subjectId, { id: s.subjectId, code: s.code, name: s.name });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [eligibility]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = merged;

    if (q) {
      rows = rows.filter(r =>
        r.student.name.toLowerCase().includes(q)
        || (r.student.rollNumber ?? '').toLowerCase().includes(q)
        || r.student.email.toLowerCase().includes(q)
      );
    }

    if (bucket !== 'all') {
      rows = rows.filter(r => {
        if (bucket === 'noData') return r.total === 0;
        if (r.total === 0) return false;
        if (bucket === 'gte75')   return r.pct >= 75;
        if (bucket === '60to75')  return r.pct >= 60 && r.pct < 75;
        if (bucket === 'below60') return r.pct < 60;
        return true;
      });
    }

    if (elig !== 'all') {
      rows = rows.filter(r => {
        if (r.total === 0) return false;
        return elig === 'eligible' ? r.eligible : !r.eligible;
      });
    }

    if (subjectId !== 'all') {
      rows = rows.filter(r => r.subjectBreakdown.some(s => s.subjectId === subjectId && !s.eligible));
    }

    const sorted = [...rows];
    sorted.sort((a, b) => {
      switch (sortKey) {
        case 'pctAsc':  return a.pct - b.pct;
        case 'pctDesc': return b.pct - a.pct;
        case 'nameAsc': return a.student.name.localeCompare(b.student.name);
        case 'rollAsc': return (a.student.rollNumber ?? '').localeCompare(b.student.rollNumber ?? '');
      }
    });
    return sorted;
  }, [merged, query, bucket, elig, subjectId, sortKey]);

  const toggleExpand = (studentId: string) => {
    setExpanded(prev => prev === studentId ? null : studentId);
  };

  return (
    <AppLayout
      background="#F8FAFC"
      pageIcon={<UserCheck size={18} />}
      pageTitle="Student Attendance"
      pageBreadcrumb={
        <>
          <button onClick={() => navigate('/attendance')}>Attendance</button>
          <span> · </span>
          <select
            value={divisionId ?? ''}
            onChange={e => selectDivision(e.target.value || null)}
            style={{ fontSize: '0.75rem', border: '1px solid #E2E8F0', padding: '0.2rem 0.4rem', borderRadius: 4 }}
          >
            {divisions.map(d => <option key={d._id} value={d._id}>{d.code}</option>)}
          </select>
        </>
      }
      pageActions={
        <>
          <span className="status-pill info" style={{ fontSize: '0.625rem' }}>
            {visible.length} / {merged.length} students
            {activeFilterCount > 0 && ` · ${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''}`}
          </span>
          <button
            className="btn btn-secondary btn-sm"
            disabled={!divisionId || exporting || visible.length === 0}
            onClick={async () => {
              if (!divisionId) return;
              const code = divisions.find(d => d._id === divisionId)?.code ?? 'division';
              const ids = visible.map(v => v.student._id);
              const isFiltered = activeFilterCount > 0 && ids.length !== merged.length;
              setExporting(true);
              try { await downloadDivisionReportPdf(divisionId, code, isFiltered ? ids : undefined); }
              catch (e) { setError(e instanceof ApiError ? e.message : 'PDF download failed'); }
              finally { setExporting(false); }
            }}
          >
            <FileDown size={14} /> {exporting ? 'Exporting…' : `Export PDF${activeFilterCount > 0 ? ` (${visible.length})` : ''}`}
          </button>
        </>
      }
    >
      {error && <div className="status-pill danger" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div className="card">
        <div className="card-header" style={{ marginBottom: '0.85rem' }}>
          <h3>{visible.length} students</h3>
          <span className="status-pill muted">Click a row for subject breakdown</span>
        </div>

        {/* Filter row */}
        <div
          style={{
            display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem',
            padding: '0.75rem', background: '#F8FAFC', border: '1px solid #E2E8F0',
            borderRadius: '0.5rem', marginBottom: '1rem',
          }}
        >
          <div style={{ ...filterControlStyle, display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'text', padding: '0.35rem 0.6rem' }}>
            <Search size={14} color="#64748B" />
            <input
              type="text"
              placeholder="Search name, roll, email…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{ border: 'none', outline: 'none', fontSize: '0.8rem', minWidth: 200, background: 'transparent' }}
            />
          </div>

          <select value={bucket} onChange={e => setBucket(e.target.value as Bucket)} style={filterControlStyle} aria-label="Attendance bucket">
            {(Object.keys(BUCKET_LABEL) as Bucket[]).map(b => (
              <option key={b} value={b}>Attendance: {BUCKET_LABEL[b]}</option>
            ))}
          </select>

          <select value={elig} onChange={e => setElig(e.target.value as Eligibility)} style={filterControlStyle} aria-label="Eligibility">
            {(Object.keys(ELIG_LABEL) as Eligibility[]).map(k => (
              <option key={k} value={k}>Eligibility: {ELIG_LABEL[k]}</option>
            ))}
          </select>

          <select value={subjectId} onChange={e => setSubjectId(e.target.value)} style={filterControlStyle} aria-label="Subject">
            <option value="all">Subject: All</option>
            {subjectOptions.map(s => (
              <option key={s.id} value={s.id}>Ineligible in: {s.code}</option>
            ))}
          </select>

          <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)} style={filterControlStyle} aria-label="Sort">
            {(Object.keys(SORT_LABEL) as SortKey[]).map(k => (
              <option key={k} value={k}>Sort: {SORT_LABEL[k]}</option>
            ))}
          </select>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={resetFilters}
              className="btn btn-secondary btn-sm"
              style={{ marginLeft: 'auto' }}
            >
              <X size={12} /> Clear
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>Loading…</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Roll #</th>
                  <th>Attendance %</th>
                  <th>P / Total</th>
                  <th>Exam Eligibility</th>
                  <th className="right">Details</th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>
                    No students found.
                  </td></tr>
                )}
                {visible.map(({ student, total, present, pct, eligible, subjectBreakdown }) => (
                  <React.Fragment key={student._id}>
                    <tr
                      onClick={() => toggleExpand(student._id)}
                      style={{ cursor: 'pointer' }}
                      data-automation-row="true"
                      data-row-student-id={student._id}
                      data-row-name={student.name}
                      data-row-roll={student.rollNumber ?? ''}
                      data-row-email={student.email}
                      data-row-pct={total === 0 ? '' : Math.round(pct).toString()}
                      data-row-eligible={total === 0 ? 'unknown' : eligible ? 'true' : 'false'}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', backgroundColor: '#F1F5F9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.775rem' }}>
                            {student.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span className="strong">{student.name}</span>
                            <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>{student.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="num">{student.rollNumber ?? '—'}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: 160 }}>
                          <span className={`status-pill ${pctClass(pct)}`}>{total === 0 ? 'N/A' : `${Math.round(pct)}%`}</span>
                          <div style={{ flex: 1, height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', backgroundColor: pct >= 80 ? '#10B981' : pct >= 65 ? 'var(--primary)' : '#EF4444', borderRadius: 3 }} />
                          </div>
                        </div>
                      </td>
                      <td className="num">{present} / {total}</td>
                      <td>
                        {total === 0 ? (
                          <span className="status-pill muted">No data</span>
                        ) : eligible ? (
                          <span className="status-pill success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <ShieldCheck size={12} /> Eligible
                          </span>
                        ) : (
                          <span className="status-pill danger" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <ShieldAlert size={12} /> Ineligible
                          </span>
                        )}
                      </td>
                      <td className="right" onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <button
                            className="btn btn-secondary btn-icon-only btn-sm"
                            onClick={() => setNotifyTarget({
                              _id: student._id,
                              name: student.name,
                              rollNumber: student.rollNumber,
                              email: student.email,
                              pct,
                            })}
                            title="Send notification"
                            data-automation-id="row-send-notification"
                          >
                            <Bell size={12} color="var(--primary)" />
                          </button>
                          <button
                            className="btn btn-secondary btn-icon-only btn-sm"
                            onClick={() => toggleExpand(student._id)}
                            title="Toggle details"
                          >
                            <ChevronRight
                              size={12}
                              color="#94A3B8"
                              style={{ transform: expanded === student._id ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expanded === student._id && (
                      <tr>
                        <td colSpan={6} style={{ background: '#F8FAFC', padding: '1rem 1.25rem' }}>
                          {subjectBreakdown.length > 0 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
                              {subjectBreakdown.map(row => (
                                <div key={row.subjectId} className="card card-compact" style={{ padding: '0.85rem' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0F172A' }}>
                                      {row.code}
                                    </div>
                                    <span className={`status-pill ${row.eligible ? 'success' : 'danger'}`}>
                                      {row.eligible ? 'Eligible' : 'Ineligible'}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '0.15rem' }}>{row.name}</div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>
                                    <span>{Math.round(row.pct)}% (need {row.threshold}%)</span>
                                    <span>{row.present} / {row.total}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: '#64748B' }}>No attendance records yet for this student.</span>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SendNotificationModal
        open={!!notifyTarget}
        recipient={notifyTarget}
        onClose={() => setNotifyTarget(null)}
      />
    </AppLayout>
  );
};
