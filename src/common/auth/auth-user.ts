import type { Role } from '../../generated/prisma/enums.js';

/** The authenticated admin attached to `request.user` by JwtAuthGuard. */
export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: Role;
}

/** Claims carried by access tokens. */
export interface AccessTokenPayload {
  sub: number;
  role: Role;
  iat?: number;
  exp?: number;
}
