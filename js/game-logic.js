// --- GESTIONE CONFLITTI EVENTI (SEMAFORO) ---
let fireParticleInterval = null;
let lastRicardoVideoId = null;

window.currentActiveEvent = null; // Il "Semaforo"
let audioGlitchInterval = null;

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
        // Moltiplica valore nel gameState (Permanente)
        if (gameState.hasOwnProperty(effect.stat)) {
            gameState[effect.stat] *= effect.val;
        }
    }
    else if (effect.type === 'mult_global') {
        // Moltiplica variabile globale (Volatile, es. goldenBugChance)
        if (window.hasOwnProperty(effect.stat)) {
            window[effect.stat] *= effect.val;
        }
    }
    else if (effect.type === 'add_mult_per_level') {
        // Aggiunge moltiplicatore basato sul livello (es. Bug Bounty)
        // Usa una variabile globale accumulatore
        if (window.hasOwnProperty(effect.stat)) {
            window[effect.stat] += (effect.val * level);
        }
    }
    else if (effect.type === 'set_flag') {
        // Imposta un flag di gioco
        window.gameFlags[effect.flag] = effect.val;
    }
}

// Ricalcola tutti gli effetti passivi (da chiamare al caricamento)
function reapplyAllEffects() {
    // 1. Reset Variabili Globali ai valori base (Definiti in game-data.js)
    goldenBugChance = 0.001;
    // Spawn time base è dinamico, lo resettiamo a una media ragionevole o lasciamo invariato se non vogliamo reset
    // goldenBugSpawnTime viene gestito dallo scheduler, resettiamo il moltiplicatore logico se ci fosse

    goldenBugMult = 1;
    window.gameFlags = {};

    // 2. Riaplica Effetti Passivi dai Click Upgrades
    for (const key in gameState.clickUpgrades) {
        if (gameState.clickUpgrades[key].purchased) {
            const data = gameData.clickUpgrades[key];
            if (data.effects) {
                data.effects.forEach(eff => {
                    if (eff.trigger === 'passive') applyEffect(eff);
                });
            }
        }
    }

    // 3. Riaplica Effetti Passivi dal Prestigio
    for (const key in gameState.prestigeUpgrades) {
        const state = gameState.prestigeUpgrades[key];
        const data = gameData.prestigeUpgrades[key];

        // Se acquistato (bool) o livello > 0 (counted)
        if ((data.isCounted && state.count > 0) || (!data.isCounted && state.purchased)) {
            if (data.effects) {
                data.effects.forEach(eff => {
                    if (eff.trigger === 'passive') applyEffect(eff, state.count || 1);
                });
            }
        }
    }
}

// --------- 3. FUNZIONI AUDIO AVANZATE ---------
function getCustomVolume(id) {
    if (gameState && gameState.user && gameState.user.audioCustom) {
        const val = gameState.user.audioCustom[id];
        return (val !== undefined) ? val : 1.0;
    }
    return 1.0;
}

function playSound(id, type = 'sfx') {
    const originalSound = document.getElementById(id);
    if (!originalSound) return;
    const master = gameState.user.masterVolume;
    if (master <= 0) return;
    const channel = (type === 'music') ? gameState.user.musicVolume : gameState.user.sfxVolume;
    const custom = getCustomVolume(id);
    let finalVolume = Math.max(0, Math.min(1, master * channel * custom));
    if (finalVolume < 0.01) return;

    try {
        if (type === 'sfx') {
            const soundClone = originalSound.cloneNode();
            soundClone.volume = finalVolume;
            const playPromise = soundClone.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    soundClone.addEventListener('ended', () => soundClone.remove());
                }).catch(e => { });
            }
        } else {
            originalSound.volume = finalVolume;
            originalSound.currentTime = 0;
            originalSound.play().catch(e => { });
        }
    } catch (e) { console.warn("Audio error:", e); }
}

function setBgMusicVolume() {
    const bgMusic = document.getElementById('sound-bg-music');
    if (!bgMusic) return;
    if (window.currentActiveEvent === 'Audio Mixer') return;
    if (gameState.skins.current === 'christmas') {
        if (!bgMusic.paused) {
            bgMusic.pause();
            bgMusic.currentTime = 0;
        }
        return;
    }
    const BASE_VOLUME_MULTIPLIER = 1.0;
    const master = gameState.user.masterVolume;
    const music = gameState.user.musicVolume;
    const custom = (gameState.user.audioCustom && gameState.user.audioCustom['sound-bg-music'] !== undefined)
        ? gameState.user.audioCustom['sound-bg-music'] : 1.0;
    const finalVolume = Math.max(0, Math.min(1, master * music * custom * BASE_VOLUME_MULTIPLIER));
    bgMusic.volume = finalVolume;

    if (finalVolume > 0 && !window.currentActiveEvent) {
        if (bgMusic.paused) bgMusic.play().catch(e => { });
    } else {
        if (!bgMusic.paused) bgMusic.pause();
    }
}

function updateAmbientVolume() {
    setBgMusicVolume();
    const master = gameState.user.masterVolume;
    const music = gameState.user.musicVolume;
    const sfx = gameState.user.sfxVolume;
    const applyVol = (elmId, channelVol, customId) => {
        const el = document.getElementById(elmId);
        if (el) {
            const custom = getCustomVolume(customId);
            const final = Math.max(0, Math.min(1, master * channelVol * custom));
            el.volume = final;
        }
    };
    applyVol('sound-bluescreen', music, 'sound-bluescreen');
    applyVol('sound-snowball', music, 'sound-snowball');
    applyVol('sound-fury-music', music, 'sound-fury-music');
    applyVol('rick-roll-video', music, 'rick-roll-video');
    ['ricardo-video', 'ricardo-metal-video', 'ricardo-dota-video'].forEach(vidId => {
        applyVol(vidId, music, 'ricardo-video');
    });
}

function buySkin(skinId) {
    const data = gameData.skins[skinId];
    if (!data || !data.cost || data.cost === 0) return;
    if (gameState.skins.unlocked.includes(skinId)) return;

    if (gameState.prestigePoints >= data.cost) {
        gameState.prestigePoints -= data.cost;
        gameState.skins.unlocked.push(skinId);
        if (typeof playSound === 'function') playSound('sound-buy');
        window.EspooClicker.showToast("Skin Acquistata: " + data.name + "!", 'success');
        equipSkin(skinId);
        window.EspooClicker.saveGame();
        if (typeof updatePrestigeUI === 'function') updatePrestigeUI();
        if (typeof updateSkinsUI === 'function') updateSkinsUI();
    } else {
        playSound('sound-error');
        window.EspooClicker.showToast("Token insufficienti!", 'error');
    }
}

// --------- 4. FUNZIONI DI GIOCO PRINCIPALI ---------
function calculateBulkCost(teamKey, amount) {
    const data = gameData.teams[teamKey];
    const state = gameState.teams[teamKey];
    let scalingBase = 1.20;
    if (gameState.prestigeUpgrades.contrattazione && gameState.prestigeUpgrades.contrattazione.count > 0) {
        let reduction = gameState.prestigeUpgrades.contrattazione.count * 0.01;
        scalingBase = Math.max(1.05, scalingBase - reduction);
    }
    const r = scalingBase;
    let discountedBaseCost = data.baseCost;
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
    const pData = gameData.prestigeUpgrades;
    const pState = gameState.prestigeUpgrades;
    let baseBonus = gameState.lifetimePrestigePoints * 0.01;
    let synergyCount = pState.sinergia.count;
    let synergyBonus = synergyCount * pData.sinergia.bonusPerLevel * gameState.lifetimePrestigePoints;
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
        for (const enhanceKey in gameData.buildingEnhancements) {
            if (gameState.buildingEnhancements && gameState.buildingEnhancements[enhanceKey]) {
                const enhancementState = gameState.buildingEnhancements[enhanceKey];
                const enhancementData = gameData.buildingEnhancements[enhanceKey];
                if (enhancementState.purchased && enhancementData.targetTeam === key) {
                    teamBPS *= enhancementData.multiplier;
                }
            }
        }
        baseCPS += teamBPS;
    }

    // [GENERICO] Bonus Click Automatico (Flag)
    if (window.gameFlags.autoClickQA) {
        baseCPS += gameState.teams.assistenteQa.count;
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

function triggerBluescreen(multiplier) {
    if (gameState.skins.current === 'rick' && Math.random() < 0.8) return triggerRickRoll();
    if (gameState.skins.current === 'ricardo' && Math.random() < 0.8) return triggerRicardoEvent();
    if (checkEventConflict('System Error 404')) return false;
    isBluescreenActive = true;
    bluescreenMultiplier = multiplier;
    document.body.classList.add('bluescreen-active');
    recalculateCPS();
    const emDisplay = document.getElementById('event-multiplier-display');
    if (emDisplay) {
        emDisplay.textContent = `ERRORE DI SISTEMA! x${multiplier}!`;
        emDisplay.style.display = 'block';
    }
    if (gameState.skins.current === 'christmas') {
        const snowAudio = document.getElementById('sound-snowball');
        if (snowAudio && !snowAudio.paused) {
            if (audioGlitchInterval) clearInterval(audioGlitchInterval);
            audioGlitchInterval = setInterval(() => {
                snowAudio.playbackRate = 0.2 + Math.random() * 1.6;
                snowAudio.volume = (Math.random() < 0.3) ? 0 : (gameState.user.masterVolume * gameState.user.musicVolume) * 0.2;
            }, 100);
        }
    } else {
        playSound('sound-bluescreen', 'music');
        const bgMusic = document.getElementById('sound-bg-music');
        if (bgMusic && !bgMusic.paused) {
            bgMusic.pause();
        }
    }
    setTimeout(() => { stopBluescreenEffect(); }, 30000);
    return true;
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

function triggerRickRoll() {
    if (checkEventConflict('Rick Roll')) return false;
    const video = document.getElementById('rick-roll-video');
    if (!video) { clearActiveEvent(); return false; }
    if (!video.src) { video.src = video.getAttribute('data-src'); video.load(); }
    const snowAudio = document.getElementById('sound-snowball');
    if (snowAudio) snowAudio.pause();
    const bgMusic = document.getElementById('sound-bg-music');
    if (bgMusic) bgMusic.pause();
    let rickMultiplier = Math.floor(Math.random() * 8) + 5;
    isBluescreenActive = true;
    bluescreenMultiplier = rickMultiplier;
    recalculateCPS();
    document.body.classList.add('rick-rolling');
    const emDisplay = document.getElementById('event-multiplier-display');
    if (emDisplay) {
        emDisplay.textContent = `🔥 RICK BONUS: BPS x${rickMultiplier} 🔥`;
        emDisplay.style.display = 'block';
    }
    video.style.display = 'block';
    video.currentTime = 0;
    const rickVol = (gameState.user.audioCustom && gameState.user.audioCustom['rick-roll-video'] !== undefined)
        ? gameState.user.audioCustom['rick-roll-video'] : 0.5;
    video.volume = (gameState.user.masterVolume * gameState.user.musicVolume) * rickVol;
    video.play().catch(e => { });
    window.EspooClicker.showToast(`🎵 RICK ROLL! (x${rickMultiplier}) 🎵`, 'achievement');
    video.style.cursor = 'pointer';
    const videoClickHandler = (e) => {
        const syntheticEvent = {
            detail: 1,
            clientX: e.clientX,
            clientY: e.clientY,
            pageX: e.pageX,
            pageY: e.pageY,
            target: video
        };
        clickCookie(syntheticEvent);
        video.style.transform = 'scale(0.98)';
        setTimeout(() => video.style.transform = 'scale(1)', 50);
    };
    video.addEventListener('pointerdown', videoClickHandler);
    setTimeout(() => {
        document.body.classList.remove('rick-rolling');
        video.pause();
        video.style.display = 'none';
        video.style.transform = 'none';
        video.style.cursor = 'default';
        video.removeEventListener('pointerdown', videoClickHandler);
        stopBluescreenEffect();
    }, 60000);
    return true;
}

function triggerRicardoEvent() {
    if (checkEventConflict('Ricardo Flex')) return false;
    const allVideos = ['ricardo-video', 'ricardo-metal-video', 'ricardo-dota-video'];
    allVideos.forEach(id => {
        const v = document.getElementById(id);
        if (v) { v.pause(); v.style.display = 'none'; v.currentTime = 0; }
    });
    let availableVideos = allVideos.filter(id => id !== lastRicardoVideoId);
    if (availableVideos.length === 0) availableVideos = allVideos;
    const selectedId = availableVideos[Math.floor(Math.random() * availableVideos.length)];
    lastRicardoVideoId = selectedId;
    const video = document.getElementById(selectedId);
    if (!video) { clearActiveEvent(); return false; }
    if (!video.src) { video.src = video.getAttribute('data-src'); video.load(); }
    const snowAudio = document.getElementById('sound-snowball');
    if (snowAudio) snowAudio.pause();
    const bgMusic = document.getElementById('sound-bg-music');
    if (bgMusic) bgMusic.pause();
    let bonusMult = Math.floor(Math.random() * 8) + 5;
    isBluescreenActive = true;
    bluescreenMultiplier = bonusMult;
    recalculateCPS();
    document.body.classList.add('rick-rolling');
    const emDisplay = document.getElementById('event-multiplier-display');
    if (emDisplay) {
        emDisplay.textContent = `🔥 FLEX BONUS: BPS x${bonusMult} 🔥`;
        emDisplay.style.display = 'block';
    }
    video.style.display = 'block';
    video.currentTime = 0;
    const ricardoVol = (gameState.user.audioCustom && gameState.user.audioCustom['ricardo-video'] !== undefined)
        ? gameState.user.audioCustom['ricardo-video'] : 0.5;
    video.volume = (gameState.user.masterVolume * gameState.user.musicVolume) * ricardoVol;
    video.play().catch(e => { });
    window.EspooClicker.showToast(`💪 PURE POWER! (x${bonusMult}) 💪`, 'achievement');
    video.style.cursor = 'pointer';
    const videoClickHandler = (e) => {
        const syntheticEvent = {
            detail: 1,
            clientX: e.clientX,
            clientY: e.clientY,
            pageX: e.pageX,
            pageY: e.pageY,
            target: video
        };
        clickCookie(syntheticEvent);
        video.style.transform = 'scale(0.99)';
        setTimeout(() => video.style.transform = 'scale(1)', 50);
    };
    video.addEventListener('pointerdown', videoClickHandler);
    setTimeout(() => {
        document.body.classList.remove('rick-rolling');
        allVideos.forEach(id => {
            const v = document.getElementById(id);
            if (v) {
                v.pause();
                v.style.display = 'none';
                v.currentTime = 0;
                v.style.transform = 'none';
                v.style.cursor = 'default';
                v.removeEventListener('pointerdown', videoClickHandler);
            }
        });
        stopBluescreenEffect();
    }, 45000);
    return true;
}

function clickCookie(event) {
    if (event.detail === 0) return;
    if (clickerButton) clickerButton.blur();
    if (isBluescreenActive) {
        const sound = document.getElementById('sound-click');
        if (sound) {
            if (document.body.classList.contains('rick-rolling')) {
                sound.playbackRate = 1;
                sound.volume = (gameState.user.masterVolume * gameState.user.sfxVolume) * 0.2;
                sound.currentTime = 0;
                sound.play().catch(e => { });
            } else {
                sound.playbackRate = 0.2 + Math.random() * 1.6;
                sound.volume = Math.max(0, Math.min(1, gameState.user.masterVolume * (0.5 + Math.random())));
                sound.currentTime = 0;
                sound.play().catch(e => { });
            }
        }
    } else {
        const sound = document.getElementById('sound-click');
        if (sound && sound.playbackRate !== 1) {
            sound.playbackRate = 1;
            sound.volume = gameState.user.masterVolume * gameState.user.sfxVolume;
        }
        playSound('sound-click');
    }

    // [GENERICO] Bonus Click Divino (Flag)
    let clickBonusPercent = 0.01;
    if (window.gameFlags.divineClick) clickBonusPercent = 0.02;

    // [GENERICO] Bonus Mano Bionica (Flag)
    let clickValuePercentBonus = 0;
    if (window.gameFlags.bionicHand) {
        clickValuePercentBonus = (cookiesPerSecond / (prestigeBonus * bluescreenMultiplier)) * clickBonusPercent;
    }

    const currentClickValue = (gameState.baseClickValue * prestigeBonus * bluescreenMultiplier) + clickValuePercentBonus;
    clickHistory.push({ time: Date.now(), value: currentClickValue });
    gameState.score += currentClickValue;
    gameState.totalScore += currentClickValue;
    gameState.lifetimeScore += currentClickValue;
    gameState.totalClicks++;

    let x, y;
    if (event.clientX && event.clientY) {
        const rect = document.getElementById('clicker-section').getBoundingClientRect();
        x = event.pageX;
        y = event.pageY;
    } else {
        const rect = clickerButton.getBoundingClientRect();
        x = rect.left + rect.width / 2;
        y = rect.top + rect.height / 2;
    }
    if (typeof createClickParticles === 'function') {
        const containerRect = document.getElementById('click-feedback-container').getBoundingClientRect();
        const relX = (event.clientX || (x - window.scrollX)) - containerRect.left;
        const relY = (event.clientY || (y - window.scrollY)) - containerRect.top;
        createClickParticles(relX, relY);
    }
    showClickFeedback(event);
    clickerButton.classList.remove('click-shrink');
    clickerButton.classList.remove('clicked');
    void clickerButton.offsetWidth;
    clickerButton.classList.add('click-shrink');
    clickerButton.classList.add('clicked');
    setTimeout(() => {
        clickerButton.classList.remove('click-shrink');
        clickerButton.classList.remove('clicked');
    }, 100);
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

function buyClickUpgrade(upgradeKey) {
    const state = gameState.clickUpgrades[upgradeKey];
    const data = gameData.clickUpgrades[upgradeKey];

    if (gameState.score >= data.cost && !state.purchased) {
        playSound('sound-buy');
        gameState.score -= data.cost;
        gameState.baseClickValue += data.clickIncrease;

        // [GENERICO] Applicazione effetti
        if (data.effects) {
            data.effects.forEach(eff => applyEffect(eff));
        }

        if (upgradeKey === 'clickAutomatico') recalculateCPS();

        state.purchased = true;
        refreshAllStores();
        window.EspooClicker.saveGame();
        updateUI();
    }
}

function buyTeamEnhancement(enhanceKey) {
    const state = gameState.buildingEnhancements[enhanceKey];
    const data = gameData.buildingEnhancements[enhanceKey];
    if (gameState.score >= data.cost && !state.purchased) {
        playSound('sound-buy');
        gameState.score -= data.cost;
        state.purchased = true;
        recalculateCPS();
        refreshAllStores();
        window.EspooClicker.saveGame();
        updateUI();
    }
}

function buyPrestigeUpgrade(upgradeKey) {
    const state = gameState.prestigeUpgrades[upgradeKey];
    const data = gameData.prestigeUpgrades[upgradeKey];
    const cost = data.baseCost;

    if (data.isCounted) {
        if (gameState.prestigePoints >= cost) {
            playSound('sound-buy');
            gameState.prestigePoints -= cost;
            state.count++;

            // [GENERICO] Effetti Counted
            if (data.effects) {
                data.effects.forEach(eff => applyEffect(eff, 1)); // Incremento di 1 livello
            }

            calculatePrestigeBonus();
            recalculateCPS();
            refreshAllStores();
            window.EspooClicker.saveGame();
            updateUI();
        }
    } else {
        if (gameState.prestigePoints >= cost && !state.purchased) {
            playSound('sound-buy');
            gameState.prestigePoints -= cost;
            state.purchased = true;

            // [GENERICO] Effetti One-Shot
            if (data.effects) {
                data.effects.forEach(eff => applyEffect(eff));
            }

            calculatePrestigeBonus();
            recalculateCPS();
            refreshAllStores();
            window.EspooClicker.saveGame();
            updateUI();
        }
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
    const overlay = document.getElementById('prestige-transition-overlay');
    const modal = document.getElementById('prestige-modal');
    if (modal) modal.style.display = 'none';
    if (overlay) {
        overlay.style.display = 'flex';
        playSound('sound-prestige');
        setTimeout(() => overlay.classList.add('active'), 10);
    }
    const gained = calculatePrestigeGained();
    let newPrestigePoints = gameState.prestigePoints + gained;
    let currentLifetime = gameState.lifetimePrestigePoints !== undefined ? gameState.lifetimePrestigePoints : gameState.prestigePoints;
    let newLifetimePrestigePoints = currentLifetime + gained;
    let startBonusBugs = 0;
    if (gameState.prestigeUpgrades.paracadute && gameState.prestigeUpgrades.paracadute.count > 0) {
        startBonusBugs = gameState.prestigeUpgrades.paracadute.count * 2000;
    }
    let oldAchievements = JSON.parse(JSON.stringify(gameState.achievements));
    let oldPrestigeUpgrades = JSON.parse(JSON.stringify(gameState.prestigeUpgrades));
    let oldSkins = JSON.parse(JSON.stringify(gameState.skins));
    let oldTotalResets = gameState.totalResets + 1;
    let oldTotalClicks = gameState.totalClicks;
    let oldGoldenBugs = gameState.totalGoldenBugsClicked;
    let oldPlayTime = gameState.totalPlayTime;
    let oldLifetimeScore = gameState.lifetimeScore;
    let oldUser = gameState.user;
    await new Promise(r => setTimeout(r, 1500));
    let newState = createNewGameState();
    if (gameState.prestigeUpgrades.eredita && gameState.prestigeUpgrades.eredita.count > 0) {
        newState.teams.assistenteQa.count = gameState.prestigeUpgrades.eredita.count;
    }
    newState.prestigePoints = newPrestigePoints;
    newState.lifetimePrestigePoints = newLifetimePrestigePoints;
    if (startBonusBugs > 0) {
        newState.score = startBonusBugs;
        newState.totalScore = startBonusBugs;
    }
    newState.achievements = oldAchievements;
    newState.prestigeUpgrades = oldPrestigeUpgrades;
    newState.skins = oldSkins;
    newState.totalResets = oldTotalResets;
    newState.totalClicks = oldTotalClicks;
    newState.totalGoldenBugsClicked = oldGoldenBugs;
    newState.totalPlayTime = oldPlayTime;
    newState.lifetimeScore = oldLifetimeScore;
    newState.user = oldUser;
    newState.lastSaveTimestamp = Date.now();
    if (newState.prestigeUpgrades.accelerazione && newState.prestigeUpgrades.accelerazione.purchased) {
        newState.teams.assistenteQa.count = 1;
    }
    gameState = newState;
    cookiesPerSecond = 0;
    clickHistory = [];
    isBluescreenActive = false;
    bluescreenMultiplier = 1;
    document.body.classList.remove('bluescreen-active');
    try {
        const soundBluescreen = document.getElementById('sound-bluescreen');
        if (soundBluescreen) { soundBluescreen.pause(); soundBluescreen.currentTime = 0; }
    } catch (e) { }

    // [GENERICO] Ri-applica effetti passivi dopo reset
    reapplyAllEffects();

    calculatePrestigeBonus();
    recalculateCPS();
    refreshAllStores();
    updateUI();
    if (window.EspooClicker && window.EspooClicker.saveGame) window.EspooClicker.saveGame();
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
    if (!state || !state.unlocked || state.claimed) return;
    if (data.reward) {
        let toastType = 'reward';
        if (data.reward.type === 'bugs') {
            gameState.score += data.reward.value;
            gameState.totalScore += data.reward.value;
            window.EspooClicker.showToast(`Riscattato: +${formatNumber(data.reward.value)} Bug!`, toastType);
        }
        else if (data.reward.type === 'prestige') {
            gameState.prestigePoints += data.reward.value;
            window.EspooClicker.showToast(`Riscattato: +${data.reward.value} Token Lab!`, toastType);
        }
        else if (data.reward.type === 'skin') {
            const skinId = data.reward.id;
            if (!gameState.skins.unlocked.includes(skinId)) {
                gameState.skins.unlocked.push(skinId);
                window.EspooClicker.showToast(`Nuova Skin Riscattata: ${gameData.skins[skinId].name}!`, 'success');
            }
        }
        else if (data.reward.type === 'multiplier') {
            window.EspooClicker.showToast(`Riscattato: Bonus BPS Attivo!`, toastType);
        }
    }
    state.claimed = true;
    playSound('sound-buy');
    recalculateCPS();
    window.EspooClicker.saveGame();
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