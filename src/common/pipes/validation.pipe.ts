import { HttpStatus, ValidationPipe, type ValidationError } from '@nestjs/common';

import { AppException, ErrorCode, type FieldError } from '../errors/app-exception.js';

/** Flattens nested class-validator errors into `{ field: "members.0.role", messages }`. */
export function flattenValidationErrors(errors: ValidationError[], parentPath = ''): FieldError[] {
  return errors.flatMap((error) => {
    const path = parentPath ? `${parentPath}.${error.property}` : error.property;
    const own: FieldError[] = error.constraints ? [{ field: path, messages: Object.values(error.constraints) }] : [];
    return [...own, ...flattenValidationErrors(error.children ?? [], path)];
  });
}

/**
 * Global validation: unknown properties are rejected, payloads are transformed
 * into DTO instances, and errors use the standard error body.
 */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: false },
    validationError: { target: false, value: false },
    exceptionFactory: (errors) =>
      new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.ValidationFailed,
        'Validation failed',
        flattenValidationErrors(errors),
      ),
  });
}
