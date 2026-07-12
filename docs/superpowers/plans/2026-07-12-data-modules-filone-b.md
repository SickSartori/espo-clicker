# Filone B — Dati in `src/data/` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tutti i dati di gioco (`js/data/*` tranne gamestate.js, `js/data-en/*`, `js/asset-packages.js` — 15 file, ~2.900 righe) diventano moduli TypeScript in `src/data/`, assemblati e installati su `window.gameData`/`window.ASSET_PACKAGES` dal modulo V3 PRIMA che il bundle legacy esegua — zero cambiamento di comportamento.

**Architecture:** Conversione meccanica per fedeltà: `git mv js/data/X.js src/data/X.ts` + edit dei SOLI anchor (`window.gameData.X = {` → `export const X: Record<string, any> = {`), corpo byte-intatto → il diff (rename + poche righe) È la prova di fedeltà. `src/data/index.ts` assembla `gameData` e lo installa (chiamato da main.ts dopo `installInterop()` — contratto d'ordine F0: modulo prima del bundle). I file legacy convertiti escono da JS_FILES nella stessa fetta. Le condition di achievements (uniche funzioni embedded) passano da globali bare a accessor via helper (`gs()`, `bpsNow()`) sullo store del filone A.

**Tech Stack:** TypeScript/Vite (moduli V3), vitest (jsdom), Playwright E2E, plugin `scripts/vite-plugin-legacy.ts` (lista JS_FILES).

## Global Constraints

- **Commit: SOLO titolo** (una riga, niente corpo né Co-Authored-By). Prefisso `v3.0: reorg Bn — …`.
- **Zero cambiamento di comportamento.** Gate per ogni task: build + typecheck 0 errori + vitest verdi + E2E **10 passed**.
- **E2E locale:** `PHP_BIN="C:/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe" npx playwright test` (build PRIMA; niente altri server su :8899; timeout 180000ms+).
- **Fedeltà = diff minimo:** ogni conversione parte da `git mv` e tocca SOLO le righe anchor/header indicate. VIETATO riformattare, riordinare chiavi o "ripulire" i letterali. Il reviewer boccia qualsiasi diff nel corpo.
- **Precondizione per ogni task:** `git status --short` non deve elencare NESSUNO dei file del task; file sporchi non correlati (WIP utente) sono tollerati ma MAI toccati/stagiati — il commit stagia SOLO i file del task (staging esplicito).
- **Decimal nei dati:** a runtime le istanze devono essere `window.Decimal` (break_infinity — bit-identiche al legacy). `src/data/decimal.ts` esporta il ctor RISOLTO col nome `Decimal` (window.Decimal, fallback break_eternity nei test) così i corpi con `new Decimal(...)` restano intatti.
- **JS_FILES** (`scripts/vite-plugin-legacy.ts:16-49`): le voci convertite si rimuovono nella STESSA fetta. A fine filone la sezione dati contiene SOLO `js/data/gamestate.js`. `js/i18n.js` e `js/data/gamestate.js` NON si toccano (leggono `window.gameData` che il modulo ha già popolato).
- **Ordine di caricamento (fatto verificato):** break_infinity (defer) → game.modules.js (module: interop + `installGameData()`) → bundle legacy. `js/data/core.js` legacy fa `window.gameData = window.gameData || {}` → finché esiste PRESERVA l'oggetto del modulo; i file dati legacy non ancora convertiti sovrascrivono solo la PROPRIA fetta con contenuto identico → la convivenza incrementale è sicura.
- **arcade.php NON usa gameData** (verificato: 0 riferimenti in arcade-page/arcade-loader) → fuori rischio.

### Inventario (verificato 2026-07-12)

| File | Righe | Decimal | Funzioni | Fetta |
|---|---|---|---|---|
| js/data/texts.js · events.js · assets.js · js/asset-packages.js | 219+67+371+237 | 0 | 0 | B1 |
| js/data-en/*.js (texts, teams, upgrades, skins, achievements, events) | ~533 tot | 0 | 0 | B2 |
| js/data/teams.js · skins.js · upgrades.js (4 sezioni) | 57+284+757 | 22+15+168 | 0 | B3 |
| js/data/achievements.js (condition: `gameState.*` many, `bps.` ×4, `IS_XMAS_TIME` ×1) · core.js (2 helper stagionali su window) | 462+27 | 23 | 61+2 | B4 |
| store.gameData + docs | — | — | — | B5 |

---

### Task B1: Pipeline + file puri (texts, events, assets, asset-packages)

**Files:**
- Move+edit: `js/data/texts.js`→`src/data/texts.ts`, `js/data/events.js`→`src/data/events.ts`, `js/data/assets.js`→`src/data/assets.ts`, `js/asset-packages.js`→`src/data/asset-packages.ts`
- Create: `src/data/index.ts`, `src/data/data.test.ts`
- Modify: `src/main.ts`, `scripts/vite-plugin-legacy.ts`

**Interfaces:**
- Consumes: niente (file puri, zero Decimal/funzioni).
- Produces: `export const texts/events/assets: Record<string, any>` (da texts.ts/events.ts/assets.ts), `export const ASSET_PACKAGES: Record<string, any>` (da asset-packages.ts); `src/data/index.ts` esporta `gameData: Record<string, any>` (parziale: texts+events+assets) e `installGameData(): void` (assegna `window.gameData`, `window.ASSET_PACKAGES`); main.ts la chiama dopo `installInterop()`.

- [ ] **Step 1: Precondizione**

Run: `cd "C:/laragon/www/Espo_Clicker" && git status --short`
Expected: nessun file del task presente. Altri file sporchi (WIP utente) → tollerati, MAI toccati.

- [ ] **Step 2: Test dati (fail-first: moduli inesistenti)**

`src/data/data.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { gameData } from './index';

describe('data/index (reorg filone B)', () => {
  it('espone texts con la struttura consumata dal gioco', () => {
    expect(gameData.texts.format.suffixes.length).toBeGreaterThan(40); // scala fino a Qag
    expect(gameData.texts.format.time.s).toBeTypeOf('string');
    expect(gameData.texts.toasts).toBeTypeOf('object');
    expect(gameData.texts.ui).toBeTypeOf('object');
  });
  it('espone events e assets', () => {
    expect(Object.keys(gameData.events).length).toBeGreaterThan(0);
    expect(gameData.assets.sounds).toBeTypeOf('object');
  });
});
```

Run: `cd "C:/laragon/www/Espo_Clicker" && npx vitest run src/data/ 2>&1 | tail -3`
Expected: FAIL (Cannot find module './index').

- [ ] **Step 3: Converti i 4 file (git mv + edit anchor)**

```bash
cd "C:/laragon/www/Espo_Clicker" && git mv js/data/texts.js src/data/texts.ts && git mv js/data/events.js src/data/events.ts && git mv js/data/assets.js src/data/assets.ts && git mv js/asset-packages.js src/data/asset-packages.ts
```
Poi, in ognuno, SOLO l'anchor:
- `src/data/texts.ts` riga 1: `window.gameData.texts = {` → `export const texts: Record<string, any> = {`
- `src/data/events.ts` riga 1: `window.gameData.events = {` → `export const events: Record<string, any> = {`
- `src/data/assets.ts` riga 1: `window.gameData.assets = {` → `export const assets: Record<string, any> = {`
- `src/data/asset-packages.ts`: trova con grep l'assegnazione globale (`grep -n "^window.ASSET_PACKAGES" src/data/asset-packages.ts`, attesa 1 occorrenza tipo `window.ASSET_PACKAGES = {`) → `export const ASSET_PACKAGES: Record<string, any> = {`. Il commento di testa resta.
Se un file chiude con `};` seguito da altre assegnazioni globali impreviste → STOP e riportare BLOCKED con l'output (l'inventario dice: non ce ne sono).

- [ ] **Step 4: `src/data/index.ts` + wiring main.ts**

`src/data/index.ts`:
```ts
/**
 * Assemblaggio dati di gioco (reorg filone B). Il modulo V3 esegue PRIMA del
 * bundle legacy (contratto F0): installGameData() pubblica l'oggetto su
 * window.gameData / window.ASSET_PACKAGES, così i18n.js, gamestate.js e tutto
 * il legacy trovano i dati già pronti. I file dati legacy non ancora
 * convertiti sovrascrivono la PROPRIA fetta con contenuto identico (core.js
 * legacy preserva l'oggetto: window.gameData = window.gameData || {}).
 */
import { texts } from './texts';
import { events } from './events';
import { assets } from './assets';
import { ASSET_PACKAGES } from './asset-packages';

export const gameData: Record<string, any> = {
  texts,
  events,
  assets,
};

export function installGameData(): void {
  if (typeof window === 'undefined') return;
  (window as any).gameData = gameData;
  (window as any).ASSET_PACKAGES = ASSET_PACKAGES;
}
```

`src/main.ts`: dopo la riga `import { installInterop } from './state/interop';` aggiungi:
```ts
import { installGameData } from './data/index';
```
e subito dopo la chiamata `installInterop();` aggiungi:
```ts
// Reorg filone B: i dati di gioco vivono in src/data/ e vengono installati su
// window.gameData PRIMA del bundle legacy (che li consuma al boot).
installGameData();
```

- [ ] **Step 5: Togli i 4 file da JS_FILES**

In `scripts/vite-plugin-legacy.ts`, array `JS_FILES`, elimina le 4 righe: `'js/asset-packages.js',` · `'js/data/assets.js',` · `'js/data/events.js',` · `'js/data/texts.js',` (le altre voci restano nell'ordine attuale).

- [ ] **Step 6: Gate completo**

Run: `cd "C:/laragon/www/Espo_Clicker" && npx vitest run src/data/ 2>&1 | tail -3 && npm run build 2>&1 | tail -2 && npm run typecheck && npm test 2>&1 | tail -3 && PHP_BIN="C:/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe" npx playwright test 2>&1 | grep -v -E "WebServer|Accepted|Closing|Closed|preconnection" | tail -5`
Expected: data.test verdi; build OK (bundle legacy CALA di ~890 righe sorgente); typecheck 0; vitest `203 passed` (201+2); E2E **10 passed** (l'i18n/theme/toast test consuma texts dal modulo; asset-manager consuma ASSET_PACKAGES dal modulo).

- [ ] **Step 7: Commit**

```bash
git add src/data/ src/main.ts scripts/vite-plugin-legacy.ts && git status --short && git commit -m "v3.0: reorg B1 — dati puri (texts/events/assets/asset-packages) in src/data, installGameData nel modulo"
```
NB: `git add src/data/` include automaticamente i 4 rename (git mv già stagiato) + index.ts + data.test.ts. Verificare che il commit contenga SOLO i file del task.

---

### Task B2: Overlay lingua (`js/data-en/*` → `src/data/en/`)

**Files:**
- Move+edit: i 6 file `js/data-en/{texts,teams,upgrades,skins,achievements,events}.js` → `src/data/en/{texts,teams,upgrades,skins,achievements,events}.ts`
- Modify: `src/data/index.ts`, `scripts/vite-plugin-legacy.ts`, `src/data/data.test.ts`

**Interfaces:**
- Consumes: `gameData`/`installGameData` esistenti (B1).
- Produces: `gameData.i18n.en = { texts, teams, clickUpgrades, prestigeUpgrades, buildingEnhancements, superUpgrades, skins, achievements, events }` — le STESSE chiavi che i file legacy scrivevano sotto `window.gameData.i18n.en.*` (consumate da `EspoV3.i18n.applyLanguage` via `js/i18n.js`).

- [ ] **Step 1: Test overlay (fail-first)**

Aggiungi a `src/data/data.test.ts`:
```ts
import { en } from './en/index';

describe('data/en overlay (reorg filone B)', () => {
  it('gli id dei dizionari en esistono nelle collezioni base (niente chiavi orfane)', () => {
    for (const id of Object.keys(en.teams ?? {})) {
      // le collezioni base arrivano in B3: finché mancano, il check è sui texts
      if (gameData.teams) expect(gameData.teams[id], `team en orfano: ${id}`).toBeTruthy();
    }
    expect(en.texts).toBeTypeOf('object');
  });
  it('gameData.i18n.en è cablato', () => {
    expect(gameData.i18n.en).toBe(en);
  });
});
```

Run: `npx vitest run src/data/ 2>&1 | tail -3` → Expected: FAIL (Cannot find module './en/index').

- [ ] **Step 2: Converti i 6 file**

```bash
cd "C:/laragon/www/Espo_Clicker" && mkdir -p src/data/en && for f in texts teams upgrades skins achievements events; do git mv js/data-en/$f.js src/data/en/$f.ts; done
```
In ogni file: le 3-4 righe di boilerplate iniziale (`window.gameData = window.gameData || {};` / `window.gameData.i18n = ...` / `window.gameData.i18n.en = ...`) si ELIMINANO; ogni assegnazione `window.gameData.i18n.en.X = {` diventa `export const X: Record<string, any> = {`. Attenzione a `upgrades.ts`: contiene 4 assegnazioni (`clickUpgrades` :5, `prestigeUpgrades` :19, `buildingEnhancements` :34, `superUpgrades` :91) → 4 export nello stesso file. Corpi INTATTI.

- [ ] **Step 3: `src/data/en/index.ts` + cablaggio**

Create `src/data/en/index.ts`:
```ts
import { texts } from './texts';
import { teams } from './teams';
import { clickUpgrades, prestigeUpgrades, buildingEnhancements, superUpgrades } from './upgrades';
import { skins } from './skins';
import { achievements } from './achievements';
import { events } from './events';

/** Dizionario overlay EN — stesse chiavi che il legacy scriveva su gameData.i18n.en */
export const en: Record<string, any> = {
  texts, teams, clickUpgrades, prestigeUpgrades, buildingEnhancements, superUpgrades, skins, achievements, events,
};
```
In `src/data/index.ts`: aggiungi `import { en } from './en/index';` e nel literal `gameData` aggiungi la property `i18n: { en },`.

- [ ] **Step 4: Togli le 6 voci da JS_FILES**

In `scripts/vite-plugin-legacy.ts` elimina le 6 righe `'js/data-en/….js',`.

- [ ] **Step 5: Gate completo** (stesso comando del B1 Step 6)

Expected: vitest `205 passed` (203+2); E2E 10 passed — in particolare il test integration "percorsi UI delegati" fa `applyLanguage('en')` sul gioco reale e pretende testi cambiati → prova end-to-end che l'overlay dal modulo funziona.

- [ ] **Step 6: Commit**

```bash
git add src/data/ scripts/vite-plugin-legacy.ts && git status --short && git commit -m "v3.0: reorg B2 — overlay lingua en in src/data/en (6 file), i18n dal modulo"
```

---

### Task B3: Dati con Decimal (teams, skins, upgrades)

**Files:**
- Create: `src/data/decimal.ts`
- Move+edit: `js/data/teams.js`→`src/data/teams.ts`, `js/data/skins.js`→`src/data/skins.ts`, `js/data/upgrades.js`→`src/data/upgrades.ts`
- Modify: `src/data/index.ts`, `scripts/vite-plugin-legacy.ts`, `src/data/data.test.ts`

**Interfaces:**
- Consumes: pattern Decimal-risolto (identico a `src/state/store.ts`).
- Produces: `export const Decimal: any` (decimal.ts — ctor risolto, così i corpi con `new Decimal(...)` restano INTATTI); `teams`, `skins`, `clickUpgrades`, `prestigeUpgrades`, `buildingEnhancements`, `superUpgrades` in gameData.

- [ ] **Step 1: Test (fail-first)**

Aggiungi a `src/data/data.test.ts` (nel describe data/index):
```ts
  it('teams/upgrades hanno costi Decimal-like (mul/gte presenti)', () => {
    const t = Object.values<any>(gameData.teams)[0];
    expect(typeof t.baseCost.mul).toBe('function');
    const u = Object.values<any>(gameData.clickUpgrades)[0];
    expect(typeof u.cost.mul ?? typeof u.cost).toBeDefined();
    expect(Object.keys(gameData.skins)).toContain('default');
    expect(Object.keys(gameData.prestigeUpgrades).length).toBeGreaterThan(0);
    expect(Object.keys(gameData.superUpgrades).length).toBeGreaterThan(0);
  });
```
Run: `npx vitest run src/data/ 2>&1 | tail -3` → FAIL (gameData.teams undefined).

- [ ] **Step 2: `src/data/decimal.ts`**

```ts
/**
 * Ctor Decimal RISOLTO per i moduli dati (reorg filone B): a runtime
 * window.Decimal (break_infinity, primo script — istanze bit-identiche al
 * legacy); nei test (jsdom senza window.Decimal) fallback break_eternity.
 * Esportato col NOME `Decimal` così i corpi dei dati (`new Decimal(...)`)
 * restano byte-intatti nella conversione.
 */
import { Decimal as EternityDecimal } from '../core/bignum';

export const Decimal: any =
  typeof window !== 'undefined' && (window as any).Decimal
    ? (window as any).Decimal
    : EternityDecimal;
```

- [ ] **Step 3: Converti i 3 file**

```bash
cd "C:/laragon/www/Espo_Clicker" && git mv js/data/teams.js src/data/teams.ts && git mv js/data/skins.js src/data/skins.ts && git mv js/data/upgrades.js src/data/upgrades.ts
```
Anchor (corpi INTATTI, `new Decimal(...)` invariati):
- `teams.ts` riga 1 → `import { Decimal } from './decimal';\n\nexport const teams: Record<string, any> = {`
- `skins.ts` riga 1 → `import { Decimal } from './decimal';\n\nexport const skins: Record<string, any> = {`
- `upgrades.ts`: in testa `import { Decimal } from './decimal';` e le 4 assegnazioni → `export const clickUpgrades: Record<string, any> = {` (:1), `export const prestigeUpgrades: Record<string, any> = {` (:131), `export const buildingEnhancements: Record<string, any> = {` (:253), `export const superUpgrades: Record<string, any> = {` (:695). (Numeri riga = pre-conversione; ritrovarle con `grep -n "^window.gameData" src/data/upgrades.ts`.)
NB: se tsc segnala `Decimal` importato ma non usato in un file (improbabile: tutti e 3 lo usano), rimuovere l'import SOLO in quel file.

- [ ] **Step 4: Cablaggio index + JS_FILES**

`src/data/index.ts`: importa `teams`, `skins`, `{ clickUpgrades, prestigeUpgrades, buildingEnhancements, superUpgrades }` e aggiungili al literal `gameData`. In `scripts/vite-plugin-legacy.ts` elimina `'js/data/teams.js',` `'js/data/skins.js',` `'js/data/upgrades.js',`.

- [ ] **Step 5: Gate completo** (comando B1 Step 6)

Expected: vitest `206 passed`; E2E 10 passed — smoke "acquisto team" e "promozione" provano sul gioco reale costi/soglie coi Decimal del modulo (bit-identici: stesso ctor break_infinity).

- [ ] **Step 6: Commit**

```bash
git add src/data/ scripts/vite-plugin-legacy.ts && git status --short && git commit -m "v3.0: reorg B3 — teams/skins/upgrades in src/data (Decimal risolto, corpi intatti)"
```

---

### Task B4: achievements (condition→store) + core helpers

**Files:**
- Move+edit: `js/data/achievements.js`→`src/data/achievements.ts`
- Delete (contenuto assorbito): `js/data/core.js`
- Modify: `src/data/index.ts`, `scripts/vite-plugin-legacy.ts`, `src/data/data.test.ts`

**Interfaces:**
- Consumes: `store` (filone A: `../state/store`), `Decimal` (B3: `./decimal`).
- Produces: `achievements` in gameData; helper stagionali su window (`isChristmasSeason`, `IS_XMAS_TIME`, `isSeasonActive`) installati da `installGameData()` — identici a core.js.

- [ ] **Step 1: Test (fail-first)**

Aggiungi a `src/data/data.test.ts`:
```ts
  it('achievements: ogni voce ha condition eseguibile con lo store popolato', () => {
    import('../state/store').then(() => {});
    expect(Object.keys(gameData.achievements).length).toBeGreaterThan(20);
    for (const [id, a] of Object.entries<any>(gameData.achievements)) {
      expect(typeof a.condition, `condition mancante: ${id}`).toBe('function');
    }
  });
```
E un test funzionale nel file:
```ts
import { store } from '../state/store';

describe('achievements condition via store (reorg filone B)', () => {
  it('le condition leggono lo stato dallo store (non da globali bare)', () => {
    store.gameState = {
      totalClicks: 5, totalScore: { gte: () => false }, totalPlayTime: 0,
      teams: {}, prestigePoints: { gte: () => false },
    } as any;
    const first = Object.values<any>(gameData.achievements).find((a) => {
      try { a.condition(); return true; } catch { return false; }
    });
    expect(first, 'nessuna condition eseguibile con store minimale').toBeTruthy();
    store.gameState = undefined; // ripristino
  });
});
```
Run: `npx vitest run src/data/ 2>&1 | tail -3` → FAIL (gameData.achievements undefined).

- [ ] **Step 2: Converti achievements**

```bash
cd "C:/laragon/www/Espo_Clicker" && git mv js/data/achievements.js src/data/achievements.ts
```
Header (riga 1 `window.gameData.achievements = {` →):
```ts
import { Decimal } from './decimal';
import { store } from '../state/store';

// Le condition leggevano i globali bare del bundle (gameState, bps): in ESM
// non risolvono su window → helper sullo store (filone A), stessa semantica.
const gs = (): any => store.gameState;
const bpsNow = (): any => store.bps;

export const achievements: Record<string, any> = {
```
Poi le TRE sostituzioni meccaniche nel corpo (SOLO queste):
1. `gameState.` → `gs().` (tutte le occorrenze — sono dentro le condition);
2. `bps.` → `bpsNow().` (4 occorrenze, righe ~236/310 e simili);
3. `IS_XMAS_TIME` → `(window as any).IS_XMAS_TIME` (1 occorrenza, riga ~170).
Il riferimento esistente `window.gameData` (1 occorrenza) resta com'è. NIENT'ALTRO cambia.

- [ ] **Step 3: Helper stagionali in index.ts + rimozione core.js**

In `src/data/index.ts`, dentro `installGameData()` PRIMA delle assegnazioni esistenti, aggiungi (contenuto identico a js/data/core.js):
```ts
  // Helper stagionali (ex js/data/core.js) — API window identica per il legacy.
  (window as any).isChristmasSeason = function () {
    const now = new Date();
    const month = now.getMonth();
    const day = now.getDate();
    if (month === 11) return true;
    if (month === 0 && day <= 8) return true;
    return false;
  };
  (window as any).IS_XMAS_TIME = (window as any).isChristmasSeason();
  (window as any).isSeasonActive = function (seasonId: string) {
    if (!seasonId) return true;
    if (seasonId === 'christmas') return (window as any).IS_XMAS_TIME;
    return false;
  };
```
Aggiungi `achievements` al literal `gameData` (import da `./achievements`). Poi:
```bash
git rm js/data/core.js
```
In `scripts/vite-plugin-legacy.ts` elimina `'js/data/core.js',` e `'js/data/achievements.js',`. La sezione dati di JS_FILES ora contiene SOLO `'js/data/gamestate.js',`.

- [ ] **Step 4: Gate completo** (comando B1 Step 6)

Expected: vitest `208 passed`; E2E 10 passed — `checkAchievements()` gira 1×/sec nel loop reale: una condition rotta fa esplodere il boot → gli E2E lo coprono tutti.

- [ ] **Step 5: Commit**

```bash
git add src/data/ scripts/vite-plugin-legacy.ts js/data/core.js && git status --short && git commit -m "v3.0: reorg B4 — achievements su store (gs/bpsNow) + helper stagionali nel modulo; core.js assorbito"
```

---

### Task B5: `store.gameData` + docs + gate finale

**Files:**
- Modify: `src/state/store.ts`, `src/state/store.test.ts`, `src/state/interop.test.ts`, `src/data/index.ts`, `docs/superpowers/specs/2026-07-11-project-structure-reorg-design.md`, `src/README.md`

**Interfaces:**
- Consumes: tutto B1-B4.
- Produces: `store.gameData` (12ª chiave — l'interop la espone automaticamente come accessor `window.gameData`, che sostituisce l'assegnazione plain; il legacy non nota differenze).

- [ ] **Step 1: Store a 12 chiavi (test first)**

In `src/state/store.test.ts`: aggiungi `'gameData'` alla lista attesa del test "espone esattamente le 11 chiavi" e rinomina in "…12 chiavi (11 runtime + gameData, filone B)". Run `npx vitest run src/state/ | tail -3` → FAIL. Poi in `src/state/store.ts`: aggiungi al literal `store` la property `gameData: undefined as Record<string, any> | undefined,` (dopo `gameState`) e al tipo `SharedStore` il campo `gameData: Record<string, any> | undefined;`. In `src/data/index.ts` → `installGameData()`: PRIMA di `(window as any).gameData = gameData;` aggiungi `store.gameData = gameData;` con `import { store } from '../state/store';` (l'assegnazione window resta: con l'accessor già installato passa dal setter → idempotente e ordine-indipendente). Run test → verdi.

- [ ] **Step 2: Docs**

- Spec `## 4. Roadmap a filoni`, bullet `- **B — Dati**: …` → appendi ` **FATTO 2026-07-12** (15 file → src/data/, corpi byte-intatti via git mv, condition su store, gate verde).`
- `src/README.md`: nell'albero `## Struttura`, dopo il blocco `state/`, aggiungi:
```
  data/
    index.ts                       # assembla gameData + installGameData() su window (pre-bundle)
    en/                            # overlay lingua EN
```
e nella lista `## Cosa NON è ancora migrato`, se presente una voce sui dati legacy, aggiornala; altrimenti nessun altro edit.

- [ ] **Step 3: Gate finale completo**

Run (comando B1 Step 6). Expected: build OK, typecheck 0, vitest tutti verdi (≥208), E2E **10 passed**.

- [ ] **Step 4: Commit**

```bash
git add src/state/ src/data/index.ts docs/superpowers/specs/2026-07-11-project-structure-reorg-design.md src/README.md && git status --short && git commit -m "v3.0: reorg B5 — store.gameData (12a chiave) + docs; chiude filone B"
```

---

## Self-review (fatto in scrittura)

- **Copertura spec:** mapping `js/data/*`→`src/data/*.ts` ✓ (B1/B3/B4), `js/data-en/*`→`src/data/en/*.ts` ✓ (B2), `asset-packages` ✓ (B1), "lo store espone gameData" ✓ (B5). `gamestate.js` (getInitialGameState) resta deliberatamente al filone C — il commento del file già lo consente ("→ filone B" diventa C: nota nello spec al B5 se si vuole, non bloccante.
- **No placeholder:** ogni conversione ha anchor esatti o comando grep per trovarli; le 3 sostituzioni di B4 sono enumerate con conteggi attesi.
- **Coerenza nomi:** `installGameData`/`gameData`/`ASSET_PACKAGES`/`Decimal` (risolto)/`gs()`/`bpsNow()` coerenti tra fette; conteggi vitest progressivi 203→205→206→208.
- **Rischio residuo dichiarato:** i corpi restano JS-in-TS (`Record<string, any>`) — tipizzazione fine rimandata (YAGNI, leggibilità prima); tsc con `any` non romperà sui literal.
