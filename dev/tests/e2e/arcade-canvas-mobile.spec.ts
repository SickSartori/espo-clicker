import { test, expect } from '@playwright/test';

/**
 * SALA GIOCHI SU TELEFONO — geometria del canvas.
 *
 * Due difetti trovati dal check del 07/08/2026, entrambi invisibili a un test
 * funzionale (il gioco "gira", solo che non si puo' giocare):
 *
 * 1. TELEFONO RUOTATO (812x375). Girare il telefono davanti a un cabinato e' il
 *    gesto piu' naturale che ci sia. Restavano 58px di area di gioco e il canvas
 *    finiva a 6x6 px: i 232px riservati in basso al flipper erano tarati sul
 *    verticale (un quinto di 812) e in orizzontale valgono due terzi di 375.
 *    Ora il flipper sta ai LATI e l'area torna a 314px.
 *
 * 2. CANVAS STIRATO. Asteroids/Invaders/Centipede avevano il canvas a
 *    width:100%/height:100%: riempiva il riquadro qualunque forma avesse, con
 *    una deformazione fino a 2,12x in verticale — cerchi ovali e mira sballata,
 *    visto che il colpo si calcola sul rettangolo reale.
 *
 * Il test misura il rettangolo REALE del canvas e lo confronta col rapporto
 * logico (canvas.width/canvas.height): la distorsione deve restare ~1,00.
 */
test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

const GIOCHI = [
  { key: 'asteroids', canvas: '#asteroids-canvas' },
  { key: 'invaders',  canvas: '#invaders-canvas' },
  { key: 'centipede', canvas: '#centipede-canvas' },
  { key: 'stack',     canvas: '#stack-canvas' },   // controllo: era gia' corretto
];

async function apriEAvvia(page: any, key: string, sel: string) {
  await page.route('**/functions/v1/**', () => {});
  await page.addInitScript(() => { try { sessionStorage.setItem('espooUser', 'E2ETester'); } catch (e) {} });
  await page.goto('/arcade.php', { waitUntil: 'domcontentloaded' });
  // I giochi sono lazy: si chiede il caricamento ma NON si aspetta la promise
  // (dentro c'e' la CDN di Phaser, che serve solo a Super Espo').
  await page.evaluate(() => { const w = window as any; if (w.ArcadeLoader) w.ArcadeLoader.load(); });
  await page.waitForFunction(() => {
    const w = window as any;
    return ['startAsteroidsGame', 'startInvadersGame', 'startCentipedeGame', 'initStackGame']
      .every((f) => typeof w[f] === 'function');
  }, undefined, { timeout: 30000 });
  await page.evaluate((k: string) => {
    const w = window as any;
    w._arcadeSelectedGame = k;
    w.launchArcadeGame();
  }, key);
  await page.waitForSelector(sel, { state: 'attached', timeout: 15000 });
  // Il wrapper .crt-turn-on parte da scale(1, 0.001): misurare prima della fine
  // dell'animazione da numeri sbagliati di un fattore ~6.
  await page.evaluate(async () => {
    const el = document.querySelector('#arcade-active-game-container .crt-turn-on') as HTMLElement | null;
    if (el) await Promise.all(el.getAnimations().map((a: any) => a.finished.catch(() => {})));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
}

async function misura(page: any, sel: string) {
  return page.evaluate((s: string) => {
    const c = document.querySelector(s) as HTMLCanvasElement;
    const r = c.getBoundingClientRect();
    const cs = getComputedStyle(c);
    // il bordo (stack ne ha 3px) non fa parte del campo disegnato: va tolto,
    // altrimenti falsa il rapporto sui canvas piccoli.
    const bx = parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
    const by = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
    const w = r.width - bx, h = r.height - by;
    const pad = document.getElementById('arcade-virtual-pad') as HTMLElement;
    let overlap = 0;
    if (getComputedStyle(pad).display !== 'none') {
      pad.querySelectorAll('.vp-dpad, .vp-actions').forEach((el) => {
        const s2 = el.getBoundingClientRect();
        const ox = Math.min(s2.right, r.right) - Math.max(s2.left, r.left);
        const oy = Math.min(s2.bottom, r.bottom) - Math.max(s2.top, r.top);
        if (ox > 0 && oy > 0) overlap += ox * oy;
      });
    }
    return { w, h, distorsione: (w / h) / (c.width / c.height), overlap };
  }, sel);
}

for (const g of GIOCHI) {
  test(`${g.key}: il canvas mantiene il rapporto in verticale`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await apriEAvvia(page, g.key, g.canvas);
    const m = await misura(page, g.canvas);
    expect(m.h, 'il canvas deve avere un\'altezza utile').toBeGreaterThan(150);
    expect(m.distorsione, `${g.key} verticale: rapporto d'aspetto`).toBeGreaterThan(0.98);
    expect(m.distorsione, `${g.key} verticale: rapporto d'aspetto`).toBeLessThan(1.02);
  });

  test(`${g.key}: il canvas resta giocabile col telefono ruotato`, async ({ page }) => {
    await page.setViewportSize({ width: 812, height: 375 });
    await apriEAvvia(page, g.key, g.canvas);
    const m = await misura(page, g.canvas);
    expect(m.distorsione, `${g.key} orizzontale: rapporto d'aspetto`).toBeGreaterThan(0.98);
    expect(m.distorsione, `${g.key} orizzontale: rapporto d'aspetto`).toBeLessThan(1.02);
    // il flipper spostato ai lati non deve finire sopra al campo
    expect(m.overlap, 'i tasti non devono coprire il canvas').toBe(0);
  });
}

test('telefono ruotato: area di gioco e flipper ai lati', async ({ page }) => {
  await page.setViewportSize({ width: 812, height: 375 });
  await apriEAvvia(page, 'asteroids', '#asteroids-canvas');
  const m = await page.evaluate(() => {
    const body = document.getElementById('arcade-fs-body') as HTMLElement;
    const cs = getComputedStyle(body);
    const area = body.getBoundingClientRect().height
      - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    // ogni gioco spegne i tasti che non usa (arcade-page.js): si misurano i vivi
    const tasti = Array.from(document.querySelectorAll('#arcade-virtual-pad .vp-btn, #arcade-virtual-pad .vp-action-btn'))
      .map((b) => b.getBoundingClientRect())
      .filter((r) => r.width > 0 && r.height > 0);
    return {
      area,
      padVisibile: getComputedStyle(document.getElementById('arcade-virtual-pad') as HTMLElement).display !== 'none',
      minLato: Math.min(...tasti.map((r) => Math.min(r.width, r.height))),
      fuoriSchermo: tasti.filter((r) => r.bottom > 375 || r.right > 812 || r.left < 0).length,
    };
  });
  // prima del fix: 58px (canvas 6x6 px)
  expect(m.area, 'area di gioco in orizzontale').toBeGreaterThan(250);
  expect(m.padVisibile, 'il flipper deve restare disponibile').toBe(true);
  expect(m.minLato, 'bersaglio minimo 44px (WCAG 2.5.8)').toBeGreaterThanOrEqual(44);
  expect(m.fuoriSchermo, 'nessun tasto fuori dallo schermo').toBe(0);
});

test('telefono ruotato: vale anche senza la classe di fallback touch-device', async ({ page }) => {
  // Il layout orizzontale si accende in due modi (pointer:coarse e la classe JS
  // html.touch-device). Qui si toglie la classe: deve reggere la sola media query.
  await page.setViewportSize({ width: 812, height: 375 });
  await apriEAvvia(page, 'centipede', '#centipede-canvas');
  const area = await page.evaluate(() => {
    document.documentElement.classList.remove('touch-device');
    const body = document.getElementById('arcade-fs-body') as HTMLElement;
    const cs = getComputedStyle(body);
    return body.getBoundingClientRect().height
      - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  });
  expect(area).toBeGreaterThan(250);
});
