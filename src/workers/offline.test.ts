import { describe, it, expect } from 'vitest';
import Decimal from 'break_eternity.js';
import { computeOffline } from './offline.worker';

describe('computeOffline', () => {
  it('1 ora a 10bps al 30% efficienza', () => {
    const r = computeOffline({ bps: 10, awayMs: 3600 * 1000 });
    expect(r.effectiveSeconds).toBe(3600);
    expect(r.efficiency).toBe(0.3);
    expect(Number(r.earned)).toBeCloseTo(10800);
  });

  it('cap default 8h', () => {
    const r = computeOffline({ bps: 1, awayMs: 24 * 3600 * 1000 });
    expect(r.effectiveSeconds).toBe(8 * 3600);
  });

  it('cap custom', () => {
    const r = computeOffline({ bps: 10, awayMs: 1000 * 1000, maxSeconds: 60 });
    expect(r.effectiveSeconds).toBe(60);
    expect(Number(r.earned)).toBeCloseTo(180);
  });

  it('efficienza custom 100%', () => {
    const r = computeOffline({ bps: 5, awayMs: 1000, efficiency: 1 });
    expect(Number(r.earned)).toBeCloseTo(5);
  });

  it('awayMs negativo → 0', () => {
    const r = computeOffline({ bps: 10, awayMs: -5000 });
    expect(Number(r.earned)).toBe(0);
  });

  it('bps negativo → 0', () => {
    const r = computeOffline({ bps: -10, awayMs: 60000 });
    expect(Number(r.earned)).toBe(0);
  });

  it('bps stringa oltre il range double (endgame)', () => {
    // 1e310 come number sarebbe Infinity — da stringa deve restare finito.
    const r = computeOffline({ bps: '1e310', awayMs: 3600 * 1000 });
    const expected = new Decimal('1e310').mul(3600).mul(0.3); // stesso ordine di mul del worker
    expect(new Decimal(r.earned).eq(expected)).toBe(true);
    expect(r.earned).not.toContain('Infinity');
  });

  it('bps stringa nel range normale = parità col number', () => {
    const a = computeOffline({ bps: '10', awayMs: 3600 * 1000 });
    const b = computeOffline({ bps: 10, awayMs: 3600 * 1000 });
    expect(a.earned).toBe(b.earned);
  });
});
