// --------- 2. RIFERIMENTI HTML (Globali) ---------
let clickerButton, scoreDisplay, cpsDisplay, feedbackContainer, achievementList;
let toastContainer, goldenBug, soundBluescreen, prestigeSection, prestigePointsDisplay;
let prestigeGainDisplay, prestigeBtn, prestigeBonusDisplay, eventMultiplierDisplay;
let enhancementStoreSection, enhancementList, clickUpgradeList, leftColumn, rightColumn;
let statsList, gameContainer, prestigeStore;
let buyMultiplier = 1;
let currentUserPassword = null;


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
    prestigeBtn = document.getElementById('prestige-btn');
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

    // --------- 9. SALVATAGGIO ---------
    const SAVE_KEY = 'espotoolClickerSaveV8'; 

    async function saveGame() {
        gameState.lastSaveTimestamp = Date.now();
        localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
        
        if (gameState.user.username && currentUserPassword) {
            try {
                await fetch('./php/save_progress.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: gameState.user.username,
                        password: currentUserPassword,
                        saveData: gameState 
                    })
                });
            } catch (e) { console.error("Errore salvataggio cloud:", e); }
        }
    }
    
    function loadGame() {
        const savedState = localStorage.getItem(SAVE_KEY);
        if (savedState) {
            try {
                deepMerge(gameState, JSON.parse(savedState));
                if (gameState.lifetimePrestigePoints === undefined || gameState.lifetimePrestigePoints === null) {
                    gameState.lifetimePrestigePoints = gameState.prestigePoints;
                }
                if (!gameState.filterSettings) {
                    gameState.filterSettings = { 
                        click: 'available', 
                        auto: 'available', 
                        lab: 'available' 
                    };
                }
            } catch (e) { console.error("Errore loadGame:", e); }
        }
        
        const savedUsername = localStorage.getItem('espooClickerUsername');
        if (savedUsername) gameState.user.username = savedUsername;
        
        calculatePrestigeBonus();
        calculateClickCPSBonus();
        recalculateCPS();
        
        if (gameState.lastSaveTimestamp) {
            const now = Date.now();
            const diffSeconds = Math.floor((now - gameState.lastSaveTimestamp) / 1000);
            const maxOfflineSeconds = 28800; 
            const effectiveSeconds = Math.min(diffSeconds, maxOfflineSeconds);

            if (effectiveSeconds > 10) { 
                const earned = effectiveSeconds * cookiesPerSecond;
                if (earned > 0) {
                    gameState.score += earned;
                    gameState.totalScore += earned;
                    gameState.lifetimeScore += earned;
                    setTimeout(() => {
                         if(window.EspooClicker && window.EspooClicker.showToast) {
                             window.EspooClicker.showToast(`Bentornato! Hai guadagnato ${formatNumber(earned)} bug mentre dormivi.`);
                         }
                    }, 1000);
                }
            }
        }
        
        if (gameState.clickUpgrades.hacking.purchased) goldenBugChance *= 2;
        if (gameState.prestigeUpgrades.ticketPremium.purchased) goldenBugSpawnTime *= 0.5;
        
        for (const key in gameState.achievements) {
            if (gameState.achievements[key].unlocked) renderAchievement(key);
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

    // --------- LOOP DI GIOCO CORRETTO ---------
    function gameLoop() {
        // FIX VELOCITÀ: Dividiamo per 30 (FPS) invece di 10
        const scoreToAdd = cookiesPerSecond / 30; 
        
        gameState.score += scoreToAdd;
        gameState.totalScore += scoreToAdd;
        gameState.lifetimeScore += scoreToAdd;
        
        const now = Date.now();
        clickHistory = clickHistory.filter(click => now - click.time < 1000);
        
        checkAchievements();
        updateUI();
        
        // --- FIX STATISTICHE LIVE ---
        const statsModal = document.getElementById('stats-modal');
        if (statsModal && statsModal.style.display === 'flex') {
            if (typeof updateStatsUI === 'function') {
                updateStatsUI();
            }
        }
    }

    // --------- 11. INIZIALIZZAZIONE ---------
    function startGameRoutines() {
        document.querySelectorAll('audio').forEach(audio => {
            audio.volume = gameState.user.masterVolume;
        });
        
        setInterval(gameLoop, 33); // 30 FPS circa
        setInterval(saveGame, 5000);
        
        setInterval(() => {
            submitScoreToLeaderboard(gameState.user.username, gameState.lifetimeScore, gameState.totalResets);
        }, 30000); 

        scheduleGoldenBug();
    }
    
    function initializeGame() {
        buildStores(); 
        loadGame();
        if (typeof refreshAllStores === 'function') refreshAllStores(); 
        updateUI(); 
        
        const btn1x = document.getElementById('btn-1x');
        const btn10x = document.getElementById('btn-10x');
        const toggleBtn = document.getElementById('toggle-purchased-btn');
        const crunchBtn = document.getElementById('skill-crunchTime');

        const tabs = document.querySelectorAll('.tab-btn');
        const contents = document.querySelectorAll('.tab-content');

        const filterButtons = document.querySelectorAll('.filter-btn');

        const filterMap = {
            'filter-btn-click': 'click',
            'filter-btn-auto': 'auto',
            'filter-btn-lab': 'lab'
        };

        filterButtons.forEach(btn => {
            const filterKey = filterMap[btn.id];
            const savedState = gameState.filterSettings[filterKey]; // 'all' o 'available'
            const listId = btn.getAttribute('data-list');
            const list = document.getElementById(listId);
            const btnIcon = btn.querySelector('.icon');
            const btnText = btn.querySelector('.text');

            if (!list) return;

            // Applica lo stato salvato (o il default del game-data)
            if (savedState === 'available') {
                list.classList.add('hide-purchased-items');
                btn.classList.add('active');
                btnIcon.textContent = '🛒';
                btnText.textContent = "Disponibili";
            } else {
                list.classList.remove('hide-purchased-items');
                btn.classList.remove('active');
                btnIcon.textContent = '👁️';
                btnText.textContent = "Tutti";
            }
            
            // 2. LISTENER CLICK (Aggiorna stato e salva)
            btn.addEventListener('click', () => {
                // Toggle classe
                list.classList.toggle('hide-purchased-items');
                
                // Leggi nuovo stato
                const isHidden = list.classList.contains('hide-purchased-items');
                
                // Aggiorna Grafica
                if (isHidden) {
                    btn.classList.add('active');
                    btnIcon.textContent = '🛒';
                    btnText.textContent = "Disponibili";
                    gameState.filterSettings[filterKey] = 'available'; // Salva stato
                } else {
                    btn.classList.remove('active');
                    btnIcon.textContent = '👁️';
                    btnText.textContent = "Tutti";
                    gameState.filterSettings[filterKey] = 'all'; // Salva stato
                }
                
                // Aggiorna liste e salva su disco
                refreshAllStores(); 
                saveGame(); // Importante per persistere subito la modifica

                if (window.EspooClicker && window.EspooClicker.playSound) {
                    window.EspooClicker.playSound('sound-click');
                }
            });
        });

        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => { // <--- Aggiungi (e) qui per catturare l'evento
                // 1. Rimuovi active da tutti
                tabs.forEach(t => t.classList.remove('active'));
                contents.forEach(c => c.style.display = 'none');
                
                // 2. Attiva corrente
                tab.classList.add('active');
                const targetId = tab.getAttribute('data-target');
                document.getElementById(targetId).style.display = 'block';
                
                // 3. Rimuovi notifica
                tab.classList.remove('notify');
                
                // FIX AUDIO: Suona solo se l'evento è "fidato" (cioè un vero click dell'utente)
                if (e.isTrusted) { 
                    playSound('sound-click');
                }
            });
        });
        
        // Questo click automatico ora non genererà l'errore audio
        const defaultTab = document.getElementById('tab-click');
        if(defaultTab) defaultTab.click();

        if (crunchBtn) {
            crunchBtn.addEventListener('click', (e) => {
                if(e.detail === 0) return; // Evita doppio click tastiera
                crunchBtn.blur();
                activateCrunchTime();
            });
        }


        if(btn1x) btn1x.addEventListener('click', (e) => {
            if (e.detail === 0) return; btn1x.blur();
            buyMultiplier = 1;
            btn1x.style.backgroundColor = '#27ae60'; btn10x.style.backgroundColor = '#34495e'; 
            playSound('sound-click'); refreshAllStores(); updateUI();
        });

        if(btn10x) btn10x.addEventListener('click', (e) => {
            if (e.detail === 0) return; btn10x.blur();
            buyMultiplier = 10;
            btn10x.style.backgroundColor = '#27ae60'; btn1x.style.backgroundColor = '#34495e'; 
            playSound('sound-click'); refreshAllStores(); updateUI();
        });
        if(toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                const list = document.getElementById('click-upgrade-list');
                const btnIcon = toggleBtn.querySelector('.icon');
                const btnText = toggleBtn.querySelector('.text');
                
                // Toggle della classe
                list.classList.toggle('hide-purchased-items');
                
                // 1. Gestione Grafica Bottone
                if (list.classList.contains('hide-purchased-items')) {
                    toggleBtn.classList.add('active');
                    btnIcon.textContent = '🛒';
                    btnText.textContent = "Disponibili"; 
                } else {
                    toggleBtn.classList.remove('active');
                    btnIcon.textContent = '👁️';
                    btnText.textContent = "Tutti";
                }
                
                // 2. CONTROLLO STATO VUOTO (NUOVO)
                // Richiamiamo updateClickStore per ricalcolare cosa è visibile
                if (typeof updateClickStore === 'function') {
                    updateClickStore(); 
                }

                if (window.EspooClicker && window.EspooClicker.playSound) {
                    window.EspooClicker.playSound('sound-click');
                }
            });
        }
        if(clickerButton) clickerButton.addEventListener('click', clickCookie);
        
        if(goldenBug) goldenBug.addEventListener('click', (e) => {
            if (e.detail === 0) return; clickGoldenBug();
        });
        
        if(prestigeBtn) {
            // Rimuovi listener vecchi clonando il nodo (trick veloce)
            const newPrestigeBtn = prestigeBtn.cloneNode(true);
            prestigeBtn.parentNode.replaceChild(newPrestigeBtn, prestigeBtn);
            prestigeBtn = newPrestigeBtn; // Aggiorna riferimento
            
            prestigeBtn.addEventListener('click', (e) => {
                if (e.detail === 0) return; 
                prestigeBtn.blur(); 
                openPrestigeContract(); // <--- Chiama la nuova funzione di apertura
            });
        }
        const confirmPrestigeBtn = document.getElementById('confirm-prestige-btn');
        if (confirmPrestigeBtn) {
            confirmPrestigeBtn.addEventListener('click', () => {
                executePrestige(); // <--- Chiama la funzione di esecuzione
            });
        }

        // 3. Bottone "Rifiuta" nel Modale -> Chiude
        const cancelPrestigeBtn = document.getElementById('cancel-prestige-btn');
        const prestigeModal = document.getElementById('prestige-modal');
        if (cancelPrestigeBtn && prestigeModal) {
            cancelPrestigeBtn.addEventListener('click', () => {
                prestigeModal.style.display = 'none';
            });
        }
        
        if(leftColumn) leftColumn.addEventListener('click', (e) => {
            const btn = e.target.closest('button.buy-btn');
            if (!btn) return;
            if (e.detail === 0) return; btn.blur(); e.stopPropagation();

            if (btn.classList.contains('buy-click-btn')) buyClickUpgrade(btn.dataset.upgradeName);
            else if (btn.classList.contains('enhancement-btn')) buyBuildingEnhancement(btn.dataset.upgradeName);
        });
        
        if(rightColumn) rightColumn.addEventListener('click', (e) => {
            const btn = e.target.closest('button.buy-btn');
            if (!btn) return;
            if (e.detail === 0) return; btn.blur(); e.stopPropagation();

            if (btn.classList.contains('buy-building-btn')) buyBuilding(btn.dataset.upgradeName);
            else if (btn.classList.contains('prestige-btn')) buyPrestigeUpgrade(btn.dataset.upgradeName);
        });
    }

    // --------- API GLOBALE ---------
    window.EspooClicker = {
        getGameState: () => gameState,
        saveGame: saveGame,
        showToast: showToast,
        playSound: playSound,
        updateStatsUI: updateStatsUI,
        formatNumber: formatNumber,
        setPassword: (pwd) => { currentUserPassword = pwd; },
        getPassword: () => currentUserPassword,
        setMasterVolume: (volume) => {
            gameState.user.masterVolume = parseFloat(volume);
            document.querySelectorAll('audio').forEach(audio => { audio.volume = gameState.user.masterVolume; });
        },
        startGameRoutines: startGameRoutines,
        
        loadCloudData: (cloudJSON) => {
            if (cloudJSON) {
                try {
                    deepMerge(gameState, JSON.parse(cloudJSON));
                    calculatePrestigeBonus();
                    calculateClickCPSBonus();
                    recalculateCPS();
                    
                    if (typeof refreshAllStores === 'function') refreshAllStores();
                    
                    updateUI();
                    showToast("Progressi scaricati dal Cloud!");
                } catch(e) { console.error("Errore parsing cloud", e); }
            }
        }
    };

    // Dynamic Cheatboard Loader
    fetch('js/cheatboard.js', { method: 'HEAD' })
        .then(response => {
            if (response.ok) {
                const script = document.createElement('script');
                script.src = 'js/cheatboard.js';
                document.body.appendChild(script);
            }
        })
        .catch(e => { });

    initializeGame();
});