import { describe, it, expect } from 'vitest';
import { gameData } from './index';
import { en } from './en/index';
import {
  isChristmasSeason, isHalloweenSeason, isSeasonActive, isSeasonActiveIn, IS_XMAS_TIME, IS_HALLOWEEN_TIME,
  CALENDAR_SEASONS, isInSeasonWindow, activeSeasonsAt, parseSeasonOverride,
} from './season';

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
    expect(IS_HALLOWEEN_TIME).toBe(isHalloweenSeason());
    expect(isSeasonActive('halloween')).toBe(IS_HALLOWEEN_TIME);
  });
  it('finestre a calendario: estremi inclusi, Natale scavalca il capodanno', () => {
    const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12);
    const { halloween, christmas } = CALENDAR_SEASONS;
    expect(isInSeasonWindow(halloween, at(2026, 10, 23))).toBe(false);
    expect(isInSeasonWindow(halloween, at(2026, 10, 24))).toBe(true);
    expect(isInSeasonWindow(halloween, at(2026, 10, 31))).toBe(true);
    expect(isInSeasonWindow(halloween, at(2026, 11, 2))).toBe(true);
    expect(isInSeasonWindow(halloween, at(2026, 11, 3))).toBe(false);
    expect(isInSeasonWindow(christmas, at(2026, 11, 30))).toBe(false);
    expect(isInSeasonWindow(christmas, at(2026, 12, 1))).toBe(true);
    expect(isInSeasonWindow(christmas, at(2026, 12, 31))).toBe(true);
    expect(isInSeasonWindow(christmas, at(2027, 1, 8))).toBe(true);
    expect(isInSeasonWindow(christmas, at(2027, 1, 9))).toBe(false);
    // estremi del giorno: conta la data locale, non l'ora
    expect(isInSeasonWindow(halloween, new Date(2026, 9, 24, 0, 0, 0))).toBe(true);
    expect(isInSeasonWindow(halloween, new Date(2026, 10, 2, 23, 59, 59))).toBe(true);
  });
  it('activeSeasonsAt: nessuna, una, e mai due insieme nel calendario attuale', () => {
    const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12);
    expect(activeSeasonsAt(at(2026, 9, 29))).toEqual([]);
    expect(activeSeasonsAt(at(2026, 10, 31))).toEqual(['halloween']);
    expect(activeSeasonsAt(at(2026, 12, 25))).toEqual(['christmas']);
    for (let t = new Date(2026, 0, 1); t.getFullYear() === 2026; t.setDate(t.getDate() + 1)) {
      expect(activeSeasonsAt(t).length).toBeLessThanOrEqual(1);
    }
  });
  it('isSeasonActiveIn: vuoto = non stagionale, id sconosciuto = spento', () => {
    expect(isSeasonActiveIn('', [])).toBe(true);
    expect(isSeasonActiveIn('halloween', ['halloween'])).toBe(true);
    expect(isSeasonActiveIn('christmas', ['halloween'])).toBe(false);
    expect(isSeasonActiveIn('sconosciuta', ['halloween'])).toBe(false);
  });
  it('parseSeasonOverride: auto/assente = calendario, nessuna = tutto spento, id ignoti scartati', () => {
    expect(parseSeasonOverride(null)).toBeNull();
    expect(parseSeasonOverride('')).toBeNull();
    expect(parseSeasonOverride('auto')).toBeNull();
    expect(parseSeasonOverride('nessuna')).toEqual([]);
    expect(parseSeasonOverride('none')).toEqual([]);
    expect(parseSeasonOverride('Halloween')).toEqual(['halloween']);
    expect(parseSeasonOverride('halloween, christmas')).toEqual(['halloween', 'christmas']);
    expect(parseSeasonOverride('pasqua,christmas')).toEqual(['christmas']);
  });
  it('ogni skin gatata da una stagione esiste in skins', () => {
    for (const s of Object.values(CALENDAR_SEASONS)) {
      for (const id of s.skins) expect(gameData.skins[id], `skin ${id} di ${s.id}`).toBeDefined();
    }
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
