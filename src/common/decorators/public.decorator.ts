import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route (or controller) as accessible without authentication.
 * Everything else requires a valid access token (secure by default).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
