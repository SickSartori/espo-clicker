import { test, expect } from '@playwright/test';
import { bootGame, seedRichState } from './helpers';

/**
 * Integrazione end-to-end sui percorsi che la parità pura NON copre:
 *  - il round-trip di salvataggio REALE (saveGame → IndexedDB via EspoV3.save →
 *    reload → loadGame ricostruisce lo stato). Prova F1/F3a nel percorso vero.
 *  - il click REALE sul bug (handler resolveBug bound su #clicker-btn), non la
 *    funzione pura: conta il click e accredita lo score.
 *  - i percorsi UI delegati (format/i18n/theme/toast/rules) col SOLO ramo V3
 *    (EspoV3 attivo): è la rete che sostituisce parity.spec quando la F8 rimuove
 *    i fallback legacy — parity confronta V3 vs legacy, questo verifica che il
 *    ramo V3 da solo produca l'output atteso.
 */
test.describe('Integrazione gameplay', () => {
  test('round-trip salvataggio: stato persiste dopo reload (via EspoV3.save)', async ({ page }) => {
    await bootGame(page);
    await seedRichState(page);

    // Marcatori distintivi su campi STABILI (il game-loop non li tocca: cambiano
    // solo con azioni esplicite). Poi salvataggio reale, con spia sulla write V3.
    const saved = await page.evaluate(async () => {
      const w = window as any;
      const gs = w.EspooClicker.getGameState();
      gs.totalClicks = 91237;
      gs.totalResets = 4;
      if (gs.teams && gs.teams.assistenteQa) gs.teams.assistenteQa.count = 63;
      gs.prestigePoints = new w.Decimal('7777');

      // Spia: conferma che il salvataggio passa dalla write di EspoV3 (F1/F3a).
      let v3writes = 0;
      const db = w.EspoV3.save.db;
      const origWrite = db.write.bind(db);
      db.write = (p: string) => { v3writes++; return origWrite(p); };
      try {
        await w.EspooClicker.saveGame();
      } finally {
        db.write = origWrite;
      }
      return { v3writes };
    });

    expect(saved.v3writes).toBeGreaterThan(0); // il save è passato da EspoV3

    // Reload completo: nuova pagina, nuovo boot, loadGame legge da IndexedDB.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => {
        const w = window as any;
        return (
          !!w.EspooClicker &&
          !!w.EspooClicker.getGameState() &&
          w.EspooClicker.getGameState().totalClicks === 91237
        );
      },
      undefined,
      { timeout: 15_000 },
    );

    const loaded = await page.evaluate(() => {
      const w = window as any;
      const gs = w.EspooClicker.getGameState();
      return {
        totalClicks: gs.totalClicks,
        totalResets: gs.totalResets,
        assistenteQa: gs.teams?.assistenteQa?.count,
        prestigePoints: String(gs.prestigePoints),
      };
    });

    // I valori sopravvivono al giro save→reload→load.
    expect(loaded.totalClicks).toBe(91237);
    expect(loaded.totalResets).toBe(4);
    expect(loaded.assistenteQa).toBe(63);
    expect(loaded.prestigePoints).toBe('7777');
  });

  test('click reale sul bug: incrementa totalClicks e accredita score', async ({ page }) => {
    await bootGame(page);
    await seedRichState(page);

    // Attende il boot completo: lo scheduler avviato (F3b) implica che
    // initializeGame ha agganciato il handler di #clicker-btn.
    await page.waitForFunction(
      () => !!(window as any)._espoScheduler && !!document.getElementById('clicker-btn'),
      undefined,
      { timeout: 15_000 },
    );

    const r = await page.evaluate(() => {
      const w = window as any;
      const gs = w.EspooClicker.getGameState();
      const btn = document.getElementById('clicker-btn')!;

      // Tutto sincrono in un solo evaluate → il game-loop (rAF) non si intromette
      // tra prima/dopo, così il delta di score è esattamente il contributo del click.
      const beforeClicks = gs.totalClicks;
      const beforeScore = new w.Decimal(gs.score);

      // MouseEvent con detail:1: supera il guard anti-autoclicker (detail===0 &&
      // !isTrusted) e attiva il VERO handler bound → resolveBug.
      btn.dispatchEvent(new MouseEvent('click', { detail: 1, bubbles: true }));

      const afterClicks = gs.totalClicks;
      const afterScore = new w.Decimal(gs.score);
      return {
        clickCounted: afterClicks === beforeClicks + 1,
        scoreIncreased: afterScore.gt(beforeScore),
        gained: afterScore.sub(beforeScore).toString(),
      };
    });

    expect(r.clickCounted).toBe(true);
    expect(r.scoreIncreased).toBe(true);
    expect(Number(r.gained)).toBeGreaterThan(0);
  });

  test('percorsi UI delegati (format/i18n/theme/toast/rules) reggono col solo ramo V3', async ({ page }) => {
    await bootGame(page);
    await seedRichState(page);
    // Lo scheduler agganciato implica che i tab/overlay esistono nel DOM.
    await page.waitForFunction(
      () => !!document.getElementById('tab-click') && !!document.getElementById('toast-container'),
      undefined,
      { timeout: 15_000 },
    );

    const r = await page.evaluate(() => {
      const w = window as any;
      const D = w.Decimal;
      const out: Record<string, unknown> = {};

      // --- format (F5.1 / F5.3) — output esatto già blindato da parity ---
      out.fmt999 = w.formatNumber(new D('999'));
      out.fmt15M = String(w.formatNumber(new D('1500000')));
      out.fmtFull = w.formatFullNumber(new D('1234567'));
      out.fmtTime = w.formatTime(90061);
      out.fmtTimeShort = w.formatTime(1);

      // --- i18n (F4): il merge deve mutare i testi e non lanciare ---
      let i18nThrew = false, i18nChanged = false;
      try {
        const it0 = JSON.stringify(w.gameData.texts);
        w.applyLanguage('en');
        const en = JSON.stringify(w.gameData.texts);
        w.applyLanguage('it'); // ripristina la lingua base per i probe DOM sotto
        i18nChanged = en !== it0;
      } catch (_) { i18nThrew = true; }
      out.i18nThrew = i18nThrew;
      out.i18nChanged = i18nChanged;

      // --- theme (F5.2): un tema non ancora caricato inietta un <link> ---
      const sel = 'link[href*="christmas-theme.css"]';
      const themeBefore = document.querySelectorAll(sel).length;
      w.loadThemeCSS('christmas-theme.css');
      out.themeInjected = document.querySelectorAll(sel).length > themeBefore;

      // --- toast (F5.2): compare un .toast nel container (canShow = utente loggato) ---
      const toastBefore = document.querySelectorAll('#toast-container .toast').length;
      w.showToast('E2E integration', 'info', 500);
      out.toastAdded = document.querySelectorAll('#toast-container .toast').length > toastBefore;

      // --- rules DOM (F5.4): girano senza lanciare e lasciano il DOM sano ---
      let rulesThrew = false;
      try {
        w.checkTabNotifications();
        w.updateTabsVisibility();
        w.checkOverlayNotifications();
      } catch (_) { rulesThrew = true; }
      out.rulesOk = !rulesThrew;
      out.tabClickClass = document.getElementById('tab-click')?.className ?? null;

      return out;
    });

    // format: valori esatti (parity li garantiva V3==legacy)
    expect(r.fmt999).toBe('999');
    expect(r.fmt15M).toContain('M');
    expect(r.fmt15M).toContain('1,50');
    expect(r.fmtFull).toBe('1.234.567');
    expect(typeof r.fmtTime).toBe('string');
    expect((r.fmtTime as string).length).toBeGreaterThan(0);
    expect(r.fmtTime).not.toBe(r.fmtTimeShort);
    // i18n
    expect(r.i18nThrew).toBe(false);
    expect(r.i18nChanged).toBe(true);
    // theme + toast
    expect(r.themeInjected).toBe(true);
    expect(r.toastAdded).toBe(true);
    // rules DOM
    expect(r.rulesOk).toBe(true);
    expect(typeof r.tabClickClass).toBe('string');
  });

  test('interop stato (filone A): window.* e EspoV3.state.store sono lo stesso stato', async ({ page }) => {
    await bootGame(page);

    const r = await page.evaluate(() => {
      const w = window as any;
      const store = w.EspoV3.state && w.EspoV3.state.store;
      if (!store) return { hasStore: false };

      // Identità: il legacy ha già scritto gameState/bps al boot → stessa referenza.
      const identity = w.gameState === store.gameState && w.bps === store.bps;

      // Scrittura stile legacy (assegnazione bare) → visibile nello store…
      const prevBps = store.bps;
      w.bps = new w.Decimal('12345');
      const legacyWrite = String(store.bps) === '12345';
      // …e scrittura lato store → visibile dal legacy.
      store.bps = new w.Decimal('67890');
      const storeWrite = String(w.bps) === '67890';
      w.bps = prevBps; // ripristino

      const desc = Object.getOwnPropertyDescriptor(w, 'bps');
      return {
        hasStore: true, identity, legacyWrite, storeWrite,
        accessor: typeof (desc && desc.get) === 'function',
      };
    });

    expect(r.hasStore, 'EspoV3.state.store assente').toBe(true);
    expect(r.identity).toBe(true);
    expect(r.legacyWrite).toBe(true);
    expect(r.storeWrite).toBe(true);
    expect(r.accessor).toBe(true);
  });
});
