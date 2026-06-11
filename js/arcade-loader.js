// ============================================================
// ESPO CLICKER - Arcade Lazy Loader v1.0
// Carica Phaser.js + giochi arcade SOLO quando necessario.
// Risparmio stimato: ~1.5 MB e 9 richieste HTTP evitate
// sull'avvio per chi non usa la sezione Arcade.
// ============================================================

(function () {
    'use strict';

    // ---- Assets da caricare on-demand ----------------------

    const ARCADE_CSS = [
        'arcade/snake/css/snake.css',
        'arcade/space/css/space.css',
        'arcade/asteroids/css/asteroids.css',
        'arcade/super-espo/css/super-espo.css',
        'arcade/invaders/css/invaders.css',
        'arcade/centipede/css/centipede.css',
    ];

    // In dev locale (MAMP / localhost) usiamo Date.now() come cache-bust per
    // evitare che il SW serva versioni stale dei file arcade durante l'iterazione.
    // In produzione resta la versione stabile per consentire la cache HTTP/SW.
    const _isLocal = /^(localhost|127\.|192\.168\.|10\.|0\.0\.0\.0)/.test(location.hostname);
    // Cache-bust dei singoli giochi: in prod usa la versione PIENA (CACHE_VER, con patch,
    // iniettata da arcade.php/index.php) — non solo major.minor, altrimenti i fix di patch
    // ai giochi (es. super-espo.js) non bustavano mai la cache HTTP (Expires 1 anno).
    const _v = _isLocal
        ? Date.now()
        : (window.CACHE_VER || (window.GAME_VERSION ? window.GAME_VERSION.major + '.' + window.GAME_VERSION.minor : '3.0'));
    const PHASER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/phaser/3.60.0/phaser.min.js';
    // I 5 giochi canvas NON dipendono da Phaser → si caricano subito, in parallelo.
    const CANVAS_GAMES = [
        'arcade/snake/js/snake.js?v=' + _v,
        'arcade/space/js/space.js?v=' + _v,
        'arcade/asteroids/js/asteroids.js?v=' + _v,
        'arcade/invaders/js/invaders.js?v=' + _v,
        'arcade/centipede/js/centipede.js?v=' + _v,
    ];
    // Super Espò è l'UNICO che richiede Phaser.
    const SUPER_ESPO_JS = 'arcade/super-espo/js/super-espo.js?v=' + _v;

    // ---- Stato interno -------------------------------------

    let _loaded   = false;
    let _loading  = false;
    let _promise  = null;

    // ---- Helpers -------------------------------------------

    /**
     * Carica un foglio di stile CSS dinamicamente.
     * Risolve subito se il foglio è già presente nel DOM.
     */
    function loadCSS(href) {
        return new Promise(function (resolve) {
            // Controlla se già presente
            var existing = document.querySelector('link[rel="stylesheet"]');
            var all = document.querySelectorAll('link[rel="stylesheet"]');
            for (var i = 0; i < all.length; i++) {
                if (all[i].href.indexOf(href.split('?')[0]) !== -1) {
                    return resolve();
                }
            }
            var link = document.createElement('link');
            link.rel  = 'stylesheet';
            link.href = href;
            link.onload  = resolve;
            link.onerror = resolve; // Non bloccare se un CSS fallisce
            document.head.appendChild(link);
        });
    }

    /**
     * Carica uno script JS dinamicamente.
     * Risolve subito se lo script è già presente nel DOM.
     */
    function loadScript(src) {
        return new Promise(function (resolve, reject) {
            // Controlla se già presente (confronto per filename)
            var filename = src.split('/').pop().split('?')[0];
            var all = document.querySelectorAll('script[src]');
            for (var i = 0; i < all.length; i++) {
                if (all[i].src.indexOf(filename) !== -1) {
                    return resolve();
                }
            }
            var script = document.createElement('script');
            script.src     = src;
            script.async   = false; // Mantieni ordine per dipendenze
            script.onload  = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // ---- API pubblica --------------------------------------

    window.ArcadeLoader = {

        /** @returns {boolean} True se gli asset arcade sono già caricati */
        isLoaded: function () { return _loaded; },

        /** @returns {boolean} True se il caricamento è in corso */
        isLoading: function () { return _loading; },

        /**
         * Avvia il caricamento degli asset arcade.
         * @returns {Promise} Risolve quando tutto è pronto.
         */
        load: function () {
            if (_loaded)  return Promise.resolve();
            if (_loading) return _promise;

            _loading = true;
            console.log('[ArcadeLoader] Caricamento assets Arcade in corso...');

            _promise = Promise.all(ARCADE_CSS.map(loadCSS))
                .then(function () {
                    // I 5 giochi canvas si caricano subito, in parallelo, SENZA dipendere da Phaser.
                    var canvas = CANVAS_GAMES.map(loadScript);
                    // Phaser + Super Espò a parte: se la CDN cade, i 5 canvas restano giocabili.
                    var phaserChain = loadScript(PHASER_CDN)
                        .then(function () { return loadScript(SUPER_ESPO_JS); })
                        .catch(function (err) {
                            window._arcadePhaserFailed = true;
                            console.warn('[ArcadeLoader] ⚠️ Phaser/Super Espò non caricati (CDN giù?):', err);
                        });
                    return Promise.all(canvas.concat([phaserChain]));
                })
                .then(function () {
                    _loaded  = true;
                    _loading = false;
                    console.log('[ArcadeLoader] ✅ Assets Arcade caricati.');
                })
                .catch(function (err) {
                    _loading = false;
                    console.warn('[ArcadeLoader] ⚠️ Errore nel caricamento degli asset Arcade:', err);
                    // Non rigettare: l'interfaccia arcade può aprirsi lo stesso
                });

            return _promise;
        },

        /**
         * Precaricamento silenzioso (ideale su hover del pulsante Arcade).
         * Non blocca e non genera errori visibili.
         */
        preload: function () {
            if (!_loaded && !_loading) {
                this.load();
            }
        },
    };

    // ---- Hook automatici -----------------------------------

    document.addEventListener('DOMContentLoaded', function () {
        var arcadeBtn = document.getElementById('open-arcade-btn');
        if (!arcadeBtn) return;

        // Precarica in background al primo hover del pulsante Arcade
        arcadeBtn.addEventListener('mouseenter', function () {
            window.ArcadeLoader.preload();
        }, { once: true });

        // Su mobile (touch) inizia al touchstart del pulsante
        arcadeBtn.addEventListener('touchstart', function () {
            window.ArcadeLoader.preload();
        }, { once: true, passive: true });
    });

})();
