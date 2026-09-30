import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Same precedence as the Nest app: real env vars > .env.local > .env
loadEnv({ path: ['.env.local', '.env'], quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Not required for `prisma generate`; required for migrate/seed commands.
    url: process.env.DATABASE_URL ?? '',
  },
});
