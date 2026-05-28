import { Router } from 'express';
import { requireAuth, requireActiveAccount, requireRole } from '../middlewares/auth.middleware';
import * as ctl from '../controllers/grading.controller';

const router = Router();

router.use(requireAuth, requireActiveAccount);

// Rubric — teacher sets / fetches.
router.patch(
  '/resources/:id/rubric',
  requireRole('teacher', 'admin'),
  ctl.setRubric,
);
router.get('/resources/:id/rubric', ctl.getRubric);

// Dashboard data — all submissions for one assignment with proposals + counts.
router.get(
  '/resources/:id/grading-review',
  requireRole('teacher', 'admin'),
  ctl.review,
);

// AI / agent writes a proposed grade.
router.post(
  '/submissions/:id/propose',
  requireRole('teacher', 'admin'),
  ctl.proposeGrade,
);

// Teacher publishes one proposal (optionally overriding score).
router.post(
  '/submissions/:id/publish-grade',
  requireRole('teacher', 'admin'),
  ctl.publishGrade,
);

// Teacher publishes many proposals at once.
router.post(
  '/resources/:id/publish-grades',
  requireRole('teacher', 'admin'),
  ctl.bulkPublish,
);

export default router;
