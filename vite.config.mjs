import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import mkcert from 'vite-plugin-mkcert';

// Relative base for the production build so assets resolve under the extension's
// CDN folder (dev keeps /dist/ to match the localhost hub URL).
export default defineConfig(({ command }) => ({
  plugins: [react(), mkcert()],
  base: command === 'build' ? './' : '/dist/',
  server: {
    port: 3500,
    strictPort: true,
    cors: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.{js,jsx}'],
  },
}));
