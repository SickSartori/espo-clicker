import { test, expect, Page, BrowserContext } from '@playwright/test';
import { spawn, execFileSync, ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync, mkdirSync, copyFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Area di test chiusa (issue #40): php/test-gate.php e php/test-access.php.
 *
 * Questo spec avvia un server PHP TUTTO SUO, col cancello acceso (ESPO_TEST_GATE=1,
 * che vale solo su localhost) e l'archivio in una cartella temporanea: gli altri spec
 * continuano a girare sul server di playwright.config.ts, senza cancello.
 * Le credenziali qui sotto sono finte e valgono solo per questo server.
 */
const ROOT = process.cwd();
const PHP = process.env.PHP_BIN || 'php';
const PORT = 8981;
const BASE = `http://127.0.0.1:${PORT}`;
const ADMIN = { user: 'capo', pass: 'admin-di-prova-123' };

let server: ChildProcess;
let dir: string;

test.describe.configure({ mode: 'serial' });

/** Server PHP col cancello acceso; `env` sceglie admin e archivio. Risolve quando risponde. */
async function startServer(port: number, env: Record<string, string>): Promise<ChildProcess> {
  const p = spawn(PHP, ['-S', `127.0.0.1:${port}`, '-t', ROOT], {
    cwd: ROOT, stdio: 'ignore', env: { ...process.env, ESPO_TEST_GATE: '1', ...env },
  });
  for (let i = 0; i < 50; i++) {
    try { await fetch(`http://127.0.0.1:${port}/php/test-access.php`); return p; } catch { await new Promise((r) => setTimeout(r, 200)); }
  }
  p.kill();
  throw new Error(`il server PHP del cancello non parte sulla porta ${port}`);
}

async function stopServer(p: ChildProcess | undefined) {
  if (!p || p.exitCode !== null) return;
  await new Promise((res) => { p.once('exit', res); p.kill(); });
}

const adminEnv = () => ({ ESPO_TEST_GATE_DIR: dir, ESPO_TEST_ADMIN_USER: ADMIN.user, ESPO_TEST_ADMIN_PASSWORD: ADMIN.pass });

test.beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'espo-gate-'));
  server = await startServer(PORT, adminEnv());
});

// Mai una chiamata vera al backend: col login unico il gioco farebbe login-register sul progetto
// Supabase di sviluppo vero, e ci creerebbe gli account dei test. Vale per ogni contesto dello spec;
// le risposte finte di gameRoutes stanno sopra (le route della pagina vincono su quelle del contesto).
const noBackend = (ctx: BrowserContext) => ctx.route('**/functions/v1/**', (r) => r.abort());
test.beforeEach(async ({ context }) => { await noBackend(context); });

test.afterAll(async () => {
  await stopServer(server);
  rmSync(dir, { recursive: true, force: true });
});

/** Compila e invia il login; resta sulla pagina dove porta il redirect. */
async function login(page: Page, user: string, pass: string, from = '/php/test-access.php') {
  await page.goto(BASE + from);
  await page.fill('#tg-user', user);
  await page.fill('#tg-pass', pass);
  await Promise.all([page.waitForNavigation(), page.getByRole('button', { name: 'Entra' }).click()]);
}

/** Il token anti-CSRF è il cookie ripetuto nel form: per le richieste dirette basta leggerlo. */
async function csrf(ctx: BrowserContext) {
  return (await ctx.cookies(BASE)).find((c) => c.name === 'espo_test_csrf')?.value ?? '';
}

let tempPassword = '';
let testerCtx: BrowserContext;

test('chi non ha un account vede solo il login: il gioco, la sala giochi ed Espofy non partono', async ({ page }) => {
  for (const path of ['/index.php', '/arcade.php', '/music/index.php']) {
    const res = await page.goto(BASE + path);
    expect(res!.status(), path).toBe(401);   // mai 200: il service worker metterebbe in cache il login al posto del gioco
    await expect(page.locator('#tg-user'), path).toBeVisible();
    expect(await page.content(), path).not.toContain('clicker-section');
  }
});

test('password sbagliata: messaggio generico, nessun accesso', async ({ page }) => {
  await login(page, ADMIN.user, 'sbagliata-davvero');
  await expect(page.getByRole('alert')).toContainText('Nome utente o password sbagliati');
  await expect(page.locator('#tg-user')).toBeVisible();
});

test('l\'admin entra, crea un tester e ne vede la password temporanea una volta sola', async ({ page }) => {
  await login(page, ADMIN.user, ADMIN.pass);
  await expect(page.locator('h1')).toHaveText('Area di test');
  await page.fill('#tg-newuser', 'Mario');
  await Promise.all([page.waitForNavigation(), page.getByRole('button', { name: 'Crea tester' }).click()]);
  tempPassword = (await page.locator('code.secret').textContent())!.trim();
  expect(tempPassword).toMatch(/^[A-Za-z2-9]{14}$/);
  await expect(page.locator('tr', { hasText: 'Mario' })).toContainText('primo accesso');
  // ricaricando il pannello la password non c'è più
  await page.goto(BASE + '/php/test-access.php');
  await expect(page.locator('code.secret')).toHaveCount(0);
  // stesso nome, anche con maiuscole diverse: rifiutato
  await page.fill('#tg-newuser', 'mario');
  await Promise.all([page.waitForNavigation(), page.getByRole('button', { name: 'Crea tester' }).click()]);
  await expect(page.getByRole('alert')).toContainText('Esiste già');
});

test('il tester al primo accesso deve cambiare password, poi entra nel gioco', async ({ browser }) => {
  testerCtx = await browser.newContext();
  await noBackend(testerCtx);
  const page = await testerCtx.newPage();
  await login(page, 'mario', tempPassword, '/index.php');   // il nome non bada alle maiuscole
  await expect(page.locator('h1')).toHaveText('Nuova password');
  // finché non la cambia, ogni pagina porta al cambio
  expect((await testerCtx.request.get(BASE + '/index.php')).status()).toBe(403);
  // troppo corta, poi diversa dalla conferma: rifiutate
  await page.fill('#tg-new', 'corta');
  await page.fill('#tg-conf', 'corta');
  await page.locator('#tg-new').evaluate((el: HTMLInputElement) => el.removeAttribute('minlength'));
  await page.locator('#tg-conf').evaluate((el: HTMLInputElement) => el.removeAttribute('minlength'));
  await Promise.all([page.waitForNavigation(), page.getByRole('button', { name: 'Salva e continua' }).click()]);
  await expect(page.getByRole('alert')).toContainText('almeno 10 caratteri');
  await page.fill('#tg-new', 'mario-nuova-pass');
  await page.fill('#tg-conf', 'mario-nuova-pass');
  // dopo il cambio si apre il gioco vero: niente chiamate al backend dev, come negli altri spec
  await page.route('**/functions/v1/**', (r) => r.abort());
  await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.getByRole('button', { name: 'Salva e continua' }).click()]);
  expect(new URL(page.url()).pathname).toBe('/index.php');
  // il redirect riporta dove voleva andare: il gioco, servito davvero
  const game = await testerCtx.request.get(BASE + '/index.php');
  expect(game.status()).toBe(200);
  expect(await game.text()).toContain('clicker-section');
});

test('un tester non può usare le azioni dell\'admin', async () => {
  const panel = await testerCtx.request.get(BASE + '/php/test-access.php');
  expect(await panel.text()).not.toContain('Nuovo tester');
  const res = await testerCtx.request.post(BASE + '/php/test-access.php', {
    form: { action: 'create', csrf: await csrf(testerCtx), username: 'intruso' },
  });
  expect(res.status()).toBe(403);
});

/**
 * Login unico: il gioco vero, sul server col cancello. Le Edge Function sono finte: login-register
 * risponde come vuole il test, tutto il resto del backend è spento.
 */
async function gameRoutes(page: Page, loginReply: (body: any) => object) {
  const calls: any[] = [];
  await page.route('**/functions/v1/**', (r) => r.abort());   // registrata prima: vale per ultima
  await page.route('**/functions/v1/login-register', (r) => {
    const body = JSON.parse(r.request().postData() || '{}');
    calls.push(body);
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(loginReply(body)) });
  });
  return calls;
}
const ok = () => ({ status: 'success', action: 'register', save_data: null, save_token: 'e2e', token_expires_at: Math.floor(Date.now() / 1000) + 86_400 });

test('login unico: il gioco entra da solo, col nome esatto del cancello, e il profilo mostra l\'area di test', async () => {
  const page = await testerCtx.newPage();
  const calls = await gameRoutes(page, ok);
  await page.goto(BASE + '/index.php', { waitUntil: 'domcontentloaded' });
  await expect.poll(() => calls.length, { timeout: 20_000 }).toBeGreaterThan(0);
  expect(calls[0].username).toBe('Mario');   // login-register distingue le maiuscole: il nome come l'ha scritto l'admin
  expect(String(calls[0].password).length).toBeGreaterThanOrEqual(8);
  expect(await page.evaluate(() => (window as any).ESPO_TEST_GATE.user)).toBe('Mario');
  await expect(page.locator('#login-modal')).toBeHidden();
  const profile = await page.evaluate(() => {
    const box = document.querySelector('.espo-test-gate');
    const hidden = (id: string) => getComputedStyle(document.getElementById(id)!.closest('.form-section')!).display === 'none';
    return { text: box?.textContent || '', admin: !!box?.querySelector('a[href*="test-access.php"]:not([href*="cambia"])'), name: hidden('change-username-btn'), pass: hidden('change-password-btn') };
  });
  expect(profile.text).toContain('Sei entrato come Mario.');
  expect(profile.admin, 'un tester non vede «Gestisci tester»').toBe(false);
  expect(profile.name && profile.pass, 'nome e password del gioco non si cambiano dal gioco').toBe(true);
  // la pagina del login unico non va mai in cache
  const seed = await testerCtx.request.get(BASE + '/php/test-access.php?seed=1');
  expect(seed.headers()['cache-control']).toContain('no-store');
  // e la legge solo la stessa origine: un <script> da un altro sito (o da un altro *.altervista.org)
  // riceve 403, e così chi non dice da dove arriva (browser vecchi: il gioco chiede il suo login)
  expect(seed.status(), 'senza Sec-Fetch-Site').toBe(403);
  for (const site of ['cross-site', 'same-site', 'none']) {
    const res = await testerCtx.request.get(BASE + '/php/test-access.php?seed=1', { headers: { 'Sec-Fetch-Site': site } });
    expect(res.status(), site).toBe(403);
    expect(await res.text(), site).not.toContain('Mario');
  }
  await page.close();
});

test('login unico rifiutato (il nome esiste già su dev): un avviso, il login col nome scritto, e alla ricarica niente giri', async () => {
  const page = await testerCtx.newPage();   // scheda nuova: sessionStorage pulito
  const calls = await gameRoutes(page, () => ({ status: 'error', message: 'Password errata.' }));
  const dialogs: string[] = [];
  page.on('dialog', (d) => { dialogs.push(d.message()); d.accept(); });
  await page.goto(BASE + '/index.php', { waitUntil: 'domcontentloaded' });
  await expect.poll(() => dialogs.length, { timeout: 20_000 }).toBe(1);
  expect(dialogs[0]).toContain('esiste già un account «Mario»');
  await expect(page.locator('#login-modal')).toBeVisible();
  await expect(page.locator('#login-username-input')).toHaveValue('Mario');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  expect(calls.length, 'dopo il primo rifiuto la scheda non riprova da sola').toBe(1);
  expect(dialogs.length).toBe(1);
  await expect(page.locator('#login-modal')).toBeVisible();
  await page.close();
});

test('l\'admin vede «Gestisci tester» nel profilo, e «Esci» dal gioco chiude anche l\'area di test', async ({ page }) => {
  await login(page, ADMIN.user, ADMIN.pass, '/index.php');
  const calls = await gameRoutes(page, ok);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect.poll(() => calls.length, { timeout: 20_000 }).toBeGreaterThan(0);
  const manage = page.locator('.espo-test-gate a', { hasText: 'Gestisci tester' });
  await expect(manage).toHaveCount(1);
  expect(await manage.getAttribute('href')).toBe('/php/test-access.php');
  page.once('dialog', (d) => d.accept());   // conferma di uscita del gioco
  await Promise.all([page.waitForNavigation(), page.evaluate(() => (document.getElementById('logout-btn') as HTMLButtonElement).click())]);
  await expect(page.locator('#tg-user')).toBeVisible();
  expect((await page.context().request.get(BASE + '/index.php')).status()).toBe(401);
});

/** Crea un tester dal pannello e restituisce la password temporanea. */
async function createTester(page: Page, name: string) {
  await page.goto(BASE + '/php/test-access.php');
  await page.fill('#tg-newuser', name);
  await Promise.all([page.waitForNavigation(), page.getByRole('button', { name: 'Crea tester' }).click()]);
  return (await page.locator('code.secret').textContent())!.trim();
}

/** Primo accesso di un tester (password scelta): il suo contesto e la password di gioco che il login unico gli passerebbe. */
async function firstAccess(browser: any, name: string, temp: string) {
  const ctx: BrowserContext = await browser.newContext();
  await noBackend(ctx);
  const page = await ctx.newPage();
  await login(page, name, temp);
  await page.fill('#tg-new', name + '-pass-nuova');
  await page.fill('#tg-conf', name + '-pass-nuova');
  await Promise.all([page.waitForNavigation(), page.getByRole('button', { name: 'Salva e continua' }).click()]);
  const js = await (await ctx.request.get(BASE + '/php/test-access.php?seed=1', { headers: { 'Sec-Fetch-Site': 'same-origin' } })).text();
  return { ctx, game: /var P = "([^"]+)"/.exec(js)?.[1] ?? '' };
}

test('un tester eliminato e ricreato con lo stesso nome: il vecchio non rientra e il nuovo non ritrova l\'account di gioco di prima', async ({ page, browser }) => {
  await login(page, ADMIN.user, ADMIN.pass);
  const prima = await firstAccess(browser, 'Luca', await createTester(page, 'Luca'));
  page.once('dialog', (d) => d.accept());
  await page.goto(BASE + '/php/test-access.php');
  await Promise.all([page.waitForNavigation(), page.locator('tr', { hasText: 'Luca' }).getByRole('button', { name: 'Elimina' }).click()]);
  const dopo = await firstAccess(browser, 'Luca', await createTester(page, 'Luca'));
  // stesso nome e, dopo il primo cambio password, stessa versione: il cookie di prima non deve valere
  expect((await prima.ctx.request.get(BASE + '/index.php')).status(), 'cookie del Luca eliminato').toBe(401);
  expect((await dopo.ctx.request.get(BASE + '/index.php')).status(), 'cookie del Luca nuovo').toBe(200);
  expect(prima.game.length).toBeGreaterThanOrEqual(8);
  expect(dopo.game).not.toBe(prima.game);
  await prima.ctx.close();
  await dopo.ctx.close();
});

test('senza il token del form un\'azione non passa', async ({ page }) => {
  await login(page, ADMIN.user, ADMIN.pass);
  const res = await page.context().request.post(BASE + '/php/test-access.php', {
    form: { action: 'create', csrf: 'non-il-token', username: 'senzatoken' },
  });
  expect(res.status()).toBe(400);
  expect(await (await page.context().request.get(BASE + '/php/test-access.php')).text()).not.toContain('senzatoken');
});

test('il reset dell\'admin chiude la sessione aperta del tester', async ({ page }) => {
  await login(page, ADMIN.user, ADMIN.pass);
  page.once('dialog', (d) => d.accept());
  await Promise.all([page.waitForNavigation(), page.locator('tr', { hasText: 'Mario' }).getByRole('button', { name: 'Reimposta password' }).click()]);
  tempPassword = (await page.locator('code.secret').textContent())!.trim();
  expect((await testerCtx.request.get(BASE + '/index.php')).status()).toBe(401);
});

test('disattivato: non entra nemmeno con la password giusta', async ({ page, browser }) => {
  await login(page, ADMIN.user, ADMIN.pass);
  await Promise.all([page.waitForNavigation(), page.locator('tr', { hasText: 'Mario' }).getByRole('button', { name: 'Disattiva' }).click()]);
  await expect(page.locator('tr', { hasText: 'Mario' })).toContainText('disattivato');
  const otherCtx = await browser.newContext();
  await noBackend(otherCtx);
  const other = await otherCtx.newPage();
  await login(other, 'mario', tempPassword);
  await expect(other.getByRole('alert')).toContainText('Nome utente o password sbagliati');
});

test('l\'admin non può disattivare o eliminare se stesso', async ({ page }) => {
  await login(page, ADMIN.user, ADMIN.pass);
  await expect(page.locator('tr', { hasText: ADMIN.user })).toContainText('sei tu');
  const res = await page.context().request.post(BASE + '/php/test-access.php', {
    form: { action: 'delete', csrf: await csrf(page.context()), username: ADMIN.user },
  });
  expect(await res.text()).toContain('Non puoi eliminare te stesso');
});

test('fuori dall\'area di test il cancello non c\'è', async ({ request }) => {
  // server di playwright.config.ts, senza flag: come la produzione
  expect((await request.get('/php/test-access.php')).status()).toBe(404);
  expect((await request.get('/php/test-access.php?seed=1')).status()).toBe(404);
  const game = await request.get('/index.php');
  expect(game.status()).toBe(200);
  const html = await game.text();
  expect(html).toContain('clicker-section');
  expect(html, 'nessuno script del login unico fuori da /test/').not.toContain('test-access.php');
  expect(await (await request.get('/arcade.php')).text()).not.toContain('test-access.php');
});

test('anche fuori dall\'area di test, una sessione salvata rifiutata apre il login col nome invece di bloccare', async ({ page }) => {
  // server di playwright.config.ts: come la produzione. Prima: solo un alert, nessuna finestra di login,
  // e a ogni ricarica di nuovo lo stesso tentativo.
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('e2e-seeded')) {
      sessionStorage.setItem('e2e-seeded', '1');
      sessionStorage.setItem('espooUser', 'Vecchio');
      sessionStorage.setItem('espooPass', 'password-cambiata-altrove');
    }
  });
  const calls = await gameRoutes(page, () => ({ status: 'error', message: 'Password errata.' }));
  const dialogs: string[] = [];
  page.on('dialog', (d) => { dialogs.push(d.message()); d.accept(); });
  await page.goto('/index.php', { waitUntil: 'domcontentloaded' });
  await expect.poll(() => dialogs.length, { timeout: 20_000 }).toBe(1);
  expect(dialogs[0]).toBe('Password errata.');   // fuori da test resta il messaggio del server
  await expect(page.locator('#login-modal')).toBeVisible();
  await expect(page.locator('#login-username-input')).toHaveValue('Vecchio');
  expect(await page.evaluate(() => sessionStorage.getItem('espooPass'))).toBeNull();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  expect(calls.length).toBe(1);
  await expect(page.locator('#login-modal')).toBeVisible();
});

test('si accende sotto /test/ dal percorso dello script, mai dalla query o dal flag fuori da localhost', () => {
  const check = (script: string, host: string, env: Record<string, string> = {}) => execFileSync(PHP, ['-r', `
    $_SERVER['SCRIPT_NAME'] = ${JSON.stringify(script)};
    $_SERVER['HTTP_HOST'] = ${JSON.stringify(host)};
    require 'php/test-gate.php';
    echo json_encode([tg_enabled(), tg_base()], JSON_UNESCAPED_SLASHES);
  `], { cwd: ROOT, env: { ...process.env, ESPO_TEST_GATE: '', ...env } }).toString();
  expect(check('/test/index.php', 'www.espooclicker.altervista.org')).toBe('[true,"/test/"]');
  expect(check('/test/music/index.php', 'www.espooclicker.altervista.org')).toBe('[true,"/test/"]');
  expect(check('/index.php', 'www.espooclicker.altervista.org')).toBe('[false,"/"]');
  expect(check('/php/test-access.php', 'www.espooclicker.altervista.org')).toBe('[false,"/"]');
  // il flag accende solo in locale: in produzione non apre e non chiude niente
  expect(check('/index.php', 'www.espooclicker.altervista.org', { ESPO_TEST_GATE: '1' })).toBe('[false,"/"]');
  expect(check('/index.php', '127.0.0.1:8981', { ESPO_TEST_GATE: '1' })).toBe('[true,"/"]');
});

test('senza admin configurato l\'area resta chiusa, senza nemmeno il form', async ({ page }) => {
  const empty = mkdtempSync(join(tmpdir(), 'espo-gate-vuoto-'));
  const p = await startServer(PORT + 2, { ESPO_TEST_GATE_DIR: empty, ESPO_TEST_ADMIN_USER: '', ESPO_TEST_ADMIN_PASSWORD: '' });
  try {
    const res = await page.goto(`http://127.0.0.1:${PORT + 2}/index.php`);
    expect(res!.status()).toBe(503);
    await expect(page.locator('h1')).toHaveText('Area di test chiusa');
    await expect(page.locator('#tg-user')).toHaveCount(0);
    expect(await page.content()).not.toContain('clicker-section');
  } finally {
    await stopServer(p);
    rmSync(empty, { recursive: true, force: true });
  }
});

test('su /test/ l\'admin arriva da secrets.php: valido sì, segnaposto, password corta o nome con spazi no', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'espo-secrets-'));
  mkdirSync(join(tmp, 'php'));
  for (const f of ['test-gate.php', 'secrets-load.php']) copyFileSync(join(ROOT, 'php', f), join(tmp, 'php', f));
  const read = (user: string, pass: string) => {
    writeFileSync(join(tmp, 'php', 'secrets.php'), `<?php return ['test_gate' => ['admin_user' => ${JSON.stringify(user)}, 'admin_password' => ${JSON.stringify(pass)}]];`);
    return execFileSync(PHP, ['-r', `
      $_SERVER['SCRIPT_NAME'] = '/test/index.php';
      $_SERVER['HTTP_HOST'] = 'www.espooclicker.altervista.org';
      require 'php/test-gate.php';
      echo json_encode(tg_admin_config());
    `], { cwd: tmp, env: { ...process.env, ESPO_TEST_GATE: '' }, stdio: ['ignore', 'pipe', 'ignore'] }).toString();
  };
  try {
    expect(read('capo', 'una-password-lunga')).toBe('{"user":"capo","password":"una-password-lunga"}');
    expect(read('INSERISCI_TEST_ADMIN_USER_QUI', 'INSERISCI_TEST_ADMIN_PASSWORD_QUI')).toBe('null');
    expect(read('capo', 'corta')).toBe('null');
    expect(read('con spazio', 'una-password-lunga')).toBe('null');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('cambiando il secret l\'admin viene reimpostato: la vecchia password non vale più, i tester restano', async ({ page }) => {
  const old = ADMIN.pass;
  await stopServer(server);
  ADMIN.pass = 'admin-nuova-456789';
  server = await startServer(PORT, adminEnv());   // stesso archivio, secret diverso: come un nuovo deploy
  await login(page, ADMIN.user, old);
  await expect(page.getByRole('alert')).toContainText('Nome utente o password sbagliati');
  await login(page, ADMIN.user, ADMIN.pass);
  await expect(page.locator('tr', { hasText: 'Mario' })).toBeVisible();
});

// Ultimo di proposito: blocca quel nome da questo indirizzo per un quarto d'ora.
test('dieci tentativi sbagliati sullo stesso nome: aspetta anche con la password giusta, gli altri nomi no', async ({ page }) => {
  for (let i = 0; i < 10; i++) await login(page, ADMIN.user, 'sbagliata-' + i);
  await login(page, ADMIN.user, ADMIN.pass);
  await expect(page.getByRole('alert')).toContainText('Troppi tentativi');
  // il blocco è per nome: un errore su un altro nome dallo stesso indirizzo resta un errore normale
  await login(page, 'nessuno', 'sbagliata');
  await expect(page.getByRole('alert')).toContainText('Nome utente o password sbagliati');
});
