import { describe, it, expect } from 'vitest';
import { skinAccent, RARITY_COLORS, RARITY_GLOWS } from './rarity';
import { CALENDAR_SEASONS } from '../data/season';

describe('ui/rarity — skinAccent', () => {
  it('rarità normali: colore e alone della mappa, common come ripiego', () => {
    expect(skinAccent({ rarity: 'epic' })).toEqual({ color: RARITY_COLORS.epic, glow: RARITY_GLOWS.epic });
    expect(skinAccent({ rarity: 'sconosciuta' })).toEqual({ color: RARITY_COLORS.common, glow: RARITY_GLOWS.common });
    expect(skinAccent(undefined)).toEqual({ color: RARITY_COLORS.common, glow: RARITY_GLOWS.common });
  });
  it('festive: il colore lo decide la stagione della skin', () => {
    expect(skinAccent({ rarity: 'festive', season: 'halloween' })).toEqual(CALENDAR_SEASONS.halloween.accent);
    expect(skinAccent({ rarity: 'festive', season: 'christmas' })).toEqual(CALENDAR_SEASONS.christmas.accent);
  });
  it('festive senza stagione valida: ripiega sul colore festive di base', () => {
    expect(skinAccent({ rarity: 'festive' })).toEqual({ color: RARITY_COLORS.festive, glow: RARITY_GLOWS.festive });
    expect(skinAccent({ rarity: 'festive', season: 'pasqua' })).toEqual({ color: RARITY_COLORS.festive, glow: RARITY_GLOWS.festive });
  });
  it('la season su una skin non festive non cambia il colore', () => {
    expect(skinAccent({ rarity: 'rare', season: 'halloween' }).color).toBe(RARITY_COLORS.rare);
  });
});
