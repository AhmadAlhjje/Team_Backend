import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import type { Params } from 'nestjs-pino';

import type { AppConfigService } from './app-config.service.js';

const REQUEST_ID_PATTERN = /^[\w-]{8,64}$/;

/**
 * Structured JSON logs in production (one line per event, request id on every
 * line), pretty single-line logs in development. Secrets are redacted and
 * request bodies are never logged.
 */
export function createLoggerOptions(config: AppConfigService): Params {
  return {
    pinoHttp: {
      level: config.logLevel,
      genReqId: (req: IncomingMessage, res: ServerResponse) => {
        const incoming = req.headers['x-request-id'];
        const id = typeof incoming === 'string' && REQUEST_ID_PATTERN.test(incoming) ? incoming : randomUUID();
        res.setHeader('X-Request-Id', id);
        return id;
      },
      redact: {
        paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
        censor: '[redacted]',
      },
      serializers: {
        req: (req: { id: string; method: string; url: string }) => ({ id: req.id, method: req.method, url: req.url }),
        res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
      },
      customLogLevel: (_req, res, error) => {
        if (error || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
      autoLogging: {
        ignore: (req) => (req.url ?? '').startsWith('/api/v1/health'),
      },
      transport: config.isProduction
        ? undefined
        : {
            target: 'pino-pretty',
            options: { singleLine: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
          },
    },
  };
}
