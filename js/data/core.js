// Inizializza l'oggetto contenitore globale
window.gameData = window.gameData || {};

// Costanti Globali di Configurazione
window.gameData.PRESTIGE_THRESHOLD = new Decimal("50000000");

// Funzioni Helper Globali (necessarie per definire le skin successivamente)
window.isChristmasSeason = function() {
    const now = new Date();
    const month = now.getMonth();
    const day = now.getDate();
    if (month === 11) return true;
    if (month === 0 && day <= 8) return true;
    return false;
};

// Costante calcolata subito
window.IS_XMAS_TIME = window.isChristmasSeason();