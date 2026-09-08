import { readFile, writeFile, readdir, access } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { rebaseLexi, PAGES_BASE } from './pages-paths.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const output = resolve(root, 'dist-pages');
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
  const rebased = rebaseLexi(original);
  if (rebased !== original) await writeFile(file, rebased);
  if (/(['"])\/lexiharbor(?=\/|['"])/.test(rebased))
    throw new Error(`Unrebased path: ${file}`);
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
  if (url.startsWith(PAGES_BASE))
    await access(
      resolve(output, decodeURIComponent(url.slice(PAGES_BASE.length))),
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
  JSON.stringify({ version, commit, audioCount, base: PAGES_BASE }, null, 2) +
    '\n',
);
console.log(
  `Pages ready: ${version}; ${audioCount} audio clips; all entry assets verified.`,
);
