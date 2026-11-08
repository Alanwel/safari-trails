import type { AdminClaims } from '../middleware/auth.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Set by `requireAdmin` when a valid admin bearer token is present. */
      admin?: AdminClaims;
    }
  }
}

export {};
