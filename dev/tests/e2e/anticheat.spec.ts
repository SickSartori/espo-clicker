import { test, expect, Page } from '@playwright/test';
import { bootGame, seedRichState } from './helpers';

/**
 * Anticheat lato client (3.2) — i percorsi che solo un browser vero può
 * provare, perché solo lui produce eventi "fidati" (isTrusted=true).
 * La logica pura (tetto di click, ritmo da macchina, tetto del premio arcade)
 * sta in src/game/anticheat.test.ts.
 */

async function ready(page: Page) {
  await bootGame(page);
  await seedRichState(page);
  await page.waitForFunction(
    () => !!(window as any)._espoScheduler && !!document.getElementById('clicker-btn'),
    undefined, { timeout: 15_000 },
  );
}

const clicks = (page: Page) => page.evaluate(() => (window as any).EspooClicker.getGameState().totalClicks as number);

test.describe('Anticheat', () => {
  test('click sintetici da script: non contano, nemmeno con detail:1 o via touch', async ({ page }) => {
    await ready(page);
    const before = await clicks(page);
    await page.evaluate(() => {
      const btn = document.getElementById('clicker-btn')!;
      // il vecchio buco: detail:1 superava il controllo su detail===0
      btn.dispatchEvent(new MouseEvent('click', { detail: 1, bubbles: true }));
      btn.dispatchEvent(new MouseEvent('click', { detail: 0, bubbles: true }));
      btn.click();
      try {
        const t = new Touch({ identifier: 1, target: btn, clientX: 10, clientY: 10 });
        btn.dispatchEvent(new TouchEvent('touchstart', { touches: [t], bubbles: true, cancelable: true }));
      } catch (e) { /* Touch non costruibile su questo browser: il caso mouse basta */ }
    });
    expect(await clicks(page), 'nessun click sintetico deve contare').toBe(before);

    // il click vero, invece, conta. force: dopo gli eventi sintetici il volto
    // resta in animazione e Playwright aspetterebbe per sempre che sia 'stabile';
    // qui conta solo che l'evento sia vero (isTrusted), e lo è comunque.
    await page.locator('#clicker-btn').click({ force: true });
    expect(await clicks(page)).toBe(before + 1);
  });

  test('Invio tenuto premuto: un click solo, le ripetizioni del tasto non contano', async ({ page }) => {
    await ready(page);
    await page.locator('#clicker-btn').focus();
    const before = await clicks(page);
    // keyboard.down ripetuto sullo stesso tasto produce keydown con repeat=true,
    // come tenere il tasto premuto
    for (let i = 0; i < 8; i++) await page.keyboard.down('Enter');
    await page.keyboard.up('Enter');
    expect(await clicks(page)).toBe(before + 1);

    // premere e rilasciare di nuovo conta di nuovo (la tastiera resta usabile)
    await page.keyboard.press('Enter');
    expect(await clicks(page)).toBe(before + 2);
  });

  /**
   * Click VERI con istanti scelti a mano via CDP (Input.dispatchMouseEvent con
   * timestamp): è così che il browser vede un autoclicker esterno, e il guardiano
   * usa proprio event.timeStamp. Deterministico: niente timer di Playwright.
   */
  async function clickRhythm(page: Page, jitterMs: number) {
    await page.evaluate(() => {
      const w = window as any;
      w.EspooClicker.getGameState().feedbackIntroAt = Date.now(); // niente popup segnala sopra al volto
      w.__toasts = [];
      const o = w.EspooClicker.showToast;
      w.EspooClicker.showToast = (m: any, t: any) => { w.__toasts.push(String(m)); return o.call(w.EspooClicker, m, t); };
    });
    const box = (await page.locator('#clicker-btn').boundingBox())!;
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    const cdp = await page.context().newCDPSession(page);
    const before = await clicks(page);
    let seed = 42;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
    let t = Date.now() / 1000;
    for (let i = 0; i < 60; i++) {
      t += (50 + (rnd() - 0.5) * 2 * jitterMs) / 1000;
      await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1, timestamp: t });
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1, timestamp: t + 0.005 });
    }
    await page.waitForTimeout(200);
    const after = await clicks(page);
    const warned = await page.evaluate(() => (window as any).__toasts.some((m: string) => m.includes('automatici')));
    return { counted: after - before, warned };
  }

  test('autoclicker a ritmo fisso (50 ms ± 1): dopo 30 click scatta la pausa, con avviso', async ({ page }) => {
    await ready(page);
    const r = await clickRhythm(page, 1);
    expect(r.counted).toBe(30);
    expect(r.warned).toBe(true);
  });

  test('mano umana veloce (50 ms ± 25): conta tutto entro il tetto, nessuna pausa', async ({ page }) => {
    await ready(page);
    const r = await clickRhythm(page, 25);
    expect(r.counted).toBeGreaterThanOrEqual(55);
    expect(r.warned).toBe(false);
  });

  test('premio arcade gonfiato a mano: incassa solo il tetto, il resto resta in attesa', async ({ page }) => {
    await ready(page);
    const r = await page.evaluate(async () => {
      const w = window as any;
      const gs = w.EspooClicker.getGameState();
      const before = new w.Decimal(gs.score);
      localStorage.setItem('espo_arcade_pending_rewards', JSON.stringify({ score: '1e100', scoreNum: 1e100, updated: Date.now() }));
      window.dispatchEvent(new Event('focus')); // l'incasso parte anche al focus
      await new Promise((res) => setTimeout(res, 300));
      const gained = new w.Decimal(gs.score).sub(before);
      const left = JSON.parse(localStorage.getItem('espo_arcade_pending_rewards') || '{"score":"0"}').score;
      return { gained: gained.toString(), gainedLt: gained.lt(new w.Decimal('1e30')), left };
    });
    expect(r.gainedLt, `incassato ${r.gained}`).toBe(true);
    expect(Number(r.left), 'l\'eccedenza resta in attesa').toBeGreaterThan(1e99);
  });

  test('premio arcade illeggibile: scartato, senza toccare i bug', async ({ page }) => {
    await ready(page);
    const r = await page.evaluate(async () => {
      const w = window as any;
      const gs = w.EspooClicker.getGameState();
      // ferma i BPS per misurare solo l'incasso
      const before = String(gs.score);
      localStorage.setItem('espo_arcade_pending_rewards', JSON.stringify({ score: 'tanti', scoreNum: 1 }));
      window.dispatchEvent(new Event('focus'));
      await new Promise((res) => setTimeout(res, 200));
      return { pending: localStorage.getItem('espo_arcade_pending_rewards'), same: new w.Decimal(gs.score).sub(new w.Decimal(before)).lt(new w.Decimal('1e12')) };
    });
    expect(r.pending).toBeNull();
    expect(r.same).toBe(true);
  });
});
