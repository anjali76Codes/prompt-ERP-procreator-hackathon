import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { Role } from '../models/User';

export interface JwtPayload {
  sub: string;
  role: Role;
  status: 'pending' | 'active' | 'rejected';
}

export const hashPassword = async (plain: string): Promise<string> => {
  return bcrypt.hash(plain, env.BCRYPT_SALT_ROUNDS);
};

export const verifyPassword = async (plain: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(plain, hash);
};

export const signAccessToken = (payload: JwtPayload): string => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign(payload, env.JWT_SECRET as jwt.Secret, { expiresIn: env.JWT_EXPIRES_IN as any });
};

export const verifyAccessToken = (token: string): JwtPayload => {
  const decoded = jwt.verify(token, env.JWT_SECRET);
  if (typeof decoded === 'string') {
    throw new Error('Invalid token payload');
  }
  return decoded as JwtPayload;
};
