import { HttpStatus, Injectable } from '@nestjs/common';

import { AppException, ErrorCode } from '../../common/errors/app-exception.js';

export const MAX_FAILED_ATTEMPTS = 10;
export const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_TRACKED_KEYS = 10_000;

interface AttemptWindow {
  count: number;
  startedAt: number;
}

/**
 * Per-account brute-force protection, complementing the per-IP rate limit.
 * After MAX_FAILED_ATTEMPTS failures in ATTEMPT_WINDOW_MS the account's login
 * is paused until the window ends.
 *
 * State is in memory: fine for a single backend instance. When scaling out,
 * move it to a shared store (e.g. Redis) — see docs/security.md.
 */
@Injectable()
export class LoginAttemptsService {
  private readonly attempts = new Map<string, AttemptWindow>();

  assertAllowed(key: string): void {
    const window = this.activeWindow(key);
    if (window && window.count >= MAX_FAILED_ATTEMPTS) {
      throw new AppException(
        HttpStatus.TOO_MANY_REQUESTS,
        ErrorCode.TooManyRequests,
        'Too many failed login attempts. Try again later.',
      );
    }
  }

  recordFailure(key: string): void {
    const window = this.activeWindow(key);
    if (window) {
      window.count += 1;
      return;
    }
    if (this.attempts.size >= MAX_TRACKED_KEYS) this.pruneExpired();
    this.attempts.set(key, { count: 1, startedAt: Date.now() });
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }

  private activeWindow(key: string): AttemptWindow | undefined {
    const window = this.attempts.get(key);
    if (!window) return undefined;
    if (Date.now() - window.startedAt >= ATTEMPT_WINDOW_MS) {
      this.attempts.delete(key);
      return undefined;
    }
    return window;
  }

  private pruneExpired(): void {
    const cutoff = Date.now() - ATTEMPT_WINDOW_MS;
    for (const [key, window] of this.attempts) {
      if (window.startedAt <= cutoff) this.attempts.delete(key);
    }
  }
}
