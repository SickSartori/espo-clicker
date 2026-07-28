import { describe, it, expect } from 'vitest';
import { GAME_VERSION } from './version';

describe('lib/version (C-thin)', () => {
  it('GAME_VERSION ha la forma storica e toString legacy', () => {
    expect(GAME_VERSION.major).toBe(3);
    expect(GAME_VERSION.minor).toBe(0);
    expect(String(GAME_VERSION)).toBe('v3.0');
  });
});
