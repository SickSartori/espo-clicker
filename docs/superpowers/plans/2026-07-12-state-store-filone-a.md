# Filone A — Store stato condiviso (`src/state/`) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Le 11 variabili di stato runtime condivise (oggi `var` top-level in `js/data/gamestate.js`) vivono in `src/state/store.ts`; il legacy continua a usarle come globali tramite accessor `window.*` installati da `src/state/interop.ts` — zero cambiamento di comportamento.

**Architecture:** Store-modulo mutabile + shim di interop (design: `docs/superpowers/specs/2026-07-11-project-structure-reorg-design.md` sez. 5). L'interop gira nel modulo V3, che per contratto F0 esegue PRIMA del bundle legacy → quando il legacy esegue, ogni lettura/scrittura bare (`bps`, `gameState = x`, `typeof gameState`) passa dagli accessor e colpisce lo store. Lo shim è TEMPORANEO: si rimuove a fine filone C.

**Tech Stack:** TypeScript/Vite (moduli V3), vitest (jsdom, `src/**/*.test.ts`), Playwright E2E sul gioco reale, bundle legacy concatenato (plugin `scripts/vite-plugin-legacy.ts` — NON si tocca: `gamestate.js` resta in JS_FILES, solo più piccolo).

## Global Constraints

- **Commit: SOLO titolo** (una riga, niente corpo né Co-Authored-By). Prefisso `v3.0: reorg A… — …`.
- **Zero cambiamento di comportamento**: nessuna logica riscritta; cambia solo DOVE vive lo stato. Gate per task: typecheck 0 errori + vitest verdi + (da A2) build + E2E Playwright verdi.
- **E2E locale:** `PHP_BIN="C:/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe" npx playwright test` (build PRIMA; nessun altro server su 127.0.0.1:8899). Dopo A2 i test E2E sono **10** (9 esistenti + 1 nuovo interop).
- **Le 11 chiavi condivise** (uniche `var` top-level di gamestate.js, verificate 2026-07-12; dichiarate SOLO lì in tutto js/): `gameState, bps, prestigeBonus, clickCPSBonus, isBluescreenActive, bluescreenMultiplier, crunchTimeMultiplier, crunchTimeEndTime, crunchTimeCooldownEnd, clickHistory, achievementsBPSBonus`.
- **FUORI scope:** le `window.*` esplicite di gamestate.js righe 14-21 (`goldenBugChance`, `gameFlags`, `costScalingBase`, …) — sono già proprietà di window, nessuna ambiguità; `getInitialGameState`/`resetGameToDefault` restano in gamestate.js (accoppiate a `gameData` → filone B/C); `window.gameData` resta com'è (filone B).
- **Decimal:** a runtime lo store usa `window.Decimal` (break_infinity, caricato come PRIMO script — contratto F0/F7) → istanze bit-identiche al legacy; nei test (jsdom, senza `window.Decimal`) fallback `Decimal` di `src/core/bignum.ts` (break_eternity), stesso pattern di bignum.
- **PRECONDIZIONE (inizio A1):** `git status --short` VUOTO. Se sporco → STOP, chiedere all'utente (lavora in parallelo sul repo).

### Fatti di meccanismo verificati (il "perché funziona", per l'implementer)

- Ordine di esecuzione: `dist/break_infinity.min.js` (defer) → `dist-v3/game.modules.js` (module, installa gli accessor) → `dist/game.bundle.min.js` (defer, legacy). Defer e module condividono la coda in ordine di documento.
- Rimosse le `var` dal bundle, gli identificatori bare del legacy risolvono sulle proprietà di window → accessor → store. `gameState = newState` (assegnazione senza dichiarazione, game-logic.js) passa dal setter. `typeof gameState === 'undefined'` (esposion/intro/ui-functions/game-logic/cheatboard) non lancia mai e vale `true` finché `store.gameState` è `undefined` — identico alla semantica `var` hoistata.
- Nessun `delete window.<chiave>` nel codebase. `cheatboard.js` (non bundlato, carica dopo) usa le stesse globali → accessor già presenti. `arcade.php` NON carica il modulo V3 → l'`window.bps` di arcade-page.js resta una plain property su quella pagina, non interferisce.
- Costo getter nel loop 30hz: trascurabile rispetto alla matematica Decimal del tick; temporaneo fino a fine filone C.

---

### Task A1: `src/state/store.ts` + `src/state/interop.ts` (moduli puri + unit test)

**Files:**
- Create: `src/state/store.ts`, `src/state/store.test.ts`, `src/state/interop.ts`, `src/state/interop.test.ts`

**Interfaces:**
- Consumes: `Decimal` (fallback test) da `src/core/bignum.ts` (`export { Decimal }`).
- Produces (per A2): `store: SharedStore` (oggetto mutabile singleton), `STORE_KEYS: Array<keyof SharedStore>` (le 11 chiavi), `installInterop(target?: any): void`. Import path per A2: `./state/store` e `./state/interop` da `src/main.ts`.

- [ ] **Step 1: Precondizione albero pulito**

Run: `cd "C:/laragon/www/Espo_Clicker" && git status --short`
Expected: VUOTO. Altrimenti STOP e segnalare BLOCKED (l'utente ha lavoro non committato).

- [ ] **Step 2: Scrivi i test (falliranno: moduli inesistenti)**

`src/state/store.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { store, STORE_KEYS } from './store';

describe('state/store (reorg filone A)', () => {
  it('espone esattamente le 11 chiavi condivise storiche di gamestate.js', () => {
    expect([...STORE_KEYS].sort()).toEqual(
      [
        'achievementsBPSBonus', 'bluescreenMultiplier', 'bps', 'clickCPSBonus',
        'clickHistory', 'crunchTimeCooldownEnd', 'crunchTimeEndTime',
        'crunchTimeMultiplier', 'gameState', 'isBluescreenActive', 'prestigeBonus',
      ].sort(),
    );
  });

  it('valori iniziali con la semantica legacy di gamestate.js', () => {
    expect(store.gameState).toBeUndefined();
    expect(String(store.bps)).toBe('0');
    expect(String(store.prestigeBonus)).toBe('1');
    expect(String(store.clickCPSBonus)).toBe('1');
    expect(store.isBluescreenActive).toBe(false);
    expect(String(store.bluescreenMultiplier)).toBe('1');
    expect(String(store.crunchTimeMultiplier)).toBe('1');
    expect(store.crunchTimeEndTime).toBe(0);
    expect(store.crunchTimeCooldownEnd).toBe(0);
    expect(store.clickHistory).toEqual([]);
    expect(String(store.achievementsBPSBonus)).toBe('0');
  });

  it('riassegnazione di campo (pattern legacy `gameState = newState`)', () => {
    const s = { score: 1 } as any;
    store.gameState = s;
    expect(store.gameState).toBe(s);
    store.gameState = undefined; // ripristino
  });
});
```

`src/state/interop.test.ts`:
```ts
import { describe, it, expect, beforeAll } from 'vitest';
import { store, STORE_KEYS } from './store';
import { installInterop } from './interop';

describe('state/interop (reorg filone A)', () => {
  beforeAll(() => { installInterop(window); });

  it('installa un accessor per OGNI chiave dello store', () => {
    for (const k of STORE_KEYS) {
      const d = Object.getOwnPropertyDescriptor(window, k as string);
      expect(typeof d?.get, String(k)).toBe('function');
      expect(typeof d?.set, String(k)).toBe('function');
    }
  });

  it('window.X legge dallo store', () => {
    store.crunchTimeEndTime = 12345;
    expect((window as any).crunchTimeEndTime).toBe(12345);
    store.crunchTimeEndTime = 0; // ripristino
  });

  it('window.X = v scrive nello store (stile legacy `bps = ...`)', () => {
    const prev = store.bps;
    (window as any).bps = 'sentinella';
    expect(store.bps).toBe('sentinella');
    store.bps = prev; // ripristino
  });

  it('typeof window.gameState riflette undefined senza lanciare (semantica var)', () => {
    store.gameState = undefined;
    expect(typeof (window as any).gameState).toBe('undefined');
  });
});
```

- [ ] **Step 3: Verifica che falliscano**

Run: `cd "C:/laragon/www/Espo_Clicker" && npx vitest run src/state/ 2>&1 | tail -5`
Expected: FAIL — "Cannot find module './store'" (o equivalente resolve error).

- [ ] **Step 4: Implementa i moduli**

`src/state/store.ts`:
```ts
/**
 * Store dello stato mutabile condiviso (reorg filone A, 2026-07-12).
 * Unica fonte delle 11 variabili runtime che erano `var` top-level in
 * js/data/gamestate.js. Il legacy vi accede tramite gli accessor window.*
 * installati da interop.ts (TEMPORANEI fino a fine filone C); i moduli V3
 * importano `store` direttamente.
 *
 * Decimal: a runtime window.Decimal (break_infinity, primo script della
 * pagina — contratto F0/F7) → istanze bit-identiche al legacy; nei test
 * (jsdom, senza window.Decimal) fallback break_eternity via core/bignum.
 */
import { Decimal as EternityDecimal } from '../core/bignum';

const D: any =
  typeof window !== 'undefined' && (window as any).Decimal
    ? (window as any).Decimal
    : EternityDecimal;

export interface SharedStore {
  gameState: Record<string, any> | undefined;
  bps: any;
  prestigeBonus: any;
  clickCPSBonus: any;
  isBluescreenActive: boolean;
  bluescreenMultiplier: any;
  crunchTimeMultiplier: any;
  crunchTimeEndTime: number;
  crunchTimeCooldownEnd: number;
  clickHistory: Array<{ time: number; value: any }>;
  achievementsBPSBonus: any;
}

export const store: SharedStore = {
  gameState: undefined,
  bps: new D(0),
  prestigeBonus: new D(1),
  clickCPSBonus: new D(1),
  isBluescreenActive: false,
  bluescreenMultiplier: new D(1),
  crunchTimeMultiplier: new D(1),
  crunchTimeEndTime: 0,
  crunchTimeCooldownEnd: 0,
  clickHistory: [],
  achievementsBPSBonus: new D(0),
};

/** Le 11 chiavi condivise (contratto con interop e col legacy). */
export const STORE_KEYS = Object.keys(store) as Array<keyof SharedStore>;
```

`src/state/interop.ts`:
```ts
/**
 * Interop TEMPORANEO (reorg filone A → si rimuove a fine filone C).
 * Espone i campi dello store come accessor su window: il bundle legacy
 * continua a usare `bps`, `gameState = x`, `typeof gameState` come globali
 * bare, ma ogni accesso colpisce lo store. Va installato PRIMA che il
 * bundle legacy esegua (main.ts è caricato prima — contratto F0).
 * defineProperty fallirebbe su una proprietà `var` preesistente (le var
 * globali sono non-configurabili): in quel caso si logga FORTE l'elenco
 * (stile guard di boot F8) invece di rompere in silenzio.
 */
import { store, STORE_KEYS } from './store';

export function installInterop(
  target: any = typeof window !== 'undefined' ? window : undefined,
): void {
  if (!target) return;
  const failed: string[] = [];
  for (const k of STORE_KEYS) {
    try {
      Object.defineProperty(target, k, {
        get: () => (store as any)[k],
        set: (v: unknown) => { (store as any)[k] = v; },
        configurable: true,
      });
    } catch {
      failed.push(k as string);
    }
  }
  if (failed.length) {
    console.error(
      '[EspoV3.state] interop NON installato per: ' + failed.join(', ') +
      ' — proprietà già definite e non-configurabili (una var legacy è stata caricata prima del modulo V3?)',
    );
  }
}
```

- [ ] **Step 5: Verifica verde + typecheck**

Run: `cd "C:/laragon/www/Espo_Clicker" && npx vitest run src/state/ 2>&1 | tail -4 && npm run typecheck`
Expected: 7 test passed (3 store + 4 interop), typecheck exit 0.

- [ ] **Step 6: Suite completa (non deve rompere nulla)**

Run: `cd "C:/laragon/www/Espo_Clicker" && npm test 2>&1 | tail -4`
Expected: `201 passed` (194 esistenti + 7 nuovi).

- [ ] **Step 7: Commit**

```bash
git add src/state/ && git commit -m "v3.0: reorg A1 — store stato condiviso + interop window (moduli puri, 7 test)"
```

---

### Task A2: Cutover — wiring in main.ts, var rimosse da gamestate.js, E2E interop

**Files:**
- Modify: `src/main.ts` (import + `installInterop()` + `EspoV3.state`), `js/data/gamestate.js` (rimozione 11 var), `tests/e2e/integration.spec.ts` (nuovo test)

**Interfaces:**
- Consumes: `store`, `installInterop` dal Task A1 (path: `./state/store`, `./state/interop`).
- Produces: `window.EspoV3.state = { store, installInterop }`; accessor window per le 11 chiavi attivi sul gioco reale. Il legacy NON cambia nomi: usa gli stessi identificatori bare.

- [ ] **Step 1: Aggiungi il test E2E (fail-first: EspoV3.state non esiste ancora)**

In `tests/e2e/integration.spec.ts`, dentro `test.describe('Integrazione gameplay', ...)`, dopo l'ultimo test, aggiungi:

```ts
  test('interop stato (filone A): window.* e EspoV3.state.store sono lo stesso stato', async ({ page }) => {
    await bootGame(page);

    const r = await page.evaluate(() => {
      const w = window as any;
      const store = w.EspoV3.state && w.EspoV3.state.store;
      if (!store) return { hasStore: false };

      // Identità: il legacy ha già scritto gameState/bps al boot → stessa referenza.
      const identity = w.gameState === store.gameState && w.bps === store.bps;

      // Scrittura stile legacy (assegnazione bare) → visibile nello store…
      const prevBps = store.bps;
      w.bps = new w.Decimal('12345');
      const legacyWrite = String(store.bps) === '12345';
      // …e scrittura lato store → visibile dal legacy.
      store.bps = new w.Decimal('67890');
      const storeWrite = String(w.bps) === '67890';
      w.bps = prevBps; // ripristino

      const desc = Object.getOwnPropertyDescriptor(w, 'bps');
      return {
        hasStore: true, identity, legacyWrite, storeWrite,
        accessor: typeof (desc && desc.get) === 'function',
      };
    });

    expect(r.hasStore, 'EspoV3.state.store assente').toBe(true);
    expect(r.identity).toBe(true);
    expect(r.legacyWrite).toBe(true);
    expect(r.storeWrite).toBe(true);
    expect(r.accessor).toBe(true);
  });
```

- [ ] **Step 2: Verifica che fallisca contro la build attuale**

Run: `cd "C:/laragon/www/Espo_Clicker" && npm run build 2>&1 | tail -1 && PHP_BIN="C:/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe" npx playwright test integration -g "interop stato" 2>&1 | tail -4`
Expected: 1 failed — `EspoV3.state.store assente`.

- [ ] **Step 3: Wiring in `src/main.ts`**

Tre modifiche:

(a) dopo l'ultima import esistente (`import { createAssetManager, AssetManager } from './core/assets/manager';`):
```ts
import { store } from './state/store';
import { installInterop } from './state/interop';
```

(b) subito dopo la riga `installGlobalDecimal();`:
```ts
// Reorg filone A: lo stato runtime condiviso vive in src/state/store.ts; gli
// accessor window.* (bps, gameState, ...) servono il bundle legacy, che esegue
// DOPO questo modulo (contratto F0). TEMPORANEO fino a fine filone C.
installInterop();
```

(c) nell'oggetto `EspoV3`, dopo la property `ui: { ... },`:
```ts
  state: { store, installInterop },
```

- [ ] **Step 4: Rimuovi le 11 var da `js/data/gamestate.js`**

Sostituisci le righe 1-11 (commento `--- VARIABILI DI STATO GLOBALI ---` + le 10 `var`) e le righe 23-24 (commento `Variabile contenitore dello stato` + `var gameState;`) così che la testa del file diventi ESATTAMENTE:

```js
// --- STATO GLOBALE CONDIVISO (reorg filone A, 2026-07-12) ---
// Le 11 variabili runtime (gameState, bps, prestigeBonus, clickCPSBonus,
// isBluescreenActive, bluescreenMultiplier, crunchTimeMultiplier,
// crunchTimeEndTime, crunchTimeCooldownEnd, clickHistory,
// achievementsBPSBonus) vivono in src/state/store.ts (EspoV3.state.store),
// esposte come ACCESSOR su window da src/state/interop.ts — installato dal
// modulo V3, che esegue PRIMA di questo bundle. Le assegnazioni bare qui e
// negli altri file (es. `gameState = getInitialGameState()`) passano dal
// setter → store. Qui restano le window.* legacy e la generazione stato
// (getInitialGameState/resetGameToDefault, accoppiate a gameData → filone B).

// Variabili Window Globali
window.goldenBugChance = 0.001;
```

Tutto il resto del file (da `window.goldenBugChance` in giù: window.*, `getInitialGameState`, `gameState = getInitialGameState();`, `resetGameToDefault`) resta INVARIATO.

- [ ] **Step 5: Verifica nessun'altra dichiarazione delle 11 var nel bundle**

Run: `cd "C:/laragon/www/Espo_Clicker" && grep -rnE "^\s*(var|let|const)\s+(gameState|bps|prestigeBonus|clickCPSBonus|isBluescreenActive|bluescreenMultiplier|crunchTimeMultiplier|crunchTimeEndTime|crunchTimeCooldownEnd|clickHistory|achievementsBPSBonus)\b" js/ | grep -v "const gameState = Game.getGameState()"`
Expected: NESSUN risultato (l'unica eccezione nota è la const function-local in modals.js:931, esclusa dal filtro).

- [ ] **Step 6: Build + typecheck + vitest + E2E completi**

Run: `cd "C:/laragon/www/Espo_Clicker" && npm run build 2>&1 | tail -2 && npm run typecheck && npm test 2>&1 | tail -3 && PHP_BIN="C:/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe" npx playwright test 2>&1 | grep -v -E "WebServer|Accepted|Closing|Closed|preconnection" | tail -6`
Expected: build OK; typecheck 0 errori; vitest `201 passed`; E2E **`10 passed`** (9 preesistenti — che provano che il gioco si comporta identico con lo stato nello store — + il nuovo interop). Se il boot si rompe (test rossi a catena) il primo sospetto è l'ordine di init: verificare in console preview l'assenza dell'error `[EspoV3.state] interop NON installato`.

- [ ] **Step 7: Commit**

```bash
git add src/main.ts js/data/gamestate.js tests/e2e/integration.spec.ts && git commit -m "v3.0: reorg A2 — stato runtime nello store (11 var via accessor window), E2E interop"
```

---

### Task A3: Docs + gate finale

**Files:**
- Modify: `docs/superpowers/specs/2026-07-11-project-structure-reorg-design.md` (filone A FATTO), `src/README.md` (struttura + API + stato migrazione)

**Interfaces:**
- Consumes: A1+A2 completati e committati.
- Produces: documentazione allineata; filone A chiuso (memoria e ledger = compito del controller, NON di questo task).

- [ ] **Step 1: Spec — marca il filone A**

In `docs/superpowers/specs/2026-07-11-project-structure-reorg-design.md`, sezione `## 4. Roadmap a filoni`, alla fine del bullet `- **A — Fondamenta stato**: …` appendi: ` **FATTO 2026-07-12** (store 11 chiavi + interop accessor, 7 unit + E2E interop, gate completo verde).`

- [ ] **Step 2: src/README.md — struttura e API**

(a) Nella sezione `## Struttura`, dentro il blocco albero, subito dopo la riga `  types/` aggiungi:
```
  state/
    store.ts                       # store mutabile delle 11 var runtime condivise (ex gamestate.js)
    interop.ts                     # accessor window.* per il legacy (TEMP, via a fine filone C)
```
(b) Nella sezione `## API esposta su window.EspoV3`, nel blocco `EspoV3 = { ... }`, dopo la riga `loop: { Scheduler },` aggiungi:
```ts
  state: { store, installInterop },
```
(c) Nella sezione `## Cosa NON è ancora migrato (next phase)`, sostituisci la riga `- gameState completo: ancora gestito dal monolite. Va estratto progressivamente in moduli \`game/click.ts\`, \`game/upgrades.ts\`, ecc.` con:
```
- gameState: la PROPRIETÀ dello stato è nello store V3 (filone A, 2026-07-12) via accessor window; la LOGICA che lo muta resta nel legacy (filone C).
```

- [ ] **Step 3: Gate finale completo**

Run: `cd "C:/laragon/www/Espo_Clicker" && npm run build 2>&1 | tail -2 && npm run typecheck && npm test 2>&1 | tail -3 && PHP_BIN="C:/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe" npx playwright test 2>&1 | tail -3`
Expected: build OK, typecheck 0, vitest 201, E2E 10 passed.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-07-11-project-structure-reorg-design.md src/README.md && git commit -m "v3.0: reorg A3 — docs filone A (store+interop) e stato migrazione"
```

---

## Self-review (fatto in scrittura)

- **Copertura spec (sez. 5 del design):** store con export mutabile ✓ (A1); interop defineProperty configurable ✓ (A1, con guard loud in più — coerente col guard F8); installazione prima del legacy ✓ (A2 via main.ts, contratto F0); le 4 chiavi mancanti nello sketch dello spec (clickCPSBonus, isBluescreenActive, crunchTimeEndTime, crunchTimeCooldownEnd) sono state aggiunte — lo spec dice "i campi di gamestate.js", 11 verificati ✓.
- **No placeholder:** ogni step ha codice completo o comando+expected. L'unico riferimento incrociato (import path A2←A1) è dichiarato in entrambe le Interfaces.
- **Coerenza tipi/nomi:** `store`/`STORE_KEYS`/`SharedStore`/`installInterop` identici in A1 (definizione), A2 (wiring `EspoV3.state = { store, installInterop }`) e test; conteggi coerenti (7 unit → 201 vitest; 10 E2E).
