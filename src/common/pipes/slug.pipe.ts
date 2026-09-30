import { HttpStatus, Injectable, type PipeTransform } from '@nestjs/common';

import { AppException, ErrorCode } from '../errors/app-exception.js';
import { SLUG_PATTERN } from '../validation/decorators.js';

/** Rejects malformed slugs before they reach the database. */
@Injectable()
export class SlugPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (typeof value !== 'string' || value.length > 160 || !SLUG_PATTERN.test(value)) {
      throw new AppException(HttpStatus.NOT_FOUND, ErrorCode.NotFound, 'Not found');
    }
    return value;
  }
}
