# Espòòò Clicker — Restyling Grafico & Fix Mobile

**Data:** 2026-04-16
**Branch:** test
**Approccio scelto:** A — CSS Variable Pass + Fix Mirati

---

## Obiettivo

Restyling grafico del gioco esistente (desktop + mobile) con piena compatibilità Android/iOS. Nessuna modifica alla logica di gioco, alla struttura PHP/JS, o ai temi speciali esistenti (Matrix, Bluescreen, Christmas, Crunch, Super).

---

## Sezione 1 — Font

**Cambio:** sostituzione di `Inter` e `Rajdhani` (Google Fonts) con stack Helvetica nativo.

```css
--font-heading: 'Helvetica Neue', Helvetica, Arial, sans-serif;
--font-body:    'Helvetica Neue', Helvetica, Arial, sans-serif;
```

**File coinvolti:**
- `css/base.css` — aggiornamento delle due variabili `--font-heading` e `--font-body`
- `index.php` — rimozione dei tag `<link>` Google Fonts (`Inter`, `Rajdhani`) e dei `<link rel="preconnect">` associati

**Note:**
- Tutte le regole che assegnano `font-family` esplicitamente ai singoli elementi restano invariate; ereditano automaticamente dalle variabili
- Helvetica Neue è nativa su macOS/iOS; su Android e Windows il fallback Arial è visivamente equivalente
- Risparmio: ~2 richieste HTTP eliminate, ~40KB di font esterni non scaricati

---

## Sezione 2 — Visual Minimal Polish

La palette rimane invariata (`--primary: #3498db`, `--accent: #f1c40f`, ecc.). Le modifiche sono di pulizia e uniformità visiva.

**Rumore visivo:**
- `body::before` (grid cyber): opacità abbassata da `0.1` a `0.06` su desktop per ridurre distrazione; comportamento mobile invariato (animazione già disattivata)
- `body::after` (ambient glow): nessun cambio

**Spaziature e bordi:**
- Padding interni dei pannelli uniformati dove inconsistenti
- `border-radius` standardizzato a `8px` su tutti i componenti che alternano `6px / 8px / 10px` senza criterio

**Invariati:**
- Temi speciali (Matrix, Bluescreen, Christmas, Crunch, Super)
- `css/keyframes.css` — nessun tocco
- Colori di stato (`--success`, `--danger`, `--accent`)
- Sistema skin

---

## Sezione 3 — Fix Mobile (Android & iOS)

**File principali:** `css/mobile.css`, `css/mobile-simplified.css`
**Modifiche puntuali** anche su altri CSS dove necessario (specificità, override).

### 3.1 — Navbar superiore
- Elementi che escono dal viewport: `flex-wrap` controllato + `overflow: hidden` dove mancante
- Testo troncato con `text-overflow: ellipsis` sui label
- Verifica `env(safe-area-inset-*)` su tutti i lati (notch, Dynamic Island)

### 3.2 — Colonna centrale (clicker + score)
- Header stats box: allineamento centrato garantito su schermi <375px
- Bottone clicker: dimensioni e posizione stabili indipendenti dall'altezza schermo
- Score display: `font-size` responsivo con `clamp()` per non uscire dal box

### 3.3 — Tab Store / Upgrades
- Grid `auto-fill`: su mobile piccolo può creare overflow → colonna singola garantita sotto soglia
- `mobile-bug-wallet` sticky: verifica comportamento su tutti i browser mobile principali

### 3.4 — Tab Teams / Buildings
- `#teams-sticky-header`: su alcuni device risulta sovrapposto o tagliato → z-index e posizionamento rivisti
- Card buildings: padding e gap uniformati

### 3.5 — Modali
- `max-height: 80vh` già presente ma alcuni modali ignorano il vincolo → `overflow-y: auto` applicato in modo consistente
- Modali con form (login, cambio username/password): input non visibili quando la tastiera virtuale appare → `scroll-padding-bottom` + gestione viewport

### 3.6 — Tab Prestige / Lab
- `.prestige-upgrade`: inconsistenze nel layout flex → uniformato
- `#lab-wallet-container` sticky: verifica su Safari iOS (problema noto con `position: sticky` + `overflow`)

### 3.7 — Podio / Leaderboard
- `css/podio.css`: verifica overflow orizzontale su schermi stretti

### 3.8 — iOS specifici
- `-webkit-overflow-scrolling: touch`: verifica completezza copertura
- `env(safe-area-inset-bottom)` sulla bottom nav: verifica iPhone con notch e Dynamic Island
- Rimozione `overflow: hidden` su `body` dove causa problemi di scroll su Safari

### 3.11 — Safe Area (PWA installata — iOS & Android)
Il gioco usa `apple-mobile-web-app-status-bar-style: black-translucent`, che estende il contenuto sotto la status bar di sistema. Questo causa navbar superiore nascosta dalle notifiche e contenuto tagliato ai lati su edge-to-edge display.

**Fix:** applicare `env(safe-area-inset-*)` su tutti e quattro i lati dove necessario:
- **Top:** `padding-top` della navbar superiore (`#game-navbar`) aumentato di `env(safe-area-inset-top)` per non finire sotto notch/status bar
- **Bottom:** già parzialmente gestito sulla bottom nav — verifica e completamento con `padding-bottom: env(safe-area-inset-bottom)`
- **Left/Right:** `padding-left: env(safe-area-inset-left)` e `padding-right: env(safe-area-inset-right)` sui contenitori principali per evitare contenuto tagliato su iPhone in landscape o device con bordi arrotondati
- Usare `viewport-fit=cover` già presente nel `<meta name="viewport">` — confermato e compatibile con questo fix
- Testare sia in modalità PWA installata (standalone) sia da browser mobile

### 3.9 — Skins (griglia e visualizzazione)
- `#skins-grid`: card possono risultare tagliate su schermi stretti → altezze `min-height` + `auto`
- `.skin-card` e `.skin-img-container`: altezze fisse → passaggio a valori flessibili
- `.skin-name-display` e `.skin-desc`: `overflow: hidden` + `text-overflow: ellipsis` verificati
- Badge equipaggiata/bloccata: verifica che non si sovrapponga all'immagine su schermi piccoli

### 3.10 — Apertura modale inconsistente (bug touch)
- Su mobile i modali a volte si aprono in modo inatteso o non rispondono al primo tap
- **Causa probabile:** ghost click o event bubbling tra `touchend` e `click`
- **Fix:** verifica `e.stopPropagation()` e `e.preventDefault()` sui trigger in `js/modals.js`
- Verifica `pointer-events` e `z-index` che su mobile possono creare aree di tap non intenzionali
- Verifica che il backdrop non intercetti tap su elementi sottostanti

---

## File coinvolti (riepilogo)

| File | Tipo modifica |
|------|--------------|
| `css/base.css` | Font variables, border-radius uniformato |
| `css/mobile.css` | Fix allineamenti, overflow, safe area — sezioni 3.1–3.10 |
| `css/mobile-simplified.css` | Fix puntuali dove necessario |
| `css/skins.css` / `css/skins-modern.css` | Fix card tagliate, badge sovrapposti (sezione 3.9) |
| `css/podio.css` | Overflow orizzontale mobile |
| `js/modals.js` | Fix event handling touch (sezione 3.10) |
| `index.php` | Rimozione Google Fonts link |

---

## Vincoli

- Nessuna modifica a `js/script.js`, `js/game-logic.js`, logica PHP
- Temi speciali intoccati
- Architettura CSS bundle (`css/concat.php`) invariata
- Compatibilità minima: iOS 15+, Android Chrome 100+
