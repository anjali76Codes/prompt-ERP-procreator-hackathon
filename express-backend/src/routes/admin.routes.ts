import { Router } from 'express';
import { requireAuth, requireRole, requireActiveAccount } from '../middlewares/auth.middleware';
import {
  getPendingTeachers, approveTeacher, rejectTeacher,
} from '../controllers/admin.controller';

const router = Router();

router.use(requireAuth, requireRole('admin'), requireActiveAccount);

router.get('/teachers/pending', getPendingTeachers);
router.post('/teachers/:id/approve', approveTeacher);
router.post('/teachers/:id/reject', rejectTeacher);

export default router;
