import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { JWTVerifyGetKey } from 'jose';

export interface AuthEnv {
  MEMBERS_DB?: D1Database;
  GOOGLE_CLIENT_ID?: string;
  APP_ORIGIN?: string;
  AUTH_RATE_LIMIT?: {
    limit(options: { key: string }): Promise<{ success: boolean }>;
  };
}
const GOOGLE_KEYS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/oauth2/v3/certs'),
);
const LOGIN_COOKIE = '__Host-daily-tools-login';
const SESSION_COOKIE = '__Host-daily-tools-session';
const SESSION_SECONDS = 7 * 24 * 60 * 60;
const now = () => Math.floor(Date.now() / 1000);
const randomToken = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
const tokenPattern = /^[a-f0-9]{64}$/;
export async function hashToken(value: string) {
  const hash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(hash), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
}
function cookie(request: Request, name: string) {
  const value = request.headers
    .get('cookie')
    ?.split(';')
    .map((x) => x.trim())
    .find((x) => x.startsWith(`${name}=`))
    ?.slice(name.length + 1);
  return value && tokenPattern.test(value) ? value : null;
}
const setCookie = (name: string, value: string, seconds: number) =>
  `${name}=${value}; Path=/; Max-Age=${seconds}; HttpOnly; Secure; SameSite=Lax`;
export function authConfigured(env: AuthEnv) {
  return !!(
    env.MEMBERS_DB &&
    env.AUTH_RATE_LIMIT &&
    env.GOOGLE_CLIENT_ID &&
    /^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/.test(
      env.GOOGLE_CLIENT_ID,
    ) &&
    env.APP_ORIGIN &&
    /^https:\/\/[a-z0-9.-]+$/.test(env.APP_ORIGIN)
  );
}
export function apiJson(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
      'content-security-policy': "default-src 'none'; frame-ancestors 'none'",
    },
  });
}
class AuthError extends Error {
  status: number;
  constructor(code: string, status = 401) {
    super(code);
    this.status = status;
  }
}
export async function verifyGoogleCredential(
  credential: string,
  clientId: string,
  nonce: string,
  keys: JWTVerifyGetKey = GOOGLE_KEYS,
) {
  const { payload } = await jwtVerify(credential, keys, {
    algorithms: ['RS256'],
    audience: clientId,
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    requiredClaims: ['sub', 'iat', 'exp', 'nonce'],
    maxTokenAge: '10m',
    clockTolerance: 5,
  });
  if (
    payload.nonce !== nonce ||
    typeof payload.sub !== 'string' ||
    !payload.sub ||
    payload.sub.length > 255 ||
    typeof payload.email !== 'string' ||
    payload.email.length > 320 ||
    payload.email_verified !== true ||
    (payload.azp !== undefined && payload.azp !== clientId)
  )
    throw new AuthError('invalid_credential');
  return {
    sub: payload.sub,
    email: payload.email,
    name:
      typeof payload.name === 'string' ? payload.name.slice(0, 100) : '會員',
  };
}
type Identity = Awaited<ReturnType<typeof verifyGoogleCredential>>;
type Member = { id: string; email: string; name: string; created_at: number };
async function currentSession(request: Request, db: D1Database) {
  const token = cookie(request, SESSION_COOKIE);
  if (!token) return null;
  const member = await db
    .prepare(
      'SELECT m.id, m.email, m.name, m.created_at FROM sessions s JOIN members m ON m.id = s.member_id WHERE s.token_hash = ? AND s.expires_at > ?',
    )
    .bind(await hashToken(token), now())
    .first<Member>();
  return member
    ? { member, token, csrfToken: await hashToken(`${token}:csrf`) }
    : null;
}
function sameOrigin(request: Request, env: AuthEnv) {
  if (
    request.headers.get('origin') !== env.APP_ORIGIN ||
    new URL(request.url).origin !== env.APP_ORIGIN
  )
    throw new AuthError('origin_not_allowed', 403);
}
async function readJson(request: Request): Promise<Record<string, unknown>> {
  if (
    !request.headers
      .get('content-type')
      ?.toLowerCase()
      .startsWith('application/json')
  )
    throw new AuthError('json_required', 415);
  // Bound the stream as well as Content-Length; chunked requests must not bypass the limit.
  if (Number(request.headers.get('content-length')) > 16384)
    throw new AuthError('request_too_large', 413);
  const reader = request.body?.getReader();
  if (!reader) throw new AuthError('invalid_request', 400);
  let text = '';
  let bytes = 0;
  const decoder = new TextDecoder();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > 16384) {
      await reader.cancel();
      throw new AuthError('request_too_large', 413);
    }
    text += decoder.decode(value, { stream: true });
  }
  try {
    const result = JSON.parse(text + decoder.decode());
    if (result && typeof result === 'object' && !Array.isArray(result))
      return result;
  } catch {
    /* invalid JSON */
  }
  throw new AuthError('invalid_request', 400);
}

// Verification dependency is injectable for signed-token tests; production always uses Google's fixed JWKS endpoint.
export async function handleAuth(
  request: Request,
  env: AuthEnv,
  verify: (
    token: string,
    clientId: string,
    nonce: string,
  ) => Promise<Identity> = verifyGoogleCredential,
): Promise<Response> {
  const path = new URL(request.url).pathname;
  const methods: Record<string, string> = {
    '/api/auth/config': 'POST',
    '/api/auth/session': 'GET',
    '/api/auth/google': 'POST',
    '/api/auth/logout': 'POST',
  };
  if (!methods[path]) return apiJson({ error: 'not_found' }, 404);
  if (request.method !== methods[path]) {
    const r = apiJson({ error: 'method_not_allowed' }, 405);
    r.headers.set('allow', methods[path]);
    return r;
  }
  if (!authConfigured(env))
    return apiJson({ error: 'auth_unavailable', enabled: false }, 503);
  const db = env.MEMBERS_DB!;
  try {
    if (path === '/api/auth/session') {
      const session = await currentSession(request, db);
      return apiJson({
        enabled: true,
        user: session?.member ?? null,
        csrfToken: session?.csrfToken ?? null,
      });
    }
    sameOrigin(request, env);
    if (path !== '/api/auth/logout') {
      // Login is anonymous: a generous per-network ceiling accommodates shared classrooms.
      // Cloudflare supplies this header. Do not accept a caller-provided X-Forwarded-For key.
      if (!env.AUTH_RATE_LIMIT) throw new AuthError('auth_unavailable', 503);
      const { success } = await env.AUTH_RATE_LIMIT.limit({
        key: `daily-tools-auth:${request.headers.get('cf-connecting-ip') ?? 'unknown'}`,
      });
      if (!success) {
        const response = apiJson({ error: 'too_many_attempts' }, 429);
        response.headers.set('retry-after', '60');
        return response;
      }
    }
    const body = await readJson(request);
    if (path === '/api/auth/config') {
      const nonce = randomToken();
      const timestamp = now();
      await db.batch([
        db
          .prepare('DELETE FROM auth_challenges WHERE expires_at <= ?')
          .bind(timestamp),
        db
          .prepare(
            'INSERT INTO auth_challenges (token_hash, expires_at) VALUES (?, ?)',
          )
          .bind(await hashToken(nonce), timestamp + 300),
      ]);
      const response = apiJson({
        enabled: true,
        clientId: env.GOOGLE_CLIENT_ID,
        nonce,
      });
      response.headers.append(
        'set-cookie',
        setCookie(LOGIN_COOKIE, nonce, 300),
      );
      return response;
    }
    if (path === '/api/auth/logout') {
      const session = await currentSession(request, db);
      if (session && request.headers.get('x-csrf-token') !== session.csrfToken)
        throw new AuthError('csrf_failed', 403);
      const token = cookie(request, SESSION_COOKIE);
      if (token)
        await db
          .prepare('DELETE FROM sessions WHERE token_hash = ?')
          .bind(await hashToken(token))
          .run();
      const response = apiJson({ user: null });
      response.headers.append('set-cookie', setCookie(SESSION_COOKIE, '', 0));
      response.headers.append('set-cookie', setCookie(LOGIN_COOKIE, '', 0));
      return response;
    }
    const nonce = cookie(request, LOGIN_COOKIE);
    if (!nonce || request.headers.get('x-csrf-token') !== nonce)
      throw new AuthError('csrf_failed', 403);
    if (typeof body.credential !== 'string' || body.credential.length > 12000)
      throw new AuthError('invalid_request', 400);
    const challengeHash = await hashToken(nonce);
    const challenge = await db
      .prepare(
        'SELECT token_hash FROM auth_challenges WHERE token_hash = ? AND expires_at > ?',
      )
      .bind(challengeHash, now())
      .first();
    if (!challenge) throw new AuthError('login_expired');
    let identity: Identity;
    try {
      identity = await verify(body.credential, env.GOOGLE_CLIENT_ID!, nonce);
    } catch {
      throw new AuthError('invalid_credential');
    }
    // DELETE RETURNING makes the challenge single-use, including concurrent callbacks.
    const consumed = await db
      .prepare(
        'DELETE FROM auth_challenges WHERE token_hash = ? AND expires_at > ? RETURNING token_hash',
      )
      .bind(challengeHash, now())
      .first();
    if (!consumed) throw new AuthError('login_expired');
    const sessionToken = randomToken();
    const timestamp = now();
    const oldToken = cookie(request, SESSION_COOKIE);
    await db.batch([
      db
        .prepare(
          'INSERT INTO members (id, google_sub, email, name, created_at, last_login_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(google_sub) DO UPDATE SET email = excluded.email, name = excluded.name, last_login_at = excluded.last_login_at',
        )
        .bind(
          crypto.randomUUID(),
          identity.sub,
          identity.email,
          identity.name,
          timestamp,
          timestamp,
        ),
      db
        .prepare('DELETE FROM sessions WHERE expires_at <= ? OR token_hash = ?')
        .bind(timestamp, oldToken ? await hashToken(oldToken) : ''),
      db
        .prepare(
          'INSERT INTO sessions (token_hash, member_id, created_at, expires_at) SELECT ?, id, ?, ? FROM members WHERE google_sub = ?',
        )
        .bind(
          await hashToken(sessionToken),
          timestamp,
          timestamp + SESSION_SECONDS,
          identity.sub,
        ),
    ]);
    const member = await db
      .prepare(
        'SELECT id, email, name, created_at FROM members WHERE google_sub = ?',
      )
      .bind(identity.sub)
      .first<Member>();
    const response = apiJson({
      user: member,
      csrfToken: await hashToken(`${sessionToken}:csrf`),
    });
    response.headers.append(
      'set-cookie',
      setCookie(SESSION_COOKIE, sessionToken, SESSION_SECONDS),
    );
    response.headers.append('set-cookie', setCookie(LOGIN_COOKIE, '', 0));
    return response;
  } catch (error) {
    return error instanceof AuthError
      ? apiJson({ error: error.message }, error.status)
      : apiJson({ error: 'auth_unavailable' }, 503);
  }
}
