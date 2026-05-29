import { Router } from 'express';
import { requireAuth, requireActiveAccount, requireRole } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import * as ctl from '../controllers/class-notification.controller';
import { broadcastAnnouncementSchema } from '../validators/announcement.validator';

const router = Router();

router.use(requireAuth, requireActiveAccount);

// Teachers list their own class-notify broadcasts (kind:'reminder').
router.get('/class-notifications', requireRole('teacher', 'admin'), ctl.list);

// Send an urgent class reminder to everyone in a division.
router.post(
  '/class-notifications',
  requireRole('teacher', 'admin'),
  validateBody(broadcastAnnouncementSchema),
  ctl.send,
);

export default router;
