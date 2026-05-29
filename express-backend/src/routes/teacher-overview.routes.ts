import { Router } from 'express';
import { requireAuth, requireActiveAccount, requireRole } from '../middlewares/auth.middleware';
import * as ctl from '../controllers/teacher-overview.controller';

const router = Router();

router.use(requireAuth, requireActiveAccount);

router.get('/me/teacher-overview', requireRole('teacher', 'admin'), ctl.get);

export default router;
