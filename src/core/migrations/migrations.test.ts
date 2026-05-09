import { describe, it, expect } from 'vitest';
import { migrate, detectSchemaVersion } from './index';
import type { SaveStateV1, SaveStateV2 } from '../../types/save';
import { CURRENT_SCHEMA_VERSION } from '../../types/save';

describe('detectSchemaVersion', () => {
  it('null → 0', () => expect(detectSchemaVersion(null)).toBe(0));
  it('save senza campo → 1 (legacy)', () => expect(detectSchemaVersion({})).toBe(1));
  it('save con schemaVersion: 2', () => expect(detectSchemaVersion({ schemaVersion: 2 })).toBe(2));
});

describe('migrate', () => {
  it('null input → null output', () => {
    expect(migrate(null)).toEqual({ state: null, report: null });
  });

  it('save già current → no-op, report null', () => {
    const v2: SaveStateV2 = {
      schemaVersion: 2,
      version: { major: 2, minor: 0, patch: 0 },
      user: { username: 'tester', masterVolume: 0.8 },
      skins: { current: 'default', unlocked: ['default'] },
      score: '100', totalScore: '100', lifetimeScore: '100',
      totalOfflineScore: '0', prestigePoints: '0', lifetimePrestigePoints: '0',
      baseClickValue: '1', qBits: '0', lifetimeQBits: '0',
      totalFormattazioni: 0, totalResets: 0, crunchTimeEndTime: 0,
      teams: {}, buildingEnhancements: {}, achievements: {},
    };
    const out = migrate(v2);
    expect(out.state).toBe(v2);
    expect(out.report).toBeNull();
  });

  it('V1 minimo → V2 con default', () => {
    const v1: SaveStateV1 = { score: 50 };
    const out = migrate(v1);
    expect(out.state?.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(out.state?.score).toBe('0'); // formattazione azzera
    expect(out.state?.user.masterVolume).toBe(0.8);
    expect(out.state?.skins.current).toBe('default');
    expect(out.report?.fromVersion).toBe(1);
    expect(out.report?.veteranReward).toBe(false);
  });

  it('V1 veterano (totalScore > 10000) → qBit + formattazione', () => {
    const v1: SaveStateV1 = {
      totalScore: '50000',
      lifetimeScore: '50000',
      skins: { unlocked: ['default', 'gold'], current: 'gold' },
      user: { username: 'oldplayer', masterVolume: 0.5 },
    };
    const out = migrate(v1);
    expect(out.state?.qBits).toBe('1');
    expect(out.state?.lifetimeQBits).toBe('1');
    expect(out.state?.totalFormattazioni).toBe(1);
    expect(out.state?.skins.unlocked).toEqual(['default', 'gold']);
    expect(out.state?.skins.current).toBe('gold');
    expect(out.state?.user.username).toBe('oldplayer');
    expect(out.state?.user.masterVolume).toBe(0.5);
    expect(out.state?.totalScore).toBe('50000');
    expect(out.state?.lifetimeScore).toBe('50000');
    expect(out.report?.veteranReward).toBe(true);
  });

  it('V1 con notazione esponenziale enorme = veterano', () => {
    const v1: SaveStateV1 = { totalScore: '1.5e+50' };
    const out = migrate(v1);
    expect(out.report?.veteranReward).toBe(true);
    expect(out.state?.qBits).toBe('1');
  });

  it('V1 buildings → V2 teams (rename legacy)', () => {
    const v1: SaveStateV1 = { buildings: { dev: { level: 5 } } };
    const out = migrate(v1);
    expect(out.state?.teams).toEqual({ dev: { level: 5 } });
  });

  it('idempotente: doppia migrate non rovina lo stato', () => {
    const v1: SaveStateV1 = { totalScore: '100' };
    const first = migrate(v1);
    const second = migrate(first.state);
    expect(second.state).toBe(first.state);
    expect(second.report).toBeNull();
  });

  it('schemaVersion futuro → throw', () => {
    expect(() => migrate({ schemaVersion: 999 } as never)).toThrow(/più recente/);
  });
});
