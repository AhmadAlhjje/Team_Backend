# Database

MySQL 8+ / MariaDB 10.4+ (utf8mb4). الـ schema في `prisma/schema.prisma`، والـ migrations في `prisma/migrations/`.

## الجداول

| Model | الجدول | ملاحظات |
|---|---|---|
| `User` | `users` | `role` (SUPER_ADMIN/ADMIN)، `isActive`، `passwordHash` (argon2id) |
| `RefreshToken` | `refresh_tokens` | hash فقط، `familyId` للتدوير وكشف إعادة الاستخدام |
| `TeamMember` | `team_members` | `slug` فريد، `status`، `sortOrder` |
| `TeamMemberSkill` | `team_member_skills` | مهارات مرتبة لكل عضو |
| `SocialLink` | `social_links` | لعضو (`teamMemberId`) أو للموقع (`teamMemberId = null`) |
| `Technology` | `technologies` | قاموس مشترك (React, NestJS…) يُنشأ تلقائياً من لوحة التحكم |
| `Service` | `services` | + `service_technologies` |
| `Client` | `clients` | `hasDisplayConsent` مطلوب للنشر |
| `Project` | `projects` | `slug` فريد، قصة المشروع، SEO، `phase`، `isFeatured` |
| `ProjectImage` | `project_images` | صور مرتبة مع `alt` والأبعاد |
| `ProjectFeature` | `project_features` | ميزات مرتبة |
| `ProjectTechnology` | `project_technologies` | many-to-many مع ترتيب |
| `ProjectMember` | `project_members` | many-to-many مع دور العضو في المشروع |
| `ProjectService` | `project_services` | many-to-many |
| `Achievement` | `achievements` | `proofUrl` للإثبات، مشروع اختياري |
| `Testimonial` | `testimonials` | `hasDisplayConsent` مطلوب للنشر، مشروع اختياري |
| `Faq` | `faqs` | |
| `ContactMessage` | `contact_messages` | `status` (UNREAD/READ/ARCHIVED)، `ipHash` بدل IP |
| `SiteSetting` | `site_settings` | صف واحد (`id = 1`) |
| `ProcessStep` | `process_steps` | خطوات «كيف نعمل» |

## قواعد الحذف (سلامة البيانات)

| العلاقة | عند الحذف | السبب |
|---|---|---|
| Project → images/features/technologies/members/services | Cascade | أبناء مملوكون للمشروع |
| TeamMember ← ProjectMember | **Restrict** | لا يُحذف عضو له مشاريع؛ يُؤرشف (رسالة `IN_USE`) |
| Client ← Project | **Restrict** | لا يُحذف عميل مرتبط بمشاريع |
| Testimonial/Achievement → Project | SetNull | الرأي/الإنجاز يبقى ويُفك ربطه |
| TeamMember → skills/social links | Cascade | |
| User → refresh tokens | Cascade | |

المبدأ: **الإخفاء بالحالة (`DRAFT`/`ARCHIVED`) لا بالحذف.** الحذف النهائي متاح فقط حين لا يفسد بيانات أخرى.

## الفهارس

- `slug` فريد في المشاريع والخدمات والأعضاء.
- `(status, sortOrder)` على كل جدول محتوى (استعلامات الموقع العام).
- `(status, isFeatured, sortOrder)` للمشاريع المميزة.
- `(status, createdAt)` للرسائل.
- فهارس المفاتيح الأجنبية على جداول الربط.

## Workflow التعديل

```bash
# 1. عدّل prisma/schema.prisma
# 2. أنشئ migration وطبقه محلياً
npm run db:migrate -- --name add_project_video_url
# 3. راجع prisma/migrations/<timestamp>_add_project_video_url/migration.sql
# 4. حدّث DTOs + mappers + types في frontend/admin
# 5. commit للـ schema والـ migration معاً
```

في Production يطبقها `npm run start:prod` تلقائياً (`prisma migrate deploy`).

### تغييرات هدامة

لإعادة تسمية عمود أو حذفه دون فقدان بيانات:
1. migration يضيف العمود الجديد وينسخ البيانات (`UPDATE ... SET new = old`).
2. انشر الكود الذي يستخدم العمود الجديد.
3. migration لاحق يحذف العمود القديم.

## Seed

| الأمر | ما يفعله | آمن للتكرار؟ |
|---|---|---|
| `npm run db:seed` | مدير عام من `SEED_ADMIN_*` (إن لم يوجد)، إعدادات الموقع (إن لم توجد)، 6 خدمات + 5 خطوات (للجداول الفارغة)، 4 أسئلة شائعة كمسودات | ✅ |
| `npm run db:seed:demo` | بيانات تجريبية للتطوير (`prisma/seed-demo.ts`): اسم فريق مقترح، 4 أعضاء، 6 مشاريع، 4 إنجازات، 4 عملاء، 3 آراء، أوصاف للخدمات، ونشر الأسئلة الشائعة المبدئية | ✅ — يُنشئ الناقص فقط، ويرفض العمل في Production |
| `npm run db:seed:demo:remove` | يحذف البيانات التجريبية ويعيد حقول الإعدادات التي لم تُعدَّل إلى قيمها الأولى | ✅ |
| `npm run db:setup` / `db:setup:demo` | `migrate deploy` + `db:seed` (+ `db:seed:demo`) | ✅ |

- النصوص المبدئية في `db:seed` placeholders واضحة (مثل «اسم الفريق») تُعدَّل من لوحة التحكم → الإعدادات، ولا يضيف أي أرقام أو آراء أو عملاء.
- البيانات التجريبية **وهمية** (الأسماء والعملاء والآراء) لمعاينة التصميم فقط: روابطها تبدأ بـ `demo-`، ولا يملأ `db:seed:demo` إلا الإعدادات الفارغة أو التي ما تزال placeholders، فلا يمس ما أدخلته. احذفها بـ `db:seed:demo:remove` قبل الإطلاق.
- النصوص المشتركة بين الـ seedين (placeholders الإعدادات والأسئلة المبدئية) في `prisma/seed-data.ts`.

## الترميز (UTF-8)

- كل جدول يُنشأ بـ `utf8mb4` / `utf8mb4_unicode_ci` صراحةً في الـ migration، مهما كان ترميز القاعدة الافتراضي. أنشئ القاعدة بـ `utf8mb4_unicode_ci` مع ذلك.
- الاتصال يستخدم `utf8mb4` (افتراضي الـ driver).
- الـ API يرفض أي JSON ليس UTF-8 صالحاً (`400 INVALID_ENCODING`) بدل تخزين `U+FFFD` مكان كل حرف عربي — هذا ما يحدث عند إرسال نص عربي من طرفية Windows بترميز CP1256.

## النسخ الاحتياطي

```bash
mysqldump --single-transaction --routines --default-character-set=utf8mb4 -u USER -p DATABASE | gzip > backup-$(date +%F).sql.gz
```

انسخ مجلد `STORAGE_LOCAL_DIR` (الصور) مع قاعدة البيانات. تفاصيل في `deployment.md`.
