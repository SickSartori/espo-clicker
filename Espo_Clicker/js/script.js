// --------- RIFERIMENTI HTML (Globali) ---------
let clickerButton, scoreDisplay, cpsDisplay, feedbackContainer, achievementList;
let toastContainer, goldenBug, soundBluescreen, prestigeSection, prestigePointsDisplay;
let prestigeGainDisplay, prestigeBonusDisplay, eventMultiplierDisplay;
let enhancementStoreSection, enhancementList, clickUpgradeList, leftColumn, rightColumn;
let statsList, gameContainer, prestigeStore;
let buyMultiplier = 1;
let currentUserPassword = null;

const CLIENT_SECRET_KEY = 'EspoClicker_Secret_X7k9P2mN5qR8vW1zY4cB6dE0fG3hJ';

async function generateHash(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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
        if (gameState.user.username && currentUserPassword) {
            try {
                let rawScore = new Decimal(gameState.lifetimeScore);
                if (rawScore.lt(0)) rawScore = new Decimal(0);
                let scoreToSend = rawScore.toFixed(0);
                const prestigeToSend = Math.floor(gameState.totalResets || 0);

                // Genera la firma
                const dataString = `${scoreToSend}-${prestigeToSend}-${CLIENT_SECRET_KEY}`;
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
                        hash: signature // Invio hash
                    })
                })
                    .then((response) => { console.log(response.json()); })
                    .catch(err => console.warn("Cloud save error:", err));
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
            if (gameState.prestigeUpgrades && gameState.prestigeUpgrades.serverAlwaysOn)
                efficiency += (gameState.prestigeUpgrades.serverAlwaysOn.count * 0.10);

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
    function checkSaveCompatibility(savedData) {
        if (!window.GAME_VERSION) return true; // Dev safety

        // Salvataggi vecchi (senza versione) -> Incompatibili
        if (!savedData || !savedData.version) {
            console.warn("Salvataggio Legacy: Reset richiesto.");
            return false;
        }

        const current = window.GAME_VERSION;
        const saved = savedData.version;

        // Controllo STAGE (Non mischiare Beta con Stable)
        if (saved.stage !== current.stage) {
            console.warn(`Mismatch Stage: Salvataggio ${saved.stage} vs Gioco ${current.stage}`);
            return false;
        }

        // Regola STABLE: Sempre compatibile in avanti
        if (current.stage === 'stable')
            // Se siamo in stable, accettiamo anche major diverse (es. Save 1.0 su Gioco 2.0)
            return true;

        // Regola BETA/ALPHA: Rottura su cambio Major
        // Se siamo in beta, la versione Major deve coincidere.
        if (saved.major !== current.major) {
            console.warn(`Mismatch Major (Beta): v${saved.major} non compatibile con v${current.major}`);
            return false;
        }

        return true; // Tutto ok (es. 3.0 -> 3.1)
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
                        // console.log("💾 Salvataggio legacy (non compresso) caricato.");
                    }
                    catch (e) {
                        throw new Error("Impossibile parsare il salvataggio.");
                    }
                }

                // --- CONTROLLO COMPATIBILITÀ VERSIONE ---
                if (!checkSaveCompatibility(parsedState)) {
                    console.log("Versione incompatibile. Reset automatico prevenuto.");

                    setTimeout(() => {
                        if (window.EspooClicker) window.EspooClicker.showToast(gameData.texts.toasts.versionMismatch, 'warning');
                    }, 500);

                }

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
                    'baseClickValue'
                ];

                decimalFields.forEach(field => {
                    // Se esiste nel salvataggio lo convertiamo, altrimenti mettiamo 0
                    gameState[field] = new Decimal(gameState[field] || 0);
                });

                if (gameState.baseClickValue.eq(0)) gameState.baseClickValue = new Decimal(1);

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
        const deltaTime = (now - lastFrameTime) / 1000;
        lastFrameTime = now;

        if (deltaTime > 86400) return; // Fix per tab in background da molto tempo

        // Calcolo Score (Veloce - Ogni frame)
        // Usiamo .mul() per moltiplicare e .add() per sommare
        // bps è un Decimal, deltaTime è un Number (float). .mul accetta numeri.
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
                crunchTimeMultiplier = new Decimal(1); // FIX: Reimposta come Decimal
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
        gameLoopInterval = setInterval(gameLoop, 33);

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
        window.addEventListener('beforeunload', () => { saveGame(); });
        console.log("Cicli di gioco avviati correttamente.");
    }

    // Funzione universale per precaricare TUTTO (Immagini, Audio, Video)
    function preloadAllAssets(onProgress) {
        const promises = [];
        let totalAssets = 0;
        let loadedAssets = 0;

        // Helper per aggiornare la percentuale
        const updateProgress = () => {
            loadedAssets++;

            if (onProgress) {
                const percent = Math.floor((loadedAssets / totalAssets) * 100);
                onProgress(percent);
            }
        };

        // LISTA IMMAGINI CRITICHE (Manuale)
        const imagesToLoad = [
            './assets/image/espo.webp',
            './assets/image/espo-click.webp',
            './assets/image/favicon.webp',
            './assets/image/espo-fury.webp',
            './assets/image/espo-fury-click.webp',
            './assets/image/bluescreen.webp',
            './assets/image/hidden.webp',
            './assets/image/espo-matrix.webp',
            './assets/image/espo-matrix-click.webp',
        ];

        // Aggiungiamo le immagini alla lista
        totalAssets += imagesToLoad.length;
        imagesToLoad.forEach(src => {
            promises.push(
                new Promise((resolve) => {
                    const img = new Image();
                    img.src = src;
                    img.onload = () => { updateProgress(); resolve(); };
                    img.onerror = () => { console.warn("Img missing:", src); updateProgress(); resolve(); };
                })
            );
        });

        // AUDIO (Automatico da gameData)
        if (gameData.assets && gameData.assets.sounds) {
            const soundKeys = Object.keys(gameData.assets.sounds);
            totalAssets += soundKeys.length;

            soundKeys.forEach(key => {
                const item = gameData.assets.sounds[key];
                const url = `./assets/sounds/${item.file}`;

                // Usiamo fetch per forzare il download in cache
                promises.push(
                    fetch(url)
                        .then(() => updateProgress())
                        .catch(() => { console.warn("Audio missing:", url); updateProgress(); })
                );
            });
        }

        // VIDEO (Automatico da gameData)
        if (gameData.assets && gameData.assets.videos) {
            const videoKeys = Object.keys(gameData.assets.videos);
            totalAssets += videoKeys.length;

            videoKeys.forEach(key => {
                const item = gameData.assets.videos[key];
                const url = `./assets/video/${item.file}`; // Nota: cartella 'video' singolare

                promises.push(
                    fetch(url)
                        .then(() => updateProgress())
                        .catch(() => { console.warn("Video missing:", url); updateProgress(); })
                );
            });
        }

        // Se non c'è nulla da caricare, risolvi subito
        if (totalAssets === 0) return Promise.resolve();
        return Promise.all(promises);
    }

    function initializeGame() {
        const loaderStatus = document.getElementById('loader-status-text');

        // Setup Iniziale
        if (loaderStatus) loaderStatus.textContent = gameData.texts.ui.loadingData;
        loadGame(); // Carica salvataggi

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
                    }

                }, 500);
            });

        // Setup Listener Vari
        const now = Date.now();

        if (typeof AudioManager !== 'undefined')
            AudioManager.init();

        const bgMusic = document.getElementById('sound-bg-music');
        const snowAudio = document.getElementById('sound-snowball');
        const masterVol = gameState.user.masterVolume;
        const musicVol = gameState.user.musicVolume;

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
            buyMultiplier = value;

            // Aggiorna Grafica Bottoni
            multiplierValues.forEach(val => {
                if (multiplierBtns[val]) {
                    // Rimuovi colore inline per far lavorare il CSS
                    multiplierBtns[val].style.backgroundColor = '';

                    if (val === value)
                        multiplierBtns[val].classList.add('active'); // Usa classe CSS
                    else
                        multiplierBtns[val].classList.remove('active');
                }
            });

            playSound('sound-click');
            refreshAllStores();
            updateUI();
        }

        // Assegna Listener
        multiplierValues.forEach(val => {
            if (multiplierBtns[val]) {
                multiplierBtns[val].addEventListener('click', (e) => {
                    // Ignora click simulati strani
                    if (e.detail !== 0) {
                        multiplierBtns[val].blur();
                        setBuyMultiplier(val);
                    }
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
                const targetId = (currentSkin.themeConfig && currentSkin.themeConfig.specialMusic)
                    ? currentSkin.themeConfig.specialMusic
                    : 'sound-bg-music';

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
                    if (mSlider) mSlider.value = gameState.user.masterVolume;

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
        if (window.innerWidth <= 1024) {
            document.querySelectorAll('.game-column').forEach(col => col.classList.remove('mobile-active'));
            const center = document.getElementById('center-column');

            if (center) center.classList.add('mobile-active');
        }

        mobileBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                mobileBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const targetId = btn.getAttribute('data-target');
                document.querySelectorAll('.game-column').forEach(col => col.classList.remove('mobile-active'));
                const targetCol = document.getElementById(targetId);

                if (targetCol) {
                    targetCol.classList.add('mobile-active');
                    if (targetId === 'left-column' && typeof refreshAllStores === 'function') refreshAllStores();
                }

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
                        if (!filterSelect.disabled) filterSelect.setAttribute('data-prev', filterSelect.value);

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
            vDisplay.textContent = window.GAME_VERSION.toString();
            if (window.GAME_VERSION.stage === 'beta') vDisplay.style.color = '#f39c12';
            if (window.GAME_VERSION.stage === 'stable') vDisplay.style.color = '#2ecc71';
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

        tryStartAudio: () => {
            const loginModal = document.getElementById('login-modal');
            if (loginModal && getComputedStyle(loginModal).display !== 'none') {
                return;
            }

            // Controlli preliminari (Volume)
            const masterVol = gameState.user.masterVolume;
            const musicVol = gameState.user.musicVolume;
            if (masterVol <= 0 || musicVol <= 0) return;

            // Identifica la traccia corretta
            const currentSkin = gameData.skins[gameState.skins.current] || gameData.skins['default'];
            const targetId = (currentSkin.themeConfig && currentSkin.themeConfig.specialMusic)
                ? currentSkin.themeConfig.specialMusic
                : 'sound-bg-music';

            const audioToPlay = document.getElementById(targetId);

            if (window.currentActiveEvent || document.body.classList.contains('rick-rolling')) {
                return;
            }

            // Controlla se possiamo suonare
            if (!audioToPlay || !audioToPlay.paused) return;

            if (typeof AudioManager !== 'undefined' && AudioManager.updateAmbience)
                AudioManager.updateAmbience();

            // Tenta il Play
            const playPromise = audioToPlay.play();

            if (playPromise !== undefined) {
                playPromise.catch(() => {
                    console.log("Autoplay bloccato: Attendo interazione...");

                    const unlockAudio = () => {
                        if (window.currentActiveEvent || document.body.classList.contains('rick-rolling')) {
                            return;
                        }

                        audioToPlay.play().then(() => {
                            document.removeEventListener('click', unlockAudio);
                            document.removeEventListener('keydown', unlockAudio);
                            document.removeEventListener('touchstart', unlockAudio);
                        }).catch(e => { });
                    };

                    document.addEventListener('click', unlockAudio, { once: true });
                    document.addEventListener('keydown', unlockAudio, { once: true });
                    document.addEventListener('touchstart', unlockAudio, { once: true });
                });
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

        loadCheatboard: () => {
            if (document.querySelector('script[src="js/cheatboard.js"]')) return;


        },

        loadCloudData: (cloudJSON) => {
            if (cloudJSON) {
                try {
                    // Reset dello stato in memoria
                    if (typeof resetGameToDefault === 'function') resetGameToDefault();

                    // Pulizia grafica
                    const achList = document.getElementById('achievement-list');
                    if (achList) achList.innerHTML = '';

                    // Parsing e Decompressione
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

                    // Compatibilità Legacy
                    if (cloudState.buildings && !cloudState.teams) {
                        cloudState.teams = cloudState.buildings;
                        delete cloudState.buildings;
                    }

                    // Merge dei dati grezzi
                    deepMerge(gameState, cloudState);

                    const decimalFields = [
                        'score', 'totalScore', 'lifetimeScore', 'totalOfflineScore',
                        'prestigePoints', 'lifetimePrestigePoints', 'baseClickValue'
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

                    // Ripristino effetti
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

                    // Ricalcoli (Ora funzioneranno perché i Decimal sono ripristinati)
                    calculatePrestigeBonus();
                    recalculateCPS();

                    if (typeof refreshAllStores === 'function') refreshAllStores();
                    if (typeof updateAchievementsUI === 'function') updateAchievementsUI();
                    if (typeof updateUI === 'function') updateUI();

                    // Sovrascrivi cache locale per allinearla
                    localStorage.setItem('espotoolClickerSaveV8', JSON.stringify(gameState));

                    // Recupero Skin mancanti da achievement
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
        }
    };


    initializeGame();
});