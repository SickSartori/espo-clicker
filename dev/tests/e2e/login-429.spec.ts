import { test, expect } from '@playwright/test';

/**
 * Limite richieste (429) su login-register: UX di degrado.
 *
 * Emerso il 06/08/2026 quando le run ripetute delle suite hanno esaurito il
 * rate limit del backend dev: l'utente reale riceveva un alert BLOCCANTE col
 * messaggio grezzo del gateway («Too many requests») e nessuna indicazione.
 * Il degrado voluto è: un solo tentativo (niente martellamento — verificato
 * qui), un toast localizzato che spiega che i progressi sono al sicuro, e
 * nessun alert.
 */
test('429 al login: un solo tentativo, toast localizzato, niente alert', async ({ page }) => {
  const chiamate: number[] = [];
  await page.route('**/login-register', (r) => {
    chiamate.push(Date.now());
    r.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ message: 'Too many requests' }) });
  });
  const dialoghi: string[] = [];
  page.on('dialog', (d) => { dialoghi.push(d.message()); d.dismiss(); });

  await page.addInitScript(() => { try {
    sessionStorage.setItem('espooUser', 'E2ETester');
    sessionStorage.setItem('espooPass', 'e2e-pass');
  } catch (e) {} });
  await page.goto('/index.php', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!(window as any).EspooClicker, undefined, { timeout: 20_000 });

  // PRIMA il toast, POI il conteggio: i toast scadono in pochi secondi, e
  // aspettare a lungo prima di leggerlo fa fotografare quello successivo
  // (es. il bonus giornaliero).
  await page.waitForFunction(() => {
    const t = document.querySelector('#toast-container, .toast-container, [id*="toast"]');
    return !!t && (t as HTMLElement).innerText.includes('Server affollato');
  }, undefined, { timeout: 10_000 });

  // Finestra ampia: se esistesse un retry automatico, qui si vedrebbe.
  await page.waitForTimeout(5_000);
  expect(chiamate.length, 'niente martellamento del backend').toBe(1);
  expect(dialoghi, 'niente alert bloccante col messaggio grezzo').toEqual([]);
});
