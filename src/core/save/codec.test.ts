import { describe, it, expect } from 'vitest';
import { encodeSave, encodeSaveString, decodeSave } from './codec';

describe('codec', () => {
  it('round-trip preserva oggetto', () => {
    const data = { score: '1234', user: { username: 'esp' } };
    const enc = encodeSave(data);
    const dec = decodeSave<typeof data>(enc);
    expect(dec).toEqual(data);
  });

  it('round-trip preserva unicode', () => {
    const data = { msg: '🚀 Promozione äé' };
    expect(decodeSave(encodeSave(data))).toEqual(data);
  });

  it('decode null/undefined → null', () => {
    expect(decodeSave(null)).toBeNull();
    expect(decodeSave(undefined)).toBeNull();
    expect(decodeSave('')).toBeNull();
  });

  it('decode payload corrotto → null (no throw)', () => {
    expect(decodeSave('garbage non compresso')).toBeNull();
  });

  it('encodeSaveString(JSON.stringify(x)) ≡ encodeSave(x)', () => {
    const data = { score: '1.5e+310', teams: { dev: 3 }, msg: 'Espoooo 🐛' };
    expect(encodeSaveString(JSON.stringify(data))).toBe(encodeSave(data));
    expect(decodeSave(encodeSaveString(JSON.stringify(data)))).toEqual(data);
  });

  it('compressione riduce JSON ripetitivo', () => {
    const big = { items: Array.from({ length: 100 }, () => ({ name: 'team_x', level: 1 })) };
    const enc = encodeSave(big);
    const json = JSON.stringify(big);
    expect(enc.length).toBeLessThan(json.length);
  });
});
