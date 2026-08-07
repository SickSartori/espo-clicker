import { test, expect, Route } from '@playwright/test';

/**
 * Navigazione mobile (viewport 375x812, touch).
 *
 * Guardie su due regressioni possibili:
 * 1. La scheda Segnala DEVE restare raggiungibile da telefono. L'Aiuto era
 *    nascosto in styles/mobile.css sotto "nascondiamo il superfluo" — sensato
 *    quando era solo una guida, ma da quando contiene Segnala nasconderlo
 *    significa che da telefono non si puo' segnalare affatto (e il popup 3.1
 *    istruisce ad aprire proprio quel menu).
 *    NB: il PERCORSO e' cambiato — l'Aiuto non e' piu' un'icona in barra ma
 *    una voce del menu mobile. Qui si verifica l'ESITO (Segnala si apre),
 *    non la strada: la strada la copre mobile-menu.spec.ts.
 * 2. La X di Configurazione deve chiudere E salvare: le regolazioni sono
 *    applicate live, chiudere senza persistere sarebbe l'unico caso in cui
 *    una modifica fatta si perde.
 */
test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

/** URL che nessuna route della pagina ha preso: sarebbero usciti in rete. */
let scappate: string[] = [];

test.beforeEach(async ({ page }) => {
  scappate = [];

  // Filo d'inciampo, sul CONTEXT e non sulla pagina: in Playwright le route
  // della PAGINA hanno la precedenza su quelle del context, quindi qui arriva
  // solo ciò che nessun mock e nessuna catch-all ha intercettato — cioè
  // esattamente il traffico diretto al backend dev condiviso. Contare gli
  // eventi di rete non basterebbe: una richiesta lasciata sospesa emette
  // 'requestfailed' quando la pagina si ricarica e la cancella, e sembrerebbe
  // uscita davvero. Resta sospesa anche qui: se scappa qualcosa non deve
  // comunque partire, e l'afterEach lo dice a voce alta.
  await page.context().route((url) => url.hostname.endsWith('supabase.co'), (route) => {
    scappate.push(route.request().url());
  });

  // Simulare login-register e save-progress non bastava: il test copriva i due
  // endpoint che gli servivano e lasciava passare tutto il resto. Misurato: due
  // friends-poll VERE per esecuzione verso il backend dev condiviso — la
  // sessione finta ottiene un token finto, il polling amici parte lo stesso e
  // va a bussare al server vero. Non è il 429 del login, ma è comunque traffico
  // che una verifica di UI pura non deve generare, e la CI la ripete a ogni push.
  //
  // Qui il muro è generico: ogni chiamata a functions/v1 resta SOSPESA (come in
  // helpers.ts — non abortita, che sporcherebbe la console, e non simulata in
  // blocco, che innescherebbe side-effect sul save). I due mock specifici sotto
  // sono registrati DOPO e in Playwright vince l'ultima registrata, quindi
  // continuano a rispondere come prima.
  await page.route('**/functions/v1/**', () => { /* mai risolta */ });
});

// Prova che il muro tiene, e che continuerà a tenere dopo la prossima modifica.
test.afterEach(() => {
  expect(scappate, 'richieste uscite verso il backend dev condiviso').toEqual([]);
});

test('mobile: Segnala raggiungibile dal menu e X su Configurazione', async ({ page }) => {
  // Backend simulato: oggi il dev risponde 429 su login-register (limite
  // richieste) e il gioco apre il login sopra tutto, intercettando i tap.
  // La verifica e' di UI pura: non deve dipendere dallo stato del backend.
  const servi = async (slug: string, body: unknown) => {
    await page.route(`**/functions/v1/${slug}`, async (route: Route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });
  };
  await servi('login-register', {
    status: 'success', save_token: 'e2e-token', token_expires_at: Date.now() + 86_400_000,
  });
  await servi('save-progress', { status: 'success' });

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
    const menu = document.getElementById('open-mobile-menu-btn')!;
    const r = menu.getBoundingClientRect();
    return {
      menuVisibile: getComputedStyle(menu).display !== 'none',
      menuDentro: r.left >= 0 && r.right <= window.innerWidth,
      overflowBarra: bar.scrollWidth > bar.clientWidth + 1,
    };
  });
  expect(barra.menuVisibile, 'il menu deve essere raggiungibile in barra').toBe(true);
  expect(barra.menuDentro).toBe(true);
  expect(barra.overflowBarra, 'la barra non deve traboccare').toBe(false);

  // Percorso reale su telefono: menu -> Aiuto -> scheda Segnala
  await page.tap('#open-mobile-menu-btn');
  await expect(page.locator('#mobile-menu-modal')).toBeVisible();
  await page.tap('#mobile-menu-list .mm-item[data-opens="open-help-btn"]');
  await expect(page.locator('#help-modal')).toBeVisible();
  await page.tap('.help-tab[data-htab="segnala"]');
  await page.waitForTimeout(300);
  const segnala = await page.evaluate(() =>
    getComputedStyle(document.querySelector('[data-hpanel="segnala"]')!).display !== 'none');
  expect(segnala, 'la scheda Segnala si apre col tap').toBe(true);
    await page.tap('#help-modal .modal-close-btn');
  await page.waitForTimeout(400);

  // Anche Configurazione passa dal menu, come tutte le voci secondarie
  await page.tap('#open-mobile-menu-btn');
  await expect(page.locator('#mobile-menu-modal')).toBeVisible();
  await page.tap('#mobile-menu-list .mm-item[data-opens="open-settings-btn"]');
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
