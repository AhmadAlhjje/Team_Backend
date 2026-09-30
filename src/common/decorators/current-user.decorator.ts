import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { AuthUser } from '../auth/auth-user.js';

/** Injects the authenticated admin (set by JwtAuthGuard). */
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): AuthUser => {
  const request = context.switchToHttp().getRequest<{ user: AuthUser }>();
  return request.user;
});
