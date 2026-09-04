import { describe, it, expect } from 'vitest';
import { GAME_VERSION } from './version';

describe('lib/version (C-thin)', () => {
  it('GAME_VERSION ha la forma storica e toString legacy', () => {
    // La major resta fissata: cambiarla è un evento raro e deliberato, giusto che
    // faccia passare di qui. La minor no — pinnarla faceva fallire il test a ogni
    // bump (3.0 → 3.1) senza che niente fosse rotto davvero. Qui si verifica il
    // FORMATO di toString, non il numero.
    expect(GAME_VERSION.major).toBe(3);
    expect(typeof GAME_VERSION.minor).toBe('number');
    expect(String(GAME_VERSION)).toBe(`v3.${GAME_VERSION.minor}`);
  });

  it('toString appende lo stage solo quando valorizzato', () => {
    expect(GAME_VERSION.toString.call({ major: 3, minor: 1, stage: '' })).toBe('v3.1');
    expect(GAME_VERSION.toString.call({ major: 3, minor: 1, stage: 'beta' })).toBe('v3.1 beta');
  });
});
