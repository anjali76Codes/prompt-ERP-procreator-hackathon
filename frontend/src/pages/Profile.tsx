import React, { useState } from 'react';
import { User as UserIcon, Save } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { useAuth } from '../lib/auth/AuthContext';
import type { StudentUser, TeacherUser, Year } from '../lib/auth/types';
import { ApiError } from '../lib/api';

const YEARS: Year[] = ['FE', 'SE', 'TE', 'BE'];

interface FormState {
  name: string;
  branch: string;
  year: Year;
  division: string;
  rollNumber: string;
  department: string;
  courses: string[];
  assignedDivisions: string[];
}

const initialState = (user: StudentUser | TeacherUser | { role: 'admin' }): FormState => ({
  name: 'name' in user ? user.name : '',
  branch: 'branch' in user ? user.branch ?? '' : '',
  year: user.role === 'student' ? user.year : 'FE',
  division: user.role === 'student' ? user.division ?? '' : '',
  rollNumber: user.role === 'student' ? user.rollNumber ?? '' : '',
  department: user.role === 'teacher' ? user.department ?? '' : '',
  courses: user.role === 'teacher' ? user.courses ?? [] : [],
  assignedDivisions: user.role === 'teacher' ? user.assignedDivisions ?? [] : [],
});

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
      {label}
    </span>
    {children}
  </label>
);

const inputStyle: React.CSSProperties = {
  border: '1px solid #E2E8F0',
  borderRadius: '0.5rem',
  padding: '0.55rem 0.85rem',
  fontSize: '0.9rem',
  outline: 'none',
  background: 'white',
};

export const Profile: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [form, setForm] = useState<FormState>(() => initialState(user ?? { role: 'admin' }));

  if (!user || user.role === 'admin') return null;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSaving(true);
    try {
      if (user.role === 'student') {
        await updateProfile({
          name: form.name,
          branch: form.branch,
          year: form.year,
          division: form.division,
          rollNumber: form.rollNumber || undefined,
        } as Partial<StudentUser>);
      } else {
        await updateProfile({
          name: form.name,
          branch: form.branch,
          department: form.department || undefined,
          courses: form.courses,
          assignedDivisions: form.assignedDivisions,
        } as Partial<TeacherUser>);
      }
      setMessage({ kind: 'ok', text: 'Profile updated successfully.' });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Could not update profile';
      setMessage({ kind: 'err', text: msg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout pageIcon={<UserIcon size={18} />} pageTitle="My Profile" pageBreadcrumb="Account">
      <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div className="card-header" style={{ marginBottom: 0 }}>
          <h3>Edit profile</h3>
          <span className={`status-pill ${user.status === 'active' ? 'success' : user.status === 'pending' ? 'warning' : 'danger'}`}>
            {user.status}
          </span>
        </div>

        <Field label="Full name">
          <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} required />
        </Field>

        <Field label="Email">
          <input style={{ ...inputStyle, background: '#F8FAFC', color: '#64748B' }} value={user.email} disabled />
        </Field>

        {user.role === 'student' ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              <Field label="Branch">
                <input style={inputStyle} value={form.branch} onChange={e => set('branch', e.target.value)} required />
              </Field>
              <Field label="Year">
                <select style={inputStyle} value={form.year} onChange={e => set('year', e.target.value as Year)}>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </Field>
              <Field label="Division">
                <input style={inputStyle} value={form.division} onChange={e => set('division', e.target.value)} required />
              </Field>
            </div>
            <Field label="Roll number">
              <input style={inputStyle} value={form.rollNumber} onChange={e => set('rollNumber', e.target.value)} />
            </Field>
          </>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Field label="Branch">
                <input style={inputStyle} value={form.branch} onChange={e => set('branch', e.target.value)} required />
              </Field>
              <Field label="Department">
                <input style={inputStyle} value={form.department} onChange={e => set('department', e.target.value)} />
              </Field>
            </div>
            <Field label="Courses (comma-separated)">
              <input
                style={inputStyle}
                value={form.courses.join(', ')}
                onChange={e => set('courses', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
              />
            </Field>
            <Field label="Assigned divisions (comma-separated)">
              <input
                style={inputStyle}
                value={form.assignedDivisions.join(', ')}
                onChange={e => set('assignedDivisions', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
              />
            </Field>
          </>
        )}

        {message && (
          <div className={`status-pill ${message.kind === 'ok' ? 'success' : 'danger'}`} style={{ alignSelf: 'flex-start', textTransform: 'none' }}>
            {message.text}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            <Save size={14} /> {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </AppLayout>
  );
};
