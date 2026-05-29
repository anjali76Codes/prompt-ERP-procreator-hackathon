import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { toast } from 'react-toastify';
import * as api from './api';
import type { AppNotification } from './types';
import { useAuth } from '../auth/AuthContext';

interface NotificationContextValue {
  notifications: AppNotification[];
  unread: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const Ctx = createContext<NotificationContextValue | null>(null);

const POLL_MS = 30_000;

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const pollRef = useRef<number | null>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const initialised = useRef(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [list, count] = await Promise.all([
        api.listNotifications({ limit: 30 }),
        api.fetchUnreadCount(),
      ]);

      // After the first sync, toast each genuinely-new unread arrival.
      if (initialised.current) {
        for (const n of list) {
          if (!n.read && !seenIds.current.has(n._id)) {
            toast.info(`🔔 ${n.title}`, { autoClose: 4500 });
          }
        }
      }
      seenIds.current = new Set(list.map(n => n._id));
      initialised.current = true;

      setNotifications(list);
      setUnread(count);
    } catch { /* silent — polling will retry */ }
    finally { setLoading(false); }
  } catch (err) {
      if (err instanceof api.ApiError && (err.status === 401 || err.status === 403)) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  }, [user, logout]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnread(0);
      seenIds.current = new Set();
      initialised.current = false;
      return;
    }
    void refresh();
    pollRef.current = window.setInterval(() => { void refresh(); }, POLL_MS);
    return () => {
      if (pollRef.current !== null) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [user, refresh]);

  const markRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    setUnread(prev => Math.max(0, prev - 1));
    try { await api.markRead(id); } catch { /* surface via toast later */ }
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnread(0);
    try { await api.markAllRead(); } catch { /* silent */ }
  }, []);

  const value = useMemo<NotificationContextValue>(
    () => ({ notifications, unread, loading, refresh, markRead, markAllRead }),
    [notifications, unread, loading, refresh, markRead, markAllRead],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useNotifications = (): NotificationContextValue => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useNotifications must be used inside <NotificationProvider>');
  return v;
};
