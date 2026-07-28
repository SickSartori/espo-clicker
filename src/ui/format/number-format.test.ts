import { describe, it, expect } from 'vitest';
import { formatNumber, formatFullNumber } from './number-format';

// Suffissi come in gameData.texts.format.suffixes (primo = stringa vuota)
const SUFFIXES = ['', 'k', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

describe('formatNumber', () => {
  it('null/undefined/garbage → "0"', () => {
    expect(formatNumber(null, SUFFIXES)).toBe('0');
    expect(formatNumber(undefined, SUFFIXES)).toBe('0');
    expect(formatNumber('boh', SUFFIXES)).toBe('0');
  });

  it('interi piccoli → toLocaleString it-IT senza decimali', () => {
    expect(formatNumber(0, SUFFIXES)).toBe('0');
    expect(formatNumber(7, SUFFIXES)).toBe('7');
    expect(formatNumber(999, SUFFIXES)).toBe('999');
    expect(formatNumber(-5, SUFFIXES)).toBe('-5');
  });

  it('decimali piccoli → 2 cifre con virgola', () => {
    expect(formatNumber(123.456, SUFFIXES)).toBe('123,46');
    expect(formatNumber(0.5, SUFFIXES)).toBe('0,50');
  });

  it('suffissi a gruppi di 3 ordini', () => {
    expect(formatNumber(1000, SUFFIXES)).toBe('1,00 k');
    expect(formatNumber(1234, SUFFIXES)).toBe('1,23 k');
    expect(formatNumber(1_500_000, SUFFIXES)).toBe('1,50 M');
    expect(formatNumber('2.5e9', SUFFIXES)).toBe('2,50 B');
    expect(formatNumber('9.99e12', SUFFIXES)).toBe('9,99 T');
  });

  it('999.995+ scatta al suffisso successivo (niente "1000,00 k")', () => {
    expect(formatNumber(999_995_000, SUFFIXES)).toBe('1,00 B');
    expect(formatNumber(999_994_000, SUFFIXES)).toBe('999,99 M');
  });

  it('oltre l\'ultimo suffisso → esponenziale con virgola', () => {
    // SUFFIXES.length = 12 → copertura fino a exp 3*12-1 = 35
    expect(formatNumber('1.23e40', SUFFIXES)).toBe('1,23e+40');
    expect(formatNumber('1e310', SUFFIXES)).toBe('1,00e+310');
  });

  it('rinormalizza il rounding esponenziale (9.999 → 1,00e+N+1)', () => {
    expect(formatNumber('9.999e40', SUFFIXES)).toBe('1,00e+41');
  });

  it('negativi con suffisso', () => {
    expect(formatNumber(-1234, SUFFIXES)).toBe('-1,23 k');
  });
});

describe('formatFullNumber', () => {
  it('null/garbage → "0"', () => {
    expect(formatFullNumber(null, SUFFIXES)).toBe('0');
  });

  it('separatori migliaia col punto', () => {
    expect(formatFullNumber(999, SUFFIXES)).toBe('999');
    expect(formatFullNumber(1234, SUFFIXES)).toBe('1.234');
    expect(formatFullNumber(1234567, SUFFIXES)).toBe('1.234.567');
  });

  it('floor: tronca i positivi, arrotonda giù i negativi (come Decimal.floor)', () => {
    expect(formatFullNumber(1234.99, SUFFIXES)).toBe('1.234');
    expect(formatFullNumber(-2.5, SUFFIXES)).toBe('-3');
    expect(formatFullNumber(-0.4, SUFFIXES)).toBe('-1');
  });

  it('notazione scientifica sotto 1e21 → cifre piene', () => {
    expect(formatFullNumber('1.23e6', SUFFIXES)).toBe('1.230.000');
    expect(formatFullNumber('1.2345678901234567e20', SUFFIXES)).toBe(
      '123.456.789.012.345.670.000',
    );
  });

  it('≥1e21 → delega al formato compatto', () => {
    expect(formatFullNumber('1e21', SUFFIXES)).toBe(formatNumber('1e21', SUFFIXES));
    expect(formatFullNumber('1.5e22', SUFFIXES)).toBe('15,00 Sx'); // exp 22 → dentro il range suffissi
  });
});
