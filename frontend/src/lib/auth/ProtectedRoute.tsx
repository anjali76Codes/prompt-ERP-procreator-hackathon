import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import type { Role } from './types';

interface Props {
  children: React.ReactNode;
  roles?: Role[];
  requireActive?: boolean;
}

export const ProtectedRoute: React.FC<Props> = ({ children, roles, requireActive = false }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#64748B' }}>
        Loading…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireActive && user.status !== 'active') {
    return <Navigate to="/pending-approval" replace />;
  }

  return <>{children}</>;
};
