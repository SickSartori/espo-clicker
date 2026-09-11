# Roadmap post-3.0 — Espòòò Clicker

> **Stato**: concordata il 21/07/2026 · riverificata il 03/08/2026 · **riorganizzata in fasi il 10/09/2026, dopo l'uscita della 3.1**.
> **Orizzonte**: fino alla **4.0** (aprile 2027). Le due date fisse sono il **17 novembre 2026** (primo compleanno) e **aprile 2027**.
> **Regola arcade**: massimo un cabinato nuovo per release, sempre vanilla JS + canvas, zero CDN esterne *(lezione Phaser/Super Espò)*.
> **Dove si trova cosa**: le release future sono raggruppate per fase qui sotto; il consuntivo della 3.1 è in fondo, in Archivio.

## Quadro generale — 4 fasi

**Due date sono fisse e non si toccano:**

- 🔒 **17 novembre 2026** — primo compleanno di Espòòò Clicker. La data non è simbolica: il commit «Prima versione» è del **17/11/2025**.
- 🔒 **aprile 2027** — la 4.0.

Tutto il resto è stato ritarato per creare margine.

| Fase | Periodo | Release | Data | Tema |
|---|---|---|---|---|
| **0** | 10 → 30 set 2026 | — | *nessuna release* | Fondamenta |
| **1** | ott → dic 2026 | **3.2** | 20 ottobre | Halloween 🎃 |
| | | **3.3** | 🔒 **17 novembre** | Primo compleanno 🎂 |
| | | **3.4** | 15 dicembre | Natale 🎄 |
| **2** | gen → feb 2027 | **3.5** | inizio febbraio | Season 2 |
| **3** | feb → apr 2027 | **4.0** | 🔒 **aprile** | Il Mondo di Espo 🏢 |

### Da dove arriva il margine

Il piano precedente aveva due punti di rottura: **2,5 settimane** fra 3.3 e 3.4 (con la 3.3 inchiodata al compleanno), e una 3.5 **tripla** (Season 2 + multiplayer + refactor) piazzata subito dopo le feste. Quattro correzioni:

1. **3.4 slitta dal ~5 al 15 dicembre.** `isChristmasSeason()` copre 1 dic → 8 gen: uscendo il 15 restano **3,5 settimane** di tema attivo, e il deploy sta lontano dalle feste. → *3.3 → 3.4 passa da 2,5 a 4 settimane.*
2. **3.5 slitta da metà gennaio a inizio febbraio.** Gennaio post-feste è tempo morto, e Season 1 (dal 3 agosto) arriva così a **6 mesi tondi** — un ritmo stagionale naturale. → *3.4 → 3.5 passa da ~4 settimane effettive a ~6.*
3. **Q\*Bert si sposta dalla 3.4 alla 3.5.** La 3.4 deve completare un mezzo-tema: è già una release piena senza un cabinato nuovo. La 3.5 è quella con più spazio.
4. **Il refactor di `boot.ts` esce dalla 3.5 e diventa un filo continuo** dalla Fase 0 in poi. Era il blocco più grosso della release più affollata, ed è il prerequisito della 4.0: spalmarlo lo toglie dal percorso critico. ⚠️ Motivo d'urgenza: il file è **cresciuto** durante la 3.1, da 2394 a **2625 righe**.

### Ritmo per release

~1 settimana di design, 1-2 di implementazione e contenuti, **1 di buffer/test**. Lezione della 3.1: il buffer non è opzionale — era la release "leggera" ed è uscita a 98 commit. La coda di QA di ogni versione erode l'inizio della successiva.

---

## FASE 0 — Fondamenta · 10 → 30 settembre 2026

*Nessuna release.* Si prepara il terreno di tutta la Fase 1, e si chiudono i debiti che la 3.1 ha lasciato aperti.

- 🔴 **Generalizzare `src/data/season.ts`** — **il vero prerequisito della 3.2**, e l'unico bloccante rimasto. Oggi il file gestisce solo `christmas`: `isSeasonActive()` ritorna `false` per qualunque altro id. Serve una config unica (id, finestra di date, tema, skin gatate) capace di reggere `halloween` + `christmas`, sullo stesso principio con cui oggi `IS_XMAS_TIME` gata la skin natalizia in `src/data/skins.ts`.
- ⏳ **Debiti operativi della 3.1** (minuti di lavoro, ma tengono aperte due voci):
  - caricare `php/secrets.php` su Altervista e **solo dopo** togliere il fallback sui due file storici;
  - aggiungere la voce `labels` alla sezione `trello` del secrets **dell'area di test**.
- 🎨 **Cablare 2-3 skin** dei **7 bozzetti** fermi in `assets/image/future/` (ordinati per rarità, nessuno ancora in `src/data/skins.ts`). Da qui in avanti se ne cablano 2-3 per release invece di accumularle: è contenuto già disegnato che non costa nulla.
- 🔧 **Prima estrazione da `boot.ts`**: il **cloud-sync**. È il candidato naturale — la nota sul badge cloud lo segnala già da luglio — ed è codice che la 3.1 ha appena messo a posto, quindi si estrae a logica fresca. Dopo gli hotfix del 10/09 il blocco comprende anche `snapshotCloudMeta` (istantanea unica blob + metadati), il freno `CLOUD_MAX_AUTO_RESYNC` col badge `conflict-loop` e il canale `cloudTrace`: vanno estratti insieme, e la rete che li protegge è già lì — `cloud-badge`, `cloud-conflict-loop`, `offline-return` in `dev/tests/e2e`.
- 🧹 **Aggiornare `dev/docs/ui.md`**: è stale. La voce P2 sulla navbar chiede ancora «servirebbe un overflow menu», che la 3.1 ha costruito (menu ☰, barra da 210 a 114px su 375).

---

## FASE 1 — La stagione dei temi · ottobre → dicembre 2026

Tre temi in tre release. Girano tutti sullo **stesso binario già esistente**: un tema è un `themeConfig` su una skin (`cssFile`, `bodyClass`, `vfx`, `specialMusic`, `goldenBugIcon`, `goldenBugColor`), caricato da `loadThemeCSS()` (`src/ui/render/index.ts:2526`). Halloween lo rileva, compleanno e Natale lo riusano: il secondo e il terzo tema costano meno del primo.

### v3.2 — 20 ottobre 2026 · «Halloween» 🎃

*Live per la finestra 24 ottobre → 2 novembre.*

- **Tema Halloween**: palette arancio/viola, 2-3 skin a tempo, Golden Bug → **«Bug Maledetto»**
- **Debutto del sistema stagioni** costruito in Fase 0: è la prima stagione a calendario che non sia Natale
- ✅ **Fondamenta CSS — la premessa era sovradimensionata** (verifica 10/09/2026). Il tema **non** richiede di rifondare il CSS prima: ci sono già **3 temi** su questo binario — `8bit-theme.css` (484 righe, 44 selettori), `christmas-theme.css` (318, 25), `super-theme.css` (610) — e **i file tema sono puliti**: `!important` = 1 in christmas, 1 in 8bit. La "guerra di `!important`" è altrove e non li tocca: `styles/ui/desktop/super-theme.css` (**182**) e `styles/ui/desktop/skins-modal.css` (**132**), due file specifici. Il consolidamento a custom properties (`dev/docs/ui.md` P1) resta lavoro utile ma **non bloccante**: si fa mirato, quando conviene.
- 🕹️ Arcade: nessun cabinato nuovo — **retint Halloween di Bug Invaders** (invasori fantasma)
- 🔧 Filo refactor: seconda estrazione da `boot.ts`
- 🛡️ **Guardia anti doppia scheda** — dalla segnalazione del 10/09/2026 (loop «Progressi scaricati dal Cloud!»): la 3.1.8 lo **frena** (tre riallineamenti automatici, poi badge che dice «un'altra scheda o dispositivo sta salvando»), questa lo **previene**. `BroadcastChannel` sulla stessa origine: la scheda che perde il focus smette di spingere sul cloud e lo dice a schermo; al ritorno riallinea una volta e riprende. Copre solo lo stesso browser — fra dispositivi diversi il canale non c'è, e lì resta il freno.
- ☁️ **Conflitto con i numeri del server** — la EF `save-progress` risponde solo `(Score)`; deve restituire anche `score`, `prestige_level`, `total_formattazioni`, `season` della riga di classifica. La riga `[Save✗ CONFLICT #n]` in console (3.1.8, `cloudTrace`) stampa già i numeri del client e dell'ultimo cloud adottato: con quelli del server dice tutto senza dover indovinare. Modifica piccola — Edge Function (dev e prod tengono lo stesso sorgente) più una riga nel client.

### v3.3 — 🔒 17 novembre 2026 · «Primo compleanno» 🎂

*Data fissa: un anno esatto dal commit «Prima versione» (17/11/2025).*

- **Tema «Vintage v1»**: recupero di CSS e asset della prima versione dalla git history, impacchettato come tema equipaggiabile **permanente** — è un premio, non un evento a tempo
- **Skin/badge celebrativo** + achievement anniversario
- **Easter egg**: formattazione numeri "alla v1", suoni originali se esistono
- ⚠️ **PWA — in gran parte già c'è** (verifica 10/09/2026): `manifest.json` esiste ed è linkato (`index.php:28`) con `display: standalone` e icone 192/512 `maskable` in `assets/image/icons/`; il service worker è registrato (`index.php:431`). **Il gioco è con ogni probabilità già installabile oggi.** Resta il solo `beforeinstallprompt` custom, cioè l'*invito* a installare — ~1 giorno, non una feature. Primo passo: provarlo da telefono, poi decidere se serve il prompt o basta comunicarlo come regalo di compleanno.
- 🕹️ Arcade: **Flappy Espò** — un input, sessioni da 15 secondi, mobile-first (colma il buco: i cabinati attuali sono quasi tutti da tastiera). Grafica in tema v1 per l'occasione.
- 🔧 Filo refactor: terza estrazione da `boot.ts`

### v3.4 — 15 dicembre 2026 · «Natale» 🎄

*Slittata dal ~5 dicembre per dare respiro dopo il compleanno. Restano 3,5 settimane di tema attivo (`isChristmasSeason()` copre fino all'8 gennaio) e il deploy sta lontano dalle feste.*

- **Completamento del tema Christmas** — oggi è un mezzo-tema dichiarato (`dev/docs/ui.md` P2): 318 righe e 25 selettori contro i 484/44 di 8bit, quindi modali e store restano base. Sui binari ormai rodati da Halloween e v1.
- **2-3 skin natalizie nuove** + evento a tempo
- 🕹️ Arcade: nessun cabinato nuovo — **retint natalizio di Snake Protocol**. *(Q\*Bert spostato in 3.5: completare un mezzo-tema è già una release piena.)*
- 🔧 Filo refactor: quarta estrazione da `boot.ts` — a fine Fase 1 il grosso deve essere fuori

---

## FASE 2 — Season 2 · gennaio → febbraio 2027

Gennaio è tempo di sviluppo, non di release: le feste tolgono 2-3 settimane effettive. Si esce a inizio febbraio, quando Season 1 compie **6 mesi tondi** dal lancio del 3 agosto.

### v3.5 — inizio febbraio 2027 · «Season 2»

- **Primo rollover stagionale vero**: reset classifica (season-wipe su Supabase production), economia ritoccata (predisposizione "economia inflazionata" in `src/core/bignum.ts`), skin Season 2, badge **«veterano Season 1»**. ⚠️ La costante `CURRENT_SEASON` della Edge Function `get-leaderboard` va bumpata a mano a ogni nuova Season.
- 🎮 **Click Duel 1v1 — multiplayer realtime**: sfida un amico, 60 secondi, chi fa più bug vince. Invito dal sistema amici esistente (`src/ui/social.ts`), match su **Supabase Realtime** (canali broadcast): il browser parla direttamente con Supabase, Altervista è fuori dal percorso, quindi i limiti dell'hosting non contano. Si sincronizzano solo contatori → **latency-proof** (100-300ms invisibili). Solo fra amici, niente matchmaking classificato — il client non è verificabile, coerente con la policy della classifica.
- 🕹️ Arcade: **Q\*Bert-like** (spostato dalla 3.4) — nome e personaggio propri: Espò salta sui blocchi di una codebase "refactorandoli", i nemici sono bug e merge conflict. ⚠️ I controlli diagonali su mobile vanno prototipati subito (d-pad ruotato a 45° o swipe): è lì che il gioco si gioca o si rompe.
- 🔧 **Chiusura del refactor `boot.ts`** — quel che resta dopo le estrazioni di Fase 1. Obiettivo collaterale: staccare progressivamente il frontend dai PHP includes, che sblocca la portabilità futura (PWA piena, Cloudflare Pages, wrapper nativi).

---

## FASE 3 — Il salto · febbraio → aprile 2027

Dalla 3.5 alla 4.0 restano ~8 settimane piene, su una base già ripulita dal refactor. È la finestra più lunga della roadmap, ed è deliberato: la 4.0 è la cosa più grande mai fatta sul progetto.

### v4.0 — 🔒 aprile 2027 · «Il Mondo di Espo» 🏢

- **Ufficio 3D** (three.js): la scena cresce con gli acquisti — ogni team di `src/data/teams.ts` aggiunge elementi fisici (11 stadi di crescita). Promozione = cambio skybox/ora del giorno; Formattazione = ambiente "quantico".
- **Bug 3D interattivi**: il Golden Bug migra nel mondo e diventa caccia attiva; la mascotte gira per l'ufficio con la skin equipaggiata
- **Boss Bug 3D**: debutto del boss settimanale community-wide, barra vita globale condivisa su Supabase
- 🕹️ Arcade: **BUGDOOM** — raycaster stile Wolfenstein 3D fatto in casa (~1000 righe di canvas vanilla, niente port WASM né asset id Software). Corridoi di un server in fiamme, bug demoniaci. Teaser tematico perfetto del salto al 3D. Mobile: stick virtuale + auto-fire.
- **Vincoli tecnici** (non negoziabili):
  1. three.js in **lazy-load** come chunk separato — mai nel bundle principale, per non regredire sui tempi di caricamento sistemati nella 3.0
  2. **Fallback 2D sempre disponibile**: la vista 3D è un tab/toggle opzionale, il gioco resta identico senza
  3. three.js **bundlato con Vite**, mai da CDN *(lezione Phaser/Super Espò)*
  4. Scope: **low-poly, 11 stadi e basta**. Animazioni della mascotte, meteo, personalizzazione dell'ufficio → 4.x

---

## Riepilogo arcade e multiplayer

| Release | Data | Cabinato / feature | Note |
|---|---|---|---|
| 3.1 ✅ | 04 set 2026 | **Stack Overflow** | uscito — variante non-clone, ha riempito lo slot COMING SOON |
| 3.2 | 20 ott 2026 | — | retint Halloween di Bug Invaders |
| 3.3 | 17 nov 2026 | **Flappy Espò** | mobile-first, grafica v1 |
| 3.4 | 15 dic 2026 | — | retint natalizio di Snake |
| 3.5 | feb 2027 | **Q\*Bert-like** + 🎮 **Click Duel 1v1** | Supabase Realtime, solo fra amici |
| 4.0 | apr 2027 | **BUGDOOM** + Boss Bug 3D | compagni del mondo 3D |

## Dopo la 4.0 (consapevolmente fuori orizzonte)

- **Espò Pinball** — candidato headline naturale per una 4.x (fisica via matter.js bundlato o scritta a mano, 2-3 settimane: il tuning del game feel è il costo vero)
- **Ghost mode Flappy Espò** (replay-fantasma degli amici, asincrono) e **Stack Overflow VS** (versus a eventi stile Tetris 99) — estensioni multiplayer economiche una volta rodato Realtime col Click Duel
- **Presence sul Boss Bug** ("N giocatori stanno combattendo ora") — upgrade quasi gratis via canale presence Supabase
- **Season pass**, **gilde** (sopra l'infrastruttura amici esistente), **English release** (destino di `langs/`, completamento overlay `src/data/en/`, traduzione modali)
- **Consolidamento CSS a custom properties** (`dev/docs/ui.md` P1) sui due file caldi: `styles/ui/desktop/super-theme.css` (182 `!important`) e `skins-modal.css` (132)
- **Agosto 2027 = primo anniversario del lancio**: Season 3 + grande evento sul mondo 3D
- **Steam / wrapper nativi**: decisione dopo Season 2-3 con i dati in mano. Il prerequisito è già in lavorazione — il refactor di Fase 1-2 stacca il frontend dai PHP includes.

---

# Archivio

## v3.1 — ✅ USCITA il 04/09/2026 (3.1.6) · hotfix 3.1.7 e 3.1.8 il 10/09 (tag `v3.1-Release`, che segue l'ultimo merge in `main`) · «Migliorie e bugfix»

> **Consuntivo (10/09/2026).** 98 commit dal lancio, ~5 settimane, uscita **in anticipo** sulla data prevista (metà settembre).
> Era pianificata come la release leggera: è stata la più grande del post-lancio. Lo scarto è quasi tutto **QA reale** arrivata coi giocatori veri — revisione mobile completa (menu ☰, tutte le finestre a schermo pieno, due audit da 12 finestre, arcade in verticale), 4 segnalazioni sugli Amici, 2 giri di bilanciamento, le riparazioni Fondatore.
> **Dal piano originale è rimasto fuori un solo punto**: le skin di `assets/image/future/` (oggi **7 bozzetti** ordinati per rarità) non sono ancora cablate in `src/data/skins.ts`. La leaderboard season-aware si è rivelata già fatta server-side (resta il campo in risposta, voce minore).
> ⏳ **Debiti operativi aperti** — non codice, ma bloccano la chiusura di due voci: caricare `php/secrets.php` su Altervista e poi togliere il fallback sui due file storici; aggiungere la voce `labels` alla sezione `trello` del secrets **dell'area di test**.
>
> 🩹 **Hotfix del 10/09/2026.** **3.1.7** — il modale «Bentornato» non compariva mai sul rientro normale: `loadCloudData` usciva con `return` sul ramo «vince il locale» prima di `checkOfflineProgress()`, e l'autosave riscriveva `lastSaveTimestamp` entro 30s (mai consegnati i guadagni offline, mai il toast di sync); la Formattazione azzerava i flag d'account — il popup «come si segnala» tornava a ogni Format — ora la lista è `PRESTIGE_PERSISTENT_KEYS` (`game/prestige.ts`, con test); il popup ha un ritmo settimanale (`feedbackIntroAt`) ed esce anche dopo il login esplicito. **3.1.8** — loop di riallineamento cloud (un giocatore, 30 save/min e un login ogni 2-5s nei log prod): lo `score` per la classifica era letto dopo tre `await` e finiva avanti al blob (`snapshotCloudMeta`), `_resyncFromCloud` rispingeva subito, e il tocco sul badge non aveva freno — ora tre riallineamenti automatici poi badge `conflict-loop`; la traccia `[Save✗ …]` esce in console anche senza `DEBUG_MODE` (`cloudTrace`). Rete: `offline-return`, `cloud-conflict-loop`, `feedback-intro` in `dev/tests/e2e`. **3.1.10** — il muro dei numeri grandi, trovato ispezionando lo stesso account: il client manda `Decimal.toFixed(0)`, cioè l'espansione decimale completa (401 cifre per 1e400), e **tre punti la interpretavano con `Number`/`float8`**, che oltre ~1,8 × 10³⁰⁸ è `Infinity`. La RPC `save_progress` **sollevava `22003`** → EF 500 → salvataggi cloud fermi per sempre (era un blocco definitivo, non un rallentamento); `compareDecimalStrings` rispondeva «pari» a qualunque coppia là sopra, disarmando l'anti-rollback; `get-leaderboard` ordinava con `parseFloat` → `NaN` → classifica mescolata in cima. Ora si confronta sulle **cifre**: `numeric` nella RPC (migrazione `save_progress_confronto_numeric`, dev+prod), scomposizione in cifre+potenza nel client e nella EF. In più il confronto è ora *esatto* anche sotto la soglia, dove `float8` a 5 × 10²⁰ non distingueva due punteggi a meno di ~65.000.

- Coda hotfix post-lancio
- ~~☁️ **Badge cloud-sync — rifacimento**~~ ✅ **FATTO il 03/08/2026** (segnalazione QA 31/07/2026; pre-lancio era entrata solo la mitigazione: tap → nascondi badge + toast).

  **Com'è stato chiuso.** Le due cause sono state affrontate separatamente:
  1. `_resyncFromCloud` e `_silentTokenRefresh` ora restituiscono **sempre** `{ ok, reason }` invece di uscire con un `return` nudo. Chi le chiama in automatico (`saveGame`) può ignorare l'esito; il tap sul badge ci costruisce sopra il messaggio.
  2. Il badge ha un **ciclo proprio**: `problem → syncing → ok | failed`. Lo stato `ok` si nasconde da solo dopo 2.5s, quindi la dismissione non passa più da `markCloudSaved()` — cioè non dipende più da un push cloud riuscito, che era il punto della causa 2.

  **Scelta presa strada facendo**: quando l'esito è `nocreds` o `login` non si mostra un errore da ritentare ma si apre direttamente il login, sia che lo si sappia già dal motivo del badge sia che lo si scopra dall'esito. Altrimenti servivano **due** tap — uno per scoprire il motivo, uno per agire — che è la stessa sensazione di "non succede niente" che il rifacimento elimina.

  **Verifica**: `dev/tests/e2e/cloud-badge.spec.ts`, 6 test (comparsa, stato intermedio visibile, auto-nascondimento, fallimento che resta a schermo col motivo, login al primo tap, esiti di tutte le uscite prima mute). Usano l'orologio finto di Playwright perché il badge compare solo dopo 90s di fallimenti. ⚠️ Nota per chi ci metterà mano: le credenziali di sessione **non** vanno messe prima del boot, o parte l'auto-login vero e il test diventa intermittente.

  > 🔁 **Ricontrollato il 07/08/2026**, perché la voce è ricomparsa nella lista QA pre-3.1: **nessun lavoro residuo**, la segnalazione è anteriore al rifacimento (31/07 vs commit `a9d32ba` del 03/08). I 6 test passano su `develop`; il click di Playwright verifica anche l'*actionability*, quindi copre pure l'ipotesi «un overlay lo intercetta» (e il `#toast-container` sta in alto ed è `pointer-events: none`). Unico spigolo noto, ed è corretto così: dopo un resync riuscito il badge dice «✓ sincronizzati» e se il push successivo fallisce di nuovo torna a «problema» — la differenza col difetto originale è che ora **parla**, prima taceva.

  > 🐛 *Cliccando "Progressi dietro al cloud — tocca per sincronizzare" non succede niente.*
  > *Il pulsante non sembra fare nulla al click da PC, né scompare il messaggio: rimane fisso.*

  Verificato che il click **arriva** al badge (hit-test `elementFromPoint`: nessun overlay lo intercetta), quindi non è un problema di z-index. Il problema di fondo resta:
  1. `_resyncFromCloud` (`src/ui/modals/index.ts`) ha **cinque uscite silenziose** — `cheatNoCloudSync`, credenziali di sessione mancanti, `_resyncing` già in volo, login ≠ `success`, errore di rete col `catch` vuoto: nessuna di queste dice niente all'utente.
  2. Il badge non ha una via di uscita propria: `_setCloudBadge(false)` è raggiungibile **solo** da `markCloudSaved()`, cioè solo dopo un `save-progress` riuscito. In fase pre-wipe ogni push risponde `conflict` e `loadCloudData` esce sul ramo `schemaVersion < 3` senza ripulirlo → badge inchiodato.

     > 🔎 *Verifica 03/08/2026*: le due cause reggono ancora (le 5 uscite sono intatte in `_resyncFromCloud`; l'unico chiamante nuovo di `_setCloudBadge(false)` è la mitigazione al tap, `boot.ts:242`), **ma la premessa della causa 2 è decaduta in production**: il season-wipe è avvenuto (`leaderboard` ha solo righe season 1) e la RPC `save_progress` accetta il season-flip, quindi il push non risponde più `conflict` per quel motivo. Il ramo `_cloudPreWipe` **non è codice morto**: scatta ancora per chi rientra con un cloud save a `schemaVersion < 3`, cioè chi non fa login dal lancio. Il rifacimento va quindi progettato sul caso "token/rete", non più su quello di lancio.

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

  ✅ **Misurati il 03/08/2026** (ffmpeg ora installato sulla macchina di sviluppo, `loudnorm=print_format=json` sui file in `assets/video/`):

  | File | Integrated | True peak | LRA | QA |
  |---|---|---|---|---|
  | `britney-espoars-video.mp4` | **-13.59** LUFS | **+0.23** dBTP ⚠️ | 5.1 | — |
  | `bigbang-espoclicker.mp4` | -13.68 LUFS | -3.09 dBTP | 2.8 | — |
  | `ricardo-milespo-dota-video.mp4` | -20.39 LUFS | -8.25 dBTP | 9.5 | — |
  | `ricardo-milespo-metal-video.mp4` | **-21.55** LUFS | -11.45 dBTP | 1.4 | 🐛 «molto basso» |
  | `ricardo-milespo-video.mp4` (U Got That) | **-24.99** LUFS | -13.15 dBTP | 2.7 | 🐛 «molto basso» |
  | `rick-espley-video.mp4` | **-34.48** LUFS | -19.95 dBTP | 4.4 | 🐛 «molto basso» |

  **Diagnosi**: i tre file segnalati dal QA sono esattamente i tre più bassi, e lo scarto tra l'estremo alto (Britney) e quello basso (Rick Espley) è di **~21 dB**. Nessun ritocco di `defaultVol` poteva colmarlo — erano già tutti a 1.0, cioè a saturazione. La scelta di design sopra (livellare la *traccia*, non il numero) è quindi confermata dai dati.

  Le due strade non erano alternative, risolvevano problemi diversi: la **1 era necessaria** (è l'unica che chiude i 21 dB di scarto *fra* i video), la **2 restava disponibile** per il livello assoluto — a -16 LUFS col tetto a 0.5 si ascolta a ~-22 LUFS effettivi, e sganciare il canale video da `musicVolume` avrebbe restituito quei 6 dB.

  ❌ **Strada 2 scartata all'ascolto** (03/08/2026): normalizzati i file, il livello in produzione convince così com'è. Il canale video resta agganciato a `musicVolume`, che è anche il comportamento più prevedibile per chi usa il mixer — abbassare la musica abbassa anche i video. Da riaprire solo se arriva una segnalazione di volume basso *dopo* la normalizzazione: a quel punto il margine c'è ed è documentato qui.

  **Target scelto: -16 LUFS** per tutti e sei, con **solo guadagno lineare, niente limiting** (la dinamica delle tracce resta quella originale). Da preferire a -23.9 LUFS (il target dei suoni arcade, `super-espo.js:1597`): lì c'era margine, qui il tetto di riproduzione è già 0.5 e abbassare tutti sarebbe controproducente.

  ✅ **FATTO il 03/08/2026** — strada 1 eseguita. Risultato misurato sui file in repo:

  | File | Prima | Dopo | Guadagno | True peak |
  |---|---|---|---|---|
  | `britney-espoars-video.mp4` | -13.59 | **-15.91** | -2.41 dB | -1.94 dBTP |
  | `bigbang-espoclicker.mp4` | -13.68 | **-16.09** | -2.32 dB | -5.53 dBTP |
  | `ricardo-milespo-dota-video.mp4` | -20.39 | **-16.02** | +4.39 dB | -3.84 dBTP |
  | `ricardo-milespo-metal-video.mp4` | -21.55 | **-16.04** | +5.55 dB | -5.87 dBTP |
  | `ricardo-milespo-video.mp4` | -24.99 | **-16.04** | +8.99 dB | -4.05 dBTP |
  | `rick-espley-video.mp4` | -34.48 | **-16.46** | +17.84 dB | -1.16 dBTP |

  Lo scarto fra i video passa da **~21 dB a 0.55 dB**. Il clipping di Britney (+0.23 dBTP) è rientrato.

  ⚠️ **Rick Espley ha avuto un guadagno più basso del previsto** (+17.84 invece di +18.5, quindi -16.46 anziché -16.00): a +18.48 dB chiudeva a **-0.36 dBTP**, formalmente sotto lo zero ma troppo tirato — l'encoder AAC introduce picchi inter-sample e alcuni decoder ci clippano sopra. Mezzo dB di target sacrificato per 1 dB di margine sui picchi: inudibile, e resta guadagno lineare (nessun limiter). Se un domani si rifà, non alzarlo "per arrivare a -16 preciso".

  **Come sono stati prodotti** (da ripetere identico se si rifanno):
  `ffmpeg -i in.mp4 -c:v copy -af "volume=<gain>dB" -c:a aac -b:a <bitrate originale> -ar 48000 -ac <canali originali> -movflags +faststart out.mp4`
  Video ricopiato bit per bit (`-c:v copy`): risoluzione, codec e numero di frame invariati su tutti e sei, verificato con ffprobe. L'unico scarto è il contenitore del Big Bang, +18 ms di padding AAC in coda — audio e video partono entrambi da pts 0, quindi **nessuno sfasamento A/V**.

  ✅ **Caricati su R2 il 03/08/2026** e verificati con `rclone check --checksum`: 6 file corrispondenti, 0 differenze. La produzione serve l'audio normalizzato (`assets/video/**` è escluso dall'FTP, in prod li serve il bucket).

  ✅ **Voce chiusa il 03/08/2026**: livello approvato all'ascolto in produzione, strada 2 scartata (vedi sopra). Nessun lavoro residuo.

  🐛 **Difetto collaterale emerso**: `britney-espoars-video.mp4` è in clipping (**+0.23 dBTP**). La normalizzazione lo risolve da sé (-2.4 dB).

  ⚠️ **Vincoli del re-encode**: ricodificare **solo l'audio** (`-c:v copy`) per non perdere qualità video, e **mantenere il faststart** (`-movflags +faststart`, moov in testa) — senza, i video non partono in streaming da R2. Poi rifare l'upload su R2.
- 🖥️ **Obiettivi su mobile: titolo ancora troncato.** Il fix pre-lancio ha allargato solo il desktop (`#achievements-modal .modal-content` a 680px). Su mobile la finestra è già a tutta larghezza, quindi l'unica leva è il wrap. Non toccato la sera prima del rilascio perché fa crescere l'altezza delle righe in un layout a griglia tarato (`trophy-action` su `grid-column: 1 / -1`).

  > 🔎 *Verifica 03/08/2026 — correzione*: **è un file solo, non due**. `styles/mobile.css:1365` dichiara già `white-space: normal`, ma **perde per specificità** (`html body #achievement-list .trophy-title`, 1 ID) contro `styles/ui/mobile/achievements-modal.css:162` (`html body #achievements-modal #achievement-list .trophy-title` + `overflow:hidden` + `text-overflow:ellipsis`, 2 ID). Il fix è lì: togliere il `nowrap` nel file specifico, e la regola di `mobile.css` fa già il resto.
- 🎬 **Anelli orbitali sopra il video evento.** Chiudendo il bug dello sfondo di rarità è emerso che anche i `::before`/`::after` di `#clicker-section` (`ui/desktop/clicker-3d.css:216`) viaggiano sopra il video, come tutto `#game-container` (z 9010 vs 9000). Sono cerchi da 500px al 4-6% di alfa, quindi ai limiti del percettibile: non toccati perché fuori dalla segnalazione. Da spegnere insieme all'ambient se si vuole il video davvero pulito.
- 👕 **Guardaroba: doppio-click come gesto vero** (opzionale). Pre-lancio è stato rimosso l'`ondblclick`, che era codice morto — `showSkinPreview()` appende subito un `.modal-backdrop`, quindi il secondo click non arriva mai alla card — e corretto il tooltip che lo prometteva. Farlo funzionare davvero richiede di ritardare il click singolo di ~250ms, cioè peggiorare la reattività di *ogni* apertura per un gesto che il bottone ▶ già copre: da valutare, non scontato che convenga.
- **Leaderboard season-aware server-side** — ⚠️ **quasi tutta già fatta**, la voce si riduce di molto (verifica 03/08/2026 sul progetto production):
  - ✅ `get-leaderboard` (v2) filtra già server-side: `.eq("season", CURRENT_SEASON)` con `CURRENT_SEASON = 1` — le righe pre-lancio sono season 0 e restano invisibili. Bump manuale della costante a ogni nuova Season.
  - ✅ `save-progress` inoltra `p_season` alla RPC `save_progress`, che gestisce il season-flip lato DB.
  - ✅ Il wipe è avvenuto: la tabella `leaderboard` in production contiene **solo** righe season 1.
  - ❌ **Quel che resta**: la Edge Function non *ritorna* la season, quindi il badge di `src/ui/podio.ts:53` la legge ancora da `gameState.season` (locale/cosmetico). Lavoro residuo: un campo in risposta + la lettura client-side.
  - ⚠️ **Vincolo sul formato**: la risposta è oggi un **array nudo** con i nomi campo compatibili col client PHP legacy. Incapsularla in `{season, entries}` lo romperebbe: usare un campo per riga o un header, oppure versionare l'endpoint.
- Skin future in `assets/image/future/`: **7 bozzetti**, riorganizzati in cartelle per rarità (`comune/`, `rara/`, `epica/`, `leggendaria/`, `divina/`) — nessuno ancora cablato in `src/data/skins.ts`. I due della voce originale (`espostino.png`, `TF2 Ingegnere.png`) sono in `comune/`. ⚠️ Al 03/08/2026 la riorganizzazione è **non committata** (vecchie path risultanti cancellate, cartelle nuove untracked): committarla prima di cablare.
- ✅ **Popup «come si segnala» — una tantum** (chiesto il 06/08/2026, fatto lo stesso giorno). Serve a far scoprire la funzione Segnala a chi non sa che esiste: tre passi, dove trovarla e cosa scriverci, più un pulsante che porta dritto alla scheda.
  - **Ordine**: parte **dopo** le note di rilascio, mai insieme — si accoda alla loro chiusura (`src/ui/modals`). Se non ci sono note da mostrare parte da solo, **ma solo a chi ha già cliccato almeno una volta**: a un giocatore appena arrivato non serve, e verificando è emerso che senza quel vincolo compariva anche a save vuoto.
  - **Flag nel save** (`seenFeedbackIntro`), non in localStorage: viaggia col cloud, quindi non ricompare cambiando dispositivo. Segnato come visto all'**apertura**, non alla chiusura: un reload col popup a schermo non deve ripresentarlo per sempre.
  - 🛠️ **Cheatboard → Sistema → «Simula primo avvio versione»**: riabbassa di una minor la versione nel save e azzera il flag, poi ricarica. Rigioca tutta la sequenza (note di rilascio → popup) senza toccare i progressi. ⚠️ `saveGame()` spinge anche sul cloud, quindi su altri dispositivi le note ricompariranno una volta.
  - Verifica: `dev/tests/e2e/feedback-intro.spec.ts`, 6 test (ordine, una-tantum, i due pulsanti, niente popup ai nuovi, cheat).
- 🐛 **Corretto strada facendo**: chiudendo la sala giochi dal gioco principale venivano terminati cinque cabinati su sette — mancava `exitStackGame`, quindi il ciclo di disegno di Stack Overflow restava vivo in sottofondo (`src/ui/modals`).
- ✅ **Mobile: Aiuto/Segnala raggiungibile + audit finestre** (06/08/2026). `#open-help-btn` era nascosto su mobile sotto «nascondiamo il superfluo» — sensato quando l'Aiuto era solo una guida, ma da quando contiene la scheda Segnala significava **nessuna via per segnalare da telefono**, col popup 3.1 che istruiva ad aprire un menu inesistente. Riacceso: lo spazio c'è (6 icone × 35px = 210 su 375). Nello stesso giro, **X su Configurazione** (unica finestra senza uscita in testa: si chiudeva solo con «Chiudi & Salva» in fondo, dopo scroll) — la X **salva come il pulsante**, così non esistono due semantiche di chiusura; su mobile andava anche rimossa la vecchia regola che la nascondeva, messa proprio perché all'epoca la X non salvava. **Audit di tutte le 10 finestre a 375×812**: geometria a posto ovunque (zero sforamenti, chiusure raggiungibili, niente scroll orizzontale) — il difetto era solo l'accesso. Guardia: `dev/tests/e2e/mobile-nav.spec.ts` (backend simulato: il 429 del dev apre il login sopra tutto e falserebbe i tap).
- ✅ **Mobile: menu ☰ per le voci secondarie** (06/08/2026). Riacceso l'Aiuto, la barra era a 7-8 icone da 35px **senza etichetta**: il problema non era solo lo spazio ma la leggibilità (otto simboli criptici si distinguono peggio di tre). Ora in barra restano solo le voci che portano **informazione che cambia** — ☰ (con la pallina se c'è da riscuotere), Promozione (mostra la %), Profilo (badge amici) — e le altre sei stanno in un menu dove hanno **icona + nome**. Misurato: barra da 210px occupati a 114 su 375.
  - **Le voci non duplicano logica**: inoltrano il click al pulsante vero della navbar (`data-opens`), che su mobile è nascosto ma resta nel DOM col suo handler. Un solo punto sa come si apre ogni finestra; aggiungere una voce = aggiungere un `<button>` in `modals.php`.
  - **Badge**: `hasClaimable` degli Obiettivi si rispecchia sulla voce **e** sul ☰ — senza, mettendo Obiettivi nel menu la notifica sparirebbe dalla vista. Guidato dallo stesso stato del badge in barra, quindi non possono divergere.
  - ⚠️ **Trappola trovata**: l'icona `menu` non esisteva. Il set lucide è **tree-shaken** (`src/ui/icons/lucide-init.ts`): un `data-lucide` non registrato lascia un `<i>` vuoto, cioè un pulsante invisibile ma cliccabile. Chi aggiunge icone deve registrarle lì.
  - 🎨 **Logo al centro**: con le voci nel menu il centro della barra restava vuoto. Riempito con `ico.svg` — l'emblema SENZA scritta (`logo.svg` include il testo). Centratura **assoluta**, non flex: da elemento di flusso sarebbe centrato solo finche' i lati pesano uguale, e Promozione compare/sparisce col progredire della partita. I gruppi della navbar tornano contenitori veri (erano `display:contents`), cosi' il centro resta libero in entrambi gli stati.
  - ⚠️ **Trappola CSS**: dare `position: relative` a `#game-navbar` per ancorare il logo la fa **collassare a larghezza-contenuto** — e' `position: fixed; width:100%` (`styles/base/navbar.css`). Misurati 192px invece di 375, con tutti i pulsanti ammassati a sinistra. Un `fixed` fa gia' da riferimento per un figlio assoluto: la riga non serviva. C'e' un'asserzione sulla larghezza apposta.
  - Verifica: `dev/tests/e2e/mobile-menu.spec.ts` (6 test: barra essenziale, logo centrato e non sovrapposto, **ogni voce apre esattamente la finestra giusta**, nomi e bersagli ≥44px, pallina, e desktop invariato). Aggiornato `mobile-nav.spec.ts`, che asseriva il vecchio percorso: ora verifica l'esito (Segnala raggiungibile) invece della strada.
- ✅ **Audit finestre mobile #2** (06/08/2026, dopo menu ☰ e logo). Riaperte tutte e 12 le finestre a 375×812 **dal percorso vero** (menu/barra, non chiamate dirette): geometria a posto ovunque — zero sforamenti, niente scroll orizzontale, chiusure 46×46. Due difetti trovati e chiusi:
  - 🐛 **Obiettivi: la percentuale era tagliata**. `.t-prog-text` ha nella regola mobile `inset: 0`, ma quella base porta `width: 140%` + `transform: translateX(-50%)` (centratura desktop su `left: 50%`) e **non venivano azzerati**: l'etichetta era larga 449px su una scheda da 350, sbordava di 225px e il contenitore (`overflow: hidden`) le tagliava la testa — di «60% (3 / 5)» si leggeva solo «3 / 5)». Corretto con `width: auto; transform: none`.
  - 🐛 **Sala Giochi muta col popup bloccato**. Dalla 3.0 l'arcade non è più un modale: `window.open('arcade.php')`. Se il browser blocca il popup — comune su mobile — `window.open` torna `null` e **non succedeva nulla**: nessuna scheda, nessun messaggio. Ora ripiega sulla stessa scheda; `arcade.php` lo prevede già (il suo close fa `window.close()` e poi torna a `index.php`). Guardia: `dev/tests/e2e/arcade-open.spec.ts`.
  - ℹ️ Emerso che `includes/modals_arcade.php` è **markup morto**: 8 voci di gioco nel DOM a ogni caricamento, mai aperte (nessun ramo lo mostra). Non rimosso — decisione da prendere a parte.
- ✅ **Schermo pieno uniforme su mobile** (06/08/2026). Regola decisa: su telefono **tutte** le finestre occupano lo schermo intero, senza eccezioni — la coerenza vale piu' del singolo caso.
  - 🐛 **Guardaroba era l'unica fuori riga** (356×731 su schermo 375×812): `.skins-modal-v3` (`styles/ui/desktop/skins-modal.css`) dichiara `max-height: 90vh !important` e `border-radius: 8px !important` **senza media query**, quindi valevano anche su telefono e battevano la regola generale `height: 100dvh`. Override in `styles/ui/mobile/skins-modal.css` con `!important` per pareggiare.
  - **Contenuto corto centrato DENTRO la finestra piena**: il popup segnalazioni restava incollato sotto l'intestazione con mezzo schermo vuoto. Si centra il corpo, non si rimpicciolisce la finestra. ⚠️ `justify-content` da solo non basta: `.settings-content` e' un flex ITEM (`flex: 1` + `overflow`), non un container — serve anche `display: flex`.
  - ❌ Scartata la strada opposta (finestra ad altezza automatica centrata, come Login/Offline): rompeva l'uniformita'. Login e Offline restano dialoghi centrati per scelta precedente.
  - Guardia: `mobile-menu.spec.ts` verifica che **nessuna** delle 8 finestre principali faccia eccezione. ⚠️ Il blocco `describe` deve avere il proprio `test.use({ viewport })`: senza, gira a viewport desktop e fallisce accusando il codice di un difetto che non ha (successo).
- ✅ **Tab Amici — quattro segnalazioni QA** (07/08/2026). Guardia comune: `dev/tests/e2e/friends-ui.spec.ts` (6 test). Le Edge Functions sono simulate con route Playwright più specifiche di quella di `helpers.ts`, che lascia le chiamate **sospese** per non toccare il backend dev condiviso.
  - 🐛 **Tempo di gioco sempre zero.** `totalPlayTime` è in **secondi** — il loop fa `totalPlayTime += deltaTime` (`boot.ts:1175`, deltaTime in secondi) e `saveGame` lo spedisce così nello snapshot `profile` — ma `social.ts` lo divideva per **3 600 000** come fossero millisecondi: sbagliato di 1000×, quindi anche 10 ore di partita uscivano «0.0h». Ora `/3600`. La statistica in Profilo → Statistiche era sempre stata giusta (`formatTime` prende secondi): divergevano fra loro, ed è il modo più rapido per accorgersene.
  - ⬆️ **Suggerimenti: via chi ha già una richiesta in ballo.** La Edge Function `friends-search` in modalità `suggestions` scartava solo le amicizie **accettate**, non le `pending_out`/`pending_in`: chi avevi appena aggiunto tornava fra i «Suggeriti» con l'etichetta *in attesa*, cioè un suggerimento che non si può seguire. ⚠️ Nella **ricerca per nome** quelle righe restano apposta: cercare una persona di proposito deve dire a che punto sei con lei.

    Chiuso su **due piani**, e servono entrambi:
    - **Client** (`social.ts`, `doSearch`): in modalità suggerimenti passa solo `relation === 'none'`. È la rete di sicurezza — vale a prescindere da quale versione della Edge Function risponde.
    - **Edge Function v3**, deployata il 07/08/2026 su **dev** *e* **production** (stesso sorgente, `ezbr_sha256` `0a43df87…` su entrambi): esclude chiunque abbia già una relazione, e lo fa **nella query** (`.not("id","in",(…))`) invece che dopo un `limit(30)`. Col filtro a valle chi aveva molte relazioni si ritrovava con meno di 6 suggerimenti — o zero — perché i candidati venivano tagliati prima di sapere quali sarebbero caduti; ora il `limit(6)` conta solo righe buone. Oltre 150 relazioni la lista di uuid renderebbe l'URL ingestibile: in quel caso si pesca largo (200) e si filtra in memoria.
    - ⚠️ **Le Edge Functions vivono fuori dal repo**: qui resta solo la traccia. Verificato dopo il deploy che la sintassi `id=not.in.(uuid,…)` sia valida (200 sul REST, con controprova 400/`PGRST100` su un filtro rotto di proposito) e che entrambe le istanze rispondano `token_expired` / «Dati mancanti» sui rami d'errore. Il ramo autenticato **non** è stato provato end-to-end: servirebbe un account vero sul backend condiviso.
  - 🐛 **Notifiche visibili solo dopo aver aperto Profilo.** Il polling del badge parte a 3s dal caricamento, quando il login è spesso ancora in volo: senza token `updateBadge` esce **senza fare nessuna chiamata**, e il tentativo successivo era a 45s. Nel frattempo l'unico modo di vedere la pallina era aprire la tab Amici, che ricarica a mano — da qui la segnalazione. Tre ritocchi: senza token si ritenta ogni **2s** (nessuna richiesta sprecata, è solo una lettura di variabile), il login riuscito chiama `EspoSocial.refreshBadge()` (`modals/index.ts`), e aprire Profilo ricontrolla subito. Il ritmo a regime resta 15s/45s.
  - ⬆️ **Riga amico cliccabile tutta.** Il `data-open` stava sulla sola freccia da 30px. Ora la riga è un `role="button"` con `tabindex` e supporto Invio/Spazio, e la freccia diventa **decorativa** (`aria-hidden`, niente tab-stop): aprire il profilo è l'unica azione della riga, quindi due elementi interattivi sarebbero due fermate del focus per la stessa cosa. ⚠️ Da `<button>` a `<span>` serve il `display: inline-flex` esplicito, o larghezza e altezza della freccia non valgono più.
- ✅ **Bilanciamento — due segnalazioni sulla progressione** (07/08/2026). Guardia: `dev/tests/e2e/balance-3-1.spec.ts`.
  - 🐛 **Q-bit della Formattazione: base sbagliata.** Il guadagno usava `prestigePoints`, cioè il saldo token **spendibile**: comprare nel negozio Promozione — usare i token per quello che servono — tagliava la ricompensa. Da qui «alla prima formattazione ne prometteva 10, dopo qualche acquisto ne dava 3». Ora la base è `lifetimePrestigePoints`, i token **guadagnati nel ciclo**, che la formattazione azzera insieme al resto (non è fra i dati super-persistenti): il conto riparte a ogni NG+ e non dipende più da come li spendi. Stesso giro: l'anteprima in `render/index.ts` era una **copia scritta a mano** della formula e ora chiama `EspoV3.prestige.formatQbitsEarned`, la stessa che esegue la formattazione — due copie divergono, ed era già successo.
  - ⬆️ **Nerf Bug Bounty**: da **+20%/livello senza tetto** a **+10%/livello, max 10** (`goldenBugMult` 1 → 2.0; prima a 15 acquisti faceva 4.0 e continuava a salire). Il Ticket Critico paga `bps×30 + click×10`, quindi il moltiplicatore si **auto-amplifica**: più BPS → bug più ricchi → team più costosi → più BPS. Il tetto conta più della percentuale — è la crescita illimitata a rompere la curva. Il livello 10 costava ~8.500 token cumulati (75 × 1.5^liv) — la base è poi salita a 250, voce del 25/08/2026.
  - 🛠️ **`maxLevel` era rispettato solo dalla UI**: il pulsante passava a «MAX» ma `buyPrestigeUpgrade` scalava i token e alzava il livello lo stesso (la funzione è su `window`). Ora il controllo è dove si spende. Vale per tutti i potenziamenti con tetto, non solo Bug Bounty.
  - 🔎 **Verificati gli altri moltiplicatori**, nessun altro intervento: `sinergia` cresce col quadrato ma passa dal **softcap sqrt** di `applyBonusSoftcap`, `contrattazione`/`outsourcing`/`serverAlwaysOn`/`reteContatti`/`esperienzaAccumulata`/`deadlineStretta` hanno già un tetto, `paracadute` ed `eredita` sono additivi piatti e irrilevanti a fine partita. Bug Bounty era **l'unico** moltiplicatore illimitato su una ricompensa che scala coi BPS. ⏳ Resta compounding **volutamente** non toccato: Aura Dorata ×3 (super upgrade quantico) e il jackpot `lucky` ×8 al 18% — al tetto fanno 48× su `bps×30`, cioè ~24 minuti di produzione per bug fortunato. Se anche così scappa, la leva successiva è il `×30` della formula base (`events.ts:38`), che però tocca **tutti** i giocatori, anche chi Bug Bounty non l'ha comprato.
- ✅ **Due segnalazioni dal giro in zona test** (25/08/2026). Guardie: terzo test in `dev/tests/e2e/balance-3-1.spec.ts` e `dev/tests/e2e/prestige-hub-btn.spec.ts` (4 test).
  - ⬆️ **Bug Bounty: costo base 75 → 250.** Il tetto della 3.1 sistemava il fine partita, non l'apertura. Misurato: il bottino massimo delle **prime tre Promozioni** è 160 token (`sqrt(soglia×4/250000)` a soglia `5e7×3^n`), cioè il primo livello a 75 ci stava **due volte** — non era una scelta, era un acquisto d'apertura. Il costo scala `1.5^livello`, quindi la base sposta **tutta** la scala: i 10 livelli passano da ~8.500 a ~28.300 token cumulati e ogni traguardo slitta di circa due Promozioni. Il moltiplicatore non è stato toccato (+10%/livello, max 10): a cambiare è **quando** lo si ottiene, non quanto vale.
    - La guardia non fissa il numero 250, che è materiale da ritocco: asserisce l'**intento** (primo livello sopra il bottino di tre Promozioni, cumulativo dei 10 livelli sopra 25.000). Verificata al contrario ribassando la base a 75 e ricostruendo: fallisce, come deve.
  - 🐛 **Bottone «MADE IN HEAVEN»: l'icona andava a capo.** `.hub-btn-ready` passa a `flex-direction: column` per appendere il sottotitolo sotto al titolo — ma in colonna anche l'`<i>` diventa un flex item per conto suo, e il meteorite finiva su una riga sua, contro il bordo alto. Corretto con un wrapper `.hub-btn-main` che rimette icona e label sulla stessa riga; è **il wrapper** a risolvere (dentro tornano due inline), la regola CSS aggiunge solo spaziatura e allineamento al centro.
    - ⚠️ **Stesso difetto sul bottone oro** (Firma Contratto): lì ci stava e non dava nell'occhio, ma era la stessa regola. Corretti insieme.
    - ⚠️ **Mina sotto**: `.buy-btn` impone `height: 40px` + `overflow: hidden`. Il `min-height` dell'hub teneva su il bottone ma non sbloccava l'altezza, quindi qualunque contenuto più alto veniva **tagliato in silenzio** (misurati 5px di `scrollHeight` in eccesso). Aggiunto `height: auto` in sezione A, così il `min-height` torna a essere un pavimento a ogni breakpoint. Il test guarda `scrollHeight - clientHeight`, non solo le posizioni.
    - La guardia misura la **geometria renderizzata** partendo da `.hub-btn-ready`, non da `.hub-btn-main`: così boccia sia chi toglie il wrapper sia chi lo lascia e rompe il CSS. Verificata al contrario sul markup vecchio: fallisce sulla sovrapposizione verticale (icona 21.7 → label 23.7), non con un null.
- ✅ **Skin Fondatore: via il tetto, e due riparazioni** (25/08/2026). Guardia: `dev/tests/e2e/founder-riparazioni.spec.ts` (4 test).
  - ⬆️ **`MAX_FOUNDER_KEPT_SKINS` da 5 a `Infinity`.** Il Fondatore teneva 5 skin scelte con un picker; ora tiene tutto. Verificato prima di decidere, non assunto: in `src/data/skins.ts` le chiavi sono solo `img`/`rarity`/`themeConfig`/`cost` — **nessun effetto, nessun moltiplicatore** (`comboExplode` è dichiarata una volta e non letta da nessuno), e `themeConfig` guida solo musica, CSS e icone. Quindi il tetto non difendeva nessun equilibrio. Il reset di Season 1 resta su economia, classifica e obiettivi. ⚠️ La costante è rimasta tale: se una Season futura vorrà rimetterlo, si cambia in un punto solo, e `render/index.ts` la **importa** invece di riscrivere il numero (due copie divergono — già successo con la formula dei Q-bit).
    - Effetto collaterale voluto: chi era rimasto **a metà picker** (`pendingFounderChoice`) ora passa dal ramo `autoGrant` e riceve d'ufficio TUTTE le candidate invece di 5.
    - ⚠️ Il picker era **distruttivo**: alla conferma faceva `delete founderCandidateSkins` (`render/index.ts`), quindi la lista pre-lancio spariva per sempre. Prima di toccare qualsiasi cosa i save di chi non era ancora rientrato sono stati congelati nella tabella prod `founder_backup_prelancio` (25/08, 28 righe di cui 17 intatte, RLS attivo). Censimento: `scripts/censimento-fondatori.js` — 8 idonei su 17, e il tetto avrebbe cancellato **37 skin**, 36 delle quali su tre soli account (Pheega −16, Aleh1771 −13, giulio −7).
  - 🎁 **Riparazioni una tantum** (`src/data/founder-grants.ts`): catalogo completo a **Dario Moccia** (aveva tutte e 28 le skin, il picker gliene ha lasciate 7) e a **TheLonelyGodEspo** (account pre-lancio mai passato dalla migrazione: save già `schemaVersion 3` per i client di prova di luglio, e il cancello è `schemaVersion < 3` — stesso sintomo verificato su `Fuzzuca`). Al secondo anche `isFounder`.
    - ⚠️ **Non si ripara scrivendo il save su Supabase**: al login il client confronta locale e cloud (Format>Prestige>Score) e su `'equal'` tiene il LOCALE e lo ri-pusha — la modifica al cloud verrebbe scartata in silenzio. Lato client cade su qualunque stato venga caricato. Idempotente via `riparazioniSkin` nel save.
    - 🛠️ **Due trappole nel test**, entrambe mie: `saveGame()` scrive in **IndexedDB** (localStorage è solo il mirror del percorso cloud, sospeso in E2E) e va **atteso**, altrimenti `page.evaluate` torna a metà salvataggio. Per due giri il test ha accusato il codice di un difetto che non aveva. Il segnale d'attesa è `_espoHadSave`: da lì al gancio non c'è un solo `await`.
- QoL piccoli a scelta dal backlog `dev/docs/ui.md`
- ~~🔐 **Consolidamento secret in un file unico**~~ ✅ **FATTO il 03/08/2026** (dettaglio sotto). ⏳ Resta un passo **operativo**, non di codice: caricare `php/secrets.php` su Altervista e, solo dopo, togliere il fallback sui due file storici.
- ~~🕹️ Arcade: **Stack Overflow** (variante falling-blocks)~~ ✅ **FATTO il 03/08/2026**. Riempie lo slot "??? COMING SOON" in `arcade.php` e `modals_arcade.php`; ora è il gioco 07 e lo slot bloccato resta per il prossimo.

  **Come si tiene alla larga dal clone** (vincolo legale: trade dress Tetris, caso *Tetris v. Xio* 2012) — su tre piani, non solo il nome:
  - **Set di pezzi diverso**: otto forme, di cui **due da 3 celle** (PATCH, HOTFIX). Non è la settima canonica di tetromini. Nomi e colori sono del gioco (PIPELINE, MERGE, BRANCH, REBASE, CONFLICT…).
  - **Meccanica propria 1 — debito tecnico**: ogni N pezzi una riga risale dal fondo e spinge su la pila, con un varco e un bug dentro. Matura da sola, non arriva da un avversario. N cala col livello, con un minimo di 4 pezzi (sotto è ingiocabile).
  - **Meccanica propria 2 — bug da schiacciare**: una riga completa che contiene un bug **non si chiude**; il bug va schiacciato **col click/tap**. Porta il verbo del gioco principale dentro al cabinato, ed è un'azione che nel genere non esiste.
  - Il game over si chiama **STACK OVERFLOW**: la pila arriva in cima.

  **Scelte tecniche**: canvas a dimensione logica fissa (760×540) scalato dal CSS, così non serve ricalcolare il layout su resize/rotazione — è la trappola in cui era caduto `snake.js`. Ciclo a `requestAnimationFrame` con accumulatore (gli altri usano `setInterval`), con `dt` limitato a 250ms perché tornando da una scheda in background la pila non precipiti. Wall kick minimale sulla rotazione, senza il quale ruotare a ridosso del bordo sembra un gioco rotto.

  **Verifica**: `dev/tests/e2e/stack-overflow.spec.ts`, 8 test — le due meccaniche proprie hanno un test a testa, e quello sullo schiacciamento fa un **click vero** sul canvas, così copre anche la conversione delle coordinate (il canvas è scalato dal CSS, è lì che si rompe).
- ~~📋 **Segnala → Trello: card più utili al triage**~~ ✅ **FATTO il 03/08/2026**. Tre ritocchi a `php/trello-submit.php`:
  - **Etichetta automatica `TEST`** (`6990452738e3477fc17cbc81`, già esistente sulla board e usata a mano finora) sulle card che **non** arrivano dalla produzione. In produzione la card nasce **senza etichette**: la board le usa per il triage (versione, stato) e precompilarle sarebbe rumore. Il discriminante è `instanceName` di `php/config.php`, **non** l'host — l'area di test sta sullo stesso dominio della prod, in sottocartella, ed è la CI a ribaltare il valore.
  - **Niente più User-Agent** nel contesto tecnico: 300 caratteri per card giudicati poco utili al triage. Versione, lingua e risoluzione restano. Tolto anche lato client (`js/feedback.js`), così il dato non parte proprio; aggiornata di conseguenza la riga privacy in `langs/it.php` e `langs/en.php`, che prometteva "browser".
  - **Prefissi testuali al posto delle emoji** nel titolo: `NUOVO:` / `BUG:` / `MIGLIORIA:`. Cercabili da tastiera e leggibili ovunque Trello mostri il titolo in riga singola (notifiche, ricerca, export).

  ⏳ **Passo operativo**: l'ID etichetta sta in `php/secrets.php`, che è gitignored e vive **solo** sul server. Va aggiunta la voce `labels` alla sezione `trello` del file **dell'area di test** (in produzione non serve: senza `labels` il codice non applica niente, che è già il comportamento voluto).

### 3.1 · Consolidamento secret — ✅ FATTO il 03/08/2026

> **Esito.** Tutti i punti del piano sono chiusi. Le sezioni sono `r2` e `trello`: **`app` non esiste**, ed è una conseguenza del piano stesso — i punti 5 e 6 lasciano in `config.php` i parametri d'ambiente e cancellano le credenziali DB, quindi da quel file non avanzava niente da unificare.
>
> **Due scelte prese strada facendo, entrambe da conoscere:**
>
> 1. **Fallback retrocompatibile** in `php/secrets-load.php`: se `secrets.php` non c'è, si usano ancora `r2-config.php` e `trello-config.php`. Senza, il primo deploy dopo il consolidamento avrebbe spento R2 in produzione (500 sul signer → asset 404) fino al caricamento manuale del file nuovo, perché quei file vivono **solo** sul server. Le due voci restano quindi in `.gitignore`. **Il fallback va rimosso** in una release successiva, una volta che Altervista è passata al file unico.
> 2. **`allowed_referers` sale alla radice** di `secrets.php` e viene iniettata nelle sezioni che non ne dichiarino una propria: si scrive una volta sola invece di ricopiarla per endpoint. L'unione tiene la variante `www.` che aveva solo il template Trello.
>
> Migrazione: `php scripts/merge-secrets.php --write` genera `secrets.php` dai due file storici (deduplica i referer, non stampa mai i valori). Poi va caricato a mano su Altervista.
>
> Verificato: 18 test sul caricatore (fallback, precedenza del file unico, whitelist ereditata e sovrascritta, segnaposto) e prova end-to-end sugli endpoint veri in entrambe le configurazioni — URL R2 firmate, 9 brani dal jukebox, 403 su referer estraneo, 405 su metodo sbagliato.

**Situazione di partenza**: la configurazione era sparsa su **4 file** (non 3), con meccanismi e stati git diversi.

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

- ~~⚠️ `scripts/bump-version.js` — path `php/config.php` risolto da `__dirname` invece che dalla root~~ **GIÀ CORRETTO** (verificato col bump 3.0.21 del 02/08/2026): lo script ora definisce `const ROOT = path.join(__dirname, '..')`, risolve ogni path da lì, e con `replaceOrFail` + `process.exit(1)` fallisce forte invece di saltare in silenzio. Nessun intervento da fare.
- ~~Commenti falsi da correggere (`php/config.example.php:7`, `scripts/e2e-server.js:6`)~~ ✅ **CHIUSI**: il primo era già stato corretto, il secondo lo è ora — dichiarava `config.php` gitignored e giustificava così la creazione da template; ora dice il vero (è tracciato, la creazione resta come rete di sicurezza per un checkout parziale).
- ~~`main.yml:70-91` — la exclude-list FTP non esclude `php/trello-config.example.php`~~ **GIÀ CORRETTO**: la voce c'era già. Aggiunto ora `php/secrets.example.php` a `main.yml` e `test.yml`, per non ripetere l'incoerenza col template nuovo.
- ~~**Documentare** il caricamento manuale dei secret~~ ✅ **FATTO**: nuova sezione «Two things the pipeline will never upload for you» in `README.md`, che copre sia `secrets.php` sia gli asset R2, con il sintomo da riconoscere (signer 500 → asset 404 → gioco muto) e l'avvertenza di verificare l'upload R2 con `rclone check --checksum` invece che col conteggio dei trasferimenti.
- ~~Difesa in profondità: `<FilesMatch>` per i file di config~~ ✅ **FATTO**, nella `.htaccess` **di root** (il match è sul nome del file, quindi eredita in tutte le sottocartelle, come già la regola sui `.sql`; `php/.htaccess` contiene solo `mod_expires`/`mod_deflate`). Nega `secrets|config|r2-config|trello-config` con o senza `.example`, lasciando servibile `secrets-load.php`, che non contiene segreti. Serve al caso in cui PHP non giri: lì Apache servirebbe il sorgente in chiaro. ⚠️ **Non verificabile in locale**: il server PHP built-in ignora `.htaccess`, quindi il primo controllo vero va fatto in test.

---
