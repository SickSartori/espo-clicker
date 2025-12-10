const GAME_VERSION = {
    major: 3,       // Cambia questo per rompere la compatibilità in Beta
    minor: 3,       // Cambia questo per aggiornamenti "sicuri"
    stage: 'beta',  // 'stable' o 'beta'

    // Funzione per stampare la versione (es. "v3.1 beta")
    toString: function () {
        return `v${this.major}.${this.minor} ${this.stage}`;
    }
};

// Esportiamo globalmente
window.GAME_VERSION = GAME_VERSION;