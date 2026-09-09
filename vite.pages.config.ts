import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { defineConfig } from 'vite';
import { staticTarget } from './scripts/pages-paths.mjs';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export function staticConfig(targetName: 'pages' | 'site' | 'cloudflare') {
  const target = staticTarget(targetName);
  return defineConfig({
    root: path.resolve(projectRoot, 'web-preview'),
    base: target.base,
    publicDir: path.resolve(projectRoot, 'public'),
    define: {
      __SUITE_STATIC__: 'true',
      __SUITE_BASE__: JSON.stringify(target.base),
      __SUITE_PUBLIC_URL__: JSON.stringify(
        targetName === 'cloudflare'
          ? target.url
          : 'https://smallshop-pos-tw.taiwanape1.chatgpt.site/',
      ),
    },
    css: { postcss: { plugins: [tailwindcss()] } },
    plugins: [react()],
    resolve: {
      alias: {
        '@': projectRoot,
      },
    },
    build: {
      outDir: path.resolve(projectRoot, target.output),
      emptyOutDir: true,
    },
  });
}

export default staticConfig('pages');
