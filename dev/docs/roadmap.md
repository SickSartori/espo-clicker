# Roadmap post-3.0 — Espòòò Clicker

> Stato: concordata il 21/07/2026. Orizzonte: fino alla **4.0** (aprile 2027). Cadenza mensile: ~1 settimana design, 1-2 implementazione, 1 buffer/hotfix.
> Arcade: focus sui 3 giochi richiesti — **Stack Overflow** (falling blocks), **Q*Bert-like**, **BUGDOOM** — più **Flappy Espò** e il bonus multiplayer **Click Duel 1v1**.
> Regola arcade: massimo un cabinato nuovo per release, sempre vanilla JS + canvas, zero CDN esterne (lezione Phaser/Super Espò).

## v3.1 — metà settembre 2026 · «Migliorie e bugfix»

- Coda hotfix post-lancio
- ☁️ **Badge cloud-sync — rifacimento** (segnalazione QA 31/07/2026, pre-lancio è entrata solo la mitigazione: tap → nascondi badge + toast, `src/app/boot.ts`).

  > 🐛 *Cliccando "Progressi dietro al cloud — tocca per sincronizzare" non succede niente.*
  > *Il pulsante non sembra fare nulla al click da PC, né scompare il messaggio: rimane fisso.*

  Verificato che il click **arriva** al badge (hit-test `elementFromPoint`: nessun overlay lo intercetta), quindi non è un problema di z-index. Il problema di fondo resta:
  1. `_resyncFromCloud` (`src/ui/modals/index.ts`) ha **cinque uscite silenziose** — `cheatNoCloudSync`, credenziali di sessione mancanti, `_resyncing` già in volo, login ≠ `success`, errore di rete col `catch` vuoto: nessuna di queste dice niente all'utente.
  2. Il badge non ha una via di uscita propria: `_setCloudBadge(false)` è raggiungibile **solo** da `markCloudSaved()`, cioè solo dopo un `save-progress` riuscito. In fase pre-wipe ogni push risponde `conflict` e `loadCloudData` esce sul ramo `schemaVersion < 3` senza ripulirlo → badge inchiodato.
  3. Serve uno stato esplicito (idle / sincronizzo… / riuscito / fallito-con-motivo) e la dismissione **disaccoppiata** dal push riuscito.
  Da fare insieme al refactor cloud-sync di `boot.ts` (oggi previsto in 3.5): valutare se anticipare l'estrazione qui.
- 🔊 **Volume dei video evento — normalizzazione delle tracce** (segnalazione QA 02/08/2026; pre-lancio è entrata solo la parte code-side).

  > 🐛 *Il video di Ricardo Milespo versione U Got That è molto basso.*
  > *Il video di Ricardo Milespo versione Metal è molto basso.*
  > *Il video del Rick Espley è molto basso.*

  Chiuso prima del lancio: le due varianti Ricardo non avevano una voce propria in `src/data/assets.ts` (`EventHandlers.video` risolveva il volume con `config.audioId`, sempre `'ricardo-video'`) e `logic.ts` era in disaccordo con `boot.ts:1762`, che cercava già per id reale — toccare il master a metà video cambiava di colpo il volume. Ora ogni video ha la sua voce e **tutti** sono a `defaultVol: 1.0`.

  **Scelta di design da rispettare**: `defaultVol` dei video è livellato — stesso valore per tutti — così resta un guadagno di riproduzione uniforme. Conseguenza voluta: una differenza che si sente è per definizione una differenza della *traccia*, e va corretta nel file, non compensata con numeri diversi per video (che nasconderebbero il problema e renderebbero impossibile ragionare sui livelli). Se un video suona basso: misurarne i LUFS, non ritoccare `assets.ts`.

  **Quel che resta**: il volume finale è `master × musicVolume × defaultVol`, quindi col default (1.0 × 0.5) il tetto assoluto è **0.5** — dal punto di partenza il guadagno massimo era 2× (+6 dB) e l'abbiamo già speso tutto. Se all'ascolto restano bassi le strade sono due, entrambe da 3.1:
  1. **Normalizzare la traccia audio negli mp4** a un target LUFS comune, come già fatto per i suoni arcade (vedi il commento in `arcade/super-espo/js/super-espo.js:1597`). Va rifatto l'upload su R2.
  2. **Disaccoppiare il canale video da `musicVolume`**: oggi è l'unica ragione del tetto a 0.5. Un canale dedicato (o il solo `master`) restituirebbe 6 dB di margine.

  ⚠️ Non misurato: sulla macchina di sviluppo non c'è ffmpeg, quindi i LUFS reali dei tre file non sono noti. Primo passo della 3.1: misurarli.
- 🖥️ **Obiettivi su mobile: titolo ancora troncato.** Il fix pre-lancio ha allargato solo il desktop (`#achievements-modal .modal-content` a 680px). Su mobile la finestra è già a tutta larghezza, quindi l'unica leva è il wrap: `styles/ui/mobile/achievements-modal.css:158` e `styles/mobile.css:1363` ridichiarano `white-space: nowrap` + ellissi. Non toccato la sera prima del rilascio perché fa crescere l'altezza delle righe in un layout a griglia tarato (`trophy-action` su `grid-column: 1 / -1`).
- 🎬 **Anelli orbitali sopra il video evento.** Chiudendo il bug dello sfondo di rarità è emerso che anche i `::before`/`::after` di `#clicker-section` (`ui/desktop/clicker-3d.css:216`) viaggiano sopra il video, come tutto `#game-container` (z 9010 vs 9000). Sono cerchi da 500px al 4-6% di alfa, quindi ai limiti del percettibile: non toccati perché fuori dalla segnalazione. Da spegnere insieme all'ambient se si vuole il video davvero pulito.
- 👕 **Guardaroba: doppio-click come gesto vero** (opzionale). Pre-lancio è stato rimosso l'`ondblclick`, che era codice morto — `showSkinPreview()` appende subito un `.modal-backdrop`, quindi il secondo click non arriva mai alla card — e corretto il tooltip che lo prometteva. Farlo funzionare davvero richiede di ritardare il click singolo di ~250ms, cioè peggiorare la reattività di *ogni* apertura per un gesto che il bottone ▶ già copre: da valutare, non scontato che convenga.
- **Leaderboard season-aware server-side**: la Edge Function `get-leaderboard` deve ritornare la season (oggi il badge in `src/ui/podio.ts` è solo cosmetico/locale). Prerequisito di tutta la roadmap stagionale.
- 2 skin già pronte in `assets/image/future/`: `espostino.png`, `TF2 Ingegnere.png` → cablarle in `src/data/skins.ts`
- QoL piccoli a scelta dal backlog `dev/docs/ui.md`
- 🔐 **Consolidamento secret in un file unico** (vedi dettaglio sotto)
- 🕹️ Arcade: **Stack Overflow** (variante falling-blocks) — riempie lo slot "??? COMING SOON" (`arcade.php`, `modals_arcade.php`).
  ⚠️ Legale: niente clone Tetris 1:1 (trade dress protetto, caso *Tetris v. Xio* 2012). Nome, estetica e almeno una meccanica propri (es. righe di "debito tecnico" che risalgono, blocchi-bug da schiacciare col click).

### 3.1 · Consolidamento secret — dettaglio

**Situazione attuale**: la configurazione è sparsa su **4 file** (non 3), con meccanismi e stati git diversi.

| File | Contiene | Git | Natura |
|---|---|---|---|
| `php/r2-config.php` | endpoint, account_id, bucket, region, **access_key**, **secret_key**, allowed_referers | ignorato ✅ | **segreto vero** |
| `php/trello-config.php` | key, **token**, board, lists, allowed_referers | ignorato ✅ | **segreto vero** |
| `php/config.php` | servername, username, **password**, dbname, instanceName, prodHost, devVersion, prodVersion | **tracciato** ⚠️ | credenziali DB **inerti** (default MAMP, nessun consumer: nessun `mysqli`/`PDO` nel repo) + parametri d'ambiente |
| `src/lib/backend-config.ts` | Supabase url + anon key (dev/prod) | tracciato ✅ | **pubblico by design** (finisce nel bundle client, protetto da RLS) |

**Cosa si unifica e cosa no**

✅ Unificabili: i **3 file PHP server-side** → un unico `php/secrets.php` (gitignored) che fa `return [...]` con sezioni `r2`, `trello`, `app`, più `php/secrets.example.php` tracciato coi placeholder.

❌ **NON unificare Supabase**: `backend-config.ts` non è un file di secret ma di configurazione client — la anon key *deve* finire nel bundle JS, quindi non può vivere in un file PHP server-side. Sono due mondi diversi (server vs client) e mescolarli sarebbe un errore architetturale, non una semplificazione. Resta dov'è.

**Piano di lavoro**

1. Creare `php/secrets.php` (+ `.example`) con struttura a sezioni; aggiungerlo a `.gitignore`; **rimuovere** le voci ora obsolete (`php/r2-config.php`, `php/trello-config.php`)
2. Aggiornare i 3 consumer: `php/get_asset_urls.php`, `music/get_songs.php`, `php/trello-submit.php` (+ `php/r2-sign.php` che riceve l'array come parametro)
3. Un solo helper `secrets(string $section)` con il controllo anti-placeholder **centralizzato** — oggi è duplicato verbatim in `get_asset_urls.php:21-24` e `get_songs.php:21-24`
4. Deduplicare `allowed_referers` (oggi divergono: il template Trello include la variante `www.`, quello R2 no)
5. Separare i **parametri d'ambiente** (`instanceName`, `prodHost`, `devVersion`, `prodVersion`) dai secret: restano in `php/config.php` tracciato, perché la CI li muta via `sed` (`main.yml:42`, `test.yml:36,39`) e devono esistere nel checkout
6. **Rimuovere le credenziali DB morte** da `config.php` (nessuno apre connessioni MySQL): elimina la trappola per cui il file dichiara nei commenti di essere gitignored quando non lo è

**Fix collaterali da chiudere nello stesso giro**

- ⚠️ `scripts/bump-version.js:62` — path costruito come `path.join(__dirname, 'php', 'config.php')` → risolve a `scripts/php/config.php`, che non esiste. Manca un `'..'`: `existsSync` è falso e **l'aggiornamento versione viene saltato in silenzio**, mentre il log stampa comunque "Cache invalidata: sw.js + php/config.php"
- Commenti falsi da correggere: `php/config.example.php:7` e `scripts/e2e-server.js:6` dichiarano che `config.php` è gitignored (non lo è)
- `main.yml:70-91` — la exclude-list FTP non esclude `php/trello-config.example.php` (innocuo, solo placeholder, ma incoerente con gli altri due template)
- **Documentare** che i file di secret, essendo gitignored, non esistono nel checkout CI e vanno caricati a mano su Altervista: oggi non è scritto da nessuna parte
- Difesa in profondità: aggiungere un `<FilesMatch>` in `php/.htaccess` per i file di config (oggi protetti solo i `.sql`)

---

## v3.2 — metà ottobre 2026 · «Halloween» 🎃

- **Sistema stagioni minimo configurabile**: generalizzare `src/data/season.ts` (oggi gestisce solo `christmas`) con config id/date/tema — deve reggere `halloween` + `christmas`. Niente season pass (rimandato).
- **Tema Halloween**: palette arancio/viola, 2-3 skin a tempo, Golden Bug → "Bug Maledetto"
- ⚠️ **Fondamenta CSS**: il tema va costruito con custom properties per tema, NON come quarto strato sulla guerra di `!important` (3 sistemi skin paralleli, vedi `dev/docs/ui.md` P1). Halloween inaugura il pattern; v1 e Natale lo riusano. Con 3 temi in 3 release consecutive, saltare questo passo non è un'opzione.
- 🕹️ Arcade: nessun gioco nuovo — **retint Halloween di Bug Invaders** (invasori fantasma)

## v3.3 — metà novembre 2026 · «Anniversario — Tema v1» 🎂

Il vero anniversario di Espòòò Clicker.

- **Tema "Vintage v1"**: recupero CSS/asset della prima versione dalla git history, impacchettato come tema equipaggiabile **permanente** (è un premio, non un evento a tempo)
- Skin/badge celebrativo + achievement anniversario
- Easter egg: formattazione numeri "alla v1", suoni originali se esistono
- **PWA installabile**: manifest + install prompt (il SW c'è già dalla 3.0) — "installa Espò sul telefono" come regalo d'anniversario
- 🕹️ Arcade: **Flappy Espò** — un input, sessioni da 15s, mobile-first (colma il buco: i 6 giochi attuali sono quasi tutti da tastiera). Grafica in tema v1 per l'occasione.

## v3.4 — inizio dicembre 2026 · «Natale» 🎄

Target uscita **~5 dicembre** (non metà mese): `isChristmasSeason()` attiva da inizio dicembre, e niente deploy sotto le feste.

- **Completamento tema Christmas** (oggi "mezzo-tema", copre solo modali/store — vedi `dev/docs/ui.md` P2), sui binari del sistema temi rodato con Halloween e v1
- 2-3 skin natalizie nuove + evento a tempo
- 🕹️ Arcade: **Q*Bert-like** (nome e personaggio propri: Espò che salta sui blocchi di una codebase "refactorandoli"; nemici = bug e merge conflict). ⚠️ Controlli diagonali su mobile da prototipare presto (d-pad a 45° o swipe). + retint natalizio di Snake Protocol.

## v3.5 — metà gennaio 2027 · «Season 2»

- **Primo rollover stagionale vero**: reset classifica (season-wipe su Supabase production), economia ritoccata (predisposizione "economia inflazionata" in `src/core/bignum.ts`), skin Season 2, badge "veterano Season 1"
- 🎮 **Click Duel 1v1 (bonus multiplayer realtime)**: sfida un amico — 60 secondi, chi fa più bug vince. Invito via sistema amici esistente (`src/ui/social.ts`), match su **Supabase Realtime** (canali broadcast): il browser si collega direttamente a Supabase, Altervista fuori dal percorso, quindi i limiti hosting non contano. Si sincronizzano solo contatori → latency-proof (~100-300ms invisibili). Solo tra amici, niente matchmaking classificato (client non verificabile, coerente con la policy leaderboard). ⚠️ Fusibile: se il tempo stringe, slitta in 4.0.
- **Refactor `boot.ts`** (~2400 righe) — NON negoziabile: estrarre cloud-sync e migrazione di lancio (post-lancio = codice morto isolabile). Prerequisito del 3D di aprile. Obiettivo collaterale: staccare progressivamente il frontend dai PHP includes (sblocca portabilità futura: PWA piena, Pages, wrapper nativi).
- 🕹️ Arcade: nessun cabinato nuovo (release già tripla: Season 2 + multiplayer + refactor)

## v4.0 — aprile 2027 · «Il Mondo di Espo» 🏢

- **Ufficio 3D** (three.js): scena che cresce con gli acquisti — ogni team di `src/data/teams.ts` aggiunge elementi fisici (11 stadi di crescita). Promozione = cambio skybox/ora; Formattazione = ambiente "quantico".
- **Bug 3D interattivi** nella scena (il Golden Bug migra nel mondo e diventa caccia attiva); mascotte Espo con la skin equipaggiata
- **Boss Bug 3D**: debutto del boss settimanale community-wide direttamente nel mondo 3D (barra vita globale condivisa su Supabase)
- Click Duel 1v1 se slittato dalla 3.5
- 🕹️ Arcade: **BUGDOOM** — raycaster stile Wolfenstein 3D fatto in casa (~1000 righe canvas vanilla, niente port WASM/asset id Software). Corridoi di un server in fiamme, bug demoniaci. Teaser tematico perfetto del salto al 3D. Mobile: stick virtuale + auto-fire.
- Vincoli tecnici:
  1. three.js **lazy-load** come chunk separato (mai nel bundle principale — non regredire sui tempi di caricamento sistemati in 3.0)
  2. **Fallback 2D sempre disponibile**: vista 3D = tab/toggle opzionale, il gioco resta identico senza
  3. three.js **bundlato con Vite**, mai da CDN
  4. Scope: low-poly, 11 stadi e basta. Animazioni mascotte, meteo, personalizzazione ufficio → 4.x

---

## Riepilogo arcade e multiplayer

| Release | Gioco / feature | Note |
|---|---|---|
| 3.1 | Stack Overflow (falling blocks) | riempie slot COMING SOON, variante non-clone |
| 3.2 | — (retint Halloween Bug Invaders) | il piatto forte è il tema |
| 3.3 | Flappy Espò | mobile-first, grafica v1 |
| 3.4 | Q*Bert-like "refactoring" | + retint natalizio Snake |
| 3.5 | 🎮 Click Duel 1v1 (multiplayer bonus) | Supabase Realtime, solo tra amici |
| 4.0 | BUGDOOM (raycaster) + Boss Bug 3D | teaser/compagni del mondo 3D |

## Dopo la 4.0 (consapevolmente fuori orizzonte)

- **Espò Pinball** — candidato headline naturale per una 4.x (fisica via matter.js bundlato o a mano, 2-3 settimane, tuning del game feel è il costo vero)
- **Ghost mode Flappy Espò** (replay-fantasma degli amici, asincrono) e **Stack Overflow VS** (versus a eventi stile Tetris 99) — estensioni multiplayer economiche una volta rodato Realtime col Click Duel
- **Presence sul Boss Bug** ("N giocatori stanno combattendo ora") — upgrade quasi gratis via canale presence Supabase
- Season pass, **gilde** (sopra l'infra friends), **English release** (destino `langs/`, overlay `src/data/en/`, modali)
- **Agosto 2027 = primo anniversario del lancio**: Season 3 + grande evento sul mondo 3D
- Steam/wrapper nativi: decisione dopo Season 2-3 con dati in mano; prerequisito già in lavorazione (frontend statico via refactor 3.5)
