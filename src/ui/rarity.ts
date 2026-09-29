/**
 * Colori delle rarità skin — fonte unica per vetrina skin, podio e amici, che
 * prima tenevano tre copie della stessa mappa.
 *
 * La rarità `festive` (skin a calendario) non ha un colore suo: lo prende dalla
 * stagione della skin (`skin.season` → CALENDAR_SEASONS[..].accent), così
 * Halloween resta arancio e Natale rosso sotto la stessa etichetta «Festiva».
 */
import { CALENDAR_SEASONS } from '../data/season';

export const RARITY_COLORS: Record<string, string> = {
    common: '#bdc3c7', rare: '#3498db', epic: '#9b59b6',
    legendary: '#f1c40f', divine: '#ffee90', festive: '#e74c3c',
};

export const RARITY_GLOWS: Record<string, string> = {
    common: 'rgba(189,195,199,0.18)', rare: 'rgba(52,152,219,0.25)', epic: 'rgba(155,89,182,0.25)',
    legendary: 'rgba(241,196,15,0.3)', divine: 'rgba(255,238,144,0.4)', festive: 'rgba(231,76,60,0.3)',
};

/** Ordine nella vetrina: le Festive in coda, dopo le Divine. */
export const RARITY_ORDER: Record<string, number> = {
    common: 0, rare: 1, epic: 2, legendary: 3, divine: 4, festive: 5,
};

/** PURA. Colore e alone di una skin (dati di `gameData.skins[id]`). */
export function skinAccent(skin: { rarity?: string; season?: string } | null | undefined): { color: string; glow: string } {
    const rarity = (skin && skin.rarity) || 'common';
    const season = skin && skin.season ? (CALENDAR_SEASONS as Record<string, { accent: { color: string; glow: string } }>)[skin.season] : undefined;
    if (rarity === 'festive' && season) return season.accent;
    return {
        color: RARITY_COLORS[rarity] ?? RARITY_COLORS.common ?? '#bdc3c7',
        glow: RARITY_GLOWS[rarity] ?? RARITY_GLOWS.common ?? 'rgba(189,195,199,0.18)',
    };
}
