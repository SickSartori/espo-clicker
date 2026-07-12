# Riorganizzazione del progetto per la leggibilità — Design

> Stato: **APPROVATO (design)** — 2026-07-11. Stella polare + roadmap. Ogni filone avrà il suo piano dettagliato (writing-plans) al momento dell'esecuzione.
> Prerequisito d'avvio: validazione del **deploy test di F8** (migrazione strangler V3 conclusa).

## 1. Obiettivo

Rendere il progetto **leggibile a un nuovo collaboratore**: ridurre i file dove sono ridondanti, organizzare in cartelle ottimali dove non lo sono. Oggi il progetto è percepito come disordinato per quattro motivi cumulativi:

1. **Doppio albero** `js/` (legacy classic script) + `src/` (V3 ESM) che fanno cose sovrapposte — non è chiaro "quale sia il codice vero".
2. **File monolitici**: `script.js` (~2600 righe), `game-logic.js` (~2400), `ui-functions.js` (~2500).
3. **Frammentazione** opposta in `src/` (~81 file, molti micro-moduli).
4. **CSS/grafica sparsi**: `css/` (legacy runtime) + `src/ui/theme/` (design-token V3, temi duplicati) + `assets/`.

La **leggibilità è il driver**. Il tree-shaking è un bonus che arriva a fine percorso, non l'obiettivo: se costringesse a micro-frammentare, la leggibilità vince.

### Non-goal
- Non si riscrive la **logica** di gioco: si sposta/organizza soltanto (parità comportamentale garantita dalla rete E2E).
- Non si convertono i **periferici** (`arcade-loader.js` + `arcade/`, `cheatboard.js`, `podio.js`, `social.js`, `intro.js`, `esposion.js`): restano classic script, eventualmente raccolti sotto `legacy/`.
- Non si insegue il tree-shaking massimo.

## 2. Struttura-bersaglio (③ ibrido: layer in cima, file per-feature dentro)

Albero **shallow e auto-esplicativo**: il livello top dice *dove cercare*, il nome-file dice *di cosa parla*.

```
src/
  app/         # boot, wiring, orchestrazione (ex script.js) — entry ESM
  state/       # store.ts (stato mutabile), interop.ts (temp), save/, migrations/, anti-rollback
  game/        # economy.ts, prestige.ts, events.ts, click.ts, teams.ts, achievements.ts
  ui/          # hud.ts, tabs.ts, scoreboard.ts, stores.ts, format.ts, rules.ts, toast.ts, modals/, theme/
  data/        # teams, upgrades, skins, achievements, texts, events, core, asset-packages (+ en/)
  lib/         # crypto, bignum, i18n-engine, asset-manager, backend-config, version
  workers/     # offline.worker, save.worker, client
  types/
styles/        # base/ (tokens+reset+primitives), themes/ (8bit,super,christmas,divine,...), mobile/
assets/        # img/, audio/, video/
legacy/        # periferici ancora classic (arcade-loader, cheatboard, podio, social, intro, esposion)
```

Radice: solo config + entry (`index.php`, `package.json`, `vite.config.ts`, `tsconfig.json`, `sw.js`, `manifest.json`, `deploy*.bat`, `README.md`, `arcade.php`).

**Criteri di granularità (per non ricadere né nei monoliti né nei micro-file):**
- Target ~**150–400 righe/modulo**; oltre → si valuta lo split, sotto ~50 → si valuta il merge (salvo confine di dominio netto).
- Un modulo = una responsabilità nominabile in una frase.

## 3. Mapping "file di oggi → dove va domani" (indicativo)

| Oggi | Domani | Note |
|------|--------|------|
| `js/data/gamestate.js` | `src/state/store.ts` (+ `src/state/interop.ts` temp) | **filone A**, fondamenta |
| `js/data/*.js` | `src/data/*.ts` | esportano i dati (oggi `window.gameData.*`) |
| `js/data-en/*.js` | `src/data/en/*.ts` | overlay lingua |
| `js/asset-packages.js` | `src/data/asset-packages.ts` | dati pacchetti asset |
| `js/game-logic.js` | `src/game/{economy,prestige,events,click,teams,achievements}.ts` | de-monolite; logica pura già in `src/` da F6 → wrapper diventano import diretti |
| `js/ui-functions.js` | `src/ui/{format,rules,toast,hud,tabs,scoreboard,stores}.ts` + `src/ui/theme/` | de-monolite |
| `js/modals.js` | `src/ui/modals/*.ts` | un modulo per gruppo di modali |
| `js/save-db.js` | `src/state/save/` | già thin dopo F8; logica già in `src/core/save/` |
| `js/i18n.js` | `src/lib/i18n-engine.ts` | thin; overlay già in `src/core/i18n/` |
| `js/asset-manager.js` | `src/lib/asset-manager.ts` | thin; logica già in `src/core/assets/` |
| `js/backend-config.js` | `src/lib/backend-config.ts` | |
| `js/version-config.js` | `src/lib/version.ts` | |
| `js/error-handler.js` | `src/app/error-handler.ts` | |
| `js/script.js` | `src/app/{boot,save-flow,cloud-sync,offline}.ts` | **per ultimo** (god-object) |
| `css/*` (22 file: entry main/mobile, 15 partial, 3 temi lazy, arcade) | `styles/{main.css,mobile.css,base/,themes/,arcade/}` | **filone D** |
| `src/ui/theme/*.css` + `src/ui/desktop-fixes/` (20) + `src/ui/mobile-fixes/` (5) + `src/ui/icons/lucide-style.css` | `styles/ui/{,themes/,desktop/,mobile/}` (rinominata da v3 il 2026-07-12: niente cartelle versionate) | **filone D**; i temi legacy (completi, lazy) e v3 (override token) sono meccanismi DIVERSI → si co-locano, NON si cancellano |
| `assets/image|sounds|video` | `assets/{img,audio,video}` | **filone E** |
| periferici (`cheatboard`, `podio`, `social`, `arcade-loader`, `intro`, `esposion`) | `legacy/` | fuori scope, invariati |

La tabella è indicativa: lo split fine di `game-logic`/`ui-functions`/`script` si definisce nel piano del **filone C**.

## 4. Roadmap a filoni

Ordine per dipendenza e rischio. Ogni filone è un **ciclo suo** (spec breve se serve → writing-plans → fette), con lo stesso criterio d'accettazione per fetta della migrazione V3.

- **A — Fondamenta stato**: `gamestate.js` → `src/state/store.ts` + `interop.ts`. Sblocca tutto il resto. **FATTO 2026-07-12** (store 11 chiavi + interop accessor, 7 unit + E2E interop, gate completo verde).
- **B — Dati**: `data/` + `data-en/` → `src/data/` (moduli che esportano i dati). Lo store espone `gameData`. **FATTO 2026-07-12** (15 file → src/data/ corpi intatti via git mv; season.ts puro per stagionalità order-independent; condition achievements su store; store.gameData 12ª chiave; bundle legacy 252→219 KB; gate 210 unit + E2E 10).
- **C — Logica & UI (de-monolite + unificazione JS)**: `game-logic` → `src/game/*`; `ui-functions` → `src/ui/*`; `modals` → `src/ui/modals/*`; `save-db`/`i18n`/`asset-manager` → `src/state`+`src/lib`; **`script.js` → `src/app/` per ultimo**. È il filone più grosso: a sotto-fette per file/dominio.
- **D — CSS unificato** (*anticipato: primo filone in esecuzione, è l'unico indipendente dai filoni JS — decisione utente 2026-07-11*): `css/` + tutto il CSS sotto `src/ui/` → `styles/` (layout sopra). Move-only: nessuna riscrittura di regole; i tre bundle di output devono restare identici. Aggiornare `loadThemeCSS` (cssBase), `arcade.php`, build CSS nel plugin/Vite, import in `main.ts`/`index.css`, `sw.js` (bump versione cache). Piano: `docs/superpowers/plans/2026-07-11-css-reorg-filone-d.md`. **FATTO 2026-07-11** (task D0-D5, bundle bit-identici, E2E verdi).
- **E — Asset + mappa**: `assets/` → `img/audio/video`; scrivere **`ARCHITECTURE.md`** (mappa cartelle + grafo dipendenze principali + "dove aggiungo una feature X").
- **Chiusura**: rimozione `interop.ts` + concat legacy del core → un solo bundle ESM per il core; i periferici restano in un mini-bundle classic separato.

## 5. Meccanismo chiave: store + shim di interop (mantiene il gioco vivo)

Verificato in fase di design: lo stato condiviso vive in `js/data/gamestate.js` come `var` top-level (proprietà globali), `gameData` è già `window.gameData`.

```ts
// src/state/store.ts — unica fonte dello stato mutabile condiviso.
export const store = {
  gameState: undefined,          // reassign via store.gameState = newState
  bps: new Decimal(0),
  prestigeBonus: new Decimal(1),
  bluescreenMultiplier: new Decimal(1),
  crunchTimeMultiplier: new Decimal(1),
  clickHistory: [],
  achievementsBPSBonus: new Decimal(0),
  // gameData: riferimento condiviso finché data/ non è convertito (filone B)
};
```

```ts
// src/state/interop.ts — TEMPORANEO, rimosso a fine filone C.
import { store } from './store';
export function installInterop() {
  for (const k of Object.keys(store)) {
    Object.defineProperty(window, k, {
      get: () => store[k],
      set: (v) => { store[k] = v; },
      configurable: true,
    });
  }
}
```

`installInterop()` gira **prima** del bundle classic residuo (stesso contratto d'ordine della Fase 0 per `EspoV3`). I file classic non-ancora-convertiti usano `bps`/`gameState` (= `window.*` = accessor → store); i moduli ESM fanno `import { store }`. Un solo stato, due viste sincronizzate. Man mano che un file passa a `src/`, i suoi `window.X` diventano `store.X`. A fine filone C lo shim si rimuove.

## 6. Build & deploy

- **Vite resta l'unico build tool.** I moduli convertiti entrano nel grafo ESM (l'entry cresce). Il plugin `vite-plugin-legacy` (concat) si restringe man mano ai soli periferici.
- **Ogni spostamento file tocca 4 punti** → checklist obbligatoria per ogni move:
  1. `scripts/vite-plugin-legacy.ts` (lista `JS_FILES`, ordine);
  2. `index.php` (tag `<script>`);
  3. `sw.js` (`STATIC_PATTERNS` / cache version);
  4. exclude dei workflow FTP (`.github/workflows/*.yml`) + `deploy.bat`.
- `index.php`: meno tag classic nel tempo; a fine percorso **un solo** `<script type=module>` per il core + gli script dei periferici.

## 7. Verifica (identica a F8)

- Rete **E2E** (`tests/e2e/`: smoke + integration + cheatboard = 9 test sul gioco reale) **verde a ogni fetta** = zero regressioni comportamentali.
- **194 vitest** sui moduli `src/` (crescono man mano che la logica entra in `src/`, con unit mirati sui nuovi moduli).
- Criterio d'accettazione per fetta: `npm run build` + `typecheck` + `vitest` + `E2E 9/9` verdi. **Deploy test tra i filoni.**
- Lancio E2E locale: `PHP_BIN="C:/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe" npm run test:e2e` (vedi memoria `e2e-parity-harness`).

## 8. Rischi & mitigazioni

| Rischio | Mitigazione |
|--------|-------------|
| Spostare un file rompe build/deploy (4 punti) | Checklist per move (sez. 6); build+E2E dopo ogni fetta |
| Shim non attivo prima del classic → `bps`/`gameState` undefined | `installInterop()` come primo script, contratto d'ordine come Fase 0; verificare che `gameState = newState` passi dal setter |
| Ordine init: logica prima dei dati | L'entry importa store→dati prima del boot |
| Ri-frammentazione in micro-file | Target granularità esplicito (sez. 2) |
| Regressione su gioco live | Fette piccole, reversibili, deployabili; deploy test tra i filoni |
| CSS: temi duplicati con path diversi | Filone D deduplica e aggiorna `loadThemeCSS` + build CSS insieme |

## 9. Timing & sequenza

Avvio **dopo** la validazione del deploy test di F8. Ordine di esecuzione: **D (anticipato, indipendente) → A → B → C (a sotto-fette) → E → chiusura**. Indipendente dalla migrazione hosting Cloudflare — anzi la semplifica (un bundle ESM è più facile da servire su Pages). Non bloccante: procedibile a fette nel tempo.

## 10. Definizione di "fatto"

- Un solo albero sorgente `src/` con la struttura ③; `js/` core svuotato (restano solo i periferici in `legacy/`).
- CSS unificato in `styles/`; asset in `assets/{img,audio,video}`.
- `ARCHITECTURE.md` presente e aggiornato.
- Nessun `window.*` come canale di stato del core; shim rimosso.
- Build/typecheck/vitest/E2E verdi; deploy test superato.
