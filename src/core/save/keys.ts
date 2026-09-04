/**
 * Chiavi dello slot di salvataggio locale, SEPARATE PER AMBIENTE.
 *
 * ─── Perché ──────────────────────────────────────────────────────────────────
 * localStorage e IndexedDB sono per ORIGINE, non per path. L'area di test
 * (`/test/`, backend Supabase dev) e la produzione (root) stanno sullo stesso
 * host Altervista: con una chiave sola le due versioni si contendevano lo STESSO
 * identico record. Due schede aperte con due account diversi e il save dell'una
 * finiva addosso all'altra — al login successivo l'anti-rollback lo trovava "più
 * avanti", lo teneva, lo ribattezzava con l'utente loggato e lo ri-pushava sul
 * cloud: progressi e skin dell'account ufficiale sovrascritti per sempre
 * (`users.save_data` è una colonna sola, senza storico).
 *
 * ─── Regola ──────────────────────────────────────────────────────────────────
 * - produzione → chiave INVARIATA. Cambiarla lì significherebbe far ripartire da
 *   zero la cache locale di tutti i giocatori al primo caricamento.
 * - dev (`/test/` e localhost) → suffisso `__dev`.
 *
 * ⚠️ Nessun fallback dalla chiave di produzione quando quella dev è vuota:
 *    leggerla re-importerebbe il save di produzione dentro l'area di test, cioè
 *    esattamente la commistione che questa separazione elimina. Al primo avvio in
 *    dev il gioco riparte dalla cache vuota e ricarica dal cloud dev al login.
 *
 * La separazione da sola NON basta: due account dello STESSO ambiente sullo
 * stesso browser restano un caso possibile. Il controllo d'identità che chiude
 * quel buco sta in `saveBelongsToOtherUser()` (anti-rollback.ts), usato da
 * loadCloudData prima di decidere locale-vs-cloud.
 */
import { currentEnv, detectEnv } from '../../lib/env';

/** Chiave storica, quella scritta da tutti i client fino alla 3.1.3. */
const BASE_KEY = 'espotoolClickerSaveV9';

export interface SaveKeys {
    /** Record principale: stessa chiave in localStorage e in IndexedDB. */
    save: string;
    /**
     * Save incompatibile messo da parte prima di un reset forzato. Solo scritto,
     * mai riletto dal gioco: serve a un recupero manuale. Il suffisso `_Backup_Legacy`
     * è quello storico e resta tale.
     */
    legacyBackup: string;
}

/**
 * Non esiste una chiave di backup: la copia casuale (`Math.random() < 0.2`)
 * dell'era solo-localStorage è stata tolta col passaggio a IndexedDB (V9) e
 * nessun client ha mai scritto `<save>_Backup`. La ridondanza locale oggi è
 * IndexedDB (autosave) + localStorage[save] (scritto in sincrono alla chiusura
 * e se IndexedDB fallisce); la copia autoritativa è il cloud.
 */

/** PURA (ambiente come parametro) → testabile. */
export function saveKeysFor(env: 'dev' | 'production'): SaveKeys {
    const save = env === 'dev' ? BASE_KEY + '__dev' : BASE_KEY;
    return { save, legacyBackup: save + '_Backup_Legacy' };
}

const KEYS = saveKeysFor(currentEnv());

export const SAVE_KEY = KEYS.save;
export const LEGACY_BACKUP_KEY = KEYS.legacyBackup;

/**
 * Chiavi di salvataggio dell'ALTRO ambiente: sono sulla stessa origine ma non ci
 * appartengono. Da preservare quando si fa piazza pulita del browser (vedi
 * `clearAccountStorage`), altrimenti eliminare l'account di prova cancella la
 * cache locale della produzione.
 */
export const OTHER_ENV_SAVE_KEYS: string[] = (() => {
    const altro = saveKeysFor(currentEnv() === 'dev' ? 'production' : 'dev');
    return [altro.save, altro.legacyBackup];
})();

/**
 * Svuota il localStorage dell'account MA lascia intatto il salvataggio
 * dell'altro ambiente. Sostituisce il `localStorage.clear()` secco della
 * cancellazione account: quello, da `/test/`, portava via anche il save di
 * produzione (stessa origine).
 */
export function clearAccountStorage(): void {
    const salvate: Array<[string, string]> = [];
    for (const k of OTHER_ENV_SAVE_KEYS) {
        const v = localStorage.getItem(k);
        if (v !== null) salvate.push([k, v]);
    }
    localStorage.clear();
    for (const [k, v] of salvate) {
        try { localStorage.setItem(k, v); } catch (e) { /* quota: meglio perdere il ripristino che bloccare la cancellazione */ }
    }
}

/** Ri-esportata per chi ragiona sulle chiavi di un ambiente diverso dal corrente. */
export { detectEnv };
