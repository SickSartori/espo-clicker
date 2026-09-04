import { test, expect } from '@playwright/test';
import { Page } from '@playwright/test';

/**
 * Badge cloud-sync (rifacimento 3.1).
 *
 * Segnalazione QA: «cliccando "Progressi dietro al cloud — tocca per
 * sincronizzare" non succede niente, il messaggio resta fisso». Il click
 * arrivava davvero al badge; il problema era che il tap non aveva modo di
 * mostrare un esito — le funzioni di recovery uscivano in silenzio e il badge
 * si nascondeva SOLO dopo un push cloud riuscito.
 *
 * Qui si verifica il ciclo completo: comparsa → tap → sincronizzo… → esito.
 *
 * Il badge compare solo dopo CLOUD_STALE_MS (90s) di fallimenti, quindi serve
 * l'orologio finto: `clock.install()` prima del caricamento e `fastForward`.
 * Comodo anche per l'auto-nascondimento, che è a 2.5s.
 */

async function bootStale(page: Page): Promise<void> {
  await page.clock.install();

  // NIENTE credenziali in sessione prima del boot: le legge l'auto-login, che
  // parlerebbe col backend dev vero e riscriverebbe utente, token e
  // _cloudPreWipe a tempi variabili. È stata la causa di un'intermittenza
  // secca: a volte i guard impostati dal test venivano sovrascritti e il
  // badge non compariva. Senza credenziali all'avvio l'auto-login non parte,
  // e le funzioni di recovery rileggono sessionStorage al momento della
  // chiamata, quindi impostarle dopo basta.
  await page.goto('/index.php', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => !!(window as any).EspooClicker && !!(window as any).EspooClicker.getGameState(),
    undefined, { timeout: 15_000 },
  );

  // Il push cloud va bloccato PRIMA del salto temporale: durante il
  // fastForward partono gli autosave, e se uno andasse a buon fine
  // rimetterebbe a zero il contatore di staleness.
  await page.route('**/save-progress', (route) => route.abort('failed'));
  // Oltre la soglia dei 90s: da qui un salvataggio fallito mostra il badge.
  await page.clock.fastForward(91_000);

  await page.evaluate(() => {
    const w = window as any;
    sessionStorage.setItem('espooUser', 'E2ETester');
    sessionStorage.setItem('espooPass', 'e2e-pass');
    w._launchMigrationDone = false;
    w._cloudPreWipe = false;
    const gs = w.EspooClicker.getGameState();
    gs.user = gs.user || {};
    gs.user.username = 'E2ETester';
    gs.pendingFounderChoice = false;
    // saveGame arriva al push cloud solo con username + password + token
    // (le ultime due sono variabili di modulo, si impostano da qui).
    w.EspooClicker.setPassword('e2e-pass');
    w.EspooClicker.setSaveToken('e2e-token', Date.now() + 24 * 60 * 60 * 1000);
  });
}

/** Forza un salvataggio fallito e aspetta la comparsa del badge. */
async function raiseBadge(page: Page): Promise<void> {
  await page.evaluate(async () => { await (window as any).EspooClicker.saveGame(); });
  await expect(page.locator('#cloud-sync-badge')).toBeVisible({ timeout: 10_000 });
}

const badge = '#cloud-sync-badge';

test.describe('Badge cloud-sync', () => {
  test('un salvataggio fallito lo mostra, e dice di toccare per riprovare', async ({ page }) => {
    await bootStale(page);
    await raiseBadge(page);

    await expect(page.locator(badge)).toContainText('Progressi non salvati');
    // Cliccabile: è il punto della segnalazione — deve sembrare un pulsante.
    expect(await page.locator(badge).evaluate((el) => getComputedStyle(el).cursor)).toBe('pointer');
  });

  test('tap con recovery riuscita: passa a sincronizzo, poi conferma e sparisce da solo', async ({ page }) => {
    await bootStale(page);
    await raiseBadge(page);

    // Il motivo è 'network' (non 'conflict') → il tap passa da refresh-token.
    // Risposta ritardata, così lo stato intermedio è osservabile.
    await page.route('**/refresh-token', async (route) => {
      await new Promise((r) => setTimeout(r, 300));
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ status: 'success', save_token: 'nuovo-token', token_expires_at: Date.now() + 86_400_000 }),
      });
    });

    await page.locator(badge).click();

    // 1. stato intermedio: prima non esisteva, il badge spariva e basta
    await expect(page.locator(badge)).toContainText('Sincronizzazione in corso');
    expect(await page.locator(badge).evaluate((el) => getComputedStyle(el).cursor)).toBe('default');

    // 2. esito positivo, mostrato
    await expect(page.locator(badge)).toContainText('Progressi sincronizzati', { timeout: 10_000 });

    // 3. si nasconde da solo dopo 2.5s: la dismissione NON dipende più da un
    //    push cloud riuscito (era la causa 2 della segnalazione).
    await page.clock.fastForward(3_000);
    await expect(page.locator(badge)).toBeHidden();
  });

  test('tap con recovery fallita: resta visibile e dice il motivo', async ({ page }) => {
    await bootStale(page);
    await raiseBadge(page);

    await page.route('**/refresh-token', (route) => route.abort('failed'));
    await page.locator(badge).click();

    // Prima questo caso era muto: catch vuoto, badge già nascosto dal tap.
    await expect(page.locator(badge)).toContainText('Connessione assente', { timeout: 10_000 });
    await expect(page.locator(badge)).toBeVisible();
    // Ritentabile.
    expect(await page.locator(badge).evaluate((el) => getComputedStyle(el).cursor)).toBe('pointer');
  });

  test('senza credenziali di sessione il tap porta al login, non gira a vuoto', async ({ page }) => {
    await bootStale(page);
    await raiseBadge(page);

    // Uscita silenziosa numero due: senza credenziali non c'è niente da
    // ritentare, quindi l'azione utile è il login. Il motivo qui si scopre
    // solo DALL'ESITO (il badge era comparso per 'network'), e deve bastare
    // UN tap: farne fare due sarebbe di nuovo "non succede niente".
    await page.evaluate(() => {
      sessionStorage.removeItem('espooUser');
      sessionStorage.removeItem('espooPass');
      (window as any)._loginAperto = false;
      (window as any)._showLoginForTokenExpiry = () => { (window as any)._loginAperto = true; };
    });

    await page.locator(badge).click();

    await expect.poll(() => page.evaluate(() => (window as any)._loginAperto), { timeout: 10_000 }).toBe(true);
    await expect(page.locator(badge)).toBeHidden();
  });

  test('le funzioni di recovery riportano sempre un esito, mai un return muto', async ({ page }) => {
    await bootStale(page);

    // Ognuna delle uscite che prima erano silenziose ora ha un motivo.
    const esiti = await page.evaluate(async () => {
      const w = window as any;
      const out: Record<string, any> = {};

      w.cheatNoCloudSync = true;
      out.cheat = await w._resyncFromCloud();
      w.cheatNoCloudSync = false;

      const u = sessionStorage.getItem('espooUser');
      const p = sessionStorage.getItem('espooPass');
      sessionStorage.removeItem('espooUser');
      sessionStorage.removeItem('espooPass');
      out.nocredsResync = await w._resyncFromCloud();
      out.nocredsToken = await w._silentTokenRefresh();
      if (u) sessionStorage.setItem('espooUser', u);
      if (p) sessionStorage.setItem('espooPass', p);

      w._resyncing = true;
      out.busyResync = await w._resyncFromCloud();
      w._resyncing = false;

      w._tokenRefreshing = true;
      out.busyToken = await w._silentTokenRefresh();
      w._tokenRefreshing = false;

      return out;
    });

    expect(esiti.cheat).toEqual({ ok: false, reason: 'cheat' });
    expect(esiti.nocredsResync).toEqual({ ok: false, reason: 'nocreds' });
    expect(esiti.nocredsToken).toEqual({ ok: false, reason: 'nocreds' });
    expect(esiti.busyResync).toEqual({ ok: false, reason: 'busy' });
    expect(esiti.busyToken).toEqual({ ok: false, reason: 'busy' });
  });

  test('login rifiutato e rete giù hanno motivi distinti', async ({ page }) => {
    await bootStale(page);

    await page.route('**/login-register', (route) => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ status: 'error', message: 'credenziali non valide' }),
    }));
    const rifiutato = await page.evaluate(async () => await (window as any)._resyncFromCloud());
    expect(rifiutato).toEqual({ ok: false, reason: 'login' });

    await page.unroute('**/login-register');
    await page.route('**/login-register', (route) => route.abort('failed'));
    const reteGiu = await page.evaluate(async () => await (window as any)._resyncFromCloud());
    expect(reteGiu).toEqual({ ok: false, reason: 'network' });
  });
});
