import esbuild from 'esbuild';
import fs from 'node:fs';
import type { Plugin } from 'vite';

// ============================================================
// Plugin Vite che replica il vecchio build.js (F7): concatena i file legacy
// nell'ordine di dipendenza (globali window.*, NON ES modules), minifica ed
// emette dist/game.bundle.min.js; costruisce i CSS legacy; copia i vendor
// (break_eternity + break_infinity). Gira nel hook closeBundle di `vite build`,
// così un solo comando produce sia dist-v3/ (V3) sia dist/ (legacy).
//
// JS_FILES: ordine = ordine di dipendenza. Copiare verbatim a ogni aggiunta di
// file legacy. gamestate.js legge window.gameData.* a top-level → deve stare
// DOPO i data/*, data-en/* e i18n; script.js ULTIMO (god-object).
// ============================================================
const JS_FILES: readonly string[] = [
  'node_modules/lz-string/libs/lz-string.min.js',
  'js/backend-config.js',
  'js/save-db.js',
  'js/error-handler.js',
  'js/version-config.js',
  'js/asset-manager.js',
  'js/data/core.js',
  'js/data/skins.js',
  'js/data/teams.js',
  'js/data/upgrades.js',
  'js/data/achievements.js',
  'js/data-en/texts.js',
  'js/data-en/teams.js',
  'js/data-en/upgrades.js',
  'js/data-en/skins.js',
  'js/data-en/achievements.js',
  'js/data-en/events.js',
  'js/i18n.js',
  'js/data/gamestate.js',
  'js/ui-functions.js',
  'js/game-logic.js',
  'js/modals.js',
  'js/podio.js',
  'js/social.js',
  'js/arcade-loader.js',
  'js/intro.js',
  'js/esposion.js',
  'js/script.js',
];

const VENDORS: ReadonlyArray<readonly [string, string]> = [
  ['node_modules/break_eternity.js/dist/break_eternity.min.js', 'dist/break_eternity.min.js'],
  ['node_modules/break_infinity.js/dist/break_infinity.min.js', 'dist/break_infinity.min.js'],
];

async function buildLegacyJS(isDev: boolean): Promise<void> {
  const missing = JS_FILES.filter((f) => !fs.existsSync(f));
  if (missing.length) throw new Error('File legacy mancanti: ' + missing.join(', '));
  const concat = JS_FILES.map((f) => `/* === ${f} === */\n${fs.readFileSync(f, 'utf8')}`).join('\n\n');
  const result = await esbuild.build({
    stdin: { contents: concat, loader: 'js', sourcefile: 'game.bundle.js' },
    bundle: false,
    minify: !isDev,
    sourcemap: isDev ? 'inline' : false,
    target: ['es2018'],
    outfile: 'dist/game.bundle.min.js',
    logLevel: 'silent',
  });
  if (result.errors.length) throw new Error('Errori JS legacy: ' + JSON.stringify(result.errors));
}

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

/** Plugin Vite: dopo il build V3, produce il bundle legacy (JS+CSS) e copia i vendor. */
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
      await Promise.all([buildLegacyJS(isDev), buildLegacyCSS(isDev)]);
      copyVendors();
      const sizes = ['dist/game.bundle.min.js', 'dist/break_infinity.min.js'].map((f) => {
        const kb = (fs.statSync(f).size / 1024).toFixed(1);
        return `${f} (${kb} KB)`;
      });
      console.log('[legacy] ' + sizes.join('  '));
    },
  };
}
