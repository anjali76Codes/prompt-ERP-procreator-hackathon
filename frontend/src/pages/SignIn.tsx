import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, BarChart2, Globe } from 'lucide-react';
import { Logo } from '../components/ui/Logo';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Checkbox } from '../components/ui/Checkbox';
import { Card } from '../components/ui/Card';
import { useRole } from '../lib/useRole';

export const SignIn: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { setRole } = useRole();

  return (
    <div className="page-wrapper animate-fade-in">
      <header className="page-header">
        <Logo />
      </header>

      <main className="page-content">
        <div className="split-left delay-100">
          <h1 className="hero-text">
            Campus workflow, <br/>
            <span className="text-primary">simplified.</span>
          </h1>
          <p style={{ fontSize: '1.125rem', color: 'var(--text-muted)', marginBottom: '3rem', maxWidth: '400px', lineHeight: '1.6' }}>
            Manage student records, faculty resources, and academics with precision through our unified ERP suite.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '440px' }}>
            <Card 
              icon={<BarChart2 size={20} />} 
              title="Real-time Analytics"
              description="Live data feeds and reporting"
            />
            <Card 
              icon={<Globe size={20} />} 
              iconColor="green"
              title="Global Infrastructure"
              description="99.9% Uptime & Global Sync"
            />
          </div>
        </div>

        <div className="split-right delay-200">
          <div className="auth-form-container">
            <h2>Sign In</h2>
            <p>Enter your credentials to access your dashboard.</p>

            <form onSubmit={(e) => {
              e.preventDefault();
              const emailInput = (e.currentTarget.elements[0] as HTMLInputElement)?.value || '';
              const lower = emailInput.toLowerCase();
              const isTeacher = lower.includes('prof') || lower.includes('teacher') || lower.includes('adrian');
              setRole(isTeacher ? 'teacher' : 'student');
              navigate('/dashboard');
            }}>
              <Input 
                label="Institutional Email" 
                placeholder="name@university.edu" 
                type="email" 
              />
              
              <Input 
                label="Password" 
                rightLabel={<a href="#" style={{ fontSize: '0.875rem' }}>Forgot Password?</a>}
                placeholder="••••••••" 
                type={showPassword ? 'text' : 'password'}
                iconRight={showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                onIconRightClick={() => setShowPassword(!showPassword)}
              />

              <Checkbox 
                label="Remember this device" 
              />

              <Button type="submit" style={{ marginBottom: '2rem' }}>
                Sign In
              </Button>

              <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0' }}>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
                <span style={{ padding: '0 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Or continue with
                </span>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <Button variant="outline" type="button" icon={
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                }>
                  Google
                </Button>
                <Button variant="outline" type="button" icon={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="9" y1="3" x2="9" y2="21"></line>
                  </svg>
                }>
                  SSO
                </Button>
              </div>

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
