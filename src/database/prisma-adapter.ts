import { PrismaMariaDb } from '@prisma/adapter-mariadb';

/**
 * Creates the MySQL/MariaDB driver adapter used by Prisma Client.
 * Shared by the Nest app and the seed scripts.
 *
 * Driver options can be passed as query parameters on DATABASE_URL, e.g.
 * `?ssl=true` or `?allowPublicKeyRetrieval=true` (MySQL 8 without TLS).
 */
export function createPrismaAdapter(databaseUrl: string, connectionLimit = 10): PrismaMariaDb {
  const url = new URL(databaseUrl);
  if (!url.searchParams.has('connectionLimit')) {
    url.searchParams.set('connectionLimit', String(connectionLimit));
  }
  return new PrismaMariaDb(url.toString());
}
