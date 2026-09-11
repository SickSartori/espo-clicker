/**
 * Anti-rollback comparator.
 *
 * Sostituisce logica inline in js/script.js:1755-1772.
 *
 * Decide se preferire LOCAL o CLOUD save quando un utente torna online.
 * Strategia: gerarchia di preferenza Format > Prestige > Score (lifetime, mai resetta).
 *
 * Scelta puramente in stringa per evitare dep da Decimal qui.
 * Big numbers gestiti via parsing exp-notation manuale.
 */

import type { AnySaveState, DecimalString } from '../../types/save';

export type RollbackChoice = 'local' | 'cloud' | 'equal';

/**
 * Nome che lo stato di default porta finché nessuno ha fatto login: non è
 * l'intestatario di niente. (`state/game-state.ts`)
 */
const SEGNAPOSTO = 'giocatore';

/**
 * Il salvataggio locale è di un ALTRO account rispetto a chi sta entrando?
 *
 * Serve perché lo slot locale è uno solo per origine e chiunque può averlo
 * scritto per ultimo: l'area di test `/test/` (stesso host della produzione, vedi
 * `keys.ts`), oppure un secondo account usato sullo stesso browser. Senza questa
 * domanda l'anti-rollback confrontava i NUMERI di due account diversi, teneva il
 * più alto e lo ribattezzava con l'utente appena loggato — che si ritrovava i
 * progressi (e il guardaroba) di qualcun altro, ri-pushati sul suo cloud.
 *
 * Risponde true SOLO con una prova positiva: due nomi reali e diversi. Se il save
 * locale non dichiara un intestatario (stato di default, save legacy senza
 * username) l'anti-rollback resta in piedi come prima — non si disarma una
 * protezione per un dubbio.
 *
 * Confronto trim + case-insensitive: il backend cerca l'utente su username
 * trimmato (EF login-register) mentre il client mette in sessione la stringa
 * grezza digitata, quindi " Mario" e "Mario" sono lo stesso account. Un falso
 * "estraneo" costerebbe i progressi locali di chi ha il cloud indietro: meglio
 * sbagliare verso il non-intervento.
 */
export function saveBelongsToOtherUser(localUsername: unknown, loggedUsername: unknown): boolean {
  const a = normalizzaNome(localUsername);
  const b = normalizzaNome(loggedUsername);
  if (!a || !b) return false;
  if (a === SEGNAPOSTO) return false;
  return a !== b;
}

function normalizzaNome(v: unknown): string {
  return typeof v === 'string' ? v.trim().toLowerCase() : '';
}

interface Comparable {
  totalFormattazioni?: number;
  lifetimePrestigePoints?: DecimalString | number;
  lifetimeScore?: DecimalString | number;
}

/**
 * Confronta due numeri rappresentati come stringhe. Ritorna -1, 0, 1.
 *
 * Accetta sia la notazione esponenziale (`1.5e+50`) sia l'espansione decimale
 * completa, che è quella che il client MANDA davvero: `saveGame` spedisce
 * `Decimal.toFixed(0)`, cioè 401 cifre per 1e400 e 9001 per 1e9000.
 *
 * ⚠️ Perché non si passa da `Number`: oltre ~1,8e308 diventa `Infinity`, e la
 * vecchia implementazione lo faceva due volte — `expOf` ripiegava su
 * `Math.log10(Number(s))` (Infinity → esponente 0 per ENTRAMBI) e `mantissaOf`
 * su `Number(cifre)` (Infinity = Infinity). Risultato: `2e400` vs `1e400`
 * rispondeva "pari", e con esso `1e1000` vs `1e400`. L'anti-rollback diventava
 * cieco proprio dove serve — a fine partita, dove i progressi valgono di più.
 * Qui il confronto è sulle CIFRE, quindi esatto a qualsiasi grandezza.
 */
export function compareDecimalStrings(a: unknown, b: unknown): number {
  const na = normalizza(a);
  const nb = normalizza(b);
  if (!na || !nb) return 0; // illeggibile: non è un verdetto, è un non-so

  if (na.segno !== nb.segno) return na.segno > nb.segno ? 1 : -1;
  const verso = na.segno < 0 ? -1 : 1; // fra due negativi l'ordine si rovescia

  if (na.cifre === '' || nb.cifre === '') {         // almeno uno è zero
    if (na.cifre === '' && nb.cifre === '') return 0;
    return (na.cifre === '' ? -1 : 1) * verso;
  }
  if (na.potenza !== nb.potenza) return (na.potenza > nb.potenza ? 1 : -1) * verso;

  // Stessa grandezza → decide la prima cifra diversa. Confronto lessicografico
  // su stringhe di sole cifre allineate a sinistra: equivale al confronto
  // numerico e non ha limiti di precisione.
  const lung = Math.max(na.cifre.length, nb.cifre.length);
  const ca = na.cifre.padEnd(lung, '0');
  const cb = nb.cifre.padEnd(lung, '0');
  if (ca === cb) return 0;
  return (ca > cb ? 1 : -1) * verso;
}

/**
 * Numero scomposto in segno + cifre significative + potenza di 10, cioè
 * `segno × 0.<cifre> × 10^potenza`. `cifre` non ha zeri né in testa né in coda,
 * ed è vuota se il numero è zero.
 */
interface Scomposto { segno: number; cifre: string; potenza: number; }

function normalizza(v: unknown): Scomposto | null {
  let s = (typeof v === 'string' ? v : String(v ?? 0)).trim();
  if (!s) return null;

  let segno = 1;
  if (s[0] === '+') s = s.slice(1);
  else if (s[0] === '-') { segno = -1; s = s.slice(1); }

  let esponente = 0;
  const e = /[eE]/.exec(s);
  if (e) {
    const coda = s.slice(e.index + 1);
    // Serve un intero vero: `Number('')` è 0, quindi "1e" passerebbe per 1.
    if (!/^[+-]?\d+$/.test(coda)) return null;
    esponente = Number(coda);
    s = s.slice(0, e.index);
  }

  const punto = s.indexOf('.');
  const intere = punto >= 0 ? s.slice(0, punto) : s;
  const decimali = punto >= 0 ? s.slice(punto + 1) : '';
  if (!/^\d*$/.test(intere) || !/^\d*$/.test(decimali)) return null;

  const tutte = intere + decimali;
  if (tutte === '') return null;

  const prima = tutte.search(/[1-9]/);
  if (prima < 0) return { segno: 1, cifre: '', potenza: 0 }; // zero, senza segno

  return {
    segno,
    cifre: tutte.slice(prima).replace(/0+$/, ''),
    // Quante cifre stanno a sinistra della virgola, contate dalla prima significativa.
    potenza: intere.length - prima + esponente,
  };
}

/**
 * Decide se conservare LOCAL o sovrascrivere con CLOUD.
 *
 * Se LOCAL >= CLOUD su tutti i campi gerarchici → 'local' (anti-rollback).
 * Se CLOUD strettamente maggiore in qualche campo → 'cloud'.
 * Se identici → 'equal'.
 */
export function decideRollback(local: Comparable | null, cloud: Comparable | null): RollbackChoice {
  if (!cloud) return 'local';
  if (!local) return 'cloud';

  const fmt = (local.totalFormattazioni ?? 0) - (cloud.totalFormattazioni ?? 0);
  if (fmt > 0) return 'local';
  if (fmt < 0) return 'cloud';

  const pres = compareDecimalStrings(
    local.lifetimePrestigePoints ?? 0,
    cloud.lifetimePrestigePoints ?? 0,
  );
  if (pres > 0) return 'local';
  if (pres < 0) return 'cloud';

  const score = compareDecimalStrings(local.lifetimeScore ?? 0, cloud.lifetimeScore ?? 0);
  if (score > 0) return 'local';
  if (score < 0) return 'cloud';

  return 'equal';
}

/** Wrapper che accetta direttamente save state. */
export function decideRollbackFromSaves(
  local: AnySaveState | null,
  cloud: AnySaveState | null,
): RollbackChoice {
  return decideRollback(local as Comparable, cloud as Comparable);
}
