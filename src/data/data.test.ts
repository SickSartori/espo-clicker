import { describe, it, expect } from 'vitest';
import { gameData } from './index';
import { en } from './en/index';
import { isChristmasSeason, isSeasonActive, IS_XMAS_TIME } from './season';

describe('data/season (fix B2)', () => {
  it('IS_XMAS_TIME coerente con isChristmasSeason e isSeasonActive', () => {
    expect(IS_XMAS_TIME).toBe(isChristmasSeason());
    expect(isSeasonActive('christmas')).toBe(IS_XMAS_TIME);
    expect(isSeasonActive('')).toBe(true);
    expect(isSeasonActive('sconosciuta')).toBe(false);
  });
  it('unlockHint natalizio EN valorizzato da season (non undefined)', () => {
    const hint = en.skins.christmas.unlockHint;
    expect([
      "Redeem the 'Merry Christmas' achievement!",
      'Available in the Shop for 5 Tokens.',
    ]).toContain(hint);
  });
});

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

describe('data/en overlay (reorg filone B)', () => {
  it('gli id dei dizionari en esistono nelle collezioni base (niente chiavi orfane)', () => {
    for (const id of Object.keys(en.teams ?? {})) {
      // le collezioni base arrivano in B3: finché mancano, il check è sui texts
      if (gameData.teams) expect(gameData.teams[id], `team en orfano: ${id}`).toBeTruthy();
    }
    expect(en.texts).toBeTypeOf('object');
  });
  it('gameData.i18n.en è cablato', () => {
    expect(gameData.i18n.en).toBe(en);
  });
});
