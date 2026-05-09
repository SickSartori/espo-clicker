import { describe, it, expect } from 'vitest';
import { computeOffline } from './offline.worker';

describe('computeOffline', () => {
  it('1 ora a 10bps al 30% efficienza', () => {
    const r = computeOffline({ bps: 10, awayMs: 3600 * 1000 });
    expect(r.effectiveSeconds).toBe(3600);
    expect(r.efficiency).toBe(0.3);
    expect(r.earned).toBeCloseTo(10800);
  });

  it('cap default 8h', () => {
    const r = computeOffline({ bps: 1, awayMs: 24 * 3600 * 1000 });
    expect(r.effectiveSeconds).toBe(8 * 3600);
  });

  it('cap custom', () => {
    const r = computeOffline({ bps: 10, awayMs: 1000 * 1000, maxSeconds: 60 });
    expect(r.effectiveSeconds).toBe(60);
    expect(r.earned).toBeCloseTo(180);
  });

  it('efficienza custom 100%', () => {
    const r = computeOffline({ bps: 5, awayMs: 1000, efficiency: 1 });
    expect(r.earned).toBeCloseTo(5);
  });

  it('awayMs negativo → 0', () => {
    const r = computeOffline({ bps: 10, awayMs: -5000 });
    expect(r.earned).toBe(0);
  });

  it('bps negativo → 0', () => {
    const r = computeOffline({ bps: -10, awayMs: 60000 });
    expect(r.earned).toBe(0);
  });
});
