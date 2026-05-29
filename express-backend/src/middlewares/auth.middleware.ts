import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/auth.service';
import { Forbidden, Unauthorized } from '../utils/http-errors';
import type { Role } from '../models/User';

export const requireAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(Unauthorized('Missing or malformed Authorization header'));
  }
  try {
    req.auth = verifyAccessToken(token);
    next();
  } catch {
    next(Unauthorized('Invalid or expired token'));
  }
};

export const requireRole = (...allowed: Role[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) return next(Unauthorized());
    if (!allowed.includes(req.auth.role)) {
      // User-facing copy — callers may render this in a banner / toast,
      // so it shouldn't read like a raw policy dump.
      return next(Forbidden('You don’t have access to this page.'));
    }
    next();
  };

export const requireActiveAccount = (req: Request, _res: Response, next: NextFunction): void => {
  if (!req.auth) return next(Unauthorized());
  // Reads are always allowed — even a pending user can see their own
  // dashboard, notifications, and quiz catalogue. Only state-changing
  // operations (POST / PATCH / DELETE) require an approved account.
  // This matches how most ERPs work: pending users get a read-only
  // sandbox until admin approval.
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }
  if (req.auth.status !== 'active') {
    return next(Forbidden('Account is not active yet'));
  }
  next();
};
