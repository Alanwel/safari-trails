/**
 * Environment loading + validation.
 *
 * Everything the process needs is parsed *once*, here, and validated with Zod.
 * If a required value is missing the process refuses to boot with a readable
 * message instead of failing later with `undefined is not a function`.
 */
import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),

  /** Postgres connection string. Empty => use the embedded PGlite database. */
  DATABASE_URL: z.string().optional().default(''),
  /** Where PGlite keeps its data folder (local dev only). */
  PGLITE_PATH: z.string().optional().default('./.data/pglite'),

  /** Signing secret for admin JWTs. */
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),

  /** Allowed browser origins for CORS, comma separated. "*" allows any. */
  CORS_ORIGIN: z.string().optional().default('*'),

  /** Seeded admin account. */
  ADMIN_EMAIL: z.string().default('admin@safaritrails.com'),
  ADMIN_PASSWORD: z.string().default('SafariTrails2026!'),

  /** Supabase — only required for Storage uploads. */
  SUPABASE_URL: z.string().optional().default(''),
  SUPABASE_ANON_KEY: z.string().optional().default(''),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(''),

  /**
   * Password of the low-privilege machine account the API signs in as to
   * upload images. Deliberately NOT the service role key — see
   * src/lib/storage.ts for why least privilege wins here.
   */
  CMS_STORAGE_PASSWORD: z.string().optional().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('\n');
  console.error(`\n[env] Invalid environment:\n${issues}\n`);
  console.error('Copy api/.env.example to api/.env and fill it in.\n');
  process.exit(1);
}

const raw = parsed.data;

export const env = {
  ...raw,
  isProduction: raw.NODE_ENV === 'production',
  isTest: raw.NODE_ENV === 'test',
  /** true when we should talk to a real Postgres (Supabase) instead of PGlite. */
  usePostgres: raw.DATABASE_URL.trim().length > 0,
  corsOrigins: raw.CORS_ORIGIN.trim() === '*'
    ? ('*' as const)
    : raw.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean),
};

export type Env = typeof env;
