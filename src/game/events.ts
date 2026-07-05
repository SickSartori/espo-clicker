/**
 * Eventi — gemello V3 dei calcoli puri di clickGoldenBug, claimDailyBonus e
 * activateCrunchTime (js/game-logic.js, F6 fetta 4, chiude F6).
 *
 * Stesso pattern del resto del core: costruttore Decimal INIETTATO (runtime =
 * break_infinity della pagina → bit-identico; test = break_eternity) e ordine
 * di operazioni replicato alla lettera. Qui vive SOLO la matematica di
 * reward/durata/cooldown: spawn, DOM, audio, toast, buff-timer restano legacy.
 */

import type { Big, BigInput, DecimalCtor } from './economy';

function bigMax2(a: Big, b: Big): Big {
  return a.gte(b) ? a : b;
}

// --- Golden Bug: ricompensa e buff ---
export type GoldenBugType = 'standard' | 'lucky' | 'frenzy';

export interface GoldenBugInput {
  bps: BigInput;
  clickValue: BigInput;
  /** window.goldenBugMult (moltiplicatore globale del bug dorato). */
  globalMult: BigInput;
  bugType: GoldenBugType;
}
export interface GoldenBugResult {
  /** Bug accreditati (già inclusi tutti i moltiplicatori del tipo). */
  bonus: Big;
  /** Presente solo per 'frenzy': buff temporaneo al click. */
  frenzy?: { mult: number; durationMs: number };
}
/**
 * Formula base: (bps×30 + click×10 + 10) × globalMult.
 * lucky → ×8 (jackpot); frenzy → ×2 immediato + buff click ×7 per 15s.
 */
export function goldenBugReward(D: DecimalCtor, input: GoldenBugInput): GoldenBugResult {
  const base = new D(input.bps).mul(30).add(new D(input.clickValue).mul(10)).add(10);
  let bonus = base.mul(input.globalMult);

  if (input.bugType === 'lucky') {
    return { bonus: bonus.mul(8) };
  }
  if (input.bugType === 'frenzy') {
    bonus = bonus.mul(2);
    return { bonus, frenzy: { mult: 7, durationMs: 15000 } };
  }
  return { bonus };
}

// --- Bonus giornaliero (login streak) ---
/**
 * Nuovo streak: +1 se l'ultima riscossione era ieri, altrimenti riparte da 1.
 */
export function dailyStreak(
  lastDate: string | null | undefined,
  todayStr: string,
  yesterdayStr: string,
  prevStreak: number,
): number {
  if (lastDate === yesterdayStr) return (prevStreak || 0) + 1;
  return 1;
}

export interface DailyRewardInput {
  bps: BigInput;
  baseClickValue: BigInput;
  streak: number;
}
/**
 * Ricompensa = secondi di produzione (scala con lo streak, cap 7gg) con un
 * pavimento per BPS bassi e un minimo assoluto di 50.
 *   cap = min(streak, 7); secs = 600 + cap×200 (800→2000)
 *   reward = max(bps×secs, baseClickValue×(50×cap+50), 50)
 */
export function dailyReward(D: DecimalCtor, input: DailyRewardInput): Big {
  const cap = Math.min(input.streak, 7);
  const secs = 600 + cap * 200;
  let reward = new D(input.bps).mul(secs);
  const floor = new D(input.baseClickValue).mul(50 * cap + 50);
  reward = bigMax2(reward, floor);
  reward = bigMax2(reward, new D(50));
  return reward;
}

// --- Crunch Time (Espo Fury): durata e cooldown ---
/** Durata della fury: 60s con Overclock, 30s altrimenti. */
export function crunchDuration(overclock: boolean): number {
  return overclock ? 60000 : 30000;
}
/**
 * Cooldown a partire dalla FINE della fury: 300s − 30s×livello Rete Contatti,
 * con pavimento a 60s.
 */
export function crunchCooldownFromEnd(reteContattiLevel: number): number {
  return Math.max(60000, 300000 - reteContattiLevel * 30000);
}

/** Moltiplicatore fisso della fury (esposto per singola fonte di verità). */
export const CRUNCH_MULTIPLIER = 7;
