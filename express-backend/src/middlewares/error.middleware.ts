import type { Request, Response, NextFunction } from 'express';
import { HttpError } from '../utils/http-errors';
import { logger } from '../utils/logger';
import mongoose from 'mongoose';

interface MongoDuplicateError extends Error {
  code?: number;
  keyValue?: Record<string, unknown>;
}

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(new HttpError(404, `Route ${req.method} ${req.originalUrl} not found`));
};

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof HttpError) {
    if (err.status >= 500) logger.error(err.message, { path: req.originalUrl, details: err.details });
    res.status(err.status).json({
      error: { message: err.message, ...(err.details ? { details: err.details } : {}) },
    });
    return;
  }

  if (err instanceof mongoose.Error.ValidationError) {
    res.status(400).json({
      error: { message: 'Validation failed', details: err.errors },
    });
    return;
  }

  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({ error: { message: `Invalid ${err.path}: ${err.value}` } });
    return;
  }

  const dup = err as MongoDuplicateError;
  if (dup && dup.code === 11000) {
    res.status(409).json({
      error: { message: 'Duplicate value', details: dup.keyValue },
    });
    return;
  }

  logger.error('Unhandled error', err as Error);
  res.status(500).json({ error: { message: 'Internal server error' } });
};
