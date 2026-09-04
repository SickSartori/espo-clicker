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

/**
 * Schema versione 3 — lancio in produzione ("Season 1").
 *
 * Shape identico a V2 più i marcatori del cutover di lancio: l'economia viene
 * azzerata (reset gestito dall'orchestratore in boot.ts, non da questa forma),
 * la classifica riparte da Season 1, e i giocatori pre-lancio ricevono lo status
 * Fondatore. Le skin non-default vanno ri-sbloccate: il Fondatore ne salva fino
 * a 5 tramite un picker interattivo (finché `pendingFounderChoice` è true).
 */
export interface SaveStateV3 extends Omit<SaveStateV2, 'schemaVersion'> {
  schemaVersion: 3;
  /** Stagione della classifica. Il lancio in produzione apre la Season 1. */
  season?: number;
  /** True per i giocatori pre-lancio premiati come Fondatori. */
  isFounder?: boolean;
  /** Timestamp del cutover di lancio in cui è stato coniato lo status Fondatore. */
  foundedAt?: number;
  /**
   * Scelta skin Fondatore ancora da compiere.
   * ⚠️ Storico: col tetto tolto (25/08/2026) la migrazione non lo imposta più.
   * Resta nel tipo perché i save di chi si era fermato a metà picker lo portano
   * ancora, e il modale lo usa per assegnare d'ufficio tutte le candidate.
   */
  pendingFounderChoice?: boolean;
  /** Skin non-default possedute pre-lancio, candidate al picker. Vedi sopra. */
  founderCandidateSkins?: string[];
  /**
   * Id delle riparazioni skin una tantum già applicate a questo save
   * (`src/data/founder-grants.ts`). Serve a non riapplicarle a ogni caricamento.
   */
  riparazioniSkin?: string[];
  /**
   * True se questo save è passato dalla migrazione di lancio (v2→v3).
   * Persistito (≠ `window._launchMigrationDone`, che vive solo una sessione):
   * serve a distinguere, al login con cloud ancora pre-wipe, un locale Season 1
   * REALE da uno stato default — anche i nuovi giocatori nascono schemaVersion 3.
   */
  launchMigrated?: boolean;
}

/** Alias per lo schema corrente — aggiornare quando si bumpa. */
export type SaveStateCurrent = SaveStateV3;
export const CURRENT_SCHEMA_VERSION = 3 as const;

/** Union di tutti gli schemi conosciuti. Migrator narrowa via `schemaVersion`. */
export type AnySaveState = SaveStateV1 | SaveStateV2 | SaveStateV3;
