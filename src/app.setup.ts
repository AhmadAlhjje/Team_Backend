import { HttpStatus, VersioningType } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { json } from 'express';
import helmet from 'helmet';
import { isUtf8 } from 'node:buffer';
import { resolve } from 'node:path';

import { AppException, ErrorCode } from './common/errors/app-exception.js';

import { SanitizeInputPipe } from './common/pipes/sanitize-input.pipe.js';
import { createValidationPipe } from './common/pipes/validation.pipe.js';
import type { AppConfigService } from './config/app-config.service.js';
import { setupSwagger } from './config/swagger.js';

export const UPLOADS_ROUTE = '/uploads';

type JsonParserOptions = NonNullable<Parameters<typeof json>[0]>;

/**
 * JSON bodies must be valid UTF-8. Without this check body-parser decodes any
 * other encoding (e.g. a Windows terminal sending CP1256 Arabic) into U+FFFD
 * replacement characters, and the corrupted text is stored silently.
 */
export function assertUtf8Body(_request: unknown, _response: unknown, body: Buffer): void {
  if (!isUtf8(body)) {
    throw new AppException(HttpStatus.BAD_REQUEST, ErrorCode.InvalidEncoding, 'Request body must be UTF-8 encoded');
  }
}

/**
 * HTTP-level configuration shared by `main.ts` and the e2e tests, so tests run
 * against exactly the same pipeline as production.
 */
export function configureApp(app: NestExpressApplication, config: AppConfigService): void {
  // Real client IPs behind Nginx / load balancers (used by rate limiting).
  app.set('trust proxy', config.trustProxy);

  app.use(
    helmet({
      // The API and uploaded images are consumed from other origins (website, admin).
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          // Swagger UI needs inline styles; scripts stay same-origin.
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          frameAncestors: ["'none'"],
          // Only meaningful behind HTTPS; would break Swagger over http://localhost.
          upgradeInsecureRequests: config.isProduction ? [] : null,
        },
      },
    }),
  );

  const allowedOrigins = new Set(config.corsOrigins);
  app.enableCors({
    origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)),
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
    credentials: false,
    maxAge: 86_400,
  });

  // Nest omits `verify` from the option type only because it uses it for
  // `rawBody`, which this app does not enable, so it is passed through as-is.
  const jsonOptions: JsonParserOptions = { limit: '1mb', verify: assertUtf8Body };
  app.useBodyParser('json', jsonOptions);

  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // Order matters: normalize strings first, then validate.
  app.useGlobalPipes(new SanitizeInputPipe(), createValidationPipe());

  if (config.storageDriver === 'local') {
    app.useStaticAssets(resolve(config.storageLocalDir), {
      prefix: `${UPLOADS_ROUTE}/`,
      index: false,
      dotfiles: 'deny',
      maxAge: '365d',
      immutable: true,
    });
  }

  app.enableShutdownHooks();

  if (config.swaggerEnabled) setupSwagger(app);
}
