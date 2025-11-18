// --------- 2. RIFERIMENTI AGLI ELEMENTI HTML (DICHIARATI GLOBALMENTE) ---------
// Li dichiariamo qui con 'let' in modo che siano accessibili
// da tutti i file (ui-functions.js, game-logic.js, ecc.)

let clickerButton, scoreDisplay, cpsDisplay, feedbackContainer, achievementList;
let toastContainer, goldenBug, soundBluescreen, prestigeSection, prestigePointsDisplay;
let prestigeGainDisplay, prestigeBtn, prestigeBonusDisplay, eventMultiplierDisplay;
let enhancementStoreSection, enhancementList, clickUpgradeList, leftColumn, rightColumn;
let statsList, gameContainer, prestigeStore;


// Aggiunge un listener per assicurarsi che l'HTML sia caricato prima di eseguire lo script
document.addEventListener('DOMContentLoaded', () => {

    // --------- 2. RIFERIMENTI AGLI ELEMENTI HTML (ASSEGNATI ORA) ---------
    // Ora che il DOM è pronto, assegniamo le variabili
    
    clickerButton = document.getElementById('clicker-btn');
    scoreDisplay = document.getElementById('score-display');
    cpsDisplay = document.getElementById('cps-display');
    feedbackContainer = document.getElementById('click-feedback-container');
    achievementList = document.getElementById('achievement-list');
    toastContainer = document.getElementById('toast-container');
    goldenBug = document.getElementById('golden-bug');
    soundBluescreen = document.getElementById('sound-bluescreen');
    
    // Riferimenti Prestigio
    prestigeSection = document.getElementById('prestige-section');
    prestigePointsDisplay = document.getElementById('prestige-points-display');
    prestigeGainDisplay = document.getElementById('prestige-gain-display');
    prestigeBtn = document.getElementById('prestige-btn');
    prestigeBonusDisplay = document.getElementById('prestige-bonus-display');
    eventMultiplierDisplay = document.getElementById('event-multiplier-display');
    prestigeStore = document.getElementById('prestige-store'); // VARIABILE MANCANTE AGGIUNTA
    
    // Riferimenti Negozi
    enhancementStoreSection = document.getElementById('enhancement-store');
    enhancementList = document.getElementById('enhancement-list');
    clickUpgradeList = document.getElementById('click-upgrade-list');
    
    // Riferimenti Colonne Principali
    leftColumn = document.getElementById('left-column');
    rightColumn = document.getElementById('right-column');
    statsList = document.getElementById('stats-list'); 
    gameContainer = document.getElementById('game-container'); // VARIABILE MANCANTE AGGIUNTA

    // --------- 9. SALVATAGGIO E CARICAMENTO ---------
    
    const SAVE_KEY = 'espotoolClickerSaveV8'; 

    function saveGame() {
        gameState.lastSaveTimestamp = Date.now();
        localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
    }
    
    function loadGame() {
        const savedState = localStorage.getItem(SAVE_KEY);
        
        if (savedState) {
            try {
                const parsedState = JSON.parse(savedState);
                deepMerge(gameState, parsedState);
                
            } catch (e) {
                console.error("Errore nel caricamento del salvataggio:", e);
            }
        }
        
        // Carica il nome utente salvato separatamente
        const savedUsername = localStorage.getItem('espooClickerUsername');
        if (savedUsername) {
            gameState.user.username = savedUsername;
        }
        
        calculatePrestigeBonus();
        calculateClickCPSBonus();
        recalculateCPS();
        
        // --- NUOVO: CALCOLO PROGRESSO OFFLINE ---
        if (gameState.lastSaveTimestamp) {
            const now = Date.now();
            // Calcola secondi passati (divisione per 1000)
            const diffSeconds = Math.floor((now - gameState.lastSaveTimestamp) / 1000);

            // Limite massimo offline (es. 8 ore = 28800 secondi)
            const maxOfflineSeconds = 28800; 
            const effectiveSeconds = Math.min(diffSeconds, maxOfflineSeconds);

            // Attiva solo se offline per almeno 10 secondi
            if (effectiveSeconds > 10) { 
                // cookiesPerSecond è già stato ricalcolato sopra
                const earned = effectiveSeconds * cookiesPerSecond;

                if (earned > 0) {
                    gameState.score += earned;
                    gameState.totalScore += earned;
                    gameState.lifetimeScore += earned;
                    
                    // Mostra notifica dopo un secondo (per dare tempo alla UI di caricarsi)
                    setTimeout(() => {
                         if(window.EspooClicker && window.EspooClicker.showToast) {
                             window.EspooClicker.showToast(`Bentornato! Hai guadagnato ${formatNumber(earned)} bug mentre dormivi.`);
                         }
                    }, 1000);
                }
            }
        }
        // ----------------------------------------
        
        if (gameState.clickUpgrades.hacking.purchased) {
            goldenBugChance *= 2;
        }
        if (gameState.prestigeUpgrades.ticketPremium.purchased) {
            goldenBugSpawnTime *= 0.5;
        }
        
        for (const key in gameState.achievements) {
            if (gameState.achievements[key].unlocked) {
                renderAchievement(key);
            }
        }
    }
    
    function deepMerge(target, source) {
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (source[key] instanceof Object && !Array.isArray(source[key]) && target[key]) {
                    deepMerge(target[key], source[key]);
                } else if (target.hasOwnProperty(key)) {
                    target[key] = source[key];
                }
            }
        }
    }


    // --------- 11. INIZIALIZZAZIONE ---------

    function startGameRoutines() {
        // Imposta il volume iniziale
        document.querySelectorAll('audio').forEach(audio => {
            audio.volume = gameState.user.masterVolume;
        });
        
        // Loop di gioco (10 volte al secondo)
        setInterval(gameLoop, 100);
        // Loop di salvataggio (ogni 5 secondi)
        setInterval(saveGame, 5000);
        
        // Loop di invio punteggio (ogni 30 secondi)
        setInterval(() => {
            submitScoreToLeaderboard(gameState.user.username, gameState.score, gameState.prestigePoints);
        }, 30000); // 30000 ms = 30 secondi

        // Avvio spawn "Ticket Critico"
        scheduleGoldenBug();
    }
    
    function initializeGame() {
        buildStores(); 
        loadGame();
        refreshAllStores();
        updateUI(); 
        
        // Listener Principali
        clickerButton.addEventListener('click', clickCookie);
        goldenBug.addEventListener('click', clickGoldenBug);
        prestigeBtn.addEventListener('click', performPrestige);
        
        // Delegazione eventi per le COLONNE NEGOZIO
        leftColumn.addEventListener('click', (e) => {
            const btn = e.target.closest('button.buy-btn');
            if (!btn) return;
            e.stopPropagation();

            if (btn.classList.contains('buy-click-btn')) {
                buyClickUpgrade(btn.dataset.upgradeName);
            }
            else if (btn.classList.contains('enhancement-btn')) {
                buyBuildingEnhancement(btn.dataset.upgradeName);
            }
        });
        
        rightColumn.addEventListener('click', (e) => {
            const btn = e.target.closest('button.buy-btn');
            if (!btn) return;
            e.stopPropagation();

            if (btn.classList.contains('buy-building-btn')) {
                buyBuilding(btn.dataset.upgradeName);
            }
            else if (btn.classList.contains('prestige-btn')) {
                buyPrestigeUpgrade(btn.dataset.upgradeName);
            }
        });

        // La logica di Login è ora in modals.js e aspetta che
        // l'oggetto EspooClicker sia definito qui sotto.
    }

    // ESPONE LE FUNZIONI NECESSARIE AI MODALI (per podio.js e modals.js)
    window.EspooClicker = {
        getGameState: () => gameState,
        saveGame: saveGame,
        showToast: showToast,
        playSound: playSound,
        updateStatsUI: updateStatsUI,
        formatNumber: formatNumber, 
        setMasterVolume: (volume) => {
            gameState.user.masterVolume = parseFloat(volume);
            document.querySelectorAll('audio').forEach(audio => {
                audio.volume = gameState.user.masterVolume;
            });
        },
        startGameRoutines: startGameRoutines
    };

    // Avvia il gioco!
    initializeGame();

}); // Fine del listener DOMContentLoaded