import { test, expect } from '@playwright/test';
import { Page } from '@playwright/test';
import { seedRichState } from './helpers';

/**
 * Cheatboard (Admin Console, dev-only — caricata perché l'harness gira come dev
 * su 127.0.0.1). Regressione del "RESET TOTALE": con una sessione attiva il wipe
 * SOLO locale era vano perché al reload l'auto-login ripristinava dal cloud
 * ("il reset non funziona"). Il fix fa LOGOUT (clear sessionStorage) prima del
 * reload → la pagina riparte pulita, nessun cloud restore.
 *
 * NB: niente addInitScript per la sessione (ri-inietterebbe l'utente a ogni
 * reload, mascherando il logout). La sessione è messa una volta via evaluate;
 * dopo il reload del reset deve restare sparita.
 */
async function bootWithSession(page: Page): Promise<void> {
  await page.goto('/index.php', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    sessionStorage.setItem('espooUser', 'E2ETester');
    sessionStorage.setItem('espooPass', 'e2e');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () =>
      !!(window as any).EspooClicker &&
      !!(window as any).EspooClicker.getGameState() &&
      !!(window as any).EspoV3 && !!(window as any).EspoV3.economy,
    undefined, { timeout: 15_000 },
  );
}

test.describe('Cheatboard hardReset', () => {
  test('RESET TOTALE: wipe locale + logout → dopo reload lo stato NON risorge', async ({ page }) => {
    await bootWithSession(page);
    await seedRichState(page);

    await page.waitForFunction(() => !!document.getElementById('cb-hardreset'), undefined, { timeout: 10_000 });

    // Marker distintivo salvato davvero in IDB (via EspoV3.save), poi RESET reale.
    await page.evaluate(async () => {
      const w = window as any;
      w.EspooClicker.getGameState().totalClicks = 555111;
      await w.EspooClicker.saveGame();
      w.confirm = () => true;
      (document.getElementById('cb-hardreset') as HTMLElement).click(); // → hardReset → reload
    });

    // hardReset ricarica la pagina da sé: attendo il nuovo boot.
    await page.waitForFunction(
      () => !!(window as any).EspooClicker && !!(window as any).EspooClicker.getGameState(),
      undefined, { timeout: 15_000 },
    );
    await page.waitForTimeout(1500); // lascia assestare un eventuale auto-login residuo

    const after = await page.evaluate(() => {
      const gs = (window as any).EspooClicker.getGameState();
      return {
        session: sessionStorage.getItem('espooUser'),
        totalClicks: gs.totalClicks,
        lifetime: String(gs.lifetimeScore),
      };
    });

    // LOGOUT avvenuto → nessun auto-login → nessun cloud restore.
    expect(after.session).toBeNull();
    // Il marker e lo stato ricco sono spariti: reset "sticky".
    expect(after.totalClicks).toBe(0);
    expect(after.lifetime).toBe('0');
  });

  test('cheat: saveGame NON blocca più il push cloud (classifica si aggiorna in dev)', async ({ page }) => {
    await bootWithSession(page);
    await seedRichState(page);

    // Simula una sessione post-cheat e osserva quale ramo prende saveGame.
    const r = await page.evaluate(async () => {
      const w = window as any;
      w.cheatNoCloudSync = true; // come dopo un'azione della cheatboard
      const warns: string[] = [];
      const orig = console.warn;
      console.warn = (...a: unknown[]) => { warns.push(a.map(String).join(' ')); (orig as any)(...a); };
      try { await w.EspooClicker.saveGame(); } finally { console.warn = orig; }
      return { warns };
    });

    // FIX: il guard #1 (push-block "Admin Console → solo locale") è rimosso →
    // saveGame prosegue verso il path cloud. Con l'utente fittizio senza token
    // arriva al gate auth ([Save SKIP]) invece di corto-circuitare sul cheat.
    expect(r.warns.some((x) => x.includes('Admin Console attiva')), 'guard #1 ancora presente').toBe(false);
    expect(r.warns.some((x) => /\[Save (SKIP|✓|✗)/.test(x)), 'saveGame non ha raggiunto il path cloud').toBe(true);
  });
});
