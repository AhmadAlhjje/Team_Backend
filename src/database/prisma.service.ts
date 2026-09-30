import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';

import { AppConfigService } from '../config/app-config.service.js';
import { PrismaClient } from '../generated/prisma/client.js';
import { createPrismaAdapter } from './prisma-adapter.js';

/**
 * The only way the application talks to MySQL. Inject it into services —
 * never into controllers.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: AppConfigService) {
    super({ adapter: createPrismaAdapter(config.databaseUrl, config.dbConnectionLimit) });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Database connection established');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /** Lightweight connectivity check used by the health endpoint. */
  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
