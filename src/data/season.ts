/**
 * Stagionalita (ex js/data/core.js) — PURA, calcolata dalla data al momento
 * dell'import: nessuna dipendenza da window/ordine di caricamento. I moduli
 * dati la importano direttamente (IS_XMAS_TIME bare nei corpi = fedelta al
 * legacy); installGameData() la pubblica su window per i consumatori legacy
 * runtime (ui-functions).
 */
export function isChristmasSeason(): boolean {
  const now = new Date();
  const month = now.getMonth();
  const day = now.getDate();
  if (month === 11) return true;
  if (month === 0 && day <= 8) return true;
  return false;
}

export const IS_XMAS_TIME = isChristmasSeason();

export function isSeasonActive(seasonId: string): boolean {
  if (!seasonId) return true;
  if (seasonId === 'christmas') return IS_XMAS_TIME;
  return false;
}
