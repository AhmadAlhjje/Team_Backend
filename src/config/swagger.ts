import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const SWAGGER_PATH = 'api/docs';

/** OpenAPI documentation at /api/docs (JSON at /api/docs-json). */
export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Team Platform API')
    .setDescription(
      [
        'REST API for the public website and the admin dashboard.',
        '',
        '- Public endpoints (`/api/v1/...`) serve published content only.',
        '- Admin endpoints (`/api/v1/admin/...`) require a Bearer access token from `POST /api/v1/auth/login`.',
        '- Every error returns `{ statusCode, code, error, message, details?, requestId }`.',
      ].join('\n'),
    )
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    jsonDocumentUrl: `${SWAGGER_PATH}-json`,
    swaggerOptions: { persistAuthorization: true },
  });
}
