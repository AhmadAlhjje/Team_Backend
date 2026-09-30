/**
 * The e2e suite resets its database on every run, so it must never point at a
 * real database: the database name has to contain "test".
 */
export function resolveTestDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      'TEST_DATABASE_URL is not set. Create backend/.env.test from .env.test.example ' +
        '(e.g. TEST_DATABASE_URL="mysql://root:root@127.0.0.1:3306/team_platform_test").',
    );
  }
  const database = new URL(url).pathname.slice(1);
  if (!/test/i.test(database)) {
    throw new Error(`Refusing to run e2e tests against "${database}": the database name must contain "test".`);
  }
  return url;
}
