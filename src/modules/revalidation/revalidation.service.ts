import { Injectable, Logger } from '@nestjs/common';

import { AppConfigService } from '../../config/app-config.service.js';

/** Cache tags understood by the frontend (frontend/lib/constants/cache.ts). */
export type CacheTag =
  'settings' | 'stats' | 'team' | 'projects' | 'services' | 'achievements' | 'clients' | 'testimonials' | 'faqs';

const REQUEST_TIMEOUT_MS = 5_000;

/**
 * Tells the public website that content changed, so it regenerates only the
 * affected pages. Fire-and-forget: a failed webhook never fails the admin
 * request (the frontend also revalidates on a timer as a safety net).
 */
@Injectable()
export class RevalidationService {
  private readonly logger = new Logger(RevalidationService.name);

  constructor(private readonly config: AppConfigService) {}

  trigger(tags: CacheTag[]): void {
    void this.send([...new Set(tags)]);
  }

  /** Awaitable variant (used in tests). */
  async send(tags: CacheTag[]): Promise<boolean> {
    const target = this.config.revalidation;
    if (!target || tags.length === 0) return false;

    try {
      const response = await fetch(target.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-revalidate-secret': target.secret },
        body: JSON.stringify({ tags }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) {
        this.logger.warn({ status: response.status, tags }, 'Frontend revalidation request was rejected');
        return false;
      }
      this.logger.debug({ tags }, 'Frontend revalidated');
      return true;
    } catch (error) {
      this.logger.warn(
        { tags, error: error instanceof Error ? error.message : String(error) },
        'Frontend revalidation request failed',
      );
      return false;
    }
  }
}
