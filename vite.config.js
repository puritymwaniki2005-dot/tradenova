import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative asset paths allow the built app to work from GitHub Pages subpaths.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { host: true, port: 5173 },
  build: { target: 'es2020', outDir: 'dist', emptyOutDir: true },
});
