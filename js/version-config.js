const GAME_VERSION = {
    major: 2,       // Cambia questo per rompere la compatibilità in Beta
    minor: 1,       // Cambia questo per aggiornamenti "sicuri"
    stage: 'stable',  // 'stable' o 'beta'

    // Funzione per stampare la versione (es. "v3.1 beta")
    toString: function () {
        return `v${this.major}.${this.minor} ${this.stage}`;
    }
};

// Esportiamo globalmente
window.GAME_VERSION = GAME_VERSION;

// ============================================================
// CDN ASSET ROUTING (Cloudflare R2 + presigned URL)
// ============================================================
// Su Altervista gli asset pesanti (audio/video/music) sono privati
// su R2 e accessibili solo via URL firmate generate dal backend PHP.
//
//   - Bucket privato: nessuno scarica direttamente senza URL firmata
//   - Banda CDN globale Cloudflare (gratis, no egress fee)
//   - URL scadenza 1h: refresh automatico prima della scadenza
//   - Whitelist Referer lato PHP: anti-hotlink server-side
//
// In locale (MAMP/dev) i path restano relativi al server stesso.
// ============================================================
(function () {
    var IS_ALTERVISTA = /altervista\.org$/i.test(location.hostname);

    // Prefissi locali che richiedono routing su R2 (asset privati)
    var CDN_PREFIXES = [
        'assets/sounds/',
        'assets/video/',
        'music/songs/'
    ];

    // Cache URL firmati: { path: { url, expiresAt } }
    var _urlCache = {};
    // Coda di richieste pending per evitare richieste duplicate
    var _pendingBatch = null;
    var _pendingResolvers = [];
    var _pendingPaths = new Set();

    function _isRouted(path) {
        if (!path) return false;
        if (/^https?:\/\//i.test(path)) return false;
        var p = String(path).replace(/^\.\//, '').replace(/^\//, '');
        for (var i = 0; i < CDN_PREFIXES.length; i++) {
            if (p.indexOf(CDN_PREFIXES[i]) === 0) return true;
        }
        return false;
    }

    function _normalize(path) {
        return String(path).replace(/^\.\//, '').replace(/^\//, '');
    }

    // Soglia per considerare un URL "in scadenza" (5 min prima)
    var REFRESH_BEFORE_MS = 5 * 60 * 1000;

    function _isCachedFresh(path) {
        var entry = _urlCache[path];
        if (!entry) return false;
        return entry.expiresAt - Date.now() > REFRESH_BEFORE_MS;
    }

    /**
     * Fetch batch dei signed URLs dal backend PHP.
     * Accumula richieste fatte nello stesso tick e le manda in un'unica POST.
     */
    function _fetchSignedUrls(paths) {
        return fetch('php/get_asset_urls.php', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paths: paths })
        })
        .then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        })
        .then(function (data) {
            if (!data.urls) return {};
            var ttlMs = (data.ttl || 3600) * 1000;
            var expiresAt = Date.now() + ttlMs;
            Object.keys(data.urls).forEach(function (k) {
                _urlCache[k] = { url: data.urls[k], expiresAt: expiresAt };
            });
            return data.urls;
        });
    }

    /**
     * Risolve un path in URL firmata. Batcha richieste simultanee.
     */
    function _resolve(path) {
        path = _normalize(path);

        // Cache hit fresca
        if (_isCachedFresh(path)) {
            return Promise.resolve(_urlCache[path].url);
        }

        _pendingPaths.add(path);

        // Pianifica batch se non già pianificato
        if (!_pendingBatch) {
            _pendingBatch = new Promise(function (resolve) {
                setTimeout(function () {
                    var paths = Array.from(_pendingPaths);
                    _pendingPaths = new Set();
                    var resolvers = _pendingResolvers;
                    _pendingResolvers = [];
                    _pendingBatch = null;

                    _fetchSignedUrls(paths)
                        .then(function (urls) {
                            resolvers.forEach(function (r) { r.resolve(urls[r.path] || null); });
                            resolve();
                        })
                        .catch(function (err) {
                            console.warn('[CDN] Batch sign error:', err);
                            resolvers.forEach(function (r) { r.resolve(null); });
                            resolve();
                        });
                }, 30); // Aggrega 30ms di richieste
            });
        }

        return new Promise(function (resolve) {
            _pendingResolvers.push({ path: path, resolve: resolve });
        });
    }

    window.CDN = {
        enabled: IS_ALTERVISTA,
        prefixes: CDN_PREFIXES,

        /**
         * True se il path va instradato via R2 signed URL.
         */
        isRouted: function (path) {
            return IS_ALTERVISTA && _isRouted(path);
        },

        /**
         * Versione SYNC: ritorna il path locale se non routato,
         * o un URL cachato fresco se disponibile, altrimenti null.
         * Usare quando serve un valore immediato (es. Howler.src array).
         */
        urlSync: function (path) {
            if (!this.isRouted(path)) return path;
            var p = _normalize(path);
            return _isCachedFresh(p) ? _urlCache[p].url : null;
        },

        /**
         * Versione ASYNC: ritorna sempre URL utilizzabile (R2 signed o locale).
         * @param {string} path - es. 'assets/sounds/click.mp3'
         * @returns {Promise<string>} URL utilizzabile (signed o originale)
         */
        url: function (path) {
            if (!this.isRouted(path)) return Promise.resolve(path);
            return _resolve(path).then(function (signed) {
                return signed || path; // Fallback locale se sign fail
            });
        },

        /**
         * Pre-fetch batch (consigliato al boot per ridurre round-trip).
         * @param {string[]} paths
         * @returns {Promise<Object>} mappa path → URL
         */
        prefetch: function (paths) {
            if (!this.enabled) return Promise.resolve({});
            var routed = paths.filter(_isRouted).map(_normalize);
            if (routed.length === 0) return Promise.resolve({});
            // Filtra quelli già cachati freschi
            var toFetch = routed.filter(function (p) { return !_isCachedFresh(p); });
            if (toFetch.length === 0) {
                var cached = {};
                routed.forEach(function (p) { cached[p] = _urlCache[p].url; });
                return Promise.resolve(cached);
            }
            return _fetchSignedUrls(toFetch).then(function () {
                var out = {};
                routed.forEach(function (p) {
                    if (_urlCache[p]) out[p] = _urlCache[p].url;
                });
                return out;
            });
        }
    };
})();

// ============================================================
// DEBUG MODE: silenzia console.log/warn/info in production
// Attivabile dalla Cheatboard o da console: window.DEBUG_MODE = true
// console.error NON viene mai silenziato
// ============================================================
window.DEBUG_MODE = false;

(function () {
    const _log = console.log.bind(console);
    const _warn = console.warn.bind(console);
    const _info = console.info.bind(console);

    // Salva i metodi originali per uso diretto (es. cheatboard Log State)
    window._console = { log: _log, warn: _warn, info: _info, error: console.error.bind(console) };

    console.log = function (...args) { if (window.DEBUG_MODE) _log(...args); };
    console.warn = function (...args) { if (window.DEBUG_MODE) _warn(...args); };
    console.info = function (...args) { if (window.DEBUG_MODE) _info(...args); };
})();