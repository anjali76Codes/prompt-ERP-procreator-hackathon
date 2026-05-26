import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';
import { BadRequest } from '../utils/http-errors';

export const validateBody = <T>(schema: ZodSchema<T>) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const flat = result.error.flatten();
      return next(BadRequest('Validation failed', flat.fieldErrors));
    }
    req.body = result.data;
    next();
  };

export const validateQuery = <T>(schema: ZodSchema<T>) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const flat = result.error.flatten();
      return next(BadRequest('Invalid query parameters', flat.fieldErrors));
    }
    // Stash parsed result on res.locals so handlers don't have to re-parse.
    (req as Request & { validatedQuery?: T }).validatedQuery = result.data;
    next();
  };
