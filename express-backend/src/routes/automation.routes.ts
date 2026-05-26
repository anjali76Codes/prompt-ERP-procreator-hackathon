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

router.use(requireAuth, requireActiveAccount, requireRole('teacher', 'admin'));

router.get('/automations', ctl.list);
router.post('/automations', validateBody(createAutomationSchema), ctl.create);
router.get('/automations/:id', ctl.get);
router.patch('/automations/:id', validateBody(updateAutomationSchema), ctl.update);
router.delete('/automations/:id', ctl.remove);

router.get('/automations/:id/runs', ctl.listRuns);
router.post('/automations/:id/runs', validateBody(recordRunSchema), ctl.recordRun);

export default router;
