import { describe, it, expect } from 'vitest';
import Decimal from 'break_eternity.js';
import {
  goldenBugReward,
  dailyStreak,
  dailyReward,
  crunchDuration,
  crunchCooldownFromEnd,
  CRUNCH_MULTIPLIER,
} from './events';
import type { DecimalCtor } from './economy';

const D = Decimal as unknown as DecimalCtor;

describe('goldenBugReward', () => {
  const base = { bps: 100, clickValue: 50, globalMult: 1 };

  it('standard: (bps×30 + click×10 + 10) × mult', () => {
    // 100*30 + 50*10 + 10 = 3510
    const r = goldenBugReward(D, { ...base, bugType: 'standard' });
    expect(r.bonus.toString()).toBe('3510');
    expect(r.frenzy).toBeUndefined();
  });

  it('globalMult moltiplica il base', () => {
    const r = goldenBugReward(D, { ...base, globalMult: 3, bugType: 'standard' });
    expect(r.bonus.toString()).toBe('10530');
  });

  it('lucky: ×8 jackpot, nessun buff', () => {
    const r = goldenBugReward(D, { ...base, bugType: 'lucky' });
    expect(r.bonus.toString()).toBe('28080'); // 3510×8
    expect(r.frenzy).toBeUndefined();
  });

  it('frenzy: ×2 immediato + buff click ×7 per 15s', () => {
    const r = goldenBugReward(D, { ...base, bugType: 'frenzy' });
    expect(r.bonus.toString()).toBe('7020'); // 3510×2
    expect(r.frenzy).toEqual({ mult: 7, durationMs: 15000 });
  });

  it('big number: bps oltre il range double', () => {
    const r = goldenBugReward(D, { bps: '1e300', clickValue: 0, globalMult: 1, bugType: 'lucky' });
    // 1e300*30*8 = 2.4e302
    expect(new D(r.bonus).div('2.4e302').toNumber()).toBeCloseTo(1, 6);
  });
});

describe('dailyStreak', () => {
  it('+1 se ieri', () => {
    expect(dailyStreak('2026-07-04', '2026-07-05', '2026-07-04', 3)).toBe(4);
  });
  it('riparte da 1 se gap o mai riscosso', () => {
    expect(dailyStreak('2026-07-01', '2026-07-05', '2026-07-04', 3)).toBe(1);
    expect(dailyStreak(null, '2026-07-05', '2026-07-04', 0)).toBe(1);
  });
  it('prevStreak 0/undefined gestito', () => {
    expect(dailyStreak('2026-07-04', '2026-07-05', '2026-07-04', 0)).toBe(1);
  });
});

describe('dailyReward', () => {
  it('secondi di produzione: 600 + cap×200', () => {
    // streak 1 → cap 1 → 800s. bps 10 → 8000. floor = 1*(100)=100 → reward 8000
    expect(dailyReward(D, { bps: 10, baseClickValue: 1, streak: 1 }).toString()).toBe('8000');
  });

  it('cap a 7 giorni', () => {
    // streak 20 → cap 7 → 2000s. bps 10 → 20000
    expect(dailyReward(D, { bps: 10, baseClickValue: 1, streak: 20 }).toString()).toBe('20000');
  });

  it('pavimento baseClickValue×(50×cap+50) per BPS bassi', () => {
    // streak 1 → cap 1 → floor = 100 * (100) = 10000; bps 0 → reward 0 → floor 10000
    expect(dailyReward(D, { bps: 0, baseClickValue: 100, streak: 1 }).toString()).toBe('10000');
  });

  it('minimo assoluto 50', () => {
    expect(dailyReward(D, { bps: 0, baseClickValue: 0, streak: 1 }).toString()).toBe('50');
  });
});

describe('crunch timing', () => {
  it('durata: 60s con overclock, 30s senza', () => {
    expect(crunchDuration(true)).toBe(60000);
    expect(crunchDuration(false)).toBe(30000);
  });

  it('cooldown: 300s − 30s×liv, floor 60s', () => {
    expect(crunchCooldownFromEnd(0)).toBe(300000);
    expect(crunchCooldownFromEnd(3)).toBe(210000);
    expect(crunchCooldownFromEnd(8)).toBe(60000);  // 300-240=60
    expect(crunchCooldownFromEnd(20)).toBe(60000); // floor tiene
  });

  it('moltiplicatore fisso 7', () => {
    expect(CRUNCH_MULTIPLIER).toBe(7);
  });
});
