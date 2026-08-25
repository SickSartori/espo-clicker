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

  test('il logo sta al centro e non finisce sotto ai pulsanti', async ({ page }) => {
    await boot(page);

    const misura = () => {
      const bar = document.getElementById('game-navbar')!;
      const logo = document.getElementById('navbar-logo')!;
      const rb = bar.getBoundingClientRect();
      const rl = logo.getBoundingClientRect();
      const vis = [...bar.querySelectorAll('button')].filter((b) => getComputedStyle(b).display !== 'none');
      return {
        barraLarga: Math.round(rb.width),
        // scarto fra il centro del logo e il centro della barra
        scarto: Math.abs(Math.round(((rl.left + rl.right) / 2) - ((rb.left + rb.right) / 2))),
        visibile: getComputedStyle(logo).display !== 'none',
        // decorativo: non deve intercettare i tocchi
        tocchi: getComputedStyle(logo).pointerEvents,
        collide: vis.filter((b) => {
          const r = b.getBoundingClientRect();
          return !(r.right <= rl.left || r.left >= rl.right);
        }).map((b) => b.id),
      };
    };

    // Stato iniziale: Promozione ancora bloccata
    const presto = await page.evaluate(misura);
    // La barra è `position: fixed; width:100%`: se qualcuno le desse
    // `position: relative` collasserebbe a larghezza-contenuto (successo:
    // 192px invece di 375) e i pulsanti si ammasserebbero a sinistra.
    expect(presto.barraLarga, 'la barra deve occupare tutta la larghezza').toBeGreaterThan(360);
    expect(presto.visibile).toBe(true);
    expect(presto.tocchi, 'il logo è decorativo, non un bersaglio').toBe('none');
    expect(presto.scarto, 'logo centrato').toBeLessThanOrEqual(2);
    expect(presto.collide).toEqual([]);

    // Promozione sbloccata: è il caso in cui il centro era occupato
    await page.evaluate(() => {
      const w = window as any;
      w.EspooClicker.getGameState().totalResets = 3;
      w.updateUI();
    });
    await page.waitForTimeout(600);

    const tardi = await page.evaluate(misura);
    expect(tardi.scarto, 'centrato anche con Promozione in barra').toBeLessThanOrEqual(2);
    expect(tardi.collide, 'Promozione non deve finire sopra al logo').toEqual([]);
  });

  test('Obiettivi: la percentuale di avanzamento si legge tutta', async ({ page }) => {
    // La regola mobile di .t-prog-text mette `inset: 0` ma la regola base
    // porta `width: 140%` + `transform: translateX(-50%)` (centratura desktop
    // su left:50%). Se non si azzerano, l'etichetta sborda di ~225px e il
    // contenitore (overflow:hidden) ne taglia la testa: di "60% (3 / 5)" si
    // legge solo "3 / 5)".
    await boot(page);
    await page.evaluate(() => {
      const w = window as any;
      const gs = w.EspooClicker.getGameState();
      gs.totalClicks = 5000;
      if (gs.skins) gs.skins.unlocked = ['default', 'espo3', 'espobit'];
      w.updateUI();
    });
    await page.waitForTimeout(800);
    await page.evaluate(() => (document.getElementById('open-achievements-btn') as HTMLElement).click());
    await page.waitForTimeout(700);

    const etichette = await page.evaluate(() =>
      [...document.querySelectorAll('#achievement-list .t-prog-text')].map((e) => {
        const el = e as HTMLElement;
        const p = el.parentElement!;
        const r = el.getBoundingClientRect();
        const rp = p.getBoundingClientRect();
        return {
          testo: (el.textContent || '').trim(),
          fuori: Math.round(Math.max(0, rp.left - r.left, r.right - rp.right)),
        };
      }));

    expect(etichette.length, 'servono obiettivi con barra di avanzamento').toBeGreaterThan(0);
    for (const e of etichette) {
      expect(e.fuori, `"${e.testo}" sborda dalla barra`).toBe(0);
      // La percentuale iniziale non deve finire fuori dall'area visibile
      expect(e.testo, 'il testo deve iniziare con la percentuale').toMatch(/^\d/);
    }
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

test.describe('Finestre mobile: schermo pieno uniforme', () => {
  // Senza questa riga il blocco gira a viewport DESKTOP, dove le finestre non
  // sono (giustamente) a schermo pieno: il test fallirebbe accusando il codice
  // di un difetto che non ha.
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

  test('nessuna finestra fa eccezione alla regola dello schermo pieno', async ({ page }) => {
    // Il Guardaroba era l'unica a restare 356x731 dentro uno schermo 375x812:
    // `.skins-modal-v3` dichiara `max-height: 90vh !important` e
    // `border-radius: 8px !important` SENZA media query, quindi valevano anche
    // su telefono e battevano la regola generale `height: 100dvh`.
    await boot(page);
    await page.evaluate(() => {
      const w = window as any;
      const gs = w.EspooClicker.getGameState();
      gs.seenFeedbackIntro = true; w.shouldShowFeedbackIntro = false;
      gs.totalResets = 3;
      if (gs.skins) gs.skins.unlocked = ['default', 'espo3', 'espobit'];
      w.updateUI();
    });
    await page.waitForTimeout(700);

    const APRI: Record<string, string> = {
      'achievements-modal': 'open-achievements-btn',
      'skins-modal': 'open-skins-btn',
      'leaderboard-modal': 'open-leaderboard-btn',
      'stats-modal': 'open-stats-btn',
      'settings-modal': 'open-settings-btn',
      'help-modal': 'open-help-btn',
      'prestige-hub-modal': 'open-prestige-hub-btn',
      'user-hub-modal': 'open-user-hub-btn',
    };

    const parziali: string[] = [];
    for (const [id, btn] of Object.entries(APRI)) {
      await page.evaluate((b) => (document.getElementById(b) as HTMLElement).click(), btn);
      await page.waitForTimeout(500);
      const pieno = await page.evaluate((mid) => {
        const c = document.querySelector('#' + mid + ' .modal-content') as HTMLElement;
        const r = c.getBoundingClientRect();
        return Math.round(r.width) >= window.innerWidth - 1 && Math.round(r.height) >= window.innerHeight - 1;
      }, id);
      if (!pieno) parziali.push(id);
      await page.evaluate(() => {
        document.querySelectorAll('.modal-backdrop').forEach((e) => ((e as HTMLElement).style.display = 'none'));
        document.body.classList.remove('modal-open');
      });
      await page.waitForTimeout(200);
    }

    expect(parziali, 'finestre non a schermo pieno').toEqual([]);
  });

  // Schermo LARGO: e' il caso che aveva fatto passare inosservato il difetto.
  // Configurazione e Menu portano il tetto in uno style inline (400/420px):
  // sotto i 400px di viewport quel tetto non morde e tutto sembra a posto,
  // sopra restano strisce di gioco visibili ai lati.
  test.describe('anche su schermo largo', () => {
    test.use({ viewport: { width: 430, height: 932 }, hasTouch: true, isMobile: true });

    test("nessuna finestra resta piu' stretta del viewport a 430x932", async ({ page }) => {
      await boot(page);
      await page.evaluate(() => {
        const w = window as any;
        const gs = w.EspooClicker.getGameState();
        gs.seenFeedbackIntro = true; w.shouldShowFeedbackIntro = false;
        gs.totalResets = 3;
        w.updateUI();
      });
      await page.waitForTimeout(600);

      const APRI: Record<string, string> = {
        'settings-modal': 'open-settings-btn',
        'user-hub-modal': 'open-user-hub-btn',
        'achievements-modal': 'open-achievements-btn',
        'skins-modal': 'open-skins-btn',
        'help-modal': 'open-help-btn',
      };
      const stretti: string[] = [];
      for (const [id, btn] of Object.entries(APRI)) {
        await page.evaluate((b) => (document.getElementById(b) as HTMLElement).click(), btn);
        await page.waitForTimeout(450);
        const largo = await page.evaluate((mid) => {
          const c = document.querySelector('#' + mid + ' .modal-content') as HTMLElement;
          return Math.round(c.getBoundingClientRect().width) >= window.innerWidth - 1;
        }, id);
        if (!largo) stretti.push(id);
        await page.evaluate(() => {
          document.querySelectorAll('.modal-backdrop').forEach((e) => ((e as HTMLElement).style.display = 'none'));
          document.body.classList.remove('modal-open');
        });
        await page.waitForTimeout(180);
      }

      // Il menu mobile ha il proprio fondale: si apre a parte
      await page.evaluate(() => (document.getElementById('open-mobile-menu-btn') as HTMLElement).click());
      await page.waitForTimeout(450);
      const menuLargo = await page.evaluate(() => {
        const c = document.querySelector('#mobile-menu-modal .modal-content, #mobile-menu-modal .mm-sheet') as HTMLElement;
        return Math.round(c.getBoundingClientRect().width) >= window.innerWidth - 1;
      });
      if (!menuLargo) stretti.push('mobile-menu-modal');

      expect(stretti, "finestre piu' strette del viewport").toEqual([]);
    });
  });
});
