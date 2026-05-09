/**
 * Tipi save state. Versionato esplicitamente.
 *
 * `schemaVersion` discrimina lo shape — la migration chain in core/migrations/
 * porta qualunque vecchio salvataggio fino allo SchemaCurrent.
 *
 * Decimal: rappresentato come stringa nel save (serializzabile).
 * Reidratato a istanza Decimal solo quando entra nel runtime gameState.
 */

/** Stringa decimale (output di Decimal.toString()). Es. "1.234e+45" o "12345". */
export type DecimalString = string;

export interface SaveVersion {
  major: number;
  minor: number;
  patch: number;
}

export interface SaveUserBlock {
  username: string;
  masterVolume: number;
}

export interface SaveSkinsBlock {
  current: string;
  unlocked: string[];
}

/** Schema versione 1 — pre-formattazione. Solo lettura per migrare. */
export interface SaveStateV1 {
  schemaVersion?: 1; // pre-V9 saves potrebbero non avere il campo → undefined trattato come 1
  version?: SaveVersion;
  score?: DecimalString | number;
  totalScore?: DecimalString | number;
  lifetimeScore?: DecimalString | number;
  prestigePoints?: DecimalString | number;
  user?: Partial<SaveUserBlock>;
  skins?: Partial<SaveSkinsBlock>;
  buildings?: Record<string, unknown>; // legacy nome pre-rename teams
  // tutti gli altri campi non tipati: la V1 era loose
  [k: string]: unknown;
}

/** Schema versione 2 — formattazione/qBits introdotti. */
export interface SaveStateV2 {
  schemaVersion: 2;
  version: SaveVersion;
  user: SaveUserBlock;
  skins: SaveSkinsBlock;
  score: DecimalString;
  totalScore: DecimalString;
  lifetimeScore: DecimalString;
  totalOfflineScore: DecimalString;
  prestigePoints: DecimalString;
  lifetimePrestigePoints: DecimalString;
  baseClickValue: DecimalString;
  qBits: DecimalString;
  lifetimeQBits: DecimalString;
  totalFormattazioni: number;
  totalResets: number;
  crunchTimeEndTime: number;
  teams: Record<string, unknown>;
  buildingEnhancements: Record<string, { purchased: boolean }>;
  achievements: Record<string, { claimed?: boolean; unlocked?: boolean }>;
  // Estensioni future: nuovi campi qui senza bump major.
}

/** Alias per lo schema corrente — aggiornare quando si bumpa. */
export type SaveStateCurrent = SaveStateV2;
export const CURRENT_SCHEMA_VERSION = 2 as const;

/** Union di tutti gli schemi conosciuti. Migrator narrowa via `schemaVersion`. */
export type AnySaveState = SaveStateV1 | SaveStateV2;
