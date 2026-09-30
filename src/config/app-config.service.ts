import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { parseDuration } from '../common/utils/duration.js';
import { type EnvironmentVariables, NodeEnv } from './env.validation.js';

/**
 * Typed, derived view over the validated environment. Inject this instead of
 * reading `process.env` anywhere in the application.
 */
@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService<EnvironmentVariables, true>) {}

  private get<K extends keyof EnvironmentVariables>(key: K): EnvironmentVariables[K] {
    return this.config.get(key, { infer: true });
  }

  get nodeEnv(): NodeEnv {
    return this.get('NODE_ENV');
  }

  get isProduction(): boolean {
    return this.nodeEnv === NodeEnv.Production;
  }

  get isTest(): boolean {
    return this.nodeEnv === NodeEnv.Test;
  }

  get port(): number {
    return this.get('PORT');
  }

  get databaseUrl(): string {
    return this.get('DATABASE_URL');
  }

  get dbConnectionLimit(): number {
    return this.get('DB_CONNECTION_LIMIT');
  }

  get jwtSecret(): string {
    return this.get('JWT_SECRET');
  }

  get accessTokenTtlMs(): number {
    return parseDuration(this.get('JWT_EXPIRES_IN'));
  }

  get refreshTokenTtlMs(): number {
    return parseDuration(this.get('REFRESH_TOKEN_EXPIRES_IN'));
  }

  get corsOrigins(): string[] {
    return this.get('CORS_ORIGINS')
      .split(',')
      .map((origin) => origin.trim().replace(/\/+$/, ''))
      .filter(Boolean);
  }

  /** Value for Express `trust proxy`. */
  get trustProxy(): boolean | number | string {
    const raw = this.get('TRUST_PROXY').trim();
    if (raw === 'true') return true;
    if (raw === 'false' || raw === '') return false;
    if (/^\d+$/.test(raw)) return Number(raw);
    return raw;
  }

  get swaggerEnabled(): boolean {
    return this.get('SWAGGER_ENABLED') ?? !this.isProduction;
  }

  get logLevel(): string {
    return this.get('LOG_LEVEL');
  }

  get storageDriver(): 'local' {
    return this.get('STORAGE_DRIVER') as 'local';
  }

  get storageLocalDir(): string {
    return this.get('STORAGE_LOCAL_DIR');
  }

  get storagePublicUrl(): string {
    return this.get('STORAGE_PUBLIC_URL').replace(/\/+$/, '');
  }

  get uploadMaxFileSizeBytes(): number {
    return this.get('UPLOAD_MAX_FILE_SIZE_MB') * 1024 * 1024;
  }

  get revalidation(): { url: string; secret: string } | null {
    const url = this.get('FRONTEND_REVALIDATE_URL');
    const secret = this.get('REVALIDATE_SECRET');
    return url && secret ? { url, secret } : null;
  }

  get throttle(): { ttlMs: number; limit: number } {
    return { ttlMs: this.get('THROTTLE_TTL_SECONDS') * 1000, limit: this.get('THROTTLE_LIMIT') };
  }
}
