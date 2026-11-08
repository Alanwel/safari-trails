/**
 * Terminal error handling. Every failure leaves the API in the same shape:
 *
 *   { "data": null, "error": { "code", "message", "details" }, "meta": {} }
 */
import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { ApiError, sendError } from '../lib/http.js';

export function notFoundHandler(req: Request, res: Response) {
  return sendError(res, 404, 'NOT_FOUND', `No route for ${req.method} ${req.originalUrl}`);
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof ApiError) {
    return sendError(res, err.status, err.code, err.message, err.details);
  }

  if (err instanceof ZodError) {
    return sendError(
      res,
      400,
      'VALIDATION_ERROR',
      'Some fields need attention',
      err.issues.map((issue) => ({
        field: issue.path.join('.') || '(root)',
        message: issue.message,
      })),
    );
  }

  // Postgres/PostgREST errors that leak through (e.g. unique violation).
  const maybePg = err as { code?: string; message?: string; detail?: string } | null;
  if (maybePg && typeof maybePg.code === 'string') {
    if (maybePg.code === '23505') {
      return sendError(res, 409, 'CONFLICT', 'That record already exists');
    }
    if (maybePg.code === '23503') {
      return sendError(res, 400, 'BAD_REFERENCE', 'Referenced record does not exist');
    }
  }

  console.error('[api] unhandled error:', err);
  return sendError(
    res,
    500,
    'INTERNAL_ERROR',
    'Something went wrong on our side. Please try again.',
  );
}
