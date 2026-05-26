import { Router } from 'express';
import { requireAuth, requireActiveAccount, requireRole } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import * as ctl from '../controllers/attendance.controller';
import { markAttendanceSchema } from '../validators/attendance.validator';

const router = Router();

router.use(requireAuth, requireActiveAccount);

router.post(
  '/lectures/:id/attendance',
  requireRole('teacher', 'admin'),
  validateBody(markAttendanceSchema),
  ctl.markAttendance
);
router.get('/lectures/:id/attendance', ctl.getAttendanceForLecture);
router.get(
  '/lectures/:id/report.pdf',
  requireRole('teacher', 'admin'),
  ctl.downloadLectureRosterPdf
);

router.get('/me/attendance', ctl.getMyAttendance);
router.get('/students/:id/attendance', ctl.getStudentAttendance);

router.get(
  '/divisions/:id/attendance/stats',
  requireRole('teacher', 'admin'),
  ctl.getDivisionAttendanceStats
);
router.get(
  '/divisions/:id/attendance/subjects',
  requireRole('teacher', 'admin'),
  ctl.getDivisionSubjectAverages
);
router.get(
  '/divisions/:id/attendance/eligibility',
  requireRole('teacher', 'admin'),
  ctl.getDivisionEligibility
);
router.get(
  '/divisions/:id/attendance/report.pdf',
  requireRole('teacher', 'admin'),
  ctl.downloadDivisionReportPdf
);

export default router;
