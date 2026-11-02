import { describe, it, expect } from 'vitest';
import Decimal from 'break_eternity.js';
import {
  goldenBugReward,
  goldenBugSpot,
  dailyStreak,
  dailyReward,
  crunchDuration,
  crunchCooldownFromEnd,
  CRUNCH_MULTIPLIER,
} from './events';
import type { DecimalCtor } from './economy';

const D = Decimal as unknown as DecimalCtor;

// Misure vere del gioco (02/11/2026): desktop 1280×720 e telefono 375×812
describe('goldenBugSpot', () => {
  const desk = { section: { left: 376, top: 169, right: 894, bottom: 736 }, pad: { top: 10, right: 20, bottom: 96, left: 20 } };
  const content = (s: typeof desk.section, p: typeof desk.pad) =>
    ({ left: s.left + p.left, top: s.top + p.top, right: s.right - p.right, bottom: s.bottom - p.bottom });
  const corners: Array<[number, number]> = [[0, 0], [1, 0], [0, 1], [1, 1], [0.5, 0.5]];

  it('desktop: mai nella fascia del badge «Novità» (fisso a 653–678, z-index 9000)', () => {
    const visible = { left: 0, top: 0, right: 1280, bottom: 720 };
    for (const [rx, ry] of corners) {
      const p = goldenBugSpot(content(desk.section, desk.pad), visible, 64, 24, rx, ry)!;
      expect(p.top + 64 + 20).toBeLessThan(653);   // anche col vagare dell'animazione (±20px)
      expect(p.left).toBeGreaterThanOrEqual(376 + 20 + 24);
      expect(p.left + 64).toBeLessThanOrEqual(894 - 20 - 24);
    }
  });

  it('desktop: il bordo più basso possibile è il contenuto meno il margine', () => {
    const p = goldenBugSpot(content(desk.section, desk.pad), { left: 0, top: 0, right: 1280, bottom: 720 }, 64, 24, 1, 1)!;
    expect(p).toEqual({ left: 894 - 20 - 24 - 64, top: 736 - 96 - 24 - 64 });
  });

  it('telefono: mai sotto la barra delle schede (da 745), anche se la sezione arriva a 756', () => {
    const section = { left: 0, top: 147, right: 375, bottom: 756 };
    const pad = { top: 10, right: 20, bottom: 10, left: 20 };
    const visible = { left: 0, top: 0, right: 375, bottom: 745 };
    for (const [rx, ry] of corners) {
      const p = goldenBugSpot(content(section, pad), visible, 64, 24, rx, ry)!;
      expect(p.top + 64).toBeLessThanOrEqual(745 - 24);
      expect(p.top).toBeGreaterThanOrEqual(147 + 10 + 24);   // sotto la barra in alto (fino a 55)
    }
  });

  it('telefono con un\'altra colonna aperta: la sezione è 0×0 e il bug non compare (prima finiva a 24,24)', () => {
    const zero = { left: 0, top: 0, right: 0, bottom: 0 };
    const pad = { top: 10, right: 20, bottom: 10, left: 20 };
    expect(goldenBugSpot(content(zero, pad), { left: 0, top: 0, right: 375, bottom: 745 }, 64, 24, 0, 0)).toBeNull();
  });

  it('spazio giusto per un bug: compare lì; un pixel in meno: niente', () => {
    const fit = { left: 100, top: 100, right: 100 + 24 + 64 + 24, bottom: 100 + 24 + 64 + 24 };
    const all = { left: 0, top: 0, right: 1000, bottom: 1000 };
    expect(goldenBugSpot(fit, all, 64, 24, 0.7, 0.3)).toEqual({ left: 124, top: 124 });
    expect(goldenBugSpot({ ...fit, bottom: fit.bottom - 1 }, all, 64, 24, 0.5, 0.5)).toBeNull();
  });
});

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
