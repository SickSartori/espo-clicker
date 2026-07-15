import { test, expect } from '@playwright/test';
import { Page } from '@playwright/test';
import { seedRichState } from './helpers';

/**
 * Cheatboard (Admin Console, dev-only — caricata perché l'harness gira come dev
 * su 127.0.0.1).
 *
 * "RESET TOTALE" deve, per un utente loggato: azzerare i progressi LOCALI **e**
 * CLOUD (altrimenti al reload l'auto-login li ripristina → "non resetta"), SENZA
 * chiedere la password (la prende dalla sessione) e SENZA fare logout ("non deve
 * buttarmi fuori"). Il cloud si azzera con l'EF ufficiale reset-progress.
 *
 * NB: niente addInitScript per la sessione (ri-inietterebbe l'utente a ogni
 * reload). La sessione è messa una volta via evaluate.
 */
async function bootWithSession(page: Page): Promise<void> {
  await page.goto('/index.php', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    sessionStorage.setItem('espooUser', 'E2ETester');
    sessionStorage.setItem('espooPass', 'e2e-pass');
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
  test('RESET TOTALE: azzera cloud+locale, SENZA logout e senza chiedere la password', async ({ page }) => {
    // Mock deterministico dell'EF reset-progress (no rete): registra la chiamata.
    const resetCalls: Array<Record<string, unknown>> = [];
    await page.route('**/reset-progress', async (route) => {
      let body: Record<string, unknown> = {};
      try { body = route.request().postDataJSON() as Record<string, unknown>; } catch (_) {}
      resetCalls.push(body);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success' }) });
    });

    await bootWithSession(page);
    await seedRichState(page);
    await page.waitForFunction(() => !!document.getElementById('cb-hardreset'), undefined, { timeout: 10_000 });

    await page.evaluate(async () => {
      const w = window as any;
      w.EspooClicker.getGameState().totalClicks = 555111;
      await w.EspooClicker.saveGame();
      // Con un utente fittizio getSaveToken sarebbe null → stub per esercitare
      // il ramo cloud (nella realtà il token c'è dopo l'auto-login).
      w.EspooClicker.getSaveToken = () => 'e2e-token';
      w.confirm = () => true;
      (document.getElementById('cb-hardreset') as HTMLElement).click(); // → hardReset → reset-progress → reload
    });

    // hardReset ricarica da sé dopo il success dell'EF.
    await page.waitForFunction(
      () => !!(window as any).EspooClicker && !!(window as any).EspooClicker.getGameState(),
      undefined, { timeout: 15_000 },
    );
    await page.waitForTimeout(1200);

    const session = await page.evaluate(() => sessionStorage.getItem('espooUser'));

    // R2+R3: reset-progress chiamato UNA volta, con token + password presa dalla
    // SESSIONE (non digitata dall'utente). È il comportamento CLIENT corretto —
    // l'azzeramento cloud vero è dell'EF (mockata qui) ed è verificato a parte
    // col backend reale. NB: non asserisco lo stato post-reload perché dipende
    // dal cloud dell'utente di test sul backend dev condiviso (non deterministico).
    expect(resetCalls.length).toBe(1);
    expect(resetCalls[0].save_token).toBe('e2e-token');
    expect(resetCalls[0].password).toBe('e2e-pass'); // == sessionStorage.espooPass, non digitata
    // R1: NON butta fuori → la sessione resta anche dopo il reload.
    expect(session).toBe('E2ETester');
  });

  test('cheat: saveGame NON blocca più il push cloud (classifica si aggiorna in dev)', async ({ page }) => {
    await bootWithSession(page);
    await seedRichState(page);

    const r = await page.evaluate(async () => {
      const w = window as any;
      w.cheatNoCloudSync = true; // come dopo un'azione della cheatboard
      const logs: string[] = [];
      // Cattura log E warn: il successo cloud [Save✓] è console.log, gli altri
      // esiti ([Save SKIP], [Save✗], "Admin Console attiva") sono console.warn.
      const oL = console.log, oW = console.warn;
      console.log = (...a: unknown[]) => { logs.push(a.map(String).join(' ')); (oL as any)(...a); };
      console.warn = (...a: unknown[]) => { logs.push(a.map(String).join(' ')); (oW as any)(...a); };
      try { await w.EspooClicker.saveGame(); } finally { console.log = oL; console.warn = oW; }
      return { logs };
    });

    // Guard #1 rimosso: saveGame con un cheat attivo NON logga più "Admin Console
    // → solo locale" → prosegue verso il path cloud (classifica). Deterministico.
    // (Che il push cloud vada a buon fine è provato dal test reale SocialA.)
    expect(r.logs.some((x) => x.includes('Admin Console attiva')), 'guard #1 ancora presente').toBe(false);
    expect(r.logs.some((x) => x.includes('[Save')), 'saveGame non ha raggiunto il path cloud').toBe(true);
  });
});
