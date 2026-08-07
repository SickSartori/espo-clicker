/**
 * Prestigio & Formattazione — gemello V3 dei calcoli puri di executePrestige /
 * calculatePrestigeGained / executeFormattingSequence (js/game-logic.js, F6 fetta 3).
 *
 * Stesso pattern della fetta economia: costruttore Decimal INIETTATO (runtime =
 * break_infinity della pagina → bit-identico; test = break_eternity) e ordine
 * di operazioni replicato alla lettera. Qui vive SOLO la matematica: gli
 * azzeramenti di stato, i dati persistenti e le animazioni restano nel legacy.
 */

import type { Big, BigInput, DecimalCtor } from './economy';

/** min(a, b) via confronto — evita la dipendenza dallo static Decimal.min. */
function bigMin(a: Big, b: Big): Big {
  return a.lte(b) ? a : b;
}

// --- Token guadagnati dalla Promozione ---
export interface PrestigeGainInput {
  totalScore: BigInput;
  threshold: BigInput;
  /** Base del reward: sqrt(scoreUtile / base). */
  base?: BigInput; // default 250000
  /** Cap anti-grind: lo score utile non supera threshold × questo. */
  capMultiple?: number; // default 4
}
/**
 * Sotto soglia → 0. Altrimenti sqrt(min(totalScore, threshold×4) / 250000).floor().
 * NON include il Replicatore di Token (+20%): il legacy lo applica ai call-site.
 */
export function prestigeGained(D: DecimalCtor, input: PrestigeGainInput): Big {
  const totalScore = new D(input.totalScore);
  const threshold = new D(input.threshold);
  if (totalScore.lt(threshold)) return new D(0);
  const base = new D(input.base ?? 250000);
  const effectiveScore = bigMin(totalScore, threshold.mul(input.capMultiple ?? 4));
  return effectiveScore.div(base).sqrt().floor();
}

/** Replicatore di Token: +20% floored — stessa formula nei due call-site legacy. */
export function applyTokenDuplicator(gained: Big, purchased: boolean): Big {
  if (!purchased) return gained;
  return gained.mul(1.2).floor();
}

// --- Bug di partenza post-promozione (Paracadute + Fast Start) ---
export interface StartingBugsInput {
  paracaduteLevel: number;
  fastStart: boolean;
}
export function prestigeStartingBugs(D: DecimalCtor, input: StartingBugsInput): Big {
  let bugs = new D(0);
  if (input.paracaduteLevel > 0) {
    bugs = new D(input.paracaduteLevel).mul(2000);
  }
  if (input.fastStart) {
    bugs = bugs.add(1000000);
  }
  return bugs;
}

// --- Carryover team post-promozione (Keep Teams / Eredità / Accelerazione / Fast Start) ---
const BASE_TEAMS_ALLOWED = ['assistenteQa', 'jiraTicket', 'teamQa'] as const;

export interface TeamCarryoverInput {
  keepTeams: boolean;
  /** Livello Deadline Stretta: alza il tetto del Keep Teams (5 + livello). */
  deadlineLevel: number;
  /** Livello Eredità: minimo garantito di Assistenti QA. */
  ereditaLevel: number;
  accelerazione: boolean;
  fastStart: boolean;
  /** Conteggi PRIMA del reset (gameState.teams). */
  previous: Record<string, number>;
  /** Conteggi del nuovo stato appena generato (di solito 0, data-driven). */
  initial: Record<string, number>;
}
/**
 * Ritorna i conteggi finali per il nuovo stato. Replica l'ordine legacy:
 * 1) Keep Teams: per i 3 team base con count>0 → min(5+deadline, prev)
 *    senza Keep Teams: assistenteQa azzerato
 * 2) Eredità: assistenteQa = max(corrente, livello)
 * 3) Accelerazione: +1 · Fast Start: +5
 */
export function prestigeTeamCarryover(input: TeamCarryoverInput): Record<string, number> {
  const out: Record<string, number> = { ...input.initial };

  if (input.keepTeams) {
    for (const key of Object.keys(input.previous)) {
      const prev = input.previous[key] ?? 0;
      if (prev > 0 && (BASE_TEAMS_ALLOWED as readonly string[]).includes(key)) {
        out[key] = Math.min(5 + input.deadlineLevel, prev);
      }
    }
  } else if ('assistenteQa' in out) {
    out['assistenteQa'] = 0;
  }

  if ('assistenteQa' in out) {
    if (input.ereditaLevel > 0) {
      out['assistenteQa'] = Math.max(out['assistenteQa'] ?? 0, input.ereditaLevel);
    }
    if (input.accelerazione) out['assistenteQa'] = (out['assistenteQa'] ?? 0) + 1;
    if (input.fastStart) out['assistenteQa'] = (out['assistenteQa'] ?? 0) + 5;
  }

  return out;
}

// --- Q-Bits guadagnati dalla Formattazione ---
/**
 * 1 garantito + sqrt(token/10000).floor() se il rapporto è ≥ 1.
 *
 * I token sono quelli GUADAGNATI dal ciclo corrente (`lifetimePrestigePoints`),
 * non il saldo spendibile. Con il saldo la ricompensa scendeva ogni volta che si
 * comprava qualcosa nel negozio Promozione — cioè spendere i token, che è il
 * loro scopo, tagliava i Q-bit: da qui la segnalazione «alla prima formattazione
 * ne prometteva 10, dopo qualche acquisto ne dava 3». La formattazione azzera
 * `lifetimePrestigePoints` insieme al resto (non è fra i dati super-persistenti),
 * quindi il conto riparte da zero a ogni NG+ e la ricompensa resta legata a
 * quanto si è prodotto in questo ciclo.
 */
export function formatQbitsEarned(D: DecimalCtor, lifetimePrestigePoints: BigInput): Big {
  const tokenDiv = new D(lifetimePrestigePoints).div(10000);
  let bonusQbits = new D(0);
  if (tokenDiv.gte(1)) bonusQbits = tokenDiv.sqrt().floor();
  return new D(1).add(bonusQbits);
}
