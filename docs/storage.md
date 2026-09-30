# File storage

## الوضع الحالي

- `STORAGE_DRIVER=local`: الصور تُحفظ في `STORAGE_LOCAL_DIR` (افتراضياً `uploads/`) وتُخدم من `/uploads/*` مع `Cache-Control: max-age=31536000, immutable`.
- المسار: `<folder>/<year>/<month>/<uuid>.webp` — `folder` ∈ `team, projects, clients, achievements, testimonials, settings`.
- قاعدة البيانات تخزن **الرابط العام فقط** (`STORAGE_PUBLIC_URL/<key>`)، لا يُخزَّن أي ملف في MySQL.
- المدير يستطيع أيضاً لصق رابط صورة من أي مصدر https (الموقع يعرضها بدون تحسين إذا لم يكن مصدرها مسموحاً في `NEXT_PUBLIC_IMAGE_ORIGINS`).

## إضافة S3 / Cloudflare R2 / Object Storage

المعمارية جاهزة: الكود يعتمد على `abstract class StorageDriver` فقط.

1. `npm install @aws-sdk/client-s3` (R2 متوافق مع S3).
2. أنشئ `src/modules/uploads/storage/s3-storage.driver.ts`:

```ts
@Injectable()
export class S3StorageDriver extends StorageDriver {
  async put(key: string, data: Buffer, contentType: string): Promise<StoredFile> {
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket, Key: key, Body: data, ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }));
    return { key, url: `${this.publicUrl}/${key}` };
  }
  async delete(key: string): Promise<void> { /* DeleteObjectCommand */ }
}
```

3. أضف `'s3'` إلى `STORAGE_DRIVER` في `env.validation.ts` ومتغيرات الاعتماد (`S3_BUCKET`, `S3_ENDPOINT`, …) مع validation.
4. اختر الـ driver في `UploadsModule` حسب `config.storageDriver`.
5. اضبط `STORAGE_PUBLIC_URL` على رابط الـ CDN/الـ bucket، وأضفه إلى `NEXT_PUBLIC_IMAGE_ORIGINS` في الموقع.
6. انقل الملفات القديمة (`aws s3 sync uploads/ s3://bucket/`) ثم حدّث الروابط المخزنة:

```sql
UPDATE projects SET coverImageUrl = REPLACE(coverImageUrl, 'https://api.example.com/uploads', 'https://cdn.example.com') WHERE coverImageUrl LIKE 'https://api.example.com/uploads/%';
-- كرر للأعمدة: avatarUrl, logoUrl, imageUrl, ogImageUrl, url (project_images) …
```

## ملاحظات

- الصور القديمة لا تُحذف تلقائياً عند استبدالها (لا يوجد جدول وسائط). إضافة `Media` table + تنظيف دوري ممكنة لاحقاً إذا كبر الحجم.
- انسخ مجلد `uploads/` احتياطياً مع قاعدة البيانات.
