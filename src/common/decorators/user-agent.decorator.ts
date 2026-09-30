import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/** Injects the request's User-Agent header (optional, max 255 chars). */
export const UserAgent = createParamDecorator((_data: unknown, context: ExecutionContext): string | undefined => {
  const userAgent = context.switchToHttp().getRequest<Request>().headers['user-agent'];
  return typeof userAgent === 'string' ? userAgent.slice(0, 255) : undefined;
});
