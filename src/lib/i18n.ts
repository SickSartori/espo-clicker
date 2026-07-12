/**
 * Bridge i18n per il legacy (ex js/i18n.js — reorg C-thin, 2026-07-12).
 * L'engine (merge overlay: array sostituiti interi, id assenti saltati) è
 * src/core/i18n/overlay; qui: window.applyLanguage + applicazione al boot.
 * window.APP_LANG è inline in index.php (parse-time) → disponibile qui.
 */
import { applyLanguage as applyOverlay } from '../core/i18n/overlay';

export function installI18n(): void {
    if (typeof window === 'undefined') return;

    (window as any).applyLanguage = function (lang: string) {
        return applyOverlay((window as any).gameData, lang);
    };

    // Applica subito: il modulo gira prima del render (initializeGame nel bundle).
    const lang = (window as any).APP_LANG;
    if (lang && lang !== 'it') {
        try { (window as any).applyLanguage(lang); }
        catch (e) { console.warn('[i18n] overlay fallito:', e); }
    }
}
