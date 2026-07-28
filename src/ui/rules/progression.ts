/**
 * Regole di progressione UI — gemello V3 dei predicati sparsi in
 * js/ui-functions.js (checkTabNotifications, updateTabsVisibility,
 * checkOverlayNotifications, calculateVisualBPS) — F5 fetta 4.
 *
 * PURI: niente window/gameData/DOM. I big number viaggiano come STRINGHE
 * (confronto via compareDecimalStrings, somma via break_eternity) — il wrapper
 * legacy stringifica i Decimal break_infinity al volo (1-10 hz, costo nullo).
 * I costi scalati che dipendono da formule di game-logic (F6) arrivano già
 * risolti dal wrapper.
 */

import Decimal from 'break_eternity.js';
import { compareDecimalStrings } from '../../core/save/anti-rollback';

export type Big = string | number;

const gte = (a: Big, b: Big): boolean => compareDecimalStrings(a, b) >= 0;
const gt = (a: Big, b: Big): boolean => compareDecimalStrings(a, b) > 0;

// --- Tab Click: esiste un upgrade click acquistabile? ---
export interface ClickUpgradeEntry {
  purchased: boolean;
  requiredClicks: number;
  cost: Big;
}
export function anyClickUpgradeAvailable(
  totalClicks: number,
  score: Big,
  entries: readonly ClickUpgradeEntry[],
): boolean {
  return entries.some(
    (e) => !e.purchased && totalClicks >= e.requiredClicks && gte(score, e.cost),
  );
}

// --- Tab Auto: esiste un potenziamento team acquistabile? ---
export interface EnhancementEntry {
  purchased: boolean;
  requiredCount: number;
  /** Conteggio attuale del team bersaglio (entry senza team → escludere nel wrapper). */
  teamCount: number;
  cost: Big;
}
export function anyEnhancementAvailable(
  score: Big,
  entries: readonly EnhancementEntry[],
): boolean {
  return entries.some(
    (e) => !e.purchased && e.teamCount >= e.requiredCount && gte(score, e.cost),
  );
}

// --- Tab Prestigio: esiste un upgrade prestigio acquistabile? ---
export type PrestigeUpgradeEntry =
  | { counted: true; count: number; maxLevel?: number; cost: Big }
  | { counted: false; purchased: boolean; cost: Big };
export function anyPrestigeUpgradeAvailable(
  unlocked: boolean,
  prestigePoints: Big,
  entries: readonly PrestigeUpgradeEntry[],
): boolean {
  if (!unlocked) return false;
  return entries.some((e) => {
    if (e.counted) {
      if (e.maxLevel && e.count >= e.maxLevel) return false;
      return gte(prestigePoints, e.cost);
    }
    return !e.purchased && gte(prestigePoints, e.cost);
  });
}

// --- Badge achievements: c'è un premio sbloccato non riscattato? ---
export interface AchievementEntry {
  unlocked: boolean;
  claimed: boolean;
  hasReward: boolean;
}
export function anyClaimableAchievement(entries: readonly AchievementEntry[]): boolean {
  return entries.some((e) => e.unlocked && !e.claimed && e.hasReward);
}

// --- Visibilità tab Promozione / Quantum ---
export interface PrestigeTabState {
  totalResets: number;
  prestigePoints: Big;
  lifetimePrestigePoints: Big;
  /** Il format azzera resets/punti ma la promozione resta sbloccata. */
  totalFormattazioni: number;
}
export function isPrestigeTabVisible(s: PrestigeTabState): boolean {
  return (
    s.totalResets > 0 ||
    gt(s.prestigePoints, 0) ||
    gt(s.lifetimePrestigePoints, 0) ||
    s.totalFormattazioni > 0
  );
}

export interface QuantumState {
  totalResets: number;
  totalFormattazioni: number;
  qBits: Big;
}
export function isQuantumUnlocked(s: QuantumState): boolean {
  return s.totalResets >= 20 || s.totalFormattazioni > 0 || gt(s.qBits, 0);
}

// --- BPS visivo: bps passivo + click dell'ultimo secondo ---
export interface RecentClick {
  time: number;
  value: Big;
}
/**
 * Somma bps + i click dentro la finestra. Come il legacy itera dalla coda
 * (i più recenti in fondo) e si ferma al primo fuori finestra.
 * Ritorna stringa Decimal (big-number safe).
 */
export function visualBps(
  bps: Big,
  clicks: readonly RecentClick[],
  now: number,
  windowMs = 1000,
): string {
  let active = new Decimal(0);
  for (let i = clicks.length - 1; i >= 0; i--) {
    const c = clicks[i]!;
    if (now - c.time < windowMs) {
      active = active.add(new Decimal(c.value));
    } else {
      break;
    }
  }
  return active.add(new Decimal(bps)).toString();
}
