import { type CanActivate, type ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

import { PrismaService } from '../../database/prisma.service.js';
import type { AccessTokenPayload, AuthUser } from '../auth/auth-user.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { AppException, ErrorCode } from '../errors/app-exception.js';

function unauthorized(message: string): AppException {
  return new AppException(HttpStatus.UNAUTHORIZED, ErrorCode.Unauthorized, message);
}

export function extractBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}

/**
 * Global guard: every route requires a valid access token unless marked @Public().
 * The user is re-loaded from the database on each request so that deactivated
 * accounts, role changes and password resets take effect immediately.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const token = extractBearerToken(request.headers.authorization);
    if (!token) throw unauthorized('Missing access token');

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessTokenPayload>(token);
    } catch {
      throw unauthorized('Invalid or expired access token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, role: true, isActive: true, passwordChangedAt: true },
    });
    if (!user || !user.isActive) throw unauthorized('Account is not active');

    // Tokens issued before the last password change are no longer valid.
    if (user.passwordChangedAt && payload.iat !== undefined) {
      const changedAtSeconds = Math.floor(user.passwordChangedAt.getTime() / 1000);
      if (payload.iat < changedAtSeconds) throw unauthorized('Session expired, please sign in again');
    }

    request.user = { id: user.id, email: user.email, name: user.name, role: user.role };
    return true;
  }
}
