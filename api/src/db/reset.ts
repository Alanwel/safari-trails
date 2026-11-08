/**
 * Full local reset: drop every table, re-apply the schema, re-seed.
 *
 *   npm run db:reset
 *
 * We drop tables with SQL rather than deleting the PGlite data folder,
 * because on a network filesystem the OS can hold a deleted-but-open file
 * for a while and the delete fails with EBUSY.
 *
 * Only touches the local PGlite database. When DATABASE_URL points at
 * Supabase, this script refuses to run — use the SQL Editor for that.
 */
import { env } from '../env.js';
import { closeDb, execSql, getDb } from './client.js';
import { repoPath } from './paths.js';
import { seed } from '../seed/seed.js';
import { readFileSync } from 'node:fs';

const TABLES = [
  'tour_images',
  'tour_days',
  'reviews',
  'bookings',
  'inquiries',
  'tours',
  'destinations',
  'admin_users',
];

async function main() {
  if (env.usePostgres) {
    console.error(
      '[reset] DATABASE_URL is set — this script only resets the LOCAL database.\n' +
        '        To reset Supabase, run supabase/schema.sql in the SQL Editor.',
    );
    process.exit(1);
  }

  await closeDb();
  await getDb();

  console.log('[reset] dropping tables…');
  await execSql(
    TABLES.map((table) => `drop table if exists ${table} cascade;`).join('\n'),
  );

  console.log('[reset] applying schema…');
  await execSql(readFileSync(repoPath('supabase', 'schema.sql'), 'utf8'));

  console.log('[reset] seeding…');
  await seed();

  await closeDb();
  console.log('[reset] done.');
}

main().catch((err) => {
  console.error('[reset] failed:', err);
  process.exit(1);
});
