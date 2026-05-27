import { Router } from 'express';
import { requireAuth, requireActiveAccount, requireRole } from '../middlewares/auth.middleware';
import { resourceUpload } from '../middlewares/upload.middleware';
import * as ctl from '../controllers/submission.controller';

const router = Router();

router.use(requireAuth, requireActiveAccount);

/* ----------------------------- Student ---------------------------------- */

// Submit / resubmit files for an assignment.
router.post(
  '/resources/:id/submissions/mine',
  requireRole('student'),
  resourceUpload.array('files'),
  ctl.submit
);

// Student fetches their own submission for one assignment.
router.get(
  '/resources/:id/submissions/mine',
  requireRole('student'),
  ctl.getMine
);

// Student lists all their submissions.
router.get(
  '/me/submissions',
  requireRole('student'),
  ctl.listMine
);

/* ----------------------------- Teacher ---------------------------------- */

// All submissions for one assignment.
router.get(
  '/resources/:id/submissions',
  requireRole('teacher', 'admin'),
  ctl.listForResource
);

// Grade one submission.
router.post(
  '/submissions/:id/grade',
  requireRole('teacher', 'admin'),
  ctl.grade
);

// Ask the student to resubmit.
router.post(
  '/submissions/:id/request-resubmit',
  requireRole('teacher', 'admin'),
  ctl.requestResubmit
);

export default router;
