const esbuild = require('esbuild');
const fs = require('fs');

const isDev = process.argv.includes('--dev');
const isWatch = process.argv.includes('--watch');

if (!fs.existsSync('dist')) fs.mkdirSync('dist');

// ============================================================
// JS: concatena nell'ordine corretto, poi minifica
// NON bundle con module system — il codice usa globali (window.*)
// ============================================================
const JS_FILES = [
  // LZ-String (bundlato localmente, era su CDN)
  'node_modules/lz-string/libs/lz-string.min.js',

  // Save system V9
  'js/save-db.js',
  'js/error-handler.js',

  // CRITICO: version prima di gamestate (gamestate:113 chiama getInitialGameState() top-level)
  'js/version-config.js',

  // Asset system
  'js/asset-packages.js',
  'js/asset-manager.js',

  // Game data — gamestate.js ULTIMO: legge window.gameData.* definiti dagli altri
  'js/data/core.js',
  'js/data/assets.js',
  'js/data/skins.js',
  'js/data/teams.js',
  'js/data/upgrades.js',
  'js/data/achievements.js',
  'js/data/events.js',
  'js/data/texts.js',
  'js/data/gamestate.js', // dipende da tutti i file sopra (window.gameData.*)


  // UI + logic
  'js/ui-functions.js',
  'js/game-logic.js',
  'js/modals.js',
  'js/podio.js',

  // Arcade lazy loader
  'js/arcade-loader.js',

  // Main (deve essere ultimo)
  'js/script.js',
];

const buildJS = async () => {
  // Controlla che tutti i file esistano
  const missing = JS_FILES.filter(f => !fs.existsSync(f));
  if (missing.length) {
    console.error('File mancanti:', missing);
    process.exit(1);
  }

  // Concatena tutti i file con separatori
  const concat = JS_FILES
    .map(f => `/* === ${f} === */\n${fs.readFileSync(f, 'utf8')}`)
    .join('\n\n');

  // Minifica (no bundle — già tutto concatenato)
  const result = await esbuild.build({
    stdin: {
      contents: concat,
      loader: 'js',
      sourcefile: 'game.bundle.js',
    },
    bundle: false,
    minify: !isDev,
    sourcemap: isDev ? 'inline' : false,
    target: ['es2018'],
    outfile: 'dist/game.bundle.min.js',
    logLevel: 'silent',
  });

  if (result.errors.length) {
    console.error('Errori JS:', result.errors);
    process.exit(1);
  }
};

// ============================================================
// CSS: esbuild bundla e minifica (CSS non ha il problema globali)
// ============================================================
const cssShared = {
  bundle: true,
  minify: !isDev,
  sourcemap: false,
  target: ['es2018'],
  loader: { '.css': 'css' },
  external: ['*.webp', '*.png', '*.svg', '*.woff2', '*.woff', '*.ttf', 'assets/*'],
  logLevel: 'silent',
};

const buildCSS = async () => {
  await esbuild.build({
    entryPoints: ['css/main.css'],
    outfile: 'dist/styles.bundle.min.css',
    ...cssShared,
  });

  const mobileCss = fs.readFileSync('css/mobile.css', 'utf8');

  await esbuild.build({
    stdin: { contents: mobileCss, loader: 'css', resolveDir: 'css' },
    outfile: 'dist/styles.mobile.min.css',
    ...cssShared,
  });
};

// ============================================================
// Run
// ============================================================
const run = async () => {
  console.time('Build');
  await Promise.all([buildJS(), buildCSS()]);
  console.timeEnd('Build');

  ['dist/game.bundle.min.js', 'dist/styles.bundle.min.css', 'dist/styles.mobile.min.css'].forEach(f => {
    const kb = (fs.statSync(f).size / 1024).toFixed(1);
    console.log(`✓ ${f} (${kb} KB)`);
  });
};

run().catch(e => { console.error(e); process.exit(1); });
