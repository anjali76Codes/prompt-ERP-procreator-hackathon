import { Router } from 'express';
import { registerStudent, registerTeacher, login, me } from '../controllers/auth.controller';
import { validateBody } from '../middlewares/validate.middleware';
import { requireAuth } from '../middlewares/auth.middleware';
import {
  studentRegisterSchema, teacherRegisterSchema, loginSchema,
} from '../validators/auth.validator';

const router = Router();

router.post('/register/student', validateBody(studentRegisterSchema), registerStudent);
router.post('/register/teacher', validateBody(teacherRegisterSchema), registerTeacher);
router.post('/login', validateBody(loginSchema), login);
router.get('/me', requireAuth, me);

export default router;
