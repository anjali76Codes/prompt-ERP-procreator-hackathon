import { apiRequest } from '../api';
import type { AppNotification, SendNotificationPayload } from './types';

export const listNotifications = async (
  { unreadOnly = false, limit = 30 }: { unreadOnly?: boolean; limit?: number } = {},
): Promise<AppNotification[]> => {
  const qs = `?limit=${limit}${unreadOnly ? '&unread=1' : ''}`;
  const data = await apiRequest<{ notifications: AppNotification[] }>(`/notifications${qs}`);
  return data.notifications;
};

export const fetchUnreadCount = async (): Promise<number> => {
  const data = await apiRequest<{ count: number }>('/notifications/unread-count');
  return data.count;
};

export const markRead = (id: string): Promise<unknown> =>
  apiRequest(`/notifications/${id}/read`, { method: 'POST' });

export const markAllRead = (): Promise<unknown> =>
  apiRequest('/notifications/read-all', { method: 'POST' });

export const sendNotification = async (payload: SendNotificationPayload): Promise<AppNotification> => {
  const data = await apiRequest<{ notification: AppNotification }>('/notifications', {
    method: 'POST',
    body: payload,
  });
  return data.notification;
};
