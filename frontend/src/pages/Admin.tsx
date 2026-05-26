import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, LogOut, ArrowLeft, RefreshCw } from 'lucide-react';
import { Logo } from '../components/ui/Logo';
import { Button } from '../components/ui/Button';
import { apiRequest, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth/AuthContext';
import type { TeacherUser } from '../lib/auth/types';

export const Admin: React.FC = () => {
  const [teachers, setTeachers] = useState<TeacherUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const { logout } = useAuth();
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<{ teachers: TeacherUser[] }>('/admin/teachers/pending');
      setTeachers(data.teachers);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load pending teachers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const act = async (id: string, action: 'approve' | 'reject') => {
    setBusy(b => ({ ...b, [id]: true }));
    try {
      await apiRequest(`/admin/teachers/${id}/${action}`, { method: 'POST' });
      setTeachers(prev => prev.filter(t => t._id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Action failed');
    } finally {
      setBusy(b => ({ ...b, [id]: false }));
    }
  };

  const handleLogout = () => { logout(); navigate('/signin'); };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8F9FA', display: 'flex', flexDirection: 'column' }}>
      <header style={{ height: 64, backgroundColor: 'white', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Logo />
          <div style={{ height: 20, width: 1, backgroundColor: 'var(--border-color)' }} />
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <ShieldCheck size={16} /> Admin Portal
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/dashboard" style={{ textDecoration: 'none' }}>
            <Button variant="outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.875rem', width: 'auto' }}>
              <ArrowLeft size={16} /> Dashboard
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={handleLogout}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.875rem', width: 'auto', borderColor: '#DC2626', color: '#DC2626' }}
          >
            <LogOut size={16} /> Logout
          </Button>
        </div>
      </header>

      <main style={{ flex: 1, padding: '2rem', maxWidth: 1100, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        <div style={{ marginBottom: '1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Administration &gt; <span style={{ color: 'var(--primary)', fontWeight: 500 }}>Verifications</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>Teacher Verifications</h1>
            <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0 0 0' }}>Review and approve new teacher registration requests.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => void load()}>
              <RefreshCw size={14} /> Refresh
            </button>
            <div className="status-pill info" style={{ fontSize: '0.75rem' }}>
              {teachers.length} Pending
            </div>
          </div>
        </div>

        {error && (
          <div className="status-pill danger" style={{ marginBottom: '1rem', textTransform: 'none' }}>
            {error}
          </div>
        )}

        <div style={{ backgroundColor: 'white', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ minWidth: 720 }}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Branch</th>
                  <th>Courses</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</td></tr>
                ) : teachers.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No pending teacher accounts.</td></tr>
                ) : (
                  teachers.map((t) => (
                    <tr key={t._id}>
                      <td className="strong">{t.name}</td>
                      <td className="num">{t.email}</td>
                      <td className="num">{t.branch}</td>
                      <td className="num">{(t.courses ?? []).join(', ') || '—'}</td>
                      <td className="right">
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-danger btn-sm"
                            disabled={!!busy[t._id]}
                            onClick={() => void act(t._id, 'reject')}
                          >Reject</button>
                          <button
                            className="btn btn-primary btn-sm"
                            disabled={!!busy[t._id]}
                            onClick={() => void act(t._id, 'approve')}
                          >Approve</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};
