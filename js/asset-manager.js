// ============================================================
// ESPO CLICKER - Asset Manager v1.0  (F4 strangler → F8)
// Sistema di caricamento progressivo degli asset grafici.
//
// Funzionamento:
//   1. Al boot carica il pacchetto CORE (immagini critiche).
//   2. Carica i pacchetti successivi nei momenti di inattività del browser.
//   3. Espone window.AssetManager.load('NOME') per il caricamento on-demand.
//   4. Emette un CustomEvent 'assetPackageLoaded' per notificare il gioco.
//
// F8: la logica (retry+backoff, semaforo di concorrenza, stato pacchetti, piano
// progressivo) vive in EspoV3.assets (pura, testata). Qui restano solo il
// rilevamento host, i limiti, il CustomEvent e il bootstrap DOM. Il fallback
// legacy inline è stato rimosso (EspoV3 requisito hard, vedi save-db.js).
//
// Dipendenza: asset-packages.js (deve caricare prima)
// ============================================================

(function () {
    'use strict';

    // Percorso base per le immagini
    const IMG_BASE = 'assets/image/';
    let   _bootDone = false; // True dopo che il gioco ha fatto il boot

    // Detect host Altervista: rallenta i caricamenti (concorrenza e retry) per
    // evitare ERR_CONNECTION_RESET sotto carico burst.
    var IS_ALTERVISTA  = /altervista\.org$/i.test(location.hostname);
    var MAX_RETRIES    = IS_ALTERVISTA ? 4 : 3;
    var RETRY_DELAY_MS = 800;
    var MAX_CONCURRENT = IS_ALTERVISTA ? 2 : 3;

    // Emetti un evento quando un pacchetto è pronto (il resto del gioco lo ascolta).
    function _emitLoaded(packageName, pkg) {
        try {
            window.dispatchEvent(new CustomEvent('assetPackageLoaded', {
                detail: { name: packageName, label: pkg.label }
            }));
        } catch (e) { /* IE fallback silenzioso */ }
    }

    // ─────────────────────────────────────────────────────────
    // API Pubblica: window.AssetManager (delega a EspoV3.assets)
    // ─────────────────────────────────────────────────────────
    var _mgr = window.EspoV3.assets.createManager({
        getPackages: function () { return window.ASSET_PACKAGES; },
        imgBase: IMG_BASE,
        maxConcurrent: MAX_CONCURRENT,
        maxRetries: MAX_RETRIES,
        retryDelayMs: RETRY_DELAY_MS,
        onPackageLoaded: function (name, pkg) { _emitLoaded(name, pkg); },
        onLog: function (m) { console.log(m); },
        onWarn: function (m) { console.warn(m); },
    });
    window.AssetManager = {
        isLoaded: function (name) { return _mgr.isLoaded(name); },
        isLoading: function (name) { return _mgr.isLoading(name); },
        load: function (name) { return _mgr.load(name); },
        loadMultiple: function (names) { return _mgr.loadMultiple(names); },
        status: function () { return _mgr.status(); },
        notifyBootDone: function () {
            if (_bootDone) return;
            _bootDone = true;
            console.log('[AssetManager] 🚀 Boot completato — avvio caricamento progressivo.');
            _mgr.progressivePlan(IS_ALTERVISTA).forEach(function (item) {
                setTimeout(function () { _mgr.load(item.name); }, item.delay);
            });
        },
    };

    // ─────────────────────────────────────────────────────────
    // Bootstrap automatico
    // ─────────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', function () {

        // 1. Carica immediatamente il pacchetto CORE
        window.AssetManager.load('CORE');

        // 2. Ascolta l'evento di boot completato del gioco; fallback a timeout 5s.
        window.addEventListener('gameBootComplete', function () {
            window.AssetManager.notifyBootDone();
        }, { once: true });

        setTimeout(function () {
            window.AssetManager.notifyBootDone();
        }, 5000);

    });

    // ─────────────────────────────────────────────────────────
    // Integrazione con lo Shop Skins: precarica i pacchetti skin
    // mancanti all'apertura così le anteprime non hanno ritardi.
    // ─────────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', function () {

        var skinsBtn = document.getElementById('open-skins-btn');
        if (!skinsBtn) return;

        skinsBtn.addEventListener('click', function () {
            var skinPackages = [
                'SKINS_COMMON',
                'SKINS_RARE',
                'SKINS_EPIC',
                'SKINS_LEGENDARY',
                'THEME_DIVINE',
            ];
            window.AssetManager.loadMultiple(skinPackages);
        }, { once: true }); // once: al secondo click sono già in cache
    });

})();
