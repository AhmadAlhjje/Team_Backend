import type { AppConfigService } from '../../config/app-config.service.js';
import type { PrismaService } from '../../database/prisma.service.js';
import { ContactService, isLikelySpam, MIN_HUMAN_FILL_TIME_MS } from './contact.service.js';

describe('isLikelySpam', () => {
  it('flags a filled honeypot', () => expect(isLikelySpam({ website: 'http://spam.example' })).toBe(true));
  it('flags submissions faster than a human', () =>
    expect(isLikelySpam({ elapsedMs: MIN_HUMAN_FILL_TIME_MS - 1 })).toBe(true));
  it('accepts normal submissions and API clients without timing', () => {
    expect(isLikelySpam({ elapsedMs: 20_000 })).toBe(false);
    expect(isLikelySpam({})).toBe(false);
    expect(isLikelySpam({ website: '   ' })).toBe(false);
  });
});

function setup() {
  const prisma = { contactMessage: { create: vi.fn().mockResolvedValue({ id: 1 }) } };
  const config = { jwtSecret: 's'.repeat(32) } as AppConfigService;
  return { service: new ContactService(prisma as unknown as PrismaService, config), prisma };
}

describe('ContactService.submit', () => {
  const message = { name: 'Visitor', email: 'v@example.com', message: 'I want to build a platform for my shop.' };

  it('stores real messages with a hashed IP (never the raw IP)', async () => {
    const { service, prisma } = setup();
    await expect(service.submit({ ...message, elapsedMs: 10_000 }, { ip: '203.0.113.7' })).resolves.toEqual({
      success: true,
    });
    const data = prisma.contactMessage.create.mock.calls[0][0].data;
    expect(data.ipHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(data)).not.toContain('203.0.113.7');
  });

  it('discards spam but answers exactly like a success', async () => {
    const { service, prisma } = setup();
    await expect(service.submit({ ...message, website: 'x' }, {})).resolves.toEqual({ success: true });
    expect(prisma.contactMessage.create).not.toHaveBeenCalled();
  });
});
