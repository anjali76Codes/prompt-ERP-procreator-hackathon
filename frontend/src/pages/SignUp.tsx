import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Box, TrendingUp, ShieldCheck } from 'lucide-react';
import { Logo } from '../components/ui/Logo';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Checkbox } from '../components/ui/Checkbox';
import { Card } from '../components/ui/Card';
import { useAuth } from '../lib/auth/AuthContext';
import { ApiError } from '../lib/api';
import type { Year, RegisterPayload } from '../lib/auth/types';

const YEARS: Year[] = ['FE', 'SE', 'TE', 'BE'];

const fieldRow: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' };

const inputStyle: React.CSSProperties = {
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-md)',
  padding: '0.625rem 0.85rem',
  fontSize: '0.9rem',
  outline: 'none',
  width: '100%',
  marginBottom: '1.25rem',
  fontFamily: 'inherit',
};

const fieldLabel: React.CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 600,
  color: '#475569',
  marginBottom: '0.35rem',
  display: 'block',
};

export const SignUp: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Shared
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [branch, setBranch] = useState('');

  // Student
  const [year, setYear] = useState<Year>('FE');
  const [division, setDivision] = useState('');
  const [rollNumber, setRollNumber] = useState('');

  // Teacher
  const [department, setDepartment] = useState('');
  const [courses, setCourses] = useState('');
  const [assignedDivisions, setAssignedDivisions] = useState('');

  const navigate = useNavigate();
  const { register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload: RegisterPayload = role === 'student'
        ? { kind: 'student', name, email, password, branch, year, division, rollNumber: rollNumber || undefined }
        : {
            kind: 'teacher', name, email, password, branch,
            department: department || undefined,
            courses: courses.split(',').map(s => s.trim()).filter(Boolean),
            assignedDivisions: assignedDivisions.split(',').map(s => s.trim()).filter(Boolean),
          };

      const result = await register(payload);
      navigate(result.user.role === 'teacher' ? '/pending-approval' : '/dashboard', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        const details = err.details as Record<string, string[]> | undefined;
        const fieldMsgs = details
          ? Object.entries(details).map(([k, v]) => `${k}: ${v.join(', ')}`).join('  •  ')
          : '';
        setError(fieldMsgs ? `${err.message} — ${fieldMsgs}` : err.message);
      } else {
        setError('Registration failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-wrapper animate-fade-in">
      <header className="page-header"><Logo /></header>

      <main className="page-content">
        <div className="split-left delay-100">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#E0E7FF', color: 'var(--primary)', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.875rem', fontWeight: 600, marginBottom: '2rem' }}>
            <ShieldCheck size={16} /> Trusted by 500+ Institutions
          </div>

          <h1 className="hero-text" style={{ fontSize: '2.5rem' }}>
            Automate your entire campus workflow with precision.
          </h1>
          <p style={{ fontSize: '1.125rem', color: 'var(--text-muted)', marginBottom: '3rem', maxWidth: '450px', lineHeight: '1.6' }}>
            Prompt ERP provides the robust information environment your institution needs to scale administration without complexity.
          </p>

          <div style={{ display: 'flex', gap: '1rem', maxWidth: '600px' }}>
            <Card icon={<Box size={20} />} title="Resource Management" description="Track campus facilities and academic resources across departments." style={{ flex: 1 }} />
            <Card icon={<TrendingUp size={20} />} iconColor="green" title="Academic Analytics" description="Leverage data-driven insights to track student performance and optimize curriculum." style={{ flex: 1 }} />
          </div>
        </div>

        <div className="split-right delay-200">
          <div className="auth-form-container">
            <h2 style={{ fontSize: '1.5rem' }}>Create Account</h2>
            <p>Start your 14-day free trial. No credit card required.</p>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                {(['student', 'teacher'] as const).map(r => (
                  <label
                    key={r}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', flex: 1,
                      padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                      backgroundColor: role === r ? '#EFF6FF' : 'white',
                      borderColor: role === r ? 'var(--primary)' : 'var(--border-color)',
                    }}
                  >
                    <input type="radio" name="role" value={r} checked={role === r} onChange={() => setRole(r)} style={{ accentColor: 'var(--primary)' }} />
                    <span style={{ fontSize: '0.875rem', fontWeight: 500, textTransform: 'capitalize' }}>{r}</span>
                  </label>
                ))}
              </div>

              <Input label="Full Name" placeholder="Monica Hemsworth" value={name} onChange={e => setName(e.target.value)} required />
              <Input label="Institutional Email" placeholder="monica@university.edu" type="email" value={email} onChange={e => setEmail(e.target.value)} required />

              <Input
                label="Password"
                placeholder="••••••••"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                iconRight={showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                onIconRightClick={() => setShowPassword(!showPassword)}
                required
              />
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '-0.75rem', marginBottom: '1.25rem' }}>
                Min 8 characters, with uppercase, lowercase, and a digit.
              </div>

              {role === 'student' ? (
                <>
                  <div style={fieldRow}>
                    <div>
                      <label style={fieldLabel}>Branch</label>
                      <input style={inputStyle} value={branch} onChange={e => setBranch(e.target.value)} placeholder="Computer Engineering" required />
                    </div>
                    <div>
                      <label style={fieldLabel}>Year</label>
                      <select style={inputStyle} value={year} onChange={e => setYear(e.target.value as Year)}>
                        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>

                  <div style={fieldRow}>
                    <div>
                      <label style={fieldLabel}>Division</label>
                      <input style={inputStyle} value={division} onChange={e => setDivision(e.target.value)} placeholder="A" required />
                    </div>
                    <div>
                      <label style={fieldLabel}>Roll Number (optional)</label>
                      <input style={inputStyle} value={rollNumber} onChange={e => setRollNumber(e.target.value)} placeholder="2024-CS-089" />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div style={fieldRow}>
                    <div>
                      <label style={fieldLabel}>Branch</label>
                      <input style={inputStyle} value={branch} onChange={e => setBranch(e.target.value)} placeholder="Computer Science" required />
                    </div>
                    <div>
                      <label style={fieldLabel}>Department (optional)</label>
                      <input style={inputStyle} value={department} onChange={e => setDepartment(e.target.value)} placeholder="Dept. of CS" />
                    </div>
                  </div>
                  <div>
                    <label style={fieldLabel}>Courses (comma-separated)</label>
                    <input style={inputStyle} value={courses} onChange={e => setCourses(e.target.value)} placeholder="CS-101, AI Algorithms" />
                  </div>
                  <div>
                    <label style={fieldLabel}>Assigned Divisions (comma-separated)</label>
                    <input style={inputStyle} value={assignedDivisions} onChange={e => setAssignedDivisions(e.target.value)} placeholder="A, B" />
                  </div>
                </>
              )}

              <Checkbox label={<>I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.</>} />

              {error && (
                <div className="status-pill danger" style={{ marginBottom: '1rem', textTransform: 'none' }}>
                  {error}
                </div>
              )}

              <Button type="submit" disabled={submitting} style={{ marginBottom: '1.5rem' }}>
                {submitting ? 'Creating account…' : 'Get Started →'}
              </Button>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                <p style={{ margin: 0 }}>
                  Already have an account? <Link to="/signin">Sign in</Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </main>

      <footer className="footer delay-300">
        <div>© 2024 Prompt ERP Solutions. All rights reserved.</div>
        <div className="footer-links">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
          <a href="#">Security</a>
        </div>
      </footer>
    </div>
  );
};
