/**
 * The Express app, without a listener.
 *
 * This is the entry point Vercel uses: serverless platforms want a request
 * handler they can call, not a process that binds a port.
 *
 * Locally, `src/index.ts` imports this and calls `app.listen()`.
 */
import { createApp } from './app.js';
import { getDb } from './db/client.js';

export const app = createApp();

// Start connecting to the database as soon as the module loads, so the first
// request does not pay for a cold connection.
void getDb().catch((err) => {
  console.error('[api] could not connect to the database on boot:', err);
});

export default app;
