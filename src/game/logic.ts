/**
 * Logica di gioco: economia/acquisti, eventi runtime (golden bug, crunch, bluescreen),
 * achievement, prestigio-orchestrazione, e il sottosistema audio (AudioManager/FX).
 *
 * Migrato da js/game-logic.js (classic script) a modulo ESM — Blocco #1 kill-legacy.
 * Le 49 funzioni + 4 object-literal sono dichiarazioni top-level (nessun DOMContentLoaded
 * wrapper). Nessun accesso top-level a window.EspoV3 → nessun lazy-getter. I riferimenti
 * a global legacy (gameState/gameData/Decimal/updateUI/…) passano da `window.*` (alias `w`)
 * perché un modulo strict non li vede. Le funzioni/oggetti consumati da altri file / test /
 * cheatboard sono ri-esposti in coda (shim TEMPORANEI, rimossi a fine migrazione).
 */
const w = window as any;
import { store } from '../state/store';

// --- GESTIONE CONFLITTI EVENTI (SEMAFORO) ---
let lastRicardoVideoId = null;

w.currentActiveEvent = null; // Il "Semaforo"
let audioGlitchInterval: any = null;
let lastVideoPlayedId: any = null;

const RewardHandlers = {
    // Aggiunge Bug al wallet
    bugs: (value: any) => {
        let val = new w.Decimal(value);
        store.gameState.score = store.gameState.score.add(val);
        store.gameState.totalScore = store.gameState.totalScore.add(val);
        store.gameState.lifetimeScore = store.gameState.lifetimeScore.add(val);
        return `+${w.formatNumber(val)} Bug!`;
    },
    // Aggiunge Token Prestigio
    prestige: (value: any) => {
        let val = new w.Decimal(value);
        store.gameState.prestigePoints = store.gameState.prestigePoints.add(val);
        return `+${w.formatNumber(val)} Token Lab!`;
    },
    // Sblocca una Skin (Invariato)
    skin: (skinId: any) => {
        if (!store.gameState.skins.unlocked.includes(skinId)) {
            store.gameState.skins.unlocked.push(skinId);
            const skinName = store.gameData.skins[skinId] ? store.gameData.skins[skinId].name : skinId;
            return store.gameData.texts.toasts.skinUnlock.replace('{name}', skinName);
        }
        return null;
    },
    multiplier: (value: any) => {
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
function grantReward(reward: any) {
    if (!reward || !(RewardHandlers as any)[reward.type]) return;

    // Chiama l'handler specifico passandogli il valore o l'ID
    const message = (RewardHandlers as any)[reward.type](reward.value || reward.id);

    // Mostra il toast solo se l'handler ha restituito un messaggio
    if (message) {
        w.EspooClicker.showToast(store.gameData.texts.toasts.rewardClaimed.replace('{message}', message), 'reward');
    }
}

/**
 * Calcola il costo scalato per i potenziamenti del Laboratorio (Prestigio)
 * Formula: CostoBase * (Moltiplicatore ^ Livello)
 */
function calculatePrestigeUpgradeCost(upgradeKey: any) {
    const data = store.gameData.prestigeUpgrades[upgradeKey];
    const state = store.gameState.prestigeUpgrades[upgradeKey];
    // F6 -> F8: formula in EspoV3.economy col Decimal della pagina (bit-identico).
    return window.EspoV3.economy.prestigeUpgradeCost(w.Decimal, {
        isCounted: !!data.isCounted,
        baseCost: data.baseCost,
        count: (state && state.count) || 0,
        qDiscount: !!(store.gameState.superUpgrades && store.gameState.superUpgrades.qDiscount && store.gameState.superUpgrades.qDiscount.purchased),
    });
}

/**
 * Calcola la nuova soglia per ottenere la Promozione.
 * Formula: SogliaBase * (Moltiplicatore ^ Resets)
 */
function getPrestigeThreshold() {
    // F6 -> F8: soglia base * 3^resets in EspoV3.economy (bit-identico).
    return window.EspoV3.economy.prestigeThreshold(w.Decimal, store.gameState.totalResets || 0);
}

function checkEventConflict(newEventName: any) {
    if (w.currentActiveEvent) {
        w.EspooClicker.showToast(`⛔ Occupato: Evento "${w.currentActiveEvent}" in corso!`, 'error');
        return true;
    }
    w.currentActiveEvent = newEventName;
    return false;
}

function clearActiveEvent() {
    console.log(`Evento "${w.currentActiveEvent}" terminato.`);

    if (w.currentActiveEvent === 'Audio Mixer') {
        w.preMixerEvent = null;
        console.log("Evento scaduto durante il Mixer. Backup pulito.");
    } else {
        // Comportamento standard
        w.currentActiveEvent = null;
    }
}

// --------- SISTEMA DI UPGRADE GENERICO (NEW) ---------

// Applica un singolo effetto
function applyEffect(effect: any, level = 1) {
    if (!effect)
        return;

    let lvl = new w.Decimal(level);

    if (effect.type === 'mult_state') {
        if (store.gameState.hasOwnProperty(effect.stat))
            store.gameState[effect.stat] = store.gameState[effect.stat].mul(effect.val);
    }
    else if (effect.type === 'mult_global') {
        if (w.hasOwnProperty(effect.stat)) {
            // Gestione Ibrida: Se la variabile target è Decimal usa .mul, altrimenti *
            if (w[effect.stat] instanceof w.Decimal) {
                let value = new w.Decimal(effect.val);
                w[effect.stat] = w[effect.stat].mul(value);
            }
            else
                w[effect.stat] *= effect.val;
        }
    }
    else if (effect.type === 'add_mult_per_level') {
        if (w.hasOwnProperty(effect.stat)) {
            let value = new w.Decimal(effect.val);
            let bonus = value.mul(lvl);

            if (w[effect.stat] instanceof w.Decimal)
                w[effect.stat] = w[effect.stat].add(bonus);
            else
                w[effect.stat] += (effect.val * level);
        }
    }
    else if (effect.type === 'add_global_stat_per_level') {
        if (w.hasOwnProperty(effect.stat)) {
            let value = new w.Decimal(effect.val);
            let bonus = value.mul(lvl);

            if (w[effect.stat] instanceof w.Decimal)
                w[effect.stat] = w[effect.stat].add(bonus);
            else
                w[effect.stat] += (effect.val * level);
        }
    }
    else if (effect.type === 'set_flag')
        w.gameFlags[effect.flag] = effect.val;
}

// Ricalcola tutti gli effetti passivi
function reapplyAllEffects() {
    // Reset Totale
    w.goldenBugChance = 0.001;
    w.goldenBugMult = new w.Decimal(1);
    w.goldenBugSpawnTime = 60000;
    w.clickGlobalMult = new w.Decimal(1);
    store.clickCPSBonus = new w.Decimal(1);
    w.costScalingReduction = 0;
    w.prestigeSynergyFactor = new w.Decimal(0);

    w.gameFlags = {};

    // Click Upgrades
    for (const key in store.gameState.clickUpgrades) {
        if (store.gameState.clickUpgrades[key].purchased) {
            const data = store.gameData.clickUpgrades[key];
            if (data && data.effects) data.effects.forEach((eff: any) => { if (eff.trigger === 'passive') applyEffect(eff); });
        }
    }

    // Prestige Upgrades
    for (const key in store.gameState.prestigeUpgrades) {
        const state = store.gameState.prestigeUpgrades[key];
        const data = store.gameData.prestigeUpgrades[key];

        if (!data) continue;

        if ((data.isCounted && state.count > 0) || (!data.isCounted && state.purchased)) {
            if (data.effects) data.effects.forEach((eff: any) => { if (eff.trigger === 'passive') applyEffect(eff, state.count || 1); });
        }
    }

    // Super Upgrades (Q-Lab)
    if (store.gameState.superUpgrades) {
        for (const key in store.gameState.superUpgrades) {
            const state = store.gameState.superUpgrades[key];
            const data = store.gameData.superUpgrades[key];
            if (!data) continue;
            
            if (state.purchased && data.effects) {
                data.effects.forEach((eff: any) => { if (eff.trigger === 'passive') applyEffect(eff); });
            }
        }
    }
}

// --------- 3. AUDIO MANAGER CENTRALIZZATO (Howler.js) ---------
const AudioManager = {
    _sounds: {} as Record<string, any>,        // Cache Howl instances: { 'sound-click': Howl, ... }
    _currentMusic: null, // ID della traccia musicale attualmente in play
    _musicDuck: 1,       // Moltiplicatore volume SOLO musica (1=pieno). Abbassato durante l'intro.
    _audioUnlocked: false,
    _pendingPlay: new Set(), // Tracce con play accodato ma non ancora confermato da Howler
    _ambienceTimer: null as any,    // Debounce: evita chiamate multiple a updateAmbience() in rapida
                             // successione (boot, cloud sync, listener) → un solo play per ciclo
    _promptEl: null,         // Riferimento all'elemento DOM del banner "clicca per l'audio"
    _lastClickSound: 0,      // Timestamp ultimo click sound (throttle anti-spam)

    init() {
        // Registra tutti i suoni definiti in gameData.assets.sounds come Howl instances.
        // Su R2: l'URL firmato deve essere già stato prefetchato (window.CDN.prefetch())
        // prima di chiamare init(). Se non c'è cache, fallback al path locale.
        for (const key in store.gameData.assets.sounds) {
            const sound = store.gameData.assets.sounds[key];
            const localSrc = sound.file.includes('/') ? sound.file : `assets/sounds/${sound.file}`;

            // Prova prima URL firmato sync (cache R2), altrimenti locale
            const signed = (w.CDN && w.CDN.urlSync) ? w.CDN.urlSync(localSrc) : null;
            const src = signed ? [signed] : [localSrc];

            this._sounds[sound.id] = new w.Howl({
                src: src,
                volume: 0, // Impostato dinamicamente al play
                loop: !!sound.loop,
                // Preload tutti gli SFX (non musica), salvo override esplicito:
                // gli SFX dell'arcade sono registrati solo per il mixer e li
                // riproduce Phaser in un'altra pagina → preload:false, altrimenti
                // il gioco principale scarica file che non usera' mai.
                preload: (sound.preload !== undefined) ? sound.preload : (sound.type === 'sfx'),
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
                            const ctx = w.Howler.ctx;
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
                onloaderror: (id: any, err: any) => {
                    console.warn(`[Audio] Errore caricamento ${sound.id}:`, err);
                    // Fallback R2 → locale: ricostruisci Howl con sola src locale
                    const current = this._sounds[sound.id];
                    if (signed && current && !current._cdnFallbackUsed) {
                        console.warn('[CDN] Audio fail, fallback locale:', sound.id);
                        try { current.unload(); } catch (e) {}
                        const replacement = new w.Howl({
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

        this._audioUnlocked = w.Howler.ctx && w.Howler.ctx.state === 'running';
        // NON chiamare updateAmbience() qui: i Howl sono appena creati e non è ancora
        // noto se l'utente è loggato. Il play parte da tryStartAudio() che viene
        // chiamata subito dopo da tryStart() e/o dal setTimeout post-loader.
    },

    _showAudioPrompt() {
        // Stato "bloccato" integrato nel bottone mute (pillola + anello pulsante).
        const btn = document.getElementById('quick-mute-btn');
        if (btn) btn.classList.add('is-blocked');
    },

    _hideAudioPrompt() {
        const btn = document.getElementById('quick-mute-btn');
        if (btn) btn.classList.remove('is-blocked');
    },

    getCustomVolume(id: any) {
        // I video non sono più regolabili dal mixer (vedi renderAudioMixer): ignorano
        // audioCustom e valgono sempre il loro defaultVol. Senza questo guard un valore
        // salvato in passato resterebbe applicato per sempre, senza slider per correggerlo.
        const videoDef = store.gameData && store.gameData.assets && store.gameData.assets.videos
            ? Object.values(store.gameData.assets.videos as Record<string, any>).find((v: any) => v.id === id)
            : undefined;
        if (videoDef) return (videoDef.defaultVol !== undefined) ? videoDef.defaultVol : 1.0;

        if (store.gameState && store.gameState.user && store.gameState.user.audioCustom) {
            const val = store.gameState.user.audioCustom[id];
            return (val !== undefined) ? val : 1.0;
        }
        return 1.0;
    },

    _calcVolume(id: any, type: any, mult?: any) {
        const master = store.gameState.user.masterVolume || 0;
        if (master <= 0) return 0;
        const channel = (type === 'music') ? store.gameState.user.musicVolume : store.gameState.user.sfxVolume;
        const custom = this.getCustomVolume(id);
        const duck = (type === 'music') ? this._musicDuck : 1;
        return Math.max(0, Math.min(1, master * channel * custom * duck * (mult || 1)));
    },

    // Duck musica (0..1): abbassa SOLO le tracce musicali (es. durante l'intro,
    // così non copre gli SFX/il reveal); setMusicDuck(1) ripristina con re-fade.
    setMusicDuck(factor: any) {
        this._musicDuck = (typeof factor === 'number') ? Math.max(0, Math.min(1, factor)) : 1;
        this.updateAmbience();
    },

    play(id: any, type = 'sfx') {
        const howl = this._sounds[id];
        if (!howl) return;
        const vol = this._calcVolume(id, type);
        if (vol < 0.01) return;

        // Annulla un eventuale stop-con-fade pendente: stiamo ripartendo questa traccia.
        if (howl._fadeStopTimer) { clearTimeout(howl._fadeStopTimer); howl._fadeStopTimer = null; }

        if (type === 'sfx') {
            howl.volume(vol);
            howl.play();
        } else {
            howl.volume(vol);
            if (!howl.playing()) howl.play();
        }
    },

    // Ferma un suono specifico con fade-out opzionale
    stop(id: any, fadeMs: any) {
        const howl = this._sounds[id];
        if (!howl) return;
        if (howl._fadeStopTimer) { clearTimeout(howl._fadeStopTimer); howl._fadeStopTimer = null; }
        if (fadeMs && fadeMs > 0 && howl.playing()) {
            howl.fade(howl.volume(), 0, fadeMs);
            // Traccia il timer: se la stessa traccia riparte entro fadeMs, play() lo annulla
            // (altrimenti lo stop ritardato fermava la NUOVA riproduzione).
            howl._fadeStopTimer = setTimeout(() => { howl._fadeStopTimer = null; howl.stop(); }, fadeMs);
        } else {
            howl.stop();
        }
    },

    playClickEffect() {
        // PERF: cap a ~40/sec. Sui clic a raffica si accumulavano decine di suoni
        // concorrenti (glitch audio + costo main-thread); a quel ritmo non sono
        // comunque distinguibili.
        const _nowSnd = performance.now();
        if (_nowSnd - (this._lastClickSound || 0) < 25) return;
        this._lastClickSound = _nowSnd;
        let soundId = 'sound-click';

        if (document.body.classList.contains('super-star-active')) {
            soundId = 'sound-click';
        } else if (document.body.classList.contains('crunch-active')) {
            if (store.gameState.skins.current === 'superespo') soundId = 'sound-fireball';
        }

        const howl = this._sounds[soundId];
        if (!howl) return;

        let rate = 1.0;
        let volumeMult = 1.0;

        if (store.isBluescreenActive && !document.body.classList.contains('super-star-active')) {
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

    // Ponte audio verso la pagina arcade (arcade.php e' un documento separato,
    // aperto con window.open: non condivide ne' lo store ne' gli Howl). Senza
    // questo lo stub EspooClicker di js/arcade-page.js non conosce i volumi e
    // Super Espo suona a volume pieno ignorando il mixer.
    // localStorage e' condiviso fra le due finestre e l'evento 'storage' notifica
    // l'arcade in tempo reale se l'utente muove i cursori a gioco aperto.
    _publishArcadeAudio() {
        try {
            const u = store.gameState && store.gameState.user;
            if (!u) return;
            localStorage.setItem('espo_arcade_audio', JSON.stringify({
                masterVolume: u.masterVolume,
                sfxVolume: u.sfxVolume,
                musicVolume: u.musicVolume,
                audioCustom: u.audioCustom || {}
            }));
        } catch (e) { /* quota piena o modalita' privata: l'arcade usa i default */ }
    },

    _applyAmbience() {
        // Prima del gate di login: la fotografia dei volumi deve restare fresca
        // anche quando questa funzione esce subito.
        this._publishArcadeAudio();

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
        for (const key in store.gameData.assets.sounds) {
            if (store.gameData.assets.sounds[key].type === 'music') {
                allMusicIds.push(store.gameData.assets.sounds[key].id);
            }
        }
        for (const key in store.gameData.skins) {
            const conf = store.gameData.skins[key].themeConfig;
            if (conf && conf.specialMusic && !allMusicIds.includes(conf.specialMusic)) {
                allMusicIds.push(conf.specialMusic);
            }
        }

        // Risolvi quale traccia suonare (sistema priorità)
        let targetTrackId = null;

        // 'Formatting' come 'Audio Mixer': durante la sequenza di Formattazione la
        // colonna sonora è Made in Heaven + il video, la musica di fondo deve tacere.
        // Torna da sola a fine sequenza (currentActiveEvent = null → updateAmbience()).
        if (w.currentActiveEvent === 'Audio Mixer' || w.currentActiveEvent === 'Formatting') {
            targetTrackId = null;
        } else if (document.body.classList.contains('rick-rolling')) {
            targetTrackId = null;
        } else if (store.gameState.crunchTimeEndTime > Date.now()) {
            targetTrackId = 'sound-fury-music';
        } else if (store.isBluescreenActive) {
            if (document.body.classList.contains('matrix-active')) {
                targetTrackId = 'sound-matrix';
            } else if (document.body.classList.contains('super-star-active')) {
                targetTrackId = 'sound-star';
            } else {
                targetTrackId = (store.gameState.skins.current === 'christmas') ? 'sound-snowball' : 'sound-bluescreen';
            }
        } else {
            const currentSkin = store.gameData.skins[store.gameState.skins.current] || store.gameData.skins['default'];
            if (currentSkin.themeConfig && currentSkin.themeConfig.specialMusic) {
                targetTrackId = currentSkin.themeConfig.specialMusic;
            } else {
                targetTrackId = store.gameState.user.bgMusicSelection || 'sound-bg-music';
            }
        }

        // Applica: una traccia alla volta, stop immediato sulle non-target
        allMusicIds.forEach(id => {
            const howl = this._sounds[id];
            if (!howl) return;

            if (id === targetTrackId) {
                const vol = this._calcVolume(id, 'music');

                // Eccezione glitch natalizio
                if (id === 'sound-snowball' && store.isBluescreenActive && store.gameState.skins.current === 'christmas') {
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
    _getSoundDef(id: any) {
        for (const key in store.gameData.assets.sounds) {
            if (store.gameData.assets.sounds[key].id === id) return store.gameData.assets.sounds[key];
        }
        return null;
    },

    // Aggiorna il volume di un suono specifico (usato dal mixer)
    setVolume(id: any, volume: any) {
        const howl = this._sounds[id];
        if (howl && howl.playing()) {
            howl.volume(Math.max(0, Math.min(1, volume)));
        }
    },

    // Ritorna l'istanza Howl per uso diretto (es. glitch interval)
    getHowl(id: any) {
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
        if (!el || typeof w.gsap === 'undefined') return;
        w.gsap.killTweensOf(el, 'x,y');
        w.gsap.to(el, {
            x: () => (Math.random() - 0.5) * intensity,
            y: () => (Math.random() - 0.5) * intensity,
            duration: 0.04,
            repeat: Math.floor(duration / 0.04),
            yoyo: true,
            ease: 'power1.inOut',
            onComplete: () => w.gsap.set(el, { x: 0, y: 0 })
        });
    },

    // Haptic vibration (mobile)
    vibrate(pattern: any) {
        if (navigator.vibrate) {
            navigator.vibrate(pattern || 15);
        }
    },

    // Impact flash — breve lampo bianco/colorato sullo schermo
    flash(color = 'rgba(255,255,255,0.15)', duration = 0.12) {
        if (typeof w.gsap === 'undefined') return;
        let overlay = document.getElementById('fx-flash-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'fx-flash-overlay';
            overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9500;opacity:0';
            document.body.appendChild(overlay);
        }
        overlay.style.background = color;
        w.gsap.killTweensOf(overlay);
        w.gsap.fromTo(overlay,
            { opacity: 1 },
            { opacity: 0, duration: duration, ease: 'power2.out' }
        );
    },

    // Glow ring — anello espansivo dal clicker button
    glowRing(color = '#ff4757') {
        const btn = document.getElementById('clicker-btn');
        if (!btn || typeof w.gsap === 'undefined') return;
        const ring = document.createElement('div');
        ring.style.cssText = `position:absolute;top:50%;left:50%;width:100%;height:100%;
            border-radius:50%;border:2px solid ${color};pointer-events:none;
            transform:translate(-50%,-50%) scale(1);opacity:0.8;z-index:5`;
        btn.appendChild(ring);
        w.gsap.to(ring, {
            scale: 1.8,
            opacity: 0,
            duration: 0.5,
            ease: 'power2.out',
            onComplete: () => ring.remove()
        });
    },

    // Combo tracker
    _comboCount: 0,
    _comboTimer: null as any,
    _comboThreshold: 350, // ms tra click per mantenere combo (margine ampio = combo più facili)
    _lastComboFx: 0, // timestamp ultimo FX combo

    registerClick() {
        // Durante eventi video il combo overlay copre il video — lo sopprimiamo
        // del tutto (counter resettato, niente shake/glow/ring per non distrarre).
        const inVideoEvent = document.body.classList.contains('rick-rolling');
        if (inVideoEvent) {
            this._comboCount = 0;
            clearTimeout(this._comboTimer);
            this._hideComboDisplay();
            if (typeof w.EsposionFX !== 'undefined' && w.EsposionFX.isActive()) w.EsposionFX.decay();
            this.vibrate(10);
            return 0;
        }

        // +1 normalmente; il cheat di test (cheatboard, max ×3) fa salire la combo
        // più in fretta per provare le fasi alte / lo sblocco senza 150+ click.
        this._comboCount += (w.cheatComboMult || 1);

        // Record combo più lunga (statistica lifetime, persiste su prestige/format)
        if (typeof store.gameState !== 'undefined' && store.gameState &&
            this._comboCount > (store.gameState.longestCombo || 0)) {
            store.gameState.longestCombo = this._comboCount;
        }

        clearTimeout(this._comboTimer);
        this._comboTimer = setTimeout(() => {
            this._comboCount = 0;
            this._hideComboDisplay();
            if (typeof w.EsposionFX !== 'undefined' && w.EsposionFX.isActive()) w.EsposionFX.decay();
        }, this._comboThreshold);

        // Haptic su ogni click
        this.vibrate(10);

        // PERF: effetti visivi del combo (shake/flash/glow/contatore) throttlati a
        // ~ogni 50ms. Sui clic a raffica animarli a ogni click accumulava tween GSAP
        // e causava jank/freeze; il contatore combo resta comunque esatto.
        const _nowFx = performance.now();
        if (_nowFx - (this._lastComboFx || 0) >= 50) {
            this._lastComboFx = _nowFx;

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
        }

        // Esposion: la skin dinamica reagisce al combo (solo estetico).
        if (typeof w.EsposionFX !== 'undefined' && w.EsposionFX.isActive()) w.EsposionFX.update(this._comboCount);

        return this._comboCount;
    },

    // Combo counter visuale
    _showComboDisplay(count: any) {
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
            if (typeof w.gsap !== 'undefined') w.gsap.set(el, { xPercent: -50 });
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
        if (typeof w.gsap !== 'undefined') {
            w.gsap.killTweensOf(el);
            w.gsap.fromTo(el,
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
    particleBurst(x: any, y: any, count = 8, colors = ['#ff4757', '#f1c40f', '#3498db', '#2ecc71']) {
        if (typeof w.gsap === 'undefined') return;
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

            w.gsap.to(p, {
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
    prestigeSequence(callback?: any) {
        if (typeof w.gsap === 'undefined') { if (callback) callback(); return; }

        const tl = w.gsap.timeline();
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
function playSound(id: any, type?: any) { AudioManager.play(id, type); }
function setBgMusicVolume() { AudioManager.updateAmbience(); }
function updateAmbientVolume() { AudioManager.updateAmbience(); }
function setMusicDuck(factor: any) { if (typeof AudioManager !== 'undefined') AudioManager.setMusicDuck(factor); }
function getCustomVolume(id: any) { return AudioManager.getCustomVolume(id); }

// --------- FUNZIONI DI ACQUISTO ---------

function finalizePurchase() {
    playSound('sound-buy');
    w.refreshAllStores(); // Ridisegna i negozi per aggiornare i tasti (grigi/verdi)
    w.EspooClicker.saveGame();
    w.updateUI();
}

function buySkin(skinId: any) {
    const data = store.gameData.skins[skinId];
    if (!data || !data.cost) return;
    if (store.gameState.skins.unlocked.includes(skinId)) return;

    // Skin post-formattazione: richiede almeno 1 formattazione
    if (data.requiresFormatting && (store.gameState.totalFormattazioni || 0) < 1) {
        playSound('sound-error');
        w.EspooClicker.showToast(store.gameData.texts.toasts.skinNeedFormat, 'error');
        return;
    }

    if (store.gameState.prestigePoints.gte(data.cost)) {
        store.gameState.prestigePoints = store.gameState.prestigePoints.minus(data.cost);
        store.gameState.skins.unlocked.push(skinId);
        const _isFreeSkin = typeof data.cost.lte === 'function' && data.cost.lte(0);
        const _skinToast = (_isFreeSkin && store.gameData.texts.toasts.skinClaimed) ? store.gameData.texts.toasts.skinClaimed : store.gameData.texts.toasts.skinBought;
        playSound('sound-buy');
        w.EspooClicker.showToast(_skinToast.replace('{name}', data.name), 'success');
        w.EspooClicker.saveGame();
        if (typeof w.updatePrestigeUI === 'function') w.updatePrestigeUI();
        if (typeof w.updateSkinsUI === 'function') w.updateSkinsUI();
    } else {
        playSound('sound-error');
        w.EspooClicker.showToast(store.gameData.texts.toasts.insufficientTokens, 'error');
    }
}

function buyClickUpgrade(upgradeKey: any) {
    const state = store.gameState.clickUpgrades[upgradeKey];
    const data = store.gameData.clickUpgrades[upgradeKey];

    if (store.gameState.score.gte(data.cost) && !state.purchased) {
        store.gameState.score = store.gameState.score.minus(data.cost);
        store.gameState.baseClickValue = store.gameState.baseClickValue.add(data.clickIncrease);
        state.purchased = true;

        if (data.effects)
            data.effects.forEach((eff: any) => applyEffect(eff));

        if (upgradeKey === 'clickAutomatico')
            recalculateCPS();

        finalizePurchase();
    }
}

function buyTeamEnhancement(enhanceKey: any) {
    const state = store.gameState.buildingEnhancements[enhanceKey];
    const data = store.gameData.buildingEnhancements[enhanceKey];

    if (store.gameState.score.gte(data.cost) && !state.purchased) {
        store.gameState.score = store.gameState.score.minus(data.cost);
        state.purchased = true;
        recalculateCPS();
        finalizePurchase();
    }
}

function buyPrestigeUpgrade(upgradeKey: any) {
    const state = store.gameState.prestigeUpgrades[upgradeKey];
    const data = store.gameData.prestigeUpgrades[upgradeKey];
    const cost = data.isCounted ? calculatePrestigeUpgradeCost(upgradeKey) : data.baseCost;

    if (data.isCounted) {
        if (store.gameState.prestigePoints.lt(cost))
            return;
    }
    else {
        if (store.gameState.prestigePoints.lt(cost) || state.purchased)
            return;
    }

    store.gameState.prestigePoints = store.gameState.prestigePoints.minus(cost);

    if (data.isCounted) {
        state.count++;
        if (data.effects)
            data.effects.forEach((eff: any) => applyEffect(eff, 1));
    }
    else {
        state.purchased = true;
        if (data.effects)
            data.effects.forEach((eff: any) => applyEffect(eff));
    }

    calculatePrestigeBonus();
    recalculateCPS();
    finalizePurchase();
}

function buySuperUpgrade(upgradeKey: any) {
    const state = store.gameState.superUpgrades[upgradeKey];
    const data = store.gameData.superUpgrades[upgradeKey];

    if (store.gameState.qBits.lt(data.cost) || state.purchased) return;

    store.gameState.qBits = store.gameState.qBits.minus(data.cost);
    state.purchased = true;

    playSound('sound-buy');
    if (typeof reapplyAllEffects === 'function') reapplyAllEffects();
    recalculateCPS();
    if (typeof w.refreshAllStores === 'function') w.refreshAllStores();
    if (w.EspooClicker) w.EspooClicker.saveGame();
    if (typeof w.updateUI === 'function') w.updateUI();
}


// --------- FUNZIONI DI GIOCO PRINCIPALI ---------
// --------- FUNZIONI MATEMATICHE (DECIMAL) ---------

// Input comune alle formule costo team V3: r derivato dai global di scaling,
// livello Outsourcing per lo sconto. Usato dalle deleghe F6 (fetta 2).
function _teamCostInput(teamKey: any) {
    let r = 1.05;
    if (w.costScalingBase)
        r = Math.max(1.05, w.costScalingBase - w.costScalingReduction);
    const outsourcingState = store.gameState.prestigeUpgrades.outsourcing;
    return {
        baseCost: store.gameData.teams[teamKey].baseCost,
        count: store.gameState.teams[teamKey].count,
        r: r,
        outsourcingLevel: (outsourcingState && outsourcingState.count) || 0,
    };
}

function calculateBulkCost(teamKey: any, amount: any) {
    // F6 -> F8: serie geometrica + sconto outsourcing in EspoV3.economy (bit-identico).
    return window.EspoV3.economy.teamBulkCost(w.Decimal, _teamCostInput(teamKey), amount);
}

/*function calculateTeamCost(teamKey) {
    return calculateBulkCost(teamKey, 1);
}*/

function calculateMaxAffordable(teamKey: any) {
    // F6 -> F8: formula log + raffinamento in EspoV3.economy.
    return window.EspoV3.economy.maxAffordableTeams(w.Decimal, _teamCostInput(teamKey), store.gameState.score);
}

function buyTeam(teamKey: any) {
    let amount = w.buyMultiplier;
    if (typeof amount === 'undefined') amount = 1;

    if (amount === 'MAX') {
        amount = calculateMaxAffordable(teamKey);
        if (amount === 0) return;
    }

    const state = store.gameState.teams[teamKey];
    const currentCost = calculateBulkCost(teamKey, amount);

    if (store.gameState.score.gte(currentCost)) {
        playSound('sound-buy');
        store.gameState.score = store.gameState.score.minus(currentCost);
        const oldCount = state.count;
        state.count += amount;
        checkBuildingMilestone(teamKey, oldCount, state.count);
        recalculateCPS();
        w.refreshAllStores();
        w.EspooClicker.saveGame();
        w.updateUI();
    } else {
        playSound('sound-error');
        w.EspooClicker.showToast(store.gameData.texts.toasts.insufficientBugs, 'error');
    }
}

// Pop "traguardo" quando un team supera una soglia di unità possedute.
// Riempie il vuoto del mid-game con un feedback gratificante (toast + flash).
function checkBuildingMilestone(teamKey: any, oldCount: any, newCount: any) {
    // F6 -> F8: la soglia attraversata vive in EspoV3.economy (puro, testato);
    // qui restano toast e flash DOM.
    const reached = window.EspoV3.economy.milestoneReached(oldCount, newCount);

    if (reached <= 0) return;

    const teamData = store.gameData.teams[teamKey];
    const name = (teamData && teamData.name) ? teamData.name : teamKey;
    if (w.EspooClicker && w.EspooClicker.showToast) {
        w.EspooClicker.showToast(store.gameData.texts.toasts.milestone.replace('{name}', name).replace('{amount}', reached), 'reward');
    }
    if (typeof FX !== 'undefined' && FX.flash) FX.flash('rgba(0, 217, 255, 0.10)', 0.18);
}

// --- SOFTCAP BONUS PERMANENTE (durabilità) ---
// Il bonus resta INVARIATO fino a SOFTCAP_KNEE (early/mid game intatti, ~primi
// 11 livelli), poi applica rendimenti decrescenti (√): evita lo snowball che
// rendeva i livelli alti istantanei. Tarabili: KNEE = dove inizia il
// rallentamento (in "punti bonus", cioè bonus-1); COEFF = ripidità oltre.
// Verificato con simulazione di bilanciamento (modalità wrap06).
//
// ATTENZIONE — ordine di esecuzione: queste due costanti vengono valutate
// all'IMPORT di questo modulo (gli import sono hoisted, quindi girano PRIMA
// del corpo di main.ts). `new w.Decimal(...)` richiede che `window.Decimal`
// esista già a quel momento. Oggi funziona SOLO perché il tag <script> classico
// dist/break_infinity.min.js (index.php:325) viene eseguito prima del tag
// <script type="module"> (index.php:351), quindi window.Decimal è già globale
// quando questo modulo viene importato — installGlobalDecimal() non è ancora
// stato chiamato e non serve. Se in futuro quel tag classico viene rimosso a
// favore di installGlobalDecimal() (chiamato dal corpo di main.ts), questo
// modulo esploderà all'import perché window.Decimal sarà ancora undefined in
// questo punto. Task futuro: NON rimuovere break_infinity.min.js da index.php
// finché queste costanti (e ogni altro `new w.Decimal(...)` a livello di
// modulo) non vengono spostate dentro una funzione richiamata dopo
// installGlobalDecimal(), o rese lazy.
const PRESTIGE_BONUS_SOFTCAP_KNEE = new w.Decimal(80);
const PRESTIGE_BONUS_SOFTCAP_COEFF = new w.Decimal(0.6);
function applyBonusSoftcap(x: any) {
    if (x.lte(PRESTIGE_BONUS_SOFTCAP_KNEE)) return x;
    const excess = x.minus(PRESTIGE_BONUS_SOFTCAP_KNEE);
    return PRESTIGE_BONUS_SOFTCAP_KNEE.add(PRESTIGE_BONUS_SOFTCAP_COEFF.mul(excess.sqrt()));
}

function calculatePrestigeBonus() {
    // F6 -> F8: formula in EspoV3.economy, costanti di bilanciamento iniettate da qui.
    store.prestigeBonus = window.EspoV3.economy.computePrestigeBonus(w.Decimal, {
        lifetimePrestigePoints: store.gameState.lifetimePrestigePoints,
        synergyFactor: w.prestigeSynergyFactor,
        achievementsBonus: store.achievementsBPSBonus,
        softcapKnee: PRESTIGE_BONUS_SOFTCAP_KNEE,
        softcapCoeff: PRESTIGE_BONUS_SOFTCAP_COEFF,
    });
}

function recalculateCPS() {
    // F6 -> F8: la formula vive in EspoV3.economy; qui resta il mapping (nell'ORDINE
    // di iterazione legacy: la sequenza di add e contratto di parita float) e
    // l'assegnazione al global bps.
    const teams = [];
    for (const key in store.gameState.teams) {
        const teamState = store.gameState.teams[key];
        const teamData = store.gameData.teams[key];
        if (!teamData || !(teamState.count > 0)) continue;
        const multipliers = [];
        for (const upgKey in store.gameState.buildingEnhancements) {
            const upgState = store.gameState.buildingEnhancements[upgKey];
            const upgData = store.gameData.buildingEnhancements[upgKey];
            if (upgState.purchased && upgData && upgData.targetTeam === key) {
                multipliers.push(upgData.multiplier);
            }
        }
        teams.push({ cpsPerUnit: teamData.cpsPerUnit, count: teamState.count, multipliers: multipliers });
    }
    const autoQA = (w.gameFlags && w.gameFlags.autoClickQA && store.gameState.teams.assistenteQa)
        ? (store.gameState.teams.assistenteQa.count || 0) : 0;
    store.bps = window.EspoV3.economy.computeBps(w.Decimal, teams, autoQA,
        [store.prestigeBonus, store.clickCPSBonus, store.bluescreenMultiplier, store.crunchTimeMultiplier]);
}

// 1. CRUNCH TIME
function activateCrunchTime() {
    const now = Date.now();

    // 1. Controlli Preliminari
    if (checkEventConflict('Espo Fury')) return false;

    if (now < store.crunchTimeCooldownEnd) {
        const remaining = Math.ceil((store.crunchTimeCooldownEnd - now) / 1000);
        w.EspooClicker.showToast(store.gameData.texts.toasts.furyCalm.replace('{seconds}', remaining), 'warning');
        clearActiveEvent();
        return false;
    }

    // 2. Attivazione Logica
    // F6 -> F8: durata e cooldown in EspoV3.events.
    store.crunchTimeMultiplier = new w.Decimal(7);
    const overclockActive = store.gameState.superUpgrades && store.gameState.superUpgrades.overclock && store.gameState.superUpgrades.overclock.purchased;
    const reteContattiLevel = (store.gameState.prestigeUpgrades.reteContatti && store.gameState.prestigeUpgrades.reteContatti.count) || 0;
    const furyDuration = window.EspoV3.events.crunchDuration(!!overclockActive);
    store.crunchTimeEndTime = now + furyDuration;
    const cooldownFromEnd = window.EspoV3.events.crunchCooldownFromEnd(reteContattiLevel);
    store.crunchTimeCooldownEnd = store.crunchTimeEndTime + cooldownFromEnd;

    store.gameState.crunchTimeEndTime = store.crunchTimeEndTime;
    store.gameState.crunchTimeCooldownEnd = store.crunchTimeCooldownEnd;

    recalculateCPS();

    if (typeof w.updateUI === 'function') w.updateUI();
    if (w.EspooClicker) w.EspooClicker.saveGame();

    document.body.classList.add('crunch-active');

    // 3. Gestione Immagini (Supporto Temi: 8-Bit, Super, Standard)
    const photoNormal = document.getElementById('manager-photo-normal') as HTMLImageElement | null;
    const photoClicked = document.getElementById('manager-photo-clicked') as HTMLImageElement | null;

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
        if (w.fireParticleInterval) clearInterval(w.fireParticleInterval);
        w.fireParticleInterval = setInterval(() => { spawnFireParticle(fireContainer); }, 100);
    }

    // 5. Gestione Audio Centralizzata
    // Invece di mettere in pausa manualmente, diciamo al manager di aggiornare l'ambiente.
    // Lui capirà che la Fury è attiva e farà partire 'sound-fury-music' spegnendo il resto.
    if (typeof AudioManager !== 'undefined') {
        AudioManager.updateAmbience();
    }

    // 6. Feedback Utente
    w.EspooClicker.showToast(store.gameData.texts.toasts.furyActive, 'success');
    return true;
}

const MAX_FIRE_PARTICLES = 30;  // Cap massimo di particelle fuoco nel DOM
const MAX_FIRE_SPARKS = 10;     // Cap massimo scintille

function spawnFireParticle(container: any) {
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
    w.currentActiveEvent = 'Espo Fury';
    store.crunchTimeMultiplier = new w.Decimal(7);
    document.body.classList.add('crunch-active');

    const overlay = document.getElementById('crunch-overlay');
    if (overlay) overlay.style.display = 'block';

    // 2. Ripristino Particelle
    const fireContainer = document.getElementById('fire-particles-container');
    if (fireContainer) {
        fireContainer.style.display = 'block';
        if (w.fireParticleInterval) clearInterval(w.fireParticleInterval);
        w.fireParticleInterval = setInterval(() => { spawnFireParticle(fireContainer); }, 100);
    }

    // 3. Ripristino Immagini (Supporto Temi: 8-Bit, Super, Standard)
    const photoNormal = document.getElementById('manager-photo-normal') as HTMLImageElement | null;
    const photoClicked = document.getElementById('manager-photo-clicked') as HTMLImageElement | null;

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
    if (typeof w.updateUI === 'function') w.updateUI();
}


// --- HUD video event: durante i video event score+BPS vengono spostati in un
// contenitore a livello body (#event-hud) cosi' il layout e' relativo al viewport
// (immune ai transform intermittenti degli antenati che li clippavano/scollegavano).
// Solo desktop (>1024): su mobile resta il layout dedicato. Ripristinati a fine evento.
let _eventHudStash: any = null;
function moveHudIntoEvent() {
    if (_eventHudStash || w.innerWidth <= 1024) return;
    let hud = document.getElementById('event-hud');
    if (!hud) { hud = document.createElement('div'); hud.id = 'event-hud'; document.body.appendChild(hud); }
    _eventHudStash = [];
    ['score-display', 'cps-display', 'event-multiplier-display'].forEach(function (id) {
        const el = document.getElementById(id);
        if (el) { _eventHudStash.push({ el: el, parent: el.parentNode, next: el.nextSibling }); hud.appendChild(el); }
    });
}
function restoreEventHud() {
    if (!_eventHudStash) return;
    _eventHudStash.forEach(function (r: any) {
        if (r.next && r.next.parentNode === r.parent) r.parent.insertBefore(r.el, r.next);
        else r.parent.appendChild(r.el);
    });
    _eventHudStash = null;
}

const EventHandlers = {
    video: (config: any, eventKey: any) => {
        document.body.classList.add('rick-rolling');
        moveHudIntoEvent();

        // 1. Reset e nascondi altri video
        ['rick-roll-video', 'ricardo-video', 'ricardo-metal-video', 'ricardo-dota-video'].forEach(id => {
            const videoMeme = document.getElementById(id) as HTMLVideoElement | null;
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
            const available = config.videos.filter((id: any) => id !== lastVideoPlayedId);
            const pool = available.length > 0 ? available : config.videos;
            videoId = pool[Math.floor(Math.random() * pool.length)];
        }
        lastVideoPlayedId = videoId;

        const video = document.getElementById(videoId) as (HTMLVideoElement & { _cdnFallbackBound?: boolean }) | null;

        if (video) {
            // Risolvi src sincrono: prova cache R2, poi data-src diretto, poi locale.
            // Cache R2 popolata al boot da _prefetchUrls() in script.js.
            const _resolveVideoSrcSync = () => {
                if (video.src) return video.src;
                const direct    = video.getAttribute('data-src');
                if (direct) return direct;
                const localPath = video.getAttribute('data-src-local');
                if (w.CDN && w.CDN.urlSync && localPath) {
                    const sync = w.CDN.urlSync(localPath);
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
                } else if (w.CDN && w.CDN.url) {
                    // Cache miss: chiedi async e riprova fra poco (caso edge)
                    const localPath = video.getAttribute('data-src-local');
                    w.CDN.url(localPath).then((src: any) => {
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

            // Calcolo Volume — la chiave è l'id del video EFFETTIVO, non
            // config.audioId: quello è per evento, e l'evento Ricardo ne ha tre.
            // Con audioId le varianti metal/dota prendevano il volume della
            // standard, e per giunta in disaccordo con boot.ts (quick-mute), che
            // già cercava per id reale: toccare il master a metà video cambiava
            // di colpo il volume. getCustomVolume ha comunque il suo fallback.
            const customVol = getCustomVolume(videoId || config.audioId);
            video.volume = (store.gameState.user.masterVolume * store.gameState.user.musicVolume) * customVol;

            // Play robusto: su mobile (iOS PWA / Chrome Android) gli eventi partono da timer
            // (no gesto utente) -> autoplay bloccato se non muted. Fallback: ritenta muted.
            const _safePlay = () => {
                const p = video.play();
                if (p && typeof p.then === 'function') {
                    p.catch(() => {
                        video.muted = true;
                        const p2 = video.play();
                        if (p2 && typeof p2.catch === 'function') {
                            p2.catch((err: any) => console.warn("Video bloccato anche muted", err));
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
            const overlayClickHandler = (e: any) => {
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
                restoreEventHud();

                // Ripristino Audio Ambiente
                if (typeof AudioManager !== 'undefined') AudioManager.updateAmbience();
            }, config.duration);
        }

        if (typeof AudioManager !== 'undefined') AudioManager.updateAmbience();
    },

    css_mode: (config: any, eventKey: any) => {
        // LOGICA CSS (404 / Bluescreen / Matrix)
        // Applica la classe dell'evento al body
        document.body.classList.add(config.cssClass);

        // GESTIONE SPECIFICA PER MATRIX
        if (config.cssClass === 'matrix-active') {
            // Avvia l'effetto canvas
            if (typeof w.startMatrixEffect === 'function') w.startMatrixEffect();

            const photoNormal = document.getElementById('manager-photo-normal') as HTMLImageElement | null;
            const photoClicked = document.getElementById('manager-photo-clicked') as HTMLImageElement | null;

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
        if (store.gameState.skins.current === 'christmas' && eventKey === 'bluescreen') {
            const snowHowl = AudioManager.getHowl('sound-snowball');
            if (snowHowl) {
                snowHowl.play();
                if (audioGlitchInterval) clearInterval(audioGlitchInterval);
                audioGlitchInterval = setInterval(() => {
                    snowHowl.rate(0.2 + Math.random() * 1.6);
                    const baseVol = store.gameState.user.masterVolume * store.gameState.user.musicVolume;
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
function triggerGameEvent(eventKey: any, overrideMult: any = null) {
    const config = store.gameData.events[eventKey];
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

    store.isBluescreenActive = true;
    store.bluescreenMultiplier = new w.Decimal(bonusMult); // Fondamentale: Decimal
    recalculateCPS();

    const emDisplay = document.getElementById('event-multiplier-display');
    if (emDisplay) {
        if (config.type === 'video') {
            // Video: il moltiplicatore entra nel pannello #event-hud (moveHudIntoEvent)
            // come badge compatto "xN" e resta visibile tutta la durata dell'evento.
            emDisplay.textContent = '×' + bonusMult;
            emDisplay.style.display = '';
        } else {
            // css_mode (bluescreen/matrix/superStar): banner classico col testo evento.
            emDisplay.textContent = config.toast.replace('{mult}', bonusMult);
            emDisplay.style.display = 'block';
        }
    }

    // Toast video event: durata estesa (8s) per compensare l'assenza del banner.
    const toastDuration = config.type === 'video' ? 8000 : undefined;
    w.EspooClicker.showToast(
        config.toast.replace('{mult}', bonusMult),
        config.toastType,
        toastDuration
    );

    if ((EventHandlers as any)[config.type]) (EventHandlers as any)[config.type](config, eventKey);

    setTimeout(() => {
        document.body.classList.remove('rick-rolling');
        if (config.cssClass) document.body.classList.remove(config.cssClass);
        stopBluescreenEffect();
    }, config.duration);

    return true;
}


function triggerBluescreen(multiplier: any) {
    // 1. Priorità Skin Speciali esistenti (Rick / Ricardo)
    if (store.gameState.skins.current === 'rick' && Math.random() < 0.8) {
        return triggerGameEvent('rickRoll');
    }
    if (store.gameState.skins.current === 'ricardo' && Math.random() < 0.8) {
        return triggerGameEvent('ricardo');
    }
    // 2. Priorità Skin Britney Espears
    if (store.gameState.skins.current === 'britneyEspears' && Math.random() < 0.8) {
        return triggerGameEvent('britneyEspears');
    }
    // 3. Priorità Skin Super Espò
    if (store.gameState.skins.current === 'superespo') {
        return triggerGameEvent('superStarMode', multiplier);
    }
    // 3. Scelta Casuale Standard (Solo per altre skin): 50% Blue Screen / 50% Matrix
    const eventType = Math.random() < 0.5 ? 'bluescreen' : 'matrix';
    return triggerGameEvent(eventType, multiplier);
}

function stopBluescreenEffect() {
    store.isBluescreenActive = false;
    store.bluescreenMultiplier = new w.Decimal(1); // Reset a Decimal(1)

    document.body.classList.remove('bluescreen-active');
    document.body.classList.remove('matrix-active');
    document.body.classList.remove('rick-rolling');
    restoreEventHud();

    if (typeof w.stopMatrixEffect === 'function') w.stopMatrixEffect();

    const emDisplay = document.getElementById('event-multiplier-display') as any;
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
        const rickVideo = document.getElementById('rick-roll-video') as HTMLVideoElement | null;
        if (rickVideo) { rickVideo.pause(); rickVideo.classList.add("video_display_none"); }
    } catch (e) { }

    if (audioGlitchInterval) { clearInterval(audioGlitchInterval); audioGlitchInterval = null; }
    if (typeof w.applySkinVisuals === 'function') w.applySkinVisuals(store.gameState.skins.current);
    if (typeof AudioManager !== 'undefined') AudioManager.updateAmbience();

    clearActiveEvent();
}

// CALCOLO CENTRALIZZATO DEL VALORE CLICK
function calculateClickValue() {
    // F6 -> F8: formula in EspoV3.economy, Decimal della pagina.
    return window.EspoV3.economy.computeClickValue(w.Decimal, {
        baseClickValue: store.gameState.baseClickValue,
        clickGlobalMult: w.clickGlobalMult || 1,
        prestigeBonus: store.prestigeBonus,
        bluescreenMultiplier: store.bluescreenMultiplier,
        crunchTimeMultiplier: store.crunchTimeMultiplier,
        bionicHand: !!w.gameFlags.bionicHand,
        divineClick: !!w.gameFlags.divineClick,
        bps: store.bps,
        goldenFrenzyActive: !!(w.goldenFrenzyEnd && Date.now() < w.goldenFrenzyEnd),
        goldenFrenzyMult: w.goldenFrenzyMult || 1,
    });
}
function calculateRawClickValue() {
    // F6 -> F8: formula in EspoV3.economy, Decimal della pagina.
    return window.EspoV3.economy.computeRawClickValue(w.Decimal, {
        baseClickValue: store.gameState.baseClickValue,
        clickGlobalMult: w.clickGlobalMult || 1,
        bionicHand: !!w.gameFlags.bionicHand,
        divineClick: !!w.gameFlags.divineClick,
        bps: store.bps,
    });
}

function resolveBug(event: any) {
    // Blocca solo i click sintetici da script (autoclicker): isTrusted=false.
    // L'attivazione reale da tastiera (Enter/Spazio) ha detail===0 ma isTrusted===true → consentita (a11y).
    if (event.detail === 0 && event.isTrusted === false) return;
    // Niente blur(): il focus da tastiera deve restare sul bottone per i click ripetuti.
    // Il focus del mouse e' gia' gestito dai listener mouseup/mouseleave/touchend.

    const isSuperTheme = document.body.classList.contains('theme-super');
    const isFuryActive = (typeof store.crunchTimeEndTime !== 'undefined' && store.crunchTimeEndTime > Date.now());

    // Audio + FX combo sono BEST-EFFORT: un loro errore non deve MAI impedire il
    // conteggio del click (score/totalClicks più sotto). Isolati con try/catch così
    // un raro throw (stato Howler, GSAP, skin dinamica) non "fa sparire" il click.
    try {
        if (isSuperTheme && isFuryActive) {
            if (w.EspooClicker && w.EspooClicker.playSound) {
                w.EspooClicker.playSound('sound-fireball');
            }
        } else {
            AudioManager.playClickEffect();
        }
    } catch (err) { console.warn('[click] audio best-effort fallito:', err); }

    // FX v3.0: registra combo PRIMA, così il bonus combo si applica a questo click.
    // (haptic, shake progressivo e combo counter sono gestiti qui dentro)
    let comboCount = 0;
    try {
        if (typeof FX !== 'undefined') comboCount = FX.registerClick();
    } catch (err) { console.warn('[click] FX.registerClick best-effort fallito:', err); comboCount = 0; }

    let currentClickValue = calculateClickValue();

    // Bonus combo: clic rapidi consecutivi aumentano il valore del click.
    // Combo 6+ → +1% per combo, fino a +100% (combo 106). Premia il click attivo
    // senza sbilanciare il late-game (i BPS restano dominanti).
    if (comboCount > 5) {
        const comboMult = 1 + Math.min(comboCount - 5, 100) * 0.01;
        currentClickValue = currentClickValue.mul(comboMult);
    }
    // Stash per showClickFeedback (mostra il +N reale incluso il bonus combo)
    w._lastClickValue = currentClickValue;

    store.clickHistory.push({ time: Date.now(), value: currentClickValue });
    store.gameState.score = store.gameState.score.add(currentClickValue);
    store.gameState.totalScore = store.gameState.totalScore.add(currentClickValue);
    store.gameState.lifetimeScore = store.gameState.lifetimeScore.add(currentClickValue);
    store.gameState.totalClicks++;
    // Display reattivo: il numero segue il click subito (rAF-throttle), bypassando il
    // count-up GSAP che — riavviato ogni 100ms dal loop UI — restava indietro (lag).
    w._lastClickAt = Date.now();
    if (typeof w.bumpScoreDisplay === 'function') w.bumpScoreDisplay();

    if (typeof w.showClickFeedback === 'function') w.showClickFeedback(event);

    // --- NUOVA LOGICA ANIMAZIONE CLICK ---
    // Non cancelliamo più i timer precedenti. Ogni tocco vive di vita propria.
    const btn = document.getElementById('clicker-btn');
    if (btn) {
        // Aggiungiamo le classi per lo schiacciamento e il volto
        btn.classList.add('click-shrink', 'clicked');

        // Se l'utente clicca a raffica, cancelliamo il reset precedente per non farlo scattare
        if (w.clickAnimTimer) {
            clearTimeout(w.clickAnimTimer);
        }

        // Timer: se l'utente smette di cliccare, il bottone si rialza.
        // 120ms > durata transizione CSS (80ms + 40ms delay) per evitare il flash vuoto
        w.clickAnimTimer = setTimeout(() => {
            btn.classList.remove('click-shrink', 'clicked');
        }, 120);
    }

    // Throttle: durante lo spam click ridisegniamo il negozio (sort + DOM) al massimo
    // ~ogni 200ms invece che a ogni click. La chiamata "trailing" assicura che lo stato
    // finale (progress bar, sblocchi) sia corretto anche a fine raffica.
    if (typeof w.updateClickStore === 'function') {
        const now = Date.now();
        if (!w._clickStoreLast || now - w._clickStoreLast >= 200) {
            w._clickStoreLast = now;
            w.updateClickStore();
        } else if (!w._clickStoreTrailing) {
            w._clickStoreTrailing = setTimeout(() => {
                w._clickStoreTrailing = null;
                w._clickStoreLast = Date.now();
                w.updateClickStore();
            }, 200);
        }
    }
    // updateUI() non viene più chiamata ad ogni click: il loop UI a 100ms la gestisce già.
    // Questo evita 50-100 update DOM/sec durante lo spam click.
}




function calculatePrestigeGained() {
    // F6 -> F8: formula in EspoV3.prestige col Decimal della pagina (bit-identico).
    // Il Replicatore di Token NON e incluso (lo applicano i call-site).
    return window.EspoV3.prestige.prestigeGained(w.Decimal, {
        totalScore: store.gameState.totalScore,
        threshold: getPrestigeThreshold(),
    });
}

function openPrestigeHub() {
    // Le card riflettono lo stato corrente (promo pronta/non pronta,
    // format mystery/locked/ready): niente più toast-blocco all'ingresso.
    if (typeof w.renderPrestigeHubCards === 'function') w.renderPrestigeHubCards();

    const modal = document.getElementById('prestige-hub-modal');
    if (modal) {
        modal.style.display = 'flex';
        modal.style.opacity = '1';

        const content = modal.querySelector('.modal-content') as HTMLElement | null;
        if (content) {
            if (typeof w.gsap !== 'undefined') {
                w.gsap.fromTo(content,
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
    const modal = document.getElementById('prestige-hub-modal');
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

    const savedFilter = (store.gameState.filterSettings && store.gameState.filterSettings.globalFilter)
        ? store.gameState.filterSettings.globalFilter
        : 'available';

    // Calcolo Punti
    let gained = new w.Decimal(0);
    if (typeof calculatePrestigeGained === 'function') {
        gained = calculatePrestigeGained();
    }

    // Applica realmente il bonus del Replicatore di Token
    // F6 -> F8: stessa formula unica di EspoV3.prestige
    const _dupOn2 = !!(store.gameState.superUpgrades && store.gameState.superUpgrades.tokenDuplicator && store.gameState.superUpgrades.tokenDuplicator.purchased);
    gained = window.EspoV3.prestige.applyTokenDuplicator(gained, _dupOn2);

    let newPrestigePoints = store.gameState.prestigePoints.add(gained);
    let newLifetime = store.gameState.lifetimePrestigePoints.add(gained);

    // Salvataggio Dati Persistenti (Inclusi i dati Quantici e le valute End-Game)
    const persistentKeys = [
        'achievements', 'prestigeUpgrades', 'skins', 'user', 'totalClicks',
        'totalGoldenBugsClicked', 'totalPlayTime', 'lifetimeScore', 'totalOfflineScore',
        'superUpgrades', 'qBits', 'lifetimeQBits', 'totalFormattazioni', 'longestCombo',
        'arcadeHighScores'
    ];

    const preservedData: Record<string, any> = {};
    persistentKeys.forEach(key => {
        if (store.gameState[key] !== undefined) {
            preservedData[key] = JSON.parse(JSON.stringify(store.gameState[key]));
        }
    });

    const newResets = store.gameState.totalResets + 1;

    // Attesa animazione
    await new Promise(r => setTimeout(r, 1500));

    // RESET: Generazione Stato Pulito
    let newState = w.getInitialGameState();

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
    if (typeof newState.lifetimeScore === 'string') newState.lifetimeScore = new w.Decimal(newState.lifetimeScore);
    if (typeof newState.totalOfflineScore === 'string') newState.totalOfflineScore = new w.Decimal(newState.totalOfflineScore);
    if (typeof newState.score === 'string') newState.score = new w.Decimal(newState.score);
    if (newState.qBits !== undefined && typeof newState.qBits === 'string') newState.qBits = new w.Decimal(newState.qBits);
    if (newState.lifetimeQBits !== undefined && typeof newState.lifetimeQBits === 'string') newState.lifetimeQBits = new w.Decimal(newState.lifetimeQBits);

    newState.prestigePoints = newPrestigePoints;
    newState.lifetimePrestigePoints = newLifetime;
    newState.totalResets = newResets;
    newState.lastSaveTimestamp = Date.now();

    // F6 -> F8: bug iniziali e carryover team in EspoV3.prestige (puri, testati);
    // qui restano lettura flag e applicazione allo stato nuovo.
    const prestige = window.EspoV3.prestige;
    const fastStartOn = !!(store.gameState.superUpgrades && store.gameState.superUpgrades.fastStart && store.gameState.superUpgrades.fastStart.purchased);
    newState.score = prestige.prestigeStartingBugs(w.Decimal, {
        paracaduteLevel: (store.gameState.prestigeUpgrades.paracadute && store.gameState.prestigeUpgrades.paracadute.count) || 0,
        fastStart: fastStartOn,
    });

    if (newState.teams) {
        const previous: Record<string, any> = {};
        for (const k in store.gameState.teams) previous[k] = store.gameState.teams[k].count;
        const initial: Record<string, any> = {};
        for (const k in newState.teams) initial[k] = newState.teams[k].count;
        const counts = prestige.prestigeTeamCarryover({
            keepTeams: !!(store.gameState.superUpgrades && store.gameState.superUpgrades.keepTeams && store.gameState.superUpgrades.keepTeams.purchased),
            deadlineLevel: (store.gameState.prestigeUpgrades.deadlineStretta && store.gameState.prestigeUpgrades.deadlineStretta.count) || 0,
            ereditaLevel: (store.gameState.prestigeUpgrades.eredita && store.gameState.prestigeUpgrades.eredita.count) || 0,
            accelerazione: !!(newState.prestigeUpgrades.accelerazione && newState.prestigeUpgrades.accelerazione.purchased),
            fastStart: fastStartOn,
            previous: previous,
            initial: initial,
        });
        for (const k in counts) {
            if (newState.teams[k]) newState.teams[k].count = counts[k];
        }
    }

    // Applicazione Nuovo Stato
    store.gameState = newState;

    // Reset Variabili Runtime
    if (typeof store.bps !== 'undefined') store.bps = new w.Decimal(0);
    store.clickHistory = [];
    store.isBluescreenActive = false;
    store.bluescreenMultiplier = new w.Decimal(1);
    document.body.classList.remove('bluescreen-active');

    // Ferma suoni evento
    if (typeof AudioManager !== 'undefined') AudioManager.stop('sound-bluescreen', 200);

    // Sincronizza visivamente il menu a tendina
    const filterSelect = document.getElementById('global-filter-select') as HTMLSelectElement | null;
    if (filterSelect) {
        filterSelect.value = savedFilter;
    }

    // Aggiornamento Totale Interfaccia
    if (typeof reapplyAllEffects === 'function') reapplyAllEffects();
    calculatePrestigeBonus();
    if (typeof recalculateCPS === 'function') recalculateCPS();

    // Refresh Negozi (Ora vedrà il filtro corretto!)
    if (typeof w.refreshAllStores === 'function') w.refreshAllStores();
    if (typeof w.updateUI === 'function') w.updateUI();

    // Salvataggio Immediato
    if (w.EspooClicker) w.EspooClicker.saveGame();

    // Rimozione Overlay
    if (overlay) {
        overlay.classList.remove('active');
        overlay.style.opacity = '0'; // Sfuma dolcemente in uscita

        setTimeout(() => {
            overlay.classList.add("prestige_transition_overlay_display_none");
            overlay.style.display = 'none'; // Nascondi del tutto
            if (w.EspooClicker && store.gameData.texts)
                w.EspooClicker.showToast(store.gameData.texts.toasts.promoSuccess, 'achievement');
        }, 500); // 500ms è il tempo della transition CSS
    }
}

function executeFormattingSequence() {
    // 1. Chiusura Interfaccia
    document.querySelectorAll<HTMLElement>('.modal-backdrop').forEach(m => m.style.display = 'none');
    document.body.classList.remove('modal-open');

    // 2. Ferma la musica di sottofondo.
    // Il vecchio `document.getElementById(bgmId).pause()` era CODICE MORTO: la musica
    // è passata a Howler (AudioManager) e in pagina non esiste più nessun <audio>, quindi
    // getElementById tornava sempre null e la traccia di fondo continuava a suonare per
    // tutti i 22s, sopra Made in Heaven e sopra il video Big Bang.
    // Il flag va impostato PRIMA di updateAmbience(): _applyAmbience legge
    // currentActiveEvent e con 'Formatting' azzera la traccia target — così nessuna
    // chiamata successiva (mixer, updateUI, achievement) la fa ripartire a metà sequenza.
    w.currentActiveEvent = 'Formatting';
    if (typeof AudioManager !== 'undefined') AudioManager.updateAmbience();

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
                <h1 style="color:#9b59b6; font-family:'Courier New', monospace; letter-spacing:4px; text-shadow:0 0 15px rgba(155,89,182,0.8); margin:0;">${store.gameData.texts.reformat.prep}</h1>
                <p style="color:#bdc3c7; font-family:'Courier New', monospace; font-size:1.2rem; margin-top:15px;" class="fa-fade">${store.gameData.texts.reformat.loadingData}</p>
            </div>
            
            <div id="format-video-phase" style="display:none; position:absolute; top:0; left:0; width:100%; height:100%; background:transparent;">
                <div style="position:absolute; bottom:60px; left:50%; transform:translateX(-50%); width:70%; z-index:100001;">
                    <div style="color:#fff; font-family:'Courier New', monospace; font-size:1.2rem; font-weight:bold; margin-bottom:10px; text-align:center; text-shadow:2px 2px 4px #000;">
                        ${store.gameData.texts.reformat.restoring}
                    </div>
                    <div style="width:100%; height:20px; background:rgba(0,0,0,0.7); border:2px solid #9b59b6; border-radius:10px; overflow:hidden;">
                        <div id="format-progress-bar" style="width:0%; height:100%; background:linear-gradient(90deg, #8e44ad, #d2b4de); box-shadow:0 0 10px #9b59b6; transition: width 22s linear;"></div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(prepOverlay);
    } else {
        document.getElementById('format-text-phase')!.style.display = 'flex';
        document.getElementById('format-video-phase')!.style.display = 'none';
        document.getElementById('format-progress-bar')!.style.width = '0%';
        prepOverlay.style.display = 'block';
    }

    // Assicurati che all'inizio lo sfondo sia nero puro
    prepOverlay.style.background = '#000';

    // 4. Avvia Audio di Pucci
    if (typeof AudioManager !== 'undefined') {
        AudioManager.play('sound-pucci', 'eventi');
    }

    // Calcolo QBits da salvare
    // F6 -> F8: formula in EspoV3.prestige (1 garantito + sqrt(token/10k) floored).
    const qBitsEarned = window.EspoV3.prestige.formatQbitsEarned(w.Decimal, store.gameState.prestigePoints);

    // Salvataggio Dati Super-Persistenti
    const superPersistentData: any = {
        achievements: JSON.parse(JSON.stringify(store.gameState.achievements)),
        skins: JSON.parse(JSON.stringify(store.gameState.skins)),
        user: JSON.parse(JSON.stringify(store.gameState.user)),
        lifetimeScore: store.gameState.lifetimeScore,
        totalClicks: store.gameState.totalClicks,
        totalPlayTime: store.gameState.totalPlayTime,
        totalGoldenBugsClicked: store.gameState.totalGoldenBugsClicked,
        longestCombo: store.gameState.longestCombo || 0,
        arcadeHighScores: store.gameState.arcadeHighScores ? JSON.parse(JSON.stringify(store.gameState.arcadeHighScores)) : {},
        totalFormattazioni: (store.gameState.totalFormattazioni || 0) + 1,
        qBits: (store.gameState.qBits || new w.Decimal(0)).add(qBitsEarned),
        lifetimeQBits: (store.gameState.lifetimeQBits || new w.Decimal(0)).add(qBitsEarned),
        superUpgrades: store.gameState.superUpgrades ? JSON.parse(JSON.stringify(store.gameState.superUpgrades)) : {}
    };
    if (store.gameState.superUpgrades && store.gameState.superUpgrades.echoQuantico && store.gameState.superUpgrades.echoQuantico.purchased) {
        const counted = Object.entries(store.gameState.prestigeUpgrades as Record<string, any>)
            .filter(([, s]: [string, any]) => s.count > 0);
        if (counted.length > 0) {
            const [key, state] = counted[Math.floor(Math.random() * counted.length)]!;
            superPersistentData.echoQuanticoPreserved = { key, state: JSON.parse(JSON.stringify(state)) };
        }
    }

    // 5. TIMING FASE 2 (Dopo esattamente 2 secondi dall'urlo)
    // Fase 2 (reveal video + hard reset + finale) incapsulata: parte SOLO a
    // video pronto (gate anti-freeze in fondo), non più a 2s "alla cieca".
    const _revealPhase2 = () => {

        // --- IL FIX È QUI ---
        // Rendiamo lo sfondo dell'overlay trasparente. 
        // In questo modo il video, che si trova al di sotto, sarà visibile, e la barra gli galleggerà sopra!
        prepOverlay.style.background = 'transparent';

        document.getElementById('format-text-phase')!.style.display = 'none';
        const vidPhase = document.getElementById('format-video-phase');
        vidPhase!.style.display = 'block';

        const video = document.getElementById('video-bigbang') as HTMLVideoElement | null;
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

            video.volume = store.gameState.user.masterVolume * store.gameState.user.musicVolume;
            video.currentTime = 0;

            let playPromise = video.play();
            if (playPromise !== undefined) {
                playPromise.catch((e: any) => {
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
        let newState = w.getInitialGameState();
        Object.assign(newState, superPersistentData);
        if (superPersistentData.echoQuanticoPreserved) {
            const { key, state } = superPersistentData.echoQuanticoPreserved;
            if (newState.prestigeUpgrades && newState.prestigeUpgrades[key] !== undefined) {
                newState.prestigeUpgrades[key] = state;
            }
        }

        newState.lifetimeScore = new w.Decimal(newState.lifetimeScore);
        newState.qBits = new w.Decimal(newState.qBits);
        newState.lifetimeQBits = new w.Decimal(newState.lifetimeQBits);
        newState.lastSaveTimestamp = Date.now();

        let startBonusBugs = new w.Decimal(0);
        if (newState.superUpgrades && newState.superUpgrades.fastStart && newState.superUpgrades.fastStart.purchased) {
            startBonusBugs = startBonusBugs.add(10000);
            if (newState.teams && newState.teams.assistenteQa) newState.teams.assistenteQa.count += 5;
        }
        newState.score = startBonusBugs;

        store.gameState = newState;
        store.bps = new w.Decimal(0);
        store.clickHistory = [];
        w.gameFlags = {};

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

            w.currentActiveEvent = null;
            if (typeof w.refreshAllStores === 'function') w.refreshAllStores();
            if (typeof w.updateUI === 'function') w.updateUI();
            if (typeof AudioManager !== 'undefined') AudioManager.updateAmbience();

            const tabQuantum = document.getElementById('tab-quantum');
            if (tabQuantum) tabQuantum.click();

            if (w.EspooClicker) {
                w.EspooClicker.saveGame();
                w.EspooClicker.showToast(`FORMATTAZIONE CONCLUSA! +${w.formatNumber(qBitsEarned)} Q-BITS`, 'achievement');
            }
        }, 22000);

    };

    // Gate anti-freeze: l'mp4 Big Bang (~11 MB) NON è faststart, quindi al click
    // può non essere ancora bufferizzato. Aspetta 'canplaythrough' — tenendo su
    // la schermata "loading data" — prima di avviare la fase 2, con un tetto di
    // sicurezza così un 404/rete lenta non blocca mai la sequenza.
    setTimeout(() => {
        const _v = document.getElementById('video-bigbang') as HTMLVideoElement | null;
        if (_v && _v.readyState < 4) {
            let started = false;
            let cap: any;
            const go = () => {
                if (started) return;
                started = true;
                clearTimeout(cap);
                _v.removeEventListener('canplaythrough', go);
                _revealPhase2();
            };
            _v.addEventListener('canplaythrough', go, { once: true });
            cap = setTimeout(go, 15000);
            try { if (_v.readyState < 1 && typeof _v.load === 'function') _v.load(); } catch { /* no-op */ }
        } else {
            _revealPhase2();
        }
    }, 2000);
}

function checkAchievements() {
    let totalAchBPSBonus = new w.Decimal(0); // Inizializza come Decimal
    const isPostPrestige = store.gameState.totalResets > 0;

    for (const key in store.gameData.achievements) {
        const data = store.gameData.achievements[key];
        // Inizializzazione sicura se manca nel save
        if (!store.gameState.achievements[key]) {
            store.gameState.achievements[key] = { unlocked: false, claimed: false };
        }
        if (store.gameState.achievements[key].claimed === undefined) {
            store.gameState.achievements[key].claimed = false;
        }

        const state = store.gameState.achievements[key];

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
            let val = new w.Decimal(data.reward.value).minus(1);
            totalAchBPSBonus = totalAchBPSBonus.add(val);
        }
    }

    store.achievementsBPSBonus = totalAchBPSBonus;
    calculatePrestigeBonus();
}

function unlockAchievement(key: any) {
    const data = store.gameData.achievements[key];
    store.gameState.achievements[key].unlocked = true;
    store.gameState.achievements[key].unlockTime = Date.now();
    if (!data.reward) {
        store.gameState.achievements[key].claimed = true;
    } else {
        store.gameState.achievements[key].claimed = false;
    }
    playSound('sound-achievement');
    let msg = store.gameData.texts.toasts.achievementUnlock.replace('{name}', data.name);
    if (data.reward) msg += store.gameData.texts.toasts.rewardAvailable;
    w.EspooClicker.showToast(msg);
    w.EspooClicker.saveGame();
    if (typeof w.updateAchievementsUI === 'function') w.updateAchievementsUI();
}

function claimAchievementReward(key: any) {
    const state = store.gameState.achievements[key];
    const data = store.gameData.achievements[key];

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
    w.EspooClicker.saveGame();

    // Aggiorna UI
    if (typeof w.updateAchievementsUI === 'function') w.updateAchievementsUI();
    if (typeof w.updateSkinsUI === 'function') w.updateSkinsUI();
}

let goldenBugTimer: any;
function scheduleGoldenBug() {
    if (goldenBugTimer) clearTimeout(goldenBugTimer);
    const nextSpawnTime = w.goldenBugSpawnTime + Math.random() * w.goldenBugSpawnTime;
    goldenBugTimer = setTimeout(spawnGoldenBug, nextSpawnTime);
}

function spawnGoldenBug() {
    // Reset stato pulito (anim residue, classi)
    w.goldenBug.classList.remove('visible', 'despawning', 'clicked');

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

    const finalLeft = rect.left + w.scrollX + padding + randomX;
    const finalTop = rect.top + w.scrollY + padding + randomY;

    w.goldenBug.style.left = `${finalLeft}px`;
    w.goldenBug.style.top = `${finalTop}px`;

    // Varietà: scegli il tipo di bug (effetto "cosa mi esce?")
    //   standard 70% · lucky 18% (ricompensa ×8) · frenzy 12% (buff click ×7 15s)
    const typeRoll = Math.random();
    let bugType = 'standard';
    if (typeRoll < 0.12) bugType = 'frenzy';
    else if (typeRoll < 0.30) bugType = 'lucky';
    w._goldenBugType = bugType;
    w.goldenBug.classList.remove('gb-lucky', 'gb-frenzy');
    if (bugType !== 'standard') w.goldenBug.classList.add('gb-' + bugType);

    // Force reflow per riavviare animazioni dopo remove .visible
    void w.goldenBug.offsetWidth;
    w.goldenBug.classList.add('visible');

    // Cleanup precedenti timer
    if (w._goldenBugDespawnTimer) clearTimeout(w._goldenBugDespawnTimer);
    if (w._goldenBugWarnTimer) clearTimeout(w._goldenBugWarnTimer);

    // Warning ultimi 2s — flicker urgente
    w._goldenBugWarnTimer = setTimeout(() => {
        if (w.goldenBug.classList.contains('visible')) {
            w.goldenBug.classList.add('despawning');
        }
    }, 8000);

    // Despawn dopo 10s
    w._goldenBugDespawnTimer = setTimeout(() => {
        w.goldenBug.classList.remove('visible', 'despawning');
    }, 10000);

    scheduleGoldenBug();
    return true;
}

function clickGoldenBug() {
    const goldenBug = document.getElementById('golden-bug') as any;
    if (goldenBug && goldenBug.classList.contains('clicked')) return; // anti-doppio-click

    playSound('sound-golden');
    store.gameState.totalGoldenBugsClicked++;

    const currentClickValue = calculateClickValue();
    const bugType = w._goldenBugType || 'standard';

    // F6 -> F8: reward e buff in EspoV3.events col Decimal della pagina (bit-identico).
    // Qui restano toast/FX/timer.
    const res = window.EspoV3.events.goldenBugReward(w.Decimal, {
        bps: store.bps, clickValue: currentClickValue,
        globalMult: w.goldenBugMult, bugType: bugType,
    });
    const bonus = res.bonus;
    let toastMsg;
    if (bugType === 'lucky') {
        toastMsg = store.gameData.texts.toasts.luckyBug.replace('{amount}', w.formatNumber(bonus));
    } else if (res.frenzy) {
        w.goldenFrenzyMult = new w.Decimal(res.frenzy.mult);
        w.goldenFrenzyEnd = Date.now() + res.frenzy.durationMs;
        if (typeof FX !== 'undefined' && FX.flash) FX.flash('rgba(231,76,60,0.15)', 0.25);
        toastMsg = store.gameData.texts.toasts.frenzy;
    } else {
        toastMsg = store.gameData.texts.toasts.bugCrit.replace('{amount}', w.formatNumber(bonus));
    }

    store.gameState.score = store.gameState.score.add(bonus);
    store.gameState.totalScore = store.gameState.totalScore.add(bonus);
    store.gameState.lifetimeScore = store.gameState.lifetimeScore.add(bonus);

    w.EspooClicker.showToast(toastMsg, 'reward');

    // Cancella timer despawn (clicked, niente warning ulteriore)
    if (w._goldenBugDespawnTimer) clearTimeout(w._goldenBugDespawnTimer);
    if (w._goldenBugWarnTimer) clearTimeout(w._goldenBugWarnTimer);

    if (goldenBug) {
        goldenBug.classList.remove('despawning');
        goldenBug.classList.add('clicked');
        // Rimuovi dopo animazione explosion (320ms)
        setTimeout(() => {
            goldenBug.classList.remove('visible', 'clicked');
        }, 340);
    }
    w.updateUI();
}

// ============================================================
// BONUS GIORNALIERO (login streak)
// ------------------------------------------------------------
// Stato in localStorage (NON in gameState) → immune al merge cloud.
// Idempotente per giorno (date-gate). Riscosso dopo che il boot
// + sync cloud si sono assestati, così non viene sovrascritto.
// ============================================================
const DAILY_BONUS_KEY = 'espo_daily_bonus';

function _dailyDateStr(offsetDays: any) {
    const d = new Date();
    if (offsetDays) d.setDate(d.getDate() + offsetDays);
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
}

function claimDailyBonus() {
    if (typeof store.gameState === 'undefined' || !store.gameState.score) return;

    let data: any = {};
    try { data = JSON.parse(localStorage.getItem(DAILY_BONUS_KEY) as string) || {}; } catch (e) { data = {}; }

    const today = _dailyDateStr(0);
    if (data.lastDate === today) return; // già riscosso oggi

    // F6 -> F8: streak e ricompensa in EspoV3.events.
    const streak = window.EspoV3.events.dailyStreak(data.lastDate, today, _dailyDateStr(-1), data.streak);
    const reward = window.EspoV3.events.dailyReward(w.Decimal, { bps: store.bps, baseClickValue: store.gameState.baseClickValue, streak: streak });

    store.gameState.score = store.gameState.score.add(reward);
    store.gameState.totalScore = store.gameState.totalScore.add(reward);
    store.gameState.lifetimeScore = store.gameState.lifetimeScore.add(reward);

    try {
        localStorage.setItem(DAILY_BONUS_KEY, JSON.stringify({ lastDate: today, streak: streak }));
    } catch (e) {}

    if (w.EspooClicker && w.EspooClicker.saveGame) w.EspooClicker.saveGame();
    if (typeof w.updateUI === 'function') w.updateUI();

    // Dal giorno 7 la ricompensa non cresce più (cap in dailyReward) → messaggio
    // dedicato, niente falso "domani vale di più". Fallback su dailyBonus se il
    // testo manca (overlay lingua parziale).
    const tpl = (streak >= 7 && store.gameData.texts.toasts.dailyBonusMax) || store.gameData.texts.toasts.dailyBonus;
    const msg = tpl.replace('{streak}', streak).replace('{amount}', w.formatNumber(reward));
    if (w.EspooClicker && w.EspooClicker.showToast) {
        w.EspooClicker.showToast(msg, 'reward');
    }
    if (typeof FX !== 'undefined' && FX.flash) FX.flash('rgba(46, 204, 113, 0.12)', 0.3);
}

// Trigger: dopo EspoGameReady, attende l'assestamento del sync cloud poi riscuote.
// (game-logic.js è bundlato prima di script.js → il listener è pronto al dispatch)
document.addEventListener('EspoGameReady', () => {
    setTimeout(claimDailyBonus, 3500);
}, { once: true });


// === shim outbound kill-legacy (TEMPORANEI, rimossi a fine migrazione) ===
Object.assign(window as any, {
  // audio/FX (ex-PREP)
  AudioManager, FX, EventHandlers,
  // funzioni consumate da script.js / render / modals / smoke / integration
  playSound, updateAmbientVolume, setMusicDuck, getCustomVolume, setBgMusicVolume,
  executePrestige, openPrestigeHub, executeFormattingSequence, scheduleGoldenBug,
  checkAchievements, calculatePrestigeBonus, resumeCrunchTimeEffects, clickGoldenBug,
  recalculateCPS, reapplyAllEffects, activateCrunchTime, resolveBug,
  calculateClickValue, calculateRawClickValue, spawnFireParticle, triggerBluescreen,
  claimAchievementReward, buySuperUpgrade, buySkin, calculateBulkCost,
  calculateMaxAffordable, buyTeam, calculatePrestigeUpgradeCost, buyPrestigeUpgrade,
  buyTeamEnhancement, buyClickUpgrade, getPrestigeThreshold, applyBonusSoftcap,
  calculatePrestigeGained,
  // dev-only (cheatboard, testate da cheatboard.spec)
  clearActiveEvent, stopBluescreenEffect, triggerGameEvent, spawnGoldenBug,
});
export {};
