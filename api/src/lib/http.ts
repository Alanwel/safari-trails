/**
 * Response envelope + error helpers.
 *
 * Every response the API sends has the same shape, so the frontend only ever
 * has to learn one contract:
 *
 *   success -> { "data": <payload>, "error": null, "meta": { ... } }
 *   failure -> { "data": null, "error": { "code", "message", "details" }, "meta": {} }
 */
import type { NextFunction, Request, RequestHandler, Response } from 'express';

export type ApiErrorBody = {
  code: string;
  message: string;
  details?: unknown;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message = 'Bad request', details?: unknown) {
    return new ApiError(400, 'VALIDATION_ERROR', message, details);
  }
  static unauthorized(message = 'Authentication required') {
    return new ApiError(401, 'UNAUTHORIZED', message);
  }
  static forbidden(message = 'You do not have access to this resource') {
    return new ApiError(403, 'FORBIDDEN', message);
  }
  static notFound(message = 'Resource not found') {
    return new ApiError(404, 'NOT_FOUND', message);
  }
  static conflict(message = 'Resource already exists') {
    return new ApiError(409, 'CONFLICT', message);
  }
  static tooMany(message = 'Too many requests, please slow down') {
    return new ApiError(429, 'RATE_LIMITED', message);
  }
  static internal(message = 'Something went wrong on our side') {
    return new ApiError(500, 'INTERNAL_ERROR', message);
  }
}

export type SuccessMeta = Record<string, unknown> | undefined;

export function sendSuccess<T>(res: Response, data: T, meta?: SuccessMeta, status = 200) {
  return res.status(status).json({ data, error: null, meta: meta ?? {} });
}

export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown,
) {
  const error: ApiErrorBody = { code, message };
  if (details !== undefined) error.details = details;
  return res.status(status).json({ data: null, error, meta: {} });
}

/**
 * Wraps an async handler so a rejected promise reaches Express' error
 * middleware instead of hanging the request. (Express 4 does not await
 * handlers; Express 5 does. We target Express 4, so we wrap manually.)
 */
export function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
