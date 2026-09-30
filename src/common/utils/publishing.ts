import { HttpStatus } from '@nestjs/common';

import { AppException, ErrorCode } from '../errors/app-exception.js';
import { ContentStatus } from '../../generated/prisma/enums.js';

/**
 * Clients and testimonials may only be published when the client agreed to
 * be shown publicly.
 */
export function assertConsentForPublishing(status: ContentStatus | undefined, hasConsent: boolean): void {
  if (status === ContentStatus.PUBLISHED && !hasConsent) {
    throw new AppException(
      HttpStatus.BAD_REQUEST,
      ErrorCode.ConsentRequired,
      'Display consent is required before publishing',
      [{ field: 'hasDisplayConsent', messages: ['Display consent is required before publishing'] }],
    );
  }
}
