// --------- 6. FUNZIONI DI AGGIORNAMENTO UI ---------

function formatNumber(num) {
    return Math.floor(num).toLocaleString('it-IT');
}

function formatTime(totalSeconds) {
    totalSeconds = Math.floor(totalSeconds);
    const days = Math.floor(totalSeconds / (3600 * 24));
    totalSeconds %= (3600 * 24);
    const hours = Math.floor(totalSeconds / 3600);
    totalSeconds %= 3600;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    let timeString = "";
    if (days > 0) timeString += `${days}g `;
    if (hours > 0 || days > 0) timeString += `${hours}h `;
    if (minutes > 0 || hours > 0 || days > 0) timeString += `${minutes}m `;
    timeString += `${seconds}s`;
    
    return timeString;
}

function showClickFeedback(event) {
    const feedback = document.createElement('span');
    feedback.className = 'click-feedback';

    let currentChance = 0.001; 
    const scoreString = Math.floor(gameState.score).toString();
    const clicksString = gameState.totalClicks.toString();
    if (scoreString.includes('404') || clicksString.includes('404')) {
        currentChance *= 2;
    }

    if (Math.random() < currentChance && !isBluescreenActive && gameState.score >= 404) { 
        feedback.textContent = '404 Bug Not Found';
        feedback.style.color = '#facc15';
        feedback.style.fontSize = '1rem';
        
        let dynamicMultiplier = 2;
        if (gameState.totalScore >= 100000000) { 
            dynamicMultiplier = 3;
        } else if (gameState.totalScore >= 1000000) {
            dynamicMultiplier = 2.5;
        }
        triggerBluescreen(dynamicMultiplier);
    } else {
        let clickBonusPercent = 0.01;
        if (gameState.clickUpgrades.clickDivino.purchased) {
            clickBonusPercent = 0.02;
        }
        
        const currentClickValue = (gameState.baseClickValue * prestigeBonus * bluescreenMultiplier) + 
                              (gameState.clickUpgrades.manoBionica.purchased ? (cookiesPerSecond * clickBonusPercent) : 0);
                              
        feedback.textContent = `+${formatNumber(currentClickValue)}`;
    }
    
    const rect = feedbackContainer.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    feedback.style.left = `${x + (Math.random() - 0.5) * 40}px`;
    feedback.style.top = `${y + (Math.random() - 0.5) * 40}px`;

    feedbackContainer.appendChild(feedback);
    
    setTimeout(() => feedback.remove(), 1500);
}

function renderAchievement(key) {
    const data = gameData.achievements[key];
    const achElement = document.createElement('div');
    achElement.className = 'achievement unlocked';
    achElement.id = `ach-${key}`;
    achElement.innerHTML = `
        <div class="achievement-name">${data.name}</div>
        <div class="achievement-desc">${data.desc}</div>`;
    achievementList.prepend(achElement);
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toastContainer.appendChild(toast);
    
    setTimeout(() => toast.remove(), 3500); 
}

// FUNZIONE ANTI-FLICKER: Costruisce i negozi una sola volta
function buildStores() {
    for (const key in gameData.clickUpgrades) {
        const data = gameData.clickUpgrades[key];
        const el = document.createElement('div');
        el.className = 'click-upgrade';
        el.id = `click-upgrade-${key}`;
        el.style.display = 'none';
        
        el.innerHTML = `
            <div class="upgrade-details">
                <span class="upgrade-name">${data.name}</span>
                <div class="upgrade-desc">${data.desc}</div>
                <div class="upgrade-cost">Costo: ${formatNumber(data.cost)} bug</div>
            </div>
            <button class="buy-btn buy-click-btn" data-upgrade-name="${key}">Compra</button>
        `;
        clickUpgradeList.appendChild(el);
    }
    
    for (const key in gameData.buildingEnhancements) {
        const data = gameData.buildingEnhancements[key];
        const el = document.createElement('div');
        el.className = 'enhancement-upgrade';
        el.id = `enh-upgrade-${key}`;
        el.style.display = 'none';
        
        el.innerHTML = `
            <div class="upgrade-details">
                <span class="upgrade-name">${data.name}</span>
                <div class="upgrade-desc">${data.desc}</div>
                <div class="upgrade-cost">Costo: ${formatNumber(data.cost)} bug</div>
            </div>
            <button class="buy-btn enhancement-btn" data-upgrade-name="${key}">Compra</button>
        `;
        enhancementList.appendChild(el);
    }
}

// NUOVA FUNZIONE: Aggiorna testi, costi e visibilità negozi (PESANTE - Chiamare solo su eventi)
function refreshAllStores() {
    // 1. Aggiorna testi Edifici (Costi e BPS)
    for (const key in gameState.buildings) {
        const currentCost = calculateBuildingCost(key);
        
        let buildingBPS = gameData.buildings[key].cpsPerUnit;
        for (const enhanceKey in gameState.buildingEnhancements) {
            const eData = gameData.buildingEnhancements[enhanceKey];
            if (eData.targetBuilding === key && gameState.buildingEnhancements[enhanceKey].purchased) {
                buildingBPS *= eData.multiplier;
            }
        }
        
        // Aggiorna il DOM solo qui
        document.getElementById(`cost-${key}`).textContent = `Costo: ${formatNumber(currentCost)}`;
        document.getElementById(`bps-${key}`).textContent = `+${(buildingBPS * prestigeBonus * clickCPSBonus * bluescreenMultiplier).toFixed(1).replace('.', ',')} BPS cad.`;
        document.getElementById(`count-${key}`).textContent = gameState.buildings[key].count;
    }

    // 2. Aggiorna Negozi completi (testi + visibilità)
    updateClickStore();
    updateEnhancementStore();
    
    // 3. Aggiorna parte statica del Prestigio
    updatePrestigeUI();
}

// MODIFICATA: Aggiorna solo Score, CPS e stato dei bottoni (LEGGERA - Loop 10fps)
function updateUI() {
    // 1. Aggiorna Punteggio e BPS
    scoreDisplay.textContent = formatNumber(gameState.score);
    cpsDisplay.textContent = `BPS: ${cookiesPerSecond.toFixed(1).replace('.', ',')}`;

    // 2. Aggiorna stato Disabled bottoni Edifici
    for (const key in gameState.buildings) {
        const currentCost = calculateBuildingCost(key);
        const btn = document.getElementById(`buy-${key}`);
        if (btn) btn.disabled = (gameState.score < currentCost);
    }
    
    // 3. Aggiorna Guadagno Prestigio (Dinamico)
    prestigeGainDisplay.textContent = calculatePrestigeGained();
    
    // 4. Aggiorna stato Disabled bottoni Negozi (Senza ricreare tutto)
    // Click Upgrades
    for (const key in gameState.clickUpgrades) {
        const btn = document.querySelector(`#click-upgrade-${key} .buy-btn`);
        if (btn && !gameState.clickUpgrades[key].purchased) {
            btn.disabled = (gameState.score < gameData.clickUpgrades[key].cost);
        }
    }
    // Enhancements
    for (const key in gameState.buildingEnhancements) {
        const btn = document.querySelector(`#enh-upgrade-${key} .buy-btn`);
        if (btn && !gameState.buildingEnhancements[key].purchased) {
            btn.disabled = (gameState.score < gameData.buildingEnhancements[key].cost);
        }
    }
    
    // Nota: updateClickStore/EnhancementStore completi vengono chiamati solo in refreshAllStores()
}

function updatePrestigeUI() {
    if (gameState.totalScore >= gameData.PRESTIGE_THRESHOLD) {
        prestigeSection.style.display = 'block';
    } else {
         prestigeSection.style.display = 'none';
    }
    
    if (gameState.prestigePoints > 0) {
        prestigeStore.style.display = 'block'; 
    } else {
        prestigeStore.style.display = 'none';
    }
    
    let baseBonus = gameState.prestigePoints * 0.01;
    let synergyBonus = gameState.prestigeUpgrades.sinergia.count * gameData.prestigeUpgrades.sinergia.bonusPerLevel * gameState.prestigePoints;
    let totalBonusPercent = (baseBonus + synergyBonus) * 100;
    
    let clickBonusPercent = (clickCPSBonus - 1) * 100;
    let totalCombinedBonus = totalBonusPercent + clickBonusPercent;
    
    prestigeBonusDisplay.style.display = (totalCombinedBonus > 0) ? 'block' : 'none';
    prestigeBonusDisplay.textContent = `Bonus: +${totalCombinedBonus.toFixed(1)}%`;
    
    prestigePointsDisplay.textContent = gameState.prestigePoints;
    prestigeGainDisplay.textContent = calculatePrestigeGained();
    
    // Sinergia (a conteggio)
    const pDataS = gameData.prestigeUpgrades.sinergia;
    const pStateS = gameState.prestigeUpgrades.sinergia;
    document.getElementById('cost-sinergia').textContent = `${pDataS.baseCost} PP`;
    document.getElementById('count-sinergia').textContent = pStateS.count;
    document.getElementById('buy-sinergia').disabled = (gameState.prestigePoints < pDataS.baseCost);
    
    // Accelerazione (acquisto singolo)
    const pDataA = gameData.prestigeUpgrades.accelerazione;
    const pStateA = gameState.prestigeUpgrades.accelerazione;
    const btnA = document.getElementById('buy-accelerazione');
    document.getElementById('cost-accelerazione').textContent = `${pDataA.baseCost} PP`;
    if (pStateA.purchased) {
        btnA.textContent = 'Acquistato';
        btnA.disabled = true;
    } else {
        btnA.disabled = (gameState.prestigePoints < pDataA.baseCost);
    }
    
    // Ticket Premium (acquisto singolo)
    const pDataT = gameData.prestigeUpgrades.ticketPremium;
    const pStateT = gameState.prestigeUpgrades.ticketPremium;
    const btnT = document.getElementById('buy-ticketPremium');
    document.getElementById('cost-ticketPremium').textContent = `${pDataT.baseCost} PP`;
    if (pStateT.purchased) {
        btnT.textContent = 'Acquistato';
        btnT.disabled = true;
    } else {
        btnT.disabled = (gameState.prestigePoints < pDataT.baseCost);
    }
}

// FUNZIONE ANTI-FLICKER
function updateEnhancementStore() {
    let storeHasItems = false;
    
    for (const key in gameData.buildingEnhancements) {
        const data = gameData.buildingEnhancements[key];
        const state = gameState.buildingEnhancements[key];
        const targetBuilding = gameState.buildings[data.targetBuilding];
        
        const el = document.getElementById(`enh-upgrade-${key}`);
        if (!el) continue; 

        if (!state.purchased && targetBuilding.count >= data.requiredCount) {
            storeHasItems = true;
            const canBuy = gameState.score >= data.cost;
            
            el.style.display = 'flex';
            el.querySelector('.buy-btn').disabled = !canBuy;
            
        } else {
            el.style.display = 'none';
        }
    }
    
    enhancementStoreSection.style.display = storeHasItems ? 'block' : 'none';
}

// FUNZIONE ANTI-FLICKER
function updateClickStore() {
    for (const key in gameData.clickUpgrades) {
        const data = gameData.clickUpgrades[key];
        const state = gameState.clickUpgrades[key];

        const el = document.getElementById(`click-upgrade-${key}`);
        if (!el) continue;

        if (!state.purchased && gameState.totalClicks >= data.requiredClicks) {
            const canBuy = gameState.score >= data.cost;
            
            el.style.display = 'flex';
            el.querySelector('.buy-btn').disabled = !canBuy;
            el.querySelector('.buy-btn').textContent = 'Compra';
            el.querySelector('.upgrade-cost').textContent = `Costo: ${formatNumber(data.cost)} bug`;
            el.classList.remove('purchased');
            
        } else if (state.purchased) {
            el.style.display = 'flex';
            el.querySelector('.buy-btn').disabled = true;
            el.querySelector('.buy-btn').textContent = 'Acquistato';
            el.querySelector('.upgrade-cost').textContent = '✅ Posseduto';
            el.classList.add('purchased');
        } else {
            el.style.display = 'none';
        }
    }
}

function updateStatsUI() {
    statsList.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">Tempo di gioco totale</span>
            <span class="stat-value">${formatTime(gameState.totalPlayTime)}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Bug (Run attuale)</span>
            <span class="stat-value">${formatNumber(gameState.totalScore)}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Bug (Totali di sempre)</span>
            <span class="stat-value">${formatNumber(gameState.lifetimeScore)}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Click totali</span>
            <span class="stat-value">${formatNumber(gameState.totalClicks)}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Ticket Critici cliccati</span>
            <span class="stat-value">${formatNumber(gameState.totalGoldenBugsClicked)}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Promozioni effettuate</span>
            <span class="stat-value">${formatNumber(gameState.totalResets)}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Punti Promozione</span>
            <span class="stat-value">${formatNumber(gameState.prestigePoints)}</span>
        </div>
    `;
}