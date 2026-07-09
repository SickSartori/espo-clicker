import { test, expect } from '@playwright/test';
import { bootGame, seedRichState } from './helpers';

/**
 * Integrazione end-to-end sui percorsi che la parità pura NON copre:
 *  - il round-trip di salvataggio REALE (saveGame → IndexedDB via EspoV3.save →
 *    reload → loadGame ricostruisce lo stato). Prova F1/F3a nel percorso vero.
 *  - il click REALE sul bug (handler resolveBug bound su #clicker-btn), non la
 *    funzione pura: conta il click e accredita lo score.
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
});
