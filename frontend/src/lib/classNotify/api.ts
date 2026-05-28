import { apiRequest } from '../api';

export interface ClassNotification {
  broadcastId: string;
  divisionId: string;
  subjectId?: string;
  title: string;
  body: string;
  notified: number;
  createdAt: string;
  divisionLabel?: string;
  subjectLabel?: string;
}

export interface NotifyClassInput {
  divisionId: string;
  subjectId?: string;
  title: string;
  body: string;
  link?: string;
}

export const listClassNotifications = () =>
  apiRequest<{ notifications: ClassNotification[] }>('/class-notifications');

export const notifyClass = (body: NotifyClassInput) =>
  apiRequest<{ notification: ClassNotification }>('/class-notifications', {
    method: 'POST',
    body,
  });
