# Sala Giochi su telefono in verticale — comandi grandi e telaio sottile

Data: 2026-08-25 · Branch: `develop` · Origine: card Trello "Ingrandire la zona dei comandi nella Sala Giochi"

## Problema

Su telefono in verticale la zona dei comandi era un'isola centrata e minuta, e sopra al
campo si impilavano sei fasce di contorno. Misurato a 375×812 con Stack Overflow in
esecuzione:

| Banda | Altezza | Contenuto |
|---|---:|---|
| `#arcade-fs-header` | 63px | logo, portafoglio, X |
| `.arcade-game-topbar` | 126px | MENU, titolo, monete/trofeo — impilati in colonna |
| `#stack-hud` | 145px | 5 celle su 2 righe |
| **`#stack-canvas`** | **105 × 184px** | il gioco |
| riserva sotto (`padding-bottom`) | 232px | ma il pad reale era alto 175px |

334px sopra e 232px sotto: il 70% dello schermo era contorno. Il pad era largo 292px su
375, con margini morti ai lati; D-pad a celle 44px e tasti azione 54px.

## Causa della topbar in colonna

Non era una scelta, era una collisione fra due fogli di stile che `arcade.php` carica
entrambi. `styles/base/modals-arcade.css:404`, dentro `@media (max-width: 768px)`:

    .arcade-game-topbar { flex-direction: column; gap: 10px; }

Serve al modal dell'arcade dentro il gioco, dove la larghezza è quella di una finestra
stretta, e finisce in `styles.bundle.min.css`. `arcade-fullscreen.css:857` ridichiara la
topbar con `!important` su `display`, `align-items`, `justify-content` e `gap`, ma **non**
su `flex-direction`: la colonna sopravviveva, e il `gap:14px !important` la allargava.

`arcade-fullscreen.css` è caricato **solo** da `arcade.php`: la correzione sta lì e non
tocca il modal in-game.

## Interventi

Tutte le regole nuove stanno in `@media (max-width: 768px) and (orientation: portrait)`.

### 1. Zona comandi a tutta larghezza

Il pad adotta il trattamento che `arcade-fullscreen.css` applica già all'orizzontale:
`width:100%`, `justify-content:space-between`, niente cornice né etichette,
`pointer-events:none` sul contenitore con `auto` sulle `.vp-section`, `env(safe-area-inset-*)`
sui lati e in basso. D-pad al bordo sinistro, azioni al destro.

Misure: celle D-pad `clamp(52px, 17vw, 64px)`, tasti azione `clamp(60px, 19vw, 72px)`.
Fluide e non fisse perché su uno schermo da 320px i 64px secchi sfondano il bordo.

Il conto in larghezza regge perché **nessun gioco usa più di un tasto azione**
(`js/arcade-page.js:463`): a destra ci sono al massimo due cerchi, azione e START.

START è disabilitato durante la partita e scende a 56px; l'azione resta a 72px.

### 2. Topbar in riga

`flex-direction: row !important` nel blocco verticale — l'`!important` serve perché la
regola di riga 857 lo usa già su tutto il resto del contratto flex. Da 126px a 51px.

### 3. Riserva del pad onesta

I 232px riservati erano tarati su un pad che non è mai esistito (quello vero era 175px).
Il valore diventa 210px, espresso come `--arcade-pad-reserve` in un punto solo invece dei
tre valori sparsi di prima (130px, 200px, 232px), che erano già andati fuori sincrono.

### 4. Il nome del gioco passa nell'header

Nella topbar il titolo aveva 79px mentre "STACK OVERFLOW" ne chiede 132: sarebbe uscito
troncato. Nell'header, dove il portafoglio si nasconde mentre si gioca, ce ne sono 244-258.

Lo scambio è in `js/arcade-page.js`, agganciato a `syncPadVisibility`, che già sa qual è
il gioco attivo: il nome si legge da `.topbar-game-label`, l'originale si conserva **una
volta sola** (la funzione gira ogni 400ms: rileggerlo a ogni giro salverebbe il nome del
gioco come "originale"), e all'uscita torna "espò arcade".

I nomi più lunghi sono di 14 caratteri e a 14px con 2px di spaziatura più l'icona chiedono
258px: a 375 e 360 ne avevano esattamente 258 — margine zero — e a 320 solo 244. Mentre si
gioca l'icona sparisce e la spaziatura si dimezza: si scende a ~216px, dentro ovunque.
L'`text-overflow: ellipsis` resta come rete.

### 5. HUD di Stack più compatto

`#stack-hud` è una griglia 3×2 alta 145px. Si stringono i respiri interni, l'anteprima del
pezzo (`max-height: 30px`) e la barra del debito: 145px → 113px, senza togliere voci.

Specifico di Stack, che è **l'unico gioco con un HUD fuori dal canvas**: gli altri sei
disegnano i loro dati dentro il canvas.


### 6. La barra dei punteggi resta dentro lo schermo

`.arcade-stats-box` è `flex: 0 0 auto` (riga 869): non si stringe mai. In colonna non si
notava, perché aveva tutta la larghezza della topbar; rimessa in riga ne restano 239px, e
i giochi con quattro voci ne chiedono 338 — "PUNTI: 0 VITE: 3 WAVE: 1 RECORD: 0" usciva
tagliata fuori schermo su 5 giochi su 7 (tutti tranne snake e stack, che mostrano solo
monete e trofeo).

Ora può restringersi e mandare le voci a capo: una riga quando ci stanno, due quando no.
Costa 10px di altezza ai tre giochi che vanno a capo — asteroids, invaders, centipede
passano da 447 a 437px di campo — ed è il prezzo giusto per non perdere il punteggio.

Difetto trovato **guardando gli screenshot**, non misurando: le metriche controllavano il
canvas e i tasti, non il contenuto della topbar.
## Risultato misurato

Telaio, identico per tutti e 7 i giochi: topbar 126 → **51px**, riserva 232 → **210px**,
pad 292 → **375px** (tutta la larghezza), tasti 44/54 → **56/64/71px**.

Campo di gioco a 375×812, prima → dopo:

| Gioco | prima | dopo | superficie |
|---|---:|---:|---:|
| stack | 105 × 184 | **182 × 320** | **+201%** |
| invaders | 167 × 329 | **222 × 437** | **+77%** |
| centipede | 154 × 329 | **205 × 437** | **+77%** |
| asteroids | 201 × 345 | **255 × 437** | **+61%** |
| snake | 327 × 315 | 327 × 315 | invariato |
| space | 327 × 235 | 327 × 235 | invariato |
| superespo | 327 × 229 | 327 × 229 | invariato |

Gli ultimi tre non crescono perché erano già **vincolati in larghezza** (327px = tutta la
larghezza utile del corpo): lo spazio in più è verticale e loro non sanno che farsene. I
quattro che crescono sono quelli vincolati in altezza.

## Stime sbagliate, corrette dalla misura

- **Nascondere il portafoglio non recupera altezza.** L'header resta 63px: il pavimento lo
  fissa la X da 44×44 di WCAG 2.5.8, non il contenuto. Stimati −13px, valgono **0**. La
  regola resta perché libera la *larghezza* che serve al nome del gioco.
- **L'HUD di Stack rende −32px**, non i −50px stimati.
- Il canvas di Super Espò non è `#super-espo-canvas`: lo crea Phaser dentro
  `#phaser-espo-container`.

## Vincoli

- **L'orizzontale non si tocca.** Un telefono ruotato da 640×360 soddisfa anche
  `max-width:768px`; senza `and (orientation: portrait)` si prenderebbe il D-pad da 196px
  in un viewport alto 360. Le due `orientation` sono mutuamente esclusive, quindi l'ordine
  nel file non conta.
- **44px minimo** per ogni bersaglio touch (WCAG 2.5.8), START compreso.

## Verifica eseguita

1. `dev/tests/e2e/arcade-canvas-mobile.spec.ts`: **10 test verdi**. Coprono rapporto
   d'aspetto in verticale e orizzontale, assenza di sovrapposizione fra tasti e campo,
   44px minimi, nessun tasto fuori schermo.
2. Misura diretta su **7 giochi × 3 formati** (375×812, 360×640, 320×568) con Playwright
   headless: distorsione 1,000 ovunque, `overlap` 0 ovunque, 0 tasti fuori schermo, tasto
   minimo 54-56px, pad largo quanto il viewport, titolo mai troncato.

---

# Seguito del 26/08 — quello che ha trovato la verifica finale

La verifica di chiusura ha rimisurato i 7 giochi su 3 formati verticali (375×812,
360×640, 320×568) invece che su uno solo. Il telaio ha retto — distorsione 1,000
ovunque, zero tasti fuori schermo, zero sovrapposizioni, tasto minimo 54px, barra dei
punteggi sempre dentro, titolo mai troncato — e Super Espò, che la misura del 25/08
non aveva coperto perché dipende dalla CDN di Phaser, sta a 327×229 come gli altri due
vincolati in larghezza.

Sono venute fuori tre cose che le metriche di prima non guardavano, tutte figlie dello
stesso difetto: **avevamo misurato un formato e scritto il numero che ne usciva.**

## 7. La riserva non è un numero: è il pad

I 210px erano esatti in un punto solo — D-pad a tre righe su uno schermo largo 375.
Fuori di lì erano una stima, e sbagliava in due modi.

- La griglia del D-pad è 3×3 anche quando il gioco usa due tasti soli. **BUG INVADERS**
  ha solo ◀ ▶: le altre due righe restavano celle vuote, e sotto al campo si apriva una
  fascia nera alta **71px a 375×812 e 89 a 320×568** che non conteneva niente. Stesso
  difetto, più piccolo, su ESPO-ROIDS, che ha ▲ ma non ▼: 66px.
- Le celle sono `clamp(52px, 17vw, 64px)`, cioè 64px da 375 in su ma **54 a 320**. Lì il
  pad è alto 179px e i 210 riservati ne buttavano 31 — per tutti e sette i giochi.

Adesso la riserva è l'altezza del pad, calcolata:

    --arcade-pad-reserve: calc(max(
        righe × cella + (righe − 1) × 4px,   /* il D-pad */
        azione                                /* o il tasto tondo, se è più alto */
    ) + 12px);                                /* 8px di stacco dal bordo + 4 d'aria */

Le due misure (`--arcade-pad-cella`, `--arcade-pad-azione`) sono le stesse che disegnano
i tasti: erano gli identici due `clamp` scritti in due punti del file, ed è esattamente
così che 130, 200 e 232 erano andati fuori sincrono la volta scorsa.

Le righe le pubblica `configurePad` in `js/arcade-page.js`, che già sa quali direzioni
accende, su `body[data-dpad]`: `lr` per il D-pad a una riga, `ulr` per quello a due. Si
nominano una per una **le due forme che esistono davvero**, invece di dedurre il numero:
un gioco futuro con ▼ ma senza ▲ non scriverebbe l'attributo e resterebbe a tre righe,
cioè al comportamento di oggi, invece di finire in un caso mai provato.

Effetto voluto: i tasti direzione scendono in fondo, allineati al tasto azione, dove
cade il pollice — prima galleggiavano a mezz'aria sopra una riga di celle vuote.

Solo in verticale. In orizzontale il pad sta ai lati, l'altezza gli avanza e la riserva
sotto vale già 0: non c'era niente da recuperare e non si tocca niente.

## 8. A 320px la fila in fondo era piena

Con il D-pad ridotto alle sue righe, direzione e azione finiscono sulla **stessa riga**.
In altezza è un guadagno, in larghezza a 320px non avanzava niente: D-pad 171 + FIRE 60
+ 10 di gap + START 56 fanno 297 su 320, e fra ▶ e FIRE restavano **2px**. Prima non si
notava perché i due gruppi erano su righe diverse.

Gli 8px li cede START, che durante la partita è spento e si preme una volta a partita
(56 → 48px, sempre sopra i 44 di WCAG 2.5.8), più 4px di respiro fra i due cerchi: lo
stacco torna a 14px. Solo sotto i 360px di larghezza, dove il problema esiste.

## 9. L'HUD di Stack sugli schermi corti

Stack Overflow è l'unico gioco con un HUD fuori dal canvas, ed è una griglia 3×2. A
375×812 sta comodo (113px contro 320 di campo). A **320×568 si prendeva 113px e al campo
ne restavano 77**: l'informazione di contorno era più grande del gioco, e il campo era
un francobollo da 44×77.

Sotto i **700px di altezza** — che prende 320×568, 360×640 e i 375×667 dei telefoni
piccoli — l'HUD passa a una riga sola: 113px → **45px**. I tre contatori restano
identici; spariscono le etichette di anteprima e debito, e le due scritte piccole sotto.
Non è una perdita di informazione: "PROSSIMO" nomina un pezzo che è lì disegnato,
"DEBITO TECNICO" nomina la barra arancione che gli sta sotto, il nome del pezzo è quello
che l'anteprima mostra, e i pezzi che mancano al debito sono quanto manca alla barra per
riempirsi. Sono 133px di etichetta su 288 di riga, e su quello schermo valgono di più al
campo. La soglia è l'altezza e non la larghezza, quindi a 375×812 non cambia un pixel.

## Risultato misurato, secondo giro

Campo di gioco, prima → dopo il seguito del 26/08:

| Gioco | 375×812 | 360×640 | 320×568 |
|---|---|---|---|
| stack | 182×320 → 181×318 | 85×149 → **127×223** | 44×77 → **98×172** (+398%) |
| invaders | 222×437 → **286×564** (+66%) | 128×265 → **191×395** | 81×193 → **138×330** (+191%) |
| asteroids | 255×437 → **294×503** (+33%) | 147×265 → **187×337** | 93×193 → **134×278** (+108%) |
| centipede | 205×437 → 204×436 | 124×265 → 127×271 | 78×193 → **89×220** |
| snake | invariato | 286×276 → 293×282 | 212×204 → **239×231** |
| space | invariato | invariato | 268×193 → 272×196 |
| superespo | invariato | invariato | invariato |

Riserva: 210px fissi → **83-211px** secondo il pad che c'è. Fascia vuota sotto al campo:
71-89px su invaders e 31 su tutti a 320 → **4px ovunque**, che è lo stacco dal bordo.

I tre giochi a tre righe di D-pad perdono **1px** a 375×812 (211 invece di 210): è la
formula che dice il vero al posto del numero arrotondato, e si vede su centipede e stack
che erano vincolati in altezza.

## Stime sbagliate, secondo giro

- **"Nessun gioco usa più di un tasto azione, quindi la larghezza regge."** Regge in
  larghezza, sì — ma il conto non teneva che a 320px quei tasti finiscono a 2px l'uno
  dall'altro appena stanno sulla stessa riga.
- **L'HUD di Stack a 113px era "compatto".** Lo era rispetto ai 145 di partenza, non
  rispetto allo schermo su cui gira: a 568px di altezza restava più grande del campo.
- Anche stavolta i difetti sono usciti **guardando gli screenshot e cambiando formato**,
  non ripetendo la misura sul formato che avevamo già misurato.

## Verifica eseguita, secondo giro

1. `dev/tests/e2e/arcade-canvas-mobile.spec.ts`: **26 test verdi** (16 di prima + 10
   nuovi: riserva pari al pad per le tre forme di D-pad su due formati, stacco fra
   direzione e azione a 320, HUD di Stack a una riga sotto i 700px e a due sopra).
2. Gli altri spec della Sala Giochi — `arcade-open`, `arcade-regressioni`, `arcade`,
   `stack-overflow` — restano verdi: 15 test.
3. Misura diretta di nuovo su 7 giochi × 3 formati: distorsione 1,000, overlap 0, 0 tasti
   fuori schermo, tasto minimo 54px, fascia vuota 4px ovunque.

## Da fare al rilascio

In produzione `arcade.php` versiona `arcade-fullscreen.css` e `arcade-page.js` con
`$cacheVer` (in locale usa `time()`, quindi in dev non serve): senza un bump di versione i
browser che hanno già visitato la Sala Giochi continuerebbero a servire i file vecchi.
