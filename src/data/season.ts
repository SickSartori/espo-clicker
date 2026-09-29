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

export type CalendarSeasonId = 'halloween' | 'christmas';

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
  /** Skin legate alla stagione: si ottengono solo a finestra aperta (vedi skins.ts). */
  skins: string[];
}

export const CALENDAR_SEASONS: Record<CalendarSeasonId, CalendarSeason> = {
  halloween: {
    id: 'halloween',
    start: { month: 10, day: 24 },
    end: { month: 11, day: 2 },
    skins: [],
  },
  christmas: {
    id: 'christmas',
    start: { month: 12, day: 1 },
    end: { month: 1, day: 8 },
    skins: ['christmas'],
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
  const today = ordinal({ month: date.getMonth() + 1, day: date.getDate() });
  const start = ordinal(season.start);
  const end = ordinal(season.end);
  return start <= end
    ? today >= start && today <= end
    : today >= start || today <= end; // scavalca il capodanno
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

/** Istantanea della sessione: calendario di oggi, o l'override di prova. */
export const ACTIVE_SEASONS: readonly CalendarSeasonId[] =
  readSeasonOverride() ?? activeSeasonsAt(new Date());

/** PURA. Come `isSeasonActive`, ma su un elenco di stagioni aperte esplicito. */
export function isSeasonActiveIn(seasonId: string, active: readonly string[]): boolean {
  if (!seasonId) return true;
  return active.includes(seasonId);
}

/** Stagione aperta in questa sessione? `''` = contenuto non stagionale → sempre vero. */
export function isSeasonActive(seasonId: string): boolean {
  return isSeasonActiveIn(seasonId, ACTIVE_SEASONS);
}

export function isChristmasSeason(): boolean {
  return isSeasonActive('christmas');
}

export function isHalloweenSeason(): boolean {
  return isSeasonActive('halloween');
}

export const IS_XMAS_TIME = isChristmasSeason();
export const IS_HALLOWEEN_TIME = isHalloweenSeason();
