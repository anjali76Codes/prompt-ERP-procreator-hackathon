import React from 'react';
import { Hourglass, LogOut } from 'lucide-react';
import { useAuth } from '../lib/auth/AuthContext';
import { useNavigate } from 'react-router-dom';

export const PendingApproval: React.FC = () => {
  const { user, logout, refresh } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/signin'); };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8F9FA', padding: '2rem' }}>
      <div className="card" style={{ maxWidth: 480, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '3rem 2rem' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#FFF7ED', color: '#F97316', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Hourglass size={28} />
        </div>
        <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>Awaiting Admin Approval</h1>
        <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: 1.55 }}>
          {user?.status === 'rejected'
            ? 'Your account was not approved. Please contact administration for next steps.'
            : 'Your teacher account is pending verification by an administrator. Full access unlocks once approved.'}
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={() => void refresh()}>Refresh status</button>
          <button className="btn btn-primary" onClick={handleLogout}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      </div>
    </div>
  );
};
