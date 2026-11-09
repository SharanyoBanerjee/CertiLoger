import type { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from './errors.js';
import { ZodError } from 'zod';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    const validationError = new ValidationError('Invalid input', err.issues);
    return sendError(res, validationError);
  }

  if (err instanceof AppError) {
    return sendError(res, err);
  }

  console.error('Unhandled error:', err);
  const appError = new AppError('INTERNAL_ERROR', 500, 'An unexpected error occurred');
  return sendError(res, appError);
}

function sendError(res: Response, err: AppError) {
  const errorBody: Record<string, unknown> = { code: err.code, message: err.message };
  if (err instanceof ValidationError && err.issues) {
    errorBody.issues = err.issues;
  }
  res.status(err.statusCode).json({ error: errorBody });
}
