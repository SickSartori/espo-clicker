import { store } from './store';

/**
 * Bridge DEV-ONLY: espone su window gli accessor per le sole chiavi dello store
 * che js/cheatboard.js (classic, iniettato solo in dev) usa come global bare.
 * NON è per la produzione — sostituisce, per la sola cheatboard, il vecchio
 * interop.ts (rimosso in Blocco #3). Rimuovibile solo migrando cheatboard a ESM.
 */
const CHEAT_KEYS = ['gameState', 'bps', 'crunchTimeMultiplier', 'crunchTimeEndTime', 'crunchTimeCooldownEnd'] as const;

export function installCheatboardBridge(): void {
  const w = window as any;
  for (const k of CHEAT_KEYS) {
    if (Object.getOwnPropertyDescriptor(w, k)) continue; // già presente (interop non ancora rimosso, o doppia install)
    Object.defineProperty(w, k, {
      get: () => (store as any)[k],
      set: (v) => { (store as any)[k] = v; },
      configurable: true,
    });
  }
}
