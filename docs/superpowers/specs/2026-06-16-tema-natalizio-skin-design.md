# Miglioria tema natalizio (skin "Espo Natale") — Design

**Data:** 2026-06-16
**Stato:** Design approvato (in attesa review spec)

## Obiettivo

Migliorare il look del tema natalizio quando la skin **Espo Natale** è
equipaggiata. Direzione concordata: **festivo ma elegante** ("festivo ricco"),
con la neve sistemata in un unico sistema più bello e attivo anche su mobile.

## Contesto attuale

Quando si equipaggia la skin christmas, `applySkinVisuals('christmas')`
([js/ui-functions.js:2117](../../../js/ui-functions.js)):

- aggiunge `body.theme-christmas` e carica **raw** `css/christmas-theme.css`
  (via `loadThemeCSS`, cache-bustato da `CACHE_VER` → **nessun rebuild** per
  modifiche a questo file);
- setta `body[data-current-skin-rarity="christmas"]` → attiva l'ambient dietro
  al clicker in `src/ui/desktop-fixes/skin-ambient.css` (bundlato in
  `dist-v3/assets/v3-styles.css` via Vite → **richiede `npm run build:v3`**);
- avvia il VFX `snow`: 60 `div.snowflake` full-screen in `#snow-container`
  ([VFXManager.spawnSnow](../../../js/ui-functions.js), bundle esbuild
  `dist/game.bundle.min.js`).

### Problemi rilevati

1. **Doppia neve** su desktop: overlay JS (globale) + ambient CSS (solo
   `min-width:769px`). Su mobile manca l'ambient.
2. **Visual frammentati** su 2 file in 2 pipeline diverse, con rossi non
   coerenti (`#c0392b` / `#e74c3c` in christmas-theme.css vs `#ef4444` /
   `rgba(239,68,68)` nell'ambient).
3. Colori piuttosto saturi; `bg-christmas` dietro al personaggio ha un centro
   bianco puro netto (`radial-gradient(circle, #fff 10%, #c0392b 90%)`) e un
   pulse forte.

## Approccio scelto: consolidamento

Tutto il Natale vive in **`css/christmas-theme.css`** (unico file già dedicato e
già caricato con la skin). Si rimuove il ramo `christmas` dall'ambient. Singola
fonte di verità, coerente, mobile incluso, quasi tutto CSS raw senza rebuild.

Scartati: neve interamente a gradiente CSS (drift meno naturale, tocca 2 build);
solo ritocco colori (non risolve doppia neve né gap mobile).

## Modifiche

### 1. Palette unificata
Custom properties su `body.theme-christmas` in christmas-theme.css:
`--xmas-green`, `--xmas-red`, `--xmas-red-soft`, `--xmas-gold`, `--xmas-cream`.
Tutte le regole del file usano queste variabili. Verdi un filo più profondi/meno
acidi, un solo rosso base, oro come accento misurato. Migliora coerenza e
contrasto mantenendo la leggibilità di score (bianco) e CPS (oro).

### 2. Neve = un solo sistema (overlay JS), più bella
- **Mantiene** la neve che cade (overlay JS) come **unico** sistema — già
  responsive, quindi attiva su mobile senza interventi.
- Resa più morbida/naturale **solo via CSS** in christmas-theme.css:
  - `.snowflake`: leggero `filter: blur(0.4px)` + alone soffuso, tono
    `--xmas-cream`;
  - varianti di deriva orizzontale via `:nth-child` (es. `fall-a/b/c`) per un
    movimento meno uniforme, senza toccare il JS (niente rebuild bundle).
- **Rimuove** il ramo `body[data-current-skin-rarity="christmas"]
  #clicker-section` e la `@keyframes v3-clicker-bg-snow` da
  `skin-ambient.css` (elimina la doppia neve desktop).
  - Dopo la rimozione, dietro al clicker resta solo il **glow tenue generico**
    della regola base `#clicker-section`, alimentato da `--skin-rarity-glow`
    christmas (`rgba(239,68,68,0.32)`, definito in skins-modal-v3.css:779). È
    sottile e coerente con tutte le altre skin — **non** è il "glow caldo"
    decorativo che l'utente ha escluso. Si lascia così.

### 3. Decori festivi (layer CSS, GPU-cheap, dietro alla UI)
Scelti dall'utente — **niente** glow caldo extra dietro al clicker.

- **Luci natalizie sul bordo:** ghirlanda di lucine soffuse multicolore
  (rosso/oro/verde/cream) con twinkle delicato. **Ancorate a
  `#game-navbar::before`** nella striscia bassa (vuota) della navbar — la navbar
  è alta 65px col contenuto centrato, i ~10px in fondo sono liberi e i tab del
  container partono a y≈67 (verificato), quindi **zero sovrapposizione**.
  `#game-navbar::after` è già usato; `::before` era libero. NON impostare
  `position` sulla navbar (è già `fixed`, vedi layout-shell.css).
- **Brina agli angoli:** sottile effetto ghiaccio smerigliato negli angoli del
  container, basso contrasto.
- **Rifacimento `bg-christmas`** (sfondo dietro a Espo): da bianco→rosso netto a
  rosso profondo→oro con alone morbido e rim bianco tenue; pulse più gentile
  (più lento, ampiezza ridotta).

### Note implementative (risolte)
- Luci: `#game-navbar::before` (vedi sopra) — `#game-container::before` era
  scartato perché `.tabs-header` parte a y=0 della colonna (padding 0) e le luci
  avrebbero coperto i tab. La **brina** usa il `background-image` del container
  (non un pseudo) → sempre dietro al contenuto, nessuna guerra di z-index.
- Niente modifiche al DOM/PHP/JS: solo CSS (+ rimozione ramo ambient).

### Accessibilità / motion
Tutte le nuove animazioni (twinkle, sway neve, pulse) sono sotto
`body.theme-christmas` → già coperte dal blocco `@media
(prefers-reduced-motion: reduce)` esistente in christmas-theme.css. Estendere il
blocco se qualche nuova animazione usa selettori con ID non coperti.

## File toccati

| File | Pipeline | Rebuild |
|------|----------|---------|
| `css/christmas-theme.css` | raw (loadThemeCSS) | **No** (cache-bust `CACHE_VER`) |
| `src/ui/desktop-fixes/skin-ambient.css` | Vite → dist-v3 | **Sì** `npm run build:v3` |

Nessuna modifica a JS/PHP/DOM previste.

## Verifica

1. Equipaggiare Espo Natale e controllare desktop **e** mobile (≤768px):
   - una sola neve che cade, morbida, presente su entrambi;
   - luci sul bordo, brina agli angoli, nuovo bg dietro a Espo;
   - nessuna doppia neve dietro al clicker.
2. `prefers-reduced-motion: reduce` → animazioni ferme, layout intatto.
3. In preview, forzare reload cache-bustato della CSS (nota: la CSS legacy con
   `?v` statico resta in cache mentre il JS si aggiorna).
4. Coerenza colori: score bianco e CPS oro restano leggibili sul nuovo sfondo.
