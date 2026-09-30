import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Machine-readable error codes returned in every error response (`code`).
 * Clients (Admin) map these to localized messages; `message` stays English
 * and developer-oriented.
 */
export const ErrorCode = {
  ValidationFailed: 'VALIDATION_FAILED',
  BadRequest: 'BAD_REQUEST',
  Unauthorized: 'UNAUTHORIZED',
  InvalidCredentials: 'INVALID_CREDENTIALS',
  InvalidRefreshToken: 'INVALID_REFRESH_TOKEN',
  Forbidden: 'FORBIDDEN',
  NotFound: 'NOT_FOUND',
  Conflict: 'CONFLICT',
  DuplicateValue: 'DUPLICATE_VALUE',
  InUse: 'IN_USE',
  InvalidReference: 'INVALID_REFERENCE',
  ConsentRequired: 'CONSENT_REQUIRED',
  LastSuperAdmin: 'LAST_SUPER_ADMIN',
  SelfModification: 'SELF_MODIFICATION',
  InvalidFile: 'INVALID_FILE',
  InvalidEncoding: 'INVALID_ENCODING',
  PayloadTooLarge: 'PAYLOAD_TOO_LARGE',
  TooManyRequests: 'TOO_MANY_REQUESTS',
  ServiceUnavailable: 'SERVICE_UNAVAILABLE',
  InternalError: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export interface FieldError {
  field: string;
  messages: string[];
}

export interface AppExceptionBody {
  code: ErrorCode;
  message: string;
  details?: FieldError[];
}

export class AppException extends HttpException {
  constructor(status: HttpStatus, code: ErrorCode, message: string, details?: FieldError[]) {
    super({ code, message, details } satisfies AppExceptionBody, status);
  }

  static notFound(entity: string): AppException {
    return new AppException(HttpStatus.NOT_FOUND, ErrorCode.NotFound, `${entity} not found`);
  }

  static inUse(message: string): AppException {
    return new AppException(HttpStatus.CONFLICT, ErrorCode.InUse, message);
  }

  static invalidReference(field: string, message: string): AppException {
    return new AppException(HttpStatus.BAD_REQUEST, ErrorCode.InvalidReference, message, [
      { field, messages: [message] },
    ]);
  }
}
