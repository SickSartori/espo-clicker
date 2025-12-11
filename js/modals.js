document.addEventListener('DOMContentLoaded', () => {

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

    // ==========================================
    // --- GESTIONE PRESTIGIO / PROMOZIONE ---
    // ==========================================
    const openPrestigeBtn = document.getElementById('open-prestige-hub-btn');
    const btnConfirmPrestige = document.getElementById('btn-confirm-prestige');

    // 1. Il bottone apre DIRETTAMENTE il contratto finale (saltando l'hub)
    if (openPrestigeBtn) {
        openPrestigeBtn.addEventListener('click', () => {
            // Aggiorna visuali se necessario
            if (typeof updatePrestigeVisuals === 'function') updatePrestigeVisuals();

            // Chiama la funzione logica che calcola i guadagni e apre il modale del contratto
            // (Questa funzione è definita in game-logic.js)
            if (typeof openPrestigeContract === 'function') {
                openPrestigeContract();
            }
        });
    }

    // 2. Conferma/Firma il Contratto (Esegue il Reset)
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
    const listAdvAudio = document.getElementById('advanced-audio-list');

    // NUOVI RIFERIMENTI HEADER
    const btnHeaderBack = document.getElementById('header-back-btn');
    const btnHeaderReset = document.getElementById('header-reset-btn');

    // Variabile per ricordare i suoni messi in pausa
    let soundsPausedByMixer = [];

    // Mappa ID Logico -> ID HTML Reale
    const mediaMap = {
        'video-rick': 'rick-roll-video',
        'video-ricardo': 'ricardo-video'
    };

    // Gruppi UI
    const mixerGroups = {
        'ambiente': { title: 'Musica & Ambiente', icon: 'fa-music', ids: ['sound-bg-music', 'sound-snowball', 'sound-fire', 'sound-bluescreen'] },
        'eventi': { title: 'Video & Eventi', icon: 'fa-film', ids: ['video-rick', 'video-ricardo', 'sound-merry', 'sound-golden'] },
        'effetti': { title: 'Effetti Sonori', icon: 'fa-volume-high', ids: ['sound-click', 'sound-buy', 'sound-achievement', 'sound-prestige', 'sound-error', 'sound-hover'] }
    };

    const audioLabels = {
        'sound-click': 'Click', 'sound-buy': 'Shop', 'sound-achievement': 'Obiettivo',
        'sound-error': 'Errore', 'sound-golden': 'Golden Bug', 'sound-prestige': 'Prestigio',
        'sound-hover': 'Hover', 'sound-bluescreen': 'Loop 404', 'sound-fire': 'Loop Fuoco',
        'sound-snowball': 'Loop Neve', 'sound-bg-music': 'Musica Base', 'sound-merry': 'Jingle Natale',
        'video-rick': 'Video: Rick', 'video-ricardo': 'Video: Ricardo'
    };

    // --- RENDERIZZA MIXER ---
    function renderAudioMixer() {
        if (!listAdvAudio) return;
        listAdvAudio.innerHTML = '';

        const Game = getGameAPI();
        if (!Game.getGameState().user.audioCustom) {
            // Auto-repair se mancano i dati
            Game.getGameState().user.audioCustom = {
                'sound-click': 0.4, 'sound-buy': 0.4, 'sound-achievement': 0.4,
                'sound-bluescreen': 0.3, 'sound-snowball': 0.2, 'sound-bg-music': 0.05,
                'sound-fire': 0.5, 'sound-error': 1.0, 'sound-golden': 1.0,
                'sound-prestige': 1.0, 'sound-hover': 1.0, 'sound-merry': 1.0,
                'video-rick': 0.5, 'video-ricardo': 0.5
            };
        }

        const customAudio = Game.getGameState().user.audioCustom;

        // Crea Riga
        const createMixerRow = (id) => {
            const val = customAudio[id];
            if (val === undefined) return null;

            const row = document.createElement('div');
            row.className = 'mixer-row';
            let percColor = val > 1 ? '#e74c3c' : (val === 0 ? '#7f8c8d' : '#3498db');

            row.innerHTML = `
                <div class="mixer-label" title="${audioLabels[id]}">${audioLabels[id]}</div>
                <div class="mixer-controls">
                    <input type="range" class="mixer-slider" data-target="${id}" min="0" max="1" step="0.01" value="${val}">
                    <span class="mixer-value" style="color: ${percColor};">${Math.round(val * 100)}%</span>
                </div>
                <button class="mixer-test-btn" data-target="${id}" title="Prova Audio">
                    <i class="fa-solid fa-play" style="font-size: 0.8rem; margin-left: 2px;"></i>
                </button>
            `;
            return row;
        };

        // Crea Gruppi
        for (const [groupKey, groupData] of Object.entries(mixerGroups)) {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'mixer-category';
            groupDiv.innerHTML = `<div class="mixer-category-title"><i class="fa-solid ${groupData.icon}"></i> ${groupData.title}</div>`;

            let hasItems = false;
            groupData.ids.forEach(audioId => {
                const row = createMixerRow(audioId);
                if (row) {
                    groupDiv.appendChild(row);
                    hasItems = true;
                }
            });
            if (hasItems) listAdvAudio.appendChild(groupDiv);
        }

        // Listener Sliders (Salvataggio Live)
        listAdvAudio.querySelectorAll('.mixer-slider').forEach(input => {
            input.addEventListener('input', (e) => {
                const targetId = e.target.getAttribute('data-target');
                const newVal = parseFloat(e.target.value);

                // 1. Aggiorna lo stato del gioco
                Game.getGameState().user.audioCustom[targetId] = newVal;

                // 2. Aggiorna UI Percentuale
                const valSpan = e.target.parentElement.querySelector('.mixer-value');
                valSpan.textContent = Math.round(newVal * 100) + '%';
                valSpan.style.color = newVal === 0 ? '#7f8c8d' : '#3498db';

                // 3. FIX CRITICO: Aggiorna il volume SOLO dell'elemento che sta suonando ORA (Test)
                // NON chiamiamo più updateAmbientVolume() qui per evitare conflitti!
                const elementId = mediaMap[targetId] || targetId;
                const activeEl = document.getElementById(elementId);

                if (activeEl && !activeEl.paused) {
                    const userVol = Game.getGameState().user;
                    // Determina il canale
                    const channelVol = targetId.startsWith('video-') || targetId === 'sound-bg-music'
                        ? userVol.musicVolume
                        : userVol.sfxVolume;

                    // Calcola e applica subito
                    const liveVol = userVol.masterVolume * channelVol * newVal;
                    activeEl.volume = Math.max(0, Math.min(1, liveVol));
                }
            });
        });

        // Listener Test
        listAdvAudio.querySelectorAll('.mixer-test-btn').forEach(btn => {
            btn.addEventListener('click', () => handleTestAudioClick(btn));
        });
    }

    // --- FUNZIONE DI TEST ---
    function handleTestAudioClick(btn) {
        const targetId = btn.getAttribute('data-target');
        const icon = btn.querySelector('i');
        const Game = getGameAPI();
        const userVol = Game.getGameState().user;
        const elementId = mediaMap[targetId] || targetId;
        const el = document.getElementById(elementId);

        if (!el) return;

        if (!el.paused && !el.ended) {
            el.pause();
            el.currentTime = 0;
            resetTestButtons();
            return;
        }

        stopAllTestAudio();
        resetTestButtons();

        // Lazy Load Video
        if (el.tagName === 'VIDEO' && !el.getAttribute('src')) {
            const src = el.getAttribute('data-src');
            if (src) { el.setAttribute('src', src); el.load(); }
        }

        // Calcolo Volume per il TEST
        const channelVol = targetId.startsWith('video-') || targetId === 'sound-bg-music'
            ? userVol.musicVolume : userVol.sfxVolume;

        // Recupera valore slider live
        const customVal = Game.getGameState().user.audioCustom[targetId];
        const testVol = userVol.masterVolume * channelVol * customVal;

        el.volume = testVol;
        el.currentTime = 0;
        if (targetId.startsWith('video-')) el.style.display = 'none';

        el.play().then(() => {
            btn.classList.add('playing');
            icon.className = 'fa-solid fa-stop';
            icon.style.marginLeft = '0';
            el.onended = () => {
                btn.classList.remove('playing');
                icon.className = 'fa-solid fa-play';
                icon.style.marginLeft = '2px';
            };
            if (el.loop) {
                setTimeout(() => { if (!el.paused) { el.pause(); el.onended(); } }, 3000);
            }
        }).catch(err => { });
    }

    function resetTestButtons() {
        document.querySelectorAll('.mixer-test-btn').forEach(b => {
            b.classList.remove('playing');
            const i = b.querySelector('i');
            if (i) { i.className = 'fa-solid fa-play'; i.style.marginLeft = '2px'; }
        });
    }

    function stopAllTestAudio() {
        document.querySelectorAll('audio, video').forEach(media => {
            // Non fermiamo i suoni originali (che sono nell'array paused), ma solo quelli di test
            if (!media.paused && !soundsPausedByMixer.includes(media)) media.pause();
        });
    }

    // --- NAVIGAZIONE E STATI ---

    // APRI
    if (btnAdvAudio) {
        btnAdvAudio.addEventListener('click', () => {
            soundsPausedByMixer = [];
            document.querySelectorAll('audio, video').forEach(media => {
                if (!media.paused && !media.ended) {
                    soundsPausedByMixer.push(media);
                    media.pause();
                }
            });

            if (!window.currentActiveEvent) window.currentActiveEvent = 'Audio Mixer';

            renderAudioMixer();
            if (settingsModal) settingsModal.style.display = 'none';
            if (modalAdvAudio) modalAdvAudio.style.display = 'flex';
        });
    }

    function closeMixerAndResume() {
        // A. Ferma eventuali suoni di TEST
        document.querySelectorAll('audio, video').forEach(media => {
            if (!media.paused && !soundsPausedByMixer.includes(media)) {
                media.pause();
                media.currentTime = 0;
            }
        });
        resetTestButtons();

        // B. Rilascia il Semaforo
        if (window.currentActiveEvent === 'Audio Mixer') {
            window.currentActiveEvent = null;
        }

        // C. Riprendi i suoni originali AGGIORNANDO IL VOLUME

        // 1. Forza l'aggiornamento dei volumi ORA, prima di riprodurre
        if (typeof updateAmbientVolume === 'function') updateAmbientVolume();

        // 2. Riproduci
        soundsPausedByMixer.forEach(media => {
            // Controlla se il volume aggiornato è > 0 prima di riprodurre
            // Questo evita di riprodurre tracce messe a 0% nel mixer
            if (media.volume > 0 && media.paused) {
                media.play().catch(e => { });
            }
        });

        soundsPausedByMixer = []; // Pulisci array

        // D. UI
        if (modalAdvAudio) modalAdvAudio.style.display = 'none';
    }

    // INDIETRO (Nel nuovo header)
    if (btnHeaderBack) {
        btnHeaderBack.addEventListener('click', () => {
            closeMixerAndResume();
            if (settingsModal) settingsModal.style.display = 'flex';
        });
    }

    // RESET (Nel nuovo header)
    if (btnHeaderReset) {
        btnHeaderReset.addEventListener('click', () => {
            if (confirm("Ripristinare i volumi predefiniti?")) {
                const Game = getGameAPI();
                Game.getGameState().user.audioCustom = {
                    'sound-click': 0.4, 'sound-buy': 0.4, 'sound-achievement': 0.4,
                    'sound-bluescreen': 0.3, 'sound-snowball': 0.2, 'sound-bg-music': 0.05,
                    'sound-fire': 0.5, 'sound-error': 1.0, 'sound-golden': 1.0,
                    'sound-prestige': 1.0, 'sound-hover': 1.0, 'sound-merry': 1.0,
                    'video-rick': 0.5, 'video-ricardo': 0.5
                };
                renderAudioMixer();
                if (typeof updateAmbientVolume === 'function') updateAmbientVolume();
                Game.showToast("Volumi ripristinati.", "info");
            }
        });
    }

    // ==========================================
    // 3. GESTIONE MODALI STANDARD
    // ==========================================

    function getGameAPI() { return window.EspooClicker || null; }
    function openModal(modal) { if (modal) modal.style.display = 'flex'; }
    function closeModal(modal) { if (modal) modal.style.display = 'none'; }

    // Achievements
    if (openAchievementsBtn) openAchievementsBtn.addEventListener('click', () => {
        if (typeof updateAchievementsUI === 'function') updateAchievementsUI();
        openModal(achievementsModal);
    });

    // Help & Skins
    if (openHelpBtn) openHelpBtn.addEventListener('click', () => openModal(helpModal));
    if (openSkinsBtn) openSkinsBtn.addEventListener('click', () => {
        if (typeof updateSkinsUI === 'function') updateSkinsUI();
        openModal(skinsModal);
    });

    // Stats
    if (openStatsBtn) openStatsBtn.addEventListener('click', () => {
        const Game = getGameAPI();
        if (Game) Game.updateStatsUI();
        openModal(statsModal);
    });

    // Settings (Apertura)
    if (openSettingsBtn) openSettingsBtn.addEventListener('click', openSettingsModal);

    // Leaderboard
    if (openLeaderboardBtn) openLeaderboardBtn.addEventListener('click', () => {
        const Game = getGameAPI();
        if (Game && Game.loadLeaderboard) Game.loadLeaderboard();
        openModal(leaderboardModal);
    });

    // Account (Da Settings)
    if (openAccountBtn) openAccountBtn.addEventListener('click', () => {
        closeModal(settingsModal);
        openModal(accountModal);
    });

    // Chiusura Globale (X buttons)
    allModals.forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-close-btn')) {
                modal.style.display = 'none';
            }
        });
    });

    // ==========================================
    // 4. FUNZIONI DI SUPPORTO & LOGIN
    // ==========================================

    function openSettingsModal() {
        const Game = getGameAPI();
        if (!Game) return;
        const userSettings = Game.getGameState().user;
        if (currentUsernameDisplay) currentUsernameDisplay.textContent = userSettings.username;
        if (masterSlider) {
            masterSlider.value = userSettings.masterVolume;
            masterDisplay.textContent = Math.round(userSettings.masterVolume * 100);
        }
        openModal(settingsModal);
    }

    // Helper per Slider Base (Settings)
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

            // Aggiornamento live per master o musica
            if (isMusic || key === 'masterVolume') {
                if (typeof updateAmbientVolume === 'function') updateAmbientVolume();
            }
        });
    }

    // Inizializzazione Ritardata (aspetta che window.EspooClicker sia pronto)
    const initInterval = setInterval(() => {
        if (window.EspooClicker) {
            clearInterval(initInterval);
            setupAudioControl(masterSlider, masterDisplay, 'masterVolume');
            setupAudioControl(sfxSlider, sfxDisplay, 'sfxVolume');
            setupAudioControl(musicSlider, musicDisplay, 'musicVolume', true);

            // Check Auto Login
            const sessUser = sessionStorage.getItem('espooUser');
            const sessPass = sessionStorage.getItem('espooPass');
            if (sessUser && sessPass) {
                loginInput.value = sessUser;
                loginPasswordInput.value = sessPass;
                loginButton.click();
            } else {
                openModal(loginModal);
            }
        }
    }, 100);

    // Handlers Account
    if (loginButton) loginButton.addEventListener('click', handleLogin);
    if (logoutBtn) logoutBtn.addEventListener('click', () => {
        if (confirm("Logout?")) {
            sessionStorage.clear();
            localStorage.removeItem('espotoolClickerSaveV8');
            location.reload();
        }
    });

    // ... Handler pulsanti Change User/Pass/Delete omessi per brevità, sono identici a prima ...
    // Se servono completi, li trovi nella versione precedente del file. 
    // Qui ho incluso le parti logiche per audio e login.

    if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', () => {
        const Game = getGameAPI();
        if (Game) {
            Game.saveGame();
            Game.showToast("Preferenze Salvate");
        }
        closeModal(settingsModal);
    });

    // Funzione Login
    async function handleLogin() {
        const Game = getGameAPI();
        if (!Game) return;
        const u = loginInput.value;
        const p = loginPasswordInput.value;
        if (!u || !p) return;

        loginButton.disabled = true;
        try {
            const res = await fetch('./php/login_register.php', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u, password: p })
            });
            const data = await res.json();
            if (data.status === 'success') {
                sessionStorage.setItem('espooUser', u);
                sessionStorage.setItem('espooPass', p);
                Game.setPassword(p);
                if (data.save_data) Game.loadCloudData(data.save_data);
                else {
                    localStorage.removeItem('espotoolClickerSaveV8');
                    Game.getGameState().user.username = u;
                    Game.saveGame();
                }
                closeModal(loginModal);
                Game.startGameRoutines();
                Game.showToast("Benvenuto " + u);
            } else {
                alert(data.message);
            }
        } catch (e) { console.error(e); }
        loginButton.disabled = false;
    }

    // Gestione tasto Invio su Login
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