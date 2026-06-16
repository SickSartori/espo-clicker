# Spec — Achievement "meme" a tema nerd & cultura pop

**Data:** 2026-06-16
**Stato:** approvato (design), pronto per il piano di implementazione
**Branch:** develop-v3

## Obiettivo

Aggiungere **12 nuovi achievement** a tema meme/nerd/cultura pop, in linea con il tono già presente nel gioco (es. "Hello World!", "Inception", "Rick Roll Patch", "Made in Heaven", "Time Lord"). Devono integrarsi col sistema achievement esistente e con la struttura i18n (testo IT inline di default + overlay EN).

## Vincoli e decisioni (dal proprietario)

- **Quantità:** ~10-12 → **12**.
- **Ricompense:** *per lo più cosmetici + qualche Bug*. Nessun moltiplicatore globale / prestige / skin → **nessun impatto sul bilanciamento appena tarato** (softcap bonus permanente, vedi `applyBonusSoftcap`).
- **Approccio scelto: "A — Solo dati".** Tutte le condizioni usano statistiche **già tracciate** in `gameState`. Nessuna modifica al motore, nessun nuovo campo di stato, nessuna migrazione del salvataggio.
- **i18n:** ogni achievement ha testo IT inline + voce EN nell'overlay (nome solo se diverso, come da convenzione esistente).

## Non-goals (YAGNI)

- Niente skin nuove / asset grafici.
- Niente easter egg interattivi che richiedano nuovo tracking o input (codice Konami, click sul logo, orario, ecc.) — era l'approccio "B", scartato per ora.
- Niente modifiche a `checkAchievements` / `grantReward` / UI: si riusano così come sono.
- Niente ribilanciamento: nessuna ricompensa di tipo `multiplier` o `prestige`.

## Sistema esistente (riferimento)

**Dati** — `js/data/achievements.js`, mappa `window.gameData.achievements[<id>]`:

```js
<id>: {
  name,                 // nome IT (default inline)
  desc,                 // descrizione IT
  flavor?,              // testo "flavor" opzionale
  type,                 // 'click' | 'building' | 'score' | 'time' | 'custom'
  target,               // number | Decimal (guida la barra di progresso per i tipi numerici)
  buildingId?,          // solo per type 'building'
  isSecret,             // bool — se true mostrato come "???" finché non sbloccato
  season?,              // opzionale (es. 'christmas')
  reward,               // null | { type:'bugs'|'skin'|'prestige'|'multiplier', value|id }
  condition: () => bool // legge gameState/variabili globali
}
```

**i18n EN** — `js/data-en/achievements.js`, mappa `window.gameData.i18n.en.achievements[<id>] = { name?, desc, flavor? }` (solo stringhe traducibili; `name` presente solo se diverso dall'IT).

**Motore** — `checkAchievements()` (in `js/game-logic.js`, chiamato dal game-loop in `js/script.js`):
- inizializza in modo sicuro `gameState.achievements[key]` se mancante (quindi i save vecchi non rompono nulla);
- auto-sblocca quando `condition()` è vera → `unlockAchievement()` (suono + toast; se `reward` è `null` viene auto-"claimed", altrimenti il premio va riscosso da `claimAchievementReward()`);
- gli achievement con `reward.type === 'multiplier'` vengono **saltati finché non si è post-prestige**. I nostri non usano `multiplier`, quindi non sono interessati.

**Campi `gameState` disponibili per le condizioni** (verificati in `js/data/gamestate.js`): `totalClicks`, `totalScore` (Decimal), `totalGoldenBugsClicked`, `longestCombo`, `totalPlayTime`, `totalResets`, `totalFormattazioni`, `qBits` (Decimal), `teams.<id>.count`, `clickUpgrades.<id>.purchased`, ecc. Inoltre la variabile globale `bps` (Decimal) è leggibile nelle condizioni.

## I 12 nuovi achievement

Ordine, id e dettagli completi. Tutti con `season` assente.

| # | id | type | target | isSecret | reward |
|---|----|------|--------|----------|--------|
| 1 | `theAnswer` | click | 42 | true | — |
| 2 | `over9000` | custom | 9000 | true | — |
| 3 | `leetHaxor` | click | 1337 | false | bugs 1337 |
| 4 | `shinyHunter` | custom | 1 | false | bugs 5000 |
| 5 | `comboBreaker` | custom | 50 | true | — |
| 6 | `doge` | score | 1e6 | false | — |
| 7 | `stonks` | score | 1e8 | false | — |
| 8 | `gottaGoFast` | custom | 1000 | false | — |
| 9 | `shutUpTakeMoney` | custom | 250 | false | — |
| 10 | `groundhogDay` | custom | 10 | false | — |
| 11 | `quantumLeap` | custom | 50 | false | — |
| 12 | `bugClicker` | click | 100000 | false | bugs 50000 |

### Testi e condizioni

**1. `theAnswer`** — Guida Galattica per Autostoppisti
- IT: name `La Risposta a Tutto`, desc `Effettua 42 click manuali.`, flavor `Quarantadue. La Domanda, però, resta sconosciuta.`
- EN: name `The Answer to Everything`, desc `Land 42 manual clicks.`, flavor `Forty-two. The Question, however, remains unknown.`
- `condition: () => gameState.totalClicks >= 42`

**2. `over9000`** — Dragon Ball (Vegeta)
- IT: name `È OLTRE 9000!`, desc `Supera i 9.000 Bug al secondo (BPS).`, flavor `COSA?! NOVEMILA?!`
- EN: name `It's Over 9000!`, desc `Exceed 9,000 Bugs per second (BPS).`, flavor `WHAT?! NINE THOUSAND?!`
- `condition: () => bps.gt(9000)`

**3. `leetHaxor`** — leetspeak (1337)
- IT: name `L33T H4X0R`, desc `Raggiungi 1.337 click manuali.`, flavor `Sei ufficialmente d'élite. 0wn3d.`
- EN: desc `Reach 1,337 manual clicks.`, flavor `You're officially elite. 0wn3d.` (name invariato)
- `reward: { type: 'bugs', value: new Decimal(1337) }`
- `condition: () => gameState.totalClicks >= 1337`

**4. `shinyHunter`** — Pokémon (shiny)
- IT: name `Cromatico!`, desc `Clicca il tuo primo Golden Bug.`, flavor `Le probabilità? Trascurabili. La gloria? Eterna.`
- EN: name `Shiny!`, desc `Click your first Golden Bug.`, flavor `The odds? Negligible. The glory? Eternal.`
- `reward: { type: 'bugs', value: new Decimal(5000) }`
- `condition: () => gameState.totalGoldenBugsClicked >= 1`

**5. `comboBreaker`** — Killer Instinct
- IT: name `C-C-COMBO BREAKER!`, desc `Raggiungi una combo di 50 click.`, flavor `Una voce metallica urla in lontananza.`
- EN: desc `Reach a 50-click combo.`, flavor `A metallic voice screams in the distance.` (name invariato)
- `condition: () => gameState.longestCombo >= 50`

**6. `doge`** — Doge
- IT: name `Such Bug, Much Wow`, desc `Accumula 1 Milione di Bug totali.`, flavor `wow. very click. so debug. much bug.`
- EN: desc `Rack up 1 Million total bugs.`, flavor `wow. very click. so debug. much bug.` (name invariato)
- `condition: () => gameState.totalScore.gte(1000000)`

**7. `stonks`** — meme "Stonks"
- IT: name `STONKS`, desc `Accumula 100 Milioni di Bug totali.`, flavor `↗ Solo crescita. Non chiedere come.`
- EN: desc `Rack up 100 Million total bugs.`, flavor `↗ Only up. Don't ask how.` (name invariato)
- `condition: () => gameState.totalScore.gte(100000000)`

**8. `gottaGoFast`** — Sonic
- IT: name `Gotta Go Fast`, desc `Supera i 1.000 Bug al secondo (BPS).`, flavor `Un riccio blu annuisce con approvazione.`
- EN: desc `Exceed 1,000 Bugs per second (BPS).`, flavor `A blue hedgehog nods in approval.` (name invariato)
- `condition: () => bps.gt(1000)`

**9. `shutUpTakeMoney`** — Futurama (Fry)
- IT: name `Zitto e Prendi i Miei Soldi`, desc `Possiedi 250 unità Team totali.`, flavor `Non m'importa se funziona. Lo voglio.`
- EN: name `Shut Up and Take My Money!`, desc `Own 250 total Team units.`, flavor `I don't care if it works. I want it.`
- `condition: () => Object.values(gameState.teams).reduce((s, t) => s + (t.count || 0), 0) >= 250`

**10. `groundhogDay`** — Ricomincio da capo / Edge of Tomorrow
- IT: name `Ricomincio da Capo`, desc `Esegui 10 Promozioni (reset).`, flavor `Ancora? Ancora. ANCORA.`
- EN: name `Groundhog Day`, desc `Perform 10 Promotions (resets).`, flavor `Again? Again. AGAIN.`
- `condition: () => gameState.totalResets >= 10`

**11. `quantumLeap`** — "In viaggio nel tempo" (Quantum Leap)
- IT: name `Quantum Leap`, desc `Accumula 50 Q-bits.`, flavor `Oh boy.`
- EN: desc `Accumulate 50 Q-bits.`, flavor `Oh boy.` (name invariato)
- `condition: () => gameState.qBits.gte(50)`

**12. `bugClicker`** — omaggio meta a Cookie Clicker
- IT: name `Bug Clicker`, desc `Raggiungi 100.000 click manuali.`, flavor `Un omaggio al nonno di tutti i clicker.`
- EN: desc `Reach 100,000 manual clicks.`, flavor `A tribute to the grandfather of all clickers.` (name invariato)
- `reward: { type: 'bugs', value: new Decimal(50000) }`
- `condition: () => gameState.totalClicks >= 100000`

## Note tecniche

- **Barra di progresso:** i tipi numerici (`click`, `score`) usano `target` per la barra come gli achievement esistenti. I `custom` (incl. quelli su `bps`, golden bug, combo, reset, Q-bit, somma team) si sbloccano in modo binario, come `fullStack`/`errore404`/`madeInHeaven` oggi. Accettato.
- **`bps` nelle condizioni:** `bps` è una variabile globale (Decimal) aggiornata da `recalculateCPS()`; al momento del check riflette la produzione corrente. Usare `bps.gt(...)`.
- **Decimal:** usare `new Decimal(...)` per i `value` delle reward e `.gte()` per i confronti su `totalScore`/`qBits`.
- **Compatibilità save:** nessuna migrazione necessaria. `checkAchievements()` inizializza da sé le chiavi mancanti, quindi i salvataggi esistenti acquisiscono i nuovi achievement come "non sbloccati".

## File toccati

1. `js/data/achievements.js` — +12 voci (IT + logica: type/target/isSecret/reward/condition).
2. `js/data-en/achievements.js` — +12 voci overlay EN (name se diverso, desc, flavor).
3. Rebuild del bundle (`npm run build`) **non** committato (dist ora fuori da git; rigenerato in CI).

## Verifica (via cheatboard dev)

Per ciascun gruppo di condizioni, usare la cheatboard per portare lo stato alla soglia e confermare: sblocco + suono + toast, comparsa in Ui achievement, riscossione Bug dove prevista, e che i segreti restino "???" finché non sbloccati.

- **Click:** "Aggiungi Click" → verificare 42 (#1), 1337 (#3, +1337 Bug), 100k (#12, +50k Bug).
- **Score:** "Imposta Score" → 1e6 (#6), 1e8 (#7).
- **BPS:** portare BPS sopra 1.000 (#8) e 9.000 (#2) (es. team/bonus via cheatboard).
- **Golden Bug:** generare/cliccare un Golden Bug (#4, +5.000 Bug).
- **Combo:** raggiungere combo 50 (#5).
- **Reset:** "Vai al Livello"/Promozioni fino a 10 (#10).
- **Q-bits:** "Imposta Q-bits" a 50 (#11).
- **Team:** sommare ≥250 unità tra i team (#9).
- **i18n:** ricaricare con `APP_LANG='en'` (cookie lingua = en) e verificare nomi/desc/flavor EN; con IT verificare i testi inline.

## Criteri di accettazione

- 12 achievement presenti, sbloccabili alle condizioni indicate, senza errori in console.
- 3 ricompense in Bug (#3, #4, #12) accreditate alla riscossione; gli altri 9 puramente cosmetici.
- Segreti (#1, #2, #5) nascosti finché non sbloccati.
- Testi corretti in IT e in EN.
- Nessuna regressione su achievement esistenti, bilanciamento, o salvataggi.
