import { Router } from 'express';
import { requireAuth, requireActiveAccount, requireRole } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import * as ctl from '../controllers/notification.controller';
import { sendNotificationSchema } from '../validators/notification.validator';

const router = Router();

router.use(requireAuth, requireActiveAccount);

// Read endpoints — every authenticated user has their own inbox.
router.get('/notifications', ctl.list);
router.get('/notifications/unread-count', ctl.unreadCount);
router.post('/notifications/read-all', ctl.markAllRead);
router.post('/notifications/:id/read', ctl.markRead);

// Sending is teacher/admin only — students can't fire their own notifications.
router.post(
  '/notifications',
  requireRole('teacher', 'admin'),
  validateBody(sendNotificationSchema),
  ctl.send,
);

export default router;
