// --------- 3. FUNZIONI AUDIO ---------
function playSound(id) {
    try {
        const sound = document.getElementById(id);
        sound.volume = gameState.user.masterVolume; // Applica volume
        sound.currentTime = 0;
        sound.play();
    } catch (e) {
        // console.warn("Impossibile riprodurre il suono:", id);
    }
}

// --------- 4. FUNZIONI DI GIOCO PRINCIPALI ---------

function calculateBulkCost(buildingKey, amount) {
    const data = gameData.buildings[buildingKey];
    const state = gameState.buildings[buildingKey];
    const r = 1.15; 
    
    // --- LOGICA OUTSOURCING (SCONTO) ---
    let discountMultiplier = 1;
    if (gameState.prestigeUpgrades.outsourcing && gameState.prestigeUpgrades.outsourcing.count > 0) {
        // 1% di sconto per livello (max 30% per sicurezza, o illimitato se preferisci)
        let discount = gameState.prestigeUpgrades.outsourcing.count * 0.01;
        discountMultiplier = 1 - discount;
    }
    
    // Applica sconto al costo base
    let discountedBaseCost = data.baseCost * discountMultiplier;
    
    // Calcolo Costo
    const currentSingleCost = Math.floor(discountedBaseCost * Math.pow(r, state.count));
    
    if (amount === 1) {
        return Math.max(1, currentSingleCost); // Mai meno di 1 bug
    } else {
        const totalCost = currentSingleCost * (Math.pow(r, amount) - 1) / (r - 1);
        return Math.max(amount, Math.floor(totalCost));
    }
}

function calculateBuildingCost(buildingKey) {
    return calculateBulkCost(buildingKey, 1);
}

function calculatePrestigeBonus() {
    const pData = gameData.prestigeUpgrades;
    const pState = gameState.prestigeUpgrades;
    
    let baseBonus = gameState.lifetimePrestigePoints * 0.01;
    let synergyBonus = pState.sinergia.count * pData.sinergia.bonusPerLevel * gameState.lifetimePrestigePoints;
    prestigeBonus = 1 + baseBonus + synergyBonus;
    
}

function calculateClickCPSBonus() {
    clickCPSBonus = 1;
}

function recalculateCPS() {
    let baseCPS = 0;
    
    for (const key in gameState.buildings) {
        const state = gameState.buildings[key];
        const data = gameData.buildings[key];
        
        let buildingBPS = state.count * data.cpsPerUnit;

        for (const enhanceKey in gameState.buildingEnhancements) {
            const enhancementState = gameState.buildingEnhancements[enhanceKey];
            const enhancementData = gameData.buildingEnhancements[enhanceKey];
            
            if (enhancementState.purchased && enhancementData.targetBuilding === key) {
                buildingBPS *= enhancementData.multiplier;
            }
        }
        baseCPS += buildingBPS;
    }
    
    if (gameState.clickUpgrades.clickAutomatico.purchased) {
        baseCPS += gameState.buildings.assistenteQa.count; 
    }
    
    cookiesPerSecond = baseCPS * prestigeBonus * clickCPSBonus * bluescreenMultiplier * crunchTimeMultiplier;
}

function activateCrunchTime() {
    const now = Date.now();

    // Se è già attivo o in cooldown, esci
    if (now < crunchTimeCooldownEnd || now < crunchTimeEndTime) return;

    // ATTIVA
    crunchTimeMultiplier = 3;
    crunchTimeEndTime = now + 30000; // Dura 30 secondi
    crunchTimeCooldownEnd = now + 300000; // Ricarica 5 minuti (300s)

    playSound('sound-achievement'); // O un suono più epico se ne hai

    recalculateCPS();
    refreshAllStores(); // Aggiorna i BPS visualizzati nei negozi
    updateUI(); // Aggiorna subito la grafica

    // Feedback visivo immediato
    window.EspooClicker.showToast("🔥 CRUNCH TIME ATTIVATO! BPS x3! 🔥");
}

function triggerBluescreen(multiplier) {
    isBluescreenActive = true;
    bluescreenMultiplier = multiplier;
    document.body.classList.add('bluescreen-active');
    
    recalculateCPS();
    refreshAllStores(); // AGGIUNTO: Aggiorna i testi BPS visualizzati
    
    eventMultiplierDisplay.textContent = `ERRORE DI SISTEMA! x${multiplier}!`;
    eventMultiplierDisplay.style.display = 'block';

    playSound('sound-bluescreen'); 

    setTimeout(() => {
        isBluescreenActive = false;
        bluescreenMultiplier = 1;
        document.body.classList.remove('bluescreen-active');
        eventMultiplierDisplay.style.display = 'none'; 
        
        recalculateCPS();
        refreshAllStores(); // AGGIUNTO: Ripristina testi BPS
        
        try {
            soundBluescreen.pause(); 
            soundBluescreen.currentTime = 0;
        } catch(e) { /* fallisce silenziosamente */ }
    }, 30000);
}


function clickCookie(event) {
    if (event.detail === 0) return; 
    if (clickerButton) clickerButton.blur();
    playSound('sound-click');
    
    // Calcolo valore click (codice esistente)
    let clickBonusPercent = 0.01;
    if (gameState.clickUpgrades.clickDivino.purchased) clickBonusPercent = 0.02;
    let clickValuePercentBonus = 0;
    if (gameState.clickUpgrades.manoBionica.purchased) {
        clickValuePercentBonus = (cookiesPerSecond / (prestigeBonus * bluescreenMultiplier)) * clickBonusPercent; 
    }
    const currentClickValue = (gameState.baseClickValue * prestigeBonus * bluescreenMultiplier) + clickValuePercentBonus;
    
    // --- NUOVO: Aggiungi alla storia per il BPS dinamico ---
    clickHistory.push({ time: Date.now(), value: currentClickValue });
    // -------------------------------------------------------

    gameState.score += currentClickValue;
    gameState.totalScore += currentClickValue;
    
    // HIGHSCORE: Aggiorna il punteggio totale di sempre
    gameState.lifetimeScore += currentClickValue;
    
    gameState.totalClicks++;
    
    showClickFeedback(event);
    
    clickerButton.classList.add('clicked');
    setTimeout(() => { clickerButton.classList.remove('clicked'); }, 100);

    updateUI();
}

function buyBuilding(buildingKey) {
    const state = gameState.buildings[buildingKey];
    // Usa il moltiplicatore globale (1 o 10)
    const currentCost = calculateBulkCost(buildingKey, buyMultiplier);

    if (gameState.score >= currentCost) {
        playSound('sound-buy');
        gameState.score -= currentCost;
        
        // Aggiunge il numero corretto di edifici
        state.count += buyMultiplier;
        
        recalculateCPS();
        refreshAllStores(); // Aggiorna i prezzi (che ora saranno aumentati)
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
        
        if (upgradeKey === 'hacking') {
            goldenBugChance *= 2;
        }
        if (upgradeKey === 'doppioClick') {
            gameState.baseClickValue *= 2;
        }
        if (upgradeKey === 'clickAutomatico') {
            recalculateCPS();
        }
        
        state.purchased = true;
        
        refreshAllStores(); // AGGIUNTO
        window.EspooClicker.saveGame(); // AGGIUNTO
        updateUI();
    }
}

function buyBuildingEnhancement(enhanceKey) {
    const state = gameState.buildingEnhancements[enhanceKey];
    const data = gameData.buildingEnhancements[enhanceKey];

    if (gameState.score >= data.cost && !state.purchased) {
        playSound('sound-buy');
        gameState.score -= data.cost;
        state.purchased = true;
        
        recalculateCPS();
        refreshAllStores(); // AGGIUNTO
        window.EspooClicker.saveGame(); // AGGIUNTO
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
            
            refreshAllStores(); // AGGIUNTO
            window.EspooClicker.saveGame(); // AGGIUNTO
            updateUI();
        }
    } else {
        if (gameState.prestigePoints >= cost && !state.purchased) {
            playSound('sound-buy');
            gameState.prestigePoints -= cost;
            state.purchased = true;
            
            if (upgradeKey === 'ticketPremium') {
                goldenBugSpawnTime *= 0.5; 
            }
            
            calculatePrestigeBonus();
            recalculateCPS();
            
            refreshAllStores(); // AGGIUNTO
            window.EspooClicker.saveGame(); // AGGIUNTO
            updateUI();
        }
    }
}

// --------- 5. FUNZIONI DI PRESTIGIO ---------

function calculatePrestigeGained() {
    // Calcola i punti basati solo sui bug accumulati in QUESTA run (totalScore)
    return Math.floor(Math.sqrt(gameState.totalScore / 1000000) * 1.5);
}

// 1. Apre il modale e mostra i dati (NON Resetta ancora)
function openPrestigeContract() {
    const gained = calculatePrestigeGained();
    
    if (gained < 1) {
        // Usa il toast invece dell'alert brutto
        if(window.EspooClicker && window.EspooClicker.showToast) {
            window.EspooClicker.showToast("Devi accumulare più bug per ottenere una promozione!");
        } else {
            alert("Devi accumulare più bug per ottenere una promozione!");
        }
        return;
    }

    // Popola il modale con i dati
    const tokenDisplay = document.getElementById('contract-gain-token');
    const bonusDisplay = document.getElementById('contract-gain-bonus');
    
    if (tokenDisplay) tokenDisplay.textContent = `+${formatNumber(gained)}`;
    
    // Calcola il NUOVO bonus totale stimato per mostrarlo
    // Nota: Usiamo i punti attuali + guadagnati per la stima
    let currentLifetime = gameState.lifetimePrestigePoints || 0;
    let estimatedLifetime = currentLifetime + gained;
    
    // Ricalcola bonus base + sinergia
    let baseBonus = estimatedLifetime * 0.01;
    let synergyCount = gameState.prestigeUpgrades.sinergia.count;
    let synergyBonus = synergyCount * gameData.prestigeUpgrades.sinergia.bonusPerLevel * estimatedLifetime;
    let totalPercent = ((baseBonus + synergyBonus) * 100).toFixed(1);
    
    if (bonusDisplay) bonusDisplay.textContent = `Nuovo Totale: +${totalPercent}%`;

    // APRI IL MODALE
    const modal = document.getElementById('prestige-modal');
    if (modal) modal.style.display = 'flex';
}

// 2. Esegue il reset (Chiamata dal bottone "Firma")
async function executePrestige() {
    const gained = calculatePrestigeGained();
    
    // --- LOGICA DI RESET (Uguale a prima, ma senza confirm) ---
    
    // 1. CALCOLI
    let newPrestigePoints = gameState.prestigePoints + gained;
    let currentLifetime = gameState.lifetimePrestigePoints !== undefined ? gameState.lifetimePrestigePoints : gameState.prestigePoints;
    let newLifetimePrestigePoints = currentLifetime + gained;

    // Bonus Paracadute
    let startBonusBugs = 0;
    if (gameState.prestigeUpgrades.paracadute && gameState.prestigeUpgrades.paracadute.purchased) {
        startBonusBugs = Math.floor(gameState.totalScore * 0.05); 
    }

    // 2. BACKUP
    let oldAchievements = JSON.parse(JSON.stringify(gameState.achievements)); 
    let oldPrestigeUpgrades = JSON.parse(JSON.stringify(gameState.prestigeUpgrades));
    let oldTotalResets = gameState.totalResets + 1;
    let oldGoldenBugs = gameState.totalGoldenBugsClicked;
    let oldPlayTime = gameState.totalPlayTime;
    let oldLifetimeScore = gameState.lifetimeScore; 
    let oldUser = gameState.user; 
    
    // 3. RESET STATO
    let newState = createNewGameState(); 
    
    // 4. RIPRISTINO
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

    if (newState.prestigeUpgrades.accelerazione.purchased) {
        newState.buildings.assistenteQa.count = 1;
    }
    
    // 5. SALVA E RIAVVIA
    gameState = newState;
    localStorage.setItem('espotoolClickerSaveV8', JSON.stringify(gameState));
    
    // Chiudi modale (visivamente, anche se ricaricheremo)
    const modal = document.getElementById('prestige-modal');
    if(modal) modal.style.display = 'none';

    // Feedback immediato prima del reload
    if(window.EspooClicker && window.EspooClicker.showToast) {
        window.EspooClicker.showToast("Promozione Accettata! Riavvio in corso...");
    }

    if (window.EspooClicker && window.EspooClicker.saveGame) window.EspooClicker.saveGame();
    
    setTimeout(() => location.reload(), 1000); // 1 secondo per leggere il toast
}

async function submitScoreToLeaderboard(username, score, prestigeLevel) {
    if (score < 500) return; 

    try {
        const response = await fetch('./php/submit_score.php', { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                score: Math.floor(score), // Invia l'Highscore totale
                prestigeLevel: prestigeLevel 
            })
        });
        if (response.ok) {
            console.log("Punteggio inviato al Podio!");
        }
    } catch (error) {
        console.error("Impossibile inviare il punteggio al podio:", error);
    }
}

function createNewGameState() {
    return {
        score: 0,
        baseClickValue: 1,
        totalClicks: 0,
        totalScore: 0, // Punteggio della run corrente (si resetta)
        prestigePoints: 0,
        lifetimePrestigePoints: 0,
        totalResets: 0,
        totalGoldenBugsClicked: 0,
        totalPlayTime: 0,
        lifetimeScore: 0, // Highscore totale (da preservare)
        filterSettings: { click: 'available', auto: 'available', lab: 'available' },
        user: { username: 'Giocatore', masterVolume: 1.0 },
        buildings: {
            assistenteQa: { count: 0 }, jiraTicket: { count: 0 },
            teamQa: { count: 0 }, automazioneTest: { count: 0 },
            metodologiaAgile: { count: 0 }, aiDebugger: { count: 0 },
            quantumServer: { count: 0 }, 
            reteNeuraleGalattica: { count: 0 }, 
            debugTemporale: { count: 0 }
        },
        clickUpgrades: {
            caffeForte: { purchased: false }, tastieraErgonomica: { purchased: false },
            manoBionica: { purchased: false }, hacking: { purchased: false },
            doppioClick: { purchased: false }, clickAutomatico: { purchased: false },
            clickDivino: { purchased: false }
        },
        prestigeUpgrades: {
            sinergia: { count: 0 },
            accelerazione: { purchased: false },
            ticketPremium: { purchased: false }
        },
        buildingEnhancements: {
            caffeDoppio: { purchased: false }, caffeTriplo: { purchased: false },
            scrivanieErgonomiche: { purchased: false }, formazioneAvanzata: { purchased: false },
            managerJunior: { purchased: false }, jiraAI: { purchased: false },
            jiraCloud: { purchased: false }, jiraDataCenter: { purchased: false },
            jiraPremium: { purchased: false }, jiraSelfHealing: { purchased: false },
            scrum: { purchased: false }, teamLeader: { purchased: false },
            certificazioneISTQB: { purchased: false }, bonusProduttivita: { purchased: false },
            teamGlobale: { purchased: false }, selenium: { purchased: false },
            cucumber: { purchased: false }, ciCd: { purchased: false },
            docker: { purchased: false }, kubernetes: { purchased: false },
            kanban: { purchased: false }, safe: { purchased: false },
            productOwner: { purchased: false }, releaseTrain: { purchased: false },
            devOps: { purchased: false }, deepLearning: { purchased: false },
            machineLearning: { purchased: false }, retiNeurali: { purchased: false },
            quantumComputing: { purchased: false }, skynet: { purchased: false }
        },
        achievements: gameState.achievements
    };
}

// --------- 7. LOOP DI GIOCO E OBIETTIVI ---------

setInterval(() => {
    gameState.totalPlayTime += 1;
}, 1000);

function gameLoop() {
    const scoreToAdd = cookiesPerSecond / 10; // 10 volte al secondo
    
    gameState.score += scoreToAdd;
    gameState.totalScore += scoreToAdd;
    
    // HIGHSCORE: Aggiorna il punteggio totale di sempre
    gameState.lifetimeScore += scoreToAdd;
    
    // Rimuovi i click più vecchi di 1 secondo
    const now = Date.now();
    clickHistory = clickHistory.filter(click => now - click.time < 1000);
    
    checkAchievements();
    updateUI();
}

function checkAchievements() {
    for (const key in gameData.achievements) {
        const data = gameData.achievements[key];
        const state = gameState.achievements[key];
        if (!state.unlocked && data.condition()) {
            unlockAchievement(key);
        }
    }
}

function unlockAchievement(key) {
    playSound('sound-achievement');
    gameState.achievements[key].unlocked = true;
    showToast(`Obiettivo Sbloccato: ${gameData.achievements[key].name}`);
    renderAchievement(key);
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
    const rect = gameContainer.getBoundingClientRect();
    
    const spawnWidth = document.getElementById('left-column').clientWidth + document.getElementById('center-column').clientWidth;
    const spawnHeight = document.getElementById('left-column').clientHeight;
    
    const x = Math.random() * (spawnWidth - 50); 
    const y = Math.random() * (spawnHeight - 50);

    goldenBug.style.left = `${rect.left + x}px`;
    goldenBug.style.top = `${rect.top + y}px`;
    goldenBug.style.display = 'block';

    setTimeout(() => {
        goldenBug.style.display = 'none';
    }, 10000); 
    
    scheduleGoldenBug(); 
}

function clickGoldenBug() {
    playSound('sound-achievement');
    gameState.totalGoldenBugsClicked++;
    
    let clickBonusPercent = 0.01;
    if (gameState.clickUpgrades.clickDivino.purchased) {
        clickBonusPercent = 0.02;
    }
    
    let clickValuePercentBonus = 0;
    if (gameState.clickUpgrades.manoBionica.purchased) {
        clickValuePercentBonus = (cookiesPerSecond / (prestigeBonus * bluescreenMultiplier)) * clickBonusPercent;
    }
    const currentClickValue = (gameState.baseClickValue * prestigeBonus * bluescreenMultiplier) + clickValuePercentBonus;
    
    const bonus = (cookiesPerSecond * 30) + (currentClickValue * 10) + 10;
    gameState.score += bonus;
    gameState.totalScore += bonus;
    
    // HIGHSCORE: Aggiorna anche qui
    gameState.lifetimeScore += bonus;
    
    showToast(`Ticket Critico Risolto! +${formatNumber(bonus)} bug!`);
    goldenBug.style.display = 'none';
    updateUI();
}

// --------- 11. EASTER EGG ---------

let originalTitle = document.title;
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        document.title = 'I bug si accumulano... 🐞';
    } else {
        document.title = originalTitle;
    }
});