import type { ValidationError } from '@nestjs/common';

import { sanitizeString, sanitizeValue } from './sanitize-input.pipe.js';
import { flattenValidationErrors } from './validation.pipe.js';

describe('sanitizeString', () => {
  it('trims, normalizes newlines and removes control characters', () => {
    expect(sanitizeString('  hello\r\nworld\u0000\u0007  ')).toBe('hello\nworld');
  });

  it('keeps tabs, newlines and Arabic text intact', () => {
    expect(sanitizeString('مرحبا\tبكم\nفي الموقع')).toBe('مرحبا\tبكم\nفي الموقع');
  });

  it('normalizes Unicode to NFC', () => {
    expect(sanitizeString('é')).toBe('é');
  });
});

describe('sanitizeValue', () => {
  it('sanitizes nested objects and arrays but never touches passwords or tokens', () => {
    const result = sanitizeValue({
      name: '  Ahmad ',
      password: '  secret  ',
      refreshToken: ' tok ',
      skills: [' React ', ' NestJS'],
      nested: { note: ' x ' },
    });
    expect(result).toEqual({
      name: 'Ahmad',
      password: '  secret  ',
      refreshToken: ' tok ',
      skills: ['React', 'NestJS'],
      nested: { note: 'x' },
    });
  });

  it('handles null-prototype objects (Express 5 query strings)', () => {
    const query = Object.assign(Object.create(null) as Record<string, string>, { search: '  term ' });
    expect(sanitizeValue(query)).toEqual({ search: 'term' });
  });
});

describe('flattenValidationErrors', () => {
  it('produces dotted paths for nested errors', () => {
    const errors = [
      { property: 'title', constraints: { isString: 'title must be a string' }, children: [] },
      {
        property: 'members',
        children: [
          { property: '0', children: [{ property: 'role', constraints: { maxLength: 'too long' }, children: [] }] },
        ],
      },
    ] as unknown as ValidationError[];

    expect(flattenValidationErrors(errors)).toEqual([
      { field: 'title', messages: ['title must be a string'] },
      { field: 'members.0.role', messages: ['too long'] },
    ]);
  });
});
