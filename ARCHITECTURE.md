# ARCHITECTURE — Espòòò Clicker

Mappa del progetto per chi arriva. Il `README.md` racconta il *gioco*; questo file racconta il *codice*: com'è fatto, perché, dove sta cosa, e dove mettere le mani per fare X.

> Stato: migrazione a moduli COMPLETA per `index.php` (vedi §7). Il "gioco principale" è un **unico bundle ESM** (`EspoV3`, `src/` → `dist/game.modules.js`); l'unica eccezione classic è la pagina standalone `arcade.php` + l'Admin Console dev-only. Capire questa eccezione è il 90% di capire il progetto.

---

## 1. TL;DR — un solo bundle (+ un'eccezione standalone)

Il gioco gira come **un solo bundle**, caricato da `index.php`:

**`dist/game.modules.js`** — il modulo **V3** (TypeScript ESM, sorgenti in `src/`, entry `src/main.ts`). Installa su `window` stato, dati di gioco, config ecc., costruisce `window.EspoV3` e poi avvia direttamente boot (ex `js/script.js`), rendering/HUD (ex `js/ui-functions.js`), logica di gioco (ex `js/game-logic.js`), modali (ex `js/modals.js`) e periferici — intro, esposion, arcade-loader, podio, social (ex `js/*.js`). **Non esiste più nessun bundle legacy classic**: `dist/game.bundle.min.js` è stato eliminato, non c'è più niente da concatenare.

```
index.php  →  <script defer> dist/break_infinity.min.js   (Decimal globale)
           →  <script type=module> dist/game.modules.js (V3: installa tutto + boot)
```

**Eccezione**: `arcade.php` è una pagina **STANDALONE** (aperta via `window.open`, NON carica `dist/game.modules.js`) e ha bisogno di `window.ArcadeLoader` come classic script. Per questo `src/lib/arcade-loader.ts` viene compilato **due volte** dallo stesso sorgente: come modulo ESM dentro `dist/game.modules.js` (via import in `main.ts`, per `index.php`) e come IIFE standalone `dist/arcade-loader.min.js` (via esbuild in `scripts/vite-plugin-legacy.ts`, per `arcade.php`). Restano classic script (non ESM) SOLO:
- **`js/cheatboard.js`** — Admin Console dev-only, iniettata a runtime (mai nel bundle, mai in prod).
- **`js/arcade-page.js`** — orchestrazione di `arcade.php`; consuma `dist/arcade-loader.min.js` (vedi sopra) e i giochi arcade caricati da `ArcadeLoader.load()`.

---

## 2. Mappa delle cartelle

```
src/                 # TypeScript / ESM (il "nuovo"), buildato da Vite
  main.ts            #   entry: installa tutto + costruisce window.EspoV3
  state/             #   store.ts (stato mutabile del gioco) + cheatboard-bridge.ts (accessor dev-only)
                     #   + save-db.ts (bridge window.SaveDB)
  data/              #   TUTTI i dati di gioco (teams, upgrades, skins, achievements, texts, events…)
    index.ts         #     assembla window.gameData + installGameData()
    en/              #     overlay lingua EN
    season.ts        #     stagionalità (Natale) pura, order-independent
    decimal.ts       #     ctor Decimal risolto (window.Decimal a runtime, break_eternity nei test)
  game/              #   formule di dominio PURE: economy.ts prestige.ts events.ts (Decimal iniettato,
                     #     con test). Chiamate via `EspoV3.economy/prestige/events` da `src/game/logic.ts`.
  ui/                #   logica UI pura + effetti: format/ rules/ toast/ theme/(css-loader lazy)
                     #     animations/ particles/ icons/ interactions/
  lib/               #   infrastruttura: version.ts (GAME_VERSION+CDN R2+debug), backend-config.ts
                     #     (Supabase+detectEnv), i18n.ts (bridge), asset-manager.ts (bridge),
                     #     arcade-loader.ts (ArcadeLoader — compilato ANCHE come IIFE per arcade.php, §5)
  core/              #   logica pura riusabile: crypto, bignum, save/ (db+codec+anti-rollback),
                     #     migrations/, loop/ (Scheduler), i18n/ (overlay), assets/ (manager)
  workers/           #   offline.worker, save.worker + client
  app/               #   error-handler.ts (+ previsto: boot, ex script.js)
  types/

  NB: src/game e src/ui contengono sia la logica PURA (formule, format, regole) sia
  l'ORCHESTRAZIONE (acquisti, click, rendering DOM, boot) — tutto migrato a moduli ESM
  (vedi §7). I monoliti js/ originali (gamestate, ui-functions, game-logic, modals, script,
  podio/social/intro/esposion/arcade-loader) sono stati eliminati: nessuno vive più in js/.

js/                  # JavaScript "classic script" residuo — SOLO 2 file, entrambi fuori da index.php
  arcade-page.js     #   orchestrazione della pagina standalone arcade.php; consuma
                     #     dist/arcade-loader.min.js (build IIFE di src/lib/arcade-loader.ts, vedi §5)
  cheatboard.js      #   Admin Console dev-only (NON nel bundle: iniettata a runtime, solo in dev)

styles/              # TUTTO il CSS (unificato — vedi §5)
  main.css mobile.css  base/  themes/(lazy)  arcade/   ui/(design system moderno)
assets/              # image/ sounds/ video/ fonts/  (sounds+video mappati sul bucket R2 in prod)
tests/e2e/           # Playwright: prova il gioco REALE (smoke + integration + cheatboard)
docs/superpowers/    # spec e piani della riorganizzazione (brainstorming→plan→exec)
php/                 # backend legacy residuo (firma URL R2, config); il grosso è su Supabase Edge Functions
```

Convenzione cartelle (obiettivo del reorg): **layer in cima, feature nel nome-file** (`game/economy.ts`, `ui/toast.ts`, `state/store.ts`). Niente cartelle versionate: il design system moderno sta in `styles/ui/` (non `v3/`), così regge future versioni.

---

## 3. Sequenza di boot (dettaglio)

`src/main.ts`, in ordine:
1. `installGlobalDecimal()` — `window.Decimal` = break_infinity (già caricato come primo script; qui è idempotente).
2. `installGameData()` — `store.gameData` + `window.gameData` + `window.ASSET_PACKAGES` + helper stagionali (vedi §4).
3. `installVersion()` — `window.GAME_VERSION`, `window.CDN`, silenziatore console (`DEBUG_MODE`).
4. `installErrorHandler()` — toast sugli errori uncaught.
5. `installBackend()` — `window.EspoBackend` (Supabase) + in dev inietta la cheatboard (che installa anche `cheatboard-bridge.ts`, vedi §4).
6. `installSaveDb()` / `installI18n()` / `installAssetManager()` — bridge `window.SaveDB` / `applyLanguage` / `AssetManager`.
7. Costruisce l'oggetto **`EspoV3`** e lo assegna a `window.EspoV3`.

Non c'è più un bundle separato da attendere: **lo stesso modulo** `main.ts` chiama poi, in ordine, `initModals()` (ex `js/modals.js`), `initGameState()` (ex `js/data/gamestate.js` — stato iniziale, DOPO gameData/EspoV3), `initBoot()` (ex `js/script.js` — costruisce `window.EspooClicker`, il god-object con `saveGame`, `showToast`, `getGameState`, `playSound`…, e avvia lo **Scheduler V3** `new EspoV3.loop.Scheduler` che guida logica 30hz / UI 10hz / autosave 30s), infine `initPodio()` / `initSocial()` (ex `js/podio.js`, `js/social.js`).

`window.EspoV3` (superficie pubblica): `version, schema, crypto, bignum, save, migrations, loop, i18n, format, theme, economy, prestige, events, rules, toast, assets, workers, fx, ui, state`.

---

## 4. Modello di stato

Lo stato **mutabile e condiviso** del gioco vive in **`src/state/store.ts`** (`EspoV3.state.store`): `gameState` (l'oggetto salvato), `bps`, `prestigeBonus`, i moltiplicatori runtime, `clickHistory`, `gameData`. 12 chiavi in tutto.

Tutti i moduli V3 fanno `import { store } from '.../state/store'` e leggono/scrivono `store.X` direttamente — nessun accessor su `window`. **`src/state/interop.ts`** (il ponte temporaneo `window.*` ↔ `store.*` per i moduli ex-monolite non ancora refattorizzati) è stato **rimosso** (Blocco #3 kill-legacy, Fase C): era l'ultimo passo della migrazione dello stato, dopo che ogni modulo ha smesso di riferire i globali bare al proprio interno.

- L'unica eccezione residua è **dev-only**: `js/cheatboard.js` (classic, iniettato solo in dev) legge/scrive ancora `gameState`, `bps`, `crunchTimeMultiplier`, `crunchTimeEndTime`, `crunchTimeCooldownEnd` come globali "nudi". `src/state/cheatboard-bridge.ts` installa un accessor `get/set` minimo per queste sole 5 chiavi — non per la produzione, rimovibile solo migrando la cheatboard a ESM (fuori scope Blocco #3).

I **dati** (non mutabili: definizioni di team/upgrade/skin/testi) vivono in `src/data/` ed esposti come `window.gameData`. I `Decimal` nei dati sono `window.Decimal` a runtime (bit-identici al legacy), break_eternity nei test.

---

## 5. Build, bundle, deploy

- **Un solo build tool: Vite.** `npm run build` produce `dist/game.modules.js` (bundle ESM V3, unico) e — via il plugin `scripts/vite-plugin-legacy.ts` (hook `closeBundle`) — i soli residui non-ESM: i CSS legacy in `dist/styles.*`, i vendor (`break_eternity`/`break_infinity`) e `dist/arcade-loader.min.js` (build IIFE, via esbuild, di `src/lib/arcade-loader.ts` — serve alla pagina standalone `arcade.php`, che non carica `dist/game.modules.js`). Un solo output `dist/`, non c'è più nessun `js/*` da concatenare.
- **CSS**: sorgenti tutti in `styles/`. `styles/main.css`→`dist/styles.bundle.min.css`, `styles/mobile.css`→`dist/styles.mobile.min.css`, `styles/ui/index.css`→`dist/assets/styles.css` (via Vite da `main.ts`). I temi (`styles/themes/`) sono caricati **lazy a runtime** dal loader (cache-buster `window.CACHE_VER`).
- **Cache busting**: i bundle `dist/*` in `index.php` hanno `?v=filemtime` (auto in dev E prod). Temi lazy e arcade CSS usano invece `?v=CACHE_VER` → per rinfrescarli in prod serve `npm run cache:bump`. Vedi memoria `preview-css-cache-gotcha`.
- **Service worker** (`sw.js`): auto-update su `CACHE_VERSION`; cache-first sui `.css`, mai-cache su cheatboard/arcade.
- **Ambiente**: `detectEnv()` (in `src/lib/backend-config.ts`) sceglie dev/prod dall'URL: `localhost`/`127.0.0.1`/`*.local`/`*.test`/path `/test/` → **dev**; resto → **production**. UN solo build funziona ovunque. In dev si carica la cheatboard; in prod no.
- **CDN R2**: audio/video pesanti stanno su Cloudflare R2 (bucket privato). `window.CDN` (in `src/lib/version.ts`) risolve i path `assets/sounds/`, `assets/video/`, `music/songs/` in URL firmate 1h generate da `php/r2-sign.php`. **⚠️ Questi prefissi sono chiavi del bucket**: NON rinominare quelle cartelle senza migrare anche R2 + la whitelist PHP.
- **Deploy**: `deploy.bat` (opz.7 = test, opz.8 = prod) → push su branch → GitHub Actions FTP. Il deploy V3 parte dal branch **`develop-v3`**. **Guardrail prod**: non deployare in root Altervista finché i dati prod non sono migrati su Supabase.

---

## 6. Test

- **Unit (Vitest, `src/**/*.test.ts`)**: solo la logica pura dei moduli V3 (formule economia/prestigio/eventi, save codec, anti-rollback, migrazioni, scheduler, store, dati). `npm test`.
- **E2E (Playwright, `tests/e2e/`)**: fa girare il **gioco reale** (`index.php` servito da PHP built-in) in Chromium headless. `smoke` (acquisto team, promozione, golden bug, daily), `integration` (round-trip salvataggio, click reale, store come fonte diretta dello stato, percorsi UI col solo ramo V3), `cheatboard`. È **la rete di sicurezza** della migrazione: verde = zero regressioni di comportamento. Lancio locale: `PHP_BIN="C:/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe" npx playwright test` (fai `npm run build` prima).
- **Criterio d'accettazione per ogni cambiamento**: `build` + `typecheck` + `vitest` + E2E tutti verdi.

---

## 7. Stato della migrazione (cosa è nuovo, cosa è vecchio)

La migrazione "strangler" (F0–F8) ha spostato la **logica pura** in `src/`; poi la riorganizzazione (filoni D/A/B/C) ha spostato **stato, dati e infrastruttura**; infine "kill-legacy" (per-monolite + periferici) ha convertito **tutti** i monoliti classic residui in moduli ESM:

| Area | Dove vive oggi |
|---|---|
| CSS | ✅ tutto in `styles/` |
| Stato condiviso | ✅ `src/state/store.ts` (interop rimosso — vedi §4) |
| Dati di gioco | ✅ `src/data/` |
| Infrastruttura (version, backend, error, save-db, i18n, asset-mgr) | ✅ `src/lib` / `src/state` / `src/app` |
| Formule economia/prestigio/eventi, format, rules, save, migrations, scheduler | ✅ `src/` (esposte via `EspoV3.*`) |
| Logica di dominio (acquisti, click, eventi runtime) | ✅ `src/game/logic.ts` (ex `js/game-logic.js`) |
| Rendering/UI | ✅ `src/ui/render/`, `src/ui/modals/` (ex `js/ui-functions.js`, `js/modals.js`) |
| Boot/orchestrazione | ✅ `src/app/boot.ts` (ex `js/script.js`, god-object `EspooClicker`) |
| Periferici (intro, esposion, arcade-loader, podio, social) | ✅ `src/ui/intro.ts`, `src/ui/fx/esposion.ts`, `src/lib/arcade-loader.ts`, `src/ui/podio/`, `src/ui/social/` |

**Nessun monolite resta**: tutti i vecchi `js/*.js` (game-logic, ui-functions, modals, script, gamestate, podio, social, intro, esposion, arcade-loader) sono stati eliminati e sostituiti dai moduli sopra. Restano SOLO due file classic, entrambi fuori da `index.php` (vedi §1): `js/cheatboard.js` (dev-only) e `js/arcade-page.js` (pagina standalone `arcade.php`). `src/state/interop.ts` è stato rimosso (Blocco #3, Fase C): tutti i moduli V3 riferiscono `store.X` direttamente. La sola eccezione dev-only (`js/cheatboard.js`) è servita da `src/state/cheatboard-bridge.ts`, un bridge minimo a 5 chiavi.

---

## 8. "Dove metto le mani per…"

- **Aggiungere/ritoccare un dato** (team, upgrade, skin, achievement, testo): `src/data/*.ts` (+ `src/data/en/*.ts` per l'inglese). Nessun tocco al bundle.
- **Cambiare una formula** (costo, CPS, reward prestigio, golden bug): `src/game/economy.ts|prestige.ts|events.ts` (puri, con test). Chiamate via `EspoV3.economy/prestige/events` da `src/game/logic.ts`.
- **Formattazione numeri/tempo, regole di visibilità tab**: `src/ui/format/`, `src/ui/rules/`.
- **Config backend / ambiente / CDN / versione**: `src/lib/backend-config.ts`, `src/lib/version.ts`.
- **Stile**: `styles/` — `base/` per il gioco legacy, `ui/` per il design system moderno, `themes/` per i temi skin.
- **Comportamento di gioco / DOM / boot**: i moduli ESM in `src/` (`game/logic.ts`, `ui/render/`, `ui/modals/`, `app/boot.ts`). Eccezione: `js/cheatboard.js` (dev-only) e `js/arcade-page.js` (pagina standalone `arcade.php`, vedi §1) restano classic script.
- **Un test**: unit in `src/**/*.test.ts`; comportamentale end-to-end in `tests/e2e/`.

## 9. Trappole note (leggere prima di rompere)

- **Console silenziosa in dev**: `DEBUG_MODE` è `false` di default e silenzia `log/warn/info` (non `error`). Per vedere i log: `window.DEBUG_MODE = true` in console.
- **Line endings**: il working tree usa CRLF; git (autocrlf) normalizza a LF nel repo. Nei tool di edit, preserva CRLF sui file esistenti.
- **Cache temi/arcade** in prod: `?v=CACHE_VER` statico → serve `npm run cache:bump` per invalidare.
- **R2 / cartelle asset**: vedi §5 — non rinominare `assets/sounds|video`.
- **Branch di deploy**: `develop-v3` (non `develop`).
