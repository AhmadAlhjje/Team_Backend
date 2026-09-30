import { type ArgumentMetadata, Injectable, type PipeTransform } from '@nestjs/common';

// Control characters except tab (\t) and line feed (\n).
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const MAX_DEPTH = 8;

/** Keys whose values must be kept byte-for-byte (never trimmed). */
const PRESERVED_KEYS = /password|token|secret/i;

function isPlainObject(value: object): boolean {
  const prototype = Object.getPrototypeOf(value);
  // Express 5 parses query strings into null-prototype objects.
  return prototype === Object.prototype || prototype === null;
}

export function sanitizeString(value: string): string {
  return value.normalize('NFC').replace(/\r\n?/g, '\n').replace(CONTROL_CHARS, '').trim();
}

export function sanitizeValue(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return value;
  if (typeof value === 'string') return sanitizeString(value);
  if (Array.isArray(value)) return value.map((item) => sanitizeValue(item, depth + 1));
  if (value && typeof value === 'object' && isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        PRESERVED_KEYS.test(key) ? item : sanitizeValue(item, depth + 1),
      ]),
    );
  }
  return value;
}

/**
 * Normalizes all incoming body/query strings before validation: Unicode NFC,
 * consistent newlines, no control characters, no surrounding whitespace.
 * Output encoding (React escaping) remains the primary XSS defence; this pipe
 * guarantees clean, predictable data in the database.
 */
@Injectable()
export class SanitizeInputPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    if (metadata.type !== 'body' && metadata.type !== 'query') return value;
    return sanitizeValue(value);
  }
}
