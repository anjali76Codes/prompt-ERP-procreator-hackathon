import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { HeadphonesIcon, LogOut, Menu, User } from 'lucide-react';
import { toast } from 'react-toastify';
import { Logo } from '../ui/Logo';
import {
  recentActivity, studentNav, teacherNav, teacherTools, type NavItem,
} from '../../lib/navConfig';
import type { Role } from '../../lib/useRole';
import { useAuth } from '../../lib/auth/AuthContext';

interface SidebarProps {
  isCollapsed: boolean;
  onMenuToggle: () => void;
  role?: Role;
  showActivity?: boolean;
}

const NavList: React.FC<{ items: NavItem[]; isCollapsed: boolean }> = ({ items, isCollapsed }) => (
  <>
    {items.map(item => (
      <NavLink
        key={item.path}
        to={item.path}
        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        title={item.name}
      >
        {item.icon}
        {!isCollapsed && <span>{item.name}</span>}
      </NavLink>
    ))}
  </>
);

const ActivityPanel: React.FC = () => (
  <div className="sidebar-section">
    <div className="sidebar-section-title">Recent Activity</div>
    <div className="sidebar-activity-list">
      {recentActivity.map((activity, idx) => (
        <div key={idx} className="sidebar-activity-item">
          <div className="sidebar-activity-meta">
            <span className="sidebar-activity-type" style={{ color: activity.color }}>{activity.type}</span>
            <span className="sidebar-activity-time">{activity.time}</span>
          </div>
          <div className="sidebar-activity-content">{activity.content}</div>
        </div>
      ))}
    </div>
  </div>
);

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onMenuToggle,
  role = 'student',
  showActivity = false,
}) => {
  const isTeacher = role === 'teacher';
  const primaryNav = isTeacher ? teacherNav : studentNav;
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    logout();
    toast.info('Signed out');
    navigate('/signin', { replace: true });
  };

  return (
    <div className={`dashboard-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-logo-container">
        <button onClick={onMenuToggle} className="sidebar-menu-toggle" aria-label="Toggle navigation">
          <Menu size={24} />
        </button>
        {!isCollapsed && (
          <div className="sidebar-logo-block">
            <Logo />
            <span className="sidebar-logo-tagline">Education Management</span>
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        <NavList items={primaryNav} isCollapsed={isCollapsed} />

        {isTeacher && showActivity && !isCollapsed && <ActivityPanel />}

        {isTeacher && (
          <div className={`sidebar-section ${isCollapsed ? 'collapsed' : ''}`}>
            {!isCollapsed && <div className="sidebar-section-title">Tools</div>}
            <NavList items={teacherTools} isCollapsed={isCollapsed} />
          </div>
        )}
      </nav>

      <div className="sidebar-footer">
        <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Profile">
          <User size={20} />
          {!isCollapsed && <span>Profile</span>}
        </NavLink>
        <NavLink to="/support" className="nav-item" title="Support">
          <HeadphonesIcon size={20} />
          {!isCollapsed && <span>Support</span>}
        </NavLink>
        <a href="/signin" onClick={handleLogout} className="nav-item" title="Logout">
          <LogOut size={20} />
          {!isCollapsed && <span>Logout</span>}
        </a>
      </div>
    </div>
  );
};
