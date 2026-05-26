export type NotificationKind = 'attendance' | 'announcement' | 'reminder' | 'alert';

export interface AppNotification {
  _id: string;
  sender: { _id: string; name: string; email: string; role: string } | string;
  recipient: string;
  kind: NotificationKind;
  title: string;
  body: string;
  link?: string;
  meta?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SendNotificationPayload {
  recipient: string;
  kind?: NotificationKind;
  title: string;
  body: string;
  link?: string;
  meta?: Record<string, unknown>;
}
