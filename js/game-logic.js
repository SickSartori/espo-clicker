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

function calculateBuildingCost(buildingKey) {
    const data = gameData.buildings[buildingKey];
    const state = gameState.buildings[buildingKey];
    return Math.floor(data.baseCost * Math.pow(1.15, state.count));
}

function calculatePrestigeBonus() {
    const pData = gameData.prestigeUpgrades;
    const pState = gameState.prestigeUpgrades;
    
    let baseBonus = gameState.prestigePoints * 0.01;
    let synergyBonus = pState.sinergia.count * pData.sinergia.bonusPerLevel * gameState.prestigePoints;
    
    prestigeBonus = 1 + baseBonus + synergyBonus;
}

function calculateClickCPSBonus() {
    clickCPSBonus = 1 + (gameState.totalClicks / 1000 * 0.001);
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
    
    cookiesPerSecond = baseCPS * prestigeBonus * clickCPSBonus * bluescreenMultiplier;
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
    // --- FIX TASTIERA: Blocca input se non è un click del mouse ---
    // Quando si usa Invio/Spazio, event.detail è 0. 
    // Quando si usa il mouse, è 1 o più.
    if (event.detail === 0) return; 
    
    // Toglie il focus dal bottone per evitare che rimanga selezionato (rimuove il bordo blu/nero)
    if (clickerButton) clickerButton.blur();
    // --------------------------------------------------------------

    playSound('sound-click');
    
    let clickBonusPercent = 0.01;
    if (gameState.clickUpgrades.clickDivino.purchased) {
        clickBonusPercent = 0.02;
    }
    
    let clickValuePercentBonus = 0;
    if (gameState.clickUpgrades.manoBionica.purchased) {
        clickValuePercentBonus = (cookiesPerSecond / (prestigeBonus * bluescreenMultiplier)) * clickBonusPercent; 
    }
    
    const currentClickValue = (gameState.baseClickValue * prestigeBonus * bluescreenMultiplier) + clickValuePercentBonus;
    
    gameState.score += currentClickValue;
    gameState.totalScore += currentClickValue;
    gameState.lifetimeScore += currentClickValue;
    gameState.totalClicks++;
    
    calculateClickCPSBonus();
    
    showClickFeedback(event);
    
    clickerButton.classList.add('clicked');
    setTimeout(() => {
        clickerButton.classList.remove('clicked');
    }, 100);

    updateUI();
}

function buyBuilding(buildingKey) {
    const state = gameState.buildings[buildingKey];
    const currentCost = calculateBuildingCost(buildingKey);

    if (gameState.score >= currentCost) {
        playSound('sound-buy');
        gameState.score -= currentCost;
        state.count++;
        
        recalculateCPS();
        refreshAllStores(); // AGGIUNTO: Aggiorna UI lenta
        window.EspooClicker.saveGame(); // AGGIUNTO: Salva subito
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
    return Math.floor(Math.sqrt(gameState.totalScore / 1000000) * 1.5);
}

async function performPrestige() {
    const gained = calculatePrestigeGained();
    if (gained < 1) {
        alert("Non guadagneresti nessun Punto Promozione. Continua a produrre!");
        return;
    }

    if (confirm(`Sei sicuro di voler resettare?
Guadagnerai ${gained} Punti Promozione.
Perderai tutti i bug, strumenti, e potenziamenti click, ma manterrai i tuoi obiettivi, punti e potenziamenti promozione.`)) {
        
        // RIMOSSO INVIO AL PODIO DA QUI
        
        let newPrestigePoints = gameState.prestigePoints + gained;
        let oldAchievements = gameState.achievements;
        let oldPrestigeUpgrades = gameState.prestigeUpgrades;
        let oldTotalResets = gameState.totalResets + 1;
        let oldGoldenBugs = gameState.totalGoldenBugsClicked;
        let oldPlayTime = gameState.totalPlayTime;
        let oldLifetimeScore = gameState.lifetimeScore;
        let oldUser = gameState.user; 
        
        let newState = createNewGameState(); 
        
        newState.prestigePoints = newPrestigePoints;
        newState.achievements = oldAchievements;
        newState.prestigeUpgrades = oldPrestigeUpgrades;
        newState.totalResets = oldTotalResets;
        newState.totalGoldenBugsClicked = oldGoldenBugs;
        newState.totalPlayTime = oldPlayTime;
        newState.lifetimeScore = oldLifetimeScore;
        newState.user = oldUser; 
        
        if (newState.prestigeUpgrades.accelerazione.purchased) {
            newState.buildings.assistenteQa.count = 1;
        }
        
        gameState = newState;
        
        saveGame();
        location.reload();
    }
}

async function submitScoreToLeaderboard(username, score, prestigeLevel) {
    if (score < 1000) return; 

    try {
        const response = await fetch('./php/submit_score.php', { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                score: Math.floor(score),
                prestigeLevel: prestigeLevel 
            })
        });
        if (response.ok) {
            console.log("Punteggio inviato al Podio!");
        } else {
            throw new Error('Risposta negativa dal server');
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
        totalScore: 0,
        prestigePoints: 0,
        totalResets: 0,
        totalGoldenBugsClicked: 0,
        totalPlayTime: 0,
        lifetimeScore: 0,
        user: { username: 'Giocatore', masterVolume: 1.0 },
        buildings: {
            assistenteQa: { count: 0 }, jiraTicket: { count: 0 },
            teamQa: { count: 0 }, automazioneTest: { count: 0 },
            metodologiaAgile: { count: 0 }, aiDebugger: { count: 0 }
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
    const scoreToAdd = cookiesPerSecond / 10;
    gameState.score += scoreToAdd;
    gameState.totalScore += scoreToAdd;
    gameState.lifetimeScore += scoreToAdd;
    
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