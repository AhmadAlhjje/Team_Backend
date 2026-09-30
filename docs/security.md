# Security

## المصادقة

| العنصر | التطبيق |
|---|---|
| كلمات المرور | argon2id (19 MiB، t=2، p=1 — توصية OWASP)، الحد الأدنى 12 حرفاً، تحديث تلقائي للـ hash عند تغيير الإعدادات |
| تعداد الحسابات | نفس الرسالة ونفس زمن المعالجة للبريد غير الموجود (hash وهمي) |
| Brute force | 10 طلبات login/دقيقة/IP + قفل مؤقت (15 دقيقة) بعد 10 محاولات فاشلة للحساب |
| Access token | JWT HS256، 15 دقيقة، `issuer` محدد، الخوارزمية مقيدة |
| Refresh token | 48 بايت عشوائية، يُخزَّن SHA-256 فقط، تدوير مع كل استخدام |
| سرقة refresh token | إعادة استخدام token مُدوَّر = إلغاء العائلة كاملة؛ سماح 10 ثوانٍ للطلبات المتزامنة فقط ما دامت العائلة نشطة |
| التعطيل الفوري | المستخدم يُحمَّل من DB في كل طلب: التعطيل وتغيير الدور يسريان فوراً |
| تغيير كلمة المرور | يبطل كل access tokens الأقدم (`passwordChangedAt`) ويلغي كل refresh tokens |

## الصلاحيات

- Guard عام: كل endpoint محمي افتراضياً؛ العامة تُعلَّم `@Public()` صراحة.
- الصلاحيات (`content:manage`, `messages:manage`, `media:upload`, `settings:manage`, `users:manage`) لا الأدوار.
- حماية من إغلاق النظام: لا يمكن للمستخدم تعطيل نفسه أو تغيير دوره أو حذف نفسه، ولا يمكن إزالة آخر `SUPER_ADMIN` نشط.

## المدخلات

- جسم JSON يجب أن يكون UTF-8 صالحاً (`verify` في body-parser عبر `assertUtf8Body`)، وإلا `400 INVALID_ENCODING` — لا يُخزَّن نص تالف بصمت.
- `SanitizeInputPipe` + `ValidationPipe` (whitelist + forbidNonWhitelisted + تحويل صارم).
- الروابط http(s) فقط — يمنع `javascript:` في `href` على الموقع.
- النصوص تُعرض في الموقع كنص (React escaping + `RichText` لا يفسر HTML)، والـ JSON-LD يهرب `<`.
- Prisma = استعلامات مُعلمة (لا SQL injection). ممنوع `$queryRawUnsafe` مع مدخلات.

## رفع الملفات

MIME whitelist ← فك الترميز الفعلي بـ sharp (لا نثق بالامتداد أو الـ Content-Type) ← حد 40 ميغابكسل (decompression bombs) ← إعادة ترميز WebP ← حذف EXIF (GPS، الجهاز) ← اسم UUID ← حماية path traversal في الـ driver. SVG مرفوض (قد يحتوي scripts). الحجم الأقصى `UPLOAD_MAX_FILE_SIZE_MB`.

## HTTP

- Helmet: CSP صارمة، `frame-ancestors 'none'`، `nosniff`، HSTS (عبر Nginx/Helmet)، `Cross-Origin-Resource-Policy: cross-origin` لتضمين الصور في الموقع ولوحة التحكم.
- CORS: قائمة `CORS_ORIGINS` فقط؛ التطبيق يرفض الإقلاع مع `*` في Production.
- حد الجسم 1 MB JSON.
- `Cache-Control: no-store` لكل الاستجابات المصادَق عليها.
- Swagger معطّل افتراضياً في Production (`SWAGGER_ENABLED`).

## نموذج التواصل

rate limit (5 / 10 دقائق / IP) + honeypot + زمن تعبئة أدنى (3 ثوانٍ) + validation صارمة. الطلبات المشبوهة تأخذ رد النجاح نفسه (لا تكشف طريقة الكشف). يُخزَّن `HMAC(IP)` بدل الـ IP (خصوصية) لتتبع الإساءة المتكررة.

## خلف Proxy

اضبط `TRUST_PROXY` (مثلاً `loopback` عندما يكون Nginx على نفس الخادم، أو IP/شبكة الـ proxy). بدونه يرى rate limiting كل الزوار كـ IP واحد.
لوحة التحكم (BFF) ترسل `X-Forwarded-For` للمستخدم الحقيقي؛ لتعتمد عليه أضف IP خادم لوحة التحكم إلى `TRUST_PROXY`.

## الأسرار

- كل الأسرار في متغيرات البيئة (`JWT_SECRET`, `REVALIDATE_SECRET`, `DATABASE_URL`) — قيم مختلفة لكل بيئة، 32+ حرفاً.
- الـ logs تحجب `authorization` و `cookie`، ولا تسجل أجسام الطلبات.
- تدوير `JWT_SECRET` يُخرج كل المستخدمين (مقبول)؛ تدوير `REVALIDATE_SECRET` يتطلب تحديث الموقع بنفس القيمة.

## التوسع الأفقي

الحالة التالية في الذاكرة (مناسبة لنسخة واحدة):
- عدادات `@nestjs/throttler`
- `LoginAttemptsService`

عند تشغيل عدة نسخ: استخدم storage مشترك (Redis) للـ throttler ولمحاولات الدخول، وشغّل الـ migrations مرة واحدة (`SKIP_MIGRATIONS=true` على النسخ).

## قائمة فحص قبل الإطلاق

- [ ] `NODE_ENV=production`، `JWT_SECRET` و `REVALIDATE_SECRET` جديدة وقوية
- [ ] `CORS_ORIGINS` = أصل الموقع فقط
- [ ] HTTPS عبر Nginx/منصة الاستضافة، `TRUST_PROXY` مضبوط
- [ ] مستخدم MySQL بصلاحيات على قاعدة البيانات فقط
- [ ] `SWAGGER_ENABLED=false` (أو محمي)
- [ ] تغيير كلمة مرور المدير الأول بعد الدخول
- [ ] نسخ احتياطي يومي لقاعدة البيانات ومجلد الصور
