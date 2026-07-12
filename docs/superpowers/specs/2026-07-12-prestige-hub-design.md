# Hub Prestigio — zona unificata Promozione + Formattazione — Design

> Stato: **APPROVATO (design)** — 2026-07-12.
> Vincolo di coordinamento: l'implementazione tocca `js/modals.js`, `js/script.js`, `js/game-logic.js`, `js/ui-functions.js` e `tests/e2e/integration.spec.ts` — file caldi del reorg (filone A in corso su un'altra sessione). Partire solo a filone A committato, o coordinare.

## 1. Obiettivo

Promozione e Formattazione sono la stessa famiglia (reset a livelli: Promozione = soft reset per Token; Formattazione = hard reset per Q-Bit, richiede 20 promozioni), ma oggi vivono in mondi diversi: la Promozione ha un bottone speciale in navbar (`#open-prestige-hub-btn`, con % e stato "PRONTA!"), la Formattazione è sepolta dentro il tab Q-Lab mescolata al negozio meta-tech. Obiettivo: **una zona unica** che racconti la progressione (promozione ×20 → formattazione), riducendo i punti d'ingresso e riportando il Q-Lab a puro negozio.

Il codice conteneva già tracce di un'unificazione mai finita: il bottone navbar si chiama `open-prestige-hub-btn` e `#btn-confirm-prestige` legge un `data-action` che può valere `'format'` senza che nessuno lo imposti mai.

## 2. Decisioni prese (con l'utente, 2026-07-12)

1. **Posizione**: hub modal aperto dal bottone navbar esistente (non zona fissa in pagina, non doppio bottone).
2. **Flusso**: l'hub **è** il contratto — le card contengono avviso, guadagno previsto e conferma. I modal `#prestige-modal` e `#format-modal` spariscono. Stessi click di oggi (navbar → conferma).
3. **Sblocco/anti-spoiler**: card Formattazione **misteriosa** ("???" + lucchetto) finché il Quantum non è mai stato sbloccato, col contatore "Promozioni X/20" visibile **fin da subito**.
4. **Bottone navbar**: comportamento attuale (% → "PRONTA!" verde) + nuovo stato viola "FORMATTA!" quando la Formattazione è eseguibile (priorità sull'essere pronta la promozione).
5. **(a)** Il click sul bottone apre **sempre** l'hub, anche quando nulla è pronto (oggi: toast d'errore). **(b)** Contatore X/20 visibile da subito sulla card misteriosa.
6. **Mobile**: prima classe, non ripiego — vedi §7.

## 3. Markup (includes/modals.php, includes/tab_quantum.php)

### Nuovo `#prestige-hub-modal`

Modal standard (`.modal-backdrop` → `.modal-content` → `.modal-close-btn`), titolo "Prestigio" (icona zap, coerente col bottone navbar). Corpo: contenitore `.hub-cards` con **due card affiancate** su desktop, impilate su mobile.

**Card Promozione** `.hub-card.hub-card-promo` (oro, riprende l'estetica del contratto attuale):
- *Non pronta*: barra di progresso con la stessa % del bottone navbar + soglia da raggiungere; bottone conferma disabilitato con label dedicata.
- *Pronta*: avviso firma (label esistenti `prestige_sign`/`prestige_warning`), box guadagno `+N Token` (**id riusati** `#contract-gain-token`, `#contract-gain-bonus`), bottone **`#btn-confirm-prestige`** "Firma il contratto" (id riusato → listener esistente in modals.js intatto).

**Card Formattazione** `.hub-card.hub-card-format` (viola) — tre stati:
- *Misteriosa* (`.is-mystery`, Quantum mai sbloccato): card oscurata, lucchetto, titolo "???", **solo** il contatore "Promozioni X/20". Nessun dettaglio su cosa fa (stesso spirito anti-spoiler delle sagome skin).
- *Rivelata non pronta* (`.is-locked`, Quantum sbloccato ma `totalResets < 20` — ciclo NG+ post-formattazione): card completa (titolo `format_titolo`, avviso `format_warning`), contatore X/20, conferma disabilitata.
- *Pronta* (`.is-ready`): box guadagno `+N Q-Bit` (**id riusato** `#format-gain-qbit`), bottone **`#btn-confirm-format`** "MADE IN HEAVEN" (id riusato → resta intatto il trucco anti-blocco che inizializza il video Big Bang sul gesto umano, script.js ~1302).

La regola di reveal è l'esistente `EspoV3.rules.isQuantumUnlocked` (20 reset raggiunti / già formattato / possiede Q-Bit): nessuna regola nuova.

### Rimozioni
- `#prestige-modal` e `#format-modal` da `includes/modals.php`.
- L'intero blocco "reboot" da `includes/tab_quantum.php` (avviso, `#pending-qbits-display`, `#format-requirement-warning`, `#btn-open-format-modal`): il Q-Lab resta header + wallet + negozio meta-tech. La preview dei Q-Bit pendenti vive nella card Formattazione dell'hub.

## 4. Bottone navbar

- **Visibilità invariata**: stessa regola `shouldShow` di `updatePrestigeVisuals()` (ui-functions.js ~1949).
- **Stati** (in ordine di priorità):
  1. `.format-ready` (nuovo): Formattazione eseguibile (`isQuantumUnlocked && totalResets >= 20`) → stile viola, label "FORMATTA!", icona meteora.
  2. `.promotion-ready` (esistente): "PRONTA!" verde.
  3. Default: icona razzo + `N%` verso la soglia.
- **Click**: apre sempre l'hub. Rimossi i due toast-blocco (`prestigeNeedComplete` in `openPrestigeContract`, e l'hardcoded "Devi effettuare almeno 20 Promozioni…" in script.js ~1263, che non era nemmeno i18n). Il cursore resta `pointer` in ogni stato.

## 5. Flusso JS

- `openPrestigeContract()` (game-logic.js ~1675) → **`openPrestigeHub()`**: calcola entrambe le preview, imposta gli stati delle card (promo pronta/non pronta; format mystery/locked/ready), apre `#prestige-hub-modal`. Niente più guard-toast: gli stati "non pronta" sono contenuto, non errori.
  - Preview Token: logica esistente invariata (`calculatePrestigeGained` + `applyTokenDuplicator` via `EspoV3.prestige`).
  - Preview Q-Bit: formula esistente `1 + floor(sqrt(prestigePoints/10000))` spostata qui da script.js ~1268; in fase piano valutare se centralizzarla in `EspoV3.prestige` accanto a `prestigeGained` (stessa filosofia F6→F8).
- Listener bottone navbar (modals.js ~337): invariato, cambia solo il nome della funzione chiamata.
- **Muore**: il wiring di `#btn-open-format-modal`/`openFormatHandler` in script.js (il listener di `#btn-confirm-format` resta, incluso il trucco video); il ramo vestigiale `data-action === 'format'` in modals.js (~347); `updateFormatButtonUI` (ui-functions.js ~1749) sostituita dall'aggiornamento delle card.
- `updatePrestigeVisuals()`: aggiunge la gestione `.format-ready` (priorità come da §4); aggiorna le card dell'hub quando il modal è aperto (stesso giro del loop UI che oggi aggiorna il resto).
- Le sequenze `executePrestige()` / `executeFormattingSequence()` e l'overlay di transizione **non si toccano**: cambia solo il punto d'ingresso.

## 6. CSS

- Nuovo `styles/v3/desktop/prestige-hub.css` (layout 2 card, stati, mystery-scrim con lucchetto in stile sagome skin) + `styles/v3/mobile/prestige-hub.css` (impilamento, fullscreen), registrati in `styles/v3/index.css`.
- Stato navbar `.format-ready`: `styles/base/navbar.css` (legacy), `styles/v3/desktop/header-navbar.css` (v3), `styles/mobile.css` sezione 5 (mobile).
- Struttura modal riusata da `styles/base/modals-core.css` (backdrop/content/close): nessuna primitiva nuova.
- Temi 8bit/super: hanno override per `promotion-ready`; per `format-ready` si accetta il fallback allo stile base (override dedicati solo se stonano, da verificare a occhio in implementazione).

## 7. Mobile

- Bottone navbar mobile: quadrato 44×44 (icona sopra, % sotto). Stato `.format-ready`: come `promotion-ready` nasconde lo span e pulsa l'icona — ma **il base mobile è già viola** (`#8e44ad→#9b59b6`, mobile.css ~186), quindi distinguere con: icona meteora + bordo bianco + glow pulsante acceso (non "solo colore viola").
- Hub modal: eredita il fullscreen app-like (100dvh). `.hub-cards` in colonna, Promozione sopra (azione frequente), corpo scrollabile col pattern esistente delle aree interne (`flex:1; overflow-y:auto`).
- Q-Lab mobile: gratis, il blocco reboot sparisce dal PHP condiviso.

## 8. i18n

Nuove label in **entrambe** le lingue, entrambi i canali:
- `langs/it.php` + `langs/en.php` (markup PHP): titolo hub, titolo card misteriosa ("???"), label contatore promozioni, label conferma-disabilitata promo, eventuale sottotitolo hub.
- `js/data/texts.js` + `js/data-en/texts.js` (stringhe JS): `ui.formatReady` ("FORMATTA!" / "FORMAT!") per il bottone navbar.
Riusate senza modifiche: `prestige_sign`, `prestige_warning`, `prestige_gain`, `prestige_token`, `prestige_new_mult`, `prestige_sign_btn`, `format_titolo`, `format_warning`, `format_gain`, `format_qbits`, `format_subtitle`, `quantum_requires`, `prestige_madeheaven_aria`.

## 9. Rischi e verifica

- **Trucco video Big Bang**: la conferma format deve restare un click umano diretto sul bottone con listener esistente (id riusato). Test manuale della formattazione completa.
- **E2E Playwright**: aggiornare i selettori se i test toccano `#prestige-modal`/`#format-modal`/`#btn-open-format-modal` (attenzione: `tests/e2e/integration.spec.ts` è in modifica dall'altra sessione — coordinarsi).
- **Loop UI**: l'aggiornamento card a modal aperto non deve ricostruire il DOM a ogni tick (aggiornare solo testi/classi cambiate, come fa `updatePrestigeVisuals`).
- **SW**: bump `CACHE_VERSION` a fine lavoro (convenzione corrente).
- Smoke: primo avvio senza save (bottone nascosto), run pre-prestigio (hub con promo in %, format "???" 0/20), promo pronta, post-20-promozioni (navbar "FORMATTA!", card ready), ciclo NG+ (card rivelata non pronta), esecuzione promozione ed esecuzione formattazione end-to-end.

## 10. Non-goal

- Nessun cambio a formule, soglie o bilanciamento (stesso guadagno Token/Q-Bit, stessa soglia 20).
- Nessun cambio alle sequenze/animazioni di esecuzione (overlay promozione, video Big Bang).
- Nessun terzo layer di prestigio (l'hub però lascia spazio a una terza card futura).
- Niente redesign del Q-Lab oltre la rimozione del blocco reboot.
