import { test, expect, Page } from '@playwright/test';
import { bootGame } from './helpers';

/**
 * Primo compleanno (3.3) — il tema Vintage v1 come switch nelle Opzioni.
 *
 * Edizione unica del 2026 (src/data/season.ts): la finestra dell'avviso è
 * 17-30/11, ma il regalo — l'obiettivo «Primo Compleanno», che sblocca lo switch
 * del tema — non scade. Prima del 17/11 non esiste: né l'obiettivo né la riga
 * nelle Opzioni (la soglia di prima edizione). Il tema vale per tutte le skin
 * senza un tema proprio; se la skin ne ha uno, vince lei. Con lo switch acceso la
 * mascotte base mostra l'arte della v1. Si prova con l'orologio finto,
 * installato PRIMA del caricamento.
 */

const ANNOUNCE = '#season-announce-overlay';

async function bootAt(page: Page, iso: string): Promise<void> {
  await page.clock.install({ time: new Date(iso) });
  await bootGame(page);
  // Il tick lento (1/s) decide l'avviso, dopo qualche secondo di quiete.
  // fastForward fa scattare ogni timer UNA volta sola: a piccoli passi i tick
  // (obiettivi, avviso) girano davvero, come in una sessione vera.
  for (let i = 0; i < 9; i++) await page.clock.fastForward(1_000);
}

async function vistoDalGiocatore(page: Page) {
  return page.evaluate(() => {
    const w = window as any;
    w.updateAchievementsUI();
    const obiettivo = Array.from(document.querySelectorAll('#achievement-list > *'))
      .some((e) => (e.textContent || '').includes('Primo Compleanno'));
    const gs = w.EspooClicker.getGameState();
    return {
      obiettivo,
      sbloccato: !!(gs.achievements.primoCompleanno && gs.achievements.primoCompleanno.unlocked),
      riscattato: !!(gs.achievements.primoCompleanno && gs.achievements.primoCompleanno.claimed),
      avviso: !!document.getElementById('season-announce-overlay'),
      aperta: w.isSeasonRewardOpen('birthday'),
    };
  });
}

/** Apre le Opzioni e legge la riga del tema. */
async function rigaTema(page: Page) {
  await page.evaluate(() => (document.getElementById('open-settings-btn') as HTMLElement).click());
  return page.evaluate(() => {
    const g = document.getElementById('theme-group') as HTMLElement;
    const s = document.getElementById('theme-select') as HTMLSelectElement;
    const n = document.getElementById('theme-note') as HTMLElement;
    return {
      visibile: getComputedStyle(g).display !== 'none',
      valore: s.value,
      bloccata: s.disabled,
      nota: getComputedStyle(n).display !== 'none' ? (n.textContent || '').trim() : '',
    };
  });
}

async function riscatta(page: Page) {
  await page.evaluate(() => {
    const riga = Array.from(document.querySelectorAll('#achievement-list > *'))
      .find((e) => (e.textContent || '').includes('Primo Compleanno'));
    const btn = riga && riga.querySelector('button');
    if (!btn) throw new Error('riga o tasto di riscatto non trovati');
    (btn as HTMLElement).click();
  });
}

async function statoTema(page: Page) {
  return page.evaluate(() => {
    const w = window as any;
    const gs = w.EspooClicker.getGameState();
    return {
      classi: document.body.className,
      vintage: document.body.classList.contains('theme-vintage'),
      acceso: !!gs.user.vintageTheme,
      mascotte: (document.getElementById('manager-photo-normal') as HTMLImageElement).getAttribute('src') || '',
      skin: gs.skins.current,
    };
  });
}

test.describe('Primo compleanno', () => {
  test('prima del 17/11 il regalo non esiste: né obiettivo, né switch, né avviso', async ({ page }) => {
    await bootAt(page, '2026-11-16T12:00:00');
    // Un'assenza non si aspetta con un poll: qui serve un attimo di tempo vero, perché
    // il controllo degli obiettivi abbia girato e NON abbia sbloccato niente.
    await page.waitForTimeout(1_500);

    const v = await vistoDalGiocatore(page);
    expect(v.obiettivo, "l'obiettivo non deve comparire nella lista").toBe(false);
    expect(v.sbloccato, "l'obiettivo non si sblocca prima del tempo").toBe(false);
    expect(v.avviso).toBe(false);
    expect(v.aperta).toBe(false);

    const r = await rigaTema(page);
    expect(r.visibile, 'la riga del tema non deve esistere nelle Opzioni').toBe(false);
  });

  test('dal 17/11, prima del riscatto, lo switch c\'è ma è bloccato e dice perché', async ({ page }) => {
    await bootAt(page, '2026-11-20T12:00:00');
    await expect.poll(async () => (await vistoDalGiocatore(page)).sbloccato).toBe(true);

    const r = await rigaTema(page);
    expect(r.visibile).toBe(true);
    expect(r.bloccata, 'senza il premio riscattato lo switch non si usa').toBe(true);
    expect(r.valore).toBe('modern');
    expect(r.nota).toContain('Primo Compleanno');

    // Scriversi il flag a mano non basta: il premio va riscattato.
    const st = await page.evaluate(() => {
      const w = window as any;
      w.EspooClicker.getGameState().user.vintageTheme = true;
      w.applySkinVisuals('default');
      return document.body.classList.contains('theme-vintage');
    });
    expect(st, 'flag a mano senza premio: il tema non deve accendersi').toBe(false);
  });

  test('avviso → Obiettivi → riscatto: il tema si accende, la mascotte torna quella della v1', async ({ page }) => {
    await bootAt(page, '2026-11-20T12:00:00');

    await expect(page.locator(ANNOUNCE + '-title')).toContainText('Primo compleanno');
    await page.click(ANNOUNCE + '-go');
    await expect(page.locator('#achievements-modal')).toBeVisible();

    await expect.poll(async () => {
      const v = await vistoDalGiocatore(page);
      return v.obiettivo && v.sbloccato;
    }, { message: "l'obiettivo si sblocca e compare in lista" }).toBe(true);

    await riscatta(page);

    await expect.poll(async () => (await statoTema(page)).acceso).toBe(true);
    // La classe del tema arriva a CSS caricato (o al failsafe), mai prima.
    await expect(page.locator('body')).toHaveClass(/theme-vintage/);
    const s = await statoTema(page);
    expect(s.mascotte, 'la skin base mostra l\'arte della v1').toContain('espo-v1.webp');
    const font = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
    expect(font).toContain('Inter');
  });

  test('lo switch nelle Opzioni spegne e riaccende il tema', async ({ page }) => {
    await bootAt(page, '2026-11-20T12:00:00');
    await expect.poll(async () => (await vistoDalGiocatore(page)).sbloccato).toBe(true);
    await page.evaluate(() => (document.getElementById('open-achievements-btn') as HTMLElement).click());
    await riscatta(page);
    await expect(page.locator('body')).toHaveClass(/theme-vintage/);

    // Aperte le Opzioni: acceso e utilizzabile.
    let r = await rigaTema(page);
    expect(r).toMatchObject({ visibile: true, valore: 'vintage', bloccata: false });

    await page.selectOption('#theme-select', 'modern');
    await expect(page.locator('body')).not.toHaveClass(/theme-vintage/);
    let s = await statoTema(page);
    expect(s.acceso).toBe(false);
    expect(s.mascotte, 'spento: torna l\'arte di sempre').toContain('espo.webp');

    await page.selectOption('#theme-select', 'vintage');
    await expect(page.locator('body')).toHaveClass(/theme-vintage/);
    s = await statoTema(page);
    expect(s.acceso).toBe(true);
    expect(s.mascotte).toContain('espo-v1.webp');
  });

  test('vince la skin: con una skin a tema il Vintage aspetta, con le altre si vede', async ({ page }) => {
    await bootAt(page, '2026-11-20T12:00:00');
    await expect.poll(async () => (await vistoDalGiocatore(page)).sbloccato).toBe(true);
    await page.evaluate(() => (document.getElementById('open-achievements-btn') as HTMLElement).click());
    await riscatta(page);
    await expect(page.locator('body')).toHaveClass(/theme-vintage/);

    // 8bit ha un tema suo: prevale.
    await page.evaluate(() => {
      const w = window as any;
      const gs = w.EspooClicker.getGameState();
      for (const id of ['espobit', 'espo3']) if (!gs.skins.unlocked.includes(id)) gs.skins.unlocked.push(id);
      w.equipSkin('espobit');
    });
    await expect(page.locator('body')).toHaveClass(/theme-8bit/);
    let s = await statoTema(page);
    expect(s.vintage, 'la skin a tema vince').toBe(false);
    expect(s.acceso, 'lo switch resta acceso').toBe(true);
    const r = await rigaTema(page);
    expect(r.nota, 'le Opzioni spiegano perché non si vede').toContain('skin');

    // Espo 3.0 non ha un tema: il Vintage si vede, ma la mascotte è la sua.
    await page.evaluate(() => (window as any).equipSkin('espo3'));
    await expect(page.locator('body')).toHaveClass(/theme-vintage/);
    s = await statoTema(page);
    expect(s.mascotte).toContain('espo3');
    expect(s.mascotte).not.toContain('espo-v1');
  });

  test('a finestra chiusa il regalo resta riscattabile, ma niente avviso', async ({ page }) => {
    await bootAt(page, '2027-02-10T12:00:00');

    await expect.poll(async () => (await vistoDalGiocatore(page)).sbloccato, {
      message: 'il premio non scade: si sblocca anche a finestra chiusa',
    }).toBe(true);
    const v = await vistoDalGiocatore(page);
    expect(v.avviso, "l'avviso è solo della finestra 17-30/11/2026").toBe(false);
    expect(v.aperta, 'il premio non scade').toBe(true);
    expect(v.obiettivo).toBe(true);

    await page.evaluate(() => (document.getElementById('open-achievements-btn') as HTMLElement).click());
    await riscatta(page);
    await expect.poll(async () => (await statoTema(page)).acceso).toBe(true);
  });
});
