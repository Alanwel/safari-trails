/**
 * Local entry point.
 *
 * Binds a port and starts listening. For serverless deployment use
 * `src/server.ts`, which exports the app instead.
 */
import { env } from './env.js';
import { closeDb, driverName, getDb } from './db/client.js';
import { app } from './server.js';

async function main() {
  console.log(
    `[api] connecting to ${driverName() === 'postgres' ? 'Postgres (Supabase)' : 'PGlite (local)'}…`,
  );
  await getDb();
  console.log('[api] database ready');

  const server = app.listen(env.PORT, () => {
    console.log(`[api] listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
    console.log(`[api] health check: http://localhost:${env.PORT}/api/health`);
  });

  const shutdown = async (signal: string) => {
    console.log(`\n[api] ${signal} received — shutting down`);
    server.close(async () => {
      await closeDb();
      process.exit(0);
    });
    // Never hang forever on a stuck connection.
    setTimeout(() => process.exit(1), 8000).unref();
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('[api] failed to start:', err);
  process.exit(1);
});
