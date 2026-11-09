/**
 * Provision a REMOTE database.
 *
 *   DATABASE_URL="postgresql://..." npm run db:provision
 *
 * Applies `supabase/schema.sql`, then `supabase/rls.sql`, then seeds the
 * catalogue — against a hosted Postgres (Supabase) rather than the local
 * PGlite database.
 *
 * `npm run db:reset` does the same thing for the LOCAL database and refuses
 * to touch a remote one. This script is the remote counterpart.
 */
import { readFileSync } from 'node:fs';

import { count } from 'drizzle-orm';

import { closeDb, execSql, getDb } from './client.js';
import { repoPath } from './paths.js';
import { env } from '../env.js';
import { seed } from '../seed/seed.js';
import {
  adminUsers,
  bookings,
  destinations,
  inquiries,
  reviews,
  tourDays,
  tourImages,
  tours,
} from './schema.js';

async function main() {
  if (!env.usePostgres) {
    console.error(
      '[provision] DATABASE_URL is not set.\n' +
        '          This script provisions a REMOTE database. Use `npm run db:reset` for the local one.',
    );
    process.exit(1);
  }

  const db = await getDb();
  console.log('[provision] connected');

  console.log('[provision] applying supabase/schema.sql …');
  await execSql(readFileSync(repoPath('supabase', 'schema.sql'), 'utf8'));

  console.log('[provision] applying supabase/rls.sql …');
  await execSql(readFileSync(repoPath('supabase', 'rls.sql'), 'utf8'));

  console.log('[provision] seeding …');
  await seed();

  const tally = async (label: string, table: any) => {
    const [row] = await db.select({ v: count() }).from(table);
    console.log(`  ${label.padEnd(13)}: ${row?.v ?? 0}`);
    return Number(row?.v ?? 0);
  };

  console.log('\n[provision] verification');
  await tally('destinations', destinations);
  await tally('tours', tours);
  await tally('tour_days', tourDays);
  await tally('tour_images', tourImages);
  await tally('reviews', reviews);
  await tally('bookings', bookings);
  await tally('inquiries', inquiries);
  await tally('admin_users', adminUsers);

  await closeDb();
  console.log('\n[provision] done.');
  // postgres.js can leave a socket open after end(); exit explicitly so the
  // script always terminates.
  process.exit(0);
}

main().catch((err) => {
  console.error('[provision] failed:', err);
  process.exit(1);
});
