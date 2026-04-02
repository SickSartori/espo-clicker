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