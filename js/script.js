// --------- RIFERIMENTI HTML (Globali) ---------
let clickerButton, scoreDisplay, cpsDisplay, feedbackContainer, achievementList;
let toastContainer, goldenBug, soundBluescreen, prestigeSection, prestigePointsDisplay;
let prestigeGainDisplay, prestigeBonusDisplay, eventMultiplierDisplay;
let enhancementStoreSection, enhancementList, clickUpgradeList, leftColumn, rightColumn;
let statsList, gameContainer, prestigeStore;
window.buyMultiplier = 1;
let currentUserPassword = null;
let currentSaveToken = null;


async function generateHash(message) {
    // 1. Tenta API Nativa (Veloce, richiede HTTPS o Localhost)
    if (window.crypto && window.crypto.subtle) {
        try {
            const msgBuffer = new TextEncoder().encode(message);
            const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (e) {
            console.warn("Crypto API nativa fallita, passo al fallback JS.");
        }
    }

    // 2. Fallback JS Puro (Per connessioni HTTP non sicure)
    return sha256_fallback(message);
}
function sha256_fallback(ascii) {
    function rightRotate(value, amount) {
        return (value >>> amount) | (value << (32 - amount));
    }

    var mathPow = Math.pow;
    var maxWord = mathPow(2, 32);
    var i, j;
    var result = '';
    var words = [];
    var asciiBitLength = ascii.length * 8;

    var hash = sha256_fallback.h = sha256_fallback.h || [];
    var k = sha256_fallback.k = sha256_fallback.k || [];
    var primeCounter = k.length;

    var isComposite = {};
    for (var candidate = 2; primeCounter < 64; candidate++) {
        if (!isComposite[candidate]) {
            for (i = 0; i < 313; i += candidate) {
                isComposite[i] = candidate;
            }
            hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
            k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
        }
    }

    ascii += '\x80';
    while (ascii.length % 64 - 56) ascii += '\x00';

    for (i = 0; i < ascii.length; i++) {
        j = ascii.charCodeAt(i);
        if (j >> 8) return ''; // Fallback supporta solo ASCII base
        words[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    words[words.length] = ((asciiBitLength / maxWord) | 0);
    words[words.length] = (asciiBitLength);

    for (j = 0; j < words.length;) {
        var w = words.slice(j, j += 16);
        var oldHash = hash;
        hash = hash.slice(0, 8);

        for (i = 0; i < 64; i++) {
            var w15 = w[i - 15], w2 = w[i - 2];
            var a = hash[0], e = hash[4];
            var temp1 = hash[7]
                + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
                + ((e & hash[5]) ^ ((~e) & hash[6]))
                + k[i]
                + (w[i] = (i < 16) ? w[i] : (
                    w[i - 16]
                    + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
                    + w[i - 7]
                    + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
                ) | 0
                );
            var temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
                + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

            hash = [(temp1 + temp2) | 0].concat(hash);
            hash[4] = (hash[4] + temp1) | 0;
        }

        for (i = 0; i < 8; i++) {
            hash[i] = (hash[i] + oldHash[i]) | 0;
        }
    }

    for (i = 0; i < 8; i++) {
        for (j = 3; j + 1; j--) {
            var b = (hash[i] >> (j * 8)) & 255;
            result += ((b < 16) ? 0 : '') + b.toString(16);
        }
    }
    return result;
}

// Source - https://stackoverflow.com/a/66072001
// Posted by Mohsen Alyafei, modified by community. See post 'Timeline' for change history
// Retrieved 2026-01-09, License - CC BY-SA 4.0

/******************************************************************
 * Converts e-Notation Numbers to Plain Numbers
 ******************************************************************
 * @function eToNumber(number)
 * @version  1.00
 * @param   {e nottation Number} valid Number in exponent format.
 *          pass number as a string for very large 'e' numbers or with large fractions
 *          (none 'e' number returned as is).
 * @return  {string}  a decimal number string.
 * @author  Mohsen Alyafei
 * @date    17 Jan 2020
 * Note: No check is made for NaN or undefined input numbers.
 *
 *****************************************************************/
function eToNumber(num) {
    let sign = "";
    (num += "").charAt(0) == "-" && (num = num.substring(1), sign = "-");
    let arr = num.split(/[e]/ig);
    if (arr.length < 2) return sign + num;
    let dot = (.1).toLocaleString('it-IT').substr(1, 1), n = arr[0], exp = +arr[1],
        w = (n = n.replace(/^0+/, '')).replace(dot, ''),
        pos = n.split(dot)[1] ? n.indexOf(dot) + exp : w.length + exp,
        L = pos - w.length, s = "" + BigInt(w);
    w = exp >= 0 ? (L >= 0 ? s + "0".repeat(L) : r()) : (pos <= 0 ? "0" + dot + "0".repeat(Math.abs(pos)) + s : r());
    L = w.split(dot); if (L[0] == 0 && L[1] == 0 || (+w == 0 && +s == 0)) w = 0; //** added 9/10/2021
    return sign + w;
    function r() { return w.replace(new RegExp(`^(.{${pos}})(.)`), `$1${dot}$2`) }
}

document.addEventListener('DOMContentLoaded', () => {
    // --------- Assegnazione Variabili ---------
    clickerButton = document.getElementById('clicker-btn');
    scoreDisplay = document.getElementById('score-display');
    cpsDisplay = document.getElementById('cps-display');
    feedbackContainer = document.getElementById('click-feedback-container');
    achievementList = document.getElementById('achievement-list');
    toastContainer = document.getElementById('toast-container');
    goldenBug = document.getElementById('golden-bug');
    soundBluescreen = document.getElementById('sound-bluescreen');

    prestigeSection = document.getElementById('prestige-section');
    prestigePointsDisplay = document.getElementById('prestige-points-display');
    prestigeGainDisplay = document.getElementById('prestige-gain-display');
    prestigeBonusDisplay = document.getElementById('prestige-bonus-display');
    eventMultiplierDisplay = document.getElementById('event-multiplier-display');
    prestigeStore = document.getElementById('prestige-store');

    enhancementStoreSection = document.getElementById('enhancement-store');
    enhancementList = document.getElementById('enhancement-list');
    clickUpgradeList = document.getElementById('click-upgrade-list');

    leftColumn = document.getElementById('left-column');
    rightColumn = document.getElementById('right-column');
    statsList = document.getElementById('stats-list');
    gameContainer = document.getElementById('game-container');

    // --------- SALVATAGGIO ---------
    const SAVE_KEY = 'espotoolClickerSaveV8';
    const BACKUP_KEY = 'espotoolClickerSaveV8_Backup'; // Chiave per il backup di sicurezza

    async function saveGame() {
        if (gameState.isDeleting) return;

        // Sanitizzazione
        if (isNaN(gameState.score) || gameState.score === null) gameState.score = 0;
        if (isNaN(gameState.totalScore)) gameState.totalScore = gameState.score;

        gameState.crunchTimeEndTime = crunchTimeEndTime;
        gameState.crunchTimeCooldownEnd = crunchTimeCooldownEnd;
        gameState.lastSaveTimestamp = Date.now();

        // Compressione
        let compressed = null;
        try {
            const stateJSON = JSON.stringify(gameState);
            compressed = LZString.compressToUTF16(stateJSON);
        } catch (e) {
            console.error("❌ Errore compressione:", e);
            return;
        }

        // Salvataggio Locale
        try {
            localStorage.setItem(SAVE_KEY, compressed);
            if (Math.random() < 0.2) localStorage.setItem(BACKUP_KEY, compressed);
        } catch (e) {
            if (window.EspooClicker) window.EspooClicker.showToast(gameData.texts.toasts.memoryFull, "error");
        }

        // SALVATAGGIO CLOUD SICURO
        if (gameState.user.username && currentUserPassword && currentSaveToken) {
            try {
                let rawScore = new Decimal(gameState.lifetimeScore);
                if (rawScore.lt(0)) rawScore = new Decimal(0);
                let scoreToSend = rawScore.toFixed(0);
                const prestigeToSend = Math.floor(gameState.totalResets || 0);

                // Genera la firma usando il token dinamico
                const dataString = `${scoreToSend}-${prestigeToSend}-${currentSaveToken}`;
                const signature = await generateHash(dataString);

                fetch('php/save_progress.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    keepalive: true,
                    body: JSON.stringify({
                        username: gameState.user.username,
                        password: currentUserPassword,
                        saveData: compressed,
                        score: scoreToSend,
                        prestige: prestigeToSend,
                        equippedSkin: gameState.skins.current,
                        totalFormattazioni: gameState.totalFormattazioni || 0,
                        hash: signature
                    })
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.status === 'conflict') {
                            // Avvisa l'utente che i dati sul server sono migliori
                            window.EspooClicker.showToast("⚠️ Conflitto Cloud! Ricarica la pagina per non perdere progressi.", "error");
                        }
                    })
                    .catch(err => console.warn("Errore Salvataggio Cloud:", err));
            } catch (e) {
                console.error("Errore hashing save:", e);
            }
        }
    }

    // --- FUNZIONE CHECK OFFLINE ---
    function checkOfflineProgress() {
        const modal = document.getElementById('offline-modal');

        if (!gameState.lastSaveTimestamp) {
            if (modal) modal.classList.add("modal_backdrop_none");
            return;
        }

        const now = Date.now();
        const diffSeconds = Math.floor((now - gameState.lastSaveTimestamp) / 1000);
        const maxOfflineSeconds = 43200;
        const effectiveSeconds = Math.min(diffSeconds, maxOfflineSeconds);

        if (effectiveSeconds > 60) {

            // --- CALCOLO EFFICIENZA ---
            let efficiency = 0.30; // Base 30%

            // Controllo di sicurezza per evitare crash se l'upgrade non è ancora nel save
            if (gameState.prestigeUpgrades &&
                gameState.prestigeUpgrades.serverAlwaysOn &&
                gameData.prestigeUpgrades &&
                gameData.prestigeUpgrades.serverAlwaysOn) {
                efficiency += (gameState.prestigeUpgrades.serverAlwaysOn.count * 0.10);
            }

            if (efficiency > 1.0) efficiency = 1.0; // Cap a 100%

            // Guadagno Potenziale
            const rawEarned = bps.mul(effectiveSeconds);
            const realEarned = rawEarned.mul(efficiency);

            if (realEarned > 0) {
                showOfflineModal(realEarned, efficiency);
                return;
            }
        }
        if (modal) modal.classList.add("modal_backdrop_none");
    }

    // Funzione Helper per il controllo versione
    // Funzione Helper per il controllo versione
    function checkSaveCompatibility(savedData) {
        if (!window.GAME_VERSION) return true;

        // 1. Salvataggi corrotti o senza versione -> Incompatibili
        if (!savedData || !savedData.version) {
            console.warn("Save: Versione mancante. Reset richiesto.");
            return false;
        }

        const current = window.GAME_VERSION;
        const saved = savedData.version;

        // 2. Se il gioco è in versione STABLE, accettiamo le vecchie major version.
        // Questo permette al 'deepMerge' di unire i vecchi dati con le nuove strutture
        // senza cancellare i progressi dei giocatori.
        if (current.stage === 'stable') {
            if (saved.major !== current.major) {
                console.info(`Migrazione Major: Save v${saved.major} -> Game v${current.major} (Stable). Permessa.`);
            }
            return true;
        }

        // 3. Se siamo in BETA (dev), manteniamo il controllo rigoroso: 
        // se la major cambia, rompe tutto -> Reset forzato per test.
        if (saved.major !== current.major) {
            console.warn(`Mismatch Major: Save v${saved.major} vs Game v${current.major} (Beta). Reset Forzato.`);
            return false;
        }

        return true;
    }

    function loadGame() {
        // Tenta di recuperare il salvataggio principale
        let savedState = localStorage.getItem(SAVE_KEY);
        let loadedFromBackup = false;

        // Se il salvataggio principale non esiste o è vuoto, prova il BACKUP
        if (!savedState) {
            savedState = localStorage.getItem(BACKUP_KEY);

            if (savedState) {
                loadedFromBackup = true;
                console.warn("⚠️ Main save non trovato. Tentativo di caricamento dal BACKUP.");
            }
        }

        if (savedState) {
            try {
                let parsedState = null;

                // --- TENTATIVO DI DECOMPRESSIONE ---
                // Proviamo a decomprimere la stringa
                const decompressed = LZString.decompressFromUTF16(savedState);

                if (decompressed && (decompressed.startsWith('{') || decompressed.startsWith('['))) {
                    try {
                        parsedState = JSON.parse(decompressed);
                        // console.log("💾 Salvataggio compresso caricato.");
                    }
                    catch (e) {
                        console.warn("Dati decompressi corrotti, tento parsing diretto.");
                    }
                }

// Fallback: Se la decompressione fallisce, prova a leggere come JSON puro (Legacy)
                if (!parsedState) {
                    try {
                        parsedState = JSON.parse(savedState);
                    }
                    catch (e) {
                        throw new Error("Impossibile parsare il salvataggio.");
                    }
                }

                // 1. PRIMA COSA: Salviamo il flag per le Release Notes
                let showRN = false;
                if (parsedState && parsedState.version && window.GAME_VERSION) {
                    const oldMajor = parsedState.version.major || 0;
                    const oldMinor = parsedState.version.minor || 0;
                    const currMajor = window.GAME_VERSION.major;
                    const currMinor = window.GAME_VERSION.minor;

                    if (oldMajor < currMajor || (oldMajor === currMajor && oldMinor < currMinor)) {
                        showRN = true;
                    }
                }

                // ========================================================
                // 2. MIGRAZIONE V1 -> V2 (RIALLINEAMENTO GLOBALE)
                // ========================================================
                window.triggerV2MigrationModal = false; // Flag globale per il modale
                const saveMajor = (parsedState.version && parsedState.version.major) ? parsedState.version.major : 1;
                const gameMajor = window.GAME_VERSION.major;

                // Identifica un veterano (versione vecchia E score elevato)
                let isVeteran = false;
                try { if (parsedState.totalScore && new Decimal(parsedState.totalScore).gt(10000)) isVeteran = true; } catch(e){}

                if (saveMajor < 2 && gameMajor >= 2 && isVeteran) {
                    console.log("Migrazione V1 -> V2 rilevata! Eseguo riallineamento...");

                    // A. Salva le uniche cose che vogliamo mantenere
                    const savedSkins = parsedState.skins ? parsedState.skins.unlocked : ['default'];
                    const currentSkin = parsedState.skins ? parsedState.skins.current : 'default';
                    const username = (parsedState.user && parsedState.user.username) ? parsedState.user.username : 'Giocatore';
                    const masterVol = (parsedState.user && parsedState.user.masterVolume !== undefined) ? parsedState.user.masterVolume : 0.8;

                    // B. Genera uno stato completamente pulito
                    let newState = getInitialGameState();

                    // C. Inietta i dati salvati
                    newState.skins.unlocked = savedSkins;
                    newState.skins.current = currentSkin;
                    newState.user.username = username;
                    newState.user.masterVolume = masterVol;

                    // D. PREMIO VETERANO: 1 Formattazione e 1 Q-Bit
                    newState.totalFormattazioni = 1;
                    newState.qBits = new Decimal(1);
                    newState.lifetimeQBits = new Decimal(1);

                    // E. Aggiorna la versione
                    if (window.GAME_VERSION) {
                        newState.version = JSON.parse(JSON.stringify(window.GAME_VERSION));
                    }

                    // Sostituisci l'oggetto parsato
                    parsedState = newState;
                    window.triggerV2MigrationModal = true;
                }
                // ========================================================

                // Imposta la variabile per le RN in modo coerente per tutto il gioco
                if (showRN) {
                    window.shouldShowReleaseNotesOnLoad = true;
                }

                // --- CONTROLLO COMPATIBILITÀ VERSIONE ---
                if (!checkSaveCompatibility(parsedState)) {
                    console.warn("⚠️ Reset forzato per incompatibilità versione.");

                    // 1. Backup di sicurezza
                    try {
                        localStorage.setItem(BACKUP_KEY + "_Legacy", savedState);
                    } catch (e) { }

                    // 2. Resetta la cache
                    if (typeof resetGameToDefault === 'function') {
                        resetGameToDefault();
                    }

                    // 3. AGGIORNA LA VERSIONE IN MEMORIA (Cruciale)
                    if (window.GAME_VERSION) {
                        gameState.version = JSON.parse(JSON.stringify(window.GAME_VERSION));
                    }

                    // 4. SCRITTURA FORZATA SU DISCO
                    // Scriviamo subito il file pulito, così al prossimo F5 è valido.
                    try {
                        const newStateJSON = JSON.stringify(gameState);
                        const newCompressed = LZString.compressToUTF16(newStateJSON);
                        localStorage.setItem(SAVE_KEY, newCompressed);
                        console.log("✅ File di salvataggio resettato e scritto su disco.");
                    } catch (e) {
                        console.error("❌ Errore scrittura reset:", e);
                    }

                    // 5. Avvisa l'utente una volta sola
                    setTimeout(() => {
                        if (window.EspooClicker) {
                            window.EspooClicker.showToast("Dati migrati alla nuova versione!", 'warning');
                        }
                    }, 1000);

                }
                else {
                    // --- MERGE DEI DATI ---
                    if (parsedState.buildings && !parsedState.teams) {
                        parsedState.teams = parsedState.buildings;
                        delete parsedState.buildings;
                    }

                    deepMerge(gameState, parsedState);

                    const decimalFields = [
                        'score',
                        'totalScore',
                        'lifetimeScore',
                        'totalOfflineScore',
                        'prestigePoints',
                        'lifetimePrestigePoints',
                        'baseClickValue',
                        'qBits',
                        'lifetimeQBits'
                    ];

                    decimalFields.forEach(field => {
                        let val = gameState[field];

                        // Se il valore è mancante, usa 0
                        if (val === undefined || val === null) {
                            gameState[field] = new Decimal(0);
                        } else {
                            // Se è un oggetto puro (dal JSON) che ha mantissa ed esponente,
                            // break_infinity v2 a volte preferisce che venga ricreato pulito.
                            try {
                                gameState[field] = new Decimal(val);
                            } catch (e) {
                                console.warn(`Errore ripristino campo ${field}, reset a 0.`, e);
                                gameState[field] = new Decimal(0);
                            }
                        }
                    });

                    if (gameState.baseClickValue.eq(0)) gameState.baseClickValue = new Decimal(1);
                }

                // Se abbiamo caricato un backup, notifichiamo l'utente e ripariamo il main slot
                if (loadedFromBackup) {
                    setTimeout(() => {
                        if (window.EspooClicker)
                            window.EspooClicker.showToast(gameData.texts.toasts.backupRestored, "warning");
                    }, 1000);

                    saveGame(); // Salva subito nel main slot per rigenerarlo
                }

                // --- INIZIALIZZAZIONE STRUTTURE MANCANTI ---

                // Aggiorna versione save alla versione attuale del codice
                if (window.GAME_VERSION) {
                    gameState.version =
                    {
                        major: window.GAME_VERSION.major,
                        minor: window.GAME_VERSION.minor,
                        stage: window.GAME_VERSION.stage
                    };
                }

                // Inizializza Enhancements
                if (!gameState.buildingEnhancements) gameState.buildingEnhancements = {};

                for (const key in gameData.buildingEnhancements) {
                    if (!gameState.buildingEnhancements[key])
                        gameState.buildingEnhancements[key] = { purchased: false };
                }

                // Inizializza Click Upgrades
                if (!gameState.clickUpgrades) gameState.clickUpgrades = {};

                for (const key in gameData.clickUpgrades) {
                    if (!gameState.clickUpgrades[key])
                        gameState.clickUpgrades[key] = { purchased: false };
                }

                // Inizializza Prestige Upgrades
                if (!gameState.prestigeUpgrades) gameState.prestigeUpgrades = {};

                for (const key in gameData.prestigeUpgrades) {
                    if (!gameState.prestigeUpgrades[key]) {
                        const isCounted = gameData.prestigeUpgrades[key].isCounted;
                        gameState.prestigeUpgrades[key] = isCounted ? { count: 0 } : { purchased: false };
                    }
                }

                // Variabili Temporali
                if (gameState.crunchTimeEndTime) crunchTimeEndTime = gameState.crunchTimeEndTime;
                if (gameState.crunchTimeCooldownEnd) crunchTimeCooldownEnd = gameState.crunchTimeCooldownEnd;

                // Prestige Points Lifetime
                if (gameState.lifetimePrestigePoints === undefined || gameState.lifetimePrestigePoints === null)
                    gameState.lifetimePrestigePoints = gameState.prestigePoints;

                // Filtri
                if (!gameState.filterSettings)
                    gameState.filterSettings = { globalFilter: 'available' };

                // Achievements
                if (gameData.achievements) {
                    if (!gameState.achievements) gameState.achievements = {};

                    for (const key in gameData.achievements) {
                        if (!gameState.achievements[key])
                            gameState.achievements[key] = { unlocked: false, claimed: false };
                    }
                }

                // Applicazione Skin Visiva
                if (gameState.skins && gameState.skins.current)
                    if (typeof applySkinVisuals === 'function')
                        applySkinVisuals(gameState.skins.current);
            }
            catch (e) {
                console.error("❌ Errore critico in loadGame:", e);

                // TENTATIVO DISPERATO: Se il main è corrotto e non abbiamo ancora provato il backup
                if (!loadedFromBackup) {
                    console.log("Il salvataggio principale è corrotto. Tento il backup...");
                    const backupState = localStorage.getItem(BACKUP_KEY);

                    if (backupState) {
                        try {
                            const decompBackup = LZString.decompressFromUTF16(backupState);
                            const parsedBackup = JSON.parse(decompBackup);
                            deepMerge(gameState, parsedBackup);

                            setTimeout(() => {
                                if (window.EspooClicker) window.EspooClicker.showToast(gameData.texts.toasts.fileCorrupt, "error");
                            }, 1000);

                            // Ripariamo il file principale
                            saveGame();

                            // Rilanciamo la funzione di caricamento per applicare le logiche (skins, ecc)
                            // Nota: Evitiamo ricorsione infinita grazie al fatto che ora lo stato è in memoria
                        }
                        catch (bkErr) {
                            console.error("Anche il backup è inutilizzabile.", bkErr);
                        }
                    }
                }
            }
        }

        // Recupero Username Legacy (se presente in vecchie versioni localStorage)
        const legacyUsername = localStorage.getItem('espooClickerUsername');

        if (legacyUsername && (!gameState.user.username || gameState.user.username === 'Giocatore'))
            gameState.user.username = legacyUsername;

        // RICALCOLO EFFETTI E STATISTICHE
        if (typeof reapplyAllEffects === 'function')
            reapplyAllEffects();

        // Ricalcolo Bonus Prestigio e BPS
        calculatePrestigeBonus();
        recalculateCPS();

        for (const key in gameData.achievements) {
            const achData = gameData.achievements[key];
            const achState = gameState.achievements[key];

            if (achState && achState.claimed && achData.reward && achData.reward.type === 'skin') {
                const skinId = achData.reward.id || achData.reward.value;

                if (gameState.skins.unlocked && !gameState.skins.unlocked.includes(skinId)) {
                    // console.log(`[Auto-Fix] Recuperata skin mancante: ${skinId}`);
                    gameState.skins.unlocked.push(skinId);
                }
            }
        }

        // Applicazione Effetti passivi speciali al caricamento
        if (gameState.clickUpgrades.hacking && gameState.clickUpgrades.hacking.purchased)
            if (window.goldenBugChance) window.goldenBugChance *= 2;

        if (gameState.prestigeUpgrades.ticketPremium && gameState.prestigeUpgrades.ticketPremium.purchased)
            if (window.goldenBugSpawnTime) window.goldenBugSpawnTime *= 0.5;

        if (bps.lt(0)) bps = new Decimal(0);
        // --- POPUP DI MIGRAZIONE V2 ---
        if (typeof triggerV2MigrationModal !== 'undefined' && triggerV2MigrationModal) {
            setTimeout(() => {
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        title: '🌌 BENVENUTO NELLA V2.0 🌌',
                        html: `
                            <div style="text-align: left; font-family: 'Inter', sans-serif; font-size: 0.95rem; color: #bdc3c7;">
                                Grazie per aver giocato alla prima versione di <b>Espòòò Clicker</b>!<br><br>
                                Per introdurre il <b>New Game+</b>, la Sala Arcade e riequilibrare la classifica per i veterani, abbiamo effettuato un <b>Riallineamento Quantico</b> dei server.<br><br>
                                <div style="background: rgba(46, 204, 113, 0.1); border-left: 4px solid #2ecc71; padding: 10px; margin-bottom: 10px; border-radius: 4px;">
                                    <b style="color:#2ecc71;">✓ LE TUE SKIN SONO SALVE</b><br>
                                    Il tuo guardaroba è intatto.
                                </div>
                                <div style="background: rgba(155, 89, 182, 0.1); border-left: 4px solid #9b59b6; padding: 10px; border-radius: 4px;">
                                    <b style="color:#9b59b6;">✓ BONUS VETERANO</b><br>
                                    Ti abbiamo accreditato <b>1 Formattazione</b> e <b>1 Q-Bit</b>. Il Quantum Lab è già aperto per te!
                                </div>
                            </div>
                        `,
                        icon: 'info',
                        background: '#151b22',
                        color: '#fff',
                        confirmButtonColor: '#9b59b6',
                        confirmButtonText: '<i class="fa-solid fa-meteor"></i> INIZIA UNA NUOVA ERA',
                        allowOutsideClick: false,
                        allowEscapeKey: false
                    });
                } else {
                    alert("Benvenuto nella V2.0! Abbiamo riallineato i server. Le tue skin sono salve e hai ottenuto 1 Formattazione bonus!");
                }
                
                // Forza subito il salvataggio in Cloud con il nuovo punteggio riallineato
                if (window.EspooClicker) window.EspooClicker.saveGame();
                if (typeof updateUI === 'function') updateUI();
                
            }, 1000); // Piccolo ritardo per far chiudere il loader iniziale
        }
    }

    function deepMerge(target, source) {
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (source[key] instanceof Object && !Array.isArray(source[key])) {
                    if (!target[key]) target[key] = {}; // Crea l'oggetto se manca
                    deepMerge(target[key], source[key]);
                }
                else
                    target[key] = source[key];
            }
        }
    }

    function showOfflineModal(amount, efficiency) {
        const modal = document.getElementById('offline-modal');
        const displayAmount = document.getElementById('offline-earnings-display');
        const displayEff = document.getElementById('offline-efficiency-display');
        const btn = document.getElementById('btn-claim-offline');

        if (!modal) return;

        // Formatta i testi
        displayAmount.textContent = formatNumber(amount);
        displayEff.textContent = (efficiency * 100).toFixed(0) + "%";

        // Setup Bottone
        const claimHandler = () => {
            // Aggiungi i punti
            gameState.score = gameState.score.add(amount);
            gameState.totalScore = gameState.totalScore.add(amount);
            gameState.lifetimeScore = gameState.lifetimeScore.add(amount);

            // Per totalOfflineScore, assicurati che sia inizializzato come Decimal prima:
            if (!gameState.totalOfflineScore) gameState.totalOfflineScore = new Decimal(0);
            gameState.totalOfflineScore = gameState.totalOfflineScore.add(amount);

            // Chiudi modale
            modal.classList.add("modal_backdrop_none");

            // Salva e Feedback
            window.EspooClicker.saveGame();
            updateUI();
            window.EspooClicker.showToast(gameData.texts.toasts.offlineClaim.replace('{amount}', formatNumber(amount)), 'success');
            window.EspooClicker.playSound('sound-buy');

            // Rimuovi listener per pulizia
            btn.removeEventListener('click', claimHandler);
        };

        // Rimuovi vecchi listener clonando il nodo (hack veloce per pulire eventi anonimi precedenti)
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        newBtn.addEventListener('click', claimHandler);

        // Mostra
        modal.classList.remove("modal_backdrop_none");
    }

    let lastFrameTime = Date.now();
    let lastSlowTick = 0;

    // --------- LOOP DI GIOCO CORRETTO ---------
    function gameLoop() {
        const now = Date.now();
        let deltaTime = (now - lastFrameTime) / 1000;
        lastFrameTime = now;

        // Se il delta time è maggiore di 2 secondi, il gioco era in background.
        // Ignoriamo questo grosso salto temporale qui, perché verrà gestito 
        // dal checkOfflineProgress() che si attiva al caricamento o al focus.
        if (deltaTime > 2) {
            deltaTime = 0.1; // Fallback per far ripartire il loop dolcemente
        }

        // Calcolo Score (Veloce - Ogni frame)
        const scoreToAdd = bps.mul(deltaTime);

        gameState.score = gameState.score.add(scoreToAdd);
        gameState.totalScore = gameState.totalScore.add(scoreToAdd);
        gameState.lifetimeScore = gameState.lifetimeScore.add(scoreToAdd);

        // playTime è un numero semplice, qui va bene +=
        gameState.totalPlayTime += deltaTime;

        // Slow Loop (1 volta al secondo) - OTTIMIZZAZIONE
        if (now - lastSlowTick > 1000) {
            checkAchievements();         // Controlla obiettivi
            checkTabNotifications();     // Controlla i pallini rossi sui tab

            lastSlowTick = now;
        }

        // Gestione Click History (Veloce)
        const clickNow = Date.now();
        // click.value è un Decimal, ma qui non facciamo calcoli, solo filtraggio temporale
        clickHistory = clickHistory.filter(click => clickNow - click.time < 1000);

        // --- CONTROLLO FINE CRUNCH TIME ---
        if (gameState.crunchTimeEndTime > 0 && now > gameState.crunchTimeEndTime) {
            if (document.body.classList.contains('crunch-active')) {
                document.body.classList.remove('crunch-active');
                const overlay = document.getElementById('crunch-overlay');
                if (overlay) overlay.style.display = 'none';

                const furyMusic = document.getElementById('sound-fury-music');
                if (furyMusic) {
                    furyMusic.pause();
                    furyMusic.currentTime = 0;
                }

                if (typeof AudioManager !== 'undefined')
                    AudioManager.updateAmbience();

                const fireContainer = document.getElementById('fire-particles-container');
                if (fireContainer) {
                    fireContainer.style.display = 'none';
                    fireContainer.innerHTML = '';
                }

                if (typeof fireParticleInterval !== 'undefined' && fireParticleInterval) {
                    clearInterval(fireParticleInterval);
                    fireParticleInterval = null;
                }

                if (typeof applySkinVisuals === 'function')
                    applySkinVisuals(gameState.skins.current);

                // RESET LOGICA GIOCO
                crunchTimeMultiplier = new Decimal(1); // Reimposta come Decimal
                recalculateCPS();

                if (typeof updateUI === 'function') updateUI();
                if (typeof refreshAllStores === 'function') refreshAllStores();

                if (window.currentActiveEvent === 'Crunch Time' || window.currentActiveEvent === 'Espo Fury') {
                    window.currentActiveEvent = null;
                    console.log("Espo Fury terminato. Semaforo verde.");
                }

                window.EspooClicker.showToast(gameData.texts.toasts.furyEnded, 'info');
            }
        }
    }

    // --------- 11. INIZIALIZZAZIONE ---------
    let gameLoopInterval = null;
    let uiLoopInterval = null;
    let saveInterval = null;
    let leaderboardInterval = null;

    function startGameRoutines() {
        // STOP preventivo: Se esistono già intervalli attivi, cancellali
        if (gameLoopInterval) clearInterval(gameLoopInterval);
        if (uiLoopInterval) clearInterval(uiLoopInterval);
        if (saveInterval) clearInterval(saveInterval);
        if (leaderboardInterval) clearInterval(leaderboardInterval);

        // Volume audio iniziale
        document.querySelectorAll('audio').forEach(audio => {
            audio.volume = gameState.user.masterVolume;
        });

        // LOGICA (30 FPS)
        function startGameLoop() {
            gameLoop();
            requestAnimationFrame(startGameLoop);
        }

        // Avvio
        requestAnimationFrame(startGameLoop);

        // GRAFICA (10 FPS)
        uiLoopInterval = setInterval(() => {
            updateUI();
            if (typeof updatePrestigeVisuals === 'function') updatePrestigeVisuals();

            const statsModal = document.getElementById('stats-modal');

            if (statsModal && statsModal.style.display === 'flex')
                if (typeof updateStatsUI === 'function') updateStatsUI();

            let isAnyModalOpen = false;
            document.querySelectorAll('.modal-backdrop').forEach(el => {
                if (el.style.display === 'flex' && el.style.opacity !== '0') {
                    isAnyModalOpen = true;
                }
            });

            // Se nessun modale è aperto ma il body ha la classe, rimuovila
            if (!isAnyModalOpen && document.body.classList.contains('modal-open')) {
                document.body.classList.remove('modal-open');
            }
            // ---------------------------

        }, 100);

        // Auto-save (ogni 30s)
        saveInterval = setInterval(saveGame, 30000);


        scheduleGoldenBug();

        // Salvataggio alla chiusura
        const handleAppClose = () => {
            // Forza un salvataggio sincrono in localStorage (sempre garantito)
            if (gameState && !gameState.isDeleting) {
                gameState.lastSaveTimestamp = Date.now();
                const compressed = LZString.compressToUTF16(JSON.stringify(gameState));
                localStorage.setItem('espotoolClickerSaveV8', compressed);
            }
            // Avvia il salvataggio Cloud (il parametro keepalive: true nel fetch aiuta a finire la richiesta)
            saveGame();
        };

        window.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                handleAppClose();
            }
        });
        window.addEventListener('pagehide', handleAppClose);
        window.addEventListener('beforeunload', handleAppClose);
        console.log("Cicli di gioco avviati correttamente.");
    }

    // Funzione universale per precaricare TUTTO (Immagini, Audio, Video)
    function preloadAllAssets(onProgress) {
        const criticalPromises = [];
        const backgroundPromises = [];

        // 1. ASSET CRITICI (Immagini base)
        const criticalImages = new Set([
            'assets/image/favicon.webp',
            'assets/image/hidden.webp',
            'assets/image/bluescreen.webp',
            'assets/image/super-block.webp'
        ]);
        const backgroundImages = new Set();

        // Identifica la skin corrente per caricare SOLO quella
        let currentSkinId = 'default';
        if (gameState && gameState.skins && gameState.skins.current) {
            currentSkinId = gameState.skins.current;
        }

        if (gameData.skins) {
            Object.keys(gameData.skins).forEach(key => {
                const skin = gameData.skins[key];
                if (key === currentSkinId) {
                    if (skin.img) criticalImages.add(`assets/image/${skin.img}`);
                    if (skin.imgClick) criticalImages.add(`assets/image/${skin.imgClick}`);
                } else {
                    if (skin.img) backgroundImages.add(`assets/image/${skin.img}`);
                    if (skin.imgClick) backgroundImages.add(`assets/image/${skin.imgClick}`);
                }
            });
        }

        // Le immagini della Fury vanno in background
        if (gameData.prestigeUpgrades) {
            Object.values(gameData.prestigeUpgrades).forEach(upg => {
                if (upg.furyImage) backgroundImages.add(`assets/image/${upg.furyImage}`);
                if (upg.furyClickImage) backgroundImages.add(`assets/image/${upg.furyClickImage}`);
            });
        }

        // 2. AUDIO CRITICI (Solo UI ed eventuale musica della skin corrente)
        const criticalAudioIds = ['sound-click', 'sound-buy', 'sound-error', 'sound-golden', 'sound-achievement'];

        const currentSkinConf = gameData.skins[currentSkinId]?.themeConfig;
        if (currentSkinConf && currentSkinConf.specialMusic) {
            criticalAudioIds.push(currentSkinConf.specialMusic);
        } else if (gameState && gameState.user && gameState.user.bgMusicSelection) {
            criticalAudioIds.push(gameState.user.bgMusicSelection);
        } else {
            criticalAudioIds.push('sound-bg-music');
        }

        let totalCritical = criticalImages.size + criticalAudioIds.length;
        let loadedCritical = 0;

        const updateProgress = () => {
            loadedCritical++;
            if (onProgress && totalCritical > 0) {
                onProgress(Math.floor((loadedCritical / totalCritical) * 100));
            }
        };

        // --- CARICAMENTO IMMAGINI CRITICHE ---
        criticalImages.forEach(src => {
            criticalPromises.push(
                new Promise((resolve) => {
                    const img = new Image();
                    img.src = src;
                    img.onload = () => { updateProgress(); resolve(); };
                    img.onerror = () => { console.warn("Manca img:", src); updateProgress(); resolve(); };
                })
            );
        });

        // --- CARICAMENTO AUDIO MISTO ---
        if (gameData.assets && gameData.assets.sounds) {
            Object.values(gameData.assets.sounds).forEach(sound => {
                let url = sound.file.includes('/') ? sound.file : `assets/sounds/${sound.file}`;

                if (criticalAudioIds.includes(sound.id)) {
                    // Blocca il caricamento finché non ha finito
                    criticalPromises.push(fetch(url).then(() => updateProgress()).catch(() => updateProgress()));
                } else {
                    // Lascialo scaricare in background
                    backgroundPromises.push(fetch(url).catch(() => { }));
                }
            });
        }

        // --- DOPO I CRITICI, CARICA IL BACKGROUND E I VIDEO ---
        Promise.all(criticalPromises).then(() => {
            backgroundImages.forEach(src => {
                const img = new Image();
                img.src = src;
            });
            Promise.all(backgroundPromises);

            // Inietta i tag video nell'HTML in modo pigro
            injectVideosLazily();
        });

        return totalCritical === 0 ? Promise.resolve() : Promise.all(criticalPromises);
    }

    // Crea i tag <video> pesanti dinamicamente e li aggiunge in background
    function injectVideosLazily() {
        const videoData = [
            { id: 'rick-roll-video', class: 'rick_roll_video', src: 'assets/video/rick-espley-video.mp4' },
            { id: 'ricardo-video', class: 'ricardo_video', src: 'assets/video/ricardo-milespo-video.mp4' },
            { id: 'ricardo-metal-video', class: 'ricardo_metal_video', src: 'assets/video/ricardo-milespo-metal-video.mp4' },
            { id: 'ricardo-dota-video', class: 'ricardo_dota_video', src: 'assets/video/ricardo-milespo-dota-video.mp4' },
            { id: 'video-bigbang', class: 'bigbang_video', src: 'assets/video/bigbang-espoclicker.mp4' }
        ];

        videoData.forEach(v => {
            if (!document.getElementById(v.id)) {
                const videoEl = document.createElement('video');
                videoEl.id = v.id;
                videoEl.className = `${v.class} video_display_none`;
                videoEl.playsInline = true;
                videoEl.preload = "none"; // Evita di scaricare il video prima del tempo
                videoEl.setAttribute('data-src', v.src);
                document.body.appendChild(videoEl);
            }
        });
    }

    // Setup Iniziale
    function initializeGame() {
        const loaderStatus = document.getElementById('loader-status-text');

        if (loaderStatus) loaderStatus.textContent = gameData.texts.ui.loadingData;
        loadGame(); // Carica salvataggi

        const btnFormatOpen = document.getElementById('btn-open-format-modal');
        const btnFormatExecute = document.getElementById('btn-execute-format'); // Fallback se c'è ancora l'id vecchio
        const formatModal = document.getElementById('format-modal');
        const btnConfirmFormat = document.getElementById('btn-confirm-format');

        const openFormatHandler = () => {
            // CONTROLLO DI SICUREZZA
            if ((gameState.totalResets || 0) < 20) {
                if (window.EspooClicker) window.EspooClicker.showToast("Devi effettuare almeno 20 Promozioni in questo Universo per formattare!", "error");
                return;
            }

            if (formatModal) {
                const tokenDiv = gameState.prestigePoints.div(10000);
                let bonusQbits = new Decimal(0);
                if (tokenDiv.gte(1)) bonusQbits = tokenDiv.sqrt().floor();
                let qBitsEarned = new Decimal(1).add(bonusQbits);
                const previewEl = document.getElementById('format-gain-qbit');
                if (previewEl) previewEl.textContent = `+${formatNumber(qBitsEarned)}`;

                formatModal.style.display = 'flex';
                formatModal.style.opacity = '1';

                const content = formatModal.querySelector('.modal-content');
                if (content) {
                    if (typeof gsap !== 'undefined') {
                        gsap.fromTo(content,
                            { scale: 0.8, opacity: 0, y: 20 },
                            { scale: 1, opacity: 1, y: 0, duration: 0.4, ease: "back.out(1.7)" }
                        );
                    } else {
                        content.style.opacity = '1';
                        content.style.transform = 'scale(1) translateY(0px)';
                    }
                }
                // ===================================================

                document.body.classList.add('modal-open');
                playSound('sound-click');
            }
        };

        if (btnFormatOpen) btnFormatOpen.addEventListener('click', openFormatHandler);
        if (btnFormatExecute) btnFormatExecute.addEventListener('click', openFormatHandler);

        if (btnConfirmFormat) {
            btnConfirmFormat.addEventListener('click', () => {
                // TRUCCO ANTI-BLOCCO: Inizializza il video nel momento esatto del click umano
                const video = document.getElementById('video-bigbang');
                if (video) {
                    if (!video.src) video.src = video.getAttribute('data-src');
                    video.volume = 0; // Muto temporaneamente

                    let p = video.play();
                    if (p !== undefined) {
                        p.then(() => {
                            video.pause();
                            video.currentTime = 0;
                        }).catch(e => { console.warn("Trick Autoplay fallito:", e); });
                    }
                }

                if (typeof executeFormattingSequence === 'function') executeFormattingSequence();
            });
        }

        // Inizializza Audio Context (senza suonare ancora)
        if (typeof AudioManager !== 'undefined')
            AudioManager.init();

        // AVVIO PRELOADER CON BARRA PROGRESSO
        preloadAllAssets((percent) => {
            if (loaderStatus) loaderStatus.textContent = `${gameData.texts.ui.loadingAssets} ${percent}%`;
        })
            .then(() => {
                // 4. TUTTO PRONTO
                if (loaderStatus) loaderStatus.textContent = gameData.texts.ui.systemStart;

                setTimeout(() => {
                    const loader = document.getElementById('game-loader');
                    if (loader) {
                        loader.classList.add('hidden');
                        setTimeout(() => loader.remove(), 600);
                    }

                    updateUI();

                    // LOGICA F5 / REFRESH:
                    // Controlliamo se c'è una sessione utente attiva (quindi niente login richiesto)
                    const hasSession = sessionStorage.getItem('espooUser') || (gameState.user.username && gameState.user.username !== 'Giocatore');

                    // Se abbiamo una sessione E il loader è finito, proviamo a suonare.
                    if (hasSession) {
                        window.EspooClicker.tryStartAudio();
                        startGameRoutines();
                        
                        // --- CONTROLLO MODALI DI AVVIO (A CASCATA) ---
                        if (window.triggerV2MigrationModal) {
                            // 1. Mostra il benvenuto V2
                            setTimeout(() => {
                                if (typeof Swal !== 'undefined') {
                                    Swal.fire({
                                        title: '🌌 BENVENUTO NELLA V2.0 🌌',
                                        html: `
                                            <div style="text-align: left; font-family: 'Inter', sans-serif; font-size: 0.95rem; color: #bdc3c7;">
                                                Grazie per aver giocato alla prima versione di <b>Espòòò Clicker</b>!<br><br>
                                                Per introdurre il <b>New Game+</b>, la Sala Arcade e riequilibrare la classifica, abbiamo effettuato un <b>Riallineamento Quantico</b> dei server.<br><br>
                                                <div style="background: rgba(46, 204, 113, 0.1); border-left: 4px solid #2ecc71; padding: 10px; margin-bottom: 10px; border-radius: 4px;">
                                                    <b style="color:#2ecc71;">✓ LE TUE SKIN SONO SALVE</b><br>
                                                    Il tuo guardaroba è intatto.
                                                </div>
                                                <div style="background: rgba(155, 89, 182, 0.1); border-left: 4px solid #9b59b6; padding: 10px; border-radius: 4px;">
                                                    <b style="color:#9b59b6;">✓ BONUS VETERANO</b><br>
                                                    Ti abbiamo accreditato <b>1 Formattazione</b> e <b>1 Q-Bit</b>. Il Quantum Lab è già aperto!
                                                </div>
                                            </div>
                                        `,
                                        icon: 'info',
                                        background: '#151b22',
                                        color: '#fff',
                                        confirmButtonColor: '#9b59b6',
                                        confirmButtonText: '<i class="fa-solid fa-meteor"></i> SCOPRI LE NOVITÀ',
                                        allowOutsideClick: false,
                                        allowEscapeKey: false
                                    }).then(() => {
                                        // 2. Quando chiude il benvenuto, apri le Release Notes
                                        if (window.shouldShowReleaseNotesOnLoad && window.EspooClicker.openReleaseNotes) {
                                            window.EspooClicker.openReleaseNotes();
                                        }
                                    });
                                }
                                // Salva il reset in Cloud
                                if (window.EspooClicker) window.EspooClicker.saveGame();
                            }, 800);
                        } else if (window.shouldShowReleaseNotesOnLoad) {
                            // Mostra solo le RN se non c'è stata la migrazione
                            setTimeout(() => {
                                if (window.EspooClicker.openReleaseNotes) window.EspooClicker.openReleaseNotes();
                            }, 800);
                        }
                    }

                }, 500);
            });

        // Setup Listener Vari
        const now = Date.now();

        if (typeof AudioManager !== 'undefined')
            AudioManager.init();

        const tryStart = () => {
            // 1. CONTROLLO CRITICO: Se non c'è una sessione utente, siamo al Login.
            const hasSession = sessionStorage.getItem('espooUser');

            if (!hasSession) {
                // Utente non loggato -> Silenzio assoluto.
                return;
            }

            // 2. Se l'utente è già loggato (es. F5), proviamo a suonare.
            if (window.EspooClicker && window.EspooClicker.tryStartAudio) {
                window.EspooClicker.tryStartAudio();
            }
        };

        tryStart();

        // Genera l'interfaccia iniziale
        if (typeof refreshAllStores === 'function') refreshAllStores();

        // --- SETUP STANDARD ---
        document.querySelectorAll('audio').forEach(audio => {
            audio.volume = gameState.user.masterVolume;
        });

        document.addEventListener('contextmenu', event => event.preventDefault());
        document.addEventListener('dragstart', event => event.preventDefault());

        document.body.classList.remove('rick-rolling', 'bluescreen-active');
        const gContainer = document.getElementById('game-container');

        if (gContainer) {
            gContainer.style.opacity = '1';
            gContainer.style.transform = 'none';
            gContainer.style.pointerEvents = 'auto';
        }

        isBluescreenActive = false;
        bluescreenMultiplier = 1;
        if (window.hasOwnProperty('currentActiveEvent')) window.currentActiveEvent = null;

        ['rick-roll-video', 'ricardo-video', 'ricardo-metal-video', 'ricardo-dota-video'].forEach(id => {
            const video = document.getElementById(id);

            if (video) {
                video.pause();
                video.classList.add("video_display_none");
                video.currentTime = 0;

                document.getElementById('header-left-panel').classList.add("header_stat_box_display_none");
                document.getElementById('header-right-panel').classList.add("header_stat_box_display_none");
            }
        });

        const soundClick = document.getElementById('sound-click');
        if (soundClick) soundClick.playbackRate = 1;

        let isFuryResumed = false;

        if (gameState.crunchTimeEndTime > 0 && gameState.crunchTimeEndTime > now) {
            crunchTimeEndTime = gameState.crunchTimeEndTime;
            crunchTimeCooldownEnd = gameState.crunchTimeCooldownEnd;

            if (typeof resumeCrunchTimeEffects === 'function') {
                resumeCrunchTimeEffects();
                isFuryResumed = true;
            }
        }

        // Applica la skin normale SOLO se NON abbiamo appena riattivato la Fury
        if (!isFuryResumed && typeof applySkinVisuals === 'function')
            applySkinVisuals(gameState.skins.current);
        else if (isFuryResumed)
            console.log("Fury Mode attiva: skip caricamento skin standard.");

        const globalFilterSelect = document.getElementById('global-filter-select');
        if (globalFilterSelect && !localStorage.getItem('espotoolClickerSaveV8')) {
            globalFilterSelect.value = 'available';
            gameState.filterSettings.globalFilter = 'available';
        }

        if (typeof refreshAllStores === 'function') refreshAllStores();
        updateUI();

        // Setup Moltiplicatori (Automatizzato)
        const multiplierValues = [1, 5, 10, 'MAX'];
        const multiplierBtns = {};

        // Recupera Riferimenti
        multiplierValues.forEach(val => {
            const id = val === 'MAX' ? 'btn-max' : `btn-${val}x`;
            multiplierBtns[val] = document.getElementById(id);
        });

        // Funzione Logica Cambio
        function setBuyMultiplier(value) {
            window.buyMultiplier = value;

            // Aggiorna Grafica Bottoni
            multiplierValues.forEach(val => {
                if (multiplierBtns[val]) {
                    multiplierBtns[val].style.backgroundColor = '';

                    if (val === value)
                        multiplierBtns[val].classList.add('active');
                    else
                        multiplierBtns[val].classList.remove('active');
                }
            });

            refreshAllStores();
            updateUI();
        }

        // Assegna Listener
        multiplierValues.forEach(val => {
            if (multiplierBtns[val]) {
                multiplierBtns[val].addEventListener('click', (e) => {
                    multiplierBtns[val].blur();
                    playSound('sound-click');
                    setBuyMultiplier(val);
                });
            }
        });

        setBuyMultiplier(1);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
                e.preventDefault();
            }
        });

        const muteBtn = document.getElementById('quick-mute-btn');
        if (muteBtn) {
            // Imposta icona iniziale
            muteBtn.innerHTML = gameState.user.masterVolume <= 0 ? '<i class="fa-solid fa-volume-xmark"></i>' : '<i class="fa-solid fa-volume-high"></i>';

            muteBtn.addEventListener('click', () => {
                const currentSkin = gameData.skins[gameState.skins.current] || gameData.skins['default'];

                // Identifica la traccia corretta
                const targetId = (currentSkin.themeConfig && currentSkin.themeConfig.specialMusic)
                    ? currentSkin.themeConfig.specialMusic
                    : (gameState.user.bgMusicSelection || 'sound-bg-music');

                const targetAudio = document.getElementById(targetId);
                const isBlocked = (gameState.user.masterVolume > 0 && targetAudio && targetAudio.paused && !window.currentActiveEvent);

                if (isBlocked) {
                    if (window.EspooClicker && window.EspooClicker.tryStartAudio) window.EspooClicker.tryStartAudio();
                    muteBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
                }
                else {
                    // LOGICA MUTE / UNMUTE CLASSICA
                    if (gameState.user.masterVolume > 0) {
                        // MUTA TUTTO
                        gameState.lastVolume = gameState.user.masterVolume;
                        gameState.user.masterVolume = 0;
                        muteBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
                    }
                    else {
                        // UNMUTE
                        gameState.user.masterVolume = gameState.lastVolume || 1.0;
                        muteBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
                        playSound('sound-click');

                        // Riavvia l'audio se necessario
                        if (window.EspooClicker && window.EspooClicker.tryStartAudio) window.EspooClicker.tryStartAudio();
                    }

                    // Aggiorna Slider nelle impostazioni se aperto
                    const mSlider = document.getElementById('master-slider');
                    const mDisplay = document.getElementById('master-vol-display');

                    if (mSlider) {
                        mSlider.value = gameState.user.masterVolume;
                    }

                    if (mDisplay) {
                        mDisplay.textContent = Math.round(gameState.user.masterVolume * 100);
                    }

                    // Audio Ambiente (Bg music, snow, 8-bit, etc)
                    if (typeof updateAmbientVolume === 'function') updateAmbientVolume();
                    else if (typeof AudioManager !== 'undefined') AudioManager.updateAmbience();

                    // Video Attivi (Rick Roll, Ricardo) - Aggiorna volume
                    ['rick-roll-video', 'ricardo-video', 'ricardo-metal-video', 'ricardo-dota-video'].forEach(id => {
                        const video = document.getElementById(id);
                        if (video && !video.paused && !video.classList.contains("video_display_none")) {
                            const customVol = (typeof getCustomVolume === 'function') ? getCustomVolume(id) : 1.0;
                            video.volume = gameState.user.masterVolume * gameState.user.musicVolume * customVol;

                            document.getElementById('header-left-panel').classList.add("header_stat_box_display_none");
                            document.getElementById('header-right-panel').classList.add("header_stat_box_display_none");
                        }
                    });
                }
            });
        }

        if (clickerButton) {
            clickerButton.addEventListener('mouseup', () => clickerButton.blur());
            clickerButton.addEventListener('mouseleave', () => clickerButton.blur());

            clickerButton.addEventListener('click', (e) => {
                tryStart();
                resolveBug(e);
            });
        }

        if (globalFilterSelect) {
            globalFilterSelect.value = gameState.filterSettings.globalFilter || 'available';
            globalFilterSelect.addEventListener('change', (e) => {
                gameState.filterSettings.globalFilter = e.target.value;
                refreshAllStores();
                saveGame();

                if (window.EspooClicker) window.EspooClicker.playSound('sound-click');
            });
        }

        const mobileBtns = document.querySelectorAll('.mobile-nav-btn');

        // Funzione helper per gestire le classi del body (per il Golden Bug)
        function setMobileViewClass(targetId) {
            document.body.classList.remove('mobile-view-left', 'mobile-view-center', 'mobile-view-right');
            if (targetId === 'center-column') document.body.classList.add('mobile-view-center');
            else if (targetId === 'left-column') document.body.classList.add('mobile-view-left');
            else if (targetId === 'right-column') document.body.classList.add('mobile-view-right');
        }

        // Avvio MOBILE
        if (window.innerWidth <= 1024) {
            // 1. Imposta la classe al body per dire che siamo al centro
            document.body.classList.add('mobile-view-center');

            // 2. Assicurati che tutte le colonne siano nascoste, poi mostra il centro
            document.querySelectorAll('.game-column').forEach(col => col.classList.remove('mobile-active'));
            const centerCol = document.getElementById('center-column');
            if (centerCol) {
                centerCol.classList.add('mobile-active'); // <--- QUESTO FA APPARIRE IL CLICKER
            }

            // 3. Assicura che il bottone in basso "Console" sia acceso
            mobileBtns.forEach(b => b.classList.remove('active'));
            const centerBtn = document.querySelector('.mobile-nav-btn[data-target="center-column"]');
            if (centerBtn) centerBtn.classList.add('active');
        }
        // -------------------------------------------------------------

        mobileBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                mobileBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const targetId = btn.getAttribute('data-target');

                setMobileViewClass(targetId);

                document.querySelectorAll('.game-column').forEach(col => col.classList.remove('mobile-active'));
                const targetCol = document.getElementById(targetId);

                if (targetCol) {
                    targetCol.classList.add('mobile-active');
                }

                if (targetId === 'left-column' && typeof refreshAllStores === 'function') refreshAllStores();

                playSound('sound-click');
            });
        });

        window.addEventListener('resize', () => {
            if (window.innerWidth > 1024) {
                document.querySelectorAll('.game-column').forEach(col => {
                    col.classList.remove('mobile-active');
                    col.style.display = '';
                });
            }
            else if (!document.querySelector('.game-column.mobile-active'))
                document.getElementById('center-column').classList.add('mobile-active');
        });

        const tabs = document.querySelectorAll('.tab-btn');
        const contents = document.querySelectorAll('.tab-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                tabs.forEach(t => t.classList.remove('active'));
                contents.forEach(c => c.style.display = 'none');
                tab.classList.add('active');

                const targetId = tab.getAttribute('data-target');
                document.getElementById(targetId).style.display = 'block';
                tab.classList.remove('notify');

                const filterSelect = document.getElementById('global-filter-select');

                if (filterSelect) {
                    if (tab.id === 'tab-prestige') {
                        if (!filterSelect.disabled)
                            filterSelect.setAttribute('data-prev', filterSelect.value);

                        filterSelect.value = 'all';
                        filterSelect.disabled = true;
                        gameState.filterSettings.globalFilter = 'all';
                    }
                    else {
                        filterSelect.disabled = false;
                        const prev = filterSelect.getAttribute('data-prev');

                        if (prev) {
                            filterSelect.value = prev;
                            gameState.filterSettings.globalFilter = prev;
                            filterSelect.removeAttribute('data-prev');
                        }
                    }

                    refreshAllStores();
                }

                if (e.isTrusted) playSound('sound-click');
            });
        });

        const defaultTab = document.getElementById('tab-click');
        if (defaultTab) defaultTab.click();

        const crunchBtn = document.getElementById('skill-crunchTime');
        if (crunchBtn) {
            crunchBtn.addEventListener('click', (e) => {
                if (e.detail === 0) return;
                crunchBtn.blur();
                activateCrunchTime();
            });
        }

        if (goldenBug) goldenBug.addEventListener('click', (e) => {
            if (e.detail === 0) return;
            clickGoldenBug();
        });

        const cancelPrestigeBtn = document.getElementById('cancel-prestige-btn');
        const prestigeModal = document.getElementById('prestige-modal');

        if (cancelPrestigeBtn && prestigeModal)
            cancelPrestigeBtn.addEventListener('click', () => prestigeModal.style.display = 'none');

        const vDisplay = document.getElementById('version-display');

        if (vDisplay && window.GAME_VERSION) {
            vDisplay.innerHTML = `<i class="fa-solid fa-bullhorn" style="margin-right: 6px;"></i>Novità ${window.GAME_VERSION.toString()}`;
            
            if (window.GAME_VERSION.stage === 'beta') vDisplay.style.color = '#f39c12';
            if (window.GAME_VERSION.stage === 'stable') vDisplay.style.color = '#2ecc71';
            
            // Abilitiamo i click direttamente tramite stile inline
            vDisplay.style.pointerEvents = 'auto';
            vDisplay.style.cursor = 'pointer';
        }
    }

    // --------- API GLOBALE ---------
    window.EspooClicker =
    {
        getGameState: () => gameState,
        saveGame: saveGame,
        showToast: showToast,
        playSound: playSound,
        updateStatsUI: updateStatsUI,
        formatNumber: formatNumber,
        setPassword: (pwd) => { currentUserPassword = pwd; },
        getPassword: () => currentUserPassword,
        setSaveToken: (token) => { currentSaveToken = token; },

        openReleaseNotes: async () => {
        const modal = document.getElementById('release-notes-modal');
        const content = document.getElementById('release-notes-content');
        if (!modal || !content) return;

        // 1. Mostra il modale e avvia l'animazione di entrata (ripristinando l'opacità)
        modal.style.display = 'flex';
        
        const modalContent = modal.querySelector('.modal-content');
        if (typeof gsap !== 'undefined' && modalContent) {
            gsap.fromTo(modalContent,
                { scale: 0.8, opacity: 0, y: 20 },
                { scale: 1, opacity: 1, y: 0, duration: 0.4, ease: "back.out(1.7)" }
            );
            gsap.to(modal, { opacity: 1, duration: 0.3 });
        } else {
            modal.style.opacity = 1;
            if (modalContent) {
                modalContent.style.opacity = 1;
                modalContent.style.transform = 'none';
            }
        }

        document.body.classList.add('modal-open');

        // 2. Carica e formatta il Markdown
        try {
            const response = await fetch('release-notes.md?v=' + Date.now());
            if (!response.ok) throw new Error("File non trovato");
            const mdText = await response.text();

            if (typeof marked !== 'undefined') {
                content.innerHTML = marked.parse(mdText);
            } else {
                content.innerHTML = `<pre style="white-space: pre-wrap;">${mdText}</pre>`;
            }
            
            window.shouldShowReleaseNotesOnLoad = false; 
        } catch (e) {
            content.innerHTML = '<p style="color: #e74c3c; text-align: center;">Impossibile caricare le novità.</p>';
        }
    },
        tryStartAudio: () => {
            // 1. Controllo Sessione
            if (!sessionStorage.getItem('espooUser')) {
                return;
            }

            // 2. Controllo Volume Master
            if (gameState.user.masterVolume <= 0) return;

            if (typeof AudioManager !== 'undefined') {
                AudioManager.updateAmbience();
            }
        },

        setMasterVolume: (volume) => {
            gameState.user.masterVolume = parseFloat(volume);
            document.querySelectorAll('audio').forEach(audio => {
                if (audio.id === 'sound-snowball')
                    audio.volume = (gameState.user.masterVolume * gameState.user.musicVolume) * 1.5;
                else
                    audio.volume = gameState.user.masterVolume;
            });
        },
        startGameRoutines: startGameRoutines,
        executePrestige: executePrestige,


        loadCloudData: (cloudJSON) => {
            if (cloudJSON) {
                try {
                    // 1. Parsing e Decompressione Preliminare
                    let cloudDataRaw = JSON.parse(cloudJSON);
                    let cloudState;

                    if (typeof cloudDataRaw === 'string') {
                        const decompressed = LZString.decompressFromUTF16(cloudDataRaw);
                        if (decompressed) {
                            cloudState = JSON.parse(decompressed);
                            console.log("☁️ Cloud: Salvataggio compresso caricato.");
                        } else {
                            cloudState = JSON.parse(cloudDataRaw);
                        }
                    } else {
                        cloudState = cloudDataRaw;
                        console.log("☁️ Cloud: Salvataggio legacy rilevato.");
                    }

                    // --- 2. PROTEZIONE ANTI-ROLLBACK ---
                    if (gameState && gameState.lifetimeScore) {
                        const localScore = new Decimal(gameState.lifetimeScore);
                        const cloudTotal = new Decimal(cloudState.lifetimeScore || 0);

                        if (localScore.gte(cloudTotal)) {
                            console.warn("⚠️ Cloud Save obsoleto rilevato. Mantengo i dati locali più recenti.");

                            const currentSessionUser = sessionStorage.getItem('espooUser');
                            if (currentSessionUser && gameState.user.username !== currentSessionUser) {
                                gameState.user.username = currentSessionUser;
                            }

                            saveGame();
                            updateUI();
                            return;
                        }
                    }

                    // 3. Reset preventivo della memoria per partire puliti (Solo se carichiamo davvero dal cloud)
                    if (typeof resetGameToDefault === 'function') resetGameToDefault();

                    // Pulizia grafica liste
                    const achList = document.getElementById('achievement-list');
                    if (achList) achList.innerHTML = '';

                    // --- 4. CONTROLLO COMPATIBILITÀ CLOUD ---
                    if (!checkSaveCompatibility(cloudState)) {
                        console.warn("⚠️ Cloud Save incompatibile: Eseguo migrazione e sovrascrittura.");

                        // Sincronizziamo i punteggi dal Cloud AL Locale PRIMA di salvare.
                        // Questo serve a passare il controllo "Anti-Rollback" del file PHP.
                        if (cloudState.score) gameState.score = new Decimal(cloudState.score);
                        if (cloudState.totalScore) gameState.totalScore = new Decimal(cloudState.totalScore);
                        if (cloudState.lifetimeScore) gameState.lifetimeScore = new Decimal(cloudState.lifetimeScore);
                        if (cloudState.prestigePoints) gameState.prestigePoints = new Decimal(cloudState.prestigePoints);
                        if (cloudState.totalResets) gameState.totalResets = cloudState.totalResets;

                        // Aggiorniamo la versione alla corrente
                        if (window.GAME_VERSION) {
                            gameState.version = JSON.parse(JSON.stringify(window.GAME_VERSION));
                        }

                        // Username Sessione (lo manteniamo)
                        const currentSessionUser = sessionStorage.getItem('espooUser');
                        if (currentSessionUser) gameState.user.username = currentSessionUser;

                        // SALVIAMO SUBITO per aggiornare il Database con la versione corretta
                        saveGame();

                        showToast("Salvataggio Cloud aggiornato alla nuova versione!", 'warning');
                        return;
                    }

                    // Compatibilità Legacy (per versioni minori compatibili)
                    if (cloudState.buildings && !cloudState.teams) {
                        cloudState.teams = cloudState.buildings;
                        delete cloudState.buildings;
                    }

                    // 5. Uniamo i dati (Merge)
                    deepMerge(gameState, cloudState);

                    // 6. Ripristino oggetti Decimali
                    const decimalFields = [
                        'score', 'totalScore', 'lifetimeScore', 'totalOfflineScore',
                        'prestigePoints', 'lifetimePrestigePoints', 'baseClickValue',
                        'qBits', 'lifetimeQBits'
                    ];
                    decimalFields.forEach(field => {
                        gameState[field] = new Decimal(gameState[field] || 0);
                    });
                    if (gameState.baseClickValue.eq(0)) gameState.baseClickValue = new Decimal(1);

                    // Inizializza strutture mancanti
                    if (!gameState.buildingEnhancements) gameState.buildingEnhancements = {};
                    for (const key in gameData.buildingEnhancements) {
                        if (!gameState.buildingEnhancements[key]) {
                            gameState.buildingEnhancements[key] = { purchased: false };
                        }
                    }

                    if (!gameState.skins || !Array.isArray(gameState.skins.unlocked))
                        gameState.skins = { current: 'default', unlocked: ['default'] };

                    // Ripristino effetti attivi
                    const isFuryActive = (gameState.crunchTimeEndTime > Date.now());
                    if (isFuryActive && typeof resumeCrunchTimeEffects === 'function') {
                        resumeCrunchTimeEffects();
                    } else {
                        if (typeof applySkinVisuals === 'function')
                            applySkinVisuals(gameState.skins.current);
                    }

                    // Username Sessione
                    const currentSessionUser = sessionStorage.getItem('espooUser');
                    if (currentSessionUser && gameState.user.username !== currentSessionUser)
                        gameState.user.username = currentSessionUser;

                    // Ricalcoli logica
                    calculatePrestigeBonus();
                    recalculateCPS();

                    if (typeof refreshAllStores === 'function') refreshAllStores();
                    if (typeof updateAchievementsUI === 'function') updateAchievementsUI();
                    if (typeof updateUI === 'function') updateUI();

                    // Sovrascrivi cache locale per allinearla al cloud caricato
                    localStorage.setItem('espotoolClickerSaveV8', JSON.stringify(gameState));

                    // Recupero Skin mancanti da achievement (Fix retroattivo)
                    for (const key in gameData.achievements) {
                        const achData = gameData.achievements[key];
                        const achState = gameState.achievements[key];
                        if (achState && achState.claimed && achData.reward && achData.reward.type === 'skin') {
                            const skinId = achData.reward.id;
                            if (gameState.skins.unlocked && !gameState.skins.unlocked.includes(skinId)) {
                                gameState.skins.unlocked.push(skinId);
                            }
                        }
                    }

                    checkOfflineProgress();
                    if (typeof updateAmbientVolume === 'function') updateAmbientVolume();

                    showToast(gameData.texts.toasts.cloudSync);
                    setTimeout(() => {
                        if (typeof AudioManager !== 'undefined') AudioManager.init();
                        window.EspooClicker.tryStartAudio();
                    }, 500);

                } catch (e) {
                    console.error("Errore parsing cloud", e);
                }
            }
        },
    };

    let originalTitle = document.title;
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) document.title = '🐞 I bug si accumulano...';
        else document.title = originalTitle;

        if (document.visibilityState === 'visible') {
            lastFrameTime = Date.now(); // Resetta il timer per evitare salti
            checkOfflineProgress();       // Controlla se mostrare il modale offline
        }
    });

    initializeGame();
    document.dispatchEvent(new Event('EspoGameReady'));
    console.log("✅ Evento EspoGameReady inviato.");
});