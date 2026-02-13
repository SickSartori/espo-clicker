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

// Funzione per inviare il punteggio al leaderboard

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
            if (data.effects) data.effects.forEach(eff => { if (eff.trigger === 'passive') applyEffect(eff); });
        }
    }

    // Prestige Upgrades
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
    init() {
        const container = document.body;
        for (const key in gameData.assets.sounds) {
            const sound = gameData.assets.sounds[key];
            if (!document.getElementById(sound.id)) {
                const audio = document.createElement('audio');
                audio.id = sound.id;

                // Se il file contiene una barra, usa il percorso completo (es. arcade/assets/...)
                if (sound.file.includes('/')) {
                    audio.src = sound.file;
                } else {
                    audio.src = `assets/sounds/${sound.file}`;
                }

                audio.preload = sound.category === 'effetti' ? 'auto' : 'none';
                if (sound.loop) audio.loop = true;
                container.appendChild(audio);
            }
        }
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
                const clone = el.cloneNode();
                clone.volume = finalVol;
                clone.play().then(() => {
                    clone.addEventListener('ended', () => clone.remove());
                }).catch(e => { });
            } else {
                el.volume = finalVol;
                if (el.paused) el.play().catch(e => { });
            }
        } catch (e) { console.warn("Audio error:", e); }
    },

    playClickEffect() {
        let soundId = 'sound-click';

        // 1. Priorità Assoluta: Super Star Mode
        if (document.body.classList.contains('super-star-active')) {
            soundId = 'sound-click';
        }
        // 2. Evento Espo Fury (Fuoco) -> FIX: Solo se c'è la skin Super Espo
        else if (document.body.classList.contains('crunch-active')) {
            if (gameState.skins.current === 'superespo') {
                soundId = 'sound-fireball';
            }
        }
        // 3. Evento 404/Matrix/Rick (Glitch)
        else if (isBluescreenActive) {
            soundId = 'sound-click';
        }

        const sound = document.getElementById(soundId);
        if (!sound) return;

        let rate = 1.0;
        let volumeMult = 1.0;

        if (isBluescreenActive && !document.body.classList.contains('super-star-active')) {
            if (document.body.classList.contains('rick-rolling')) {
                volumeMult = 0.2;
            } else {
                rate = 0.2 + Math.random() * 1.6;
                volumeMult = 0.5 + Math.random();
            }
        }
        else if (soundId === 'sound-fireball') {
            rate = 0.9 + Math.random() * 0.2;
        }
        else if (document.body.classList.contains('super-star-active')) {
            rate = 1.1 + Math.random() * 0.1;
            volumeMult = 0.7;
        }

        const master = gameState.user.masterVolume * gameState.user.sfxVolume;
        const customVol = AudioManager.getCustomVolume(soundId);

        sound.volume = Math.max(0, Math.min(1, master * volumeMult * customVol));
        sound.playbackRate = rate;
        sound.currentTime = 0;
        sound.play().catch(e => { });
    },


    updateAmbience() {
        if (!sessionStorage.getItem('espooUser')) {
            const tracksToStop = [
                'sound-bg-music', 'sound-bg-music-v2', 'sound-bg-music-v3',
                'sound-snowball', 'sound-fury-music', 'sound-bluescreen',
                'sound-matrix', 'sound-bg-bit'
            ];

            tracksToStop.forEach(id => {
                const el = document.getElementById(id);
                if (el && !el.paused) {
                    el.pause();
                    el.currentTime = 0;
                }
            });
            return; // Interrompe qui la funzione
        }

        // --- LOGICA NORMALE DI GIOCO ---
        const allMusicTracks = [
            'sound-bg-music',
            'sound-bg-music-v2',
            'sound-bg-music-v3',
            'sound-snowball',
            'sound-fury-music',
            'sound-bluescreen',
            'sound-matrix',
            'sound-bg-bit',
            'sound-star',
			'bg-music-divine'
        ];

        // Aggiungi musiche delle skin in modo dinamico
        for (let key in gameData.skins) {
            const conf = gameData.skins[key].themeConfig;
            if (conf && conf.specialMusic && !allMusicTracks.includes(conf.specialMusic)) {
                allMusicTracks.push(conf.specialMusic);
            }
        }

        let targetTrackId = null;

        // Priorità Eventi
        if (window.currentActiveEvent === 'Audio Mixer') {
            targetTrackId = null;
        }
        else if (document.body.classList.contains('rick-rolling')) {
            targetTrackId = null;
        }
        else if (gameState.crunchTimeEndTime > Date.now()) {
            targetTrackId = 'sound-fury-music';
        }
        else if (isBluescreenActive) {
            if (document.body.classList.contains('matrix-active')) {
                targetTrackId = 'sound-matrix';
            } else if (document.body.classList.contains('super-star-active')) {
                targetTrackId = 'sound-star';
            } else {
                targetTrackId = (gameState.skins.current === 'christmas') ? 'sound-snowball' : 'sound-bluescreen';
            }
        }
        else {
            // Priorità Skin vs Selezione Utente
            const currentSkin = gameData.skins[gameState.skins.current] || gameData.skins['default'];
            if (currentSkin.themeConfig && currentSkin.themeConfig.specialMusic) {
                targetTrackId = currentSkin.themeConfig.specialMusic;
            } else {
                targetTrackId = gameState.user.bgMusicSelection || 'sound-bg-music';
            }
        }

        // Applica Play/Pause
        allMusicTracks.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;

            if (id === targetTrackId) {
                const volume = gameState.user.masterVolume * gameState.user.musicVolume * this.getCustomVolume(id);
                // Eccezione per glitch natalizio gestito altrove
                if (id === 'sound-snowball' && isBluescreenActive && gameState.skins.current === 'christmas') {
                    // managed by audioGlitchInterval
                } else {
                    el.volume = Math.max(0, Math.min(1, volume));
                    if (el.paused && volume > 0) {
                        el.play().catch(e => { });
                    }
                }
            } else {
                if (!el.paused) {
                    el.pause();
                    el.currentTime = 0;
                }
            }
        });
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
    const cost = data.baseCost;

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
        state.count += amount;
        recalculateCPS();
        refreshAllStores();
        window.EspooClicker.saveGame();
        updateUI();
    } else {
        playSound('sound-error');
        window.EspooClicker.showToast(gameData.texts.toasts.insufficientBugs, 'error');
    }
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
    crunchTimeEndTime = now + 30000;
    crunchTimeCooldownEnd = crunchTimeEndTime + 300000;

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
            photoNormal.src = 'assets/image/espobit-fury.webp';
            photoClicked.src = 'assets/image/espobit-fury-click.webp';
        } else if (document.body.classList.contains('theme-super')) {
            // Versione Super Espo
            photoNormal.src = 'assets/image/super-espofury.webp';
            photoClicked.src = 'assets/image/super-espofury-click.webp';
        } else {
            // Versione Standard
            photoNormal.src = 'assets/image/espo-fury.webp';
            photoClicked.src = 'assets/image/espo-fury-click.webp';
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

function spawnFireParticle(container) {
    // 1. Particella Fiamma (Grande e Lenta)
    const p = document.createElement('div');
    p.classList.add('fire-particle');

    // Posizione
    const left = Math.random() * 100;
    p.style.left = `${left}%`;

    // Dimensioni variabili (più grandi al centro per effetto "falò")
    // Usiamo dimensioni maggiori per coprire più area con meno elementi
    const sizeBase = 60 + Math.random() * 120;
    p.style.width = `${sizeBase}px`;
    p.style.height = `${sizeBase * 1.2}px`;

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
        const s = document.createElement('div');
        s.classList.add('fire-spark');
        s.style.left = `${left + (Math.random() * 20 - 10)}%`;

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
            photoNormal.src = 'assets/image/espobit-fury.webp';
            photoClicked.src = 'assets/image/espobit-fury-click.webp';
        } else if (document.body.classList.contains('theme-super')) {
            photoNormal.src = 'assets/image/super-espofury.webp';
            photoClicked.src = 'assets/image/super-espofury-click.webp';
        } else {
            photoNormal.src = 'assets/image/espo-fury.webp';
            photoClicked.src = 'assets/image/espo-fury-click.webp';
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
            if (!video.src) {
                video.src = video.getAttribute('data-src');
                video.load();
            }

            // Preparazione Video
            video.classList.remove("video_display_none");
            video.currentTime = 0;

            // Calcolo Volume
            const customVol = getCustomVolume(config.audioId || videoId);
            video.volume = (gameState.user.masterVolume * gameState.user.musicVolume) * customVol;

            // Play sicuro
            video.play().catch(e => { console.warn("Autoplay video bloccato", e); });

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
                    photoNormal.src = 'assets/image/espobit-matrix.webp';
                    photoClicked.src = 'assets/image/espobit-matrix-click.webp';
                } else {
                    // Altrimenti, usa le versioni standard di Matrix
                    photoNormal.src = 'assets/image/espo-matrix.webp';
                    photoClicked.src = 'assets/image/espo-matrix-click.webp';
                }
                // ------------------------------------------
            }
        }

        // GESTIONE AUDIO EVENTI (Delega al Manager Centrale)
        // Se è l'evento di Natale (Bluescreen), gestisci il glitch audio specifico
        if (gameState.skins.current === 'christmas' && eventKey === 'bluescreen') {
            const snowAudio = document.getElementById('sound-snowball');
            if (snowAudio) {
                snowAudio.play();
                // Avvia il glitch casuale
                if (audioGlitchInterval) clearInterval(audioGlitchInterval);
                audioGlitchInterval = setInterval(() => {
                    snowAudio.playbackRate = 0.2 + Math.random() * 1.6;
                    const baseVol = gameState.user.masterVolume * gameState.user.musicVolume;
                    snowAudio.volume = (Math.random() < 0.3) ? 0 : Math.max(0, Math.min(1, baseVol * 0.2));
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

    const snowAudio = document.getElementById('sound-snowball');
    if (snowAudio) snowAudio.pause();
    const bgMusic = document.getElementById('sound-bg-music');
    if (bgMusic) bgMusic.pause();

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
        emDisplay.style.display = 'block';
    }

    window.EspooClicker.showToast(config.toast.replace('{mult}', bonusMult), config.toastType);

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
    // 2. Priorità Skin Super Espò
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
    if (emDisplay) emDisplay.style.display = 'none';

    recalculateCPS();

    // ... (Codice audio stop esistente invariato) ...
    try {
        const soundBlue = document.getElementById('sound-bluescreen');
        const soundMatrix = document.getElementById('sound-matrix');
        const rickVideo = document.getElementById('rick-roll-video');
        if (soundBlue) { soundBlue.pause(); soundBlue.currentTime = 0; }
        if (soundMatrix) { soundMatrix.pause(); soundMatrix.currentTime = 0; }
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

    return val;
}
function calculateRawClickValue() {
    // Prendi il valore base (Upgrade + Base) e i moltiplicatori passivi interni (es. Doppio Click)
    let val = gameState.baseClickValue * (window.clickGlobalMult || 1);

    // Aggiungi Mano Bionica (Se attiva)
    if (window.gameFlags.bionicHand) {
        let percent = 0.01;
        if (window.gameFlags.divineClick) percent = 0.02;
        val += (bps * percent);
    }

    return val;
}

function resolveBug(event) {
    if (event.detail === 0) return;
    if (typeof clickerButton !== 'undefined' && clickerButton) clickerButton.blur();

    const isSuperTheme = document.body.classList.contains('theme-super');
    const isFuryActive = (typeof crunchTimeEndTime !== 'undefined' && crunchTimeEndTime > Date.now());

    if (isSuperTheme && isFuryActive) {
        if (window.EspooClicker && window.EspooClicker.playSound) {
            window.EspooClicker.playSound('sound-fireball');
        }
    } else {
        AudioManager.playClickEffect();
    }

    const currentClickValue = calculateClickValue();

    clickHistory.push({ time: Date.now(), value: currentClickValue });
    gameState.score = gameState.score.add(currentClickValue);
    gameState.totalScore = gameState.totalScore.add(currentClickValue);
    gameState.lifetimeScore = gameState.lifetimeScore.add(currentClickValue);
    gameState.totalClicks++;

    if (typeof showClickFeedback === 'function') showClickFeedback(event);

    const btn = document.getElementById('clicker-btn');
    if (btn) {
        btn.classList.remove('click-shrink', 'clicked');
        void btn.offsetWidth;
        btn.classList.add('click-shrink', 'clicked');
        setTimeout(() => {
            btn.classList.remove('click-shrink', 'clicked');
        }, 100);
    }

    if (typeof updateClickStore === 'function') updateClickStore();
    if (typeof updateUI === 'function') updateUI();
}




function calculatePrestigeGained() {
    if (gameState.totalScore.lt(gameData.PRESTIGE_THRESHOLD)) return new Decimal(0);
    let base = new Decimal(2000000);
    return gameState.totalScore.div(base).sqrt().floor();
}

function openPrestigeContract() {
    if (gameState.totalScore.lt(gameData.PRESTIGE_THRESHOLD)) {
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

    const tokenDisplay = document.getElementById('contract-gain-token');
    const bonusDisplay = document.getElementById('contract-gain-bonus');

    if (tokenDisplay) tokenDisplay.textContent = `+${formatNumber(gained)}`;

    // Calcoli per la preview
    let currentLifetime = gameState.lifetimePrestigePoints || new Decimal(0);
    let estimatedLifetime = currentLifetime.add(gained);

    // Calcolo Bonus
    let baseBonus = estimatedLifetime.mul(0.01);

    let synergyCount = gameState.prestigeUpgrades.sinergia ? gameState.prestigeUpgrades.sinergia.count : 0;
    let synergyPerLevel = gameData.prestigeUpgrades.sinergia.bonusPerLevel || new Decimal(0.001);

    // synergy = count * 0.001 * lifetime
    let synergyBonus = new Decimal(synergyCount).mul(synergyPerLevel).mul(estimatedLifetime);

    let totalMultiplier = new Decimal(1).add(baseBonus).add(synergyBonus).add(achievementsBPSBonus);

    if (bonusDisplay) {
        bonusDisplay.innerHTML = `Nuovo Moltiplicatore: <span style="color: #f1c40f; font-size: 1.4rem;">x${formatNumber(totalMultiplier)}</span>`;
    }

    const modal = document.getElementById('prestige-modal');
    if (modal) modal.style.display = 'flex';

    // Aggiungi classe al body per gestire i toast
    document.body.classList.add('modal-open');
}

async function executePrestige() {
    const overlay = document.getElementById('prestige-transition-overlay');
    const modal = document.getElementById('prestige-modal');
    if (modal) modal.style.display = 'none';
    if (overlay) {
        overlay.classList.remove("prestige_transition_overlay_display_none");
        if (typeof playSound === 'function') playSound('sound-prestige');
        setTimeout(() => overlay.classList.add('active'), 10);
    }

    // Salviamo il filtro corrente PRIMA di toccare qualsiasi cosa
    const savedFilter = (gameState.filterSettings && gameState.filterSettings.globalFilter)
        ? gameState.filterSettings.globalFilter
        : 'available';

    // Calcolo Punti
    let gained = new Decimal(0);
    if (typeof calculatePrestigeGained === 'function') {
        gained = calculatePrestigeGained();
    }

    let newPrestigePoints = gameState.prestigePoints.add(gained);
    let newLifetime = gameState.lifetimePrestigePoints.add(gained);

    // Bonus Paracadute (Bug iniziali)
    let startBonusBugs = new Decimal(0);
    if (gameState.prestigeUpgrades.paracadute && gameState.prestigeUpgrades.paracadute.count > 0) {
        startBonusBugs = new Decimal(gameState.prestigeUpgrades.paracadute.count).mul(2000);
    }

    // Salvataggio Dati Persistenti
    const persistentKeys = ['achievements', 'prestigeUpgrades', 'skins', 'user', 'totalClicks', 'totalGoldenBugsClicked', 'totalPlayTime', 'lifetimeScore', 'totalOfflineScore'];
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

    newState.prestigePoints = newPrestigePoints;
    newState.lifetimePrestigePoints = newLifetime;
    newState.totalResets = newResets;
    newState.lastSaveTimestamp = Date.now();
    newState.score = startBonusBugs; // Applica il bonus paracadute

    // Logica Eredità Assistenti (Team QA)
    if (newState.teams && newState.teams.assistenteQa) {
        newState.teams.assistenteQa.count = 0; // Reset base

        // Eredità
        if (gameState.prestigeUpgrades.eredita && gameState.prestigeUpgrades.eredita.count > 0) {
            newState.teams.assistenteQa.count = gameState.prestigeUpgrades.eredita.count;
        }
        // Accelerazione
        if (newState.prestigeUpgrades.accelerazione && newState.prestigeUpgrades.accelerazione.purchased) {
            newState.teams.assistenteQa.count++;
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
    try {
        const soundBluescreen = document.getElementById('sound-bluescreen');
        if (soundBluescreen) { soundBluescreen.pause(); soundBluescreen.currentTime = 0; }
    } catch (e) { }

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
        setTimeout(() => {
            overlay.classList.add("prestige_transition_overlay_display_none");
            if (window.EspooClicker && gameData.texts)
                window.EspooClicker.showToast(gameData.texts.toasts.promoSuccess);
        }, 500);
    }
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
    // Reset
    goldenBug.classList.remove('visible');

    const bugWidth = 60;
    const bugHeight = 60;

    const padding = 20;

    const targetArea = document.getElementById('clicker-section');
    if (!targetArea) return;

    const rect = targetArea.getBoundingClientRect();

    // Calcolo con dimensioni corrette
    const maxX = rect.width - bugWidth - (padding * 2);
    const maxY = rect.height - bugHeight - (padding * 2);

    // Evita valori negativi se lo schermo è minuscolo
    const randomX = Math.max(0, Math.random() * maxX);
    const randomY = Math.max(0, Math.random() * maxY);

    // Conversione in coordinate ASSOLUTE (per il body)
    // Sommiamo la posizione dell'area + lo scroll della pagina + il padding + la posizione random
    const finalLeft = rect.left + window.scrollX + padding + randomX;
    const finalTop = rect.top + window.scrollY + padding + randomY;

    // Applica posizione
    goldenBug.style.left = `${finalLeft}px`;
    goldenBug.style.top = `${finalTop}px`;

    // Mostra (Flex per centrare l'icona)
    goldenBug.classList.add('visible');

    // Timer Sparizione
    setTimeout(() => {
        goldenBug.classList.remove('visible');
    }, 10000); // 10 secondi

    scheduleGoldenBug();
    return true;
}

function clickGoldenBug() {
    const goldenBug = document.getElementById('golden-bug');
    playSound('sound-golden');
    gameState.totalGoldenBugsClicked++;

    const currentClickValue = calculateClickValue();

    // Formula: (BPS * 30 + Click * 10 + 10) * Multiplier
    let bonus = bps.mul(30).add(currentClickValue.mul(10)).add(10);
    bonus = bonus.mul(window.goldenBugMult);

    gameState.score = gameState.score.add(bonus);
    gameState.totalScore = gameState.totalScore.add(bonus);
    gameState.lifetimeScore = gameState.lifetimeScore.add(bonus);

    window.EspooClicker.showToast(gameData.texts.toasts.bugCrit.replace('{amount}', formatNumber(bonus)), 'reward');
    if (goldenBug) goldenBug.classList.remove('visible');
    updateUI();
}

let originalTitle = document.title;
document.addEventListener('visibilitychange', () => {
    if (document.hidden) document.title = '🐞 I bug si accumulano...';
    else document.title = originalTitle;
});