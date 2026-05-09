/**
 * Anti-rollback comparator.
 *
 * Sostituisce logica inline in js/script.js:1755-1772.
 *
 * Decide se preferire LOCAL o CLOUD save quando un utente torna online.
 * Strategia: gerarchia di preferenza Format > Prestige > Score (lifetime, mai resetta).
 *
 * Scelta puramente in stringa per evitare dep da Decimal qui.
 * Big numbers gestiti via parsing exp-notation manuale.
 */

import type { AnySaveState, DecimalString } from '../../types/save';

export type RollbackChoice = 'local' | 'cloud' | 'equal';

interface Comparable {
  totalFormattazioni?: number;
  lifetimePrestigePoints?: DecimalString | number;
  lifetimeScore?: DecimalString | number;
}

/**
 * Confronta due numeri rappresentati come stringhe (con eventuale notazione 1.5e+50).
 * Ritorna -1, 0, 1.
 */
export function compareDecimalStrings(a: unknown, b: unknown): number {
  const na = parseLoose(a);
  const nb = parseLoose(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) {
    if (na > nb) return 1;
    if (na < nb) return -1;
    return 0;
  }
  // Fuori range double → confronto manuale exp+mantissa
  const ea = expOf(a);
  const eb = expOf(b);
  if (ea !== eb) return ea > eb ? 1 : -1;
  // stesso esponente → confronto mantissa
  const ma = mantissaOf(a);
  const mb = mantissaOf(b);
  if (ma > mb) return 1;
  if (ma < mb) return -1;
  return 0;
}

function parseLoose(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return Number(v);
  return NaN;
}

function expOf(v: unknown): number {
  const s = typeof v === 'string' ? v : String(v ?? 0);
  const m = /e([+-]?\d+)/i.exec(s);
  if (m && m[1]) return Number(m[1]);
  // calcola esponente dalla parte intera
  const num = Number(s);
  if (!Number.isFinite(num) || num === 0) return 0;
  return Math.floor(Math.log10(Math.abs(num)));
}

function mantissaOf(v: unknown): number {
  const s = typeof v === 'string' ? v : String(v ?? 0);
  const m = /^(-?\d+(?:\.\d+)?)/.exec(s);
  return m && m[1] ? Number(m[1]) : 0;
}

/**
 * Decide se conservare LOCAL o sovrascrivere con CLOUD.
 *
 * Se LOCAL >= CLOUD su tutti i campi gerarchici → 'local' (anti-rollback).
 * Se CLOUD strettamente maggiore in qualche campo → 'cloud'.
 * Se identici → 'equal'.
 */
export function decideRollback(local: Comparable | null, cloud: Comparable | null): RollbackChoice {
  if (!cloud) return 'local';
  if (!local) return 'cloud';

  const fmt = (local.totalFormattazioni ?? 0) - (cloud.totalFormattazioni ?? 0);
  if (fmt > 0) return 'local';
  if (fmt < 0) return 'cloud';

  const pres = compareDecimalStrings(
    local.lifetimePrestigePoints ?? 0,
    cloud.lifetimePrestigePoints ?? 0,
  );
  if (pres > 0) return 'local';
  if (pres < 0) return 'cloud';

  const score = compareDecimalStrings(local.lifetimeScore ?? 0, cloud.lifetimeScore ?? 0);
  if (score > 0) return 'local';
  if (score < 0) return 'cloud';

  return 'equal';
}

/** Wrapper che accetta direttamente save state. */
export function decideRollbackFromSaves(
  local: AnySaveState | null,
  cloud: AnySaveState | null,
): RollbackChoice {
  return decideRollback(local as Comparable, cloud as Comparable);
}
