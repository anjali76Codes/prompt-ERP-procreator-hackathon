import React, { useEffect, useState } from 'react';
import { X, Save } from 'lucide-react';
import {
  createLecture, fetchMySubjects, type CreateLecturePayload,
} from '../../lib/erp/api';
import type { Division, Subject } from '../../lib/erp/types';
import { ApiError } from '../../lib/api';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (lectureId: string) => void;
  divisions: Division[];
  defaultDivisionId?: string | null;
}

const today = (): string => new Date().toISOString().slice(0, 10);

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

export const AddLectureModal: React.FC<Props> = ({
  open, onClose, onCreated, divisions, defaultDivisionId,
}) => {
  const [form, setForm] = useState<CreateLecturePayload>(() => ({
    division: defaultDivisionId ?? '',
    subject: '',
    date: today(),
    startTime: '09:00',
    endTime: '10:00',
    room: '',
  }));
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(f => ({ ...f, division: defaultDivisionId ?? f.division }));
    fetchMySubjects().then(setSubjects).catch(() => setSubjects([]));
  }, [open, defaultDivisionId]);

  if (!open) return null;

  const update = <K extends keyof CreateLecturePayload>(k: K, v: CreateLecturePayload[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const lecture = await createLecture(form);
      onCreated(lecture._id);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create lecture');
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
          <h3>Add Lecture</h3>
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
            Date
            <input required type="date" style={inputStyle} value={form.date} onChange={e => update('date', e.target.value)} />
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
            <Save size={14} /> {saving ? 'Saving…' : 'Create Lecture'}
          </button>
        </div>
      </form>
    </div>
  );
};
