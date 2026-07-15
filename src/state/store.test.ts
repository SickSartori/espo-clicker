import { describe, it, expect } from 'vitest';
import { store, STORE_KEYS } from './store';

describe('state/store (reorg filone A)', () => {
  it('espone le 12 chiavi condivise (11 runtime storiche + gameData, filone B)', () => {
    expect([...STORE_KEYS].sort()).toEqual(
      [
        'achievementsBPSBonus', 'bluescreenMultiplier', 'bps', 'clickCPSBonus',
        'clickHistory', 'crunchTimeCooldownEnd', 'crunchTimeEndTime',
        'crunchTimeMultiplier', 'gameData', 'gameState', 'isBluescreenActive', 'prestigeBonus',
      ].sort(),
    );
  });

  it('valori iniziali con la semantica legacy di gamestate.js', () => {
    expect(store.gameState).toBeUndefined();
    expect(String(store.bps)).toBe('0');
    expect(String(store.prestigeBonus)).toBe('1');
    expect(String(store.clickCPSBonus)).toBe('1');
    expect(store.isBluescreenActive).toBe(false);
    expect(String(store.bluescreenMultiplier)).toBe('1');
    expect(String(store.crunchTimeMultiplier)).toBe('1');
    expect(store.crunchTimeEndTime).toBe(0);
    expect(store.crunchTimeCooldownEnd).toBe(0);
    expect(store.clickHistory).toEqual([]);
    expect(String(store.achievementsBPSBonus)).toBe('0');
  });

  it('riassegnazione di campo (pattern legacy `gameState = newState`)', () => {
    const s = { score: 1 } as any;
    store.gameState = s;
    expect(store.gameState).toBe(s);
    store.gameState = undefined as any; // ripristino (runtime undefined; il tipo è non-opzionale)
  });
});
