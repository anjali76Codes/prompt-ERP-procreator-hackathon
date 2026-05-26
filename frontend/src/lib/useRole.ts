import { useEffect, useState } from 'react';

export type Role = 'student' | 'teacher' | 'admin';

const STORAGE_KEY = 'role';

const readRole = (): Role => {
  if (typeof window === 'undefined') return 'student';
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === 'teacher' || v === 'admin' ? v : 'student';
};

export const useRole = () => {
  const [role, setRoleState] = useState<Role>(readRole);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setRoleState(readRole());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setRole = (next: Role) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    setRoleState(next);
  };

  return { role, setRole };
};
