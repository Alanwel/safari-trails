import { Router } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

import { getDb } from '../db/client.js';
import { adminUsers } from '../db/schema.js';
import { ApiError, asyncHandler, sendSuccess } from '../lib/http.js';
import { requireAdmin, signAdminToken } from '../middleware/auth.js';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1, 'Enter your password'),
});

/** POST /api/auth/login — exchange email + password for a JWT. */
authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const input = loginSchema.parse(req.body);

    const [admin] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, input.email.toLowerCase()))
      .limit(1);

    // Same message whether the account is missing or the password is wrong —
    // that way the endpoint cannot be used to enumerate valid accounts.
    if (!admin) {
      throw ApiError.unauthorized('Incorrect email or password');
    }

    const ok = await bcrypt.compare(input.password, admin.passwordHash);
    if (!ok) {
      throw ApiError.unauthorized('Incorrect email or password');
    }

    const token = signAdminToken({
      sub: String(admin.id),
      email: admin.email,
      name: admin.name,
      role: admin.role,
    });

    return sendSuccess(res, {
      token,
      admin: { name: admin.name, email: admin.email, role: admin.role },
    });
  }),
);

/**
 * GET /api/auth/me — who am I?
 *
 * The JWT already carries the operator's identity, so this needs no database
 * round trip: the token IS the answer. It exists so the admin panel can show
 * a name after a page reload, when the in-memory login response is gone.
 */
authRouter.get(
  '/me',
  requireAdmin,
  asyncHandler(async (req, res) => {
    // `requireAdmin` guarantees this, but the type of `req.admin` is optional
    // because Express cannot know which middleware ran. Check rather than
    // assert with `!`.
    const admin = req.admin;
    if (!admin) throw ApiError.unauthorized('Sign in to continue');

    return sendSuccess(res, {
      admin: {
        id: Number(admin.sub),
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    });
  }),
);
