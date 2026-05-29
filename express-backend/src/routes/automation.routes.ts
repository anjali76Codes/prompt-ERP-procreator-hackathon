import { Router } from 'express';
import { requireAuth, requireActiveAccount, requireRole } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import * as ctl from '../controllers/automation.controller';
import {
  createAutomationSchema,
  updateAutomationSchema,
  recordRunSchema,
} from '../validators/automation.validator';

const router = Router();

// Scope auth + role gating to the /automations subtree only. Applying these
// as `router.use(...)` without a path makes them fire on every request that
// passes through this sub-router — and because routes/index.ts mounts this
// router at '/', that meant a student hitting /notifications or
// /me/student-overview was getting blocked here with 403 before Express ever
// reached the right router.
const gate = [requireAuth, requireActiveAccount, requireRole('teacher', 'admin')];

router.get('/automations', gate, ctl.list);
router.post('/automations', gate, validateBody(createAutomationSchema), ctl.create);
router.get('/automations/:id', gate, ctl.get);
router.patch('/automations/:id', gate, validateBody(updateAutomationSchema), ctl.update);
router.delete('/automations/:id', gate, ctl.remove);

router.get('/automations/:id/runs', gate, ctl.listRuns);
router.post('/automations/:id/runs', gate, validateBody(recordRunSchema), ctl.recordRun);

export default router;
