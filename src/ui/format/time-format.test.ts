import { describe, it, expect } from 'vitest';
import { formatTime } from './time-format';

const IT = { d: 'g', h: 'h', m: 'm', s: 's' };

describe('formatTime', () => {
  it('solo secondi', () => {
    expect(formatTime(0, IT)).toBe('0s');
    expect(formatTime(59, IT)).toBe('59s');
  });

  it('minuti e secondi', () => {
    expect(formatTime(61, IT)).toBe('1m 1s');
    expect(formatTime(600, IT)).toBe('10m 0s');
  });

  it('ore: mostra anche i minuti a zero (cascata)', () => {
    expect(formatTime(3600, IT)).toBe('1h 0m 0s');
    expect(formatTime(3661, IT)).toBe('1h 1m 1s');
  });

  it('giorni: mostra tutte le unità sotto', () => {
    expect(formatTime(90061, IT)).toBe('1g 1h 1m 1s');
    expect(formatTime(86400, IT)).toBe('1g 0h 0m 0s');
  });

  it('frazioni troncate (floor)', () => {
    expect(formatTime(61.9, IT)).toBe('1m 1s');
  });
});
