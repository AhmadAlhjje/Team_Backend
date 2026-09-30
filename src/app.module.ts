import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from './common/guards/permissions.guard.js';
import { NoStoreInterceptor } from './common/interceptors/no-store.interceptor.js';
import { AppConfigService } from './config/app-config.service.js';
import { AppConfigModule } from './config/config.module.js';
import { createLoggerOptions } from './config/logger.config.js';
import { PrismaModule } from './database/prisma.module.js';
import { AchievementsModule } from './modules/achievements/achievements.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { ClientsModule } from './modules/clients/clients.module.js';
import { ContactModule } from './modules/contact/contact.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { FaqsModule } from './modules/faqs/faqs.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { ProjectsModule } from './modules/projects/projects.module.js';
import { RevalidationModule } from './modules/revalidation/revalidation.module.js';
import { ServicesModule } from './modules/services/services.module.js';
import { SettingsModule } from './modules/settings/settings.module.js';
import { StatsModule } from './modules/stats/stats.module.js';
import { TeamModule } from './modules/team/team.module.js';
import { TechnologiesModule } from './modules/technologies/technologies.module.js';
import { TestimonialsModule } from './modules/testimonials/testimonials.module.js';
import { UploadsModule } from './modules/uploads/uploads.module.js';
import { UsersModule } from './modules/users/users.module.js';

@Module({
  imports: [
    AppConfigModule,
    LoggerModule.forRootAsync({ inject: [AppConfigService], useFactory: createLoggerOptions }),
    ThrottlerModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        throttlers: [{ name: 'default', ttl: config.throttle.ttlMs, limit: config.throttle.limit }],
      }),
    }),
    PrismaModule,
    RevalidationModule,
    AuthModule,
    UsersModule,
    TechnologiesModule,
    SettingsModule,
    TeamModule,
    ServicesModule,
    ProjectsModule,
    AchievementsModule,
    ClientsModule,
    TestimonialsModule,
    FaqsModule,
    ContactModule,
    StatsModule,
    UploadsModule,
    DashboardModule,
    HealthModule,
  ],
  providers: [
    // Guards run in this order: rate limit → authentication → permissions.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: NoStoreInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
