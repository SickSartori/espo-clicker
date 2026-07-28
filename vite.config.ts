import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import legacyBundle from './scripts/vite-plugin-legacy.js';

// Vite: build UNICO (F7). Produce dist/game.modules.js (unico bundle ESM, V3)
// e — tramite il plugin legacyBundle (closeBundle) — i residui non-ESM: CSS
// legacy, vendor (break_eternity/break_infinity) e dist/arcade-loader.min.js
// (IIFE per arcade.php, pagina standalone). Ha sostituito il vecchio build.js.
export default defineConfig({
  // Il plugin legacy emette i residui non-ESM (CSS, vendor, arcade-loader IIFE) dopo il build V3.
  plugins: [legacyBundle()],
  root: '.',
  // Base RELATIVA: il bundle vive sotto /dist/ ma il mount point cambia per
  // ambiente (root Altervista vs /test/ vs localhost). Con base assoluta ('/')
  // Vite emetteva new Worker(new URL('/assets/x.worker.js')) → 404 ovunque.
  base: '',
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
    outDir: 'dist',
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
          if (name.endsWith('.css')) return 'assets/styles.css';
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
