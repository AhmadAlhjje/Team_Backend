# Backend architecture

## مسار الطلب

```text
HTTP request
  → helmet (security headers) → CORS (CORS_ORIGINS) → body parser (1 MB JSON)
  → pino-http (requestId + access log)
  → Global guards (بالترتيب):
      1. ThrottlerGuard      rate limit لكل IP (مع TRUST_PROXY)
      2. JwtAuthGuard        يتحقق من Bearer token ما لم يكن المسار @Public()
      3. PermissionsGuard    يتحقق من @RequirePermissions(...)
  → Global pipes:
      1. SanitizeInputPipe   NFC + إزالة control chars + trim
      2. ValidationPipe      DTO whitelist + تحويل الأنواع
  → Controller → Service → PrismaService → MySQL
  → NoStoreInterceptor (Cache-Control: no-store للمسارات المصادَق عليها)
  → AllExceptionsFilter (أي خطأ → شكل JSON موحّد)
```

الإعداد مركزي في `src/app.setup.ts` ويُستخدم نفسه في `main.ts` وفي اختبارات e2e، فالاختبارات تمر بنفس الـ pipeline الموجود في Production.

## الطبقات

| الطبقة | المسؤولية | ممنوع |
|---|---|---|
| Controller | routes، DTOs، decorators، Swagger | Prisma، منطق أعمال |
| Service | قواعد العمل، التحقق من العلاقات، transactions، revalidation | معرفة HTTP (req/res) |
| Mapper | تحويل سجلات Prisma إلى شكل الاستجابة العامة | منطق أعمال |
| PrismaService | الاتصال بقاعدة البيانات | — |

## المحتوى العام مقابل الإدارة

كل وحدة محتوى تعرض controllerين يشتركان في خدمة واحدة:

- `XController` → `@Public()` → يرجع المنشور فقط، عبر mapper، بدون حقول داخلية.
- `AdminXController` → `@RequirePermissions(Permission.ContentManage)` تحت `/admin/...` → CRUD كامل + ترتيب.

هذا يجعل سطح الـ API العام واضحاً وصغيراً، ويستحيل معه تسريب المسودات عن طريق الخطأ.

## الأخطاء

`AppException(status, code, message, details?)` لأخطاء الأعمال. `AllExceptionsFilter` يحوّل أيضاً:

| المصدر | النتيجة |
|---|---|
| ValidationPipe | `400 VALIDATION_FAILED` + تفاصيل لكل حقل (`members.0.role`) |
| Prisma `P2002` unique | `409 DUPLICATE_VALUE` + اسم الحقل |
| Prisma `P2003` foreign key | `409 IN_USE` |
| Prisma `P2025` not found | `404 NOT_FOUND` |
| Throttler | `429 TOO_MANY_REQUESTS` |
| multer file too large | `413 PAYLOAD_TOO_LARGE` |
| أي خطأ آخر | `500 INTERNAL_ERROR` (تفاصيله في الـ log فقط) |

## Revalidation

```text
Admin يحفظ مشروعاً
  → ProjectsService.update() → commit
  → RevalidationService.trigger(['projects','team','services',…])   (fire-and-forget)
  → POST frontend /api/revalidate  (x-revalidate-secret)
  → revalidateTag(tag, { expire: 0 }) في Next.js
  → الزيارة التالية ترى المحتوى الجديد، ثم يُخزَّن مؤقتاً من جديد
```

## التخزين المؤقت

- الـ API لا يخزّن ولا يرسل `Cache-Control` عاماً للمحتوى: الموقع (Next.js) هو طبقة الـ cache، والـ webhook يبطلها بدقة.
  إضافة CDN أمام الـ API كانت ستعيد محتوى قديماً بعد التعديل.
- الملفات المرفوعة `immutable` لمدة سنة (أسماؤها UUID لا تتكرر).

## الملفات المرفوعة

`POST /admin/uploads/images` (multer في الذاكرة، حد الحجم من الـ env) → `UploadsService` (sharp: فك ترميز حقيقي، EXIF، resize، WebP) → `StorageDriver.put()` → يعيد الرابط العام. قاعدة البيانات تخزن الروابط فقط. انظر `storage.md`.
