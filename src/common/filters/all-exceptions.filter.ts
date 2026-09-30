import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';

import {
  isForeignKeyViolation,
  isPrismaKnownError,
  isRecordNotFound,
  isUniqueViolation,
  uniqueViolationFields,
} from '../../database/prisma-errors.js';
import { ErrorCode, type FieldError } from '../errors/app-exception.js';

export interface ErrorResponseBody {
  statusCode: number;
  code: ErrorCode;
  error: string;
  message: string;
  details?: FieldError[];
  requestId?: string;
  path: string;
  timestamp: string;
}

interface NormalizedError {
  status: number;
  code: ErrorCode;
  message: string;
  details?: FieldError[];
}

const STATUS_CODES: Partial<Record<number, ErrorCode>> = {
  400: ErrorCode.BadRequest,
  401: ErrorCode.Unauthorized,
  403: ErrorCode.Forbidden,
  404: ErrorCode.NotFound,
  409: ErrorCode.Conflict,
  413: ErrorCode.PayloadTooLarge,
  429: ErrorCode.TooManyRequests,
  503: ErrorCode.ServiceUnavailable,
};

/**
 * Converts every thrown error into one consistent JSON shape and makes sure
 * internal details (stack traces, SQL) never reach the client.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request & { id?: string }>();
    const response = context.getResponse<Response>();

    const normalized = this.normalize(exception);

    if (normalized.status >= 500) {
      this.logger.error(
        { err: exception, requestId: request.id, path: request.url },
        exception instanceof Error ? exception.message : 'Unhandled exception',
      );
    }

    const body: ErrorResponseBody = {
      statusCode: normalized.status,
      code: normalized.code,
      error: HttpStatus[normalized.status] ?? 'Error',
      message: normalized.message,
      details: normalized.details,
      requestId: request.id,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(normalized.status).json(body);
  }

  private normalize(exception: unknown): NormalizedError {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const fallbackCode = STATUS_CODES[status] ?? (status >= 500 ? ErrorCode.InternalError : ErrorCode.BadRequest);

      if (typeof payload === 'object' && payload !== null) {
        const { code, message, details } = payload as {
          code?: ErrorCode;
          message?: string | string[];
          details?: FieldError[];
        };
        return {
          status,
          code: code ?? fallbackCode,
          message: Array.isArray(message) ? message.join('; ') : (message ?? exception.message),
          details,
        };
      }
      return { status, code: fallbackCode, message: String(payload) };
    }

    if (isUniqueViolation(exception)) {
      const fields = uniqueViolationFields(exception);
      return {
        status: HttpStatus.CONFLICT,
        code: ErrorCode.DuplicateValue,
        message: fields.length ? `A record with this ${fields.join(', ')} already exists` : 'Duplicate value',
        details: fields.map((field) => ({ field, messages: ['must be unique'] })),
      };
    }

    if (isForeignKeyViolation(exception)) {
      return {
        status: HttpStatus.CONFLICT,
        code: ErrorCode.InUse,
        message: 'This record is referenced by other records and cannot be removed',
      };
    }

    if (isRecordNotFound(exception)) {
      return { status: HttpStatus.NOT_FOUND, code: ErrorCode.NotFound, message: 'Record not found' };
    }

    if (isPrismaKnownError(exception)) {
      return { status: HttpStatus.INTERNAL_SERVER_ERROR, code: ErrorCode.InternalError, message: 'Database error' };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCode.InternalError,
      message: 'Internal server error',
    };
  }
}
