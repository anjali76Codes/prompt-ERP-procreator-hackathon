import React from 'react';
import { Search, Bell, HelpCircle, Settings } from 'lucide-react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../lib/auth/AuthContext';
import type { AppUser } from '../../lib/auth/types';

const subtitleFor = (user: AppUser): string => {
  if (user.role === 'student') return `${user.branch ?? ''} • Year ${user.year ?? 'FE'} • Div ${user.division ?? '-'}`.trim();
  if (user.role === 'teacher') return `${user.branch ?? ''}${user.department ? ' • ' + user.department : ''}`.trim() || 'Faculty';
  return 'Administrator';
};

const avatarFor = (user: AppUser): string => {
  const safeName = encodeURIComponent(user.name || user.email);
  return `https://ui-avatars.com/api/?name=${safeName}&background=0D8ABC&color=fff`;
};

interface TopBarProps {
  /** Left-side identity for the page: small icon + title. */
  icon?: React.ReactNode;
  title?: React.ReactNode;
  /** Optional breadcrumb / sub-line shown beneath the title. */
  breadcrumb?: React.ReactNode;
  /** Optional page-specific actions (filters, primary buttons, etc.) shown in the middle band. */
  actions?: React.ReactNode;
  /** When true, show the global search instead of the title block. */
  showSearch?: boolean;
}

/**
 * Every page renders the same TopBar shell.
 * - Left slot: page identity (icon + title) OR the global search.
 * - Middle slot: page-specific actions (filters, primary buttons).
 * - Right slot: ALWAYS bell + help + settings + user — never overridden.
 *
 * Pages should never hand-roll their own .dashboard-topbar; pass slots instead.
 */
export const TopBar: React.FC<TopBarProps> = ({
  icon, title, breadcrumb, actions, showSearch = false,
}) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const role = user?.role ?? 'student';
  const displayName = user?.name ?? 'Guest';
  const subtitle = user ? subtitleFor(user) : 'Not signed in';
  const avatarUrl = user ? avatarFor(user) : 'https://ui-avatars.com/api/?name=Guest&background=64748B&color=fff';

  const isAssignments = location.pathname.startsWith('/assignments');

  if (isAssignments) {
    return (
      <div className="dashboard-topbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: 1 }}>
          <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>
            ERP Portal
          </span>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: '#F3F4F6',
            border: '1px solid #E5E7EB',
            borderRadius: '1.75rem',
            padding: '0.45rem 1rem',
            width: '100%',
            maxWidth: '300px',
          }}>
            <Search size={15} color="#94A3B8" style={{ marginRight: '0.5rem', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search resources..."
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: '0.82rem',
                width: '100%',
                color: '#1E293B',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <Link to="/dashboard" style={{ color: '#475569', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}>Dashboard</Link>
            <Link to="/schedule" style={{ color: '#475569', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}>Schedule</Link>
            <Link to="/assignments" style={{
              color: '#0047FF',
              fontSize: '0.85rem',
              fontWeight: 700,
              borderBottom: '2px solid #0047FF',
              paddingBottom: '0.35rem',
              textDecoration: 'none',
            }}>Reports</Link>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => {
              navigate('/assignments/upload/assignment');
            }}
            style={{
              padding: '0.45rem 1rem',
              fontSize: '0.8rem',
              fontWeight: 700,
              borderRadius: 'var(--radius-md)',
              background: '#0047FF',
              color: 'white',
              boxShadow: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            New Upload
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '1px solid #E2E8F0', paddingLeft: '1rem' }}>
            <Bell size={20} style={{ color: '#64748B', cursor: 'pointer' }} />
            <HelpCircle size={20} style={{ color: '#64748B', cursor: 'pointer' }} />
            <img
              src={avatarUrl}
              alt={displayName}
              style={{ width: '2.25rem', height: '2.25rem', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer' }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-topbar">
      <div className="topbar-left">
        {showSearch ? (
          <div className="topbar-search">
            <Search size={18} color="var(--text-muted)" style={{ marginRight: '0.5rem' }} />
            <input
              type="text"
              placeholder={role === 'teacher'
                ? 'Search student ID, modules, or schedules...'
                : role === 'admin'
                  ? 'Search users, courses, or audit logs...'
                  : 'Search modules, files, or tasks...'}
            />
          </div>
        ) : title || icon ? (
          <div className="topbar-identity">
            {icon && <span className="topbar-icon">{icon}</span>}
            <div className="topbar-identity-text">
              {breadcrumb && <div className="topbar-breadcrumb">{breadcrumb}</div>}
              {title && <div className="topbar-title">{title}</div>}
            </div>
          </div>
        ) : null}
      </div>

      {actions && <div className="topbar-actions">{actions}</div>}

      <div className="topbar-right">
        <div className="topbar-icons">
          <Bell size={20} />
          <HelpCircle size={20} />
          <Settings size={20} />
        </div>
        <div className="topbar-user">
          <div className="topbar-user-info">
            <div className="topbar-user-name">{displayName}</div>
            <div className="topbar-user-subtitle">{subtitle}</div>
          </div>
          <img src={avatarUrl} alt={displayName} className="topbar-user-avatar" />
        </div>
      </div>
    </div>
  );
};
