import { test, expect } from '@playwright/test';
import { Page } from '@playwright/test';

/**
 * Loop di riallineamento dal cloud (segnalazione del 10/09/2026).
 *
 * Un giocatore vedeva «Progressi scaricati dal Cloud!» a ripetizione e restava
 * incastrato fra badge e resync. Nei log di produzione: un solo client, un
 * login-register ogni 2-5 secondi e quasi tutti i save-progress respinti come
 * conflict. La meccanica: push respinto → adotta il cloud → lo rispinge
 * subito → respinto di nuovo, senza fine e senza una riga in console che
 * dicesse i numeri.
 *
 * Qui il backend è finto: save-progress risponde SEMPRE conflict e
 * login-register consegna un blob valido. Si verifica che il client faccia al
 * più tre riallineamenti automatici e poi si fermi dicendolo (badge + console),
 * che il tocco sul badge riapra i tentativi, che il resync non rispinga nulla
 * da solo e non riapra il modale Bentornato. In coda, la coerenza del payload:
 * lo `score` inviato deve essere il lifetimeScore DENTRO il blob spedito
 * insieme, non quello letto dopo gli await.
 *
 * Orologio finto (clock.install): il throttle dell'auto-resync è di 15s. Con
 * l'orologio avanzato scattano anche i timer del gioco (es. bonus giornaliero),
 * che salvano per conto loro: i conteggi sono quindi "al più", non esatti.
 */

const badge = '#cloud-sync-badge';

async function boot(page: Page): Promise<void> {
  await page.clock.install();
  await page.goto('/index.php', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => !!(window as any).EspooClicker && !!(window as any).EspooClicker.getGameState(),
    undefined, { timeout: 15_000 },
  );
  await page.evaluate(() => {
    const w = window as any;
    // Il gioco zittisce console.log/warn senza DEBUG_MODE (lib/version.ts):
    // acceso per leggere il flusso conflitto → resync se qualcosa va storto.
    w.DEBUG_MODE = true;
    sessionStorage.setItem('espooUser', 'E2ETester');
    sessionStorage.setItem('espooPass', 'e2e-pass');
    w._launchMigrationDone = false;
    w._cloudPreWipe = false;
    const gs = w.EspooClicker.getGameState();
    gs.user = gs.user || {};
    gs.user.username = 'E2ETester';
    gs.pendingFounderChoice = false;
    gs.lifetimeScore = new w.Decimal(5000);
    w.EspooClicker.setPassword('e2e-pass');
    w.EspooClicker.setSaveToken('e2e-token', Math.floor(Date.now() / 1000) + 86_400);
  });
}

/**
 * Un blob cloud costruito dallo stato corrente, come lo consegna login-register.
 * Con `lifetimeScore` si simula un'ALTRA sessione più avanti della nostra.
 */
async function cloudBlob(page: Page, lifetimeScore?: number): Promise<string> {
  return page.evaluate((score: number | undefined) => {
    const w = window as any;
    const gs = JSON.parse(JSON.stringify(w.EspooClicker.getGameState()));
    gs.schemaVersion = 3;
    if (score !== undefined) gs.lifetimeScore = String(score);
    return w.LZString.compressToUTF16(JSON.stringify(gs));
  }, lifetimeScore);
}

function loginRoute(blob: string, onCall: () => void) {
  return (route: any) => {
    onCall();
    return route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ status: 'success', save_data: blob, save_token: 'tok-' + Date.now(), token_expires_at: Math.floor(Date.now() / 1000) + 86_400 }),
    });
  };
}

test.describe('Loop di conflitto cloud', () => {
  test('dopo tre riallineamenti a vuoto si ferma, lo dice, e il tocco riapre i tentativi', async ({ page }) => {
    await boot(page);
    // Un'ALTRA sessione che salva davvero: a ogni login il cloud è più avanti di
    // prima, e sempre sopra al nostro locale. Con un blob fisso, dopo la prima
    // adozione saremmo noi i più avanti e scatterebbe il guard 'cloud-indietro'
    // — che è un caso diverso, coperto dal test qui sotto.
    const blobs: string[] = [];
    for (let i = 1; i <= 8; i++) blobs.push(await cloudBlob(page, i * 10_000_000));

    let login = 0;
    await page.route('**/login-register', (route) => {
      const blob = blobs[Math.min(login, blobs.length - 1)]!;
      login++;
      return route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ status: 'success', save_data: blob, save_token: 'tok-' + login, token_expires_at: Math.floor(Date.now() / 1000) + 86_400 }),
      });
    });
    await page.route('**/save-progress', (route) => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ status: 'conflict', message: 'Cloud save is newer (Score). Please reload.' }),
    }));
    const errori: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error') errori.push(m.text()); });

    // Sei push respinti, distanziati oltre il throttle dei 15s dell'auto-resync.
    for (let i = 0; i < 6; i++) {
      await page.evaluate(async () => { await (window as any).EspooClicker.saveGame(); });
      // Il resync parte dal conflitto senza await: va aspettato prima del push
      // successivo, o il guard "già in corso" maschera il conteggio.
      await page.waitForFunction(() => !(window as any)._resyncing, undefined, { timeout: 5_000, polling: 50 });
      await page.clock.fastForward(16_000);
    }
    await page.waitForTimeout(300);

    // Al più tre riallineamenti automatici, comunque vadano i giri.
    expect(login, 'auto-resync limitato').toBeLessThanOrEqual(3);
    expect(login, 'ma almeno uno c\'è stato').toBeGreaterThanOrEqual(1);
    const dopoFreno = login;
    await expect(page.locator(badge)).toBeVisible();
    // Il badge dice il fatto, non una causa che non può conoscere.
    await expect(page.locator(badge)).toContainText('Il cloud resta più avanti');
    expect(errori.filter((t) => t.includes('Conflitto persistente')).length, 'la console deve dire perché, una volta sola').toBe(1);

    // Da qui in poi, per quanti conflitti arrivino, nessun altro login automatico.
    for (let i = 0; i < 3; i++) {
      await page.evaluate(async () => { await (window as any).EspooClicker.saveGame(); });
      await page.clock.fastForward(16_000);
    }
    expect(login, 'freno tirato: niente resync automatici').toBe(dopoFreno);

    // Il tocco è la scelta del giocatore: riparte un resync e i contatori si azzerano.
    await page.locator(badge).click();
    await expect.poll(() => login, { timeout: 5_000 }).toBe(dopoFreno + 1);
    await expect(page.locator(badge)).toContainText('Progressi sincronizzati', { timeout: 5_000 });
  });

  test('se il cloud consegnato è INDIETRO non lo adotta, tiene il locale e smette di riallinearsi', async ({ page }) => {
    // Il caso dell'account T3tt3 (10/09/2026): la riga di classifica ha preso il
    // largo rispetto a users.save_data, quindi il server dice "il cloud è più
    // avanti" ma il blob che consegna è più povero del locale. Ogni resync
    // riportava indietro il giocatore senza sbloccare niente.
    await boot(page);
    // Blob del cloud: 1000 di lifetimeScore. Locale: molto più avanti.
    const blob = await cloudBlob(page);
    await page.evaluate(() => {
      const w = window as any;
      w.EspooClicker.getGameState().lifetimeScore = new w.Decimal(9_000_000);
    });

    let login = 0;
    await page.route('**/login-register', loginRoute(blob, () => { login++; }));
    await page.route('**/save-progress', (route) => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ status: 'conflict', message: 'Cloud save is newer (Score). Please reload.' }),
    }));

    for (let i = 0; i < 4; i++) {
      await page.evaluate(async () => { await (window as any).EspooClicker.saveGame(); });
      await page.waitForFunction(() => !(window as any)._resyncing, undefined, { timeout: 5_000, polling: 50 });
      await page.clock.fastForward(16_000);
    }
    await page.waitForTimeout(300);

    const dopo = await page.evaluate(() => ({
      lifetime: String((window as any).EspooClicker.getGameState().lifetimeScore),
      stale: !!(window as any)._cloudStaleServer,
    }));
    // UN solo tentativo: al primo rifiuto l'automatismo si spegne per la sessione.
    expect(login, 'niente giri a vuoto: un tentativo e basta').toBe(1);
    expect(dopo.stale, 'la sessione sa che il cloud è disallineato').toBe(true);
    // Non buttati: il locale è rimasto dov'era (e semmai è cresciuto giocando).
    expect(Number(dopo.lifetime), 'i progressi locali NON vengono buttati').toBeGreaterThanOrEqual(9_000_000);
    // Il badge informa senza allarmare e senza invitare a un gesto inutile.
    await expect(page.locator(badge)).toContainText('Progressi al sicuro su questo dispositivo');
    expect(await page.locator(badge).evaluate((el) => getComputedStyle(el).cursor)).toBe('default');
  });

  test('il riallineamento da conflitto non rispinge nulla e non riapre il modale Bentornato', async ({ page }) => {
    await boot(page);
    // Blob "vecchio" con produzione attiva: il rientro normale mostrerebbe il modale.
    await page.evaluate(() => {
      const w = window as any;
      const gs = w.EspooClicker.getGameState();
      gs.lastSaveTimestamp = Date.now() - 2 * 3600 * 1000;
      w.bps = new w.Decimal(10);
    });
    const blob = await cloudBlob(page);
    await page.route('**/login-register', loginRoute(blob, () => {}));
    let save = 0;
    await page.route('**/save-progress', (route) => {
      save++;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success' }) });
    });

    const r = await page.evaluate(async () => {
      const w = window as any;
      const esito = await w._resyncFromCloud();
      await new Promise((res) => setTimeout(res, 600));
      return { esito, modale: getComputedStyle(document.getElementById('offline-modal')!).display };
    });
    expect(r.esito).toEqual({ ok: true, reason: 'resynced' });
    // Era il carburante del loop: il push "di conferma" subito dopo l'adozione.
    expect(save, 'nessun push di conferma dopo il resync').toBe(0);
    expect(r.modale, 'niente guadagni offline su uno stato preso da un\'altra sessione').toBe('none');
  });

  test('lo score inviato è quello dentro il blob spedito insieme', async ({ page }) => {
    await boot(page);
    // Produzione altissima: fra la serializzazione e il payload il lifetimeScore
    // cresce di sicuro, e prima della correzione lo `score` era letto dopo.
    await page.evaluate(() => {
      const w = window as any;
      w.bps = new w.Decimal(1e9);
      w.EspooClicker.startGameRoutines();
    });

    let payload: any = null;
    await page.route('**/save-progress', (route) => {
      payload = route.request().postDataJSON();
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success' }) });
    });

    await page.evaluate(async () => { await (window as any).EspooClicker.saveGame(); });
    await expect.poll(() => payload !== null, { timeout: 5_000 }).toBe(true);

    const dentroIlBlob = await page.evaluate((saveData: string) => {
      const w = window as any;
      const gs = JSON.parse(w.LZString.decompressFromUTF16(saveData));
      return String(new w.Decimal(gs.lifetimeScore).toFixed(0));
    }, payload.saveData);

    expect(payload.score, 'score e blob presi nello stesso istante').toBe(dentroIlBlob);
    expect(payload.profile.totalClicks).toBeGreaterThanOrEqual(0);
  });
});
