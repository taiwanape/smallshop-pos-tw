import { readFile, writeFile, readdir, access, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { rebaseLexi, staticTarget } from './pages-paths.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const targetName = process.argv[2] ?? 'pages';
const target = staticTarget(targetName);
const output = resolve(root, target.output);
async function filesAt(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const groups = await Promise.all(
    entries.map((entry) =>
      entry.isDirectory()
        ? filesAt(resolve(directory, entry.name))
        : [resolve(directory, entry.name)],
    ),
  );
  return groups.flat();
}
const files = await filesAt(resolve(output, 'lexiharbor'));
for (const file of files.filter((file) =>
  ['.html', '.js'].includes(extname(file)),
)) {
  const original = await readFile(file, 'utf8');
  const rebased = rebaseLexi(original, target.base);
  if (rebased !== original) await writeFile(file, rebased);
  if (target.base !== '/' && /(['"])\/lexiharbor(?=\/|['"])/.test(rebased))
    throw new Error(`Unrebased path: ${file}`);
  if (
    target.base === '/' &&
    /(['"])\/smallshop-pos-tw\/lexiharbor(?=\/|['"])/.test(rebased)
  )
    throw new Error(`Unexpected GitHub path in root build: ${file}`);
}
for (const name of [
  'index.html',
  'lexiharbor/index.html',
  'design/pet-atlas.png',
  'design/noodle-mascot.png',
  'design/reading-mascot.png',
]) {
  await access(resolve(output, name));
}
const html = await readFile(resolve(output, 'lexiharbor/index.html'), 'utf8');
for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
  const url = match[1];
  if (url.startsWith(target.base) && !url.startsWith('//'))
    await access(
      resolve(output, decodeURIComponent(url.slice(target.base.length))),
    );
  else if (url.startsWith('/') && !url.startsWith('//'))
    throw new Error(`Incorrect Pages asset: ${url}`);
}
const versionSource = await readFile(
  resolve(root, 'lib/suite-paths.ts'),
  'utf8',
);
const version = versionSource.match(/SUITE_VERSION\s*=\s*['"]([^'"]+)/)?.[1];
if (!version) throw new Error('Missing suite version');
const entryFile = resolve(output, 'index.html');
const entryHtml = (await readFile(entryFile, 'utf8'))
  .replace(/(<meta\s+property="og:url"\s+content=")[^"]+/, `$1${target.url}`)
  .replace(/(<meta\s+name="app-version"\s+content=")[^"]+/, `$1${version}`);
await writeFile(entryFile, entryHtml);
// Preserve bookmarks from the previous server-rendered Sites version.
if (targetName === 'site') {
  for (const route of ['classroom', 'learn', 'pos', 'demo']) {
    const destination = `/#/${route === 'demo' ? 'pos' : route}`;
    const directory = resolve(output, route);
    await mkdir(directory, { recursive: true });
    await writeFile(
      resolve(directory, 'index.html'),
      `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=${destination}"><title>日常工具所</title></head><body><a href="${destination}">開啟日常工具所</a></body></html>`,
    );
  }
}
const commit = execFileSync('git', ['rev-parse', 'HEAD'], {
  cwd: root,
  encoding: 'utf8',
}).trim();
const audioCount = files.filter((file) => /\.(mp3|m4a|wav)$/.test(file)).length;
if (audioCount < 106)
  throw new Error(`Incomplete LexiHarbor audio: ${audioCount}`);
await writeFile(resolve(output, '.nojekyll'), '');
await writeFile(
  resolve(output, 'release.json'),
  JSON.stringify(
    { version, commit, audioCount, base: target.base, url: target.url },
    null,
    2,
  ) + '\n',
);
console.log(
  `${targetName} ready: ${version}; ${audioCount} audio clips; all entry assets verified.`,
);
