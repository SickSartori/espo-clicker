/**
 * Ctor Decimal RISOLTO per i moduli dati (reorg filone B): a runtime
 * window.Decimal (break_infinity, primo script — istanze bit-identiche al
 * legacy); nei test (jsdom senza window.Decimal) fallback break_eternity.
 * Esportato col NOME `Decimal` così i corpi dei dati (`new Decimal(...)`)
 * restano byte-intatti nella conversione.
 */
import { Decimal as EternityDecimal } from '../core/bignum';

export const Decimal: any =
  typeof window !== 'undefined' && (window as any).Decimal
    ? (window as any).Decimal
    : EternityDecimal;
