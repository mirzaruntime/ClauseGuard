import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 5173,
    // The API client defaults to the relative path "/api" (see src/api/client.ts),
    // so in dev that request lands here and gets forwarded to the real backend
    // (default backend PORT=4000). Override with
    // VITE_API_BASE_URL in .env.local to point at a different backend instead.
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    sourcemap: false,
  },
});
