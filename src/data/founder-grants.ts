/**
 * Riparazioni skin una tantum.
 *
 * Serve a restituire a mano quello che un giocatore ha perso per un DIFETTO, non
 * per la regola. Non è un canale premi: ogni voce qui dentro deve avere un motivo
 * verificabile scritto accanto.
 *
 * ─── Perché lato client e non scrivendo il save su Supabase ───────────────────
 * Modificare `users.save_data` NON funziona: al login il client confronta locale e
 * cloud con la gerarchia Formattazioni > Prestige > Score (`app/boot.ts`), e su
 * `'equal'` tiene il LOCALE e lo ri-pusha — la modifica al cloud viene scartata in
 * silenzio, e chi la fa se ne accorge giorni dopo. Applicata qui, invece, la
 * riparazione cade su qualunque stato venga effettivamente caricato: cache locale,
 * save cloud, dispositivo nuovo.
 *
 * ⚠️ Gli username finiscono in un repo PUBBLICO. Sono nickname già visibili in
 *    classifica, quindi non è un dato privato — ma non metterci mai altro.
 */

export interface RiparazioneSkin {
    /** Id della riparazione. Viene scritto nel save: se c'è già, non si riapplica. */
    id: string;
    /** `'all'` = intero catalogo skin. Altrimenti la lista esatta degli id. */
    skins: 'all' | string[];
    /** Se true marca anche lo status Fondatore (`isFounder`). */
    fondatore?: boolean;
    /** Perché è stata concessa. Resta a verbale: senza motivo, la voce non si aggiunge. */
    motivo: string;
}

/**
 * Chiave = `gameState.user.username`, confronto esatto.
 *
 * Le due voci del 25/08/2026 nascono dallo stesso censimento (i save pre-lancio
 * congelati nella tabella prod `founder_backup_prelancio`):
 *
 * - **Dario Moccia** aveva 28 skin — il catalogo intero — ed è passato dal picker
 *   il 25/08 restandone con 7. Il picker è poi stato tolto: senza questa voce
 *   sarebbe l'unico ad aver pagato un tetto che per tutti gli altri non esiste più.
 *
 * - **TheLonelyGodEspo** non ha MAI ricevuto il Fondatore pur essendo un account
 *   pre-lancio. Causa quasi certa: il suo save era già `schemaVersion 3` (giocato
 *   coi client di prova di luglio) e il cancello della migrazione è
 *   `schemaVersion < 3`, quindi non è mai scattata — e `isFounder` viene impostato
 *   in un punto solo, dentro `applyLaunchMigration`. Non è più dimostrabile al 100%
 *   perché il suo save pre-lancio è stato sovrascritto il 3 agosto, ma il sintomo
 *   coincide con quello di `Fuzzuca`, dove invece è verificato.
 */
export const RIPARAZIONI_SKIN: Record<string, RiparazioneSkin> = {
    'Dario Moccia': {
        id: 'lancio-2026-08-tetto-skin',
        skins: 'all',
        motivo: 'Aveva il catalogo completo pre-lancio; il picker (poi rimosso) gliene ha lasciate 7.',
    },
    'TheLonelyGodEspo': {
        id: 'lancio-2026-08-fondatore-mancato',
        skins: 'all',
        fondatore: true,
        motivo: 'Account pre-lancio mai passato dalla migrazione: save gia\' schemaVersion 3, cancello mai aperto.',
    },
};
