# UI / UX — Backlog migliorie

> Stato al 2026-06-12 (branch `develop-exp`). Voci ordinate per priorità.
> Legenda verifica: **[H]** = verificabile in headless/preview · **[D]** = serve dispositivo reale o occhio umano.
> Nota verifica headless: la preview congela le animazioni CSS (`document.timeline` fermo a 0) → gli elementi animati appaiono al primo keyframe; non è un bug del gioco.
> Nota build: `dist/` e `dist-v3/` NON committati in questa campagna (working tree con modifiche sorgente di altra sessione in corso) → rigenerare con `npm run build` al prossimo deploy.

---

## 1. Arcade — mobile

### ✅ Fatto
- Overflow orizzontale a 375px + riserva pad touch (commit `2b01e86`).
- **D-pad touch target 44px** (era 38, WCAG 2.5.8/Apple HIG) + pad compattato a 356px (entra anche su 360) + riserva `padding-bottom: 200px` ricalcolata + **vibrazione aptica** `navigator.vibrate(10)` su pointerdown (commit `2405630`). Verificato in preview a 375×812: pad 356×176, zero overflow.

### Da fare
| Pri | Voce | Dettaglio | Verifica |
|-----|------|-----------|----------|
| P2 | Landscape mobile | Pad centrato in basso: in landscape (es. 812×375) copre la zona di gioco. Valutare layout split: D-pad a sinistra, azioni a destra (`justify-content: space-between` su larghezza piena). | [D] |
| P3 | Dispositivi ibridi | Il pad appare solo con `(hover: none) and (pointer: coarse)`: su laptop touch non appare mai. Accettabile by design (c'è la tastiera), da sapere. | — |
| P3 | Test su device reale | Tutta la verifica è stata fatta in preview headless simulando le condizioni touch: serve un giro vero su telefono (iOS Safari in primis: safe-area, `viewport-fit=cover` già presente). | [D] |

---

## 2. Arcade — generale

### ✅ Fatto (commit `2405630`)
- Contrasto testi secondari: `.cmd-act`/`.vp-label`/`.item-desc`/voci menu → floor `#9aa8b5`; hover coerenti `#b8c4d0`.
- Floor tipografico: voci menu e `.item-desc` → **12px espliciti** (la root della pagina arcade è 14px: i rem ingannano, 0.75rem = 10.5px).

### Da fare
| Pri | Voce | Dettaglio | Verifica |
|-----|------|-----------|----------|
| P2 | Consolidamento generazioni CSS | Restano `modals-arcade.css` (modale in-game) e `arcade-fullscreen.css` (pagina standalone, percorso principale); `modals-arcade-polish.css` eliminato (vedi §7). Stili duplicati tra le due generazioni. | [H] |
| P3 | Screenshot/preview giochi nel monitor | Il monitor CRT mostra solo testo; un thumbnail o mini-gif per gioco renderebbe la selezione più chiara. | [D] |

---

## 3. Gioco principale — contrasto e leggibilità (AA)

### ✅ Fatto (commit `a5eb2dd`)
- `nav-item`/`nav-label` `#546478` → `#8b9bb0`; tab inattive `#4a6582` → `#8b9bb0` (+hover `#c8d6e5`); moltiplicatori legacy `#5d7c9a` → `#8b9bb0` (valgono su mobile ≤768).
- **Scoperta**: su desktop ≥769 vince il layer v3 (`src/ui/desktop-fixes/`), non il CSS legacy. Corretti lì i valori reali: label HUD `opacity: 0.5 → 0.75` ([score-header.css](src/ui/desktop-fixes/score-header.css)), moltiplicatori inattivi `rgba(248,250,252,0.45) → 0.6` ([cards.css](src/ui/desktop-fixes/cards.css)).
- Segnale non-cromatico stato attivo moltiplicatori: coperto (fondo pieno+bordo+peso vs ghost, polarità invertita; `aria-pressed` già presente).
- Tab inattive v3 desktop (`rgba(248,250,252,0.5)` ≈ 5.5:1) già sopra AA: lasciate.

---

## 4. Gioco principale — i18n

| Pri | Voce | Dettaglio | Verifica |
|-----|------|-----------|----------|
| P2 | Stringhe hardcoded nei modali | [modals.php](includes/modals.php) ha testi italiani inline mentre `langs/it.php` contiene label mai usate (nota: `col_center.php` invece USA `$labels`). Decidere la strada: o si adotta il file lingua ovunque (lavoro esteso ma abilita l'inglese), o si rimuove `langs/` come dead code. **Decisione utente richiesta.** | [H] |

---

## 5. Gioco principale — performance visiva

| Pri | Voce | Dettaglio | Verifica |
|-----|------|-----------|----------|
| P2 | Dieta glassmorphism | `backdrop-filter: blur()` su molti pannelli sovrapposti: costoso su mobile/GPU integrate. Ridurre i layer con blur attivo contemporaneamente. | [D] perf reale |
| P2 | Dieta gradient-text | `background-clip: text` + animazioni su più elementi contemporanei forza repaint continui. Limitare alle headline. | [D] perf reale |

---

## 6. Temi / Skin (serve sessione di design + browser reale)

### ✅ Fatto (commit `3eb50b3`)
- **FOUC al primo equip**: la classe body si applica solo a CSS tema caricato (`link.onload` + coda per load concorrenti + failsafe 2.5s + token anti-race su equip rapidi). Verificato: primo equip asincrono, equip successivi sincroni, nessun link duplicato.

### Da fare
| Pri | Voce | Dettaglio | Verifica |
|-----|------|-----------|----------|
| P1 | 3 sistemi CSS paralleli | `skins.css` + `skins-modern.css` + i theme-file: regole sovrapposte, guerra di `!important`. Serve consolidamento con variabili CSS per tema (un `[data-theme="x"]` e custom properties, via gli `!important`). | [D] |
| P2 | Christmas mezzo-tema | Il tema natalizio copre solo parte dei componenti (modali e store restano base) → effetto incoerente. Completarlo o ritirarlo dallo store skin. | [D] |
| P3 | Anteprima skin nel guardaroba | L'equip è "alla cieca": un thumbnail per skin nel guardaroba aiuterebbe. | [D] |

---

## 7. Pulizia CSS / dead code

### ✅ Fatto (commit `04da44b`)
- `modals-arcade-polish.css` eliminato: orfano confermato; i selettori unici (`arcade-ui-overlay`, `val-wave`) sono coperti da `arcade/snake/css/snake.css` e stili inline dei giochi; il wallet in-modal è sostituito da `fs-wallet`.
- `css/concat.php` eliminato (fuori dal percorso di carico, referenziava `mobile-simplified.css` inesistente). Lasciato il fallback regex deprecato in `sw.js` (innocuo, evita churn di CACHE_VERSION).

---

## 8. Mobile — gioco principale

### ✅ Fatto (commit `d7b9975`)
- **Input 16px**: floor anti auto-zoom iOS sulla regola base (`components.css`) + override alta specificità in coda a `mobile.css` (batteva `.clean-input input` 0.95rem). Tutti gli input login/account a 16px verificati a 375px.
- **Griglia guardaroba**: la scala colonne del layer v3 ([skins-modal-v3.css](src/ui/desktop-fixes/skins-modal-v3.css)) si fermava a 1100px → a 375px restavano 4 colonne da 68px. Aggiunto step ≤768px → 2 colonne (card 161×248).
- **Touch target chiusura modali**: X mobile 40→44px ([modal-close.css](src/ui/mobile-fixes/modal-close.css), [skins-modal.css](src/ui/mobile-fixes/skins-modal.css)); la X del guardaroba era **20px anche su desktop** (`!important` senza media guard) → 28px desktop (≥24 WCAG 2.5.8), 44px mobile.

### Da fare
| Pri | Voce | Dettaglio | Verifica |
|-----|------|-----------|----------|
| P2 | Icone navbar 35px di larghezza | A 375px le voci navbar sono 35×52: altezza ok, larghezza sotto i 44 Apple HIG ma sopra i 24 WCAG. Vincolo fisico (10 voci su 375px): servirebbe ridisegno navbar (es. overflow menu). | [D] |
| P2 | Buco breakpoint tablet 769–1024 | Tra il layout mobile (≤768) e il desktop pieno c'è una fascia dove le colonne si stringono male. Aggiungere breakpoint intermedio. | [D] |

---

## 9. Rinvii deliberati / rischi accettati

- **Anti-cheat reward** (non-UI ma emerso negli audit): un cap lato server non è praticabile per un idle game che arriva legittimamente a 1e308+; servirebbe simulazione server-authoritative. Rischio accettato.
- **Animazioni canvas arcade** (qualità resa giochi): non verificabili in headless, si valutano giocando.

---

## Già completato in questa campagna (riferimento rapido)

- Sicurezza backend: rate limiting login, anti-rollback atomico, cookie hardening, validazione registrazione.
- A11y tastiera (P0) + ARIA: tablist/tab/aria-selected, aria-pressed sui moltiplicatori, aria-label su Compra/select, landmark, h1 (commit `d97264a`).
- Fotosensibilità: flash Fury del tema Super da ~10/s a 2/s — WCAG 2.3.1 (commit `b3e9e2f`).
- Bug Wave 1: doppio avvio routine, guadagni in background, arcadeHighScores persistenti al prestige, audio fade-stop, display >1e308, `bluescreenMultiplier` Decimal (commit `703c1c9`).
- Bilanciamento: cpsPerUnit ultimi 2 team corretti (erano 1000× sotto) (commit `d154130`).
- Modali: chiusura Esc/backdrop; statistiche senza reset hover; wallet arcade senza cali al riscatto; camera jitter Super Espò.
- Arcade mobile: overflow monitor/menu + riserva pad touch (commit `2b01e86`).
- Contrasto AA gioco principale, legacy + layer v3 (commit `a5eb2dd`, 2026-06-12).
- Arcade: D-pad 44px + aptico + contrasto/tipografia floor (commit `2405630`, 2026-06-12).
- Temi: fix FOUC primo equip (commit `3eb50b3`, 2026-06-12).
- Mobile gioco principale: input 16px, guardaroba 2 col, X modali 44px (commit `d7b9975`, 2026-06-12).
- Pulizia: modals-arcade-polish.css + concat.php rimossi (commit `04da44b`, 2026-06-12).
