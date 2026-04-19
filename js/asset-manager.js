// ============================================================
// ESPO CLICKER - Asset Manager v1.0
// Sistema di caricamento progressivo degli asset grafici.
//
// Funzionamento:
//   1. Al boot carica il pacchetto CORE (immagini critiche).
//   2. Usa requestIdleCallback per caricare i pacchetti
//      successivi nei momenti di inattività del browser.
//   3. Espone window.AssetManager.load('NOME') per il
//      caricamento on-demand di pacchetti specifici.
//   4. Usa un CustomEvent 'assetPackageLoaded' per notificare
//      il resto del gioco quando un pacchetto è pronto.
//
// Dipendenza: asset-packages.js (deve caricare prima)
// ============================================================

(function () {
    'use strict';

    // Percorso base per le immagini
    const IMG_BASE = 'assets/image/';

    // Stato interno
    const _loaded  = new Set();   // Nome pacchetti già caricati
    const _loading = new Map();   // Nome → Promise (in corso)
    let   _bootDone = false;      // True dopo che il gioco ha fatto il boot

    // ─────────────────────────────────────────────────────────
    // Helper: preload di una singola immagine con retry
    // Ritenta fino a MAX_RETRIES volte su errore (es. ERR_CONNECTION_RESET)
    // prima di rinunciare silenziosamente.
    // ─────────────────────────────────────────────────────────
    var MAX_RETRIES    = 2;
    var RETRY_DELAY_MS = 1200;

    function _preloadImage(filename, attempt) {
        attempt = attempt || 0;
        return new Promise(function (resolve) {
            var img = new Image();
            img.decoding = 'async';
            img.loading = 'lazy';
            img.onload = resolve;
            img.onerror = function () {
                if (attempt < MAX_RETRIES) {
                    setTimeout(function () {
                        _preloadImage(filename, attempt + 1).then(resolve);
                    }, RETRY_DELAY_MS * (attempt + 1));
                } else {
                    resolve(); // Rinuncia silenziosamente dopo MAX_RETRIES
                }
            };
            img.src = IMG_BASE + filename;
        });
    }

    // ─────────────────────────────────────────────────────────
    // Semaforo globale: massimo N richieste concorrenti in totale
    // (condiviso tra tutti i pacchetti in caricamento simultaneo)
    // ─────────────────────────────────────────────────────────
    var MAX_CONCURRENT   = 3;
    var _activeRequests  = 0;
    var _pendingQueue    = [];

    function _enqueue(filename) {
        return new Promise(function (resolve) {
            _pendingQueue.push({ filename: filename, resolve: resolve });
            _drainQueue();
        });
    }

    function _drainQueue() {
        while (_activeRequests < MAX_CONCURRENT && _pendingQueue.length > 0) {
            var item = _pendingQueue.shift();
            _activeRequests++;
            _preloadImage(item.filename).then(function () {
                _activeRequests--;
                item.resolve();
                _drainQueue();
            });
        }
    }

    function _loadQueue(filenames) {
        if (filenames.length === 0) return Promise.resolve();
        return Promise.all(filenames.map(_enqueue));
    }

    // ─────────────────────────────────────────────────────────
    // Helper: esegui il lavoro durante il tempo libero del browser
    // Evita di bloccare l'UI durante il loading in background.
    // ─────────────────────────────────────────────────────────
    function _runIdle(fn, timeout) {
        if (typeof requestIdleCallback === 'function') {
            requestIdleCallback(fn, { timeout: timeout || 8000 });
        } else {
            setTimeout(fn, 200);
        }
    }

    // ─────────────────────────────────────────────────────────
    // Helper: emetti un evento quando un pacchetto è caricato
    // ─────────────────────────────────────────────────────────
    function _emitLoaded(packageName, pkg) {
        try {
            window.dispatchEvent(new CustomEvent('assetPackageLoaded', {
                detail: { name: packageName, label: pkg.label }
            }));
        } catch (e) { /* IE fallback silenzioso */ }
    }

    // ─────────────────────────────────────────────────────────
    // Core: carica un singolo pacchetto per nome
    // ─────────────────────────────────────────────────────────
    function _loadPackage(name) {
        // Già caricato
        if (_loaded.has(name)) return Promise.resolve();

        // In corso: restituisce la stessa promise
        if (_loading.has(name)) return _loading.get(name);

        var packages = window.ASSET_PACKAGES;
        if (!packages || !packages[name]) {
            console.warn('[AssetManager] Pacchetto sconosciuto:', name);
            return Promise.resolve();
        }

        var pkg    = packages[name];
        var images = pkg.images || [];

        // Pacchetto senza immagini (es. VIDEO_EVENTS, dichiarativo)
        if (images.length === 0) {
            _loaded.add(name);
            _emitLoaded(name, pkg);
            return Promise.resolve();
        }

        // Avvia il caricamento (non blocca il thread)
        var promise = new Promise(function (resolve) {
            _runIdle(function () {
                console.log(
                    '[AssetManager] 📦 Caricamento: ' + pkg.label +
                    ' (' + images.length + ' immagini)'
                );

                _loadQueue(images).then(function () {
                    _loaded.add(name);
                    _loading.delete(name);
                    console.log('[AssetManager] ✅ Pronto: ' + pkg.label);
                    _emitLoaded(name, pkg);
                    resolve();
                });
            });
        });

        _loading.set(name, promise);
        return promise;
    }

    // ─────────────────────────────────────────────────────────
    // Avvia il caricamento progressivo di tutti i pacchetti
    // con trigger 'afterBoot', rispettando i loro delay.
    // ─────────────────────────────────────────────────────────
    function _startProgressiveLoad() {
        var packages = window.ASSET_PACKAGES;
        if (!packages) return;

        // Ordina per priorità
        var names = Object.keys(packages).sort(function (a, b) {
            return (packages[a].priority || 0) - (packages[b].priority || 0);
        });

        names.forEach(function (name) {
            var pkg     = packages[name];
            var trigger = pkg.trigger;

            // Solo pacchetti con trigger automatico
            if (!trigger || trigger.type !== 'afterBoot') return;

            var delay = trigger.delay || 5000;
            setTimeout(function () {
                _loadPackage(name);
            }, delay);
        });
    }

    // ─────────────────────────────────────────────────────────
    // API Pubblica: window.AssetManager
    // ─────────────────────────────────────────────────────────
    window.AssetManager = {

        /**
         * Ritorna true se il pacchetto è stato caricato.
         * @param {string} name - Nome del pacchetto (es. 'SKINS_RARE')
         */
        isLoaded: function (name) {
            return _loaded.has(name);
        },

        /**
         * Ritorna true se il pacchetto è in fase di caricamento.
         * @param {string} name
         */
        isLoading: function (name) {
            return _loading.has(name);
        },

        /**
         * Carica un pacchetto on-demand.
         * Esempio d'uso: AssetManager.load('THEME_FURY')
         *
         * @param {string} name - Nome del pacchetto
         * @returns {Promise} Risolve quando il pacchetto è pronto
         */
        load: function (name) {
            return _loadPackage(name);
        },

        /**
         * Carica più pacchetti in parallelo.
         * @param {string[]} names - Array di nomi pacchetto
         * @returns {Promise}
         */
        loadMultiple: function (names) {
            return Promise.all(names.map(_loadPackage));
        },

        /**
         * Restituisce lo stato di tutti i pacchetti.
         * Utile per debug.
         */
        status: function () {
            var packages = window.ASSET_PACKAGES || {};
            var result   = {};
            Object.keys(packages).forEach(function (name) {
                result[name] = {
                    label:   packages[name].label,
                    loaded:  _loaded.has(name),
                    loading: _loading.has(name),
                };
            });
            return result;
        },

        /**
         * Segnala al manager che il gioco ha completato il boot.
         * Viene chiamato automaticamente ma può essere chiamato
         * manualmente dal codice di gioco per un timing preciso:
         *   window.AssetManager.notifyBootDone();
         */
        notifyBootDone: function () {
            if (_bootDone) return;
            _bootDone = true;
            console.log('[AssetManager] 🚀 Boot completato — avvio caricamento progressivo.');
            _startProgressiveLoad();
        },
    };

    // ─────────────────────────────────────────────────────────
    // Bootstrap automatico
    // ─────────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', function () {

        // 1. Carica immediatamente il pacchetto CORE
        _loadPackage('CORE');

        // 2. Ascolta l'evento di boot completato del gioco.
        //    Se il gioco non lo emette esplicitamente,
        //    usiamo un fallback con timeout di 5 secondi.
        window.addEventListener('gameBootComplete', function () {
            window.AssetManager.notifyBootDone();
        }, { once: true });

        // Fallback: avvia il progressivo dopo 5 secondi
        // nel caso in cui il gioco non emetta 'gameBootComplete'
        setTimeout(function () {
            window.AssetManager.notifyBootDone();
        }, 5000);

    });

    // ─────────────────────────────────────────────────────────
    // Integrazione con lo Shop Skins
    // Quando lo shop skins viene aperto, precarica i pacchetti
    // mancanti in modo che le anteprime non abbiano ritardi.
    // ─────────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', function () {

        var skinsBtn = document.getElementById('open-skins-btn');
        if (!skinsBtn) return;

        skinsBtn.addEventListener('click', function () {
            // Carica tutti i pacchetti skin rimanenti
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
