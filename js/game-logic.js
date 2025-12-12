// --- GESTIONE CONFLITTI EVENTI (SEMAFORO) ---
let fireParticleInterval = null;
let lastRicardoVideoId = null;

window.currentActiveEvent = null; // Il "Semaforo"
let audioGlitchInterval = null;


const RewardHandlers = {
    // Aggiunge Bug al wallet
    bugs: (value) => {
        gameState.score += value;
        gameState.totalScore += value;
        gameState.lifetimeScore += value;
        return `+${formatNumber(value)} Bug!`;
    },
    // Aggiunge Token Prestigio
    prestige: (value) => {
        gameState.prestigePoints += value;
        return `+${value} Token Lab!`;
    },
    // Sblocca una Skin
    skin: (skinId) => {
        if (!gameState.skins.unlocked.includes(skinId)) {
            gameState.skins.unlocked.push(skinId);
            const skinName = gameData.skins[skinId] ? gameData.skins[skinId].name : skinId;
            return `Nuova Skin: ${skinName}!`;
        }
        return null; // Già posseduta, niente toast
    },
    // Moltiplicatore (Logica gestita passivamente, qui solo feedback)
    multiplier: (value) => {
        return `Bonus BPS x${value} Attivo!`;
    },
    // NUOVO ESEMPIO: Genera subito un Golden Bug
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
        window.EspooClicker.showToast(`Riscattato: ${message}`, 'reward');
    }
}

// Funzione per inviare il punteggio al leaderboard
async function submitScoreToLeaderboard(username) {
    // Recupera la password in modo sicuro dall'oggetto globale
    const password = window.EspooClicker ? window.EspooClicker.getPassword() : null;

    // Se non siamo loggati, non fare nulla
    if (!username || !password) return;

    try {
        const response = await fetch('./php/submit_score.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: username,
                password: password
            })
        });
        // Non serve fare nulla con la risposta, è un aggiornamento silenzioso
    } catch (e) {
        console.warn("Impossibile aggiornare la classifica:", e);
    }
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
    window.currentActiveEvent = null;
}

// --------- SISTEMA DI UPGRADE GENERICO (NEW) ---------

// Applica un singolo effetto
function applyEffect(effect, level = 1) {
    if (!effect) return;

    if (effect.type === 'mult_state') {
        if (gameState.hasOwnProperty(effect.stat)) gameState[effect.stat] *= effect.val;
    }
    else if (effect.type === 'mult_global') {
        if (window.hasOwnProperty(effect.stat)) window[effect.stat] *= effect.val;
    }
    else if (effect.type === 'add_mult_per_level') {
        if (window.hasOwnProperty(effect.stat)) window[effect.stat] += (effect.val * level);
    }
    else if (effect.type === 'add_global_stat_per_level') {
        // NUOVO: Aggiunge valore a una variabile globale per ogni livello
        if (window.hasOwnProperty(effect.stat)) window[effect.stat] += (effect.val * level);
    }
    else if (effect.type === 'set_flag') {
        window.gameFlags[effect.flag] = effect.val;
    }
}

// Ricalcola tutti gli effetti passivi
function reapplyAllEffects() {
    // 1. Reset Totale
    goldenBugChance = 0.001;
    goldenBugMult = 1;
    goldenBugSpawnTime = 60000;

    // Reset Nuove Statistiche
    costScalingReduction = 0;
    prestigeSynergyFactor = 0;

    window.gameFlags = {};

    // 2. Click Upgrades
    for (const key in gameState.clickUpgrades) {
        if (gameState.clickUpgrades[key].purchased) {
            const data = gameData.clickUpgrades[key];
            if (data.effects) data.effects.forEach(eff => { if (eff.trigger === 'passive') applyEffect(eff); });
        }
    }

    // 3. Prestige Upgrades
    for (const key in gameState.prestigeUpgrades) {
        const state = gameState.prestigeUpgrades[key];
        const data = gameData.prestigeUpgrades[key];
        if ((data.isCounted && state.count > 0) || (!data.isCounted && state.purchased)) {
            if (data.effects) data.effects.forEach(eff => { if (eff.trigger === 'passive') applyEffect(eff, state.count || 1); });
        }
    }
}

// --------- 3. AUDIO MANAGER CENTRALIZZATO ---------
const AudioManager = {
    // Genera i tag audio all'avvio (Sostituisce generateAudioTags di script.js)
    init() {
        const container = document.body;
        // Suoni
        for (const key in gameData.assets.sounds) {
            const sound = gameData.assets.sounds[key];
            if (!document.getElementById(sound.id)) {
                const audio = document.createElement('audio');
                audio.id = sound.id;
                audio.src = `./assets/sounds/${sound.file}`;
                audio.preload = sound.category === 'effetti' ? 'auto' : 'none';
                if (sound.loop) audio.loop = true;
                container.appendChild(audio);
            }
        }
        // Applica volumi iniziali
        this.updateAmbience();
    },

    getCustomVolume(id) {
        if (gameState && gameState.user && gameState.user.audioCustom) {
            const val = gameState.user.audioCustom[id];
            return (val !== undefined) ? val : 1.0;
        }
        return 1.0;
    },

    play(id, type = 'sfx') {
        const el = document.getElementById(id);
        if (!el) return;

        const master = gameState.user.masterVolume;
        if (master <= 0) return;

        const channel = (type === 'music') ? gameState.user.musicVolume : gameState.user.sfxVolume;
        const custom = this.getCustomVolume(id);
        const finalVol = Math.max(0, Math.min(1, master * channel * custom));

        if (finalVol < 0.01) return;

        try {
            if (type === 'sfx') {
                // Clona per sovrapporre suoni rapidi (es. click)
                const clone = el.cloneNode();
                clone.volume = finalVol;
                clone.play().then(() => {
                    clone.addEventListener('ended', () => clone.remove());
                }).catch(e => { });
            } else {
                // Musica/Loop: usa elemento originale
                el.volume = finalVol;
                if (el.paused) el.play().catch(e => { });
            }
        } catch (e) { console.warn("Audio error:", e); }
    },

    // Logica complessa del click (Glitch, Rick, Natale) centralizzata
    playClickEffect() {
        const sound = document.getElementById('sound-click');
        if (!sound) return;

        let rate = 1.0;
        let volumeMult = 1.0;

        if (isBluescreenActive) {
            // Effetti Glitch
            if (document.body.classList.contains('rick-rolling')) {
                volumeMult = 0.2;
            } else {
                rate = 0.2 + Math.random() * 1.6; // Tono a caso
                volumeMult = 0.5 + Math.random(); // Volume instabile
            }
        }

        // Applica master volume
        const master = gameState.user.masterVolume * gameState.user.sfxVolume;
        sound.volume = Math.max(0, Math.min(1, master * volumeMult));
        sound.playbackRate = rate;

        // Play
        sound.currentTime = 0;
        sound.play().catch(e => { });
    },

    // Gestisce Musica Background vs Neve vs Fury vs Eventi
    updateAmbience() {
        const bgMusic = document.getElementById('sound-bg-music');
        const snowAudio = document.getElementById('sound-snowball');
        const furyMusic = document.getElementById('sound-fury-music');
        const blueAudio = document.getElementById('sound-bluescreen');

        // Helper per applicare volume
        const setVol = (el, customId) => {
            if (!el) return;
            const vol = gameState.user.masterVolume * gameState.user.musicVolume * this.getCustomVolume(customId);
            el.volume = Math.max(0, Math.min(1, vol));
        };

        // 1. Aggiorna volumi base
        setVol(bgMusic, 'sound-bg-music');
        setVol(snowAudio, 'sound-snowball');
        setVol(furyMusic, 'sound-fury-music');
        setVol(blueAudio, 'sound-bluescreen');

        // 2. Logica Priorità Musica (Chi suona?)
        // Se c'è un evento attivo (Mixer o altro), non interferire troppo
        if (window.currentActiveEvent === 'Audio Mixer') return;

        // Fury Mode vince su tutto
        if (gameState.crunchTimeEndTime > Date.now()) {
            if (bgMusic) bgMusic.pause();
            if (snowAudio) snowAudio.pause();
            // Fury music gestita da activateCrunchTime
            return;
        }

        // Eventi CSS (404)
        if (isBluescreenActive) {
            if (bgMusic) bgMusic.pause();
            // 404 sound gestito da triggerGameEvent
            return;
        }

        // Stato Normale: Natale vs Standard
        if (gameState.skins.current === 'christmas') {
            if (bgMusic) bgMusic.pause();
            if (snowAudio && snowAudio.paused && gameState.user.masterVolume > 0) {
                snowAudio.play().catch(e => { });
            }
        } else {
            if (snowAudio) snowAudio.pause();
            if (bgMusic && bgMusic.paused && gameState.user.masterVolume > 0) {
                bgMusic.play().catch(e => { });
            }
        }
    }
};

// --- WRAPPERS PER COMPATIBILITÀ (Non rompere il codice esistente) ---
function playSound(id, type) { AudioManager.play(id, type); }
function setBgMusicVolume() { AudioManager.updateAmbience(); }
function updateAmbientVolume() { AudioManager.updateAmbience(); }
function getCustomVolume(id) { return AudioManager.getCustomVolume(id); }

// --------- 4. FUNZIONI DI ACQUISTO ---------

function finalizePurchase() {
    playSound('sound-buy');
    refreshAllStores(); // Ridisegna i negozi per aggiornare i tasti (grigi/verdi)
    window.EspooClicker.saveGame();
    updateUI();
}

function buySkin(skinId) {
    const data = gameData.skins[skinId];

    // Guard Clauses: Esce subito se c'è un problema
    if (!data || !data.cost) return;
    if (gameState.skins.unlocked.includes(skinId)) return;

    if (gameState.prestigePoints >= data.cost) {
        // Acquisto
        gameState.prestigePoints -= data.cost;
        gameState.skins.unlocked.push(skinId);

        // Effetti Immediati
        playSound('sound-buy');
        window.EspooClicker.showToast(`Skin Acquistata: ${data.name}!`, 'success');
        equipSkin(skinId); // Equipaggia subito

        // Salvataggio e UI
        window.EspooClicker.saveGame();

        // Aggiorniamo solo ciò che serve
        if (typeof updatePrestigeUI === 'function') updatePrestigeUI(); // Per i token spesi
        if (typeof updateSkinsUI === 'function') updateSkinsUI();       // Per la lista skin

    } else {
        playSound('sound-error');
        window.EspooClicker.showToast("Token insufficienti!", 'error');
    }
}

function buyClickUpgrade(upgradeKey) {
    const state = gameState.clickUpgrades[upgradeKey];
    const data = gameData.clickUpgrades[upgradeKey];

    // Controlla se puoi permettertelo E se non l'hai già comprato
    if (gameState.score >= data.cost && !state.purchased) {

        // 1. Logica specifica di questo acquisto
        gameState.score -= data.cost;
        gameState.baseClickValue += data.clickIncrease;
        state.purchased = true;

        if (data.effects) {
            data.effects.forEach(eff => applyEffect(eff));
        }

        if (upgradeKey === 'clickAutomatico') recalculateCPS();

        // 2. Chiamata standard finale (sostituisce tutto il resto)
        finalizePurchase();
    }
}

function buyTeamEnhancement(enhanceKey) {
    const state = gameState.buildingEnhancements[enhanceKey];
    const data = gameData.buildingEnhancements[enhanceKey];

    if (gameState.score >= data.cost && !state.purchased) {
        // 1. Logica di Gioco (Pagamento e Stato)
        gameState.score -= data.cost;
        state.purchased = true;

        // 2. Ricalcoli necessari
        recalculateCPS();

        // 3. Chiusura standard (Suono, Save, UI)
        finalizePurchase();
    }
}

function buyPrestigeUpgrade(upgradeKey) {
    const state = gameState.prestigeUpgrades[upgradeKey];
    const data = gameData.prestigeUpgrades[upgradeKey];
    const cost = data.baseCost;

    // Controlli preliminari
    if (data.isCounted) {
        if (gameState.prestigePoints < cost) return; // Non hai abbastanza token
    } else {
        if (gameState.prestigePoints < cost || state.purchased) return; // O povero o già comprato
    }

    // --- AZIONE DI ACQUISTO ---

    // 1. Pagamento (Comune a entrambi)
    gameState.prestigePoints -= cost;

    // 2. Aggiornamento Stato specifico
    if (data.isCounted) {
        state.count++;
        // [GENERICO] Effetti Counted (incremento livello)
        if (data.effects) data.effects.forEach(eff => applyEffect(eff, 1));
    } else {
        state.purchased = true;
        // [GENERICO] Effetti One-Shot
        if (data.effects) data.effects.forEach(eff => applyEffect(eff));
    }

    // 3. Ricalcoli Logici
    calculatePrestigeBonus();
    recalculateCPS();

    // 4. Chiusura standard (Suono, Save, UI)
    finalizePurchase();
}


// --------- 4. FUNZIONI DI GIOCO PRINCIPALI ---------
function calculateBulkCost(teamKey, amount) {
    const data = gameData.teams[teamKey];
    const state = gameState.teams[teamKey];

    // Logica Generica: usa la variabile globale 'costScalingReduction' calcolata dagli effetti
    let r = Math.max(1.05, costScalingBase - costScalingReduction);

    let discountedBaseCost = data.baseCost; // Qui potresti applicare altri sconti globali
    const currentSingleCost = Math.floor(discountedBaseCost * Math.pow(r, state.count));

    if (amount === 1) {
        return Math.max(1, currentSingleCost);
    } else {
        const totalCost = currentSingleCost * (Math.pow(r, amount) - 1) / (r - 1);
        return Math.max(amount, Math.floor(totalCost));
    }
}

function calculateTeamCost(teamKey) {
    return calculateBulkCost(teamKey, 1);
}

function calculatePrestigeBonus() {
    let baseBonus = gameState.lifetimePrestigePoints * 0.01;

    let synergyBonus = prestigeSynergyFactor * gameState.lifetimePrestigePoints;

    const MAX_BONUS = 10000;
    let calculatedBonus = 1 + baseBonus + synergyBonus + achievementsBPSBonus;
    prestigeBonus = Math.min(calculatedBonus, MAX_BONUS);
}

function recalculateCPS() {
    let baseCPS = 0;

    for (const key in gameState.teams) {
        if (!gameState.teams[key] || !gameData.teams[key]) continue;
        const state = gameState.teams[key];
        const data = gameData.teams[key];

        let teamBPS = state.count * data.cpsPerUnit;

        // Applicazione Enhancements (già generica, ok)
        for (const enhanceKey in gameData.buildingEnhancements) {
            if (gameState.buildingEnhancements && gameState.buildingEnhancements[enhanceKey]) {
                const enhancementState = gameState.buildingEnhancements[enhanceKey];
                const enhancementData = gameData.buildingEnhancements[enhanceKey];
                if (enhancementState.purchased && enhancementData.targetTeam === key) {
                    teamBPS *= enhancementData.multiplier;
                }
            }
        }

        // NUOVA LOGICA GENERICA: Click Automatico
        // Se il flag è attivo E il team ha il tag 'helper', aggiungi il suo numero al BPS
        if (window.gameFlags.autoClickQA && data.tags && data.tags.includes('helper')) {
            baseCPS += state.count;
        }

        baseCPS += teamBPS;
    }

    cookiesPerSecond = baseCPS * prestigeBonus * clickCPSBonus * bluescreenMultiplier * crunchTimeMultiplier;
}

// 1. CRUNCH TIME
function activateCrunchTime() {
    const now = Date.now();
    if (checkEventConflict('Espo Fury')) return false;
    if (now < crunchTimeCooldownEnd) {
        const remaining = Math.ceil((crunchTimeCooldownEnd - now) / 1000);
        window.EspooClicker.showToast(`Espo si sta calmando: ${remaining}s`, 'warning');
        clearActiveEvent();
        return false;
    }
    crunchTimeMultiplier = 7;
    crunchTimeEndTime = now + 30000;
    crunchTimeCooldownEnd = crunchTimeEndTime + 300000;
    gameState.crunchTimeEndTime = crunchTimeEndTime;
    gameState.crunchTimeCooldownEnd = crunchTimeCooldownEnd;
    recalculateCPS();
    if (typeof updateUI === 'function') updateUI();
    if (window.EspooClicker) window.EspooClicker.saveGame();
    document.body.classList.add('crunch-active');
    const photoNormal = document.getElementById('manager-photo-normal');
    const photoClicked = document.getElementById('manager-photo-clicked');
    if (photoNormal) photoNormal.src = './assets/image/espo-fury.webp';
    if (photoClicked) photoClicked.src = './assets/image/espo-fury-click.webp';
    const overlay = document.getElementById('crunch-overlay');
    if (overlay) overlay.style.display = 'block';
    const fireContainer = document.getElementById('fire-particles-container');
    if (fireContainer) {
        fireContainer.style.display = 'block';
        if (fireParticleInterval) clearInterval(fireParticleInterval);
        fireParticleInterval = setInterval(() => { spawnFireParticle(fireContainer); }, 120);
    }
    const bgMusic = document.getElementById('sound-bg-music');
    if (bgMusic) { bgMusic.pause(); bgMusic.currentTime = 0; }
    const snowAudio = document.getElementById('sound-snowball');
    if (snowAudio) { snowAudio.pause(); snowAudio.currentTime = 0; }
    const furyMusic = document.getElementById('sound-fury-music');
    if (furyMusic) {
        const furyVol = getCustomVolume('sound-fury-music');
        furyMusic.volume = gameState.user.masterVolume * gameState.user.musicVolume * furyVol;
        furyMusic.currentTime = 0;
        furyMusic.play().catch(e => { });
    }
    window.EspooClicker.showToast('🔥 ESPO FURY ATTIVA! BPS x7! 🔥', 'success');
    return true;
}

function spawnFireParticle(container) {
    const p = document.createElement('div');
    p.classList.add('fire-particle');
    const left = Math.random() * 100;
    p.style.left = `${left}%`;
    const size = 60 + Math.random() * 100;
    p.style.width = `${size}px`;
    p.style.height = `${size}px`;
    const duration = 1.5 + Math.random() * 2.5;
    p.style.animationDuration = `${duration}s`;
    const drift = (Math.random() - 0.5) * 150;
    p.style.setProperty('--drift', `${drift}px`);
    p.style.opacity = 0.5 + Math.random() * 0.5;
    container.appendChild(p);
    setTimeout(() => p.remove(), duration * 1000);
    if (Math.random() < 0.3) {
        const s = document.createElement('div');
        s.classList.add('fire-spark');
        s.style.left = `${left + (Math.random() * 10 - 5)}%`;
        const sDuration = 0.5 + Math.random() * 1;
        s.style.animationDuration = `${sDuration}s`;
        container.appendChild(s);
        setTimeout(() => s.remove(), sDuration * 1000);
    }
}

function resumeCrunchTimeEffects() {
    window.currentActiveEvent = 'Espo Fury';
    crunchTimeMultiplier = 7;
    document.body.classList.add('crunch-active');
    const overlay = document.getElementById('crunch-overlay');
    if (overlay) overlay.style.display = 'block';
    const fireContainer = document.getElementById('fire-particles-container');
    if (fireContainer) {
        fireContainer.style.display = 'block';
        if (fireParticleInterval) clearInterval(fireParticleInterval);
        fireParticleInterval = setInterval(() => { spawnFireParticle(fireContainer); }, 120);
    }
    const bgMusic = document.getElementById('sound-bg-music');
    if (bgMusic) { bgMusic.pause(); bgMusic.currentTime = 0; }
    const snowAudio = document.getElementById('sound-snowball');
    if (snowAudio) { snowAudio.pause(); snowAudio.currentTime = 0; }
    const photoNormal = document.getElementById('manager-photo-normal');
    const photoClicked = document.getElementById('manager-photo-clicked');
    if (photoNormal) photoNormal.src = './assets/image/espo-fury.webp';
    if (photoClicked) photoClicked.src = './assets/image/espo-fury-click.webp';
    const furyMusic = document.getElementById('sound-fury-music');
    if (furyMusic) {
        const furyVol = getCustomVolume('sound-fury-music');
        const targetVol = gameState.user.masterVolume * gameState.user.musicVolume * furyVol;
        furyMusic.volume = targetVol;
        furyMusic.currentTime = 0;
        const playPromise = furyMusic.play();
        if (playPromise !== undefined) {
            playPromise.catch(() => {
                console.log("Autoplay bloccato per Fury Music. In attesa di interazione...");
                const unlockFuryAudio = () => {
                    if (gameState.crunchTimeEndTime > Date.now()) {
                        furyMusic.volume = gameState.user.masterVolume * gameState.user.musicVolume * furyVol;
                        furyMusic.play().catch(e => console.error("Errore play Fury manuale", e));
                    }
                    document.removeEventListener('click', unlockFuryAudio);
                    document.removeEventListener('keydown', unlockFuryAudio);
                    document.removeEventListener('touchstart', unlockFuryAudio);
                };
                document.addEventListener('click', unlockFuryAudio, { once: true });
                document.addEventListener('keydown', unlockFuryAudio, { once: true });
                document.addEventListener('touchstart', unlockFuryAudio, { once: true });
            });
        }
    }
    recalculateCPS();
    if (typeof updateUI === 'function') updateUI();
}

let lastVideoPlayedId = null;

// --- FUNZIONE EVENTI UNIVERSALE  ---
function triggerGameEvent(eventKey, overrideMult = null) {
    const config = gameData.events[eventKey];
    if (!config) return false;

    // 1. Controllo Conflitti
    if (checkEventConflict(config.name)) return false;

    // 2. Stop Audio Background (Comune a tutti)
    const snowAudio = document.getElementById('sound-snowball');
    if (snowAudio) snowAudio.pause();
    const bgMusic = document.getElementById('sound-bg-music');
    if (bgMusic) bgMusic.pause();

    // 3. Calcolo Moltiplicatore
    let bonusMult = overrideMult;
    if (!bonusMult) {
        bonusMult = Math.floor(Math.random() * (config.maxMult - config.minMult + 1)) + config.minMult;
    }

    // 4. Setup Stato Globale
    isBluescreenActive = true;
    bluescreenMultiplier = bonusMult;
    recalculateCPS();

    // Aggiorna UI Moltiplicatore
    const emDisplay = document.getElementById('event-multiplier-display');
    if (emDisplay) {
        const msg = config.toast.replace('{mult}', bonusMult);
        emDisplay.textContent = msg; // Usa il testo del toast anche qui per coerenza
        emDisplay.style.display = 'block';
    }

    // Toast Notifica
    const toastMsg = config.toast.replace('{mult}', bonusMult);
    window.EspooClicker.showToast(toastMsg, config.toastType);

    // --- GESTIONE SPECIFICA PER TIPO ---

    if (config.type === 'video') {
        // === LOGICA VIDEO (Rick/Ricardo) ===
        document.body.classList.add('rick-rolling');

        // Reset Video
        ['rick-roll-video', 'ricardo-video', 'ricardo-metal-video', 'ricardo-dota-video'].forEach(id => {
            const v = document.getElementById(id);
            if (v) { v.pause(); v.style.display = 'none'; v.currentTime = 0; }
        });

        // Scelta Video
        let videoId = config.videos[0];
        if (config.videos.length > 1) {
            const available = config.videos.filter(id => id !== lastVideoPlayedId);
            const pool = available.length > 0 ? available : config.videos;
            videoId = pool[Math.floor(Math.random() * pool.length)];
        }
        lastVideoPlayedId = videoId;

        const video = document.getElementById(videoId);
        if (video) {
            if (!video.src) { video.src = video.getAttribute('data-src'); video.load(); }
            video.style.display = 'block';
            video.currentTime = 0;

            const customVol = getCustomVolume(config.audioId || videoId);
            video.volume = (gameState.user.masterVolume * gameState.user.musicVolume) * customVol;
            video.play().catch(e => { });

            // Click Handler Video
            video.style.cursor = 'pointer';
            const videoClickHandler = (e) => {
                const syntheticEvent = { detail: 1, clientX: e.clientX, clientY: e.clientY, pageX: e.pageX, pageY: e.pageY, target: video };
                clickCookie(syntheticEvent);
                video.style.transform = 'scale(0.98)';
                setTimeout(() => video.style.transform = 'scale(1)', 50);
            };
            video.addEventListener('pointerdown', videoClickHandler);

            // Cleanup specifico video alla fine
            setTimeout(() => {
                video.pause();
                video.style.display = 'none';
                video.removeEventListener('pointerdown', videoClickHandler);
            }, config.duration);
        }

    } else if (config.type === 'css_mode') {
        // === LOGICA CSS (404 / Bluescreen) ===
        document.body.classList.add(config.cssClass);

        // Gestione Audio Speciale (Natale vs Normale)
        if (gameState.skins.current === 'christmas' && eventKey === 'bluescreen') {
            // Glitch Natalizio
            if (snowAudio) {
                snowAudio.play();
                if (audioGlitchInterval) clearInterval(audioGlitchInterval);
                audioGlitchInterval = setInterval(() => {
                    snowAudio.playbackRate = 0.2 + Math.random() * 1.6;
                    snowAudio.volume = (Math.random() < 0.3) ? 0 : (gameState.user.masterVolume * gameState.user.musicVolume) * 0.2;
                }, 100);
            }
        } else {
            // Audio Normale Evento
            playSound(config.audioId, 'music');
        }
    }

    // 5. Timer Finale Comune (Cleanup)
    setTimeout(() => {
        document.body.classList.remove('rick-rolling');
        if (config.cssClass) document.body.classList.remove(config.cssClass);
        stopBluescreenEffect();
    }, config.duration);

    return true;
}


function triggerBluescreen(multiplier) {
    // 1. Logica Skins Speciali (Dispatcher)
    if (gameState.skins.current === 'rick' && Math.random() < 0.8) {
        return triggerGameEvent('rickRoll');
    }
    if (gameState.skins.current === 'ricardo' && Math.random() < 0.8) {
        return triggerGameEvent('ricardo');
    }

    return triggerGameEvent('bluescreen', multiplier);
}

function stopBluescreenEffect() {
    isBluescreenActive = false;
    bluescreenMultiplier = 1;
    document.body.classList.remove('bluescreen-active');
    document.body.classList.remove('rick-rolling');
    const emDisplay = document.getElementById('event-multiplier-display');
    if (emDisplay) emDisplay.style.display = 'none';
    recalculateCPS();
    try {
        const soundBluescreen = document.getElementById('sound-bluescreen');
        if (soundBluescreen) { soundBluescreen.pause(); soundBluescreen.currentTime = 0; }
        const rickVideo = document.getElementById('rick-roll-video');
        if (rickVideo) { rickVideo.pause(); rickVideo.style.display = 'none'; }
    } catch (e) { }
    if (audioGlitchInterval) {
        clearInterval(audioGlitchInterval);
        audioGlitchInterval = null;
    }
    const snowAudio = document.getElementById('sound-snowball');
    const bgMusic = document.getElementById('sound-bg-music');
    const masterVol = gameState.user.masterVolume;
    if (masterVol > 0) {
        if (gameState.skins.current === 'christmas') {
            if (snowAudio) {
                snowAudio.playbackRate = 1.0;
                snowAudio.volume = (masterVol * gameState.user.musicVolume) * 0.2;
                if (snowAudio.paused) snowAudio.play().catch(e => console.log("Attesa interazione per riavvio neve"));
            }
        } else {
            if (bgMusic) {
                setBgMusicVolume();
                if (bgMusic.paused) bgMusic.play().catch(e => console.log("Attesa interazione per riavvio musica"));
            }
        }
    }
    clearActiveEvent();
}

function clickCookie(event) {
    if (event.detail === 0) return;
    if (clickerButton) clickerButton.blur();

    // 1. AUDIO (Delegato al Manager)
    AudioManager.playClickEffect();

    // 2. CALCOLO VALORE
    let clickBonusPercent = 0.01;
    if (window.gameFlags.divineClick) clickBonusPercent = 0.02;

    let clickValuePercentBonus = 0;
    if (window.gameFlags.bionicHand) {
        clickValuePercentBonus = (cookiesPerSecond / (prestigeBonus * bluescreenMultiplier)) * clickBonusPercent;
    }

    const currentClickValue = (gameState.baseClickValue * prestigeBonus * bluescreenMultiplier) + clickValuePercentBonus;

    // 3. AGGIORNAMENTO DATI
    clickHistory.push({ time: Date.now(), value: currentClickValue });
    gameState.score += currentClickValue;
    gameState.totalScore += currentClickValue;
    gameState.lifetimeScore += currentClickValue;
    gameState.totalClicks++;

    // 4. PARTICELLE & FEEDBACK VISIVO
    let x, y;
    if (event.clientX && event.clientY) {
        x = event.pageX;
        y = event.pageY;
    } else {
        const rect = clickerButton.getBoundingClientRect();
        x = rect.left + rect.width / 2;
        y = rect.top + rect.height / 2;
    }

    if (typeof createClickParticles === 'function') {
        const containerRect = document.getElementById('click-feedback-container').getBoundingClientRect();
        createClickParticles((x - window.scrollX) - containerRect.left, (y - window.scrollY) - containerRect.top);
    }

    showClickFeedback(event);

    // Animazione Bottone
    clickerButton.classList.remove('click-shrink', 'clicked');
    void clickerButton.offsetWidth; // Trigger Reflow
    clickerButton.classList.add('click-shrink', 'clicked');

    setTimeout(() => {
        clickerButton.classList.remove('clicked');
    }, 100);

    // UI
    if (typeof updateClickStore === 'function') updateClickStore();
    updateUI();
}

function calculateMaxAffordable(teamKey) {
    const state = gameState.teams[teamKey];
    const data = gameData.teams[teamKey];
    let scalingBase = 1.20;
    if (gameState.prestigeUpgrades && gameState.prestigeUpgrades.contrattazione && gameState.prestigeUpgrades.contrattazione.count > 0) {
        let reduction = gameState.prestigeUpgrades.contrattazione.count * 0.01;
        scalingBase = Math.max(1.05, scalingBase - reduction);
    }
    const r = scalingBase;
    let discountedBaseCost = data.baseCost;
    const currentSingleCost = Math.floor(discountedBaseCost * Math.pow(r, state.count));
    if (gameState.score < currentSingleCost) return 0;
    let maxAmount = 0;
    if (Math.abs(r - 1) < 0.0000001) {
        maxAmount = Math.floor(gameState.score / currentSingleCost);
    } else {
        maxAmount = Math.floor(Math.log(1 + (gameState.score * (r - 1) / currentSingleCost)) / Math.log(r));
    }
    let realCost = currentSingleCost * (Math.pow(r, maxAmount) - 1) / (r - 1);
    while (maxAmount > 0 && Math.floor(realCost) > gameState.score) {
        maxAmount--;
        realCost = currentSingleCost * (Math.pow(r, maxAmount) - 1) / (r - 1);
    }
    return Math.max(0, maxAmount);
}

function buyTeam(teamKey) {
    let amount = buyMultiplier;
    if (amount === 'MAX') {
        amount = calculateMaxAffordable(teamKey);
        if (amount === 0) return;
    }
    const state = gameState.teams[teamKey];
    const currentCost = calculateBulkCost(teamKey, amount);
    if (gameState.score >= currentCost) {
        playSound('sound-buy');
        gameState.score -= currentCost;
        state.count += amount;
        recalculateCPS();
        refreshAllStores();
        window.EspooClicker.saveGame();
        updateUI();
    } else {
        playSound('sound-error');
        window.EspooClicker.showToast("Bugs insufficienti!", 'error');
    }
}



function calculatePrestigeGained() {
    return Math.floor(Math.sqrt(gameState.totalScore / 2000000) * 1.0);
}

function openPrestigeContract() {
    const gained = calculatePrestigeGained();
    if (gained < 1) {
        if (window.EspooClicker && window.EspooClicker.showToast) {
            window.EspooClicker.showToast("Devi accumulare più bug per ottenere una promozione!", "error");
        }
        return;
    }
    const tokenDisplay = document.getElementById('contract-gain-token');
    const bonusDisplay = document.getElementById('contract-gain-bonus');
    if (tokenDisplay) tokenDisplay.textContent = `+${formatNumber(gained)}`;
    let currentLifetime = gameState.lifetimePrestigePoints || 0;
    let estimatedLifetime = currentLifetime + gained;
    let baseBonus = estimatedLifetime * 0.01;
    let synergyCount = gameState.prestigeUpgrades.sinergia ? gameState.prestigeUpgrades.sinergia.count : 0;
    let synergyBonus = synergyCount * (gameData.prestigeUpgrades.sinergia.bonusPerLevel || 0.001) * estimatedLifetime;
    let totalMultiplier = 1 + baseBonus + synergyBonus;
    if (typeof achievementsBPSBonus !== 'undefined') {
        totalMultiplier += achievementsBPSBonus;
    }
    if (bonusDisplay) {
        bonusDisplay.textContent = `Nuovo Moltiplicatore: x${formatNumber(totalMultiplier)}`;
        bonusDisplay.style.color = "#fff";
        bonusDisplay.innerHTML = `Nuovo Moltiplicatore: <span style="color: #f1c40f; font-size: 1.4rem;">x${formatNumber(totalMultiplier)}</span>`;
    }
    const modal = document.getElementById('prestige-modal');
    if (modal) modal.style.display = 'flex';
}

async function executePrestige() {
    // 1. Gestione Animazione Transizione
    const overlay = document.getElementById('prestige-transition-overlay');
    const modal = document.getElementById('prestige-modal');
    if (modal) modal.style.display = 'none';
    if (overlay) {
        overlay.style.display = 'flex';
        playSound('sound-prestige');
        setTimeout(() => overlay.classList.add('active'), 10);
    }

    // 2. Calcoli dei Guadagni
    const gained = calculatePrestigeGained();
    let newPrestigePoints = gameState.prestigePoints + gained;
    let currentLifetime = gameState.lifetimePrestigePoints !== undefined ? gameState.lifetimePrestigePoints : gameState.prestigePoints;
    let newLifetimePrestigePoints = currentLifetime + gained;

    // Calcolo Bonus Iniziale (Paracadute d'Oro)
    let startBonusBugs = 0;
    if (gameState.prestigeUpgrades.paracadute && gameState.prestigeUpgrades.paracadute.count > 0) {
        startBonusBugs = gameState.prestigeUpgrades.paracadute.count * 2000;
    }

    // --- HARDENING: Salvataggio Sicuro dei Dati ---
    // Definiamo qui cosa deve sopravvivere al reset. 
    // Se aggiungi nuove feature (es. "Artefatti"), basta aggiungerle a questa lista.
    const persistentKeys = [
        'achievements',
        'prestigeUpgrades',
        'skins',
        'user',
        'totalClicks',
        'totalGoldenBugsClicked',
        'totalPlayTime',
        'lifetimeScore',
        'buildingEnhancements', // Mantiene le migliorie acquistate (Opzionale: rimuovi se vuoi che si resettino)
        'totalOfflineScore'     // Statistica guadagni offline
    ];

    // Creiamo una "cassaforte" temporanea con i dati da salvare
    const preservedData = {};
    persistentKeys.forEach(key => {
        if (gameState[key] !== undefined) {
            // Clona profondo per rompere i riferimenti
            preservedData[key] = JSON.parse(JSON.stringify(gameState[key]));
        }
    });

    // Incrementa contatore reset (statistica)
    const newResets = gameState.totalResets + 1;

    // Attesa scenografica (1.5 secondi)
    await new Promise(r => setTimeout(r, 1500));

    // 3. RESET: Crea un nuovo stato pulito
    let newState = getInitialGameState();

    // 4. RIPRISTINO: Inserisce i dati salvati nel nuovo stato
    persistentKeys.forEach(key => {
        if (preservedData[key] !== undefined) {
            newState[key] = preservedData[key];
        }
    });

    // Applica i nuovi valori calcolati
    newState.prestigePoints = newPrestigePoints;
    newState.lifetimePrestigePoints = newLifetimePrestigePoints;
    newState.totalResets = newResets;
    newState.lastSaveTimestamp = Date.now();

    // 5. APPLICAZIONE BONUS SPECIALI (Post-Reset)

    // Bonus Eredità: Mantiene N "Assistente QA"
    if (gameState.prestigeUpgrades.eredita && gameState.prestigeUpgrades.eredita.count > 0) {
        newState.teams.assistenteQa.count = gameState.prestigeUpgrades.eredita.count;
    }

    // Bonus Paracadute: Imposta i bug iniziali
    if (startBonusBugs > 0) {
        newState.score = startBonusBugs;
        newState.totalScore = startBonusBugs;
    }

    // Bonus Accelerazione: Regala +1 Assistente QA extra
    if (newState.prestigeUpgrades.accelerazione && newState.prestigeUpgrades.accelerazione.purchased) {
        newState.teams.assistenteQa.count++;
    }

    // 6. SOSTITUZIONE DELLO STATO E PULIZIA
    gameState = newState;

    // Reset Variabili Runtime
    cookiesPerSecond = 0;
    clickHistory = [];
    isBluescreenActive = false;
    bluescreenMultiplier = 1;
    document.body.classList.remove('bluescreen-active');

    // Stop suoni eventi precedenti
    try {
        const soundBluescreen = document.getElementById('sound-bluescreen');
        if (soundBluescreen) { soundBluescreen.pause(); soundBluescreen.currentTime = 0; }
    } catch (e) { }

    // Ricalcola tutti gli effetti passivi (Sinergia, Sconti, ecc.)
    reapplyAllEffects();

    // Aggiorna l'interfaccia
    calculatePrestigeBonus();
    recalculateCPS();
    refreshAllStores();
    updateUI();

    // 7. SALVATAGGIO FINALE
    if (window.EspooClicker && window.EspooClicker.saveGame) window.EspooClicker.saveGame();

    // Rimuovi Overlay
    if (overlay) {
        overlay.classList.remove('active');
        setTimeout(() => {
            overlay.style.display = 'none';
            if (window.EspooClicker && window.EspooClicker.showToast) {
                window.EspooClicker.showToast("Promozione completata! Buon lavoro!");
            }
        }, 500);
    }
}

function checkAchievements() {
    let totalAchBPSBonus = 0;
    const isPostPrestige = gameState.totalResets > 0;
    for (const key in gameData.achievements) {
        const data = gameData.achievements[key];
        if (!gameState.achievements[key]) {
            gameState.achievements[key] = { unlocked: false, claimed: false };
        }
        if (gameState.achievements[key].claimed === undefined) {
            gameState.achievements[key].claimed = false;
        }
        const state = gameState.achievements[key];
        if (data.reward && data.reward.type === 'multiplier' && !isPostPrestige) {
            continue;
        }
        if (!state.unlocked && data.condition()) {
            unlockAchievement(key);
        }
        if (state.claimed && data.reward && data.reward.type === 'multiplier') {
            totalAchBPSBonus += (data.reward.value - 1);
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
    let msg = `🏆 Sbloccato: ${data.name}`;
    if (data.reward) msg += " (Premio disponibile!)";
    window.EspooClicker.showToast(msg);
    window.EspooClicker.saveGame();
    if (typeof updateAchievementsUI === 'function') updateAchievementsUI();
}

function claimAchievementReward(key) {
    const state = gameState.achievements[key];
    const data = gameData.achievements[key];

    // Controlli di sicurezza
    if (!state || !state.unlocked || state.claimed) return;

    // 1. Assegna il premio usando il nuovo sistema unificato
    if (data.reward) {
        grantReward(data.reward);
    }

    // 2. Aggiorna stato
    state.claimed = true;
    playSound('sound-buy');

    // 3. Ricalcola e Salva
    recalculateCPS();
    window.EspooClicker.saveGame();

    // 4. Aggiorna UI
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
    goldenBug.style.display = 'none';
    let bugWidth = goldenBug.style.width;
    let bugHeight = goldenBug.style.height;
    const offsetAreaAnimation = 40;
    const rect = document.getElementById('center-column').getBoundingClientRect();
    const spawnWidth = rect.width;
    const spawnHeight = rect.height;
    const x = Math.random() * (spawnWidth - (bugWidth / 2));
    const y = Math.random() * (spawnHeight - (bugHeight / 2));
    goldenBug.style.left = `${rect.left + x - offsetAreaAnimation}px`;
    goldenBug.style.top = `${rect.top + y - offsetAreaAnimation}px`;
    goldenBug.style.display = 'block';
    setTimeout(() => { goldenBug.style.display = 'none'; }, 10000);
    scheduleGoldenBug();
    return true;
}

function clickGoldenBug() {
    playSound('sound-golden');
    gameState.totalGoldenBugsClicked++;
    let clickBonusPercent = 0.01;
    if (window.gameFlags.divineClick) clickBonusPercent = 0.02;
    let clickValuePercentBonus = 0;
    if (window.gameFlags.bionicHand) {
        clickValuePercentBonus = (cookiesPerSecond / (prestigeBonus * bluescreenMultiplier)) * clickBonusPercent;
    }
    const currentClickValue = (gameState.baseClickValue * prestigeBonus * bluescreenMultiplier);
    let bonus = (cookiesPerSecond * 30) + (currentClickValue * 10) + 10;

    // [GENERICO] Moltiplicatore Golden Bug
    bonus *= goldenBugMult;

    gameState.score += bonus;
    gameState.totalScore += bonus;
    gameState.lifetimeScore += bonus;
    window.EspooClicker.showToast(`Bug Critico Risolto! +${formatNumber(bonus)} bug!`, 'reward');
    goldenBug.style.display = 'none';
    updateUI();
}

let originalTitle = document.title;
document.addEventListener('visibilitychange', () => {
    if (document.hidden) document.title = '🐞 I bug si accumulano...';
    else document.title = originalTitle;
});