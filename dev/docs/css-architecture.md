# CSS Architecture — mappa autorevole

> Stato al 2026-07-15 (branch `migration/kill-legacy-css-dedup`, Blocco #2 kill-legacy).
> Scritto per chiarire una domanda ricorrente: "questi CSS non sono duplicati tra
> `styles/base/` e `styles/ui/`?" — risposta: in parte sì (per design, vedi §3), in
> parte erano peso morto inerte (rimosso in questo blocco, vedi §2).

## 1. I tre bundle caricati da `index.php`

`index.php` carica **tre** fogli stile che si sovrappongono a cascata (nessuno dei
tre sostituisce gli altri — sono livelli):

| Ordine | Bundle | Sorgente | Ruolo |
|---|---|---|---|
| 1 | `dist/styles.bundle.min.css` | `styles/main.css` → `styles/base/*` (pelle legacy) | **LIVE** — layer base, tutto il markup parte da qui |
| 2 | `dist/styles.mobile.min.css` | `styles/mobile.css` (`@media ≤768px`) | **LIVE** — override mobile legacy |
| 3 | `dist/assets/styles.css` | `src/main.ts` → `styles/ui/index.css` | **LIVE** — layer "refresh" V3, caricato per ultimo → vince in cascata |

Il layer 3 è quello che dà l'attuale identità visiva "V3" (HUD/FUI cyberpunk):
lo fa con selettori **globali** (`.score-header`, `.clicker-button`, ecc.) e
`@media (min-width: 769px)` per il ramo desktop, che sovrascrivono la base legacy.
Questa cascata **base + refresh è intenzionale e funziona** — non è l'oggetto di
questo blocco.

## 2. Cosa era davvero morto (rimosso in questo blocco)

`styles/ui/` fu disegnato in origine come skin **isolata sotto `[data-v3]`**,
pensata per sostituire interamente il markup legacy (approccio "scoped opt-in").
Quella direzione fu abbandonata: **l'attributo `data-v3` non è mai stato impostato
su alcun elemento** — né in markup PHP, né via `setAttribute`/`dataset` in
TS/JS. Verificato con grep su tutto il repo (`.php/.ts/.js`, esclusi `node_modules`,
`dist*`, gli stessi file `styles/`, review diff e doc): zero occorrenze come
attributo reale.

Conseguenza: ogni regola CSS scoped `[data-v3] ...` non fa mai match con nulla →
è peso morto spedito ad ogni page load senza alcun effetto visivo. Erano:

| File | Selettori | Prova d'inerzia |
|---|---|---|
| `styles/ui/reset.css` | 100% `[data-v3] *` | Modern reset, mai attivato |
| `styles/ui/primitives.css` | 100% `[data-v3] .v3-*` | `.v3-card/.v3-btn/.v3-glass/.v3-bento/.v3-num/.v3-sr-only` non applicate in nessun markup/JS |
| `styles/ui/themes/8bit.css` | unico selettore `[data-v3][data-theme='8bit']` | stub "sostituisce quando migrato", mai migrato |
| `styles/ui/themes/super.css` | unico selettore `[data-v3][data-theme='super']` | idem |
| `styles/ui/themes/christmas.css` | unico selettore `[data-v3][data-theme='christmas']` | idem |

Questi 5 file sono stati **cancellati** e i relativi `@import` rimossi da
`styles/ui/index.css`. Nessun cambio di rendering: erano inerti per costruzione,
non per accidente (l'attributo che li attiva semplicemente non esiste nel DOM).

## 3. Cosa resta (live, non duplicazione vera)

| File/gruppo | Verdetto | Perché |
|---|---|---|
| `styles/ui/tokens.css` | ✅ live | `:root`, variabili consumate da `desktop/*` |
| `styles/ui/tokens-hud.css` | ✅ live | `:root` |
| `styles/ui/lucide.css` | ✅ live | selettori globali per le icone |
| `styles/ui/prestige-hub.css` | ✅ live | globale |
| `styles/ui/desktop/*` (20 file) | ✅ live | globale + `@media(min-width:769px)`, override del layer base |
| `styles/ui/mobile/*` (5 file) | ✅ live | globale, override del layer base su mobile |
| `.v3-skip-link` (in `index.css`) | ✅ live | globale, a11y — non scoped `[data-v3]` |

La sovrapposizione di nomi tra `styles/base/*` (legacy) e `styles/ui/desktop|mobile/*`
(es. `modals-content`, `score-header`, `clicker-button`, `super-theme`) **non è un
bug**: è la cascata base+refresh del §1. Consolidarli in un'unica generazione è
un lavoro separato, rinviato (vedi §4) perché entrambi i lati sono live e un
flatten sbagliato cambia pixel senza che l'E2E se ne accorga.

## 4. Temi reali vs stub rimossi

I **temi reali** (8-bit, Super, Christmas) sono i CSS legacy in `styles/themes/`:

- `styles/themes/8bit-theme.css`
- `styles/themes/super-theme.css`
- `styles/themes/christmas-theme.css`

Caricati **dinamicamente** all'equip di una skin: `src/data/skins.ts` (campo
`cssFile`) → `src/ui/render/index.ts` (`themeLoader()`) → `src/ui/theme/css-loader.ts`,
con `cssBase: 'styles/themes/'`. Gli stub rimossi in `styles/ui/themes/*` erano
un tentativo di migrazione mai completato (i loro stessi commenti dicevano
"sostituisce … quando migrato"): rimuoverli **non tocca** i temi reali, che
restano invariati e continuano a funzionare esattamente come prima.

## 5. Cosa resta da consolidare (fuori scope, rinviato)

- **Flatten base↔ui**: gli override reali che si sovrappongono per nome tra
  `styles/base/*` (legacy) e `styles/ui/desktop|mobile/*` (V3) — stessa lista
  del §3 (`modals-content`, `score-header`, `clicker-button`, `super-theme`).
  Consolidarli in una sola generazione richiede prima una rete di snapshot
  visivi (l'E2E attuale non copre regressioni pixel). Da abbinare a un blocco
  kill-legacy dedicato o al Blocco #4.
- **Non fare**: attivare `[data-v3]` per "completare" la skin scoped originale.
  È la direzione opposta al kill-legacy (aggiunge codice/complessità invece di
  rimuoverla) e cambierebbe il look attuale — non richiesto.
