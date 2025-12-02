// --------- 3. FUNZIONI AUDIO AVANZATE ---------

// type può essere 'sfx' (default) o 'music'
function playSound(id, type = 'sfx') {
    const sound = document.getElementById(id);
    if (!sound) return;

    // Calcolo Volume Finale: Master * Canale Specifico
    const master = gameState.user.masterVolume;
    const channel = type === 'music' ? gameState.user.musicVolume : gameState.user.sfxVolume;

    // Se il volume finale è 0, non fare nulla
    if (master <= 0 || channel <= 0) {
        sound.pause(); // Ferma se stava andando
        return;
    }

    try {
        sound.volume = master * channel;

        // Se è un effetto sonoro breve, resettalo per poterlo spamamre
        if (type === 'sfx') {
            sound.currentTime = 0;
        }

        const playPromise = sound.play();
        if (playPromise !== undefined) {
            playPromise.catch(() => { }); // Ignora errori autoplay
        }
    } catch (e) { console.warn("Audio error:", e); }
}

// Funzione per aggiornare i volumi dei loop in corso (es. BlueScreen, Rick Roll)
function updateAmbientVolume() {
    const master = gameState.user.masterVolume;
    const music = gameState.user.musicVolume;
    const finalVol = master * music;

    // Aggiorna Blue Screen
    const bluescreen = document.getElementById('sound-bluescreen');
    if (bluescreen) bluescreen.volume = finalVol;

    // Aggiorna Rick Roll Video
    const rickVideo = document.getElementById('rick-roll-video');
    if (rickVideo) rickVideo.volume = finalVol;

    // --- AGGIUNTA MANCANTE ---
    const ricardoVideo = document.getElementById('ricardo-video');
    if (ricardoVideo) ricardoVideo.volume = finalVol;
}

// Funzione per acquistare Skin con Token Lab
function buySkin(skinId) {
    const data = gameData.skins[skinId];

    // Controlli di sicurezza
    if (!data || !data.cost || data.cost === 0) return;
    if (gameState.skins.unlocked.includes(skinId)) return; // Già posseduta

    if (gameState.prestigePoints >= data.cost) {
        // Transazione
        gameState.prestigePoints -= data.cost;
        gameState.skins.unlocked.push(skinId);

        if (typeof playSound === 'function') playSound('sound-buy');
        window.EspooClicker.showToast(`👕 Skin Acquistata: ${data.name}!`, 'success');

        // Equipaggia subito
        equipSkin(skinId);

        // Salva e aggiorna
        window.EspooClicker.saveGame();
        if (typeof updatePrestigeUI === 'function') updatePrestigeUI(); // Aggiorna contatore token
        if (typeof updateSkinsUI === 'function') updateSkinsUI(); // Aggiorna Guardaroba
    } else {
        window.EspooClicker.showToast(`❌ Token insufficienti! Te ne servono ${data.cost}.`, 'error');
    }
}


// --------- 4. FUNZIONI DI GIOCO PRINCIPALI ---------
function calculateBulkCost(teamKey, amount) {
    const data = gameData.teams[teamKey];
    const state = gameState.teams[teamKey];

    // Logica Scaling (Contrattazione)
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

    // Ciclo sui Teams
    for (const key in gameState.teams) {
        // Sicurezza: Se il team esiste nel save ma non nei dati (o viceversa), salta
        if (!gameState.teams[key] || !gameData.teams[key]) continue;

        const state = gameState.teams[key];
        const data = gameData.teams[key];

        let teamBPS = state.count * data.cpsPerUnit;

        // Ciclo sulle Migliorie (Enhancements)
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

    // Bonus Click Automatico
    if (gameState.clickUpgrades && gameState.clickUpgrades.clickAutomatico && gameState.clickUpgrades.clickAutomatico.purchased) {
        baseCPS += gameState.teams.assistenteQa.count;
    }

    cookiesPerSecond = baseCPS * prestigeBonus * clickCPSBonus * bluescreenMultiplier * crunchTimeMultiplier;
}

function activateCrunchTime() {
    const now = Date.now();
    // Se è attivo o in cooldown, esci
    if (now < crunchTimeCooldownEnd || now < crunchTimeEndTime) return;

    // [MODIFICA] Potenza aumentata: da 3 a 7 (o 10 se vuoi esagerare)
    crunchTimeMultiplier = 7;

    // Durata: 30 secondi
    crunchTimeEndTime = now + 30000;

    // Cooldown: 5 minuti (300.000 ms)
    crunchTimeCooldownEnd = now + 300000;

    // Aggiorna subito il gameState per evitare exploit con F5 immediato
    gameState.crunchTimeEndTime = crunchTimeEndTime;
    gameState.crunchTimeCooldownEnd = crunchTimeCooldownEnd;
    if (window.EspooClicker) window.EspooClicker.saveGame(); // Salva su disco

    playSound('sound-achievement');
    recalculateCPS();
    refreshAllStores();
    updateUI();
    window.EspooClicker.showToast("🔥 CRUNCH TIME ATTIVATO! BPS x7! 🔥");
}


function triggerBluescreen(multiplier) {
    // 1. GESTIONE SKIN SPECIALI (con probabilità)

    // Se hai Rick Espley equipaggiato
    if (gameState.skins.current === 'rick') {
        // 50% di probabilità di fare il Rick Roll
        // L'altro 50% farà il normale Blue Screen (il codice prosegue sotto)
        if (Math.random() < 0.5) {
            triggerRickRoll(multiplier);
            return;
        }
    }

    // Se hai Ricardo Milespo equipaggiato
    if (gameState.skins.current === 'ricardo') {
        // 50% di probabilità di fare il Ricardo Event
        if (Math.random() < 0.5) {
            triggerRicardoEvent();
            return;
        }
    }

    // 2. LOGICA STANDARD 404 (BLUE SCREEN)
    // Se non è scattato l'evento speciale sopra, eseguiamo questo:
    isBluescreenActive = true;
    bluescreenMultiplier = multiplier;
    document.body.classList.add('bluescreen-active');

    recalculateCPS();

    // Aggiorna UI se esiste la funzione (gestisce il refresh grafico immediato)
    if (typeof refreshAllStores === 'function') refreshAllStores();

    // Mostra il moltiplicatore a schermo
    const emDisplay = document.getElementById('event-multiplier-display');
    if (emDisplay) {
        emDisplay.textContent = `ERRORE DI SISTEMA! x${multiplier}!`;
        emDisplay.style.display = 'block';
    }

    // Suono Errore
    // [FIX] Ora usa il canale 'music' (quindi rispetta lo slider Musica)
    playSound('sound-bluescreen', 'music');

    // Timer fine evento (30 secondi standard)
    setTimeout(() => {
        stopBluescreenEffect();
    }, 30000);
}


function triggerRickRoll(multiplier) {
    const video = document.getElementById('rick-roll-video');
    if (!video) return;

    let rickMultiplier = Math.max(multiplier, 2);

    isBluescreenActive = true;
    bluescreenMultiplier = rickMultiplier;

    recalculateCPS();
    updateUI();

    document.body.classList.add('rick-rolling');

    const emDisplay = document.getElementById('event-multiplier-display');
    if (emDisplay) {
        emDisplay.textContent = `🔥 RICK BONUS: BPS x${rickMultiplier} 🔥`;
        emDisplay.style.display = 'block';
    }

    video.style.display = 'block';
    video.currentTime = 0;

    // [FIX] Calcolo volume: Master * Musica
    video.volume = gameState.user.masterVolume * gameState.user.musicVolume;

    try {
        const bgMusic = document.getElementById('sound-bg');
        if (bgMusic) bgMusic.pause();
    } catch (e) { }

    video.play().catch(e => console.warn("Autoplay bloccato", e));

    window.EspooClicker.showToast(`🎵 NEVER GONNA GIVE YOU UP! 🎵`, 'achievement');

    const videoClickHandler = (e) => { clickCookie(e); };
    video.addEventListener('mousedown', videoClickHandler);
    video.addEventListener('touchstart', videoClickHandler, { passive: true });

    const duration = 60000;

    setTimeout(() => {
        document.body.classList.remove('rick-rolling');
        video.pause();
        video.style.display = 'none';
        video.removeEventListener('mousedown', videoClickHandler);
        video.removeEventListener('touchstart', videoClickHandler);
        stopBluescreenEffect();
    }, duration);
}

// EVENTO LEGGENDARIO: RICARDO MILESPO
function triggerRicardoEvent() {
    const video = document.getElementById('ricardo-video');
    if (!video) return;

    let bonusMult = Math.floor(Math.random() * 8) + 3;

    isBluescreenActive = true;
    bluescreenMultiplier = bonusMult;

    recalculateCPS();
    updateUI();

    document.body.classList.add('rick-rolling');

    const emDisplay = document.getElementById('event-multiplier-display');
    if (emDisplay) {
        emDisplay.textContent = `🔥 FLEX BONUS: BPS x${bonusMult} 🔥`;
        emDisplay.style.display = 'block';
    }

    video.style.display = 'block';
    video.currentTime = 0;

    // [FIX] Calcolo volume: Master * Musica
    video.volume = gameState.user.masterVolume * gameState.user.musicVolume;

    try {
        const bgMusic = document.getElementById('sound-bg');
        if (bgMusic) bgMusic.pause();
    } catch (e) { }

    video.play().catch(e => console.warn("Autoplay bloccato", e));

    window.EspooClicker.showToast(`💪 PURE POWER! (x${bonusMult}) 💪`, 'achievement');

    const videoClickHandler = (e) => { clickCookie(e); };
    video.addEventListener('mousedown', videoClickHandler);
    video.addEventListener('touchstart', videoClickHandler, { passive: true });

    const duration = 45000;

    setTimeout(() => {
        document.body.classList.remove('rick-rolling');
        video.pause();
        video.style.display = 'none';
        video.removeEventListener('mousedown', videoClickHandler);
        video.removeEventListener('touchstart', videoClickHandler);
        stopBluescreenEffect();
    }, duration);
}

// Funzione Helper per pulire (condivisa tra 404 normale e Rick)
function stopBluescreenEffect() {
    isBluescreenActive = false;
    bluescreenMultiplier = 1;

    document.body.classList.remove('bluescreen-active');

    const emDisplay = document.getElementById('event-multiplier-display');
    if (emDisplay) emDisplay.style.display = 'none';

    recalculateCPS();
    refreshAllStores();

    try {
        const soundBluescreen = document.getElementById('sound-bluescreen');
        if (soundBluescreen) { soundBluescreen.pause(); soundBluescreen.currentTime = 0; }
    } catch (e) { }
}


function clickCookie(event) {
    if (event.detail === 0) return;
    if (clickerButton) clickerButton.blur();

    // --- 🔊 NUOVO: LOGICA AUDIO GLITCH ---
    if (isBluescreenActive) {
        const sound = document.getElementById('sound-click');
        if (sound) {
            // Cambia la velocità di riproduzione a caso tra 0.2x (lento/cupo) e 1.8x (veloce/acuto)
            sound.playbackRate = 0.2 + Math.random() * 1.6;

            // Opzionale: volume instabile per accentuare il glitch
            // (mantiene il volume master come base massima)
            sound.volume = Math.max(0, Math.min(1, gameState.user.masterVolume * (0.5 + Math.random())));

            sound.currentTime = 0;
            sound.play().catch(e => { }); // Ignora errori di autoplay
        }
    } else {
        // Reset fondamentale: se l'evento finisce, il suono deve tornare normale!
        const sound = document.getElementById('sound-click');
        if (sound && sound.playbackRate !== 1) {
            sound.playbackRate = 1;
            sound.volume = gameState.user.masterVolume;
        }
        playSound('sound-click');
    }
    // ------------------------------------

    // --- LOGICA PUNTEGGIO (Invariata) ---
    let clickBonusPercent = 0.01;
    if (gameState.clickUpgrades.clickDivino.purchased) clickBonusPercent = 0.02;
    let clickValuePercentBonus = 0;
    if (gameState.clickUpgrades.manoBionica.purchased) {
        clickValuePercentBonus = (cookiesPerSecond / (prestigeBonus * bluescreenMultiplier)) * clickBonusPercent;
    }
    const currentClickValue = (gameState.baseClickValue * prestigeBonus * bluescreenMultiplier) + clickValuePercentBonus;

    clickHistory.push({ time: Date.now(), value: currentClickValue });

    gameState.score += currentClickValue;
    gameState.totalScore += currentClickValue;
    gameState.lifetimeScore += currentClickValue;
    gameState.totalClicks++;

    // --- EFFETTI VISIVI (Particelle, Feedback, ecc.) ---

    // 1. Calcolo coordinate
    let x, y;
    if (event.clientX && event.clientY) {
        const rect = document.getElementById('clicker-section').getBoundingClientRect();
        // Coordinate assolute pagina per le particelle (append al body)
        x = event.pageX;
        y = event.pageY;
    } else {
        const rect = clickerButton.getBoundingClientRect();
        x = rect.left + rect.width / 2;
        y = rect.top + rect.height / 2;
    }

    // 2. Particelle (Se la funzione esiste)
    if (typeof createClickParticles === 'function') {
        // Calcolo relativo per il container feedback
        const containerRect = document.getElementById('click-feedback-container').getBoundingClientRect();
        const relX = (event.clientX || (x - window.scrollX)) - containerRect.left;
        const relY = (event.clientY || (y - window.scrollY)) - containerRect.top;
        createClickParticles(relX, relY);
    }

    // 3. Feedback Testuale
    showClickFeedback(event);

    // 4. Animazione Bottone
    clickerButton.classList.remove('click-shrink');
    clickerButton.classList.remove('clicked'); // Reset preventivo

    void clickerButton.offsetWidth; // Trigger reflow (resetta l'animazione)

    clickerButton.classList.add('click-shrink'); // Effetto "rimbalzo"
    clickerButton.classList.add('clicked');      // Effetto "cambio immagine" (CSS opacity)

    setTimeout(() => {
        clickerButton.classList.remove('click-shrink');
        clickerButton.classList.remove('clicked'); // Torna all'immagine normale
    }, 100); // 100ms di durata

    // --- AGGIORNAMENTO UI ---
    if (typeof updateClickStore === 'function') updateClickStore();
    updateUI();
}

function calculateMaxAffordable(teamKey) {
    const state = gameState.teams[teamKey];
    const data = gameData.teams[teamKey];

    // --- FIX 1: CALCOLO DINAMICO DI R (Sincronizzato con Contrattazione) ---
    // Prima era hardcodato a 1.20, ora legge il potenziamento reale
    let scalingBase = 1.20;
    if (gameState.prestigeUpgrades && gameState.prestigeUpgrades.contrattazione && gameState.prestigeUpgrades.contrattazione.count > 0) {
        let reduction = gameState.prestigeUpgrades.contrattazione.count * 0.01;
        scalingBase = Math.max(1.05, scalingBase - reduction);
    }
    const r = scalingBase;
    // -------------------------------------------------------------------

    let discountedBaseCost = data.baseCost;

    // Calcolo del costo del prossimo singolo edificio
    const currentSingleCost = Math.floor(discountedBaseCost * Math.pow(r, state.count));

    // Se non puoi permetterti nemmeno uno, ritorna 0
    if (gameState.score < currentSingleCost) return 0;

    // --- FORMULA GEOMETRICA INVERSA ---
    // CostoTotale = CostoBase * (r^n - 1) / (r - 1)
    // Risolviamo per n

    let maxAmount = 0;

    // Caso limite matematico (se r fosse 1, ma qui è min 1.05)
    if (Math.abs(r - 1) < 0.0000001) {
        maxAmount = Math.floor(gameState.score / currentSingleCost);
    } else {
        maxAmount = Math.floor(Math.log(1 + (gameState.score * (r - 1) / currentSingleCost)) / Math.log(r));
    }

    // Ricalcoliamo il costo esatto per la quantità trovata
    let realCost = currentSingleCost * (Math.pow(r, maxAmount) - 1) / (r - 1);

    // Se il costo supera i soldi (anche di poco), riduciamo la quantità di 1 finché non rientra
    // Usiamo un while per sicurezza assoluta, ma di solito basta 1 iterazione.
    while (maxAmount > 0 && Math.floor(realCost) > gameState.score) {
        maxAmount--;
        realCost = currentSingleCost * (Math.pow(r, maxAmount) - 1) / (r - 1);
    }

    return Math.max(0, maxAmount);
}

function buyTeam(teamKey) {
    // Determina la quantità
    let amount = buyMultiplier;
    if (amount === 'MAX') {
        amount = calculateMaxAffordable(teamKey);
        if (amount === 0) return; // Non puoi permettertene nemmeno uno
    }

    const state = gameState.teams[teamKey];
    const currentCost = calculateBulkCost(teamKey, amount);

    if (gameState.score >= currentCost) {
        playSound('sound-buy');
        gameState.score -= currentCost;
        state.count += amount; // Usa amount calcolato
        recalculateCPS();
        refreshAllStores();
        window.EspooClicker.saveGame();
        updateUI();
    }
}

function buyClickUpgrade(upgradeKey) {
    const state = gameState.clickUpgrades[upgradeKey];
    const data = gameData.clickUpgrades[upgradeKey];

    if (gameState.score >= data.cost && !state.purchased) {
        playSound('sound-buy');
        gameState.score -= data.cost;
        gameState.baseClickValue += data.clickIncrease;

        if (upgradeKey === 'hacking') goldenBugChance *= 2;
        if (upgradeKey === 'doppioClick') gameState.baseClickValue *= 2;
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
            if (upgradeKey === 'ticketPremium') goldenBugSpawnTime *= 0.5;
            calculatePrestigeBonus();
            recalculateCPS();
            refreshAllStores();
            window.EspooClicker.saveGame();
            updateUI();
        }
    }
}

// --------- 5. FUNZIONI DI PRESTIGIO ---------

function calculatePrestigeGained() {
    return Math.floor(Math.sqrt(gameState.totalScore / 2000000) * 1.0);
}

// 1. Apre il modale e mostra i dati (NON Resetta ancora)
function openPrestigeContract() {
    const gained = calculatePrestigeGained();
    if (gained < 1) {
        if (window.EspooClicker && window.EspooClicker.showToast) {
            window.EspooClicker.showToast("Devi accumulare più bug per ottenere una promozione!");
        } else {
            alert("Devi accumulare più bug per ottenere una promozione!");
        }
        return;
    }
    const tokenDisplay = document.getElementById('contract-gain-token');
    const bonusDisplay = document.getElementById('contract-gain-bonus');
    if (tokenDisplay) tokenDisplay.textContent = `+${formatNumber(gained)}`;

    let currentLifetime = gameState.lifetimePrestigePoints || 0;
    let estimatedLifetime = currentLifetime + gained;
    let baseBonus = estimatedLifetime * 0.01;
    let synergyCount = gameState.prestigeUpgrades.sinergia.count;
    let synergyBonus = synergyCount * gameData.prestigeUpgrades.sinergia.bonusPerLevel * estimatedLifetime;
    let totalPercent = ((baseBonus + synergyBonus) * 100).toFixed(1);

    if (bonusDisplay) bonusDisplay.textContent = `Nuovo Totale: +${totalPercent}%`;

    const modal = document.getElementById('prestige-modal');
    if (modal) modal.style.display = 'flex';
}

// 2. Esegui il reset (Chiamata dal bottone "Firma")
async function executePrestige() {
    const overlay = document.getElementById('prestige-transition-overlay');
    const modal = document.getElementById('prestige-modal');

    // 1. Chiudi modale contratto
    if (modal) modal.style.display = 'none';

    // 2. Avvia Animazione Overlay
    if (overlay) {
        overlay.style.display = 'flex';
        // Timeout breve per permettere al browser di renderizzare il display:flex prima dell'opacity
        setTimeout(() => overlay.classList.add('active'), 10);
    }

    // 3. Calcoli di Prestigio (Back-end logic)
    const gained = calculatePrestigeGained();
    let newPrestigePoints = gameState.prestigePoints + gained;
    let currentLifetime = gameState.lifetimePrestigePoints !== undefined ? gameState.lifetimePrestigePoints : gameState.prestigePoints;
    let newLifetimePrestigePoints = currentLifetime + gained;

    let startBonusBugs = 0;

    if (gameState.prestigeUpgrades.paracadute && gameState.prestigeUpgrades.paracadute.count > 0) {
        // 2000 bug per livello
        startBonusBugs = gameState.prestigeUpgrades.paracadute.count * 2000;
    }



    // Salva i dati che devono persistere
    let oldAchievements = JSON.parse(JSON.stringify(gameState.achievements));
    let oldPrestigeUpgrades = JSON.parse(JSON.stringify(gameState.prestigeUpgrades));
    let oldSkins = JSON.parse(JSON.stringify(gameState.skins)); // <--- AGGIUNTO: Salva le skin attuali
    let oldTotalResets = gameState.totalResets + 1;
    let oldTotalClicks = gameState.totalClicks;
    let oldGoldenBugs = gameState.totalGoldenBugsClicked;
    let oldPlayTime = gameState.totalPlayTime;
    let oldLifetimeScore = gameState.lifetimeScore;
    let oldUser = gameState.user;

    // ATTESA SCENICA (1.5 secondi)
    // Diamo tempo all'utente di vedere l'animazione "Promozione in corso"
    await new Promise(r => setTimeout(r, 1500));

    // 4. RESET DELLO STATO (Soft Reset)
    let newState = createNewGameState();

    if (gameState.prestigeUpgrades.eredita && gameState.prestigeUpgrades.eredita.count > 0) {
        // Mantieni N Assistenti QA
        newState.teams.assistenteQa.count = gameState.prestigeUpgrades.eredita.count;
    }

    // Re-inietta i dati persistenti
    newState.prestigePoints = newPrestigePoints;
    newState.lifetimePrestigePoints = newLifetimePrestigePoints;

    if (startBonusBugs > 0) {
        newState.score = startBonusBugs;
        newState.totalScore = startBonusBugs;
    }

    newState.achievements = oldAchievements;
    newState.prestigeUpgrades = oldPrestigeUpgrades;
    newState.skins = oldSkins; // <--- AGGIUNTO: Ripristina le skin
    newState.totalResets = oldTotalResets;
    newState.totalClicks = oldTotalClicks;
    newState.totalGoldenBugsClicked = oldGoldenBugs;
    newState.totalPlayTime = oldPlayTime;
    newState.lifetimeScore = oldLifetimeScore;
    newState.user = oldUser;
    newState.lastSaveTimestamp = Date.now();

    // Gestione bonus "Accelerazione" (Start con 1 QA)
    if (newState.prestigeUpgrades.accelerazione && newState.prestigeUpgrades.accelerazione.purchased) {
        newState.teams.assistenteQa.count = 1;
    }

    // Sovrascrivi la variabile globale gameState
    // Nota: Usiamo Object.assign per mantenere il riferimento dell'oggetto se necessario, 
    // ma qui sostituiamo proprio le proprietà per sicurezza.
    gameState = newState;

    // Reset Variabili Temporanee Logic
    cookiesPerSecond = 0;
    clickHistory = []; // Pulisce il grafico BPS
    isBluescreenActive = false;
    bluescreenMultiplier = 1;
    document.body.classList.remove('bluescreen-active'); // Rimuove sfondo blu se c'era
    try {
        const soundBluescreen = document.getElementById('sound-bluescreen');
        if (soundBluescreen) { soundBluescreen.pause(); soundBluescreen.currentTime = 0; }
    } catch (e) { }

    // 5. AGGIORNAMENTO UI TOTALE
    calculatePrestigeBonus(); // Ricalcola i bonus base
    recalculateCPS();

    // Forza il refresh grafico di tutti i negozi (resetta classi 'purchased', barre progresso, costi)
    refreshAllStores();
    updateUI();

    // Salva il nuovo stato pulito
    if (window.EspooClicker && window.EspooClicker.saveGame) window.EspooClicker.saveGame();

    // 6. Rimuovi Overlay
    if (overlay) {
        overlay.classList.remove('active');
        setTimeout(() => {
            overlay.style.display = 'none';
            if (window.EspooClicker && window.EspooClicker.showToast) {
                window.EspooClicker.showToast("Promozione completata! Buon lavoro!");
            }
        }, 500); // Aspetta la fine della transizione CSS (0.5s)
    }
}

// In template/js/game-logic.js

async function submitScoreToLeaderboard(username) {
    // Nota: Score e Prestige non vengono più passati come parametri.
    // Il server li prenderà dal salvataggio nel database per sicurezza.

    const password = window.EspooClicker ? window.EspooClicker.getPassword() : null;

    if (!password || !username) return;

    // Inviamo il salvataggio PRIMA di aggiornare la classifica per essere sicuri
    // che il DB abbia i dati più freschi.
    if (window.EspooClicker && window.EspooClicker.saveGame) {
        await window.EspooClicker.saveGame();
    }

    try {
        const response = await fetch('./php/submit_score.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: username,
                password: password
                // Non inviamo più score o prestigeLevel qui!
            })
        });
        // const res = await response.json();
        // console.log("Leaderboard sync:", res); // Debug opzionale
    } catch (error) {
        console.warn("Sync classifica fallito (offline?)");
    }
}

function createNewGameState() {
    // 1. Ottieni una copia fresca e COMPLETA dallo stato iniziale definito in game-data.js
    // Questo assicura che se aggiungi nuovi edifici/upgrade lì, appariranno anche qui.
    const freshState = getInitialGameState();

    // Facciamo una deep copy per evitare riferimenti condivisi
    const newState = JSON.parse(JSON.stringify(freshState));

    // 2. Ripristina SOLO ciò che deve persistere tra i reset
    // Mantiene gli achievement sbloccati (come da standard Prestige)
    // Nota: Usiamo una copia sicura anche qui
    newState.achievements = JSON.parse(JSON.stringify(gameState.achievements));

    // Mantiene le impostazioni utente (volume, nome)
    newState.user = JSON.parse(JSON.stringify(gameState.user));

    // Mantiene i filtri dei negozi
    if (gameState.filterSettings) {
        newState.filterSettings = JSON.parse(JSON.stringify(gameState.filterSettings));
    }

    // Nota: PrestigePoints e Upgrade Prestigio vengono reiniettati 
    // esplicitamente dentro la funzione executePrestige(), quindi non serve farlo qui.

    return newState;
}

// --------- 7. LOOP DI GIOCO E OBIETTIVI ---------

function checkAchievements() {
    // FIX: Calcola il bonus BPS totale dagli obiettivi all'inizio
    let totalAchBPSBonus = 0;
    const isPostPrestige = gameState.totalResets > 0; // Check per il requisito di Prestigio

    for (const key in gameData.achievements) {
        const data = gameData.achievements[key];

        // Inizializza se manca
        if (!gameState.achievements[key]) {
            gameState.achievements[key] = { unlocked: false, claimed: false };
        }
        if (gameState.achievements[key].claimed === undefined) {
            gameState.achievements[key].claimed = false;
        }

        const state = gameState.achievements[key];

        // Se l'achievement ha un premio (data.reward) E non è post-prestigio, salta il check per ora.
        // Questo impedisce che l'utente sblocchi i bonus BPS prima del primo reset.
        if (data.reward && data.reward.type === 'multiplier' && !isPostPrestige) {
            continue;
        }

        // 1. Sblocca se condizione vera e non ancora sbloccato
        if (!state.unlocked && data.condition()) {
            unlockAchievement(key);
        }

        // 2. Calcola il Bonus BPS dagli achievement già RISCATTATI
        if (state.claimed && data.reward && data.reward.type === 'multiplier') {
            totalAchBPSBonus += (data.reward.value - 1); // Somma solo la parte bonus (es. x1.1 -> 0.1)
        }
    }

    // Aggiorna il bonus globale e ricalcola
    achievementsBPSBonus = totalAchBPSBonus;
    calculatePrestigeBonus(); // Chiama il ricalcolo combinato
}

function unlockAchievement(key) {
    const data = gameData.achievements[key];
    gameState.achievements[key].unlocked = true;
    gameState.achievements[key].unlockTime = Date.now();

    // FIX: Se NON c'è un premio, segnalo subito come riscattato/completato
    if (!data.reward) {
        gameState.achievements[key].claimed = true;
    } else {
        gameState.achievements[key].claimed = false;
    }

    playSound('sound-achievement');

    // Messaggio diverso in base al premio
    let msg = `🏆 Sbloccato: ${data.name}`;
    if (data.reward) msg += " (Premio disponibile!)";

    window.EspooClicker.showToast(msg);

    window.EspooClicker.saveGame();

    if (typeof updateAchievementsUI === 'function') updateAchievementsUI();
}

// NUOVA FUNZIONE: RISCATTA PREMIO
function claimAchievementReward(key) {
    const state = gameState.achievements[key];
    const data = gameData.achievements[key];

    if (!state || !state.unlocked || state.claimed) return;

    // Applica il premio
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
                window.EspooClicker.showToast(`Nuova Skin Riscattata: ${gameData.skins[skinId].name}!`, 'success'); // Skin è un successo!
            }
        }
        else if (data.reward.type === 'multiplier') {
            window.EspooClicker.showToast(`Riscattato: Bonus BPS Attivo!`, toastType);
        }
    }

    // Segna come riscattato
    state.claimed = true;
    playSound('sound-buy');

    recalculateCPS();
    window.EspooClicker.saveGame();

    if (typeof updateAchievementsUI === 'function') updateAchievementsUI();
    if (typeof updateSkinsUI === 'function') updateSkinsUI();
}

// --------- 8. TICKET CRITICO (GOLDEN BUG) ---------

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
}

function clickGoldenBug() {
    playSound('sound-achievement');
    gameState.totalGoldenBugsClicked++;

    let clickBonusPercent = 0.01;
    if (gameState.clickUpgrades.clickDivino.purchased) clickBonusPercent = 0.02;
    let clickValuePercentBonus = 0;
    if (gameState.clickUpgrades.manoBionica.purchased) {
        clickValuePercentBonus = (cookiesPerSecond / (prestigeBonus * bluescreenMultiplier)) * clickBonusPercent;
    }
    const currentClickValue = (gameState.baseClickValue * prestigeBonus * bluescreenMultiplier);
    let bonus = (cookiesPerSecond * 30) + (currentClickValue * 10) + 10;
    if (gameState.prestigeUpgrades.bugBounty && gameState.prestigeUpgrades.bugBounty.count > 0) {
        const bountyMult = 1 + (gameState.prestigeUpgrades.bugBounty.count * 0.20); // +20% per livello
        bonus *= bountyMult;
    }
    gameState.score += bonus;
    gameState.totalScore += bonus;
    gameState.lifetimeScore += bonus;

    showToast(`Ticket Critico Risolto! +${formatNumber(bonus)} bug!`);
    goldenBug.style.display = 'none';
    updateUI();
}

// --------- 11. EASTER EGG ---------

let originalTitle = document.title;
document.addEventListener('visibilitychange', () => {
    if (document.hidden) document.title = 'I bug si accumulano... 🐞';
    else document.title = originalTitle;
});