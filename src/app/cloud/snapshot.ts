/**
 * Istantanea dei campi del push cloud che il server confronta con la classifica
 * e scrive accanto a save_data. PURA (stato e Decimal come parametri).
 *
 * Deve essere presa nello STESSO tick della serializzazione del blob: tra la
 * serializzazione e il payload ci sono tre await (worker, quota, IndexedDB) e
 * nel frattempo il loop di gioco fa crescere lifetimeScore. Letto dopo, dal
 * vivo, `score` finiva in classifica un pelo più alto del lifetimeScore dentro
 * save_data: al riallineamento successivo il client adottava il blob, lo
 * rispingeva e il server rispondeva conflict:Score — un conflitto
 * auto-inflitto (segnalazione del 10/09/2026, "Progressi scaricati dal Cloud!"
 * a ripetizione). Vedi saveGame in app/boot.ts.
 *
 * Estratto da app/boot.ts (3.2, prima estrazione del cloud-sync).
 */
export interface CloudMetaSnapshot {
    /** lifetimeScore come espansione decimale completa (Decimal.toFixed(0)), mai negativo. */
    score: string;
    prestige: number;
    totalFormattazioni: number;
    season: number;
    equippedSkin: string;
    profile: {
        totalClicks: number;
        totalPlayTime: number;
        longestCombo: number;
        totalGolden: number;
        season: number;
        skinsUnlocked: string[];
    };
}

export function snapshotCloudMeta(gs: any, DecimalCtor: any): CloudMetaSnapshot {
    let rawScore = new DecimalCtor(gs.lifetimeScore);
    if (rawScore.lt(0)) rawScore = new DecimalCtor(0);
    const season = gs.season || 1;
    const unlocked = (gs.skins && Array.isArray(gs.skins.unlocked)) ? gs.skins.unlocked.slice() : [];
    return {
        score: rawScore.toFixed(0),
        prestige: Math.floor(gs.totalResets || 0),
        totalFormattazioni: gs.totalFormattazioni || 0,
        season: season,
        equippedSkin: gs.skins.current,
        profile: {
            totalClicks: Math.floor(gs.totalClicks || 0),
            totalPlayTime: Math.floor(gs.totalPlayTime || 0),
            longestCombo: Math.floor(gs.longestCombo || 0),
            totalGolden: Math.floor(gs.totalGoldenBugsClicked || 0),
            season: season,
            skinsUnlocked: unlocked
        }
    };
}
