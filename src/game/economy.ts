/**
 * Formule economiche — gemello V3 del cuore di js/game-logic.js (F6 fetta 1).
 *
 * DIPENDENZA INIETTATA: il costruttore Decimal arriva dal caller.
 *  - Runtime: il wrapper legacy passa `window.Decimal` (break_infinity della
 *    pagina) → risultati BIT-IDENTICI al legacy per costruzione, zero drift.
 *  - Test: si inietta break_eternity (npm) → verifica numerica delle formule.
 *
 * L'ORDINE delle operazioni replica il legacy alla lettera: in floating point
 * l'addizione non è associativa, quindi la sequenza di add/mul è parte del
 * contratto di parità.
 */

/** Sottoinsieme di API Decimal comune a break_infinity e break_eternity. */
export interface Big {
  add(v: BigInput): Big;
  sub(v: BigInput): Big;
  mul(v: BigInput): Big;
  div(v: BigInput): Big;
  pow(v: BigInput): Big;
  floor(): Big;
  sqrt(): Big;
  /** break_infinity ritorna number, break_eternity ritorna Decimal: entrambi BigInput. */
  ln(): BigInput;
  gte(v: BigInput): boolean;
  lte(v: BigInput): boolean;
  gt(v: BigInput): boolean;
  lt(v: BigInput): boolean;
  eq(v: BigInput): boolean;
  toNumber(): number;
  toPrecision(digits: number): string;
  toString(): string;
}
export type BigInput = Big | string | number;
export type DecimalCtor = new (v: BigInput) => Big;

// --- Softcap del bonus permanente (prestigio+achievement) ---
export function applyBonusSoftcap(D: DecimalCtor, x: Big, knee: BigInput, coeff: BigInput): Big {
  const kneeD = new D(knee);
  if (x.lte(kneeD)) return x;
  const excess = x.sub(kneeD);
  return kneeD.add(new D(coeff).mul(excess.sqrt()));
}

// --- Bonus permanente: base (1%/punto) + sinergia + achievement, softcappato ---
export interface PrestigeBonusInput {
  lifetimePrestigePoints: BigInput;
  synergyFactor: BigInput;
  achievementsBonus: BigInput;
  softcapKnee: BigInput;
  softcapCoeff: BigInput;
}
export function computePrestigeBonus(D: DecimalCtor, input: PrestigeBonusInput): Big {
  const lifetime = new D(input.lifetimePrestigePoints);
  const baseBonus = lifetime.mul(0.01);
  const synergyBonus = new D(input.synergyFactor).mul(lifetime);
  const rawBonus = baseBonus.add(synergyBonus).add(new D(input.achievementsBonus));
  return new D(1).add(applyBonusSoftcap(D, rawBonus, input.softcapKnee, input.softcapCoeff));
}

// --- BPS: somma team (con potenziamenti) × moltiplicatori globali ---
export interface TeamCpsEntry {
  cpsPerUnit: BigInput;
  count: number;
  /** Moltiplicatori dei potenziamenti acquistati per QUESTO team, in ordine. */
  multipliers: readonly BigInput[];
}
/**
 * `teams` va passato nell'ordine di iterazione legacy (for-in su gameState.teams,
 * già filtrato per count>0 e dati presenti): la sequenza di add è contratto.
 * `autoClickBonus` = conteggio Assistenti QA se il flag autoClickQA è attivo, 0 altrimenti.
 * `globalMultipliers` in ordine: prestigeBonus, clickCPSBonus, bluescreen, crunch.
 */
export function computeBps(
  D: DecimalCtor,
  teams: readonly TeamCpsEntry[],
  autoClickBonus: number,
  globalMultipliers: readonly BigInput[],
): Big {
  let baseCPS = new D(0);
  for (const t of teams) {
    let teamBPS = new D(t.cpsPerUnit);
    for (const m of t.multipliers) teamBPS = teamBPS.mul(m);
    baseCPS = baseCPS.add(teamBPS.mul(t.count));
  }
  if (autoClickBonus > 0) baseCPS = baseCPS.add(new D(autoClickBonus));
  let out = baseCPS;
  for (const m of globalMultipliers) out = out.mul(m);
  return out;
}

// --- Valore click (totale e "raw" senza bonus esterni) ---
export interface ClickValueInput {
  baseClickValue: BigInput;
  clickGlobalMult: BigInput;
  prestigeBonus: BigInput;
  bluescreenMultiplier: BigInput;
  crunchTimeMultiplier: BigInput;
  bionicHand: boolean;
  divineClick: boolean;
  /** BPS corrente (per la Mano Bionica: +1%/+2% del bps). */
  bps: BigInput;
  goldenFrenzyActive: boolean;
  goldenFrenzyMult: BigInput;
}
export function computeClickValue(D: DecimalCtor, input: ClickValueInput): Big {
  let val = new D(input.baseClickValue)
    .mul(input.clickGlobalMult)
    .mul(input.prestigeBonus)
    .mul(input.bluescreenMultiplier)
    .mul(input.crunchTimeMultiplier);
  if (input.bionicHand) {
    const percent = input.divineClick ? 0.02 : 0.01;
    val = val.add(new D(input.bps).mul(percent));
  }
  if (input.goldenFrenzyActive) {
    val = val.mul(input.goldenFrenzyMult);
  }
  return val;
}

export interface RawClickValueInput {
  baseClickValue: BigInput;
  clickGlobalMult: BigInput;
  bionicHand: boolean;
  divineClick: boolean;
  bps: BigInput;
}
export function computeRawClickValue(D: DecimalCtor, input: RawClickValueInput): Big {
  let val = new D(input.baseClickValue).mul(input.clickGlobalMult);
  if (input.bionicHand) {
    const percent = input.divineClick ? 0.02 : 0.01;
    val = val.add(new D(input.bps).mul(percent));
  }
  return val;
}

// --- Costo upgrade prestigio: base × 1.5^livello, sconto quantico, arrotondi ---
export interface PrestigeUpgradeCostInput {
  isCounted: boolean;
  baseCost: BigInput;
  count: number;
  qDiscount: boolean;
  growthFactor?: BigInput; // default 1.5
}
export function prestigeUpgradeCost(D: DecimalCtor, input: PrestigeUpgradeCostInput): Big {
  if (!input.isCounted) return new D(input.baseCost);
  let rawCost = new D(input.baseCost).mul(new D(input.growthFactor ?? 1.5).pow(input.count || 0));
  if (input.qDiscount) rawCost = rawCost.mul(0.85);
  if (rawCost.gte(100)) return new D(rawCost.toPrecision(3));
  return rawCost.floor();
}

// --- Costo team (bulk): serie geometrica con sconto Outsourcing ---
export interface TeamCostInput {
  baseCost: BigInput;
  /** Unità già possedute. */
  count: number;
  /** Fattore di scala r (il wrapper lo deriva da costScalingBase/Reduction, min 1.05). */
  r: number;
  /** Livello upgrade Outsourcing: -5%/livello sul costo base, cap -25%. */
  outsourcingLevel: number;
}

/** max(a, b) via confronto — evita la dipendenza dallo static Decimal.max. */
function bigMax(D: DecimalCtor, a: BigInput, b: Big): Big {
  const aD = new D(a);
  return b.gte(aD) ? b : aD;
}

function discountedSingleCost(D: DecimalCtor, input: TeamCostInput): { single: Big; decR: Big } {
  const decR = new D(input.r);
  let base = new D(input.baseCost);
  if (input.outsourcingLevel > 0) {
    const discount = 1 - 0.05 * input.outsourcingLevel;
    base = base.mul(Math.max(0.75, discount));
  }
  return { single: base.mul(decR.pow(input.count)).floor(), decR };
}

/**
 * Costo per comprare `amount` unità a partire da `count` possedute.
 * amount=1 → max(1, costo singolo); bulk → serie geometrica floored,
 * min `amount` (mai meno di 1 a unità).
 */
export function teamBulkCost(D: DecimalCtor, input: TeamCostInput, amount: number): Big {
  const { single, decR } = discountedSingleCost(D, input);

  if (amount === 1) {
    return bigMax(D, 1, single);
  }
  const num = decR.pow(amount).sub(1);
  const den = decR.sub(1);
  if (decR.eq(1)) return single.mul(amount);
  const totalCost = single.mul(num).div(den).floor();
  return bigMax(D, amount, totalCost);
}

/**
 * Massimo numero di unità acquistabili con `score`.
 * Formula log della serie geometrica + raffinamento discendente sotto 10000
 * (l'arrotondamento log può sovrastimare di 1).
 */
export function maxAffordableTeams(D: DecimalCtor, input: TeamCostInput, score: BigInput): number {
  const { single, decR } = discountedSingleCost(D, input);
  const scoreD = new D(score);

  if (scoreD.lt(single)) return 0;

  if (Math.abs(input.r - 1) < 0.0000001) {
    return scoreD.div(single).floor().toNumber();
  }

  const part1 = scoreD.mul(decR.sub(1));
  const part2 = part1.div(single);
  const part3 = part2.add(1);
  const logNum = new D(part3.ln());
  const logDen = new D(decR.ln());
  const maxAmount = logNum.div(logDen).floor();

  if (maxAmount.lt(10000)) {
    let num = maxAmount.toNumber();
    let cost = teamBulkCost(D, input, num);
    while (num > 0 && cost.gt(scoreD)) {
      num--;
      cost = teamBulkCost(D, input, num);
    }
    return num;
  }

  return maxAmount.toNumber();
}

// --- Traguardi team: soglia più alta attraversata dall'acquisto ---
const TEAM_MILESTONES = [10, 25, 50, 100, 150, 200, 250, 300, 400, 500, 750, 1000] as const;

/**
 * Ritorna la milestone raggiunta passando da oldCount a newCount (0 = nessuna).
 * Oltre 1000: un traguardo ogni 250 unità.
 */
export function milestoneReached(oldCount: number, newCount: number): number {
  let reached = 0;
  for (const m of TEAM_MILESTONES) {
    if (oldCount < m && newCount >= m) reached = m; // tiene il più alto attraversato
  }
  if (newCount >= 1000) {
    const step = 250;
    const newTier = Math.floor(newCount / step) * step;
    if (newTier > Math.floor(oldCount / step) * step && newTier > reached) reached = newTier;
  }
  return reached;
}

// --- Soglia promozione: 50M × 3^resets, a 3 cifre significative ---
export function prestigeThreshold(
  D: DecimalCtor,
  resets: number,
  base: BigInput = '50000000',
  growthFactor: BigInput = 3.0,
): Big {
  const rawThreshold = new D(base).mul(new D(growthFactor).pow(resets || 0));
  return new D(rawThreshold.toPrecision(3));
}
