import { apiRequest } from '../api';

export interface Announcement {
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

export interface BroadcastInput {
  divisionId: string;
  subjectId?: string;
  title: string;
  body: string;
  link?: string;
}

export const listAnnouncements = () =>
  apiRequest<{ announcements: Announcement[] }>('/announcements');

export const broadcastAnnouncement = (body: BroadcastInput) =>
  apiRequest<{ announcement: Announcement }>('/announcements', {
    method: 'POST',
    body,
  });
