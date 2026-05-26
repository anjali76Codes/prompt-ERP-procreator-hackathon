import { Router } from 'express';
import { requireAuth, requireActiveAccount, requireRole } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import * as ctl from '../controllers/lecture.controller';
import {
  createLectureSchema,
  createScheduleSchema,
} from '../validators/attendance.validator';

const router = Router();

router.use(requireAuth, requireActiveAccount);

router.get('/lectures', ctl.getLectures);
router.post('/lectures', requireRole('teacher', 'admin'), validateBody(createLectureSchema), ctl.createLecture);
router.get('/lectures/:id', ctl.getLecture);
router.get('/lectures/:id/roster', ctl.getLectureRoster);
router.post('/lectures/:id/cancel', requireRole('teacher', 'admin'), ctl.cancelLecture);
router.post('/lectures/:id/restore', requireRole('teacher', 'admin'), ctl.restoreLecture);

router.get('/schedules', ctl.getSchedules);
router.post('/schedules', requireRole('teacher', 'admin'), validateBody(createScheduleSchema), ctl.createSchedule);
router.delete('/schedules/:id', requireRole('teacher', 'admin'), ctl.deleteSchedule);
router.post('/schedules/materialise', requireRole('teacher', 'admin'), ctl.materialiseDay);

export default router;
