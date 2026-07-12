import { describe, it, expect, beforeAll } from 'vitest';
import { store, STORE_KEYS } from './store';
import { installInterop } from './interop';

describe('state/interop (reorg filone A)', () => {
  beforeAll(() => { installInterop(window); });

  it('installa un accessor per OGNI chiave dello store', () => {
    for (const k of STORE_KEYS) {
      const d = Object.getOwnPropertyDescriptor(window, k as string);
      expect(typeof d?.get, String(k)).toBe('function');
      expect(typeof d?.set, String(k)).toBe('function');
    }
  });

  it('window.X legge dallo store', () => {
    store.crunchTimeEndTime = 12345;
    expect((window as any).crunchTimeEndTime).toBe(12345);
    store.crunchTimeEndTime = 0; // ripristino
  });

  it('window.X = v scrive nello store (stile legacy `bps = ...`)', () => {
    const prev = store.bps;
    (window as any).bps = 'sentinella';
    expect(store.bps).toBe('sentinella');
    store.bps = prev; // ripristino
  });

  it('typeof window.gameState riflette undefined senza lanciare (semantica var)', () => {
    store.gameState = undefined;
    expect(typeof (window as any).gameState).toBe('undefined');
  });
});
