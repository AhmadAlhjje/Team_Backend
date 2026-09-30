import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';

import { AppException, ErrorCode } from '../../common/errors/app-exception.js';
import { AppConfigService } from '../../config/app-config.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import type { User } from '../../generated/prisma/client.js';

/**
 * A rotated token presented again within this window is treated as a benign
 * concurrent refresh (e.g. two tabs), not as token theft.
 */
export const REFRESH_REUSE_GRACE_MS = 10_000;

export interface IssuedRefreshToken {
  token: string;
  expiresAt: Date;
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function invalidRefreshToken(): AppException {
  return new AppException(HttpStatus.UNAUTHORIZED, ErrorCode.InvalidRefreshToken, 'Invalid or expired refresh token');
}

/**
 * Opaque refresh tokens with rotation and reuse detection.
 * Only SHA-256 hashes are stored, so a database leak does not leak sessions.
 */
@Injectable()
export class RefreshTokenService {
  private readonly logger = new Logger(RefreshTokenService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  async issue(userId: number, options: { familyId?: string; userAgent?: string } = {}): Promise<IssuedRefreshToken> {
    const token = randomBytes(48).toString('base64url');
    const expiresAt = new Date(Date.now() + this.config.refreshTokenTtlMs);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        familyId: options.familyId ?? randomUUID(),
        tokenHash: hashToken(token),
        expiresAt,
        userAgent: options.userAgent?.slice(0, 255),
      },
    });

    return { token, expiresAt };
  }

  /**
   * Validates and consumes a refresh token. Returns the user and token family
   * so the caller can issue the next token in the same family.
   */
  async consume(token: string): Promise<{ user: User; familyId: string }> {
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    });
    if (!record) throw invalidRefreshToken();

    const now = Date.now();

    if (record.revokedAt) {
      // Benign only if the token was *rotated* moments ago: its family must still
      // have an active successor. After logout or theft detection the whole family
      // is revoked, so a recently revoked token is rejected.
      const withinGrace = now - record.revokedAt.getTime() <= REFRESH_REUSE_GRACE_MS;
      if (withinGrace && (await this.familyHasActiveToken(record.familyId))) {
        return this.assertUsable(record.user, record.familyId);
      }
      if (withinGrace) throw invalidRefreshToken();
      // A rotated token was replayed: assume it was stolen and end the whole session family.
      await this.revokeFamily(record.familyId);
      this.logger.warn({ userId: record.userId, familyId: record.familyId }, 'Refresh token reuse detected');
      throw invalidRefreshToken();
    }

    if (record.expiresAt.getTime() <= now) throw invalidRefreshToken();

    await this.prisma.refreshToken.updateMany({
      where: { id: record.id, revokedAt: null },
      data: { revokedAt: new Date(now) },
    });

    return this.assertUsable(record.user, record.familyId);
  }

  async revokeByToken(token: string): Promise<void> {
    const record = await this.prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(token) } });
    if (record) await this.revokeFamily(record.familyId);
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: number): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Housekeeping: drops tokens that expired more than a day ago. */
  async deleteExpiredForUser(userId: number): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { userId, expiresAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    });
  }

  private async familyHasActiveToken(familyId: string): Promise<boolean> {
    const active = await this.prisma.refreshToken.count({
      where: { familyId, revokedAt: null, expiresAt: { gt: new Date() } },
    });
    return active > 0;
  }

  private assertUsable(user: User, familyId: string): { user: User; familyId: string } {
    if (!user.isActive) throw invalidRefreshToken();
    return { user, familyId };
  }
}
