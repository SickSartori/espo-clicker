/**
 * Store dello stato mutabile condiviso (reorg filone A, 2026-07-12).
 * Unica fonte delle 11 variabili runtime che erano `var` top-level in
 * js/data/gamestate.js. I moduli V3 importano `store` direttamente; interop.ts
 * (l'accessor window.* temporaneo per il legacy) è stato rimosso in Blocco #3,
 * Fase C. La sola eccezione dev-only è js/cheatboard.js, servita dal bridge
 * minimo in state/cheatboard-bridge.ts.
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
  /** Popolato al boot da initGameState (src/state/game-state.ts) PRIMA di ogni lettura dei moduli.
   *  Tipato non-opzionale (invariante "inizializzato-al-boot") per evitare `!` a ogni accesso. */
  gameState: Record<string, any>;
  /** Dati di gioco (filone B): riferimento all'oggetto di src/data. Popolato al boot da installGameData. */
  gameData: Record<string, any>;
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
  // Runtime `undefined` finché initGameState/installGameData non girano al boot; il cast
  // riflette l'invariante "sempre presente quando i moduli leggono" (vedi SharedStore).
  gameState: undefined as unknown as Record<string, any>,
  gameData: undefined as unknown as Record<string, any>,
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

/** Le chiavi condivise (ex contratto con interop, ora solo con cheatboard-bridge): 11 runtime + gameData. */
export const STORE_KEYS = Object.keys(store) as Array<keyof SharedStore>;
