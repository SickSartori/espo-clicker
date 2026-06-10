// --- GESTIONE CONFLITTI EVENTI (SEMAFORO) ---
let fireParticleInterval = null;
let lastRicardoVideoId = null;

window.currentActiveEvent = null; // Il "Semaforo"
let audioGlitchInterval = null;
let lastVideoPlayedId = null;

const RewardHandlers = {
    // Aggiunge Bug al wallet
    bugs: (value) => {
        let val = new Decimal(value);
        gameState.score = gameState.score.add(val);
        gameState.totalScore = gameState.totalScore.add(val);
        gameState.lifetimeScore = gameState.lifetimeScore.add(val);
        return `+${formatNumber(val)} Bug!`;
    },
    // Aggiunge Token Prestigio
    prestige: (value) => {
        let val = new Decimal(value);
        gameState.prestigePoints = gameState.prestigePoints.add(val);
        return `+${formatNumber(val)} Token Lab!`;
    },
    // Sblocca una Skin (Invariato)
    skin: (skinId) => {
        if (!gameState.skins.unlocked.includes(skinId)) {
            gameState.skins.unlocked.push(skinId);
            const skinName = gameData.skins[skinId] ? gameData.skins[skinId].name : skinId;
            return gameData.texts.toasts.skinUnlock.replace('{name}', skinName);
        }
        return null;
    },
    multiplier: (value) => {
        return `Bonus BPS x${value} Attivo!`;
    },
    spawnGolden: () => {
        spawnGoldenBug();
        return "Golden Bug Avvistato!";
    }
};

/**
 * Funzione generica per assegnare un premio
 * @param {Object} reward - Oggetto ricompensa {type, value/id}
 */
function grantReward(reward) {
    if (!reward || !RewardHandlers[reward.type]) return;

    // Chiama l'handler specifico passandogli il valore o l'ID
    const message = RewardHandlers[reward.type](reward.value || reward.id);

    // Mostra il toast solo se l'handler ha restituito un messaggio
    if (message) {
        window.EspooClicker.showToast(gameData.texts.toasts.rewardClaimed.replace('{message}', message), 'reward');
    }
}

/**
 * Calcola il costo scalato per i potenziamenti del Laboratorio (Prestigio)
 * Formula: CostoBase * (Moltiplicatore ^ Livello)
 */
function calculatePrestigeUpgradeCost(upgradeKey) {
    const data = gameData.prestigeUpgrades[upgradeKey];
    const state = gameState.prestigeUpgrades[upgradeKey];

    if (!data.isCounted) {
        return data.baseCost;
    }

    const growthFactor = new Decimal(1.5);
    const currentLevel = state.count || 0;

    let rawCost = data.baseCost.mul(growthFactor.pow(currentLevel));

    // --- NUOVO: SCONTO QUANTICO (15%) ---
    if (gameState.superUpgrades && gameState.superUpgrades.qDiscount && gameState.superUpgrades.qDiscount.purchased) {
        rawCost = rawCost.mul(0.85);
    }

    if (rawCost.gte(100)) {
        return new Decimal(rawCost.toPrecision(3));
    }
    return rawCost.floor();
}

/**
 * Calcola la nuova soglia per ottenere la Promozione.
 * Formula: SogliaBase * (Moltiplicatore ^ Resets)
 */
function getPrestigeThreshold() {
    const baseThreshold = new Decimal("50000000"); // 50 Milioni
    const resets = gameState.totalResets || 0;

    // Fattore di crescita (sostituisci il 5 con il valore che hai scelto per ottenere 110M)
    const growthFactor = new Decimal(3.0);

    // Calcolo grezzo
    let rawThreshold = baseThreshold.mul(growthFactor.pow(resets));

    // Trasforma in notazione a 3 cifre (es. "1.11e8") e lo riconverte in Decimal
    let cleanThreshold = new Decimal(rawThreshold.toPrecision(3));

    return cleanThreshold;
}

function checkEventConflict(newEventName) {
    if (window.currentActiveEvent) {
        window.EspooClicker.showToast(`⛔ Occupato: Evento "${window.currentActiveEvent}" in corso!`, 'error');
        return true;
    }
    window.currentActiveEvent = newEventName;
    return false;
}

function clearActiveEvent() {
    console.log(`Evento "${window.currentActiveEvent}" terminato.`);

    if (window.currentActiveEvent === 'Audio Mixer') {
        window.preMixerEvent = null;
        console.log("Evento scaduto durante il Mixer. Backup pulito.");
    } else {
        // Comportamento standard
        window.currentActiveEvent = null;
    }
}

// --------- SISTEMA DI UPGRADE GENERICO (NEW) ---------

// Applica un singolo effetto
function applyEffect(effect, level = 1) {
    if (!effect)
        return;

    let lvl = new Decimal(level);

    if (effect.type === 'mult_state') {
        if (gameState.hasOwnProperty(effect.stat))
            gameState[effect.stat] = gameState[effect.stat].mul(effect.val);
    }
    else if (effect.type === 'mult_global') {
        if (window.hasOwnProperty(effect.stat)) {
            // Gestione Ibrida: Se la variabile target è Decimal usa .mul, altrimenti *
            if (window[effect.stat] instanceof Decimal) {
                let value = new Decimal(effect.val);
                window[effect.stat] = window[effect.stat].mul(value);
            }
            else
                window[effect.stat] *= effect.val;
        }
    }
    else if (effect.type === 'add_mult_per_level') {
        if (window.hasOwnProperty(effect.stat)) {
            let value = new Decimal(effect.val);
            let bonus = value.mul(lvl);

            if (window[effect.stat] instanceof Decimal)
                window[effect.stat] = window[effect.stat].add(bonus);
            else
                window[effect.stat] += (effect.val * level);
        }
    }
    else if (effect.type === 'add_global_stat_per_level') {
        if (window.hasOwnProperty(effect.stat)) {
            let value = new Decimal(effect.val);
            let bonus = value.mul(lvl);

            if (window[effect.stat] instanceof Decimal)
                window[effect.stat] = window[effect.stat].add(bonus);
            else
                window[effect.stat] += (effect.val * level);
        }
    }
    else if (effect.type === 'set_flag')
        window.gameFlags[effect.flag] = effect.val;
}

// Ricalcola tutti gli effetti passivi
function reapplyAllEffects() {
    // Reset Totale
    window.goldenBugChance = 0.001;
    window.goldenBugMult = new Decimal(1);
    window.goldenBugSpawnTime = 60000;
    window.clickGlobalMult = new Decimal(1);
    window.clickCPSBonus = new Decimal(1);
    window.costScalingReduction = 0;
    window.prestigeSynergyFactor = new Decimal(0);

    window.gameFlags = {};

    // Click Upgrades
    for (const key in gameState.clickUpgrades) {
        if (gameState.clickUpgrades[key].purchased) {
            const data = gameData.clickUpgrades[key];
            if (data && data.effects) data.effects.forEach(eff => { if (eff.trigger === 'passive') applyEffect(eff); });
        }
    }

    // Prestige Upgrades
    for (const key in gameState.prestigeUpgrades) {
        const state = gameState.prestigeUpgrades[key];
        const data = gameData.prestigeUpgrades[key];

        if (!data) continue;

        if ((data.isCounted && state.count > 0) || (!data.isCounted && state.purchased)) {
            if (data.effects) data.effects.forEach(eff => { if (eff.trigger === 'passive') applyEffect(eff, state.count || 1); });
        }
    }

    // Super Upgrades (Q-Lab)
    if (gameState.superUpgrades) {
        for (const key in gameState.superUpgrades) {
            const state = gameState.superUpgrades[key];
            const data = gameData.superUpgrades[key];
            if (!data) continue;
            
            if (state.purchased && data.effects) {
                data.effects.forEach(eff => { if (eff.trigger === 'passive') applyEffect(eff); });
            }
        }
    }
}

// --------- 3. AUDIO MANAGER CENTRALIZZATO (Howler.js) ---------
const AudioManager = {
    _sounds: {},        // Cache Howl instances: { 'sound-click': Howl, ... }
    _currentMusic: null, // ID della traccia musicale attualmente in play
    _audioUnlocked: false,
    _pendingPlay: new Set(), // Tracce con play accodato ma non ancora confermato da Howler
    _ambienceTimer: null,    // Debounce: evita chiamate multiple a updateAmbience() in rapida
                             // successione (boot, cloud sync, listener) → un solo play per ciclo
    _promptEl: null,         // Riferimento all'elemento DOM del banner "clicca per l'audio"

    init() {
        // Registra tutti i suoni definiti in gameData.assets.sounds come Howl instances.
        // Su R2: l'URL firmato deve essere già stato prefetchato (window.CDN.prefetch())
        // prima di chiamare init(). Se non c'è cache, fallback al path locale.
        for (const key in gameData.assets.sounds) {
            const sound = gameData.assets.sounds[key];
            const localSrc = sound.file.includes('/') ? sound.file : `assets/sounds/${sound.file}`;

            // Prova prima URL firmato sync (cache R2), altrimenti locale
            const signed = (window.CDN && window.CDN.urlSync) ? window.CDN.urlSync(localSrc) : null;
            const src = signed ? [signed] : [localSrc];

            this._sounds[sound.id] = new Howl({
                src: src,
                volume: 0, // Impostato dinamicamente al play
                loop: !!sound.loop,
                preload: sound.type === 'sfx', // Preload tutti gli SFX (non musica)
                html5: sound.type === 'music',  // Music via HTML5 (streaming, no decode)
                pool: sound.type === 'sfx' ? 5 : 1, // Pool per SFX (max 5 copie simultanee)
                onplayerror: () => {
                    // Il play è fallito (autoplay bloccato dal browser).
                    // 1. Rimuovi da _pendingPlay: senza questo, _applyAmbience non
                    //    ritenterà mai perché vede il flag ancora attivo.
                    this._pendingPlay.delete(sound.id);

                    // 2. Al primo errore registra un listener una-tantum sul gesto utente.
                    //    Quando l'utente interagisce, updateAmbience() (debounced) avvia
                    //    un solo play controllato. Usare { once: true } garantisce che
                    //    il listener non scatti mai più di una volta anche se arrivano
                    //    più onplayerror prima del gesto.
                    if (!this._audioUnlocked) {
                        this._audioUnlocked = true;
                        const onGesture = () => {
                            this._hideAudioPrompt();
                            const ctx = Howler.ctx;
                            if (ctx && ctx.state === 'suspended') {
                                ctx.resume().catch(() => {});
                            }
                            this.updateAmbience();
                        };
                        document.addEventListener('click',      onGesture, { once: true });
                        document.addEventListener('keydown',    onGesture, { once: true });
                        document.addEventListener('touchstart', onGesture, { once: true, passive: true });
                        this._showAudioPrompt();
                    }
                },
                onloaderror: (id, err) => {
                    console.warn(`[Audio] Errore caricamento ${sound.id}:`, err);
                    // Fallback R2 → locale: ricostruisci Howl con sola src locale
                    const current = this._sounds[sound.id];
                    if (signed && current && !current._cdnFallbackUsed) {
                        console.warn('[CDN] Audio fail, fallback locale:', sound.id);
                        try { current.unload(); } catch (e) {}
                        const replacement = new Howl({
                            src: [localSrc],
                            volume: 0,
                            loop: !!sound.loop,
                            preload: sound.type === 'sfx',
                            html5: sound.type === 'music',
                            pool: sound.type === 'sfx' ? 5 : 1
                        });
                        replacement._cdnFallbackUsed = true;
                        this._sounds[sound.id] = replacement;
                    }
                }
            });
        }

        this._audioUnlocked = Howler.ctx && Howler.ctx.state === 'running';
        // NON chiamare updateAmbience() qui: i Howl sono appena creati e non è ancora
        // noto se l'utente è loggato. Il play parte da tryStartAudio() che viene
        // chiamata subito dopo da tryStart() e/o dal setTimeout post-loader.
    },

    _showAudioPrompt() {
        if (this._promptEl) return;
        const el = document.createElement('div');
        el.id = 'audio-unlock-prompt';
        el.innerHTML = '<i class="fas fa-volume-up"></i><span>Clicca per attivare l\'audio</span>';
        document.body.appendChild(el);
        this._promptEl = el;
        requestAnimationFrame(() => el.classList.add('visible'));
    },

    _hideAudioPrompt() {
        if (!this._promptEl) return;
        const el = this._promptEl;
        this._promptEl = null;
        el.classList.remove('visible');
        setTimeout(() => el.remove(), 400);
    },

    getCustomVolume(id) {
        if (gameState && gameState.user && gameState.user.audioCustom) {
            const val = gameState.user.audioCustom[id];
            return (val !== undefined) ? val : 1.0;
        }
        return 1.0;
    },

    _calcVolume(id, type, mult) {
        const master = gameState.user.masterVolume || 0;
        if (master <= 0) return 0;
        const channel = (type === 'music') ? gameState.user.musicVolume : gameState.user.sfxVolume;
        const custom = this.getCustomVolume(id);
        return Math.max(0, Math.min(1, master * channel * custom * (mult || 1)));
    },

    play(id, type = 'sfx') {
        const howl = this._sounds[id];
        if (!howl) return;
        const vol = this._calcVolume(id, type);
        if (vol < 0.01) return;

        if (type === 'sfx') {
            howl.volume(vol);
            howl.play();
        } else {
            howl.volume(vol);
            if (!howl.playing()) howl.play();
        }
    },

    // Ferma un suono specifico con fade-out opzionale
    stop(id, fadeMs) {
        const howl = this._sounds[id];
        if (!howl) return;
        if (fadeMs && fadeMs > 0 && howl.playing()) {
            howl.fade(howl.volume(), 0, fadeMs);
            setTimeout(() => howl.stop(), fadeMs);
        } else {
            howl.stop();
        }
    },

    playClickEffect() {
        let soundId = 'sound-click';

        if (document.body.classList.contains('super-star-active')) {
            soundId = 'sound-click';
        } else if (document.body.classList.contains('crunch-active')) {
            if (gameState.skins.current === 'superespo') soundId = 'sound-fireball';
        }

        const howl = this._sounds[soundId];
        if (!howl) return;

        let rate = 1.0;
        let volumeMult = 1.0;

        if (isBluescreenActive && !document.body.classList.contains('super-star-active')) {
            if (document.body.classList.contains('rick-rolling')) {
                volumeMult = 0.2;
            } else {
                rate = 0.2 + Math.random() * 1.6;
                volumeMult = 0.5 + Math.random();
            }
        } else if (soundId === 'sound-fireball') {
            rate = 0.9 + Math.random() * 0.2;
        } else if (document.body.classList.contains('super-star-active')) {
            rate = 1.1 + Math.random() * 0.1;
            volumeMult = 0.7;
        }

        const vol = this._calcVolume(soundId, 'sfx', volumeMult);
        howl.volume(vol);
        howl.rate(rate);
        howl.play();
    },

    updateAmbience() {
        // Debounce: se chiamata più volte entro 80ms, esegue solo l'ultima.
        // Previene il doppio play causato da chiamate ravvicinate durante boot/cloud-sync.
        clearTimeout(this._ambienceTimer);
        this._ambienceTimer = setTimeout(() => this._applyAmbience(), 80);
    },

    _applyAmbience() {
        if (!sessionStorage.getItem('espooUser')) {
            // Ferma tutta la musica se non loggato
            for (const id in this._sounds) {
                const def = this._getSoundDef(id);
                if (def && def.type === 'music') this.stop(id, 300);
            }
            this._currentMusic = null;
            return;
        }

        // Raccogli tutte le tracce musicali
        const allMusicIds = [];
        for (const key in gameData.assets.sounds) {
            if (gameData.assets.sounds[key].type === 'music') {
                allMusicIds.push(gameData.assets.sounds[key].id);
            }
        }
        for (const key in gameData.skins) {
            const conf = gameData.skins[key].themeConfig;
            if (conf && conf.specialMusic && !allMusicIds.includes(conf.specialMusic)) {
                allMusicIds.push(conf.specialMusic);
            }
        }

        // Risolvi quale traccia suonare (sistema priorità)
        let targetTrackId = null;

        if (window.currentActiveEvent === 'Audio Mixer') {
            targetTrackId = null;
        } else if (document.body.classList.contains('rick-rolling')) {
            targetTrackId = null;
        } else if (gameState.crunchTimeEndTime > Date.now()) {
            targetTrackId = 'sound-fury-music';
        } else if (isBluescreenActive) {
            if (document.body.classList.contains('matrix-active')) {
                targetTrackId = 'sound-matrix';
            } else if (document.body.classList.contains('super-star-active')) {
                targetTrackId = 'sound-star';
            } else {
                targetTrackId = (gameState.skins.current === 'christmas') ? 'sound-snowball' : 'sound-bluescreen';
            }
        } else {
            const currentSkin = gameData.skins[gameState.skins.current] || gameData.skins['default'];
            if (currentSkin.themeConfig && currentSkin.themeConfig.specialMusic) {
                targetTrackId = currentSkin.themeConfig.specialMusic;
            } else {
                targetTrackId = gameState.user.bgMusicSelection || 'sound-bg-music';
            }
        }

        // Applica: una traccia alla volta, stop immediato sulle non-target
        allMusicIds.forEach(id => {
            const howl = this._sounds[id];
            if (!howl) return;

            if (id === targetTrackId) {
                const vol = this._calcVolume(id, 'music');

                // Eccezione glitch natalizio
                if (id === 'sound-snowball' && isBluescreenActive && gameState.skins.current === 'christmas') {
                    return; // Gestito da audioGlitchInterval
                }

                if (vol > 0) {
                    if (!howl.playing() && !this._pendingPlay.has(id)) {
                        // Fade-in DOPO l'evento 'play': evita _playLock che mette
                        // la chiamata volume() in coda e non la esegue mai.
                        // _pendingPlay blocca chiamate doppie mentre Howler non ha
                        // ancora aggiornato playing() (race condition su F5/SW cache).
                        this._pendingPlay.add(id);
                        howl.volume(0);
                        howl.once('play', () => {
                            this._pendingPlay.delete(id);
                            howl.fade(0, vol, 600);
                        });
                        howl.play();
                    } else if (howl.playing()) {
                        // Cancella fade in corso e imposta volume target
                        howl.fade(howl.volume(), vol, 300);
                    }
                } else if (howl.playing()) {
                    // Pausa invece di stop: preserva la posizione nella traccia
                    // così l'unmute riprende da dove era (non dal principio)
                    howl.pause();
                }
            } else {
                // Stop immediato: pulisci anche il pending flag
                this._pendingPlay.delete(id);
                if (howl.playing()) {
                    howl.stop();
                }
            }
        });

        this._currentMusic = targetTrackId;
    },

    // Helper: trova la definizione di un suono dal suo ID
    _getSoundDef(id) {
        for (const key in gameData.assets.sounds) {
            if (gameData.assets.sounds[key].id === id) return gameData.assets.sounds[key];
        }
        return null;
    },

    // Aggiorna il volume di un suono specifico (usato dal mixer)
    setVolume(id, volume) {
        const howl = this._sounds[id];
        if (howl && howl.playing()) {
            howl.volume(Math.max(0, Math.min(1, volume)));
        }
    },

    // Ritorna l'istanza Howl per uso diretto (es. glitch interval)
    getHowl(id) {
        return this._sounds[id] || null;
    }
};

// ============================================================
// FX — Effetti visivi e tattili (GSAP-powered, v3.0)
// ============================================================
const FX = {
    // Screen shake — scuote il game-container
    shake(intensity = 4, duration = 0.25) {
        const el = document.getElementById('game-container');
        if (!el || typeof gsap === 'undefined') return;
        gsap.killTweensOf(el, 'x,y');
        gsap.to(el, {
            x: () => (Math.random() - 0.5) * intensity,
            y: () => (Math.random() - 0.5) * intensity,
            duration: 0.04,
            repeat: Math.floor(duration / 0.04),
            yoyo: true,
            ease: 'power1.inOut',
            onComplete: () => gsap.set(el, { x: 0, y: 0 })
        });
    },

    // Haptic vibration (mobile)
    vibrate(pattern) {
        if (navigator.vibrate) {
            navigator.vibrate(pattern || 15);
        }
    },

    // Impact flash — breve lampo bianco/colorato sullo schermo
    flash(color = 'rgba(255,255,255,0.15)', duration = 0.12) {
        if (typeof gsap === 'undefined') return;
        let overlay = document.getElementById('fx-flash-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'fx-flash-overlay';
            overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9500;opacity:0';
            document.body.appendChild(overlay);
        }
        overlay.style.background = color;
        gsap.killTweensOf(overlay);
        gsap.fromTo(overlay,
            { opacity: 1 },
            { opacity: 0, duration: duration, ease: 'power2.out' }
        );
    },

    // Glow ring — anello espansivo dal clicker button
    glowRing(color = '#ff4757') {
        const btn = document.getElementById('clicker-btn');
        if (!btn || typeof gsap === 'undefined') return;
        const ring = document.createElement('div');
        ring.style.cssText = `position:absolute;top:50%;left:50%;width:100%;height:100%;
            border-radius:50%;border:2px solid ${color};pointer-events:none;
            transform:translate(-50%,-50%) scale(1);opacity:0.8;z-index:5`;
        btn.appendChild(ring);
        gsap.to(ring, {
            scale: 1.8,
            opacity: 0,
            duration: 0.5,
            ease: 'power2.out',
            onComplete: () => ring.remove()
        });
    },

    // Combo tracker
    _comboCount: 0,
    _comboTimer: null,
    _comboThreshold: 250, // ms tra click per mantenere combo

    registerClick() {
        // Durante eventi video il combo overlay copre il video — lo sopprimiamo
        // del tutto (counter resettato, niente shake/glow/ring per non distrarre).
        const inVideoEvent = document.body.classList.contains('rick-rolling');
        if (inVideoEvent) {
            this._comboCount = 0;
            clearTimeout(this._comboTimer);
            this._hideComboDisplay();
            this.vibrate(10);
            return 0;
        }

        this._comboCount++;
        clearTimeout(this._comboTimer);
        this._comboTimer = setTimeout(() => {
            this._comboCount = 0;
            this._hideComboDisplay();
        }, this._comboThreshold);

        // Haptic su ogni click
        this.vibrate(10);

        // Effetti progressivi in base al combo
        if (this._comboCount >= 20) {
            this.shake(6, 0.15);
            this.flash('rgba(255,71,87,0.12)', 0.1);
            this.vibrate([15, 10, 15]);
        } else if (this._comboCount >= 10) {
            this.shake(3, 0.1);
            this.vibrate(12);
        }

        // Glow ring ogni 10 combo
        if (this._comboCount > 0 && this._comboCount % 10 === 0) {
            this.glowRing('#ff4757');
        }

        // Mostra combo counter visivo da 5+
        if (this._comboCount >= 5) {
            this._showComboDisplay(this._comboCount);
        }

        return this._comboCount;
    },

    // Combo counter visuale
    _showComboDisplay(count) {
        let el = document.getElementById('fx-combo-display');
        if (!el) {
            el = document.createElement('div');
            el.id = 'fx-combo-display';
            el.style.cssText = 'position:absolute;top:10px;left:50%;z-index:9000;pointer-events:none;' +
                'font-family:var(--font-heading);font-weight:900;white-space:nowrap;' +
                'text-shadow:0 0 15px rgba(255,71,87,0.6);color:#ff4757;transition:opacity 0.15s ease;';
            const section = document.getElementById('clicker-section');
            (section || document.body).appendChild(el);
            // Centra via GSAP così scale e translateX coesistono nello stesso layer
            if (typeof gsap !== 'undefined') gsap.set(el, { xPercent: -50 });
        }
        // Scala e colore in base al combo
        let size = count >= 30 ? '2.2rem' : count >= 20 ? '1.8rem' : count >= 10 ? '1.5rem' : '1.2rem';
        let color = count >= 30 ? '#f1c40f' : count >= 20 ? '#ff4757' : count >= 10 ? '#e67e22' : '#3498db';
        el.style.fontSize = size;
        el.style.color = color;
        el.style.textShadow = `0 0 15px ${color}80`;
        el.style.opacity = '1';
        el.textContent = `x${count} COMBO`;

        // Pulse con GSAP — xPercent:-50 mantenuto in entrambi i frame per non perdere la centratura
        if (typeof gsap !== 'undefined') {
            gsap.killTweensOf(el);
            gsap.fromTo(el,
                { scale: 1.3, xPercent: -50 },
                { scale: 1,   xPercent: -50, duration: 0.15, ease: 'back.out(2)' }
            );
        }
    },

    _hideComboDisplay() {
        const el = document.getElementById('fx-combo-display');
        if (el) {
            el.style.opacity = '0';
        }
    },

    // Burst particellare avanzato (usa GSAP per animare)
    particleBurst(x, y, count = 8, colors = ['#ff4757', '#f1c40f', '#3498db', '#2ecc71']) {
        if (typeof gsap === 'undefined') return;
        const container = document.getElementById('click-feedback-container');
        if (!container) return;

        const isSquare = document.body.classList.contains('theme-8bit') || document.body.classList.contains('theme-super');
        const radius = isSquare ? '0' : '50%';

        for (let i = 0; i < count; i++) {
            const p = document.createElement('div');
            const size = isSquare ? (4 + Math.random() * 5) : (3 + Math.random() * 4);
            const color = colors[Math.floor(Math.random() * colors.length)];
            const angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.5;
            const dist = 40 + Math.random() * 60;

            p.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${size}px;height:${size}px;
                border-radius:${radius};background:${color};pointer-events:none;z-index:15;
                box-shadow:0 0 ${size * 2}px ${color}`;
            container.appendChild(p);

            gsap.to(p, {
                x: Math.cos(angle) * dist,
                y: Math.sin(angle) * dist - 20,
                opacity: 0,
                scale: 0,
                duration: 0.4 + Math.random() * 0.3,
                ease: 'power2.out',
                onComplete: () => p.remove()
            });
        }
    },

    // Prestige sequence — timeline orchestrata
    prestigeSequence(callback) {
        if (typeof gsap === 'undefined') { if (callback) callback(); return; }

        const tl = gsap.timeline();
        // 1. Flash bianco
        this.flash('rgba(255,255,255,0.3)', 0.3);
        // 2. Shake forte
        this.shake(10, 0.4);
        // 3. Vibrazione lunga
        this.vibrate([50, 30, 80, 30, 50]);

        if (callback) setTimeout(callback, 400);
    }
};

// --- WRAPPERS PER COMPATIBILITÀ (Non rompere il codice esistente) ---
function playSound(id, type) { AudioManager.play(id, type); }
function setBgMusicVolume() { AudioManager.updateAmbience(); }
function updateAmbientVolume() { AudioManager.updateAmbience(); }
function getCustomVolume(id) { return AudioManager.getCustomVolume(id); }

// --------- FUNZIONI DI ACQUISTO ---------

function finalizePurchase() {
    playSound('sound-buy');
    refreshAllStores(); // Ridisegna i negozi per aggiornare i tasti (grigi/verdi)
    window.EspooClicker.saveGame();
    updateUI();
}

function buySkin(skinId) {
    const data = gameData.skins[skinId];
    if (!data || !data.cost) return;
    if (gameState.skins.unlocked.includes(skinId)) return;

    // Skin post-formattazione: richiede almeno 1 formattazione
    if (data.requiresFormatting && (gameState.totalFormattazioni || 0) < 1) {
        playSound('sound-error');
        window.EspooClicker.showToast('⚠️ Devi eseguire almeno 1 Formattazione per sbloccare questa skin!', 'error');
        return;
    }

    if (gameState.prestigePoints.gte(data.cost)) {
        gameState.prestigePoints = gameState.prestigePoints.minus(data.cost);
        gameState.skins.unlocked.push(skinId);
        playSound('sound-buy');
        window.EspooClicker.showToast(gameData.texts.toasts.skinBought.replace('{name}', data.name), 'success');
        window.EspooClicker.saveGame();
        if (typeof updatePrestigeUI === 'function') updatePrestigeUI();
        if (typeof updateSkinsUI === 'function') updateSkinsUI();
    } else {
        playSound('sound-error');
        window.EspooClicker.showToast(gameData.texts.toasts.insufficientTokens, 'error');
    }
}

function buyClickUpgrade(upgradeKey) {
    const state = gameState.clickUpgrades[upgradeKey];
    const data = gameData.clickUpgrades[upgradeKey];

    if (gameState.score.gte(data.cost) && !state.purchased) {
        gameState.score = gameState.score.minus(data.cost);
        gameState.baseClickValue = gameState.baseClickValue.add(data.clickIncrease);
        state.purchased = true;

        if (data.effects)
            data.effects.forEach(eff => applyEffect(eff));

        if (upgradeKey === 'clickAutomatico')
            recalculateCPS();

        finalizePurchase();
    }
}

function buyTeamEnhancement(enhanceKey) {
    const state = gameState.buildingEnhancements[enhanceKey];
    const data = gameData.buildingEnhancements[enhanceKey];

    if (gameState.score.gte(data.cost) && !state.purchased) {
        gameState.score = gameState.score.minus(data.cost);
        state.purchased = true;
        recalculateCPS();
        finalizePurchase();
    }
}

function buyPrestigeUpgrade(upgradeKey) {
    const state = gameState.prestigeUpgrades[upgradeKey];
    const data = gameData.prestigeUpgrades[upgradeKey];
    const cost = data.isCounted ? calculatePrestigeUpgradeCost(upgradeKey) : data.baseCost;

    if (data.isCounted) {
        if (gameState.prestigePoints.lt(cost))
            return;
    }
    else {
        if (gameState.prestigePoints.lt(cost) || state.purchased)
            return;
    }

    gameState.prestigePoints = gameState.prestigePoints.minus(cost);

    if (data.isCounted) {
        state.count++;
        if (data.effects)
            data.effects.forEach(eff => applyEffect(eff, 1));
    }
    else {
        state.purchased = true;
        if (data.effects)
            data.effects.forEach(eff => applyEffect(eff));
    }

    calculatePrestigeBonus();
    recalculateCPS();
    finalizePurchase();
}

function buySuperUpgrade(upgradeKey) {
    const state = gameState.superUpgrades[upgradeKey];
    const data = gameData.superUpgrades[upgradeKey];

    if (gameState.qBits.lt(data.cost) || state.purchased) return;

    gameState.qBits = gameState.qBits.minus(data.cost);
    state.purchased = true;

    playSound('sound-buy');
    if (typeof reapplyAllEffects === 'function') reapplyAllEffects();
    recalculateCPS();
    if (typeof refreshAllStores === 'function') refreshAllStores();
    if (window.EspooClicker) window.EspooClicker.saveGame();
    if (typeof updateUI === 'function') updateUI();
}


// --------- FUNZIONI DI GIOCO PRINCIPALI ---------
// --------- FUNZIONI MATEMATICHE (DECIMAL) ---------

function calculateBulkCost(teamKey, amount) {
    const data = gameData.teams[teamKey];
    const state = gameState.teams[teamKey];
    let r = 1.05;

    if (window.costScalingBase)
        r = Math.max(1.05, window.costScalingBase - window.costScalingReduction);

    let decR = new Decimal(r);
    let discountedBaseCost = data.baseCost;

    const outsourcingState = gameState.prestigeUpgrades.outsourcing;
    if (outsourcingState && outsourcingState.count > 0) {
        const discount = 1 - (0.05 * outsourcingState.count);
        discountedBaseCost = discountedBaseCost.mul(Math.max(0.75, discount));
    }

    let currentSingleCost = discountedBaseCost.mul(decR.pow(state.count)).floor();

    if (amount === 1) {
        return Decimal.max(1, currentSingleCost);
    } else {
        let num = decR.pow(amount).minus(1);
        let den = decR.minus(1);

        if (decR.eq(1)) return currentSingleCost.mul(amount);

        let totalCost = currentSingleCost.mul(num).div(den).floor();
        return Decimal.max(amount, totalCost);
    }
}

/*function calculateTeamCost(teamKey) {
    return calculateBulkCost(teamKey, 1);
}*/

function calculateMaxAffordable(teamKey) {
    const state = gameState.teams[teamKey];
    const data = gameData.teams[teamKey];

    let r = 1.05;
    if (window.costScalingBase) r = Math.max(1.05, window.costScalingBase - window.costScalingReduction);
    let decR = new Decimal(r);

    let discountedBase = data.baseCost;
    let currentSingleCost = discountedBase.mul(decR.pow(state.count)).floor();

    if (gameState.score.lt(currentSingleCost)) return 0;

    if (Math.abs(r - 1) < 0.0000001) {
        return gameState.score.div(currentSingleCost).floor().toNumber();
    }

    let part1 = gameState.score.mul(decR.minus(1));
    let part2 = part1.div(currentSingleCost);
    let part3 = part2.add(1);

    let logNum = new Decimal(part3.ln());
    let logDen = new Decimal(decR.ln());
    let maxAmount = logNum.div(logDen).floor();

    if (maxAmount.lt(10000)) {
        let num = maxAmount.toNumber();
        let cost = calculateBulkCost(teamKey, num);
        while (num > 0 && cost.gt(gameState.score)) {
            num--;
            cost = calculateBulkCost(teamKey, num);
        }
        return num;
    }

    return maxAmount.toNumber();
}

function buyTeam(teamKey) {
    let amount = window.buyMultiplier;
    if (typeof amount === 'undefined') amount = 1;

    if (amount === 'MAX') {
        amount = calculateMaxAffordable(teamKey);
        if (amount === 0) return;
    }

    const state = gameState.teams[teamKey];
    const currentCost = calculateBulkCost(teamKey, amount);

    if (gameState.score.gte(currentCost)) {
        playSound('sound-buy');
        gameState.score = gameState.score.minus(currentCost);
        const oldCount = state.count;
        state.count += amount;
        checkBuildingMilestone(teamKey, oldCount, state.count);
        recalculateCPS();
        refreshAllStores();
        window.EspooClicker.saveGame();
        updateUI();
    } else {
        playSound('sound-error');
        window.EspooClicker.showToast(gameData.texts.toasts.insufficientBugs, 'error');
    }
}

// Pop "traguardo" quando un team supera una soglia di unità possedute.
// Riempie il vuoto del mid-game con un feedback gratificante (toast + flash).
function checkBuildingMilestone(teamKey, oldCount, newCount) {
    const milestones = [10, 25, 50, 100, 150, 200, 250, 300, 400, 500, 750, 1000];
    let reached = 0;
    for (const m of milestones) {
        if (oldCount < m && newCount >= m) reached = m; // tiene il più alto attraversato
    }
    // Oltre 1000: un pop ogni 250 unità
    if (newCount >= 1000) {
        const step = 250;
        const newTier = Math.floor(newCount / step) * step;
        if (newTier > Math.floor(oldCount / step) * step && newTier > reached) reached = newTier;
    }
    if (reached <= 0) return;

    const teamData = gameData.teams[teamKey];
    const name = (teamData && teamData.name) ? teamData.name : teamKey;
    if (window.EspooClicker && window.EspooClicker.showToast) {
        window.EspooClicker.showToast('🏆 ' + name + ': ' + reached + ' unità!', 'reward');
    }
    if (typeof FX !== 'undefined' && FX.flash) FX.flash('rgba(0, 217, 255, 0.10)', 0.18);
}

function calculatePrestigeBonus() {
    let lifetime = gameState.lifetimePrestigePoints;
    let baseBonus = lifetime.mul(0.01);

    let synergyBonus = window.prestigeSynergyFactor.mul(lifetime);

    let calculatedBonus = new Decimal(1).add(baseBonus).add(synergyBonus).add(achievementsBPSBonus);

    prestigeBonus = calculatedBonus;
}

function recalculateCPS() {
    let baseCPS = new Decimal(0);

    for (const key in gameState.teams) {
        const teamState = gameState.teams[key];
        const teamData = gameData.teams[key]; // Recupera dati statici

        if (!teamData) continue;

        if (teamState.count > 0) {
            let teamBPS = new Decimal(teamData.cpsPerUnit);

            // Applica potenziamenti al singolo team
            for (const upgKey in gameState.buildingEnhancements) {
                const upgState = gameState.buildingEnhancements[upgKey];
                const upgData = gameData.buildingEnhancements[upgKey];

                if (upgState.purchased && upgData && upgData.targetTeam === key) {
                    teamBPS = teamBPS.mul(upgData.multiplier);
                }
            }

            // Somma al totale
            baseCPS = baseCPS.add(teamBPS.mul(teamState.count));
        }
    }

    bps = baseCPS.mul(prestigeBonus)
        .mul(clickCPSBonus)
        .mul(bluescreenMultiplier)
        .mul(crunchTimeMultiplier);
}

// 1. CRUNCH TIME
function activateCrunchTime() {
    const now = Date.now();

    // 1. Controlli Preliminari
    if (checkEventConflict('Espo Fury')) return false;

    if (now < crunchTimeCooldownEnd) {
        const remaining = Math.ceil((crunchTimeCooldownEnd - now) / 1000);
        window.EspooClicker.showToast(gameData.texts.toasts.furyCalm.replace('{seconds}', remaining), 'warning');
        clearActiveEvent();
        return false;
    }

    // 2. Attivazione Logica
    crunchTimeMultiplier = new Decimal(7);
    const overclockActive = gameState.superUpgrades && gameState.superUpgrades.overclock && gameState.superUpgrades.overclock.purchased;
    const furyDuration = overclockActive ? 60000 : 30000;
    crunchTimeEndTime = now + furyDuration;
    const reteContattiLevel = (gameState.prestigeUpgrades.reteContatti && gameState.prestigeUpgrades.reteContatti.count) || 0;
    crunchTimeCooldownEnd = crunchTimeEndTime + Math.max(60000, 300000 - (reteContattiLevel * 30000));

    gameState.crunchTimeEndTime = crunchTimeEndTime;
    gameState.crunchTimeCooldownEnd = crunchTimeCooldownEnd;

    recalculateCPS();

    if (typeof updateUI === 'function') updateUI();
    if (window.EspooClicker) window.EspooClicker.saveGame();

    document.body.classList.add('crunch-active');

    // 3. Gestione Immagini (Supporto Temi: 8-Bit, Super, Standard)
    const photoNormal = document.getElementById('manager-photo-normal');
    const photoClicked = document.getElementById('manager-photo-clicked');

    if (photoNormal && photoClicked) {
        if (document.body.classList.contains('theme-8bit')) {
            // Versione 8-Bit
            photoNormal.src = 'assets/image/skins/espobit-fury.webp';
            photoClicked.src = 'assets/image/skins/espobit-fury-click.webp';
        } else if (document.body.classList.contains('theme-super')) {
            // Versione Super Espo
            photoNormal.src = 'assets/image/skins/super-espofury.webp';
            photoClicked.src = 'assets/image/skins/super-espofury-click.webp';
        } else {
            // Versione Standard
            photoNormal.src = 'assets/image/skins/espo-fury.webp';
            photoClicked.src = 'assets/image/skins/espo-fury-click.webp';
        }
    }

    // 4. Overlay & Particelle
    const overlay = document.getElementById('crunch-overlay');
    if (overlay) overlay.style.display = 'block';

    const fireContainer = document.getElementById('fire-particles-container');
    if (fireContainer) {
        fireContainer.style.display = 'block';
        if (fireParticleInterval) clearInterval(fireParticleInterval);
        fireParticleInterval = setInterval(() => { spawnFireParticle(fireContainer); }, 100);
    }

    // 5. Gestione Audio Centralizzata
    // Invece di mettere in pausa manualmente, diciamo al manager di aggiornare l'ambiente.
    // Lui capirà che la Fury è attiva e farà partire 'sound-fury-music' spegnendo il resto.
    if (typeof AudioManager !== 'undefined') {
        AudioManager.updateAmbience();
    }

    // 6. Feedback Utente
    window.EspooClicker.showToast(gameData.texts.toasts.furyActive, 'success');
    return true;
}

const MAX_FIRE_PARTICLES = 30;  // Cap massimo di particelle fuoco nel DOM
const MAX_FIRE_SPARKS = 10;     // Cap massimo scintille

function spawnFireParticle(container) {
    // Cap: se ci sono troppe particelle, rimuovi le più vecchie
    const existingParticles = container.querySelectorAll('.fire-particle');
    if (existingParticles.length >= MAX_FIRE_PARTICLES) {
        existingParticles[0].remove();
    }

    // 1. Particella Fiamma (Grande e Lenta)
    const p = document.createElement('div');
    p.classList.add('fire-particle');

    // Posizione (concentrata su bordi sinistro/destro per effetto "muri di fiamma")
    let left;
    const r = Math.random();
    if (r < 0.4)      left = Math.random() * 25;          // 0-25% (sinistra)
    else if (r < 0.8) left = 75 + Math.random() * 25;     // 75-100% (destra)
    else              left = 25 + Math.random() * 50;     // 25-75% (centro sparso)
    p.style.left = `${left}%`;

    // Dimensioni: flame stretto + alto (proportional teardrop)
    const sizeBase = 35 + Math.random() * 70;
    p.style.width = `${sizeBase}px`;
    p.style.height = `${sizeBase * 1.8}px`;

    // Durata
    const duration = 1.5 + Math.random() * 2;
    p.style.animation = `fireRise ${duration}s ease-out forwards`;

    // Drift (Vento laterale casuale)
    const drift = (Math.random() - 0.5) * 150;
    p.style.setProperty('--drift', `${drift}px`);

    container.appendChild(p);

    // Pulizia
    setTimeout(() => { if (p.parentNode) p.remove(); }, duration * 1000);

    // 2. Scintille (Veloci e luminose) - Solo il 30% delle volte per non intasare
    if (Math.random() < 0.3) {
        const existingSparks = container.querySelectorAll('.fire-spark');
        if (existingSparks.length >= MAX_FIRE_SPARKS) {
            existingSparks[0].remove();
        }

        const s = document.createElement('div');
        s.classList.add('fire-spark');
        s.style.left = `${left + (Math.random() * 20 - 10)}%`;

        // Drift orizzontale per movimento naturale
        const sparkDrift = (Math.random() - 0.5) * 80;
        s.style.setProperty('--spark-drift', `${sparkDrift}px`);

        const sDuration = 0.5 + Math.random() * 1.5;
        s.style.animation = `sparkFly ${sDuration}s linear forwards`;

        container.appendChild(s);
        setTimeout(() => { if (s.parentNode) s.remove(); }, sDuration * 1000);
    }
}

function resumeCrunchTimeEffects() {
    // 1. Ripristino Stato
    window.currentActiveEvent = 'Espo Fury';
    crunchTimeMultiplier = new Decimal(7);
    document.body.classList.add('crunch-active');

    const overlay = document.getElementById('crunch-overlay');
    if (overlay) overlay.style.display = 'block';

    // 2. Ripristino Particelle
    const fireContainer = document.getElementById('fire-particles-container');
    if (fireContainer) {
        fireContainer.style.display = 'block';
        if (fireParticleInterval) clearInterval(fireParticleInterval);
        fireParticleInterval = setInterval(() => { spawnFireParticle(fireContainer); }, 100);
    }

    // 3. Ripristino Immagini (Supporto Temi: 8-Bit, Super, Standard)
    const photoNormal = document.getElementById('manager-photo-normal');
    const photoClicked = document.getElementById('manager-photo-clicked');

    if (photoNormal && photoClicked) {
        if (document.body.classList.contains('theme-8bit')) {
            photoNormal.src = 'assets/image/skins/espobit-fury.webp';
            photoClicked.src = 'assets/image/skins/espobit-fury-click.webp';
        } else if (document.body.classList.contains('theme-super')) {
            photoNormal.src = 'assets/image/skins/super-espofury.webp';
            photoClicked.src = 'assets/image/skins/super-espofury-click.webp';
        } else {
            photoNormal.src = 'assets/image/skins/espo-fury.webp';
            photoClicked.src = 'assets/image/skins/espo-fury-click.webp';
        }
    }

    // 4. Ripristino Audio Centralizzato
    // Forza l'aggiornamento per assicurarsi che la musica Fury riparta se la pagina è stata ricaricata
    if (typeof AudioManager !== 'undefined') {
        AudioManager.updateAmbience();
    }

    // 5. Aggiornamento Logica
    recalculateCPS();
    if (typeof updateUI === 'function') updateUI();
}


const EventHandlers = {
    video: (config, eventKey) => {
        document.body.classList.add('rick-rolling');

        // 1. Reset e nascondi altri video
        ['rick-roll-video', 'ricardo-video', 'ricardo-metal-video', 'ricardo-dota-video'].forEach(id => {
            const videoMeme = document.getElementById(id);
            if (videoMeme) {
                videoMeme.pause();
                videoMeme.classList.add("video_display_none");
                videoMeme.currentTime = 0;
            }
        });

        // Nascondi pannelli laterali
        const leftP = document.getElementById('header-left-panel');
        const rightP = document.getElementById('header-right-panel');
        if (leftP) leftP.classList.add("header_stat_box_display_none");
        if (rightP) rightP.classList.add("header_stat_box_display_none");

        // 2. Selezione Video
        let videoId = config.videos[0];
        if (config.videos.length > 1) {
            const available = config.videos.filter(id => id !== lastVideoPlayedId);
            const pool = available.length > 0 ? available : config.videos;
            videoId = pool[Math.floor(Math.random() * pool.length)];
        }
        lastVideoPlayedId = videoId;

        const video = document.getElementById(videoId);

        if (video) {
            // Risolvi src sincrono: prova cache R2, poi data-src diretto, poi locale.
            // Cache R2 popolata al boot da _prefetchUrls() in script.js.
            const _resolveVideoSrcSync = () => {
                if (video.src) return video.src;
                const direct    = video.getAttribute('data-src');
                if (direct) return direct;
                const localPath = video.getAttribute('data-src-local');
                if (window.CDN && window.CDN.urlSync && localPath) {
                    const sync = window.CDN.urlSync(localPath);
                    if (sync) return sync;
                }
                return localPath || '';
            };

            if (!video.src) {
                const resolved = _resolveVideoSrcSync();
                if (resolved) {
                    video.src = resolved;
                    // Fallback su errore di rete: prova path locale
                    if (!video._cdnFallbackBound) {
                        video._cdnFallbackBound = true;
                        video.addEventListener('error', function _onErr() {
                            const fb = video.getAttribute('data-src-local');
                            if (fb && video.src.indexOf(fb) === -1) {
                                console.warn('[CDN] Video fail, fallback locale:', fb);
                                video.src = fb;
                                video.load();
                            }
                        });
                    }
                    video.load();
                } else if (window.CDN && window.CDN.url) {
                    // Cache miss: chiedi async e riprova fra poco (caso edge)
                    const localPath = video.getAttribute('data-src-local');
                    window.CDN.url(localPath).then(src => {
                        if (src && !video.src) {
                            video.src = src;
                            video.load();
                            video.play().catch(() => {});
                        }
                    });
                }
            }

            // Preparazione Video
            video.classList.remove("video_display_none");
            video.currentTime = 0;
            video.muted = false;

            // Calcolo Volume
            const customVol = getCustomVolume(config.audioId || videoId);
            video.volume = (gameState.user.masterVolume * gameState.user.musicVolume) * customVol;

            // Play robusto: su mobile (iOS PWA / Chrome Android) gli eventi partono da timer
            // (no gesto utente) -> autoplay bloccato se non muted. Fallback: ritenta muted.
            const _safePlay = () => {
                const p = video.play();
                if (p && typeof p.then === 'function') {
                    p.catch(() => {
                        video.muted = true;
                        const p2 = video.play();
                        if (p2 && typeof p2.catch === 'function') {
                            p2.catch(err => console.warn("Video bloccato anche muted", err));
                        }
                    });
                }
            };
            // Se i dati non sono ancora pronti (preload metadata + R2 async), ritenta su canplay
            if (video.readyState < 2) {
                const _onCanPlay = () => {
                    video.removeEventListener('canplay', _onCanPlay);
                    if (video.paused) _safePlay();
                };
                video.addEventListener('canplay', _onCanPlay, { once: true });
            }
            _safePlay();

            let clickOverlay = document.getElementById('video-click-overlay');
            // Creazione Overlay
            if (!clickOverlay) {
                clickOverlay = document.createElement('div');
                clickOverlay.id = 'video-click-overlay';
                clickOverlay.style.position = 'fixed';
                clickOverlay.style.top = '0';
                clickOverlay.style.left = '0';
                clickOverlay.style.width = '100vw';
                clickOverlay.style.height = '100vh';
                clickOverlay.style.zIndex = '9999';
                clickOverlay.style.cursor = 'pointer';
                clickOverlay.style.transform = 'none';
                document.body.appendChild(clickOverlay);
            }
            clickOverlay.style.display = 'block';

            // Handler del Click sull'Overlay
            const overlayClickHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();

                // Creazione evento sintetico
                const syntheticEvent = {
                    detail: 1,
                    clientX: e.clientX,
                    clientY: e.clientY,
                    pageX: e.pageX,
                    pageY: e.pageY,
                    target: clickOverlay
                };

                // Guadagno punti
                resolveBug(syntheticEvent);
            };

            // Usa pointerdown per reattività immediata
            clickOverlay.addEventListener('pointerdown', overlayClickHandler);

            // Timer fine evento
            setTimeout(() => {
                video.pause();
                video.classList.add("video_display_none");

                // Rimuovi Overlay e Listener
                clickOverlay.removeEventListener('pointerdown', overlayClickHandler);
                clickOverlay.style.display = 'none'; // Nascondi overlay

                document.body.classList.remove('rick-rolling');

                // Ripristino Audio Ambiente
                if (typeof AudioManager !== 'undefined') AudioManager.updateAmbience();
            }, config.duration);
        }

        if (typeof AudioManager !== 'undefined') AudioManager.updateAmbience();
    },

    css_mode: (config, eventKey) => {
        // LOGICA CSS (404 / Bluescreen / Matrix)
        // Applica la classe dell'evento al body
        document.body.classList.add(config.cssClass);

        // GESTIONE SPECIFICA PER MATRIX
        if (config.cssClass === 'matrix-active') {
            // Avvia l'effetto canvas
            if (typeof startMatrixEffect === 'function') startMatrixEffect();

            const photoNormal = document.getElementById('manager-photo-normal');
            const photoClicked = document.getElementById('manager-photo-clicked');

            if (photoNormal && photoClicked) {
                // NUOVA LOGICA DI SCELTA SKIN MATRIX
                // Controlla se il tema 8-bit è attivo
                if (document.body.classList.contains('theme-8bit')) {
                    // Se sì, usa le versioni 8-bit di Matrix
                    photoNormal.src = 'assets/image/skins/espobit-matrix.webp';
                    photoClicked.src = 'assets/image/skins/espobit-matrix-click.webp';
                } else {
                    // Altrimenti, usa le versioni standard di Matrix
                    photoNormal.src = 'assets/image/skins/espo-matrix.webp';
                    photoClicked.src = 'assets/image/skins/espo-matrix-click.webp';
                }
                // ------------------------------------------
            }
        }

        // GESTIONE AUDIO EVENTI (Delega al Manager Centrale)
        // Se è l'evento di Natale (Bluescreen), gestisci il glitch audio specifico
        if (gameState.skins.current === 'christmas' && eventKey === 'bluescreen') {
            const snowHowl = AudioManager.getHowl('sound-snowball');
            if (snowHowl) {
                snowHowl.play();
                if (audioGlitchInterval) clearInterval(audioGlitchInterval);
                audioGlitchInterval = setInterval(() => {
                    snowHowl.rate(0.2 + Math.random() * 1.6);
                    const baseVol = gameState.user.masterVolume * gameState.user.musicVolume;
                    snowHowl.volume((Math.random() < 0.3) ? 0 : Math.max(0, Math.min(1, baseVol * 0.2)));
                }, 100);
            }
        } else {
            // Per Matrix e Bluescreen standard, lascia che l'AudioManager decida cosa suonare
            // (es. sound-matrix.mp3 o sound-bluescreen.mp3)
            if (typeof AudioManager !== 'undefined') {
                AudioManager.updateAmbience();
            }
        }
    }
};

// --- FUNZIONE EVENTI UNIVERSALE (Ottimizzata) ---
function triggerGameEvent(eventKey, overrideMult = null) {
    const config = gameData.events[eventKey];
    if (!config) return false;
    if (checkEventConflict(config.name)) return false;

    // Ferma musica corrente prima di avviare l'evento
    if (typeof AudioManager !== 'undefined') {
        AudioManager.stop('sound-snowball', 200);
        AudioManager.stop('sound-bg-music', 200);
    }

    let bonusMult = overrideMult;
    if (!bonusMult) {
        bonusMult = Math.floor(Math.random() * (config.maxMult - config.minMult + 1)) + config.minMult;
    }

    isBluescreenActive = true;
    bluescreenMultiplier = new Decimal(bonusMult); // Fondamentale: Decimal
    recalculateCPS();

    const emDisplay = document.getElementById('event-multiplier-display');
    if (emDisplay) {
        emDisplay.textContent = config.toast.replace('{mult}', bonusMult);
        // Per video event il banner laterale è soppresso (info già nel toast).
        // Per altri eventi (bluescreen/matrix/superStar) resta visibile.
        emDisplay.style.display = (config.type === 'video') ? 'none' : 'block';
    }

    // Toast video event: durata estesa (8s) per compensare l'assenza del banner.
    const toastDuration = config.type === 'video' ? 8000 : undefined;
    window.EspooClicker.showToast(
        config.toast.replace('{mult}', bonusMult),
        config.toastType,
        toastDuration
    );

    if (EventHandlers[config.type]) EventHandlers[config.type](config, eventKey);

    setTimeout(() => {
        document.body.classList.remove('rick-rolling');
        if (config.cssClass) document.body.classList.remove(config.cssClass);
        stopBluescreenEffect();
    }, config.duration);

    return true;
}


function triggerBluescreen(multiplier) {
    // 1. Priorità Skin Speciali esistenti (Rick / Ricardo)
    if (gameState.skins.current === 'rick' && Math.random() < 0.8) {
        return triggerGameEvent('rickRoll');
    }
    if (gameState.skins.current === 'ricardo' && Math.random() < 0.8) {
        return triggerGameEvent('ricardo');
    }
    // 2. Priorità Skin Britney Espears
    if (gameState.skins.current === 'britneyEspears' && Math.random() < 0.8) {
        return triggerGameEvent('britneyEspears');
    }
    // 3. Priorità Skin Super Espò
    if (gameState.skins.current === 'superespo') {
        return triggerGameEvent('superStarMode', multiplier);
    }
    // 3. Scelta Casuale Standard (Solo per altre skin): 50% Blue Screen / 50% Matrix
    const eventType = Math.random() < 0.5 ? 'bluescreen' : 'matrix';
    return triggerGameEvent(eventType, multiplier);
}

function stopBluescreenEffect() {
    isBluescreenActive = false;
    bluescreenMultiplier = new Decimal(1); // Reset a Decimal(1)

    document.body.classList.remove('bluescreen-active');
    document.body.classList.remove('matrix-active');
    document.body.classList.remove('rick-rolling');

    if (typeof stopMatrixEffect === 'function') stopMatrixEffect();

    const emDisplay = document.getElementById('event-multiplier-display');
    if (emDisplay) {
        clearTimeout(emDisplay._autoHideTimer);
        emDisplay.style.display = 'none';
        emDisplay.style.opacity = '';
        emDisplay.style.transition = '';
    }

    recalculateCPS();

    // ... (Codice audio stop esistente invariato) ...
    try {
        if (typeof AudioManager !== 'undefined') {
            AudioManager.stop('sound-bluescreen', 200);
            AudioManager.stop('sound-matrix', 200);
        }
        const rickVideo = document.getElementById('rick-roll-video');
        if (rickVideo) { rickVideo.pause(); rickVideo.classList.add("video_display_none"); }
    } catch (e) { }

    if (audioGlitchInterval) { clearInterval(audioGlitchInterval); audioGlitchInterval = null; }
    if (typeof applySkinVisuals === 'function') applySkinVisuals(gameState.skins.current);
    if (typeof AudioManager !== 'undefined') AudioManager.updateAmbience();

    clearActiveEvent();
}

// CALCOLO CENTRALIZZATO DEL VALORE CLICK
function calculateClickValue() {
    let val = gameState.baseClickValue
        .mul(window.clickGlobalMult || 1)
        .mul(prestigeBonus)
        .mul(bluescreenMultiplier)
        .mul(crunchTimeMultiplier);

    if (window.gameFlags.bionicHand) {
        let percent = window.gameFlags.divineClick ? 0.02 : 0.01;
        val = val.add(bps.mul(percent));
    }

    // Golden Bug "Frenzy": buff temporaneo al valore del click
    if (window.goldenFrenzyEnd && Date.now() < window.goldenFrenzyEnd) {
        val = val.mul(window.goldenFrenzyMult || 1);
    }

    return val;
}
function calculateRawClickValue() {
    // Prendi il valore base (Upgrade + Base) e i moltiplicatori passivi interni (es. Doppio Click)
    let val = gameState.baseClickValue.mul(window.clickGlobalMult || 1);

    // Aggiungi Mano Bionica (Se attiva)
    if (window.gameFlags.bionicHand) {
        let percent = 0.01;
        if (window.gameFlags.divineClick) percent = 0.02;
        val = val.add(bps.mul(percent));
    }

    return val;
}

function resolveBug(event) {
    // Blocca solo i click sintetici da script (autoclicker): isTrusted=false.
    // L'attivazione reale da tastiera (Enter/Spazio) ha detail===0 ma isTrusted===true → consentita (a11y).
    if (event.detail === 0 && event.isTrusted === false) return;
    // Niente blur(): il focus da tastiera deve restare sul bottone per i click ripetuti.
    // Il focus del mouse e' gia' gestito dai listener mouseup/mouseleave/touchend.

    const isSuperTheme = document.body.classList.contains('theme-super');
    const isFuryActive = (typeof crunchTimeEndTime !== 'undefined' && crunchTimeEndTime > Date.now());

    if (isSuperTheme && isFuryActive) {
        if (window.EspooClicker && window.EspooClicker.playSound) {
            window.EspooClicker.playSound('sound-fireball');
        }
    } else {
        AudioManager.playClickEffect();
    }

    // FX v3.0: registra combo PRIMA, così il bonus combo si applica a questo click.
    // (haptic, shake progressivo e combo counter sono gestiti qui dentro)
    let comboCount = 0;
    if (typeof FX !== 'undefined') comboCount = FX.registerClick();

    let currentClickValue = calculateClickValue();

    // Bonus combo: clic rapidi consecutivi aumentano il valore del click.
    // Combo 6+ → +1% per combo, fino a +100% (combo 106). Premia il click attivo
    // senza sbilanciare il late-game (i BPS restano dominanti).
    if (comboCount > 5) {
        const comboMult = 1 + Math.min(comboCount - 5, 100) * 0.01;
        currentClickValue = currentClickValue.mul(comboMult);
    }
    // Stash per showClickFeedback (mostra il +N reale incluso il bonus combo)
    window._lastClickValue = currentClickValue;

    clickHistory.push({ time: Date.now(), value: currentClickValue });
    gameState.score = gameState.score.add(currentClickValue);
    gameState.totalScore = gameState.totalScore.add(currentClickValue);
    gameState.lifetimeScore = gameState.lifetimeScore.add(currentClickValue);
    gameState.totalClicks++;

    if (typeof showClickFeedback === 'function') showClickFeedback(event);

    // --- NUOVA LOGICA ANIMAZIONE CLICK ---
    // Non cancelliamo più i timer precedenti. Ogni tocco vive di vita propria.
    const btn = document.getElementById('clicker-btn');
    if (btn) {
        // Aggiungiamo le classi per lo schiacciamento e il volto
        btn.classList.add('click-shrink', 'clicked');

        // Se l'utente clicca a raffica, cancelliamo il reset precedente per non farlo scattare
        if (window.clickAnimTimer) {
            clearTimeout(window.clickAnimTimer);
        }

        // Timer: se l'utente smette di cliccare, il bottone si rialza.
        // 120ms > durata transizione CSS (80ms + 40ms delay) per evitare il flash vuoto
        window.clickAnimTimer = setTimeout(() => {
            btn.classList.remove('click-shrink', 'clicked');
        }, 120);
    }

    if (typeof updateClickStore === 'function') updateClickStore();
    // updateUI() non viene più chiamata ad ogni click: il loop UI a 100ms la gestisce già.
    // Questo evita 50-100 update DOM/sec durante lo spam click.
}




function calculatePrestigeGained() {
    if (gameState.totalScore.lt(getPrestigeThreshold())) return new Decimal(0);
    let base = new Decimal(250000);
    return gameState.totalScore.div(base).sqrt().floor();
}

function openPrestigeContract() {
    if (gameState.totalScore.lt(getPrestigeThreshold())) {
        if (window.EspooClicker && window.EspooClicker.showToast) {
            window.EspooClicker.showToast(gameData.texts.toasts.prestigeNeedComplete, "error");
        }
        return;
    }

    const gained = calculatePrestigeGained();
    if (gained.lt(1)) {
        if (window.EspooClicker && window.EspooClicker.showToast) {
            window.EspooClicker.showToast(gameData.texts.toasts.prestigeNeedMore, "error");
        }
        return;
    }

    // Applica visivamente il bonus del Replicatore di Token
    let finalGained = gained;
    if (gameState.superUpgrades && gameState.superUpgrades.tokenDuplicator && gameState.superUpgrades.tokenDuplicator.purchased) {
        finalGained = finalGained.mul(1.20).floor(); // +20% Token
    }

    const tokenDisplay = document.getElementById('contract-gain-token');
    const bonusDisplay = document.getElementById('contract-gain-bonus');

    if (tokenDisplay) tokenDisplay.textContent = `+${formatNumber(finalGained)}`;

    // Calcoli per la preview
    let currentLifetime = gameState.lifetimePrestigePoints || new Decimal(0);
    let estimatedLifetime = currentLifetime.add(finalGained);

    // Calcolo Bonus
    let baseBonus = estimatedLifetime.mul(0.01);
    let synergyCount = gameState.prestigeUpgrades.sinergia ? gameState.prestigeUpgrades.sinergia.count : 0;
    let synergyPerLevel = gameData.prestigeUpgrades.sinergia.bonusPerLevel || new Decimal(0.001);

    // synergy = count * 0.001 * lifetime
    let synergyBonus = new Decimal(synergyCount).mul(synergyPerLevel).mul(estimatedLifetime);
    let totalMultiplier = new Decimal(1).add(baseBonus).add(synergyBonus).add(achievementsBPSBonus);

    if (bonusDisplay) {
        bonusDisplay.innerHTML = `Nuovo Moltiplicatore: <span style="color: #f1c40f; font-weight: bold;">x${formatNumber(totalMultiplier)}</span>`;
    }

    const modal = document.getElementById('prestige-modal');
    if (modal) {
        modal.style.display = 'flex';
        modal.style.opacity = '1';

        // Animazione Fluida GSAP per l'entrata
        const content = modal.querySelector('.modal-content');
        if (content) {
            if (typeof gsap !== 'undefined') {
                gsap.fromTo(content,
                    { scale: 0.8, opacity: 0, y: 20 },
                    { scale: 1, opacity: 1, y: 0, duration: 0.4, ease: "back.out(1.7)" }
                );
            } else {
                content.style.opacity = '1';
                content.style.transform = 'scale(1)';
            }
        }
    }

    document.body.classList.add('modal-open');
}

async function executePrestige() {
    const overlay = document.getElementById('prestige-transition-overlay');
    const modal = document.getElementById('prestige-modal');
    const bar = document.getElementById('prestige-progress-bar');
    const animContainer = document.getElementById('prestige-anim-container');

    if (modal) modal.style.display = 'none';

    if (overlay) {
        // Reset stato animazione
        if (bar) bar.style.width = '0%';
        if (animContainer) animContainer.style.transform = 'scale(0.8)';

        overlay.style.display = 'flex'; // Forza il layout
        overlay.classList.remove("prestige_transition_overlay_display_none");

        if (typeof playSound === 'function') playSound('sound-prestige');

        // Avvia l'animazione con un micro-ritardo per far recepire il reset al browser
        setTimeout(() => {
            overlay.classList.add('active');
            overlay.style.opacity = '1';
            if (bar) bar.style.width = '100%';
            if (animContainer) animContainer.style.transform = 'scale(1)';
        }, 50);

        // FX: Flash + Shake + Vibrazione orchestrata per il prestige
        if (typeof FX !== 'undefined') FX.prestigeSequence();
    }

    const savedFilter = (gameState.filterSettings && gameState.filterSettings.globalFilter)
        ? gameState.filterSettings.globalFilter
        : 'available';

    // Calcolo Punti
    let gained = new Decimal(0);
    if (typeof calculatePrestigeGained === 'function') {
        gained = calculatePrestigeGained();
    }

    // Applica realmente il bonus del Replicatore di Token
    if (gameState.superUpgrades && gameState.superUpgrades.tokenDuplicator && gameState.superUpgrades.tokenDuplicator.purchased) {
        gained = gained.mul(1.20).floor(); // +20% Token
    }

    let newPrestigePoints = gameState.prestigePoints.add(gained);
    let newLifetime = gameState.lifetimePrestigePoints.add(gained);

    // Salvataggio Dati Persistenti (Inclusi i dati Quantici e le valute End-Game)
    const persistentKeys = [
        'achievements', 'prestigeUpgrades', 'skins', 'user', 'totalClicks',
        'totalGoldenBugsClicked', 'totalPlayTime', 'lifetimeScore', 'totalOfflineScore',
        'superUpgrades', 'qBits', 'lifetimeQBits', 'totalFormattazioni'
    ];

    const preservedData = {};
    persistentKeys.forEach(key => {
        if (gameState[key] !== undefined) {
            preservedData[key] = JSON.parse(JSON.stringify(gameState[key]));
        }
    });

    const newResets = gameState.totalResets + 1;

    // Attesa animazione
    await new Promise(r => setTimeout(r, 1500));

    // RESET: Generazione Stato Pulito
    let newState = getInitialGameState();

    // Ripristino Dati Persistenti
    persistentKeys.forEach(key => {
        if (preservedData[key] !== undefined) {
            newState[key] = preservedData[key];
        }
    });

    // Ripristiniamo il filtro salvato nel nuovo stato
    if (!newState.filterSettings) newState.filterSettings = {};
    newState.filterSettings.globalFilter = savedFilter;

    // Ricostruzione Decimali Critici (dopo il JSON parse)
    if (typeof newState.lifetimeScore === 'string') newState.lifetimeScore = new Decimal(newState.lifetimeScore);
    if (typeof newState.totalOfflineScore === 'string') newState.totalOfflineScore = new Decimal(newState.totalOfflineScore);
    if (typeof newState.score === 'string') newState.score = new Decimal(newState.score);
    if (newState.qBits !== undefined && typeof newState.qBits === 'string') newState.qBits = new Decimal(newState.qBits);
    if (newState.lifetimeQBits !== undefined && typeof newState.lifetimeQBits === 'string') newState.lifetimeQBits = new Decimal(newState.lifetimeQBits);

    newState.prestigePoints = newPrestigePoints;
    newState.lifetimePrestigePoints = newLifetime;
    newState.totalResets = newResets;
    newState.lastSaveTimestamp = Date.now();

    // --- PARACADUTE & FAST START (Bonus Bug Iniziali) ---
    let startBonusBugs = new Decimal(0);
    if (gameState.prestigeUpgrades.paracadute && gameState.prestigeUpgrades.paracadute.count > 0) {
        startBonusBugs = new Decimal(gameState.prestigeUpgrades.paracadute.count).mul(2000);
    }
    if (gameState.superUpgrades && gameState.superUpgrades.fastStart && gameState.superUpgrades.fastStart.purchased) {
        startBonusBugs = startBonusBugs.add(1000000);
    }
    newState.score = startBonusBugs;

    // --- LOGICA EREDITÀ & KEEP TEAMS ---
    // --- LOGICA EREDITÀ & KEEP TEAMS ---
    if (newState.teams) {
        // 1. Keep Teams (Mantieni 5 livelli SOLO dei team base)
        const baseTeamsAllowed = ['assistenteQa', 'jiraTicket', 'teamQa']; // Limitato ai primi 3

        if (gameState.superUpgrades && gameState.superUpgrades.keepTeams && gameState.superUpgrades.keepTeams.purchased) {
            for (const key in gameState.teams) {
                if (gameState.teams[key].count > 0 && baseTeamsAllowed.includes(key)) {
                    const deadlineLevel = (gameState.prestigeUpgrades.deadlineStretta && gameState.prestigeUpgrades.deadlineStretta.count) || 0;
                    newState.teams[key].count = Math.min(5 + deadlineLevel, gameState.teams[key].count);
                }
            }
        } else {
            // Se non hai Keep Teams, azzera almeno l'Assistente QA prima di applicare i bonus vecchi
            if (newState.teams.assistenteQa) newState.teams.assistenteQa.count = 0;
        }

        // 2. Eredità Classica (Bonus Assistente QA)
        if (newState.teams.assistenteQa) {
            if (gameState.prestigeUpgrades.eredita && gameState.prestigeUpgrades.eredita.count > 0) {
                newState.teams.assistenteQa.count = Math.max(newState.teams.assistenteQa.count, gameState.prestigeUpgrades.eredita.count);
            }
            if (newState.prestigeUpgrades.accelerazione && newState.prestigeUpgrades.accelerazione.purchased) {
                newState.teams.assistenteQa.count++;
            }
            // Fast Start buffato: +5 Assistenti QA e +1M Bug
            if (gameState.superUpgrades && gameState.superUpgrades.fastStart && gameState.superUpgrades.fastStart.purchased) {
                newState.teams.assistenteQa.count += 5;
            }
        }
    }

    // Applicazione Nuovo Stato
    gameState = newState;

    // Reset Variabili Runtime
    if (typeof bps !== 'undefined') bps = new Decimal(0);
    clickHistory = [];
    isBluescreenActive = false;
    bluescreenMultiplier = new Decimal(1);
    document.body.classList.remove('bluescreen-active');

    // Ferma suoni evento
    if (typeof AudioManager !== 'undefined') AudioManager.stop('sound-bluescreen', 200);

    // Sincronizza visivamente il menu a tendina
    const filterSelect = document.getElementById('global-filter-select');
    if (filterSelect) {
        filterSelect.value = savedFilter;
    }

    // Aggiornamento Totale Interfaccia
    if (typeof reapplyAllEffects === 'function') reapplyAllEffects();
    calculatePrestigeBonus();
    if (typeof recalculateCPS === 'function') recalculateCPS();

    // Refresh Negozi (Ora vedrà il filtro corretto!)
    if (typeof refreshAllStores === 'function') refreshAllStores();
    if (typeof updateUI === 'function') updateUI();

    // Salvataggio Immediato
    if (window.EspooClicker) window.EspooClicker.saveGame();

    // Rimozione Overlay
    if (overlay) {
        overlay.classList.remove('active');
        overlay.style.opacity = '0'; // Sfuma dolcemente in uscita

        setTimeout(() => {
            overlay.classList.add("prestige_transition_overlay_display_none");
            overlay.style.display = 'none'; // Nascondi del tutto
            if (window.EspooClicker && gameData.texts)
                window.EspooClicker.showToast(gameData.texts.toasts.promoSuccess, 'achievement');
        }, 500); // 500ms è il tempo della transition CSS
    }
}

function executeFormattingSequence() {
    // 1. Chiusura Interfaccia
    document.querySelectorAll('.modal-backdrop').forEach(m => m.style.display = 'none');
    document.body.classList.remove('modal-open');

    // 2. Ferma la musica di sottofondo
    const bgmId = gameState.user.bgMusicSelection || 'sound-bg-music';
    const bgm = document.getElementById(bgmId);
    if (bgm) bgm.pause();

    window.currentActiveEvent = 'Formatting';

    // 3. Creazione Schermata Cinematografica (Testo Estetico + Contenitore Progress Bar)
    let prepOverlay = document.getElementById('format-prep-overlay');
    if (!prepOverlay) {
        prepOverlay = document.createElement('div');
        prepOverlay.id = 'format-prep-overlay';
        prepOverlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: #000; z-index: 99999; display: block; pointer-events: none;
        `;

        prepOverlay.innerHTML = `
            <div id="format-text-phase" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; text-align:center;">
                <h1 style="color:#9b59b6; font-family:'Courier New', monospace; letter-spacing:4px; text-shadow:0 0 15px rgba(155,89,182,0.8); margin:0;">PREPARAZIONE FORMATTAZIONE</h1>
                <p style="color:#bdc3c7; font-family:'Courier New', monospace; font-size:1.2rem; margin-top:15px;" class="fa-fade">Caricamento dati in corso...</p>
            </div>
            
            <div id="format-video-phase" style="display:none; position:absolute; top:0; left:0; width:100%; height:100%; background:transparent;">
                <div style="position:absolute; bottom:60px; left:50%; transform:translateX(-50%); width:70%; z-index:100001;">
                    <div style="color:#fff; font-family:'Courier New', monospace; font-size:1.2rem; font-weight:bold; margin-bottom:10px; text-align:center; text-shadow:2px 2px 4px #000;">
                        RIPRISTINO UNIVERSO IN CORSO...
                    </div>
                    <div style="width:100%; height:20px; background:rgba(0,0,0,0.7); border:2px solid #9b59b6; border-radius:10px; overflow:hidden;">
                        <div id="format-progress-bar" style="width:0%; height:100%; background:linear-gradient(90deg, #8e44ad, #d2b4de); box-shadow:0 0 10px #9b59b6; transition: width 22s linear;"></div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(prepOverlay);
    } else {
        document.getElementById('format-text-phase').style.display = 'flex';
        document.getElementById('format-video-phase').style.display = 'none';
        document.getElementById('format-progress-bar').style.width = '0%';
        prepOverlay.style.display = 'block';
    }

    // Assicurati che all'inizio lo sfondo sia nero puro
    prepOverlay.style.background = '#000';

    // 4. Avvia Audio di Pucci
    if (typeof AudioManager !== 'undefined') {
        AudioManager.play('sound-pucci', 'eventi');
    }

    // Calcolo QBits da salvare
    const tokenDiv = gameState.prestigePoints.div(10000);
    let bonusQbits = new Decimal(0);
    if (tokenDiv.gte(1)) bonusQbits = tokenDiv.sqrt().floor();
    let qBitsEarned = new Decimal(1).add(bonusQbits);

    // Salvataggio Dati Super-Persistenti
    const superPersistentData = {
        achievements: JSON.parse(JSON.stringify(gameState.achievements)),
        skins: JSON.parse(JSON.stringify(gameState.skins)),
        user: JSON.parse(JSON.stringify(gameState.user)),
        lifetimeScore: gameState.lifetimeScore,
        totalClicks: gameState.totalClicks,
        totalPlayTime: gameState.totalPlayTime,
        totalGoldenBugsClicked: gameState.totalGoldenBugsClicked,
        totalFormattazioni: (gameState.totalFormattazioni || 0) + 1,
        qBits: (gameState.qBits || new Decimal(0)).add(qBitsEarned),
        lifetimeQBits: (gameState.lifetimeQBits || new Decimal(0)).add(qBitsEarned),
        superUpgrades: gameState.superUpgrades ? JSON.parse(JSON.stringify(gameState.superUpgrades)) : {}
    };
    if (gameState.superUpgrades && gameState.superUpgrades.echoQuantico && gameState.superUpgrades.echoQuantico.purchased) {
        const counted = Object.entries(gameState.prestigeUpgrades)
            .filter(([, s]) => s.count > 0);
        if (counted.length > 0) {
            const [key, state] = counted[Math.floor(Math.random() * counted.length)];
            superPersistentData.echoQuanticoPreserved = { key, state: JSON.parse(JSON.stringify(state)) };
        }
    }

    // 5. TIMING FASE 2 (Dopo esattamente 2 secondi dall'urlo)
    setTimeout(() => {

        // --- IL FIX È QUI ---
        // Rendiamo lo sfondo dell'overlay trasparente. 
        // In questo modo il video, che si trova al di sotto, sarà visibile, e la barra gli galleggerà sopra!
        prepOverlay.style.background = 'transparent';

        document.getElementById('format-text-phase').style.display = 'none';
        const vidPhase = document.getElementById('format-video-phase');
        vidPhase.style.display = 'block';

        const video = document.getElementById('video-bigbang');
        if (video) {
            video.classList.remove('video_display_none');
            video.style.position = 'fixed';
            video.style.top = '0';
            video.style.left = '0';
            video.style.width = '100vw';
            video.style.height = '100vh';
            // iOS Safari: usa il viewport dinamico se supportato (no taglio sotto URL bar)
            if (CSS && CSS.supports && CSS.supports('height', '100dvh')) {
                video.style.height = '100dvh';
            }
            video.style.objectFit = 'cover';
            // Mettiamo il video a 99990, appena SOTTO all'overlay che è a 99999
            video.style.zIndex = '99990';
            video.style.display = 'block';

            video.volume = gameState.user.masterVolume * gameState.user.musicVolume;
            video.currentTime = 0;

            let playPromise = video.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    console.warn("Video bloccato dal browser, forzo il mute.", e);
                    video.muted = true;
                    video.play();
                });
            }
        }

        // Avvia l'animazione della Progress Bar
        setTimeout(() => {
            const bar = document.getElementById('format-progress-bar');
            if (bar) bar.style.width = '100%';
        }, 50);

        // === HARD RESET DEL GIOCO (Dietro le quinte) ===
        let newState = getInitialGameState();
        Object.assign(newState, superPersistentData);
        if (superPersistentData.echoQuanticoPreserved) {
            const { key, state } = superPersistentData.echoQuanticoPreserved;
            if (newState.prestigeUpgrades && newState.prestigeUpgrades[key] !== undefined) {
                newState.prestigeUpgrades[key] = state;
            }
        }

        newState.lifetimeScore = new Decimal(newState.lifetimeScore);
        newState.qBits = new Decimal(newState.qBits);
        newState.lifetimeQBits = new Decimal(newState.lifetimeQBits);
        newState.lastSaveTimestamp = Date.now();

        let startBonusBugs = new Decimal(0);
        if (newState.superUpgrades && newState.superUpgrades.fastStart && newState.superUpgrades.fastStart.purchased) {
            startBonusBugs = startBonusBugs.add(10000);
            if (newState.teams && newState.teams.assistenteQa) newState.teams.assistenteQa.count += 5;
        }
        newState.score = startBonusBugs;

        gameState = newState;
        bps = new Decimal(0);
        clickHistory = [];
        window.gameFlags = {};

        if (typeof reapplyAllEffects === 'function') reapplyAllEffects();
        calculatePrestigeBonus();
        if (typeof recalculateCPS === 'function') recalculateCPS();

        // 6. TIMING FASE 3 (Fine dopo 22 secondi esatti)
        setTimeout(() => {

            if (video) {
                video.pause();
                video.style.display = 'none';
                video.classList.add('video_display_none');
                video.muted = false;
            }

            prepOverlay.style.display = 'none';

            window.currentActiveEvent = null;
            if (typeof refreshAllStores === 'function') refreshAllStores();
            if (typeof updateUI === 'function') updateUI();
            if (typeof AudioManager !== 'undefined') AudioManager.updateAmbience();

            const tabQuantum = document.getElementById('tab-quantum');
            if (tabQuantum) tabQuantum.click();

            if (window.EspooClicker) {
                window.EspooClicker.saveGame();
                window.EspooClicker.showToast(`FORMATTAZIONE CONCLUSA! +${formatNumber(qBitsEarned)} Q-BITS`, 'achievement');
            }
        }, 22000);

    }, 2000);
}

function checkAchievements() {
    let totalAchBPSBonus = new Decimal(0); // Inizializza come Decimal
    const isPostPrestige = gameState.totalResets > 0;

    for (const key in gameData.achievements) {
        const data = gameData.achievements[key];
        // Inizializzazione sicura se manca nel save
        if (!gameState.achievements[key]) {
            gameState.achievements[key] = { unlocked: false, claimed: false };
        }
        if (gameState.achievements[key].claimed === undefined) {
            gameState.achievements[key].claimed = false;
        }

        const state = gameState.achievements[key];

        // Skip obiettivi moltiplicatore se non sei in prestigio
        if (data.reward && data.reward.type === 'multiplier' && !isPostPrestige) {
            continue;
        }

        // Sblocco automatico
        if (!state.unlocked && data.condition()) {
            unlockAchievement(key);
        }

        // Calcolo Bonus Moltiplicatore (Decimal)
        if (state.claimed && data.reward && data.reward.type === 'multiplier') {
            // Esempio: value 1.5 diventa bonus 0.5
            let val = new Decimal(data.reward.value).minus(1);
            totalAchBPSBonus = totalAchBPSBonus.add(val);
        }
    }

    achievementsBPSBonus = totalAchBPSBonus;
    calculatePrestigeBonus();
}

function unlockAchievement(key) {
    const data = gameData.achievements[key];
    gameState.achievements[key].unlocked = true;
    gameState.achievements[key].unlockTime = Date.now();
    if (!data.reward) {
        gameState.achievements[key].claimed = true;
    } else {
        gameState.achievements[key].claimed = false;
    }
    playSound('sound-achievement');
    let msg = gameData.texts.toasts.achievementUnlock.replace('{name}', data.name);
    if (data.reward) msg += gameData.texts.toasts.rewardAvailable;
    window.EspooClicker.showToast(msg);
    window.EspooClicker.saveGame();
    if (typeof updateAchievementsUI === 'function') updateAchievementsUI();
}

function claimAchievementReward(key) {
    const state = gameState.achievements[key];
    const data = gameData.achievements[key];

    // Controlli di sicurezza
    if (!state || !state.unlocked || state.claimed) return;

    // Assegna il premio usando il nuovo sistema unificato
    if (data.reward) {
        grantReward(data.reward);
    }

    // Aggiorna stato
    state.claimed = true;
    playSound('sound-buy');

    // Ricalcola e Salva
    recalculateCPS();
    window.EspooClicker.saveGame();

    // Aggiorna UI
    if (typeof updateAchievementsUI === 'function') updateAchievementsUI();
    if (typeof updateSkinsUI === 'function') updateSkinsUI();
}

let goldenBugTimer;
function scheduleGoldenBug() {
    if (goldenBugTimer) clearTimeout(goldenBugTimer);
    const nextSpawnTime = goldenBugSpawnTime + Math.random() * goldenBugSpawnTime;
    goldenBugTimer = setTimeout(spawnGoldenBug, nextSpawnTime);
}

function spawnGoldenBug() {
    // Reset stato pulito (anim residue, classi)
    goldenBug.classList.remove('visible', 'despawning', 'clicked');

    const bugWidth = 64;
    const bugHeight = 64;
    const padding = 24;

    const targetArea = document.getElementById('clicker-section');
    if (!targetArea) return;

    const rect = targetArea.getBoundingClientRect();

    const maxX = rect.width - bugWidth - (padding * 2);
    const maxY = rect.height - bugHeight - (padding * 2);

    const randomX = Math.max(0, Math.random() * maxX);
    const randomY = Math.max(0, Math.random() * maxY);

    const finalLeft = rect.left + window.scrollX + padding + randomX;
    const finalTop = rect.top + window.scrollY + padding + randomY;

    goldenBug.style.left = `${finalLeft}px`;
    goldenBug.style.top = `${finalTop}px`;

    // Varietà: scegli il tipo di bug (effetto "cosa mi esce?")
    //   standard 70% · lucky 18% (ricompensa ×8) · frenzy 12% (buff click ×7 15s)
    const typeRoll = Math.random();
    let bugType = 'standard';
    if (typeRoll < 0.12) bugType = 'frenzy';
    else if (typeRoll < 0.30) bugType = 'lucky';
    window._goldenBugType = bugType;
    goldenBug.classList.remove('gb-lucky', 'gb-frenzy');
    if (bugType !== 'standard') goldenBug.classList.add('gb-' + bugType);

    // Force reflow per riavviare animazioni dopo remove .visible
    void goldenBug.offsetWidth;
    goldenBug.classList.add('visible');

    // Cleanup precedenti timer
    if (window._goldenBugDespawnTimer) clearTimeout(window._goldenBugDespawnTimer);
    if (window._goldenBugWarnTimer) clearTimeout(window._goldenBugWarnTimer);

    // Warning ultimi 2s — flicker urgente
    window._goldenBugWarnTimer = setTimeout(() => {
        if (goldenBug.classList.contains('visible')) {
            goldenBug.classList.add('despawning');
        }
    }, 8000);

    // Despawn dopo 10s
    window._goldenBugDespawnTimer = setTimeout(() => {
        goldenBug.classList.remove('visible', 'despawning');
    }, 10000);

    scheduleGoldenBug();
    return true;
}

function clickGoldenBug() {
    const goldenBug = document.getElementById('golden-bug');
    if (goldenBug && goldenBug.classList.contains('clicked')) return; // anti-doppio-click

    playSound('sound-golden');
    gameState.totalGoldenBugsClicked++;

    const currentClickValue = calculateClickValue();
    const bugType = window._goldenBugType || 'standard';

    // Formula base: (BPS * 30 + Click * 10 + 10) * Multiplier
    let bonus = bps.mul(30).add(currentClickValue.mul(10)).add(10);
    bonus = bonus.mul(window.goldenBugMult);

    // Varietà bug: modifica ricompensa / attiva buff
    let toastMsg;
    if (bugType === 'lucky') {
        bonus = bonus.mul(8); // jackpot
        toastMsg = '🍀 BUG FORTUNATO! +' + formatNumber(bonus) + ' bug!';
    } else if (bugType === 'frenzy') {
        bonus = bonus.mul(2); // piccolo bonus immediato
        // Buff temporaneo: click ×7 per 15s (gestito in calculateClickValue)
        window.goldenFrenzyMult = new Decimal(7);
        window.goldenFrenzyEnd = Date.now() + 15000;
        if (typeof FX !== 'undefined' && FX.flash) FX.flash('rgba(231,76,60,0.15)', 0.25);
        toastMsg = '⚡ FRENESIA! Click ×7 per 15 secondi!';
    } else {
        toastMsg = gameData.texts.toasts.bugCrit.replace('{amount}', formatNumber(bonus));
    }

    gameState.score = gameState.score.add(bonus);
    gameState.totalScore = gameState.totalScore.add(bonus);
    gameState.lifetimeScore = gameState.lifetimeScore.add(bonus);

    window.EspooClicker.showToast(toastMsg, 'reward');

    // Cancella timer despawn (clicked, niente warning ulteriore)
    if (window._goldenBugDespawnTimer) clearTimeout(window._goldenBugDespawnTimer);
    if (window._goldenBugWarnTimer) clearTimeout(window._goldenBugWarnTimer);

    if (goldenBug) {
        goldenBug.classList.remove('despawning');
        goldenBug.classList.add('clicked');
        // Rimuovi dopo animazione explosion (320ms)
        setTimeout(() => {
            goldenBug.classList.remove('visible', 'clicked');
        }, 340);
    }
    updateUI();
}

// ============================================================
// BONUS GIORNALIERO (login streak)
// ------------------------------------------------------------
// Stato in localStorage (NON in gameState) → immune al merge cloud.
// Idempotente per giorno (date-gate). Riscosso dopo che il boot
// + sync cloud si sono assestati, così non viene sovrascritto.
// ============================================================
const DAILY_BONUS_KEY = 'espo_daily_bonus';

function _dailyDateStr(offsetDays) {
    const d = new Date();
    if (offsetDays) d.setDate(d.getDate() + offsetDays);
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
}

function claimDailyBonus() {
    if (typeof gameState === 'undefined' || !gameState.score) return;

    let data = {};
    try { data = JSON.parse(localStorage.getItem(DAILY_BONUS_KEY)) || {}; } catch (e) { data = {}; }

    const today = _dailyDateStr(0);
    if (data.lastDate === today) return; // già riscosso oggi

    // Streak: +1 se ieri, altrimenti riparte da 1
    let streak = 1;
    if (data.lastDate === _dailyDateStr(-1)) streak = (data.streak || 0) + 1;

    // Ricompensa = "secondi di produzione" (scala con lo streak, cap 7gg)
    // + un pavimento per i neogiocatori con BPS bassi.
    const cap = Math.min(streak, 7);
    const secs = 600 + cap * 200; // 800s (g1) → 2000s (g7+)
    let reward = bps.mul(secs);
    const floor = gameState.baseClickValue.mul(50 * cap + 50);
    if (reward.lt(floor)) reward = floor;
    if (reward.lt(50)) reward = new Decimal(50);

    gameState.score = gameState.score.add(reward);
    gameState.totalScore = gameState.totalScore.add(reward);
    gameState.lifetimeScore = gameState.lifetimeScore.add(reward);

    try {
        localStorage.setItem(DAILY_BONUS_KEY, JSON.stringify({ lastDate: today, streak: streak }));
    } catch (e) {}

    if (window.EspooClicker && window.EspooClicker.saveGame) window.EspooClicker.saveGame();
    if (typeof updateUI === 'function') updateUI();

    const msg = '🎁 Bonus giornaliero · Giorno ' + streak + ' · +' + formatNumber(reward) + ' bug!';
    if (window.EspooClicker && window.EspooClicker.showToast) {
        window.EspooClicker.showToast(msg, 'reward');
    }
    if (typeof FX !== 'undefined' && FX.flash) FX.flash('rgba(46, 204, 113, 0.12)', 0.3);
}

// Trigger: dopo EspoGameReady, attende l'assestamento del sync cloud poi riscuote.
// (game-logic.js è bundlato prima di script.js → il listener è pronto al dispatch)
document.addEventListener('EspoGameReady', () => {
    setTimeout(claimDailyBonus, 3500);
}, { once: true });
