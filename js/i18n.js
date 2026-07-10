/* === i18n overlay ===
 * Sovrascrive le stringhe IT (default inline nei file dati) con la lingua attiva.
 * - window.APP_LANG è impostato da PHP in index.php (cookie validato da checkLanguage()).
 * - I dizionari per lingua sono popolati da js/data-en/*.js (caricati PRIMA di questo file).
 * Italiano = default: se la lingua è 'it' o il dizionario manca, non si tocca nulla.
 */
(function () {
    'use strict';
    window.gameData = window.gameData || {};

    // F4 strangler → F8: il merge (deepOverlay dei texts + overlayById per-collezione,
    // array sostituiti interi, id assenti saltati) vive in EspoV3.i18n (puro, testato).
    // Il fallback legacy inline è stato rimosso: EspoV3 è un requisito hard (vedi save-db.js).
    window.applyLanguage = function (lang) {
        return window.EspoV3.i18n.applyLanguage(window.gameData, lang);
    };

    // Applica subito: il bundle gira prima del render (initializeGame in script.js).
    if (window.APP_LANG && window.APP_LANG !== 'it') {
        try { window.applyLanguage(window.APP_LANG); }
        catch (e) { if (window.console) console.warn('[i18n] overlay fallito:', e); }
    }
})();
