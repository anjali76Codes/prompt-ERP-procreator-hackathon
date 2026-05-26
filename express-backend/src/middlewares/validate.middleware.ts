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
