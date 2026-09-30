import { ContentStatus } from '../../generated/prisma/enums.js';

/** Default ordering for every sortable content list. */
export const bySortOrder = [{ sortOrder: 'asc' as const }, { id: 'asc' as const }];

export const publishedOnly = { status: ContentStatus.PUBLISHED };

/** Returns the next sortOrder value (appends new items at the end). */
export function nextSortOrder(current: { _max: { sortOrder: number | null } }): number {
  return (current._max.sortOrder ?? -1) + 1;
}

/** Converts `YYYY-MM-DD` (or null/undefined) into a Date for @db.Date columns. */
export function toDateOnly(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return new Date(`${value}T00:00:00.000Z`);
}

/** Serializes a @db.Date value back to `YYYY-MM-DD`. */
export function fromDateOnly(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

/**
 * Removes duplicates (case-insensitive) and empty values while keeping order.
 * Used for tag-like inputs such as skills and technologies.
 */
export function uniqueNames(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values) {
    const value = raw.trim();
    const key = value.toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

/** Builds a URL-safe slug from latin text: "Next.js" → "next-js", "C#" → "c-sharp". */
export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/#/g, '-sharp')
    .replace(/\+/g, '-plus')
    .replace(/[^a-z0-9؀-ۿ]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}
