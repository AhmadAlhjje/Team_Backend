import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsUrl, Matches, MaxLength, registerDecorator, type ValidationOptions } from 'class-validator';

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Lowercase latin slug: `my-project-2`. */
export const IsSlug = (maxLength = 160) =>
  applyDecorators(
    Matches(SLUG_PATTERN, {
      message: '$property must contain only lowercase latin letters, digits and single hyphens',
    }),
    MaxLength(maxLength),
  );

/** Absolute http(s) URL. Rejects javascript:, data: and other schemes. */
export const IsHttpUrl = (maxLength = 500) =>
  applyDecorators(
    IsUrl(
      { protocols: ['http', 'https'], require_protocol: true, require_tld: false },
      { message: '$property must be a valid http(s) URL' },
    ),
    MaxLength(maxLength),
  );

/** Calendar date in `YYYY-MM-DD` format. */
export function IsDateOnly(options?: ValidationOptions): PropertyDecorator {
  return (target, propertyName) =>
    registerDecorator({
      name: 'isDateOnly',
      target: target.constructor,
      propertyName: propertyName as string,
      options: { message: '$property must be a date in YYYY-MM-DD format', ...options },
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
          const date = new Date(`${value}T00:00:00.000Z`);
          return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
        },
      },
    });
}

/** Converts empty strings to `null`, so optional fields can be cleared from forms. */
export const EmptyToNull = () => Transform(({ value }: { value: unknown }) => (value === '' ? null : value));

export const ToLowerCase = () =>
  Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.toLowerCase() : value));

/** Parses query-string booleans ("true"/"false"). */
export const ToBoolean = () =>
  Transform(({ value }: { value: unknown }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  });

/** Parses query-string integers. */
export const ToInt = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && /^-?\d+$/.test(value) ? Number(value) : value,
  );
