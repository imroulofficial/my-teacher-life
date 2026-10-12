import { defineConfig } from 'vite';

// Relative base so the bundle loads from the Android WebView's local files.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2019',
    assetsInlineLimit: 0,
  },
  server: {
    host: true,
  },
});
