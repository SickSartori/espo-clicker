document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 0. FUNZIONI HELPER GLOBALI 
    // ==========================================

    // Funzione mancante: Ferma tutti i test audio
    window.stopAllTestAudio = function () {
        document.querySelectorAll('audio, video').forEach(media => {
            // Non fermare la musica di background se non siamo nel mixer
            // Ma per sicurezza nel test, mettiamo in pausa se sta suonando
            if (!media.paused && media.id !== 'sound-bg-music') {
                media.pause();
                media.currentTime = 0;
            }
            // Se è un video di test, nascondilo
            if (media.tagName === 'VIDEO' && media.id.startsWith('video-')) {
                media.style.display = 'none';
            }
        });
    };

    // Funzione mancante: Resetta le icone dei bottoni Play
    window.resetTestButtons = function () {
        document.querySelectorAll('.mixer-test-btn').forEach(btn => {
            btn.classList.remove('playing');
            const icon = btn.querySelector('i');
            if (icon) {
                icon.className = 'fa-solid fa-play';
                icon.style.marginLeft = '2px';
            }
        });
    };

    // LOGICA VISUALIZZA PASSWORD
    document.querySelectorAll('.toggle-pass-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault(); // Evita submit form

            // Trova l'input target
            let input;
            const targetId = btn.getAttribute('data-target');
            if (targetId) {
                input = document.getElementById(targetId);
            } else {
                // Fallback: cerca l'input vicino
                input = btn.closest('.input-group-modern').querySelector('input');
            }

            if (input) {
                // Alterna tipo
                const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
                input.setAttribute('type', type);

                // Alterna icona
                const icon = btn.querySelector('i');
                if (icon) {
                    if (type === 'text') {
                        icon.classList.remove('fa-eye');
                        icon.classList.add('fa-eye-slash');
                    } else {
                        icon.classList.remove('fa-eye-slash');
                        icon.classList.add('fa-eye');
                    }
                }
            }
        });
    });

    // ==========================================
    // 1. RIFERIMENTI DOM PRINCIPALI
    // ==========================================

    // Bottoni Apertura Modali
    const openAchievementsBtn = document.getElementById('open-achievements-btn');
    const openStatsBtn = document.getElementById('open-stats-btn');
    const openSettingsBtn = document.getElementById('open-settings-btn');
    const openLeaderboardBtn = document.getElementById('open-leaderboard-btn');
    const openHelpBtn = document.getElementById('open-help-btn');
    const openSkinsBtn = document.getElementById('open-skins-btn');
    const openAccountBtn = document.getElementById('open-account-btn'); // Dentro Settings

    // Modali
    const achievementsModal = document.getElementById('achievements-modal');
    const statsModal = document.getElementById('stats-modal');
    const settingsModal = document.getElementById('settings-modal');
    const leaderboardModal = document.getElementById('leaderboard-modal');
    const accountModal = document.getElementById('account-modal');
    const loginModal = document.getElementById('login-modal');
    const helpModal = document.getElementById('help-modal');
    const skinsModal = document.getElementById('skins-modal');
    const allModals = document.querySelectorAll('.modal-backdrop');

    // Elementi Interni Settings
    const masterSlider = document.getElementById('master-slider');
    const sfxSlider = document.getElementById('sfx-slider');
    const musicSlider = document.getElementById('music-slider');
    const masterDisplay = document.getElementById('master-vol-display');
    const sfxDisplay = document.getElementById('sfx-vol-display');
    const musicDisplay = document.getElementById('music-vol-display');
    const saveSettingsBtn = document.getElementById('save-settings-btn');

    // Login & Account Elements
    const loginButton = document.getElementById('login-btn');
    const loginInput = document.getElementById('login-username-input');
    const loginPasswordInput = document.getElementById('login-password-input');
    const logoutBtn = document.getElementById('logout-btn');
    const changePassBtn = document.getElementById('change-password-btn');
    const changeUserBtn = document.getElementById('change-username-btn');
    const deleteSaveBtn = document.getElementById('delete-save-btn');
    const currentUsernameDisplay = document.getElementById('current-username-display');
    // Music
    const audio = document.getElementById('bg-music');
    // 1. Aggiungi il riferimento
    const openArcadeBtn = document.getElementById('open-arcade-btn');
    const arcadeModal = document.getElementById('arcade-modal');

    // 2. Aggiungi il listener (nella sezione dove ci sono gli altri btn.addEventListener)
    if (openArcadeBtn) {
        openArcadeBtn.addEventListener('click', () => {
            // Recupera il record salvato
            const Game = window.EspooClicker;
            if (Game) {
                const state = Game.getGameState();
                // Se non esiste ancora l'oggetto, mostra 0
                const highScore = (state.arcadeHighScores && state.arcadeHighScores.snake) ? state.arcadeHighScores.snake : 0;

                // Aggiorna l'HTML
                const scoreDisplay = document.getElementById('arcade-high-score');
                if (scoreDisplay) scoreDisplay.textContent = highScore;
            }

            openModal(arcadeModal);
        });
    }


    // Funzione per tentare il play
    function tryPlayMusic() {
        const playPromise = audio.play();

        if (playPromise !== undefined) {
            playPromise.then(_ => {
                // L'autoplay è partito!
            })
                .catch(error => {
                    // L'autoplay è stato bloccato.
                    console.log("Autoplay bloccato dal browser. Serve interazione.");
                    // Qui potresti mostrare un pulsante "Clicca per riattivare l'audio"
                });
        }
    }

    // Se stavi suonando prima del refresh (salvato in localStorage?), riprova:
    if (localStorage.getItem('musicPlaying') === 'true') {
        tryPlayMusic();
    }

    // ==========================================
    // --- GESTIONE PRESTIGIO / PROMOZIONE ---
    // ==========================================
    const openPrestigeBtn = document.getElementById('open-prestige-hub-btn');
    const btnConfirmPrestige = document.getElementById('btn-confirm-prestige');

    // --- GESTIONE PRESTIGIO ---
    if (openPrestigeBtn) {
        openPrestigeBtn.addEventListener('click', () => {
            if (typeof updatePrestigeVisuals === 'function') updatePrestigeVisuals();
            if (typeof openPrestigeContract === 'function') {
                openPrestigeContract();
            }
        });
    }

    if (btnConfirmPrestige) {
        btnConfirmPrestige.addEventListener('click', () => {
            if (typeof executePrestige === 'function') {
                executePrestige();
            }
        });
    }

    // ==========================================
    // 2. LOGICA MIXER AUDIO AVANZATO
    // ==========================================

    const btnAdvAudio = document.getElementById('open-advanced-audio-btn');
    const modalAdvAudio = document.getElementById('advanced-audio-modal');
    const btnHeaderBack = document.getElementById('header-back-btn');
    const btnHeaderReset = document.getElementById('header-reset-btn');

    // --- FUNZIONE HELPER PER GENERARE LA RIGA HTML ---
    function createMixerRow(id, name, val) {
        const row = document.createElement('div');
        row.className = 'mixer-row';
        const color = val === 0 ? '#7f8c8d' : '#3498db';

        row.innerHTML = `
            <div class="mixer-label" title="${name}">${name}</div>
            <div class="mixer-controls">
                <input type="range" class="mixer-slider" 
                       data-target="${id}" 
                       min="0" max="1" step="0.1" 
                       value="${val}">
                <span class="mixer-value" style="color: ${color};">
                    ${Math.round(val * 100)}%
                </span>
            </div>
            <button class="mixer-test-btn" data-target="${id}" title="Prova Audio">
                <i class="fa-solid fa-play" style="margin-left: 2px;"></i>
            </button>
        `;

        // --- NUOVO: Stop Audio Automatico quando il mouse esce dalla riga ---
        row.addEventListener('mouseleave', () => {
            const btn = row.querySelector('.mixer-test-btn');
            const targetId = btn.getAttribute('data-target');
            const el = document.getElementById(targetId);

            // Se l'elemento esiste e (sta suonando OPPURE il bottone dice che sta suonando)
            if (el && (!el.paused || btn.classList.contains('playing'))) {
                // 1. Ferma l'audio
                el.pause();
                el.currentTime = 0;

                // 2. Resetta graficamente il bottone
                btn.classList.remove('playing');
                const icon = btn.querySelector('i');
                if (icon) {
                    icon.className = 'fa-solid fa-play';
                    icon.style.marginLeft = '2px';
                }

                // 3. Nascondi video se necessario (pulizia extra)
                if (el.tagName === 'VIDEO') {
                    el.style.display = 'none';
                }
            }
        });

        return row;
    }

    function renderAudioMixer() {
        const listAdvAudio = document.getElementById('advanced-audio-list');
        if (!listAdvAudio) return;
        listAdvAudio.innerHTML = '';

        const Game = getGameAPI();
        const assets = gameData.assets;
        const userAudio = Game.getGameState().user.audioCustom;

        // Categorie
        const categories = {
            'ambiente': { title: 'Musica & Ambiente', icon: 'fa-music', items: [] },
            'eventi': { title: 'Video & Eventi', icon: 'fa-film', items: [] },
            'effetti': { title: 'Effetti Sonori', icon: 'fa-volume-high', items: [] }
        };

        const allAssets = { ...assets.sounds, ...assets.videos };

        // Popola categorie
        for (const [key, data] of Object.entries(allAssets)) {
            if (categories[data.category]) {
                categories[data.category].items.push({ key, ...data });
            }
        }

        // Genera HTML
        for (const [catKey, catData] of Object.entries(categories)) {
            if (catData.items.length === 0) continue;

            const groupDiv = document.createElement('div');
            groupDiv.className = 'mixer-category';
            groupDiv.innerHTML = `<div class="mixer-category-title"><i class="fa-solid ${catData.icon}"></i> ${catData.title}</div>`;

            catData.items.forEach(item => {
                // Inizializza volume se manca
                if (userAudio[item.id] === undefined) {
                    userAudio[item.id] = item.defaultVol;
                }
                const row = createMixerRow(item.id, item.name, userAudio[item.id]);
                groupDiv.appendChild(row);
            });

            listAdvAudio.appendChild(groupDiv);
        }

        // Listener Slider (Aggiornamento Tempo Reale)
        listAdvAudio.querySelectorAll('.mixer-slider').forEach(input => {
            input.addEventListener('input', (e) => {
                const targetId = e.target.getAttribute('data-target');
                const newVal = parseFloat(e.target.value);

                Game.getGameState().user.audioCustom[targetId] = newVal;

                // Aggiorna UI percentuale
                const valSpan = e.target.parentElement.querySelector('.mixer-value');
                valSpan.textContent = Math.round(newVal * 100) + '%';
                valSpan.style.color = newVal === 0 ? '#7f8c8d' : '#3498db';

                // Applica volume in tempo reale se sta suonando
                const activeEl = document.getElementById(targetId);
                if (activeEl && !activeEl.paused) {
                    const userVol = Game.getGameState().user;
                    // Determina canale
                    const isMusic = activeEl.classList.contains('music') || targetId.includes('music') || targetId.includes('bluescreen'); // Logica base
                    // Migliore: guarda gameData.assets se possibile, o usa convenzione
                    let channelVol = userVol.sfxVolume;
                    if (targetId === 'sound-bg-music' || targetId === 'sound-snowball' || targetId === 'sound-fury-music' || targetId === 'sound-bluescreen') {
                        channelVol = userVol.musicVolume;
                    }

                    activeEl.volume = Math.max(0, Math.min(1, userVol.masterVolume * channelVol * newVal));
                }
            });
        });

        // Listener Test Buttons
        listAdvAudio.querySelectorAll('.mixer-test-btn').forEach(btn => {
            btn.addEventListener('click', () => handleTestAudioClick(btn));
        });
    }

    function handleTestAudioClick(btn) {
        const targetId = btn.getAttribute('data-target');
        const icon = btn.querySelector('i');
        const el = document.getElementById(targetId);

        if (!el) return;

        // Se sta già suonando, ferma
        if (!el.paused && !el.ended) {
            el.pause();
            el.currentTime = 0;
            btn.classList.remove('playing');
            icon.className = 'fa-solid fa-play';
            icon.style.marginLeft = '2px';
            return;
        }

        // Ferma altri test
        window.stopAllTestAudio();
        window.resetTestButtons();

        const Game = getGameAPI();
        const userVol = Game.getGameState().user;

        // Calcola Volume Reale
        let channelVol = userVol.sfxVolume;
        if (targetId === 'sound-bg-music' || targetId === 'sound-snowball' || targetId === 'sound-fury-music' || targetId === 'sound-bluescreen' || targetId.includes('video')) {
            channelVol = userVol.musicVolume;
        }

        const customVal = Game.getGameState().user.audioCustom[targetId];
        const finalVol = Math.max(0, Math.min(1, userVol.masterVolume * channelVol * customVal));

        // Setup Video (se necessario)
        if (el.tagName === 'VIDEO') {
            el.style.display = 'block';
            el.style.zIndex = '99999'; // Sopra al modale per vederlo, o nascondilo e senti solo audio
            // Per il test mixer, forse meglio sentire solo l'audio o mostrare una preview?
            // Per ora lo lasciamo hidden nel CSS base o lo mostriamo
            el.style.display = 'none'; // Sentiamo solo l'audio per il test
        }

        el.volume = finalVol;
        el.currentTime = 0;

        el.play().then(() => {
            btn.classList.add('playing');
            icon.className = 'fa-solid fa-stop';
            icon.style.marginLeft = '0';

            // Auto-reset a fine traccia
            el.onended = () => {
                btn.classList.remove('playing');
                icon.className = 'fa-solid fa-play';
                icon.style.marginLeft = '2px';
            };
        }).catch(e => {
            // Ignora l'errore se è stato causato da una pausa improvvisa (AbortError)
            if (e.name !== 'AbortError') {
                console.error("Errore playback test:", e);
            }
        });
    }

    if (btnAdvAudio) {
        btnAdvAudio.addEventListener('click', () => {
            // Salva lo stato attuale (es. se c'è Espo Fury attivo)
            if (window.currentActiveEvent !== 'Audio Mixer') {
                window.preMixerEvent = window.currentActiveEvent;
            }
            window.currentActiveEvent = 'Audio Mixer';

            // Chiudi settings e apri Mixer
            if (settingsModal) settingsModal.style.display = 'none';
            if (modalAdvAudio) modalAdvAudio.style.display = 'flex';

            // STOP TOTALE: Silenzia tutto per il test
            document.querySelectorAll('audio, video').forEach(el => {
                if (!el.paused) {
                    el.pause();
                    // Resetta solo se non è la bg-music (per riprenderla dopo se serve)
                    // ma per sicurezza nel mixer vogliamo silenzio, quindi ok pausa.
                    if (el.id !== 'sound-bg-music' && el.id !== 'sound-snowball') {
                        el.currentTime = 0;
                    }
                }
            });

            // Genera interfaccia
            renderAudioMixer();
        });
    }
    if (btnHeaderBack) {
        btnHeaderBack.addEventListener('click', () => {
            // Chiudi Mixer
            if (modalAdvAudio) modalAdvAudio.style.display = 'none';

            // Riapri Settings
            if (settingsModal) settingsModal.style.display = 'flex';

            // Ferma test
            window.stopAllTestAudio();
            window.resetTestButtons();

            // 6. RIPRISTINA LO STATO PRECEDENTE
            window.currentActiveEvent = window.preMixerEvent || null;
            window.preMixerEvent = null;

            if (typeof AudioManager !== 'undefined' && AudioManager.updateAmbience) {
                AudioManager.updateAmbience();
            }

            // 7. SMART RESUME (Fallback per musica background standard)
            if (window.EspooClicker && typeof window.EspooClicker.tryStartAudio === 'function') {
                window.EspooClicker.tryStartAudio();
            }
        });
    }

    if (btnHeaderReset) {
        btnHeaderReset.addEventListener('click', () => {
            if (confirm(gameData.texts.dialogs.audioResetConfirm)) {
                const Game = window.EspooClicker;
                if (!Game) return;

                const assets = gameData.assets;
                // Unisci suoni e video per resettarli tutti
                const allAssets = { ...assets.sounds, ...assets.videos };

                // Ripristina i valori nel salvataggio usando il 'defaultVol' di game-data
                for (const [key, data] of Object.entries(allAssets)) {
                    if (data.defaultVol !== undefined) {
                        Game.getGameState().user.audioCustom[data.id] = data.defaultVol;
                    }
                }

                Game.saveGame();
                renderAudioMixer(); // Ridisegna gli slider con i nuovi valori

                // Aggiorna il volume reale del gioco immediatamente
                if (typeof updateAmbientVolume === 'function') updateAmbientVolume();

                Game.showToast(gameData.texts.toasts.audioReset, "info");
            }
        });
    }

    // ==========================================
    // 3. GESTIONE MODALI STANDARD
    // ==========================================

    function getGameAPI() { return window.EspooClicker || null; }
    function openModal(modal) {
        if (modal) {
            // 1. Prepara lo stato iniziale
            modal.style.display = 'flex';
            modal.style.opacity = 0;

            const content = modal.querySelector('.modal-content');

            // 2. Animazione GSAP
            if (content) {
                gsap.fromTo(content,
                    { scale: 0.8, opacity: 0, y: 20 },
                    { scale: 1, opacity: 1, y: 0, duration: 0.4, ease: "back.out(1.7)" }
                );
                gsap.to(modal, { opacity: 1, duration: 0.3 });
            } else {
                modal.style.opacity = 1;
            }

            document.body.classList.add('modal-open');

            // Suona SOLO se il modale NON è quello di login
            if (modal.id !== 'login-modal') {
                if (typeof AudioManager !== 'undefined') {
                    AudioManager.playClickEffect();
                } else if (typeof playSound === 'function') {
                    playSound('sound-click');
                }
            }
        }
    }

    function closeModal(modal) {
        if (modal) {
            const content = modal.querySelector('.modal-content');

            // Animazione di uscita (veloce)
            if (content) {
                gsap.to(content, {
                    scale: 0.8,
                    opacity: 0,
                    duration: 0.2,
                    ease: "power2.in",
                    onComplete: () => {
                        modal.style.display = 'none';
                        finishClose();
                    }
                });
                gsap.to(modal, { opacity: 0, duration: 0.2 });
            } else {
                modal.style.display = 'none';
                finishClose();
            }

            function finishClose() {
                let anyOpen = false;
                document.querySelectorAll('.modal-backdrop').forEach(m => {
                    if (m.style.display === 'flex' && m !== modal && m.style.opacity !== '0') anyOpen = true;
                });

                if (!anyOpen) {
                    document.body.classList.remove('modal-open');
                }
            }
        }
    }

    if (openAchievementsBtn) openAchievementsBtn.addEventListener('click', () => {
        if (typeof updateAchievementsUI === 'function') updateAchievementsUI();
        openModal(achievementsModal);
    });

    if (openHelpBtn) openHelpBtn.addEventListener('click', () => openModal(helpModal));
    if (openSkinsBtn) openSkinsBtn.addEventListener('click', () => {
        if (typeof updateSkinsUI === 'function') updateSkinsUI();
        openModal(skinsModal);
    });

    if (openStatsBtn) openStatsBtn.addEventListener('click', () => {
        const Game = getGameAPI();
        if (Game) Game.updateStatsUI();
        openModal(statsModal);
    });

    if (openSettingsBtn) openSettingsBtn.addEventListener('click', openSettingsModal);

    if (openLeaderboardBtn) openLeaderboardBtn.addEventListener('click', () => {
        const Game = getGameAPI();
        if (Game && Game.loadLeaderboard) Game.loadLeaderboard();
        openModal(leaderboardModal);
    });

    // RIFERIMENTO BOTTONE CAMBIO SKIN RAPIDO
    if (openAccountBtn) openAccountBtn.addEventListener('click', () => {
        closeModal(settingsModal);

        // --- LOGICA AGGIORNAMENTO PROFILO ---
        const Game = getGameAPI();
        if (Game) {
            const state = Game.getGameState();
            const user = state.user;

            // Aggiorna solo il nome utente nell'header
            const displayUser = document.getElementById('display-username-large');
            if (displayUser) {
                displayUser.textContent = user.username || "Giocatore";
            }
        }
        // -------------------------------------

        openModal(accountModal);
    });

    allModals.forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-close-btn')) {
                modal.style.display = 'none';
            }
        });
    });

    function openSettingsModal() {
        const Game = getGameAPI();
        if (!Game) return;
        const gameState = Game.getGameState();
        const userSettings = gameState.user;

        // Aggiornamento UI esistente (Username e Slider)
        if (currentUsernameDisplay) currentUsernameDisplay.textContent = userSettings.username;
        if (masterSlider) {
            masterSlider.value = userSettings.masterVolume;
            if (masterDisplay) masterDisplay.textContent = Math.round(userSettings.masterVolume * 100);
        }

        const oldMusicSelect = document.getElementById('bg-music-select');
        const lockMsg = document.getElementById('bg-music-lock-msg');

        if (oldMusicSelect) {
            // 1. Inizializza la preferenza se manca (per salvataggi vecchi)
            if (!userSettings.bgMusicSelection) userSettings.bgMusicSelection = 'sound-bg-music';

            // 2. Controlla se la skin attuale FORZA la musica
            const currentSkinId = gameState.skins.current;
            const currentSkinData = gameData.skins[currentSkinId];
            const isThemeLocked = currentSkinData && currentSkinData.themeConfig && currentSkinData.themeConfig.specialMusic;

            // 3. Crea un NUOVO elemento select pulito (clone superficiale per rimuovere listener vecchi)
            const newSelect = oldMusicSelect.cloneNode(false); // false = non copiare le option vecchie

            // Gestione UI Blocco
            newSelect.disabled = isThemeLocked;
            newSelect.style.opacity = isThemeLocked ? '0.5' : '1';
            if (lockMsg) lockMsg.style.display = isThemeLocked ? 'block' : 'none';

            // 4. Mappatura Sblocchi (Definizione regole)
            const musicUnlockMap = {
                'sound-bg-music': null,
                'sound-bg-music-v2': null,
                'sound-bg-music-v3': null,
                'sound-bg-bit': 'espobit',
                'sound-snowball': 'christmas',
                'sound-bg-music-super': 'superespo'
            };

            const sounds = gameData.assets.sounds;
            const excludedTracks = ['sound-bluescreen', 'sound-matrix', 'sound-fury-music', 'sound-star'];

            // 5. Popola le opzioni
            for (const [key, sound] of Object.entries(sounds)) {
                if (sound.type === 'music' && sound.category === 'ambiente' && !excludedTracks.includes(sound.id)) {

                    const requiredSkin = musicUnlockMap[sound.id];
                    const isUnlocked = !requiredSkin || gameState.skins.unlocked.includes(requiredSkin);

                    if (isUnlocked) {
                        const option = document.createElement('option');
                        option.value = sound.id;
                        option.textContent = sound.name;

                        // Seleziona quella salvata
                        if (sound.id === userSettings.bgMusicSelection) {
                            option.selected = true;
                        }
                        newSelect.appendChild(option);
                    }
                }
            }

            // Se bloccato dal tema, aggiungi l'opzione forzata visuale
            if (isThemeLocked) {
                const forcedId = currentSkinData.themeConfig.specialMusic;
                if (!newSelect.querySelector(`option[value="${forcedId}"]`)) {
                    // Cerca il nome del suono forzato
                    let forcedName = "Tema Skin";
                    for (const k in sounds) { if (sounds[k].id === forcedId) forcedName = sounds[k].name; }

                    const option = document.createElement('option');
                    option.value = forcedId;
                    option.textContent = forcedName + " (Bloccato)";
                    newSelect.appendChild(option);
                }
                newSelect.value = forcedId;
            }

            // 6. Listener Aggiornato (Usa Game.getGameState() direttamente per sicurezza)
            newSelect.addEventListener('change', (e) => {
                const val = e.target.value;
                // Aggiorna lo stato globale
                Game.getGameState().user.bgMusicSelection = val;

                // Applica subito l'audio
                if (typeof AudioManager !== 'undefined') AudioManager.updateAmbience();

                // Salva
                Game.saveGame();
            });

            // 7. Sostituisci il vecchio select nel DOM con quello nuovo
            oldMusicSelect.parentNode.replaceChild(newSelect, oldMusicSelect);
        }

        openModal(settingsModal);
    }

    function setupAudioControl(slider, display, key, isMusic = false) {
        if (!slider) return;
        const Game = window.EspooClicker;
        if (!Game) return;

        slider.value = Game.getGameState().user[key];
        if (display) display.textContent = Math.round(slider.value * 100);

        slider.addEventListener('input', () => {
            const val = parseFloat(slider.value);
            Game.getGameState().user[key] = val;
            if (display) display.textContent = Math.round(val * 100);
            if (isMusic || key === 'masterVolume') {
                if (typeof updateAmbientVolume === 'function') updateAmbientVolume();
            }
        });
    }

    function initModalBindings() {
        const Game = window.EspooClicker;
        if (!Game) return;

        // Setup Slider Audio
        setupAudioControl(masterSlider, masterDisplay, 'masterVolume');
        setupAudioControl(sfxSlider, sfxDisplay, 'sfxVolume');
        setupAudioControl(musicSlider, musicDisplay, 'musicVolume', true);

        // Auto-Login da sessione
        const sessUser = sessionStorage.getItem('espooUser');
        const sessPass = sessionStorage.getItem('espooPass');
        if (sessUser && sessPass) {
            loginInput.value = sessUser;
            loginPasswordInput.value = sessPass;
            loginButton.click();
        } else {
            openModal(loginModal);
        }
        
        console.log("✅ Modals.js inizializzato via Evento.");
    }

    // Logica ibrida: Se il gioco è già pronto, esegui subito. Altrimenti aspetta l'evento.
    if (window.EspooClicker) {
        initModalBindings();
    } else {
        document.addEventListener('EspoGameReady', initModalBindings);
    }

    if (loginButton) loginButton.addEventListener('click', handleLogin);
    if (logoutBtn) logoutBtn.addEventListener('click', () => {
        if (confirm(gameData.texts.dialogs.logout)) {
            sessionStorage.clear();
            localStorage.removeItem('espotoolClickerSaveV8');
            localStorage.removeItem('espotoolClickerSaveV8_Backup');
            location.reload();
        }
    });

    // Handler pulsanti Account (change user/pass/delete)
    if (changePassBtn) changePassBtn.addEventListener('click', async () => {
        const Game = getGameAPI();
        const oldPass = document.getElementById('old-password-input').value;
        const newPass = document.getElementById('new-password-input').value;
        if (!oldPass || !newPass) { alert(gameData.texts.dialogs.fillFields); return; }

        try {
            const res = await fetch('php/change_password.php', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: Game.getGameState().user.username, oldPassword: oldPass, newPassword: newPass })
            });
            const data = await res.json();
            if (data.status === 'success') {
                Game.showToast(gameData.texts.toasts.passChanged, "success");
                Game.setPassword(newPass);	// Aggiorno la password per le varie funzioni di salvataggio
                sessionStorage.setItem('espooPass', newPass); // Aggiorna sessione
            } else {
                alert(data.message);
            }
        } catch (e) { console.error(e); }
    });

    if (changeUserBtn) changeUserBtn.addEventListener('click', async () => {
        const Game = getGameAPI();
        const newName = document.getElementById('new-username-input').value;
        const password = prompt(gameData.texts.dialogs.confirmPass);
        if (!newName || !password) return;

        try {
            const res = await fetch('php/change_username.php', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: Game.getGameState().user.username, password: password, newUsername: newName })
            });
            const data = await res.json();
            if (data.status === 'success') {
                Game.getGameState().user.username = newName;
                sessionStorage.setItem('espooUser', newName);
                if (currentUsernameDisplay) currentUsernameDisplay.textContent = newName;
                Game.showToast(gameData.texts.toasts.nameChanged, "success");
                Game.saveGame();
            } else {
                alert(data.message);
            }
        } catch (e) { console.error(e); }
    });

    if (deleteSaveBtn) deleteSaveBtn.addEventListener('click', async () => {
        const password = document.getElementById('danger-zone-password').value;
        if (!password) { alert(gameData.texts.dialogs.enterPass); return; }
        if (!confirm("SEI SICURO? Questa azione è irreversibile e cancellerà tutto.")) return;

        const Game = getGameAPI();
        try {
            const res = await fetch('php/delete_user.php', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: Game.getGameState().user.username, password: password })
            });
            const data = await res.json();
            if (data.status === 'success') {
                // Impedisci il salvataggio automatico alla chiusura
                Game.getGameState().isDeleting = true;


                alert("Account eliminato. Addio!");
                sessionStorage.clear();
                localStorage.clear(); // Pulisce tutto il browser
                localStorage.removeItem('espotoolClickerSaveV8'); // Doppia sicurezza
                location.reload();
            } else {
                alert(data.message);
            }
        } catch (e) { console.error(e); }
    });
    const resetProgressBtn = document.getElementById('reset-progress-btn');
    if (resetProgressBtn) {
        resetProgressBtn.addEventListener('click', async () => {
            const password = document.getElementById('danger-zone-password').value;
            if (!password) { alert(gameData.texts.dialogs.enterPass); return; }
            if (!confirm("ATTENZIONE: Questo resetterà tutti i progressi al punto di partenza (Hard Reset). I token Lab e le Skin verranno persi. Continuare?")) return;

            const Game = getGameAPI();
            try {
                const res = await fetch('php/reset_progress.php', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: Game.getGameState().user.username, password: password })
                });
                const data = await res.json();
                if (data.status === 'success') {
                    // Evita che il salvataggio automatico sovrascriva il reset
                    Game.getGameState().isDeleting = true;

                    alert("Progressi resettati con successo.");

                    localStorage.removeItem('espotoolClickerSaveV8');
                    localStorage.removeItem('espotoolClickerSaveV8_Backup');
                    // ----------------------------------------------

                    location.reload();
                } else {
                    alert(data.message);
                }
            } catch (e) { console.error(e); }
        });
    }

    if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', () => {
        const Game = getGameAPI();
        if (Game) {
            Game.saveGame();
            Game.showToast(gameData.texts.toasts.settingsSaved);
        }
        closeModal(settingsModal);
    });

    async function handleLogin() {
        const Game = getGameAPI();
        if (!Game) return;
        const u = loginInput.value;
        const p = loginPasswordInput.value;
        if (!u || !p) return;

        loginButton.disabled = true;
        try {
            const res = await fetch('php/login_register.php', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u, password: p })
            });
            const data = await res.json();
            if (data.status === 'success') {
                sessionStorage.setItem('espooUser', u);
                sessionStorage.setItem('espooPass', p);
                Game.setPassword(p);

                if (data.save_data) Game.loadCloudData(data.save_data);
                else {
                    if (typeof resetGameToDefault === 'function') resetGameToDefault();
                    localStorage.removeItem('espotoolClickerSaveV8');
                    Game.getGameState().user.username = u;
                    Game.saveGame();
                }

                closeModal(loginModal);
                Game.startGameRoutines();

                // 1. PRIMA applica i volumi dal salvataggio ai tag HTML reali
                if (typeof window.updateAmbientVolume === 'function') {
                    window.updateAmbientVolume();
                }

                // 2. POI aggiorna gli slider visivi (perché non sembrino rotti se apri le opzioni)
                const userVol = Game.getGameState().user;
                if (masterSlider) {
                    masterSlider.value = userVol.masterVolume;
                    if (masterDisplay) masterDisplay.textContent = Math.round(userVol.masterVolume * 100);
                }
                if (sfxSlider) {
                    sfxSlider.value = userVol.sfxVolume;
                    if (sfxDisplay) sfxDisplay.textContent = Math.round(userVol.sfxVolume * 100);
                }
                if (musicSlider) {
                    musicSlider.value = userVol.musicVolume;
                    if (musicDisplay) musicDisplay.textContent = Math.round(userVol.musicVolume * 100);
                }

                // 3. INFINE fai partire l'audio (ora che i volumi sono corretti)
                Game.tryStartAudio();

                Game.showToast(gameData.texts.toasts.welcome + " " + u);
            } else {
                alert(data.message);
            }
        } catch (e) { console.error(e); }
        loginButton.disabled = false;
    }

    function setupEnterKey(inputElement, actionBtn) {
        if (inputElement) {
            inputElement.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); actionBtn.click(); }
            });
        }
    }
    setupEnterKey(loginInput, loginButton);
    setupEnterKey(loginPasswordInput, loginButton);
});