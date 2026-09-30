/**
 * Production entry point (`npm run start:prod`):
 *
 *   load environment → wait for the database → prisma migrate deploy → start NestJS
 *
 * - Migrations are applied with `migrate deploy` (never `migrate dev`).
 * - The seed is NOT run here; it is a separate, manual step (`npm run db:seed`).
 * - Set SKIP_MIGRATIONS=true when migrations are applied by a CI/CD step instead
 *   (e.g. several backend instances starting at once).
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import net from 'node:net';
import { dirname, join } from 'node:path';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: ['.env.local', '.env'], quiet: true });

const DB_WAIT_ATTEMPTS = Number(process.env.DB_WAIT_ATTEMPTS ?? 30);
const DB_WAIT_DELAY_MS = Number(process.env.DB_WAIT_DELAY_MS ?? 2000);

function log(message) {
  process.stdout.write(
    `${JSON.stringify({ level: 'info', time: new Date().toISOString(), context: 'Startup', msg: message })}\n`,
  );
}

function fail(message) {
  process.stderr.write(
    `${JSON.stringify({ level: 'fatal', time: new Date().toISOString(), context: 'Startup', msg: message })}\n`,
  );
  process.exit(1);
}

function canConnect(host, port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port, timeout: 3000 });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function waitForDatabase() {
  const raw = process.env.DATABASE_URL;
  if (!raw) fail('DATABASE_URL is not set');

  const url = new URL(raw);
  const host = url.hostname;
  const port = Number(url.port || 3306);

  for (let attempt = 1; attempt <= DB_WAIT_ATTEMPTS; attempt += 1) {
    if (await canConnect(host, port)) {
      log(`Database reachable at ${host}:${port}`);
      return;
    }
    log(`Waiting for database at ${host}:${port} (attempt ${attempt}/${DB_WAIT_ATTEMPTS})`);
    await new Promise((resolve) => setTimeout(resolve, DB_WAIT_DELAY_MS));
  }
  fail(`Database at ${host}:${port} is unreachable`);
}

function applyMigrations() {
  if (process.env.SKIP_MIGRATIONS === 'true') {
    log('SKIP_MIGRATIONS=true — not applying migrations');
    return;
  }
  const require = createRequire(import.meta.url);
  const prismaCli = join(dirname(require.resolve('prisma/package.json')), 'build', 'index.js');

  log('Applying database migrations (prisma migrate deploy)');
  const result = spawnSync(process.execPath, [prismaCli, 'migrate', 'deploy'], { stdio: 'inherit' });
  if (result.status !== 0) fail('Database migrations failed — the API was not started');
}

await waitForDatabase();
applyMigrations();

log('Starting API');
await import('../dist/main.js');
