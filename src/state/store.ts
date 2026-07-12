/**
 * Store dello stato mutabile condiviso (reorg filone A, 2026-07-12).
 * Unica fonte delle 11 variabili runtime che erano `var` top-level in
 * js/data/gamestate.js. Il legacy vi accede tramite gli accessor window.*
 * installati da interop.ts (TEMPORANEI fino a fine filone C); i moduli V3
 * importano `store` direttamente.
 *
 * Decimal: a runtime window.Decimal (break_infinity, primo script della
 * pagina — contratto F0/F7) → istanze bit-identiche al legacy; nei test
 * (jsdom, senza window.Decimal) fallback break_eternity via core/bignum.
 */
import { Decimal as EternityDecimal } from '../core/bignum';

const D: any =
  typeof window !== 'undefined' && (window as any).Decimal
    ? (window as any).Decimal
    : EternityDecimal;

export interface SharedStore {
  gameState: Record<string, any> | undefined;
  bps: any;
  prestigeBonus: any;
  clickCPSBonus: any;
  isBluescreenActive: boolean;
  bluescreenMultiplier: any;
  crunchTimeMultiplier: any;
  crunchTimeEndTime: number;
  crunchTimeCooldownEnd: number;
  clickHistory: Array<{ time: number; value: any }>;
  achievementsBPSBonus: any;
}

export const store: SharedStore = {
  gameState: undefined,
  bps: new D(0),
  prestigeBonus: new D(1),
  clickCPSBonus: new D(1),
  isBluescreenActive: false,
  bluescreenMultiplier: new D(1),
  crunchTimeMultiplier: new D(1),
  crunchTimeEndTime: 0,
  crunchTimeCooldownEnd: 0,
  clickHistory: [],
  achievementsBPSBonus: new D(0),
};

/** Le 11 chiavi condivise (contratto con interop e col legacy). */
export const STORE_KEYS = Object.keys(store) as Array<keyof SharedStore>;
