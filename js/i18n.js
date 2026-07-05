/* === i18n overlay ===
 * Sovrascrive le stringhe IT (default inline nei file dati) con la lingua attiva.
 * - window.APP_LANG è impostato da PHP in index.php (cookie validato da checkLanguage()).
 * - I dizionari per lingua sono popolati da js/data-en/*.js (caricati PRIMA di questo file).
 * Italiano = default: se la lingua è 'it' o il dizionario manca, non si tocca nulla.
 */
(function () {
    'use strict';
    window.gameData = window.gameData || {};

    // Merge profondo dei soli campi presenti nel dizionario (texts: ui/toasts annidati, array inclusi).
    function deepOverlay(target, src) {
        if (!target || !src) return;
        for (const k in src) {
            const v = src[k];
            if (v && typeof v === 'object' && !Array.isArray(v)) {
                if (!target[k] || typeof target[k] !== 'object') target[k] = {};
                deepOverlay(target[k], v);
            } else {
                target[k] = v;
            }
        }
    }

    // Overlay per-id su collezioni del tipo { id: { name, desc, ... } }.
    // Sovrascrive solo i campi forniti; gli id assenti restano in italiano (default).
    function overlayById(target, src) {
        if (!target || !src) return;
        for (const id in src) {
            if (!target[id]) continue;
            const fields = src[id];
            for (const f in fields) target[id][f] = fields[f];
        }
    }

    var COLLECTIONS = ['teams', 'clickUpgrades', 'prestigeUpgrades', 'buildingEnhancements', 'superUpgrades', 'skins', 'achievements', 'events'];

    window.applyLanguage = function (lang) {
        // F4 strangler: la logica di merge vive in EspoV3.i18n (pura, testata,
        // stessa semantica: array sostituiti interi, id assenti saltati).
        // Fallback legacy sotto se la build v3 manca.
        const v3i18n = window.EspoV3 && window.EspoV3.i18n;
        if (v3i18n) return v3i18n.applyLanguage(window.gameData, lang);

        const gd = window.gameData;
        const dict = gd.i18n && gd.i18n[lang];
        if (!dict) return; // lingua default (it) o dizionario assente → niente da fare
        if (dict.texts) deepOverlay(gd.texts, dict.texts);
        COLLECTIONS.forEach(function (t) { if (dict[t]) overlayById(gd[t], dict[t]); });
    };

    // Applica subito: il bundle gira prima del render (initializeGame in script.js).
    if (window.APP_LANG && window.APP_LANG !== 'it') {
        try { window.applyLanguage(window.APP_LANG); }
        catch (e) { if (window.console) console.warn('[i18n] overlay fallito:', e); }
    }
})();
