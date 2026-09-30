import { JwtService } from '@nestjs/jwt';

import { AppException, ErrorCode } from '../../common/errors/app-exception.js';
import type { AppConfigService } from '../../config/app-config.service.js';
import type { PrismaService } from '../../database/prisma.service.js';
import { AuthService } from './auth.service.js';
import { LoginAttemptsService, MAX_FAILED_ATTEMPTS } from './login-attempts.service.js';
import { PasswordService } from './password.service.js';
import type { RefreshTokenService } from './refresh-token.service.js';

const codeOf = (error: unknown) => ((error as AppException).getResponse() as { code: string }).code;

describe('AuthService', () => {
  let passwords: PasswordService;
  let passwordHash: string;

  beforeAll(async () => {
    passwords = new PasswordService();
    await passwords.onModuleInit();
    passwordHash = await passwords.hash('correct-password-123');
  });

  function setup(userOverrides: Record<string, unknown> | null = {}) {
    const user =
      userOverrides === null
        ? null
        : { id: 1, email: 'a@b.com', name: 'A', role: 'ADMIN', isActive: true, passwordHash, ...userOverrides };
    const prisma = {
      user: { findUnique: vi.fn().mockResolvedValue(user), update: vi.fn().mockResolvedValue(user) },
    };
    const refreshTokens = {
      issue: vi.fn().mockResolvedValue({ token: 'refresh', expiresAt: new Date() }),
      deleteExpiredForUser: vi.fn(),
    };
    const config = { accessTokenTtlMs: 15 * 60_000 } as AppConfigService;
    const jwt = new JwtService({ secret: 'x'.repeat(32) });
    const attempts = new LoginAttemptsService();
    const service = new AuthService(
      prisma as unknown as PrismaService,
      jwt,
      config,
      passwords,
      refreshTokens as unknown as RefreshTokenService,
      attempts,
    );
    return { service, prisma, jwt, attempts, verifyDummy: vi.spyOn(passwords, 'verifyDummy') };
  }

  it('returns a session with an access token carrying the user id and role', async () => {
    const { service, jwt } = setup();
    const session = await service.login({ email: 'a@b.com', password: 'correct-password-123' });

    const payload = jwt.verify<{ sub: number; role: string }>(session.accessToken);
    expect(payload).toMatchObject({ sub: 1, role: 'ADMIN' });
    expect(session.user.permissions).toContain('content:manage');
    expect(session.user).not.toHaveProperty('passwordHash');
  });

  it('rejects a wrong password with a generic error', async () => {
    const { service } = setup();
    const error = await service.login({ email: 'a@b.com', password: 'wrong' }).catch((e: unknown) => e);
    expect(codeOf(error)).toBe(ErrorCode.InvalidCredentials);
  });

  it('spends the same hashing time on unknown emails (no user enumeration)', async () => {
    const { service, verifyDummy } = setup(null);
    const error = await service.login({ email: 'ghost@b.com', password: 'whatever' }).catch((e: unknown) => e);
    expect(codeOf(error)).toBe(ErrorCode.InvalidCredentials);
    expect(verifyDummy).toHaveBeenCalled();
  });

  it('rejects inactive accounts even with the right password', async () => {
    const { service } = setup({ isActive: false });
    const error = await service.login({ email: 'a@b.com', password: 'correct-password-123' }).catch((e: unknown) => e);
    expect(codeOf(error)).toBe(ErrorCode.InvalidCredentials);
  });

  it('locks the account after too many failures, even for the right password', async () => {
    const { service } = setup();
    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i += 1) {
      await service.login({ email: 'a@b.com', password: 'wrong' }).catch(() => undefined);
    }
    const error = await service.login({ email: 'a@b.com', password: 'correct-password-123' }).catch((e: unknown) => e);
    expect(codeOf(error)).toBe(ErrorCode.TooManyRequests);
  });
});
