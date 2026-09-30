# API reference

كل المسارات تحت `/api/v1`. المرجع التفاعلي الكامل (مع الـ schemas): **`/api/docs`**.

## Public (بدون مصادقة)

| Method | Path | الوصف |
|---|---|---|
| GET | `/health` | حالة الخدمة وقاعدة البيانات (503 إذا كانت DB غير متاحة) |
| GET | `/settings/public` | إعدادات الموقع + روابط التواصل + خطوات «كيف نعمل» |
| GET | `/stats` | إحصائيات محسوبة من المحتوى المنشور |
| GET | `/team` | الأعضاء المنشورون + المهارات + الروابط + مشاريعهم المنشورة |
| GET | `/services` | الخدمات المنشورة + التقنيات + المشاريع المرتبطة |
| GET | `/projects?featured=true&limit=6` | المشاريع المنشورة (بطاقات) |
| GET | `/projects/:slug` | دراسة حالة كاملة + مشاريع مشابهة (404 إن لم يكن منشوراً) |
| GET | `/achievements` | الإنجازات المنشورة |
| GET | `/clients` | العملاء المنشورون **بموافقتهم** |
| GET | `/testimonials` | الآراء المنشورة **بموافقة أصحابها** |
| GET | `/faqs` | الأسئلة المنشورة |
| POST | `/contact` | إرسال طلب مشروع (5 طلبات / 10 دقائق / IP) |

`POST /contact`:

```json
{
  "name": "زائر",
  "email": "visitor@example.com",
  "phone": "+963 900 000 000",
  "company": "اختياري",
  "projectType": "تطوير تطبيقات الويب",
  "budget": "1,000$ – 5,000$",
  "message": "20 حرفاً على الأقل…",
  "website": "",
  "elapsedMs": 15000
}
```

`website` حقل honeypot يجب أن يبقى فارغاً، و `elapsedMs` زمن تعبئة النموذج. الطلبات المشبوهة تأخذ `201 { "success": true }` ولا تُخزَّن.

## Auth

| Method | Path | الوصف |
|---|---|---|
| POST | `/auth/login` | `{ email, password }` → session (10/دقيقة/IP + قفل بعد 10 محاولات فاشلة للحساب) |
| POST | `/auth/refresh` | `{ refreshToken }` → session جديدة (الرمز القديم يُلغى) |
| POST | `/auth/logout` | `{ refreshToken }` → إلغاء الجلسة (204) |
| GET | `/auth/me` | الحساب الحالي + صلاحياته |
| PATCH | `/auth/password` | `{ currentPassword, newPassword }` → session جديدة + إنهاء باقي الجلسات |

Session:

```json
{
  "accessToken": "eyJ…",
  "accessTokenExpiresAt": "2026-09-29T12:15:00.000Z",
  "refreshToken": "opaque…",
  "refreshTokenExpiresAt": "2026-10-06T12:00:00.000Z",
  "user": { "id": 1, "email": "…", "name": "…", "role": "SUPER_ADMIN", "permissions": ["content:manage", "…"] }
}
```

الطلبات المحمية: `Authorization: Bearer <accessToken>`.

## Admin

| Resource | Path | الصلاحية |
|---|---|---|
| Dashboard | `GET /admin/dashboard` | أي مدير |
| Team | `/admin/team` | `content:manage` |
| Projects | `/admin/projects` | `content:manage` |
| Services | `/admin/services` | `content:manage` |
| Achievements | `/admin/achievements` | `content:manage` |
| Clients | `/admin/clients` | `content:manage` |
| Testimonials | `/admin/testimonials` | `content:manage` |
| FAQs | `/admin/faqs` | `content:manage` |
| Technologies | `GET /admin/technologies` | `content:manage` |
| Uploads | `POST /admin/uploads/images` (multipart: `file`, `folder`) | `media:upload` |
| Contact messages | `/admin/contact-messages` | `messages:manage` |
| Settings | `GET /admin/settings` (أي مدير)، `PATCH /admin/settings`، `PUT /admin/settings/social-links`، `PUT /admin/settings/process-steps` | `settings:manage` |
| Users | `/admin/users` | `users:manage` |

نمط موارد المحتوى:

| Method | Path | الوصف |
|---|---|---|
| GET | `/admin/<resource>?status=PUBLISHED&search=…` | القائمة بالترتيب |
| GET | `/admin/<resource>/:id` | عنصر واحد |
| POST | `/admin/<resource>` | إنشاء (يُضاف في آخر الترتيب) |
| PATCH | `/admin/<resource>/:id` | تعديل جزئي؛ المصفوفات المرسلة تستبدل الموجود |
| PUT | `/admin/<resource>/order` | `{ ids: [3, 1, 2] }` |
| DELETE | `/admin/<resource>/:id` | حذف (409 `IN_USE` إن كان مرتبطاً — استخدم الأرشفة) |

الرسائل: `GET /admin/contact-messages?status=UNREAD&page=2&pageSize=20&search=…` → `{ items, total, page, pageSize, unreadCount }`، و `PATCH /:id { status }`، و `DELETE /:id`.

## رموز الأخطاء

| code | HTTP | المعنى |
|---|---|---|
| `VALIDATION_FAILED` | 400 | حقول غير صالحة أو غير معروفة (`details`) |
| `INVALID_REFERENCE` | 400 | معرف مرتبط غير موجود (عميل، خدمة، عضو، مشروع) |
| `CONSENT_REQUIRED` | 400 | نشر عميل/رأي بدون موافقة |
| `INVALID_FILE` | 400 | ملف ليس صورة صالحة أو نوعه غير مسموح |
| `INVALID_ENCODING` | 400 | جسم الطلب ليس UTF-8 صالحاً (مثلاً نص عربي من طرفية بترميز CP1256) |
| `SELF_MODIFICATION` | 400 | تعطيل/حذف/تغيير دور الحساب الحالي |
| `INVALID_CREDENTIALS` | 401 | بيانات دخول خاطئة (رسالة واحدة لكل الحالات) |
| `UNAUTHORIZED` | 401 | token مفقود/منتهٍ/حساب معطّل |
| `INVALID_REFRESH_TOKEN` | 401 | refresh token غير صالح أو مُعاد استخدامه |
| `FORBIDDEN` | 403 | الدور لا يملك الصلاحية |
| `NOT_FOUND` | 404 | غير موجود أو غير منشور |
| `DUPLICATE_VALUE` | 409 | قيمة فريدة مكررة (عادةً `slug` أو `email`) |
| `IN_USE` | 409 | لا يمكن الحذف لوجود ارتباطات |
| `LAST_SUPER_ADMIN` | 409 | لا يمكن إزالة آخر مدير عام نشط |
| `PAYLOAD_TOO_LARGE` | 413 | الملف أكبر من `UPLOAD_MAX_FILE_SIZE_MB` |
| `TOO_MANY_REQUESTS` | 429 | rate limit أو قفل مؤقت للحساب |
| `SERVICE_UNAVAILABLE` | 503 | قاعدة البيانات غير متاحة |
| `INTERNAL_ERROR` | 500 | خطأ غير متوقع (التفاصيل في الـ log عبر `requestId`) |
