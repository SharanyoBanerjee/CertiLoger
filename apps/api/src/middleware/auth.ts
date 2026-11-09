import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/auth.js';
import type { JwtPayload } from '../services/auth.js';
import { UnauthorizedError, ForbiddenError } from './errors.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid authorization header');
  }
  const token = authHeader.slice(7);
  req.user = verifyToken(token);
  next();
}

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }
    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError(`Role ${req.user.role} not allowed`);
    }
    next();
  };
}

export function requireInstitutionAccess(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }
  const institutionId =
    req.params.institutionId || req.body.institutionId || req.query.institutionId;
  if (institutionId && req.user.institutionId && req.user.institutionId !== institutionId) {
    throw new ForbiddenError('Access denied to this institution');
  }
  next();
}
