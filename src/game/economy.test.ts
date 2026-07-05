import { describe, it, expect } from 'vitest';
import Decimal from 'break_eternity.js';
import {
  applyBonusSoftcap,
  computePrestigeBonus,
  computeBps,
  computeClickValue,
  computeRawClickValue,
  prestigeUpgradeCost,
  prestigeThreshold,
  teamBulkCost,
  maxAffordableTeams,
  milestoneReached,
  type DecimalCtor,
} from './economy';

// break_eternity soddisfa strutturalmente l'interfaccia Big
const D = Decimal as unknown as DecimalCtor;

// Costanti di bilanciamento reali (game-logic.js)
const KNEE = 80;
const COEFF = 0.6;

describe('applyBonusSoftcap', () => {
  it('sotto il ginocchio → identità', () => {
    expect(applyBonusSoftcap(D, new D(50), KNEE, COEFF).toString()).toBe('50');
    expect(applyBonusSoftcap(D, new D(80), KNEE, COEFF).toString()).toBe('80');
  });

  it('sopra il ginocchio → 80 + 0.6*sqrt(eccesso)', () => {
    // x=180 → eccesso 100 → 80 + 0.6*10 = 86
    expect(Number(applyBonusSoftcap(D, new D(180), KNEE, COEFF).toString())).toBeCloseTo(86);
  });
});

describe('computePrestigeBonus', () => {
  const base = { synergyFactor: 0, achievementsBonus: 0, softcapKnee: KNEE, softcapCoeff: COEFF };

  it('1% per punto lifetime + 1 di base', () => {
    // lifetime 200 → raw 2 → sotto knee → 1 + 2 = 3
    const b = computePrestigeBonus(D, { ...base, lifetimePrestigePoints: 200 });
    expect(Number(b.toString())).toBeCloseTo(3);
  });

  it('sinergia moltiplica il lifetime', () => {
    // lifetime 100: base 1 + sinergia 0.05*100=5 → raw 6 → bonus 7
    const b = computePrestigeBonus(D, { ...base, lifetimePrestigePoints: 100, synergyFactor: 0.05 });
    expect(Number(b.toString())).toBeCloseTo(7);
  });

  it('softcap sopra il ginocchio', () => {
    // lifetime 18000 → raw 180 → softcap 86 → bonus 87
    const b = computePrestigeBonus(D, { ...base, lifetimePrestigePoints: 18000 });
    expect(Number(b.toString())).toBeCloseTo(87);
  });
});

describe('computeBps', () => {
  it('somma team × count con potenziamenti in ordine', () => {
    const bps = computeBps(D, [
      { cpsPerUnit: 1, count: 10, multipliers: [2, 3] }, // 1*2*3*10 = 60
      { cpsPerUnit: 5, count: 2, multipliers: [] },      // 10
    ], 0, [1, 1, 1, 1]);
    expect(Number(bps.toString())).toBeCloseTo(70);
  });

  it('bonus auto-click QA sommato PRIMA dei moltiplicatori globali', () => {
    // (10 + 5) * 2 = 30 — il bonus scala coi moltiplicatori come i team
    const bps = computeBps(D, [{ cpsPerUnit: 1, count: 10, multipliers: [] }], 5, [2]);
    expect(Number(bps.toString())).toBeCloseTo(30);
  });

  it('moltiplicatori globali applicati in sequenza', () => {
    const bps = computeBps(D, [{ cpsPerUnit: 1, count: 1, multipliers: [] }], 0, [2, 3, 5, 7]);
    expect(Number(bps.toString())).toBeCloseTo(210);
  });

  it('nessun team → 0', () => {
    expect(computeBps(D, [], 0, [2, 3]).toString()).toBe('0');
  });
});

describe('computeClickValue / computeRawClickValue', () => {
  const base = {
    baseClickValue: 10, clickGlobalMult: 2, prestigeBonus: 3,
    bluescreenMultiplier: 1, crunchTimeMultiplier: 1,
    bionicHand: false, divineClick: false, bps: '1000',
    goldenFrenzyActive: false, goldenFrenzyMult: 1,
  };

  it('catena moltiplicatori base', () => {
    expect(Number(computeClickValue(D, base).toString())).toBeCloseTo(60);
  });

  it('mano bionica: +1% bps (divine: +2%)', () => {
    expect(Number(computeClickValue(D, { ...base, bionicHand: true }).toString())).toBeCloseTo(70);
    expect(Number(computeClickValue(D, { ...base, bionicHand: true, divineClick: true }).toString())).toBeCloseTo(80);
  });

  it('golden frenzy moltiplica alla fine', () => {
    const v = computeClickValue(D, { ...base, goldenFrenzyActive: true, goldenFrenzyMult: 7 });
    expect(Number(v.toString())).toBeCloseTo(420);
  });

  it('raw: solo base × globale (+ bionica), niente prestigio/eventi', () => {
    expect(Number(computeRawClickValue(D, { baseClickValue: 10, clickGlobalMult: 2, bionicHand: false, divineClick: false, bps: 0 }).toString())).toBeCloseTo(20);
    expect(Number(computeRawClickValue(D, { baseClickValue: 10, clickGlobalMult: 2, bionicHand: true, divineClick: false, bps: '1000' }).toString())).toBeCloseTo(30);
  });
});

describe('prestigeUpgradeCost', () => {
  it('non-counted → costo base secco', () => {
    expect(prestigeUpgradeCost(D, { isCounted: false, baseCost: 5, count: 99, qDiscount: true }).toString()).toBe('5');
  });

  it('counted: base × 1.5^livello, floor sotto 100', () => {
    // 10 * 1.5^2 = 22.5 → floor 22
    expect(prestigeUpgradeCost(D, { isCounted: true, baseCost: 10, count: 2, qDiscount: false }).toString()).toBe('22');
  });

  it('≥100 → 3 cifre significative', () => {
    // 100 * 1.5^3 = 337.5 → toPrecision(3) = 338 (o 3.38e2)
    const c = prestigeUpgradeCost(D, { isCounted: true, baseCost: 100, count: 3, qDiscount: false });
    expect(Number(c.toString())).toBeCloseTo(338, 0);
  });

  it('sconto quantico 15%', () => {
    // 10 * 1.5^2 * 0.85 = 19.125 → floor 19
    expect(prestigeUpgradeCost(D, { isCounted: true, baseCost: 10, count: 2, qDiscount: true }).toString()).toBe('19');
  });
});

describe('teamBulkCost', () => {
  const base = { baseCost: 100, count: 0, r: 1.05, outsourcingLevel: 0 };

  it('singola unità: base × r^count, floored, min 1', () => {
    expect(teamBulkCost(D, base, 1).toString()).toBe('100');
    // count 10 → 100 × 1.05^10 = 162.88 → floor 162
    expect(teamBulkCost(D, { ...base, count: 10 }, 1).toString()).toBe('162');
  });

  it('sconto outsourcing: -5%/livello, cap -25%', () => {
    // lvl 2 → ×0.90 → 90
    expect(teamBulkCost(D, { ...base, outsourcingLevel: 2 }, 1).toString()).toBe('90');
    // lvl 10 → cap 0.75 → 75
    expect(teamBulkCost(D, { ...base, outsourcingLevel: 10 }, 1).toString()).toBe('75');
  });

  it('bulk: serie geometrica floored', () => {
    // 10 unità da 0: 100 × (1.05^10-1)/0.05 = 1257.78 → floor 1257
    expect(teamBulkCost(D, base, 10).toString()).toBe('1257');
  });

  it('bulk con r=1 degenera in costo × quantità', () => {
    expect(teamBulkCost(D, { ...base, r: 1 }, 10).toString()).toBe('1000');
  });

  it('guardie min: mai sotto 1 (singolo) o amount (bulk)', () => {
    const cheap = { baseCost: 0.4, count: 0, r: 1.05, outsourcingLevel: 0 };
    expect(teamBulkCost(D, cheap, 1).toString()).toBe('1'); // floor(0.4)=0 → max 1
    expect(Number(teamBulkCost(D, cheap, 5).toString())).toBeGreaterThanOrEqual(5);
  });
});

describe('maxAffordableTeams', () => {
  const base = { baseCost: 100, count: 0, r: 1.05, outsourcingLevel: 0 };

  it('score sotto il costo singolo → 0', () => {
    expect(maxAffordableTeams(D, base, 99)).toBe(0);
  });

  it('garanzia: l\'n restituito è sempre acquistabile (cost(n) ≤ score)', () => {
    // NB: il legacy NON garantisce che n+1 sia inacquistabile — la formula log
    // può sottostimare di 1 (es. score=1257 → 9 pur potendo 10) e il refine-loop
    // corregge solo verso il basso. Replichiamo quel comportamento tale e quale
    // (parità col legacy, non "fix"); la garanzia reale è solo cost(n) ≤ score.
    for (const score of ['100', '500', '1257', '1258', '99999']) {
      const n = maxAffordableTeams(D, base, score);
      const scoreD = new D(score);
      if (n > 0) expect(teamBulkCost(D, base, n).lte(scoreD)).toBe(true);
    }
  });

  it('sottostima nota del legacy su score = costo esatto di 10 unità', () => {
    // score = bulkCost(10) = 1257 → il legacy ritorna 9 (floor di 9.994)
    expect(maxAffordableTeams(D, base, '1257')).toBe(9);
  });

  it('r≈1 → divisione semplice', () => {
    expect(maxAffordableTeams(D, { ...base, r: 1 }, '1050')).toBe(10);
  });
});

describe('milestoneReached', () => {
  it('soglia attraversata → la più alta', () => {
    expect(milestoneReached(8, 12)).toBe(10);
    expect(milestoneReached(8, 60)).toBe(50);   // attraversa 10,25,50 → 50
    expect(milestoneReached(99, 100)).toBe(100);
  });

  it('nessuna soglia → 0', () => {
    expect(milestoneReached(10, 12)).toBe(0); // 10 già raggiunta prima
    expect(milestoneReached(11, 24)).toBe(0);
  });

  it('oltre 1000: tier ogni 250', () => {
    expect(milestoneReached(1100, 1260)).toBe(1250);
    expect(milestoneReached(1250, 1490)).toBe(0);  // 1250 già passata, 1500 no
    expect(milestoneReached(990, 1010)).toBe(1000);
  });
});

describe('prestigeThreshold', () => {
  it('base 50M a 0 reset', () => {
    expect(Number(prestigeThreshold(D, 0).toString())).toBe(50000000);
  });

  it('×3 per reset, 3 cifre significative', () => {
    expect(Number(prestigeThreshold(D, 1).toString())).toBe(150000000);
    // 50M * 3^5 = 12.15e9 → 3 cifre: 1.21e10 o 1.22e10 a seconda della repr
    // float del mezzo esatto — la parità RUNTIME è garantita dal ctor iniettato
    // della pagina (verificata nell'harness preview con uguaglianza di stringa).
    const t5 = Number(prestigeThreshold(D, 5).toString());
    expect(Math.abs(t5 - 1.215e10)).toBeLessThanOrEqual(0.05e9);
  });
});
