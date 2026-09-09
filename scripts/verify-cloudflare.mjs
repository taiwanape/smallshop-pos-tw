import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve, relative } from 'node:path';

const target = new URL(process.argv[2] || 'http://127.0.0.1:8787');
assert.ok(
  target.protocol === 'https:' ||
    (target.protocol === 'http:' &&
      ['localhost', '127.0.0.1'].includes(target.hostname)),
  'Use HTTPS, or HTTP for a local preview',
);
assert.ok(
  !target.username &&
    !target.password &&
    !target.search &&
    !target.hash &&
    target.pathname === '/',
  'Pass only the deployment origin',
);
const output = resolve('dist-cloudflare');
const expected = JSON.parse(
  await readFile(resolve(output, 'release.json'), 'utf8'),
);
const request = (path, options = {}) =>
  fetch(new URL(path, target), {
    ...options,
    signal: AbortSignal.timeout(25000),
  });
const releaseResponse = await request('/release.json');
assert.equal(releaseResponse.status, 200);
const release = await releaseResponse.json();
assert.equal(
  release.commit,
  expected.commit,
  'Published source differs from the local artifact',
);
assert.equal(release.version, expected.version);
assert.equal(release.base, '/');
assert.equal(
  release.url,
  expected.url,
  'Published sharing URL differs from the build',
);
if (target.protocol === 'https:') {
  assert.equal(
    release.url,
    target.href,
    'Set PUBLIC_SITE_URL to the production origin before the final deployment',
  );
}
const home = await request('/');
assert.equal(home.status, 200);
const html = await home.text();
assert.ok(
  html.includes(expected.version) && html.includes('/assets/index-'),
  'Homepage is not the expected app',
);
const sharingMeta = [...html.matchAll(/<meta\b[^>]*>/gi)]
  .map(([tag]) => tag)
  .find((tag) => /\bproperty\s*=\s*(['"])og:url\1/i.test(tag));
if (expected.url) {
  const sharingUrl = sharingMeta?.match(/\bcontent\s*=\s*(['"])(.*?)\1/i)?.[2];
  assert.equal(
    sharingUrl,
    expected.url,
    'Homepage sharing metadata does not match the deployment URL',
  );
} else {
  assert.equal(sharingMeta, undefined, 'Unset URL must not be guessed');
}
const healthResponse = await request('/api/health');
assert.equal(healthResponse.status, 200);
assert.match(
  healthResponse.headers.get('content-type') || '',
  /application\/json/,
);
assert.equal(healthResponse.headers.get('cache-control'), 'no-store');
const health = await healthResponse.json();
assert.equal(health.version, expected.version);
assert.equal(health.service, 'daily-tools');
assert.equal(health.status, 'ok');
assert.equal(health.storage, 'browser-local');
assert.equal(health.accounts, false);
assert.equal(health.billing, false);
for (const path of ['/api', '/api/not-implemented']) {
  const response = await request(path);
  assert.equal(response.status, 404);
  assert.match(response.headers.get('content-type') || '', /application\/json/);
}
for (const route of ['classroom', 'learn', 'pos', 'demo']) {
  for (const suffix of ['', '/']) {
    const response = await request(`/${route}${suffix}`);
    assert.equal(response.status, 200, `Legacy path ${route}${suffix}`);
    assert.ok(
      (await response.text()).includes(
        `/#/${route === 'demo' ? 'pos' : route}`,
      ),
    );
  }
}
const missing = await request('/assets/does-not-exist-deployment-check.js');
assert.equal(
  missing.status,
  404,
  'Missing asset should not return HTML with status 200',
);
const lexi = await request('/lexiharbor/index.html');
assert.equal(lexi.status, 200);
assert.ok((await lexi.text()).includes('/lexiharbor/_expo/'));
assert.equal(lexi.headers.get('x-frame-options'), 'SAMEORIGIN');
assert.match(
  lexi.headers.get('content-security-policy') || '',
  /frame-ancestors 'self'/,
);
async function filesAt(path) {
  return (
    await Promise.all(
      (
        await readdir(path, { withFileTypes: true })
      ).map((entry) =>
        entry.isDirectory()
          ? filesAt(resolve(path, entry.name))
          : [resolve(path, entry.name)],
      ),
    )
  ).flat();
}
const assets = (await filesAt(output)).filter((path) =>
  /\.(js|css|png|jpg|jpeg|svg|webp|ttf|woff2?|wav|mp3|m4a)$/.test(path),
);
const failures = [];
let cursor = 0;
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (cursor < assets.length) {
      const path =
        '/' +
        relative(output, assets[cursor++])
          .replaceAll('\\', '/')
          .split('/')
          .map(encodeURIComponent)
          .join('/');
      try {
        const response = await request(path, { method: 'HEAD' });
        if (
          !response.ok ||
          response.headers.get('content-type')?.includes('text/html')
        )
          failures.push(`${path}: ${response.status}`);
      } catch (error) {
        failures.push(`${path}: ${error.message}`);
      }
    }
  }),
);
assert.deepEqual(failures, []);
const audioCount = assets.filter((path) =>
  /\.(wav|mp3|m4a)$/.test(path),
).length;
assert.equal(audioCount, expected.audioCount);
console.log(
  JSON.stringify(
    {
      origin: target.origin,
      version: expected.version,
      commit: expected.commit,
      checkedAssets: assets.length,
      audioCount,
      legacyPaths: 8,
      api: health,
      result: 'passed',
    },
    null,
    2,
  ),
);
