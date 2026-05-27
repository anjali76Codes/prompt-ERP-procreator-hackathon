import { Router } from 'express';
import authRoutes from './auth.routes';
import profileRoutes from './profile.routes';
import adminRoutes from './admin.routes';
import academicRoutes from './academic.routes';
import lectureRoutes from './lecture.routes';
import attendanceRoutes from './attendance.routes';
import resourceRoutes from './resource.routes';
import submissionRoutes from './submission.routes';
import automationRoutes from './automation.routes';
import notificationRoutes from './notification.routes';
import quizRoutes from './quiz.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/admin', adminRoutes);

router.use('/academic', academicRoutes);

// Lecture + attendance share top-level paths so the URLs read naturally.
router.use('/', lectureRoutes);
router.use('/', attendanceRoutes);
router.use('/', resourceRoutes);
router.use('/', submissionRoutes);
router.use('/', quizRoutes);

router.use('/', automationRoutes);
router.use('/', notificationRoutes);

export default router;
