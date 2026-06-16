# Meme Achievements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere 18 achievement "meme" (nerd & cultura pop, di cui 6 a tema franchise: Super Mario, Big Bang Theory, Pokémon, SpongeBob) a Espò Clicker, come **sole aggiunte di dati**, con testi IT + overlay EN, verificati da un check automatico e dalla cheatboard dev.

**Architecture:** Solo dati. Si aggiungono 18 voci a `js/data/achievements.js` (IT + funzioni `condition`) e 18 voci a `js/data-en/achievements.js` (overlay EN). Nessuna modifica a motore (`checkAchievements`/`grantReward`/UI), bilanciamento o salvataggi: le chiavi nuove vengono auto-inizializzate da `getInitialGameState()` e gestite da `checkAchievements()`. Uno script Node (`check-achievements.js`, gemello di `balance-sim.js`) valida struttura, parità i18n e assenza di condizioni duplicate. Il bundle legacy `dist/game.bundle.min.js` si rigenera con `node build.js` (in dev il cache-bust è via `filemtime`, quindi basta ricaricare).

**Tech Stack:** vanilla JS (moduli dati `window.gameData.*`), `break_eternity` (Decimal), esbuild via `build.js`, server PHP dev (`localhost:8765`), cheatboard dev, Claude Preview MCP.

**Spec di riferimento:** `docs/superpowers/specs/2026-06-16-meme-achievements-design.md`

**⚠️ Stile dei commit (vincolo del proprietario — OVERRIDE):** messaggi in **italiano**, **una sola riga**, prefisso **`v3.0:`** (o `docs:`/`chore:`-equivalente con `v3.0:` per tooling), **senza corpo/descrizione** e **senza footer** (niente `Co-Authored-By`).

---

## File Structure

- `js/data/achievements.js` — **modify**: +18 voci nell'oggetto `window.gameData.achievements` (nome IT, desc, flavor, type, target, isSecret, reward, condition).
- `js/data-en/achievements.js` — **modify**: +18 voci nell'oggetto `window.gameData.i18n.en.achievements` (name solo se diverso, desc, flavor).
- `check-achievements.js` — **create** (root, gemello di `balance-sim.js`): validatore Node senza dipendenze esterne.
- `dist/game.bundle.min.js` — **generated** da `node build.js` (NON tracciato in git: `/dist/` è gitignored; rigenerato in CI prima del deploy). Non si committa.

---

### Task 1: Validatore Node (il "test")

**Files:**
- Create: `check-achievements.js`

- [ ] **Step 1: Scrivere il validatore**

Crea `check-achievements.js` con questo contenuto esatto:

```js
// Dev check (no dipendenze): valida le voci achievement aggiunte.
// - struttura IT corretta, condition è una funzione
// - parità i18n: ogni id ha overlay EN con desc
// - nessuna condizione DUPLICATA (stesso sorgente) fra tutti gli achievement
// Uso: node check-achievements.js   → exit 0 se ok, 1 se errori.
const fs = require('fs');
const path = require('path');

// Shim minimale: i file dati usano window.* e new Decimal() a livello top.
class Decimal { constructor(v) { this._v = v; } gte() { return false; } gt() { return false; } }
global.Decimal = Decimal;
global.window = { gameData: { i18n: { en: {} } } };
global.IS_XMAS_TIME = false;
global.gameState = null;
global.bps = new Decimal(0);

const root = __dirname;
const loadFile = (rel) => { (0, eval)(fs.readFileSync(path.join(root, rel), 'utf8')); };
loadFile('js/data/achievements.js');
loadFile('js/data-en/achievements.js');

const ach = global.window.gameData.achievements || {};
const en = (global.window.gameData.i18n.en && global.window.gameData.i18n.en.achievements) || {};

const NEW_IDS = ['theAnswer', 'over9000', 'leetHaxor', 'shinyHunter', 'comboBreaker', 'doge', 'stonks', 'gottaGoFast', 'shutUpTakeMoney', 'groundhogDay', 'quantumLeap', 'bugClicker', 'marioCastle', 'oneUp', 'bazinga', 'catchEmAll', 'imagination', 'moneyMoneyMoney'];

const errors = [];
for (const id of NEW_IDS) {
  const a = ach[id];
  if (!a) { errors.push(`IT mancante: ${id}`); continue; }
  if (!a.name) errors.push(`${id}: name mancante`);
  if (!a.desc) errors.push(`${id}: desc mancante`);
  if (!a.type) errors.push(`${id}: type mancante`);
  if (typeof a.condition !== 'function') errors.push(`${id}: condition non è una funzione`);
  if (!('isSecret' in a)) errors.push(`${id}: isSecret mancante`);
  if (!('reward' in a)) errors.push(`${id}: reward mancante (usa null)`);
  const e = en[id];
  if (!e) errors.push(`EN mancante: ${id}`);
  else if (!e.desc) errors.push(`${id}: desc EN mancante`);
}

// Nessuna condizione duplicata (stesso sorgente) fra TUTTI gli achievement.
const bySrc = {};
for (const id in ach) {
  if (typeof ach[id].condition !== 'function') continue;
  const src = ach[id].condition.toString().replace(/\s+/g, ' ').trim();
  (bySrc[src] = bySrc[src] || []).push(id);
}
for (const src in bySrc) if (bySrc[src].length > 1) errors.push(`condizione duplicata: ${bySrc[src].join(', ')}`);

if (errors.length) { console.error('CHECK FALLITO:\n- ' + errors.join('\n- ')); process.exit(1); }
console.log(`OK: ${NEW_IDS.length} achievement validati (IT + EN), nessuna condizione duplicata.`);
```

- [ ] **Step 2: Eseguire il check per vederlo FALLIRE**

Run: `node check-achievements.js`
Expected: FAIL (exit 1) con righe tipo `IT mancante: theAnswer`, `EN mancante: theAnswer`, ... (i dati non esistono ancora).

---

### Task 2: Aggiungere le 18 voci IT in `achievements.js`

**Files:**
- Modify: `js/data/achievements.js` (in coda all'oggetto, dopo `dioCodice`)

- [ ] **Step 1: Inserire il blocco delle 18 voci**

In `js/data/achievements.js`, trova la chiusura dell'ultima voce e dell'oggetto:

```js
        condition: () => gameState.teams.architetturaInfinito.count >= 100
    }
}
```

e sostituiscila con (aggiunge la virgola dopo `dioCodice` e le 18 voci prima della graffa finale):

```js
        condition: () => gameState.teams.architetturaInfinito.count >= 100
    },

    // ===== ACHIEVEMENT MEME (nerd & cultura pop) — v3.0 =====
    theAnswer: {
        name: 'La Risposta a Tutto',
        desc: 'Effettua 42 click manuali.',
        flavor: 'Quarantadue. La Domanda, però, resta sconosciuta.',
        type: 'click',
        target: 42,
        isSecret: true,
        reward: null,
        condition: () => gameState.totalClicks >= 42
    },
    over9000: {
        name: 'È OLTRE 9000!',
        desc: 'Supera i 9.000 Bug al secondo (BPS).',
        flavor: 'COSA?! NOVEMILA?!',
        type: 'custom',
        target: 9000,
        isSecret: true,
        reward: null,
        condition: () => bps.gt(9000)
    },
    leetHaxor: {
        name: 'L33T H4X0R',
        desc: 'Raggiungi 1.337 click manuali.',
        flavor: "Sei ufficialmente d'élite. 0wn3d.",
        type: 'click',
        target: 1337,
        isSecret: false,
        reward: { type: 'bugs', value: new Decimal(1337) },
        condition: () => gameState.totalClicks >= 1337
    },
    shinyHunter: {
        name: 'Cromatico!',
        desc: 'Clicca il tuo primo Golden Bug.',
        flavor: 'Le probabilità? Trascurabili. La gloria? Eterna.',
        type: 'custom',
        target: 1,
        isSecret: false,
        reward: { type: 'bugs', value: new Decimal(5000) },
        condition: () => gameState.totalGoldenBugsClicked >= 1
    },
    comboBreaker: {
        name: 'C-C-COMBO BREAKER!',
        desc: 'Raggiungi una combo di 50 click.',
        flavor: 'Una voce metallica urla in lontananza.',
        type: 'custom',
        target: 50,
        isSecret: true,
        reward: null,
        condition: () => (gameState.longestCombo || 0) >= 50
    },
    doge: {
        name: 'Such Bug, Much Wow',
        desc: 'Accumula 1 Milione di Bug totali.',
        flavor: 'wow. very click. so debug. much bug.',
        type: 'score',
        target: new Decimal(1000000),
        isSecret: false,
        reward: null,
        condition: () => gameState.totalScore.gte(1000000)
    },
    stonks: {
        name: 'STONKS',
        desc: 'Accumula 100 Milioni di Bug totali.',
        flavor: '↗ Solo crescita. Non chiedere come.',
        type: 'score',
        target: new Decimal(100000000),
        isSecret: false,
        reward: null,
        condition: () => gameState.totalScore.gte(100000000)
    },
    gottaGoFast: {
        name: 'Gotta Go Fast',
        desc: 'Supera i 1.000 Bug al secondo (BPS).',
        flavor: 'Un riccio blu annuisce con approvazione.',
        type: 'custom',
        target: 1000,
        isSecret: false,
        reward: null,
        condition: () => bps.gt(1000)
    },
    shutUpTakeMoney: {
        name: 'Zitto e Prendi i Miei Soldi',
        desc: 'Possiedi 250 unità Team totali.',
        flavor: "Non m'importa se funziona. Lo voglio.",
        type: 'custom',
        target: 250,
        isSecret: false,
        reward: null,
        condition: () => Object.values(gameState.teams).reduce((s, t) => s + (t.count || 0), 0) >= 250
    },
    groundhogDay: {
        name: 'Ricomincio da Capo',
        desc: 'Esegui 10 Promozioni (reset).',
        flavor: 'Ancora? Ancora. ANCORA.',
        type: 'custom',
        target: 10,
        isSecret: false,
        reward: null,
        condition: () => (gameState.totalResets || 0) >= 10
    },
    quantumLeap: {
        name: 'Quantum Leap',
        desc: 'Accumula 50 Q-bits.',
        flavor: 'Oh boy.',
        type: 'custom',
        target: 50,
        isSecret: false,
        reward: null,
        condition: () => gameState.qBits.gte(50)
    },
    bugClicker: {
        name: 'Bug Clicker',
        desc: 'Raggiungi 100.000 click manuali.',
        flavor: 'Un omaggio al nonno di tutti i clicker.',
        type: 'click',
        target: 100000,
        isSecret: false,
        reward: { type: 'bugs', value: new Decimal(50000) },
        condition: () => gameState.totalClicks >= 100000
    },
    marioCastle: {
        name: 'La Principessa è in un Altro Castello',
        desc: 'Esegui la tua prima Promozione (reset).',
        flavor: 'Grazie per aver giocato! Adesso però si ricomincia.',
        type: 'custom',
        target: 1,
        isSecret: false,
        reward: null,
        condition: () => (gameState.totalResets || 0) >= 1
    },
    oneUp: {
        name: '1-UP!',
        desc: 'Clicca 100 Golden Bug.',
        flavor: 'Cento monete dorate, una vita in più.',
        type: 'custom',
        target: 100,
        isSecret: false,
        reward: { type: 'bugs', value: new Decimal(10000) },
        condition: () => gameState.totalGoldenBugsClicked >= 100
    },
    bazinga: {
        name: 'Bazinga!',
        desc: 'Accumula 73 Milioni di Bug totali.',
        flavor: '73: il 21º numero primo, e il migliore di tutti. Bazinga.',
        type: 'score',
        target: new Decimal(73000000),
        isSecret: true,
        reward: null,
        condition: () => gameState.totalScore.gte(73000000)
    },
    catchEmAll: {
        name: 'Acchiappali Tutti!',
        desc: 'Possiedi 151 unità di uno stesso Team.',
        flavor: 'Erano solo 151, ai bei vecchi tempi.',
        type: 'custom',
        target: 151,
        isSecret: false,
        reward: null,
        condition: () => Object.values(gameState.teams).some(t => (t.count || 0) >= 151)
    },
    imagination: {
        name: 'Imagination',
        desc: 'Sblocca 5 skin diverse.',
        flavor: '🌈 Im-ma-gi-na-zio-ne.',
        type: 'custom',
        target: 5,
        isSecret: false,
        reward: null,
        condition: () => (gameState.skins.unlocked || []).length >= 5
    },
    moneyMoneyMoney: {
        name: 'Money Money Money',
        desc: 'Guadagna 10 Miliardi di Bug nel corso della vita (lifetime).',
        flavor: "Mr. Krabs ha sentito l'odore dei soldi.",
        type: 'score',
        target: new Decimal(10000000000),
        isSecret: false,
        reward: null,
        condition: () => gameState.lifetimeScore.gte(10000000000)
    }
}
```

---

### Task 3: Aggiungere le 18 voci overlay EN in `data-en/achievements.js`

**Files:**
- Modify: `js/data-en/achievements.js` (in coda all'oggetto, dopo `dioCodice`)

- [ ] **Step 1: Inserire il blocco EN**

In `js/data-en/achievements.js`, trova le ultime due righe:

```js
    dioCodice: { name: "God of Code", desc: "Own 100 Infinity Architectures." }
};
```

e sostituiscile con (virgola dopo `dioCodice` + 18 voci EN; `name` solo dove diverso dall'IT):

```js
    dioCodice: { name: "God of Code", desc: "Own 100 Infinity Architectures." },
    theAnswer: { name: "The Answer to Everything", desc: "Land 42 manual clicks.", flavor: "Forty-two. The Question, however, remains unknown." },
    over9000: { name: "It's Over 9000!", desc: "Exceed 9,000 Bugs per second (BPS).", flavor: "WHAT?! NINE THOUSAND?!" },
    leetHaxor: { desc: "Reach 1,337 manual clicks.", flavor: "You're officially elite. 0wn3d." },
    shinyHunter: { name: "Shiny!", desc: "Click your first Golden Bug.", flavor: "The odds? Negligible. The glory? Eternal." },
    comboBreaker: { desc: "Reach a 50-click combo.", flavor: "A metallic voice screams in the distance." },
    doge: { desc: "Rack up 1 Million total bugs.", flavor: "wow. very click. so debug. much bug." },
    stonks: { desc: "Rack up 100 Million total bugs.", flavor: "↗ Only up. Don't ask how." },
    gottaGoFast: { desc: "Exceed 1,000 Bugs per second (BPS).", flavor: "A blue hedgehog nods in approval." },
    shutUpTakeMoney: { name: "Shut Up and Take My Money!", desc: "Own 250 total Team units.", flavor: "I don't care if it works. I want it." },
    groundhogDay: { name: "Groundhog Day", desc: "Perform 10 Promotions (resets).", flavor: "Again? Again. AGAIN." },
    quantumLeap: { desc: "Accumulate 50 Q-bits.", flavor: "Oh boy." },
    bugClicker: { desc: "Reach 100,000 manual clicks.", flavor: "A tribute to the grandfather of all clickers." },
    marioCastle: { name: "Our Princess Is in Another Castle!", desc: "Perform your first Promotion (reset).", flavor: "Thank you for playing! But now we start over." },
    oneUp: { desc: "Click 100 Golden Bugs.", flavor: "A hundred golden coins, one extra life." },
    bazinga: { desc: "Rack up 73 Million total bugs.", flavor: "73: the 21st prime, and the best number of all. Bazinga." },
    catchEmAll: { name: "Gotta Catch 'Em All!", desc: "Own 151 units of a single Team.", flavor: "There were only 151 of them, back in the day." },
    imagination: { desc: "Unlock 5 different skins.", flavor: "🌈 Im-ag-in-a-tion." },
    moneyMoneyMoney: { desc: "Earn 10 Billion lifetime bugs.", flavor: "Mr. Krabs smells money." }
};
```

---

### Task 4: Validare e committare

**Files:**
- Run: `check-achievements.js`
- Commit: `js/data/achievements.js`, `js/data-en/achievements.js`, `check-achievements.js`

- [ ] **Step 1: Eseguire il validatore → deve PASSARE**

Run: `node check-achievements.js`
Expected: PASS (exit 0) — `OK: 18 achievement validati (IT + EN), nessuna condizione duplicata.`
Se fallisce: correggere i campi segnalati (typo di chiave, desc EN mancante, condizione duplicata) e rieseguire.

- [ ] **Step 2: Committare i dati**

```bash
git add js/data/achievements.js js/data-en/achievements.js
git commit -m "v3.0: achievement meme - 18 obiettivi nerd/pop (incl. 6 a tema franchise), testi IT + EN"
```

- [ ] **Step 3: Committare il validatore**

```bash
git add check-achievements.js
git commit -m "v3.0: tooling - check-achievements.js (valida struttura, parita' i18n EN e assenza di condizioni duplicate)"
```

---

### Task 5: Rigenerare il bundle e caricare la preview

**Files:**
- Run: `build.js`

- [ ] **Step 1: Rigenerare il bundle legacy**

Run: `node build.js`
Expected: stampa `✓ dist/game.bundle.min.js (...)`, `✓ dist/styles.bundle.min.css`, ecc., senza errori. (Il bundle include `js/data/achievements.js` e `js/data-en/achievements.js`; in dev il cache-bust è via `filemtime`.)

- [ ] **Step 2: Avviare/usare la preview e ricaricare**

Assicurarsi che il server PHP dev sia attivo (`espo-harness`, `localhost:8765`); avviarlo con `preview_start` se serve. Poi ricaricare: `preview_eval` → `window.location.reload()`.

- [ ] **Step 3: Verificare assenza di errori in console**

Usare `preview_console_logs`.
Expected: nessun errore JS (in particolare nessun `SyntaxError` da `achievements.js`/`data-en` e nessun "achievements is not defined").

---

### Task 6: Verifica funzionale deterministica (sblocco di tutti i 18)

**Files:** nessuno (verifica runtime via `preview_eval`)

- [ ] **Step 1: Impostare lo stato e invocare `checkAchievements()`**

Eseguire con `preview_eval` questo script (imposta in un colpo solo lo stato che soddisfa tutte le condizioni, poi controlla gli sblocchi):

```js
(() => {
  const ids = ['theAnswer','over9000','leetHaxor','shinyHunter','comboBreaker','doge','stonks','gottaGoFast','shutUpTakeMoney','groundhogDay','quantumLeap','bugClicker','marioCastle','oneUp','bazinga','catchEmAll','imagination','moneyMoneyMoney'];
  ids.forEach(id => { if (gameState.achievements[id]) gameState.achievements[id].unlocked = false; });
  gameState.totalClicks = 100000;
  gameState.totalGoldenBugsClicked = 100;
  gameState.longestCombo = 50;
  gameState.totalResets = 11;
  gameState.qBits = new Decimal(50);
  gameState.totalScore = new Decimal('1e9');
  gameState.lifetimeScore = new Decimal('1e11');
  gameState.skins.unlocked = ['default','a','b','c','d'];
  Object.keys(gameState.teams).forEach(k => { gameState.teams[k].count = 200; });
  bps = new Decimal(9001);
  checkAchievements();
  const res = {}; let allOk = true;
  ids.forEach(id => { const ok = !!(gameState.achievements[id] && gameState.achievements[id].unlocked); res[id] = ok; if (!ok) allOk = false; });
  return { allOk, missing: ids.filter(id => !res[id]) };
})()
```

Expected: `{ allOk: true, missing: [] }`.
Se `missing` contiene id: la `condition` di quegli id non scatta → rileggere la condizione nella spec e correggere il dato in `achievements.js`, poi `node build.js`, ricaricare e riprovare.

- [ ] **Step 2: Verificare il toast/segreti a campione (snapshot)**

`preview_snapshot` (o ispezione UI achievement) per confermare che le voci compaiano e che i segreti (`theAnswer`, `over9000`, `comboBreaker`, `bazinga`) fossero "???" prima dello sblocco. (Facoltativo: ricaricare con un profilo pulito e sbloccarne uno "vero" via cheatboard, es. "Aggiungi Click" fino a 42, per confermare suono + toast.)

---

### Task 7: Verifica i18n EN

**Files:** nessuno (verifica runtime)

- [ ] **Step 1: Passare a EN e ricaricare**

`preview_eval`:

```js
document.cookie = 'user_default_language=en;path=/;max-age=31536000'; window.location.reload();
```

- [ ] **Step 2: Controllare i testi EN applicati**

`preview_eval`:

```js
({
  app_lang: window.APP_LANG,
  theAnswer_name: gameData.achievements.theAnswer.name,
  over9000_name: gameData.achievements.over9000.name,
  doge_desc: gameData.achievements.doge.desc,
  catchEmAll_name: gameData.achievements.catchEmAll.name,
  leetHaxor_name: gameData.achievements.leetHaxor.name
})
```

Expected:
```
app_lang: 'en'
theAnswer_name: 'The Answer to Everything'
over9000_name: "It's Over 9000!"
doge_desc: 'Rack up 1 Million total bugs.'
catchEmAll_name: "Gotta Catch 'Em All!"
leetHaxor_name: 'L33T H4X0R'   // invariato: name non tradotto (uguale in IT/EN)
```

- [ ] **Step 3: Ripristinare IT**

`preview_eval`:

```js
document.cookie = 'user_default_language=it;path=/;max-age=31536000'; window.location.reload();
```

Poi `preview_eval` → `gameData.achievements.theAnswer.name` → Expected `'La Risposta a Tutto'`.

---

### Task 8: Chiusura

- [ ] **Step 1: Stato git pulito**

Run: `git status --short`
Expected: vuoto (i 2 commit di Task 4 coprono tutto; `dist/` è gitignored e non compare; nessun file di verifica residuo).

- [ ] **Step 2: Riepilogo**

Confermare: 18 achievement aggiunti (IT+EN), validatore verde, sblocco di tutti i 18 verificato, i18n EN/IT verificata, nessun errore in console, nessuna modifica a motore/bilanciamento/save.

---

## Self-Review

**1. Spec coverage:**
- 18 achievement (12 base + 6 franchise) → Task 2 (IT) + Task 3 (EN). ✔
- Ricompense (4 in Bug: #3 leetHaxor, #4 shinyHunter, #12 bugClicker, #14 oneUp; resto cosmetico) → presenti nel blocco IT. ✔
- Segreti (theAnswer, over9000, comboBreaker, bazinga) → `isSecret: true` nelle voci. ✔
- i18n (name solo se diverso, desc, flavor) → Task 3. ✔
- Condizioni su stato già tracciato → verificate in spec; Task 6 le esercita tutte. ✔
- "Nessun overlap" → il validatore (Task 1/4) fallisce su condizioni duplicate. ✔
- Verifica via cheatboard/preview → Task 6/7. ✔

**2. Placeholder scan:** nessun TBD/TODO; tutti i blocchi di codice sono completi (validatore, 18 IT, 18 EN, script di verifica). ✔

**3. Type consistency:** gli id usati in `NEW_IDS` (Task 1 e Task 6) coincidono con le chiavi dei blocchi IT (Task 2) ed EN (Task 3): theAnswer, over9000, leetHaxor, shinyHunter, comboBreaker, doge, stonks, gottaGoFast, shutUpTakeMoney, groundhogDay, quantumLeap, bugClicker, marioCastle, oneUp, bazinga, catchEmAll, imagination, moneyMoneyMoney (18). Reward type `'bugs'` + `value: new Decimal(...)` coerente con gli achievement esistenti. `condition` sempre funzione che legge `gameState`/`bps`. ✔
