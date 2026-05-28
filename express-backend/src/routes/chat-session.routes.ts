import { Router } from 'express';
import { requireAuth, requireActiveAccount } from '../middlewares/auth.middleware';
import * as ctl from '../controllers/chat-session.controller';

const router = Router();

router.use(requireAuth, requireActiveAccount);

router.post('/chat-sessions', ctl.create);
router.get('/chat-sessions', ctl.listMine);
router.get('/chat-sessions/:id', ctl.getOne);
router.post('/chat-sessions/:id/messages', ctl.append);
router.patch('/chat-sessions/:id', ctl.rename);
router.delete('/chat-sessions/:id', ctl.remove);

export default router;
