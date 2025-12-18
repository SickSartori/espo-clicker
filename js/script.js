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

        // Aggiorna timestamp
        gameState.crunchTimeEndTime = crunchTimeEndTime;
        gameState.crunchTimeCooldownEnd = crunchTimeCooldownEnd;
        gameState.lastSaveTimestamp = Date.now();

        // 1. Converti in JSON
        const stateJSON = JSON.stringify(gameState);

        // 2. Comprimi (LZString) - Riduce la dimensione del 60-80%
        // Usiamo compressToUTF16 perché funziona perfettamente con localStorage e JSON
        const compressed = LZString.compressToUTF16(stateJSON);

        // 3. Salva in Locale
        localStorage.setItem(SAVE_KEY, compressed);

        // 4. Salva in Cloud (se loggato)
        if (gameState.user.username && currentUserPassword) {
            try {
                await fetch('./php/save_progress.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: gameState.user.username,
                        password: currentUserPassword,
                        saveData: compressed // Inviamo la stringa compressa al server
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

    // Funzione Helper per il controllo versione
    function checkSaveCompatibility(savedData) {
        if (!window.GAME_VERSION) return true; // Dev safety

        // 1. Salvataggi antichi (senza versione) -> Incompatibili
        if (!savedData || !savedData.version) {
            console.warn("Salvataggio Legacy: Reset richiesto.");
            return false;
        }

        const current = window.GAME_VERSION;
        const saved = savedData.version;

        // 2. Controllo STAGE (Non mischiare Beta con Stable)
        if (saved.stage !== current.stage) {
            console.warn(`Mismatch Stage: Salvataggio ${saved.stage} vs Gioco ${current.stage}`);
            return false;
        }

        // 3. Regola STABLE: Sempre compatibile in avanti
        if (current.stage === 'stable') {
            // Se siamo in stable, accettiamo anche major diverse (es. Save 1.0 su Gioco 2.0)
            return true;
        }

        // 4. Regola BETA/ALPHA: Rottura su cambio Major
        // Se siamo in beta, la versione Major deve coincidere.
        if (saved.major !== current.major) {
            console.warn(`Mismatch Major (Beta): v${saved.major} non compatibile con v${current.major}`);
            return false;
        }

        return true; // Tutto ok (es. 3.0 -> 3.1)
    }

    function loadGame() {
        const savedState = localStorage.getItem(SAVE_KEY);

        if (savedState) {
            try {
                let parsedState;

                // --- TENTATIVO DI DECOMPRESSIONE ---
                // Proviamo a decomprimere. Se è un vecchio salvataggio, 
                // questa funzione restituirà null o una stringa corrotta.
                const decompressed = LZString.decompressFromUTF16(savedState);

                // Controllo intelligente: Se decompresso è valido e inizia con '{' (JSON), usalo.
                if (decompressed && (decompressed.startsWith('{') || decompressed.startsWith('['))) {
                    parsedState = JSON.parse(decompressed);
                    console.log("💾 Salvataggio compresso caricato (LZString).");
                } else {
                    // Fallback Legacy: Prova a leggere come JSON normale (vecchi salvataggi)
                    parsedState = JSON.parse(savedState);
                    console.log("💾 Salvataggio legacy caricato.");
                }
                // -----------------------------------

                // --- 1. CONTROLLO COMPATIBILITÀ VERSIONE ---
                if (!checkSaveCompatibility(parsedState)) {
                    // ... (Il resto della funzione rimane IDENTICO a prima) ...
                    console.log("Versione incompatibile. Reset automatico.");
                    setTimeout(() => {
                        if (window.EspooClicker) window.EspooClicker.showToast(`⚠️ Reset Versione: ${parsedState.version?.stage || 'Legacy'} incompatibile!`, 'warning');
                    }, 500);
                    saveGame();
                    return;
                }

                // ... continua con deepMerge e il resto del codice originale ...
                if (parsedState.buildings && !parsedState.teams) {
                    parsedState.teams = parsedState.buildings;
                    delete parsedState.buildings;
                }
                deepMerge(gameState, parsedState);

                // --- 2. AGGIORNAMENTO VERSIONE ---
                // Aggiorniamo la versione nel gioco caricato all'ultima versione del codice
                // (Utile per aggiornamenti minori, es. caricare un save 3.0 su 3.1)
                if (window.GAME_VERSION) {
                    gameState.version = {
                        major: window.GAME_VERSION.major,
                        minor: window.GAME_VERSION.minor,
                        stage: window.GAME_VERSION.stage
                    };
                }


                // Inizializzazione oggetti mancanti (se aggiunti in nuove versioni)
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

                // Ripristino variabili temporali e impostazioni
                if (gameState.crunchTimeEndTime) crunchTimeEndTime = gameState.crunchTimeEndTime;
                if (gameState.crunchTimeCooldownEnd) crunchTimeCooldownEnd = gameState.crunchTimeCooldownEnd;

                if (gameState.lifetimePrestigePoints === undefined || gameState.lifetimePrestigePoints === null) {
                    gameState.lifetimePrestigePoints = gameState.prestigePoints;
                }

                if (!gameState.filterSettings) {
                    gameState.filterSettings = { click: 'available', auto: 'available', lab: 'available' };
                }

                // Ripristino Achievements
                if (gameData.achievements) {
                    if (!gameState.achievements) gameState.achievements = {};
                    for (const key in gameData.achievements) {
                        if (!gameState.achievements[key]) {
                            gameState.achievements[key] = { unlocked: false };
                        }
                    }
                }

                // Applicazione Skin Visiva
                if (gameState.skins && gameState.skins.current) {
                    if (typeof applySkinVisuals === 'function') {
                        applySkinVisuals(gameState.skins.current);
                    }
                }

            } catch (e) { console.error("Errore loadGame:", e); }
        }

        // Recupero username legacy se presente
        const savedUsername = localStorage.getItem('espooClickerUsername');
        if (savedUsername) gameState.user.username = savedUsername;

        // [GENERICO] Ricalcola tutti gli effetti passivi
        if (typeof reapplyAllEffects === 'function') {
            reapplyAllEffects();
        }

        // Ricalcolo Bonus
        calculatePrestigeBonus();
        recalculateCPS();

        // [GENERICO] Aggiungi skin mancanti
        for (const key in gameData.achievements) {
            const achData = gameData.achievements[key];
            const achState = gameState.achievements[key];

            // Se l'obiettivo è riscattato e dà una skin, assicuriamoci di averla
            if (achState && achState.claimed && achData.reward && achData.reward.type === 'skin') {
                const skinId = achData.reward.id;
                if (gameState.skins.unlocked && !gameState.skins.unlocked.includes(skinId)) {
                    console.log(`[Auto-Fix Local] Recuperata skin mancante: ${skinId}`);
                    gameState.skins.unlocked.push(skinId);
                }
            }
        }

        // Applicazione Effetti passivi al caricamento
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
    let lastSlowTick = 0;
    // --------- LOOP DI GIOCO CORRETTO ---------
    function gameLoop() {
        const now = Date.now();
        const deltaTime = (now - lastFrameTime) / 1000;
        lastFrameTime = now;

        if (deltaTime > 86400) return; // Fix per tab in background da molto tempo

        // 1. Calcolo Score (Veloce - Ogni frame)
        const scoreToAdd = cookiesPerSecond * deltaTime;
        gameState.score += scoreToAdd;
        gameState.totalScore += scoreToAdd;
        gameState.lifetimeScore += scoreToAdd;
        gameState.totalPlayTime += deltaTime;

        // 2. Slow Loop (1 volta al secondo) - OTTIMIZZAZIONE
        if (now - lastSlowTick > 1000) {
            checkAchievements();         // Controlla obiettivi
            checkTabNotifications();     // Controlla i pallini rossi sui tab

            // Qui puoi aggiungere altri controlli pesanti futuri (es. Auto-Save logico)
            lastSlowTick = now;
        }

        // 3. Gestione Click History (Veloce)
        const clickNow = Date.now();
        clickHistory = clickHistory.filter(click => clickNow - click.time < 1000);

        // --- NUOVO: CONTROLLO FINE CRUNCH TIME ---
        // Se il tempo è scaduto MA l'effetto è ancora visibile (classe presente)
        if (gameState.crunchTimeEndTime > 0 && now > gameState.crunchTimeEndTime) {
            if (document.body.classList.contains('crunch-active')) {

                document.body.classList.remove('crunch-active');
                const overlay = document.getElementById('crunch-overlay');
                if (overlay) overlay.style.display = 'none';

                // SPEGNI SOLO FURY MUSIC (Fire rimosso)
                const furyMusic = document.getElementById('sound-fury-music');
                if (furyMusic) {
                    furyMusic.pause();
                    furyMusic.currentTime = 0;
                }

                // 3. Ripristina Musica Background
                const bgMusic = document.getElementById('sound-bg-music');
                if (bgMusic && gameState.user.masterVolume > 0 && gameState.skins.current !== 'christmas') {
                    if (typeof setBgMusicVolume === 'function') {
                        setBgMusicVolume();
                    } else if (window.EspooClicker && typeof window.EspooClicker.setBgMusicVolume === 'function') {
                        window.EspooClicker.setBgMusicVolume();
                    }

                    // Riavvia solo se non c'è altro evento
                    if (!window.currentActiveEvent || window.currentActiveEvent === 'Espo Fury') {
                        bgMusic.play().catch(e => { });
                    }
                }

                // 4. STOP PARTICELLE
                const fireContainer = document.getElementById('fire-particles-container');
                if (fireContainer) {
                    fireContainer.style.display = 'none';
                    fireContainer.innerHTML = '';
                }
                if (typeof fireParticleInterval !== 'undefined' && fireParticleInterval) {
                    clearInterval(fireParticleInterval);
                    fireParticleInterval = null;
                }

                // 5. RESET IMMAGINI SKIN
                if (typeof applySkinVisuals === 'function') {
                    applySkinVisuals(gameState.skins.current);
                }

                // 6. RESET LOGICA GIOCO
                crunchTimeMultiplier = 1;
                recalculateCPS();

                if (typeof updateUI === 'function') updateUI();
                if (typeof refreshAllStores === 'function') refreshAllStores();

                if (window.currentActiveEvent === 'Crunch Time' || window.currentActiveEvent === 'Espo Fury') {
                    window.currentActiveEvent = null;
                    console.log("Espo Fury terminato. Semaforo verde.");
                }

                window.EspooClicker.showToast('Espo si è calmato.', 'info');
            }
        }
        // ------------------------------------------
    }
    // --------- 11. INIZIALIZZAZIONE ---------
    function startGameRoutines() {
        // Volume audio iniziale
        document.querySelectorAll('audio').forEach(audio => {
            audio.volume = gameState.user.masterVolume;
        });

        // 1. LOGICA (30 FPS) - Usa il tuo nuovo gameLoop pulito
        setInterval(gameLoop, 33);

        // 2. GRAFICA (10 FPS) - Qui metti quello che hai tolto
        setInterval(() => {
            updateUI();

            if (typeof updatePrestigeVisuals === 'function') {
                updatePrestigeVisuals();
            }

            // Aggiorna statistiche modale solo se aperto
            const statsModal = document.getElementById('stats-modal');
            if (statsModal && statsModal.style.display === 'flex') {
                if (typeof updateStatsUI === 'function') {
                    updateStatsUI();
                }
            }
        }, 100); // 100ms = 10 volte al secondo, fluido e leggero

        // Auto-save (ogni 30s)
        setInterval(saveGame, 30000);

        // Classifica (ogni 30s) - Nota: rimosso score/prestige dai parametri come discusso per sicurezza
        setInterval(() => {
            submitScoreToLeaderboard(gameState.user.username);
        }, 30000);

        scheduleGoldenBug();

        // Salvataggio alla chiusura
        window.addEventListener('beforeunload', () => { saveGame(); });
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

        // 1. LISTA IMMAGINI CRITICHE (Manuale)
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

        // 2. AUDIO (Automatico da gameData)
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

        // 3. VIDEO (Automatico da gameData)
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

        // 1. Setup Iniziale
        if (loaderStatus) loaderStatus.textContent = "Caricamento dati...";
        loadGame(); // Carica salvataggi

        // 2. Inizializza Audio Context (senza suonare ancora)
        if (typeof AudioManager !== 'undefined') {
            AudioManager.init();
        }

        // 3. AVVIO PRELOADER CON BARRA PROGRESSO
        preloadAllAssets((percent) => {
            // Questa funzione viene chiamata ogni volta che un file finisce
            if (loaderStatus) {
                loaderStatus.textContent = `Scaricamento risorse... ${percent}%`;

                // Opzionale: Se vuoi una barra visiva, puoi aggiornarla qui
                // document.getElementById('loader-bar').style.width = percent + '%';
            }
        }).then(() => {
            // 4. TUTTO PRONTO
            if (loaderStatus) loaderStatus.textContent = "Avvio sistema...";

            // Ritardo minimo per estetica (evita flash troppo rapidi se in cache)
            setTimeout(() => {
                const loader = document.getElementById('game-loader');
                if (loader) {
                    loader.classList.add('hidden');
                    setTimeout(() => loader.remove(), 600);
                }

                // Fai partire l'UI e i loop
                updateUI();

                // Tenta autoplay audio (se permesso)
                if (window.EspooClicker && window.EspooClicker.tryStartAudio) {
                    window.EspooClicker.tryStartAudio();
                }
            }, 500);
        });

        // Setup Listener Vari
        const now = Date.now();

        if (typeof AudioManager !== 'undefined') {
            AudioManager.init();
        }

        const bgMusic = document.getElementById('sound-bg-music');
        const snowAudio = document.getElementById('sound-snowball');
        const masterVol = gameState.user.masterVolume;
        const musicVol = gameState.user.musicVolume;

        // Funzione rapida per provare a suonare
        const tryStart = () => {
            const loginModal = document.getElementById('login-modal');
            // Controllo 1: Se il modale è visibile graficamente -> STOP
            if (loginModal && getComputedStyle(loginModal).display !== 'none') {
                return;
            }
            const hasSession = sessionStorage.getItem('espooUser');
            if (!hasSession) {
                console.log("Audio in attesa: Nessuna sessione attiva.");
                return;
            }
            // ---------------------------------------------

            if (masterVol <= 0 || musicVol <= 0) return;

            // ... (il resto della funzione rimane uguale: const audioToPlay = ...)
            const audioToPlay = (gameState.skins.current === 'christmas') ? snowAudio : bgMusic;
            const isFuryActive = (gameState.crunchTimeEndTime > Date.now());

            if (audioToPlay && audioToPlay.paused && !window.currentActiveEvent && !isFuryActive) {
                // Assicurati che updateAmbientVolume esista prima di chiamarlo
                if (typeof updateAmbientVolume === 'function') {
                    updateAmbientVolume();
                } else if (typeof setBgMusicVolume === 'function') {
                    setBgMusicVolume();
                }

                const playPromise = audioToPlay.play();
                if (playPromise !== undefined) {
                    playPromise.catch(() => {
                        // Logica Autoplay bloccato (lasciare invariata)
                        console.log("Autoplay bloccato. Attendo interazione...");
                        const unlockAudio = () => {
                            if (!window.currentActiveEvent && !(gameState.crunchTimeEndTime > Date.now())) {
                                audioToPlay.play().catch(e => { });
                            }
                            document.removeEventListener('click', unlockAudio);
                            document.removeEventListener('keydown', unlockAudio);
                            document.removeEventListener('touchstart', unlockAudio);
                        };
                        document.addEventListener('click', unlockAudio, { once: true });
                        document.addEventListener('keydown', unlockAudio, { once: true });
                        document.addEventListener('touchstart', unlockAudio, { once: true });
                    });
                }
            }
        };

        tryStart();

        // Genera l'interfaccia iniziale
        if (typeof refreshAllStores === 'function') refreshAllStores();

        // --- 3. SETUP STANDARD ---
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
            const v = document.getElementById(id);
            if (v) { v.pause(); v.style.display = 'none'; v.currentTime = 0; }
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
        if (!isFuryResumed && typeof applySkinVisuals === 'function') {
            applySkinVisuals(gameState.skins.current);
        } else if (isFuryResumed) {
            console.log("Fury Mode attiva: skip caricamento skin standard.");
        }

        // (QUI HO RIMOSSO IL BLOCCO DUPLICATO CHE CAUSAVA L'ERRORE)

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

        // 1. Recupera Riferimenti
        multiplierValues.forEach(val => {
            const id = val === 'MAX' ? 'btn-max' : `btn-${val}x`;
            multiplierBtns[val] = document.getElementById(id);
        });

        // 2. Funzione Logica Cambio
        function setBuyMultiplier(value) {
            buyMultiplier = value;

            // Aggiorna Grafica Bottoni
            multiplierValues.forEach(val => {
                if (multiplierBtns[val]) {
                    // Rimuovi colore inline per far lavorare il CSS
                    multiplierBtns[val].style.backgroundColor = '';

                    if (val === value) {
                        multiplierBtns[val].classList.add('active'); // Usa classe CSS
                    } else {
                        multiplierBtns[val].classList.remove('active');
                    }
                }
            });

            playSound('sound-click');
            refreshAllStores();
            updateUI();
        }

        // 3. Assegna Listener
        multiplierValues.forEach(val => {
            if (multiplierBtns[val]) {
                multiplierBtns[val].addEventListener('click', (e) => {
                    if (e.detail !== 0) { // Ignora click simulati strani
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
            muteBtn.innerHTML = gameState.user.masterVolume <= 0 ? '<i class="fa-solid fa-volume-xmark"></i>' : '<i class="fa-solid fa-volume-high"></i>';

            muteBtn.addEventListener('click', () => {
                const targetAudio = (gameState.skins.current === 'christmas') ? snowAudio : bgMusic;
                const isBlocked = (gameState.user.masterVolume > 0 && targetAudio && targetAudio.paused && !window.currentActiveEvent);

                if (isBlocked) {
                    tryStart();
                    muteBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
                } else {
                    if (gameState.user.masterVolume > 0) {
                        gameState.lastVolume = gameState.user.masterVolume;
                        gameState.user.masterVolume = 0;
                        muteBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
                    } else {
                        gameState.user.masterVolume = gameState.lastVolume || 1.0;
                        muteBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
                        playSound('sound-click');
                        tryStart();
                    }
                    const mSlider = document.getElementById('master-slider');
                    if (mSlider) mSlider.value = gameState.user.masterVolume;
                    if (typeof updateAmbientVolume === 'function') updateAmbientVolume();
                }
            });
        }

        if (clickerButton) {
            clickerButton.addEventListener('mouseup', () => clickerButton.blur());
            clickerButton.addEventListener('mouseleave', () => clickerButton.blur());
            clickerButton.addEventListener('click', (e) => {
                tryStart();
                clickCookie(e);
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
            } else if (!document.querySelector('.game-column.mobile-active')) {
                document.getElementById('center-column').classList.add('mobile-active');
            }
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
        if (cancelPrestigeBtn && prestigeModal) {
            cancelPrestigeBtn.addEventListener('click', () => prestigeModal.style.display = 'none');
        }

        const vDisplay = document.getElementById('version-display');
        if (vDisplay && window.GAME_VERSION) {
            vDisplay.textContent = window.GAME_VERSION.toString();
            if (window.GAME_VERSION.stage === 'beta') vDisplay.style.color = '#f39c12';
            if (window.GAME_VERSION.stage === 'stable') vDisplay.style.color = '#2ecc71';
        }
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
        // --- NUOVA FUNZIONE AUDIO INTELLIGENTE ---
        tryStartAudio: () => {
            const bgMusic = document.getElementById('sound-bg-music');
            const snowAudio = document.getElementById('sound-snowball');
            const masterVol = gameState.user.masterVolume;
            const musicVol = gameState.user.musicVolume;

            // Se il volume è 0, non fare nulla
            if (masterVol <= 0 || musicVol <= 0) return;

            // Scegli traccia in base alla skin
            const audioToPlay = (gameState.skins.current === 'christmas') ? snowAudio : bgMusic;

            // Se l'audio è già partito o c'è un evento, esci
            if (!audioToPlay || !audioToPlay.paused || window.currentActiveEvent) return;

            if (typeof setBgMusicVolume === 'function') setBgMusicVolume();

            // Tenta di avviare l'audio
            const playPromise = audioToPlay.play();

            if (playPromise !== undefined) {
                playPromise.catch(() => {
                    console.log("Autoplay bloccato (Normale su F5): Attendo interazione...");

                    // FALLBACK: Al primo click ovunque, fai partire la musica
                    const unlockAudio = () => {
                        audioToPlay.play().then(() => {
                            // Pulizia listener dopo il successo
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
                if (audio.id === 'sound-snowball') {
                    audio.volume = (gameState.user.masterVolume * gameState.user.musicVolume) * 1.5;
                } else {
                    audio.volume = gameState.user.masterVolume;
                }
            });
        },
        startGameRoutines: startGameRoutines,
        executePrestige: executePrestige,

        // --- NUOVO: Funzione per caricare la cheatboard su richiesta ---
        loadCheatboard: () => {
            // Evita di caricarlo due volte
            if (document.querySelector('script[src="js/cheatboard.js"]')) return;

            fetch('js/cheatboard.js', { method: 'HEAD' })
                .then(response => {
                    if (response.ok) {
                        const script = document.createElement('script');
                        script.src = 'js/cheatboard.js';
                        document.body.appendChild(script);
                    }
                })
                .catch(e => { });
        },

        loadCloudData: (cloudJSON) => {
            if (cloudJSON) {
                try {
                    // 1. Reset dello stato in memoria
                    if (typeof resetGameToDefault === 'function') resetGameToDefault();

                    // 2. Pulizia grafica
                    const achList = document.getElementById('achievement-list');
                    if (achList) achList.innerHTML = '';

                    // 3. Parsing e Decompressione Intelligente
                    // Il cloudJSON arriva dal PHP (json_encoded), quindi è una stringa che contiene i dati.
                    let cloudDataRaw = JSON.parse(cloudJSON);
                    let cloudState;

                    if (typeof cloudDataRaw === 'string') {
                        // Se è una stringa, significa che è il nostro dato compresso
                        const decompressed = LZString.decompressFromUTF16(cloudDataRaw);
                        if (decompressed) {
                            cloudState = JSON.parse(decompressed);
                            console.log("☁️ Cloud: Salvataggio compresso rilevato.");
                        } else {
                            // Caso raro: stringa non compressa ma salvata come stringa
                            cloudState = JSON.parse(cloudDataRaw);
                        }
                    } else {
                        // Se è un oggetto, è un salvataggio vecchio (non compresso)
                        cloudState = cloudDataRaw;
                        console.log("☁️ Cloud: Salvataggio legacy rilevato.");
                    }

                    // Gestione compatibilità cloud (Legacy Teams fix)
                    if (cloudState.buildings && !cloudState.teams) {
                        cloudState.teams = cloudState.buildings;
                        delete cloudState.buildings;
                    }

                    deepMerge(gameState, cloudState);

                    if (!gameState.buildingEnhancements) gameState.buildingEnhancements = {};
                    for (const key in gameData.buildingEnhancements) {
                        // Se nel salvataggio attuale manca questa chiave, creala!
                        if (!gameState.buildingEnhancements[key]) {
                            gameState.buildingEnhancements[key] = { purchased: false };
                            console.log(`[Auto-Fix] Aggiunto potenziamento mancante: ${key}`);
                        }
                    }

                    if (!gameState.skins || !Array.isArray(gameState.skins.unlocked)) {
                        gameState.skins = { current: 'default', unlocked: ['default'] };
                    }
                    const isFuryActive = (gameState.crunchTimeEndTime > Date.now());

                    if (isFuryActive && typeof resumeCrunchTimeEffects === 'function') {
                        console.log("Cloud Sync: Fury Mode rilevata. Ripristino effetti visivi.");
                        resumeCrunchTimeEffects();
                    } else {
                        if (typeof applySkinVisuals === 'function') {
                            applySkinVisuals(gameState.skins.current);
                        }
                    }

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
                    if (typeof updateAmbientVolume === 'function') {
                        updateAmbientVolume();
                    }
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