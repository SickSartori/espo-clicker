/**
 * Number formatting — gemello V3 di formatNumber/formatFullNumber
 * (js/ui-functions.js, prima fetta F5).
 *
 * PURO e senza dipendenza da librerie Decimal: l'input viene normalizzato via
 * stringa (mantissa+esponente), così il formato è identico sia che il caller
 * passi un Decimal break_infinity, un break_eternity, una stringa o un number.
 *
 * I SUFFISSI sono iniettati dal caller (vivono in gameData.texts.format.suffixes,
 * localizzati) — questo modulo non tocca né window né gameData.
 *
 * Semantica legacy replicata:
 * - null/undefined/non parsabile → "0"
 * - |x| < 1000 → toLocaleString('it-IT'), 2 decimali se non intero
 * - suffissi a gruppi di 3 ordini: "12,34 M"; 999.995 scatta al suffisso dopo
 * - oltre l'ultimo suffisso → esponenziale "1,23e+308" (virgola decimale)
 * - formatFullNumber: floor + separatori migliaia col punto; ≥1e21 delega a
 *   formatNumber (la RegExp non regge la notazione scientifica)
 */

export interface DecimalLike {
  toString(): string;
}
export type NumericInput = number | string | DecimalLike | null | undefined;

interface Parsed {
  /** Mantissa normalizzata in [1,10) (0 per zero), col segno. */
  mantissa: number;
  /** Esponente decimale della grandezza |x|. */
  exponent: number;
  /** Stringa originale ripulita (per il rendering "full"). */
  raw: string;
}

const NUM_RE = /^([+-]?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/;

function parseInput(value: NumericInput): Parsed | null {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  const m = NUM_RE.exec(raw);
  if (!m) return null;

  const base = Number(`${m[1]}${m[2]}${m[3] ? '.' + m[3] : ''}`);
  const exp10 = m[4] ? Number(m[4]) : 0;
  if (base === 0) return { mantissa: 0, exponent: 0, raw };

  const shift = Math.floor(Math.log10(Math.abs(base)));
  const mantissa = base / Math.pow(10, shift);
  return { mantissa, exponent: shift + exp10, raw };
}

export function formatNumber(value: NumericInput, suffixes: readonly string[]): string {
  const p = parseInput(value);
  if (!p) return '0';

  // Numeri piccoli standard (|x| < 1000)
  if (p.exponent < 3) {
    const val = p.mantissa * Math.pow(10, p.exponent);
    if (Number.isInteger(val)) return val.toLocaleString('it-IT');
    return val.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Suffisso disponibile (k, M, B, T, ...)
  let suffixIndex = Math.floor(p.exponent / 3);
  if (suffixIndex > 0 && suffixIndex < suffixes.length) {
    const power = p.exponent % 3;
    let scaled = p.mantissa * Math.pow(10, power);

    // Evita che 999.999 diventi "1000,00" forzando lo scatto al suffisso successivo
    if (scaled >= 999.995) {
      scaled /= 1000;
      suffixIndex++;
    }

    if (suffixIndex < suffixes.length) {
      return scaled.toFixed(2).replace('.', ',') + ' ' + suffixes[suffixIndex];
    }
  }

  // Oltre l'ultimo suffisso: esponenziale pulita, con rinormalizzazione del
  // rounding (9.999... → "1,00e+N+1", come toExponential nativa)
  let mant = p.mantissa;
  let exp = p.exponent;
  if (Math.abs(Number(mant.toFixed(2))) >= 10) {
    mant /= 10;
    exp++;
  }
  return mant.toFixed(2).replace('.', ',') + 'e+' + exp;
}

/**
 * Rendering intero completo con separatori migliaia (punto, stile it).
 * Il floor è fatto in stringa (nessuna perdita oltre 2^53).
 */
export function formatFullNumber(value: NumericInput, suffixes: readonly string[]): string {
  const p = parseInput(value);
  if (!p) return '0';

  // ≥ 1e21: la RegExp non regge la notazione scientifica → formato compatto
  if (p.exponent >= 21) return formatNumber(value, suffixes);

  const m = NUM_RE.exec(p.raw)!;
  const sign = m[1] === '-' ? '-' : '';
  const intPart = m[2]!;
  const fracPart = m[3] ?? '';
  const exp10 = m[4] ? Number(m[4]) : 0;

  // Sposta la virgola di exp10 posizioni lavorando sulle cifre
  const digits = intPart + fracPart;
  const pointPos = intPart.length + exp10;
  let intDigits: string;
  if (pointPos <= 0) {
    intDigits = '0';
  } else if (pointPos >= digits.length) {
    intDigits = digits + '0'.repeat(pointPos - digits.length);
  } else {
    intDigits = digits.slice(0, pointPos);
  }
  intDigits = intDigits.replace(/^0+(?=\d)/, ''); // niente zeri iniziali

  // floor, non troncamento: per i negativi con resto frazionario si arrotonda
  // verso il basso (-2.5 → -3), come Decimal.floor() del legacy
  const fracRemainder = digits.slice(Math.max(0, pointPos));
  if (sign === '-' && /[1-9]/.test(fracRemainder)) {
    intDigits = (BigInt(intDigits) + 1n).toString();
  }

  const str = (intDigits === '0' ? '' : sign) + intDigits;
  return str.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
