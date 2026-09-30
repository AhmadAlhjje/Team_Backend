import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import type { AppConfigService } from '../../config/app-config.service.js';
import { RevalidationService } from './revalidation.service.js';

const serviceWith = (revalidation: AppConfigService['revalidation']) =>
  new RevalidationService({ revalidation } as AppConfigService);

describe('RevalidationService', () => {
  let server: Server;
  let url: string;
  let received: { headers: IncomingMessage['headers']; body: string } | undefined;
  let status = 200;

  beforeAll(async () => {
    server = createServer((req, res) => {
      let body = '';
      req.on('data', (chunk: Buffer) => (body += chunk.toString()));
      req.on('end', () => {
        received = { headers: req.headers, body };
        res.statusCode = status;
        res.end('{}');
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/revalidate`;
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  beforeEach(() => {
    received = undefined;
    status = 200;
  });

  it('posts unique tags with the shared secret', async () => {
    const ok = await serviceWith({ url, secret: 's'.repeat(32) }).send(['projects', 'team']);
    expect(ok).toBe(true);
    expect(received?.headers['x-revalidate-secret']).toBe('s'.repeat(32));
    expect(JSON.parse(received?.body ?? '{}')).toEqual({ tags: ['projects', 'team'] });
  });

  it('does nothing when the webhook is not configured', async () => {
    expect(await serviceWith(null).send(['projects'])).toBe(false);
    expect(received).toBeUndefined();
  });

  it('never throws when the website rejects or is unreachable', async () => {
    status = 401;
    await expect(serviceWith({ url, secret: 'x'.repeat(32) }).send(['faqs'])).resolves.toBe(false);
    await expect(
      serviceWith({ url: 'http://127.0.0.1:1/api/revalidate', secret: 'x'.repeat(32) }).send(['faqs']),
    ).resolves.toBe(false);
  });
});
