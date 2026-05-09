import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Vite v3 dual-build setup.
// Output: dist-v3/game.modules.js (ESM) — caricato in parallelo a dist/game.bundle.min.js
// durante migrazione strangler. Quando tutto migrato, dist/ viene eliminato e build.js droppato.
export default defineConfig({
  root: '.',
  publicDir: false, // assets serviti da PHP, no copia
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@core': resolve(__dirname, 'src/core'),
      '@game': resolve(__dirname, 'src/game'),
      '@ui': resolve(__dirname, 'src/ui'),
      '@workers': resolve(__dirname, 'src/workers'),
    },
  },
  build: {
    target: 'es2022',
    outDir: 'dist-v3',
    emptyOutDir: true,
    sourcemap: true,
    minify: 'esbuild',
    cssCodeSplit: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/main.ts'),
      },
      output: {
        entryFileNames: 'game.modules.js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        // CSS principale con nome stabile (linkato da PHP).
        // Asset binari mantengono hash per cache busting.
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name ?? '';
          if (name.endsWith('.css')) return 'assets/v3-styles.css';
          return 'assets/[name]-[hash][extname]';
        },
        format: 'es',
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.d.ts'],
    },
  },
});
