import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/async-handler';
import { updateStudentProfile, updateTeacherProfile } from '../services/user.service';
import { Forbidden, Unauthorized } from '../utils/http-errors';

export const updateMyProfile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw Unauthorized();

  if (req.auth.role === 'student') {
    const updated = await updateStudentProfile(req.auth.sub, req.body);
    res.json({ user: updated.toJSON() });
    return;
  }

  if (req.auth.role === 'teacher') {
    const updated = await updateTeacherProfile(req.auth.sub, req.body);
    res.json({ user: updated.toJSON() });
    return;
  }

  throw Forbidden('Admins do not have an editable profile');
});
