import { test, expect } from '@playwright/test';

/**
 * Regressioni trovate dal check totale del 07/08/2026.
 *
 * 1. TIMER DEL GAME OVER — la 3.1 ha migrato snake al riquadro di fine partita
 *    condiviso e cosi' facendo ha tolto l'unico `clearTimeout` esistente: il
 *    ritorno automatico al menu sopravviveva all'uscita e, scadendo, chiudeva
 *    il cabinato avviato NEL FRATTEMPO. Ora showArcadeGameOver espone
 *    window._arcadeCancelGameOver, chiamato da exit e da launch: vale per
 *    tutti e sette i giochi, non solo per snake.
 *
 * 2. SCHIACCIARE I BUG COL DITO — su telefono il campo e' scalato a ~0,43 e
 *    una cella misura 12px: meta' del bersaglio minimo raccomandato. Il tocco
 *    ora perdona il quasi-centro (bug piu' vicino entro ~1 cella), senza
 *    diventare un colpo a distanza.
 */
test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

async function arcade(page: any) {
  await page.route('**/functions/v1/**', () => {});
  await page.addInitScript(() => { try { sessionStorage.setItem('espooUser', 'E2ETester'); } catch (e) {} });
  await page.goto('/arcade.php', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { const w = window as any; if (w.ArcadeLoader) w.ArcadeLoader.load(); });
  await page.waitForFunction(() => typeof (window as any).initStackGame === 'function' && typeof (window as any).showArcadeGameOver === 'function', undefined, { timeout: 20000 });
}


// Il wrapper .crt-turn-on parte da scale(1, 0.001): misurare o cliccare il
// canvas prima che l'animazione finisca da coordinate sbagliate di un fattore
// ~6 (cella misurata 2px invece di 12). Si aspetta che l'altezza si stabilizzi.
async function attendiCrt(page: any) {
  await page.waitForFunction(() => {
    const c = document.getElementById('stack-canvas');
    if (!c) return false;
    const h = c.getBoundingClientRect().height;
    const prec = (window as any).__hPrec;
    (window as any).__hPrec = h;
    return h > 100 && prec !== undefined && Math.abs(h - prec) < 0.5;
  }, undefined, { timeout: 10000, polling: 100 });
}

test('FIX 1: il timer del game over non uccide il gioco avviato dopo', async ({ page }) => {
  await arcade(page);
  const r = await page.evaluate(async () => {
    const w = window as any;
    // Simula un game over con ritorno automatico brevissimo
    w.initStackGame();
    let tornato = false;
    w.showArcadeGameOver({
      overlay: document.getElementById('stack-overlay'),
      score: 10, onReturn: () => { tornato = true; }, delay: 600,
    });
    const cancellabile = typeof w._arcadeCancelGameOver === 'function';
    // L'utente cambia gioco: launchArcadeGame deve annullare il timer
    w._arcadeSelectedGame = 'stack';
    w.launchArcadeGame();
    await new Promise((res) => setTimeout(res, 1400));   // oltre il delay
    return { cancellabile, tornato, handleAzzerato: w._arcadeCancelGameOver === null };
  });
  expect(r.cancellabile, 'showArcadeGameOver deve esporre un annullamento').toBe(true);
  expect(r.tornato, 'il timer di una partita finita NON deve chiudere quella avviata dopo').toBe(false);
  expect(r.handleAzzerato).toBe(true);
});

test('FIX 2: schiacciare i bug col dito perdona il quasi-centro', async ({ page }) => {
  await arcade(page);
  await page.evaluate(() => {
    const w = window as any;
    w.initStackGame(); w.startStackRun(); w.__stackDebug.setPiece(null);
    const g = w.__stackDebug.fieldOrigin();
    const b: any[] = [];
    for (let r = 0; r < g.rows; r++) { const row: any[] = []; for (let c = 0; c < g.cols; c++) row.push(null); b.push(row); }
    b[g.rows - 1][4] = { color: '#00d9ff', bug: true };
    w.__stackDebug.setBoard(b);
  });
  await attendiCrt(page);
  const g = await page.evaluate(() => (window as any).__stackDebug.fieldOrigin());
  const box = await page.locator('#stack-canvas').boundingBox();
  // Le dimensioni LOGICHE si leggono dal canvas, non si danno per scontate:
  // su mobile stack usa un layout compatto (296x520, solo campo) invece di
  // quello largo (760x540, coi pannelli ai lati). Scrivere 760x540 qui
  // significava calcolare una scala sbagliata e cliccare nel posto sbagliato.
  const cs = await page.evaluate(() => {
    const c = document.getElementById('stack-canvas') as HTMLCanvasElement;
    const s = getComputedStyle(c);
    const r = c.getBoundingClientRect();
    return { bl: parseFloat(s.borderLeftWidth), bt: parseFloat(s.borderTopWidth), w: r.width, h: r.height, logW: c.width, logH: c.height };
  });
  const innerW = cs.w - cs.bl * 2, innerH = cs.h - cs.bt * 2;
  const sx = innerW / cs.logW, sy = innerH / cs.logH;
  // Tocco DECENTRATO di ~0.8 celle rispetto al bug: prima mancava, ora deve prendere
  const lx = g.x + (4 + 0.5) * g.cell + g.cell * 0.8;
  const ly = g.y + (g.rows - 1 + 0.5) * g.cell;
  await page.mouse.click(box!.x + cs.bl + lx * sx, box!.y + cs.bt + ly * sy);
  await page.waitForTimeout(300);
  const s = await page.evaluate(() => (window as any).__stackDebug.state());
  console.log('CELLA_CSS ' + (g.cell * sx).toFixed(2) + 'px');
  expect(s.bugs, 'un tocco vicino al bug deve schiacciarlo').toBe(1);
});

test('FIX 2b: un tocco lontano NON schiaccia niente', async ({ page }) => {
  await arcade(page);
  await page.evaluate(() => {
    const w = window as any;
    w.initStackGame(); w.startStackRun(); w.__stackDebug.setPiece(null);
    const g = w.__stackDebug.fieldOrigin();
    const b: any[] = [];
    for (let r = 0; r < g.rows; r++) { const row: any[] = []; for (let c = 0; c < g.cols; c++) row.push(null); b.push(row); }
    b[g.rows - 1][0] = { color: '#00d9ff', bug: true };
    w.__stackDebug.setBoard(b);
  });
  await attendiCrt(page);
  const g = await page.evaluate(() => (window as any).__stackDebug.fieldOrigin());
  const box = await page.locator('#stack-canvas').boundingBox();
  const cs = await page.evaluate(() => {
    const c = document.getElementById('stack-canvas') as HTMLCanvasElement;
    const s = getComputedStyle(c);
    const r = c.getBoundingClientRect();
    return { bl: parseFloat(s.borderLeftWidth), bt: parseFloat(s.borderTopWidth), w: r.width, h: r.height, logW: c.width, logH: c.height };
  });
  const sx = (cs.w - cs.bl * 2) / cs.logW, sy = (cs.h - cs.bt * 2) / cs.logH;
  const lx = g.x + (6 + 0.5) * g.cell;    // 6 colonne di distanza
  const ly = g.y + (g.rows - 1 + 0.5) * g.cell;
  await page.mouse.click(box!.x + cs.bl + lx * sx, box!.y + cs.bt + ly * sy);
  await page.waitForTimeout(300);
  const s = await page.evaluate(() => (window as any).__stackDebug.state());
  expect(s.bugs, 'lo snap non deve diventare un colpo a distanza').toBe(0);
});
