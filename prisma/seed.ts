/**
 * Production-safe, idempotent seed. Run manually: `npm run db:seed`.
 * It is NEVER run automatically on startup.
 *
 * Guarantees:
 * - The admin account is created only if no user with SEED_ADMIN_EMAIL exists
 *   (an existing account — and its password — is never modified).
 * - Site settings are created only if missing (existing values are kept).
 * - Starter content (services, "how we work" steps, draft FAQs) is inserted
 *   only into empty tables, so re-running never duplicates or overwrites data.
 */
import { hashPassword } from '../src/modules/auth/password-hashing.js';
import { ContentStatus, Role } from '../src/generated/prisma/enums.js';
import { createSeedClient, ensureTechnologies, log } from './seed-client.js';
import { SITE_PLACEHOLDERS, STARTER_FAQS } from './seed-data.js';

const prisma = createSeedClient();

const MIN_PASSWORD_LENGTH = 12;

async function seedAdmin(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME?.trim() || 'Super Admin';

  if (!email || !password) {
    log('SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set — skipping admin account.');
    return;
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`SEED_ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    log(`Admin ${email} already exists — left unchanged.`);
    return;
  }

  await prisma.user.create({
    data: { email, name, role: Role.SUPER_ADMIN, passwordHash: await hashPassword(password) },
  });
  log(`Created super admin ${email}. Change the password after the first login.`);
}

async function seedSettings(): Promise<void> {
  await prisma.siteSetting.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, ...SITE_PLACEHOLDERS },
  });
  log('Site settings ensured.');
}

async function seedProcessSteps(): Promise<void> {
  if ((await prisma.processStep.count()) > 0) return log('Process steps already exist — skipped.');

  const steps = [
    ['احكيلنا عن فكرتك', 'شاركنا فكرتك أو المشكلة التي تريد حلها، حتى لو كانت ما تزال في بدايتها.'],
    ['نفهم احتياجات المشروع', 'نناقش معك الأهداف والمستخدمين والمتطلبات حتى تتضح الصورة كاملة.'],
    ['نحدد الحل وخطة التنفيذ', 'نقترح الحل التقني المناسب، ونتفق معك على المراحل والمدة والتكلفة.'],
    ['نبدأ التطوير', 'نبني المشروع على مراحل، ونشاركك التقدم بشكل دوري لتبقى على اطلاع.'],
    ['نطلق المشروع وندعمه', 'نطلق المشروع ونتابع أداءه، ونبقى معك للدعم والتطوير المستمر.'],
  ];
  await prisma.processStep.createMany({
    data: steps.map(([title, description], index) => ({ title, description, sortOrder: index })),
  });
  log(`Created ${steps.length} "how we work" steps.`);
}

async function seedServices(): Promise<void> {
  if ((await prisma.service.count()) > 0) return log('Services already exist — skipped.');

  const services = [
    {
      slug: 'web-development',
      title: 'تطوير تطبيقات الويب',
      icon: 'web',
      summary: 'منصات وتطبيقات ويب سريعة وآمنة، من المواقع التعريفية إلى الأنظمة المتكاملة ولوحات التحكم.',
      technologies: ['React', 'Next.js', 'Node.js', 'NestJS'],
    },
    {
      slug: 'mobile-apps',
      title: 'تطوير تطبيقات الموبايل',
      icon: 'mobile',
      summary: 'تطبيقات Android و iOS بتجربة استخدام سلسة، مع لوحة تحكم وخدمات خلفية متكاملة.',
      technologies: ['Flutter'],
    },
    {
      slug: 'business-systems',
      title: 'الأنظمة الإدارية وأنظمة الشركات',
      icon: 'system',
      summary: 'أنظمة لإدارة العمليات والمبيعات والمخزون والموظفين، مصممة حسب طريقة عمل مؤسستك.',
      technologies: [],
    },
    {
      slug: 'desktop-software',
      title: 'تطوير برامج سطح المكتب',
      icon: 'desktop',
      summary: 'برامج سطح مكتب مستقرة تعمل مع الإنترنت أو بدونه، وتتكامل مع أنظمتك الحالية.',
      technologies: [],
    },
    {
      slug: 'ai-solutions',
      title: 'حلول الذكاء الاصطناعي',
      icon: 'ai',
      summary: 'دمج الذكاء الاصطناعي في منتجك: أتمتة المهام، تحليل البيانات، والمساعدات الذكية.',
      technologies: [],
    },
    {
      slug: 'custom-software',
      title: 'البرمجيات المخصصة',
      icon: 'custom',
      summary: 'حلول برمجية تُبنى لمشكلة محددة عندما لا تناسبك الحلول الجاهزة.',
      technologies: [],
    },
  ];

  for (const [index, service] of services.entries()) {
    const { technologies, ...fields } = service;
    const technologyIds = await ensureTechnologies(prisma, technologies);
    await prisma.service.create({
      data: {
        ...fields,
        status: ContentStatus.PUBLISHED,
        sortOrder: index,
        technologies: { create: technologyIds.map((technologyId, order) => ({ technologyId, sortOrder: order })) },
      },
    });
  }
  log(`Created ${services.length} services.`);
}

async function seedFaqs(): Promise<void> {
  if ((await prisma.faq.count()) > 0) return log('FAQs already exist — skipped.');

  await prisma.faq.createMany({
    data: STARTER_FAQS.map(([question, answer], index) => ({
      question,
      answer,
      status: ContentStatus.DRAFT,
      sortOrder: index,
    })),
  });
  log(`Created ${STARTER_FAQS.length} FAQs as drafts (review and publish them from Admin).`);
}

async function main(): Promise<void> {
  await seedAdmin();
  await seedSettings();
  await seedProcessSteps();
  await seedServices();
  await seedFaqs();
  log('Done.');
}

main()
  .catch((error: unknown) => {
    process.stderr.write(`[seed] Failed: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
