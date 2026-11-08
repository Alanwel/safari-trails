/**
 * Apply the database schema.
 *
 *   npm run db:reset   (drops everything, re-applies schema.sql, re-seeds)
 *
 * Runs `supabase/schema.sql` — the very same file you paste into the
 * Supabase SQL Editor. There is no second copy of the schema to drift.
 */
import { readFileSync } from 'node:fs';

import { execSql, getDb, driverName, closeDb } from './client.js';
import { repoPath } from './paths.js';

async function main() {
  const driver = driverName();
  await getDb();

  const schemaFile = repoPath('supabase', 'schema.sql');
  console.log(`[migrate] driver=${driver}`);
  console.log(`[migrate] applying ${schemaFile}`);

  // Read the file — execSql() wants SQL text, not a path.
  await execSql(readFileSync(schemaFile, 'utf8'));

  console.log('[migrate] done — schema is up to date.');
  await closeDb();
}

main().catch((err) => {
  console.error('[migrate] failed:', err);
  process.exit(1);
});
