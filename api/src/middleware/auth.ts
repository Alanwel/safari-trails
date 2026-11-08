/**
 * Admin authentication.
 *
 * We issue our own JWT instead of using Supabase Auth, for one reason: the
 * exact same code path then works locally (PGlite) and in production
 * (Supabase Postgres) with no second auth system to configure.
 *
 * Flow:
 *   1. POST /api/auth/login  { email, password }
 *   2. Server verifies the bcrypt hash -> signs a JWT (12h)
 *   3. Client sends `Authorization: Bearer <token>` on every admin request
 *   4. `requireAdmin` verifies the signature and attaches `req.admin`
 */
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { env } from '../env.js';
import { ApiError } from '../lib/http.js';

export type AdminClaims = {
  sub: string;
  email: string;
  name: string;
  role: string;
};

const TOKEN_TTL_SECONDS = 60 * 60 * 12; // 12 hours

export function signAdminToken(claims: AdminClaims): string {
  return jwt.sign(claims, env.JWT_SECRET, {
    expiresIn: TOKEN_TTL_SECONDS,
    issuer: 'safari-trails-api',
  });
}

export function verifyAdminToken(token: string): AdminClaims {
  const payload = jwt.verify(token, env.JWT_SECRET, { issuer: 'safari-trails-api' });
  if (typeof payload === 'string' || !payload.sub) {
    throw ApiError.unauthorized('Invalid session token');
  }
  return payload as AdminClaims;
}

/** Express middleware: rejects the request unless a valid admin token is present. */
export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Sign in to continue'));
  }

  try {
    req.admin = verifyAdminToken(header.slice('Bearer '.length).trim());
    return next();
  } catch {
    return next(ApiError.unauthorized('Your session has expired — please sign in again'));
  }
}
