import type {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from 'express';
import * as session from '../app/api/session/route';
import * as invite from '../app/api/invite/route';
import * as join from '../app/api/join/route';
import * as token from '../app/api/token/route';
import * as account from '../app/api/account/route';
import * as auth from '../app/api/auth/route';
import * as exportRoute from '../app/api/export/route';
import * as mcp from '../app/mcp/route';

type Handler = (request: Request) => Promise<Response>;
const routes: Record<
  string,
  Partial<Record<'GET' | 'POST' | 'DELETE', Handler>>
> = {
  '/api/session': session,
  '/api/invite': invite,
  '/api/join': join,
  '/api/token': token,
  '/api/account': account,
  '/api/auth': auth,
  '/api/export': exportRoute,
  '/mcp': mcp,
};

export async function handle(
  req: ExpressRequest & { rawBody?: Buffer },
  res: ExpressResponse,
) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  try {
    const origin = process.env.PUBLIC_ORIGIN || 'https://kindhandoff.web.app';
    const url = new URL(req.originalUrl || req.url, origin);
    const methods = routes[url.pathname];
    const handler = methods?.[req.method as 'GET' | 'POST' | 'DELETE'];
    if (!handler) {
      res.status(methods ? 405 : 404);
      if (methods)
        res.setHeader(
          'Allow',
          Object.keys(methods)
            .filter((k) => k !== 'dynamic')
            .join(', '),
        );
      res.json({
        error: {
          code: methods ? 'METHOD' : 'NOT_FOUND',
          message: 'This endpoint is unavailable.',
        },
      });
      return;
    }
    const headers = new Headers();
    for (const [name, value] of Object.entries(req.headers)) {
      // No upstream identity header is trusted on Firebase. Identity comes from
      // verified Firebase tokens exchanged for scoped server-side sessions.
      if (
        name.startsWith('oai-') ||
        name === 'host' ||
        name === 'content-length'
      )
        continue;
      if (Array.isArray(value)) headers.set(name, value.join(', '));
      else if (value) headers.set(name, value);
    }
    const raw = req.rawBody ?? Buffer.alloc(0);
    if (raw.byteLength > 32_000) {
      res
        .status(413)
        .json({
          error: { code: 'TOO_LARGE', message: 'This request is too large.' },
        });
      return;
    }
    const request = new Request(url, {
      method: req.method,
      headers,
      ...(!['GET', 'HEAD'].includes(req.method)
        ? { body: new Uint8Array(raw) }
        : {}),
    });
    const response = await handler(request);
    res.status(response.status);
    response.headers.forEach((value, name) => res.setHeader(name, value));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error(
      'KindHandoff request failed:',
      error instanceof Error ? error.message : 'Unknown error',
    );
    res
      .status(500)
      .json({
        error: {
          code: 'INTERNAL',
          message:
            'Unable to complete the request. Your saved plan is still available.',
        },
      });
  }
}
