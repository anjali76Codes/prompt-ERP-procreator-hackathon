import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, BarChart2, Globe } from 'lucide-react';
import { Logo } from '../components/ui/Logo';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Checkbox } from '../components/ui/Checkbox';
import { Card } from '../components/ui/Card';
import { useAuth } from '../lib/auth/AuthContext';
import { ApiError } from '../lib/api';
import { toast } from 'react-toastify';

interface LocationState { from?: string }

export const SignIn: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.name || user.email.split('@')[0]} 👋`);
      const state = (location.state as LocationState | null) ?? null;
      const fallback =
        user.role === 'admin' ? '/admin' :
        user.status !== 'active' ? '/pending-approval' :
        '/dashboard';
      navigate(state?.from ?? fallback, { replace: true });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Sign-in failed';
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-wrapper animate-fade-in">
      <header className="page-header"><Logo /></header>

      <main className="page-content">
        <div className="split-left delay-100">
          <h1 className="hero-text">
            Campus workflow, <br />
            <span className="text-primary">simplified.</span>
          </h1>
          <p style={{ fontSize: '1.125rem', color: 'var(--text-muted)', marginBottom: '3rem', maxWidth: '400px', lineHeight: '1.6' }}>
            Manage student records, faculty resources, and academics with precision through our unified ERP suite.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '440px' }}>
            <Card icon={<BarChart2 size={20} />} title="Real-time Analytics" description="Live data feeds and reporting" />
            <Card icon={<Globe size={20} />} iconColor="green" title="Global Infrastructure" description="99.9% Uptime & Global Sync" />
          </div>
        </div>

        <div className="split-right delay-200">
          <div className="auth-form-container">
            <h2>Sign In</h2>
            <p>Enter your credentials to access your dashboard.</p>

            <form onSubmit={handleSubmit}>
              <Input
                label="Institutional Email"
                placeholder="name@university.edu"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Input
                label="Password"
                rightLabel={<a href="#" style={{ fontSize: '0.875rem' }}>Forgot Password?</a>}
                placeholder="••••••••"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                iconRight={showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                onIconRightClick={() => setShowPassword(!showPassword)}
                required
              />

              <Checkbox label="Remember this device" />

              {error && (
                <div className="status-pill danger" style={{ marginBottom: '1rem', textTransform: 'none' }}>
                  {error}
                </div>
              )}

              <Button type="submit" disabled={submitting} style={{ marginBottom: '2rem' }}>
                {submitting ? 'Signing in…' : 'Sign In'}
              </Button>

              <p style={{ textAlign: 'center', marginTop: '2.5rem', marginBottom: 0 }}>
                Don't have an account? <Link to="/signup">Create an account</Link>
              </p>
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
