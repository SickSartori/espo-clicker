import { test, expect } from '@playwright/test';
import { bootGame, seedRichState } from './helpers';

/**
 * Smoke comportamentali — verificano AZIONI reali sullo stato, non la parità.
 * A differenza di parity.spec (che muore con la rimozione del legacy in F7),
 * questi restano validi dopo: descrivono cosa il gioco DEVE fare.
 */
test.describe('Smoke gameplay', () => {
  test('acquisto team: score scende del costo, conteggio sale', async ({ page }) => {
    await bootGame(page);
    await seedRichState(page);

    const r = await page.evaluate(() => {
      const w = window as any;
      const gs = w.EspooClicker.getGameState();
      const team = Object.keys(w.gameData.teams)[0];

      w.buyMultiplier = 1;
      const before = { score: new w.Decimal(gs.score), count: gs.teams[team].count };
      const cost = w.calculateBulkCost(team, 1);
      w.buyTeam(team);
      const after = { score: new w.Decimal(gs.score), count: gs.teams[team].count };

      return {
        team,
        costStr: String(cost),
        countBefore: before.count,
        countAfter: after.count,
        // score_before - score_after deve == cost
        spent: String(before.score.sub(after.score)),
      };
    });

    expect(r.countAfter).toBe(r.countBefore + 1);
    expect(r.spent).toBe(r.costStr);
  });

  test('promozione: gained > 0 sopra soglia, = 0 sotto', async ({ page }) => {
    await bootGame(page);
    await seedRichState(page);

    const r = await page.evaluate(() => {
      const w = window as any;
      const gs = w.EspooClicker.getGameState();

      // La soglia scala coi reset (50M × 3^resets): la derivo invece di
      // assumerla, così il test è robusto a qualunque seedRichState.
      const threshold = w.getPrestigeThreshold();
      gs.totalScore = new w.Decimal(threshold).mul(2); // sopra soglia
      const above = String(w.calculatePrestigeGained());

      gs.totalScore = new w.Decimal(threshold).div(2); // sotto soglia
      const below = String(w.calculatePrestigeGained());

      return { above, below };
    });

    expect(Number(r.below)).toBe(0);
    expect(Number(r.above)).toBeGreaterThan(0);
  });

  test('golden bug: reward positivo e frenzy attiva il buff', async ({ page }) => {
    await bootGame(page);
    await seedRichState(page);

    const r = await page.evaluate(() => {
      const w = window as any;
      const D = w.Decimal;
      const E = w.EspoV3.events;
      const bps = w.EspoV3.state.store.bps;
      const click = w.calculateClickValue();

      const std = E.goldenBugReward(D, { bps, clickValue: click, globalMult: 1, bugType: 'standard' });
      const lucky = E.goldenBugReward(D, { bps, clickValue: click, globalMult: 1, bugType: 'lucky' });
      const frenzy = E.goldenBugReward(D, { bps, clickValue: click, globalMult: 1, bugType: 'frenzy' });

      return {
        stdPos: new D(std.bonus).gt(0),
        luckyBigger: new D(lucky.bonus).gt(new D(std.bonus)),
        frenzyBuff: frenzy.frenzy && frenzy.frenzy.mult === 7 && frenzy.frenzy.durationMs === 15000,
      };
    });

    expect(r.stdPos).toBe(true);
    expect(r.luckyBigger).toBe(true);
    expect(r.frenzyBuff).toBe(true);
  });

  test('bonus giornaliero: reward scala con lo streak', async ({ page }) => {
    await bootGame(page);
    await seedRichState(page);

    const r = await page.evaluate(() => {
      const w = window as any;
      const D = w.Decimal;
      const E = w.EspoV3.events;
      const gs = w.EspooClicker.getGameState();
      const day = (s: number) => Number(E.dailyReward(D, { bps: w.EspoV3.state.store.bps, baseClickValue: gs.baseClickValue, streak: s }));
      return { s1: day(1), s5: day(5), s7: day(7), s20: day(20) };
    });

    // Cresce fino al cap di 7 giorni, poi si appiattisce.
    expect(r.s5).toBeGreaterThan(r.s1);
    expect(r.s7).toBeGreaterThan(r.s5);
    expect(r.s20).toBe(r.s7); // cap: streak 20 == streak 7
  });
});
