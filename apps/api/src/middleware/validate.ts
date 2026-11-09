import type { Request, Response, NextFunction } from 'express';
import type { AnyZodObject } from 'zod';
import { ZodError } from 'zod';
import { ValidationError } from './errors.js';

export function validate(schema: AnyZodObject) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({ body: req.body, query: req.query, params: req.params });
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        throw new ValidationError('Invalid input', err.issues);
      }
      throw err;
    }
  };
}
