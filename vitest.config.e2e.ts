import { config as loadEnv } from 'dotenv';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

import { resolveTestDatabaseUrl } from './test/setup/test-database.js';

// TEST_DATABASE_URL comes from the environment or .env.test (see .env.test.example).
loadEnv({ path: ['.env.test'], quiet: true });

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    globalSetup: ['./test/setup/global-setup.ts'],
    setupFiles: ['./test/setup/silence-logs.ts'],
    // All suites share one database: run files sequentially.
    fileParallelism: false,
    hookTimeout: 60_000,
    testTimeout: 30_000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: resolveTestDatabaseUrl(),
      JWT_SECRET: 'e2e-test-secret-0123456789abcdefghijklmnop',
      JWT_EXPIRES_IN: '15m',
      REFRESH_TOKEN_EXPIRES_IN: '7d',
      CORS_ORIGINS: 'http://localhost:3000',
      STORAGE_PUBLIC_URL: 'http://localhost:4000/uploads',
      STORAGE_LOCAL_DIR: join(tmpdir(), 'team-platform-e2e-uploads'),
      SWAGGER_ENABLED: 'false',
      LOG_LEVEL: 'silent',
    },
  },
});
