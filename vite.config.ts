import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1];
const githubPagesBase = process.env.GITHUB_ACTIONS
  ? repositoryName?.endsWith('.github.io')
    ? '/'
    : `/${repositoryName ?? 'visioncart'}/`
  : '/';

export default defineConfig({
  base: process.env.BASE_PATH ?? githubPagesBase,
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    host: '0.0.0.0',
    port: Number(process.env.PORT ?? 5173),
    allowedHosts: true,
  },
});