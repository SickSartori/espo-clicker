import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Guardie di COERENZA fra i cabinati della sala giochi.
 *
 * I sette giochi condividono la stessa shell (js/arcade-page.js) ma vivono in
 * file separati, quindi le differenze si accumulano in silenzio: nel giro di
 * qualche release il game over era stato ricopiato a mano in due giochi su
 * sette, con colori e durate divergenti e i testi non tradotti, e la stessa
 * statistica era scritta 'ONDATE' in due giochi e 'WAVE' in un terzo.
 *
 * Questi test non provano il comportamento — quello sta negli e2e — ma
 * impediscono che la base torni a divergere.
 *
 * Sta in src/ perché vitest guarda solo lì (vite.config.ts: include
 * 'src/**\/*.test.ts'), mentre i giochi stanno in arcade/.
 */

const GIOCHI = ['snake', 'space', 'asteroids', 'invaders', 'centipede', 'stack'];
const sorgente = (g: string) => readFileSync(join(process.cwd(), 'arcade', g, 'js', `${g}.js`), 'utf8');

describe('coerenza dei cabinati arcade', () => {
  it('tutti i giochi esistono dove ci si aspetta', () => {
    for (const g of GIOCHI) {
      expect(existsSync(join(process.cwd(), 'arcade', g, 'js', `${g}.js`)), `manca arcade/${g}/js/${g}.js`).toBe(true);
    }
  });

  it('il riquadro di fine partita è quello condiviso, non una copia locale', () => {
    for (const g of GIOCHI) {
      const src = sorgente(g);
      expect(src.includes('showArcadeGameOver'), `${g} non usa l'helper condiviso`).toBe(true);
      // Segni tipici di una copia scritta a mano: il titolo o la barra
      // costruiti nel gioco invece che nell'helper.
      expect(src.includes("textContent = 'GAME OVER'"), `${g} ricostruisce il titolo a mano`).toBe(false);
      expect(src.includes('arcadeGoBarFill'), `${g} ricostruisce la barra di ritorno a mano`).toBe(false);
    }
  });

  it('la ricompensa usa lo stesso moltiplicatore ovunque', () => {
    const trovati = new Map<string, string>();
    for (const g of GIOCHI) {
      const m = sorgente(g).match(/mul\(score\)\.mul\(([0-9.]+)\)/);
      expect(m, `${g} non calcola la ricompensa da bps × score`).not.toBeNull();
      trovati.set(g, m![1]!);
    }
    const distinti = new Set(trovati.values());
    expect(distinti.size, `moltiplicatori diversi fra giochi: ${JSON.stringify([...trovati])}`).toBe(1);
  });

  it('il game over suona come negli altri: campione + bip sintetizzato', () => {
    for (const g of GIOCHI) {
      const src = sorgente(g);
      expect(src.includes("playSound('sound-arcade-gameover')"), `${g} non riproduce il campione di game over`).toBe(true);
      expect(src.includes('arcadeSfx.gameover'), `${g} non riproduce il bip di game over`).toBe(true);
    }
  });

  it('le etichette a schermo passano da ARCADE_TXT, non sono scritte in chiaro', () => {
    // 'ONDATE' e 'WAVE' erano scritte fisse nel codice: due giochi in italiano
    // e uno in inglese, nessuno dei tre traducibile.
    for (const g of GIOCHI) {
      const src = sorgente(g);
      expect(src.includes("statLabel: 'ONDATE'"), `${g} ha l'etichetta ONDATE scritta in chiaro`).toBe(false);
      expect(src.includes("statLabel: 'WAVE'"), `${g} ha l'etichetta WAVE scritta in chiaro`).toBe(false);
    }
  });

  it('ogni gioco salva il record sotto una chiave propria', () => {
    const chiavi = new Set<string>();
    for (const g of GIOCHI) {
      const m = sorgente(g).match(/arcadeHighScores\.([a-z]+)\s*=/);
      expect(m, `${g} non salva un record`).not.toBeNull();
      chiavi.add(m![1]!);
    }
    expect(chiavi.size, `due giochi condividono la stessa chiave di record: ${[...chiavi]}`).toBe(GIOCHI.length);
  });

  it('ogni gioco è registrato nella shell e nel caricatore', () => {
    const shell = readFileSync(join(process.cwd(), 'js', 'arcade-page.js'), 'utf8');
    const loader = readFileSync(join(process.cwd(), 'src', 'lib', 'arcade-loader.ts'), 'utf8');
    for (const g of GIOCHI) {
      // La shell mappa la chiave del gioco a build/run/exit
      expect(shell.includes(`${g}:`), `${g} non è nelle mappe di js/arcade-page.js`).toBe(true);
      // E il caricatore ne carica JS e CSS
      expect(loader.includes(`arcade/${g}/js/${g}.js`), `${g} non è caricato da arcade-loader`).toBe(true);
      expect(loader.includes(`arcade/${g}/css/${g}.css`), `il CSS di ${g} non è caricato da arcade-loader`).toBe(true);
    }
  });
});
