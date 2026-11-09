import type { ZodIssue } from 'zod';

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public override readonly message: string;

  constructor(code: string, statusCode: number, message: string) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.message = message;
    this.name = 'AppError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super('UNAUTHORIZED', 401, message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super('FORBIDDEN', 403, message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super('NOT_FOUND', 404, message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super('CONFLICT', 409, message);
    this.name = 'ConflictError';
  }
}

export class ValidationError extends AppError {
  constructor(
    message = 'Invalid input',
    public readonly issues?: ZodIssue[]
  ) {
    super('VALIDATION_ERROR', 400, message);
    this.name = 'ValidationError';
  }
}

export class LedgerUnavailableError extends AppError {
  constructor(message = 'Ledger unavailable') {
    super('LEDGER_UNAVAILABLE', 503, message);
    this.name = 'LedgerUnavailableError';
  }
}
