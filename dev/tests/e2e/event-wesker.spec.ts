import { test, expect, Page } from '@playwright/test';
import { bootGame } from './helpers';

/**
 * Albert Wespo — skin legendaria con il suo evento video «7 Ticket» (12,2 s).
 *
 * Come Rick, Ricardo e Britney, chi indossa la skin ha l'80% di probabilità che il
 * «404» periodico sia il suo video (logic.ts, triggerBluescreen). Il video è più
 * corto degli altri (12 s contro 45-60) e per questo ha un moltiplicatore più alto,
 * x20-40: a parità di resa. Qui si guarda che l'evento parta, mostri il video col
 * badge del moltiplicatore e finisca da solo alla durata dichiarata; il file vero
 * e il cablaggio (assets, boot, CSS) hanno la loro guardia in data.test.ts.
 *
 * La riproduzione è finta: in headless l'autoplay con audio è bloccato e il video
 * da 9,6 MB non serve alla prova.
 */

async function bootWespo(page: Page): Promise<void> {
  await page.clock.install();
  await bootGame(page);
  await page.evaluate(() => {
    const w = window as any;
    HTMLMediaElement.prototype.play = () => Promise.resolve();
    HTMLMediaElement.prototype.pause = () => { /* no-op */ };
    HTMLMediaElement.prototype.load = () => { /* no-op */ };
    const gs = w.EspooClicker.getGameState();
    gs.feedbackIntroAt = Date.now();
    if (!gs.skins.unlocked.includes('wesker')) gs.skins.unlocked.push('wesker');
  });
  // I tag <video> si creano in injectVideosLazily, a precarico finito: si lascia scorrere
  // l'orologio finché quello di Wespo c'è (in una partita vera passano minuti prima del primo evento).
  for (let i = 0; i < 40; i++) {
    if (await page.evaluate(() => !!document.getElementById('albert-wespo-video'))) break;
    await page.clock.fastForward(500);
    await page.waitForTimeout(100);
  }
}

const stato = (page: Page) => page.evaluate(() => {
  const w = window as any;
  const v = document.getElementById('albert-wespo-video');
  return {
    evento: w.currentActiveEvent as string | null,
    videoEsiste: !!v,
    videoVisibile: !!v && !v.classList.contains('video_display_none'),
    badge: (document.getElementById('event-multiplier-display') as HTMLElement).textContent || '',
    rickRolling: document.body.classList.contains('rick-rolling'),
  };
});

test.describe('Albert Wespo — evento 7 Ticket', () => {
  test('la skin è in catalogo: legendaria, 80 Token e Formattazione', async ({ page }) => {
    await bootWespo(page);
    const s = await page.evaluate(() => {
      const sk = (window as any).gameData.skins.wesker;
      return { nome: sk.name, rarita: sk.rarity, costo: Number(sk.cost.toString()), formatta: !!sk.requiresFormatting };
    });
    expect(s).toEqual({ nome: 'Albert Wespo', rarita: 'legendary', costo: 80, formatta: true });
  });

  test('l\'evento parte col video e il badge x20-40, e finisce da solo dopo 12,2 s', async ({ page }) => {
    await bootWespo(page);
    await page.evaluate(() => (window as any).triggerGameEvent('wesker'));

    const s = await stato(page);
    expect(s.evento).toBe('Albert Wespo');
    expect(s.videoEsiste, 'il tag <video> è creato all\'avvio').toBe(true);
    expect(s.videoVisibile).toBe(true);
    expect(s.rickRolling, 'il pannello evento prende il posto della UI').toBe(true);
    const mult = Number(s.badge.replace('×', ''));
    expect(mult).toBeGreaterThanOrEqual(20);
    expect(mult).toBeLessThanOrEqual(40);

    // Poco prima della fine è ancora in corso; poi si spegne da solo.
    await page.clock.fastForward(12_000);
    expect((await stato(page)).evento).toBe('Albert Wespo');
    await page.clock.fastForward(400);
    await expect.poll(async () => (await stato(page)).evento).toBeNull();
    const fine = await stato(page);
    expect(fine.videoVisibile).toBe(false);
    expect(fine.rickRolling).toBe(false);
  });

  test('col 404 periodico: con la skin addosso scatta il suo video (80%), con un\'altra no', async ({ page }) => {
    await bootWespo(page);
    const esito = (skin: string, random: number) => page.evaluate(([id, r]) => {
      const w = window as any;
      w.stopBluescreenEffect();
      w.currentActiveEvent = null;
      w.EspooClicker.getGameState().skins.current = id;
      const orig = Math.random;
      Math.random = () => r as number;
      try { w.triggerBluescreen(5); } finally { Math.random = orig; }
      const evento = w.currentActiveEvent;
      w.stopBluescreenEffect();
      return evento as string | null;
    }, [skin, random] as [string, number]);

    expect(await esito('wesker', 0.1), 'dentro l\'80%: il suo video').toBe('Albert Wespo');
    expect(await esito('wesker', 0.95), 'fuori dall\'80%: l\'evento standard').not.toBe('Albert Wespo');
    expect(await esito('default', 0.1), 'altra skin: mai il video di Wespo').not.toBe('Albert Wespo');
  });
});
