document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 0. FUNZIONI HELPER GLOBALI
    // ==========================================

    // Previene ghost click su mobile: dopo touchend arriva un click sintetico ~300ms dopo.
    // Se l'ultimo touchend è avvenuto entro 500ms, il click viene ignorato.
    let lastTouchEnd = 0;
    document.addEventListener('touchend', () => {
        lastTouchEnd = Date.now();
    }, { passive: true });
    function isFastClick() {
        return Date.now() - lastTouchEnd < 500;
    }

    // Funzione mancante: Ferma tutti i test audio
    window.stopAllTestAudio = function () {
        // Ferma tutti i suoni SFX gestiti da Howler (non la musica di background)
        if (typeof AudioManager !== 'undefined') {
            for (const id in AudioManager._sounds) {
                const def = AudioManager._getSoundDef(id);
                if (def && def.type !== 'music') {
                    const howl = AudioManager._sounds[id];
                    if (howl && howl.playing()) howl.stop();
                }
            }
        }
        // Ferma video di test creati dinamicamente
        document.querySelectorAll('video').forEach(v => {
            if (!v.paused) {
                v.pause();
                v.currentTime = 0;
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
    
    const versionDisplayBtn = document.getElementById('version-display');

    if (versionDisplayBtn) {
    versionDisplayBtn.style.pointerEvents = 'auto'; // Abilita i click
    versionDisplayBtn.style.cursor = 'pointer';
    versionDisplayBtn.title = gameData.texts.ui.readNews;
    
    versionDisplayBtn.addEventListener('click', () => {
        const Game = getGameAPI();
        if (Game && Game.openReleaseNotes) Game.openReleaseNotes();
    });
}

    // 2. Aggiungi il listener (nella sezione dove ci sono gli altri btn.addEventListener)
    if (openArcadeBtn) {
        openArcadeBtn.addEventListener('click', () => {
            // Apri arcade in nuova scheda fullscreen (no più modal)
            // Sync BPS corrente via localStorage per reward calc accurato
            try {
                if (typeof bps !== 'undefined' && bps && bps.toString) {
                    localStorage.setItem('espo_main_bps', bps.toString());
                }
                // Mirror del saldo Bug totale per il wallet dell'arcade standalone
                // (arcade.php legge 'espo_main_bugs' + i pending per il totale).
                const _gs = (window.EspooClicker && window.EspooClicker.getGameState) ? window.EspooClicker.getGameState() : null;
                if (_gs && _gs.score != null && _gs.score.toString) {
                    localStorage.setItem('espo_main_bugs', _gs.score.toString());
                }
            } catch (e) {}

            const arcadeWin = window.open('arcade.php', 'espo-arcade',
                'noopener=no,width=1280,height=800,resizable=yes,scrollbars=no');
            if (arcadeWin && arcadeWin.focus) arcadeWin.focus();

            if (window.EspooClicker && window.EspooClicker.playSound) {
                window.EspooClicker.playSound('sound-click');
            }
        });
    }

    // Bottone Arcade nella nav mobile: riusa l'apertura dell'arcade (mirror BPS/Bug,
    // window.open, suono) delegando al click del pulsante desktop.
    const mobileArcadeBtn = document.getElementById('mobile-arcade-btn');
    if (mobileArcadeBtn && openArcadeBtn) {
        mobileArcadeBtn.addEventListener('click', () => openArcadeBtn.click());
    }

    // Polling pending rewards da arcade tab (ogni 5s + on focus)
    function _claimArcadeRewards() {
        try {
            const raw = localStorage.getItem('espo_arcade_pending_rewards');
            if (!raw) return;
            const data = JSON.parse(raw);
            if (!data || !data.score || parseFloat(data.score) <= 0) return;

            const Game = getGameAPI ? getGameAPI() : window.EspooClicker;
            if (!Game) return;
            const gs = Game.getGameState ? Game.getGameState() : null;
            if (!gs) return;

            const reward = (typeof Decimal !== 'undefined') ? new Decimal(data.score) : parseFloat(data.score);
            gs.score = gs.score.add ? gs.score.add(reward) : (gs.score + reward);
            if (Game.saveGame) Game.saveGame();
            if (Game.showToast) {
                const fmt = (Game.formatNumber) ? Game.formatNumber(reward) : reward.toString();
                Game.showToast(`🎮 ARCADE REWARD: +${fmt} BUG!`, 'reward');
            }
            // Clear pending — ANTI-RACE: se il tab arcade ha scritto ALTRI reward tra
            // la lettura e questo punto, sottrai solo quanto incassato invece di azzerare.
            const cur = localStorage.getItem('espo_arcade_pending_rewards');
            if (cur && cur !== raw && typeof Decimal !== 'undefined') {
                try {
                    const curData = JSON.parse(cur);
                    const residue = new Decimal(curData.score || '0').sub(data.score);
                    if (residue.gt(0)) {
                        localStorage.setItem('espo_arcade_pending_rewards',
                            JSON.stringify({ score: residue.toString(), scoreNum: parseFloat(residue.toString()), updated: Date.now() }));
                    } else {
                        localStorage.removeItem('espo_arcade_pending_rewards');
                    }
                } catch (e2) { localStorage.removeItem('espo_arcade_pending_rewards'); }
            } else {
                localStorage.removeItem('espo_arcade_pending_rewards');
            }
            // Aggiorna il mirror del saldo letto dal wallet arcade (totale = mirror + pending).
            // Senza questo, all'incasso il totale arcade CALAVA del pending appena azzerato:
            // i bug guadagnati sembravano "apparire e poi tornare a 0".
            try { if (gs.score && gs.score.toString) localStorage.setItem('espo_main_bugs', gs.score.toString()); } catch (e3) {}
        } catch (e) {
            console.warn('[arcade reward claim] fail', e);
        }
    }
    setInterval(_claimArcadeRewards, 5000);
    window.addEventListener('focus', _claimArcadeRewards);

    // Logica Hover/Click sul menu Arcade
    document.querySelectorAll('.arcade-menu-item:not(.locked)').forEach(item => {
        const updatePreview = () => {
            // Aggiorna stato attivo menu
            document.querySelectorAll('.arcade-menu-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            // Preleva dati
            const gameKey = item.getAttribute('data-game');
            const title = item.getAttribute('data-title');
            const color = item.getAttribute('data-color');
            const desc = item.getAttribute('data-desc');

            // Aggiorna DOM
            const titleEl = document.getElementById('preview-title');
            const descEl = document.getElementById('preview-desc');
            const scoreEl = document.getElementById('preview-highscore');

            if (titleEl) { titleEl.textContent = title; titleEl.style.color = color; }
            if (descEl) descEl.textContent = desc;

            // Recupera High Score
            const Game = window.EspooClicker;
            if (Game && scoreEl) {
                const state = Game.getGameState();
                const score = (state.arcadeHighScores && state.arcadeHighScores[gameKey]) ? state.arcadeHighScores[gameKey] : 0;
                scoreEl.textContent = score;
            }
        };

        item.addEventListener('mouseenter', () => {
            if (!item.classList.contains('active')) {
                if (window.EspooClicker && typeof window.EspooClicker.playSound === 'function') {
                    window.EspooClicker.playSound('sound-arcade-hover');
                }
            }
            updatePreview();
        });

        item.addEventListener('click', () => {
            updatePreview();
            if (window.EspooClicker && typeof window.EspooClicker.playSound === 'function') {
                window.EspooClicker.playSound('sound-click'); // Suono click normale per la selezione
            }
        });
    });

    // --- NAVIGAZIONE TASTIERA MENU ARCADE ---
    document.addEventListener('keydown', (e) => {
        const arcadeModal = document.getElementById('arcade-modal');
        const selector = document.getElementById('arcade-game-selector');

        // Controlliamo se il modale dell'Arcade è aperto E se siamo nella schermata di Selezione
        if (arcadeModal && arcadeModal.style.display === 'flex' &&
            selector && selector.style.display !== 'none') {

            const items = Array.from(selector.querySelectorAll('.arcade-menu-item:not(.locked)'));
            if (items.length === 0) return;

            let currentIndex = items.findIndex(item => item.classList.contains('active'));

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                currentIndex = (currentIndex + 1) % items.length;
                items[currentIndex].dispatchEvent(new Event('mouseenter')); // Aggiorna graficamente
            }
            else if (e.key === 'ArrowUp') {
                e.preventDefault();
                currentIndex = (currentIndex - 1 + items.length) % items.length;
                items[currentIndex].dispatchEvent(new Event('mouseenter')); // Aggiorna graficamente
            }
            else if (e.key === 'Enter') {
                e.preventDefault();
                if (currentIndex >= 0) {
                    items[currentIndex].click(); // Avvia il gioco selezionato
                }
            }
        }
    });

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
            const action = btnConfirmPrestige.getAttribute('data-action');
            if (action === 'format') {
                if (typeof executeFormattingSequence === 'function') executeFormattingSequence();
            } else {
                if (typeof executePrestige === 'function') executePrestige();
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
            'ambiente': { title: gameData.texts.ui.audioCatAmbiente, icon: 'fa-music', items: [] },
            'eventi': { title: gameData.texts.ui.audioCatEventi, icon: 'fa-film', items: [] },
            'effetti': { title: gameData.texts.ui.audioCatEffetti, icon: 'fa-volume-high', items: [] }
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

                // Applica volume in tempo reale via AudioManager
                if (typeof AudioManager !== 'undefined') {
                    const def = AudioManager._getSoundDef(targetId);
                    const type = (def && def.type === 'music') ? 'music' : 'sfx';
                    AudioManager.setVolume(targetId, AudioManager._calcVolume(targetId, type));
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

        // Video: gestione diretta sull'elemento DOM
        const videoEl = document.getElementById(targetId);
        if (videoEl && videoEl.tagName === 'VIDEO') {
            if (!videoEl.paused && !videoEl.ended) {
                videoEl.pause();
                videoEl.currentTime = 0;
                btn.classList.remove('playing');
                icon.className = 'fa-solid fa-play';
                icon.style.marginLeft = '2px';
                return;
            }
            window.stopAllTestAudio();
            window.resetTestButtons();
            const Game = getGameAPI();
            const userVol = Game.getGameState().user;
            const customVal = (Game.getGameState().user.audioCustom[targetId] ?? 1);
            const finalVol = Math.max(0, Math.min(1, userVol.masterVolume * userVol.musicVolume * customVal));
            videoEl.volume = finalVol;
            videoEl.currentTime = 0;
            videoEl.style.display = 'none'; // Solo audio nel mixer
            videoEl.play().then(() => {
                btn.classList.add('playing');
                icon.className = 'fa-solid fa-stop';
                icon.style.marginLeft = '0';
                videoEl.onended = () => {
                    btn.classList.remove('playing');
                    icon.className = 'fa-solid fa-play';
                    icon.style.marginLeft = '2px';
                };
            }).catch(e => {
                if (e.name !== 'AbortError') console.error("Errore playback video test:", e);
            });
            return;
        }

        // Audio: gestione via AudioManager (Howler)
        if (typeof AudioManager === 'undefined') return;
        const howl = AudioManager.getHowl(targetId);
        if (!howl) return;

        // Se sta già suonando, ferma
        if (howl.playing()) {
            howl.stop();
            btn.classList.remove('playing');
            icon.className = 'fa-solid fa-play';
            icon.style.marginLeft = '2px';
            return;
        }

        window.stopAllTestAudio();
        window.resetTestButtons();

        const def = AudioManager._getSoundDef(targetId);
        const type = (def && def.type === 'music') ? 'music' : 'sfx';
        const vol = AudioManager._calcVolume(targetId, type);

        howl.volume(vol > 0 ? vol : 0.1);
        howl.play();
        btn.classList.add('playing');
        icon.className = 'fa-solid fa-stop';
        icon.style.marginLeft = '0';

        // Auto-reset a fine traccia (per suoni non-loop)
        howl.once('end', () => {
            btn.classList.remove('playing');
            icon.className = 'fa-solid fa-play';
            icon.style.marginLeft = '2px';
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

            // STOP TOTALE: Silenzia tutto (Howler + video DOM)
            if (typeof AudioManager !== 'undefined') {
                for (const id in AudioManager._sounds) {
                    AudioManager.stop(id, 0);
                }
            }
            document.querySelectorAll('video').forEach(el => {
                if (!el.paused) { el.pause(); el.currentTime = 0; }
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

    // ==========================================
    // LOGIN — debug data-stream (scena fullscreen)
    // Generato via JS perché il numero di colonne dipende dalla larghezza
    // viewport; righe a tema (token tecnici neutri, leggibili in IT/EN).
    // ==========================================
    const LOGIN_STREAM_LINES = [
        { t: "> boot espoo_clicker v3.0.0" },
        { t: "> mount /cloud/save .......... OK", c: "ok" },
        { t: "> init audio_mixer ........... OK", c: "ok" },
        { t: "> load skins[42] ............. OK", c: "ok" },
        { t: "> spawn espo_unit#0427" },
        { t: "> achievement_engine ........ READY", c: "ok" },
        { t: "> bps_calc: 0x1A2F mov eax,ebx" },
        { t: "> render_pipeline ........... 60fps" },
        { t: "> minigames/arcade .......... loaded", c: "ok" },
        { t: "> [auth] awaiting credentials", c: "hot" },
        { t: "> cloud_sync: STANDBY" },
        { t: "> [WARN] save_token: null", c: "warn" },
        { t: "> golden_bug.spawn(t=37.4s)" },
        { t: "> multiplier x2 .............. armed", c: "ok" },
        { t: "> net: ping 24ms ............ OK", c: "ok" },
        { t: "> heap 18.4MB / gc clean" },
        { t: "> 0xDEAD clic_per_secondo++" },
        { t: "> espo.idle_loop ............ tick" },
        { t: "> [auth] handshake ready", c: "hot" },
        { t: "> entropy seed 0x7F3A2C" }
    ];

    function buildLoginStream() {
        const stream = document.getElementById('login-stream');
        if (!stream) return;
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const w = window.innerWidth || 1280;
        const cols = Math.max(2, Math.min(6, Math.floor(w / 260)));
        const colW = w / cols;
        const n = LOGIN_STREAM_LINES.length;
        let out = '';
        for (let i = 0; i < cols; i++) {
            const dur = 34 + (i % 4) * 9;
            const op = (0.08 + (i % 3) * 0.03).toFixed(2);
            const left = Math.round(i * colW + colW * 0.10);
            const startIdx = (i * 5) % n;
            let lines = '';
            for (let rep = 0; rep < 2; rep++) {
                for (let k = 0; k < n; k++) {
                    const ln = LOGIN_STREAM_LINES[(startIdx + k) % n];
                    lines += '<span class="ln' + (ln.c ? ' ' + ln.c : '') + '">' + ln.t + '</span>';
                }
            }
            out += '<div class="ds-col" style="left:' + left + 'px;opacity:' + op
                + ';animation-duration:' + dur + 's;animation-delay:' + (-(i * 7)) + 's;'
                + (reduce ? 'animation:none;' : '') + '">' + lines + '</div>';
        }
        stream.innerHTML = out;
    }

    // Rigenera le colonne al resize (debounce) solo se il login è visibile
    let _loginStreamTimer = null;
    window.addEventListener('resize', () => {
        const lm = document.getElementById('login-modal');
        if (!lm || getComputedStyle(lm).display === 'none') return;
        clearTimeout(_loginStreamTimer);
        _loginStreamTimer = setTimeout(buildLoginStream, 200);
    });

    function openModal(modal) {
        if (modal) {
            const content = modal.querySelector('.modal-content');

            // Kill animazioni in corso (close ancora attivo, ecc.)
            if (typeof gsap !== 'undefined') {
                gsap.killTweensOf(modal);
                if (content) gsap.killTweensOf(content);
            }

            // Reset stato pulito (modal magari era a metà close)
            modal.style.visibility = '';
            modal.style.display = 'flex';
            modal.style.opacity = '';
            if (content) {
                content.style.transform = '';
                content.style.opacity = '';
            }

            // Login: genera il debug data-stream della scena fullscreen
            if (modal.id === 'login-modal') buildLoginStream();

            // Animazione "finestra": fade + leggero scale (subito, no rAF)
            if (content && typeof gsap !== 'undefined') {
                gsap.fromTo(content,
                    { scale: 0.97, opacity: 0 },
                    { scale: 1, opacity: 1, duration: 0.26, ease: "power2.out", clearProps: 'transform,opacity' }
                );
                gsap.fromTo(modal,
                    { opacity: 0 },
                    { opacity: 1, duration: 0.22, ease: "power1.out", clearProps: 'opacity' }
                );
            } else if (content) {
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

            // Kill any open tweens prima di partire close
            if (typeof gsap !== 'undefined') {
                gsap.killTweensOf(modal);
                if (content) gsap.killTweensOf(content);
            }

            // Animazione uscita (veloce, no scale 0.8 = no jump grosso)
            if (content && typeof gsap !== 'undefined') {
                gsap.to(content, {
                    scale: 0.97,
                    opacity: 0,
                    duration: 0.18,
                    ease: "power2.in",
                    onComplete: () => {
                        modal.style.display = 'none';
                        // Reset hard per prossimo open
                        content.style.transform = '';
                        content.style.opacity = '';
                        modal.style.opacity = '';
                        finishClose();
                    }
                });
                gsap.to(modal, { opacity: 0, duration: 0.18 });
            } else {
                modal.style.display = 'none';
                if (content) { content.style.transform = ''; content.style.opacity = ''; }
                modal.style.opacity = '';
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

    // A11y: Esc chiude il modale visibile in cima (tranne il login, che e' un gate)
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        const open = Array.from(document.querySelectorAll('.modal-backdrop'))
            .filter(m => m.style.display === 'flex' && m.style.opacity !== '0' && m.id !== 'login-modal');
        if (open.length) closeModal(open[open.length - 1]);
    });

    // A11y: chiudi cliccando sullo sfondo, fuori dal contenuto (tranne il login)
    allModals.forEach(m => {
        m.addEventListener('click', (e) => {
            if (e.target === m && m.id !== 'login-modal') closeModal(m);
        });
    });

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
                displayUser.textContent = user.username || gameData.texts.ui.defaultPlayer;
            }
        }
        // -------------------------------------

        openModal(accountModal);
    });

    allModals.forEach(modal => {
        modal.addEventListener('click', (e) => {
            // Nota: rimosso il check isFastClick() — bloccava i click legittimi
            // post-touchend (DevTools device emulation, mobile moderni). Con
            // viewport width=device-width il "ghost click" 300ms non esiste più.
            if (e.target.classList.contains('modal-close-btn')) {
                closeModal(modal);

                if (modal.id === 'arcade-modal' && window.currentActiveEvent === 'Arcade Mode') {
                    window.currentActiveEvent = null;
                    if (typeof AudioManager !== 'undefined') AudioManager.updateAmbience();
                    if (typeof window.exitSnakeGame === 'function') window.exitSnakeGame();
                    if (typeof window.exitSpaceGame === 'function') window.exitSpaceGame();
                    if (typeof window.exitAsteroidsGame === 'function') window.exitAsteroidsGame();
                    if (typeof window.exitInvadersGame === 'function') window.exitInvadersGame();
                    if (typeof window.exitCentipedeGame === 'function') window.exitCentipedeGame();
                }

            }
        });
    });

    function openSettingsModal() {
        const Game = getGameAPI();
        if (!Game) return;
        const gameState = Game.getGameState();
        const userSettings = gameState.user;

        // Selettore lingua: riflette APP_LANG e, al cambio, riscrive il cookie e ricarica.
        const langSelect = document.getElementById('lang-select');
        if (langSelect) {
            langSelect.value = window.APP_LANG || 'it';
            langSelect.onchange = function () {
                const lang = this.value === 'en' ? 'en' : 'it';
                document.cookie = 'user_default_language=' + lang + ';path=/;max-age=' + (60 * 60 * 24 * 365);
                location.reload();
            };
        }

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
                'sound-bg-music-super': 'superespo',
                'sound-bg-music-espory': 'espory',
                'sound-bg-music-divine': 'jesus'
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
            // Mantieni sincronizzata l'icona del quick-mute con lo slider master
            if (key === 'masterVolume' && typeof Game.updateMuteButton === 'function') {
                Game.updateMuteButton();
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
            Game.getGameState().user.username = sessUser;
            loginInput.value = sessUser;
            loginPasswordInput.value = sessPass;
            loginButton.click();
        }
        else
            openModal(loginModal);

        console.log("✅ Modals.js inizializzato via Evento.");
    }

    // Logica ibrida: Se il gioco è già pronto, esegui subito. Altrimenti aspetta l'evento.
    if (window.EspooClicker)
        initModalBindings();
    else
        document.addEventListener('EspoGameReady', initModalBindings);

    if (loginButton) loginButton.addEventListener('click', handleLogin);

    window._showLoginForTokenExpiry = () => {
        const sessUser = sessionStorage.getItem('espooUser');
        const sessPass = sessionStorage.getItem('espooPass');
        if (sessUser && sessPass && loginInput && loginPasswordInput) {
            loginInput.value = sessUser;
            loginPasswordInput.value = sessPass;
            handleLogin();
        } else if (loginModal) {
            openModal(loginModal);
        }
    };

    // Refresh SILENZIOSO del token (rete di sicurezza, chiamato da saveGame poco prima
    // della scadenza 24h). A differenza di _showLoginForTokenExpiry NON ricarica il cloud
    // né riapre modali: chiede solo un nuovo token riusando le credenziali di sessione.
    // Fail-safe: in caso di errore resta attivo il controllo reattivo alla scadenza.
    window._silentTokenRefresh = async () => {
        const u = sessionStorage.getItem('espooUser');
        const p = sessionStorage.getItem('espooPass');
        if (!u || !p || window._tokenRefreshing) return;
        const Game = getGameAPI();
        if (!Game || typeof Game.setSaveToken !== 'function') return;
        window._tokenRefreshing = true;
        try {
            const res = await fetch('php/refresh_token.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: u, password: p })
            });
            const data = await res.json();
            if (data.status === 'success' && data.save_token) {
                Game.setSaveToken(data.save_token, data.token_expires_at);
                window._tokenExpiredNotified = false;
            }
        } catch (e) {
            // silenzioso: il fallback reattivo coprirà l'eventuale scadenza
        } finally {
            window._tokenRefreshing = false;
        }
    };

    // Recovery da CONFLITTO cloud: il server ha rifiutato il salvataggio perché il DB è
    // più avanti (Format>Prestige>Score). Rifacciamo il fetch del save cloud e lo
    // adottiamo in modo AUTORITATIVO (force) — il confronto solo-lifetimeScore del load
    // normale non basta a risolvere il conflitto. Così il client si riallinea e i
    // salvataggi riprendono. Niente auto-overwrite: parte solo su azione esplicita (badge).
    window._resyncFromCloud = async () => {
        const u = sessionStorage.getItem('espooUser');
        const p = sessionStorage.getItem('espooPass');
        if (!u || !p || window._resyncing) return;
        const Game = getGameAPI();
        if (!Game || typeof Game.loadCloudData !== 'function') return;
        window._resyncing = true;
        try {
            const res = await fetch('php/login_register.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: u, password: p })
            });
            const data = await res.json();
            if (data.status === 'success') {
                if (typeof Game.setSaveToken === 'function') Game.setSaveToken(data.save_token, data.token_expires_at);
                window._tokenExpiredNotified = false;
                if (data.save_data) {
                    Game.loadCloudData(data.save_data, { force: true });
                    if (typeof Game.saveGame === 'function') Game.saveGame(); // riconferma lo stato riallineato
                }
            }
        } catch (e) {
            // riprova al prossimo salvataggio / tap sul badge
        } finally {
            window._resyncing = false;
        }
    };

    if (logoutBtn) logoutBtn.addEventListener('click', async () => {
        if (confirm(gameData.texts.dialogs.logout)) {
            sessionStorage.clear();
            if (window.SaveDB && typeof window.SaveDB.clearIndexedDB === 'function') {
                try { await window.SaveDB.clearIndexedDB(); } catch (e) { console.warn('IndexedDB clear failed:', e); }
            }
            localStorage.removeItem('espotoolClickerSaveV9');
            localStorage.removeItem('espotoolClickerSaveV9_Backup');
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
        if (!confirm(gameData.texts.dialogs.deleteConfirm)) return;

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


                alert(gameData.texts.dialogs.accountDeleted);
                sessionStorage.clear();
                localStorage.clear(); // Pulisce tutto il browser
                if (window.SaveDB && typeof window.SaveDB.clearIndexedDB === 'function') {
                    try { await window.SaveDB.clearIndexedDB(); } catch (e) { console.warn('IndexedDB clear failed:', e); }
                }
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
            if (!confirm(gameData.texts.dialogs.resetConfirm)) return;

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

                    alert(gameData.texts.dialogs.progressReset);

                    if (window.SaveDB && typeof window.SaveDB.clearIndexedDB === 'function') {
                        try { await window.SaveDB.clearIndexedDB(); } catch (e) { console.warn('IndexedDB clear failed:', e); }
                    }
                    localStorage.removeItem('espotoolClickerSaveV9');
                    localStorage.removeItem('espotoolClickerSaveV9_Backup');
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

        // L'intro cinematica parte SOLO al login esplicito dell'utente: NON
        // sull'auto-login da sessione salvata (F5, initModalBindings ->
        // loginButton.click()) ne' sul re-auth da token scaduto
        // (_showLoginForTokenExpiry -> handleLogin()). Entrambi richiamano
        // handleLogin() con una sessione gia' presente in sessionStorage.
        const hadSession = !!sessionStorage.getItem('espooUser');

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
                Game.setSaveToken(data.save_token, data.token_expires_at);
                window._tokenExpiredNotified = false;

                if (data.save_data) Game.loadCloudData(data.save_data);
                else {
                    if (typeof resetGameToDefault === 'function') resetGameToDefault();
                    localStorage.removeItem('espotoolClickerSaveV9');
                    localStorage.removeItem('espotoolClickerSaveV9_Backup');
                    Game.getGameState().user.username = u;
                    if (typeof applySkinVisuals === 'function') applySkinVisuals('default');
                    Game.saveGame();
                }

                closeModal(loginModal);

                // Sblocca il contesto audio sfruttando il gesto di login: così gli SFX
                // dell'intro e la musica partono senza dover premere "Attiva audio".
                if (typeof Howler !== 'undefined' && Howler.ctx && Howler.ctx.state === 'suspended') {
                    Howler.ctx.resume().catch(() => {});
                }

                // L'intro cinematica parte solo su login esplicito (no F5/re-auth).
                // In quel caso azzera la musica (duck 0) PRIMA di startGameRoutines/
                // updateAmbientVolume: cosi' la canzone di sfondo NON parte durante
                // l'intro. Viene riavviata a fine intro (onComplete).
                const _willPlayIntro = !hadSession && window.EspoIntro && typeof window.EspoIntro.play === 'function';
                if (_willPlayIntro && typeof setMusicDuck === 'function') setMusicDuck(0);

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
                // Sincronizza anche l'icona del quick-mute col volume caricato dal salvataggio
                if (typeof Game.updateMuteButton === 'function') Game.updateMuteButton();

                // --- INTRO CINEMATICA (login -> gioco) ---
                // L'audio (musica) parte al beat "reveal" via onReveal; i modali
                // post-login (V2 / release notes) partono a fine intro via onComplete.
                // Il toast "Benvenuto" e' rimosso: lo dice gia' l'intro.
                const runPostLogin = () => {
                    if (window.triggerV2MigrationModal) {
                        showV2MigrationModal(() => {
                            window.triggerV2MigrationModal = false;
                            if (window.shouldShowReleaseNotesOnLoad && Game.openReleaseNotes) {
                                Game.openReleaseNotes();
                            }
                        });
                    } else if (window.shouldShowReleaseNotesOnLoad) {
                        if (Game.openReleaseNotes) Game.openReleaseNotes();
                    }
                };

                if (_willPlayIntro) {
                    window.EspoIntro.play({
                        username: u,
                        // releaseAmbientVfx: la neve/VFX skin parte SOLO ora, a intro
                        // finita (non sul login né durante l'intro).
                        onComplete: () => { if (typeof setMusicDuck === 'function') setMusicDuck(1); Game.tryStartAudio(); if (typeof window.releaseAmbientVfx === 'function') window.releaseAmbientVfx(); runPostLogin(); }
                    });
                } else {
                    // Fallback difensivo: comportamento ~ a prima dell'intro.
                    // Niente intro (F5/re-auth): il gioco è già visibile → VFX subito.
                    Game.tryStartAudio();
                    if (typeof window.releaseAmbientVfx === 'function') window.releaseAmbientVfx();
                    runPostLogin();
                }
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