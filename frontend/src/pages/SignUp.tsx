import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Box, TrendingUp, ShieldCheck } from 'lucide-react';
import { Logo } from '../components/ui/Logo';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Checkbox } from '../components/ui/Checkbox';
import { Card } from '../components/ui/Card';

export const SignUp: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('student');
  const navigate = useNavigate();

  return (
    <div className="page-wrapper animate-fade-in">
      <header className="page-header">
        <Logo />
      </header>

      <main className="page-content">
        <div className="split-left delay-100">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#E0E7FF', color: 'var(--primary)', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.875rem', fontWeight: 600, marginBottom: '2rem' }}>
            <ShieldCheck size={16} />
            Trusted by 500+ Institutions
          </div>
          
          <h1 className="hero-text" style={{ fontSize: '2.5rem' }}>
            Automate your entire campus workflow with precision.
          </h1>
          <p style={{ fontSize: '1.125rem', color: 'var(--text-muted)', marginBottom: '3rem', maxWidth: '450px', lineHeight: '1.6' }}>
            Prompt ERP provides the robust information environment your institution needs to scale administration without complexity.
          </p>

          <div style={{ display: 'flex', gap: '1rem', maxWidth: '600px' }}>
            <Card 
              icon={<Box size={20} />} 
              title="Resource Management"
              description="Track campus facilities and academic resources across departments."
              style={{ flex: 1 }}
            />
            <Card 
              icon={<TrendingUp size={20} />} 
              iconColor="green"
              title="Academic Analytics"
              description="Leverage data-driven insights to track student performance and optimize curriculum."
              style={{ flex: 1 }}
            />
          </div>
        </div>

        <div className="split-right delay-200">
          <div className="auth-form-container">
            <h2 style={{ fontSize: '1.5rem' }}>Create Account</h2>
            <p>Start your 14-day free trial. No credit card required.</p>

            <form onSubmit={(e) => {
              e.preventDefault();
              localStorage.setItem('role', role);
              navigate('/dashboard');
            }}>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', flex: 1, padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: role === 'student' ? '#EFF6FF' : 'white', borderColor: role === 'student' ? 'var(--primary)' : 'var(--border-color)' }}>
                  <input type="radio" name="role" value="student" checked={role === 'student'} onChange={() => setRole('student')} style={{ accentColor: 'var(--primary)' }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Student</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', flex: 1, padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: role === 'teacher' ? '#EFF6FF' : 'white', borderColor: role === 'teacher' ? 'var(--primary)' : 'var(--border-color)' }}>
                  <input type="radio" name="role" value="teacher" checked={role === 'teacher'} onChange={() => setRole('teacher')} style={{ accentColor: 'var(--primary)' }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Teacher</span>
                </label>
              </div>

              <Input 
                label="Full Name" 
                placeholder="Monica Hemsworth" 
                iconLeft={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                }
              />

              <Input 
                label="Institutional Email" 
                placeholder="monica@university.edu" 
                type="email" 
                iconLeft={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                }
              />
              
              <Input 
                label="Password" 
                placeholder="••••••••" 
                type={showPassword ? 'text' : 'password'}
                iconLeft={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                }
                iconRight={showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                onIconRightClick={() => setShowPassword(!showPassword)}
              />
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '-0.75rem', marginBottom: '1.5rem' }}>
                Must be at least 8 characters with one number.
              </div>

              <Checkbox 
                label={<>I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.</>}
              />

              <Button type="submit" style={{ marginBottom: '1.5rem' }}>
                Get Started &rarr;
              </Button>

              <div style={{ display: 'flex', alignItems: 'center', margin: '0 0 1.5rem 0' }}>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
                <span style={{ padding: '0 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Or continue with
                </span>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginBottom: '2.5rem' }}>
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

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center', flexDirection: 'column' }}>
                <p style={{ textAlign: 'center', margin: 0 }}>
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
