# Consolidamento i18n — una libreria di testo per lingua

- **Data:** 2026-06-14
- **Branch:** develop-exp
- **Stato:** Design approvato (in attesa di review della specifica)

---

## 1. Contesto e problema

Il gioco **Espo Clicker** ha il testo utente sparso in **quattro sistemi scollegati**, di cui solo uno è bilingue:

| Sistema | File | Stato attuale |
|---|---|---|
| `$labels` (PHP) | `langs/it.php`, `langs/en.php` | Bilingue, ma **61/134 chiavi morte** |
| Dizionario runtime JS | `js/data/texts.js` (`gameData.texts`) | Solo IT (~70 stringhe) |
| Contenuti di gioco | `js/data/{teams,upgrades,achievements,skins,events}.js` | Solo IT (~200 campi), nessun i18n |
| Inline hardcoded | `js/*.js` + `includes/modals_help.php`, `includes/modals.php`, `arcade.php` | Solo IT (~95 + ~45 cheat) |

Conseguenze:
- Impostando la lingua su `en`, **~85% del testo resta in italiano**.
- `langs/it.php` **non è** la fonte completa del testo italiano: 61 chiavi sono orfane (manuale `modals_manuale_*`, profilo, area critica, modale promozione, modale arcade, overlay prestige), mentre il testo realmente mostrato è hardcoded altrove.

## 2. Obiettivo

Una **sola libreria di testo per lingua** (`langs/it.php` ed `en.php`) come **unica fonte di verità**, che alimenta sia le pagine PHP sia il gioco JavaScript. Al termine:
- `it.php` ed `en.php` hanno **lo stesso set di chiavi** e contengono **tutto** il testo utente.
- **Zero** stringhe utente hardcoded e **zero** chiavi morte.
- L'utente può cambiare lingua dall'interfaccia.

### Non-obiettivi
- Aggiungere lingue oltre IT/EN.
- Tradurre testo non-utente (commenti, log di console, identificatori).
- Refactoring non collegato all'i18n.

## 3. Decisioni approvate

1. **Ponte:** PHP resta la fonte; le label vengono iniettate nel JS via `window.LABELS`; un helper `t()` le legge lato client.
2. **Scope:** tutto bilingue — `texts.js`, contenuti di gioco, inline JS+PHP, **e** il pannello cheat (dev).
3. **Esclusioni (restano invariate, non tradotte):** i **nomi delle skin** e i **nomi dei brani musicali** visualizzati. *(Le descrizioni delle skin SÌ tradotte.)*
4. **Strategia file dati:** si **sposta** il testo dai file dati dentro le label e il codice di rendering usa `t()` (fonte unica, niente duplicazione).
5. **Selettore lingua:** toggle IT/EN nel **modale Opzioni**.

## 4. Architettura del ponte PHP → JS

- `langs/it.php` / `en.php` restano l'array `$labels` (invariato come meccanismo).
- In `index.php` e `arcade.php`, dopo il caricamento lingua, si inietta presto nel `<head>`/inizio body:
  ```php
  <script>window.LABELS = <?= json_encode($labels, JSON_UNESCAPED_UNICODE) ?>;</script>
  ```
- Nuovo **`js/i18n.js`** (caricato **prima** di ogni altro JS di gioco):
  ```js
  window.t = function (key, params) {
      let s = (window.LABELS && window.LABELS[key]) ?? key;
      if (params) for (const k in params) s = s.replaceAll('{' + k + '}', params[k]);
      return s;
  };
  ```
- **Interpolazione:** supporta i placeholder già usati: `{name}`, `{amount}`, `{mult}`, `{seconds}`, `{streak}`.
- **Chiave mancante:** `t()` ritorna la chiave stessa → i buchi sono visibili in QA.

## 5. Schema di naming delle chiavi (flat, con namespace)

| Area | Schema | Esempio |
|---|---|---|
| Runtime UI (texts.js) | `txt_ui_*`, `txt_toast_*`, `txt_dialog_*`, `txt_fmt_*` | `txt_toast_saved` |
| Team | `team_<id>_name` | `team_assistenteQa_name` |
| Click upgrade | `up_click_<id>_name` / `_desc` | `up_click_caffeForte_desc` |
| Prestige upgrade | `up_prestige_<id>_name` / `_desc` | `up_prestige_sinergia_desc` |
| Building enhancement | `up_build_<id>_name` / `_desc` | `up_build_caffeDoppio_desc` |
| Super upgrade | `up_super_<id>_name` / `_desc` | `up_super_risveglio_desc` |
| Achievement | `ach_<id>_name` / `_desc` / `_flavor` | `ach_primoClick_desc` |
| Skin | `skin_<id>_desc` / `_hint` (**no name**) | `skin_rick_desc` |
| Evento | `event_<id>_toast` (**no name**) | `event_rickRoll_toast` |
| Statistiche / inline JS | `stats_*`, `js_*` | `stats_economiaAziendale` |
| Manuale / PHP | `help_*` | `help_punto_3_label2` |
| Cheat (dev) | `cheat_*` | `cheat_addBug` |

Volume stimato: **~365 chiavi utente + ~45 cheat ≈ 410** per lingua.

> Nota: nomi tecnici/inglesi già tali (es. *Jira Ticket*, *AI Debugger*, *Skynet*, *Hello World!*, *Code Monkey*) ricevono comunque una chiave; il valore EN coincide con l'IT. Coerenza > eccezioni.

## 6. Migrazione per blocco

### 6.1 `texts.js`
`gameData.texts` mantiene la **stessa forma** ma ogni campo diventa `t('txt_…')` invece del letterale IT. I call-site che leggono `gameData.texts.ui.buy` non cambiano. Le stringhe-template con `{…}` restano tali (l'interpolazione avviene al call-site come oggi).

### 6.2 Inline JS
Sostituire ogni letterale utente con `t('js_…')`. File coinvolti: `ui-functions.js` (pannello Statistiche, modale V2), `game-logic.js`, `script.js` (avvisi storage/sessione/cloud), `modals.js` (conferme reset/elimina), `podio.js`, `arcade-page.js`.

### 6.3 File dati (strategia approvata: sposta → `t()`)
- Si **rimuove** il testo IT (`name`/`desc`/`flavor`/`unlockHint`/`toast`) dai file dati e lo si porta in `it.php` (+ traduzione `en.php`).
- L'`id` (chiave dell'oggetto, es. `assistenteQa`) resta stabile e diventa parte della chiave label.
- Il codice di rendering legge `t('team_'+id+'_name')`, `t('up_click_'+id+'_desc')`, ecc.
- **Eccezioni mantenute nel file dati:** `skins.<id>.name` (nome skin) e i nomi dei brani musicali. `events.<id>.name` resta invariato (nome proprio); si traduce solo `toast`.

### 6.4 PHP hardcoded
`includes/modals_help.php` (manuale), parti di `includes/modals.php` (avviso formattazione, "Novità dell'Aggiornamento", "Caricamento novità…", "Tutte le Rarità") e `arcade.php` (gate login, titoli, controlli virtuali) passano a `<?= $labels['help_…'] ?>` / `$labels['js_…']`.

### 6.5 Cheatboard (dev)
`cheatboard.js`: tutte le etichette/toast passano a `t('cheat_…')`.

## 7. Selettore lingua
Nel modale Opzioni, toggle IT/EN. Al cambio:
```js
document.cookie = "user_default_language=" + lang + "; path=/; max-age=" + (365*24*3600);
location.reload();
```
Il server legge già il cookie in `php/check_language.php`.

## 8. Pulizia chiavi morte
Le 61 chiavi orfane vengono **riviste** (il manuale → nuove chiavi `help_*` agganciate al testo reale di `modals_help.php`) o **rimosse** (profilo/area critica/promozione/arcade/prestige se non più pertinenti). A fine lavoro: `it.php` ed `en.php` hanno lo **stesso set di chiavi**, nessuna orfana.

## 9. Rollout incrementale (ogni fase verificabile e committabile)
1. **Infra** — `i18n.js` + `t()` + injection in index/arcade + selettore lingua nel modale Opzioni.
2. **texts.js** → label.
3. **Inline JS** — stats panel + avvisi + conferme + classifica + arcade game-over.
4. **Contenuti di gioco** — teams/upgrades/achievements/skins(desc)/events(toast).
5. **PHP hardcoded** — modals_help.php, modals.php, arcade.php.
6. **Cheatboard**.
7. **Pulizia chiavi morte** + verifica finale.

## 10. Verifica / testing
- **Parità chiavi:** diff automatico `it.php` ↔ `en.php` (stesso set), come già fatto nell'audit.
- **Lint:** `php -l` su entrambi i file lingua a ogni fase.
- **Smoke test:** caricare la pagina con cookie `it` e `en`; scanner che segnala eventuali chiavi grezze (testo === chiave) rimaste nel DOM.
- **Interpolazione:** verificare i toast con placeholder (`{amount}`, `{mult}`, …) in entrambe le lingue.
- **Selettore:** cambio IT↔EN persiste dopo reload.

## 11. Rischi e mitigazioni
- **Regressione su call-site dati** (lettura `.name`/`.desc`) → mitigata dal rollout per blocco con smoke test a ogni fase.
- **Chiavi mancanti a runtime** → `t()` ritorna la chiave, visibile subito; il diff di parità le intercetta.
- **Doppia iniezione (index + arcade)** → entrambe le pagine includono lo stesso snippet `window.LABELS`.
- **Caratteri accentati/emoji** → `json_encode(..., JSON_UNESCAPED_UNICODE)` e file in UTF-8 (già verificato su en.php).

## 12. Appendice — esclusioni esplicite dalla traduzione
- Nomi skin: `skins.<id>.name` (es. *Rick Espley*, *EspòngeBob*, *Britney Espears*, *Gespo*…).
- Nomi brani musicali visualizzati.
- Nomi propri di eventi: `events.<id>.name` (si traduce solo `toast`).
