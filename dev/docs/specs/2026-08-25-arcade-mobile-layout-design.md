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

## Da fare al rilascio

In produzione `arcade.php` versiona `arcade-fullscreen.css` e `arcade-page.js` con
`$cacheVer` (in locale usa `time()`, quindi in dev non serve): senza un bump di versione i
browser che hanno già visitato la Sala Giochi continuerebbero a servire i file vecchi.
