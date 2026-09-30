import { type ArgumentsHost, HttpStatus, NotFoundException } from '@nestjs/common';

import { AppException, ErrorCode } from '../errors/app-exception.js';
import { AllExceptionsFilter, type ErrorResponseBody } from './all-exceptions.filter.js';

function run(exception: unknown): { status: number; body: ErrorResponseBody } {
  const result = { status: 0, body: {} as ErrorResponseBody };
  const response = {
    status: (code: number) => {
      result.status = code;
      return { json: (body: ErrorResponseBody) => (result.body = body) };
    },
  };
  const host = {
    switchToHttp: () => ({ getRequest: () => ({ id: 'req-1', url: '/api/v1/x' }), getResponse: () => response }),
  } as unknown as ArgumentsHost;
  new AllExceptionsFilter().catch(exception, host);
  return result;
}

describe('AllExceptionsFilter', () => {
  it('keeps the code and details of application errors', () => {
    const { status, body } = run(
      new AppException(HttpStatus.BAD_REQUEST, ErrorCode.ValidationFailed, 'Validation failed', [
        { field: 'slug', messages: ['bad'] },
      ]),
    );
    expect(status).toBe(400);
    expect(body).toMatchObject({ code: 'VALIDATION_FAILED', details: [{ field: 'slug' }], requestId: 'req-1' });
  });

  it('derives a code for framework HTTP errors', () => {
    expect(run(new NotFoundException()).body.code).toBe('NOT_FOUND');
  });

  it('maps unique violations (driver adapter format) to 409 with the field', () => {
    const { status, body } = run({
      code: 'P2002',
      message: 'Unique constraint failed',
      meta: { driverAdapterError: { cause: { constraint: { fields: ['`slug`'] } } } },
    });
    expect(status).toBe(409);
    expect(body).toMatchObject({ code: 'DUPLICATE_VALUE', details: [{ field: 'slug' }] });
  });

  it('maps unique violations reported by index name', () => {
    const { body } = run({ code: 'P2002', message: '', meta: { target: 'team_members_slug_key' } });
    expect(body.details).toEqual([{ field: 'slug', messages: ['must be unique'] }]);
  });

  it('maps foreign key violations to 409 IN_USE and missing records to 404', () => {
    expect(run({ code: 'P2003', message: '' }).body).toMatchObject({ statusCode: 409, code: 'IN_USE' });
    expect(run({ code: 'P2025', message: '' }).body).toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });

  it('never leaks internal error messages', () => {
    const { status, body } = run(new Error('SELECT * FROM users failed: password=...'));
    expect(status).toBe(500);
    expect(body.message).toBe('Internal server error');
  });
});
