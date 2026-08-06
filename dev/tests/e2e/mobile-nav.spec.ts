import { test, expect } from '@playwright/test';

/**
 * Navigazione mobile (viewport 375x812, touch).
 *
 * Guardie su due regressioni possibili:
 * 1. L'icona Aiuto DEVE restare visibile su mobile. Era nascosta in
 *    styles/mobile.css sotto "nascondiamo il superfluo" — sensato quando
 *    l'Aiuto era solo una guida, ma da quando contiene la scheda Segnala
 *    nasconderlo significa che da telefono non si puo' segnalare affatto
 *    (e il popup 3.1 istruisce ad aprire proprio quel menu).
 * 2. La X di Configurazione deve chiudere E salvare: le regolazioni sono
 *    applicate live, chiudere senza persistere sarebbe l'unico caso in cui
 *    una modifica fatta si perde.
 */
test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

test('mobile: Aiuto raggiungibile dalla barra e X su Configurazione', async ({ page }) => {
  // Backend simulato: oggi il dev risponde 429 su login-register (limite
  // richieste) e il gioco apre il login sopra tutto, intercettando i tap.
  // La verifica e' di UI pura: non deve dipendere dallo stato del backend.
  await page.route('**/login-register', (r) => r.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ status: 'success', save_token: 'e2e-token', token_expires_at: Date.now() + 86_400_000 }),
  }));
  await page.route('**/save-progress', (r) => r.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success' }),
  }));

  await page.addInitScript(() => { try {
    sessionStorage.setItem('espooUser', 'E2ETester');
    sessionStorage.setItem('espooPass', 'e2e-pass');
  } catch (e) {} });
  await page.goto('/index.php', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!(window as any).EspooClicker && !!(window as any).EspooClicker.getGameState(), undefined, { timeout: 20000 });
  await page.waitForFunction(() => {
    const l = document.getElementById('game-loader');
    return !l || getComputedStyle(l).display === 'none' || getComputedStyle(l).opacity === '0';
  }, undefined, { timeout: 20000 });
  // Il login non deve restare aperto sopra la barra
  await page.waitForFunction(() => {
    const m = document.getElementById('login-modal');
    return !m || getComputedStyle(m).display === 'none';
  }, undefined, { timeout: 15000 });
  await page.waitForTimeout(500);

  const barra = await page.evaluate(() => {
    const bar = document.getElementById('game-navbar')!;
    const help = document.getElementById('open-help-btn')!;
    const r = help.getBoundingClientRect();
    return {
      helpVisibile: getComputedStyle(help).display !== 'none',
      helpDentro: r.left >= 0 && r.right <= window.innerWidth,
      overflowBarra: bar.scrollWidth > bar.clientWidth + 1,
    };
  });
  expect(barra.helpVisibile, 'icona Aiuto visibile su mobile').toBe(true);
  expect(barra.helpDentro).toBe(true);
  expect(barra.overflowBarra, 'la barra non deve traboccare').toBe(false);
  
  await page.tap('#open-help-btn');
  await expect(page.locator('#help-modal')).toBeVisible();
  await page.tap('.help-tab[data-htab="segnala"]');
  await page.waitForTimeout(300);
  const segnala = await page.evaluate(() =>
    getComputedStyle(document.querySelector('[data-hpanel="segnala"]')!).display !== 'none');
  expect(segnala, 'la scheda Segnala si apre col tap').toBe(true);
    await page.tap('#help-modal .modal-close-btn');
  await page.waitForTimeout(400);

  await page.tap('#open-settings-btn');
  await expect(page.locator('#settings-modal')).toBeVisible();
  const x = await page.evaluate(() => {
    const b = document.querySelector('#settings-modal .modal-close-btn') as HTMLElement;
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { visibile: getComputedStyle(b).display !== 'none', dentro: r.top >= 0 && r.right <= window.innerWidth };
  });
  expect(x, 'la X esiste in Configurazione').not.toBeNull();
  expect(x!.visibile).toBe(true);
  expect(x!.dentro).toBe(true);

  await page.evaluate(() => {
    const orig = (window as any).EspooClicker.saveGame;
    (window as any).__saveChiamato = false;
    (window as any).EspooClicker.saveGame = function (...a: any[]) { (window as any).__saveChiamato = true; return orig.apply(this, a); };
  });
  await page.tap('#settings-modal .modal-close-btn');
  await page.waitForTimeout(500);
  const salvato = await page.evaluate(() => (window as any).__saveChiamato);
  await expect(page.locator('#settings-modal')).toBeHidden();
  expect(salvato, 'la X deve salvare come Chiudi & Salva').toBe(true);
});
