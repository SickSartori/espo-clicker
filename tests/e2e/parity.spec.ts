import { test, expect } from '@playwright/test';
import { bootGame, seedRichState } from './helpers';

/**
 * Parità V3 ↔ legacy — la rete di sicurezza dello strangler.
 *
 * Per ogni funzione delegata (game-logic.js / ui-functions.js) la dispatch è
 * `window.EspoV3?.x ?? legacy`. Qui chiamiamo la STESSA funzione due volte —
 * una con EspoV3 attivo, una con `window.EspoV3 = null` (forza il fallback
 * legacy) — sullo STESSO gameState, e pretendiamo output identico.
 *
 * Se una fetta introduce un drift, un probe diventa rosso indicando la funzione.
 * Vale finché il legacy esiste (fino a F7): blinda F0-F6 prima dello smontaggio.
 */
test.describe('Parità V3 vs legacy', () => {
  test('tutte le funzioni delegate danno lo stesso output', async ({ page }) => {
    await bootGame(page);
    await seedRichState(page);

    const results = await page.evaluate(() => {
      const w = window as any;
      const bak = w.EspoV3;
      const results: Array<{ name: string; v3: string; legacy: string; ok: boolean }> = [];

      // Esegue `fn` con V3 acceso poi spento, confronta le due stringhe.
      const cmp = (name: string, fn: () => unknown) => {
        w.EspoV3 = bak;
        const v3 = String(fn());
        w.EspoV3 = null;
        const legacy = String(fn());
        w.EspoV3 = bak;
        results.push({ name, v3, legacy, ok: v3 === legacy });
      };

      // Reset della cache 150ms del visualBPS così ogni lato ricalcola davvero.
      const cmpVisualBps = () => {
        const run = () => { w._cachedVisualBPS = null; w._lastVisualBPSCalc = 0; return w.calculateVisualBPS(); };
        cmp('calculateVisualBPS', run);
      };

      // Snapshot DOM per le funzioni che scrivono classi/titolo invece di ritornare.
      const domSnapshot = () => JSON.stringify({
        tabClick: document.getElementById('tab-click')?.className,
        tabAuto: document.getElementById('tab-auto')?.className,
        tabPrestige: document.getElementById('tab-prestige')?.className,
        tabQuantum: document.getElementById('tab-quantum')?.style.display,
        achBtn: document.getElementById('open-achievements-btn')?.className,
        title: document.title,
      });
      const cmpDom = (name: string, fn: () => void) => {
        w.EspoV3 = bak; fn(); const v3 = domSnapshot();
        w.EspoV3 = null; fn(); const legacy = domSnapshot();
        w.EspoV3 = bak; fn();
        results.push({ name, v3, legacy, ok: v3 === legacy });
      };

      const gd = w.gameData;
      const firstTeam = Object.keys(gd.teams)[0];
      const firstUpgrade = Object.keys(gd.prestigeUpgrades)[0];

      // --- Economia (F6.1 / F6.2) ---
      cmp('getPrestigeThreshold', () => w.getPrestigeThreshold());
      cmp('calculateClickValue', () => w.calculateClickValue());
      cmp('calculateRawClickValue', () => w.calculateRawClickValue());
      cmp('recalculateCPS→bps', () => { w.recalculateCPS(); return w.bps; });
      cmp('calculatePrestigeBonus→prestigeBonus', () => { w.calculatePrestigeBonus(); return w.prestigeBonus; });
      cmp('calculatePrestigeUpgradeCost', () => w.calculatePrestigeUpgradeCost(firstUpgrade));
      cmp('calculateBulkCost(1)', () => w.calculateBulkCost(firstTeam, 1));
      cmp('calculateBulkCost(25)', () => w.calculateBulkCost(firstTeam, 25));
      cmp('calculateMaxAffordable', () => w.calculateMaxAffordable(firstTeam));
      // Costo di ogni upgrade prestigio (counted e non): copre tutti i rami.
      for (const key of Object.keys(gd.prestigeUpgrades)) {
        cmp('cost:' + key, () => w.calculatePrestigeUpgradeCost(key));
      }

      // --- Prestigio (F6.3) ---
      cmp('calculatePrestigeGained', () => w.calculatePrestigeGained());

      // --- Formattazione numeri/tempo (F5.1 / F5.3) ---
      for (const v of ['0', '999', '1234', '1500000', '2.5e9', '9.99995e100', '1e309']) {
        cmp('formatNumber(' + v + ')', () => w.formatNumber(new w.Decimal(v)));
      }
      cmp('formatFullNumber', () => w.formatFullNumber(new w.Decimal('1234567')));
      cmp('formatTime', () => w.formatTime(90061));

      // --- Regole progressione (F5.4): scrivono DOM ---
      cmpVisualBps();
      cmpDom('checkTabNotifications', () => w.checkTabNotifications());
      cmpDom('updateTabsVisibility', () => w.updateTabsVisibility());
      cmpDom('checkOverlayNotifications', () => w.checkOverlayNotifications());

      // Ripristina i global canonici in modalità V3.
      w.EspoV3 = bak;
      if (typeof w.calculatePrestigeBonus === 'function') w.calculatePrestigeBonus();
      if (typeof w.recalculateCPS === 'function') w.recalculateCPS();

      return results;
    });

    // Diagnostica leggibile: elenca solo i mismatch.
    const mismatches = results.filter((r) => !r.ok);
    expect(
      mismatches,
      `Mismatch V3↔legacy:\n${mismatches.map((m) => `  ${m.name}: v3=${m.v3} | legacy=${m.legacy}`).join('\n')}`,
    ).toEqual([]);

    // Sanity: abbiamo davvero esercitato un buon numero di funzioni.
    expect(results.length).toBeGreaterThan(20);
    console.log(`Parità: ${results.length} probe, 0 mismatch`);
  });
});
