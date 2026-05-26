import React from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useSidebarState } from '../../lib/useSidebarState';
import { useRole } from '../../lib/useRole';

interface AppLayoutProps {
  children: React.ReactNode;
  /** Optional custom topbar — when provided, the default TopBar is replaced. */
  topBar?: React.ReactNode;
  /** Optional bottom action bar pinned below the scroll area (no fixed positioning). */
  bottomBar?: React.ReactNode;
  /** Show the teacher activity panel in the sidebar (default true for teacher role). */
  showActivity?: boolean;
  /** Background color for the main scroll area (defaults to the app neutral). */
  background?: string;
  /** When true the content area is padded; set false to manage padding yourself. */
  padded?: boolean;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  topBar,
  bottomBar,
  showActivity,
  background,
  padded = true,
}) => {
  const { collapsed, toggle } = useSidebarState();
  const { role } = useRole();

  const sidebarActivity = showActivity ?? role === 'teacher';

  return (
    <div className="dashboard-layout">
      <Sidebar
        isCollapsed={collapsed}
        onMenuToggle={toggle}
        role={role}
        showActivity={sidebarActivity}
      />
      <div className="dashboard-main" style={background ? { background } : undefined}>
        {topBar ?? <TopBar />}
        <div
          className="dashboard-content"
          style={padded ? undefined : { padding: 0 }}
        >
          {children}
        </div>
        {bottomBar}
      </div>
    </div>
  );
};
