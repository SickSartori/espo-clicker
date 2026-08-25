import { test, expect } from '@playwright/test';

/**
 * Apertura della Sala Giochi dal gioco principale.
 *
 * Dalla 3.0 l'arcade NON è più un modale: `window.open('arcade.php')` in una
 * scheda a tutto schermo. Il ramo scoperto durante l'audit mobile del
 * 06/08/2026: se il browser BLOCCA il popup — cosa comune su mobile —
 * `window.open` torna `null` e il pulsante non faceva assolutamente nulla,
 * in silenzio. Nessuna scheda, nessun messaggio, nessun modale di ripiego.
 *
 * Il ripiego è la stessa scheda: `arcade.php` lo prevede già, il suo pulsante
 * di chiusura prova `window.close()` e, se la scheda non si chiude, torna a
 * `index.php` (arcade.php:63).
 */

test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

async function boot(page: any, bloccaPopup: boolean) {
  await page.route('**/functions/v1/**', () => { /* mai risolta: niente backend nei test */ });
  await page.addInitScript((blocca: boolean) => {
    try { sessionStorage.setItem('espooUser', 'E2ETester'); } catch (e) { /* no-op */ }
    // I tentativi vanno in sessionStorage, non su window: col ripiego la
    // pagina NAVIGA, e una variabile globale morirebbe col vecchio documento.
    const segna = (u: string) => {
      try {
        const v = JSON.parse(sessionStorage.getItem('__aperture') || '[]');
        v.push(u); sessionStorage.setItem('__aperture', JSON.stringify(v));
      } catch (e) { /* no-op */ }
    };
    const orig = window.open;
    (window as any).open = function (url?: any, ...resto: any[]) {
      segna(String(url));
      // Simula il blocco popup del browser: window.open torna null
      return blocca ? null : (orig as any).call(window, url, ...resto);
    };
  }, bloccaPopup);
  await page.goto('/index.php', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!(window as any).EspooClicker?.getGameState(), undefined, { timeout: 20_000 });
  await page.waitForTimeout(2_000);
}

test('popup bloccato: ripiega sulla stessa scheda invece di non fare nulla', async ({ page }) => {
  await boot(page, true);

  await page.evaluate(() => (document.getElementById('mobile-arcade-btn') as HTMLElement).click());
  await page.waitForURL(/arcade\.php/, { timeout: 10_000 });

  // Ci ha provato con la nuova scheda, e solo dopo il rifiuto ha ripiegato
  const tentativi = await page.evaluate(() => JSON.parse(sessionStorage.getItem('__aperture') || '[]'));
  expect(tentativi.length, 'prima tenta comunque la scheda separata').toBeGreaterThanOrEqual(1);
  expect(page.url()).toContain('arcade.php');

  // E da lì si torna indietro: il pulsante di chiusura c'è
  await expect(page.locator('#arcade-fs-close')).toHaveCount(1);
});

test('popup consentito: apre la scheda separata e NON naviga via dal gioco', async ({ page }) => {
  await boot(page, false);

  await page.evaluate(() => (document.getElementById('mobile-arcade-btn') as HTMLElement).click());
  await page.waitForTimeout(1_500);

  const tentativi = await page.evaluate(() => JSON.parse(sessionStorage.getItem('__aperture') || '[]'));
  expect(tentativi.some((u: string) => u.includes('arcade.php'))).toBe(true);
  // La pagina di gioco resta dov'è: il ripiego non deve scattare
  expect(page.url(), 'col popup consentito non si naviga via').not.toContain('arcade.php');
});
