import { Router } from 'express';
import { requireAuth, requireActiveAccount, requireRole } from '../middlewares/auth.middleware';
import * as ctl from '../controllers/grade-batch.controller';

const router = Router();

router.use(requireAuth, requireActiveAccount);

// One row per published assignment the caller owns, with aggregated
// submission counts so the dashboard can show "X to grade", "Y proposed".
router.get('/grade-batch', requireRole('teacher', 'admin'), ctl.list);

export default router;
