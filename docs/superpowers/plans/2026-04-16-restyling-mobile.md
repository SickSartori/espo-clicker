# Restyling Grafico & Fix Mobile — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sostituire il font con Helvetica stack nativo, pulire il visual noise, e correggere tutti gli allineamenti/overflow su mobile (Android & iOS) inclusa la gestione completa delle safe area per la PWA installata.

**Architecture:** CSS Variable Pass (Approccio A) — si aggiornano le variabili in `base.css`, si eliminano i font Google, e si applicano fix mirati a `mobile.css` / `mobile-simplified.css`. La logica JS e i temi speciali restano intatti. Un solo task JS per il bug touch sui modali.

**Tech Stack:** CSS (custom properties, `env()`, `clamp()`, `dvh`), vanilla JS, PHP/HTML per `index.php`.

---

## File Map

| File | Ruolo |
|------|-------|
| `css/base.css` | Font variables + grid opacity |
| `css/clicker.css` | Font hardcoded in `.skill-btn` e rick-rolling score |
| `css/mobile.css` | Fix navbar, center, store, teams, modali, prestige, safe area |
| `css/mobile-simplified.css` | Font hardcoded in `.modal-close-btn::after` + safe area supplementare |
| `css/modals-core.css` | Font hardcoded in login modal + prestige anim title |
| `css/modals-arcade.css` | Font hardcoded in arcade modal |
| `css/modals-content.css` | Font hardcoded in `.mixer-value` |
| `css/podio.css` | Overflow orizzontale mobile |
| `css/skins.css` | Skin card altezza fissa → flessibile |
| `index.php` | Rimozione Google Fonts `<link>` |
| `js/modals.js` | Fix ghost click / event bubbling su touch |

---

## Task 1: Font — Variabili CSS

**Files:**
- Modify: `css/base.css`

- [ ] **Step 1: Aggiorna le due variabili font in `:root`**

In `css/base.css`, sostituisci:
```css
--font-heading: 'Rajdhani', sans-serif;
--font-body: 'Inter', sans-serif;
```
con:
```css
--font-heading: 'Helvetica Neue', Helvetica, Arial, sans-serif;
--font-body:    'Helvetica Neue', Helvetica, Arial, sans-serif;
```

- [ ] **Step 2: Verifica visiva**

Apri il gioco nel browser. Il testo della navbar, dei bottoni e dei display score deve apparire in Helvetica Neue (Mac/iOS) o Arial (Windows/Android). Nessun testo in stile serif o senza font.

- [ ] **Step 3: Commit**

```bash
git add css/base.css
git commit -m "style: sostituisci Inter/Rajdhani con Helvetica stack in CSS vars"
```

---

## Task 2: Font — Rimuovi riferimenti hardcoded nei CSS

**Files:**
- Modify: `css/clicker.css`
- Modify: `css/mobile-simplified.css`
- Modify: `css/mobile.css`
- Modify: `css/modals-core.css`
- Modify: `css/modals-arcade.css`
- Modify: `css/modals-content.css`

- [ ] **Step 1: Fix `css/clicker.css` — `.skill-btn`**

Cerca `font-family: 'Inter', sans-serif;` nel contesto di `.skill-btn` e sostituisci con:
```css
font-family: var(--font-heading);
```

- [ ] **Step 2: Fix `css/clicker.css` — rick-rolling score**

Cerca `font-family: 'Rajdhani', sans-serif;` nel contesto di `body.rick-rolling #game-container #score-display` e sostituisci con:
```css
font-family: var(--font-heading);
```

- [ ] **Step 3: Fix `css/mobile-simplified.css` — `.modal-close-btn::after`**

Cerca `font-family: 'Rajdhani', sans-serif;` nel contesto di `.modal-close-btn::after` e sostituisci con:
```css
font-family: var(--font-heading);
```

- [ ] **Step 4: Fix `css/mobile.css` — `.mobile-nav-btn`**

Cerca `font-family: 'Inter', sans-serif;` nel contesto di `.mobile-nav-btn` e sostituisci con:
```css
font-family: var(--font-heading);
```

- [ ] **Step 5: Fix `css/modals-core.css` — login modal**

Cerca `font-family: 'Inter', sans-serif;` nel contesto di `#login-modal .modal-content` e sostituisci con:
```css
font-family: var(--font-body);
```

Cerca `font-family: 'Rajdhani', sans-serif;` nel contesto del blocco `body > #login-modal h2, body > #login-modal p, ...` e sostituisci con:
```css
font-family: var(--font-heading);
```

- [ ] **Step 6: Fix `css/modals-core.css` — prestige animation title**

Cerca `font-family: 'Rajdhani', sans-serif;` nel contesto di `.prestige-anim-title` e sostituisci con:
```css
font-family: var(--font-heading);
```

- [ ] **Step 7: Fix `css/modals-arcade.css`**

Cerca `font-family: 'Rajdhani', sans-serif;` e sostituisci con:
```css
font-family: var(--font-heading);
```

- [ ] **Step 8: Fix `css/modals-content.css` — `.mixer-value`**

Cerca `font-family: 'Inter', monospace;` nel contesto di `.mixer-value` e sostituisci con:
```css
font-family: monospace;
```
(Mantiene la larghezza fissa dei numeri senza dipendere da Inter.)

- [ ] **Step 9: Verifica visiva completa**

Apri: login modal, settings modal, prestige animation, arcade modal, skins modal. Verifica che nessun elemento mostri fallback serif o browser default. Disabilita la rete nel DevTools e ricarica — nessun font esterno deve essere caricato.

- [ ] **Step 10: Commit**

```bash
git add css/clicker.css css/mobile-simplified.css css/mobile.css css/modals-core.css css/modals-arcade.css css/modals-content.css
git commit -m "style: rimuovi font-family hardcoded Inter/Rajdhani, usa CSS vars"
```

---

## Task 3: Font — Rimuovi Google Fonts da `index.php`

**Files:**
- Modify: `index.php`

- [ ] **Step 1: Rimuovi i tag Google Fonts**

In `index.php`, rimuovi queste 4 righe:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Rajdhani:wght@500;600;700&display=swap">
```
Tieni il `<link rel="preconnect" href="https://cdnjs.cloudflare.com">` e quello per jsdelivr — servono per FontAwesome.

- [ ] **Step 2: Verifica**

Ricarica il gioco. Apri DevTools → Network → filtra per "Font". Non deve apparire nessuna richiesta a `fonts.googleapis.com` o `fonts.gstatic.com`. L'aspetto deve essere identico al Task 1.

- [ ] **Step 3: Commit**

```bash
git add index.php
git commit -m "perf: rimuovi Google Fonts, risparmio 2 HTTP requests e ~40KB"
```

---

## Task 4: Visual Polish — Grid opacity e border-radius

**Files:**
- Modify: `css/base.css`

- [ ] **Step 1: Abbassa opacità grid cyber su desktop**

In `css/base.css`, nel selettore `body::before`, trova:
```css
background-image:
    linear-gradient(rgba(52, 152, 219, 0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(52, 152, 219, 0.1) 1px, transparent 1px);
```
Sostituisci con:
```css
background-image:
    linear-gradient(rgba(52, 152, 219, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(52, 152, 219, 0.06) 1px, transparent 1px);
```

- [ ] **Step 2: Aggiungi variabili CSS per border-radius in `:root`**

In `css/base.css`, alla fine del blocco `:root { ... }`, aggiungi:
```css
--radius-sm: 6px;
--radius-md: 8px;
--radius-lg: 12px;
```

- [ ] **Step 3: Verifica desktop**

Ricarica su schermo desktop. La griglia di sfondo deve essere meno invasiva ma ancora visibile. Nessun'altra variazione visiva.

- [ ] **Step 4: Commit**

```bash
git add css/base.css
git commit -m "style: abbassa opacità grid cyber, aggiungi variabili border-radius"
```

---

## Task 5: Safe Area Insets — Tutti i 4 lati (PWA iOS & Android)

Il gioco usa `viewport-fit=cover` e `black-translucent`, quindi il contenuto si estende sotto il notch/status bar. Servono inset su tutti i lati.

**Files:**
- Modify: `css/mobile.css`

- [ ] **Step 1: Aggiungi safe area top alla navbar**

In `css/mobile.css`, nel blocco `@media only screen and (max-width: 1024px)`, trova il selettore `#game-navbar` e aggiorna il padding superiore:

```css
#game-navbar {
    padding: 0 8px;
    padding-top: env(safe-area-inset-top);
    height: calc(55px + env(safe-area-inset-top));
    gap: 5px;
    display: flex;
    align-items: center;
    justify-content: space-between;
}
```

- [ ] **Step 2: Correggi il body padding-top per compensare la navbar più alta**

Nello stesso blocco `@media`, aggiorna il `body`:
```css
body {
    padding: 0;
    padding-top: calc(55px + env(safe-area-inset-top));
    padding-bottom: 56px;
    overflow: hidden;
    position: fixed;
    width: 100%;
    height: 100%;
    overscroll-behavior-y: contain;
    touch-action: pan-x pan-y;
}
```

- [ ] **Step 3: Aggiungi safe area left/right al game-container**

```css
#game-container {
    display: block;
    width: 100%;
    height: 100%;
    margin: 0;
    border: none;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    position: relative;
    padding-left: env(safe-area-inset-left);
    padding-right: env(safe-area-inset-right);
    box-sizing: border-box;
}
```

- [ ] **Step 4: Aggiungi safe area bottom alla bottom nav**

Trova `#mobile-nav-bar` e aggiorna:
```css
#mobile-nav-bar {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    height: calc(56px + env(safe-area-inset-bottom));
    background: #151b22;
    border-top: 1px solid #2c3e50;
    justify-content: space-around;
    align-items: flex-start;
    padding-top: 8px;
    padding-bottom: env(safe-area-inset-bottom);
    padding-left: env(safe-area-inset-left);
    padding-right: env(safe-area-inset-right);
    z-index: 2000;
    box-shadow: 0 -5px 20px rgba(0, 0, 0, 0.5);
}
```

- [ ] **Step 5: Correggi l'altezza del game-container in mobile-simplified.css**

In `css/mobile-simplified.css`, trova:
```css
html body #game-container {
    height: calc(100dvh - 111px); /* 55px navbar + 56px bottom nav */
}
```
Sostituisci con:
```css
html body #game-container {
    height: calc(100dvh - 111px - env(safe-area-inset-top) - env(safe-area-inset-bottom));
}
```

- [ ] **Step 6: Aggiorna il body padding-bottom per la bottom nav più alta**

Nello stesso blocco `@media` di `mobile.css`:
```css
body {
    padding-bottom: calc(56px + env(safe-area-inset-bottom));
    /* altre proprietà invariate */
}
```

- [ ] **Step 7: Verifica**

Testa su iPhone con notch (o con iPhone 14 Pro / Dynamic Island in simulatore Safari). La navbar non deve essere nascosta dalla status bar. I lati non devono essere tagliati in landscape. La bottom nav non deve scomparire sotto l'indicatore home.

- [ ] **Step 8: Commit**

```bash
git add css/mobile.css css/mobile-simplified.css
git commit -m "fix: safe area insets completi su tutti i 4 lati per PWA iOS/Android"
```

---

## Task 6: Navbar Mobile — Fix overflow e allineamento

**Files:**
- Modify: `css/mobile.css`

- [ ] **Step 1: Impedisci overflow della navbar su schermi stretti**

In `css/mobile.css`, blocco `@media (max-width: 768px)`, aggiungi/aggiorna `#game-navbar`:
```css
#game-navbar {
    padding: 5px 8px;
    padding-top: env(safe-area-inset-top);
    gap: 4px;
    overflow: hidden;
}
```

- [ ] **Step 2: Previeni il testo di uscire dalle nav-item**

Nel blocco `@media only screen and (max-width: 1024px)`:
```css
.nav-item {
    width: auto;
    flex: 0 0 auto;
    min-width: 35px;
    max-width: 50px;
    padding: 8px 4px;
    margin: 0;
    overflow: hidden;
}

.nav-label {
    display: none;
}
```

- [ ] **Step 3: Verifica**

Testa su viewport 375px (iPhone SE). I bottoni della navbar non devono uscire dal viewport. Nessun bottone deve essere tagliato o invisibile.

- [ ] **Step 4: Commit**

```bash
git add css/mobile.css
git commit -m "fix(mobile): navbar overflow e allineamento su schermi stretti"
```

---

## Task 7: Center Column — Score e Clicker su mobile

**Files:**
- Modify: `css/mobile.css`

- [ ] **Step 1: Score display responsivo su schermi piccoli**

In `css/mobile.css`, blocco `@media only screen and (max-width: 1024px)`, aggiungi:
```css
.column-header-center .header-value {
    font-size: clamp(0.7rem, 2.5vw, 0.85rem);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 80px;
}

.column-header-center .header-main-score #score-display {
    font-size: clamp(1.2rem, 4vw, 1.8rem);
}
```

- [ ] **Step 2: Allineamento header stats su schermi <375px**

```css
@media only screen and (max-width: 374px) {
    .column-header-center {
        padding: 0 6px;
    }

    .column-header-center .header-stat-box {
        min-width: 38px;
    }

    .column-header-center .header-label {
        font-size: 0.5rem;
    }
}
```

- [ ] **Step 3: Verifica**

Testa a 375px e 320px. Il score display deve essere leggibile e non uscire dal box. Le stat box laterali (token, qbits) non devono sovrapporsi al score centrale.

- [ ] **Step 4: Commit**

```bash
git add css/mobile.css
git commit -m "fix(mobile): score display e header allineamento su schermi piccoli"
```

---

## Task 8: Store / Upgrades — Fix mobile

**Files:**
- Modify: `css/mobile.css`

- [ ] **Step 1: Garantisci colonna singola su mobile piccolo**

In `css/mobile.css`, blocco `@media only screen and (max-width: 1024px)`:
```css
#click-upgrade-list,
#enhancement-list {
    grid-template-columns: 1fr;
    gap: 8px;
}
```
Verifica che questa regola sia presente e non sia overridata. Se c'è un `@media (max-width: 768px)` che la contiene, sposta a `max-width: 1024px`.

- [ ] **Step 2: Sticky bug-wallet — fix Safari**

Il `position: sticky` con `overflow: hidden` su antenati non funziona su Safari iOS. Aggiungi:
```css
.mobile-bug-wallet {
    position: -webkit-sticky;
    position: sticky;
    top: 0;
    z-index: 110;
}

/* Assicura che il parent non abbia overflow:hidden */
.tab-content {
    overflow-y: auto;
    overflow-x: hidden; /* mai hidden su entrambi gli assi */
}
```

- [ ] **Step 3: Verifica**

Testa in Safari iOS (o simulatore). La bug wallet deve rimanere in cima mentre scrolli la lista upgrade. La griglia deve mostrare una sola colonna su iPhone.

- [ ] **Step 4: Commit**

```bash
git add css/mobile.css
git commit -m "fix(mobile): store colonna singola e sticky bug-wallet Safari"
```

---

## Task 9: Teams / Buildings — Fix mobile

**Files:**
- Modify: `css/mobile.css`

- [ ] **Step 1: Fix `#teams-sticky-header` sovrapposto o tagliato**

In `css/mobile.css`, blocco `@media only screen and (max-width: 1024px)`, aggiorna `#teams-sticky-header`:
```css
#teams-sticky-header {
    position: -webkit-sticky;
    position: sticky;
    top: 0;
    z-index: 200;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
    padding: 10px 15px;
    margin: 0;
    width: 100%;
    box-sizing: border-box;
    display: block;
    background: #0d1117; /* sfondo solido, non trasparente */
}
```

- [ ] **Step 2: Uniforma gap e padding card buildings**

```css
#building-list-container .upgrade {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-md);
    padding: 12px 12px;
    margin-bottom: 8px;
    gap: 8px;
    box-sizing: border-box;
}
```

- [ ] **Step 3: Verifica**

Testa scrolling nel tab Teams. L'header con i pulsanti x1/x10/x100 deve restare fisso in cima. Le card non devono sovrapporsi all'header.

- [ ] **Step 4: Commit**

```bash
git add css/mobile.css
git commit -m "fix(mobile): teams sticky header e card buildings allineamento"
```

---

## Task 10: Modali — Fix overflow e tastiera virtuale

**Files:**
- Modify: `css/mobile.css`
- Modify: `css/mobile-simplified.css`

- [ ] **Step 1: Garantisci overflow-y su tutti i modali**

In `css/mobile.css`, blocco `@media only screen and (max-width: 1024px)`:
```css
.modal-content {
    width: 92%;
    max-height: 80vh;
    max-height: 80dvh;
    margin: 0;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    box-sizing: border-box;
}
```

- [ ] **Step 2: Fix input nascosto da tastiera virtuale**

In `css/mobile.css`, aggiungi dopo il blocco modale:
```css
@media only screen and (max-width: 1024px) {
    /* Quando la tastiera è aperta il viewport si restringe:
       scroll-padding assicura che l'input focusato sia visibile */
    html body #login-modal .modal-content,
    html body #account-modal .modal-content {
        scroll-padding-bottom: 120px;
        overflow-y: auto;
    }

    /* Impedisce che l'input sparisca sotto la tastiera */
    html body #login-modal .modal-content input:focus,
    html body #account-modal .modal-content input:focus {
        scroll-margin-bottom: 20px;
    }
}
```

- [ ] **Step 3: Verifica**

Apri il login modal su un iPhone/Android reale o simulatore. Tocca il campo username. La tastiera deve aprirsi senza nascondere il campo. Scrolla il modale — deve scrollare internamente, non la pagina intera.

- [ ] **Step 4: Commit**

```bash
git add css/mobile.css css/mobile-simplified.css
git commit -m "fix(mobile): modali overflow e input visibili con tastiera virtuale"
```

---

## Task 11: Prestige / Lab — Fix sticky Safari

**Files:**
- Modify: `css/mobile.css`

- [ ] **Step 1: Fix `#lab-wallet-container` sticky su Safari iOS**

Safari iOS richiede che nessun antenato abbia `overflow: hidden` per far funzionare `position: sticky`. In `css/mobile.css`:
```css
@media only screen and (max-width: 1024px) {
    #lab-wallet-container {
        display: flex;
        position: -webkit-sticky;
        position: sticky;
        top: 0;
        z-index: 100;
        background-color: #14202b;
        margin: 0 0 10px 0;
        padding: 10px;
        border-radius: 0 0 var(--radius-md) var(--radius-md);
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5);
    }

    /* Parent deve avere overflow-y:auto, non hidden */
    #left-column,
    #right-column {
        overflow-y: auto;
        overflow-x: hidden;
    }
}
```

- [ ] **Step 2: Uniforma `.prestige-upgrade` flex**

```css
@media only screen and (max-width: 1024px) {
    .prestige-upgrade {
        flex-direction: column;
        align-items: stretch;
        height: auto;
        padding: 12px;
        gap: 8px;
        box-sizing: border-box;
    }

    .prestige-upgrade .upgrade-actions {
        width: 100%;
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        padding-top: 10px;
        margin-top: 5px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
}
```

- [ ] **Step 3: Verifica**

Testa il tab Prestige su Safari iOS. Il wallet deve restare sticky. Le card prestige devono avere layout corretto senza elementi tagliati.

- [ ] **Step 4: Commit**

```bash
git add css/mobile.css
git commit -m "fix(mobile): prestige lab-wallet sticky Safari e layout flex uniformato"
```

---

## Task 12: Podio — Fix overflow orizzontale

**Files:**
- Modify: `css/podio.css`

- [ ] **Step 1: Previeni overflow orizzontale su schermi stretti**

Aggiungi in fondo a `css/podio.css`:
```css
@media only screen and (max-width: 768px) {
    .leaderboard-item {
        padding: 10px;
        gap: 8px;
    }

    .lb-left {
        min-width: 0;
        flex: 1;
        overflow: hidden;
    }

    .leaderboard-name {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 120px;
    }

    .leaderboard-score {
        flex-shrink: 0;
        white-space: nowrap;
    }
}
```

- [ ] **Step 2: Verifica**

Apri il podio/leaderboard su viewport 375px. Nessun elemento deve causare scroll orizzontale. I nomi lunghi devono essere troncati con `…`.

- [ ] **Step 3: Commit**

```bash
git add css/podio.css
git commit -m "fix(mobile): podio overflow orizzontale su schermi stretti"
```

---

## Task 13: Skins — Fix card e badge

**Files:**
- Modify: `css/skins.css`

- [ ] **Step 1: Rendi la card height flessibile**

In `css/skins.css`, nel selettore `.skin-card`:
```css
.skin-card {
    background-color: var(--bg-panel);
    border: 3px solid var(--border-color);
    border-radius: var(--radius-lg);
    min-height: 200px;   /* era height: 240px fisso */
    height: auto;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding: 10px 10px 15px 10px;
    box-sizing: border-box;
    position: relative;
    overflow: visible;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s, z-index 0s;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
}
```

- [ ] **Step 2: Aggiungi overflow su testi della card**

In `css/skins.css`, aggiungi (o aggiorna se già presenti):
```css
.skin-name-display {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
}

.skin-desc {
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
}
```

- [ ] **Step 3: Fix badge equipaggiata/bloccata sovrapposta**

In `css/skins.css`, assicurati che il badge abbia z-index e non esca dalla card:
```css
/* Badge in alto a sinistra — non deve sovrapporsi all'immagine in modo incontrollato */
.skin-card .skin-badge {
    position: absolute;
    top: 6px;
    left: 6px;
    z-index: 10;
    font-size: 0.65rem;
    max-width: calc(100% - 12px);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
```
(Il nome esatto della classe badge potrebbe differire. Prima di scrivere il CSS, cerca in `css/skins.css` il selettore `position: absolute` dentro `.skin-card` — quello è il badge. Usa il selettore trovato al posto di `.skin-card .skin-badge`.)

- [ ] **Step 4: Verifica**

Apri la schermata skins su iPhone (portrait e landscape). Le card non devono tagliare il testo. I badge "Equipaggiata" / "Bloccata" non devono sovrapporsi all'immagine.

- [ ] **Step 5: Commit**

```bash
git add css/skins.css
git commit -m "fix(mobile): skin card altezza flessibile, testi troncati, badge posizionato"
```

---

## Task 14: Modali — Fix ghost click e touch bubbling

**Files:**
- Modify: `js/modals.js`

- [ ] **Step 1: Trova la funzione `openModal` e il backdrop click handler**

In `js/modals.js`, cerca il pattern con cui i modali vengono aperti e chiusi al click sul backdrop. Cerca `closeModal` e il listener su `.modal-backdrop`.

- [ ] **Step 2: Aggiungi protezione da ghost click**

Subito prima della funzione `openModal` (o nella sezione helpers in cima), aggiungi:
```js
// Previene ghost click: su touch, il click arriva ~300ms dopo touchend.
// Se l'ultimo touchend è avvenuto entro 500ms, ignora il click.
let lastTouchEnd = 0;
document.addEventListener('touchend', () => {
    lastTouchEnd = Date.now();
}, { passive: true });

function isFastClick() {
    return Date.now() - lastTouchEnd < 500;
}
```

- [ ] **Step 3: Applica `isFastClick()` ai trigger dei modali**

Ogni volta che un bottone apre o chiude un modale tramite evento `click`, avvolgi il corpo dell'handler con il guard:
```js
btnElement.addEventListener('click', (e) => {
    if (isFastClick()) return; // blocca ghost click post-touch
    // ... logica esistente invariata
});
```
Applica questo pattern a tutti i bottoni di apertura modale (`openAchievementsBtn`, `openStatsBtn`, `openSettingsBtn`, `openLeaderboardBtn`, `openSkinsBtn`, `openAccountBtn`, `openHelpBtn`, `openArcadeBtn`).

- [ ] **Step 4: Fix backdrop click — stopPropagation**

Trova il listener sul backdrop che chiude il modale (cerca `modal-backdrop` con listener `click`). Aggiorna il pattern a:
```js
backdrop.addEventListener('click', (e) => {
    if (isFastClick()) return;
    if (e.target === backdrop) {    // chiudi solo se click FUORI dalla modal-content
        closeModal(modal);
    }
});
```

- [ ] **Step 5: Verifica**

Testa su Android Chrome e Safari iOS. Apri e chiudi ogni modale più volte velocemente. Nessun modale deve aprirsi involontariamente dopo un tap su un'altra area. Il backdrop deve chiudere il modale solo se toccato fuori dalla card del modale.

- [ ] **Step 6: Commit**

```bash
git add js/modals.js
git commit -m "fix(touch): ghost click su modali, isFastClick guard e backdrop stopPropagation"
```

---

## Task 15: Verifica finale cross-device

- [ ] **Step 1: Test desktop Chrome (1920×1080)**
  - Font Helvetica corretto ovunque
  - Grid sfondo meno intensa ma visibile
  - Tutti i modali aprono/chiudono correttamente

- [ ] **Step 2: Test mobile Chrome Android (375×667)**
  - Navbar non tagliata
  - Score display leggibile
  - Tutti i tab (Click, Store, Teams, Prestige, Podio) navigabili senza overflow
  - Modali fullscreen corretti
  - Skins visualizzate correttamente

- [ ] **Step 3: Test Safari iOS (375×812 — iPhone X/11)**
  - Safe area top: navbar non nascosta da status bar
  - Safe area bottom: bottom nav visibile sopra indicatore home
  - Sticky wallet funziona nel tab Store e Lab
  - Input login non nascosti da tastiera

- [ ] **Step 4: Test PWA installata su iOS**
  - Aggiungi a schermata Home e lancia in standalone
  - Nessun contenuto tagliato ai lati o in cima/fondo

- [ ] **Step 5: Temi speciali invariati**
  - Attiva Matrix → UI verde, nessuna regressione
  - Attiva Bluescreen → schermata blu, nessuna regressione

- [ ] **Step 6: Commit finale (se non già committed)**

```bash
git add -A
git commit -m "chore: verifica finale restyling mobile — tutti i fix applicati"
```
