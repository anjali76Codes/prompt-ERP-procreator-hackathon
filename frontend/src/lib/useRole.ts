import { useAuth } from './auth/AuthContext';
import type { Role } from './auth/types';

export type { Role };

/**
 * Reads the current user's role from the auth context. Falls back to 'student'
 * when there is no logged-in user — pages that need stricter behavior should
 * wrap themselves in <ProtectedRoute> instead of relying on this default.
 */
export const useRole = () => {
  const { user } = useAuth();
  return { role: (user?.role ?? 'student') as Role };
};
