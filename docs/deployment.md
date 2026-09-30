# Deployment

الـ backend مستقل: يحتاج Node.js 20.19+ و MySQL 8+/MariaDB 10.4+ ومتغيرات البيئة فقط. لا يعتمد على `localhost`.

## السيناريوهات

| السيناريو | الإعداد |
|---|---|
| VPS واحد (الكل) | Nginx أمام الموقع (3000) ولوحة التحكم (3001) والـ API (4000)، MySQL محلياً |
| VPS للـ API + MySQL | الموقع على Vercel، لوحة التحكم على Vercel أو VPS |
| MySQL مُدار | `DATABASE_URL` يشير للخدمة المُدارة مع `?ssl=true` |

## VPS خطوة بخطوة (Ubuntu)

### 1. قاعدة البيانات

```sql
CREATE DATABASE team_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'team_api'@'localhost' IDENTIFIED BY 'strong-password';
GRANT ALL PRIVILEGES ON team_platform.* TO 'team_api'@'localhost';
```

### 2. التطبيق

```bash
cd /srv/team-platform/backend
npm ci
cp .env.example .env    # NODE_ENV=production + القيم الحقيقية
npx prisma migrate deploy
npm run build
SEED_ADMIN_EMAIL=you@company.com SEED_ADMIN_PASSWORD='…' npm run db:seed   # مرة واحدة
```

### 3. إدارة العملية

**PM2**:

```bash
npm i -g pm2
pm2 start npm --name team-api -- run start:prod
pm2 save && pm2 startup
```

**أو systemd** (`/etc/systemd/system/team-api.service`):

```ini
[Unit]
Description=Team Platform API
After=network.target mysql.service

[Service]
WorkingDirectory=/srv/team-platform/backend
ExecStart=/usr/bin/npm run start:prod
Restart=always
Environment=NODE_ENV=production
User=www-data

[Install]
WantedBy=multi-user.target
```

`start:prod` يطبق الـ migrations في كل تشغيل (آمن: لا يفعل شيئاً إن لم يوجد جديد).

### 4. Nginx + HTTPS

```nginx
server {
  server_name api.example.com;
  client_max_body_size 6m;          # ≥ UPLOAD_MAX_FILE_SIZE_MB

  location / {
    proxy_pass http://127.0.0.1:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Request-Id $request_id;
  }
}
```

ثم `certbot --nginx -d api.example.com`، واضبط `TRUST_PROXY=loopback`.

### 5. التحقق

```bash
curl https://api.example.com/api/v1/health    # {"status":"ok","database":"up",…}
```

## التحديث (Release)

```bash
git pull
npm ci
npm run build
pm2 restart team-api       # start:prod يطبق migrations جديدة قبل التشغيل
```

## متغيرات Production الأساسية

```env
NODE_ENV=production
PORT=4000
DATABASE_URL="mysql://team_api:***@127.0.0.1:3306/team_platform"
JWT_SECRET=<48 random chars>
CORS_ORIGINS=https://example.com
TRUST_PROXY=loopback
SWAGGER_ENABLED=false
LOG_LEVEL=info
STORAGE_LOCAL_DIR=/srv/team-platform/uploads
STORAGE_PUBLIC_URL=https://api.example.com/uploads
FRONTEND_REVALIDATE_URL=https://example.com/api/revalidate
REVALIDATE_SECRET=<same value as the website>
```

## النسخ الاحتياطي

```bash
# cron يومي
mysqldump --single-transaction --default-character-set=utf8mb4 -u team_api -p team_platform | gzip > /backups/db-$(date +%F).sql.gz
tar czf /backups/uploads-$(date +%F).tar.gz /srv/team-platform/uploads
```

اختبر الاستعادة دورياً على قاعدة منفصلة.

## المراقبة

- `GET /api/v1/health` لأدوات uptime (يرجع 503 عند انقطاع DB).
- الـ logs JSON على stdout (`pm2 logs team-api` أو `journalctl -u team-api`)؛ كل خطأ يحمل `requestId` نفسه المرسل في `X-Request-Id`.
