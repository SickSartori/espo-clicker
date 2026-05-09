/**
 * Big number wrapper.
 *
 * Migra da `break_infinity.js` (CDN, ~5KB) a `break_eternity.js` (npm, ~7KB) self-hosted.
 * break_eternity gestisce esponenti molto più grandi (fino a 1ee308) — necessario per
 * future stagioni con economia inflazionata.
 *
 * API quasi identica: la maggior parte del codice legacy usa solo `.add`, `.mul`,
 * `.gt`, `.toString`, `new Decimal(x)`. Questo modulo riesporta `Decimal` come globale
 * compatibile, così il legacy continua a funzionare quando smettiamo di caricare la CDN.
 */

import Decimal from 'break_eternity.js';

export { Decimal };

/**
 * Espone Decimal globalmente (drop-in replace della CDN break_infinity).
 * Da chiamare il prima possibile in main.ts.
 */
export function installGlobalDecimal(): void {
  if (typeof window === 'undefined') return;
  // Solo se non già definito (evita override durante migrazione parallela)
  const w = window as unknown as { Decimal?: typeof Decimal };
  if (!w.Decimal) {
    w.Decimal = Decimal;
  }
}

/**
 * Confronto sicuro che accetta string/number/Decimal.
 * Sostituisce confronti `new Decimal(x).gt(y)` sparsi.
 */
export function gt(a: Decimal | string | number, b: Decimal | string | number): boolean {
  return new Decimal(a).gt(new Decimal(b));
}
export function gte(a: Decimal | string | number, b: Decimal | string | number): boolean {
  return new Decimal(a).gte(new Decimal(b));
}
export function eq(a: Decimal | string | number, b: Decimal | string | number): boolean {
  return new Decimal(a).eq(new Decimal(b));
}
