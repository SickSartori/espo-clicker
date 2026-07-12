# Hub Prestigio (Promozione + Formattazione) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un unico "Hub Prestigio" (modal dal bottone navbar) con due card — Promozione (oro) e Formattazione (viola) — che sostituisce i modal `#prestige-modal`/`#format-modal` e il blocco reboot del Q-Lab.

**Architecture:** Il markup PHP server-rendered aggiunge `#prestige-hub-modal` in `includes/modals.php` riusando gli id di conferma esistenti (`#btn-confirm-prestige`, `#btn-confirm-format`) così i listener attuali — incluso il trucco video Big Bang sul gesto umano — restano intatti. `openPrestigeContract()` diventa `openPrestigeHub()`; una nuova `renderPrestigeHubCards()` (ui-functions.js) imposta gli stati delle card ed è richiamata dal loop UI (via `updateWallets`) solo a modal aperto. Spec: `docs/superpowers/specs/2026-07-12-prestige-hub-design.md`.

**Tech Stack:** PHP legacy include + vanilla JS (bundle concatenato `dist/game.bundle.min.js` via `scripts/vite-plugin-legacy.ts`), CSS in `styles/` (legacy + `styles/ui/`), build `npm run build`, FontAwesome 6.4.0, GSAP, break_eternity Decimal.

## Global Constraints

- **Branch condiviso `develop-v3` con un'altra sessione attiva**: stageare SOLO i file elencati dal task (`git add <path> <path>`), MAI `git add -A`/`-u`. Prima di ogni commit: `git status --porcelain` e verificare che in staging ci siano solo i propri file. Se altri file risultano modificati, non toccarli.
- **Commit: solo titolo** — niente body, niente Co-Authored-By (convenzione repo).
- **i18n doppio canale, doppia lingua**: ogni stringa nuova va in `langs/it.php` E `langs/en.php` (markup PHP), oppure in `src/data/texts.ts` E `src/data/en/texts.ts` (stringhe JS).
- `dist/` e `dist-v3/` sono generati (gitignored): mai editarli; dopo modifiche a `js/`, `styles/`, `src/` eseguire `npm run build`.
- **Formule e soglie INVARIATE**: guadagno Token (`EspoV3.prestige`), guadagno Q-Bit `1 + floor(sqrt(prestigePoints/10000))`, soglia 20 promozioni. Zero cambi di bilanciamento.
- **Il gioco deve restare giocabile a ogni commit** (per questo lo swap markup+JS è un task atomico: gli id riusati non possono esistere due volte nel DOM).
- Icona lucide `zap` è già registrata in `src/ui/icons/lucide-init.ts` (usata oggi dal bottone navbar); le altre icone dell'hub sono FontAwesome (`fa-solid`), sempre disponibili.
- Verifica browser: server `espo-laragon` (php8.3.1 -S localhost:8766 sul working dir, config in `.claude/launch.json`); i test manuali di prestigio/formattazione RESETTANO il save locale del profilo browser → farli su save usa-e-getta (il preview pane ha storage proprio).
- PHP lint: `php -l <file>` (se `php` non è nel PATH, usare il binario Laragon `php8.3.1`).

## File Structure

| File | Azione | Responsabilità |
|---|---|---|
| `langs/it.php`, `langs/en.php` | Modify | 3 label nuove (`hub_titolo`, `hub_counter_label`, `hub_promo_locked_btn`); in T5 rimozione 5 label morte `quantum_reboot_*`/`quantum_energy`/`quantum_start_format`/`quantum_requires` |
| `src/data/texts.ts`, `src/data/en/texts.ts` | Modify | `ui.formatReady`; in T5 rimozione `toasts.prestigeNeedMore`/`prestigeNeedComplete` |
| `styles/ui/prestige-hub.css` | Create | TUTTO lo stile hub: stati card (senza media query) + layout desktop (≥769px) + layout mobile (≤768px). File unico per feature, precedente: `styles/ui/lucide.css` |
| `styles/ui/index.css` | Modify | `@import './prestige-hub.css'` |
| `includes/modals.php` | Modify | + `#prestige-hub-modal`; − `#prestige-modal`, − `#format-modal` |
| `includes/tab_quantum.php` | Modify | − blocco reboot (righe 9–22): resta header + wallet + store meta-tech |
| `js/game-logic.js` | Modify | `openPrestigeContract()` → `openPrestigeHub()`; `executePrestige()` chiude l'id nuovo |
| `js/ui-functions.js` | Modify | + `renderPrestigeHubCards()` + `setCardState()`; hook in `updateWallets` (che perde il vecchio blocco format); `updatePrestigeVisuals()` + stato `format-ready` |
| `js/modals.js` | Modify | listener navbar → `openPrestigeHub`; `btnConfirmPrestige` senza ramo `data-action` |
| `js/script.js` | Modify | − wiring `openFormatHandler`/`btn-open-format-modal` (resta il listener `btn-confirm-format` col trucco video); − wiring `cancel-prestige-btn` |
| `styles/base/navbar.css` | Modify | stato `.format-ready` legacy |
| `styles/base/keyframes.css` | Modify | `@keyframes formatGlow` |
| `styles/mobile.css` | Modify | stato `.format-ready` mobile (base già viola → bordo bianco + glow) |
| `styles/ui/desktop/header-navbar.css` | Modify | stato `.format-ready` v3 desktop |
| `styles/base/modals-content.css`, `styles/ui/desktop/modals-shell.css`, `styles/ui/desktop/modals-content.css` | Modify (T5) | − regole morte `#prestige-modal`/`#format-modal` |
| `sw.js` | Modify (T5) | bump `CACHE_VERSION` |

Nota deviazioni dalla spec (motivate): (1) CSS in UN file `styles/ui/prestige-hub.css` invece di desktop/+mobile/ separati — le regole di stato non sono breakpoint-specifiche e duplicarle sarebbe error-prone; (2) label `quantum_requires` NON riusata ma sostituita da `hub_counter_label` — il testo vecchio ha una parentesi aperta baked-in ("Richiede 20 Promozioni (Attuali:") inutilizzabile nel nuovo layout.

---

### Task 1: Label i18n (PHP + JS)

**Files:**
- Modify: `langs/it.php` (dopo riga 242, blocco `prestige_*`)
- Modify: `langs/en.php` (stesso punto)
- Modify: `src/data/texts.ts` (riga ~41, dopo `promoReady`)
- Modify: `src/data/en/texts.ts` (riga ~44, dopo `promoReady`)

**Interfaces:**
- Produces: `$labels["hub_titolo"]`, `$labels["hub_counter_label"]`, `$labels["hub_promo_locked_btn"]` (usate dal markup in T3); `gameData.texts.ui.formatReady` (usata da `updatePrestigeVisuals` in T4).

- [ ] **Step 1: Aggiungi le label PHP italiane**

In `langs/it.php`, subito dopo `$labels["prestige_sign_btn"] = "Firma Contratto";` (riga 242):

```php
	$labels["hub_titolo"] = "Prestigio";
	$labels["hub_counter_label"] = "Promozioni";
	$labels["hub_promo_locked_btn"] = "Completa il progetto (100%)";
```

- [ ] **Step 2: Aggiungi le label PHP inglesi**

In `langs/en.php`, subito dopo `$labels["prestige_sign_btn"] = "Sign Contract";` (riga 242):

```php
	$labels["hub_titolo"] = "Prestige";
	$labels["hub_counter_label"] = "Promotions";
	$labels["hub_promo_locked_btn"] = "Complete the project (100%)";
```

- [ ] **Step 3: Aggiungi `ui.formatReady` in entrambi i texts**

In `src/data/texts.ts`, dopo `promoReady: "PRONTA!",` (riga 41):

```js
        formatReady: "FORMATTA!",
```

In `src/data/en/texts.ts`, dopo `promoReady: "READY!",` (riga 44):

```js
        formatReady: "FORMAT!",
```

- [ ] **Step 4: Verifica lint + build**

Run: `php -l langs/it.php && php -l langs/en.php`
Expected: `No syntax errors detected` ×2

Run: `npm run build`
Expected: exit 0, riga finale `[legacy] dist/game.bundle.min.js (...)`

Run (Grep sul bundle): pattern `FORMATTA!` in `dist/game.bundle.min.js`
Expected: 1 match

- [ ] **Step 5: Commit**

```bash
git add langs/it.php langs/en.php src/data/texts.ts src/data/en/texts.ts
git commit -m "v3.0: hub prestigio T1 — label i18n (hub, formatReady)"
```

---

### Task 2: CSS dell'hub (file nuovo, inerte finché il markup non esiste)

**Files:**
- Create: `styles/ui/prestige-hub.css`
- Modify: `styles/ui/index.css` (riga 11, dopo `@import './lucide.css';`)

**Interfaces:**
- Consumes: — (file autonomo)
- Produces: classi `.hub-card`, `.hub-card-promo`, `.hub-card-format`, stati `.is-ready`/`.is-locked`/`.is-mystery`, elementi `.hub-card-title`, `.hub-card-warning`, `.hub-gain-box`, `.hub-gain-label/-value/-name/-bonus`, `.hub-progress(-track/-fill/-label)`, `.hub-confirm`, `.hub-btn-ready`/`.hub-btn-locked`, `.hub-btn-sub`, `.hub-mystery-veil`, `.hub-format-title-real/-mystery`, `.hub-format-counter-value` — il markup T3 usa ESATTAMENTE questi nomi.

- [ ] **Step 1: Crea `styles/ui/prestige-hub.css`**

```css
/* =====================================================================
   Hub Prestigio — #prestige-hub-modal (Promozione + Formattazione)
   =====================================================================
   Due card: promo (oro) e format (viola).
   Stati (classe sulla card, esclusivi, gestiti da renderPrestigeHubCards):
     .is-ready   → gain box + bottone attivo
     .is-locked  → progress/contatore + bottone disabilitato
     .is-mystery → (solo format) velo "???" anti-spoiler + contatore
   Sezione A: semantica stati (NESSUNA media query — vale ovunque).
   Sezione B: layout desktop (≥769px). Sezione C: layout mobile (≤768px).
   ===================================================================== */

/* ── A. Stati / visibilità ─────────────────────────────────────────── */

#prestige-hub-modal .hub-card { position: relative; }

/* Gain box: solo a card pronta */
#prestige-hub-modal .hub-card .hub-gain-box { display: none; }
#prestige-hub-modal .hub-card.is-ready .hub-gain-box { display: block; }

/* Progress promo: nascosta quando pronta */
#prestige-hub-modal .hub-card-promo.is-ready .hub-progress { display: none; }

/* Bottoni: doppia label ready/locked */
#prestige-hub-modal .hub-confirm .hub-btn-ready { display: none; }
#prestige-hub-modal .hub-confirm .hub-btn-locked { display: inline-flex; align-items: center; gap: 8px; }
#prestige-hub-modal .hub-card.is-ready .hub-btn-ready { display: inline-flex; flex-direction: column; align-items: center; gap: 2px; }
#prestige-hub-modal .hub-card.is-ready .hub-btn-locked { display: none; }

/* Mystery (solo format): titolo "???", velo, niente warning */
#prestige-hub-modal .hub-format-title-mystery { display: none; }
#prestige-hub-modal .hub-card-format.is-mystery .hub-format-title-mystery { display: inline; letter-spacing: 4px; }
#prestige-hub-modal .hub-card-format.is-mystery .hub-format-title-real { display: none; }
#prestige-hub-modal .hub-card-format.is-mystery .hub-card-warning { visibility: hidden; }

#prestige-hub-modal .hub-mystery-veil { display: none; }
#prestige-hub-modal .hub-card-format.is-mystery .hub-mystery-veil {
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 50% 38%, rgba(155, 89, 182, 0.12) 0%, transparent 55%),
    rgba(8, 6, 14, 0.55);
  pointer-events: none;
  z-index: 1;
}
#prestige-hub-modal .hub-mystery-veil i {
  font-size: 2.6rem;
  color: rgba(255, 255, 255, 0.85);
  text-shadow: 0 0 18px rgba(155, 89, 182, 0.8), 0 2px 8px rgba(0, 0, 0, 0.9);
}
/* Contatore e bottone sopra il velo */
#prestige-hub-modal .hub-card-format .hub-confirm { position: relative; z-index: 2; }

/* Bottoni disabilitati */
#prestige-hub-modal .hub-confirm:disabled { cursor: not-allowed; opacity: 0.55; }

/* ── B. Layout + estetica desktop ──────────────────────────────────── */

@media (min-width: 769px) {

  html body #prestige-hub-modal .modal-content {
    max-width: 860px;
    width: 92%;
  }

  #prestige-hub-modal .hub-cards {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    padding: 25px;
    align-items: stretch;
  }

  #prestige-hub-modal .hub-card {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 20px;
    border-radius: 14px;
    background: #0d1117;
    overflow: hidden;
  }

  /* Variante ORO */
  #prestige-hub-modal .hub-card-promo {
    border: 1px solid rgba(241, 196, 15, 0.45);
    box-shadow: inset 0 0 40px rgba(241, 196, 15, 0.05);
  }
  #prestige-hub-modal .hub-card-promo .hub-card-title { color: #f1c40f; }
  #prestige-hub-modal .hub-card-promo .hub-gain-box { border: 1px solid #4a3e12; background: #110f08; }
  #prestige-hub-modal .hub-card-promo .hub-gain-value { color: #3498db; text-shadow: 0 0 20px rgba(52, 152, 219, 0.5); }
  #prestige-hub-modal .hub-card-promo .hub-gain-name { color: #3498db; }

  /* Variante VIOLA */
  #prestige-hub-modal .hub-card-format {
    border: 1px solid rgba(155, 89, 182, 0.45);
    box-shadow: inset 0 0 40px rgba(155, 89, 182, 0.05);
  }
  #prestige-hub-modal .hub-card-format .hub-card-title { color: #9b59b6; }
  #prestige-hub-modal .hub-card-format .hub-gain-box { border: 1px solid #4a235a; background: #110a1f; }
  #prestige-hub-modal .hub-card-format .hub-gain-value { color: #9b59b6; text-shadow: 0 0 20px rgba(155, 89, 182, 0.4); }
  #prestige-hub-modal .hub-card-format .hub-gain-name { color: #9b59b6; }

  #prestige-hub-modal .hub-card-title {
    margin: 0;
    font-size: 1.05rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  #prestige-hub-modal .hub-card-warning {
    margin: 0;
    font-size: 0.85rem;
    line-height: 1.5;
    color: #fff;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 12px;
    font-weight: 600;
  }
  #prestige-hub-modal .hub-warning-sub { color: #bdc3c7; font-weight: normal; font-size: 0.8rem; }

  #prestige-hub-modal .hub-gain-box {
    border-radius: 12px;
    padding: 16px;
    text-align: center;
  }
  #prestige-hub-modal .hub-gain-label {
    font-size: 0.7rem;
    text-transform: uppercase;
    color: #7f8c8d;
    letter-spacing: 1px;
    margin-bottom: 5px;
  }
  #prestige-hub-modal .hub-gain-value {
    font-size: 2.6rem;
    font-family: var(--font-heading);
    font-weight: 900;
    line-height: 1;
  }
  #prestige-hub-modal .hub-gain-name { font-weight: bold; font-size: 1rem; margin-top: 5px; }
  #prestige-hub-modal .hub-gain-bonus {
    font-size: 0.85rem;
    color: #95a5a6;
    margin-top: 12px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    padding-top: 12px;
  }
  #prestige-hub-modal .hub-gain-bonus span { color: #f1c40f; font-weight: bold; }

  #prestige-hub-modal .hub-progress { display: flex; align-items: center; gap: 10px; }
  #prestige-hub-modal .hub-progress-track {
    flex: 1;
    height: 10px;
    border-radius: 5px;
    background: rgba(255, 255, 255, 0.08);
    overflow: hidden;
  }
  #prestige-hub-modal .hub-progress-fill {
    height: 100%;
    width: 0%;
    border-radius: 5px;
    background: linear-gradient(90deg, #d35400, #f1c40f);
    transition: width 300ms ease;
  }
  #prestige-hub-modal .hub-progress-label {
    font-family: var(--v3-font-mono, 'JetBrains Mono', monospace);
    font-weight: 800;
    color: #f1c40f;
    font-size: 0.9rem;
    min-width: 42px;
    text-align: right;
  }

  /* Bottoni conferma: la promo eredita l'oro del vecchio contratto,
     la format eredita .quantum-btn (viola) dal legacy */
  #prestige-hub-modal .hub-confirm {
    margin-top: auto;
    width: 100%;
    min-height: 55px;
    font-size: 1.05rem;
    border-radius: 8px;
    border: none;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 1px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  #prestige-hub-modal .hub-confirm-promo {
    background: linear-gradient(135deg, #f1c40f, #d35400);
    color: #000;
    box-shadow: 0 4px 15px rgba(241, 196, 15, 0.4);
  }
  #prestige-hub-modal .hub-btn-sub {
    display: block;
    font-size: 0.7rem;
    font-weight: normal;
    opacity: 0.85;
    margin-top: 2px;
    text-transform: none;
    letter-spacing: 0;
  }
}

/* ── C. Layout mobile ──────────────────────────────────────────────── */

@media (max-width: 768px) {

  /* .hub-cards ha anche la classe .settings-content → eredita già
     flex:1 + overflow-y:auto dal blocco app-like di mobile.css */
  #prestige-hub-modal .hub-cards {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px 14px 30px;
  }

  #prestige-hub-modal .hub-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    border-radius: 12px;
    background: #0d1117;
    overflow: hidden;
  }
  #prestige-hub-modal .hub-card-promo { border: 1px solid rgba(241, 196, 15, 0.45); }
  #prestige-hub-modal .hub-card-promo .hub-card-title { color: #f1c40f; }
  #prestige-hub-modal .hub-card-promo .hub-gain-box { border: 1px solid #4a3e12; background: #110f08; }
  #prestige-hub-modal .hub-card-promo .hub-gain-value { color: #3498db; }
  #prestige-hub-modal .hub-card-format { border: 1px solid rgba(155, 89, 182, 0.45); }
  #prestige-hub-modal .hub-card-format .hub-card-title { color: #9b59b6; }
  #prestige-hub-modal .hub-card-format .hub-gain-box { border: 1px solid #4a235a; background: #110a1f; }
  #prestige-hub-modal .hub-card-format .hub-gain-value { color: #9b59b6; }

  #prestige-hub-modal .hub-card-title {
    margin: 0;
    font-size: 1rem;
    text-transform: uppercase;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  #prestige-hub-modal .hub-card-warning {
    margin: 0;
    font-size: 0.8rem;
    line-height: 1.45;
    color: #fff;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 10px;
  }
  #prestige-hub-modal .hub-warning-sub { color: #bdc3c7; font-size: 0.75rem; }

  #prestige-hub-modal .hub-gain-box { border-radius: 10px; padding: 12px; text-align: center; }
  #prestige-hub-modal .hub-gain-label { font-size: 0.65rem; text-transform: uppercase; color: #7f8c8d; }
  #prestige-hub-modal .hub-gain-value { font-size: 2rem; font-weight: 900; line-height: 1.1; }
  #prestige-hub-modal .hub-gain-name { font-weight: bold; font-size: 0.9rem; }
  #prestige-hub-modal .hub-gain-bonus { font-size: 0.8rem; color: #95a5a6; margin-top: 8px; }
  #prestige-hub-modal .hub-gain-bonus span { color: #f1c40f; font-weight: bold; }

  #prestige-hub-modal .hub-progress { display: flex; align-items: center; gap: 8px; }
  #prestige-hub-modal .hub-progress-track { flex: 1; height: 8px; border-radius: 4px; background: rgba(255, 255, 255, 0.08); overflow: hidden; }
  #prestige-hub-modal .hub-progress-fill { height: 100%; width: 0%; background: linear-gradient(90deg, #d35400, #f1c40f); transition: width 300ms ease; }
  #prestige-hub-modal .hub-progress-label { font-weight: 800; color: #f1c40f; font-size: 0.85rem; }

  #prestige-hub-modal .hub-confirm {
    width: 100%;
    min-height: 52px; /* touch target */
    border-radius: 8px;
    border: none;
    font-weight: 900;
    text-transform: uppercase;
    font-size: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  #prestige-hub-modal .hub-confirm-promo {
    background: linear-gradient(135deg, #f1c40f, #d35400);
    color: #000;
  }
  #prestige-hub-modal .hub-btn-sub { display: block; font-size: 0.65rem; font-weight: normal; opacity: 0.85; text-transform: none; }
}

@media (prefers-reduced-motion: reduce) {
  #prestige-hub-modal .hub-progress-fill { transition: none; }
}
```

- [ ] **Step 2: Registra l'import**

In `styles/ui/index.css`, dopo `@import './lucide.css';` (riga 11):

```css
@import './prestige-hub.css';
```

- [ ] **Step 3: Verifica build**

Run: `npm run build`
Expected: exit 0

Run (Grep): pattern `hub-card-promo` in `dist-v3/assets/v3-styles.css`
Expected: ≥1 match

- [ ] **Step 4: Commit**

```bash
git add styles/ui/prestige-hub.css styles/ui/index.css
git commit -m "v3.0: hub prestigio T2 — CSS card (stati, desktop, mobile)"
```

---

### Task 3: Swap atomico — markup hub + wiring JS, via i vecchi contratti

⚠️ Task volutamente più grosso: gli id riusati (`#btn-confirm-prestige`, `#btn-confirm-format`, `#contract-gain-token`, `#contract-gain-bonus`, `#format-gain-qbit`) non possono esistere due volte nel DOM, quindi markup nuovo, rimozione del vecchio e switch JS devono stare nello stesso commit.

**Files:**
- Modify: `includes/modals.php` (righe 340–438: sostituire i due modal col nuovo)
- Modify: `includes/tab_quantum.php` (righe 9–22: rimuovere il blocco reboot)
- Modify: `js/game-logic.js` (righe 1675–1741 `openPrestigeContract` → `openPrestigeHub`; righe ~1743–1749 `executePrestige` id modal)
- Modify: `js/ui-functions.js` (nuove funzioni dopo `updateWallets`; dentro `updateWallets` righe 1732–1768: via il vecchio blocco format, dentro il nuovo hook)
- Modify: `js/modals.js` (righe 332–354)
- Modify: `js/script.js` (righe 1255–1298 wiring format-open; righe 1802–1806 cancel-prestige)

**Interfaces:**
- Consumes: label T1 (`hub_titolo`, `hub_counter_label`, `hub_promo_locked_btn`), classi CSS T2.
- Produces: `openPrestigeHub()` (globale, chiamata da modals.js), `renderPrestigeHubCards()` e `setCardState(card, state)` (globali in ui-functions.js), DOM id `#prestige-hub-modal`, `#hub-card-promo`, `#hub-card-format`, `#hub-promo-progress-fill`, `#hub-promo-progress-label`, classe `.hub-format-counter-value` (1 occorrenza nel markup, ma aggiornata via `querySelectorAll` così eventuali repliche future restano sincronizzate). T4 e T5 dipendono da questi nomi.

- [ ] **Step 1: Sostituisci i due modal in `includes/modals.php`**

Eliminare TUTTO da `<div id="prestige-modal" class="modal-backdrop" style="display: none;">` (riga 340) fino alla chiusura di `#format-modal` (riga 438 inclusa, il `</div>` prima di `<div id="skins-modal"...`). Al loro posto:

```html
<div id="prestige-hub-modal" class="modal-backdrop" style="display: none;">
    <div class="modal-content prestige-hub-content">
        <button class="modal-close-btn">&times;</button>
        <h2>
            <i data-lucide="zap"></i>
            <?php echo $labels["hub_titolo"]; ?>
        </h2>

        <div class="settings-content hub-cards">

            <!-- CARD PROMOZIONE (oro) — stati: is-locked / is-ready -->
            <section id="hub-card-promo" class="hub-card hub-card-promo is-locked">
                <h3 class="hub-card-title"><i class="fa-solid fa-certificate"></i> <?php echo $labels["prestige_titolo"]; ?></h3>

                <p class="hub-card-warning">
                    <i class="fa-solid fa-file-signature" style="color: #f1c40f;"></i> <?php echo $labels["prestige_sign"]; ?><br>
                    <span class="hub-warning-sub"><?php echo $labels["prestige_warning"]; ?></span>
                </p>

                <div class="hub-gain-box">
                    <div class="hub-gain-label"><?php echo $labels["prestige_gain"]; ?></div>
                    <div class="hub-gain-value" id="contract-gain-token">+0</div>
                    <div class="hub-gain-name"><?php echo $labels["prestige_token"]; ?></div>
                    <div class="hub-gain-bonus" id="contract-gain-bonus"><?php echo $labels["prestige_new_mult"]; ?> <span>x1.00</span></div>
                </div>

                <div class="hub-progress">
                    <div class="hub-progress-track"><div class="hub-progress-fill" id="hub-promo-progress-fill"></div></div>
                    <span class="hub-progress-label" id="hub-promo-progress-label">0%</span>
                </div>

                <button id="btn-confirm-prestige" class="buy-btn hub-confirm hub-confirm-promo" disabled>
                    <span class="hub-btn-ready"><i class="fa-solid fa-pen-nib"></i> <?php echo $labels["prestige_sign_btn"]; ?></span>
                    <span class="hub-btn-locked"><i class="fa-solid fa-lock"></i> <?php echo $labels["hub_promo_locked_btn"]; ?></span>
                </button>
            </section>

            <!-- CARD FORMATTAZIONE (viola) — stati: is-mystery / is-locked / is-ready -->
            <section id="hub-card-format" class="hub-card hub-card-format is-mystery">
                <div class="hub-mystery-veil" aria-hidden="true"><i class="fa-solid fa-lock"></i></div>

                <h3 class="hub-card-title">
                    <span class="hub-format-title-real"><i class="fa-solid fa-infinity"></i> <?php echo $labels["format_titolo"]; ?></span>
                    <span class="hub-format-title-mystery">???</span>
                </h3>

                <p class="hub-card-warning">
                    <i class="fa-solid fa-skull" style="color: #e74c3c;"></i> <?php echo $labels["format_warning"]; ?>
                </p>

                <div class="hub-gain-box">
                    <div class="hub-gain-label"><?php echo $labels["format_gain"]; ?></div>
                    <div class="hub-gain-value" id="format-gain-qbit">+0</div>
                    <div class="hub-gain-name"><?php echo $labels["format_qbits"]; ?></div>
                </div>

                <button id="btn-confirm-format" class="buy-btn quantum-btn hub-confirm hub-confirm-format" aria-label="<?php echo $labels['prestige_madeheaven_aria']; ?>" disabled>
                    <span class="hub-btn-ready"><i class="fa-solid fa-meteor"></i>&nbsp;MADE IN HEAVEN
                        <span class="hub-btn-sub"><?php echo $labels["format_subtitle"]; ?></span>
                    </span>
                    <span class="hub-btn-locked"><i class="fa-solid fa-lock"></i> <?php echo $labels["hub_counter_label"]; ?> <span class="hub-format-counter-value">0/20</span></span>
                </button>
            </section>
        </div>
    </div>
</div>
```

Nota: niente `data-action` sul bottone promo (il ramo vestigiale muore nello Step 5); il close usa il generico `.modal-close-btn` (agganciato da `allModals` in modals.js:107 — nessun wiring nuovo).

- [ ] **Step 2: Snellisci `includes/tab_quantum.php`**

Eliminare le righe 9–22 (il `<div style="background: rgba(155, 89, 182, 0.1)...">` con dentro reboot title/desc, `#pending-qbits-display`, `#format-requirement-warning` e `#btn-open-format-modal`). Dopo la rimozione in `tab_quantum.php` restano SOLO: section-header "Quantum Lab", section-header "Meta-Tecnologie", `#quantum-list-container`, `#quantum-empty`.

- [ ] **Step 3: `openPrestigeContract` → `openPrestigeHub` in `js/game-logic.js`**

Sostituire l'intera funzione (righe 1675–1741) con:

```js
function openPrestigeHub() {
    // Le card riflettono lo stato corrente (promo pronta/non pronta,
    // format mystery/locked/ready): niente più toast-blocco all'ingresso.
    if (typeof renderPrestigeHubCards === 'function') renderPrestigeHubCards();

    const modal = document.getElementById('prestige-hub-modal');
    if (modal) {
        modal.style.display = 'flex';
        modal.style.opacity = '1';

        const content = modal.querySelector('.modal-content');
        if (content) {
            if (typeof gsap !== 'undefined') {
                gsap.fromTo(content,
                    { scale: 0.8, opacity: 0, y: 20 },
                    { scale: 1, opacity: 1, y: 0, duration: 0.4, ease: "back.out(1.7)" }
                );
            } else {
                content.style.opacity = '1';
                content.style.transform = 'scale(1)';
            }
        }
    }

    document.body.classList.add('modal-open');
}
```

`calculatePrestigeGained()` (righe 1666–1673) resta invariata: ora la consuma `renderPrestigeHubCards`.

- [ ] **Step 4: Aggiorna `executePrestige` (subito sotto, ~riga 1743)**

Le due righe che riferiscono il vecchio modal:

```js
    const modal = document.getElementById('prestige-modal');
```
diventa
```js
    const modal = document.getElementById('prestige-hub-modal');
```
(la successiva `if (modal) modal.style.display = 'none';` resta uguale).

`executeFormattingSequence()` (riga 1910) NON si tocca: chiude già tutti i `.modal-backdrop` genericamente.

- [ ] **Step 5: Aggiorna `js/modals.js` (righe 332–354)**

Sostituire il blocco GESTIONE PRESTIGIO con:

```js
    const openPrestigeBtn = document.getElementById('open-prestige-hub-btn');
    const btnConfirmPrestige = document.getElementById('btn-confirm-prestige');

    // --- GESTIONE PRESTIGIO ---
    if (openPrestigeBtn) {
        openPrestigeBtn.addEventListener('click', () => {
            if (typeof updatePrestigeVisuals === 'function') updatePrestigeVisuals();
            if (typeof openPrestigeHub === 'function') openPrestigeHub();
        });
    }

    if (btnConfirmPrestige) {
        btnConfirmPrestige.addEventListener('click', () => {
            if (typeof executePrestige === 'function') executePrestige();
        });
    }
```

(sparisce il ramo `data-action === 'format'`: la formattazione ha il suo bottone dedicato `#btn-confirm-format`.)

- [ ] **Step 6: Nuove funzioni in `js/ui-functions.js`**

Subito DOPO la chiusura di `updateWallets()` (dopo riga 1769) aggiungere:

```js
// --- HUB PRESTIGIO (Promozione + Formattazione) ---
// Aggiorna le card dell'hub: chiamata all'apertura (openPrestigeHub) e dal
// loop UI via updateWallets SOLO a modal aperto. Non ricostruisce il DOM:
// testi/classi aggiornati solo se cambiati (stesso pattern di setTextIfChanged).
function renderPrestigeHubCards() {
    const promoCard = document.getElementById('hub-card-promo');
    const formatCard = document.getElementById('hub-card-format');
    if (!promoCard || !formatCard) return;

    const currentScore = gameState.totalScore || new Decimal(0);
    const threshold = getPrestigeThreshold();
    const resets = gameState.totalResets || 0;

    // ---- CARD PROMOZIONE ----
    const gained = calculatePrestigeGained();
    const canPrestige = currentScore.gte(threshold) && gained.gte(1);

    setCardState(promoCard, canPrestige ? 'is-ready' : 'is-locked');

    if (canPrestige) {
        const dupOn = !!(gameState.superUpgrades && gameState.superUpgrades.tokenDuplicator && gameState.superUpgrades.tokenDuplicator.purchased);
        const finalGained = window.EspoV3.prestige.applyTokenDuplicator(gained, dupOn);
        setTextIfChanged('contract-gain-token', `+${formatNumber(finalGained)}`);

        // Anteprima nuovo moltiplicatore (stessi calcoli del vecchio openPrestigeContract)
        const estimatedLifetime = (gameState.lifetimePrestigePoints || new Decimal(0)).add(finalGained);
        const baseBonus = estimatedLifetime.mul(0.01);
        const synergyCount = gameState.prestigeUpgrades.sinergia ? gameState.prestigeUpgrades.sinergia.count : 0;
        const synergyPerLevel = gameData.prestigeUpgrades.sinergia.bonusPerLevel || new Decimal(0.001);
        const synergyBonus = new Decimal(synergyCount).mul(synergyPerLevel).mul(estimatedLifetime);
        const rawMultiplier = baseBonus.add(synergyBonus).add(achievementsBPSBonus);
        const totalMultiplier = new Decimal(1).add(applyBonusSoftcap(rawMultiplier));

        const bonusEl = document.getElementById('contract-gain-bonus');
        const bonusHtml = `${gameData.texts.ui.newMultiplier} <span>x${formatNumber(totalMultiplier)}</span>`;
        if (bonusEl && bonusEl.innerHTML !== bonusHtml) bonusEl.innerHTML = bonusHtml;
    } else {
        let progress = 0;
        if (currentScore.gt(0)) progress = currentScore.div(threshold).mul(100).toNumber();
        const pct = `${Math.min(progress, 99).toFixed(0)}%`;
        const fill = document.getElementById('hub-promo-progress-fill');
        if (fill && fill.style.width !== pct) fill.style.width = pct;
        setTextIfChanged('hub-promo-progress-label', pct);
    }

    const btnPromo = document.getElementById('btn-confirm-prestige');
    if (btnPromo && btnPromo.disabled === canPrestige) btnPromo.disabled = !canPrestige;

    // ---- CARD FORMATTAZIONE ----
    // resets >= 20 implica Quantum sbloccato (è uno dei rami OR della regola).
    const isQ = window.EspoV3.rules.isQuantumUnlocked({
        totalResets: resets,
        totalFormattazioni: gameState.totalFormattazioni || 0,
        qBits: String(gameState.qBits || 0),
    });
    const canFormat = resets >= 20;

    setCardState(formatCard, canFormat ? 'is-ready' : (isQ ? 'is-locked' : 'is-mystery'));

    if (canFormat) {
        // Formula INVARIATA (era in updateWallets/openFormatHandler):
        // qbit = 1 + floor(sqrt(prestigePoints / 10000))
        const tokenDiv = (gameState.prestigePoints || new Decimal(0)).div(10000);
        const bonusQbits = tokenDiv.gte(1) ? tokenDiv.sqrt().floor() : new Decimal(0);
        const qBitsEarned = new Decimal(1).add(bonusQbits);
        setTextIfChanged('format-gain-qbit', `+${formatNumber(qBitsEarned)}`);
    } else {
        const counterText = `${Math.min(resets, 20)}/20`;
        document.querySelectorAll('.hub-format-counter-value').forEach(el => {
            if (el.textContent !== counterText) el.textContent = counterText;
        });
    }

    const btnFormat = document.getElementById('btn-confirm-format');
    if (btnFormat && btnFormat.disabled === canFormat) btnFormat.disabled = !canFormat;
}

// Applica UNA classe di stato alla card togliendo le altre (niente churn nel loop UI)
function setCardState(card, state) {
    if (card.classList.contains(state)) return;
    card.classList.remove('is-ready', 'is-locked', 'is-mystery');
    card.classList.add(state);
}
```

- [ ] **Step 7: Dentro `updateWallets()` — via il vecchio blocco, dentro l'hook**

Eliminare le righe 1732–1768 (dai commenti "Aggiorna Q-Bits in attesa..." — incluso il `querySelectorAll('.bug-wallet-amount')`? NO, attenzione: quel forEach su `.bug-wallet-amount` alle righe 1733–1735 NON c'entra col format, VA CONSERVATO). Precisamente: eliminare da riga 1737 (`// Aggiorna Q-Bits in attesa nel bottone di formattazione (NUOVA FORMULA SQRT)`) a riga 1768 (chiusura dell'`if (formatBtn && ...)`). Al loro posto:

```js
    // Hub Prestigio: aggiorna le card solo quando il modal è aperto
    const hubModal = document.getElementById('prestige-hub-modal');
    if (hubModal && hubModal.style.display === 'flex' && typeof renderPrestigeHubCards === 'function') {
        renderPrestigeHubCards();
    }
```

- [ ] **Step 8: Pulisci `js/script.js`**

1. Righe 1255–1298: eliminare `btnFormatOpen`, `btnFormatExecute`, `formatModal`, l'intera `openFormatHandler` e i due `addEventListener` (1297–1298). CONSERVARE `const btnConfirmFormat = document.getElementById('btn-confirm-format');` (riga 1258) e tutto il suo listener (righe 1300–1324: trucco video Big Bang + `executeFormattingSequence`).
2. Righe 1802–1806: eliminare il blocco `cancelPrestigeBtn`/`prestigeModal` (il vecchio id `cancel-prestige-btn` non esiste più; l'hub chiude col generico `.modal-close-btn`).

- [ ] **Step 9: Lint + build**

Run: `php -l includes/modals.php && php -l includes/tab_quantum.php`
Expected: `No syntax errors detected` ×2

Run: `npm run build`
Expected: exit 0

Run (Grep, working tree incl. `dist/game.bundle.min.js`): pattern `btn-open-format-modal|prestige-modal[^-]|openPrestigeContract|openFormatHandler|cancel-prestige-btn` su `js/`, `includes/`, `index.php`
Expected: 0 match (in `dist/` solo dopo build)

- [ ] **Step 10: Verifica nel browser (preview `espo-laragon`, localhost:8766)**

Save usa-e-getta (lo storage del preview pane è separato). In console, stati e attese:

```js
// 1. Hub apribile anche a inizio partita (bottone visibile solo se eleggibile:
//    forza la visibilità simulando un reset già fatto)
gameState.totalResets = 1; updateUI();
document.getElementById('open-prestige-hub-btn').click();
// ATTESO: modal aperto; card promo con barra % (is-locked); card format oscurata "???" con velo+lucchetto, bottone "🔒 Promozioni 1/20" disabilitato

// 2. Promo pronta
gameState.totalScore = getPrestigeThreshold().mul(2); updateUI();
// ATTESO (modal ancora aperto, aggiornamento live dal loop): card promo is-ready, +N Token, moltiplicatore, "Firma Contratto" abilitato

// 3. NG+ (rivelata ma non pronta)
gameState.totalFormattazioni = 1; gameState.totalResets = 5; updateUI();
// ATTESO: card format con titolo vero "Riavvio Sistema (NG+)", warning teschio, NIENTE velo, contatore 5/20, bottone disabilitato

// 4. Format pronta
gameState.totalResets = 20; updateUI();
// ATTESO: card format is-ready, +N Q-Bit, "MADE IN HEAVEN" abilitato

// 5. Esecuzione promozione end-to-end (click su Firma Contratto)
// ATTESO: overlay transizione promozione, reset soft, hub richiudibile e coerente
```

Verificare anche: il tab Q-Lab (visibile con `gameState.totalResets = 20`) mostra SOLO header + meta-tech (niente blocco reboot); chiusura hub con ×; ESC/backdrop come gli altri modal.

- [ ] **Step 11: Commit**

```bash
git add includes/modals.php includes/tab_quantum.php js/game-logic.js js/ui-functions.js js/modals.js js/script.js
git commit -m "v3.0: hub prestigio T3 — modal unico con card promo+format, via vecchi contratti"
```

---

### Task 4: Stato navbar "FORMATTA!" (JS + CSS legacy/v3/mobile)

**Files:**
- Modify: `js/ui-functions.js` (`updatePrestigeVisuals`, righe ~1929–2000)
- Modify: `styles/base/navbar.css` (dopo riga 150)
- Modify: `styles/base/keyframes.css` (dopo `promotionGlow`, riga ~292)
- Modify: `styles/mobile.css` (dopo riga 229, blocco `.nav-special-btn.promotion-ready`)
- Modify: `styles/ui/desktop/header-navbar.css` (dentro `@media (min-width: 769px)`, dopo il blocco `:active` del bottone, riga ~111)

**Interfaces:**
- Consumes: `gameData.texts.ui.formatReady` (T1), classe `.format-ready`.
- Produces: stato visuale `.format-ready` sul `#open-prestige-hub-btn` (nessun consumer successivo).

- [ ] **Step 1: Priorità format in `updatePrestigeVisuals`**

Sostituire il tratto da `if (canPrestige) {` (riga 1969) fino alla chiusura dell'`else` (riga 1999, prima della chiusura funzione) con:

```js
    // Formattazione eseguibile: priorità massima (l'azione più grossa vince).
    // resets >= 20 implica Quantum sbloccato (ramo OR della regola).
    const canFormat = resets >= 20;

    if (canFormat) {
        // STATO: FORMATTA! (viola)
        if (!prestigeBtn.classList.contains('format-ready')) {
            prestigeBtn.classList.remove('promotion-ready');
            prestigeBtn.classList.add('format-ready');
            prestigeBtn.style.cursor = "pointer";
            icon.className = 'nav-icon fa-solid fa-meteor';
            label.textContent = gameData.texts.ui.formatReady;
        }
    } else if (canPrestige) {
        // STATO: PRONTA!
        if (!prestigeBtn.classList.contains('promotion-ready') || prestigeBtn.classList.contains('format-ready')) {
            prestigeBtn.classList.remove('format-ready');
            prestigeBtn.classList.add('promotion-ready');
            prestigeBtn.style.cursor = "pointer";
            icon.className = 'nav-icon fa-solid fa-circle-check';
            label.textContent = gameData.texts.ui.promoReady;
        }
    } else {
        // STATO: IN PROGRESS (percentuale) — il click apre comunque l'hub
        if (prestigeBtn.classList.contains('promotion-ready') || prestigeBtn.classList.contains('format-ready')) {
            prestigeBtn.classList.remove('promotion-ready');
            prestigeBtn.classList.remove('format-ready');
            icon.className = 'nav-icon fa-solid fa-rocket';
        }
        prestigeBtn.style.cursor = "pointer";

        // Calcolo percentuale sicuro
        let progress = 0;
        if (currentScore.gt(0)) {
            progress = currentScore.div(threshold).mul(100).toNumber();
        }

        // Cap a 99% perché a 100% scatta il "canPrestige"
        const finalPercent = Math.min(progress, 99).toFixed(0);

        const newText = `${finalPercent}%`;

        if (label.textContent !== newText) {
            label.textContent = newText;
        }
    }
```

(unico altro cambio comportamentale: `cursor` sempre `pointer` — prima era `default` nello stato %.)

- [ ] **Step 2: CSS legacy `styles/base/navbar.css`**

Dopo il blocco `.promotion-ready:active` (riga 150):

```css
/* Formattazione pronta: priorità sul verde promozione */
#game-navbar .nav-group .nav-special-btn.format-ready {
    background: linear-gradient(135deg, #8e44ad, #9b59b6);
    color: white;
    border: 1px solid #d2b4de;
    box-shadow: 0 0 15px rgba(155, 89, 182, 0.7);
    cursor: pointer;
    opacity: 1;
    animation: formatGlow 1.5s infinite alternate;
    pointer-events: auto;
}

#game-navbar .nav-group .nav-special-btn.format-ready:hover {
    transform: translateY(-2px);
    box-shadow: 0 0 25px rgba(155, 89, 182, 0.7);
    filter: brightness(1.1);
}

#game-navbar .nav-group .nav-special-btn.format-ready:active {
    transform: translateY(1px);
}
```

- [ ] **Step 3: Keyframe `styles/base/keyframes.css`**

Dopo la chiusura di `@keyframes promotionGlow` (riga 292):

```css
@keyframes formatGlow {
    from {
        box-shadow: 0 0 5px rgba(155, 89, 182, 0.45);
        transform: scale(1);
    }

    to {
        box-shadow: 0 0 20px rgba(155, 89, 182, 0.9);
        transform: scale(1.05);
    }
}
```

- [ ] **Step 4: Mobile `styles/mobile.css`**

Dopo il blocco `.nav-special-btn.promotion-ready` (riga 229):

```css
    /* Stato "Formatta": il base mobile è GIÀ viola → si distingue con
       bordo bianco + glow pulsante forte (lo span testo è nascosto come
       per promotion-ready: nel quadrato 44px resta l'icona meteora) */
    .nav-special-btn.format-ready span {
        display: none;
    }

    .nav-special-btn.format-ready {
        background: linear-gradient(135deg, #a55eea, #8e44ad);
        border-color: #fff;
        box-shadow: 0 0 15px #9b59b6;
        animation: formatGlow 1.5s infinite alternate;
    }
```

- [ ] **Step 5: V3 desktop `styles/ui/desktop/header-navbar.css`**

Dentro il `@media (min-width: 769px)`, subito dopo il blocco `#open-prestige-hub-btn:active` (riga ~111):

```css
  /* Stato FORMATTA! — viola quantico, vince sul verde base */
  html body #game-navbar #open-prestige-hub-btn.format-ready {
    background: linear-gradient(135deg, #9b59b6 0%, #71368a 100%);
    border: 1px solid rgba(210, 180, 222, 0.7);
    box-shadow:
      0 4px 16px rgba(155, 89, 182, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }

  html body #game-navbar #open-prestige-hub-btn.format-ready:hover {
    box-shadow:
      0 8px 24px rgba(155, 89, 182, 0.65),
      0 0 32px rgba(155, 89, 182, 0.45),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
  }
```

- [ ] **Step 6: Build + verifica browser**

Run: `npm run build` → exit 0

Browser (localhost:8766), console:

```js
gameState.totalResets = 20; updateUI();
// ATTESO: bottone navbar viola, icona meteora, testo "FORMATTA!" (EN: "FORMAT!"), glow pulsante
gameState.totalResets = 5; gameState.totalScore = getPrestigeThreshold().mul(2); updateUI();
// ATTESO: torna "PRONTA!" verde
gameState.totalScore = new Decimal(0); updateUI();
// ATTESO: torna % con icona razzo, cursore pointer, click apre l'hub
```

Viewport mobile (≤768px, resize_window preset mobile): con `totalResets = 20` il quadrato 44×44 mostra SOLO l'icona meteora con bordo bianco e glow (niente testo).

- [ ] **Step 7: Commit**

```bash
git add js/ui-functions.js styles/base/navbar.css styles/base/keyframes.css styles/mobile.css styles/ui/desktop/header-navbar.css
git commit -m "v3.0: hub prestigio T4 — navbar FORMATTA! viola"
```

---

### Task 5: Pulizia finale (label/testi/CSS morti) + SW bump + smoke completo

**Files:**
- Modify: `langs/it.php`, `langs/en.php` (righe 292–296 in entrambi)
- Modify: `src/data/texts.ts` (righe ~92–93), `src/data/en/texts.ts` (righe ~91–92)
- Modify: `styles/base/modals-content.css` (blocco `#prestige-modal .contract-modal`, righe ~1073–1084)
- Modify: `styles/ui/desktop/modals-shell.css` (righe ~304–330)
- Modify: `styles/ui/desktop/modals-content.css` (righe ~311–322)
- Modify: `sw.js` (riga 7)

**Interfaces:**
- Consumes: tutto il lavoro T1–T4 (i riferimenti a questi simboli devono già essere zero).
- Produces: — (chiusura).

- [ ] **Step 1: Rimuovi le 5 label PHP morte (entrambe le lingue)**

In `langs/it.php` e `langs/en.php`, eliminare le righe 292–296:
`quantum_reboot_title`, `quantum_reboot_desc`, `quantum_energy`, `quantum_requires`, `quantum_start_format`.
(NON toccare `quantum_meta_tech`, `quantum_empty`: sono vivi in tab_quantum.php.)

- [ ] **Step 2: Rimuovi i toast morti**

In `src/data/texts.ts` eliminare le righe di `prestigeNeedMore` e `prestigeNeedComplete` (~92–93); idem in `src/data/en/texts.ts` (~91–92). Prima di eliminare, verificare con Grep che `prestigeNeedMore|prestigeNeedComplete` non compaia in nessun altro file `js/**` o `src/**` (atteso: solo le definizioni).

- [ ] **Step 3: Rimuovi il CSS morto dei vecchi modal**

1. `styles/base/modals-content.css` righe ~1073–1084: eliminare i blocchi `#prestige-modal .contract-modal` e `#prestige-modal .contract-modal h2`.
2. `styles/ui/desktop/modals-shell.css` righe ~304–330: eliminare i 6 blocchi `html body div#prestige-modal...` / `html body div#format-modal...`.
3. `styles/ui/desktop/modals-content.css` righe ~311–322: rimuovere i selettori `html body #prestige-modal ...` e `html body #format-modal ...` dalle liste (ATTENZIONE: sono membri di selector-list — rimuovere la riga E la virgola pendente, lasciando validi gli altri selettori del gruppo).

- [ ] **Step 4: Bump Service Worker**

In `sw.js` riga 7: leggere il valore CORRENTE (l'altra sessione potrebbe averlo già alzato) e incrementare la patch, es. `'espo-v3.0.15'` → `'espo-v3.0.16'`.

- [ ] **Step 5: Verifica finale completa**

Run: `php -l langs/it.php && php -l langs/en.php` → `No syntax errors` ×2
Run: `npm run build` → exit 0
Run: `npx vitest run` → tutti i test passano (nessun test tocca l'hub, è una guardia anti-regressione sui moduli V3)

Grep (su `js/`, `src/`, `styles/`, `includes/`, `index.php` — NON `dist*/` prima del build):
- `prestige-modal|format-modal` → 0 match
- `btn-open-format-modal|pending-qbits-display|format-requirement-warning|current-resets-display|cancel-prestige-btn` → 0 match
- `quantum_reboot|quantum_energy|quantum_start_format|quantum_requires|prestigeNeedMore|prestigeNeedComplete` → 0 match
- `prestige-hub-modal` in `dist/game.bundle.min.js` (post-build) → ≥1 match

Browser smoke finale (localhost:8766, save usa-e-getta):
1. Partita nuova: bottone navbar nascosto; Q-Lab nascosto.
2. `gameState.totalResets = 20; gameState.prestigePoints = new Decimal(50000); updateUI();` → navbar FORMATTA!; hub: card format is-ready con `+3` Q-Bit (1 + floor(sqrt(5)) = 3); click MADE IN HEAVEN → sequenza Big Bang completa (video + reset). Dopo: `gameState.totalFormattazioni === 1`, hub con card format rivelata 0/20 (is-locked, non mystery).
3. Lingua EN (cookie/selettore lingua): hub con testi inglesi ("Prestige", "Promotions", "FORMAT!").
4. Mobile viewport: card impilate, scroll interno, bottoni ≥52px.
5. Temi 8bit e Super attivi: bottone navbar `.format-ready` col fallback base non deve stonare (la spec accetta il fallback; override dedicati solo se il risultato è illeggibile).

- [ ] **Step 6: Commit**

```bash
git add langs/it.php langs/en.php src/data/texts.ts src/data/en/texts.ts styles/base/modals-content.css styles/ui/desktop/modals-shell.css styles/ui/desktop/modals-content.css sw.js
git commit -m "v3.0: hub prestigio T5 — pulizia label/CSS morti + SW bump"
```

---

## Note per l'esecutore

- **Numeri di riga**: sono lo snapshot al 2026-07-12 pre-implementazione; l'altra sessione committa sullo stesso branch → ricontrollare sempre l'ancora testuale (il codice citato) prima di editare, non fidarsi del solo numero.
- **`git pull`/rebase**: se il push fallisce per commit sopraggiunti dell'altra sessione, `git pull --rebase` è sicuro SOLO a working tree pulito; mai `--force`.
- I test manuali di promozione/formattazione RESETTANO il save del profilo browser del preview: non usare il profilo di gioco reale.
- Se un'icona `data-lucide` risultasse vuota: è cherry-picking (`src/ui/icons/lucide-init.ts`) — `zap` è già registrata; per icone nuove usare FontAwesome.
