import { validateEnv } from '../../config/env.validation.js';
import { computeYearsOfExperience } from '../../modules/stats/stats.service.js';
import { fromDateOnly, nextSortOrder, slugify, toDateOnly, uniqueNames } from './content.js';
import { parseDuration } from './duration.js';

describe('parseDuration', () => {
  it.each([
    ['15m', 900_000],
    ['7d', 604_800_000],
    ['3600s', 3_600_000],
    ['900', 900_000],
    ['250ms', 250],
  ])('%s → %d ms', (input, expected) => expect(parseDuration(input)).toBe(expected));

  it('rejects invalid values', () => expect(() => parseDuration('soon')).toThrow());
});

describe('content helpers', () => {
  it('deduplicates names case-insensitively, keeping order and first spelling', () => {
    expect(uniqueNames([' React ', 'react', 'NestJS', '', 'REACT', 'Prisma'])).toEqual(['React', 'NestJS', 'Prisma']);
  });

  it('slugifies technology names', () => {
    expect(slugify('Next.js')).toBe('next-js');
    expect(slugify('C#')).toBe('c-sharp');
    expect(slugify('C++')).toBe('c-plus-plus');
    expect(slugify('  Node JS  ')).toBe('node-js');
  });

  it('round-trips date-only values without timezone drift', () => {
    const date = toDateOnly('2026-02-28');
    expect(date?.toISOString()).toBe('2026-02-28T00:00:00.000Z');
    expect(fromDateOnly(date ?? null)).toBe('2026-02-28');
    expect(toDateOnly(null)).toBeNull();
    expect(toDateOnly(undefined)).toBeUndefined();
  });

  it('appends new items at the end', () => {
    expect(nextSortOrder({ _max: { sortOrder: null } })).toBe(0);
    expect(nextSortOrder({ _max: { sortOrder: 4 } })).toBe(5);
  });
});

describe('computeYearsOfExperience', () => {
  const now = new Date('2026-09-29T00:00:00Z');
  it('is derived from the founding year only', () => {
    expect(computeYearsOfExperience(2020, now)).toBe(6);
    expect(computeYearsOfExperience(null, now)).toBeNull();
  });
  it('hides values below one year', () => expect(computeYearsOfExperience(2026, now)).toBeNull());
});

describe('validateEnv', () => {
  const valid = {
    DATABASE_URL: 'mysql://u:p@localhost:3306/db',
    JWT_SECRET: 'x'.repeat(32),
    STORAGE_PUBLIC_URL: 'https://api.example.com/uploads',
  };

  it('applies defaults and converts types', () => {
    const env = validateEnv({ ...valid, PORT: '5000', SWAGGER_ENABLED: 'false' });
    expect(env.PORT).toBe(5000);
    expect(env.SWAGGER_ENABLED).toBe(false);
    expect(env.JWT_EXPIRES_IN).toBe('15m');
  });

  it('rejects weak secrets and invalid URLs', () => {
    expect(() => validateEnv({ ...valid, JWT_SECRET: 'short' })).toThrow(/JWT_SECRET/);
    expect(() => validateEnv({ ...valid, DATABASE_URL: 'postgres://x' })).toThrow(/DATABASE_URL/);
  });

  it('requires a strong revalidation secret when the webhook is configured', () => {
    expect(() => validateEnv({ ...valid, FRONTEND_REVALIDATE_URL: 'https://example.com/api/revalidate' })).toThrow(
      /REVALIDATE_SECRET/,
    );
  });

  it('forbids a wildcard CORS origin in production', () => {
    expect(() => validateEnv({ ...valid, NODE_ENV: 'production', CORS_ORIGINS: '*' })).toThrow(/CORS_ORIGINS/);
  });
});
