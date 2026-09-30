import { type CanActivate, type ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { AuthUser } from '../auth/auth-user.js';
import { type Permission, roleHasPermissions } from '../auth/permissions.js';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { AppException, ErrorCode } from '../errors/app-exception.js';

/** Global guard enforcing @RequirePermissions() after authentication. */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;

    const required = this.reflector.getAllAndMerge<Permission[]>(PERMISSIONS_KEY, targets) ?? [];
    if (required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    if (!user || !roleHasPermissions(user.role, required)) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        ErrorCode.Forbidden,
        'You do not have permission to perform this action',
      );
    }
    return true;
  }
}
