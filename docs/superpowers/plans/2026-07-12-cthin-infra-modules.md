# Filone C — Tranche C-thin: file infrastrutturali in `src/` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** I 6 file infrastrutturali del bundle legacy (`backend-config`, `version-config`, `error-handler`, `save-db`, `i18n`, `asset-manager` — 498 righe) diventano moduli TS in `src/{lib,state,app}` con la STESSA API `window.*`, installati dal modulo V3 prima del bundle — il bundle legacy scende a 12 voci (lz-string + gamestate + 6 file di gioco + 4 periferici).

**Architecture:** Ogni file diventa un modulo con una funzione `installX()` chiamata da `main.ts` in ordine deterministico (pattern installInterop/installGameData). I corpi si spostano quasi-verbatim; le API window restano identiche (il legacy non nota differenze). I monoliti (game-logic/ui-functions/modals/script) NON sono in questa tranche: ognuno avrà il suo piano.

**Tech Stack:** TypeScript/Vite, vitest, Playwright E2E, plugin vite-plugin-legacy (JS_FILES).

## Global Constraints

- **Commit: SOLO titolo**, prefisso `v3.0: reorg C-thin/n — …`.
- **Gate per fetta:** build + typecheck 0 + vitest verdi + E2E 10 passed (`PHP_BIN="C:/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe" npx playwright test`, build prima, timeout 180s+).
- **API window INVARIATE:** `window.EspoBackend{env,url,call}`, `window.GAME_VERSION`, `window.CDN{enabled,prefixes,isRouted,urlSync,url,prefetch}`, `window.DEBUG_MODE`, `window._console`, `window.SaveDB{loadFromIndexedDB,clearIndexedDB}`, `window.applyLanguage`, `window.AssetManager{isLoaded,isLoading,load,loadMultiple,status,notifyBootDone}`.
- **Ordine install in main.ts** (dopo `installGameData()`): `installVersion()` → `installErrorHandler()` → `installBackend()` → `installSaveDb()` → `installI18n()` → `installAssetManager()`.
- **Precondizione per fetta:** i file del task non devono essere sporchi; WIP utente non correlato tollerato, MAI staged.
- **Delta di comportamento ACCETTATI e dichiarati:** (1) il silenziatore console (DEBUG_MODE) si installa a tempo-modulo → silenzia anche i log del modulo V3 e pre-bundle (prima erano visibili; in prod è un miglioramento); (2) l'iniezione cheatboard (dev) parte qualche ms prima (già di fatto async: nessun cambio d'ordine effettivo — esegue comunque dopo il bundle per latenza rete); (3) i listener error-handler si registrano prima (catturano anche errori del modulo: miglioramento).
- **Boot guard F8** (in testa a save-db.js): MIGRA verbatim in testa a `js/data/gamestate.js` (il nuovo primo file bundle dipendente da EspoV3/gameData).
- **Fatti d'ordine verificati:** `window.APP_LANG` è inline (parse-time) → disponibile al modulo nonostante sia a index.php:365 (dopo il tag module: gli inline eseguono al parsing, i module dopo); DOMContentLoaded scatta dopo tutti i deferred/module → i listener registrati a tempo-modulo sono equivalenti a oggi; gli script iniettati dinamicamente con `.defer` sono in realtà async (il defer dinamico è no-op) — vale oggi come domani per cheatboard.js.

---

### Task C-thin/1: version-config + error-handler → src

**Files:**
- Create: `src/lib/version.ts` (da js/version-config.js, corpo CDN verbatim), `src/app/error-handler.ts` (da js/error-handler.js), `src/lib/version.test.ts`
- Delete: `js/version-config.js`, `js/error-handler.js` (git rm dopo trasposizione — questi due si TRASPONGONO, non git-mv, perché il wrapping in install-fn tocca l'intera indentazione; la fedeltà la garantiscono i test + E2E)
- Modify: `src/main.ts`, `scripts/vite-plugin-legacy.ts` (JS_FILES −2)

**Interfaces:**
- Produces: `installVersion(): void` (window.GAME_VERSION + window.CDN + silenziatore DEBUG), `installErrorHandler(): void`. Export puri per test: `GAME_VERSION`, `makeCdn(hostname: string)` non richiesto — CDN resta interno; export `detectDebugDefaults` non serve (YAGNI).

- [ ] **Step 1: test (fail-first)** — `src/lib/version.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { GAME_VERSION } from './version';

describe('lib/version (C-thin)', () => {
  it('GAME_VERSION ha la forma storica e toString legacy', () => {
    expect(GAME_VERSION.major).toBe(3);
    expect(GAME_VERSION.minor).toBe(0);
    expect(String(GAME_VERSION)).toBe('v3.0');
  });
});
```
Run `npx vitest run src/lib/` → FAIL (module not found).

- [ ] **Step 2: `src/lib/version.ts`** — struttura:
```ts
/** Versione gioco + routing CDN R2 + silenziatore console (ex js/version-config.js). */
export const GAME_VERSION = { /* corpo IDENTICO al legacy righe 1-10 */ };

function buildCdn(): any { /* corpo IDENTICO all'IIFE CDN legacy righe 28-195, con `return { enabled: ..., ... }` al posto di `window.CDN = {...}` */ }

function installDebugSilencer(): void { /* corpo IDENTICO alle righe 202-215: window.DEBUG_MODE=false, window._console, wrap di log/warn/info */ }

export function installVersion(): void {
  if (typeof window === 'undefined') return;
  (window as any).GAME_VERSION = GAME_VERSION;
  (window as any).CDN = buildCdn();
  installDebugSilencer();
}
```
Tipi: usare `any` dove serve (corpi legacy verbatim). `location.hostname` dentro buildCdn: invariato (gira solo nel browser via installVersion).

- [ ] **Step 3: `src/app/error-handler.ts`**:
```ts
/** Error handler globale (ex js/error-handler.js): toast sugli uncaught, max 3. */
export function installErrorHandler(): void {
  if (typeof window === 'undefined') return;
  /* corpo IDENTICO all'IIFE legacy (righe 7-34), senza il wrapper IIFE */
}
```

- [ ] **Step 4: wiring** — in `src/main.ts`, import dei due install e chiamate SUBITO DOPO `installGameData();`:
```ts
installVersion();
installErrorHandler();
```
`git rm js/version-config.js js/error-handler.js`; in JS_FILES eliminare `'js/error-handler.js',` e `'js/version-config.js',`.

- [ ] **Step 5: gate + commit** — atteso vitest 211; E2E 10. `git add src/lib/ src/app/ src/main.ts scripts/vite-plugin-legacy.ts js/version-config.js js/error-handler.js` → `v3.0: reorg C-thin/1 — version-config (GAME_VERSION+CDN+debug) ed error-handler come moduli`

---

### Task C-thin/2: backend-config → src/lib

**Files:**
- Create: `src/lib/backend-config.ts`, `src/lib/backend-config.test.ts`
- Delete: `js/backend-config.js`
- Modify: `src/main.ts`, `scripts/vite-plugin-legacy.ts` (JS_FILES −1)

**Interfaces:**
- Produces: `installBackend(): void` (window.EspoBackend + iniezione cheatboard dev); `detectEnv(hostname: string, pathname: string): 'dev' | 'production'` ESPORTATA PURA (testabile).

- [ ] **Step 1: test (fail-first)** — `src/lib/backend-config.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { detectEnv } from './backend-config';

describe('lib/backend-config detectEnv (C-thin)', () => {
  it('dev per host locali e path /test/', () => {
    expect(detectEnv('localhost', '/')).toBe('dev');
    expect(detectEnv('127.0.0.1', '/')).toBe('dev');
    expect(detectEnv('espo.local', '/')).toBe('dev');
    expect(detectEnv('espo.test', '/')).toBe('dev');
    expect(detectEnv('espooclicker.altervista.org', '/test/index.php')).toBe('dev');
  });
  it('production altrove', () => {
    expect(detectEnv('espooclicker.altervista.org', '/index.php')).toBe('production');
  });
});
```

- [ ] **Step 2: `src/lib/backend-config.ts`** — trasposizione: BACKENDS verbatim; `detectEnv(h, p)` pura (parametri invece di location; la logica interna IDENTICA); `installBackend()` che calcola `ACTIVE = detectEnv(location.hostname||'', location.pathname||'')` in try/catch (default production come oggi), costruisce `call` verbatim, assegna `window.EspoBackend`, e replica l'iniezione cheatboard (guard `__cheatboardLoaded`, `Date.now()` buster, console.warn) SOLO se ACTIVE==='dev'.

- [ ] **Step 3: wiring** — main.ts: `installBackend();` dopo `installErrorHandler();`. `git rm js/backend-config.js`; JS_FILES −`'js/backend-config.js',`.

- [ ] **Step 4: gate + commit** — atteso vitest 213; E2E 10 (gli E2E girano su 127.0.0.1 → dev → cheatboard presente: i test cheatboard lo provano end-to-end). Commit: `v3.0: reorg C-thin/2 — backend-config come modulo (detectEnv pura testata, cheatboard inject invariata)`

---

### Task C-thin/3: save-db + i18n + asset-manager → src; guard F8 in gamestate

**Files:**
- Create: `src/state/save-db.ts`, `src/lib/i18n.ts`, `src/lib/asset-manager.ts`
- Delete: `js/save-db.js`, `js/i18n.js`, `js/asset-manager.js`
- Modify: `src/main.ts`, `scripts/vite-plugin-legacy.ts` (JS_FILES −3), `js/data/gamestate.js` (riceve il boot guard F8)

**Interfaces:**
- Produces: `installSaveDb()`, `installI18n()` (window.applyLanguage + boot-apply se APP_LANG≠'it'), `installAssetManager()`. Implementazioni DIRETTE sui moduli src (niente hop via window.EspoV3): save-db usa `defaultSaveDB`+`decodeSave` da `../core/save/*`; i18n usa `applyLanguage` da `../core/i18n/overlay` + `gameData` da `../data/index`; asset-manager usa `createAssetManager` da `../core/assets/manager` (stesse opzioni del wrapper F8: IMG_BASE, IS_ALTERVISTA, retry/concurrency, CustomEvent, bootstrap DOMContentLoaded + listener skins-btn, `notifyBootDone` con `progressivePlan`).

- [ ] **Step 1: `src/state/save-db.ts`**:
```ts
/** API window.SaveDB per il legacy (ex js/save-db.js, post-F8). */
import { defaultSaveDB } from '../core/save/db';
import { decodeSave } from '../core/save/codec';

async function loadFromIndexedDB(): Promise<unknown> {
  try { return decodeSave(await defaultSaveDB.read()); } catch { return null; }
}
async function clearIndexedDB(): Promise<void> { return defaultSaveDB.clear(); }

export function installSaveDb(): void {
  if (typeof window === 'undefined') return;
  (window as any).SaveDB = { loadFromIndexedDB, clearIndexedDB };
}
```
(Verificare le firme reali in `src/core/save/db.ts`/`codec.ts` e adattare i nomi import — read/clear/decodeSave — mantenendo la semantica del wrapper F8: null su qualsiasi errore in load, reject passante in clear.)

- [ ] **Step 2: `src/lib/i18n.ts`** — `installI18n()` assegna `window.applyLanguage = (lang) => applyLanguage((window as any).gameData, lang)` e replica il boot-apply legacy: `if (window.APP_LANG && window.APP_LANG !== 'it') try { window.applyLanguage(window.APP_LANG) } catch (e) { console.warn('[i18n] overlay fallito:', e) }`.

- [ ] **Step 3: `src/lib/asset-manager.ts`** — trasposizione del wrapper F8 (js/asset-manager.js) con import diretto di `createAssetManager`; tutto il resto (IMG_BASE, IS_ALTERVISTA, MAX_*, _emitLoaded, API window.AssetManager, i due DOMContentLoaded, skins-btn once) VERBATIM dentro `installAssetManager()`.

- [ ] **Step 4: guard F8 → gamestate** — rimuovere il blocco guard IIFE da js/save-db.js è implicito (file eliminato); INSERIRE lo STESSO blocco (verbatim, aggiornando il commento: "gamestate.js è ora il primo file bundle che dipende da EspoV3/gameData") in TESTA a `js/data/gamestate.js`, prima del commento `--- STATO GLOBALE CONDIVISO ---`.

- [ ] **Step 5: wiring** — main.ts: `installSaveDb(); installI18n(); installAssetManager();` dopo `installBackend();`. `git rm js/save-db.js js/i18n.js js/asset-manager.js`; JS_FILES: eliminare le 3 voci. JS_FILES risultante (12): lz-string, data/gamestate, ui-functions, game-logic, modals, podio, social, arcade-loader, intro, esposion, script — verificarlo.

- [ ] **Step 6: gate + commit** — atteso vitest 213 (nessun nuovo test: le logiche sottostanti sono già testate in core/*; i bridge sono provati dagli E2E: round-trip save = SaveDB.load, i18n switch = applyLanguage, asset boot = AssetManager) + E2E 10. Commit: `v3.0: reorg C-thin/3 — save-db/i18n/asset-manager come bridge moduli; guard F8 in gamestate; bundle a 12 voci`

---

## Self-review (fatto in scrittura)

- Copertura mapping spec: backend-config→lib ✓, version-config→lib/version ✓, error-handler→app ✓, save-db→state ✓, i18n→lib ✓ (bridge; l'engine è già core/i18n), asset-manager→lib ✓ (bridge; logica già core/assets).
- Delta comportamentali: enumerati e accettati nei Global Constraints (silencer/cheatboard/error-listener timing).
- Nessun placeholder: i corpi "verbatim" puntano a file interamente noti (F8) con righe citate; i punti ad adattamento (firme core/save) hanno istruzione esplicita di verifica.
- Conteggi: vitest 210→211 (C1) →213 (C2) →213 (C3); E2E sempre 10.
