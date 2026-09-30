import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import { AppConfigService } from './config/app-config.service.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  const logger = app.get(Logger);
  app.useLogger(logger);

  const config = app.get(AppConfigService);
  configureApp(app, config);

  await app.listen(config.port);
  logger.log(`API listening on port ${config.port} (${config.nodeEnv})`, 'Bootstrap');
  if (config.swaggerEnabled) logger.log('Swagger UI available at /api/docs', 'Bootstrap');
}

await bootstrap();
