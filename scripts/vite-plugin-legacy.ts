import esbuild from 'esbuild';
import fs from 'node:fs';
import type { Plugin } from 'vite';

// ============================================================
// Plugin Vite che replica il vecchio build.js (F7) per la parte residua non-ESM:
// costruisce i CSS legacy, copia i vendor (break_eternity + break_infinity) e
// ricompila src/lib/arcade-loader.ts in un classic script IIFE per arcade.php.
// Gira nel hook closeBundle di `vite build`, DOPO che Vite ha scritto in dist/
// il bundle V3 (ESM): aggiunge allo stesso dist/ i residui non-ESM (CSS legacy,
// vendor, arcade-loader) — un solo comando, un solo output dist/.
//
// Il bundle JS legacy (dist/game.bundle.min.js) è STATO ELIMINATO (kill-legacy
// periferici Task 5): script.js, gamestate.js, intro.js, esposion.js, podio.js,
// social.js sono tutti moduli ESM caricati da src/main.ts. arcade-loader.ts è
// anch'esso un modulo ESM (sorgente unica, importato da main.ts per index.php),
// ma arcade.php è una pagina STANDALONE (window.open, niente game.modules.js) che
// non carica moduli V3 → serve una build classic separata: dist/arcade-loader.min.js
// (IIFE via esbuild). js/arcade-page.js resta classic e la consuma.
// ============================================================
const VENDORS: ReadonlyArray<readonly [string, string]> = [
  ['node_modules/break_eternity.js/dist/break_eternity.min.js', 'dist/break_eternity.min.js'],
  ['node_modules/break_infinity.js/dist/break_infinity.min.js', 'dist/break_infinity.min.js'],
];

async function buildLegacyCSS(isDev: boolean): Promise<void> {
  const shared = {
    bundle: true,
    minify: !isDev,
    sourcemap: false as const,
    target: ['es2018'],
    loader: { '.css': 'css' as const },
    external: ['*.webp', '*.png', '*.svg', '*.woff2', '*.woff', '*.ttf', 'assets/*'],
    logLevel: 'silent' as const,
  };
  await esbuild.build({ entryPoints: ['styles/main.css'], outfile: 'dist/styles.bundle.min.css', ...shared });
  const mobileCss = fs.readFileSync('styles/mobile.css', 'utf8');
  await esbuild.build({ stdin: { contents: mobileCss, loader: 'css', resolveDir: 'styles' }, outfile: 'dist/styles.mobile.min.css', ...shared });
}

function copyVendors(): void {
  for (const [src, dest] of VENDORS) {
    if (!fs.existsSync(src)) throw new Error('Vendor mancante: ' + src + ' — esegui `npm ci`');
    fs.copyFileSync(src, dest);
  }
}

/**
 * Ricompila src/lib/arcade-loader.ts in un classic script IIFE per arcade.php
 * (pagina standalone, window.open, non carica dist/game.modules.js).
 */
async function buildArcadeLoader(isDev: boolean): Promise<void> {
  await esbuild.build({
    entryPoints: ['src/lib/arcade-loader.ts'],
    bundle: true,
    format: 'iife',
    minify: !isDev,
    target: ['es2018'],
    outfile: 'dist/arcade-loader.min.js',
    logLevel: 'silent',
  });
}

/** Plugin Vite: dopo il build V3, produce i CSS legacy, copia i vendor e ricompila arcade-loader (IIFE). */
export default function legacyBundle(): Plugin {
  let isDev = false;
  return {
    name: 'espo-legacy-bundle',
    apply: 'build',
    configResolved(config) {
      isDev = config.mode === 'development';
      if (!fs.existsSync('dist')) fs.mkdirSync('dist');
    },
    async closeBundle() {
      await buildLegacyCSS(isDev);
      copyVendors();
      await buildArcadeLoader(isDev);
      const sizes = ['dist/break_infinity.min.js'].map((f) => {
        const kb = (fs.statSync(f).size / 1024).toFixed(1);
        return `${f} (${kb} KB)`;
      });
      console.log('[legacy vendor] ' + sizes.join('  '));
    },
  };
}
