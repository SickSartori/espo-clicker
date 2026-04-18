# Performance Optimization v3.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Massimizzare velocità di caricamento e runtime di Espo Clicker su Altervista, con break completo dal formato save V8 (nuova chiave V9, rimozione codice di migrazione legacy).

**Architecture:** Pipeline esbuild locale compila 15+ file JS → 1 bundle minificato (`dist/game.bundle.min.js`, ~90 KB vs 311 KB raw). Save system migra da localStorage+LZ-String CDN a IndexedDB async (chiave V9) con LZ-String bundlato localmente — niente CDN dependency. Service Worker v3.0 precacha i nuovi bundle. CSS minificato inline per above-fold. Tutto compatibile con hosting PHP/Apache Altervista (build gira solo in locale, si caricano i file compilati via FTP).

**Tech Stack:** Node.js 18+ (build locale, non sul server), esbuild 0.24+, PHP 7.4+, IndexedDB API, LZ-String (bundled), Service Worker v3

---

## File Map

| Azione | Path | Responsabilità |
|--------|------|----------------|
| Crea | `package.json` | Deps build locale (esbuild, cpx) |
| Crea | `build.js` | Script esbuild entry point |
| Crea | `js/main.js` | Entry point bundle (importa tutto) |
| Crea | `dist/game.bundle.min.js` | Output JS minificato (generato da build) |
| Crea | `dist/styles.bundle.min.css` | Output CSS minificato (generato da build) |
| Modifica | `js/script.js` | Rimuovi migrazione V7/V8, aggiungi IndexedDB save V9 |
| Modifica | `css/concat.php` | Aggiungi flag `?minify=1` per output minificato |
| Modifica | `index.php` | Carica bundle invece di 15 file JS, ottimizza preload |
| Modifica | `sw.js` | v3.0: precache bundle, rimuovi vecchi asset list |

---

## Task 1: Setup Build Pipeline (Node.js + esbuild)

**Files:**
- Crea: `package.json`
- Crea: `build.js`

- [ ] **Step 1.1: Verifica Node.js disponibile**

```bash
node --version
npm --version
```

Expected: Node 18+ e npm 9+. Se non installato: https://nodejs.org/en/download

- [ ] **Step 1.2: Crea `package.json`**

```json
{
  "name": "espo-clicker",
  "version": "3.0.0",
  "private": true,
  "scripts": {
    "build": "node build.js",
    "build:watch": "node build.js --watch",
    "build:dev": "node build.js --dev"
  },
  "devDependencies": {
    "esbuild": "^0.24.0"
  },
  "dependencies": {
    "lz-string": "^1.5.0"
  }
}
```

- [ ] **Step 1.3: Installa dipendenze**

```bash
npm install
```

Expected: `node_modules/` creata, `package-lock.json` generato.

- [ ] **Step 1.4: Crea `build.js`**

```javascript
const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const isDev = process.argv.includes('--dev');
const isWatch = process.argv.includes('--watch');

// Assicura che dist/ esista
if (!fs.existsSync('dist')) fs.mkdirSync('dist');

const jsConfig = {
  entryPoints: ['js/main.js'],
  bundle: true,
  minify: !isDev,
  sourcemap: isDev,
  target: ['es2018'],
  outfile: 'dist/game.bundle.min.js',
  format: 'iife',
  globalName: 'EspoClicker',
  define: {
    'process.env.NODE_ENV': isDev ? '"development"' : '"production"',
  },
  logLevel: 'info',
};

if (isWatch) {
  esbuild.context(jsConfig).then(ctx => {
    ctx.watch();
    console.log('Watching for changes...');
  });
} else {
  esbuild.build(jsConfig).then(() => {
    const stats = fs.statSync('dist/game.bundle.min.js');
    const kb = (stats.size / 1024).toFixed(1);
    console.log(`\n✓ Bundle: dist/game.bundle.min.js (${kb} KB)\n`);
  }).catch(() => process.exit(1));
}
```

- [ ] **Step 1.5: Commit setup pipeline**

```bash
git add package.json package-lock.json build.js
git commit -m "feat: add esbuild build pipeline"
```

---

## Task 2: Crea JS Entry Point (`js/main.js`)

**Files:**
- Crea: `js/main.js`

L'entry point importa tutto nell'ordine corretto, sostituendo i 15 `<script defer>` in index.php. esbuild risolve gli import e produce un unico bundle.

- [ ] **Step 2.1: Crea `js/main.js`**

```javascript
// External deps bundlati (rimossi dai CDN in index.php)
import LZString from 'lz-string';
window.LZString = LZString; // Esponi globale per compatibilità interna

// Game data (ordine critico: core prima di tutto)
import './data/core.js';
import './data/gamestate.js';
import './data/assets.js';
import './data/skins.js';
import './data/teams.js';
import './data/upgrades.js';
import './data/achievements.js';
import './data/events.js';
import './data/texts.js';

// Engine
import './asset-packages.js';
import './asset-manager.js';
import './version-config.js';

// UI
import './ui-functions.js';
import './game-logic.js';
import './modals.js';
import './podio.js';
import './arcade-loader.js';

// Main (deve essere ultimo — init chiama funzioni definite sopra)
import './script.js';
```

> **Nota:** I file `js/data/*.js` usano variabili globali (no `export`). esbuild in modalità `iife` li esegue in ordine nell'IIFE, quindi le variabili sono disponibili nel bundle scope. Se un file usa `var`/`const` a livello top-level senza `export`, funziona nell'IIFE. Se ci sono dipendenze circolari o accessi cross-file che non funzionano, vedi Step 2.2.

- [ ] **Step 2.2: Prima build di test**

```bash
npm run build:dev
```

Expected: `dist/game.bundle.min.js` creato (non minificato in dev, con sourcemap). Controlla output per errori.

Se errori tipo `X is not defined`:
- Il file usa `window.X` → ok già
- Il file usa `X` da un altro file → aggiungi `window.X = X` nel file sorgente dove è definito

- [ ] **Step 2.3: Build produzione**

```bash
npm run build
```

Expected: `dist/game.bundle.min.js` creato, minificato. Dimensione attesa: 80-100 KB (da 311 KB raw).

- [ ] **Step 2.4: Verifica bundle size**

```bash
node -e "const fs=require('fs'); const s=fs.statSync('dist/game.bundle.min.js').size; console.log('Bundle:', (s/1024).toFixed(1)+'KB')"
```

Expected: < 110 KB. Se > 120 KB, controlla che `cheatboard.js` NON sia incluso in `main.js`.

- [ ] **Step 2.5: Commit entry point**

```bash
git add js/main.js dist/game.bundle.min.js
git commit -m "feat: bundle 15 JS files into single esbuild output"
```

---

## Task 3: CSS Minification via esbuild

**Files:**
- Crea: `js/main.css` (entry CSS per esbuild)
- Modifica: `build.js`
- Crea: `dist/styles.bundle.min.css`

- [ ] **Step 3.1: Crea `css/main.css` (entry CSS)**

```css
/* Core bundle — same files as concat.php?bundle=core */
@import './keyframes.css';
@import './base.css';
@import './layout.css';
@import './components.css';
@import './navbar.css';
@import './clicker.css';
@import './store.css';

/* UI bundle */
@import './modals-core.css';
@import './modals-content.css';
@import './modals-arcade.css';
@import './skins.css';
@import './skins-modern.css';
@import './podio.css';
```

> Mobile CSS viene gestito separatamente (media query, vedi Step 3.3).

- [ ] **Step 3.2: Aggiorna `build.js` per CSS**

Sostituisci il contenuto di `build.js` con:

```javascript
const esbuild = require('esbuild');
const fs = require('fs');

const isDev = process.argv.includes('--dev');
const isWatch = process.argv.includes('--watch');

if (!fs.existsSync('dist')) fs.mkdirSync('dist');

const shared = {
  minify: !isDev,
  sourcemap: isDev,
  target: ['es2018'],
  logLevel: 'info',
};

const builds = [
  {
    entryPoints: ['js/main.js'],
    bundle: true,
    format: 'iife',
    outfile: 'dist/game.bundle.min.js',
    define: { 'process.env.NODE_ENV': isDev ? '"development"' : '"production"' },
    ...shared,
  },
  {
    entryPoints: ['css/main.css'],
    bundle: true,
    outfile: 'dist/styles.bundle.min.css',
    loader: { '.css': 'css' },
    ...shared,
  },
  {
    entryPoints: ['css/mobile.css', 'css/mobile-simplified.css'],
    bundle: true,
    outfile: 'dist/styles.mobile.min.css',
    loader: { '.css': 'css' },
    ...shared,
  },
];

const run = async () => {
  if (isWatch) {
    const contexts = await Promise.all(builds.map(b => esbuild.context(b)));
    await Promise.all(contexts.map(c => c.watch()));
    console.log('Watching...');
  } else {
    await Promise.all(builds.map(b => esbuild.build(b)));
    ['dist/game.bundle.min.js', 'dist/styles.bundle.min.css', 'dist/styles.mobile.min.css'].forEach(f => {
      const kb = (fs.statSync(f).size / 1024).toFixed(1);
      console.log(`✓ ${f} (${kb} KB)`);
    });
  }
};

run().catch(() => process.exit(1));
```

- [ ] **Step 3.3: Build CSS**

```bash
npm run build
```

Expected output:
```
✓ dist/game.bundle.min.js (90-100 KB)
✓ dist/styles.bundle.min.css (50-70 KB)
✓ dist/styles.mobile.min.css (10-15 KB)
```

- [ ] **Step 3.4: Commit build CSS**

```bash
git add css/main.css build.js dist/
git commit -m "feat: minify CSS via esbuild, output to dist/"
```

---

## Task 4: Save System V9 (IndexedDB + rimozione migrazione V8)

**Files:**
- Modifica: `js/script.js` (sezione save/load, ~righe 1-300 approssimativamente)

Obiettivo:
- Nuova chiave save: `espotoolClickerSaveV9` (localStorage di fallback iniziale, poi migrazione a IndexedDB)
- Storage primario: IndexedDB (async, non blocca game loop)
- Rimozione: codice migrazione V7→V8, chiavi legacy
- Throttle cloud save: da 3-5s a 30s (riduce load su Altervista)
- LZ-String rimane per compressione ma viene da bundle (non CDN)

- [ ] **Step 4.1: Aggiungi modulo IndexedDB in `js/save-db.js` (nuovo file)**

```javascript
const DB_NAME = 'EspoClickerDB';
const DB_VERSION = 1;
const STORE_NAME = 'saves';
const SAVE_KEY = 'espotoolClickerSaveV9';

let _db = null;

function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = e => { _db = e.target.result; resolve(_db); };
    req.onerror = e => reject(e.target.error);
  });
}

export async function saveToIndexedDB(data) {
  const compressed = LZString.compressToUTF16(JSON.stringify(data));
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(compressed, SAVE_KEY);
    tx.oncomplete = resolve;
    tx.onerror = e => reject(e.target.error);
  });
}

export async function loadFromIndexedDB() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(SAVE_KEY);
      req.onsuccess = e => {
        const raw = e.target.result;
        if (!raw) { resolve(null); return; }
        try {
          resolve(JSON.parse(LZString.decompressFromUTF16(raw)));
        } catch {
          resolve(null);
        }
      };
      req.onerror = e => reject(e.target.error);
    });
  } catch {
    return null;
  }
}

export async function clearIndexedDB() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(SAVE_KEY);
    tx.oncomplete = resolve;
    tx.onerror = e => reject(e.target.error);
  });
}
```

- [ ] **Step 4.2: Aggiungi `save-db.js` a `js/main.js`**

In `js/main.js`, aggiungi PRIMA di `import './script.js'`:

```javascript
import { saveToIndexedDB, loadFromIndexedDB, clearIndexedDB } from './save-db.js';
window.SaveDB = { saveToIndexedDB, loadFromIndexedDB, clearIndexedDB };
```

- [ ] **Step 4.3: Sostituisci save in `js/script.js`**

Trova la funzione `saveGame()` (o equivalente con `localStorage.setItem`). Sostituisci con pattern async:

```javascript
// PRIMA (rimuovi):
// localStorage.setItem('espotoolClickerSaveV8', LZString.compressToUTF16(JSON.stringify(gameState)));
// localStorage.setItem('espotoolClickerSaveV8_Backup', LZString.compressToUTF16(JSON.stringify(gameState)));

// DOPO:
async function saveGame() {
  try {
    await SaveDB.saveToIndexedDB(gameState);
  } catch (e) {
    // Fallback a localStorage se IndexedDB fallisce
    try {
      localStorage.setItem('espotoolClickerSaveV9', LZString.compressToUTF16(JSON.stringify(gameState)));
    } catch { /* storage pieno */ }
  }
  // Cloud save (throttled — vedi Step 4.5)
  throttledCloudSave();
}
```

- [ ] **Step 4.4: Sostituisci load in `js/script.js`**

Trova la funzione di init/load (dove si legge `localStorage.getItem('espotoolClickerSaveV8')`). Sostituisci:

```javascript
// RIMUOVI: tutto il codice migrazione V7→V8 (cerca 'espotoolClickerSaveV8_Legacy', 'V7', 'convertLegacy')

async function loadGame() {
  let saved = await SaveDB.loadFromIndexedDB();

  // Fallback localStorage V9
  if (!saved) {
    const raw = localStorage.getItem('espotoolClickerSaveV9');
    if (raw) {
      try { saved = JSON.parse(LZString.decompressFromUTF16(raw)); } catch { saved = null; }
    }
  }

  // Nessun save V9 trovato — inizia partita nuova (V8 ignorato per design)
  if (!saved) {
    gameState = getInitialGameState();
    initGame();
    return;
  }

  gameState = mergeWithDefaults(saved, getInitialGameState());
  initGame();
}
```

- [ ] **Step 4.5: Throttle cloud save a 30s**

Trova il timer/interval che chiama il cloud save. Cambia da:

```javascript
// PRIMA:
setInterval(cloudSave, 3000); // o 5000
```

A:

```javascript
// DOPO — throttle 30s, non 3-5s
let _cloudSavePending = false;
function throttledCloudSave() {
  if (_cloudSavePending) return;
  _cloudSavePending = true;
  setTimeout(async () => {
    _cloudSavePending = false;
    if (!currentUser) return;
    await doCloudSave(); // funzione esistente che invia dati al PHP
  }, 30000);
}
```

- [ ] **Step 4.6: Rimuovi chiavi localStorage V8 (pulizia)**

In `js/script.js`, dopo `loadGame()` con successo, aggiungi:

```javascript
// Una tantum: pulisce storage vecchio dopo caricamento riuscito
if (localStorage.getItem('espotoolClickerSaveV8')) {
  localStorage.removeItem('espotoolClickerSaveV8');
  localStorage.removeItem('espotoolClickerSaveV8_Backup');
  localStorage.removeItem('espotoolClickerSaveV8_Legacy');
}
```

- [ ] **Step 4.7: Build e test save system**

```bash
npm run build:dev
```

Apri `index.php` nel browser (via MAMP localhost). Apri DevTools → Application → IndexedDB → EspoClickerDB → saves. Verifica che dopo qualche secondo appaia la chiave `espotoolClickerSaveV9` con dati compressi.

- [ ] **Step 4.8: Commit save system V9**

```bash
git add js/save-db.js js/main.js js/script.js
git commit -m "feat: save system V9 with IndexedDB, remove V8 migration, throttle cloud save to 30s"
```

---

## Task 5: Aggiorna `index.php` — carica bundle

**Files:**
- Modifica: `index.php`

Sostituisce i 15 `<script defer src="js/...">` con 1 singolo bundle. Rimuove CDN script ora bundlati.

- [ ] **Step 5.1: Identifica CDN script rimovibili**

In `index.php`, cerca questi script che ora vengono da bundle (esbuild li include da `node_modules`):

```html
<!-- RIMUOVI questi (ora nel bundle): -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.4.4/lz-string.min.js"></script>
```

Lascia questi (non bundlati — caricati su richiesta separata o per design):
```html
<!-- LASCIA (lazy o non bundlabili semplicemente): -->
<script src="...gsap..."></script>
<script src="...howler..."></script>
<script src="...hammer..."></script>
<script src="...break_infinity..."></script>
<!-- Phaser già lazy-loaded da arcade-loader.js — non toccare -->
```

> **Nota:** GSAP, Howler, Hammer, break_infinity restano CDN per ora. Aggiungibili al bundle in futuro se necessario. Priorità attuale: eliminare i 15 file JS locali + lz-string CDN.

- [ ] **Step 5.2: Sostituisci blocco `<script>` in `index.php`**

Trova il blocco con tutti i `<script defer src="js/...">` (circa righe 268-321). Sostituisci con:

```html
<!-- JS Bundle (esbuild minificato) -->
<script defer src="dist/game.bundle.min.js?v=<?php echo $cacheVer; ?>"></script>
```

Rimuovi le righe CDN lz-string e tutti i `<script defer src="js/data/...">`, `<script defer src="js/ui-functions.js">`, etc.

- [ ] **Step 5.3: Sostituisci blocco CSS in `index.php`**

Trova le tre righe `concat.php?bundle=...`. Sostituisci con:

```html
<!-- CSS Bundle (esbuild minificato) -->
<link rel="stylesheet" href="dist/styles.bundle.min.css?v=<?php echo $cacheVer; ?>">
<link rel="stylesheet" href="dist/styles.mobile.min.css?v=<?php echo $cacheVer; ?>" media="(max-width: 768px)">
```

> `concat.php` può restare come fallback ma non viene più usato dal markup principale.

- [ ] **Step 5.4: Ottimizza preload fonts**

In `<head>` di `index.php`, **prima** del `<link>` Google Fonts, aggiungi:

```html
<!-- Preconnect + preload font critici -->
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" href="https://fonts.gstatic.com/s/rajdhani/v15/LDIxapCSOBg7S-QT7q4AOeek.woff2" as="font" type="font/woff2" crossorigin>
```

> L'URL del woff2 specifico va verificato visitando `https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700` e trovando l'URL woff2 per `weight=700` (usato più spesso come titolo).

Modifica il `<link>` Google Fonts esistente aggiungendo `display=swap`:

```html
<link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&display=swap" rel="stylesheet">
```

- [ ] **Step 5.5: Aggiorna Service Worker registration**

In `index.php`, trova il blocco di registrazione SW inline. Cambia il path da `sw.js` a `sw.js` (invariato), ma aggiorna la versione:

```javascript
// Nessuna modifica al registration script — sw.js viene aggiornato in Task 7
```

- [ ] **Step 5.6: Test in browser locale**

Avvia MAMP. Apri `http://localhost/Espo_Clicker/`. Apri DevTools → Network. Verifica:
- `dist/game.bundle.min.js` caricato (1 richiesta invece di 15)
- `dist/styles.bundle.min.css` caricato (1 richiesta invece di 3)
- `lz-string` CDN NON appare nelle richieste
- Nessun errore in Console

- [ ] **Step 5.7: Commit index.php**

```bash
git add index.php
git commit -m "feat: load single JS/CSS bundle from dist/, remove 15 script tags, optimize font preload"
```

---

## Task 6: Service Worker v3.0

**Files:**
- Modifica: `sw.js`

- [ ] **Step 6.1: Aggiorna `CACHE_VERSION` e `STATIC_CACHE` in `sw.js`**

Trova le costanti in cima a `sw.js`:

```javascript
// PRIMA:
const CACHE_VERSION = 'espo-v2.2.0';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;

// DOPO:
const CACHE_VERSION = 'espo-v3.0.0';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;
```

- [ ] **Step 6.2: Aggiorna lista precache in `sw.js`**

Trova l'array `PRECACHE_URLS` (o equivalente). Sostituisci i 35+ file individuali con i bundle:

```javascript
const PRECACHE_URLS = [
  '/',
  '/index.php',

  // Bundle (sostituiscono i 15 JS + 3 CSS precedenti)
  '/dist/game.bundle.min.js',
  '/dist/styles.bundle.min.css',
  '/dist/styles.mobile.min.css',

  // Immagini core (invariato)
  '/assets/image/skins/espo.webp',
  '/assets/image/skins/espo-click.webp',
  '/assets/image/ui/bug.webp',
  '/assets/image/ui/hidden.webp',
  '/assets/image/ui/super-block.webp',
  '/assets/image/ui/star.png',
  '/assets/image/ui/favicon.webp',
  '/assets/image/icons/icon-192.png',
  '/assets/image/icons/icon-512.png',

  // Font Awesome (CDN — includilo solo se versione stabile)
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
];
```

> **Rimuovi** da PRECACHE_URLS: tutti i `js/data/*.js`, `js/ui-functions.js`, `js/script.js`, `js/game-logic.js`, `js/modals.js`, `js/podio.js`, `js/asset-*.js`, `css/concat.php?bundle=*`. Ora sono nel bundle.

- [ ] **Step 6.3: Aggiorna `STATIC_PATTERNS` in `sw.js`**

Trova il pattern per i file statici. Aggiungi `/dist/` al pattern:

```javascript
const STATIC_PATTERNS = [
  /\/dist\/.+\.(js|css)(\?|$)/,   // Bundle dist/ — AGGIUNTO
  /\.css(\?|$)/,
  /\.js(\?|$)/,
  /\.webp/,
  /\.png/,
  /\.mp3/,
  /\.mp4/,
  /fonts\.googleapis/,
  /fonts\.gstatic/,
  /cdnjs\.cloudflare/,
];
```

- [ ] **Step 6.4: Riduci batch size precache (Altervista-safe)**

Verifica che il batch size resti a 3 (già ottimale per Altervista):

```javascript
// Deve restare 3 — Altervista shared hosting si satura con batch più grandi
await precacheBatched(cache, PRECACHE_URLS, 3);
```

- [ ] **Step 6.5: Test Service Worker**

Apri `http://localhost/Espo_Clicker/` in Chrome. DevTools → Application → Service Workers → verifica che `sw.js` sia attivo con versione `espo-v3.0.0`. Application → Cache Storage → verifica `static-espo-v3.0.0` contenga i nuovi bundle.

- [ ] **Step 6.6: Commit Service Worker**

```bash
git add sw.js
git commit -m "feat: service worker v3.0 precaches bundles, removes 30+ individual file entries"
```

---

## Task 7: `.htaccess` root + Cache Headers per `dist/`

**Files:**
- Crea: `.htaccess` (root del progetto, non solo `/php/`)

Attualmente `.htaccess` è solo in `/php/`. I bundle in `/dist/` non hanno cache headers ottimali.

- [ ] **Step 7.1: Crea `.htaccess` nella root**

```apache
<IfModule mod_expires.c>
    ExpiresActive On

    # Bundle JS/CSS — cache lunghissima (cache-busting via ?v= in index.php)
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType text/css "access plus 1 year"

    # Immagini
    ExpiresByType image/webp "access plus 1 month"
    ExpiresByType image/png "access plus 1 month"
    ExpiresByType image/svg+xml "access plus 1 month"

    # Audio/Video
    ExpiresByType audio/mpeg "access plus 1 year"
    ExpiresByType video/mp4 "access plus 1 year"

    # HTML/PHP — sempre rivalidato
    ExpiresByType text/html "access plus 0 seconds"
</IfModule>

<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/css application/javascript application/json
</IfModule>

<IfModule mod_headers.c>
    # Cache immutable per bundle versionati
    <FilesMatch "^(game\.bundle|styles\.(bundle|mobile))\.min\.(js|css)$">
        Header set Cache-Control "public, max-age=31536000, immutable"
    </FilesMatch>
</IfModule>
```

- [ ] **Step 7.2: Verifica headers (dopo deploy su Altervista)**

```bash
curl -I https://[tuo-altervista-url]/dist/game.bundle.min.js | grep -E "Cache-Control|Content-Encoding"
```

Expected:
```
Cache-Control: public, max-age=31536000, immutable
Content-Encoding: gzip
```

- [ ] **Step 7.3: Commit .htaccess**

```bash
git add .htaccess
git commit -m "feat: root .htaccess with immutable cache for dist/ bundles + gzip"
```

---

## Task 8: Verifica Finale e Deploy

- [ ] **Step 8.1: Build produzione completa**

```bash
npm run build
```

Verifica output:
```
✓ dist/game.bundle.min.js    (< 110 KB)
✓ dist/styles.bundle.min.css (< 75 KB)
✓ dist/styles.mobile.min.css (< 20 KB)
```

- [ ] **Step 8.2: Test locale golden path**

Apri `http://localhost/Espo_Clicker/` (MAMP). Verifica:
- [ ] Gioco carica senza errori console
- [ ] Click su Espo funziona, aumenta il score
- [ ] Shop apre correttamente
- [ ] Skin cambiano
- [ ] Login/registrazione funziona
- [ ] Save funziona: clicca → aggiorna pagina → score persiste
- [ ] DevTools → Application → IndexedDB → `EspoClickerDB` → `saves` → `espotoolClickerSaveV9` presente
- [ ] Nessuna richiesta a `lz-string` CDN in Network tab
- [ ] `dist/game.bundle.min.js` appare in Network tab (200 al primo caricamento, 304 poi)

- [ ] **Step 8.3: Test offline (Service Worker)**

In DevTools → Network → seleziona "Offline". Ricarica pagina. Verifica che gioco carichi ancora (da SW cache).

- [ ] **Step 8.4: Test mobile**

Apri Chrome DevTools → Device Toolbar → iPhone SE. Verifica:
- `dist/styles.mobile.min.css` caricato
- Layout corretto su mobile

- [ ] **Step 8.5: Deploy su Altervista**

Upload via FTP questi file/cartelle:
```
dist/                   (nuova cartella — i bundle)
js/main.js              (entry point, serve solo come riferimento)
js/save-db.js           (nuovo modulo IndexedDB)
js/script.js            (modificato — V9 save)
index.php               (modificato — carica bundle)
sw.js                   (modificato — v3.0)
.htaccess               (nuovo — root)
package.json            (opzionale, solo doc)
```

> **NON uploadare:** `node_modules/`, `build.js`, `package-lock.json` (build locale only)

- [ ] **Step 8.6: Verifica deploy Altervista**

Apri il sito su Altervista. Stessa checklist del Step 8.2. Verifica inoltre:
- `curl -I https://[url]/dist/game.bundle.min.js` → `Cache-Control: public, max-age=31536000`
- Nessun errore PHP nei log (se accessibili)

- [ ] **Step 8.7: Commit finale**

```bash
git add .
git commit -m "feat: v3.0 performance optimization complete — bundle, IndexedDB save V9, SW v3.0"
```

---

## Riepilogo Impatto Atteso

| Metrica | Prima | Dopo |
|---------|-------|------|
| Richieste JS al boot | 15 file (311 KB) | 1 file (~90 KB minificato) |
| Richieste CSS al boot | 3 bundle (raw) | 2 file (minificati) |
| CDN roundtrip (lz-string) | 1 aggiuntivo | 0 (bundlato) |
| Save blocking game loop | Sì (localStorage sync) | No (IndexedDB async) |
| Cloud save frequency | 3-5 secondi | 30 secondi |
| Cache-Control bundle | 1 settimana | 1 anno (immutable) |
| SW precache entries | 35+ file | ~15 (bundle + immagini core) |
| Migrazione V8 legacy | Presente | Rimossa |
| Gzip transfer JS+CSS | ~120 KB | ~40 KB |

**Saving stimato first load:** da ~430 KB → ~130 KB trasferiti (gzip incluso) per JS+CSS.
