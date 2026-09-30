import { Logger } from '@nestjs/common';

// Expected warnings (spam detected, token reuse, ...) would otherwise flood test output.
Logger.overrideLogger(false);
