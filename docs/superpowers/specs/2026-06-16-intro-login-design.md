# Intro Login → Gioco — Design ("Debug → Deploy")

- **Data:** 2026-06-16
- **Stato:** Approvato (brainstorming) — pronto per il piano d'implementazione
- **Tema:** animazione intro cinematica al passaggio dal login al gioco, in stile col gioco (HUD/terminale sci-fi, bug-fixing).

---

## 1. Obiettivo

Sostituire l'attuale transizione "secca" (al login riuscito il modale si chiude e il
gioco appare di colpo) con una **sequenza cinematica ~4,6s, professionale**, che
racconti in pochi secondi l'identità del gioco: un sistema **pieno di bug** che viene
**riparato** e fa il **deploy**, atterrando sul logo e sull'HUD del gioco vero.

Successo = la prima impressione post-login comunica "dev/terminale/fix dei bug",
è skippabile, non rallenta chi gioca spesso, e non introduce regressioni nel flusso
audio o nei modali post-login.

---

## 2. Decisioni bloccate (dal brainstorming)

| Tema | Scelta |
|------|--------|
| **Quando** | Solo dopo login **esplicito** (`handleLogin`). NON al refresh/F5 con sessione attiva. |
| **Durata** | Cinematica, **~4,6s**, saltabile dopo ~0,6s. |
| **Direzione** | **Ibrido Debug + Deploy**: spine del glitch→fixed (B) + credibilità del log di deploy (A) + atterraggio su logo/HUD. |
| **Audio** | Sting effetti + **fade-in del brano ambient selezionato** mentre atterra l'HUD. Rispetta sempre master/sfx/music volume e mute. |
| **Default (a)** | Si **rimuove** il toast "Benvenuto X" (ridondante: lo dice l'intro). |
| **Default (b)** | Beat finale usa il **logo reale** `assets/image/logo.svg`. |
| **Default (c)** | Overlay **auto-iniettato** da `intro.js`; `index.php` non viene toccato. |

---

## 3. Architettura

Feature isolata e auto-contenuta, sullo stesso pattern degli overlay esistenti
(`#game-loader`, `#prestige-transition-overlay`). Nessun nuovo asset pesante: la
sequenza è canvas + CSS + il `logo.svg` già preimpostato; gli audio sono asset già
presenti.

### 3.1 Componenti

- **`js/intro.js`** (nuovo) — controller globale `window.EspoIntro`. Crea il proprio
  overlay nel DOM all'avvio della sequenza e lo rimuove a fine. Gestisce timeline,
  canvas (pioggia matrix), glitch, scanner, logo/brackets, skip, reduced-motion e
  gli sting SFX (chiama direttamente `playSound`, globale dello stesso bundle).
- **`css/intro.css`** (nuovo) — tutto lo stile dell'overlay e dei suoi stati/keyframe.
  Importato da `css/main.css` (entra nel bundle `dist/styles.bundle.min.css`,
  cache-busted, valido per tutti i viewport).
- **`build.js`** — `js/intro.js` aggiunto a `JS_FILES`, **prima** di `js/script.js`.
- **`js/modals.js`** — `handleLogin()`: la coda post-login viene spostata nei callback
  dell'intro (vedi §5).

### 3.2 API pubblica

```js
window.EspoIntro.play({
  username,          // string: mostrato nel comando e nel "WELCOME, <nome>"
  reducedMotion,     // bool opzionale: forza la versione ridotta (default: matchMedia)
  onReveal,          // chiamata al beat 5 (~3,4s): avvia il fade-in della musica
  onComplete         // chiamata a fine sequenza o allo skip: toast/modali post-login
});
```

- `play()` è **idempotente**: se un'intro è già in corso, ignora la nuova chiamata.
- Gli SFX (glitch/fixed/sting) sono **interni** a `intro.js`.
- L'avvio della **musica** è delegato (`onReveal`) perché dipende dallo stato di gioco
  (`bgMusicSelection`) e dall'API audio (`tryStartAudio` / `updateAmbientVolume`).

---

## 4. Timeline cinematica (beat + audio)

Tutto saltabile dopo ~0,6s (vedi §6). Durate indicative, da rifinire in implementazione.

| t (s) | Beat | Visivo | Audio |
|-------|------|--------|-------|
| 0,0–0,4 | **Boot** | Overlay copre il modale che si chiude. Nero `#050810` + pioggia matrix + scanline. Cursore + riga digitata `$ espo deploy --user "<nome>"`. | — |
| 0,4–1,6 | **Deploy log** (da A) | `[OK] auth token verified` · `[..] mounting workspace` · `compiling bug-core [▓▓▓]`. | (opz.) `sound-click` molto soft per riga |
| 1,6–2,6 | **Glitch** (spine di B) | Lo schermo si corrompe: split RGB, `[!!] 0xBUG`, flicker `SEGFAULT`/`NULLPTR`. | `sound-error` |
| 2,6–3,2 | **Debug pass** | Barra-scanner ciano spazza dall'alto in basso; ciò che attraversa "si pulisce". `[OK] ALL BUGS FIXED` (verde). | `sound-achievement` |
| 3,2–4,0 | **Reveal logo** | Flash → `logo.svg` entra in scala, i 4 angoli HUD scattano, sottotitolo `WELCOME, <NOME>`. | `sound-prestige` + **`onReveal()`** avvia fade-in musica |
| 4,0–4,6 | **Handoff** | Logo tiene → flash breve → overlay **si dissolve sul gioco vero** (già vivo); lo score fa un "bump". | musica a volume target (fade già in corso) |
| fine | — | Overlay rimosso dal DOM. | **`onComplete()`** → modali post-login |

---

## 5. Integrazione in `handleLogin()` (modals.js)

Oggi, nel ramo `data.status === 'success'`, dopo il salvataggio/caricamento dati:

```
closeModal(loginModal)
startGameRoutines()
updateAmbientVolume()
[aggiorna slider volumi]
updateMuteButton()
tryStartAudio()                 // <-- avvia subito la musica
showToast("Benvenuto " + u)     // <-- toast benvenuto
setTimeout(modali V2 / release notes, 500)
```

Dopo:

```
closeModal(loginModal)
startGameRoutines()             // il gioco è VIVO dietro l'overlay
updateAmbientVolume()
[aggiorna slider volumi]
updateMuteButton()

window.EspoIntro.play({
  username: u,
  onReveal:  () => Game.tryStartAudio(),      // musica entra al beat 5
  onComplete: () => {
    // (toast "Benvenuto" rimosso: ridondante con l'intro)
    if (window.triggerV2MigrationModal) { ... showV2MigrationModal ... }
    else if (window.shouldShowReleaseNotesOnLoad) { ... openReleaseNotes ... }
  }
});
```

Note:
- `startGameRoutines()` resta **immediato**: quando l'overlay si dissolve, l'HUD dietro
  mostra già numeri reali.
- I `setTimeout(…, 500)` dei modali post-login vengono **spostati dentro `onComplete`**:
  così non possono comparire sopra l'intro.
- Se per qualunque motivo `window.EspoIntro` non è disponibile (fallback difensivo),
  `handleLogin` esegue direttamente `onReveal`+`onComplete` in sequenza → comportamento
  ≈ a quello odierno, nessun blocco.

---

## 6. Skip, reduced-motion, i18n

- **Skip**: dopo ~0,6s compare un `Skip ▸` discreto; inoltre click sull'overlay o `Esc`
  saltano. Lo skip salta al beat **Handoff** (dissolve rapido) ed esegue
  `onReveal`(se non già) + `onComplete`. **Timeout di sicurezza** (~6s): se la timeline
  si inceppa, l'overlay si chiude e chiama i callback comunque.
- **`prefers-reduced-motion: reduce`**: versione ridotta — niente glitch/jitter né
  pioggia veloce; si va quasi diretti a logo + `WELCOME` statici, poi dissolve. Durata
  ~1,2s.
- **i18n**: le righe "codice" (`SEGFAULT`, `BUILD SUCCESS`, `mounting workspace`…) restano
  **universali** (sono codice). Solo la stringa di benvenuto `WELCOME, <nome>` passa dai
  dizionari IT/EN (`gameData.texts.ui.*` + overlay `i18n.en`) — nuova chiave dedicata,
  es. `intro.welcome` ("BENTORNATO" / "WELCOME"). Coerente con l'architettura i18n
  esistente; non tocca i file in mano al traduttore se la chiave la aggiungo io in coda.

---

## 7. Audio — piano autonomo (asset reali)

Tutti gli ID esistono in `js/data/assets.js` e passano per `AudioManager`, che rispetta
`masterVolume`/`sfxVolume`/`musicVolume` e lo stato muto. Volumi/scelte finali si rifiniscono
in implementazione, ma i default sono:

| Momento | Asset | ID | Tipo |
|---------|-------|----|------|
| Digitazione log (opz., soft) | click.mp3 | `sound-click` | sfx |
| Glitch / bug | error.mp3 | `sound-error` | sfx |
| ALL BUGS FIXED | achievement.mp3 | `sound-achievement` | sfx |
| Reveal logo / BUILD SUCCESS | prestige.mp3 | `sound-prestige` | sfx |
| Musica di sottofondo (fade-in) | `bgMusicSelection` utente (default `sound-bg-music`) | — | music |

- La musica **non** è hardcoded su V3: si usa `gameState.user.bgMusicSelection`, avviata via
  `tryStartAudio()` al beat 5; il fade-in sfrutta la logica già presente
  (`howl.fade(0, vol, 600)` in game-logic.js).
- Con audio in muto/volumi a 0: l'intro resta **identica a livello visivo**, semplicemente
  silenziosa (AudioManager gestisce già il gating).

---

## 8. File toccati

| File | Tipo | Modifica |
|------|------|----------|
| `js/intro.js` | nuovo | controller `window.EspoIntro` + overlay auto-iniettato |
| `css/intro.css` | nuovo | stile overlay, stati, keyframe |
| `css/main.css` | edit | `@import "intro.css";` |
| `build.js` | edit | `js/intro.js` in `JS_FILES` prima di `script.js` |
| `js/modals.js` | edit | `handleLogin()`: coda post-login → callback intro; rimozione toast |
| `js/data/texts.js` + `js/data-en/texts.js` | edit (minimo) | chiave `intro.welcome` (coordinare col traduttore) |

Build: `npm run build` (legacy + v3). La nuova CSS entra nel bundle; il JS nel
`dist/game.bundle.min.js`.

---

## 9. Edge case & rischi

- **Doppio login / spam Enter**: `play()` idempotente + `loginButton.disabled` già presente.
- **Modali post-login**: ora ancorati a `onComplete` → niente sovrapposizioni.
- **Performance**: 1 canvas leggero per ~4,6s, una volta per login. Trascurabile.
- **Z-index**: overlay sopra navbar/HUD/quick-mute, sotto eventuali toast critici di errore.
- **Mute "is-blocked"**: l'intro parte dopo un gesto utente (click Entra) → audio sbloccato;
  nessun conflitto con il flag `is-blocked` del quick-mute.
- **Traduttore concorrente**: `index.php`, `modals.js`, `texts.js` sono toccati anche
  dall'agente traduzioni. Mitigazione: `index.php` **non** toccato; su `modals.js`/`texts.js`
  modifiche piccole e localizzate, da sincronizzare al momento.
- **Fallback**: se `EspoIntro` assente, login si comporta come oggi.

---

## 10. Verifica / test

- **Funzionale**: login esplicito → intro completa → gioco vivo + musica + modali corretti.
- **Skip**: click/`Esc`/`Skip ▸` a vari istanti → dissolve immediato, callback eseguiti una
  sola volta.
- **F5 con sessione**: nessuna intro (ramo `initializeGame` invariato).
- **Reduced motion**: versione breve, nessun glitch.
- **Audio**: con/ senza muto; verifica che la musica parta una sola volta e non si
  sovrapponga; SFX gated dai volumi.
- **Preview**: harness `espo-harness` — controllo geometrie/stati con `preview_eval`
  (screenshot inaffidabili con game-loop attivo).
- **Desktop + mobile**: l'overlay è full-screen responsive; check su entrambe le larghezze.

---

## 11. Fuori scope

- Onboarding narrativo "prima volta" diverso dal login normale.
- Intro su F5/refresh.
- Nuovi asset audio/video dedicati (si riusano gli esistenti).
- Rifacimento del `#game-loader` (asset-loader pre-login) — resta com'è.
