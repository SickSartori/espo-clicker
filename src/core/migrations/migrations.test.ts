import { describe, it, expect } from 'vitest';
import { migrate, detectSchemaVersion } from './index';
import type { SaveStateV1, SaveStateV2, SaveStateV3 } from '../../types/save';
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
    const v3: SaveStateV3 = {
      schemaVersion: 3,
      version: { major: 3, minor: 0, patch: 0 },
      user: { username: 'tester', masterVolume: 0.8 },
      skins: { current: 'default', unlocked: ['default'] },
      score: '100', totalScore: '100', lifetimeScore: '100',
      totalOfflineScore: '0', prestigePoints: '0', lifetimePrestigePoints: '0',
      baseClickValue: '1', qBits: '0', lifetimeQBits: '0',
      totalFormattazioni: 0, totalResets: 0, crunchTimeEndTime: 0,
      teams: {}, buildingEnhancements: {}, achievements: {},
    };
    const out = migrate(v3);
    expect(out.state).toBe(v3);
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

describe('migrate v2→v3 (lancio Season 1)', () => {
  const baseV2 = (over: Partial<SaveStateV2> = {}): SaveStateV2 => ({
    schemaVersion: 2,
    version: { major: 3, minor: 0, patch: 0 },
    user: { username: 'p', masterVolume: 0.7 },
    skins: { current: 'default', unlocked: ['default'] },
    score: '5', totalScore: '5', lifetimeScore: '5',
    totalOfflineScore: '0', prestigePoints: '0', lifetimePrestigePoints: '0',
    baseClickValue: '1', qBits: '0', lifetimeQBits: '0',
    totalFormattazioni: 0, totalResets: 0, crunchTimeEndTime: 0,
    teams: {}, buildingEnhancements: {}, achievements: {},
    ...over,
  });

  it('nessun progresso → non Fondatore, ma Season 1', () => {
    const out = migrate(baseV2());
    expect(out.state?.schemaVersion).toBe(3);
    expect(out.state?.season).toBe(1);
    expect(out.report?.founderReward).toBe(false);
    expect(out.state?.isFounder).toBe(false);
    expect(out.state?.pendingFounderChoice).toBe(false);
  });

  it('≥1 Promozione → Fondatore', () => {
    const out = migrate(baseV2({ totalResets: 1 }));
    expect(out.report?.founderReward).toBe(true);
    expect(out.state?.isFounder).toBe(true);
    expect(out.state?.foundedAt).toBeGreaterThan(0);
  });

  it('≥1 skin non-default → Fondatore, e le salva tutte', () => {
    const out = migrate(baseV2({ skins: { current: 'gold', unlocked: ['default', 'gold', 'rick'] } }));
    expect(out.report?.founderReward).toBe(true);
    expect(out.report?.salvageableSkins).toEqual(['gold', 'rick']);
    expect(out.state?.pendingFounderChoice).toBe(false);
  });

  // Il tetto a 5 e il picker sono stati tolti il 25/08/2026: le skin sono estetica
  // pura (nessun effetto in `data/skins.ts`), quindi non c'era equilibrio da
  // difendere. Questo test prima pretendeva il picker; ora presidia il contrario,
  // cioe' che con un guardaroba grande NON venga chiesto di scegliere.
  it('guardaroba grande → nessun picker, nessuna candidata da scegliere', () => {
    const many = ['default', 'a', 'b', 'c', 'd', 'e', 'f'];
    const out = migrate(baseV2({ skins: { current: 'a', unlocked: many } }));
    expect(out.report?.founderReward).toBe(true);
    expect(out.state?.pendingFounderChoice).toBe(false);
    expect(out.state?.founderCandidateSkins).toBeUndefined();
    // Il salvabile e' TUTTO: e' boot.ts a travasarlo in skins.unlocked.
    expect(out.report?.salvageableSkins).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
  });
});
