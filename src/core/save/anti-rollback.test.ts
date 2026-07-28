import { describe, it, expect } from 'vitest';
import { compareDecimalStrings, decideRollback } from './anti-rollback';

describe('compareDecimalStrings', () => {
  it('numeri uguali → 0', () => expect(compareDecimalStrings('100', '100')).toBe(0));
  it('a > b numerico', () => expect(compareDecimalStrings('200', '100')).toBe(1));
  it('a < b numerico', () => expect(compareDecimalStrings('50', '100')).toBe(-1));
  it('mix string/number', () => expect(compareDecimalStrings(100, '50')).toBe(1));
  it('exp notation grossa: e+50 > e+10', () =>
    expect(compareDecimalStrings('1.5e+50', '9e+10')).toBe(1));
  it('exp notation: stesso esponente, mantissa decide', () =>
    expect(compareDecimalStrings('2e+30', '1e+30')).toBe(1));
  it('zero vs numero', () => expect(compareDecimalStrings('0', '1')).toBe(-1));
  it('null/undefined → 0 vs 0', () => expect(compareDecimalStrings(null, undefined)).toBe(0));
});

describe('decideRollback', () => {
  it('cloud null → local', () => expect(decideRollback({ lifetimeScore: '10' }, null)).toBe('local'));
  it('local null → cloud', () => expect(decideRollback(null, { lifetimeScore: '10' })).toBe('cloud'));
  it('entrambi null → local', () => expect(decideRollback(null, null)).toBe('local'));

  it('formattazione locale più alta vince', () => {
    expect(
      decideRollback(
        { totalFormattazioni: 2, lifetimeScore: '0' },
        { totalFormattazioni: 1, lifetimeScore: '999999' },
      ),
    ).toBe('local');
  });

  it('formattazione cloud più alta vince', () => {
    expect(
      decideRollback(
        { totalFormattazioni: 0, lifetimeScore: '999999' },
        { totalFormattazioni: 5, lifetimeScore: '0' },
      ),
    ).toBe('cloud');
  });

  it('parità formattazione → prestige decide', () => {
    expect(
      decideRollback(
        { totalFormattazioni: 1, lifetimePrestigePoints: '500', lifetimeScore: '0' },
        { totalFormattazioni: 1, lifetimePrestigePoints: '100', lifetimeScore: '999' },
      ),
    ).toBe('local');
  });

  it('parità formattazione+prestige → score decide', () => {
    expect(
      decideRollback(
        { totalFormattazioni: 1, lifetimePrestigePoints: '100', lifetimeScore: '500' },
        { totalFormattazioni: 1, lifetimePrestigePoints: '100', lifetimeScore: '1000' },
      ),
    ).toBe('cloud');
  });

  it('tutto identico → equal', () => {
    expect(
      decideRollback(
        { totalFormattazioni: 1, lifetimePrestigePoints: '100', lifetimeScore: '500' },
        { totalFormattazioni: 1, lifetimePrestigePoints: '100', lifetimeScore: '500' },
      ),
    ).toBe('equal');
  });

  it('campi mancanti trattati come 0', () => {
    expect(decideRollback({}, { lifetimeScore: '100' })).toBe('cloud');
    expect(decideRollback({ lifetimeScore: '100' }, {})).toBe('local');
  });
});
