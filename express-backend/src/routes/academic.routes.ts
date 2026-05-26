import { Router } from 'express';
import { requireAuth, requireActiveAccount } from '../middlewares/auth.middleware';
import * as ctl from '../controllers/academic.controller';

const router = Router();

router.use(requireAuth, requireActiveAccount);

router.get('/branches', ctl.getBranches);
router.get('/academic-years', ctl.getAcademicYears);

router.get('/divisions', ctl.getDivisions);
router.get('/divisions/:id', ctl.getDivisionById);
router.get('/divisions/:id/students', ctl.getDivisionStudents);

router.get('/subjects', ctl.getSubjects);

export default router;
