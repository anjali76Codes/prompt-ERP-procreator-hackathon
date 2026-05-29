import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import * as ctl from '../controllers/student-overview.controller';

const router = Router();

// Auth-only. We don't gate on role or active-status — the controller / service
// returns a graceful empty payload for non-students so a stale JWT or a brief
// role-mismatch on the frontend never lands the user on a 403 page.
router.use(requireAuth);

router.get('/me/student-overview', ctl.get);

export default router;
