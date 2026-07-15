/**
 * Migration framework idempotente.
 *
 * Sostituisce migrazione inline V1→V2 in js/script.js:1774-1837.
 * Problema risolto: la vecchia logica controllava `cloudState.version.major`
 * con default 1 e si auto-loop-ava se il bump non scriveva il campo.
 *
 * Nuovo design:
 * - ogni migration ha un `from` schemaVersion e produce il successivo
 * - applicate in sequenza fino a CURRENT_SCHEMA_VERSION
 * - idempotenti: chiamare migrate() su uno state già current = no-op
 * - pure: nessun side-effect su DOM/window (testabili in jsdom)
 *
 * Side effects (toast, modal, reset gameState runtime) sono ritornati come
 * `MigrationReport` e applicati dal caller.
 */
import type { AnySaveState, SaveStateCurrent } from '../../types/save';
import { CURRENT_SCHEMA_VERSION } from '../../types/save';
import { v1ToV2 } from './v1-to-v2';
import { v2ToV3 } from './v2-to-v3';

export interface MigrationReport {
  fromVersion: number;
  toVersion: number;
  steps: string[];
  /** True se l'utente aveva un save legacy con progressi → mostrare release notes / premio veterano. */
  veteranReward?: boolean;
  /** V2→V3: giocatore pre-lancio idoneo al premio Fondatore (skin esclusiva + salva 5 skin). */
  founderReward?: boolean;
  /** V2→V3: skin non-default possedute pre-lancio, candidate al picker (max 5). */
  salvageableSkins?: string[];
}

export interface MigrationStep<From, To> {
  from: number;
  to: number;
  description: string;
  apply: (state: From) => {
    state: To;
    veteranReward?: boolean;
    founderReward?: boolean;
    salvageableSkins?: string[];
  };
}

/** Ordine cronologico: v1→v2, v2→v3 (lancio produzione), futuri v3→v4, ... */
const MIGRATIONS: ReadonlyArray<MigrationStep<any, any>> = [v1ToV2, v2ToV3];

/**
 * Determina lo schemaVersion di uno save. Saves pre-v2 senza campo = 1.
 */
export function detectSchemaVersion(state: unknown): number {
  if (!state || typeof state !== 'object') return 0;
  const v = (state as { schemaVersion?: unknown }).schemaVersion;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  return 1;
}

/**
 * Applica catena di migration fino a CURRENT_SCHEMA_VERSION.
 * Throws se non esiste path tra `from` e target.
 */
export function migrate(input: AnySaveState | null): {
  state: SaveStateCurrent | null;
  report: MigrationReport | null;
} {
  if (!input) return { state: null, report: null };
  const fromVersion = detectSchemaVersion(input);
  if (fromVersion === CURRENT_SCHEMA_VERSION) {
    return { state: input as SaveStateCurrent, report: null };
  }
  if (fromVersion > CURRENT_SCHEMA_VERSION) {
    throw new Error(
      `Save schema v${fromVersion} è più recente del codice (v${CURRENT_SCHEMA_VERSION}). Aggiornare il client.`,
    );
  }

  let current: unknown = input;
  let version = fromVersion;
  const steps: string[] = [];
  let veteranReward = false;
  let founderReward = false;
  let salvageableSkins: string[] | undefined;

  while (version < CURRENT_SCHEMA_VERSION) {
    const step = MIGRATIONS.find((m) => m.from === version);
    if (!step) {
      throw new Error(`Migration mancante: nessun path da v${version}`);
    }
    const result = step.apply(current);
    current = result.state;
    if (result.veteranReward) veteranReward = true;
    if (result.founderReward) founderReward = true;
    if (result.salvageableSkins) salvageableSkins = result.salvageableSkins;
    steps.push(step.description);
    version = step.to;
  }

  const report: MigrationReport = {
    fromVersion,
    toVersion: version,
    steps,
    veteranReward,
    founderReward,
  };
  if (salvageableSkins) report.salvageableSkins = salvageableSkins;

  return { state: current as SaveStateCurrent, report };
}
