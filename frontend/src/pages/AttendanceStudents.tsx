import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCheck, Search, ChevronRight, ShieldCheck, ShieldAlert } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { useAttendance } from '../lib/AttendanceContext';
import {
  fetchDivisionStats, fetchDivisionStudents, fetchDivisionEligibility,
} from '../lib/erp/api';
import type {
  DivisionStatRow, EligibilityRow, StudentLite,
} from '../lib/erp/types';
import { ApiError } from '../lib/api';

const pctClass = (pct: number) =>
  pct >= 80 ? 'success' : pct >= 65 ? 'info' : 'danger';

export const AttendanceStudents: React.FC = () => {
  const navigate = useNavigate();
  const { divisions, divisionId, selectDivision } = useAttendance();

  const [stats, setStats] = useState<DivisionStatRow[]>([]);
  const [students, setStudents] = useState<StudentLite[]>([]);
  const [eligibility, setEligibility] = useState<EligibilityRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

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

  const visible = useMemo(() => {
    if (!query.trim()) return merged;
    const q = query.trim().toLowerCase();
    return merged.filter(r =>
      r.student.name.toLowerCase().includes(q)
      || (r.student.rollNumber ?? '').toLowerCase().includes(q)
      || r.student.email.toLowerCase().includes(q)
    );
  }, [merged, query]);

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', border: '1px solid #E2E8F0', borderRadius: '0.5rem', padding: '0.35rem 0.75rem' }}>
          <Search size={14} color="#64748B" />
          <input
            type="text"
            placeholder="Search name, roll, or email…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ border: 'none', outline: 'none', fontSize: '0.85rem', minWidth: 220 }}
          />
        </div>
      }
    >
      {error && <div className="status-pill danger" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div className="card">
        <div className="card-header">
          <h3>{visible.length} students</h3>
          <span className="status-pill muted">
            Click a row for subject breakdown
          </span>
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
                      <td className="right">
                        <ChevronRight
                          size={16}
                          color="#94A3B8"
                          style={{ transform: expanded === student._id ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}
                        />
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
    </AppLayout>
  );
};
