import request from 'supertest';

import { CONTACT_THROTTLE } from '../src/modules/contact/contact.controller.js';
import { bearer, createTestApp, createUser, login, resetDatabase, type TestContext } from './helpers/test-app.js';

describe('Contact form (e2e)', () => {
  let ctx: TestContext;

  const valid = {
    name: 'Visitor',
    email: 'Visitor@Example.com',
    phone: '+963 900 000 000',
    projectType: 'تطبيق موبايل',
    budget: '1,000$ – 5,000$',
    message: 'نريد تطبيق موبايل لإدارة الحجوزات في مطعمنا.',
    elapsedMs: 12_000,
  };

  beforeAll(async () => {
    ctx = await createTestApp();
    await resetDatabase(ctx.prisma);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('stores valid submissions and exposes them in the admin inbox', async () => {
    await request(ctx.http).post('/api/v1/contact').send(valid).expect(201, { success: true });

    const user = await createUser(ctx.prisma);
    const { accessToken } = await login(ctx.http, user.email);
    const inbox = await request(ctx.http).get('/api/v1/admin/contact-messages').set(bearer(accessToken)).expect(200);

    expect(inbox.body).toMatchObject({ total: 1, unreadCount: 1 });
    expect(inbox.body.items[0]).toMatchObject({ email: 'visitor@example.com', status: 'UNREAD' });
    expect(inbox.body.items[0]).not.toHaveProperty('ipHash');

    const read = await request(ctx.http)
      .patch(`/api/v1/admin/contact-messages/${inbox.body.items[0].id}`)
      .set(bearer(accessToken))
      .send({ status: 'READ' })
      .expect(200);
    expect(read.body.readAt).not.toBeNull();
  });

  it('silently discards honeypot and too-fast submissions', async () => {
    await request(ctx.http)
      .post('/api/v1/contact')
      .send({ ...valid, website: 'https://spam.example' })
      .expect(201);
    await request(ctx.http)
      .post('/api/v1/contact')
      .send({ ...valid, elapsedMs: 300 })
      .expect(201);
    expect(await ctx.prisma.contactMessage.count()).toBe(1);
  });

  it('validates input', async () => {
    const response = await request(ctx.http)
      .post('/api/v1/contact')
      .send({ name: 'x', email: 'not-an-email', message: 'short', phone: 'abc' })
      .expect(400);
    const fields = (response.body.details as Array<{ field: string }>).map((detail) => detail.field);
    expect(fields).toEqual(expect.arrayContaining(['name', 'email', 'message', 'phone']));
  });

  it('rejects bodies that are not UTF-8 instead of storing replacement characters', async () => {
    // "بيت" encoded as Windows-1256 — what a terminal using an Arabic code page sends.
    const cp1256Body = Buffer.concat([
      Buffer.from('{"name":"'),
      Buffer.from([0xc8, 0xed, 0xca]),
      Buffer.from('","email":"a@example.com","message":"A message that is long enough to pass.","elapsedMs":9000}'),
    ]);
    const before = await ctx.prisma.contactMessage.count();

    const response = await request(ctx.http)
      .post('/api/v1/contact')
      .set('Content-Type', 'application/json')
      // Send the bytes as they are: supertest would otherwise JSON-serialize the Buffer.
      .serialize((body: Buffer) => body as unknown as string)
      .send(cp1256Body)
      .expect(400);

    expect(response.body.code).toBe('INVALID_ENCODING');
    expect(await ctx.prisma.contactMessage.count()).toBe(before);
  });

  it('rate limits submissions per IP', async () => {
    // Previous tests in this file already used part of the budget.
    let lastStatus = 0;
    for (let i = 0; i < CONTACT_THROTTLE.limit + 1; i += 1) {
      lastStatus = (await request(ctx.http).post('/api/v1/contact').send(valid)).status;
    }
    expect(lastStatus).toBe(429);
  });
});
