import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // Relative asset URLs: the same build works at the domain root and under
  // https://jpm70.github.io/alicante-traffic-live/ (GitHub Pages project site)
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': root,
    },
  },
  server: {
    port: 3000,
  },
});
