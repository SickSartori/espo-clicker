# Roadmap post-3.0 — Espòòò Clicker

> Stato: concordata il 21/07/2026, **riverificata sul codice il 03/08/2026** (3.0.22, post-lancio). Orizzonte: fino alla **4.0** (aprile 2027). Cadenza mensile: ~1 settimana design, 1-2 implementazione, 1 buffer/hotfix.
> Arcade: focus sui 3 giochi richiesti — **Stack Overflow** (falling blocks), **Q*Bert-like**, **BUGDOOM** — più **Flappy Espò** e il bonus multiplayer **Click Duel 1v1**.
> Regola arcade: massimo un cabinato nuovo per release, sempre vanilla JS + canvas, zero CDN esterne (lezione Phaser/Super Espò).

## v3.1 — metà settembre 2026 · «Migliorie e bugfix»

- Coda hotfix post-lancio
- ~~☁️ **Badge cloud-sync — rifacimento**~~ ✅ **FATTO il 03/08/2026** (segnalazione QA 31/07/2026; pre-lancio era entrata solo la mitigazione: tap → nascondi badge + toast).

  **Com'è stato chiuso.** Le due cause sono state affrontate separatamente:
  1. `_resyncFromCloud` e `_silentTokenRefresh` ora restituiscono **sempre** `{ ok, reason }` invece di uscire con un `return` nudo. Chi le chiama in automatico (`saveGame`) può ignorare l'esito; il tap sul badge ci costruisce sopra il messaggio.
  2. Il badge ha un **ciclo proprio**: `problem → syncing → ok | failed`. Lo stato `ok` si nasconde da solo dopo 2.5s, quindi la dismissione non passa più da `markCloudSaved()` — cioè non dipende più da un push cloud riuscito, che era il punto della causa 2.

  **Scelta presa strada facendo**: quando l'esito è `nocreds` o `login` non si mostra un errore da ritentare ma si apre direttamente il login, sia che lo si sappia già dal motivo del badge sia che lo si scopra dall'esito. Altrimenti servivano **due** tap — uno per scoprire il motivo, uno per agire — che è la stessa sensazione di "non succede niente" che il rifacimento elimina.

  **Verifica**: `dev/tests/e2e/cloud-badge.spec.ts`, 6 test (comparsa, stato intermedio visibile, auto-nascondimento, fallimento che resta a schermo col motivo, login al primo tap, esiti di tutte le uscite prima mute). Usano l'orologio finto di Playwright perché il badge compare solo dopo 90s di fallimenti. ⚠️ Nota per chi ci metterà mano: le credenziali di sessione **non** vanno messe prima del boot, o parte l'auto-login vero e il test diventa intermittente.

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

  Le due strade non sono alternative, risolvono problemi diversi: la **1 è necessaria** (è l'unica che chiude i 21 dB di scarto *fra* i video), la **2 resta disponibile** per il livello assoluto — a -16 LUFS col tetto a 0.5 si ascolta a ~-22 LUFS effettivi, e sganciare il canale video da `musicVolume` restituirebbe quei 6 dB. Decidere la 2 **dopo** aver sentito i file normalizzati, non prima.

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

  ⏳ **Resta aperta solo la strada 2**, da decidere all'ascolto: col tetto `master × musicVolume` = 0.5 i video si sentono a ~-22 LUFS effettivi. Se è il livello giusto, la voce si chiude qui; se restano bassi, l'unica leva rimasta è sganciare il canale video da `musicVolume` (+6 dB).

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
