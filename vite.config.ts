import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build` makes a normal static site for Caddy.
// `npm run build:single` makes one self-contained index.html for sharing as a test link.
export default defineConfig(({ mode }) => ({
  plugins: mode === 'single' ? [react(), viteSingleFile()] : [react()],
  // The single-file test build is served from a sub-path, so it loads public/ files relatively.
  base: mode === 'single' ? './' : '/',
  build: { outDir: mode === 'single' ? 'dist-single' : 'dist' },
  test: { environment: 'node' },
}));
