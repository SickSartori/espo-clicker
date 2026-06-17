# Skin "Esposion" — design

- **Data:** 2026-06-17
- **Branch:** develop-v3
- **Stato:** implementato e verificato in preview (2026-06-17) — skin, modulo FX, CSS, SFX, sblocco combo 75

## Concept

Variante della skin base ("Classico", `default`) che si chiama **Esposion**. È la **prima skin "viva"/stateful** del gioco: man mano che il giocatore tiene un **combo** alto, Espo si **distrugge progressivamente in 10 fasi**, fino a una detonazione, per poi ricomporsi quando il combo cade. Tutte le altre skin sono coppie di immagini statiche; questa reagisce in tempo reale allo stato di combo.

L'aggancio naturale esiste già: `FX.registerClick()` ([js/game-logic.js](../../../js/game-logic.js)) viene chiamato a ogni click, calcola `_comboCount` e applica già effetti progressivi (counter da 5+, shake a 10/20, glow ring ogni 10). Il combo si azzera dopo **250ms** senza click (`_comboThreshold`).

## Decisioni bloccate

1. **Resa visiva: ibrida.** ~3 art chiave di Espo in cross-fade + effetti crescenti (shake, fumo, scintille, fuoco, flash) sopra. Le 10 fasi nascono dalla combinazione *art × intensità FX*.
2. **Ritmo: front-loaded, tarato su soglie alte.** Passi di ~30 combo nelle prime fasi, coda che si stringe verso il tetto. **Fase 10 = combo 250.**
3. **Ciclo: "detona e si ricompone".** Fase 10 = detonazione vera (flash + burst di particelle + boom one-shot), poi Espo si ricompone. Sul drop del combo si **riassembla in ~0.6s** scendendo di fase (non torna integro di colpo).
4. **Solo estetico — nessun bonus gameplay.** Il combo dà già +1%/click fino a +100% (cap a combo 106). Esposion *visualizza* quella potenza, non tocca i numeri. Coerente con l'obiettivo di non sbilanciare la progressione.
5. **Sblocco: combo 75, rarità `epic`** (per il momento). Il gioco traccia già `gameState.longestCombo`, quindi lo sblocco "raggiungi combo 75" è gratis da implementare.
6. **Grace-period: cosmetico puro (deciso da Claude).** La fase **sale solo col combo vero** (niente combo falsato → resta solo-estetico e bilanciato). In discesa, il riassemblaggio ~0.6s funge da grazia: se ri-clicchi entro quella finestra, riparti dalla fase visiva corrente. **Nessuna modifica** a `_comboThreshold`/`_comboTimer` reali.

## Mappa delle 10 fasi

| Fase | Combo ≥ | Art (cross-fade) | Intensità FX |
|-----:|--------:|------------------|--------------|
| 0 | 0 | Integro (`espo.webp`) | nessuno |
| 1 | 30 | Integro | micro-shake, crepe sottili (overlay), polvere leggera |
| 2 | 60 | Integro | crepe visibili, primo filo di fumo |
| 3 | 90 | **Crepato** (swap) | crepe diffuse, fumo leggero, scintille occasionali |
| 4 | 120 | Crepato | più fumo, scintille, lieve bagliore rosso |
| 5 | 150 | Crepato | fumo denso, scintille frequenti, glow ring |
| 6 | 180 | **Carbonizzato** (swap) | prime fiamme, fuliggine, shake medio |
| 7 | 205 | Carbonizzato | fuoco pieno, scintille intense, screen shake |
| 8 | 225 | Carbonizzato | pre-detonazione: tremore continuo, bagliore crescente, **charge SFX**, particelle che si staccano |
| 9 | 240 | Carbonizzato | instabilità critica: flash intermittenti, tremore max, charge che intensifica |
| 10 | 250 | **Detonazione** (swap) | full-screen flash + burst particelle + **boom SFX**, poi riassemblaggio |

Note:
- Bonus combo del gioco cap a 106 → dalla **fase 4 (120) in su** è tutto puro spettacolo, nessun effetto sui numeri.
- Con fase 1 a combo 30, in gioco casual (combo 10–20) Espo resta integro: è una skin "da maestri del combo" (scelta voluta).

## Architettura

- **Nuovo modulo `EsposionFX`** (file dedicato, es. `js/esposion.js`, aggiunto a `JS_FILES` in `build.js` prima di `script.js`). Tiene lo stato (`_phase` corrente, timer di riassemblaggio) e fa cleanup.
- **Hook in `FX.registerClick()`**: dopo il calcolo di `_comboCount`, se `gameState.skins.current === 'esposion'`, chiama `EsposionFX.update(comboCount)`. Quando la fase **cambia**, applica art + classe `esposion-phase-N` sul contenitore e scala le particelle. **Solo on-change** (niente lavoro per click che non cambiano fase).
- **Drop del combo**: quando scatta il `_comboTimer` (combo finito) o `_hideComboDisplay()`, `EsposionFX` avvia la discesa morbida (~0.6s, una fase alla volta) fino a 0.
- **Fase 10**: one-shot detonazione (flash overlay + burst particelle + `boom` SFX), poi schedula il ritorno a uno stato alto / riassemblaggio.
- **VFXManager**: estendere con le particelle d'esplosione (fumo/scintille/fuoco) scalate per fase, con pooling e cap. Riuso del pattern `start()/stopAll()` ([js/ui-functions.js](../../../js/ui-functions.js)).
- **Guardie**: tutto attivo solo se la skin corrente è `esposion`. Su cambio skin (`applySkinVisuals`) e su `visibilitychange`/blur → cleanup completo (stop particelle, reset fase, rimozione classi).
- **Soppressione video-event**: già coperta — il combo si azzera durante i video-event (`rick-rolling`), quindi la fase scende a 0 da sola.

## Asset immagini — GENERATI (2026-06-17)

**6 file** in `assets/image/skins/` (la fase 0 riusa `espo.webp` / `espo-click.webp`):
- `esposion-crepato.webp` + `esposion-crepato-click.webp`
- `esposion-carbonizzato.webp` + `esposion-carbonizzato-click.webp`
- `esposion-boom.webp` + `esposion-boom-click.webp`

Generati via Magnific/Freepik MCP in img2img: reference `espo.webp` (posa normale) e `espo-click.webp` (posa eccitata "click"), poi `remove_background` → resize 512×512 → webp (Pillow). Stessa persona/inquadratura, sfondo trasparente, escalation crepato→carbonizzato→boom. Prompt completi: vedi sezione "Prompt" in fondo. Master Magnific conservati sull'account; i temp locali sono stati rimossi.

## Audio (SFX)

Set su misura, **livelli fissi** (mappa `SFX_LEVEL`, come l'intro: `master × sfx × livello`, indipendenti da `audioCustom`, così non escono troppo alti). Registrati in `js/data/assets.js` (`type:'sfx'`, `category:'effetti'`).

| id | uso | durata | loop |
|----|-----|-------:|------|
| `esposion-tick` | cambio fase (opz.) | ~0.3s | no |
| `esposion-charge` | fasi 8–9 | ~1.8s | no |
| `esposion-boom` | fase 10 | ~2.0s | no |
| `esposion-crackle` (opz.) | fasi 6–9 | ~2.5s | sì (seamless) |

## CSS

- Nuovo `css/esposion.css`, importato da `css/main.css` (come `intro.css`). In dev la CSS legacy si auto-busta via filemtime (vedi memoria preview-css-cache-gotcha).
- Classi `esposion-phase-1..10` sul contenitore di Espo → overlay crepe/fuliggine, keyframe fumo/fuoco/scintille, flash detonazione, transizione di cross-fade tra gli art.
- `prefers-reduced-motion` → solo cross-fade degli art, niente particelle/shake/flash (come fa già l'intro).

## Dati skin

Voce `esposion` in `js/data/skins.js` **e** `js/data-en/skins.js`:
- `name`, `desc`, `img: "skins/espo.webp"`, `imgClick: "skins/espo-click.webp"`, `rarity: "epic"`, `unlockHint`.
- Marker per il motore dinamico (es. `comboExplode: true`) così `applySkinVisuals` e `EsposionFX` sanno che è stateful.
- Testi sblocco/sblocco in `js/data/texts.js` e `js/data-en/texts.js`.
- Logica di sblocco "longestCombo ≥ 75" (allineata al sistema obiettivi/skin esistente).

## Accessibilità, mobile, performance

- Budget particelle ridotto su mobile; `requestAnimationFrame`, pooling, cap per fase.
- `prefers-reduced-motion`: downgrade a soli cross-fade.
- Cleanup su cambio skin e su tab nascosto/blur (no particelle in background).

## Solo estetico — razionale di bilanciamento

Il combo è già un moltiplicatore di click (+1%/combo, cap +100% a combo 106). Aggiungere un bonus a Esposion sarebbe doppio conteggio e spingerebbe la progressione, contro l'obiettivo di bilanciamento. Esposion rende **leggibile e viscerale** il combo che hai già: spettacolo, non potenza.

## Rischi

1. **Coerenza dei 3 art** in generazione → mitigato generando in serie dallo stesso `espo.webp` con forza bassa→alta.
2. **Performance particelle** fasi 7–10 → cap + pooling + downgrade mobile/reduced-motion.
3. **Combo si rompe a 250ms** → le fasi 8–10 (225–250) le vedrà solo chi tiene combo lunghissimi. Voluto; il riassemblaggio morbido smorza la frustrazione.

## Fuori scope (YAGNI)

- Nessun bonus di gameplay.
- Niente musica dedicata (solo SFX); l'ambience resta quella corrente.
- Niente nuove fasi oltre le 10.

## Prompt di generazione (riferimento)

### SFX
- **Tick** (~0.3s): `Short clean digital UI tick, single crisp transient with a subtle glitchy edge, dry, no reverb tail, futuristic tech interface confirm, tasteful, not harsh.`
- **Charge** (~1.8s): `Rising synthetic energy charge-up, smooth ascending tension building to a peak, clean digital sci-fi, subtle electric shimmer, no harsh noise, designed sound, resolves at the top.`
- **Boom** (~2.0s): `Punchy digital detonation, deep sub-bass impact with a crisp glitchy crack on top, controlled clean sci-fi explosion, short tight tail, modern and impactful, no muddy realistic debris.`
- **Crackle** (~2.5s, loop): `Subtle looping electric crackle and ember sizzle, low-level continuous, clean and digital, no harshness, seamless loop, quiet background intensity bed.`

### Immagini (img2img, reference `espo.webp`, trasparente 512×512)
- **Crepato** (forza ~0.40): `Same man, same face, same navy polo shirt, same head-and-shoulders pose and framing, transparent background. Add fine cracks spreading across his skin and shirt like cracking porcelain and shattering glass, a few thin glowing orange fissures, light dust. Still intact and clearly recognizable, only lightly fractured. Photoreal, matching the reference lighting.`
- **Carbonizzato** (forza ~0.55): `Same man, same pose and framing, transparent background. Now charred and smoking: blackened soot patches on skin and polo, deeper cracks glowing hot orange like cooling lava, wisps of smoke rising, a few embers, singed clothing edges. Still recognizably him but badly damaged. Photoreal, dramatic warm rim light from the glowing cracks.`
- **Detonazione** (forza ~0.70): `Same man mid-explosion, same framing, transparent background. His silhouette fragmenting and bursting apart into chunks and debris flying outward, a bright white-orange blast core at the center, scattering pieces, smoke and sparks. Still suggests his shape and the navy polo. Dramatic, punchy, energetic, photoreal explosion frozen at its peak.`

## Punti aperti

- Nome esatto e `desc` della skin (IT/EN).
- Tetto/curva combo: attuale 30 · 60 · 90 · 120 · 150 · 180 · 205 · 225 · 240 · 250 (in collaudo).
- Crackle e tick: opzionali, da decidere all'ascolto.
