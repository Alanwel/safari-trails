/**
 * Locate files that live outside this package (repo-root level files such as
 * `supabase/schema.sql`).
 *
 * We walk up from this module until we find a directory that contains a
 * `supabase` folder. That works from `src/db/paths.ts` (tsx, dev) and from
 * `dist/db/paths.js` (built) without duplicating the SQL into two packages.
 */
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function repoRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));

  for (let i = 0; i < 8; i += 1) {
    if (existsSync(join(dir, 'supabase', 'schema.sql'))) return dir;
    const parent = resolve(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }

  throw new Error(
    'Could not locate the repo root (no supabase/schema.sql found walking up).',
  );
}

export function repoPath(...parts: string[]): string {
  return join(repoRoot(), ...parts);
}
