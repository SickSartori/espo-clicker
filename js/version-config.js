const GAME_VERSION = {
    major: 2,       // Cambia questo per rompere la compatibilità in Beta
    minor: 0,       // Cambia questo per aggiornamenti "sicuri"
    stage: 'stable',  // 'stable' o 'beta'

    // Funzione per stampare la versione (es. "v3.1 beta")
    toString: function () {
        return `v${this.major}.${this.minor} ${this.stage}`;
    }
};

// Esportiamo globalmente
window.GAME_VERSION = GAME_VERSION;

// ============================================================
// CDN ASSET ROUTING (jsDelivr da repo GitHub)
// ============================================================
// Su Altervista i file pesanti (audio/video/music) vengono serviti
// da jsDelivr al posto del server condiviso. Lo stesso byte-per-byte,
// nessuna ricompressione, ma:
//   - Banda CDN globale (no throttling Altervista)
//   - HTTP/2 multiplex
//   - Cache edge persistente
//
// In locale (MAMP/dev) o su qualunque altro host, i path restano
// relativi al server stesso.
// ============================================================
(function () {
    var CDN_BASE = 'https://cdn.jsdelivr.net/gh/SickSartori/espo-clicker@2.0-Stable/';

    var IS_ALTERVISTA = /altervista\.org$/i.test(location.hostname);

    // Prefissi locali che meritano routing su CDN (file pesanti)
    var CDN_PREFIXES = [
        'assets/sounds/',
        'assets/video/',
        'music/songs/'
    ];

    function _shouldRoute(path) {
        if (!IS_ALTERVISTA || !path) return false;
        // Già URL assoluto? Non toccare.
        if (/^https?:\/\//i.test(path)) return false;
        // Normalizza: togli './' iniziale e '/' iniziale
        var p = String(path).replace(/^\.\//, '').replace(/^\//, '');
        for (var i = 0; i < CDN_PREFIXES.length; i++) {
            if (p.indexOf(CDN_PREFIXES[i]) === 0) return true;
        }
        return false;
    }

    function _encodePath(path) {
        // Mantiene gli slash, encoda spazi e caratteri speciali (es. òòò)
        return path.split('/').map(encodeURIComponent).join('/');
    }

    window.CDN = {
        base: IS_ALTERVISTA ? CDN_BASE : '',
        enabled: IS_ALTERVISTA,

        /**
         * Trasforma un path locale in URL CDN se applicabile.
         * @param {string} path - es. 'assets/sounds/click.mp3'
         * @returns {string} URL completa (CDN o locale)
         */
        url: function (path) {
            if (!_shouldRoute(path)) return path;
            var clean = String(path).replace(/^\.\//, '').replace(/^\//, '');
            return CDN_BASE + _encodePath(clean);
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