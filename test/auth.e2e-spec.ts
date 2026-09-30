import request from 'supertest';

import { Role } from '../src/generated/prisma/enums.js';
import { bearer, createTestApp, createUser, login, resetDatabase, type TestContext } from './helpers/test-app.js';

describe('Authentication & authorization (e2e)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
    await resetDatabase(ctx.prisma);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('rejects wrong credentials with a generic error and does not reveal the account', async () => {
    const user = await createUser(ctx.prisma);
    const wrongPassword = await request(ctx.http)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: 'nope' })
      .expect(401);
    const unknownUser = await request(ctx.http)
      .post('/api/v1/auth/login')
      .send({ email: 'ghost@example.com', password: 'nope' })
      .expect(401);

    expect(wrongPassword.body.code).toBe('INVALID_CREDENTIALS');
    expect(unknownUser.body.message).toBe(wrongPassword.body.message);
  });

  it('issues sessions that are not cacheable and never expose the password hash', async () => {
    const user = await createUser(ctx.prisma);
    const response = await request(ctx.http)
      .post('/api/v1/auth/login')
      .send({ email: user.email.toUpperCase(), password: 'Test-Password-12345' })
      .expect(200);

    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body.user).toMatchObject({ email: user.email, role: 'SUPER_ADMIN' });
    expect(JSON.stringify(response.body)).not.toContain('passwordHash');

    await request(ctx.http).get('/api/v1/auth/me').set(bearer(response.body.accessToken)).expect(200);
  });

  it('rotates refresh tokens, ends sessions on logout and detects replayed tokens', async () => {
    const user = await createUser(ctx.prisma);
    const session = await login(ctx.http, user.email);

    const rotated = await request(ctx.http)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: session.refreshToken })
      .expect(200);
    expect(rotated.body.refreshToken).not.toBe(session.refreshToken);

    await request(ctx.http).post('/api/v1/auth/logout').send({ refreshToken: rotated.body.refreshToken }).expect(204);
    await request(ctx.http).post('/api/v1/auth/refresh').send({ refreshToken: rotated.body.refreshToken }).expect(401);
    // The first token belongs to the same (now revoked) family.
    await request(ctx.http).post('/api/v1/auth/refresh').send({ refreshToken: session.refreshToken }).expect(401);
  });

  it('requires authentication for every admin endpoint', async () => {
    for (const path of [
      '/api/v1/admin/team',
      '/api/v1/admin/projects',
      '/api/v1/admin/contact-messages',
      '/api/v1/admin/users',
    ]) {
      const response = await request(ctx.http).get(path).expect(401);
      expect(response.body.code).toBe('UNAUTHORIZED');
    }
    await request(ctx.http).get('/api/v1/admin/team').set(bearer('not-a-jwt')).expect(401);
  });

  it('enforces role permissions', async () => {
    const admin = await createUser(ctx.prisma, { role: Role.ADMIN });
    const { accessToken } = await login(ctx.http, admin.email);

    await request(ctx.http).get('/api/v1/admin/team').set(bearer(accessToken)).expect(200);
    await request(ctx.http).get('/api/v1/admin/contact-messages').set(bearer(accessToken)).expect(200);
    const users = await request(ctx.http).get('/api/v1/admin/users').set(bearer(accessToken)).expect(403);
    expect(users.body.code).toBe('FORBIDDEN');
    await request(ctx.http)
      .patch('/api/v1/admin/settings')
      .set(bearer(accessToken))
      .send({ siteName: 'x' })
      .expect(403);
  });

  it('blocks deactivated users immediately, even with a valid access token', async () => {
    const superAdmin = await createUser(ctx.prisma);
    const editor = await createUser(ctx.prisma, { role: Role.ADMIN });
    const superSession = await login(ctx.http, superAdmin.email);
    const editorSession = await login(ctx.http, editor.email);

    await request(ctx.http)
      .patch(`/api/v1/admin/users/${editor.id}`)
      .set(bearer(superSession.accessToken))
      .send({ isActive: false })
      .expect(200);

    await request(ctx.http).get('/api/v1/admin/team').set(bearer(editorSession.accessToken)).expect(401);
    await request(ctx.http).post('/api/v1/auth/refresh').send({ refreshToken: editorSession.refreshToken }).expect(401);
  });

  it('invalidates existing sessions when the password changes', async () => {
    const user = await createUser(ctx.prisma);
    const first = await login(ctx.http, user.email);
    const second = await login(ctx.http, user.email);

    const changed = await request(ctx.http)
      .patch('/api/v1/auth/password')
      .set(bearer(first.accessToken))
      .send({ currentPassword: 'Test-Password-12345', newPassword: 'Another-Password-67890' })
      .expect(200);

    await request(ctx.http).post('/api/v1/auth/refresh').send({ refreshToken: second.refreshToken }).expect(401);
    await request(ctx.http).get('/api/v1/auth/me').set(bearer(changed.body.accessToken)).expect(200);
    await login(ctx.http, user.email, 'Another-Password-67890');
  });
});

describe('Account safeguards (e2e)', () => {
  // A fresh app per suite: the login rate limit is tracked per application instance.
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestApp();
    await resetDatabase(ctx.prisma);
  });

  afterEach(async () => {
    await ctx.app.close();
  });

  it('protects the last active super admin and prevents self-demotion', async () => {
    const onlySuperAdmin = await createUser(ctx.prisma);
    const other = await createUser(ctx.prisma, { role: Role.SUPER_ADMIN });
    const session = await login(ctx.http, onlySuperAdmin.email);

    await request(ctx.http).delete(`/api/v1/admin/users/${other.id}`).set(bearer(session.accessToken)).expect(204);
    const self = await request(ctx.http)
      .patch(`/api/v1/admin/users/${onlySuperAdmin.id}`)
      .set(bearer(session.accessToken))
      .send({ role: 'ADMIN' })
      .expect(400);
    expect(self.body.code).toBe('SELF_MODIFICATION');
    await request(ctx.http)
      .delete(`/api/v1/admin/users/${onlySuperAdmin.id}`)
      .set(bearer(session.accessToken))
      .expect(400);
  });

  it('rate limits login attempts per IP', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 11; i += 1) {
      const response = await request(ctx.http)
        .post('/api/v1/auth/login')
        .send({ email: `nobody-${i}@example.com`, password: 'wrong' });
      statuses.push(response.status);
    }
    expect(statuses.slice(0, 10).every((status) => status === 401)).toBe(true);
    expect(statuses[10]).toBe(429);
  });
});
