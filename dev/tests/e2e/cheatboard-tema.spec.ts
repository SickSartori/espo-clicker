import { test, expect, Page } from '@playwright/test';

/**
 * Cheatboard — gruppo «Tema Vintage v1 (compleanno)».
 *
 * Il tema, lo sblocco e la priorità della skin si provano senza aspettare il 17/11
 * né passare dagli Obiettivi: il gruppo mostra lo stato (soglia, premio, switch,
 * tema, skin) e dà le azioni per attraversarlo. Qui si verifica che le azioni facciano
 * quello che dichiarano e che l'etichetta dica la verità. La logica vera (premio
 * riscattato + switch + niente tema proprio della skin) è in ui/theme/vintage.ts e
 * ha i suoi test: questi guardano il pannello di prova, che serve a chi collauda.
 *
 * Rete: come negli altri spec, le Edge Functions restano sospese (niente backend dev).
 */

async function boot(page: Page, query: string): Promise<void> {
  await page.route('**/functions/v1/**', () => { /* mai risolta */ });
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem('espooUser', 'E2ETester');
      sessionStorage.setItem('espooPass', 'e2e');
    } catch (_) { /* no-op */ }
  });
  await page.goto('/index.php?' + query, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => !!(window as any)._espoGameReady && !!document.getElementById('cb-th-claim'),
    undefined,
    { timeout: 20_000 },
  );
  // Niente avvisi o popup a coprire la prova.
  await page.evaluate(() => {
    const gs = (window as any).EspooClicker.getGameState();
    gs.feedbackIntroAt = Date.now();
    gs.seasonAnnounced = { 'birthday-2026': 1 };
  });
}

const premi = (page: Page, id: string) => page.evaluate((i) => (document.getElementById(i) as HTMLElement).click(), id);
const etichetta = (page: Page) => page.evaluate(() => (document.getElementById('cb-theme-label') as HTMLElement).textContent || '');
const classi = (page: Page) => page.evaluate(() => document.body.className);

test.describe('Cheatboard — Tema Vintage', () => {
  test('prima del 17/11: soglia non uscita, e «Sblocca obiettivo» mette il premio da riscattare', async ({ page }) => {
    await boot(page, 'stagione=nessuna');

    await expect.poll(() => etichetta(page)).toContain('Soglia: non uscita');
    expect(await etichetta(page)).toContain('Premio: bloccato');
    expect(await etichetta(page)).toContain('Switch: OFF');

    await premi(page, 'cb-th-unlock');
    await expect.poll(() => etichetta(page)).toContain('Premio: da riscattare');
    // Scrivere solo lo switch non basta: il premio va riscattato.
    await premi(page, 'cb-th-toggle');
    expect(await etichetta(page)).toContain('Switch: ON');
    expect(await classi(page)).not.toContain('theme-vintage');
  });

  test('dopo il 17/11: riscatta + accendi, switch, e vince la skin con un tema suo', async ({ page }) => {
    await boot(page, 'stagione=birthday');
    await expect.poll(() => etichetta(page)).toContain('Soglia: uscita');

    await premi(page, 'cb-th-claim');
    await expect(page.locator('body')).toHaveClass(/theme-vintage/);
    await expect.poll(() => etichetta(page)).toContain('Premio: riscattato');
    expect(await etichetta(page)).toContain('Switch: ON');
    expect(await etichetta(page)).toContain('Tema: attivo');

    // Switch spento: il tema se ne va, il premio resta.
    await premi(page, 'cb-th-toggle');
    await expect(page.locator('body')).not.toHaveClass(/theme-vintage/);
    await expect.poll(() => etichetta(page)).toContain('Switch: OFF');
    expect(await etichetta(page)).toContain('Premio: riscattato');
    await premi(page, 'cb-th-toggle');
    await expect(page.locator('body')).toHaveClass(/theme-vintage/);

    // Skin con un tema suo (8bit): vince lei, e l'etichetta spiega l'attesa.
    await premi(page, 'cb-th-skin8');
    await expect(page.locator('body')).toHaveClass(/theme-8bit/);
    expect(await classi(page)).not.toContain('theme-vintage');
    await expect.poll(() => etichetta(page)).toContain('in attesa (skin con tema)');

    // Skin base: il Vintage torna.
    await premi(page, 'cb-th-base');
    await expect(page.locator('body')).toHaveClass(/theme-vintage/);
    await expect.poll(() => etichetta(page)).toContain('Tema: attivo');
  });

  test('«Azzera premio» spegne il tema e toglie il riscatto; «Rimostra avviso» cancella il timbro', async ({ page }) => {
    await boot(page, 'stagione=birthday');
    await premi(page, 'cb-th-claim');
    await expect(page.locator('body')).toHaveClass(/theme-vintage/);

    await premi(page, 'cb-th-reset');
    await expect(page.locator('body')).not.toHaveClass(/theme-vintage/);
    // Con la soglia uscita l'obiettivo si risblocca da solo: al massimo «da riscattare», mai «riscattato».
    await expect.poll(() => etichetta(page)).not.toContain('Premio: riscattato');
    expect(await etichetta(page)).toContain('Switch: OFF');

    expect(await page.evaluate(() => (window as any).EspooClicker.getGameState().seasonAnnounced['birthday-2026'])).toBe(1);
    await premi(page, 'cb-th-announce');
    expect(await page.evaluate(() => (window as any).EspooClicker.getGameState().seasonAnnounced['birthday-2026'])).toBeUndefined();
  });
});
