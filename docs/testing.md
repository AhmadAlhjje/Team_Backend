# Testing

## Unit tests — `npm test`

Vitest، بجانب الكود (`src/**/*.spec.ts`)، بدون قاعدة بيانات. تركز على ما قد يسبب مشاكل حقيقية:

| الملف | ما يثبته |
|---|---|
| `auth/refresh-token.service.spec.ts` | تخزين hash فقط، التدوير، كشف إعادة الاستخدام، رفض الرمز بعد logout، الحسابات المعطلة |
| `auth/auth.service.spec.ts` | محتوى الـ JWT، رسالة موحدة، عدم تعداد الحسابات، قفل الحساب |
| `auth/login-attempts.service.spec.ts` | نافذة القفل وإعادة الضبط |
| `common/guards/permissions.guard.spec.ts` | خريطة الأدوار والصلاحيات |
| `common/filters/all-exceptions.filter.spec.ts` | تحويل أخطاء Prisma، عدم تسريب الرسائل الداخلية |
| `common/pipes/pipes.spec.ts` | التنظيف (بدون المساس بكلمات المرور)، مسارات أخطاء validation |
| `common/utils/utils.spec.ts` | المدد، الـ slugs، التواريخ، سنوات الخبرة، validation للـ env |
| `contact/contact.service.spec.ts` | كشف الـ spam، تخزين hash للـ IP فقط |
| `uploads/uploads.service.spec.ts` | WebP، حذف EXIF، عدم التكبير، رفض الملفات المزيفة و SVG |
| `revalidation/revalidation.service.spec.ts` | إرسال الـ webhook، عدم رمي أخطاء |

## E2E tests — `npm run test:e2e`

التطبيق الكامل (`AppModule` + `configureApp`) عبر Supertest على MySQL حقيقية:

```bash
cp .env.test.example .env.test   # TEST_DATABASE_URL — اسم القاعدة يجب أن يحتوي "test"
npm run test:e2e
```

- `globalSetup` يطبق الـ migrations (`migrate deploy`) على قاعدة الاختبار.
- كل ملف يفرغ الجداول في بدايته؛ الملفات تعمل بالتتابع.
- `auth.e2e-spec.ts`: الدخول، التدوير، logout، RBAC، التعطيل الفوري، تغيير كلمة المرور، حماية آخر مدير، rate limit الدخول.
- `content.e2e-spec.ts`: validation، إخفاء المسودات، مشروع بكل علاقاته، `IN_USE`، `DUPLICATE_VALUE`، الموافقة، الترتيب، الإحصائيات، رفع الصور وخدمتها.
- `contact.e2e-spec.ts`: الإرسال، honeypot، validation، rate limit، صندوق الرسائل.

## قواعد

- كل إصلاح bug يأتي مع test يعيد إنتاجه.
- اختبر السلوك (HTTP/قواعد العمل) لا تفاصيل التنفيذ.
- لا mocks لـ Prisma في e2e.
