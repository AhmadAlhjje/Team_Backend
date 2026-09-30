import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';
import { AppConfigService } from '../../src/config/app-config.service.js';
import { PrismaService } from '../../src/database/prisma.service.js';
import { Role } from '../../src/generated/prisma/enums.js';
import { hashPassword } from '../../src/modules/auth/password-hashing.js';

/** The HTTP server type accepted by supertest. */
export type App = Parameters<typeof request>[0];

export interface TestContext {
  app: NestExpressApplication;
  http: App;
  prisma: PrismaService;
}

/** Boots the real application with the production HTTP pipeline. */
export async function createTestApp(): Promise<TestContext> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app, app.get(AppConfigService));
  await app.init();
  return { app, http: app.getHttpServer() as App, prisma: app.get(PrismaService) };
}

/** Children before parents, so deletes never violate foreign keys. */
const TABLES = [
  'refresh_tokens',
  'users',
  'project_members',
  'project_services',
  'project_technologies',
  'project_images',
  'project_features',
  'service_technologies',
  'team_member_skills',
  'social_links',
  'testimonials',
  'achievements',
  'projects',
  'services',
  'team_members',
  'technologies',
  'clients',
  'faqs',
  'contact_messages',
  'process_steps',
  'site_settings',
];

export async function resetDatabase(prisma: PrismaService): Promise<void> {
  await prisma.$transaction(TABLES.map((table) => prisma.$executeRawUnsafe(`DELETE FROM \`${table}\``)));
}

export const TEST_PASSWORD = 'Test-Password-12345';

export async function createUser(
  prisma: PrismaService,
  overrides: { email?: string; role?: Role; isActive?: boolean } = {},
): Promise<{ id: number; email: string }> {
  return prisma.user.create({
    data: {
      email: overrides.email ?? `user-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
      name: 'Test User',
      role: overrides.role ?? Role.SUPER_ADMIN,
      isActive: overrides.isActive ?? true,
      passwordHash: await hashPassword(TEST_PASSWORD),
    },
    select: { id: true, email: true },
  });
}

export async function login(
  http: App,
  email: string,
  password = TEST_PASSWORD,
): Promise<{ accessToken: string; refreshToken: string }> {
  const response = await request(http).post('/api/v1/auth/login').send({ email, password }).expect(200);
  return response.body as { accessToken: string; refreshToken: string };
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
