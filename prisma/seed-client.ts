import { config as loadEnv } from 'dotenv';

import { createPrismaAdapter } from '../src/database/prisma-adapter.js';
import { PrismaClient } from '../src/generated/prisma/client.js';

loadEnv({ path: ['.env.local', '.env'], quiet: true });

export function createSeedClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set. See .env.example.');
  return new PrismaClient({ adapter: createPrismaAdapter(url, 2) });
}

export function log(message: string): void {
  process.stdout.write(`[seed] ${message}\n`);
}

/** Returns the ids of the given technologies, creating the missing ones. */
export async function ensureTechnologies(prisma: PrismaClient, names: string[]): Promise<number[]> {
  const ids: number[] = [];
  for (const name of names) {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const technology = await prisma.technology.upsert({ where: { slug }, update: {}, create: { name, slug } });
    ids.push(technology.id);
  }
  return ids;
}
