# Product

## Register

product

## Users

Giocatori casual da browser (desktop e mobile), spesso dev/QA o vicini alla cultura tech, che tengono il gioco aperto in sessioni lunghe (idle/incremental). Giocano per rilassarsi e per la progressione: click → upgrade → Promozione (prestige) → Formattazione (NG+). Molti arrivano dal passaparola aziendale: il gioco è una parodia della vita da sviluppatore (bug, Jira, Agile, manager Espòòò).

## Product Purpose

Espòòò Clicker è un incremental/clicker game satirico sul bug-fixing: ogni click "risolve un bug", gli upgrade generano BPS, i reset (Promozione/Formattazione) danno progressione meta. Il successo è retention giocosa: il giocatore torna ogni giorno, sblocca skin/achievement, scala la classifica, e ride dei riferimenti dev-culture. Le skin hanno rarità (common → rare → epic → legendary → divine, + christmas stagionale) e la rarità equipaggiata tinge l'ambiente di gioco.

## Brand Personality

Ironico, nerd, cyber-arcade. Satira dev-culture che non si prende sul serio, ma con una UI 3.0 "Cyber-Tech" rifinita: cyan/neon su fondi scuri, dettagli HUD, font monospace tech, glow strategici. L'umorismo sta nei testi e nei riferimenti pop (JoJo, Mario, meme); la grafica è curata, mai sciatta. Emozioni target: soddisfazione da progressione, sorpresa da sblocco, orgoglio da collezione.

## Anti-references

- **Niente casinò/gacha pacchiano**: no esplosioni dorate da slot machine, no lens flare cheap da gacha mobile. La scala di rarità deve sentirsi premium, non urlata.
- **Mai coprire Espo e il click**: gli sfondi di rarità sono ambiente; il bottone clicker e il personaggio dominano sempre. Gli effetti non competono con l'azione primaria.
- **Niente effetti che affaticano**: no strobo, no flash rapidi, no movimento perpetuo veloce. Sessioni lunghe → effetti che respirano lenti. `prefers-reduced-motion` sempre rispettato.
- Generic admin-dashboard look: questo è un gioco, non un gestionale.

## Design Principles

1. **L'ambiente racconta la rarità**: la scala common→divine deve leggersi a colpo d'occhio (firma visiva unica per tier: forma + colore + ritmo), senza leggere testo.
2. **Il click è sacro**: qualunque effetto ambientale sta dietro (z-index, contrasto, movimento) all'azione primaria.
3. **Premium, non urlato**: il "wow" viene da profondità e qualità del dettaglio, non da quantità di effetti.
4. **Respiro lento**: le animazioni ambientali hanno cicli lunghi (≥7s), pensate per ore di gioco senza fatica visiva.
5. **Mobile leggero, stessa identità**: su mobile la rarità si riconosce con la stessa palette/atmosfera, ma con gradienti statici o micro-animazioni lente (batteria e performance prima di tutto).

## Accessibility & Inclusion

- `prefers-reduced-motion: reduce` disattiva tutte le animazioni ambientali (già in essere, va mantenuto in ogni nuovo effetto).
- I colori di rarità non veicolano informazioni da soli: la rarità è sempre leggibile anche da badge/testo (i colori sono rinforzo, non unico canale).
- Contrasto: gli effetti di sfondo restano a bassa opacità; testo e controlli mantengono contrasto AA sui fondi scuri.
- Touch target mobile ≥ 44px (standard già adottato nel progetto).
