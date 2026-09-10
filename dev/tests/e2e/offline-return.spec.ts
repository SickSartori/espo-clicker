import { test, expect } from '@playwright/test';
import { bootGame } from './helpers';

/**
 * Modale "Bentornato" (guadagni offline) al rientro.
 *
 * Fino alla 3.1.6 compariva SOLO quando il cloud vinceva l'anti-rollback
 * (dispositivo nuovo, cache pulita): sul rientro normale — stesso browser,
 * locale uguale o avanti al cloud — loadCloudData usciva con `return` prima di
 * checkOfflineProgress(), e entro 30s l'autosave riscriveva lastSaveTimestamp.
 * I guadagni offline non venivano mai consegnati, e nemmeno il toast di sync.
 *
 * Qui il cloud è un gemello del locale (anti-rollback → 'equal' → vince il
 * locale), cioè il caso che era rotto. Il worker offline è asincrono: si aspetta
 * qualche centinaio di ms prima di leggere il modale.
 */

const MODALE = '#offline-modal';

async function rientroDopoDueOre(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    const w = window as any;
    const gs = w.EspooClicker.getGameState();
    gs.user.username = 'E2ETester';
    gs.lastSaveTimestamp = Date.now() - 2 * 3600 * 1000;
    gs.lifetimeScore = new w.Decimal(1000);
    gs.totalFormattazioni = 0;
    gs.totalResets = 0;
    w.bps = new w.Decimal(10);

    // Stessi numeri del locale → decide() = 'equal' → keepLocal.
    const cloud = JSON.parse(JSON.stringify(gs));
    cloud.schemaVersion = 3;
    const blob = w.LZString.compressToUTF16(JSON.stringify(cloud));

    w.__toasts = [];
    const origToast = w.showToast;
    w.showToast = (m: unknown, ...rest: unknown[]) => { w.__toasts.push(String(m)); return origToast.apply(w, [m, ...rest]); };
    w.EspooClicker.loadCloudData(blob);
  });

  // Il calcolo offline gira nel worker V3: la prima chiamata paga anche il
  // fetch e la compilazione del worker, quindi un'attesa fissa è una scommessa.
  await page.waitForFunction(
    () => getComputedStyle(document.getElementById('offline-modal')!).display === 'flex',
    undefined, { timeout: 15_000 },
  );

  return page.evaluate(() => {
    const m = document.getElementById('offline-modal')!;
    return {
      visibile: getComputedStyle(m).display,
      guadagno: document.getElementById('offline-earnings-display')!.textContent || '',
      efficienza: document.getElementById('offline-efficiency-display')!.textContent || '',
      toasts: ((window as any).__toasts || []) as string[],
    };
  });
}

test.describe('Rientro: modale Bentornato', () => {
  test('quando vince il salvataggio locale il rientro si legge lo stesso, col toast di sync', async ({ page }) => {
    await bootGame(page);
    const r = await rientroDopoDueOre(page);

    expect(r.visibile, 'il modale deve aprirsi anche sul percorso "vince il locale"').toBe('flex');
    expect(r.efficienza).toBe('30%');
    // 10 BPS × 7200s × 30% = 21.600 (più i secondi passati nel test).
    expect(r.guadagno).toMatch(/21[.,]6\d\s*k/);
    // Il toast dice "sincronizzati", non "scaricati": qui non si scarica niente.
    expect(r.toasts.some((t) => /sincronizzati/i.test(t)), 'toast cloudSyncLocal').toBe(true);
    expect(r.toasts.some((t) => /scaricati/i.test(t))).toBe(false);
  });

  test('riscattando, i bug arrivano in tasca e il modale si chiude', async ({ page }) => {
    await bootGame(page);
    const r = await rientroDopoDueOre(page);
    expect(r.visibile).toBe('flex');

    await page.click('#btn-claim-offline');
    await expect(page.locator(MODALE)).toBeHidden();

    const dopo = await page.evaluate(() => {
      const gs = (window as any).EspooClicker.getGameState();
      return { score: Number(String(gs.score)), offline: Number(String(gs.totalOfflineScore)), ts: gs.lastSaveTimestamp };
    });
    expect(dopo.score).toBeGreaterThanOrEqual(21_600);
    expect(dopo.offline).toBeGreaterThanOrEqual(21_600);
    // Il riscatto salva: il riferimento del rientro riparte da adesso.
    expect(Date.now() - dopo.ts).toBeLessThan(10_000);
  });

  test('senza una vera pausa (meno di un minuto) non compare', async ({ page }) => {
    await bootGame(page);
    const r = await page.evaluate(async () => {
      const w = window as any;
      const gs = w.EspooClicker.getGameState();
      gs.user.username = 'E2ETester';
      gs.lastSaveTimestamp = Date.now() - 20_000;
      gs.lifetimeScore = new w.Decimal(1000);
      w.bps = new w.Decimal(10);
      const cloud = JSON.parse(JSON.stringify(gs));
      cloud.schemaVersion = 3;
      w.EspooClicker.loadCloudData(w.LZString.compressToUTF16(JSON.stringify(cloud)));
      // Qui si aspetta un NON-evento: l'attesa fissa è generosa apposta, e il
      // worker offline è già caldo dai test precedenti.
      await new Promise((res) => setTimeout(res, 2000));
      return getComputedStyle(document.getElementById('offline-modal')!).display;
    });
    expect(r).toBe('none');
  });
});
