import { Router } from 'express';
import { requireAuth, requireActiveAccount, requireRole } from '../middlewares/auth.middleware';
import { resourceUpload } from '../middlewares/upload.middleware';
import * as ctl from '../controllers/resource.controller';

const router = Router();

router.use(requireAuth, requireActiveAccount);

/* ---------- Student feed (must come before generic ":id" rules) ---------- */
router.get(
  '/me/resources',
  requireRole('student'),
  ctl.listStudentFeed
);

/* --------------------------- Teacher endpoints --------------------------- */
router.get('/resources', ctl.listResources);
router.get('/resources/:id', ctl.getResource);

router.post(
  '/resources',
  requireRole('teacher', 'admin'),
  resourceUpload.array('files'),
  ctl.createResource
);

router.patch(
  '/resources/:id',
  requireRole('teacher', 'admin'),
  ctl.updateResource
);

router.post(
  '/resources/:id/attachments',
  requireRole('teacher', 'admin'),
  resourceUpload.array('files'),
  ctl.addAttachments
);

router.delete(
  '/resources/:id/attachments/:attId',
  requireRole('teacher', 'admin'),
  ctl.removeAttachment
);

router.post(
  '/resources/:id/publish',
  requireRole('teacher', 'admin'),
  ctl.publishResource
);

router.post(
  '/resources/:id/unpublish',
  requireRole('teacher', 'admin'),
  ctl.unpublishResource
);

router.delete(
  '/resources/:id',
  requireRole('teacher', 'admin'),
  ctl.deleteResource
);

export default router;
