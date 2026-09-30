import { AppException, ErrorCode } from '../../common/errors/app-exception.js';
import type { AppConfigService } from '../../config/app-config.service.js';
import type { PrismaService } from '../../database/prisma.service.js';
import { hashToken, REFRESH_REUSE_GRACE_MS, RefreshTokenService } from './refresh-token.service.js';

const user = { id: 1, isActive: true } as never;

function setup(record: Record<string, unknown> | null, activeInFamily = 0) {
  const prisma = {
    refreshToken: {
      create: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn().mockResolvedValue(record),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      count: vi.fn().mockResolvedValue(activeInFamily),
      deleteMany: vi.fn(),
    },
  };
  const config = { refreshTokenTtlMs: 7 * 24 * 3600 * 1000 } as AppConfigService;
  return { service: new RefreshTokenService(prisma as unknown as PrismaService, config), prisma };
}

async function expectInvalid(promise: Promise<unknown>) {
  const error = await promise.catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(AppException);
  expect((error as AppException).getResponse()).toMatchObject({ code: ErrorCode.InvalidRefreshToken });
}

describe('RefreshTokenService', () => {
  const future = new Date(Date.now() + 60_000);

  it('stores only a SHA-256 hash of issued tokens', async () => {
    const { service, prisma } = setup(null);
    const issued = await service.issue(1);

    const data = prisma.refreshToken.create.mock.calls[0][0].data;
    expect(data.tokenHash).toBe(hashToken(issued.token));
    expect(data.tokenHash).not.toContain(issued.token);
    expect(issued.token.length).toBeGreaterThanOrEqual(64);
  });

  it('consumes a valid token by revoking it (rotation)', async () => {
    const { service, prisma } = setup({ id: 't1', familyId: 'f1', revokedAt: null, expiresAt: future, user });
    const result = await service.consume('token');

    expect(result.familyId).toBe('f1');
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 't1', revokedAt: null } }),
    );
  });

  it('rejects unknown and expired tokens', async () => {
    await expectInvalid(setup(null).service.consume('nope'));
    const expired = setup({ id: 't1', familyId: 'f1', revokedAt: null, expiresAt: new Date(Date.now() - 1), user });
    await expectInvalid(expired.service.consume('token'));
  });

  it('accepts a just-rotated token while its family has an active successor (concurrent refresh)', async () => {
    const { service } = setup({ id: 't1', familyId: 'f1', revokedAt: new Date(), expiresAt: future, user }, 1);
    await expect(service.consume('token')).resolves.toMatchObject({ familyId: 'f1' });
  });

  it('rejects a recently revoked token when the family was logged out', async () => {
    const { service, prisma } = setup({ id: 't1', familyId: 'f1', revokedAt: new Date(), expiresAt: future, user }, 0);
    await expectInvalid(service.consume('token'));
    expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
  });

  it('revokes the whole family when an old rotated token is replayed (theft detection)', async () => {
    const revokedAt = new Date(Date.now() - REFRESH_REUSE_GRACE_MS - 1000);
    const { service, prisma } = setup({ id: 't1', userId: 1, familyId: 'f1', revokedAt, expiresAt: future, user }, 1);

    await expectInvalid(service.consume('token'));
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { familyId: 'f1', revokedAt: null } }),
    );
  });

  it('rejects tokens of deactivated users', async () => {
    const { service } = setup({
      id: 't1',
      familyId: 'f1',
      revokedAt: null,
      expiresAt: future,
      user: { id: 1, isActive: false },
    });
    await expectInvalid(service.consume('token'));
  });
});
