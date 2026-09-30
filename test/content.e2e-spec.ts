import request from 'supertest';

import { bearer, createTestApp, createUser, login, resetDatabase, type TestContext } from './helpers/test-app.js';

describe('Content management & public API (e2e)', () => {
  let ctx: TestContext;
  let token: string;

  const admin = () => ({ ...bearer(token) });

  beforeAll(async () => {
    ctx = await createTestApp();
    await resetDatabase(ctx.prisma);
    const user = await createUser(ctx.prisma);
    token = (await login(ctx.http, user.email)).accessToken;
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  async function createMember(slug: string, status = 'PUBLISHED') {
    const response = await request(ctx.http)
      .post('/api/v1/admin/team')
      .set(admin())
      .send({ slug, name: `Member ${slug}`, role: 'Engineer', status, skills: ['TypeScript'] })
      .expect(201);
    return response.body as { id: number };
  }

  it('rejects unknown properties, invalid slugs and unsafe URLs', async () => {
    const response = await request(ctx.http)
      .post('/api/v1/admin/team')
      .set(admin())
      .send({ slug: 'Not A Slug', name: 'X', role: 'Y', isAdmin: true, avatarUrl: 'javascript:alert(1)' })
      .expect(400);

    const fields = (response.body.details as Array<{ field: string }>).map((detail) => detail.field);
    expect(response.body.code).toBe('VALIDATION_FAILED');
    expect(fields).toEqual(expect.arrayContaining(['slug', 'name', 'isAdmin', 'avatarUrl']));
  });

  it('only exposes published content publicly', async () => {
    await createMember('visible-member');
    await createMember('draft-member', 'DRAFT');

    const team = await request(ctx.http).get('/api/v1/team').expect(200);
    expect(team.body.map((member: { slug: string }) => member.slug)).toEqual(['visible-member']);
  });

  it('manages a project with all its relations and shows it publicly once published', async () => {
    const member = await createMember('project-member');
    const hidden = await createMember('hidden-member', 'ARCHIVED');
    const service = await request(ctx.http)
      .post('/api/v1/admin/services')
      .set(admin())
      .send({
        slug: 'web',
        title: 'تطوير الويب',
        summary: 'تطوير منصات وتطبيقات ويب.',
        status: 'PUBLISHED',
        technologies: ['React'],
      })
      .expect(201);

    const created = await request(ctx.http)
      .post('/api/v1/admin/projects')
      .set(admin())
      .send({
        slug: 'case-study',
        title: 'Case Study',
        summary: 'A real project summary for testing.',
        status: 'DRAFT',
        technologies: ['React', 'NestJS', 'react'],
        serviceIds: [service.body.id],
        members: [
          { teamMemberId: member.id, role: 'Lead' },
          { teamMemberId: hidden.id, role: 'Support' },
        ],
        features: [{ title: 'Fast' }],
        images: [{ url: 'https://cdn.example.com/1.webp', alt: 'Screenshot' }],
        startDate: '2026-01-01',
        endDate: '2026-03-01',
      })
      .expect(201);
    expect(created.body.technologies).toEqual(['React', 'NestJS']);
    expect(created.body.publishedAt).toBeNull();

    await request(ctx.http).get('/api/v1/projects/case-study').expect(404);

    const published = await request(ctx.http)
      .patch(`/api/v1/admin/projects/${created.body.id}`)
      .set(admin())
      .send({ status: 'PUBLISHED' })
      .expect(200);
    expect(published.body.publishedAt).not.toBeNull();

    const detail = await request(ctx.http).get('/api/v1/projects/case-study').expect(200);
    expect(detail.body).toMatchObject({
      slug: 'case-study',
      startDate: '2026-01-01',
      services: [{ slug: 'web', title: 'تطوير الويب' }],
      features: [{ title: 'Fast', description: null }],
    });
    // Archived members are not shown on public project pages.
    expect(detail.body.members.map((m: { slug: string }) => m.slug)).toEqual(['project-member']);

    const memberPage = await request(ctx.http).get('/api/v1/team').expect(200);
    const listed = memberPage.body.find((m: { slug: string }) => m.slug === 'project-member');
    expect(listed.projects).toEqual([{ slug: 'case-study', title: 'Case Study', contribution: 'Lead' }]);
  });

  it('protects data integrity when deleting linked records', async () => {
    const members = await request(ctx.http).get('/api/v1/admin/team').set(admin()).expect(200);
    const linked = members.body.find((m: { slug: string }) => m.slug === 'project-member');

    const response = await request(ctx.http).delete(`/api/v1/admin/team/${linked.id}`).set(admin()).expect(409);
    expect(response.body.code).toBe('IN_USE');

    await request(ctx.http)
      .patch(`/api/v1/admin/team/${linked.id}`)
      .set(admin())
      .send({ status: 'ARCHIVED' })
      .expect(200);
  });

  it('returns 409 with the field name for duplicate slugs', async () => {
    const response = await request(ctx.http)
      .post('/api/v1/admin/projects')
      .set(admin())
      .send({ slug: 'case-study', title: 'Duplicate', summary: 'Duplicate slug should fail.' })
      .expect(409);
    expect(response.body).toMatchObject({ code: 'DUPLICATE_VALUE', details: [{ field: 'slug' }] });
  });

  it('requires consent before publishing clients and testimonials', async () => {
    const client = await request(ctx.http)
      .post('/api/v1/admin/clients')
      .set(admin())
      .send({ name: 'Acme', status: 'PUBLISHED' })
      .expect(400);
    expect(client.body.code).toBe('CONSENT_REQUIRED');

    await request(ctx.http)
      .post('/api/v1/admin/clients')
      .set(admin())
      .send({ name: 'Acme', status: 'PUBLISHED', hasDisplayConsent: true })
      .expect(201);
    const publicClients = await request(ctx.http).get('/api/v1/clients').expect(200);
    expect(publicClients.body).toHaveLength(1);
  });

  it('reorders content', async () => {
    const faqs = [];
    for (const question of ['First question?', 'Second question?', 'Third question?']) {
      const response = await request(ctx.http)
        .post('/api/v1/admin/faqs')
        .set(admin())
        .send({ question, answer: 'An answer.', status: 'PUBLISHED' })
        .expect(201);
      faqs.push(response.body.id as number);
    }

    await request(ctx.http).put('/api/v1/admin/faqs/order').set(admin()).send({ ids: faqs.toReversed() }).expect(204);
    const publicFaqs = await request(ctx.http).get('/api/v1/faqs').expect(200);
    expect(publicFaqs.body.map((faq: { question: string }) => faq.question)).toEqual([
      'Third question?',
      'Second question?',
      'First question?',
    ]);
  });

  it('computes statistics from published data only', async () => {
    await request(ctx.http).patch('/api/v1/admin/settings').set(admin()).send({ foundedYear: 2020 }).expect(200);
    const stats = await request(ctx.http).get('/api/v1/stats').expect(200);
    expect(stats.body).toMatchObject({ projects: 1, clients: 1 });
    expect(stats.body.yearsOfExperience).toBe(new Date().getUTCFullYear() - 2020);
  });

  it('serves public settings without authentication and uploads images', async () => {
    const settings = await request(ctx.http).get('/api/v1/settings/public').expect(200);
    expect(settings.body).toHaveProperty('siteName');

    const sharp = (await import('sharp')).default;
    const image = await sharp({ create: { width: 64, height: 64, channels: 3, background: '#000' } })
      .png()
      .toBuffer();
    const upload = await request(ctx.http)
      .post('/api/v1/admin/uploads/images')
      .set(admin())
      .field('folder', 'team')
      .attach('file', image, { filename: 'avatar.png', contentType: 'image/png' })
      .expect(201);
    expect(upload.body.url).toMatch(/^http:\/\/localhost:4000\/uploads\/team\/.+\.webp$/);

    const served = await request(ctx.http).get(new URL(upload.body.url).pathname).expect(200);
    expect(served.headers['content-type']).toBe('image/webp');
    expect(served.headers['cross-origin-resource-policy']).toBe('cross-origin');
  });
});
