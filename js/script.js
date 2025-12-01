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

        if (gameState.isDeleting) return;

        gameState.crunchTimeEndTime = crunchTimeEndTime;
        gameState.crunchTimeCooldownEnd = crunchTimeCooldownEnd;

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

    // --- FUNZIONE CHECK OFFLINE ---
    function checkOfflineProgress() {
        const modal = document.getElementById('offline-modal');

        // Se non c'è timestamp (nuovo gioco), assicuriamoci che il modale sia chiuso
        if (!gameState.lastSaveTimestamp) {
            if (modal) modal.style.display = 'none';
            return;
        }

        const now = Date.now();
        const diffSeconds = Math.floor((now - gameState.lastSaveTimestamp) / 1000);
        const maxOfflineSeconds = 43200; // 12 ore max (aumentato da 8h)
        const effectiveSeconds = Math.min(diffSeconds, maxOfflineSeconds);

        if (effectiveSeconds > 60) { // Mostra solo se via per almeno 1 minuto

            // --- CALCOLO EFFICIENZA ---
            let efficiency = 0.30; // Base 30%
            // Controllo di sicurezza per evitare crash se l'upgrade non è ancora nel save
            if (gameState.prestigeUpgrades && gameState.prestigeUpgrades.serverAlwaysOn) {
                efficiency += (gameState.prestigeUpgrades.serverAlwaysOn.count * 0.10);
            }
            if (efficiency > 1.0) efficiency = 1.0; // Cap a 100%

            // Guadagno Potenziale
            const rawEarned = effectiveSeconds * cookiesPerSecond;
            const realEarned = rawEarned * efficiency;

            if (realEarned > 0) {
                // Invece di aggiungere subito, mostriamo il modale
                showOfflineModal(realEarned, efficiency);
                return; // Usciamo, il modale è gestito
            }
        }

        // Se arriviamo qui, non c'è guadagno valido. 
        // Chiudiamo il modale se era rimasto aperto da un login precedente.
        if (modal) modal.style.display = 'none';
    }

    function loadGame() {
        const savedState = localStorage.getItem(SAVE_KEY);
        if (savedState) {
            try {
                const parsedState = JSON.parse(savedState);

                if (parsedState.buildings && !parsedState.teams) {
                    parsedState.teams = parsedState.buildings;
                    delete parsedState.buildings;
                }

                deepMerge(gameState, parsedState);
                if (!gameState.buildingEnhancements) gameState.buildingEnhancements = {};
                for (const key in gameData.buildingEnhancements) {
                    if (!gameState.buildingEnhancements[key]) {
                        gameState.buildingEnhancements[key] = { purchased: false };
                    }
                }

                if (!gameState.clickUpgrades) gameState.clickUpgrades = {};
                for (const key in gameData.clickUpgrades) {
                    if (!gameState.clickUpgrades[key]) {
                        gameState.clickUpgrades[key] = { purchased: false };
                    }
                }

                if (gameState.crunchTimeEndTime) crunchTimeEndTime = gameState.crunchTimeEndTime;
                if (gameState.crunchTimeCooldownEnd) crunchTimeCooldownEnd = gameState.crunchTimeCooldownEnd;
                if (gameState.lifetimePrestigePoints === undefined || gameState.lifetimePrestigePoints === null) {
                    gameState.lifetimePrestigePoints = gameState.prestigePoints;
                }
                if (!gameState.filterSettings) {
                    gameState.filterSettings = { click: 'available', auto: 'available', lab: 'available' };
                }
                if (gameData.achievements) {
                    if (!gameState.achievements) gameState.achievements = {};
                    for (const key in gameData.achievements) {
                        if (!gameState.achievements[key]) {
                            gameState.achievements[key] = { unlocked: false };
                        }
                    }
                }
                if (gameState.skins && gameState.skins.current) {
                    if (typeof applySkinVisuals === 'function') {
                        applySkinVisuals(gameState.skins.current);
                    }
                }
            } catch (e) { console.error("Errore loadGame:", e); }
        }

        const savedUsername = localStorage.getItem('espooClickerUsername');
        if (savedUsername) gameState.user.username = savedUsername;

        calculatePrestigeBonus();
        recalculateCPS();

        // --- FIX AUTO-REPAIR SKIN (LOCALE) ---
        for (const key in gameData.achievements) {
            const achData = gameData.achievements[key];
            const achState = gameState.achievements[key];

            // Se l'obiettivo esiste, è RISCATTATO (claimed), e dà una SKIN
            if (achState && achState.claimed && achData.reward && achData.reward.type === 'skin') {
                const skinId = achData.reward.id;
                // Se la skin NON è nell'inventario, aggiungila ora
                if (gameState.skins.unlocked && !gameState.skins.unlocked.includes(skinId)) {
                    console.log(`[Auto-Fix Local] Recuperata skin mancante: ${skinId}`);
                    gameState.skins.unlocked.push(skinId);
                }
            }
        }
        // -------------------------------------

        if (gameState.clickUpgrades.hacking.purchased) goldenBugChance *= 2;
        if (gameState.prestigeUpgrades.ticketPremium.purchased) goldenBugSpawnTime *= 0.5;
    }


    function deepMerge(target, source) {
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (source[key] instanceof Object && !Array.isArray(source[key])) {
                    if (!target[key]) target[key] = {}; // Crea l'oggetto se manca
                    deepMerge(target[key], source[key]);
                } else {
                    target[key] = source[key];
                }
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
        // Usiamo una funzione anonima con rimozione listener per evitare doppi click se ricarichi
        // Dentro showOfflineModal in script.js ...

        const claimHandler = () => {
            // Aggiungi i punti
            gameState.score += amount;
            gameState.totalScore += amount;
            gameState.lifetimeScore += amount;

            // --- NUOVO: Aggiorna statistica offline ---
            if (!gameState.totalOfflineScore) gameState.totalOfflineScore = 0;
            gameState.totalOfflineScore += amount;
            // ------------------------------------------

            // Chiudi modale
            modal.style.display = 'none';

            // Salva e Feedback
            window.EspooClicker.saveGame();
            updateUI();
            window.EspooClicker.showToast(`Hai riscattato ${formatNumber(amount)} bug!`, 'success');
            window.EspooClicker.playSound('sound-buy');

            // Rimuovi listener per pulizia
            btn.removeEventListener('click', claimHandler);
        };

        // Rimuovi vecchi listener clonando il nodo (hack veloce per pulire eventi anonimi precedenti)
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        newBtn.addEventListener('click', claimHandler);

        // Mostra
        modal.style.display = 'flex';
    }

    let lastFrameTime = Date.now();
    // --------- LOOP DI GIOCO CORRETTO ---------
    function gameLoop() {
        const now = Date.now();
        const deltaTime = (now - lastFrameTime) / 1000;
        lastFrameTime = now;

        if (deltaTime > 86400) return;

        const scoreToAdd = cookiesPerSecond * deltaTime;

        gameState.score += scoreToAdd;
        gameState.totalScore += scoreToAdd;
        gameState.lifetimeScore += scoreToAdd;

        // AGGIORNAMENTO TEMPO DI GIOCO
        gameState.totalPlayTime += deltaTime;

        checkAchievements();

        const clickNow = Date.now();
        clickHistory = clickHistory.filter(click => clickNow - click.time < 1000);

        updateUI();

        if (typeof updatePrestigeVisuals === 'function') {
            updatePrestigeVisuals();
        }

        // --- FIX FONDAMENTALE PER STATISTICHE LIVE ---
        // Questo pezzo aggiorna il modale statistiche ogni frame se è aperto
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
        setInterval(saveGame, 5000); // Auto-save ogni 5s

        setInterval(() => {
            submitScoreToLeaderboard(gameState.user.username, gameState.lifetimeScore, gameState.totalResets);
        }, 30000);

        scheduleGoldenBug();

        // [FIX SALVATAGGIO] Salva istantaneamente quando chiudi o ricarichi la pagina
        window.addEventListener('beforeunload', () => {
            // Chiamiamo saveGame() in modo sincrono per il localStorage
            // (La parte cloud potrebbe non fare in tempo, ma il locale è garantito)
            saveGame();
        });
    }

    function initializeGame() {
        document.addEventListener('contextmenu', event => event.preventDefault());
        document.addEventListener('dragstart', event => event.preventDefault());

        buildStores();
        loadGame();
        if (typeof refreshAllStores === 'function') refreshAllStores();
        updateUI();

        const btns = {
            '1x': document.getElementById('btn-1x'),
            '5x': document.getElementById('btn-5x'),
            '10x': document.getElementById('btn-10x'),
            'MAX': document.getElementById('btn-max')
        };

        function setBuyMultiplier(value) {
            buyMultiplier = value;

            // Reset colori
            for (let k in btns) {
                if (btns[k]) btns[k].style.backgroundColor = '#34495e';
            }

            // Attiva quello giusto
            const activeKey = value === 'MAX' ? 'MAX' : value + 'x';
            if (btns[activeKey]) btns[activeKey].style.backgroundColor = '#27ae60';

            playSound('sound-click');
            refreshAllStores();
            updateUI();
        }
        if (btns['1x']) btns['1x'].addEventListener('click', (e) => { if (e.detail === 0) return; btns['1x'].blur(); setBuyMultiplier(1); });
        if (btns['5x']) btns['5x'].addEventListener('click', (e) => { if (e.detail === 0) return; btns['5x'].blur(); setBuyMultiplier(5); });
        if (btns['10x']) btns['10x'].addEventListener('click', (e) => { if (e.detail === 0) return; btns['10x'].blur(); setBuyMultiplier(10); });
        if (btns['MAX']) btns['MAX'].addEventListener('click', (e) => { if (e.detail === 0) return; btns['MAX'].blur(); setBuyMultiplier('MAX'); });

        const crunchBtn = document.getElementById('skill-crunchTime');

        const tabs = document.querySelectorAll('.tab-btn');
        const contents = document.querySelectorAll('.tab-content');

        const globalFilterSelect = document.getElementById('global-filter-select');

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                // Se il focus è su un input di testo (es. chat, login), lascia fare
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

                // Altrimenti blocca
                e.preventDefault();
            }
        });

        const muteBtn = document.getElementById('quick-mute-btn');
        if (muteBtn) {
            muteBtn.addEventListener('click', () => {
                if (gameState.user.masterVolume > 0) {
                    // Muta
                    gameState.lastVolume = gameState.user.masterVolume; // Salva il volume precedente
                    gameState.user.masterVolume = 0;
                    muteBtn.textContent = '🔇';
                } else {
                    // Smuta
                    gameState.user.masterVolume = gameState.lastVolume || 1.0;
                    muteBtn.textContent = '🔊';
                }
                // Aggiorna slider nel modale se aperto
                const mSlider = document.getElementById('master-slider');
                if (mSlider) mSlider.value = gameState.user.masterVolume;

                // Applica
                if (typeof updateAmbientVolume === 'function') updateAmbientVolume();
            });
        }

        // Rimuovi focus dal clicker dopo ogni click per sicurezza
        if (clickerButton) {
            clickerButton.addEventListener('mouseup', () => clickerButton.blur());
            clickerButton.addEventListener('mouseleave', () => clickerButton.blur());
        }

        if (globalFilterSelect) {
            const savedFilter = gameState.filterSettings.globalFilter || 'available';
            globalFilterSelect.value = savedFilter;
            gameState.filterSettings.globalFilter = savedFilter;

            globalFilterSelect.addEventListener('change', (e) => {
                const newValue = e.target.value;
                gameState.filterSettings.globalFilter = newValue;
                refreshAllStores();
                saveGame();
                if (window.EspooClicker && window.EspooClicker.playSound) {
                    window.EspooClicker.playSound('sound-click');
                }
            });
        }

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
                        if (!filterSelect.disabled) {
                            filterSelect.setAttribute('data-prev', filterSelect.value);
                        }
                        filterSelect.value = 'all';
                        filterSelect.disabled = true;
                        gameState.filterSettings.globalFilter = 'all';
                    } else {
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
                if (e.isTrusted) {
                    playSound('sound-click');
                }
            });
        });

        const defaultTab = document.getElementById('tab-click');
        if (defaultTab) defaultTab.click();

        if (crunchBtn) {
            crunchBtn.addEventListener('click', (e) => {
                if (e.detail === 0) return;
                crunchBtn.blur();
                activateCrunchTime();
            });
        }


        if (clickerButton) clickerButton.addEventListener('click', clickCookie);

        if (goldenBug) goldenBug.addEventListener('click', (e) => {
            if (e.detail === 0) return; clickGoldenBug();
        });


        const cancelPrestigeBtn = document.getElementById('cancel-prestige-btn');
        const prestigeModal = document.getElementById('prestige-modal');
        if (cancelPrestigeBtn && prestigeModal) {
            cancelPrestigeBtn.addEventListener('click', () => {
                prestigeModal.style.display = 'none';
            });
        }

        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.buy-btn');
            if (!btn || btn.disabled || btn.classList.contains('owned')) return;
            btn.blur();
            const name = btn.getAttribute('data-upgrade-name');
            if (!name) return;

            if (btn.classList.contains('prestige-btn')) {
                if (typeof buyPrestigeUpgrade === 'function') buyPrestigeUpgrade(name);
            } else if (btn.classList.contains('buy-click-btn')) {
                if (typeof buyClickUpgrade === 'function') buyClickUpgrade(name);
            } else if (btn.classList.contains('enhancement-btn')) {
                if (typeof buyTeamEnhancement === 'function') buyTeamEnhancement(name);
            } else if (btn.classList.contains('buy-building-btn')) {
                if (typeof buyTeam === 'function') buyTeam(name);
            }
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
        executePrestige: executePrestige,

        loadCloudData: (cloudJSON) => {
            if (cloudJSON) {
                try {
                    // 1. Reset dello stato in memoria
                    if (typeof resetGameToDefault === 'function') resetGameToDefault();

                    // 2. Pulizia grafica
                    const achList = document.getElementById('achievement-list');
                    if (achList) achList.innerHTML = '';

                    // 3. Merge dei dati
                    const cloudState = JSON.parse(cloudJSON);

                    // Gestione compatibilità cloud: "buildings" -> "teams"
                    if (cloudState.buildings && !cloudState.teams) {
                        cloudState.teams = cloudState.buildings;
                        delete cloudState.buildings;
                    }

                    deepMerge(gameState, cloudState);

                    // --- FIX SICUREZZA: RIPARA I DATI SKIN CORROTTI ---
                    if (!gameState.skins || !Array.isArray(gameState.skins.unlocked)) {
                        console.warn("Dati skin corrotti. Ripristino default.");
                        gameState.skins = { current: 'default', unlocked: ['default'] };
                    }

                    // 4. Fix Nome Utente
                    const currentSessionUser = sessionStorage.getItem('espooUser');
                    if (currentSessionUser && gameState.user.username !== currentSessionUser) {
                        gameState.user.username = currentSessionUser;
                    }

                    calculatePrestigeBonus();
                    recalculateCPS();
                    if (typeof refreshAllStores === 'function') refreshAllStores();

                    if (typeof updateAchievementsUI === 'function') updateAchievementsUI();
                    if (typeof updateUI === 'function') updateUI();

                    // 7. Sovrascrivi cache locale
                    localStorage.setItem('espotoolClickerSaveV8', JSON.stringify(gameState));

                    for (const key in gameData.achievements) {
                        const achData = gameData.achievements[key];
                        const achState = gameState.achievements[key];

                        // Se l'obiettivo esiste, è RISCATTATO (claimed), e dà una SKIN
                        if (achState && achState.claimed && achData.reward && achData.reward.type === 'skin') {
                            const skinId = achData.reward.id;
                            // Se la skin NON è nell'inventario, aggiungila ora
                            if (gameState.skins.unlocked && !gameState.skins.unlocked.includes(skinId)) {
                                console.log(`[Auto-Fix] Recuperata skin mancante: ${skinId}`);
                                gameState.skins.unlocked.push(skinId);
                            }
                        }
                    }
                    // --- AGGIUNTA: Check offline subito dopo il login ---
                    checkOfflineProgress();
                    // --------------------------------------------------

                    showToast("Progressi scaricati dal Cloud!");
                } catch (e) { console.error("Errore parsing cloud", e); }
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