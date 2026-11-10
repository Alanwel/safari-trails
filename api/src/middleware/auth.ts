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
import { eq } from 'drizzle-orm';

import { env } from '../env.js';
import { getDb } from '../db/client.js';
import { adminUsers } from '../db/schema.js';
import { ApiError } from '../lib/http.js';

export type AdminClaims = {
  sub: string;
  email: string;
  name: string;
  role: string;
  /** When the token was issued (seconds since the epoch), as JWTs carry it. */
  iat?: number;
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

/**
 * Express middleware: rejects the request unless a valid admin token is present.
 *
 * It is async because it checks the token against the database (to see
 * whether the password changed after the token was issued). Express 4 does
 * not await middleware, so every path here calls next() explicitly and any
 * unexpected error is passed to next(err).
 */
export async function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Sign in to continue'));
  }

  let claims: AdminClaims;
  try {
    claims = verifyAdminToken(header.slice('Bearer '.length).trim());
  } catch {
    return next(ApiError.unauthorized('Your session has expired — please sign in again'));
  }

  // Changing the password must really lock the old session out. The JWT
  // says when it was issued; the database says when the password last
  // changed. A token older than that is refused.
  try {
    const db = await getDb();
    const [admin] = await db
      .select({ passwordChangedAt: adminUsers.passwordChangedAt })
      .from(adminUsers)
      .where(eq(adminUsers.id, Number(claims.sub)))
      .limit(1);

    if (!admin) {
      return next(ApiError.unauthorized('That account no longer exists'));
    }
    const issuedAt = claims.iat ?? 0;
    if (
      admin.passwordChangedAt &&
      admin.passwordChangedAt.getTime() > issuedAt * 1000
    ) {
      return next(
        ApiError.unauthorized('Your password has changed — please sign in again'),
      );
    }
  } catch (err) {
    if (err instanceof ApiError) return next(err);
    return next(err);
  }

  req.admin = claims;
  return next();
}
