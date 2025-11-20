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

        if (gameState.isDeleting) return;

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
                        if (window.EspooClicker && window.EspooClicker.showToast) {
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

    let lastFrameTime = Date.now();
    // --------- LOOP DI GIOCO CORRETTO ---------
    function gameLoop() {
        const now = Date.now();
        // Calcola quanto tempo è passato in secondi (es. 0.033s)
        const deltaTime = (now - lastFrameTime) / 1000;
        lastFrameTime = now;

        // Se il salto temporale è troppo grande (es. pc in standby), limitalo per sicurezza o gestiscilo
        if (deltaTime > 86400) return; // Ignora salti assurdi (bug prevenzione)

        // Aggiungi il punteggio basato sul tempo ESATTO trascorso
        const scoreToAdd = cookiesPerSecond * deltaTime;

        gameState.score += scoreToAdd;
        gameState.totalScore += scoreToAdd;
        gameState.lifetimeScore += scoreToAdd;

        // Gestione storico click (invariato)
        const clickNow = Date.now();
        clickHistory = clickHistory.filter(click => clickNow - click.time < 1000);

        // [Ottimizzazione] Non serve chiamare checkAchievements() qui se hai già il setInterval separato
        // checkAchievements(); 

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

        if (globalFilterSelect) {
            // 1. Imposta valore iniziale (dal salvataggio o default)
            // Supporto retroattivo: se il salvataggio è vecchio e non ha 'globalFilter', usa 'available'
            const savedFilter = gameState.filterSettings.globalFilter || 'available';
            globalFilterSelect.value = savedFilter;

            // Aggiorna subito gameState per sicurezza
            gameState.filterSettings.globalFilter = savedFilter;

            // 2. Event Listener cambio
            globalFilterSelect.addEventListener('change', (e) => {
                const newValue = e.target.value;

                // Salva
                gameState.filterSettings.globalFilter = newValue;

                // Applica modifiche
                refreshAllStores();
                saveGame();

                // Feedback Audio
                if (window.EspooClicker && window.EspooClicker.playSound) {
                    window.EspooClicker.playSound('sound-click');
                }
            });
        }

        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                // 1. Logica Standard Tab (Active/Display)
                tabs.forEach(t => t.classList.remove('active'));
                contents.forEach(c => c.style.display = 'none');

                tab.classList.add('active');
                const targetId = tab.getAttribute('data-target');
                document.getElementById(targetId).style.display = 'block';

                tab.classList.remove('notify');

                // --- 2. NUOVA LOGICA FILTRO LAB ---
                const filterSelect = document.getElementById('global-filter-select');

                if (filterSelect) {
                    if (tab.id === 'tab-prestige') {
                        // CASO: Entro nel Laboratorio

                        // a) Salvo il filtro che stavo usando (solo se il menu era attivo)
                        if (!filterSelect.disabled) {
                            filterSelect.setAttribute('data-prev', filterSelect.value);
                        }

                        // b) Imposto su "Tutti" e Disabilito
                        filterSelect.value = 'all';
                        filterSelect.disabled = true; // Diventa grigetto ma resta lì

                        // c) Aggiorno lo stato del gioco (così refreshAllStores sa di mostrare tutto)
                        gameState.filterSettings.globalFilter = 'all';

                    } else {
                        // CASO: Esco dal Laboratorio (Click o Auto)

                        // a) Riabilito il menu
                        filterSelect.disabled = false;

                        // b) Se c'era un filtro salvato, lo ripristino
                        const prev = filterSelect.getAttribute('data-prev');
                        if (prev) {
                            filterSelect.value = prev;
                            gameState.filterSettings.globalFilter = prev;

                            filterSelect.removeAttribute('data-prev');
                        }
                        // Se non c'era (es. cambio diretto Click <-> Auto), lascia quello corrente
                    }

                    // Applica subito le modifiche visive
                    refreshAllStores();
                }
                // ----------------------------------

                // 3. Audio
                if (e.isTrusted) {
                    playSound('sound-click');
                }
            });
        });

        // Questo click automatico ora non genererà l'errore audio
        const defaultTab = document.getElementById('tab-click');
        if (defaultTab) defaultTab.click();

        if (crunchBtn) {
            crunchBtn.addEventListener('click', (e) => {
                if (e.detail === 0) return; // Evita doppio click tastiera
                crunchBtn.blur();
                activateCrunchTime();
            });
        }


        if (clickerButton) clickerButton.addEventListener('click', clickCookie);

        if (goldenBug) goldenBug.addEventListener('click', (e) => {
            if (e.detail === 0) return; clickGoldenBug();
        });

        if (prestigeBtn) {
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

        if (leftColumn) leftColumn.addEventListener('click', (e) => {
            const btn = e.target.closest('button.buy-btn');
            if (!btn) return;
            if (e.detail === 0) return; btn.blur(); e.stopPropagation();

            if (btn.classList.contains('buy-click-btn')) buyClickUpgrade(btn.dataset.upgradeName);
            else if (btn.classList.contains('enhancement-btn')) buyBuildingEnhancement(btn.dataset.upgradeName);
        });

        if (rightColumn) rightColumn.addEventListener('click', (e) => {
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