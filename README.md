# Team Platform — Backend API

REST API لموقع الفريق ولوحة التحكم: **NestJS 12 + Prisma 7 + MySQL**.
هو المشروع الوحيد الذي يتصل بقاعدة البيانات.

> قبل أي تعديل اقرأ [`ROLE.md`](./ROLE.md).

| | |
|---|---|
| API | `http://localhost:4000/api/v1` |
| Swagger | `http://localhost:4000/api/docs` |
| Health | `GET /api/v1/health` |
| Node.js | 20.19+ (مُختبر على 24) |
| قاعدة البيانات | MySQL 8+ أو MariaDB 10.4+ |

---

## التشغيل لأول مرة (Development مع XAMPP)

### 1) إنشاء قاعدة البيانات في XAMPP

1. افتح **XAMPP Control Panel** وشغّل **MySQL** (و **Apache** لاستخدام phpMyAdmin).
2. افتح `http://localhost/phpmyadmin` ← **New / جديد**.
3. اسم القاعدة: **`team_platform`** — الترميز (Collation): **`utf8mb4_unicode_ci`** ← **Create**.

أو من تبويب SQL في phpMyAdmin:

```sql
CREATE DATABASE team_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- اختياري: قاعدة منفصلة لاختبارات e2e (npm run test:e2e)
CREATE DATABASE team_platform_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

الاتصال مضبوط في `.env` على إعدادات XAMPP الافتراضية (المستخدم `root` بدون كلمة مرور، المنفذ 3306):

```env
DATABASE_URL="mysql://root:@127.0.0.1:3306/team_platform"
```

إذا وضعت كلمة مرور لـ root في XAMPP: `mysql://root:كلمة_المرور@127.0.0.1:3306/team_platform`.

### 2) التثبيت والتهجير والبيانات

```bash
# تثبيت الحزم (يولّد Prisma Client تلقائياً عبر postinstall)
npm install

# ملف البيئة (موجود مسبقاً للتطوير؛ لمشروع جديد انسخه ثم عدّل القيم)
cp .env.example .env

# التهجير (إنشاء الجداول) + البيانات الأساسية + البيانات التجريبية — أمر واحد:
npm run db:setup:demo

# التشغيل مع إعادة التحميل التلقائي
npm run dev
```

`db:setup:demo` يساوي تنفيذ الأوامر التالية بالترتيب (يمكن تشغيل كل منها وحده):

| الأمر | ماذا يفعل |
|---|---|
| `npm run db:migrate:deploy` | **التهجير**: ينشئ الجداول من `prisma/migrations` (آمن ومتكرر) |
| `npm run db:seed` | حساب المدير (`SEED_ADMIN_*`) + الإعدادات + الخدمات + خطوات العمل + أسئلة شائعة كمسودات |
| `npm run db:seed:demo` | **بيانات تجريبية** (`prisma/seed-demo.ts`): اسم فريق مقترح، 4 أعضاء، 6 مشاريع، إنجازات، عملاء وآراء — للتطوير فقط |
| `npm run db:seed:demo:remove` | حذف البيانات التجريبية كلها وإرجاع الإعدادات إلى قيمها الأولى |

- كل الأوامر آمنة للتكرار: لا تكرر البيانات ولا تغيّر ما عدّلته من لوحة التحكم.
- `db:seed:demo` يرفض العمل عندما `NODE_ENV=production`.
- بعد التشغيل: لوحة التحكم بحساب `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` من `.env`.

توليد `JWT_SECRET` آمن:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

## Production

```bash
npm ci
npx prisma migrate deploy     # تطبيق migrations (آمن ومتكرر)
npm run build
npm run start:prod
```

`npm run start:prod` يطبق الـ migrations **تلقائياً** قبل تشغيل الـ API:

```text
تحميل env ← انتظار وصول MySQL ← prisma migrate deploy ← تشغيل NestJS
```

- إذا فشل migration لا يبدأ الـ API (بدلاً من العمل على schema خاطئة).
- `SKIP_MIGRATIONS=true` عندما تُطبَّق الـ migrations من CI أو عند تشغيل عدة نسخ.
- لا تستخدم `prisma migrate dev` في Production أبداً.

إنشاء المدير الأول في Production (مرة واحدة، ويمكن إعادة تشغيله بأمان):

```bash
SEED_ADMIN_EMAIL=you@company.com SEED_ADMIN_PASSWORD='long-unique-password' npm run db:seed
```

الـ seed **لا يعمل تلقائياً** عند التشغيل، ولا يكرر البيانات، ولا يغيّر كلمة مرور حساب موجود.

دليل النشر الكامل (PM2، systemd، Nginx، النسخ الاحتياطي): [`docs/deployment.md`](./docs/deployment.md).

## الأوامر

| الأمر | الوظيفة |
|---|---|
| `npm run dev` | تشغيل مع watch |
| `npm run build` | بناء إلى `dist/` |
| `npm start` | تشغيل `dist/main.js` بدون migrations |
| `npm run start:prod` | انتظار DB + `migrate deploy` + تشغيل |
| `npm run lint` | oxlint |
| `npm run typecheck` | TypeScript بدون إخراج |
| `npm test` | unit tests (Vitest) |
| `npm run test:e2e` | e2e على قاعدة بيانات اختبار حقيقية |
| `npm run format` | Prettier |
| `npm run db:generate` | توليد Prisma Client |
| `npm run db:migrate` | إنشاء وتطبيق migration (Development) |
| `npm run db:migrate:deploy` | تطبيق migrations (Production/CI) |
| `npm run db:migrate:status` | حالة الـ migrations |
| `npm run db:seed` | seed آمن |
| `npm run db:seed:demo` | بيانات تجريبية (Development فقط) |
| `npm run db:seed:demo:remove` | حذف البيانات التجريبية |
| `npm run db:setup` | `migrate deploy` + `db:seed` |
| `npm run db:setup:demo` | `db:setup` + `db:seed:demo` |
| `npm run db:studio` | Prisma Studio |

## متغيرات البيئة

القائمة الكاملة مع الشرح في [`.env.example`](./.env.example). أهمها:

| المتغير | مثال | ملاحظات |
|---|---|---|
| `NODE_ENV` | `production` | |
| `PORT` | `4000` | |
| `DATABASE_URL` | `mysql://user:pass@host:3306/db` | يدعم `?ssl=true` |
| `JWT_SECRET` | 48 حرفاً عشوائياً | مختلف لكل بيئة |
| `JWT_EXPIRES_IN` | `15m` | عمر access token |
| `REFRESH_TOKEN_EXPIRES_IN` | `7d` | |
| `CORS_ORIGINS` | `https://example.com` | بدون `*` في Production |
| `TRUST_PROXY` | `loopback` | خلف Nginx |
| `STORAGE_PUBLIC_URL` | `https://api.example.com/uploads` | |
| `FRONTEND_REVALIDATE_URL` + `REVALIDATE_SECRET` | | تحديث الموقع فوراً بعد التعديل |

الإعدادات تُفحص عند الإقلاع: أي قيمة ناقصة أو خاطئة = رسالة واضحة والتطبيق لا يبدأ.

## الاختبارات

```bash
npm test                 # 59 unit tests — بدون قاعدة بيانات

cp .env.test.example .env.test   # قاعدة بيانات مخصصة للاختبار (اسمها يحتوي "test")
npm run test:e2e         # 23 e2e tests — التطبيق الكامل + MySQL
```

## التوثيق

| الملف | المحتوى |
|---|---|
| [`ROLE.md`](./ROLE.md) | القواعد والمعمارية — المرجع الأساسي |
| [`docs/architecture.md`](./docs/architecture.md) | مسار الطلب، الوحدات، الأخطاء |
| [`docs/api.md`](./docs/api.md) | كل الـ endpoints وقواعدها |
| [`docs/database.md`](./docs/database.md) | الجداول والعلاقات وقواعد الحذف والـ migrations |
| [`docs/security.md`](./docs/security.md) | المصادقة والصلاحيات والحماية والتوسع |
| [`docs/storage.md`](./docs/storage.md) | رفع الصور والانتقال إلى S3/R2 |
| [`docs/deployment.md`](./docs/deployment.md) | النشر على VPS أو خدمات مُدارة |
| [`docs/testing.md`](./docs/testing.md) | استراتيجية الاختبار |

## حل المشاكل

| المشكلة | الحل |
|---|---|
| `Invalid environment configuration` عند التشغيل | الرسالة تذكر المتغير الناقص؛ قارن مع `.env.example` |
| `Cannot find module '../generated/prisma/client.js'` | `npm run db:generate` |
| `P1001: Can't reach database server` | تأكد من `DATABASE_URL` وأن MySQL يعمل ويقبل الاتصال (XAMPP: زر Start بجانب MySQL) |
| `P1003` / `Unknown database 'team_platform'` | أنشئ القاعدة في phpMyAdmin أولاً (الخطوة 1 أعلاه) |
| `Access denied for user 'root'` | لـ root كلمة مرور في XAMPP: ضعها في `DATABASE_URL` |
| نصوص عربية تظهر `؟؟؟` أو `���` | النص أُرسل بترميز غير UTF-8 (مثلاً من طرفية Windows). الـ API يرفض هذه الطلبات الآن بـ `INVALID_ENCODING`؛ أدخل النصوص من لوحة التحكم |
| MySQL 8: `RSA public key is not available` | أضف `?allowPublicKeyRetrieval=true` أو فعّل TLS (`?ssl=true`) |
| طلبات الموقع ترفض بـ CORS | أضف أصل الموقع بالضبط إلى `CORS_ORIGINS` (بدون `/` في النهاية) |
| كل المستخدمين يأخذون `429` معاً | الخادم خلف proxy: اضبط `TRUST_PROXY` |
| تعديلات لوحة التحكم لا تظهر فوراً في الموقع | اضبط `FRONTEND_REVALIDATE_URL` و `REVALIDATE_SECRET` (نفس القيمة في الموقع)؛ راجع سجل تحذيرات `RevalidationService` |
| الصور لا تظهر في الموقع | `STORAGE_PUBLIC_URL` يجب أن يكون الرابط العام الصحيح لـ `/uploads` |
| `migrate deploy` يفشل | `npm run db:migrate:status`؛ لا تعدّل migration مطبقاً — أنشئ migration جديداً |
