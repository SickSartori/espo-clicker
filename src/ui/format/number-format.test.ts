import { describe, it, expect } from 'vitest';
import { formatNumber, formatFullNumber, formatNumberV1 } from './number-format';

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

describe('formatNumberV1 — formato «alla v1» del tema Vintage', () => {
  it('sotto 1000 resta il formato di sempre (i decimali dei BPS non spariscono)', () => {
    expect(formatNumberV1(0, SUFFIXES)).toBe('0');
    expect(formatNumberV1(163, SUFFIXES)).toBe('163');
    expect(formatNumberV1(0.1, SUFFIXES)).toBe('0,10');
    expect(formatNumberV1(999.5, SUFFIXES)).toBe('999,50');
    expect(formatNumberV1(-5, SUFFIXES)).toBe('-5');
  });
  it('da 1000 in su: intero completo coi punti, floor, senza suffissi', () => {
    expect(formatNumberV1(1000, SUFFIXES)).toBe('1.000');
    expect(formatNumberV1(1234.9, SUFFIXES)).toBe('1.234');
    expect(formatNumberV1(123_456_789, SUFFIXES)).toBe('123.456.789');
    expect(formatNumberV1('2.5e9', SUFFIXES)).toBe('2.500.000.000');
    expect(formatNumberV1(-1234567, SUFFIXES)).toBe('-1.234.567');
  });
  it('fino al tetto incluso 99.999.999.999, poi i suffissi', () => {
    expect(formatNumberV1('99999999999', SUFFIXES)).toBe('99.999.999.999');
    expect(formatNumberV1('1e11', SUFFIXES)).toBe('100,00 B');
    expect(formatNumberV1('1e12', SUFFIXES)).toBe('1,00 T');
    expect(formatNumberV1('3.5e15', SUFFIXES)).toBe('3,50 Qa');
  });
  it('il muro dei numeri grandi: mai Infinity né stringhe da 400 cifre', () => {
    const s = formatNumberV1('1e400', SUFFIXES);
    expect(s).not.toMatch(/Infinity|NaN/);
    expect(s.length).toBeLessThan(16);
    expect(formatNumberV1('1' + '0'.repeat(400), SUFFIXES).length).toBeLessThan(16);
  });
  it('il tetto è parametrico', () => {
    expect(formatNumberV1(5_000_000, SUFFIXES, 6)).toBe('5,00 M');
    expect(formatNumberV1(500_000, SUFFIXES, 6)).toBe('500.000');
  });
  it('input illeggibile → "0"', () => {
    expect(formatNumberV1(null, SUFFIXES)).toBe('0');
    expect(formatNumberV1('boh', SUFFIXES)).toBe('0');
  });
});
