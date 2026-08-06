/**
 * Modali (login, settings/volumi, account, leaderboard, help, arcade selector…).
 *
 * Migrato da js/modals.js (classic script) a modulo ESM — Blocco #1 kill-legacy.
 * Il wiring resta agganciato a `DOMContentLoaded`: `main.ts` è un modulo deferred
 * che gira PRIMA di DOMContentLoaded, quindi il listener viene registrato al
 * momento originale. NB: l'handler di modals scatta PRIMA di quello di script.js
 * (che costruisce `window.EspooClicker` DENTRO il proprio DOMContentLoaded), quindi
 * EspooClicker NON esiste ancora quando gira questo corpo: il binding è reso
 * order-independent dal guard ibrido `EspoGameReady` (preservato dall'originale).
 * I riferimenti a global legacy passano da `window.*` (via l'alias `w`) perché un
 * modulo strict non vede lo scope-bundle. Gli `window.X = …` (funzioni esposte da
 * questo file, es. stopAllTestAudio) restano identici.
 */
import { store } from '../../state/store';

export function initModals(): void {
  document.addEventListener('DOMContentLoaded', () => {
    const w = window as any;

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

    // ---- Anteprima audio del mixer: una alla volta, e mai oltre 3 secondi ----
    // Il tester serve a regolare un cursore, non ad ascoltare il brano: senza
    // cap, provare una traccia significava avviare un loop infinito (arcade-theme
    // dura 6'27") che restava a suonare sotto tutto il resto.
    const TEST_PREVIEW_MS = 3000;
    let testPreviewTimer: any = null;
    // Bottone che possiede l'anteprima in corso. Serve a due cose: capire se un
    // mouseleave riguarda l'anteprima attiva, e annullare un avvio ancora in
    // caricamento se nel frattempo il puntatore se n'è andato.
    let activePreviewBtn: any = null;

    /** Segna l'inizio di un'anteprima e arma il taglio a 3 s. */
    function armTestPreview(btn: any) {
        activePreviewBtn = btn;
        clearTimeout(testPreviewTimer);
        testPreviewTimer = setTimeout(() => {
            testPreviewTimer = null;
            stopTestPreview();
        }, TEST_PREVIEW_MS);
    }

    /** Unico punto di uscita: ferma l'audio, resetta i bottoni, libera lo stato. */
    function stopTestPreview() {
        activePreviewBtn = null;
        w.stopAllTestAudio();   // azzera anche testPreviewTimer
        w.resetTestButtons();
    }

    /** Ferma l'anteprima solo se appartiene a questo bottone (chiamata dal
     *  mouseleave della riga: uscire da una riga non deve zittirne un'altra). */
    function stopPreviewIfOwnedBy(btn: any) {
        if (btn && activePreviewBtn === btn) stopTestPreview();
    }

    // Rete di sicurezza per i casi in cui il mouseleave non arriva mai: finestra
    // in secondo piano, scheda nascosta, o dispositivi touch (dove il puntatore
    // non "esce" da nulla e a chiudere resta solo il taglio a 3 s).
    function stopTestPreviewOnBlur() {
        if (activePreviewBtn === null) return; // nessuna anteprima in corso
        stopTestPreview();
    }
    window.addEventListener('blur', stopTestPreviewOnBlur);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stopTestPreviewOnBlur();
    });

    // Ferma tutte le anteprime del mixer.
    w.stopAllTestAudio = function () {
        clearTimeout(testPreviewTimer);
        testPreviewTimer = null;
        activePreviewBtn = null;
        // Ferma TUTTO, musica compresa. Prima il ciclo saltava i type 'music':
        // erano proprio quelli a non fermarsi mai — in loop e sovrapposti fra
        // loro a ogni click. Qui dentro ogni suono in riproduzione e' comunque
        // un'anteprima: all'apertura il mixer silenzia il gioco e alla chiusura
        // updateAmbience() rimette la musica giusta.
        if (typeof w.AudioManager !== 'undefined') {
            for (const id in w.AudioManager._sounds) {
                const howl = w.AudioManager._sounds[id];
                if (howl && howl.playing()) howl.stop();
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
    w.resetTestButtons = function () {
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
                input = btn.closest('.input-group-modern')!.querySelector('input');
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
    const openUserHubBtn = document.getElementById('open-user-hub-btn'); // Nuovo menu nome-utente (navbar)

    // Modali
    const achievementsModal = document.getElementById('achievements-modal');
    const statsModal = document.getElementById('stats-modal');
    const settingsModal = document.getElementById('settings-modal');
    const leaderboardModal = document.getElementById('leaderboard-modal');
    const userHubModal = document.getElementById('user-hub-modal');
    const loginModal = document.getElementById('login-modal');
    const helpModal = document.getElementById('help-modal');
    const skinsModal = document.getElementById('skins-modal');
    const allModals = document.querySelectorAll('.modal-backdrop') as NodeListOf<HTMLElement>;

    // Elementi Interni Settings
    const masterSlider = document.getElementById('master-slider') as HTMLInputElement | null;
    const sfxSlider = document.getElementById('sfx-slider') as HTMLInputElement | null;
    const musicSlider = document.getElementById('music-slider') as HTMLInputElement | null;
    const masterDisplay = document.getElementById('master-vol-display');
    const sfxDisplay = document.getElementById('sfx-vol-display');
    const musicDisplay = document.getElementById('music-vol-display');
    const saveSettingsBtn = document.getElementById('save-settings-btn');

    // Login & Account Elements
    // Non-null: usati anche senza guard esplicita altrove nel file (comportamento originale invariato).
    const loginButton = document.getElementById('login-btn') as HTMLButtonElement;
    const loginInput = document.getElementById('login-username-input') as HTMLInputElement;
    const loginPasswordInput = document.getElementById('login-password-input') as HTMLInputElement;
    const logoutBtn = document.getElementById('logout-btn');
    const changePassBtn = document.getElementById('change-password-btn');
    const changeUserBtn = document.getElementById('change-username-btn');
    const deleteSaveBtn = document.getElementById('delete-save-btn');
    const currentUsernameDisplay = document.getElementById('current-username-display');
    // Music
    const audio = document.getElementById('bg-music') as HTMLAudioElement;
    // 1. Aggiungi il riferimento
    const openArcadeBtn = document.getElementById('open-arcade-btn');
    const arcadeModal = document.getElementById('arcade-modal');
    
    const versionDisplayBtn = document.getElementById('version-display');

    if (versionDisplayBtn) {
    versionDisplayBtn.style.pointerEvents = 'auto'; // Abilita i click
    versionDisplayBtn.style.cursor = 'pointer';
    versionDisplayBtn.title = store.gameData.texts.ui.readNews;
    
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
                if (typeof store.bps !== 'undefined' && store.bps && store.bps.toString) {
                    localStorage.setItem('espo_main_bps', store.bps.toString());
                }
                // Mirror del saldo Bug totale per il wallet dell'arcade standalone
                // (arcade.php legge 'espo_main_bugs' + i pending per il totale).
                const _gs = (w.EspooClicker && w.EspooClicker.getGameState) ? w.EspooClicker.getGameState() : null;
                if (_gs && _gs.score != null && _gs.score.toString) {
                    localStorage.setItem('espo_main_bugs', _gs.score.toString());
                }
            } catch (e) {}

            const arcadeWin = window.open('arcade.php', 'espo-arcade',
                'noopener=no,width=1280,height=800,resizable=yes,scrollbars=no');
            if (arcadeWin && arcadeWin.focus) arcadeWin.focus();

            if (w.EspooClicker && w.EspooClicker.playSound) {
                w.EspooClicker.playSound('sound-click');
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

            const Game = getGameAPI ? getGameAPI() : w.EspooClicker;
            if (!Game) return;
            const gs = Game.getGameState ? Game.getGameState() : null;
            if (!gs) return;

            const reward = (typeof w.Decimal !== 'undefined') ? new w.Decimal(data.score) : parseFloat(data.score);
            gs.score = gs.score.add ? gs.score.add(reward) : (gs.score + reward);
            if (Game.saveGame) Game.saveGame();
            if (Game.showToast) {
                const fmt = (Game.formatNumber) ? Game.formatNumber(reward) : reward.toString();
                Game.showToast(`🎮 ARCADE REWARD: +${fmt} BUG!`, 'reward');
            }
            // Clear pending — ANTI-RACE: se il tab arcade ha scritto ALTRI reward tra
            // la lettura e questo punto, sottrai solo quanto incassato invece di azzerare.
            const cur = localStorage.getItem('espo_arcade_pending_rewards');
            if (cur && cur !== raw && typeof w.Decimal !== 'undefined') {
                try {
                    const curData = JSON.parse(cur);
                    const residue = new w.Decimal(curData.score || '0').sub(data.score);
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

            if (titleEl) { titleEl.textContent = title; titleEl.style.color = color ?? ''; }
            if (descEl) descEl.textContent = desc;

            // Recupera High Score
            const Game = w.EspooClicker;
            if (Game && scoreEl) {
                const state = Game.getGameState();
                const score = (state.arcadeHighScores && state.arcadeHighScores[gameKey ?? '']) ? state.arcadeHighScores[gameKey ?? ''] : 0;
                scoreEl.textContent = score;
            }
        };

        item.addEventListener('mouseenter', () => {
            if (!item.classList.contains('active')) {
                if (w.EspooClicker && typeof w.EspooClicker.playSound === 'function') {
                    w.EspooClicker.playSound('sound-arcade-hover');
                }
            }
            updatePreview();
        });

        item.addEventListener('click', () => {
            updatePreview();
            if (w.EspooClicker && typeof w.EspooClicker.playSound === 'function') {
                w.EspooClicker.playSound('sound-click'); // Suono click normale per la selezione
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

            const items = Array.from(selector.querySelectorAll('.arcade-menu-item:not(.locked)')) as HTMLElement[];
            if (items.length === 0) return;

            let currentIndex = items.findIndex(item => item.classList.contains('active'));

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                currentIndex = (currentIndex + 1) % items.length;
                items[currentIndex]!.dispatchEvent(new Event('mouseenter')); // Aggiorna graficamente
            }
            else if (e.key === 'ArrowUp') {
                e.preventDefault();
                currentIndex = (currentIndex - 1 + items.length) % items.length;
                items[currentIndex]!.dispatchEvent(new Event('mouseenter')); // Aggiorna graficamente
            }
            else if (e.key === 'Enter') {
                e.preventDefault();
                if (currentIndex >= 0) {
                    items[currentIndex]!.click(); // Avvia il gioco selezionato
                }
            }
        }
    });

    // Funzione per tentare il play
    function tryPlayMusic() {
        const playPromise = audio.play();

        if (playPromise !== undefined) {
            playPromise.then((_: unknown) => {
                // L'autoplay è partito!
            })
                .catch((error: unknown) => {
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
            if (typeof w.updatePrestigeVisuals === 'function') w.updatePrestigeVisuals();
            if (typeof w.openPrestigeHub === 'function') w.openPrestigeHub();
        });
    }

    if (btnConfirmPrestige) {
        btnConfirmPrestige.addEventListener('click', () => {
            if (typeof w.executePrestige === 'function') w.executePrestige();
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
    function createMixerRow(id: any, name: any, val: any) {
        const row = document.createElement('div');
        row.className = 'mixer-row';
        const color = val === 0 ? '#7f8c8d' : '#3498db';

        row.innerHTML = `
            <div class="mixer-label" title="${name}">${name}</div>
            <div class="mixer-controls">
                <input type="range" class="mixer-slider"
                       data-target="${id}"
                       min="0" max="1" step="0.05"
                       value="${val}">
                <span class="mixer-value" style="color: ${color};">
                    ${Math.round(val * 100)}%
                </span>
            </div>
            <button class="mixer-test-btn" data-target="${id}" title="Prova Audio">
                <i class="fa-solid fa-play" style="margin-left: 2px;"></i>
            </button>
        `;

        // L'anteprima vive finché il puntatore resta sulla RIGA, non solo sul
        // bottone: così si arriva al cursore e si regola il volume mentre si
        // ascolta. Si ferma solo uscendo dalla riga per intero.
        // NB: la versione precedente cercava document.getElementById(targetId),
        // che esiste solo per i <video>: sui suoni Howler `el` era null e questo
        // handler non fermava niente. Ora passa dal controllo centralizzato,
        // che copre Howler e video allo stesso modo.
        row.addEventListener('mouseleave', () => {
            stopPreviewIfOwnedBy(row.querySelector('.mixer-test-btn'));
        });

        return row;
    }

    function renderAudioMixer() {
        const listAdvAudio = document.getElementById('advanced-audio-list');
        if (!listAdvAudio) return;
        listAdvAudio.innerHTML = '';

        const Game = getGameAPI();
        const assets = store.gameData.assets;
        const userAudio = Game.getGameState().user.audioCustom;

        // Categorie
        const categories: Record<string, { title: any; icon: string; items: any[] }> = {
            'ambiente': { title: store.gameData.texts.ui.audioCatAmbiente, icon: 'fa-music', items: [] },
            'eventi': { title: store.gameData.texts.ui.audioCatEventi, icon: 'fa-film', items: [] },
            'effetti': { title: store.gameData.texts.ui.audioCatEffetti, icon: 'fa-volume-high', items: [] }
        };

        // SOLO i suoni: i video (Rick, Ricardo, Britney, Big Bang) non sono più
        // regolabili dal mixer — restano al loro defaultVol, governati da master +
        // musica. Coerente con getCustomVolume(), che per gli id video ignora
        // audioCustom: senza quello chi avesse lasciato un video a 0% resterebbe
        // muto senza più uno slider per rimediare.
        const allAssets: any = { ...assets.sounds };

        // Popola categorie
        for (const [key, data] of Object.entries(allAssets) as [string, any][]) {
            if (categories[data.category]) {
                categories[data.category]!.items.push({ key, ...data });
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
                const targetEl = e.target as HTMLInputElement;
                const targetId = targetEl.getAttribute('data-target')!;
                const newVal = parseFloat(targetEl.value);

                Game.getGameState().user.audioCustom[targetId] = newVal;

                // Aggiorna UI percentuale
                const valSpan = targetEl.parentElement!.querySelector('.mixer-value') as HTMLElement;
                valSpan.textContent = Math.round(newVal * 100) + '%';
                valSpan.style.color = newVal === 0 ? '#7f8c8d' : '#3498db';

                // Applica volume in tempo reale via AudioManager
                if (typeof w.AudioManager !== 'undefined') {
                    const def = w.AudioManager._getSoundDef(targetId);
                    const type = (def && def.type === 'music') ? 'music' : 'sfx';
                    w.AudioManager.setVolume(targetId, w.AudioManager._calcVolume(targetId, type));
                    // Questo slider non passa da updateAmbience(): ripubblica a mano
                    // la fotografia per l'arcade, altrimenti i suoni di Super Espo
                    // restano al valore precedente finche' non cambia altro.
                    if (w.AudioManager._publishArcadeAudio) w.AudioManager._publishArcadeAudio();
                }
            });
        });

        // Listener Test Buttons
        listAdvAudio.querySelectorAll('.mixer-test-btn').forEach(btn => {
            btn.addEventListener('click', () => handleTestAudioClick(btn));
            // Nessun listener di uscita sul bottone: lo stop è agganciato alla
            // riga intera (vedi createMixerRow), altrimenti spostando il
            // puntatore dal bottone al cursore l'anteprima si interromperebbe
            // proprio mentre si sta regolando il volume.
        });
    }

    function handleTestAudioClick(btn: any) {
        const targetId = btn.getAttribute('data-target');
        const icon = btn.querySelector('i');

        // Video: gestione diretta sull'elemento DOM
        const videoEl = document.getElementById(targetId) as HTMLMediaElement | null;
        if (videoEl && videoEl.tagName === 'VIDEO') {
            // Secondo click sullo stesso bottone = stop. Passa da stopAllTestAudio
            // cosi' il timer dei 3 s viene azzerato: altrimenti resterebbe armato
            // e spegnerebbe l'anteprima successiva a meta'.
            if (!videoEl.paused && !videoEl.ended) {
                w.stopAllTestAudio();
                w.resetTestButtons();
                return;
            }
            w.stopAllTestAudio();
            w.resetTestButtons();
            const Game = getGameAPI();
            const userVol = Game.getGameState().user;
            const customVal = (Game.getGameState().user.audioCustom[targetId] ?? 1);
            const finalVol = Math.max(0, Math.min(1, userVol.masterVolume * userVol.musicVolume * customVal));
            if (finalVol <= 0) return; // 0% = muto, come per i suoni Howler
            videoEl.volume = finalVol;
            videoEl.currentTime = 0;
            videoEl.style.display = 'none'; // Solo audio nel mixer
            videoEl.play().then(() => {
                btn.classList.add('playing');
                icon.className = 'fa-solid fa-stop';
                icon.style.marginLeft = '0';
                armTestPreview(btn);
                videoEl.onended = () => {
                    btn.classList.remove('playing');
                    icon.className = 'fa-solid fa-play';
                    icon.style.marginLeft = '2px';
                };
            }).catch((e: any) => {
                if (e.name !== 'AbortError') console.error("Errore playback video test:", e);
            });
            return;
        }

        // Audio: gestione via AudioManager (Howler)
        if (typeof w.AudioManager === 'undefined') return;
        const howl = w.AudioManager.getHowl(targetId);
        if (!howl) return;

        // Secondo click sullo stesso bottone = stop (e disarma il timer dei 3 s)
        if (howl.playing()) {
            w.stopAllTestAudio();
            w.resetTestButtons();
            return;
        }

        w.stopAllTestAudio();
        w.resetTestButtons();

        const def = w.AudioManager._getSoundDef(targetId);
        const type = (def && def.type === 'music') ? 'music' : 'sfx';
        const vol = w.AudioManager._calcVolume(targetId, type);

        // 0% deve essere muto davvero. Prima, quando il volume calcolato era 0,
        // il tester lo forzava a 0.1 "così senti qualcosa": il risultato era che
        // azzerare un cursore sembrava non avere effetto. Se è a zero non parte
        // nulla — e il bottone resta su play, che è la lettura corretta.
        if (vol <= 0) return;

        const startPlayback = () => {
            howl.volume(vol);
            howl.play();
            btn.classList.add('playing');
            icon.className = 'fa-solid fa-stop';
            icon.style.marginLeft = '0';
            armTestPreview(btn);

            // Auto-reset a fine traccia, per i suoni piu' corti di 3 s che finiscono
            // da soli prima del cap. Sui loop non scatta mai: li chiude il timer.
            howl.once('end', () => {
                btn.classList.remove('playing');
                icon.className = 'fa-solid fa-play';
                icon.style.marginLeft = '2px';
            });
        };

        // Suoni con preload:false (quelli dell'arcade, registrati qui solo per
        // comparire nel mixer) arrivano al primo click ancora scaricati.
        // ⚠️ Howler 2.x NON scarica da solo in questo caso: play() accoda la
        // richiesta e resta muto per sempre finche' non si chiama load() a mano.
        if (howl.state() === 'unloaded') {
            // Prenota subito il bottone: se il puntatore esce mentre scarica,
            // stopTestPreview() azzera activePreviewBtn e il play non parte.
            activePreviewBtn = btn;
            howl.once('load', () => {
                if (activePreviewBtn !== btn) return; // anteprima gia' annullata
                startPlayback();
            });
            howl.load();
            return;
        }
        startPlayback();
    }

    if (btnAdvAudio) {
        btnAdvAudio.addEventListener('click', () => {
            // Salva lo stato attuale (es. se c'è Espo Fury attivo)
            if (w.currentActiveEvent !== 'Audio Mixer') {
                w.preMixerEvent = w.currentActiveEvent;
            }
            w.currentActiveEvent = 'Audio Mixer';

            // Chiudi settings e apri Mixer.
            // openModal() e non `style.display = 'flex'`: solo lui fa il "reset stato
            // pulito" (visibility/opacity/transform) di un modale reduce da un close.
            // Con l'apertura raw il Mixer chiuso cliccando fuori si riapriva invisibile.
            if (settingsModal) settingsModal.style.display = 'none';
            if (modalAdvAudio) openModal(modalAdvAudio);

            // STOP TOTALE: Silenzia tutto (Howler + video DOM)
            if (typeof w.AudioManager !== 'undefined') {
                for (const id in w.AudioManager._sounds) {
                    w.AudioManager.stop(id, 0);
                }
            }
            document.querySelectorAll('video').forEach(el => {
                if (!el.paused) { el.pause(); el.currentTime = 0; }
            });

            // Genera interfaccia
            renderAudioMixer();
        });
    }
    // Ripristino post-Mixer. DEVE girare su OGNI percorso di chiusura, non solo sul
    // pulsante "indietro": chiudendo cliccando fuori (o con Esc, o dalla X) si passa
    // solo da closeModal() e questo blocco veniva saltato. currentActiveEvent restava
    // 'Audio Mixer' per sempre, con due conseguenze: _applyAmbience() teneva la musica
    // a zero (il Mixer silenzia tutto in apertura) e checkEventConflict() rifiutava
    // ogni nuovo evento con "⛔ Occupato". Chiamata da closeModal, vedi sotto.
    function restoreAfterMixer() {
        // Guard: se l'evento corrente non è il Mixer non c'è niente da ripristinare,
        // e azzerarlo comunque spegnerebbe un evento legittimo in corso.
        if (w.currentActiveEvent !== 'Audio Mixer') return;

        if (typeof w.stopAllTestAudio === 'function') w.stopAllTestAudio();
        if (typeof w.resetTestButtons === 'function') w.resetTestButtons();

        // Ripristina lo stato precedente (es. Espo Fury che girava prima del Mixer)
        w.currentActiveEvent = w.preMixerEvent || null;
        w.preMixerEvent = null;

        if (typeof w.AudioManager !== 'undefined' && w.AudioManager.updateAmbience) {
            w.AudioManager.updateAmbience();
        }

        // Smart resume (fallback per la musica di background standard)
        if (w.EspooClicker && typeof w.EspooClicker.tryStartAudio === 'function') {
            w.EspooClicker.tryStartAudio();
        }
    }

    if (btnHeaderBack) {
        btnHeaderBack.addEventListener('click', () => {
            // Chiudi Mixer
            if (modalAdvAudio) modalAdvAudio.style.display = 'none';

            // Riapri Settings
            if (settingsModal) settingsModal.style.display = 'flex';

            restoreAfterMixer();
        });
    }

    if (btnHeaderReset) {
        btnHeaderReset.addEventListener('click', () => {
            if (confirm(store.gameData.texts.dialogs.audioResetConfirm)) {
                const Game = w.EspooClicker;
                if (!Game) return;

                const assets = store.gameData.assets;
                // Solo i suoni: i video non hanno più uno slider da resettare
                const allAssets: any = { ...assets.sounds };

                // Ripristina i valori nel salvataggio usando il 'defaultVol' di game-data
                for (const [key, data] of Object.entries(allAssets) as [string, any][]) {
                    if (data.defaultVol !== undefined) {
                        Game.getGameState().user.audioCustom[data.id] = data.defaultVol;
                    }
                }

                Game.saveGame();
                renderAudioMixer(); // Ridisegna gli slider con i nuovi valori

                // Aggiorna il volume reale del gioco immediatamente
                if (typeof w.updateAmbientVolume === 'function') w.updateAmbientVolume();

                Game.showToast(store.gameData.texts.toasts.audioReset, "info");
            }
        });
    }

    // ==========================================
    // 3. GESTIONE MODALI STANDARD
    // ==========================================

    function getGameAPI() { return w.EspooClicker || null; }

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
                    const ln = LOGIN_STREAM_LINES[(startIdx + k) % n]!;
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
    let _loginStreamTimer: ReturnType<typeof setTimeout> | null = null;
    window.addEventListener('resize', () => {
        const lm = document.getElementById('login-modal');
        if (!lm || getComputedStyle(lm).display === 'none') return;
        clearTimeout(_loginStreamTimer ?? undefined);
        _loginStreamTimer = setTimeout(buildLoginStream, 200);
    });

    function openModal(modal: any) {
        if (modal) {
            const content = modal.querySelector('.modal-content');

            // Kill animazioni in corso (close ancora attivo, ecc.)
            if (typeof w.gsap !== 'undefined') {
                w.gsap.killTweensOf(modal);
                if (content) w.gsap.killTweensOf(content);
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
            if (content && typeof w.gsap !== 'undefined') {
                w.gsap.fromTo(content,
                    { scale: 0.97, opacity: 0 },
                    { scale: 1, opacity: 1, duration: 0.26, ease: "power2.out", clearProps: 'transform,opacity' }
                );
                // Login: la scena fullscreen compare OPACA dal primo frame, così durante
                // l'entrata non traspare ciò che sta dietro (gioco / canvas Matrix verde).
                // Solo l'HUD (.modal-content) viene animato. Gli altri modali mantengono il fade.
                if (modal.id === 'login-modal') {
                    modal.style.opacity = 1;
                } else {
                    w.gsap.fromTo(modal,
                        { opacity: 0 },
                        { opacity: 1, duration: 0.22, ease: "power1.out", clearProps: 'opacity' }
                    );
                }
            } else if (content) {
                modal.style.opacity = 1;
            }

            document.body.classList.add('modal-open');

            // Suona SOLO se il modale NON è quello di login
            if (modal.id !== 'login-modal') {
                if (typeof w.AudioManager !== 'undefined') {
                    w.AudioManager.playClickEffect();
                } else if (typeof w.playSound === 'function') {
                    w.playSound('sound-click');
                }
            }
        }
    }

    function closeModal(modal: any) {
        if (modal) {
            // Il Mixer silenzia tutto in apertura: qualunque via di uscita (sfondo, Esc,
            // X) deve rimettere a posto audio ed evento, non solo il pulsante "indietro".
            // Subito, non nell'onComplete: l'audio non deve aspettare l'animazione.
            if (modal.id === 'advanced-audio-modal') restoreAfterMixer();

            const content = modal.querySelector('.modal-content');

            // Kill any open tweens prima di partire close
            if (typeof w.gsap !== 'undefined') {
                w.gsap.killTweensOf(modal);
                if (content) w.gsap.killTweensOf(content);
            }

            // Animazione uscita (veloce, no scale 0.8 = no jump grosso)
            if (content && typeof w.gsap !== 'undefined') {
                w.gsap.to(content, {
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
                // clearProps OBBLIGATORIO: questo tween gira in parallelo a quello del
                // contenuto e finisce nello stesso tick. Il contenuto renderizza per primo
                // e il suo onComplete fa `modal.style.opacity = ''`, poi QUESTO riscriveva
                // 0 inline e ce lo lasciava. Il modale restava display:none + opacity:0, e
                // chi lo riapriva senza passare da openModal() (che resetta) se lo ritrovava
                // invisibile ma cliccabile: backdrop trasparente a schermo intero che si
                // mangiava i click. Vedi il Mixer Audio, sotto.
                w.gsap.to(modal, { opacity: 0, duration: 0.18, clearProps: 'opacity' });
            } else {
                modal.style.display = 'none';
                if (content) { content.style.transform = ''; content.style.opacity = ''; }
                modal.style.opacity = '';
                finishClose();
            }

            function finishClose() {
                let anyOpen = false;
                (document.querySelectorAll('.modal-backdrop') as NodeListOf<HTMLElement>).forEach(m => {
                    if (m.style.display === 'flex' && m !== modal && m.style.opacity !== '0') anyOpen = true;
                });

                if (!anyOpen) {
                    document.body.classList.remove('modal-open');
                }
            }
        }
    }

    // A11y: Esc chiude il modale visibile in cima. Esclusi i due GATE: il login e la
    // scelta skin del lancio (chiuderla lascerebbe il Fondatore senza skin per tutta
    // la sessione, perche' a sbloccarle e' la conferma del modale stesso).
    const ESC_GATES = ['login-modal', 'launch-migration-modal'];
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        const open = (Array.from(document.querySelectorAll('.modal-backdrop')) as HTMLElement[])
            .filter(m => m.style.display === 'flex' && m.style.opacity !== '0' && !ESC_GATES.includes(m.id));
        if (open.length) closeModal(open[open.length - 1]);
    });

    // A11y: chiudi cliccando sullo sfondo, fuori dal contenuto (tranne il login)
    allModals.forEach(m => {
        m.addEventListener('click', (e) => {
            if (e.target === m && m.id !== 'login-modal') closeModal(m);
        });
    });

    if (openAchievementsBtn) openAchievementsBtn.addEventListener('click', () => {
        if (typeof w.updateAchievementsUI === 'function') w.updateAchievementsUI();
        openModal(achievementsModal);
    });

    if (openHelpBtn) openHelpBtn.addEventListener('click', () => openModal(helpModal));

    // --- Popup "come si segnala" (una tantum) ---
    const fbIntroModal = document.getElementById('feedback-intro-modal');
    const fbIntroOk = document.getElementById('fbintro-ok');
    const fbIntroOpen = document.getElementById('fbintro-open');
    if (fbIntroOk) fbIntroOk.addEventListener('click', () => closeModal(fbIntroModal));
    if (fbIntroOpen) fbIntroOpen.addEventListener('click', () => {
        // Prima chiude, poi apre l'Aiuto: aprirlo sotto lascerebbe due
        // fondali sovrapposti e il popup davanti al modulo da compilare.
        closeModal(fbIntroModal);
        setTimeout(() => { if (typeof w.openFeedbackTab === 'function') w.openFeedbackTab(); }, 260);
    });
    if (openSkinsBtn) openSkinsBtn.addEventListener('click', () => {
        if (typeof w.updateSkinsUI === 'function') w.updateSkinsUI();
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

    // Aggiorna il nome utente mostrato nella navbar e nell'header dell'hub
    function setAccountIdentity(name: any) {
        const fallback = (store.gameData && store.gameData.texts && store.gameData.texts.ui && store.gameData.texts.ui.defaultPlayer) || 'Giocatore';
        const n = name || fallback;
        // La navbar NON mostra piu' il nome utente: la sua lunghezza e' libera e
        // sforava la scatola fissa da 72px del .nav-item, finendo sopra il bottone
        // Opzioni (e con l'ellissi restavano visibili si' e no 8 caratteri).
        // Ora la label e' fissa ("Profilo"/"Profile", langs/*.php) e comunica il
        // contenuto dell'hub — account + amici. Il nome vive nell'header dell'hub
        // e nel tooltip, dove la lunghezza non impatta il layout.
        const navBtn = document.getElementById('open-user-hub-btn');
        if (navBtn) {
            const base = navBtn.getAttribute('data-title-base')
                || (navBtn.getAttribute('title') || '').split(' — ')[0];
            if (base && !navBtn.hasAttribute('data-title-base')) navBtn.setAttribute('data-title-base', base);
            navBtn.setAttribute('title', base ? `${base} — ${n}` : n);
        }
        const big = document.getElementById('display-username-large');
        if (big) big.textContent = n;
    }

    // Attiva una tab dell'hub nome-utente (account | amici)
    function setHubTab(target: any) {
        if (!userHubModal) return;
        userHubModal.querySelectorAll('.hub-tab').forEach(t => {
            const on = t.getAttribute('data-hubtab') === target;
            t.classList.toggle('active', on);
            t.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        (userHubModal.querySelectorAll('.hub-pane') as NodeListOf<HTMLElement>).forEach(p => {
            const on = p.getAttribute('data-hubpane') === target;
            p.classList.toggle('active', on);
            p.style.display = on ? '' : 'none';
        });
    }

    if (userHubModal) {
        userHubModal.querySelectorAll('.hub-tab').forEach(tab => {
            tab.addEventListener('click', () => setHubTab(tab.getAttribute('data-hubtab')));
        });
    }

    // Apertura del menu nome-utente dalla navbar
    if (openUserHubBtn) openUserHubBtn.addEventListener('click', () => {
        const Game = getGameAPI();
        if (Game) {
            const user = Game.getGameState().user;
            setAccountIdentity(user && user.username);
        }
        setHubTab('account'); // ogni apertura riparte dalla tab Account
        // Area Critica sempre richiusa all'apertura: va aperta apposta per accedere
        const dz = userHubModal && userHubModal.querySelector('.danger-collapsible');
        if (dz) dz.removeAttribute('open');
        const dzPass = document.getElementById('danger-zone-password') as HTMLInputElement | null;
        if (dzPass) dzPass.value = '';
        openModal(userHubModal);
    });

    allModals.forEach(modal => {
        modal.addEventListener('click', (e) => {
            // Nota: rimosso il check isFastClick() — bloccava i click legittimi
            // post-touchend (DevTools device emulation, mobile moderni). Con
            // viewport width=device-width il "ghost click" 300ms non esiste più.
            if ((e.target as HTMLElement).classList.contains('modal-close-btn')) {
                closeModal(modal);

                if (modal.id === 'arcade-modal' && w.currentActiveEvent === 'Arcade Mode') {
                    w.currentActiveEvent = null;
                    if (typeof w.AudioManager !== 'undefined') w.AudioManager.updateAmbience();
                    if (typeof w.exitSnakeGame === 'function') w.exitSnakeGame();
                    if (typeof w.exitSpaceGame === 'function') w.exitSpaceGame();
                    if (typeof w.exitAsteroidsGame === 'function') w.exitAsteroidsGame();
                    if (typeof w.exitInvadersGame === 'function') w.exitInvadersGame();
                    if (typeof w.exitCentipedeGame === 'function') w.exitCentipedeGame();
                    // Senza questa, chiudendo la sala giochi mentre giri su Stack
                    // Overflow il suo ciclo di disegno resta vivo in sottofondo.
                    if (typeof w.exitStackGame === 'function') w.exitStackGame();
                }

                // La X delle impostazioni salva come «Chiudi & Salva»: le
                // modifiche (volumi, lingua) sono già applicate live allo
                // stato, quindi chiudere senza persistere creerebbe l'unico
                // caso in cui una regolazione fatta si perde a fine sessione.
                // Senza toast: la X è un gesto di uscita, non di conferma.
                if (modal.id === 'settings-modal') {
                    const Game = getGameAPI();
                    if (Game && typeof Game.saveGame === 'function') Game.saveGame();
                }

                // Il popup "come si segnala" si accoda alle note di rilascio, mai
                // sovrapposto: parte solo quando quelle vengono chiuse.
                if (modal.id === 'release-notes-modal' && w.shouldShowFeedbackIntro) {
                    setTimeout(() => {
                        if (w.EspooClicker && typeof w.EspooClicker.openFeedbackIntro === 'function') {
                            w.EspooClicker.openFeedbackIntro();
                        }
                    }, 350);
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
        const langSelect = document.getElementById('lang-select') as HTMLSelectElement | null;
        if (langSelect) {
            langSelect.value = w.APP_LANG || 'it';
            langSelect.onchange = function () {
                const lang = langSelect.value === 'en' ? 'en' : 'it';
                document.cookie = 'user_default_language=' + lang + ';path=/;max-age=' + (60 * 60 * 24 * 365);
                location.reload();
            };
        }

        // Aggiornamento UI esistente (Username e Slider)
        if (currentUsernameDisplay) currentUsernameDisplay.textContent = userSettings.username;
        if (masterSlider) {
            masterSlider.value = userSettings.masterVolume;
            if (masterDisplay) masterDisplay.textContent = String(Math.round(userSettings.masterVolume * 100));
        }

        const oldMusicSelect = document.getElementById('bg-music-select') as HTMLSelectElement | null;
        const lockMsg = document.getElementById('bg-music-lock-msg') as HTMLElement | null;

        if (oldMusicSelect) {
            // 1. Inizializza la preferenza se manca (per salvataggi vecchi)
            if (!userSettings.bgMusicSelection) userSettings.bgMusicSelection = 'sound-bg-music';

            // 2. Controlla se la skin attuale FORZA la musica
            const currentSkinId = gameState.skins.current;
            const currentSkinData = store.gameData.skins[currentSkinId];
            const isThemeLocked = currentSkinData && currentSkinData.themeConfig && currentSkinData.themeConfig.specialMusic;

            // 3. Crea un NUOVO elemento select pulito (clone superficiale per rimuovere listener vecchi)
            const newSelect = oldMusicSelect.cloneNode(false) as HTMLSelectElement; // false = non copiare le option vecchie

            // Gestione UI Blocco
            newSelect.disabled = isThemeLocked;
            newSelect.style.opacity = isThemeLocked ? '0.5' : '1';
            if (lockMsg) lockMsg.style.display = isThemeLocked ? 'block' : 'none';

            // 4. Mappatura Sblocchi (Definizione regole)
            const musicUnlockMap: Record<string, string | null> = {
                'sound-bg-music': null,
                'sound-bg-music-v2': null,
                'sound-bg-music-v3': null,
                'sound-bg-bit': 'espobit',
                'sound-snowball': 'christmas',
                'sound-bg-music-super': 'superespo',
                'sound-bg-music-espory': 'espory',
                'sound-bg-music-divine': 'jesus'
            };

            const sounds = store.gameData.assets.sounds;
            const excludedTracks = ['sound-bluescreen', 'sound-matrix', 'sound-fury-music', 'sound-star'];

            // 5. Popola le opzioni
            for (const [key, sound] of Object.entries(sounds) as [string, any][]) {
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
                const val = (e.target as HTMLSelectElement).value;
                // Aggiorna lo stato globale
                Game.getGameState().user.bgMusicSelection = val;

                // Applica subito l'audio
                if (typeof w.AudioManager !== 'undefined') w.AudioManager.updateAmbience();

                // Salva
                Game.saveGame();
            });

            // 7. Sostituisci il vecchio select nel DOM con quello nuovo
            oldMusicSelect.parentNode!.replaceChild(newSelect, oldMusicSelect);
        }

        openModal(settingsModal);
    }

    function setupAudioControl(slider: any, display: any, key: any, isMusic = false) {
        if (!slider) return;
        const Game = w.EspooClicker;
        if (!Game) return;

        slider.value = Game.getGameState().user[key];
        if (display) display.textContent = Math.round(slider.value * 100);

        slider.addEventListener('input', () => {
            const val = parseFloat(slider.value);
            Game.getGameState().user[key] = val;
            if (display) display.textContent = Math.round(val * 100);
            if (isMusic || key === 'masterVolume') {
                if (typeof w.updateAmbientVolume === 'function') w.updateAmbientVolume();
            }
            // Mantieni sincronizzata l'icona del quick-mute con lo slider master
            if (key === 'masterVolume' && typeof Game.updateMuteButton === 'function') {
                Game.updateMuteButton();
            }
        });
    }

    function initModalBindings() {
        const Game = w.EspooClicker;
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
    if (w.EspooClicker)
        initModalBindings();
    else
        document.addEventListener('EspoGameReady', initModalBindings);

    if (loginButton) loginButton.addEventListener('click', handleLogin);

    w._showLoginForTokenExpiry = () => {
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
    // Restituisce SEMPRE un esito { ok, reason }: chi la chiama in automatico
    // (saveGame) può ignorarlo, ma il tap sul badge ci costruisce sopra il
    // messaggio da mostrare. Prima ogni uscita era un `return` nudo, quindi il
    // chiamante non aveva modo di distinguere "fatto" da "non ho fatto niente".
    w._silentTokenRefresh = async () => {
        const u = sessionStorage.getItem('espooUser');
        const p = sessionStorage.getItem('espooPass');
        if (!u || !p) return { ok: false, reason: 'nocreds' };
        if (w._tokenRefreshing) return { ok: false, reason: 'busy' };
        const Game = getGameAPI();
        if (!Game || typeof Game.setSaveToken !== 'function') return { ok: false, reason: 'noapi' };
        w._tokenRefreshing = true;
        try {
            const res = await w.EspoBackend.call('refresh-token', { username: u, password: p });
            const data = await res.json();
            if (data.status === 'success' && data.save_token) {
                Game.setSaveToken(data.save_token, data.token_expires_at);
                w._tokenExpiredNotified = false;
                return { ok: true, reason: 'token' };
            }
            return { ok: false, reason: 'login' };
        } catch (e) {
            // silenzioso verso l'automatismo: il fallback reattivo coprirà
            // l'eventuale scadenza. Ma l'esito torna comunque a chi l'ha chiesto.
            return { ok: false, reason: 'network' };
        } finally {
            w._tokenRefreshing = false;
        }
    };

    // Recovery da CONFLITTO cloud: il server ha rifiutato il salvataggio perché il DB è
    // più avanti (Format>Prestige>Score). Rifacciamo il fetch del save cloud e lo
    // adottiamo in modo AUTORITATIVO (force) — il confronto solo-lifetimeScore del load
    // normale non basta a risolvere il conflitto. Così il client si riallinea e i
    // salvataggi riprendono. Niente auto-overwrite: parte solo su azione esplicita (badge).
    // Come _silentTokenRefresh, restituisce SEMPRE un esito { ok, reason }.
    // Le cinque uscite mute di prima erano la causa diretta della segnalazione
    // QA "clicco il badge e non succede niente": erano tutte plausibili al tap
    // (credenziali di sessione assenti, resync già in volo, login rifiutato,
    // rete giù) e nessuna diceva niente a chi aveva cliccato.
    w._resyncFromCloud = async () => {
        // DEV (Admin Console): se lo stato è stato alterato da un cheat NON riallinearlo al
        // cloud — annullerebbe lo scenario/cheat caricato. Coerente con saveGame, che in quel
        // caso salta del tutto il push (quindi non genera nemmeno il conflitto che porta qui).
        if (w.cheatNoCloudSync) return { ok: false, reason: 'cheat' };
        const u = sessionStorage.getItem('espooUser');
        const p = sessionStorage.getItem('espooPass');
        if (!u || !p) return { ok: false, reason: 'nocreds' };
        if (w._resyncing) return { ok: false, reason: 'busy' };
        const Game = getGameAPI();
        if (!Game || typeof Game.loadCloudData !== 'function') return { ok: false, reason: 'noapi' };
        w._resyncing = true;
        try {
            const res = await w.EspoBackend.call('login-register', { username: u, password: p });
            const data = await res.json();
            if (data.status !== 'success') return { ok: false, reason: 'login' };

            if (typeof Game.setSaveToken === 'function') Game.setSaveToken(data.save_token, data.token_expires_at);
            w._tokenExpiredNotified = false;
            if (!data.save_data) {
                // Login riuscito ma niente da adottare: il conflitto non può
                // essere risolto da qui, però il token è comunque rinnovato.
                return { ok: true, reason: 'notdata' };
            }
            Game.loadCloudData(data.save_data, { force: true });
            if (typeof Game.saveGame === 'function') Game.saveGame(); // riconferma lo stato riallineato
            return { ok: true, reason: 'resynced' };
        } catch (e) {
            return { ok: false, reason: 'network' };
        } finally {
            w._resyncing = false;
        }
    };

    if (logoutBtn) logoutBtn.addEventListener('click', async () => {
        if (confirm(store.gameData.texts.dialogs.logout)) {
            sessionStorage.clear();
            if (w.SaveDB && typeof w.SaveDB.clearIndexedDB === 'function') {
                try { await w.SaveDB.clearIndexedDB(); } catch (e) { console.warn('IndexedDB clear failed:', e); }
            }
            localStorage.removeItem('espotoolClickerSaveV9');
            localStorage.removeItem('espotoolClickerSaveV9_Backup');
            location.reload();
        }
    });

    // Handler pulsanti Account (change user/pass/delete)
    if (changePassBtn) changePassBtn.addEventListener('click', async () => {
        const Game = getGameAPI();
        const oldPass = (document.getElementById('old-password-input') as HTMLInputElement).value;
        const newPass = (document.getElementById('new-password-input') as HTMLInputElement).value;
        if (!oldPass || !newPass) { alert(store.gameData.texts.dialogs.fillFields); return; }

        try {
            const res = await w.EspoBackend.call('change-password', { save_token: Game.getSaveToken(), oldPassword: oldPass, newPassword: newPass });
            const data = await res.json();
            if (data.status === 'success') {
                Game.showToast(store.gameData.texts.toasts.passChanged, "success");
                Game.setPassword(newPass);	// Aggiorno la password per le varie funzioni di salvataggio
                sessionStorage.setItem('espooPass', newPass); // Aggiorna sessione
            } else {
                alert(data.message);
            }
        } catch (e) { console.error(e); }
    });

    if (changeUserBtn) changeUserBtn.addEventListener('click', async () => {
        const Game = getGameAPI();
        const newName = (document.getElementById('new-username-input') as HTMLInputElement).value;
        const password = prompt(store.gameData.texts.dialogs.confirmPass);
        if (!newName || !password) return;

        try {
            const res = await w.EspoBackend.call('change-username', { save_token: Game.getSaveToken(), password: password, newUsername: newName });
            const data = await res.json();
            if (data.status === 'success') {
                Game.getGameState().user.username = newName;
                sessionStorage.setItem('espooUser', newName);
                setAccountIdentity(newName);
                Game.showToast(store.gameData.texts.toasts.nameChanged, "success");
                Game.saveGame();
            } else {
                alert(data.message);
            }
        } catch (e) { console.error(e); }
    });

    if (deleteSaveBtn) deleteSaveBtn.addEventListener('click', async () => {
        const password = (document.getElementById('danger-zone-password') as HTMLInputElement).value;
        if (!password) { alert(store.gameData.texts.dialogs.enterPass); return; }
        if (!confirm(store.gameData.texts.dialogs.deleteConfirm)) return;

        const Game = getGameAPI();
        try {
            const res = await w.EspoBackend.call('delete-user', { save_token: Game.getSaveToken(), password: password });
            const data = await res.json();
            if (data.status === 'success') {
                // Impedisci il salvataggio automatico alla chiusura
                Game.getGameState().isDeleting = true;


                alert(store.gameData.texts.dialogs.accountDeleted);
                sessionStorage.clear();
                localStorage.clear(); // Pulisce tutto il browser
                if (w.SaveDB && typeof w.SaveDB.clearIndexedDB === 'function') {
                    try { await w.SaveDB.clearIndexedDB(); } catch (e) { console.warn('IndexedDB clear failed:', e); }
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
            const password = (document.getElementById('danger-zone-password') as HTMLInputElement).value;
            if (!password) { alert(store.gameData.texts.dialogs.enterPass); return; }
            if (!confirm(store.gameData.texts.dialogs.resetConfirm)) return;

            const Game = getGameAPI();
            try {
                const res = await w.EspoBackend.call('reset-progress', { save_token: Game.getSaveToken(), password: password });
                const data = await res.json();
                if (data.status === 'success') {
                    // Evita che il salvataggio automatico sovrascriva il reset
                    Game.getGameState().isDeleting = true;

                    alert(store.gameData.texts.dialogs.progressReset);

                    if (w.SaveDB && typeof w.SaveDB.clearIndexedDB === 'function') {
                        try { await w.SaveDB.clearIndexedDB(); } catch (e) { console.warn('IndexedDB clear failed:', e); }
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
            Game.showToast(store.gameData.texts.toasts.settingsSaved);
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
            const res = await w.EspoBackend.call('login-register', { username: u, password: p });
            const data = await res.json();
            if (data.status === 'success') {
                sessionStorage.setItem('espooUser', u);
                sessionStorage.setItem('espooPass', p);
                Game.setPassword(p);
                Game.setSaveToken(data.save_token, data.token_expires_at);
                w._tokenExpiredNotified = false;

                // DEV (Admin Console): se un cheat/scenario è attivo NON riallineare
                // lo stato al cloud (stesso guard di _resyncFromCloud). Il re-auth per
                // token scaduto e l'auto-login all'avvio passano da qui: senza guard
                // l'anti-rollback adottava il save cloud "più avanti" annullando lo
                // scenario caricato. Token e sessione sono comunque già aggiornati sopra.
                if (w.cheatNoCloudSync) { /* stato locale invariato */ }
                else if (data.save_data) Game.loadCloudData(data.save_data);
                else {
                    // Cloud senza save_data. Normalmente = account nuovo (mai salvato) →
                    // reset pulito. MA se il locale è un Season 1 REALE dello STESSO utente
                    // (launchMigrated + username coincidente), il cloud vuoto NON è un
                    // account nuovo: è un save cloud svuotato — es. il season-wipe di lancio
                    // se azzerasse anche save_data invece dei soli punteggi. In quel caso
                    // resettare cancellerebbe skin `founder` e progressi Season 1
                    // (irrecuperabili: nessun costo/achievement li ridà). Tieni il locale e
                    // ri-pushalo col token appena ottenuto, invece di distruggerlo.
                    const _gsPre = Game.getGameState();
                    const _localUser = _gsPre && _gsPre.user && _gsPre.user.username;
                    const _keepLocalSeason1 = !!(_gsPre && _gsPre.launchMigrated) && _localUser === u;

                    if (_keepLocalSeason1) {
                        console.warn('🚀 Cloud senza save_data ma locale Season 1 dello stesso utente → tengo il locale e ri-pusho (niente reset).');
                        _gsPre.user.username = u;
                        Game.saveGame();
                    } else {
                        if (typeof w.resetGameToDefault === 'function') w.resetGameToDefault();
                        localStorage.removeItem('espotoolClickerSaveV9');
                        localStorage.removeItem('espotoolClickerSaveV9_Backup');
                        Game.getGameState().user.username = u;
                        if (typeof w.applySkinVisuals === 'function') w.applySkinVisuals('default');
                        Game.saveGame();
                    }
                }

                closeModal(loginModal);
                setAccountIdentity(u); // popola il nome utente nella navbar (anche su auto-login F5)

                // Sblocca il contesto audio sfruttando il gesto di login: così gli SFX
                // dell'intro e la musica partono senza dover premere "Attiva audio".
                if (typeof w.Howler !== 'undefined' && w.Howler.ctx && w.Howler.ctx.state === 'suspended') {
                    w.Howler.ctx.resume().catch(() => {});
                }

                // L'intro cinematica parte solo su login esplicito (no F5/re-auth).
                // In quel caso azzera la musica (duck 0) PRIMA di startGameRoutines/
                // updateAmbientVolume: cosi' la canzone di sfondo NON parte durante
                // l'intro. Viene riavviata a fine intro (onComplete).
                const _willPlayIntro = !hadSession && w.EspoIntro && typeof w.EspoIntro.play === 'function';
                if (_willPlayIntro && typeof w.setMusicDuck === 'function') w.setMusicDuck(0);

                Game.startGameRoutines();

                // 1. PRIMA applica i volumi dal salvataggio ai tag HTML reali
                if (typeof w.updateAmbientVolume === 'function') {
                    w.updateAmbientVolume();
                }

                // 2. POI aggiorna gli slider visivi (perché non sembrino rotti se apri le opzioni)
                const userVol = Game.getGameState().user;
                if (masterSlider) {
                    masterSlider.value = userVol.masterVolume;
                    if (masterDisplay) masterDisplay.textContent = String(Math.round(userVol.masterVolume * 100));
                }
                if (sfxSlider) {
                    sfxSlider.value = userVol.sfxVolume;
                    if (sfxDisplay) sfxDisplay.textContent = String(Math.round(userVol.sfxVolume * 100));
                }
                if (musicSlider) {
                    musicSlider.value = userVol.musicVolume;
                    if (musicDisplay) musicDisplay.textContent = String(Math.round(userVol.musicVolume * 100));
                }
                // Sincronizza anche l'icona del quick-mute col volume caricato dal salvataggio
                if (typeof Game.updateMuteButton === 'function') Game.updateMuteButton();

                // --- INTRO CINEMATICA (login -> gioco) ---
                // L'audio (musica) parte al beat "reveal" via onReveal; i modali
                // post-login (V2 / release notes) partono a fine intro via onComplete.
                // Il toast "Benvenuto" e' rimosso: lo dice gia' l'intro.
                const runPostLogin = () => {
                    if (w.triggerLaunchMigrationModal || (store.gameState && store.gameState.pendingFounderChoice)) {
                        w.showLaunchMigrationModal(() => {
                            w.triggerLaunchMigrationModal = false;
                            if (w.shouldShowReleaseNotesOnLoad && Game.openReleaseNotes) {
                                Game.openReleaseNotes();
                            }
                        });
                    } else if (w.triggerV2MigrationModal) {
                        w.showV2MigrationModal(() => {
                            w.triggerV2MigrationModal = false;
                            if (w.shouldShowReleaseNotesOnLoad && Game.openReleaseNotes) {
                                Game.openReleaseNotes();
                            }
                        });
                    } else if (w.shouldShowReleaseNotesOnLoad) {
                        if (Game.openReleaseNotes) Game.openReleaseNotes();
                    }
                };

                if (_willPlayIntro) {
                    w.EspoIntro.play({
                        username: u,
                        // releaseAmbientVfx: la neve/VFX skin parte SOLO ora, a intro
                        // finita (non sul login né durante l'intro).
                        onComplete: () => { if (typeof w.setMusicDuck === 'function') w.setMusicDuck(1); Game.tryStartAudio(); if (typeof w.releaseAmbientVfx === 'function') w.releaseAmbientVfx(); runPostLogin(); }
                    });
                } else {
                    // Fallback difensivo: comportamento ~ a prima dell'intro.
                    // Niente intro (F5/re-auth): il gioco è già visibile → VFX subito.
                    Game.tryStartAudio();
                    if (typeof w.releaseAmbientVfx === 'function') w.releaseAmbientVfx();
                    runPostLogin();
                }
            } else {
                alert(data.message);
            }
        } catch (e) { console.error(e); }
        loginButton.disabled = false;
    }

    function setupEnterKey(inputElement: any, actionBtn: any) {
        if (inputElement) {
            inputElement.addEventListener('keypress', (e: any) => {
                if (e.key === 'Enter') { e.preventDefault(); actionBtn.click(); }
            });
        }
    }
    setupEnterKey(loginInput, loginButton);
    setupEnterKey(loginPasswordInput, loginButton);
  });
}
