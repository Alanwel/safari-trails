/**
 * Database client.
 *
 * Two drivers, one interface:
 *
 *   DATABASE_URL set   -> Postgres (Supabase / Supavisor) via postgres.js
 *   DATABASE_URL empty -> PGlite, an embedded build of real Postgres that
 *                         runs as a WASM module and stores data in a folder.
 *
 * Because PGlite *is* Postgres, the SQL, the types and the queries are
 * identical in both modes. The only difference is where the bytes live.
 */
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import postgres from 'postgres';

import { env } from '../env.js';
import { schema } from './schema.js';
import { splitStatements } from './sql.js';

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

let dbInstance: Database | null = null;
let pgliteInstance: PGlite | null = null;
let postgresInstance: postgres.Sql | null = null;

export type DriverName = 'postgres' | 'pglite';

export function driverName(): DriverName {
  return env.usePostgres ? 'postgres' : 'pglite';
}

/** Connect (once) and return the Drizzle database handle. */
export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  if (env.usePostgres) {
    // `prepare: false` is required when talking to the Supavisor transaction
    // pooler — it does not support prepared statements.
    postgresInstance = postgres(env.DATABASE_URL, {
      max: 5,
      prepare: false,
      idle_timeout: 20,
      connect_timeout: 15,
    });
    dbInstance = drizzlePostgres(postgresInstance, { schema }) as unknown as Database;
  } else {
    const inMemory = env.PGLITE_PATH === ':memory:';
    if (!inMemory) {
      // PGlite creates the final folder but not its parents, so make sure the
      // parent exists first (and fail loudly if the path is not writable).
      mkdirSync(dirname(resolve(env.PGLITE_PATH)), { recursive: true });
    }
    pgliteInstance = await PGlite.create(
      inMemory ? {} : { dataDir: env.PGLITE_PATH },
    ).catch((err: unknown) => {
      throw new Error(
        `Could not open the local PGlite database at "${env.PGLITE_PATH}".\n` +
          `  ${err instanceof Error ? err.message : String(err)}\n` +
          '  Fix: stop the API and run `npm run db:reset` to rebuild it.',
      );
    });
    dbInstance = drizzlePglite(pgliteInstance, { schema }) as unknown as Database;
  }

  return dbInstance;
}

/**
 * Run raw SQL. Used by the migration runner.
 *
 * The file is split into statements *before* it reaches the driver, because
 * some drivers split on every semicolon they see — including the ones
 * inside a `$$ … $$` function body — and send a broken half-statement.
 * See `sql.ts` for the details.
 */
export async function execSql(sqlText: string): Promise<void> {
  const statements = splitStatements(sqlText);

  for (const statement of statements) {
    if (pgliteInstance) {
      await pgliteInstance.exec(statement);
      continue;
    }
    if (postgresInstance) {
      // `.simple()` uses the simple-query protocol, which allows a statement
      // with no parameters and returns plain rows.
      await postgresInstance.unsafe(statement).simple();
      continue;
    }
    throw new Error('Database is not connected yet — call getDb() first.');
  }
}

/** Close the connection (used by tests and graceful shutdown). */
export async function closeDb(): Promise<void> {
  if (postgresInstance) {
    await postgresInstance.end({ timeout: 5 });
    postgresInstance = null;
  }
  if (pgliteInstance) {
    await pgliteInstance.close();
    pgliteInstance = null;
  }
  dbInstance = null;
}
