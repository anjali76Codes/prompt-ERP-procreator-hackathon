import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const sendNotificationSchema = z.object({
  recipient: objectId,
  kind: z.enum(['attendance', 'announcement', 'reminder', 'alert']).default('announcement'),
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(2000),
  link: z.string().trim().max(500).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export type SendNotificationInput = z.infer<typeof sendNotificationSchema>;
