import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { updateMyProfile } from '../controllers/profile.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import {
  studentProfileUpdateSchema, teacherProfileUpdateSchema,
} from '../validators/profile.validator';

const router = Router();

// Validation schema depends on the caller's role.
const validatorByRole = (req: Request, res: Response, next: NextFunction): void => {
  if (req.auth?.role === 'student') return validateBody(studentProfileUpdateSchema)(req, res, next);
  if (req.auth?.role === 'teacher') return validateBody(teacherProfileUpdateSchema)(req, res, next);
  next();
};

router.patch('/me', requireAuth, validatorByRole, updateMyProfile);

export default router;
