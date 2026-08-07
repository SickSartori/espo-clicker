import { test, expect } from '@playwright/test';
import { bootGame, seedRichState } from './helpers';

/**
 * Bilanciamenti 3.1 — le due segnalazioni sulla progressione.
 *
 * 1. Q-bit della Formattazione calcolati sul saldo token SPENDIBILE: comprare
 *    nel negozio Promozione — cioè usare i token per quello che servono —
 *    tagliava la ricompensa promessa.
 * 2. Bug Bounty senza tetto: il Ticket Critico paga `bps×30`, quindi il
 *    moltiplicatore cresceva finché c'erano token da spendere.
 */

test.describe('Bilanciamento', () => {
  test('i Q-bit promessi non calano spendendo i token', async ({ page }) => {
    await bootGame(page);
    await seedRichState(page);

    const r = await page.evaluate(() => {
      const w = window as any;
      const D = w.Decimal;
      const gs = w.EspooClicker.getGameState();
      const qbit = () => (document.getElementById('format-gain-qbit') || {} as any).textContent;

      gs.totalResets = 20;                          // formattazione sbloccata
      gs.lifetimePrestigePoints = new D('1000000'); // token guadagnati nel ciclo
      gs.prestigePoints = new D('1000000');         // ancora tutti in tasca

      w.renderPrestigeHubCards();
      const pieno = qbit();

      // Stessa partita, dopo aver speso quasi tutto nel negozio Promozione.
      // Prima qui il numero crollava (era la segnalazione: 10 → 3).
      gs.prestigePoints = new D('1000');
      w.renderPrestigeHubCards();
      const speso = qbit();

      // E quello che si incassa davvero deve coincidere con l'anteprima.
      const incassati = String(w.EspoV3.prestige.formatQbitsEarned(D, gs.lifetimePrestigePoints));

      return { pieno, speso, incassati };
    });

    expect(r.pieno).toBe('+11');   // 1 + sqrt(1e6 / 1e4) = 1 + 10
    expect(r.speso).toBe(r.pieno);
    expect(r.incassati).toBe('11');
  });

  test('Bug Bounty si ferma a 10 livelli e vale +10% ciascuno', async ({ page }) => {
    await bootGame(page);
    await seedRichState(page);

    const r = await page.evaluate(() => {
      const w = window as any;
      const D = w.Decimal;
      const gs = w.EspooClicker.getGameState();

      gs.prestigePoints = new D('1e12');   // token a volontà: il limite dev'essere il tetto
      for (let i = 0; i < 15; i++) w.buyPrestigeUpgrade('bugBounty');

      const count = gs.prestigeUpgrades.bugBounty.count;
      const tokenPrimaDelRifiuto = String(gs.prestigePoints);
      w.buyPrestigeUpgrade('bugBounty');   // oltre il tetto: non deve costare nulla

      return {
        count,
        mult: String(w.goldenBugMult),
        maxLevel: w.gameData.prestigeUpgrades.bugBounty.maxLevel,
        tokenInvariati: String(gs.prestigePoints) === tokenPrimaDelRifiuto,
      };
    });

    expect(r.maxLevel).toBe(10);
    expect(r.count).toBe(10);
    // 1 + 0.1×10. Prima erano +20% senza tetto: a 15 acquisti faceva 4.0, e
    // continuava a salire.
    expect(Number(r.mult)).toBeCloseTo(2, 6);
    // Il tetto era rispettato solo dalla UI: la funzione scalava i token comunque.
    expect(r.tokenInvariati).toBe(true);
  });
});
