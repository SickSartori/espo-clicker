document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 0. FUNZIONI HELPER GLOBALI (Fix Errori & Password)
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

    // LOGICA VISUALIZZA PASSWORD (Fix Occhiolino)
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
    const listAdvAudio = document.getElementById('advanced-audio-list');
    const btnHeaderBack = document.getElementById('header-back-btn');
    const btnHeaderReset = document.getElementById('header-reset-btn');

    const mediaMap = {
        'video-rick': 'rick-roll-video',
        'video-ricardo': 'ricardo-video'
    };

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

    function renderAudioMixer() {
        if (!listAdvAudio) return;
        listAdvAudio.innerHTML = '';

        const Game = getGameAPI();
        if (!Game.getGameState().user.audioCustom) {
            Game.getGameState().user.audioCustom = {
                'sound-click': 0.4, 'sound-buy': 0.4, 'sound-achievement': 0.4,
                'sound-bluescreen': 0.3, 'sound-snowball': 0.2, 'sound-bg-music': 0.5, // ALZATO A 0.5
                'sound-fire': 0.5, 'sound-error': 1.0, 'sound-golden': 1.0,
                'sound-prestige': 1.0, 'sound-hover': 1.0, 'sound-merry': 1.0,
                'video-rick': 0.5, 'video-ricardo': 0.5
            };
        }

        const customAudio = Game.getGameState().user.audioCustom;

        const createMixerRow = (id) => {
            const val = customAudio[id];
            if (val === undefined) return null;

            const row = document.createElement('div');
            row.className = 'mixer-row';
            row.setAttribute('data-audio-id', id);

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

            row.addEventListener('mouseleave', () => {
                stopSpecificTestAudio(id);
            });

            return row;
        };

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

        listAdvAudio.querySelectorAll('.mixer-slider').forEach(input => {
            input.addEventListener('input', (e) => {
                const targetId = e.target.getAttribute('data-target');
                const newVal = parseFloat(e.target.value);
                Game.getGameState().user.audioCustom[targetId] = newVal;
                const valSpan = e.target.parentElement.querySelector('.mixer-value');
                valSpan.textContent = Math.round(newVal * 100) + '%';
                valSpan.style.color = newVal === 0 ? '#7f8c8d' : '#3498db';

                const elementId = mediaMap[targetId] || targetId;
                const activeEl = document.getElementById(elementId);
                if (activeEl && !activeEl.paused) {
                    const userVol = Game.getGameState().user;
                    const channelVol = targetId.startsWith('video-') || targetId === 'sound-bg-music'
                        ? userVol.musicVolume : userVol.sfxVolume;
                    activeEl.volume = Math.max(0, Math.min(1, userVol.masterVolume * channelVol * newVal));
                }
            });
        });

        listAdvAudio.querySelectorAll('.mixer-test-btn').forEach(btn => {
            btn.addEventListener('click', () => handleTestAudioClick(btn));
        });
    }

    function stopSpecificTestAudio(targetId) {
        const elementId = mediaMap[targetId] || targetId;
        const el = document.getElementById(elementId);
        const btn = document.querySelector(`.mixer-test-btn[data-target="${targetId}"]`);

        if (el && !el.paused) {
            el.pause();
            el.currentTime = 0;
            if (targetId.startsWith('video-')) el.style.display = 'none';
        }

        if (btn) {
            btn.classList.remove('playing');
            const icon = btn.querySelector('i');
            if (icon) { icon.className = 'fa-solid fa-play'; icon.style.marginLeft = '2px'; }
        }
    }

    function handleTestAudioClick(btn) {
        const targetId = btn.getAttribute('data-target');
        const icon = btn.querySelector('i');
        const elementId = mediaMap[targetId] || targetId;
        const el = document.getElementById(elementId);

        if (!el) return;

        if (!el.paused && !el.ended) {
            stopSpecificTestAudio(targetId);
            return;
        }

        // Usa la funzione globale definita in cima
        window.stopAllTestAudio();
        window.resetTestButtons();

        const Game = getGameAPI();
        const userVol = Game.getGameState().user;
        const channelVol = targetId.startsWith('video-') || targetId === 'sound-bg-music'
            ? userVol.musicVolume : userVol.sfxVolume;
        const customVal = Game.getGameState().user.audioCustom[targetId];

        if (el.tagName === 'VIDEO' && !el.getAttribute('src')) {
            const src = el.getAttribute('data-src');
            if (src) { el.setAttribute('src', src); el.load(); }
        }

        // Forza un volume udibile per il test anche se il gioco è muto
        let testVol = userVol.masterVolume * channelVol * customVal;
        if (testVol < 0.1) testVol = 0.5 * customVal; // Fallback per sentire il test

        el.volume = testVol;
        el.currentTime = 0;

        el.play().then(() => {
            btn.classList.add('playing');
            icon.className = 'fa-solid fa-stop';
            icon.style.marginLeft = '0';

            el.onended = () => {
                btn.classList.remove('playing');
                icon.className = 'fa-solid fa-play';
                icon.style.marginLeft = '2px';
            };
        }).catch(e => { console.error("Test audio error:", e); });
    }

    if (btnAdvAudio) {
        btnAdvAudio.addEventListener('click', () => {
            window.currentActiveEvent = 'Audio Mixer';
            document.querySelectorAll('audio, video').forEach(media => {
                if (!media.paused) media.pause();
            });
            renderAudioMixer();
            if (settingsModal) settingsModal.style.display = 'none';
            if (modalAdvAudio) modalAdvAudio.style.display = 'flex';
        });
    }

    function closeMixerAndResume() {
        // Usa le funzioni globali definite in cima
        window.stopAllTestAudio();
        window.resetTestButtons();

        if (window.currentActiveEvent === 'Audio Mixer') {
            window.currentActiveEvent = null;
        }

        if (typeof updateAmbientVolume === 'function') updateAmbientVolume();

        const Game = getGameAPI();
        const state = Game.getGameState();
        const body = document.body;

        if (body.classList.contains('bluescreen-active')) {
            const blueAudio = document.getElementById('sound-bluescreen');
            if (blueAudio) blueAudio.play().catch(e => { });
            window.currentActiveEvent = 'System Error 404';
        }
        else if (body.classList.contains('crunch-active')) {
            const fireAudio = document.getElementById('sound-fire');
            if (fireAudio) fireAudio.play().catch(e => { });
            if (typeof setBgMusicVolume === 'function') setBgMusicVolume();
        }
        else if (state.skins.current === 'christmas') {
            const snowAudio = document.getElementById('sound-snowball');
            if (snowAudio) {
                snowAudio.volume = (state.user.masterVolume * state.user.musicVolume) * 0.2;
                snowAudio.play().catch(e => { });
            }
        }
        else {
            const bgMusic = document.getElementById('sound-bg-music');
            if (typeof setBgMusicVolume === 'function') setBgMusicVolume();
            if (bgMusic && bgMusic.paused && !window.currentActiveEvent && state.user.masterVolume > 0) {
                bgMusic.play().catch(e => { });
            }
        }

        if (modalAdvAudio) modalAdvAudio.style.display = 'none';
    }

    if (btnHeaderBack) {
        btnHeaderBack.addEventListener('click', () => {
            closeMixerAndResume();
            if (settingsModal) settingsModal.style.display = 'flex';
        });
    }

    if (btnHeaderReset) {
        btnHeaderReset.addEventListener('click', () => {
            if (confirm("Ripristinare i volumi predefiniti?")) {
                const Game = getGameAPI();
                Game.getGameState().user.audioCustom = {
                    'sound-click': 0.4, 'sound-buy': 0.4, 'sound-achievement': 0.4,
                    'sound-bluescreen': 0.3, 'sound-snowball': 0.2, 'sound-bg-music': 0.5,
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

    if (openAccountBtn) openAccountBtn.addEventListener('click', () => {
        closeModal(settingsModal);
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
        const userSettings = Game.getGameState().user;
        if (currentUsernameDisplay) currentUsernameDisplay.textContent = userSettings.username;
        if (masterSlider) {
            masterSlider.value = userSettings.masterVolume;
            masterDisplay.textContent = Math.round(userSettings.masterVolume * 100);
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

    const initInterval = setInterval(() => {
        if (window.EspooClicker) {
            clearInterval(initInterval);
            setupAudioControl(masterSlider, masterDisplay, 'masterVolume');
            setupAudioControl(sfxSlider, sfxDisplay, 'sfxVolume');
            setupAudioControl(musicSlider, musicDisplay, 'musicVolume', true);

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

    if (loginButton) loginButton.addEventListener('click', handleLogin);
    if (logoutBtn) logoutBtn.addEventListener('click', () => {
        if (confirm("Logout?")) {
            sessionStorage.clear();
            localStorage.removeItem('espotoolClickerSaveV8');
            location.reload();
        }
    });

    // Handler pulsanti Account (change user/pass/delete)
    if (changePassBtn) changePassBtn.addEventListener('click', async () => {
        const Game = getGameAPI();
        const oldPass = document.getElementById('old-password-input').value;
        const newPass = document.getElementById('new-password-input').value;
        if (!oldPass || !newPass) { alert("Compila entrambi i campi."); return; }

        try {
            const res = await fetch('./php/change_password.php', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: Game.getGameState().user.username, oldPassword: oldPass, newPassword: newPass })
            });
            const data = await res.json();
            if (data.status === 'success') {
                Game.showToast("Password Aggiornata!", "success");
                sessionStorage.setItem('espooPass', newPass); // Aggiorna sessione
            } else {
                alert(data.message);
            }
        } catch (e) { console.error(e); }
    });

    if (changeUserBtn) changeUserBtn.addEventListener('click', async () => {
        const Game = getGameAPI();
        const newName = document.getElementById('new-username-input').value;
        const password = prompt("Conferma password attuale:");
        if (!newName || !password) return;

        try {
            const res = await fetch('./php/change_username.php', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: Game.getGameState().user.username, password: password, newUsername: newName })
            });
            const data = await res.json();
            if (data.status === 'success') {
                Game.getGameState().user.username = newName;
                sessionStorage.setItem('espooUser', newName);
                if (currentUsernameDisplay) currentUsernameDisplay.textContent = newName;
                Game.showToast("Nome Aggiornato!", "success");
                Game.saveGame();
            } else {
                alert(data.message);
            }
        } catch (e) { console.error(e); }
    });

    if (deleteSaveBtn) deleteSaveBtn.addEventListener('click', async () => {
        const password = document.getElementById('danger-zone-password').value;
        if (!password) { alert("Inserisci la password nell'area critica."); return; }
        if (!confirm("SEI SICURO? Questa azione è irreversibile.")) return;

        const Game = getGameAPI();
        try {
            const res = await fetch('./php/delete_user.php', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: Game.getGameState().user.username, password: password })
            });
            const data = await res.json();
            if (data.status === 'success') {
                alert("Account eliminato.");
                sessionStorage.clear();
                localStorage.clear();
                location.reload();
            } else {
                alert(data.message);
            }
        } catch (e) { console.error(e); }
    });

    if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', () => {
        const Game = getGameAPI();
        if (Game) {
            Game.saveGame();
            Game.showToast("Preferenze Salvate");
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

                Game.tryStartAudio();

                Game.showToast("Benvenuto " + u);
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