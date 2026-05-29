import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const broadcastAnnouncementSchema = z.object({
  divisionId: objectId,
  subjectId: objectId.optional(),
  title: z.string().trim().min(1, 'Title is required').max(160),
  body: z.string().trim().min(1, 'Body is required').max(2000),
  link: z.string().trim().max(500).optional(),
});

export type BroadcastAnnouncementInput = z.infer<typeof broadcastAnnouncementSchema>;
