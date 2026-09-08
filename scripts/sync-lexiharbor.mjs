import { cp, readFile, access, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const source = resolve(root, '../lexiharbor/dist');
const target = resolve(root, 'public/lexiharbor');
await access(resolve(source, 'index.html'));
await cp(source, target, { recursive: true });
const commit = execFileSync(
  'git',
  ['-C', resolve(root, '../lexiharbor'), 'rev-parse', 'HEAD'],
  { encoding: 'utf8' },
).trim();
const packageJson = JSON.parse(
  await readFile(resolve(root, '../lexiharbor/package.json'), 'utf8'),
);
await mkdir(resolve(root, 'docs'), { recursive: true });
await writeFile(
  resolve(root, 'docs/lexiharbor-source.json'),
  JSON.stringify(
    {
      version: packageJson.version,
      commit,
      sourceProject: '../lexiharbor',
      mount: '/lexiharbor/',
    },
    null,
    2,
  ) + '\n',
);
console.log('LexiHarbor export and attribution synchronized.');
