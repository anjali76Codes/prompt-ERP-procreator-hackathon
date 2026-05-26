import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiRequest, getToken, setToken } from '../api';
import type {
  AppUser, AuthResponse, RegisterPayload, StudentUser, TeacherUser,
} from './types';

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<AppUser>;
  register: (payload: RegisterPayload) => Promise<{ user: AppUser; message?: string }>;
  logout: () => void;
  refresh: () => Promise<void>;
  updateProfile: (patch: Partial<StudentUser> | Partial<TeacherUser>) => Promise<AppUser>;
}

const Ctx = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState<boolean>(!!getToken());
  const [error, setError] = useState<string | null>(null);

  const fetchMe = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const data = await apiRequest<{ user: AppUser }>('/auth/me');
      setUser(data.user);
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchMe(); }, [fetchMe]);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    const data = await apiRequest<AuthResponse>('/auth/login', {
      method: 'POST', body: { email, password }, auth: false,
    });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    setError(null);
    const path = payload.kind === 'student' ? '/auth/register/student' : '/auth/register/teacher';
    const { kind: _kind, ...body } = payload;
    const data = await apiRequest<AuthResponse>(path, { method: 'POST', body, auth: false });
    setToken(data.token);
    setUser(data.user);
    return { user: data.user, message: data.message };
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (patch: Partial<StudentUser> | Partial<TeacherUser>) => {
    const data = await apiRequest<{ user: AppUser }>('/profile/me', {
      method: 'PATCH', body: patch,
    });
    setUser(data.user);
    return data.user;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, error, login, register, logout, refresh: fetchMe, updateProfile }),
    [user, loading, error, login, register, logout, fetchMe, updateProfile]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
};
