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
