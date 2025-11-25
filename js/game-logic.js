// --------- 3. FUNZIONI AUDIO ---------
function playSound(id) {
    const sound = document.getElementById(id);
    if (!sound) return;

    // Verifica che l'utente abbia attivato il suono nelle impostazioni
    if (gameState.user.masterVolume <= 0) return;

    try {
        sound.volume = gameState.user.masterVolume;
        sound.currentTime = 0;

        // Definiamo la promise esplicitamente
        const playPromise = sound.play();

        // Gestione moderna dei browser che bloccano l'autoplay
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                // Ignoriamo silenziosamente l'errore di autoplay
                // (succede se l'utente non ha ancora interagito con la pagina)
            });
        }
    } catch (e) {
        // Catch generico per evitare crash
        console.warn("Audio error ignorato:", e);
    }
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
function applySkinVisuals(skinId) {
    const data = gameData.skins[skinId];

    // Se la skin non esiste (magari salvataggio vecchio), usa default
    if (!data) {
        applySkinVisuals('default');
        return;
    }

    const photoNormal = document.getElementById('manager-photo-normal');
    const photoClicked = document.getElementById('manager-photo-clicked');

    if (photoNormal) {
        photoNormal.src = `./image/${data.img}`;
        // Rimuovi filtri residui se c'erano
        photoNormal.style.filter = 'none';
    }

    if (photoClicked) {
        photoClicked.src = `./image/${data.imgClick}`;
        photoClicked.style.filter = 'none';
    }
}

// --------- 4. FUNZIONI DI GIOCO PRINCIPALI ---------
function calculateBulkCost(teamKey, amount) {
    const data = gameData.teams[teamKey];
    const state = gameState.teams[teamKey];
    const r = 1.20;

    let discountMultiplier = 1;
    let achievementsBPSBonus = 0;

    if (gameState.prestigeUpgrades.outsourcing && gameState.prestigeUpgrades.outsourcing.count > 0) {
        let discount = gameState.prestigeUpgrades.outsourcing.count * 0.01;
        discountMultiplier = 1 - discount;
    }

    let discountedBaseCost = data.baseCost * discountMultiplier;
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

    prestigeBonus = 1 + baseBonus + synergyBonus + achievementsBPSBonus; // <- Ora funziona
}

function calculateClickCPSBonus() {
    clickCPSBonus = 1;
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
        // --- FIX CRASH: Iteriamo su gameData invece che su gameState ---
        for (const enhanceKey in gameData.buildingEnhancements) {
            // Sicurezza: Controlliamo se l'upgrade esiste nello stato attuale
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
    isBluescreenActive = true;
    bluescreenMultiplier = multiplier;
    document.body.classList.add('bluescreen-active');

    recalculateCPS();
    refreshAllStores();

    eventMultiplierDisplay.textContent = `ERRORE DI SISTEMA! x${multiplier}!`;
    eventMultiplierDisplay.style.display = 'block';
    playSound('sound-bluescreen');

    setTimeout(() => {
        isBluescreenActive = false;
        bluescreenMultiplier = 1;
        document.body.classList.remove('bluescreen-active');
        eventMultiplierDisplay.style.display = 'none';

        recalculateCPS();
        refreshAllStores();
        try {
            soundBluescreen.pause();
            soundBluescreen.currentTime = 0;
        } catch (e) { }
    }, 30000);
}


function clickCookie(event) {
    if (event.detail === 0) return;
    if (clickerButton) clickerButton.blur();
    playSound('sound-click');

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

    showClickFeedback(event);

    clickerButton.classList.add('clicked');
    setTimeout(() => { clickerButton.classList.remove('clicked'); }, 100);

    // --- FIX: Aggiorna il negozio Click in tempo reale ---
    if (typeof updateClickStore === 'function') {
        updateClickStore();
    }
    // ----------------------------------------------------

    updateUI();
}

function calculateMaxAffordable(teamKey) {
    const state = gameState.teams[teamKey];
    const data = gameData.teams[teamKey];
    const r = 1.20;

    // Calcolo sconto (copiato da calculateBulkCost)
    let discountMultiplier = 1;
    if (gameState.prestigeUpgrades.outsourcing && gameState.prestigeUpgrades.outsourcing.count > 0) {
        let discount = gameState.prestigeUpgrades.outsourcing.count * 0.01;
        discountMultiplier = 1 - discount;
    }
    let discountedBaseCost = data.baseCost * discountMultiplier;

    // Costo del prossimo singolo edificio
    const currentSingleCost = Math.floor(discountedBaseCost * Math.pow(r, state.count));

    if (gameState.score < currentSingleCost) return 0;

    // Formula inversa della somma geometrica: n = log(1 + (Score * (r-1) / CostoBase)) / log(r)
    // Serve a trovare quanti ne puoi comprare in blocco con i tuoi soldi attuali
    const maxAmount = Math.floor(Math.log(1 + (gameState.score * (r - 1) / currentSingleCost)) / Math.log(r));

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
    if (gameState.prestigeUpgrades.paracadute && gameState.prestigeUpgrades.paracadute.purchased) {
        startBonusBugs = Math.floor(gameState.totalScore * 0.05);
    }

    // Salva i dati che devono persistere
    let oldAchievements = JSON.parse(JSON.stringify(gameState.achievements));
    let oldPrestigeUpgrades = JSON.parse(JSON.stringify(gameState.prestigeUpgrades));
    let oldTotalResets = gameState.totalResets + 1;
    let oldGoldenBugs = gameState.totalGoldenBugsClicked;
    let oldPlayTime = gameState.totalPlayTime;
    let oldLifetimeScore = gameState.lifetimeScore;
    let oldUser = gameState.user;

    // ATTESA SCENICA (1.5 secondi)
    // Diamo tempo all'utente di vedere l'animazione "Promozione in corso"
    await new Promise(r => setTimeout(r, 1500));

    // 4. RESET DELLO STATO (Soft Reset)
    let newState = createNewGameState();

    // Re-inietta i dati persistenti
    newState.prestigePoints = newPrestigePoints;
    newState.lifetimePrestigePoints = newLifetimePrestigePoints;

    if (startBonusBugs > 0) {
        newState.score = startBonusBugs;
        newState.totalScore = startBonusBugs;
    }

    newState.achievements = oldAchievements;
    newState.prestigeUpgrades = oldPrestigeUpgrades;
    newState.totalResets = oldTotalResets;
    newState.totalGoldenBugsClicked = oldGoldenBugs;
    newState.totalPlayTime = oldPlayTime;
    newState.lifetimeScore = oldLifetimeScore;
    newState.user = oldUser;
    newState.lastSaveTimestamp = Date.now();

    // Gestione bonus "Accelerazione" (Start con 1 QA)
    if (newState.prestigeUpgrades.accelerazione.purchased) {
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
    calculateClickCPSBonus();
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

async function submitScoreToLeaderboard(username, score, prestigeLevel) {
    if (score < 500) return;

    // Recuperiamo la password dalla memoria volatile tramite l'API globale
    const password = window.EspooClicker ? window.EspooClicker.getPassword() : null;

    if (!password) {
        console.warn("Impossibile inviare punteggio: Password sessione non trovata.");
        return;
    }

    try {
        const response = await fetch('./php/submit_score.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: username,
                password: password, // Inviamo la password sicura
                score: Math.floor(score),
                prestigeLevel: prestigeLevel
            })
        });
        // Opzionale: gestire la risposta
    } catch (error) { console.error("Errore invio classifica:", error); }
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

// --------- 7. LOOP DI GIOCO E OBIETTIVI ---------

setInterval(() => {
    gameState.totalPlayTime += 1;
}, 1000);

setInterval(() => {
    checkAchievements();
}, 1500);

function gameLoop() {
    const scoreToAdd = cookiesPerSecond / 30;

    gameState.score += scoreToAdd;
    gameState.totalScore += scoreToAdd;
    gameState.lifetimeScore += scoreToAdd;

    const now = Date.now();
    clickHistory = clickHistory.filter(click => now - click.time < 1000);

    updateUI();
}

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
    const currentClickValue = (gameState.baseClickValue * prestigeBonus * bluescreenMultiplier) + clickValuePercentBonus;
    const bonus = (cookiesPerSecond * 30) + (currentClickValue * 10) + 10;

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