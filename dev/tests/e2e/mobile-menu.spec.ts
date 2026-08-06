import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Menu mobile (☰) — voci secondarie della barra in alto.
 *
 * Su telefono le icone della navbar sono senza etichetta e da 35px: con
 * l'Aiuto riacceso erano arrivate a 7-8 affiancate, indistinguibili. Le voci
 * secondarie stanno ora in un menu dove hanno anche un nome; in barra restano
 * solo quelle che portano informazione che cambia (☰ con la pallina,
 * Promozione con la %, Profilo col badge amici).
 *
 * Guardia principale: ogni voce deve aprire ESATTAMENTE la finestra giusta.
 * Le voci inoltrano il click al pulsante vero della navbar, quindi un cambio
 * di id o di handler si manifesta qui invece che in mano all'utente.
 */

const ATTESI: Record<string, string> = {
  'open-achievements-btn': 'achievements-modal',
  'open-skins-btn': 'skins-modal',
  'open-leaderboard-btn': 'leaderboard-modal',
  'open-stats-btn': 'stats-modal',
  'open-settings-btn': 'settings-modal',
  'open-help-btn': 'help-modal',
};

async function boot(page: Page) {
  // Backend simulato: il 429 del dev aprirebbe il login sopra tutto,
  // intercettando i tap (già successo).
  await page.route('**/login-register', (r) => r.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ status: 'success', save_token: 't', token_expires_at: Date.now() + 86_400_000 }),
  }));
  await page.route('**/functions/v1/**', () => { /* sospesa */ });
  await page.addInitScript(() => { try {
    sessionStorage.setItem('espooUser', 'E2ETester');
    sessionStorage.setItem('espooPass', 'e2e-pass');
  } catch (e) {} });
  await page.goto('/index.php', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!(window as any).EspooClicker?.getGameState(), undefined, { timeout: 20_000 });
  await page.waitForFunction(() => {
    const l = document.getElementById('game-loader');
    return !l || getComputedStyle(l).display === 'none' || getComputedStyle(l).opacity === '0';
  }, undefined, { timeout: 20_000 });
  await page.waitForFunction(() => {
    const m = document.getElementById('login-modal');
    return !m || getComputedStyle(m).display === 'none';
  }, undefined, { timeout: 15_000 });
  await page.waitForTimeout(400);
}

test.describe('Menu mobile', () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

  test('la barra resta essenziale e il menu ha la sua icona', async ({ page }) => {
    await boot(page);
    const r = await page.evaluate(() => {
      const bar = document.getElementById('game-navbar')!;
      const vis = [...bar.querySelectorAll('button')].filter((b) => getComputedStyle(b).display !== 'none');
      const menuBtn = document.getElementById('open-mobile-menu-btn')!;
      return {
        visibili: vis.map((b) => b.id),
        overflow: bar.scrollWidth > bar.clientWidth + 1,
        // L'icona non era nel set lucide tree-shaken: restava un <i> vuoto
        iconaRenderizzata: !!menuBtn.querySelector('svg'),
        tagResiduo: !!menuBtn.querySelector('i[data-lucide]'),
      };
    });
    expect(r.visibili, 'il menu deve essere in barra').toContain('open-mobile-menu-btn');
    expect(r.visibili, 'le voci secondarie non stanno più in barra').not.toContain('open-stats-btn');
    expect(r.visibili).not.toContain('open-settings-btn');
    expect(r.visibili.length, 'barra essenziale').toBeLessThanOrEqual(3);
    expect(r.overflow, 'la barra non deve traboccare').toBe(false);
    expect(r.iconaRenderizzata, 'icona menu presente (registrata in lucide-init)').toBe(true);
    expect(r.tagResiduo).toBe(false);
  });

  test('ogni voce apre la finestra giusta, e una sola', async ({ page }) => {
    await boot(page);

    for (const [voce, atteso] of Object.entries(ATTESI)) {
      await page.evaluate(() => {
        document.querySelectorAll('.modal-backdrop').forEach((e) => ((e as HTMLElement).style.display = 'none'));
        document.body.classList.remove('modal-open');
      });
      await page.tap('#open-mobile-menu-btn');
      await page.waitForTimeout(250);
      await page.tap('#mobile-menu-list .mm-item[data-opens="' + voce + '"]');
      await page.waitForTimeout(650);

      const aperti = await page.evaluate(() =>
        [...document.querySelectorAll('.modal-backdrop')]
          .filter((e) => getComputedStyle(e as HTMLElement).display !== 'none')
          .map((e) => e.id));

      expect(aperti, voce + ' deve aprire ' + atteso).toEqual([atteso]);
    }
  });

  test('le voci hanno un nome e un bersaglio comodo da toccare', async ({ page }) => {
    await boot(page);
    await page.tap('#open-mobile-menu-btn');
    await expect(page.locator('#mobile-menu-modal')).toBeVisible();

    const voci = await page.evaluate(() =>
      [...document.querySelectorAll('#mobile-menu-list .mm-item')].map((v) => {
        const r = v.getBoundingClientRect();
        return {
          testo: (v as HTMLElement).innerText.trim(),
          h: Math.round(r.height),
          dentro: r.right <= window.innerWidth && r.left >= 0,
        };
      }));

    expect(voci.length).toBe(Object.keys(ATTESI).length);
    for (const v of voci) {
      expect(v.testo.length, 'ogni voce ha un nome — è il motivo del menu').toBeGreaterThan(2);
      expect(v.h, 'bersaglio >= 44px (linee guida tocco)').toBeGreaterThanOrEqual(44);
      expect(v.dentro).toBe(true);
    }
  });

  test('la pallina degli Obiettivi risale fino al menu', async ({ page }) => {
    await boot(page);
    // Il badge si accende solo per un obiettivo CON PREMIO, sbloccato e non
    // riscosso: prenderne uno qualsiasi non basta (la prima stesura di questo
    // test falliva proprio così, e il difetto era nel test).
    const scelto = await page.evaluate(() => {
      const w = window as any;
      const gs = w.EspooClicker.getGameState();
      const dati = w.gameData && w.gameData.achievements;
      const k = Object.keys(gs.achievements).find((k) => dati && dati[k] && dati[k].reward);
      if (!k) return null;
      gs.achievements[k].unlocked = true;
      gs.achievements[k].claimed = false;
      w.updateUI();
      return k;
    });
    expect(scelto, 'serve un obiettivo con premio per accendere il badge').not.toBeNull();
    await page.waitForTimeout(600);

    const r = await page.evaluate(() => ({
      menu: document.getElementById('open-mobile-menu-btn')!.classList.contains('notify-overlay'),
      voce: !!document.querySelector('#mobile-menu-list .mm-item[data-opens="open-achievements-btn"]')
        ?.classList.contains('has-dot'),
    }));
    // Senza questo, con Obiettivi dentro al menu la notifica sparirebbe dalla vista
    expect(r.menu, 'il menu segnala che dentro c-e qualcosa da riscuotere').toBe(true);
    expect(r.voce, 'e la voce dice quale').toBe(true);
  });
});

test.describe('Desktop invariato', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('su desktop il menu non compare e le voci restano in barra', async ({ page }) => {
    await boot(page);
    const r = await page.evaluate(() => {
      const vede = (id: string) => {
        const e = document.getElementById(id);
        return !!e && getComputedStyle(e).display !== 'none';
      };
      return {
        menu: vede('open-mobile-menu-btn'),
        stats: vede('open-stats-btn'), obiettivi: vede('open-achievements-btn'),
        skin: vede('open-skins-btn'), classifica: vede('open-leaderboard-btn'),
        aiuto: vede('open-help-btn'), opzioni: vede('open-settings-btn'),
      };
    });
    expect(r.menu, 'il menu è un ripiego per la barra stretta: su desktop sarebbe un doppione').toBe(false);
    expect(r.stats).toBe(true);
    expect(r.obiettivi).toBe(true);
    expect(r.skin).toBe(true);
    expect(r.classifica).toBe(true);
    expect(r.aiuto).toBe(true);
    expect(r.opzioni).toBe(true);
  });
});
