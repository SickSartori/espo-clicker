import { describe, it, expect } from 'vitest';
import Decimal from 'break_eternity.js';
import {
  anyClickUpgradeAvailable,
  anyEnhancementAvailable,
  anyPrestigeUpgradeAvailable,
  anyClaimableAchievement,
  isPrestigeTabVisible,
  isQuantumUnlocked,
  visualBps,
} from './progression';

describe('anyClickUpgradeAvailable', () => {
  const entry = (over = {}) => ({ purchased: false, requiredClicks: 10, cost: 100, ...over });

  it('true solo se non comprato, click sufficienti e score sufficiente', () => {
    expect(anyClickUpgradeAvailable(10, '100', [entry()])).toBe(true);
    expect(anyClickUpgradeAvailable(9, '100', [entry()])).toBe(false);
    expect(anyClickUpgradeAvailable(10, '99', [entry()])).toBe(false);
    expect(anyClickUpgradeAvailable(10, '100', [entry({ purchased: true })])).toBe(false);
  });

  it('score big-number oltre il range double', () => {
    expect(anyClickUpgradeAvailable(10, '1e310', [entry({ cost: '9e309' })])).toBe(true);
    expect(anyClickUpgradeAvailable(10, '8e309', [entry({ cost: '9e309' })])).toBe(false);
  });

  it('lista vuota → false', () => {
    expect(anyClickUpgradeAvailable(999, '1e10', [])).toBe(false);
  });
});

describe('anyEnhancementAvailable', () => {
  const e = (over = {}) => ({ purchased: false, requiredCount: 5, teamCount: 5, cost: 50, ...over });

  it('richiede team al conteggio richiesto e score', () => {
    expect(anyEnhancementAvailable('50', [e()])).toBe(true);
    expect(anyEnhancementAvailable('50', [e({ teamCount: 4 })])).toBe(false);
    expect(anyEnhancementAvailable('49', [e()])).toBe(false);
    expect(anyEnhancementAvailable('50', [e({ purchased: true })])).toBe(false);
  });
});

describe('anyPrestigeUpgradeAvailable', () => {
  it('gate: senza sblocco sempre false', () => {
    expect(
      anyPrestigeUpgradeAvailable(false, '999', [{ counted: false, purchased: false, cost: 1 }]),
    ).toBe(false);
  });

  it('counted: rispetta maxLevel', () => {
    expect(
      anyPrestigeUpgradeAvailable(true, '10', [{ counted: true, count: 3, maxLevel: 3, cost: 5 }]),
    ).toBe(false);
    expect(
      anyPrestigeUpgradeAvailable(true, '10', [{ counted: true, count: 2, maxLevel: 3, cost: 5 }]),
    ).toBe(true);
  });

  it('counted senza maxLevel: solo il costo conta', () => {
    expect(
      anyPrestigeUpgradeAvailable(true, '4', [{ counted: true, count: 99, cost: 5 }]),
    ).toBe(false);
    expect(
      anyPrestigeUpgradeAvailable(true, '5', [{ counted: true, count: 99, cost: 5 }]),
    ).toBe(true);
  });

  it('uncounted: non comprato + punti sufficienti', () => {
    expect(
      anyPrestigeUpgradeAvailable(true, '5', [{ counted: false, purchased: false, cost: 5 }]),
    ).toBe(true);
    expect(
      anyPrestigeUpgradeAvailable(true, '5', [{ counted: false, purchased: true, cost: 5 }]),
    ).toBe(false);
  });
});

describe('anyClaimableAchievement', () => {
  it('sbloccato, non riscattato, con premio', () => {
    expect(anyClaimableAchievement([{ unlocked: true, claimed: false, hasReward: true }])).toBe(true);
    expect(anyClaimableAchievement([{ unlocked: true, claimed: true, hasReward: true }])).toBe(false);
    expect(anyClaimableAchievement([{ unlocked: true, claimed: false, hasReward: false }])).toBe(false);
    expect(anyClaimableAchievement([{ unlocked: false, claimed: false, hasReward: true }])).toBe(false);
  });
});

describe('visibilità tab', () => {
  it('prestigio: visibile con reset O punti O lifetime O formattazioni', () => {
    const base = { totalResets: 0, prestigePoints: '0', lifetimePrestigePoints: '0', totalFormattazioni: 0 };
    expect(isPrestigeTabVisible(base)).toBe(false);
    expect(isPrestigeTabVisible({ ...base, totalResets: 1 })).toBe(true);
    expect(isPrestigeTabVisible({ ...base, prestigePoints: '1' })).toBe(true);
    expect(isPrestigeTabVisible({ ...base, lifetimePrestigePoints: '3' })).toBe(true);
    // il format azzera resets/punti ma la promozione resta sbloccata
    expect(isPrestigeTabVisible({ ...base, totalFormattazioni: 1 })).toBe(true);
  });

  it('quantum: 20 reset O formattato O qBits', () => {
    expect(isQuantumUnlocked({ totalResets: 19, totalFormattazioni: 0, qBits: '0' })).toBe(false);
    expect(isQuantumUnlocked({ totalResets: 20, totalFormattazioni: 0, qBits: '0' })).toBe(true);
    expect(isQuantumUnlocked({ totalResets: 0, totalFormattazioni: 1, qBits: '0' })).toBe(true);
    expect(isQuantumUnlocked({ totalResets: 0, totalFormattazioni: 0, qBits: '1' })).toBe(true);
  });
});

describe('visualBps', () => {
  it('bps + click dentro la finestra di 1s', () => {
    const clicks = [
      { time: 0, value: '5' },     // fuori finestra
      { time: 900, value: '10' },  // dentro
      { time: 950, value: '20' },  // dentro
    ];
    expect(visualBps('100', clicks, 1500)).toBe('130');
  });

  it('si ferma al primo click fuori finestra (iterando dalla coda)', () => {
    // now=1500: dalla coda 1400 è dentro (add), 100 è fuori → STOP; 600 non
    // viene mai considerato pur essendo dentro finestra — come il legacy.
    const clicks = [
      { time: 600, value: '1' },
      { time: 100, value: '2' },
      { time: 1400, value: '4' },
    ];
    expect(visualBps('0', clicks, 1500)).toBe('4');
  });

  it('big number: click da 1e310 (tolleranza log10 break_eternity)', () => {
    const res = visualBps('1e310', [{ time: 999, value: '2e310' }], 1000);
    // ~3e310 con rumore relativo <1e-9 (break_eternity sopra 9e15 lavora in log10)
    const relErr = new Decimal(res).sub('3e310').abs().div('3e310').toNumber();
    expect(relErr).toBeLessThan(1e-9);
    expect(res).not.toContain('Infinity');
  });

  it('senza click → solo bps', () => {
    expect(visualBps('42', [], 123456)).toBe('42');
  });
});
