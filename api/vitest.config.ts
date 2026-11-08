import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Each test run gets its own in-memory Postgres, so the development
    // database is never touched.
    env: {
      NODE_ENV: 'test',
      PGLITE_PATH: ':memory:',
      JWT_SECRET: 'test-secret-that-is-long-enough-32',
      ADMIN_EMAIL: 'admin@safaritrails.com',
      ADMIN_PASSWORD: 'SafariTrails2026!',
    },
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
