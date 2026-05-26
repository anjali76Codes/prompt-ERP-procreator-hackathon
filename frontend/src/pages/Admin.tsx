import React, { useState } from 'react';
import { Logo } from '../components/ui/Logo';
import { Button } from '../components/ui/Button';
import { Link } from 'react-router-dom';
import { ShieldCheck, LogOut, ArrowLeft } from 'lucide-react';

export const Admin: React.FC = () => {
  const [pendingTeachers, setPendingTeachers] = useState([
    { id: 1, name: 'John Doe', email: 'johndoe@university.edu', department: 'Computer Science' },
    { id: 2, name: 'Jane Smith', email: 'janesmith@university.edu', department: 'Mathematics' },
  ]);

  const handleAccept = (id: number) => {
    setPendingTeachers(pendingTeachers.filter(t => t.id !== id));
  };

  const handleReject = (id: number) => {
    setPendingTeachers(pendingTeachers.filter(t => t.id !== id));
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8F9FA', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navigation */}
      <header style={{ height: '64px', backgroundColor: 'white', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Logo />
          <div style={{ height: '20px', width: '1px', backgroundColor: 'var(--border-color)' }}></div>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <ShieldCheck size={16} /> Admin Portal
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/dashboard" style={{ textDecoration: 'none' }}>
            <Button variant="outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.875rem', width: 'auto' }}>
              <ArrowLeft size={16} /> Student Dashboard
            </Button>
          </Link>
          <Link to="/signin" style={{ textDecoration: 'none' }}>
            <Button variant="outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.875rem', width: 'auto', borderColor: '#DC2626', color: '#DC2626' }}>
              <LogOut size={16} /> Logout
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '2rem', maxWidth: '1100px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        <div style={{ marginBottom: '1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Administration &gt; <span style={{ color: 'var(--primary)', fontWeight: 500 }}>Verifications</span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>Teacher Verifications</h1>
            <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0 0 0' }}>Review and approve new teacher registration requests.</p>
          </div>
          <div style={{ backgroundColor: '#EFF6FF', color: 'var(--primary)', padding: '0.5rem 1rem', borderRadius: '1rem', fontSize: '0.875rem', fontWeight: 600 }}>
            {pendingTeachers.length} Pending Approval
          </div>
        </div>

        <div style={{ backgroundColor: 'white', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Name</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Email</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Department</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingTeachers.length > 0 ? (
                  pendingTeachers.map((teacher) => (
                    <tr key={teacher.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 500 }}>{teacher.name}</td>
                      <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>{teacher.email}</td>
                      <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>{teacher.department}</td>
                      <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <Button 
                            onClick={() => handleReject(teacher.id)} 
                            variant="outline" 
                            style={{ padding: '0.375rem 0.75rem', width: 'auto', borderColor: '#DC2626', color: '#DC2626', fontSize: '0.875rem' }}
                          >
                            Reject
                          </Button>
                          <Button 
                            onClick={() => handleAccept(teacher.id)} 
                            style={{ padding: '0.375rem 0.75rem', width: 'auto', backgroundColor: '#16A34A', fontSize: '0.875rem' }}
                          >
                            Accept
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} style={{ padding: '4rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      No pending teacher accounts to verify.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};
