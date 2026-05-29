import { Router } from 'express';
import { requireAuth, requireActiveAccount, requireRole } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import * as ctl from '../controllers/notification.controller';
import { sendNotificationSchema } from '../validators/notification.validator';

const router = Router();

// Auth is required everywhere; active-account gating is per-route so that
// even a pending user can still see their notifications (they often contain
// "your account was approved" messages — blocking would be a usability bug).
router.use(requireAuth);

// Read endpoints — every authenticated user has their own inbox.
router.get('/notifications', ctl.list);
router.get('/notifications/unread-count', ctl.unreadCount);
router.post('/notifications/read-all', ctl.markAllRead);
router.post('/notifications/:id/read', ctl.markRead);

// Sending is teacher/admin only AND requires an active account — students
// can't fire their own notifications, and pending teachers can't either.
router.post(
  '/notifications',
  requireActiveAccount,
  requireRole('teacher', 'admin'),
  validateBody(sendNotificationSchema),
  ctl.send,
);

export default router;
