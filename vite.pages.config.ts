import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { defineConfig } from 'vite';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.resolve(projectRoot, 'web-preview'),
  base: '/smallshop-pos-tw/',
  publicDir: path.resolve(projectRoot, 'public'),
  define: {
    __SUITE_STATIC__: 'true',
    __SUITE_BASE__: JSON.stringify('/smallshop-pos-tw/'),
  },
  css: { postcss: { plugins: [tailwindcss()] } },
  plugins: [react()],
  resolve: {
    alias: {
      '@': projectRoot,
    },
  },
  build: {
    outDir: path.resolve(projectRoot, 'dist-pages'),
    emptyOutDir: true,
  },
});
