# Asset/Stability/Mobile Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ridurre richieste HTTP iniziali, eliminare PNG ridondanti, aggiungere error handling globale, abbassare peso asset per mobile, fissare regressioni responsive.

**Architecture:** Tre assi paralleli ma indipendenti: (1) **Assets** → sprite sheet per skin attive + AVIF fallback + rimozione PNG icons non più usati + hero image responsive. (2) **Stability** → global error handler, IndexedDB quota check, SW update flow robusto, Howler failure guard. (3) **Mobile** → merge dei due CSS mobile (duplicazione), viewport overflow fix, touch-action granulare, reduce cumulative layout shift via `aspect-ratio`.

**Tech Stack:** esbuild (build), service worker v3, IndexedDB + LZ-String, Howler, vanilla JS, CSS media queries.

---

## Pre-flight

- [ ] **Step 0.1: Branch snapshot**

```bash
git status
git log --oneline -5
```

Expected: clean working tree (o ricorda i file modificati). Baseline bundle size: `node build.js` → nota i KB.

- [ ] **Step 0.2: Audit baseline metriche**

```bash
ls -la dist/
du -sh assets/image assets/sounds assets/video
grep -c "^" css/mobile.css css/mobile-simplified.css
```

Write baseline to `docs/superpowers/plans/baseline-metrics.txt`:
- `dist/game.bundle.min.js` bytes
- `dist/styles.bundle.min.css` bytes
- `dist/styles.mobile.min.css` bytes
- Total `assets/image` size
- Total mobile CSS lines

---

## PHASE A — ASSET OPTIMIZATION

### Task A1: Rimuovere PNG icons PWA ridondanti

**Context:** `manifest.json` + `index.php` ora puntano primarily a `ico.svg`. I PNG 192/512 sono fallback. `icons/icon-144.png` (tile MS) non piú referenziato dopo SVG migration. Verifica + pulizia.

**Files:**
- Read: `manifest.json`, `index.php`, `sw.js`
- Modify: `sw.js` (PRECACHE_ASSETS)

- [ ] **Step 1: Verifica che icon-144.png non sia usato**

Run: `grep -rn "icon-144" .` (exclude node_modules, .git)
Expected: 0 match (oltre a definizioni obsolete). Se match trovato, resta fallback.

- [ ] **Step 2: Rimuovi icon-144 da sw.js precache se presente**

Modify `sw.js` PRECACHE_ASSETS: rimuovi riga `'./assets/image/icons/icon-144.png'` se presente.

- [ ] **Step 3: Verifica bundle SW**

Run: `grep "icon-144" sw.js`
Expected: nessun match.

- [ ] **Step 4: Test caricamento**

Reload browser. DevTools → Network → nessun 404 per icon-144.

- [ ] **Step 5: Commit**

```bash
git add sw.js
git commit -m "chore(sw): remove obsolete icon-144 from precache"
```

---

### Task A2: Lazy-decode immagini skin tramite `decoding="async"` + `loading="lazy"`

**Context:** `asset-manager.js:39` usa `new Image()` senza hint. Su mobile il decode blocca il main thread. Aggiungi attributes.

**Files:**
- Modify: `js/asset-manager.js:35-60`

- [ ] **Step 1: Leggi blocco attuale**

```bash
sed -n '35,60p' js/asset-manager.js
```

- [ ] **Step 2: Modifica `loadImage()` con hint**

Cerca la riga `var img = new Image();` in `js/asset-manager.js` e aggiungi immediatamente sotto:

```javascript
            var img = new Image();
            img.decoding = 'async';
            img.loading = 'lazy';
```

- [ ] **Step 3: Rebuild bundle**

Run: `node build.js`
Expected: bundle produced, `dist/game.bundle.min.js` size ~entro 1KB del precedente.

- [ ] **Step 4: Test browser**

Reload, DevTools → Performance → record boot. Verifica: main thread decode times ridotti per skin images.

- [ ] **Step 5: Commit**

```bash
git add js/asset-manager.js
git commit -m "perf(assets): async decode + lazy loading for skin images"
```

---

### Task A3: Hero image `<link rel="preload">` con `imagesrcset` responsive

**Context:** `index.php` preload `espo-click.webp` senza responsive hint. Mobile scarica versione desktop full. Serve srcset.

**Files:**
- Modify: `index.php:55`

- [ ] **Step 1: Sostituisci preload con responsive**

Trova:
```html
<link rel="preload" as="image" href="assets/image/skins/espo-click.webp" fetchpriority="high">
```

Rimpiazza con:
```html
<link rel="preload" as="image" href="assets/image/skins/espo-click.webp" fetchpriority="high" imagesrcset="assets/image/skins/espo-click.webp" imagesizes="(max-width: 768px) 120px, 240px">
```

Nota: se non esiste variante mobile small, il browser comunque usa la versione fornita ma applica decoding priority per dimensione viewport.

- [ ] **Step 2: Test**

Reload mobile (DevTools device mode → iPhone SE). Network → verifica richiesta avviene con priority "high".

- [ ] **Step 3: Commit**

```bash
git add index.php
git commit -m "perf(mobile): responsive preload hint for hero image"
```

---

### Task A4: Asset package audit — log runtime di skin mai usate

**Context:** Pacchetti `SKINS_LEGENDARY` + `THEME_FURY` pesano ~3MB ma potrebbero non essere mai visti da utente in early-game. Aggiungi telemetria console.

**Files:**
- Modify: `js/asset-manager.js` (aggiungi stat tracker)

- [ ] **Step 1: Aggiungi contatore usage**

In `js/asset-manager.js`, in fondo al file prima di `})();` (IIFE close), aggiungi:

```javascript
    // Debug: log pacchetti caricati ma mai richiesti attivamente
    window.AssetStats = {
        loaded: new Set(),
        requested: new Set(),
        report: function () {
            var unused = [];
            this.loaded.forEach(function (p) {
                if (!window.AssetStats.requested.has(p)) unused.push(p);
            });
            console.log('[AssetStats] Loaded but never used:', unused);
        }
    };
```

E nel punto dove un pacchetto viene caricato (cerca `_loaded.add` o equivalente), aggiungi `window.AssetStats.loaded.add(packageName);`. Nel punto di request on-demand (cerca `loadPackage`), aggiungi `window.AssetStats.requested.add(packageName);`.

- [ ] **Step 2: Rebuild**

Run: `node build.js`

- [ ] **Step 3: Test manual**

Apri browser, gioca 2 minuti senza aprire skin modal, poi console: `AssetStats.report()`. Annota i pacchetti "unused" in `docs/superpowers/plans/baseline-metrics.txt`.

- [ ] **Step 4: Commit**

```bash
git add js/asset-manager.js
git commit -m "feat(debug): asset usage stats for pack audit"
```

---

### Task A5: Differire `SKINS_EPIC` + `SKINS_LEGENDARY` fino a apertura modal Skin

**Context:** Current: dopo 30s/60s carica proattivamente ~1.6MB. Better: solo on-demand quando `showSkinsModal()` apre.

**Files:**
- Modify: `js/asset-packages.js` (cambia trigger)
- Modify: `js/modals.js` o file che gestisce skin modal — aggiungi chiamata `AssetManager.load('SKINS_EPIC')`.

- [ ] **Step 1: Cambia trigger in asset-packages.js**

Trova in `js/asset-packages.js`:

```javascript
    SKINS_EPIC: {
        label: 'Skin Epic',
        priority: 3,
        trigger: { type: 'afterBoot', delay: 30000 },
```

Sostituisci con:

```javascript
    SKINS_EPIC: {
        label: 'Skin Epic',
        priority: 3,
        trigger: { type: 'onDemand' },
```

Stesso per `SKINS_LEGENDARY`:

```javascript
    SKINS_LEGENDARY: {
        label: 'Skin Legendary',
        priority: 4,
        trigger: { type: 'onDemand' },
```

- [ ] **Step 2: Trova handler skin modal**

Run:
```bash
grep -rn "showSkinsModal\|openSkinsModal\|skin-modal" js/*.js
```

Identifica la funzione invocata all'apertura del modal skin.

- [ ] **Step 3: Inietta load on-demand**

All'inizio della funzione handler, aggiungi:

```javascript
if (window.AssetManager) {
    window.AssetManager.load('SKINS_EPIC');
    window.AssetManager.load('SKINS_LEGENDARY');
}
```

- [ ] **Step 4: Rebuild + test**

Run: `node build.js`
Test: reload, DevTools Network filter img. Verifica:
- Al boot, NO richieste per epic/legendary skins (né dopo 30/60s).
- All'apertura modal skin, richieste partono.

- [ ] **Step 5: Commit**

```bash
git add js/asset-packages.js js/modals.js
git commit -m "perf(assets): defer epic/legendary skins to skin-modal open"
```

---

## PHASE B — STABILITY

### Task B1: Global error handler

**Context:** Zero `window.onerror` / `unhandledrejection`. Un crash in game loop finisce silenzioso con stato incoerente.

**Files:**
- Create: `js/error-handler.js`
- Modify: `build.js` (aggiungi al JS_FILES)

- [ ] **Step 1: Crea file error handler**

Crea `js/error-handler.js`:

```javascript
// ============================================================
// ESPO CLICKER - Global Error Handler
// Cattura errori uncaught + promise rejection. Mostra toast
// invece di silent failure. Evita loop infinito con flag.
// ============================================================

(function () {
    'use strict';

    var _shown = 0;
    var MAX_TOASTS = 3;

    function notify(msg) {
        if (_shown >= MAX_TOASTS) return;
        _shown++;
        try {
            if (window.EspooClicker && window.EspooClicker.showToast) {
                window.EspooClicker.showToast('Errore: ' + msg, 'error');
            }
        } catch (e) { /* swallow */ }
    }

    window.addEventListener('error', function (e) {
        // Filtra errori da script esterni (CORS) che riportano "Script error"
        if (!e.message || e.message === 'Script error.') return;
        console.error('[GlobalError]', e.message, e.filename, e.lineno);
        notify(e.message);
    });

    window.addEventListener('unhandledrejection', function (e) {
        var reason = e.reason && e.reason.message ? e.reason.message : String(e.reason);
        console.error('[UnhandledRejection]', reason);
        notify(reason);
    });
})();
```

- [ ] **Step 2: Aggiungi al build**

Modifica `build.js`, array `JS_FILES`. Aggiungi subito DOPO `'js/save-db.js'`:

```javascript
  'js/save-db.js',
  'js/error-handler.js',  // Dopo save-db, prima di tutto il game code
```

- [ ] **Step 3: Rebuild**

Run: `node build.js`
Expected: bundle rebuilds successfully.

- [ ] **Step 4: Test manual**

Apri DevTools Console, esegui:
```javascript
throw new Error('test global handler');
```
Expected: toast mostrato + log `[GlobalError] test global handler`.

Poi:
```javascript
Promise.reject(new Error('test rejection'));
```
Expected: log `[UnhandledRejection] test rejection`.

- [ ] **Step 5: Commit**

```bash
git add js/error-handler.js build.js
git commit -m "feat(stability): global error + unhandledrejection handler"
```

---

### Task B2: Storage quota guard prima del save

**Context:** `script.js:saveGame` non controlla `navigator.storage.estimate()`. Su mobile con poco spazio IndexedDB fallisce silently → data loss.

**Files:**
- Modify: `js/script.js` (saveGame function)

- [ ] **Step 1: Aggiungi quota check**

In `js/script.js`, trova il blocco:

```javascript
        // Serializza + comprimi UNA volta, riusa per IndexedDB / localStorage / cloud
        const stateJSON = JSON.stringify(gameState);
        const compressed = LZString.compressToUTF16(stateJSON);

        try {
            await SaveDB.saveToIndexedDB(gameState);
```

Inserisci check **prima** del `try`:

```javascript
        // Serializza + comprimi UNA volta, riusa per IndexedDB / localStorage / cloud
        const stateJSON = JSON.stringify(gameState);
        const compressed = LZString.compressToUTF16(stateJSON);

        // Quota guard: warn se spazio < 2x size save
        if (navigator.storage && navigator.storage.estimate) {
            try {
                const est = await navigator.storage.estimate();
                const free = (est.quota || 0) - (est.usage || 0);
                if (free < compressed.length * 4) {
                    console.warn('[SaveGuard] Storage quasi pieno:', free, 'bytes liberi');
                    if (window.EspooClicker) window.EspooClicker.showToast('⚠️ Memoria quasi piena', 'warning');
                }
            } catch (qErr) { /* ignore */ }
        }

        try {
            await SaveDB.saveToIndexedDB(gameState);
```

- [ ] **Step 2: Rebuild**

Run: `node build.js`

- [ ] **Step 3: Test manual**

Difficile da triggerare. Verifica almeno che saveGame non lanci errori normali:
- Apri browser, attendi 30s, console non mostra errori.
- Opzionale: DevTools → Application → Storage → "Override quota" a 1MB, poi clicca. Verifica toast warning.

- [ ] **Step 4: Commit**

```bash
git add js/script.js
git commit -m "feat(stability): storage quota guard before save"
```

---

### Task B3: Howler loading guard + fallback muto

**Context:** Se `Howl` fallisce (CDN giú, file corrotto), game crasha. Howler esporne `onloaderror`; va gestito.

**Files:**
- Modify: `js/game-logic.js` (o file che crea `new Howl(...)`)

- [ ] **Step 1: Trova istanze Howl**

Run: `grep -n "new Howl" js/*.js`

- [ ] **Step 2: Verifica che ogni new Howl abbia onloaderror**

Per ogni istanza `new Howl({...})`, assicurati che l'oggetto config abbia:

```javascript
onloaderror: function (id, err) {
    console.warn('[Howl] load fail:', err);
},
onplayerror: function (id, err) {
    console.warn('[Howl] play fail:', err);
}
```

Se già presenti, skip. Se mancanti, aggiungi.

- [ ] **Step 3: Rebuild**

Run: `node build.js`

- [ ] **Step 4: Test**

DevTools Network → throttling "Offline". Reload. Verifica: nessun errore uncaught audio, game continua funzionante.

- [ ] **Step 5: Commit**

```bash
git add js/game-logic.js
git commit -m "feat(stability): Howler load/play error guards"
```

---

### Task B4: SW update flow — skipWaiting solo con consenso

**Context:** `sw.js` attuale chiama `self.skipWaiting()` immediatamente in install. Se utente sta giocando, il nuovo SW attiva → SW_UPDATED message → reload → perdita click non salvati (save ogni 30s).

**Files:**
- Modify: `sw.js` (install handler)
- Modify: `index.php` (SW registration handler)

- [ ] **Step 1: Rimuovi skipWaiting automatico**

In `sw.js` trova:

```javascript
self.addEventListener('install', (event) => {
    console.log(`[SW] Installazione ${CACHE_VERSION}...`);
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => precacheBatched(cache, PRECACHE_ASSETS, 3))
            .then(() => self.skipWaiting())
    );
});
```

Rimpiazza con:

```javascript
self.addEventListener('install', (event) => {
    console.log(`[SW] Installazione ${CACHE_VERSION}...`);
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => precacheBatched(cache, PRECACHE_ASSETS, 3))
    );
});

self.addEventListener('message', (event) => {
    if (event.data === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
```

Nota: se c'è già un `message` listener, fondi l'if dentro quello esistente invece di duplicarlo.

- [ ] **Step 2: In index.php, handle updatefound**

Trova il blocco SW registration in `index.php` (cerca `navigator.serviceWorker.register`). Dopo `.then(reg => {...})`, assicurati di gestire `updatefound`:

```javascript
navigator.serviceWorker.register('sw.js').then(reg => {
    reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Nuova versione pronta; chiedi conferma prima di attivare
                if (confirm('Nuova versione disponibile. Ricarica?')) {
                    newWorker.postMessage('SKIP_WAITING');
                }
            }
        });
    });
});
```

Se gestione esiste già, assicurati di: (a) non forzare reload senza save, (b) aspettare user consent.

- [ ] **Step 3: Bump CACHE_VERSION per test**

In `sw.js`, cambia `espo-v3.0.0` → `espo-v3.0.1`.

- [ ] **Step 4: Test manual**

- Reload browser. Nuovo SW installato.
- DevTools → Application → Service Workers → "skipWaiting" button disponibile → verifica che app NON reloada senza consenso.
- Click "OK" al prompt → reload avviene.

- [ ] **Step 5: Commit**

```bash
git add sw.js index.php
git commit -m "feat(stability): SW update requires user consent"
```

---

## PHASE C — MOBILE RESPONSIVE

### Task C1: Unificare `mobile.css` + `mobile-simplified.css`

**Context:** 964 + 561 = 1525 linee su due file, zero duplicazione (verificato via `comm`), ma due file separati richiedono 2 parse passes. Merge in uno.

**Files:**
- Create: `css/mobile.css` (merged — overwrite)
- Delete: `css/mobile-simplified.css`
- Modify: `build.js` (rimuovi riferimento al simplified)

- [ ] **Step 1: Concat fisico**

Run:
```bash
cat css/mobile.css css/mobile-simplified.css > css/mobile.merged.css
mv css/mobile.merged.css css/mobile.css
rm css/mobile-simplified.css
```

- [ ] **Step 2: Update build.js**

In `build.js`, trova:

```javascript
  const mobileCss =
    fs.readFileSync('css/mobile.css', 'utf8') + '\n\n' +
    fs.readFileSync('css/mobile-simplified.css', 'utf8');
```

Rimpiazza con:

```javascript
  const mobileCss = fs.readFileSync('css/mobile.css', 'utf8');
```

- [ ] **Step 3: Rebuild**

Run: `node build.js`
Expected: `dist/styles.mobile.min.css` genera con stessa size approx ~21KB.

- [ ] **Step 4: Test visivo**

Reload browser in mobile viewport. Confronta con baseline screenshot. Zero regressioni.

- [ ] **Step 5: Commit**

```bash
git add css/mobile.css build.js
git rm css/mobile-simplified.css
git commit -m "refactor(css): merge mobile.css + mobile-simplified.css"
```

---

### Task C2: Aggiungi `aspect-ratio` a immagini clicker per zero CLS

**Context:** Main clicker image `#clicker-photo` cambia `src` runtime (skin swap). Senza `aspect-ratio` CSS, layout shifta → CLS score alto su mobile.

**Files:**
- Modify: `css/clicker.css`

- [ ] **Step 1: Trova selettore immagine clicker**

Run: `grep -n "clicker-photo\|photo-normal\|photo-clicked" css/clicker.css | head`

- [ ] **Step 2: Aggiungi aspect-ratio**

Nel blocco CSS principale del clicker (es. `#clicker-photo` o `.clicker-photo`), aggiungi:

```css
#clicker-photo {
    /* ...existing rules... */
    aspect-ratio: 1 / 1;
    object-fit: contain;
}
```

Se c'è già `width` + `height` fissi, lascia aspect-ratio come guardia.

- [ ] **Step 3: Rebuild**

Run: `node build.js`

- [ ] **Step 4: Test**

DevTools → Lighthouse → Mobile → record. CLS atteso: < 0.1.

- [ ] **Step 5: Commit**

```bash
git add css/clicker.css
git commit -m "perf(mobile): aspect-ratio on clicker image prevents CLS"
```

---

### Task C3: Fix viewport overflow su iOS safe area

**Context:** `mobile.css:15` usa `overflow: hidden` + `position: fixed`. Su iOS Safari con notch (env safe-area-inset-top/bottom), il bottom nav a volte si sovrappone alla home indicator. Viewport-fit=cover già presente ma `padding-bottom` a volte sbagliato.

**Files:**
- Modify: `css/mobile.css`

- [ ] **Step 1: Verifica padding bottom calcolo**

Cerca nel file `padding-bottom: calc(56px`. Verifica che usi `env(safe-area-inset-bottom)`:

```css
padding-bottom: calc(56px + env(safe-area-inset-bottom));
```

Se già OK, skip. Altrimenti correggi.

- [ ] **Step 2: Aggiungi bottom nav safe area**

Trova la regola bottom navbar mobile (es. `.mobile-bottom-nav` o `.nav-bottom`). Aggiungi:

```css
padding-bottom: env(safe-area-inset-bottom);
height: calc(56px + env(safe-area-inset-bottom));
```

- [ ] **Step 3: Rebuild**

Run: `node build.js`

- [ ] **Step 4: Test**

Se hai iPhone fisico: verifica nav non copre home indicator. Altrimenti DevTools → Rendering → Emulate CSS env(safe-area-inset-bottom) = 34px.

- [ ] **Step 5: Commit**

```bash
git add css/mobile.css
git commit -m "fix(mobile): bottom nav respects iOS safe-area-inset"
```

---

### Task C4: Touch-action granulare (no global pan-x pan-y)

**Context:** `body { touch-action: pan-x pan-y }` disabilita pinch-to-zoom, fine per gameplay, ma blocca anche swipe modal che attendono `pan-y` default. Restringi solo al game area.

**Files:**
- Modify: `css/mobile.css`

- [ ] **Step 1: Rimuovi touch-action da body**

Trova:
```css
body {
    ...
    touch-action: pan-x pan-y;
}
```

Rimuovi la riga `touch-action`.

- [ ] **Step 2: Applica su game-container**

Aggiungi:
```css
#game-container {
    touch-action: pan-x pan-y;
}
```

- [ ] **Step 3: Rebuild + test swipe modal**

Run: `node build.js`
Test manual: apri modal skin, prova scroll verticale dentro. Funziona fluidamente.

- [ ] **Step 4: Commit**

```bash
git add css/mobile.css
git commit -m "fix(mobile): scope touch-action to game-container"
```

---

### Task C5: `-webkit-tap-highlight-color: transparent` globale

**Context:** Click su bottoni/skin mostra highlight blu default su iOS/Chrome Android. Brutto esteticamente.

**Files:**
- Modify: `css/base.css`

- [ ] **Step 1: Verifica se già presente**

Run: `grep -n "tap-highlight" css/*.css`

- [ ] **Step 2: Se mancante, aggiungi in base.css**

Aggiungi al top delle reset rules:

```css
* {
    -webkit-tap-highlight-color: transparent;
}

button, a, [role="button"] {
    -webkit-user-select: none;
    user-select: none;
}
```

- [ ] **Step 3: Rebuild + test**

Run: `node build.js`
Test: mobile DevTools → tap su pulsante. Nessun highlight blu.

- [ ] **Step 4: Commit**

```bash
git add css/base.css
git commit -m "style(mobile): remove default tap-highlight + user-select on UI"
```

---

### Task C6: `passive: true` listener su touch events

**Context:** Se game usa `addEventListener('touchstart', fn)` senza `{ passive: true }`, il browser non può ottimizzare scroll → warning console + lag.

**Files:**
- Modify: `js/game-logic.js` o `js/script.js`

- [ ] **Step 1: Trova listener touch non-passive**

Run: `grep -n "addEventListener.*touch" js/*.js`

- [ ] **Step 2: Aggiungi passive dove listener non chiama preventDefault()**

Per ogni listener identificato:
- Se il handler chiama `e.preventDefault()` → lascia stare (necessita non-passive).
- Altrimenti aggiungi `, { passive: true }` come terzo argomento.

Esempio:
```javascript
// BEFORE
el.addEventListener('touchstart', handler);

// AFTER
el.addEventListener('touchstart', handler, { passive: true });
```

- [ ] **Step 3: Rebuild + test**

Run: `node build.js`
Test: DevTools Console → nessun warning "non-passive event listener".

- [ ] **Step 4: Commit**

```bash
git add js/game-logic.js js/script.js
git commit -m "perf(mobile): passive touch listeners where possible"
```

---

## PHASE D — FINALIZE

### Task D1: Bump CACHE_VERSION + GAME_VERSION

**Files:**
- Modify: `sw.js`
- Modify: `js/version-config.js`

- [ ] **Step 1: Bump versioni**

In `sw.js`: `espo-v3.0.0` → `espo-v3.1.0`.
In `js/version-config.js`: `minor: 0` → `minor: 1` (se il bump è minor) o conferma stable.

- [ ] **Step 2: Rebuild**

Run: `node build.js`

- [ ] **Step 3: Commit**

```bash
git add sw.js js/version-config.js dist/
git commit -m "chore(release): bump to v3.1.0"
```

---

### Task D2: Final verification pass

- [ ] **Step 1: Bundle size comparison**

```bash
ls -la dist/
```

Confronta con baseline in `baseline-metrics.txt`. Variazione attesa:
- `game.bundle.min.js`: +1-3 KB (error-handler.js aggiunto)
- `styles.mobile.min.css`: invariato
- `styles.bundle.min.css`: ~+0.2 KB (aspect-ratio rules)

- [ ] **Step 2: Golden path test browser**

Lista manual:
- [ ] Click funziona
- [ ] Save ogni 30s (osserva Network)
- [ ] Reload preserva stato
- [ ] Store acquisto funziona
- [ ] Skin modal apre → triggera load on-demand
- [ ] Nessun errore console
- [ ] Mobile viewport (375x667) — no overflow, no horizontal scroll
- [ ] Mobile: tap button no highlight blu
- [ ] Disconnect network → game continua (SW serve cache), save fallback localStorage

- [ ] **Step 3: Lighthouse mobile audit**

DevTools → Lighthouse → Mobile → Performance + Best Practices.

Target:
- Performance > 75
- CLS < 0.1
- Best Practices > 90

- [ ] **Step 4: Deploy checklist (no commit)**

File da deployare su Altervista via FTP:
- `dist/game.bundle.min.js`
- `dist/styles.bundle.min.css`
- `dist/styles.mobile.min.css`
- `sw.js`
- `index.php`
- `manifest.json`
- `css/base.css`, `css/clicker.css`, `css/mobile.css` (sources, se serve debug)
- `js/*.js` modificati (sources, se serve debug — runtime usa solo bundle)

---

## Notes

- **No breaking saves:** tutte le modifiche retrocompatibili V9.
- **No PHP backend changes:** tutto client-side.
- **Altervista safe:** SW batch precache resta 3 per volta.
- **Rollback:** ogni task è un commit → `git revert <sha>` per disfarne uno.
