import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';

import type { Permission } from '../auth/permissions.js';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Requires an authenticated admin whose role grants every listed permission.
 * Also documents the auth requirement in Swagger.
 */
export const RequirePermissions = (...permissions: Permission[]) =>
  applyDecorators(
    SetMetadata(PERMISSIONS_KEY, permissions),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({ description: `Requires: ${permissions.join(', ') || 'authentication'}` }),
  );
