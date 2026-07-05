# Piano di migrazione a V3 (strangler)

> Stato: **Fasi 0, 1 e 2 (delega) FATTE** (2026-07-05). Fase 2: anti-rollback client delegato a `EspoV3.save.antiRollback` con la gerarchia del server Format>Prestige>Score (prima confrontava solo lifetimeScore — divergenza voluta e verificata: nei casi limite ora client e server decidono uguale); salvage migrazione cloud V1→V2 delegato a `EspoV3.migrations.migrate` (gate resta su version.major, schemaVersion=1 esplicito); i nuovi save scrivono `schemaVersion: 2` (gamestate.js) per rendere autonomo il framework in futuro. Parità verificata in preview (matrice 8/8 anti-rollback incl. big number e divergenze, 4/4 migrazione). Fase 0: `game.modules.js` caricato prima del bundle legacy (dopo la CDN break_infinity) → `EspoV3` garantito al boot legacy, Decimal deterministico (break_infinity; break_eternity solo fallback se CDN giù). Fase 1: `window.SaveDB` delega a `EspoV3.save` con fallback legacy in `js/save-db.js` — verificata parità round-trip e lettura incrociata nei due sensi in preview. Baseline test: 65 verdi. **Resta di F1:** rimozione dell'implementazione legacy in save-db.js dopo un ciclo di deploy verificato su test/prod.
> Scopo: portare il gameplay legacy (`js/*`, globali `window.*`) ai moduli V3 (`src/*.ts`, ESM via Vite) **mantenendo il gioco funzionante a ogni passo**.

## In parole povere: cosa ci guadagniamo

- **Meno bug per i giocatori.** Con TypeScript il codice viene "controllato" mentre lo scrivi: tanti errori saltano fuori subito, non quando un giocatore ci sbatte contro.
- **Modifiche più facili e sicure.** Oggi tutto è collegato da variabili globali condivise (`window.*`): toccare una cosa può romperne un'altra a sorpresa. Con i moduli ognuno ha confini chiari → cambi una parte senza far crollare il resto.
- **Gioco più leggero e veloce a caricare.** Adesso il browser scarica DUE pacchetti di codice (vecchio + nuovo) in parallelo. A fine migrazione ne resta UNO solo, più piccolo e ottimizzato: carica solo ciò che serve, quando serve.
- **Salvataggi più al sicuro.** Il nuovo sistema di salvataggio ha test automatici (anti-rollback, migrazioni) → molto meno rischio che un giocatore perda i progressi.
- **Più fluido.** I calcoli pesanti (guadagni offline, salvataggio) girano su "thread separati" (worker) → il gioco non si impunta mentre li esegue.
- **Meno fatica a mantenerlo.** Un solo sistema di build invece di due e codice ordinato e tipizzato → aggiungere nuove feature diventa più rapido e con meno sorprese; i test automatici fanno da rete ("sistemo A senza rompere B").

> Nota onesta: questi vantaggi arrivano **progressivamente** e in pieno solo a fine percorso. Durante la migrazione i due sistemi convivono (per un po' c'è anche un filo di codice in più), ma il gioco resta sempre funzionante perché si va a piccoli passi con verifica.

## 1. Stato reale (verificato, non assunto)

`src/main.ts` pubblica `window.EspoV3 = { crypto, save, migrations, bignum, loop, workers, fx, ui }` ed esegue 3 side-effect: `installGlobalDecimal()` (solo se `window.Decimal` non esiste), `autoInitClickerParallax()`, `autoInitLucide()`.

**Aggancio a senso unico:** nel bundle legacy (`js/`) ci sono **zero** chiamate a `window.EspoV3.*`. Oggi V3 è una **vetrina di moduli pronti ma non consumati**. È "live" solo ciò che `main.ts` fa da sé: Decimal (in *race* con la CDN `break_infinity`), parallax del clicker, icone Lucide.

| Responsabilità | Autoritativo OGGI | Gemello V3 |
|---|---|---|
| Save IndexedDB | **Legacy** (`js/save-db.js` → `window.SaveDB`, usato da `script.js`) | `src/core/save/db.ts` (stessa chiave/DB) — pronto, non collegato |
| Codec LZString | **Legacy** (inline) | `src/core/save/codec.ts` — pronto |
| Anti-rollback | **Legacy** (inline in `loadCloudData`) | `src/core/save/anti-rollback.ts` — testato (17) |
| Migrazioni schema | **Legacy** (V1→V2 inline) | `src/core/migrations/` — testato (11) |
| Decimal | **V3 di fatto** ma in race con CDN | `bignum.ts` |
| Parallax / Icone | **V3** (unico owner) | live |
| Loop, workers, crypto, fx | nessun consumatore | dormienti |

**Conclusione:** infrastruttura portata in parallelo, **cutover non iniziato**. La superficie pubblica legacy da intercettare è il god-object `window.EspooClicker` (`saveGame`, `loadCloudData`, `getGameState`, `showToast`, `playSound`, `executePrestige`…), più i global `window.SaveDB`, `window.gameData`, `window.applyLanguage`, `AudioManager`, `AssetManager`.

## 2. Ordine di caricamento = ordine di dipendenza (da `build.js`)

```
lz-string → save-db → error-handler → version-config
 → asset-packages → asset-manager
 → data/* → data-en/* → i18n
 → data/gamestate.js   [legge window.gameData.* a TOP-LEVEL]
 → ui-functions → game-logic → modals → podio
 → arcade-loader → intro → esposion
 → script.js           [ULTIMO: costruisce window.EspooClicker]
```

- **Foglie a basso accoppiamento:** `save-db`, `version-config`, `i18n`, `podio`, `intro`, `esposion`, `asset-*`.
- **Dati:** `data/*`, `data-en/*` (ma `gamestate.js` li legge a top-level).
- **Core (alto accoppiamento):** `game-logic`, `ui-functions`, `script` (+ `modals` dipende da `EspooClicker`).

**Direzione di migrazione:** save-codec (già pronto) → foglie → dati → UI → core.

## 3. Fasi

Pattern strangler per ogni fase: il legacy **delega** con fallback `window.EspoV3?.x ?? legacy`, si verifica la parità, poi si rimuove l'implementazione legacy. I due bundle coesistono fino alla Fase 7.

| Fase | Contenuto | Sforzo |
|---|---|---|
| **0** | Fondamenta cutover: contratto "EspoV3 ready", helper di fallback, risolvere l'ordine Decimal vs CDN `break_infinity` | **S** |
| **1** | **Save codec + SaveDB → EspoV3** (primo cutover reale) | **S/M** |
| **2** | Anti-rollback + migrazioni schema → EspoV3 | **M** |
| **3** | Loop/scheduler + workers (offline, encode save) | **M** |
| **4** | i18n overlay EN + asset/CDN | **M** |
| **5** | UI rendering & temi (`ui-functions.js`, a fette) | **L** |
| **6** | Core gameplay (`game-logic.js` + `script.js`, per sotto-sistemi) | **L** |
| **7** | Rimozione legacy: drop `build.js`/`dist/`, drop CDN, single build Vite | **M** |

Per ogni fase: migrare dietro fallback → testare (vitest + verifica manuale, deploy su `test` prima di prod) → rimuovere il legacy → "fatto" = nessuna regressione e duplicazione eliminata.

### Fase 0 — Fondamenta (S)
Nessun codice migrato. Stabilire: (a) ordine deterministico V3-prima-del-legacy per `Decimal` (oggi `break_infinity` CDN `defer` vs `game.modules.js` module: vincitore non garantito); (b) helper di delega `EspoV3?.x ?? legacy`; (c) baseline test (62 verdi). Senza questo ogni delega è una race.

### Fase 1 — Save codec + SaveDB (S/M) ← PRIMO STEP
`window.SaveDB` e i call-site in `script.js` delegano a `EspoV3.save` (db+codec), con fallback. **DB compatibile bidirezionale** (stessa chiave `espotoolClickerSaveV9`, stesso store `EspoClickerDB.saves`) → nessuna migrazione dati. Test: codec/db vitest + round-trip salva/ricarica + lettura incrociata con/senza V3. È la foglia tecnica con gemello già testato → primo vero passo strangler.

### Fasi 2–7
Vedi tabella. 2 e 3 dipendono dal save (F1). 4 è foglia ma con vincolo d'ordine (prima di `gamestate`). 5 e 6 sono i blocchi grandi (UI e core) da fare a fette con fallback. 7 chiude: un solo bundle.

## 4. Insidie trasversali

- **Global ↔ ESM:** ogni modulo V3 deve ripubblicare il global atteso (`window.SaveDB`, `window.applyLanguage`, `window.EspooClicker.*`) finché esistono consumatori legacy. Delega sempre con fallback.
- **Dati a top-level:** `gamestate.js` esegue `getInitialGameState()` leggendo `window.gameData.*` al caricamento del file. Spostare `data/*`/`data-en/*`/`i18n` deve preservare "gameData popolato + overlay EN PRIMA di gamestate".
- **Save:** non cambiare chiave/DB/formato (LZString UTF16). Confronto big-number ha 2 impl (Decimal legacy vs parsing stringa V3): verificare parità oltre il range double (`1.5e+50`). `crypto.ts` (sha256/hmac) è pronto ma **non ancora usato** — HMAC reale = lavoro futuro.
- **Build doppia:** ogni cutover su `js/*` richiede `npm run build`. Cache-bust via `filemtime`; attenzione al Service Worker (`sw.js`).
- **Race Decimal/CDN:** da risolvere in Fase 0 prima di rimuovere la CDN.

## 5. Raccomandazione

Partire da **Fase 0 (mini) + Fase 1 (save cutover)**: gemello V3 già testato, DB compatibile (rischio dati minimo), poche righe legacy da deviare, e trasforma `EspoV3.save` da codice morto a produzione validando il pattern delega+fallback per tutte le fasi successive.

### File critici
- `js/script.js` — orchestratore (`saveGame`, `loadGame`, `loadCloudData`, autosave)
- `js/save-db.js` — `window.SaveDB`, target del primo cutover
- `src/main.ts` — vetrina `window.EspoV3`
- `build.js` — concatenazione legacy + build doppia (da rimuovere in F7)
- `index.php` — caricamento dei due bundle + CDN + SW (nodo coesistenza)
