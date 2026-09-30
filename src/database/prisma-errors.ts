/**
 * Helpers to recognise Prisma errors without depending on class identity
 * (errors can cross module boundaries in tests and with driver adapters).
 */

export interface PrismaKnownError {
  code: string;
  meta?: Record<string, unknown>;
  message: string;
}

export function isPrismaKnownError(error: unknown): error is PrismaKnownError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string' &&
    /^P\d{4}$/.test((error as { code: string }).code)
  );
}

/** Unique constraint violation. */
export const isUniqueViolation = (error: unknown): error is PrismaKnownError =>
  isPrismaKnownError(error) && error.code === 'P2002';

/** Foreign key constraint violation (e.g. deleting a row that is still referenced). */
export const isForeignKeyViolation = (error: unknown): error is PrismaKnownError =>
  isPrismaKnownError(error) && error.code === 'P2003';

/** Record required by the operation was not found. */
export const isRecordNotFound = (error: unknown): error is PrismaKnownError =>
  isPrismaKnownError(error) && error.code === 'P2025';

/**
 * Extracts the columns involved in a unique constraint violation.
 * Prisma reports them in `meta.target` (classic engine) or inside
 * `meta.driverAdapterError.cause.constraint` (driver adapters).
 */
export function uniqueViolationFields(error: PrismaKnownError): string[] {
  const meta = error.meta ?? {};

  const target = meta.target;
  if (Array.isArray(target)) return target.map(String);
  if (typeof target === 'string') return [fieldFromIndexName(target)];

  const cause = (meta.driverAdapterError as { cause?: { constraint?: unknown } } | undefined)?.cause;
  const constraint = cause?.constraint as { fields?: unknown; index?: unknown } | undefined;
  if (Array.isArray(constraint?.fields)) return constraint.fields.map((field) => String(field).replace(/`/g, ''));
  if (typeof constraint?.index === 'string') return [fieldFromIndexName(constraint.index)];

  return [];
}

/** Turns an index name like `projects_slug_key` into `slug`. */
function fieldFromIndexName(indexName: string): string {
  const match = /^[a-z_]+?_([A-Za-z]+)_key$/.exec(indexName);
  return match ? match[1] : indexName;
}
