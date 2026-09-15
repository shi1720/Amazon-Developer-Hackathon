import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  css: { postcss: { plugins: [tailwindcss()] } },
  build: { outDir: 'dist/client' },
  server: {
    host: '127.0.0.1',
    port: 3001,
    proxy: {
      '/api': 'http://127.0.0.1:3002',
      '/mcp': 'http://127.0.0.1:3002',
    },
  },
});
