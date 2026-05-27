import { Router } from 'express';
import { requireAuth, requireActiveAccount, requireRole } from '../middlewares/auth.middleware';
import * as ctl from '../controllers/quiz.controller';

const router = Router();

router.use(requireAuth, requireActiveAccount);

/* Student */
router.post('/quizzes/:id/start', requireRole('student'), ctl.startAttempt);
router.post('/quizzes/submit', requireRole('student'), ctl.submitAttempt);
router.get('/student/quizzes', requireRole('student'), ctl.listStudentQuizzes);

/* Teacher */
router.get('/quizzes', requireRole('teacher', 'admin'), ctl.listQuizzes);
router.get('/quizzes/:id', requireRole('teacher', 'admin'), ctl.getQuiz);
router.post('/quizzes', requireRole('teacher', 'admin'), ctl.createQuiz);
router.patch('/quizzes/:id', requireRole('teacher', 'admin'), ctl.updateQuiz);
router.post('/quizzes/:id/publish', requireRole('teacher', 'admin'), ctl.publishQuiz);
router.post('/quizzes/:id/unpublish', requireRole('teacher', 'admin'), ctl.unpublishQuiz);
router.delete('/quizzes/:id', requireRole('teacher', 'admin'), ctl.deleteQuiz);

router.get('/quizzes/:id/attempts', requireRole('teacher', 'admin'), ctl.listAttempts);
router.get('/quizzes/attempts/:id', requireRole('teacher', 'admin'), ctl.getAttempt);
router.post('/quizzes/attempts/:id/grade', requireRole('teacher', 'admin'), ctl.gradeAttempt);
router.get('/quizzes/:id/metrics', requireRole('teacher', 'admin'), ctl.quizMetrics);

export default router;
