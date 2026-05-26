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
      return next(Forbidden(`Requires one of: ${allowed.join(', ')}`));
    }
    next();
  };

export const requireActiveAccount = (req: Request, _res: Response, next: NextFunction): void => {
  if (!req.auth) return next(Unauthorized());
  if (req.auth.status !== 'active') {
    return next(Forbidden('Account is not active yet'));
  }
  next();
};
