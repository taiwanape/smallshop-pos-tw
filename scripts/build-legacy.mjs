import { mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import { SUITE_VERSION, SUITE_PUBLIC_URL } from '../lib/suite-paths.ts';

const target = process.argv[2];
if (!['pages', 'site'].includes(target))
  throw new Error('Choose pages or site');
const root = process.cwd();
const directory = target === 'pages' ? 'dist-pages' : 'out';
const output = resolve(root, directory);
if (dirname(output) !== root || relative(root, output) !== directory)
  throw new Error('Unsafe output directory');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
const destination = new URL(SUITE_PUBLIC_URL);
if (
  destination.protocol !== 'https:' ||
  destination.hostname !== 'daily-tools.taiwanape.workers.dev'
)
  throw new Error('Invalid destination');
const routes = ['', 'classroom', 'learn', 'pos', 'demo', 'lexiharbor'];
for (const route of routes) {
  const selected =
    route === 'lexiharbor' ? 'learn' : route === 'demo' ? 'pos' : route;
  const url = `${destination.href}${selected ? `#/${selected}` : ''}`;
  const html = `<!doctype html><html lang="zh-Hant-TW"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0;url=${url}"><title>日常工具所</title><link rel="canonical" href="${url}"></head><body><p>正在開啟日常工具所… <a href="${url}">前往網站</a></p><script>const allowed = ['home','classroom','learn','pos','demo']; const hash = location.hash.replace(/^#\\//, ''); const selected = allowed.includes(hash) ? (hash === 'demo' ? 'pos' : hash) : ${JSON.stringify(selected)}; location.replace(${JSON.stringify(destination.href)} + (selected ? '#/' + selected : ''));</script></body></html>`;
  const folder = resolve(output, route);
  await mkdir(folder, { recursive: true });
  await writeFile(resolve(folder, 'index.html'), html);
  if (!route) await writeFile(resolve(output, '404.html'), html);
}
await writeFile(
  resolve(output, 'release.json'),
  JSON.stringify({
    version: SUITE_VERSION,
    commit: execFileSync('git', ['rev-parse', 'HEAD'], {
      encoding: 'utf8',
    }).trim(),
    redirectTo: destination.href,
  }),
);
console.log(`${target}: redirect-only website → ${destination.href}`);
