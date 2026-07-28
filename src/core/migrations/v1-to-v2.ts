/**
 * Migration V1 → V2.
 *
 * Replica logica di js/script.js:1774-1837 in forma pura/testabile.
 *
 * Regole:
 * - mantieni skin sbloccate, skin corrente, masterVolume
 * - mantieni lifetimeScore + totalScore (anti-rollback server-side)
 * - se totalScore > 10000 → veteranReward = true (1 qBit + flag formattazione)
 * - rinomina `buildings` → `teams` (legacy pre-V2)
 * - tutti gli altri campi sono reset (la formattazione V2 azzera il progresso)
 */
import type { SaveStateV1, SaveStateV2 } from '../../types/save';
import type { MigrationStep } from './index';

const VETERAN_THRESHOLD = 10_000;

function decimalStr(v: SaveStateV1[keyof SaveStateV1] | undefined, fallback = '0'): string {
  if (v === undefined || v === null) return fallback;
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : fallback;
  // oggetto Decimal serializzato (es. { mantissa, exponent }) → toString se possibile
  if (typeof v === 'object' && 'toString' in v) {
    try {
      const s = (v as { toString(): string }).toString();
      return s && s !== '[object Object]' ? s : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function isVeteran(state: SaveStateV1): boolean {
  const totalStr = decimalStr(state.totalScore, '0');
  // Confronto numerico approssimato: parse exp notation manualmente per evitare dep da Decimal qui.
  const num = Number(totalStr);
  if (Number.isFinite(num)) return num > VETERAN_THRESHOLD;
  // Notazione esponenziale fuori range double → certamente veterano.
  return /e\+/i.test(totalStr);
}

export const v1ToV2: MigrationStep<SaveStateV1, SaveStateV2> = {
  from: 1,
  to: 2,
  description: 'V1→V2: formattazione, qBits, rename buildings→teams',
  apply(state) {
    const veteran = isVeteran(state);

    const skins = {
      current: state.skins?.current ?? 'default',
      unlocked: state.skins?.unlocked ?? ['default'],
    };
    const user = {
      username: state.user?.username ?? '',
      masterVolume: state.user?.masterVolume ?? 0.8,
    };

    // Stato V2 azzerato preservando solo lifetime/total e rewards veterano
    const next: SaveStateV2 = {
      schemaVersion: 2,
      version: state.version ?? { major: 2, minor: 0, patch: 0 },
      user,
      skins,
      score: '0',
      totalScore: decimalStr(state.totalScore),
      lifetimeScore: decimalStr(state.lifetimeScore),
      totalOfflineScore: '0',
      prestigePoints: '0',
      lifetimePrestigePoints: '0',
      baseClickValue: '1',
      qBits: veteran ? '1' : '0',
      lifetimeQBits: veteran ? '1' : '0',
      totalFormattazioni: veteran ? 1 : 0,
      totalResets: 0,
      crunchTimeEndTime: 0,
      teams: (state.teams as Record<string, unknown>) ?? state.buildings ?? {},
      buildingEnhancements: {},
      achievements: {},
    };

    return { state: next, veteranReward: veteran };
  },
};
