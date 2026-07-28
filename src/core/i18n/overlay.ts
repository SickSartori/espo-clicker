/**
 * i18n overlay — gemello V3 di js/i18n.js (F4 strangler).
 *
 * Sovrascrive le stringhe IT (default inline nei file dati) con la lingua
 * attiva. PURO: opera sull'oggetto gameData passato, zero accessi a window —
 * il wrapper legacy passa window.gameData e window.APP_LANG.
 *
 * Semantica replicata 1:1 dal legacy:
 * - deepOverlay: merge profondo dei soli campi presenti nel dizionario;
 *   gli ARRAY sono sostituiti interi (non mergiati); null/primitivi assegnati.
 * - overlayById: per collezioni { id: {name, desc, ...} } sovrascrive solo i
 *   campi forniti; gli id ASSENTI nel target vengono saltati (restano IT).
 */

type AnyRecord = Record<string, unknown>;

/** Collezioni con overlay per-id — stesso elenco del legacy. */
export const I18N_COLLECTIONS = [
  'teams',
  'clickUpgrades',
  'prestigeUpgrades',
  'buildingEnhancements',
  'superUpgrades',
  'skins',
  'achievements',
  'events',
] as const;

export function deepOverlay(target: AnyRecord | undefined, src: AnyRecord | undefined): void {
  if (!target || !src) return;
  for (const k in src) {
    const v = src[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      if (!target[k] || typeof target[k] !== 'object') target[k] = {};
      deepOverlay(target[k] as AnyRecord, v as AnyRecord);
    } else {
      target[k] = v;
    }
  }
}

export function overlayById(target: AnyRecord | undefined, src: AnyRecord | undefined): void {
  if (!target || !src) return;
  for (const id in src) {
    if (!target[id]) continue;
    const fields = src[id] as AnyRecord;
    for (const f in fields) (target[id] as AnyRecord)[f] = fields[f];
  }
}

export interface GameDataLike extends AnyRecord {
  i18n?: Record<string, AnyRecord | undefined>;
  texts?: AnyRecord;
}

/**
 * Applica l'overlay della lingua `lang` a `gameData` (mutazione in place,
 * come il legacy). Lingua default (it) o dizionario assente → no-op.
 */
export function applyLanguage(gameData: GameDataLike, lang: string): void {
  const dict = gameData.i18n && gameData.i18n[lang];
  if (!dict) return;
  if (dict.texts) deepOverlay(gameData.texts, dict.texts as AnyRecord);
  for (const t of I18N_COLLECTIONS) {
    if (dict[t]) overlayById(gameData[t] as AnyRecord, dict[t] as AnyRecord);
  }
}
