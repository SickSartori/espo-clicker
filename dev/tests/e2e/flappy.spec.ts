import { test, expect, Page } from '@playwright/test';

/**
 * FLAPPY ESPÒÒÒ — meccaniche e integrazione con la sala giochi.
 *
 * Il gioco è a un tasto e dura 15 secondi dal primo tocco. I test pilotano lo stato
 * via window.__flappyDebug (step a tempo controllato, varchi piazzati a mano): senza,
 * l'esito dipenderebbe dal tempo reale e da dove cadono i varchi. Spawn spento e varchi
 * decisi dal test, così ogni caso guarda UNA regola.
 *
 * Verificato al contrario togliendo l'`e.repeat` dal gestore della tastiera: il test
 * del tasto tenuto premuto fallisce.
 */

async function bootFlappy(page: Page, opts: { menu?: boolean; live?: boolean } = {}): Promise<void> {
  // Il gate della sala giochi legge sessionStorage all'analisi della pagina.
  await page.addInitScript(() => {
    try { sessionStorage.setItem('espooUser', 'E2ETester'); } catch (e) { /* no-op */ }
  });
  await page.goto('/arcade.php', { waitUntil: 'domcontentloaded' });
  // load() si avvia ma non si aspetta: la sua promessa include la CDN di Phaser (solo Super Espò).
  await page.evaluate(() => { const w = window as any; if (w.ArcadeLoader) w.ArcadeLoader.load(); });
  await page.waitForFunction(() => typeof (window as any).initFlappyGame === 'function', undefined, { timeout: 15_000 });

  if (opts.menu) {
    // Percorso del bottone GIOCA: seleziona la voce e chiama launchArcadeGame (build + run). Il click
    // sulla voce del menu si evita apposta: i suoi gestori si attaccano a load() finito, e quella
    // promessa include la CDN di Phaser (solo Super Espò) — aspettarla legherebbe il test alla rete.
    await page.evaluate(() => { const w = window as any; w._arcadeSelectedGame = 'flappy'; w.launchArcadeGame(); });
  } else {
    await page.evaluate(() => { const w = window as any; w.initFlappyGame(); w.startFlappyRun(); });
  }
  await page.waitForFunction(() => !!document.getElementById('flappy-canvas') && !!(window as any).__flappyDebug, undefined, { timeout: 10_000 });
  // L'animazione di accensione del wrapper CRT parte da scale(1, 0.001): chi fa tocchi reali
  // deve aspettare che l'altezza si stabilizzi.
  await page.waitForFunction(() => {
    const c = document.getElementById('flappy-canvas');
    if (!c) return false;
    const h = c.getBoundingClientRect().height;
    const prec = (window as any).__hPrec;
    (window as any).__hPrec = h;
    return h > 100 && prec !== undefined && Math.abs(h - prec) < 0.5;
  }, undefined, { timeout: 10_000, polling: 100 });
  // Niente varchi casuali: li decide il test.
  await page.evaluate(() => { const d = (window as any).__flappyDebug; d.noSpawn(true); d.setGates([]); });
  // Il ciclo vero gira in sottofondo e accumulerebbe tempo fra una chiamata e l'altra: si ferma, e
  // step() resta l'unica fonte di tempo. Solo il test sul ciclo vivo lo lascia girare (live: true).
  if (!opts.live) await page.evaluate(() => (window as any).__flappyDebug.freeze());
}

const stato = (page: Page) => page.evaluate(() => (window as any).__flappyDebug.state());

/** Avanza di `secondi` con passi da 16ms, tenendo Espò a mezz'aria con un battito quando scende troppo. */
const avanza = (page: Page, secondi: number) => page.evaluate((s) => {
  const d = (window as any).__flappyDebug;
  const n = Math.round(s / 0.016);
  for (let i = 0; i < n; i++) {
    const st = d.state();
    if (st.phase !== 'playing') break;
    if (st.y > 280 && st.vy >= 0) d.flap();
    d.step(0.016);
  }
}, secondi);

test.describe('Flappy Espòòò', () => {
  test('dal menu: la voce 08 c\'è, GIOCA avvia il cabinato in attesa del primo tocco', async ({ page }) => {
    await bootFlappy(page, { menu: true });
    const voce = await page.evaluate(() => {
      const el = document.querySelector('.arcade-menu-item[data-game="flappy"]') as HTMLElement;
      return { num: el.querySelector('.item-num')!.textContent, nome: el.querySelector('.item-name')!.textContent, colore: el.dataset.color };
    });
    expect(voce).toEqual({ num: '08', nome: 'FLAPPY ESPÒÒÒ', colore: '#facc15' });
    const s = await stato(page);
    expect(s.phase, 'si aspetta il primo tocco').toBe('ready');
    expect(s.t).toBe(0);
    const c = await page.evaluate(() => { const c = document.getElementById('flappy-canvas') as HTMLCanvasElement; return [c.width, c.height]; });
    expect(c).toEqual([360, 600]);
  });

  test('disegna il campo: sfondo, rack, giocatore', async ({ page }) => {
    await bootFlappy(page);
    await page.evaluate(() => (window as any).__flappyDebug.setGates([{ x: 220, gapY: 280, gap: 150 }]));
    await page.evaluate(() => (window as any).__flappyDebug.step(0));
    const colori = await page.evaluate(() => {
      const c = document.getElementById('flappy-canvas') as HTMLCanvasElement;
      const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
      const set = new Set<string>();
      for (let i = 0; i < d.length; i += 40) set.add(`${d[i] >> 5},${d[i + 1] >> 5},${d[i + 2] >> 5}`);
      return set.size;
    });
    expect(colori, 'più di una manciata di tinte: non è un canvas vuoto').toBeGreaterThan(12);
  });

  test('UN solo tocco: il primo avvia il tempo e fa salire Espò, poi la gravità lo riporta giù', async ({ page }) => {
    await bootFlappy(page);
    // Tocco vero sul campo, non una chiamata diretta: prova anche il gestore del puntatore.
    const box = await page.locator('#flappy-canvas').boundingBox();
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);

    let s = await stato(page);
    expect(s.phase).toBe('playing');
    expect(s.vy, 'il battito dà una velocità verso l\'alto').toBeLessThan(0);
    const y0 = s.y;
    await page.evaluate(() => (window as any).__flappyDebug.step(0.1));
    s = await stato(page);
    expect(s.y, 'sale nei primi istanti').toBeLessThan(y0);
    expect(s.t).toBeCloseTo(0.1, 2);
    await page.evaluate(() => { const d = (window as any).__flappyDebug; for (let i = 0; i < 40; i++) d.step(0.016); });
    s = await stato(page);
    expect(s.vy, 'poi la gravità vince').toBeGreaterThan(0);
  });

  test('un tocco FUORI dal canvas, dentro l\'area di gioco, conta ugualmente (il campo è il tasto)', async ({ page }) => {
    await bootFlappy(page);
    const box = await page.locator('#arcade-active-game-container').boundingBox();
    // un punto dell'area di gioco, in fondo, lontano da topbar e canvas
    await page.mouse.click(box!.x + 6, box!.y + box!.height - 6);
    expect((await stato(page)).phase).toBe('playing');
  });

  test('SPAZIO e ▲ fanno volare; il tasto tenuto premuto non ripete il battito', async ({ page }) => {
    await bootFlappy(page);
    await page.keyboard.press('Space');
    let s = await stato(page);
    expect(s.phase).toBe('playing');
    expect(s.vy).toBeLessThan(0);

    // Lascio scendere, poi simulo il tasto TENUTO: i keydown successivi hanno repeat=true.
    await page.evaluate(() => { const d = (window as any).__flappyDebug; for (let i = 0; i < 30; i++) d.step(0.016); });
    const vPrima = (await stato(page)).vy;
    expect(vPrima).toBeGreaterThan(0);
    await page.evaluate(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ', repeat: true, bubbles: true, cancelable: true }));
    });
    expect((await stato(page)).vy, 'il repeat non è un battito').toBe(vPrima);

    await page.keyboard.press('ArrowUp');
    expect((await stato(page)).vy, '▲ è un battito').toBeLessThan(0);
  });

  test('un varco superato dà +1; un bug raccolto dà +2', async ({ page }) => {
    await bootFlappy(page);
    await page.keyboard.press('Space');
    await page.evaluate(() => {
      const d = (window as any).__flappyDebug;
      const s = d.state();
      // un varco largo, già quasi addosso, centrato su Espò, con un bug nel mezzo
      d.setGates([{ x: s.playerX - 10, gapY: s.y + 10, gap: 220, bug: true }]);
    });
    await page.evaluate(() => { const d = (window as any).__flappyDebug; d.setY(d.state().y, 0); });
    // pochi passi: il bug sta sulla traiettoria e Espò non fa a tempo a cadere
    await page.evaluate(() => { const d = (window as any).__flappyDebug; d.step(0.02); });
    let s = await stato(page);
    expect(s.bugs, 'bug raccolto').toBe(1);
    expect(s.score).toBe(2);

    // ora il varco esce: +1
    await page.evaluate(() => {
      const d = (window as any).__flappyDebug;
      d.setGates([{ x: -40, gapY: d.state().y, gap: 260 }]);
      d.step(0.02);
    });
    s = await stato(page);
    expect(s.gates, 'varco superato').toBe(1);
    expect(s.score).toBe(3);
  });

  test('SCHIANTO: un rack ferma la partita, il record si salva e il premio finisce nel portafoglio', async ({ page }) => {
    await bootFlappy(page);
    // BPS veri per il premio: la pagina arcade li legge da window.bps
    await page.evaluate(() => { const w = window as any; w.bps = new w.Decimal(1000); localStorage.removeItem('espo_arcade_pending_rewards'); localStorage.removeItem('espo_arcade_highscores'); });
    await page.keyboard.press('Space');
    await page.evaluate(() => {
      const d = (window as any).__flappyDebug;
      // 5 punti guadagnati prima dello schianto
      const s0 = d.state();
      for (let i = 0; i < 5; i++) d.setGates([{ x: -60, gapY: s0.y, gap: 400 }]), d.step(0.01);
      // poi un rack addosso, con il varco molto più in basso
      d.setGates([{ x: d.state().playerX - 20, gapY: 520, gap: 90 }]);
      d.setY(120, 0);
      d.step(0.01);
    });
    const s = await stato(page);
    expect(s.phase).toBe('over');
    expect(s.reason).toBe('crash');
    expect(s.score).toBeGreaterThan(0);

    const salvato = await page.evaluate(() => ({
      record: JSON.parse(localStorage.getItem('espo_arcade_highscores') || '{}').flappy,
      premio: JSON.parse(localStorage.getItem('espo_arcade_pending_rewards') || '{}').scoreNum,
    }));
    expect(salvato.record, 'record salvato').toBe(s.score);
    // premio = BPS × punteggio × 5%
    expect(salvato.premio).toBeCloseTo(1000 * s.score * 0.05, 5);
    await expect(page.locator('#flappy-overlay')).toBeVisible();
    await expect(page.locator('#flappy-overlay')).toContainText('SCHIANTO');
  });

  test('TEMPO: dopo 15 secondi dal primo tocco finisce da sola, senza schiantarsi', async ({ page }) => {
    await bootFlappy(page);
    await page.keyboard.press('Space');
    await avanza(page, 14.9);
    let s = await stato(page);
    expect(s.phase, 'a 14,9 s è ancora in corso').toBe('playing');
    expect(s.left).toBeGreaterThan(0);
    await avanza(page, 0.2);
    s = await stato(page);
    expect(s.phase).toBe('over');
    expect(s.reason).toBe('time');
    await expect(page.locator('#flappy-overlay')).toContainText('TEMPO');
  });

  test('il tempo NON scorre prima del primo tocco, nemmeno col ciclo che gira', async ({ page }) => {
    await bootFlappy(page, { live: true });
    await page.waitForTimeout(700);   // il ciclo rAF gira davvero
    const s = await stato(page);
    expect(s.phase).toBe('ready');
    expect(s.t).toBe(0);
    expect(s.left).toBe(15);
  });

  test('il soffitto ferma Espò senza ucciderlo; il pavimento sì', async ({ page }) => {
    await bootFlappy(page);
    await page.keyboard.press('Space');
    await page.evaluate(() => { const d = (window as any).__flappyDebug; d.setY(5, -400); d.step(0.05); });
    let s = await stato(page);
    expect(s.phase, 'il soffitto non uccide').toBe('playing');
    expect(s.y).toBeGreaterThanOrEqual(s.r);
    await page.evaluate(() => { const d = (window as any).__flappyDebug; d.setY(d.state().groundY - 3, 300); d.step(0.02); });
    s = await stato(page);
    expect(s.phase).toBe('over');
    expect(s.reason).toBe('crash');
  });

  test('uscire dal cabinato ferma il ciclo e riporta al menu', async ({ page }) => {
    await bootFlappy(page, { menu: true });
    await page.keyboard.press('Space');
    await page.evaluate(() => (window as any).exitFlappyGame());
    const r = await page.evaluate(() => ({
      contenitore: getComputedStyle(document.getElementById('arcade-active-game-container')!).display,
      canvas: !!document.getElementById('flappy-canvas'),
      fase: (window as any).__flappyDebug.state().phase,
    }));
    expect(r).toEqual({ contenitore: 'none', canvas: false, fase: 'idle' });
  });

  test('da telefono (375×812): nessun pad virtuale, il campo sta nello schermo', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    await bootFlappy(page, { menu: true });
    await page.waitForTimeout(600);

    const m = await page.evaluate(() => {
      const c = document.getElementById('flappy-canvas')!.getBoundingClientRect();
      const pad = getComputedStyle(document.getElementById('arcade-virtual-pad')!).display;
      const body = document.getElementById('arcade-fs-body')!;
      return {
        pad, nopad: document.body.dataset.nopad,
        riserva: getComputedStyle(body).paddingBottom,
        sx: c.left >= 0 && c.right <= innerWidth, sotto: c.bottom <= innerHeight, alto: c.top >= 0,
        larghezza: Math.round(c.width),
      };
    });
    expect(m.pad, 'niente pad: tutto il campo è il tasto').toBe('none');
    expect(m.nopad).toBe('1');
    expect(m.riserva, 'nessuna riserva sotto al canvas').toBe('0px');
    expect(m.sx && m.sotto && m.alto, 'il canvas sta tutto nello schermo').toBe(true);
    expect(m.larghezza).toBeGreaterThan(280);

    // Un tocco vero sul campo fa partire la partita.
    const box = await page.locator('#flappy-canvas').boundingBox();
    await page.touchscreen.tap(box!.x + box!.width / 2, box!.y + box!.height / 2);
    expect((await stato(page)).phase).toBe('playing');
    await ctx.close();
  });

  test('uscendo da Flappy il pad torna per gli altri cabinati (nopad non resta appiccicato)', async ({ page }) => {
    await bootFlappy(page, { menu: true });
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => document.body.dataset.nopad)).toBe('1');
    await page.evaluate(() => (window as any).exitFlappyGame());
    await expect.poll(async () => page.evaluate(() => document.body.dataset.nopad), { timeout: 3_000 }).toBeUndefined();
  });
});
