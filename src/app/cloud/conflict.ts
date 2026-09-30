/**
 * Cosa fare quando save-progress risponde `conflict` — PURO.
 *
 * Il ramo del conflitto in saveGame era un albero di if con cinque uscite,
 * scritto hotfix dopo hotfix (3.1.8 freno, 3.1.9 cloud più povero, lancio).
 * Qui c'è solo la DECISIONE, nello stesso ordine; gli effetti (badge, resync,
 * console) restano a chi chiama, in app/boot.ts.
 *
 * Estratto da app/boot.ts (3.2, prima estrazione del cloud-sync). La rete che
 * lo protegge: dev/tests/e2e/cloud-conflict-loop.spec.ts.
 */

/** Conflitti consecutivi oltre i quali l'auto-resync si ferma. */
export const CLOUD_MAX_AUTO_RESYNC = 3;

/** Distanza minima fra due auto-resync: niente loop se due dispositivi salvano in contesa. */
export const CLOUD_AUTO_RESYNC_THROTTLE_MS = 15000;

export interface ConflictInput {
    /** Conflitti consecutivi, QUESTO compreso. */
    streak: number;
    /** Fase di lancio (cloud pre-wipe, migrazione in corso, scelta Fondatore). */
    launchPhase: boolean;
    /** Già accertato in sessione: la classifica è avanti al salvataggio cloud. */
    staleServer: boolean;
    /** _resyncFromCloud disponibile. */
    canResync: boolean;
    /** Un resync è già in corso. */
    resyncing: boolean;
    now: number;
    lastAutoResyncAt: number;
}

export type ConflictAction =
    /** Lancio: il locale Season 1 è autoritativo, non riallineare né allarmare. */
    | 'ignore-launch'
    /** La classifica ha preso il largo: riallinearsi porterebbe solo indietro. */
    | 'stale-cloud'
    /** Troppi riallineamenti a vuoto: fermarsi e dirlo (badge 'conflict-loop'). */
    | 'brake'
    /** Adottare il cloud autoritativo, in silenzio. */
    | 'auto-resync'
    /** Resync non possibile adesso (in corso / troppo presto): segnalare e basta. */
    | 'unsynced';

export function decideConflict(i: ConflictInput): { action: ConflictAction; firstBrake: boolean } {
    if (i.launchPhase) return { action: 'ignore-launch', firstBrake: false };
    if (i.staleServer) return { action: 'stale-cloud', firstBrake: false };
    if (i.streak > CLOUD_MAX_AUTO_RESYNC) {
        return { action: 'brake', firstBrake: i.streak === CLOUD_MAX_AUTO_RESYNC + 1 };
    }
    if (i.canResync && !i.resyncing && i.now - (i.lastAutoResyncAt || 0) > CLOUD_AUTO_RESYNC_THROTTLE_MS) {
        return { action: 'auto-resync', firstBrake: false };
    }
    return { action: 'unsynced', firstBrake: false };
}

export interface ConflictTraceInput {
    streak: number;
    message: string;
    sent: { score: string; prestige: number; totalFormattazioni: number; season: number };
    /** Riga di classifica restituita dalla EF (3.2); assente con una EF vecchia. */
    server?: { score: unknown; prestige: unknown; totalFormattazioni: unknown; season: unknown; updatedAt?: string } | null;
    /** Ultimo stato cloud adottato in questa sessione (w._cloudLastAdopted). */
    adopted?: { at: number; score: unknown; prestige: unknown; totalFormattazioni: unknown; season: unknown } | null;
    now: number;
}

/** La riga `[Save✗ CONFLICT #n]` in console: i numeri di tutte e tre le parti. */
export function formatConflictTrace(t: ConflictTraceInput): string {
    const sv = t.server;
    const ad = t.adopted;
    return `[Save✗ CONFLICT #${t.streak}] ${t.message} | inviato: score=${t.sent.score} prestige=${t.sent.prestige} format=${t.sent.totalFormattazioni} season=${t.sent.season}` +
        (sv ? ` | server: score=${sv.score} prestige=${sv.prestige} format=${sv.totalFormattazioni} season=${sv.season}` +
              (sv.updatedAt ? ` (aggiornato ${Math.round((t.now - Date.parse(sv.updatedAt)) / 1000)}s fa)` : '')
            : '') +
        (ad ? ` | ultimo cloud adottato ${Math.round((t.now - ad.at) / 1000)}s fa: score=${ad.score} prestige=${ad.prestige} format=${ad.totalFormattazioni} season=${ad.season}`
            : ' | nessun cloud adottato in questa sessione');
}
