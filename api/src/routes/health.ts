import { Router } from 'express';

import { driverName, getDb } from '../db/client.js';
import { sendSuccess } from '../lib/http.js';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  let database = 'unknown';

  try {
    await getDb();
    database = driverName() === 'postgres' ? 'postgres (supabase)' : 'pglite (local)';
  } catch {
    database = 'unreachable';
  }

  return sendSuccess(res, {
    status: 'ok',
    service: 'safari-trails-api',
    database,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});
