import React from 'react';
import { Search, Bell, HelpCircle, Settings } from 'lucide-react';
import { useRole } from '../../lib/useRole';

interface TopBarProps {
  showSearch?: boolean;
  left?: React.ReactNode;
  right?: React.ReactNode;
}

interface UserMeta {
  name: string;
  subtitle: string;
  avatarUrl: string;
}

const USERS: Record<string, UserMeta> = {
  teacher: {
    name: 'Prof. Adrian Miller',
    subtitle: 'Senior Faculty, Dept. of CS',
    avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=100&h=100&q=80',
  },
  student: {
    name: 'Alex Rivera',
    subtitle: 'B.Tech CS • Semester 5',
    avatarUrl: 'https://ui-avatars.com/api/?name=Alex+Rivera&background=0D8ABC&color=fff',
  },
  admin: {
    name: 'Admin Console',
    subtitle: 'Verification Officer',
    avatarUrl: 'https://ui-avatars.com/api/?name=Admin&background=0F172A&color=fff',
  },
};

export const TopBar: React.FC<TopBarProps> = ({ showSearch = true, left, right }) => {
  const { role } = useRole();
  const user = USERS[role] ?? USERS.student;

  return (
    <div className="dashboard-topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
        {left}
        {showSearch && !left && (
          <div className="topbar-search">
            <Search size={18} color="var(--text-muted)" style={{ marginRight: '0.5rem' }} />
            <input
              type="text"
              placeholder={role === 'teacher'
                ? 'Search student ID, modules, or schedules...'
                : 'Search modules, files, or tasks...'}
            />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        {right}
        <div className="topbar-icons">
          <Bell size={20} />
          <HelpCircle size={20} />
          <Settings size={20} />
        </div>
        <div className="topbar-user">
          <div className="topbar-user-info">
            <div className="topbar-user-name">{user.name}</div>
            <div className="topbar-user-subtitle">{user.subtitle}</div>
          </div>
          <img src={user.avatarUrl} alt={user.name} className="topbar-user-avatar" />
        </div>
      </div>
    </div>
  );
};
