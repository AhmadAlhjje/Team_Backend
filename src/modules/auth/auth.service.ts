import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import type { AccessTokenPayload } from '../../common/auth/auth-user.js';
import { permissionsForRole } from '../../common/auth/permissions.js';
import { AppException, ErrorCode } from '../../common/errors/app-exception.js';
import { AppConfigService } from '../../config/app-config.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import type { User } from '../../generated/prisma/client.js';
import type { AuthSessionDto, AuthUserDto, ChangePasswordDto, LoginDto } from './dto/auth.dto.js';
import { LoginAttemptsService } from './login-attempts.service.js';
import { PasswordService } from './password.service.js';
import { RefreshTokenService } from './refresh-token.service.js';

export function toAuthUser(user: Pick<User, 'id' | 'email' | 'name' | 'role'>): AuthUserDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    permissions: [...permissionsForRole(user.role)],
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
    private readonly passwords: PasswordService,
    private readonly refreshTokens: RefreshTokenService,
    private readonly loginAttempts: LoginAttemptsService,
  ) {}

  async login(dto: LoginDto, userAgent?: string): Promise<AuthSessionDto> {
    this.loginAttempts.assertAllowed(dto.email);

    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    const passwordValid = user
      ? await this.passwords.verify(user.passwordHash, dto.password)
      : await this.passwords.verifyDummy(dto.password);

    if (!user || !passwordValid || !user.isActive) {
      this.loginAttempts.recordFailure(dto.email);
      throw new AppException(HttpStatus.UNAUTHORIZED, ErrorCode.InvalidCredentials, 'Invalid email or password');
    }

    this.loginAttempts.reset(dto.email);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        // Transparently upgrade hashes created with older parameters.
        ...(this.passwords.needsRehash(user.passwordHash)
          ? { passwordHash: await this.passwords.hash(dto.password) }
          : {}),
      },
    });
    await this.refreshTokens.deleteExpiredForUser(user.id);

    return this.issueSession(user, { userAgent });
  }

  async refresh(refreshToken: string, userAgent?: string): Promise<AuthSessionDto> {
    const { user, familyId } = await this.refreshTokens.consume(refreshToken);
    return this.issueSession(user, { userAgent, familyId });
  }

  async logout(refreshToken: string): Promise<void> {
    await this.refreshTokens.revokeByToken(refreshToken);
  }

  async getProfile(userId: number): Promise<AuthUserDto> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return toAuthUser(user);
  }

  /** Changes the password, ends all other sessions and returns a fresh session. */
  async changePassword(userId: number, dto: ChangePasswordDto, userAgent?: string): Promise<AuthSessionDto> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    if (!(await this.passwords.verify(user.passwordHash, dto.currentPassword))) {
      throw new AppException(HttpStatus.BAD_REQUEST, ErrorCode.InvalidCredentials, 'Current password is incorrect', [
        { field: 'currentPassword', messages: ['Current password is incorrect'] },
      ]);
    }
    if (dto.currentPassword === dto.newPassword) {
      throw new AppException(HttpStatus.BAD_REQUEST, ErrorCode.ValidationFailed, 'New password must be different', [
        { field: 'newPassword', messages: ['New password must be different from the current one'] },
      ]);
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await this.passwords.hash(dto.newPassword), passwordChangedAt: new Date() },
    });
    await this.refreshTokens.revokeAllForUser(userId);

    return this.issueSession(updated, { userAgent });
  }

  private async issueSession(user: User, options: { userAgent?: string; familyId?: string }): Promise<AuthSessionDto> {
    const accessTtlMs = this.config.accessTokenTtlMs;
    const payload: AccessTokenPayload = { sub: user.id, role: user.role };
    const accessToken = await this.jwt.signAsync(payload, { expiresIn: Math.floor(accessTtlMs / 1000) });
    const refresh = await this.refreshTokens.issue(user.id, options);

    return {
      accessToken,
      accessTokenExpiresAt: new Date(Date.now() + accessTtlMs).toISOString(),
      refreshToken: refresh.token,
      refreshTokenExpiresAt: refresh.expiresAt.toISOString(),
      user: toAuthUser(user),
    };
  }
}
