import { AppException } from '../../common/errors/app-exception.js';
import { ATTEMPT_WINDOW_MS, LoginAttemptsService, MAX_FAILED_ATTEMPTS } from './login-attempts.service.js';

describe('LoginAttemptsService', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('allows attempts below the limit', () => {
    const service = new LoginAttemptsService();
    for (let i = 0; i < MAX_FAILED_ATTEMPTS - 1; i += 1) service.recordFailure('a@b.com');
    expect(() => service.assertAllowed('a@b.com')).not.toThrow();
  });

  it('blocks after the limit and unblocks when the window ends', () => {
    const service = new LoginAttemptsService();
    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i += 1) service.recordFailure('a@b.com');
    expect(() => service.assertAllowed('a@b.com')).toThrow(AppException);
    expect(() => service.assertAllowed('other@b.com')).not.toThrow();

    vi.advanceTimersByTime(ATTEMPT_WINDOW_MS);
    expect(() => service.assertAllowed('a@b.com')).not.toThrow();
  });

  it('resets the counter after a successful login', () => {
    const service = new LoginAttemptsService();
    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i += 1) service.recordFailure('a@b.com');
    service.reset('a@b.com');
    expect(() => service.assertAllowed('a@b.com')).not.toThrow();
  });
});
