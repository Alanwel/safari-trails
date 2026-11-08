import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: true,
    // The workspace is an NFS mount, where inotify does not fire. Without
    // polling, Vite silently keeps serving stale modules after an edit.
    watch: { usePolling: true, interval: 400 },
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  preview: {
    port: 4173,
    host: true,
    // `npm run preview` serves the real production build; proxy /api to the
    // local API so the built site can be tested exactly as it will deploy.
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
