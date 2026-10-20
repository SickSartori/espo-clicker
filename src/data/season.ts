/**
 * Stagioni a calendario (ex js/data/core.js) — Halloween, Natale, e quelle che
 * verranno. NON c'entra con la Season della classifica (`gameState.season`,
 * numerica, 1 = lancio v3): qui si parla di finestre di date che accendono skin,
 * obiettivi e temi a tempo.
 *
 * Il calcolo è PURO (data come parametro, vedi `isSeasonActiveAt`). Le funzioni
 * senza data leggono invece un'istantanea presa UNA volta all'import: i moduli
 * dati la usano per costi e testi (`IS_XMAS_TIME` bare nei corpi = fedeltà al
 * legacy), quindi tutta la sessione deve vedere lo stesso calendario anche se
 * scavalca la mezzanotte di un cambio stagione. installGameData() pubblica le
 * funzioni su window per i consumatori legacy runtime (ui-functions).
 *
 * Override di prova, SOLO in dev (localhost e `/test/`): `?stagione=halloween`
 * (o `christmas`, più id separati da virgola, `nessuna` per spegnere tutto)
 * sostituisce il calendario per la scheda; resta in sessionStorage finché non si
 * chiude la scheda o si passa `?stagione=auto`. In produzione è ignorato.
 */
import { currentEnv } from '../lib/env';

export type CalendarSeasonId = 'halloween' | 'christmas' | 'birthday';

/** Giorno dell'anno senza anno. `month` 1-12, come sul calendario. */
export interface MonthDay {
  month: number;
  day: number;
}

export interface CalendarSeason {
  id: CalendarSeasonId;
  /** Primo giorno attivo, incluso. */
  start: MonthDay;
  /** Ultimo giorno attivo, incluso. Se precede `start` la finestra scavalca il capodanno. */
  end: MonthDay;
  /**
   * Skin della stagione, tutte di rarità `festive` con `season` = questo id.
   * A finestra aperta costano poco (o arrivano da un obiettivo stagionale);
   * fuori stagione restano in negozio a prezzo pieno: nessuna sparisce per
   * sempre (vedi skins.ts).
   */
  skins: string[];
  /** Colore della rarità Festiva per le skin di questa stagione (bordi, podio, amici). */
  accent: { color: string; glow: string };
  /**
   * Edizione unica: la finestra vale solo in questo anno (non può scavalcare il
   * capodanno) e PRIMA del suo primo giorno la stagione non esiste — obiettivo e
   * switch non sono visibili né ottenibili (vedi `isSeasonReleased`).
   * Assente = ricorre ogni anno ed è sempre "uscita".
   */
  year?: number;
  /**
   * Il premio dell'obiettivo resta riscattabile anche a finestra chiusa:
   * è un regalo, non un evento. Solo la finestra comanda l'avviso di inizio.
   * Assente = obiettivo solo in finestra e skin in negozio a prezzo pieno dopo.
   */
  keepsReward?: boolean;
}

export const CALENDAR_SEASONS: Record<CalendarSeasonId, CalendarSeason> = {
  halloween: {
    id: 'halloween',
    start: { month: 10, day: 24 },
    end: { month: 11, day: 2 },
    skins: ['espostore', 'frankenespo', 'conteEspocula'],
    accent: { color: '#f97316', glow: 'rgba(249,115,22,0.3)' },
  },
  christmas: {
    id: 'christmas',
    start: { month: 12, day: 1 },
    end: { month: 1, day: 8 },
    skins: ['christmas'],
    accent: { color: '#e74c3c', glow: 'rgba(231,76,60,0.3)' },
  },
  // Primo compleanno: il commit «Prima versione» è del 17/11/2025. Edizione
  // unica: la finestra (avviso al primo accesso) dura due settimane, il premio
  // — l'obiettivo che sblocca il tema Vintage v1 nelle Opzioni — no. Nessuna skin.
  birthday: {
    id: 'birthday',
    start: { month: 11, day: 17 },
    end: { month: 11, day: 30 },
    skins: [],
    accent: { color: '#f1c40f', glow: 'rgba(241,196,15,0.3)' },
    year: 2026,
    keepsReward: true,
  },
};

const SEASON_IDS = Object.keys(CALENDAR_SEASONS) as CalendarSeasonId[];

function isCalendarSeasonId(id: string): id is CalendarSeasonId {
  return Object.prototype.hasOwnProperty.call(CALENDAR_SEASONS, id);
}

/** `mese*100 + giorno`: confrontabile con < e >, senza fusi né anni bisestili. */
function ordinal(md: MonthDay): number {
  return md.month * 100 + md.day;
}

/** PURA. La finestra di `season` comprende `date` (ora locale del giocatore)? */
export function isInSeasonWindow(season: CalendarSeason, date: Date): boolean {
  if (season.year !== undefined && date.getFullYear() !== season.year) return false;
  const today = ordinal({ month: date.getMonth() + 1, day: date.getDate() });
  const start = ordinal(season.start);
  const end = ordinal(season.end);
  return start <= end
    ? today >= start && today <= end
    : today >= start || today <= end; // scavalca il capodanno
}

/**
 * PURA. La stagione è già "uscita" in `date`? Le ricorrenti sì, sempre. Un'edizione
 * unica solo dal primo giorno della sua finestra (00:00 ora locale) in poi, e per
 * sempre: è la soglia sotto cui obiettivo e switch non esistono per il giocatore.
 */
export function isSeasonReleasedAt(season: CalendarSeason, date: Date): boolean {
  if (season.year === undefined) return true;
  const first = new Date(season.year, season.start.month - 1, season.start.day);
  return date.getTime() >= first.getTime();
}

/** PURA. Stagioni uscite in `date`, nell'ordine di CALENDAR_SEASONS. */
export function releasedSeasonsAt(date: Date): CalendarSeasonId[] {
  return SEASON_IDS.filter((id) => isSeasonReleasedAt(CALENDAR_SEASONS[id], date));
}

/** PURA. Stagioni aperte in `date`, nell'ordine di CALENDAR_SEASONS. */
export function activeSeasonsAt(date: Date): CalendarSeasonId[] {
  return SEASON_IDS.filter((id) => isInSeasonWindow(CALENDAR_SEASONS[id], date));
}

/**
 * PURA. Interpreta il valore di `?stagione=`: `null` = nessun override (vale il
 * calendario), `[]` = tutto spento, altrimenti gli id riconosciuti.
 */
export function parseSeasonOverride(raw: string | null | undefined): CalendarSeasonId[] | null {
  if (raw == null) return null;
  const value = raw.trim().toLowerCase();
  if (value === '' || value === 'auto') return null;
  if (value === 'nessuna' || value === 'none') return [];
  return value.split(',').map((s) => s.trim()).filter(isCalendarSeasonId);
}

const OVERRIDE_STORAGE_KEY = 'espoSeasonOverride';

/** Override attivo nella scheda corrente, solo in dev. Fuori dal browser → nessuno. */
function readSeasonOverride(): CalendarSeasonId[] | null {
  if (currentEnv() !== 'dev') return null;
  try {
    const fromUrl = new URLSearchParams(location.search).get('stagione');
    if (fromUrl !== null) {
      const parsed = parseSeasonOverride(fromUrl);
      if (parsed === null) sessionStorage.removeItem(OVERRIDE_STORAGE_KEY);
      else sessionStorage.setItem(OVERRIDE_STORAGE_KEY, parsed.join(',') || 'nessuna');
      return parsed;
    }
    return parseSeasonOverride(sessionStorage.getItem(OVERRIDE_STORAGE_KEY));
  } catch (e) {
    return null;
  }
}

const SEASON_OVERRIDE = readSeasonOverride();

/** Istantanea della sessione: calendario di oggi, o l'override di prova. */
export const ACTIVE_SEASONS: readonly CalendarSeasonId[] =
  SEASON_OVERRIDE ?? activeSeasonsAt(new Date());

/**
 * Istantanea delle stagioni uscite. Con l'override di prova le edizioni uniche
 * escono solo se nominate (`nessuna` le fa sparire: si prova la soglia); le
 * ricorrenti restano sempre uscite.
 */
export const RELEASED_SEASONS: readonly CalendarSeasonId[] = SEASON_OVERRIDE
  ? SEASON_IDS.filter((id) => CALENDAR_SEASONS[id].year === undefined || SEASON_OVERRIDE.includes(id))
  : releasedSeasonsAt(new Date());

/** PURA. Come `isSeasonActive`, ma su un elenco di stagioni aperte esplicito. */
export function isSeasonActiveIn(seasonId: string, active: readonly string[]): boolean {
  if (!seasonId) return true;
  return active.includes(seasonId);
}

/** Stagione aperta in questa sessione? `''` = contenuto non stagionale → sempre vero. */
export function isSeasonActive(seasonId: string): boolean {
  return isSeasonActiveIn(seasonId, ACTIVE_SEASONS);
}

/** PURA. `''` = non stagionale → vero; id sconosciuto → falso. */
export function isSeasonReleasedIn(seasonId: string, released: readonly string[]): boolean {
  if (!seasonId) return true;
  return released.includes(seasonId);
}

/** La stagione è uscita in questa sessione? Sotto la soglia, niente obiettivo né switch. */
export function isSeasonReleased(seasonId: string): boolean {
  return isSeasonReleasedIn(seasonId, RELEASED_SEASONS);
}

/**
 * PURA. L'obiettivo della stagione è riscattabile adesso? Per chi tiene il premio
 * (`keepsReward`) basta che la stagione sia uscita; per le altre serve la finestra.
 */
export function isSeasonRewardOpenIn(
  seasonId: string, active: readonly string[], released: readonly string[],
): boolean {
  if (!seasonId) return true;
  if (!isCalendarSeasonId(seasonId)) return false;
  return CALENDAR_SEASONS[seasonId].keepsReward
    ? isSeasonReleasedIn(seasonId, released)
    : isSeasonActiveIn(seasonId, active);
}

export function isSeasonRewardOpen(seasonId: string): boolean {
  return isSeasonRewardOpenIn(seasonId, ACTIVE_SEASONS, RELEASED_SEASONS);
}

export function isChristmasSeason(): boolean {
  return isSeasonActive('christmas');
}

export function isHalloweenSeason(): boolean {
  return isSeasonActive('halloween');
}

export const IS_XMAS_TIME = isChristmasSeason();
export const IS_HALLOWEEN_TIME = isHalloweenSeason();
/** Premio del compleanno aperto: dal 17/11/2026 in poi, senza scadenza. */
export const IS_BIRTHDAY_OPEN = isSeasonRewardOpen('birthday');
