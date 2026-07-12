import { describe, it, expect } from 'vitest';
import { gameData } from './index';

describe('data/index (reorg filone B)', () => {
  it('espone texts con la struttura consumata dal gioco', () => {
    expect(gameData.texts.format.suffixes.length).toBeGreaterThan(40); // scala fino a Qag
    expect(gameData.texts.format.time.s).toBeTypeOf('string');
    expect(gameData.texts.toasts).toBeTypeOf('object');
    expect(gameData.texts.ui).toBeTypeOf('object');
  });
  it('espone events e assets', () => {
    expect(Object.keys(gameData.events).length).toBeGreaterThan(0);
    expect(gameData.assets.sounds).toBeTypeOf('object');
  });
});
