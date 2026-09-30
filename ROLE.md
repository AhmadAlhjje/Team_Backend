# ROLE.md — Backend (API + Database)

> **قبل تعديل أي جزء من المشروع، اقرأ ROLE.md الخاص بهذا المشروع.**
>
> لا يجوز تغيير الـ Architecture بشكل عشوائي. إذا كان هناك سبب قوي لتغييرها:
> افهم النظام الحالي ← ادرس التأثير ← اختر الحل الأبسط ← حدّث ROLE.md والـ Documentation.

---

## 1. دور هذا المشروع

`backend/` هو **المصدر الوحيد للبيانات** في المنصة:

- REST API لموقع الفريق العام (`frontend/`) وللوحة التحكم (`admin/`).
- قاعدة البيانات MySQL عبر Prisma — **لا يتصل أي مشروع آخر بقاعدة البيانات**.
- Authentication (JWT + refresh tokens) و Authorization (RBAC بالصلاحيات).
- Business logic: قواعد النشر، الموافقات، حماية البيانات المرتبطة، الإحصائيات.
- رفع الصور ومعالجتها، وإبلاغ الموقع بتغيّر المحتوى (revalidation webhook).

```text
frontend (Next.js) ──REST──┐
                           ├──► backend (NestJS) ──Prisma──► MySQL
admin (Next.js BFF) ──REST─┘
```

## 2. التقنيات

| المجال | الاختيار | ملاحظات |
|---|---|---|
| Framework | NestJS 12 (Express adapter) | ESM (`"type": "module"`)، الاستيرادات بلاحقة `.js` |
| Language | TypeScript 6 strict | ممنوع `any` (يفرضه oxlint) |
| ORM | Prisma 7.10 + `@prisma/adapter-mariadb` | يعمل مع MySQL 8+ و MariaDB 10.4+ |
| Validation | class-validator + ValidationPipe | whitelist + forbidNonWhitelisted |
| Auth | `@nestjs/jwt` + argon2id | access token قصير + refresh token مُدوَّر |
| Docs | `@nestjs/swagger` (CLI plugin) | `/api/docs` |
| Logging | nestjs-pino | JSON في Production |
| Rate limit | `@nestjs/throttler` | + قفل الحساب بعد محاولات فاشلة |
| Images | sharp | تحويل إلى WebP وحذف EXIF |
| Tests | Vitest + Supertest | unit + e2e على قاعدة بيانات حقيقية |
| Lint | oxlint (`.oxlintrc.json`) | |

## 3. هيكل المجلدات

```text
backend/
├── prisma/
│   ├── schema.prisma        ← مصدر الحقيقة لبنية قاعدة البيانات
│   ├── migrations/          ← ملفات SQL مولَّدة (لا تُعدَّل بعد تطبيقها)
│   ├── seed.ts              ← seed آمن ومتكرر (idempotent)
│   ├── seed-demo.ts         ← بيانات تجريبية للتطوير فقط
│   └── seed-client.ts
├── prisma.config.ts         ← إعدادات Prisma CLI (مسار الـ schema، الـ seed، DATABASE_URL)
├── scripts/start-prod.mjs   ← تشغيل Production: انتظار DB ← migrate deploy ← تشغيل API
├── src/
│   ├── main.ts / app.module.ts / app.setup.ts
│   ├── config/              ← env validation + AppConfigService + logger + swagger
│   ├── database/            ← PrismaService + adapter + تصنيف أخطاء Prisma
│   ├── generated/prisma/    ← Prisma Client المولَّد (git-ignored)
│   ├── common/              ← guards, decorators, filters, pipes, interceptors, dto, utils, validation
│   └── modules/             ← وحدة لكل مجال (انظر القسم 4)
└── test/                    ← e2e tests + setup
```

## 4. الوحدات (Modules)

| Module | Public endpoints | Admin endpoints |
|---|---|---|
| `auth` | `POST /auth/login`, `/auth/refresh`, `/auth/logout` | `GET /auth/me`, `PATCH /auth/password` |
| `users` | — | `/admin/users` (UsersManage) |
| `settings` | `GET /settings/public` | `/admin/settings`, `/social-links`, `/process-steps` |
| `team` | `GET /team` | `/admin/team` |
| `projects` | `GET /projects`, `GET /projects/:slug` | `/admin/projects` |
| `services` | `GET /services` | `/admin/services` |
| `achievements` | `GET /achievements` | `/admin/achievements` |
| `clients` | `GET /clients` | `/admin/clients` |
| `testimonials` | `GET /testimonials` | `/admin/testimonials` |
| `faqs` | `GET /faqs` | `/admin/faqs` |
| `contact` | `POST /contact` | `/admin/contact-messages` |
| `stats` | `GET /stats` | — |
| `technologies` | — | `GET /admin/technologies` |
| `uploads` | (ملفات ثابتة على `/uploads/*`) | `POST /admin/uploads/images` |
| `dashboard` | — | `GET /admin/dashboard` |
| `health` | `GET /health` | — |
| `revalidation` | — (خدمة داخلية تستدعي الموقع) | — |

كل المسارات تحت `/api/v1`. التفاصيل الكاملة في `docs/api.md` وفي Swagger.

### بنية الوحدة القياسية

```text
modules/<name>/
├── <name>.module.ts
├── <name>.controller.ts     ← Controller عام (@Public) + AdminController (@RequirePermissions)
├── <name>.service.ts        ← كل الـ business logic وكل استدعاءات Prisma
├── <name>.mapper.ts         ← (عند الحاجة) تحويل سجلات Prisma إلى شكل الـ API
└── dto/
    ├── <entity>.dto.ts      ← Create/Update DTOs (input)
    └── ...response.dto.ts   ← أشكال الاستجابة (لـ Swagger)
```

**القاعدة الذهبية:** `Controller → Service → Prisma`.
- الـ Controller: routing + DTO + decorators فقط. **لا Prisma داخل Controller أبداً.**
- الـ Service: المنطق والتحقق من العلاقات والمعاملات (transactions).
- الـ Public controllers تُرجع **المحتوى المنشور فقط** وتمر عبر mapper (لا تسريب لحقول داخلية).

## 5. قواعد الـ API

- Versioning: URI → `/api/v1/...` (عند كسر التوافق: `v2` جديدة، لا تعديل صامت).
- JSON دائماً. التواريخ ISO 8601. حقول التاريخ فقط (`startDate`, `date`) بصيغة `YYYY-MM-DD`.
- القوائم العامة ترجع مصفوفات. الرسائل ترجع صفحات `{ items, total, page, pageSize, unreadCount }`.
- الترتيب: `PUT /admin/<resource>/order` مع `{ ids: [...] }` بالترتيب المطلوب.
- تحديث المصفوفات (technologies, members, images, skills...) في `PATCH` **يستبدل** المجموعة كاملة إن أُرسلت، ويتركها كما هي إن لم تُرسل.
- `null` يمسح حقلاً اختيارياً، والنص الفارغ `""` يُحوَّل إلى `null` (`@EmptyToNull`). الحقول الإلزامية ترفض `null` (`PartialType(..., { skipNullProperties: false })`).

### شكل الأخطاء (موحّد)

```json
{
  "statusCode": 409,
  "code": "DUPLICATE_VALUE",
  "error": "CONFLICT",
  "message": "A record with this slug already exists",
  "details": [{ "field": "slug", "messages": ["must be unique"] }],
  "requestId": "…",
  "path": "/api/v1/admin/projects",
  "timestamp": "…"
}
```

- `code` ثابت ومقروء آلياً (قائمة كاملة في `src/common/errors/app-exception.ts`). لوحة التحكم تترجم الـ codes إلى العربية.
- `message` بالإنجليزية وموجهة للمطورين. لا تُرجَع أبداً رسائل داخلية أو SQL (`AllExceptionsFilter`).
- لرمي خطأ أعمال: `throw new AppException(HttpStatus.X, ErrorCode.Y, 'message', details?)`.

## 6. قاعدة البيانات و Prisma

- `prisma/schema.prisma` هو المصدر الوحيد للبنية. الجداول بأسماء `snake_case` جمع (`@@map`).
- IDs رقمية `autoincrement`. الروابط العامة تستخدم `slug` (فريد، أحرف لاتينية صغيرة وشرطات).
- `createdAt` / `updatedAt` في كل الجداول التي تحتاجها.
- الحالة `ContentStatus`: `DRAFT` | `PUBLISHED` | `ARCHIVED`. **الإخفاء يتم بالحالة لا بالحذف.**
- الحذف الآمن:
  - أبناء مملوكون (صور، ميزات، روابط) → `Cascade`.
  - عضو فريق مرتبط بمشاريع / عميل مرتبط بمشاريع → `Restrict` + خطأ `IN_USE` واضح (اقترح الأرشفة).
  - مراجع اختيارية (رأي عميل ← مشروع، إنجاز ← مشروع) → `SetNull`.
- قواعد النشر: لا يُنشر `Client` ولا `Testimonial` بدون `hasDisplayConsent` (`CONSENT_REQUIRED`).
- الإحصائيات تُحسب من البيانات المنشورة فقط — **لا يوجد أي رقم يُدخل يدوياً** (لمنع اختراع الأرقام).

### قواعد تعديل قاعدة البيانات

1. عدّل `schema.prisma`.
2. `npm run db:migrate -- --name <what_changed>` (Development فقط) → ينشئ migration ويطبقه.
3. راجع ملف SQL المولَّد، ثم commit للـ schema والـ migration معاً.
4. **ممنوع** تعديل migration تم تطبيقه في أي بيئة. التصحيح = migration جديد.
5. **ممنوع** `prisma migrate dev` أو `migrate reset` أو `db push` على Production.
6. التغييرات الهدامة (حذف عمود/جدول): انقل البيانات أولاً في migration منفصل.
7. حدّث DTOs و mappers و `frontend/types/api.ts` و `admin/types/api.ts` في نفس التغيير.

### Migrations في Production

`npm run start:prod` = `scripts/start-prod.mjs`:

```text
تحميل env ← انتظار وصول MySQL (TCP) ← prisma migrate deploy ← تشغيل NestJS
```

إذا فشل أي migration لا يبدأ الـ API. عند تشغيل عدة نسخ أو تطبيق migrations في CI استخدم `SKIP_MIGRATIONS=true`.

### Seed

- `npm run db:seed` يدوي فقط — **لا يعمل تلقائياً عند التشغيل**.
- Idempotent: المدير يُنشأ فقط إذا لم يوجد حساب بنفس البريد (ولا تُغيَّر كلمة مروره أبداً)، الإعدادات تُنشأ فقط إذا لم توجد، المحتوى المبدئي يُضاف للجداول الفارغة فقط.
- `npm run db:seed:demo` بيانات تجريبية وهمية لمعاينة التصميم (روابطها تبدأ بـ `demo-`)، idempotent، لا يغيّر ما أُدخل من لوحة التحكم، ويرفض العمل في Production. `npm run db:seed:demo:remove` يحذفها.

## 7. Authentication و Authorization

- تسجيل الدخول: البريد + كلمة المرور → `{ accessToken, refreshToken, ... , user }` في جسم الاستجابة.
  لوحة التحكم (BFF) تخزن الرموز في httpOnly cookies على نطاقها — المتصفح لا يرى الرموز.
- Access token: JWT HS256 قصير العمر (`JWT_EXPIRES_IN`، افتراضياً 15m) يحمل `sub` و `role`.
- Refresh token: نص عشوائي opaque، يُخزن **hash SHA-256 فقط**، يُدوَّر مع كل استخدام.
  إعادة استخدام token قديم = سرقة محتملة → إلغاء كامل العائلة (family). نافذة سماح 10 ثوانٍ للطلبات المتزامنة، ما دامت العائلة نشطة.
- `JwtAuthGuard` عام (**secure by default**): كل مسار يحتاج token ما لم يُعلَّم `@Public()`.
  يعيد تحميل المستخدم من DB في كل طلب ← التعطيل وتغيير الدور وتغيير كلمة المرور تسري فوراً.
- RBAC بالصلاحيات لا بالأدوار: `@RequirePermissions(Permission.ContentManage)`.
  الخريطة في `src/common/auth/permissions.ts`:
  - `SUPER_ADMIN`: كل الصلاحيات.
  - `ADMIN`: المحتوى + الرسائل + رفع الصور (بدون الإعدادات وإدارة المستخدمين).
- إضافة دور جديد: أضفه إلى `enum Role` + migration، ثم اربطه بصلاحياته في `ROLE_PERMISSIONS`. لا تغيير في الـ controllers.
- حماية الحسابات: لا يمكن تعطيل/حذف/تغيير دور الحساب الحالي، ولا إزالة آخر `SUPER_ADMIN` نشط.

## 8. Validation و Security

- كل input يمر عبر `SanitizeInputPipe` (NFC، إزالة control chars، trim — ما عدا كلمات المرور والرموز) ثم `ValidationPipe`.
- DTO لكل endpoint. الحقول غير المعروفة تُرفض (`VALIDATION_FAILED` مع أسماء الحقول).
- الروابط `@IsHttpUrl()` فقط (يرفض `javascript:` و `data:`). الـ slugs `@IsSlug()`.
- Prisma يمنع SQL injection (استعلامات مُعلمة). لا `$queryRawUnsafe` مع مدخلات المستخدم.
- Helmet (CSP صارمة، `frame-ancestors 'none'`، CORP cross-origin للصور).
- CORS: فقط `CORS_ORIGINS` (لا `*` في Production — يرفض التطبيق الإقلاع).
- Rate limiting: عام (`THROTTLE_*`)، login 10/دقيقة/IP، contact 5/10 دقائق/IP، refresh 30/دقيقة.
- خلف Nginx/Load balancer اضبط `TRUST_PROXY` وإلا سترى كل الطلبات IP الـ proxy.
- الصور: MIME whitelist + فك ترميز فعلي بـ sharp (لا نثق بالامتداد) + حد للبكسلات + WebP + حذف EXIF. SVG مرفوض.
- نموذج التواصل: honeypot + زمن تعبئة أدنى + rate limit؛ الـ spam يأخذ نفس رد النجاح ولا يُخزن. الـ IP يُخزن كـ HMAC فقط.
- الاستجابات المصادَق عليها `Cache-Control: no-store`.
- تفاصيل أكثر: `docs/security.md`.

## 9. Logging

- `nestjs-pino`: سطر JSON لكل طلب مع `requestId` (يُرجع في `X-Request-Id`).
- الأسرار محجوبة (`authorization`, `cookie`)، ولا يُسجَّل جسم الطلب أبداً.
- داخل الخدمات: `private readonly logger = new Logger(Name.name)` ثم `this.logger.warn({ ctx }, 'message')`.
- **ممنوع `console.log`** (oxlint يمنعه).

## 10. Swagger

- `/api/docs` (UI) و `/api/docs-json` (OpenAPI). مفعل افتراضياً خارج Production (`SWAGGER_ENABLED`).
- الـ CLI plugin يولّد الخصائص تلقائياً من الملفات `*.dto.ts` — **ضع كل class للـ DTO/Response في ملف ينتهي بـ `.dto.ts`**.
- وثّق الأخطاء المهمة بـ `@ApiConflictResponse` / `@ApiBadRequestResponse` مع الـ `code`.

## 11. Revalidation (تحديث الموقع فوراً)

بعد أي تعديل على المحتوى تستدعي الخدمة `revalidation.trigger([...tags])`:
`POST FRONTEND_REVALIDATE_URL` مع header `x-revalidate-secret`. الـ tags متوافقة مع
`frontend/lib/constants/cache.ts`. الفشل لا يُفشل طلب لوحة التحكم (يُسجَّل تحذير فقط)، والموقع يعيد التحقق كل ساعة احتياطاً.

عند إضافة محتوى جديد يظهر في الموقع: أضف tag جديداً في الطرفين واستدعِ `trigger` في كل mutation.

## 12. Environment Variables

كلها موثقة في `.env.example` ويتم التحقق منها عند الإقلاع (`src/config/env.validation.ts`) — إعداد خاطئ = التطبيق لا يبدأ مع رسالة واضحة.
اقرأ الإعدادات عبر `AppConfigService` فقط. **ممنوع `process.env` داخل الكود** (باستثناء config و scripts و seed).

## 13. الاختبارات

- `npm test`: unit tests بجانب الكود (`src/**/*.spec.ts`) — المنطق الحساس: tokens، login، RBAC، الأخطاء، الصور، spam.
- `npm run test:e2e`: التطبيق الحقيقي + MySQL حقيقية (`TEST_DATABASE_URL` في `.env.test`، اسم القاعدة يجب أن يحتوي `test`).
- كل bug يُصلح يأتي مع test يمنع رجوعه.

## 14. ممنوعات

- ❌ Prisma داخل controllers، أو business logic داخل controllers.
- ❌ إرجاع كائنات Prisma الخام من endpoints عامة (استخدم mappers).
- ❌ `any`، `console.log`، أسرار داخل الكود.
- ❌ تعديل migration مطبق، `migrate dev/reset/db push` على Production، تشغيل seed تلقائياً.
- ❌ الحذف النهائي لمحتوى مرتبط عندما تكفي الأرشفة.
- ❌ إضافة Redis/Queues/Microservices بدون حاجة حقيقية وقياس.
- ❌ endpoint جديد بدون DTO و validation وصلاحيات واضحة.

## 15. التوسع المستقبلي

المعمارية جاهزة لإضافة (عند الحاجة فقط): Blog / Case Studies (وحدة جديدة بنفس النمط)، Careers + Job Applications (مثل contact)،
Newsletter، محتوى متعدد اللغات (جداول `*Translation` — انظر `frontend/docs/i18n.md`)، Object Storage (driver جديد — `docs/storage.md`)،
توسيع أفقي (نقل rate limiting و login attempts إلى Redis — `docs/security.md`).
