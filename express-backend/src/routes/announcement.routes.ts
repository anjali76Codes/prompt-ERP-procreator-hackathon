import { Router } from 'express';
import { requireAuth, requireActiveAccount, requireRole } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import * as ctl from '../controllers/announcement.controller';
import { broadcastAnnouncementSchema } from '../validators/announcement.validator';

const router = Router();

router.use(requireAuth, requireActiveAccount);

// Teachers list their own past broadcasts (aggregated by broadcastId).
router.get('/announcements', requireRole('teacher', 'admin'), ctl.list);

// Send a new announcement to everyone in a division.
router.post(
  '/announcements',
  requireRole('teacher', 'admin'),
  validateBody(broadcastAnnouncementSchema),
  ctl.broadcast,
);

export default router;
