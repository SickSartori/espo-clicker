# Consolidamento i18n — architettura overlay (IT default + EN overlay) e completamento

- **Data:** 2026-06-14
- **Branch:** develop-exp
- **Stato:** Implementato e verificato

> NOTA: una prima bozza di questa specifica proponeva un'architettura "tutto in `$labels` PHP + helper `t()`".
> È stata **superata**: in corso d'opera è emerso che il progetto ha già un sistema **overlay** (più pulito),
> e questo documento descrive quello reale, completato in questa sessione.

---

## 1. Architettura reale (overlay)

Il testo utente vive su **tre meccanismi**, ognuno con una fonte per lingua:

| Ambito | Fonte IT (default) | Fonte EN | Applicazione |
|---|---|---|---|
| Chrome PHP (server-rendered) | `langs/it.php` (`$labels`) | `langs/en.php` | `php/check_language.php` carica `langs/$lang.php` dal cookie |
| Testo runtime JS (UI dinamica, dati di gioco) | letterali inline in `js/data/*.js` | `js/data-en/*.js` (delta) | `js/i18n.js` → `applyLanguage(window.APP_LANG)` fa l'overlay PRIMA del render |
| Pagina Arcade (standalone) | `$labels` + letterali in `js/arcade-page.js` | `langs/en.php` + `window.ARCADE_TXT` | `arcade.php` inietta `APP_LANG` + `ARCADE_TXT` da `$labels` |
| Cheatboard (solo dev) | letterali in `js/cheatboard.js` | mappa `CB_MAP` interna | `cbT()` traduce pannello+toast se `APP_LANG==='en'` |

Principi:
- **IT è il default**: nessun file IT separato per il JS, i letterali inline SONO l'italiano.
- **EN è un delta**: `js/data-en/*.js` definiscono solo i campi che cambiano (`window.gameData.i18n.en.*`); `i18n.js` fa un deep-merge (`texts`) / per-id merge (collezioni) sulle strutture vive prima del render → **il codice di rendering non cambia** (continua a leggere `team.name`, `gameData.texts.ui.buy`).
- **Bundle**: `build.js` concatena `js/data/*.js` → `js/data-en/*.js` → `js/i18n.js` (ordine garantito).
- **Selettore lingua**: `<select id="lang-select">` in Opzioni ([modals.php](../../../includes/modals.php)) + handler in [modals.js](../../../js/modals.js) → riscrive cookie e ricarica.
- **Esclusioni**: nomi skin, nomi brani musicali e nomi propri (eventi, "MADE IN HEAVEN") restano invariati; le *descrizioni* skin sì tradotte.

## 2. Lavoro completato in questa sessione

Stato di partenza: l'overlay JS dei **contenuti di gioco** era già fatto (team/upgrade/achievement/skin/eventi + `gameData.texts`). Mancavano: il file `langs/en.php` (lato PHP), e tutte le stringhe **inline hardcoded** non instradate nei dizionari.

- **`langs/en.php`**: creato (mirror completo di `it.php`).
- **Bucket A+B — inline JS → `gameData.texts`** (IT in `js/data/texts.js`, EN in `js/data-en/texts.js`), poi wiring:
  - `ui-functions.js`: pannello Statistiche (~17 etichette) + modale migrazione V2 (gruppi `stats`, `v2`).
  - `game-logic.js`: toast (skin/format/lucky/frenzy/daily) + overlay formattazione (gruppo `reformat`).
  - `script.js`: avvisi storage/sessione/cloud + loader (gruppi `system`, `toasts`, `ui`).
  - `modals.js`: conferme reset/elimina (già tradotte in `dialogs`) + 3 stringhe nuove.
  - `podio.js`: classifica (gruppo `leaderboard`).
- **Bucket C — PHP `$labels`** (it/en):
  - `includes/modals_help.php`: manuale di onboarding → chiavi `help_*` (file riscritto con echo).
  - `includes/modals.php`: modale formattazione, filtri skin, release-notes → `format_*`, `skins_*`, `news_*`.
  - `arcade.php` + `js/arcade-page.js`: titolo, `lang`, D-pad, gate login, game-over → `arcade_*` (JS via `window.ARCADE_TXT` iniettato).
- **Bucket D — cheatboard (dev)**: mappa frasi IT→EN `CB_MAP` + `cbT()` su pannello e `toast()`.

## 3. Verifica eseguita

- **Build**: `node build.js` OK (nessun errore di sintassi JS).
- **Overlay EN** (`js/data/texts.js` + `js/data-en/texts.js` + `i18n.js`): test Node `applyLanguage('en')` → tutte le nuove chiavi (`stats`, `v2`, `toasts`, `dialogs`, `reformat`, `system`, `leaderboard`) producono EN corretto; accenti/emoji preservati.
- **`langs`**: `php -l` pulito (PHP 8); **parità chiavi `it.php` ↔ `en.php` perfetta (189 = 189, diff vuoto)**.
- **PHP toccati**: `php -l` pulito su `modals_help.php`, `modals.php`, `arcade.php`.
- **Cheatboard**: test Node su `cbT()` (14 casi, incluse stringhe ambigue/collisioni) → tutto corretto.

## 4. Non fatto / follow-up possibili
- Smoke test in browser con cookie `en` (render live di `$labels`/`gameData.texts`) — non eseguito in questa sessione.
- **Pulizia chiavi morte**: restano ~61 chiavi legacy non usate in `it.php`/`en.php` (es. `modals_manuale_*`, `modals_profilo_*`, `modals_area_critica_*`, `modals_promozione_*`, `modals_arcade_*`, `prestigio_*`). Rimozione opzionale per snellire i file.
