import assert from 'node:assert/strict';
import { test } from 'node:test';
import worker from '../worker/index.ts';
import { deploymentUrl, staticTarget } from '../scripts/pages-paths.mjs';

const env = {
  ASSETS: { fetch: async () => new Response('missing asset', { status: 404 }) },
};

test('hosted API reports real capabilities, supports HEAD and rejects writes', async () => {
  const get = await worker.fetch(
    new Request('https://example.com/api/health'),
    env,
  );
  assert.equal(get.status, 200);
  assert.match(get.headers.get('content-type') ?? '', /application\/json/);
  assert.equal(get.headers.get('cache-control'), 'no-store');
  const status = (await get.json()) as {
    accounts: boolean;
    billing: boolean;
    storage: string;
  };
  assert.equal(status.accounts, false);
  assert.equal(status.billing, false);
  assert.equal(status.storage, 'browser-local');
  const head = await worker.fetch(
    new Request('https://example.com/api/health', { method: 'HEAD' }),
    env,
  );
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  const post = await worker.fetch(
    new Request('https://example.com/api/health', { method: 'POST' }),
    env,
  );
  assert.equal(post.status, 405);
  assert.equal(post.headers.get('allow'), 'GET, HEAD');
});

test('unknown API routes cannot fall through to HTML; missing assets keep their 404', async () => {
  for (const path of ['/api', '/api/checkout', '/api/auth']) {
    const response = await worker.fetch(
      new Request(`https://example.com${path}`),
      {
        ASSETS: {
          fetch: async () => {
            throw new Error('API fell through to asset server');
          },
        },
      },
    );
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: 'not_found' });
  }
  const asset = await worker.fetch(
    new Request('https://example.com/assets/missing.wav'),
    env,
  );
  assert.equal(asset.status, 404);
  assert.equal(await asset.text(), 'missing asset');
});

test('an unconfigured host never publishes a made-up domain or credential-bearing URL', () => {
  assert.equal(staticTarget('cloudflare', '').url, null);
  assert.equal(staticTarget('cloudflare', '').base, '/');
  assert.equal(staticTarget('cloudflare', '').output, 'dist-cloudflare');
  assert.equal(deploymentUrl('https://example.com'), 'https://example.com/');
  for (const url of [
    'http://example.com',
    'https://user:pass@example.com',
    'https://example.com/private',
    'https://example.com/?token=x',
    'https://example.com/#route',
    'not a URL',
  ]) {
    assert.throws(() => deploymentUrl(url));
  }
});
