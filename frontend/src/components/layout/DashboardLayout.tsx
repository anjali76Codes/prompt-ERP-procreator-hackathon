import React from 'react';
import { AppLayout } from './AppLayout';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

/**
 * Legacy alias. Prefer importing `AppLayout` directly for new pages — it supports
 * topbar/bottombar slots and is role-aware via `useRole`.
 */
export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => (
  <AppLayout>{children}</AppLayout>
);
