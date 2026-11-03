import { test, expect } from '@playwright/test';
import { bootGame } from './helpers';

/**
 * Promozione e Formattazione controllano il requisito dove si spende.
 *
 * Le due funzioni stanno su window (shim kill-legacy in game/logic.ts), e il
 * requisito viveva solo nella UI: chiamate da fuori, la promozione alzava
 * totalResets anche a 0 token e la formattazione partiva senza le 20
 * promozioni — e il numero di formattazioni è la prima chiave della classifica.
 * Stessa lezione di buyPrestigeUpgrade e maxLevel (3.1).
 */

test.describe('Requisiti di Promozione e Formattazione', () => {
  test('la promozione chiamata da window sotto soglia non fa nulla', async ({ page }) => {
    await bootGame(page);

    const r = await page.evaluate(async () => {
      const w = window as any;
      const prima = w.EspooClicker.getGameState().totalResets || 0;
      await w.executePrestige();
      return { prima, dopo: w.EspooClicker.getGameState().totalResets || 0 };
    });

    expect(r.prima).toBe(0);
    expect(r.dopo).toBe(0);
  });

  test('la formattazione chiamata da window senza 20 promozioni non parte', async ({ page }) => {
    await bootGame(page);

    const r = await page.evaluate(() => {
      const w = window as any;
      w.EspooClicker.getGameState().totalResets = 19;
      w.executeFormattingSequence();
      // La sequenza vera imposta l'evento in modo sincrono, prima dell'animazione.
      return { evento: w.currentActiveEvent || null, formattazioni: w.EspooClicker.getGameState().totalFormattazioni || 0 };
    });

    expect(r.evento).not.toBe('Formatting');
    expect(r.formattazioni).toBe(0);
  });

  test('coi requisiti le due funzioni partono ancora', async ({ page }) => {
    await bootGame(page);

    const promo = await page.evaluate(async () => {
      const w = window as any;
      const gs = w.EspooClicker.getGameState();
      gs.totalResets = 0;
      gs.totalScore = new w.Decimal('2.5e8'); // sopra la soglia base (50M)
      await w.executePrestige();
      return w.EspooClicker.getGameState().totalResets;
    });
    expect(promo).toBe(1);

    const evento = await page.evaluate(() => {
      const w = window as any;
      w.EspooClicker.getGameState().totalResets = 20;
      w.executeFormattingSequence();
      return w.currentActiveEvent;
    });
    expect(evento).toBe('Formatting');
  });
});
