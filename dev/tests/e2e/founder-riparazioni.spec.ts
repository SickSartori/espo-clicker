import { test, expect } from '@playwright/test';
import { bootGame } from './helpers';

/**
 * Riparazioni skin una tantum (`src/data/founder-grants.ts`).
 *
 * Meccanismo SILENZIOSO: se smette di funzionare non se ne accorge nessuno finché
 * il giocatore non si lamenta di nuovo. E l'idempotenza è facile da sbagliare —
 * senza il marker nel save la riparazione ripartirebbe a ogni caricamento, con un
 * `saveGame()` (e quindi un push cloud) a ogni avvio.
 *
 * Il test passa dal percorso VERO: scrive il save, ricarica la pagina e guarda
 * cosa succede al boot. Non chiama la funzione a mano — non è esposta, e non deve
 * esserlo.
 */

const UTENTE = 'Dario Moccia';
const ID_RIPARAZIONE = 'lancio-2026-08-tetto-skin';

/**
 * Rimette l'utente allo stato "prima della riparazione" e ricarica.
 *
 * ⚠️ `bootGame` installa un `addInitScript` che riscrive `sessionStorage.espooUser`
 * a ogni navigazione: scriverlo dalla pagina non basta, al reload tornerebbe
 * 'E2ETester'. Gli init script girano nell'ordine in cui sono aggiunti, quindi
 * questo — aggiunto dopo — ha l'ultima parola.
 */
async function preparaERicarica(page: any, username: string) {
    await page.addInitScript((nome: string) => {
        try { sessionStorage.setItem('espooUser', nome); } catch (_) { /* no-op */ }
    }, username);

    await page.evaluate(async (nome: string) => {
        const w = window as any;
        const gs = w.EspooClicker.getGameState();
        gs.user.username = nome;
        gs.skins = { current: 'default', unlocked: ['default'] };
        delete gs.riparazioniSkin;
        // `await`: senza, `page.evaluate` torna a metà salvataggio e il resto
        // della funzione continua a girare mentre il test va avanti.
        await w.EspooClicker.saveGame();
    }, username);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await attendiSaveApplicato(page, username);
}

/**
 * Aspetta che il save sia stato applicato E che la riparazione abbia avuto la sua
 * occasione.
 *
 * Il segnale è `window._espoHadSave`: `loadGame` lo alza appena trova un save, e
 * da lì fino all'aggancio della riparazione **non c'è un solo `await`** — è tutto
 * un blocco sincrono. Quindi quando è true, la riparazione è già stata valutata.
 *
 * ⚠️ NON basta guardare l'username: quello viene rimesso da `sessionStorage` molto
 * prima che `loadGame` finisca, quindi sarebbe verde anche a stato di default — e
 * il test accuserebbe il codice di un difetto che non ha. È già successo scrivendo
 * questo file.
 */
async function attendiSaveApplicato(page: any, username: string) {
    await page.waitForFunction(
        (nome: string) => {
            const w = window as any;
            const gs = w.EspooClicker && w.EspooClicker.getGameState && w.EspooClicker.getGameState();
            return !!gs && !!w.gameData && !!w.gameData.skins && w._espoHadSave === true
                && gs.user && gs.user.username === nome;
        },
        username,
        { timeout: 15_000 },
    );
}

async function statoSkin(page: any) {
    return page.evaluate(() => {
        const w = window as any;
        const gs = w.EspooClicker.getGameState();
        const catalogo = Object.keys(w.gameData.skins);
        const sbloccate: string[] = gs.skins.unlocked || [];
        return {
            username: gs.user.username,
            nSbloccate: sbloccate.length,
            nCatalogo: catalogo.length,
            mancanti: catalogo.filter((k) => !sbloccate.includes(k)),
            duplicate: sbloccate.length !== new Set(sbloccate).size,
            marker: gs.riparazioniSkin,
            isFounder: !!gs.isFounder,
        };
    });
}

test.describe('Riparazioni skin una tantum', () => {
    test('l\'utente riparato riceve tutto il catalogo', async ({ page }) => {
        await bootGame(page);
        await preparaERicarica(page, UTENTE);

        const s = await statoSkin(page);

        expect(s.username).toBe(UTENTE);
        // «tutte le skin»: nessuna esclusa, `founder` compresa.
        expect(s.mancanti).toEqual([]);
        expect(s.nSbloccate).toBe(s.nCatalogo);
        expect(s.marker).toContain(ID_RIPARAZIONE);
    });

    test('non si riapplica al caricamento successivo', async ({ page }) => {
        await bootGame(page);
        await preparaERicarica(page, UTENTE);
        const primo = await statoSkin(page);

        // Secondo giro: il marker c'è già, la riparazione deve saltare.
        await page.reload({ waitUntil: 'domcontentloaded' });
        await attendiSaveApplicato(page, UTENTE);
        const secondo = await statoSkin(page);

        expect(secondo.nSbloccate).toBe(primo.nSbloccate);
        expect(secondo.duplicate).toBe(false);
        // Un solo id, non uno per ricaricamento.
        expect(secondo.marker).toEqual([ID_RIPARAZIONE]);
    });

    test('chi non è in elenco non riceve niente', async ({ page }) => {
        await bootGame(page);
        await preparaERicarica(page, 'UnAltroGiocatore');

        const s = await statoSkin(page);

        expect(s.username).toBe('UnAltroGiocatore');
        expect(s.nSbloccate).toBe(1);          // solo 'default'
        expect(s.marker).toBeUndefined();
    });

    test('la voce col flag Fondatore marca anche isFounder', async ({ page }) => {
        await bootGame(page);
        await preparaERicarica(page, 'TheLonelyGodEspo');

        const s = await statoSkin(page);

        expect(s.mancanti).toEqual([]);
        expect(s.isFounder).toBe(true);
        expect(s.marker).toContain('lancio-2026-08-fondatore-mancato');
    });
});
