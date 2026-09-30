import { type CallHandler, type ExecutionContext, Injectable, type NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import type { Observable } from 'rxjs';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

/**
 * Authenticated responses (admin data, tokens) must never be stored by
 * browsers or intermediate caches.
 */
@Injectable()
export class NoStoreInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const isAuthRoute = context.getClass().name === 'AuthController';

    if (!isPublic || isAuthRoute) {
      context.switchToHttp().getResponse<Response>().setHeader('Cache-Control', 'no-store');
    }
    return next.handle();
  }
}
