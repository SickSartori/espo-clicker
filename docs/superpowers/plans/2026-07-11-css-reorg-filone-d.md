# Filone D — Unificazione CSS in `styles/` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tutto il CSS del progetto (oggi in `css/` + `src/ui/{theme,desktop-fixes,mobile-fixes,icons}`) unificato sotto un solo albero `styles/`, **senza cambiare un byte dell'output** dei tre bundle né il comportamento runtime.

**Architecture:** Move-only a 6 task (D0→D5): baseline con hash dei bundle → temi runtime lazy → arcade → bundle legacy (entry+partial) → CSS V3 (Vite) → chiusura (rimozione dir vuote, bump cache SW, docs). Ogni task finisce con build + confronto hash (dove applicabile) + E2E 9/9 + commit. Design di riferimento: `docs/superpowers/specs/2026-07-11-project-structure-reorg-design.md` (sez. filone D).

**Tech Stack:** Vite 5 + plugin `scripts/vite-plugin-legacy.ts` (esbuild per il CSS legacy), PHP (index.php/arcade.php), Playwright E2E, Git Bash su Windows.

## Global Constraints

- **Commit: SOLO titolo** (prima riga, niente corpo né Co-Authored-By). Prefisso `v3.0: reorg CSS Dn — …` per coerenza col repo.
- **Move-only:** vietato riscrivere regole CSS; si cambiano SOLO path (`git mv` + riferimenti). L'output dei bundle deve restare identico (verifica hash).
- **Criterio d'accettazione per ogni task:** `npm run build` OK + hash check (D3/D4) + E2E 9/9 verdi + working tree pulito dopo il commit.
- **E2E locale:** `PHP_BIN="C:/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe" npx playwright test` (richiede build fatta prima; server su 127.0.0.1:8899 — nessun altro server su quella porta).
- **Ogni spostamento file CSS tocca al massimo questi 4 punti** (checklist per task): ① `scripts/vite-plugin-legacy.ts` ② `index.php`/`arcade.php` ③ `sw.js` ④ workflow FTP. Nota verificata: sw.js usa pattern generici (`/\.css(\?|$)/`, `/arcade-fullscreen\.css/`) → path-independent, si tocca solo il bump versione in D5; i workflow FTP non escludono `css/` né escluderanno `styles/` → **nessuna modifica FTP necessaria**.
- **PRECONDIZIONE DURA (D0):** working tree PULITO. Al 2026-07-11 ci sono 7 file CSS modificati (WIP guardaroba dell'utente): l'utente deve committarli PRIMA di iniziare. Se `git status --short` non è vuoto → STOP, chiedere all'utente.

### Mappa di caricamento CSS (verificata 2026-07-11 — il "perché" di ogni task)

| Canale | Sorgente oggi | Output/uso | Task |
|---|---|---|---|
| Bundle legacy | `css/main.css` (@import di 15 partial) | `dist/styles.bundle.min.css` ← esbuild nel plugin; link in `index.php:59` e `arcade.php:29` | D3 |
| Bundle mobile | `css/mobile.css` (0 @import) | `dist/styles.mobile.min.css` ← esbuild stdin; link in `index.php:62` | D3 |
| Bundle V3 | `src/ui/theme/index.css` → importa 4 css theme + `../icons/lucide-style.css` + 3 `themes/` + 5 `../mobile-fixes/` + 20 `../desktop-fixes/` | `dist-v3/assets/v3-styles.css` ← Vite (da `src/main.ts:13`); link in `index.php:71` | D4 |
| Temi runtime (lazy) | `css/{8bit,christmas,super}-theme.css` | fetch a runtime da `loadThemeCSS` → `EspoV3.theme` loader, `cssBase` default `'css/'`, busting `window.CACHE_VER` (`index.php:362`) | D1 |
| Arcade | `css/arcade-fullscreen.css` | link in `arcade.php:35` | D2 |

Fatti che rendono il move sicuro (verificati): gli `url()` nei css legacy sono literal (`../assets/…`, `assets/…`, Google Fonts) e dichiarati `external` nell'esbuild del plugin → NON vengono riscritti → l'output non dipende dalla posizione dei sorgenti; `mobile.css` non ha `@import`; `main.css` NON importa i temi; il test E2E dei temi asserisce `link[href*="christmas-theme.css"]` (solo filename) → resta verde col nuovo path; il preload font in `index.php:34` matcha l'`url()` dentro `@font-face` di base.css risolto rispetto all'URL del BUNDLE (`dist/`), che non cambia.

### Struttura bersaglio `styles/`

```
styles/
  main.css            # entry bundle legacy (ex css/main.css) — @import './base/*'
  mobile.css          # entry bundle mobile (ex css/mobile.css)
  base/               # 15 partial: keyframes, base, layout, components, navbar, clicker,
                      #   store, modals-core, modals-content, modals-arcade, skins,
                      #   skins-modern, podio, intro, esposion
  themes/             # 8bit-theme.css, christmas-theme.css, super-theme.css (runtime lazy)
  arcade/             # arcade-fullscreen.css
  v3/
    index.css         # entry V3 (ex src/ui/theme/index.css)
    tokens.css  tokens-v3.css  reset.css  primitives.css  lucide.css (ex icons/lucide-style.css)
    themes/           # 8bit.css, super.css, christmas.css (override token, ≠ temi legacy)
    desktop/          # 20 file ex src/ui/desktop-fixes/
    mobile/           # 5 file ex src/ui/mobile-fixes/
```

Restano in `src/`: `src/ui/theme/css-loader.ts` + `.test.ts` e `src/ui/icons/lucide-init.ts` + test (sono TypeScript: si spostano nel filone C, non qui).

---

### Task D0: Precondizioni + baseline hash

**Files:**
- Create: `.git/css-reorg-baseline.txt` (fuori dal tracking git, non sporca l'albero)

**Interfaces:**
- Produces: baseline hash dei 3 bundle, usata da D3/D4 per il confronto "output identico".

- [ ] **Step 1: Verifica working tree pulito**

Run: `cd "C:/laragon/www/Espo_Clicker" && git status --short`
Expected: output VUOTO. Se compaiono file (es. i 7 CSS del WIP guardaroba) → **STOP**: chiedere all'utente di committare/stashare il suo lavoro. Non procedere.

- [ ] **Step 2: Build + E2E baseline (deve già essere tutto verde)**

Run: `cd "C:/laragon/www/Espo_Clicker" && npm run build 2>&1 | tail -2 && PHP_BIN="C:/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe" npx playwright test 2>&1 | tail -3`
Expected: build OK + `9 passed`. Se rosso → STOP (il problema preesiste al reorg).

- [ ] **Step 3: Registra gli hash baseline dei 3 bundle**

Run:
```bash
cd "C:/laragon/www/Espo_Clicker" && sha256sum dist/styles.bundle.min.css dist/styles.mobile.min.css dist-v3/assets/v3-styles.css | tee .git/css-reorg-baseline.txt
```
Expected: 3 righe hash salvate in `.git/css-reorg-baseline.txt` (dir `.git/` = mai tracciata).

*(Nessun commit: D0 non modifica file tracciati.)*

---

### Task D1: Temi runtime lazy → `styles/themes/`

**Files:**
- Move: `css/8bit-theme.css`, `css/christmas-theme.css`, `css/super-theme.css` → `styles/themes/`
- Modify: `js/ui-functions.js` (wrapper `_v3themeLoader`: aggiungere `cssBase`)

**Interfaces:**
- Consumes: `EspoV3.theme.createCssLoader(opts)` — supporta già `cssBase?: string` (default `'css/'`), vedi `src/ui/theme/css-loader.ts:16` e `:51`. Nessuna modifica TS necessaria.
- Produces: temi serviti da `styles/themes/<file>?v=CACHE_VER`. I filename NON cambiano (`8bit-theme.css` ecc.) → `gameData.skins[*].themeConfig.cssFile` e il test E2E restano validi.

- [ ] **Step 1: Sposta i 3 temi con git mv**

```bash
cd "C:/laragon/www/Espo_Clicker" && mkdir -p styles/themes && git mv css/8bit-theme.css css/christmas-theme.css css/super-theme.css styles/themes/
```

- [ ] **Step 2: Punta il loader al nuovo path (cssBase)**

In `js/ui-functions.js`, nel blocco `_v3themeLoader = window.EspoV3.theme.createCssLoader({ ... })` (attorno alla riga 49), aggiungere la riga `cssBase` subito prima di `cacheVer`:

```js
const _v3themeLoader = window.EspoV3.theme.createCssLoader({
    inject: (href, onDone) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.onload = onDone;
        link.onerror = onDone; // CSS irraggiungibile: applica comunque la classe
        document.head.appendChild(link);
    },
    cssBase: 'styles/themes/', // reorg D1: i temi lazy vivono in styles/themes/ (ex css/)
    cacheVer: () => window.CACHE_VER || (window.GAME_VERSION ? window.GAME_VERSION.major : Date.now()),
    onLog: (m) => console.log(m),
    onWarn: (m, e) => console.warn(m, e),
});
```

- [ ] **Step 3: Verifica che nessun altro punto referenzi i vecchi path**

Run: `cd "C:/laragon/www/Espo_Clicker" && grep -rn "css/8bit-theme\|css/christmas-theme\|css/super-theme" --include="*.js" --include="*.php" --include="*.ts" . | grep -v node_modules | grep -v dist`
Expected: NESSUN risultato. (I temi non sono importati da `css/main.css` — verificato in design.)

- [ ] **Step 4: Build + E2E**

Run: `npm run build 2>&1 | tail -2 && PHP_BIN="C:/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe" npx playwright test 2>&1 | tail -3`
Expected: build OK, `9 passed`. In particolare il test integration "percorsi UI delegati" inietta un tema e asserisce `link[href*="christmas-theme.css"]` → verde col nuovo path.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "v3.0: reorg CSS D1 — temi runtime lazy in styles/themes (cssBase nel loader)"
```

---

### Task D2: Arcade CSS → `styles/arcade/`

**Files:**
- Move: `css/arcade-fullscreen.css` → `styles/arcade/arcade-fullscreen.css`
- Modify: `arcade.php` (href + eventuale path in `assetVer`)

**Interfaces:**
- Consumes: niente dai task precedenti.
- Produces: arcade CSS servito da `styles/arcade/…`. `sw.js` ha il pattern `/arcade-fullscreen\.css/` (solo filename) → resta valido senza modifiche.

- [ ] **Step 1: Sposta il file**

```bash
cd "C:/laragon/www/Espo_Clicker" && mkdir -p styles/arcade && git mv css/arcade-fullscreen.css styles/arcade/
```

- [ ] **Step 2: Trova TUTTI i riferimenti in arcade.php**

Run: `grep -n "arcade-fullscreen" arcade.php`
Expected: le occorrenze del path (il `<link>` alla riga ~35 con `href="css/arcade-fullscreen.css?v=…"` e, se presente, la chiamata `assetVer(__DIR__ . '/css/arcade-fullscreen.css', …)` che calcola `$arcadeAssetVer`).

- [ ] **Step 3: Aggiorna ogni occorrenza `css/arcade-fullscreen.css` → `styles/arcade/arcade-fullscreen.css`**

Nel `<link>`:
```php
<link rel="stylesheet" href="styles/arcade/arcade-fullscreen.css?v=<?php echo $arcadeAssetVer; ?>">
```
E nella definizione della versione (se usa il path del file):
```php
$arcadeAssetVer = assetVer(__DIR__ . '/styles/arcade/arcade-fullscreen.css', $cacheVer);
```
*(Adattare al codice reale trovato allo Step 2: la regola è sostituire il path in OGNI occorrenza, senza cambiare la logica.)*

- [ ] **Step 4: Verifica residui + build + E2E**

Run: `grep -rn "css/arcade-fullscreen" --include="*.php" --include="*.js" --include="*.ts" . | grep -v node_modules | grep -v dist; npm run build 2>&1 | tail -2 && PHP_BIN="C:/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe" npx playwright test 2>&1 | tail -3`
Expected: nessun residuo; build OK; `9 passed`.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "v3.0: reorg CSS D2 — arcade-fullscreen in styles/arcade (href arcade.php)"
```

---

### Task D3: Bundle legacy → `styles/main.css` + `styles/base/` + `styles/mobile.css`

**Files:**
- Move: `css/main.css` → `styles/main.css`; `css/mobile.css` → `styles/mobile.css`; i 15 partial → `styles/base/`
- Modify: `styles/main.css` (i 15 path `@import`), `scripts/vite-plugin-legacy.ts` (`buildLegacyCSS`)

**Interfaces:**
- Consumes: baseline hash da D0 (`.git/css-reorg-baseline.txt`).
- Produces: `dist/styles.bundle.min.css` e `dist/styles.mobile.min.css` **byte-identici** alla baseline (path di output invariati → `index.php`/`arcade.php` NON si toccano).

- [ ] **Step 1: Sposta entry e partial**

```bash
cd "C:/laragon/www/Espo_Clicker" && mkdir -p styles/base && \
git mv css/main.css styles/main.css && \
git mv css/mobile.css styles/mobile.css && \
git mv css/keyframes.css css/base.css css/layout.css css/components.css css/navbar.css css/clicker.css css/store.css css/modals-core.css css/modals-content.css css/modals-arcade.css css/skins.css css/skins-modern.css css/podio.css css/intro.css css/esposion.css styles/base/
```

- [ ] **Step 2: Riscrivi i path dei 15 `@import` in `styles/main.css`**

Ogni riga `@import './NOME.css';` diventa `@import './base/NOME.css';` — SOLO il path, senza toccare commenti/ordine. I 15 NOMI (ordine attuale del file): `keyframes, base, layout, components, navbar, clicker, store, modals-core, modals-content, modals-arcade, skins, skins-modern, podio, intro, esposion`.

Esempio (prime righe dopo la modifica):
```css
@import './base/keyframes.css';
@import './base/base.css';
@import './base/layout.css';
```

- [ ] **Step 3: Aggiorna `buildLegacyCSS` nel plugin**

In `scripts/vite-plugin-legacy.ts`, funzione `buildLegacyCSS` (righe ~72-85), cambiare i 3 path sorgente (gli `outfile` NON cambiano):

```ts
  await esbuild.build({ entryPoints: ['styles/main.css'], outfile: 'dist/styles.bundle.min.css', ...shared });
  const mobileCss = fs.readFileSync('styles/mobile.css', 'utf8');
  await esbuild.build({ stdin: { contents: mobileCss, loader: 'css', resolveDir: 'styles' }, outfile: 'dist/styles.mobile.min.css', ...shared });
```

- [ ] **Step 4: Verifica residui `css/` + cartella css svuotata**

Run: `ls css/ 2>/dev/null; grep -rn "'css/\|\"css/" --include="*.ts" --include="*.js" --include="*.php" . | grep -v node_modules | grep -v dist | grep -v "\.css:"`
Expected: `css/` vuota o inesistente; nessun riferimento residuo a path `css/…` in codice/config (eventuali match dentro file `.css` di terzi o commenti storici vanno valutati uno a uno — attesi 0).

- [ ] **Step 5: Build + HASH IDENTICI + E2E**

Run:
```bash
npm run build 2>&1 | tail -2 && sha256sum dist/styles.bundle.min.css dist/styles.mobile.min.css && head -2 .git/css-reorg-baseline.txt
```
Expected: i 2 hash di `styles.bundle` e `styles.mobile` IDENTICI alle prime 2 righe della baseline. **Se differiscono → STOP e investigare prima di committare** (probabile url() riscritto: confrontare con `diff <(…)`).
Poi: `PHP_BIN="C:/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe" npx playwright test 2>&1 | tail -3` → `9 passed`.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "v3.0: reorg CSS D3 — bundle legacy da styles/ (main+base/+mobile), output bit-identico"
```

---

### Task D4: CSS V3 → `styles/v3/`

**Files:**
- Move: `src/ui/theme/{index,tokens,tokens-v3,reset,primitives}.css` → `styles/v3/`; `src/ui/theme/themes/{8bit,super,christmas}.css` → `styles/v3/themes/`; `src/ui/icons/lucide-style.css` → `styles/v3/lucide.css`; `src/ui/mobile-fixes/*.css` (5) → `styles/v3/mobile/`; `src/ui/desktop-fixes/*.css` (20) → `styles/v3/desktop/`
- Modify: `styles/v3/index.css` (path degli @import), `src/main.ts:13`

**Interfaces:**
- Consumes: baseline hash da D0 (riga 3).
- Produces: `dist-v3/assets/v3-styles.css` identico alla baseline; `src/ui/theme/` resta con soli file `.ts` (css-loader), `src/ui/{desktop-fixes,mobile-fixes}` vuote (rimosse in D5), `src/ui/icons/` resta con `lucide-init.ts` (+ test).

- [ ] **Step 1: Sposta i file**

```bash
cd "C:/laragon/www/Espo_Clicker" && mkdir -p styles/v3/themes styles/v3/desktop styles/v3/mobile && \
git mv src/ui/theme/index.css src/ui/theme/tokens.css src/ui/theme/tokens-v3.css src/ui/theme/reset.css src/ui/theme/primitives.css styles/v3/ && \
git mv src/ui/theme/themes/8bit.css src/ui/theme/themes/super.css src/ui/theme/themes/christmas.css styles/v3/themes/ && \
git mv src/ui/icons/lucide-style.css styles/v3/lucide.css && \
git mv src/ui/mobile-fixes/modal-close.css src/ui/mobile-fixes/skins-modal.css src/ui/mobile-fixes/achievements-modal.css src/ui/mobile-fixes/score-header.css src/ui/mobile-fixes/clicker-button.css styles/v3/mobile/ && \
bash -c 'git mv src/ui/desktop-fixes/*.css styles/v3/desktop/'
```

- [ ] **Step 2: Riscrivi gli @import in `styles/v3/index.css`**

Regole (l'ordine delle righe NON cambia — determina l'ordine di concatenazione del bundle):
- `./tokens.css`, `./tokens-v3.css`, `./reset.css`, `./primitives.css` → invariati (stessa dir);
- `../icons/lucide-style.css` → `./lucide.css`;
- `./themes/8bit.css`, `./themes/super.css`, `./themes/christmas.css` → invariati;
- le 5 righe `../mobile-fixes/X.css` → `./mobile/X.css`;
- le 20 righe `../desktop-fixes/X.css` → `./desktop/X.css`.

Blocco import risultante (completo, nell'ordine):
```css
@import './tokens.css';
@import './tokens-v3.css';
@import './reset.css';
@import './primitives.css';
@import './lucide.css';
@import './themes/8bit.css';
@import './themes/super.css';
@import './themes/christmas.css';

/* Mobile fixes — override su mobile.css legacy */
@import './mobile/modal-close.css';
@import './mobile/skins-modal.css';
@import './mobile/achievements-modal.css';
@import './mobile/score-header.css';
@import './mobile/clicker-button.css';

/* Desktop refresh — HUD/FUI cyberpunk-tech identity (>= 769px) */
@import './desktop/background.css';
@import './desktop/layout-shell.css';
@import './desktop/skin-ambient.css';
@import './desktop/signature-effects.css';
@import './desktop/header-navbar.css';
@import './desktop/score-header.css';
@import './desktop/clicker-button.css';
@import './desktop/clicker-3d.css';
@import './desktop/tabs.css';
@import './desktop/cards.css';
@import './desktop/skins-modal-v3.css';
@import './desktop/modals-shell.css';
@import './desktop/modals-content-v3.css';
@import './desktop/golden-bug-v3.css';
@import './desktop/toasts-v3.css';
@import './desktop/fury-flames-v3.css';
@import './desktop/login-modal-v3.css';
@import './desktop/settings-modal-v3.css';
@import './desktop/account-modal-v3.css';
@import './desktop/super-theme-v3.css';
```
*(Il resto del file — commento di testa e blocco `.v3-skip-link` — resta invariato.)*

- [ ] **Step 3: Aggiorna l'entry Vite**

In `src/main.ts` riga 13:
```ts
import '../styles/v3/index.css';
```

- [ ] **Step 4: Verifica residui + build + HASH + E2E**

Run:
```bash
grep -rn "ui/theme/index.css\|desktop-fixes/.*\.css\|mobile-fixes/.*\.css\|lucide-style.css" --include="*.ts" --include="*.css" src/ styles/ | grep -v "\.test\.ts"
npm run build 2>&1 | tail -2 && sha256sum dist-v3/assets/v3-styles.css && tail -1 .git/css-reorg-baseline.txt
```
Expected: nessun riferimento ai vecchi path (i commenti descrittivi nei css spostati che citano "desktop-fixes" sono testo, non import: ignorarli o aggiornarli — non bloccanti); hash di `v3-styles.css` IDENTICO alla riga 3 della baseline. **Se differisce → STOP**: `diff` tra i due file (probabile riscrittura url()/ordine) e risolvere prima di committare.
Poi: `PHP_BIN="C:/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe" npx playwright test 2>&1 | tail -3` → `9 passed`. In più: `npm run typecheck` (main.ts modificato) → 0 errori.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "v3.0: reorg CSS D4 — CSS V3 in styles/v3 (theme+lucide+mobile+desktop), bundle identico"
```

---

### Task D5: Chiusura — pulizia, cache SW, docs

**Files:**
- Delete: dir vuote `css/`, `src/ui/desktop-fixes/`, `src/ui/mobile-fixes/`, `src/ui/theme/themes/`
- Modify: `sw.js` (bump `CACHE_VERSION`), `src/README.md` (albero/paths), spec di design (stato filone D)

**Interfaces:**
- Consumes: tutto D1-D4 completato.
- Produces: albero finale `styles/` (unica casa del CSS); cache SW invalidata → i client scaricano i css dai nuovi path senza serve-stale.

- [ ] **Step 1: Rimuovi le directory vuote**

Run: `cd "C:/laragon/www/Espo_Clicker" && rmdir css src/ui/desktop-fixes src/ui/mobile-fixes src/ui/theme/themes 2>/dev/null; ls css src/ui/desktop-fixes 2>&1 | head -3`
Expected: le dir non esistono più (git non traccia dir vuote: se `git mv` le ha già eliminate, il comando è un no-op).

- [ ] **Step 2: Bump versione cache del service worker**

Run: `grep -n "CACHE_VERSION" sw.js | head -3` → individuare la costante (es. `const CACHE_VERSION = '3.0.14';`) e incrementare il patch (es. → `'3.0.15'`). Motivo: i temi lazy e l'arcade css hanno cambiato URL; il bump purga le entry `css/…` orfane dalla cache dei client.

- [ ] **Step 3: Aggiorna i docs**

- `src/README.md`: nella sezione struttura, sostituire i riferimenti a `ui/theme/*.css` con una riga che punta a `styles/` (albero: `styles/{main.css,mobile.css,base/,themes/,arcade/,v3/}`) e nota che in `src/ui/theme/` resta solo `css-loader.ts`.
- `docs/superpowers/specs/2026-07-11-project-structure-reorg-design.md`: nella roadmap, marcare il filone D **FATTO (data)**.

- [ ] **Step 4: Verifica finale completa**

Run: `npm run build 2>&1 | tail -2 && npm run typecheck && npm test 2>&1 | tail -3 && PHP_BIN="C:/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe" npx playwright test 2>&1 | tail -3`
Expected: build OK, typecheck 0 errori, 194 vitest verdi, E2E `9 passed`.

- [ ] **Step 5: Commit + aggiorna memoria**

```bash
git add -A && git commit -m "v3.0: reorg CSS D5 — chiusura filone D (bump SW cache, docs); tutto il CSS vive in styles/"
```
Poi aggiornare la memoria `preview-css-cache-gotcha` (path temi: `styles/themes/` con CACHE_VER; arcade: `styles/arcade/`) e `v3-migration-state`/nuova memoria reorg se serve.

- [ ] **Step 6 (manuale, utente): deploy test**

Opz. 7 di deploy.bat → verificare su dominio `.test`: tema skin equip (lazy load da `styles/themes/`), arcade, layout desktop+mobile. Guardrail prod invariato.

---

## Self-review (fatto in scrittura)

- **Copertura spec:** tutti i 5 canali CSS della mappa hanno un task; "co-locazione senza cancellazione" dei temi rispettata (D1 muove i legacy, D4 gli override V3, nessun delete di contenuto); FTP/sw verificati path-independent.
- **No placeholder:** ogni step ha comando+expected o codice completo; l'unico punto ad adattamento (`arcade.php` Step 3) include la regola esatta e il grep che elenca le occorrenze reali.
- **Coerenza nomi/path:** `styles/themes/` (D1) = `cssBase` in D1 Step 2; entry `styles/main.css`/`styles/mobile.css` (D3 Step 1) = path nel plugin (D3 Step 3); `styles/v3/index.css` (D4 Step 1) = import in `main.ts` (D4 Step 3); baseline `.git/css-reorg-baseline.txt` creata in D0 e consumata in D3/D4.
