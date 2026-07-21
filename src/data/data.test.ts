import { describe, it, expect } from 'vitest';
import { gameData } from './index';
import { en } from './en/index';
import { isChristmasSeason, isSeasonActive, IS_XMAS_TIME } from './season';

describe('data/achievements via store (reorg B4)', () => {
  it('ogni achievement ha una condition funzione', () => {
    expect(Object.keys(gameData.achievements).length).toBeGreaterThan(20);
    for (const [id, a] of Object.entries<any>(gameData.achievements)) {
      expect(typeof a.condition, `condition mancante: ${id}`).toBe('function');
    }
  });
  it('le condition leggono lo stato dallo store (non da globali bare)', async () => {
    const { store } = await import('../state/store');
    store.gameState = { totalClicks: 5, teams: {}, totalScore: { gte: () => false }, totalPlayTime: 0 } as any;
    const runnable = Object.values<any>(gameData.achievements).filter((a) => {
      try { a.condition(); return true; } catch { return false; }
    });
    expect(runnable.length).toBeGreaterThan(0);
    store.gameState = undefined as any; // ripristino (runtime undefined; tipo non-opzionale)
  });
});

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
  it('teams/upgrades hanno costi Decimal-like e skins ha default (B3)', () => {
    const t = Object.values<any>(gameData.teams)[0];
    expect(typeof t.baseCost.mul).toBe('function');
    expect(Object.keys(gameData.skins)).toContain('default');
    expect(Object.keys(gameData.clickUpgrades).length).toBeGreaterThan(0);
    expect(Object.keys(gameData.prestigeUpgrades).length).toBeGreaterThan(0);
    expect(Object.keys(gameData.buildingEnhancements).length).toBeGreaterThan(0);
    expect(Object.keys(gameData.superUpgrades).length).toBeGreaterThan(0);
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
