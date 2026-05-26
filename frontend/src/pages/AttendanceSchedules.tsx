import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, Plus, Save, Trash2, X } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { useAttendance } from '../lib/AttendanceContext';
import {
  fetchSchedules, createSchedule, deleteSchedule,
  fetchMySubjects, type CreateSchedulePayload,
} from '../lib/erp/api';
import type { Schedule, Subject } from '../lib/erp/types';
import { ApiError } from '../lib/api';

const WEEKDAYS: Array<{ value: 1|2|3|4|5|6|7; label: string }> = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' },
];

const inputStyle: React.CSSProperties = {
  border: '1px solid #E2E8F0', borderRadius: '0.5rem',
  padding: '0.55rem 0.85rem', fontSize: '0.9rem', outline: 'none',
  background: 'white', fontFamily: 'inherit', width: '100%',
};
const labelStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '0.35rem',
  fontSize: '0.72rem', fontWeight: 700, color: '#475569',
  textTransform: 'uppercase', letterSpacing: '0.4px',
};

const pickName = (v: unknown, fallback = '—'): string => {
  if (!v || typeof v === 'string') return fallback;
  const o = v as { code?: string; name?: string };
  return o.code ? `${o.code}${o.name ? ' · ' + o.name : ''}` : (o.name ?? fallback);
};

export const AttendanceSchedules: React.FC = () => {
  const navigate = useNavigate();
  const { divisions } = useAttendance();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, subs] = await Promise.all([
        fetchSchedules({ mine: true }),
        fetchMySubjects(),
      ]);
      setSchedules(list);
      setSubjects(subs);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load schedules');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const onDelete = async (id: string) => {
    if (!confirm('Remove this timetable slot? Existing lectures stay; future ones will not auto-materialise.')) return;
    try { await deleteSchedule(id); await refresh(); }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Delete failed'); }
  };

  const grouped = useMemo(() => {
    const byDay = new Map<number, Schedule[]>();
    for (const s of schedules) {
      const wd = s.weekday;
      if (!byDay.has(wd)) byDay.set(wd, []);
      byDay.get(wd)!.push(s);
    }
    for (const arr of byDay.values()) arr.sort((a, b) => a.startTime.localeCompare(b.startTime));
    return byDay;
  }, [schedules]);

  return (
    <AppLayout
      background="#F8FAFC"
      pageIcon={<CalendarClock size={18} />}
      pageTitle="My Timetable"
      pageBreadcrumb={
        <>
          <button onClick={() => navigate('/attendance')}>Attendance</button>
          <span> · </span>
          <span className="current">Schedules</span>
        </>
      }
      pageActions={
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <Plus size={14} /> Add Slot
        </button>
      }
    >
      {error && <div className="status-pill danger" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div className="card">
        <div className="card-header">
          <h3>{schedules.length} recurring slots</h3>
          <span className="status-pill muted">Mon–Sun timetable</span>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>Loading…</div>
        ) : schedules.length === 0 ? (
          <div style={{ padding: '3rem 2rem', textAlign: 'center', color: '#64748B' }}>
            <p style={{ margin: 0 }}>No recurring slots yet.</p>
            <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setModalOpen(true)}>
              <Plus size={14} /> Add your first slot
            </button>
          </div>
        ) : (
          <div className="stack-md">
            {WEEKDAYS.map(({ value, label }) => {
              const items = grouped.get(value) ?? [];
              if (items.length === 0) return null;
              return (
                <div key={value}>
                  <div className="section-eyebrow" style={{ marginBottom: '0.5rem' }}>{label}</div>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Subject</th>
                        <th>Division</th>
                        <th>Room</th>
                        <th className="right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(s => (
                        <tr key={s._id}>
                          <td className="num">{s.startTime} – {s.endTime}</td>
                          <td className="strong">{pickName(s.subject)}</td>
                          <td className="num">{pickName(s.division)}</td>
                          <td className="num">{s.room}</td>
                          <td className="right">
                            <button
                              className="btn btn-secondary btn-icon-only btn-sm"
                              onClick={() => void onDelete(s._id)}
                              title="Remove slot"
                              aria-label="Remove slot"
                            >
                              <Trash2 size={12} color="#EF4444" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AddScheduleModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => { setModalOpen(false); void refresh(); }}
        divisions={divisions}
        subjects={subjects}
      />
    </AppLayout>
  );
};

/* ---- Inline modal — kept here since it's only used on this page ---- */

interface ModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  divisions: { _id: string; code: string }[];
  subjects: Subject[];
}

const AddScheduleModal: React.FC<ModalProps> = ({ open, onClose, onCreated, divisions, subjects }) => {
  const [form, setForm] = useState<CreateSchedulePayload>(() => ({
    division: '', subject: '', weekday: 1, startTime: '09:00', endTime: '10:00', room: '',
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (open) setError(null); }, [open]);

  if (!open) return null;

  const update = <K extends keyof CreateSchedulePayload>(k: K, v: CreateSchedulePayload[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await createSchedule(form);
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add slot');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(2px)', zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem',
      }}
    >
      <form
        onClick={e => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="card"
        style={{ maxWidth: 520, width: '100%', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}
      >
        <div className="card-header" style={{ marginBottom: 0 }}>
          <h3>Add Timetable Slot</h3>
          <button type="button" className="btn btn-secondary btn-icon-only btn-sm" onClick={onClose} aria-label="Close">
            <X size={14} />
          </button>
        </div>

        <label style={labelStyle}>
          Division
          <select required style={inputStyle} value={form.division} onChange={e => update('division', e.target.value)}>
            <option value="">Select division…</option>
            {divisions.map(d => <option key={d._id} value={d._id}>{d.code}</option>)}
          </select>
        </label>

        <label style={labelStyle}>
          Subject
          <select required style={inputStyle} value={form.subject} onChange={e => update('subject', e.target.value)}>
            <option value="">Select subject…</option>
            {subjects.map(s => <option key={s._id} value={s._id}>{s.code} · {s.name}</option>)}
          </select>
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
          <label style={labelStyle}>
            Day
            <select
              required style={inputStyle} value={form.weekday}
              onChange={e => update('weekday', Number(e.target.value) as 1|2|3|4|5|6|7)}
            >
              {WEEKDAYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </label>
          <label style={labelStyle}>
            Start
            <input required type="time" style={inputStyle} value={form.startTime} onChange={e => update('startTime', e.target.value)} />
          </label>
          <label style={labelStyle}>
            End
            <input required type="time" style={inputStyle} value={form.endTime} onChange={e => update('endTime', e.target.value)} />
          </label>
        </div>

        <label style={labelStyle}>
          Room
          <input required type="text" style={inputStyle} value={form.room} onChange={e => update('room', e.target.value)} placeholder="Lab 402" />
        </label>

        {error && <div className="status-pill danger" style={{ textTransform: 'none' }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <Save size={14} /> {saving ? 'Saving…' : 'Add Slot'}
          </button>
        </div>
      </form>
    </div>
  );
};
