import { test, expect } from '@playwright/test';
import { Page, Request, Route } from '@playwright/test';
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
 *
 * ---------------------------------------------------------------------------
 * RETE: questo spec non deve toccare il backend dev condiviso.
 *
 * Prima lo toccava eccome. bootWithSession mette utente e password in sessione
 * e ricarica: l'auto-login partiva sul serio, e da lì in cascata tutto il
 * resto. Misurato prima di questa correzione: 19 richieste REALI a supabase.co
 * per esecuzione dello spec — 4 login-register, 13 save-progress, 2
 * friends-poll. Le login-register sono la parte velenosa, perché la password
 * usata qui ('e2e-pass') è inventata: la Edge Function conta 10 tentativi
 * falliti per IP ogni 15 minuti, quindi bastavano due-tre run in fila — o due
 * push, perché la CI gira a ogni push dallo stesso IP — per far scattare il 429
 * e lasciare il gioco senza login per tutti, sul dev, finché la finestra non
 * scadeva. È esattamente quello che è successo. I save-progress erano il danno
 * collaterale: la classifica dev si riempiva di punteggi inventati dai test.
 *
 * La cura è la stessa già adottata in helpers.ts: una route catch-all su
 * `**​/functions/v1/**` che lascia le richieste SOSPESE. Non abortite — l'abort
 * scrive un errore rosso in console e fa cadere kill-legacy, che sugli errori
 * console ci fa le asserzioni — e non simulate a tappeto, perché una risposta
 * finta di successo innesca side-effect veri sul save (adozione del cloud,
 * reset). Una richiesta sospesa non risolve mai: zero rete, zero rumore, e il
 * client resta nel ramo "best-effort fallito" che è quello che vogliamo.
 *
 * La catch-all sta in beforeEach APPOSTA, non dentro bootWithSession: in
 * Playwright vince l'ULTIMA route registrata, quindi i mock specifici che i due
 * test montano nel proprio corpo hanno la precedenza. Registrata più tardi si
 * mangerebbe reset-progress, e il primo test — che su quella chiamata basa
 * tutte le sue asserzioni — fallirebbe.
 * ---------------------------------------------------------------------------
 */

/** URL che nessuna route della pagina ha preso: sarebbero usciti in rete. */
let scappate: string[] = [];

/** Risponde localmente a una Edge Function, senza toccare la rete. */
async function mockEF(page: Page, slug: string, body: unknown, spia?: (r: Request) => void): Promise<void> {
  await page.route(`**/functions/v1/${slug}`, async (route: Route) => {
    if (spia) spia(route.request());
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
}

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
  test.beforeEach(async ({ page }) => {
    scappate = [];

    // Filo d'inciampo, sul CONTEXT e non sulla pagina: in Playwright le route
    // della PAGINA hanno la precedenza su quelle del context, quindi qui sotto
    // arriva solo ciò che nessun mock e nessuna catch-all ha intercettato —
    // cioè esattamente il traffico che finirebbe sul backend dev condiviso.
    // Serviva un criterio del genere perché contare gli eventi di rete non
    // funziona: una richiesta lasciata sospesa emette comunque 'requestfailed'
    // quando la pagina si ricarica e la cancella, e sembrerebbe uscita davvero.
    // Anche qui la richiesta resta sospesa: se un domani scappa qualcosa non
    // deve comunque partire, e l'asserzione in afterEach lo dice a voce alta.
    await page.context().route((url) => url.hostname.endsWith('supabase.co'), (route) => {
      scappate.push(route.request().url());
    });

    // Il muro: niente esce verso il backend dev. Vedi il blocco RETE in testa.
    await page.route('**/functions/v1/**', () => { /* mai risolta */ });
  });

  // La prova che il muro tiene, e che continuerà a tenere dopo la prossima
  // modifica.
  test.afterEach(() => {
    expect(scappate, 'richieste uscite verso il backend dev condiviso').toEqual([]);
  });

  test('RESET TOTALE: azzera cloud+locale, SENZA logout e senza chiedere la password', async ({ page }) => {
    // Mock deterministico dell'EF reset-progress (no rete): registra la chiamata.
    // Registrata QUI, nel corpo del test: è più recente della catch-all del
    // beforeEach, quindi vince su di essa.
    const resetCalls: Array<Record<string, unknown>> = [];
    await mockEF(page, 'reset-progress', { status: 'success' }, (req) => {
      let body: Record<string, unknown> = {};
      try { body = req.postDataJSON() as Record<string, unknown>; } catch (_) {}
      resetCalls.push(body);
    });

    // NB: login-register resta sospesa. Questo test non ha bisogno di un token
    // vero — se lo stubba da sé due righe più sotto — e senza token saveGame si
    // ferma prima del push cloud, il che qui va benissimo: quello che si misura
    // è reset-progress, non il salvataggio.
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
    // Qui i due endpoint del login e del salvataggio vanno SIMULATI, non
    // sospesi: senza token saveGame esce da [Save SKIP] e l'asserzione in fondo
    // passerebbe senza aver dimostrato niente (anche "[Save SKIP]" contiene
    // "[Save"). Prima della correzione questo test il token lo prendeva dal
    // backend vero, ed è così che verificava davvero il push cloud; per non
    // perdere quella verifica la si riproduce in locale.
    // Il login finto risponde senza save_data: il client lo legge come "account
    // nuovo" e resetta lo stato — innocuo, perché seedRichState popola lo stato
    // subito DOPO il boot. In cambio imposta username, password e token, cioè
    // le tre cose che saveGame pretende per arrivare al push.
    await mockEF(page, 'login-register', {
      status: 'success', save_token: 'e2e-token',
      token_expires_at: Math.floor(Date.now() / 1000) + 86_400,
    });
    await mockEF(page, 'save-progress', { status: 'success' });

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
