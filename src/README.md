# Espo_Clicker v3.0 — moduli ESM

Codice nuovo TypeScript per la migrazione strangler dal monolite `js/script.js`.

## Stato fase 3.0-alpha+beta (step 1→10 completati)

- Branch: `develop-exp` (prove). Niente merge/commit automatici.
- Build legacy esbuild (`dist/`) **resta in funzione** — non rotta.
- Build V3 Vite (`dist-v3/game.modules.js`) si carica in parallelo via `index.php` (solo se file esiste).

## Comandi

```bash
npm run build          # legacy + v3 (sequenziale)
npm run build:legacy   # solo esbuild concat (vecchio comportamento)
npm run build:v3       # solo Vite ESM
npm run dev:v3         # Vite dev server (HMR su src/)
npm test               # Vitest run-once  (62 tests)
npm run test:watch     # Vitest watch
npm run typecheck      # tsc --noEmit
npm run budget         # Bundle size budget check
npm run lighthouse     # Lighthouse CI (richiede @lhci/cli globale)
```

## Struttura

```
src/
  main.ts                          # entry: espone window.EspoV3
  types/
    save.ts                        # SaveStateV1, V2, AnySaveState
  core/
    crypto.ts                      # sha256, hmacSha256, randomHex (Web Crypto)
    bignum.ts                      # break_eternity.js wrapper, installGlobalDecimal
    save/
      db.ts                        # SaveDB (IndexedDB tipato)
      codec.ts                     # LZString compress/decompress JSON
      anti-rollback.ts             # decideRollback Format > Prestige > Score
    migrations/
      index.ts                     # framework idempotente
      v1-to-v2.ts                  # prima migrazione concreta
    loop/
      clock.ts                     # Clock + FakeClock (test injection)
      scheduler.ts                 # Scheduler unificato (registerTick/schedule/every)
      index.ts
  workers/
    offline.worker.ts              # computeOffline pure + worker entry
    save.worker.ts                 # encode/decode LZString fuori main thread
    client.ts                      # promise wrapper main → worker
  ui/
    theme/
      tokens.css                   # design tokens (colori, spacing, motion)
      reset.css                    # modern reset opt-in [data-v3]
      primitives.css               # v3-card, v3-btn, v3-glass, v3-bento
      themes/
        8bit.css                   # token override
        super.css                  # token override
        christmas.css              # token override
      index.css
    animations/
      index.ts                     # Motion One wrapper (clickBounce, fadeInUp, ticker)
    particles/
      pixi-particles.ts            # PixiJS WebGL emitters (lazy chunk 71KB gzip)
scripts/
  bundle-budget.js                 # CI fail se bundle > limiti
.lighthouserc.json                 # Lighthouse CI assertions (a11y >= 0.9)
.github/workflows/quality.yml      # typecheck + test + build + budget on PR
```

## Test coverage

| File                            | Tests |
|---------------------------------|------:|
| crypto.test.ts                  | 11    |
| codec.test.ts                   | 5     |
| migrations.test.ts              | 11    |
| anti-rollback.test.ts           | 17    |
| scheduler.test.ts               | 12    |
| offline.test.ts                 | 6     |
| **Totale**                      | **62**|

## API esposta su `window.EspoV3`

```ts
EspoV3 = {
  version: '3.0.0-alpha',
  schema: { current, detect },
  crypto: { sha256, hmacSha256, randomHex },
  bignum: { Decimal, gt, gte, eq },
  save: {
    SaveDB, db,
    encode, decode,
    antiRollback: { decide, decideFromSaves, compare },
  },
  migrations: { migrate },
  loop: { Scheduler },
  workers: { computeOffline, encodeSave, decodeSave, terminate },
  fx: {
    animations: () => import('./ui/animations'),     // lazy
    particles:  () => import('./ui/particles/...'),  // lazy 71KB gzip
  },
}
```

## Bundle sizes attuali

| File                              | Raw     | Gzip    | Budget  |
|-----------------------------------|--------:|--------:|--------:|
| dist/game.bundle.min.js (legacy)  | 216KB   | 57.5KB  | 230/75  |
| dist/styles.bundle.min.css        | 104KB   | 20.9KB  | 110/25  |
| dist/styles.mobile.min.css        | 21.5KB  | 4.9KB   | 25/6    |
| dist-v3/game.modules.js           | 70.8KB  | 19.3KB  | 90/25   |
| dist-v3/chunks/pixi-particles     | 229.7KB | 71.4KB  | lazy    |

## Strategia strangler

1. Codice TS nuovo si registra su `window.EspoV3.*`.
2. Codice JS legacy può chiamare `window.EspoV3.crypto.sha256()` invece delle funzioni inline.
3. Quando un modulo è completamente migrato (no più chiamate dal legacy) → cancellare il vecchio.
4. A fine migrazione: cancella `dist/`, droppa `build.js`, `dist-v3/` diventa entry unico.

## A11y migliorato

- Rimosso `maximum-scale=1.0, user-scalable=no` (WCAG 1.4.4).
- Aggiunto `<meta name="color-scheme" content="dark light">`.
- Skip link `.v3-skip-link` aggiunto.
- ARIA labels/roles su navbar, mobile-nav, score-display, clicker-btn, toast-container.
- `prefers-reduced-motion` rispettato in tokens.css + animations/index.ts.
- `prefers-color-scheme` light auto in tokens.css.
- `:focus-visible` ring su tutto `[data-v3]`.

## Cosa NON è ancora migrato (next phase)

- Game loop runtime (60+ timer in `script.js`/`game-logic.js`/`ui-functions.js`) — Scheduler V3 è pronto, da sostituire al posto dei timer legacy.
- gameState completo: ancora gestito dal monolite. Va estratto progressivamente in moduli `game/click.ts`, `game/upgrades.ts`, ecc.
- Save/load runtime: il client legacy fa ancora le chiamate. La logica pura (crypto, codec, anti-rollback, migrations) è pronta da agganciare.
- CSS legacy non ancora rimossi: `mobile.css` 1545 righe, themes 469+475+140 righe. I nuovi tokens vivono accanto, opt-in via `[data-v3]`.
- Cloud sync HMAC server-side (`php/save_progress.php`) compatibile con `EspoV3.crypto.hmacSha256`.

## Rischi noti

- `src/types/save.ts` è approssimativo (campi loose). Da raffinare estraendo `gameState`.
- `bignum.installGlobalDecimal()` non sovrascrive se `window.Decimal` esiste già: convivenza con CDN break_infinity finché il legacy non droppa lo `<script>` CDN.
- `pixi-particles` chunk è grande (71KB gzip) — accettabile perché lazy. Se le particelle bastano CSS, valutare drop di Pixi a favore di canvas 2D semplice.

## Run-book test manuale (dopo questa fase)

1. `npm run build` — verifica entrambi i bundle costruiti.
2. Apri `index.php` nel browser locale (MAMP).
3. DevTools console: `window.EspoV3` → vedi tutto il pannello.
4. Test migrazione: `EspoV3.migrations.migrate({ totalScore: '99999' })`.
5. Test scheduler: `s = new EspoV3.loop.Scheduler(); s.registerTick(()=>console.log('tick'), 1); s.start();`.
6. Test crypto: `await EspoV3.crypto.sha256('hello')` → hash valido.
7. Test workers: `await EspoV3.workers.computeOffline({bps:10, awayMs:60000})` → result.
8. Verifica zoom mobile abilitato (pinch funziona).
9. Verifica `Tab` keyboard → focus ring visibile.
10. Lighthouse score in DevTools → a11y >= 90.
