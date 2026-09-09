import { SUITE_VERSION } from '../lib/suite-paths.ts';
import { authConfigured, handleAuth } from './auth.ts';
import type { AuthEnv } from './auth.ts';

export interface Env extends AuthEnv {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

function json(request: Request, value: unknown, status = 200) {
  return new Response(
    request.method === 'HEAD' ? null : JSON.stringify(value),
    {
      status,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
        'referrer-policy': 'strict-origin-when-cross-origin',
        'content-security-policy': "default-src 'none'; frame-ancestors 'none'",
      },
    },
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (path === '/api/health') {
      if (!['GET', 'HEAD'].includes(request.method)) {
        const response = json(request, { error: 'method_not_allowed' }, 405);
        response.headers.set('allow', 'GET, HEAD');
        return response;
      }
      return json(request, {
        service: 'daily-tools',
        version: SUITE_VERSION,
        status: 'ok',
        storage: 'browser-local',
        accounts: authConfigured(env),
        billing: false,
      });
    }
    if (path.startsWith('/api/auth/')) return handleAuth(request, env);
    // A missing API must never be served the frontend's HTML or a fake success.
    if (path === '/api' || path.startsWith('/api/')) {
      return json(request, { error: 'not_found' }, 404);
    }
    return env.ASSETS.fetch(request);
  },
};
