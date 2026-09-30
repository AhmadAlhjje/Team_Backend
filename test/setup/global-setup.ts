import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { config as loadEnv } from 'dotenv';

import { resolveTestDatabaseUrl } from './test-database.js';

/**
 * Brings the dedicated test database up to date with the migrations before the
 * e2e suite. Each suite then empties the tables it uses (see resetDatabase).
 */
export default function globalSetup(): void {
  loadEnv({ path: ['.env.test'], quiet: true });
  const databaseUrl = resolveTestDatabaseUrl();

  const require = createRequire(import.meta.url);
  const prismaCli = join(dirname(require.resolve('prisma/package.json')), 'build', 'index.js');

  execFileSync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}
