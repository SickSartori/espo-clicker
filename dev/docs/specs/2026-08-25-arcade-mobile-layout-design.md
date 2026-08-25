# Sala Giochi su telefono in verticale — comandi grandi e telaio sottile

Data: 2026-08-25 · Branch: `develop` · Origine: card Trello "Ingrandire la zona dei comandi nella Sala Giochi"

## Problema

Su telefono in verticale la zona dei comandi è un'isola centrata e minuta, e sopra al
campo si impilano sei fasce di contorno. Misurato sul vivo a 375×812 con Stack Overflow
in esecuzione (`arcade.php`, `pointer:coarse`):

| Banda | Altezza | Contenuto |
|---|---:|---|
| `#arcade-fs-header` | 63px | logo, portafoglio, X |
| `.arcade-game-topbar` | 126px | MENU, titolo, monete/trofeo — impilati in colonna |
| `#stack-hud` | 145px | 5 celle su 2 righe |
| **`#stack-canvas`** | **190 × 111px** | il gioco |
| riserva sotto (`padding-bottom`) | 232px | ma il pad reale è alto 175px |

334px sopra e 232px sotto: il 70% dello schermo è contorno. Il pad è largo 291px su 375,
con 84px morti ai lati; D-pad a celle 44px e tasti azione 54px.

## Causa della topbar in colonna

Non è una scelta, è una collisione fra due fogli di stile che `arcade.php` carica entrambi.

`styles/base/modals-arcade.css:404` dichiara, dentro `@media (max-width: 768px)`:

    .arcade-game-topbar { flex-direction: column; gap: 10px; }

Serve al modal dell'arcade dentro il gioco, dove la larghezza è quella di una finestra
stretta, e finisce in `styles.bundle.min.css`. `arcade-fullscreen.css:857` ridichiara la
topbar con `!important` su `display`, `align-items`, `justify-content` e `gap`, ma **non**
su `flex-direction`: la colonna sopravvive, e il `gap:14px !important` la allarga.

Tre elementi da 80, 151 e 101px, che in riga starebbero in 327px di larghezza, occupano
tre righe. `arcade-fullscreen.css` è caricato **solo** da `arcade.php`: la correzione va
lì e non tocca il modal in-game.

## Interventi

Tutte le regole nuove vanno in `@media (max-width: 768px) and (orientation: portrait)`.
Vedi "Vincoli" per il perché dell'`orientation`.

### 1. Zona comandi a tutta larghezza

Il pad adotta il trattamento che `arcade-fullscreen.css:1226` applica già all'orizzontale:
`width:100%`, `justify-content:space-between`, niente cornice né etichette,
`pointer-events:none` sul contenitore con `auto` sulle `.vp-section`, `env(safe-area-inset-*)`
sui lati e in basso. D-pad al bordo sinistro, azioni al destro, dove cadono i pollici.

Misure: celle D-pad `clamp(52px, 17vw, 64px)`, tasti azione `clamp(60px, 19vw, 72px)`.
Fluide e non fisse perché su un iPhone SE da 320px i 64px secchi sfondano il bordo.

Il conto in larghezza regge perché **nessun gioco usa più di un tasto azione**
(`js/arcade-page.js:463`): a destra ci sono al massimo due cerchi, azione + START, mai tre.
D-pad 196px + azioni 154px = 350px su 375 di schermo. Sotto quella soglia il `clamp`
stringe le celle da solo: a 360px il pad scende a ~333px, a 320px a ~300px.

START è disabilitato durante la partita (`arcade-page.js` lo porta a `opacity:0.35`) ma si
prende lo stesso spazio del tasto che premi davvero: scende a ~56px, l'azione resta a 72px.

### 2. Topbar in riga (A)

`flex-direction: row` nel blocco verticale di `arcade-fullscreen.css`, che vince sulla
regola di `modals-arcade.css` per ordine di caricamento. Da 126px a ~44px.

Rimessa in riga, la topbar lascia ~130px al titolo mentre "STACK OVERFLOW" ne chiede 151:
il font del titolo scende da `0.7rem` a `0.6rem`. L'`text-overflow: ellipsis` già presente
resta come rete per i nomi più lunghi.

### 3. Riserva del pad onesta (B)

I 232px riservati sono tarati su un pad che non esiste: quello vero è alto 175px. Con il
pad ingrandito il valore corretto è ~210px. La riserva va espressa come una variabile CSS
unica invece dei tre valori sparsi di oggi (`130px` sotto `pointer:coarse`, `200px` sotto
`html.touch-device`, `232px` nel blocco a riga 1189), che sono già andati fuori sincrono.

### 4. Header a dieta mentre si gioca (C)

Con `body.playing` il portafoglio non serve: si nasconde, come fa già l'orizzontale con
`.fs-info-bar`. La X resta 44×44. Da 63px a ~50px.

### 5. HUD di Stack su una riga (D)

`#stack-hud` (`arcade/stack/css/stack.css:54`) è una griglia 3 colonne × 2 righe: LIVELLO,
RIGHE, BUG sopra; PROSSIMO e DEBITO TECNICO sotto, alte 82px. Passa a una riga sola con
l'anteprima del pezzo e la barra del debito rimpicciolite. Da 145px a ~95px.

Specifico di Stack: gli altri sei giochi hanno il proprio HUD e restano da guardare a parte.

## Risultato atteso

Recupero complessivo ~167px, tutti al campo di gioco: il canvas di Stack passa da
190×111px a ~357×208px — quasi il doppio — mentre i tasti crescono del 45%.

## Vincoli

- **L'orizzontale non si tocca.** Un telefono ruotato da 640×360 fa scattare *sia*
  `max-width:768px` *sia* il blocco `(orientation: landscape) and (max-height: 540px)`.
  Senza `and (orientation: portrait)` il D-pad da 196px finirebbe in un viewport alto 360.
- **Niente `!important` e stessa specificità** delle regole orizzontali di riga 1226, che
  vincono per ordine nel file. Alzare la specificità del blocco verticale le scavalcherebbe.
- **44px minimo** per ogni bersaglio touch (WCAG 2.5.8), START compreso.
- `dev/tests/e2e/arcade-canvas-mobile.spec.ts` deve restare verde: verifica il rapporto
  d'aspetto dei canvas su 375×812 e 812×375, l'assenza di sovrapposizione fra tasti e
  campo, i 44px minimi e che nessun tasto esca dallo schermo.

## Verifica

1. `arcade-canvas-mobile.spec.ts` verde.
2. Misure sul vivo a 375×812 e 360×640, con Stack avviato: altezza di ogni banda, larghezza
   del pad, dimensione dei tasti vivi, nessun tasto oltre il bordo.
3. Controllo a 320px (iPhone SE) che i `clamp` tengano il pad dentro lo schermo.
4. Un giro sugli altri sei giochi per verificare che la topbar in riga non tagli i titoli
   più lunghi e che i D-pad ridotti (invaders 2 tasti, asteroids 3) restino allineati.
