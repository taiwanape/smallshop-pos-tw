import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import {
  handleAuth,
  hashToken,
  verifyGoogleCredential,
} from '../worker/auth.ts';
import type { AuthEnv } from '../worker/auth.ts';

const origin = 'https://daily-tools.taiwanape.workers.dev';
const clientId = '123-test.apps.googleusercontent.com';
const loginCookieName = '__Host-daily-tools-login';
const sessionCookieName = '__Host-daily-tools-session';
const identity = {
  sub: 'google-person-1',
  email: 'person@example.test',
  name: 'Test Person',
};
const verifyIdentity = async () => identity;
type SqlValue = string | number | null;
type SessionBody = {
  user: { id: string; email: string; name: string } | null;
  csrfToken: string | null;
};

function memoryD1() {
  const sql = new DatabaseSync(':memory:');
  sql.exec(
    readFileSync(
      new URL('../worker/migrations/0001_members.sql', import.meta.url),
      'utf8',
    ),
  );
  function prepare(query: string) {
    let values: SqlValue[] = [];
    return {
      bind(...args: SqlValue[]) {
        values = args;
        return this;
      },
      async first<T>() {
        return (sql.prepare(query).get(...values) ?? null) as T | null;
      },
      async run() {
        const result = sql.prepare(query).run(...values);
        return { success: true, meta: { changes: Number(result.changes) } };
      },
      execute() {
        return sql.prepare(query).run(...values);
      },
    };
  }
  const adapter = {
    prepare,
    async batch(statements: ReturnType<typeof prepare>[]) {
      sql.exec('BEGIN');
      try {
        const result = statements.map((statement) => statement.execute());
        sql.exec('COMMIT');
        return result;
      } catch (error) {
        sql.exec('ROLLBACK');
        throw error;
      }
    },
  };
  const db = adapter as unknown as D1Database;
  const env: AuthEnv = {
    MEMBERS_DB: db,
    GOOGLE_CLIENT_ID: clientId,
    APP_ORIGIN: origin,
    AUTH_RATE_LIMIT: { limit: async () => ({ success: true }) },
  };
  return { sql, db, env };
}
function post(
  path: string,
  body: Record<string, unknown> = {},
  cookie = '',
  csrf = '',
  requestOrigin = origin,
) {
  return new Request(origin + path, {
    method: 'POST',
    headers: {
      origin: requestOrigin,
      'content-type': 'application/json',
      cookie,
      'x-csrf-token': csrf,
    },
    body: JSON.stringify(body),
  });
}
function responseCookie(response: Response, name: string) {
  const header = response.headers
    .getSetCookie()
    .find((value) => value.startsWith(`${name}=`));
  assert.ok(header, `Missing ${name} cookie`);
  assert.match(
    header,
    /; Path=\/; Max-Age=\d+; HttpOnly; Secure; SameSite=Lax$/,
  );
  return header.split(';')[0];
}
async function challenge(env: AuthEnv, sessionCookie = '') {
  const response = await handleAuth(
    post('/api/auth/config', {}, sessionCookie),
    env,
    verifyIdentity,
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const data = (await response.json()) as { nonce: string; clientId: string };
  assert.equal(data.clientId, clientId);
  assert.match(data.nonce, /^[a-f0-9]{64}$/);
  return { data, cookie: responseCookie(response, loginCookieName) };
}
async function session(env: AuthEnv, cookie: string) {
  const response = await handleAuth(
    new Request(origin + '/api/auth/session', { headers: { cookie } }),
    env,
    verifyIdentity,
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  return (await response.json()) as SessionBody;
}
async function login(env: AuthEnv, oldCookie = '', verify = verifyIdentity) {
  const c = await challenge(env, oldCookie);
  return handleAuth(
    post(
      '/api/auth/google',
      { credential: 'test-credential' },
      `${c.cookie}; ${oldCookie}`,
      c.data.nonce,
    ),
    env,
    verify,
  );
}

test('single-use challenge, member upsert, session rotation and CSRF-safe logout use real SQLite', async (t) => {
  const { sql, env } = memoryD1();
  t.after(() => sql.close());
  const first = await challenge(env);
  assert.equal(
    sql.prepare('SELECT token_hash FROM auth_challenges').get()?.token_hash,
    await hashToken(first.data.nonce),
  );
  const attempt = () =>
    handleAuth(
      post(
        '/api/auth/google',
        { credential: 'test-credential' },
        first.cookie,
        first.data.nonce,
      ),
      env,
      verifyIdentity,
    );
  const replies = await Promise.all([attempt(), attempt()]);
  assert.deepEqual(
    replies.map((reply) => reply.status).sort((a, b) => a - b),
    [200, 401],
  );
  const success = replies.find((reply) => reply.status === 200)!;
  const firstUser = (await success.json()) as SessionBody;
  assert.ok(firstUser.user);
  assert.ok(firstUser.csrfToken);
  const firstCookie = responseCookie(success, sessionCookieName);
  const firstToken = firstCookie.slice(sessionCookieName.length + 1);
  assert.equal(
    sql.prepare('SELECT token_hash FROM sessions').get()?.token_hash,
    await hashToken(firstToken),
  );
  assert.equal(
    sql.prepare('SELECT COUNT(*) AS count FROM auth_challenges').get()?.count,
    0,
  );
  assert.equal((await session(env, firstCookie)).user?.id, firstUser.user.id);
  const secondReply = await login(env, firstCookie);
  assert.equal(secondReply.status, 200);
  const secondUser = (await secondReply.json()) as SessionBody;
  assert.equal(secondUser.user?.id, firstUser.user.id);
  assert.ok(secondUser.csrfToken);
  const secondCookie = responseCookie(secondReply, sessionCookieName);
  assert.notEqual(secondCookie, firstCookie);
  assert.notEqual(secondUser.csrfToken, firstUser.csrfToken);
  assert.equal(
    sql.prepare('SELECT COUNT(*) AS count FROM members').get()?.count,
    1,
  );
  assert.equal(
    sql.prepare('SELECT COUNT(*) AS count FROM sessions').get()?.count,
    1,
  );
  assert.equal((await session(env, firstCookie)).user, null);
  assert.equal(
    (
      await handleAuth(
        post('/api/auth/logout', {}, secondCookie, 'wrong'),
        env,
        verifyIdentity,
      )
    ).status,
    403,
  );
  assert.equal((await session(env, secondCookie)).user?.id, firstUser.user.id);
  const logout = await handleAuth(
    post('/api/auth/logout', {}, secondCookie, secondUser.csrfToken),
    env,
    verifyIdentity,
  );
  assert.equal(logout.status, 200);
  assert.equal(
    responseCookie(logout, sessionCookieName),
    `${sessionCookieName}=`,
  );
  assert.equal(responseCookie(logout, loginCookieName), `${loginCookieName}=`);
  assert.equal(
    sql.prepare('SELECT COUNT(*) AS count FROM sessions').get()?.count,
    0,
  );
  assert.equal((await session(env, secondCookie)).user, null);
});

test('real RSA JWT verification enforces signature, issuer, audience, time, nonce and verified email', async () => {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const publicJwk = await exportJWK(publicKey);
  const keys = createLocalJWKSet({
    keys: [{ ...publicJwk, kid: 'test-key', alg: 'RS256' }],
  });
  const nonce = 'test-nonce';
  const timestamp = Math.floor(Date.now() / 1000);
  const claims = {
    ...identity,
    email_verified: true,
    nonce,
    iss: 'https://accounts.google.com',
    aud: clientId,
    iat: timestamp,
    exp: timestamp + 300,
  };
  const sign = (overrides: Record<string, unknown> = {}) =>
    new SignJWT({ ...claims, ...overrides })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .sign(privateKey);
  assert.deepEqual(
    await verifyGoogleCredential(await sign(), clientId, nonce, keys),
    identity,
  );
  for (const overrides of [
    { nonce: 'wrong' },
    { nonce: undefined },
    { aud: 'another-client' },
    { iss: 'https://other.example' },
    { exp: timestamp - 60 },
    { exp: undefined },
    { iat: timestamp - 900 },
    { iat: timestamp + 60 },
    { email_verified: false },
    { azp: 'another-client' },
  ]) {
    await assert.rejects(
      verifyGoogleCredential(await sign(overrides), clientId, nonce, keys),
    );
  }
  const { privateKey: otherKey } = await generateKeyPair('RS256');
  const wrongSignature = await new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
    .sign(otherKey);
  await assert.rejects(
    verifyGoogleCredential(wrongSignature, clientId, nonce, keys),
  );
});

test('cross-origin, forged/expired sessions, stale challenges and malformed payloads fail closed', async (t) => {
  const { sql, env } = memoryD1();
  t.after(() => sql.close());
  assert.equal(
    (
      await handleAuth(
        post('/api/auth/config', {}, '', '', 'https://other.example'),
        env,
      )
    ).status,
    403,
  );
  assert.equal(
    sql.prepare('SELECT COUNT(*) AS count FROM auth_challenges').get()?.count,
    0,
  );
  const c = await challenge(env);
  assert.equal(
    (
      await handleAuth(
        post('/api/auth/google', { credential: 'bad' }, c.cookie, 'wrong'),
        env,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await handleAuth(
        post(
          '/api/auth/google',
          { credential: 'x'.repeat(20000) },
          c.cookie,
          c.data.nonce,
        ),
        env,
      )
    ).status,
    413,
  );
  assert.equal(
    (
      await handleAuth(
        post('/api/auth/google', { credential: 'bad' }, c.cookie, c.data.nonce),
        env,
        async () => {
          throw new Error('bad signature');
        },
      )
    ).status,
    401,
  );
  assert.equal(
    sql.prepare('SELECT COUNT(*) AS count FROM members').get()?.count,
    0,
  );
  sql.prepare('UPDATE auth_challenges SET expires_at = 0').run();
  assert.equal(
    (
      await handleAuth(
        post(
          '/api/auth/google',
          { credential: 'test' },
          c.cookie,
          c.data.nonce,
        ),
        env,
        verifyIdentity,
      )
    ).status,
    401,
  );
  const response = await login(env);
  const sc = responseCookie(response, sessionCookieName);
  sql.prepare('UPDATE sessions SET expires_at = 0').run();
  assert.equal((await session(env, sc)).user, null);
  assert.equal(
    (await session(env, `${sessionCookieName}=${'f'.repeat(64)}`)).user,
    null,
  );
  assert.equal((await handleAuth(post('/api/auth/config'), {})).status, 503);
  assert.equal(
    (await handleAuth(new Request(origin + '/api/auth/config'), env)).status,
    405,
  );
});

test('Google subject is the account key, and database failures never issue a session', async (t) => {
  const { sql, env } = memoryD1();
  t.after(() => sql.close());
  const first = (await (await login(env)).json()) as SessionBody;
  const second = (await (
    await login(env, '', async () => ({
      ...identity,
      sub: 'different-google-sub',
    }))
  ).json()) as SessionBody;
  assert.notEqual(first.user?.id, second.user?.id);
  assert.equal(
    sql.prepare('SELECT COUNT(*) AS count FROM members').get()?.count,
    2,
  );
  sql.exec(
    "CREATE TRIGGER fail_session BEFORE INSERT ON sessions BEGIN SELECT RAISE(FAIL, 'test storage failure'); END",
  );
  const failure = await login(env, '', async () => ({
    ...identity,
    sub: 'must-rollback',
  }));
  assert.equal(failure.status, 503);
  assert.equal(failure.headers.getSetCookie().length, 0);
  assert.equal(
    sql.prepare('SELECT COUNT(*) AS count FROM members').get()?.count,
    2,
  );
});

test('rate limiting rejects login attempts before database writes or token validation', async (t) => {
  const { sql, env } = memoryD1();
  t.after(() => sql.close());
  env.AUTH_RATE_LIMIT = { limit: async () => ({ success: false }) };
  for (const path of ['/api/auth/config', '/api/auth/google']) {
    const response = await handleAuth(post(path), env, async () => {
      throw new Error('must not verify');
    });
    assert.equal(response.status, 429);
    assert.equal(response.headers.get('retry-after'), '60');
  }
  assert.equal(
    sql.prepare('SELECT COUNT(*) AS count FROM auth_challenges').get()?.count,
    0,
  );
});
