# ARCHITECTURE — Espòòò Clicker

Mappa del progetto per chi arriva. Il `README.md` racconta il *gioco*; questo file racconta il *codice*: com'è fatto, perché, dove sta cosa, e dove mettere le mani per fare X.

> Stato: migrazione a moduli in corso (vedi §7). Il gioco è **ibrido**: un motore legacy in JavaScript "classic script" convive con moduli TypeScript/ESM nuovi (`EspoV3`). Capire questa convivenza è il 90% di capire il progetto.

---

## 1. TL;DR — i due mondi

Il gioco gira come **due bundle** caricati in ordine da `index.php`:

1. **`dist-v3/game.modules.js`** — il modulo **V3** (TypeScript ESM, sorgenti in `src/`). Esegue **per primo**. Fa due cose: (a) espone logica pura e riutilizzabile su `window.EspoV3`; (b) *installa* su `window` tutto ciò che il legacy si aspetta di trovare già pronto (stato, dati di gioco, config, ecc.).
2. **`dist/game.bundle.min.js`** — il bundle **legacy** (i file `js/*.js` concatenati). Esegue **dopo**. È il motore di gioco storico: DOM, game-loop, il "god-object" `window.EspooClicker`. Consuma ciò che V3 ha installato.

Regola d'oro (contratto **F0**): *V3 esegue sempre prima del legacy* → quando il legacy parte, `window.EspoV3`, `window.gameData`, gli accessor di stato, ecc. **esistono già**. Nessun evento "ready", nessun fallback: se V3 manca, il gioco non parte (una *guard di boot* in `js/data/gamestate.js` lo segnala in chiaro).

```
index.php  →  <script defer> dist/break_infinity.min.js   (Decimal globale)
           →  <script type=module> dist-v3/game.modules.js (V3: installa tutto)
           →  <script defer> dist/game.bundle.min.js        (legacy: usa tutto)
```
`type=module` e `defer` eseguono in **ordine di documento** dopo il parsing → l'ordine sopra è garantito.

---

## 2. Mappa delle cartelle

```
src/                 # TypeScript / ESM (il "nuovo"), buildato da Vite
  main.ts            #   entry: installa tutto + costruisce window.EspoV3
  state/             #   store.ts (stato mutabile del gioco) + interop.ts (accessor window, TEMP)
                     #   + save-db.ts (bridge window.SaveDB)
  data/              #   TUTTI i dati di gioco (teams, upgrades, skins, achievements, texts, events…)
    index.ts         #     assembla window.gameData + installGameData()
    en/              #     overlay lingua EN
    season.ts        #     stagionalità (Natale) pura, order-independent
    decimal.ts       #     ctor Decimal risolto (window.Decimal a runtime, break_eternity nei test)
  game/              #   formule di dominio PURE: economy.ts prestige.ts events.ts (Decimal iniettato,
                     #     con test). Il legacy le chiama via EspoV3.economy/prestige/events.
  ui/                #   logica UI pura + effetti: format/ rules/ toast/ theme/(css-loader lazy)
                     #     animations/ particles/ icons/ interactions/
  lib/               #   infrastruttura: version.ts (GAME_VERSION+CDN R2+debug), backend-config.ts
                     #     (Supabase+detectEnv), i18n.ts (bridge), asset-manager.ts (bridge)
  core/              #   logica pura riusabile: crypto, bignum, save/ (db+codec+anti-rollback),
                     #     migrations/, loop/ (Scheduler), i18n/ (overlay), assets/ (manager)
  workers/           #   offline.worker, save.worker + client
  app/               #   error-handler.ts (+ previsto: boot, ex script.js)
  types/

  NB: src/game e src/ui contengono la logica PURA (formule, format, regole); l'ORCHESTRAZIONE
  che le usa (acquisti, click, rendering DOM, boot) è ancora nei monoliti js/ (vedi §7).

js/                  # JavaScript "classic script" (il "vecchio"), concatenato nel bundle legacy
  data/gamestate.js  #   boot guard + variabili di stato window + getInitialGameState/reset
  ui-functions.js    #   [MONOLITE ~2500 righe] rendering, HUD, modali di stato, toast DOM
  game-logic.js      #   [MONOLITE ~2300 righe] economia, prestigio, eventi, acquisti, click
  modals.js          #   [MONOLITE] modali (login, settings, account, classifica…)
  script.js          #   [MONOLITE ~2500 righe] god-object EspooClicker, boot, scheduler, save/cloud
  podio/social/arcade-loader/intro/esposion.js   # feature periferiche (classic, fuori dalla migrazione)
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
2. `installInterop()` — installa su `window` gli **accessor** (get/set) per lo stato condiviso (vedi §4).
3. `installGameData()` — `window.gameData` + `window.ASSET_PACKAGES` + helper stagionali.
4. `installVersion()` — `window.GAME_VERSION`, `window.CDN`, silenziatore console (`DEBUG_MODE`).
5. `installErrorHandler()` — toast sugli errori uncaught.
6. `installBackend()` — `window.EspoBackend` (Supabase) + in dev inietta la cheatboard.
7. `installSaveDb()` / `installI18n()` / `installAssetManager()` — bridge `window.SaveDB` / `applyLanguage` / `AssetManager`.
8. Costruisce l'oggetto **`EspoV3`** e lo assegna a `window.EspoV3`.

Poi parte il **bundle legacy** (ordine in `scripts/vite-plugin-legacy.ts › JS_FILES`): `gamestate.js` (guard + stato) → `ui-functions.js` → `game-logic.js` → `modals.js` → periferici → `script.js`. `script.js` costruisce `window.EspooClicker` (il god-object con `saveGame`, `showToast`, `getGameState`, `playSound`…) e avvia lo **Scheduler V3** (`new EspoV3.loop.Scheduler`) che guida logica 30hz / UI 10hz / autosave 30s.

`window.EspoV3` (superficie pubblica): `version, schema, crypto, bignum, save, migrations, loop, i18n, format, theme, economy, prestige, events, rules, toast, assets, workers, fx, ui, state`.

---

## 4. Modello di stato

Lo stato **mutabile e condiviso** del gioco vive in **`src/state/store.ts`** (`EspoV3.state.store`): `gameState` (l'oggetto salvato), `bps`, `prestigeBonus`, i moltiplicatori runtime, `clickHistory`, `gameData`. 12 chiavi in tutto.

Il legacy però usa quei nomi come **globali "nudi"** (`gameState.score`, `bps = ...`). Ponte: **`src/state/interop.ts`** installa su `window` un accessor `get/set` per ogni chiave dello store → una lettura/scrittura legacy di `bps` colpisce `store.bps`. Un solo stato, due viste sincronizzate.

- `gameState = newState` (riassegnazione su prestige) → passa dal setter → `store.gameState = newState`. Vivo.
- I moduli V3 fanno `import { store }` e usano `store.X` direttamente.
- `interop.ts` è **TEMPORANEO**: sparirà quando anche i monoliti saranno moduli e importeranno lo store (fine migrazione).

I **dati** (non mutabili: definizioni di team/upgrade/skin/testi) vivono in `src/data/` ed esposti come `window.gameData`. I `Decimal` nei dati sono `window.Decimal` a runtime (bit-identici al legacy), break_eternity nei test.

---

## 5. Build, bundle, deploy

- **Un solo build tool: Vite.** `npm run build` produce `dist-v3/` (moduli V3) e — via il plugin `scripts/vite-plugin-legacy.ts` (hook `closeBundle`) — concatena/minifica i `js/*` in `dist/game.bundle.min.js` e i CSS in `dist/styles.*`.
- **CSS**: sorgenti tutti in `styles/`. `styles/main.css`→`dist/styles.bundle.min.css`, `styles/mobile.css`→`dist/styles.mobile.min.css`, `styles/ui/index.css`→`dist-v3/assets/v3-styles.css` (via Vite da `main.ts`). I temi (`styles/themes/`) sono caricati **lazy a runtime** dal loader (cache-buster `window.CACHE_VER`).
- **Cache busting**: i bundle `dist/*` in `index.php` hanno `?v=filemtime` (auto in dev E prod). Temi lazy e arcade CSS usano invece `?v=CACHE_VER` → per rinfrescarli in prod serve `npm run cache:bump`. Vedi memoria `preview-css-cache-gotcha`.
- **Service worker** (`sw.js`): auto-update su `CACHE_VERSION`; cache-first sui `.css`, mai-cache su cheatboard/arcade.
- **Ambiente**: `detectEnv()` (in `src/lib/backend-config.ts`) sceglie dev/prod dall'URL: `localhost`/`127.0.0.1`/`*.local`/`*.test`/path `/test/` → **dev**; resto → **production**. UN solo build funziona ovunque. In dev si carica la cheatboard; in prod no.
- **CDN R2**: audio/video pesanti stanno su Cloudflare R2 (bucket privato). `window.CDN` (in `src/lib/version.ts`) risolve i path `assets/sounds/`, `assets/video/`, `music/songs/` in URL firmate 1h generate da `php/r2-sign.php`. **⚠️ Questi prefissi sono chiavi del bucket**: NON rinominare quelle cartelle senza migrare anche R2 + la whitelist PHP.
- **Deploy**: `deploy.bat` (opz.7 = test, opz.8 = prod) → push su branch → GitHub Actions FTP. Il deploy V3 parte dal branch **`develop-v3`**. **Guardrail prod**: non deployare in root Altervista finché i dati prod non sono migrati su Supabase.

---

## 6. Test

- **Unit (Vitest, `src/**/*.test.ts`)**: solo la logica pura dei moduli V3 (formule economia/prestigio/eventi, save codec, anti-rollback, migrazioni, scheduler, interop, dati). `npm test`.
- **E2E (Playwright, `tests/e2e/`)**: fa girare il **gioco reale** (`index.php` servito da PHP built-in) in Chromium headless. `smoke` (acquisto team, promozione, golden bug, daily), `integration` (round-trip salvataggio, click reale, interop stato, percorsi UI col solo ramo V3), `cheatboard`. È **la rete di sicurezza** della migrazione: verde = zero regressioni di comportamento. Lancio locale: `PHP_BIN="C:/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe" npx playwright test` (fai `npm run build` prima).
- **Criterio d'accettazione per ogni cambiamento**: `build` + `typecheck` + `vitest` + E2E tutti verdi.

---

## 7. Stato della migrazione (cosa è nuovo, cosa è vecchio)

La migrazione "strangler" (F0–F8) ha spostato la **logica pura** in `src/` lasciando il legacy come orchestratore; poi la riorganizzazione (filoni D/A/B/C) ha spostato **stato, dati e infrastruttura**:

| Area | Dove vive oggi |
|---|---|
| CSS | ✅ tutto in `styles/` |
| Stato condiviso | ✅ `src/state/store.ts` (+ interop) |
| Dati di gioco | ✅ `src/data/` |
| Infrastruttura (version, backend, error, save-db, i18n, asset-mgr) | ✅ `src/lib` / `src/state` / `src/app` |
| Formule economia/prestigio/eventi, format, rules, save, migrations, scheduler | ✅ `src/` (usate dal legacy via `EspoV3.*`) |
| **Logica di dominio** (acquisti, click, eventi runtime) | ⏳ ancora in `js/game-logic.js` |
| **Rendering/UI** | ⏳ ancora in `js/ui-functions.js`, `js/modals.js` |
| **Boot/orchestrazione** | ⏳ ancora in `js/script.js` (god-object) |

**Restano 4 monoliti** (game-logic, ui-functions, modals, script): sono il cluster più accoppiato (condividono lo scope globale, ~37 funzioni cross-referenziate). Vanno convertiti con cura, ognuno col suo piano; `interop.ts` si rimuove solo alla fine.

---

## 8. "Dove metto le mani per…"

- **Aggiungere/ritoccare un dato** (team, upgrade, skin, achievement, testo): `src/data/*.ts` (+ `src/data/en/*.ts` per l'inglese). Nessun tocco al bundle.
- **Cambiare una formula** (costo, CPS, reward prestigio, golden bug): `src/game/economy.ts|prestige.ts|events.ts` (puri, con test). Il legacy le chiama via `EspoV3.economy/prestige/events`.
- **Formattazione numeri/tempo, regole di visibilità tab**: `src/ui/format/`, `src/ui/rules/`.
- **Config backend / ambiente / CDN / versione**: `src/lib/backend-config.ts`, `src/lib/version.ts`.
- **Stile**: `styles/` — `base/` per il gioco legacy, `ui/` per il design system moderno, `themes/` per i temi skin.
- **Comportamento di gioco / DOM / boot** (finché non è migrato): i monoliti in `js/*.js`. Ricorda: nel bundle concatenato le funzioni condividono UNO scope globale (una funzione definita in un file è chiamabile dagli altri).
- **Un test**: unit in `src/**/*.test.ts`; comportamentale end-to-end in `tests/e2e/`.

## 9. Trappole note (leggere prima di rompere)

- **Console silenziosa in dev**: `DEBUG_MODE` è `false` di default e silenzia `log/warn/info` (non `error`). Per vedere i log: `window.DEBUG_MODE = true` in console.
- **Line endings**: il working tree usa CRLF; git (autocrlf) normalizza a LF nel repo. Nei tool di edit, preserva CRLF sui file esistenti.
- **Cache temi/arcade** in prod: `?v=CACHE_VER` statico → serve `npm run cache:bump` per invalidare.
- **R2 / cartelle asset**: vedi §5 — non rinominare `assets/sounds|video`.
- **Branch di deploy**: `develop-v3` (non `develop`).
