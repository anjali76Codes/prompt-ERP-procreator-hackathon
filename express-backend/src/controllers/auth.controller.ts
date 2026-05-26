import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/async-handler';
import {
  createStudent, createTeacher, findUserByEmailWithPassword, findUserById,
} from '../services/user.service';
import { signAccessToken, verifyPassword } from '../services/auth.service';
import { Forbidden, Unauthorized } from '../utils/http-errors';

const issueToken = (user: { _id: { toString(): string }; role: 'student' | 'teacher' | 'admin'; status: 'pending' | 'active' | 'rejected' }) =>
  signAccessToken({ sub: user._id.toString(), role: user.role, status: user.status });

export const registerStudent = asyncHandler(async (req: Request, res: Response) => {
  const student = await createStudent(req.body);
  const token = issueToken(student);
  res.status(201).json({ token, user: student.toJSON() });
});

export const registerTeacher = asyncHandler(async (req: Request, res: Response) => {
  const teacher = await createTeacher(req.body);
  // Pending teachers still get a token, but downstream routes gate on status === 'active'.
  const token = issueToken(teacher);
  res.status(201).json({
    token,
    user: teacher.toJSON(),
    message: 'Registration successful. Your account is pending admin approval.',
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };
  const user = await findUserByEmailWithPassword(email);
  if (!user) throw Unauthorized('Invalid email or password');

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw Unauthorized('Invalid email or password');

  if (user.status === 'rejected') {
    throw Forbidden('Your account has been rejected. Contact administration.');
  }

  const token = issueToken(user);
  res.json({ token, user: user.toJSON() });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw Unauthorized();
  const user = await findUserById(req.auth.sub);
  if (!user) throw Unauthorized('Account no longer exists');
  res.json({ user: user.toJSON() });
});
