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
function checkTabNotifications() {
    // 1. Check Tab CLICK (Potenziamenti)
    let clickNotify = false;
    for(const key in gameData.clickUpgrades) {
        const data = gameData.clickUpgrades[key];
        const state = gameState.clickUpgrades[key];
        // Se non comprato, sbloccato E ho abbastanza soldi
        if (!state.purchased && gameState.totalClicks >= data.requiredClicks && gameState.score >= data.cost) {
            clickNotify = true;
            break;
        }
    }
    const tabClick = document.getElementById('tab-click');
    // Notifica solo se il tab NON è attivo
    if (clickNotify && !tabClick.classList.contains('active')) {
        tabClick.classList.add('notify');
    } else if (tabClick.classList.contains('active')) {
        tabClick.classList.remove('notify'); // Rimuovi se lo sto guardando
    }

    // 2. Check Tab AUTO (Migliorie)
    let autoNotify = false;
    for(const key in gameData.buildingEnhancements) {
        const data = gameData.buildingEnhancements[key];
        const state = gameState.buildingEnhancements[key];
        const targetBuilding = gameState.buildings[data.targetBuilding];
        
        if (!state.purchased && targetBuilding.count >= data.requiredCount && gameState.score >= data.cost) {
            autoNotify = true;
            break;
        }
    }
    const tabAuto = document.getElementById('tab-auto');
    if (autoNotify && !tabAuto.classList.contains('active')) {
        tabAuto.classList.add('notify');
    } else if (tabAuto.classList.contains('active')) {
        tabAuto.classList.remove('notify');
    }

    // 3. Check Tab LAB (Prestigio)
    let prestigeNotify = false;
    // Controlla solo se il negozio è sbloccato
    if (gameState.totalResets > 0 || gameState.prestigePoints > 0) {
        for(const key in gameData.prestigeUpgrades) {
            const data = gameData.prestigeUpgrades[key];
            const state = gameState.prestigeUpgrades[key];
            
            // Logica diversa per contabili e one-time
            if (data.isCounted) {
                 // Se è contabile (es. Sinergia), notifica sempre se puoi permettertelo
                 if (gameState.prestigePoints >= data.baseCost) prestigeNotify = true;
            } else {
                // Se è one-time, notifica solo se non ce l'ho
                if (!state.purchased && gameState.prestigePoints >= data.baseCost) prestigeNotify = true;
            }
            if(prestigeNotify) break;
        }
    }
    const tabPrestige = document.getElementById('tab-prestige');
    if (prestigeNotify && !tabPrestige.classList.contains('active')) {
        tabPrestige.classList.add('notify');
    } else if (tabPrestige.classList.contains('active')) {
        tabPrestige.classList.remove('notify');
    }
}
// NUOVA FUNZIONE: Aggiorna testi, costi e visibilità negozi (PESANTE - Chiamare solo su eventi)
function refreshAllStores() {
    // 1. Aggiorna testi Edifici (Costi e BPS)
    for (const key in gameState.buildings) {
        // Calcola il costo in base al moltiplicatore corrente (1 o 10)
        const currentCost = calculateBulkCost(key, buyMultiplier);
        
        // Calcola BPS (per unità singola, non cambia col moltiplicatore visivamente)
        let buildingBPS = gameData.buildings[key].cpsPerUnit;
        for (const enhanceKey in gameState.buildingEnhancements) {
            const eData = gameData.buildingEnhancements[enhanceKey];
            if (eData.targetBuilding === key && gameState.buildingEnhancements[enhanceKey].purchased) {
                buildingBPS *= eData.multiplier;
            }
        }
        
        // Aggiorna DOM
        const costEl = document.getElementById(`cost-${key}`);
        const countEl = document.getElementById(`count-${key}`);
        const bpsEl = document.getElementById(`bps-${key}`);
        const nameEl = document.getElementById(`name-${key}`); // Utile se cambi i nomi

        if (costEl) {
            // Mostra "x10" nel testo se necessario
            const prefix = buyMultiplier > 1 ? `${buyMultiplier}x ` : '';
            costEl.textContent = `Costo: ${formatNumber(currentCost)}`;
            // Opzionale: puoi aggiungere un'indicazione visiva del moltiplicatore nel testo
            // costEl.textContent = `Costo (${buyMultiplier}x): ${formatNumber(currentCost)}`;
        }
        
        if (bpsEl) bpsEl.textContent = `+${(buildingBPS * prestigeBonus * clickCPSBonus * bluescreenMultiplier).toFixed(1).replace('.', ',')} BPS cad.`;
        if (countEl) countEl.textContent = gameState.buildings[key].count;
    }

    // ... (il resto della funzione rimane uguale: updateClickStore, updatePrestigeUI ecc.)
    updateClickStore();
    updateEnhancementStore();
    updatePrestigeUI();
}

function updateUI() {
    // 1. Calcolo BPS Dinamico (Passivo + Attivo nell'ultimo secondo)
    let activeBPS = 0;
    const now = Date.now();
    
    // Somma il valore di tutti i click nell'ultimo secondo
    for (let i = 0; i < clickHistory.length; i++) {
        if (now - clickHistory[i].time < 1000) {
            activeBPS += clickHistory[i].value;
        }
    }
    
    let totalDisplayBPS = cookiesPerSecond + activeBPS;

    // Aggiorna Score e BPS
    scoreDisplay.textContent = formatNumber(gameState.score);
    
    // Mostra il BPS totale. Se smetti di cliccare, activeBPS scende a 0 e rimane solo il passivo.
    cpsDisplay.textContent = `BPS: ${totalDisplayBPS.toFixed(1).replace('.', ',')}`;

    // ... (Il resto della funzione rimane identico: gestione Bonus, Bottoni, Prestigio ecc.)
    
    // 2. Bonus (gestito come prima, solo Prestigio)
    let baseBonus = gameState.prestigePoints * 0.01;
    let synergyBonus = gameState.prestigeUpgrades.sinergia.count * gameData.prestigeUpgrades.sinergia.bonusPerLevel * gameState.prestigePoints;
    let totalDisplayBonus = (baseBonus + synergyBonus) * 100;
    
    if (parseFloat(totalDisplayBonus.toFixed(1)) > 0) {
        prestigeBonusDisplay.style.display = 'block';
        prestigeBonusDisplay.textContent = `Bonus: +${totalDisplayBonus.toFixed(1)}%`;
    } else {
        prestigeBonusDisplay.style.display = 'none';
    }

    // 3. Aggiorna stato Disabled bottoni Edifici
    for (const key in gameState.buildings) {
        const currentCost = calculateBulkCost(key, buyMultiplier);
        const btn = document.getElementById(`buy-${key}`);
        if (btn) btn.disabled = (gameState.score < currentCost);
    }
    
    // 4. Prestigio & 5. Negozi (tutto uguale a prima...)
    prestigeGainDisplay.textContent = calculatePrestigeGained();
    for (const key in gameState.clickUpgrades) {
        const btn = document.querySelector(`#click-upgrade-${key} .buy-btn`);
        if (btn && !gameState.clickUpgrades[key].purchased) {
            btn.disabled = (gameState.score < gameData.clickUpgrades[key].cost);
        }
    }
    for (const key in gameState.buildingEnhancements) {
        const btn = document.querySelector(`#enh-upgrade-${key} .buy-btn`);
        if (btn && !gameState.buildingEnhancements[key].purchased) {
            btn.disabled = (gameState.score < gameData.buildingEnhancements[key].cost);
        }
    }

    const btnCrunch = document.getElementById('skill-crunchTime');
if (btnCrunch) {
    // 1. Visibilità: Mostra solo se l'upgrade è comprato
    if (gameState.prestigeUpgrades.crunchTime && gameState.prestigeUpgrades.crunchTime.purchased) {
        btnCrunch.style.display = 'block';

        const now = Date.now();
        const timerDiv = btnCrunch.querySelector('.skill-timer');

        // 2. Stato: ATTIVO
        if (now < crunchTimeEndTime) {
            const timeLeft = Math.ceil((crunchTimeEndTime - now) / 1000);
            crunchTimeMultiplier = 3; // Assicuriamoci che sia 3
            btnCrunch.className = 'skill-btn active';
            btnCrunch.firstChild.textContent = "🔥 IN CORSO 🔥"; // Testo bottone
            timerDiv.textContent = `${timeLeft}s rimanenti`;
        } 
        // 3. Stato: COOLDOWN
        else if (now < crunchTimeCooldownEnd) {
            const timeLeft = Math.ceil((crunchTimeCooldownEnd - now) / 1000);
            crunchTimeMultiplier = 1; // Effetto finito
            btnCrunch.className = 'skill-btn cooldown';
            btnCrunch.firstChild.textContent = "Ricarica...";

            // Formatta minuti:secondi
            const m = Math.floor(timeLeft / 60);
            const s = timeLeft % 60;
            timerDiv.textContent = `${m}:${s < 10 ? '0'+s : s}`;
        } 
        // 4. Stato: PRONTO
        else {
            crunchTimeMultiplier = 1;
            btnCrunch.className = 'skill-btn';
            btnCrunch.firstChild.textContent = "🔥 CRUNCH TIME 🔥";
            timerDiv.textContent = "CLICCA PER ATTIVARE";
        }
    } else {
        btnCrunch.style.display = 'none';
    }
}
checkTabNotifications();
}

function updatePrestigeUI() {
    // 1. GESTIONE VISIBILITÀ TAB LAB (Solo dopo il primo reset)
    const tabLabButton = document.getElementById('tab-prestige');
    // Mostra il tab solo se hai fatto almeno un reset in passato
    if (tabLabButton) {
        if (gameState.totalResets > 0) {
            tabLabButton.style.display = 'inline-block'; // o 'block' a seconda del CSS
        } else {
            tabLabButton.style.display = 'none';
            // Se il tab è nascosto, assicurati di non essere "dentro" quel tab se per sbaglio era attivo
            if (tabLabButton.classList.contains('active')) {
                document.getElementById('tab-click').click();
            }
        }
    }

    // 2. Sezione Reset (Appare quando raggiungi la soglia di punti)
    if (prestigeSection) {
        prestigeSection.style.display = (gameState.totalScore >= gameData.PRESTIGE_THRESHOLD) ? 'block' : 'none';
    }

    // 3. Aggiornamento Contatori Centrali (Bonus e Punti Spendibili)
    const displayCareer = document.getElementById('display-career-bonus');
    const displaySpendable = document.getElementById('display-spendable-points');
    const hudContainer = document.getElementById('hud-stats-container');
    const careerContainer = document.getElementById('career-bonus-container');
    const spendableContainer = document.getElementById('spendable-points-container');

    if (displayCareer && displaySpendable) {
        // Calcolo Bonus
        let baseBonus = gameState.lifetimePrestigePoints * 0.01;
        let synergyBonus = gameState.prestigeUpgrades.sinergia.count * gameData.prestigeUpgrades.sinergia.bonusPerLevel * gameState.lifetimePrestigePoints;
        let totalPercent = ((baseBonus + synergyBonus) * 100).toFixed(1);

        displayCareer.textContent = `+${totalPercent}%`;
        displaySpendable.textContent = formatNumber(gameState.prestigePoints);

        // Mostra la barra HUD se hai mai fatto prestigio
        if (hudContainer) {
            if (gameState.totalResets > 0 || gameState.prestigePoints > 0 || gameState.lifetimePrestigePoints > 0) {
                hudContainer.style.display = 'flex'; // Usa Flex per allineare
            } else {
                hudContainer.style.display = 'none';
            }
        }
    }
    
    // Aggiorna previsione guadagno reset
    if (prestigeGainDisplay) prestigeGainDisplay.textContent = formatNumber(calculatePrestigeGained());

    // 4. GESTIONE LISTA NEGOZIO LAB (Filtri + Bottoni)
    const listContainer = document.getElementById('prestige-list-container');
    const isFiltering = listContainer ? listContainer.classList.contains('hide-purchased-items') : false;
    let visibleCount = 0;

    const updateBtn = (id, data, state) => {
        const el = document.getElementById(`upgrade-${id}`); 
        const btn = document.getElementById(`buy-${id}`);
        if (!btn || !el) return;
        
        // Verifica se completato
        let isCompleted = false;
        if (!data.isCounted && state.purchased) isCompleted = true;
        if (data.isCounted && data.maxLevel && state.count >= data.maxLevel) isCompleted = true;
        
        // Applica classe .purchased al contenitore padre per stile CSS opzionale
        if (isCompleted) el.classList.add('purchased');
        else el.classList.remove('purchased');

        // LOGICA FILTRO
        if (isCompleted && isFiltering) {
            el.style.display = 'none';
            return; 
        }
        
        el.style.display = 'flex'; 
        visibleCount++;

        // LOGICA BOTTONE
        if (isCompleted) {
            btn.textContent = "Posseduto";
            btn.className = "buy-btn prestige-btn owned"; 
            btn.disabled = true;
        } else {
            btn.innerHTML = "Compra";
            btn.className = "buy-btn prestige-btn";
            btn.disabled = (gameState.prestigePoints < data.baseCost);
        }
        
        // Aggiorna count (livello)
        const countEl = document.getElementById(`count-${id}`);
        if(countEl) countEl.textContent = state.count;
    };

    const pData = gameData.prestigeUpgrades;
    const pState = gameState.prestigeUpgrades;

    // Aggiorna Items
    updateBtn('sinergia', pData.sinergia, pState.sinergia);
    updateBtn('accelerazione', pData.accelerazione, pState.accelerazione);
    updateBtn('ticketPremium', pData.ticketPremium, pState.ticketPremium);
    updateBtn('outsourcing', pData.outsourcing, pState.outsourcing);
    updateBtn('paracadute', pData.paracadute, pState.paracadute);
    updateBtn('crunchTime', pData.crunchTime, pState.crunchTime);

    // Empty State
    const emptyLab = document.getElementById('prestige-empty');
    if(emptyLab) emptyLab.style.display = (visibleCount === 0) ? 'block' : 'none';
}


function updateEnhancementStore() {
    const list = document.getElementById('enhancement-list');
    if (!list) return;

    const isFiltering = list.classList.contains('hide-purchased-items');
    let visibleCount = 0;
    let hasAnyBuilding = false;
    
    for(const key in gameState.buildings) {
        if(gameState.buildings[key].count > 0) { hasAnyBuilding = true; break; }
    }

    for (const key in gameData.buildingEnhancements) {
        const data = gameData.buildingEnhancements[key];
        const state = gameState.buildingEnhancements[key];
        const targetBuilding = gameState.buildings[data.targetBuilding];
        const el = document.getElementById(`enh-upgrade-${key}`);
        if (!el) continue;

        const btn = el.querySelector('.buy-btn');

        if (state.purchased) {
            el.classList.add('purchased');
            if (isFiltering) {
                el.style.display = 'none';
            } else {
                el.style.display = 'flex';
                visibleCount++;
                btn.textContent = "Posseduto";
                btn.disabled = true;
                btn.className = "buy-btn owned";
            }
        } else if (targetBuilding.count >= data.requiredCount) {
            el.classList.remove('purchased');
            el.style.display = 'flex';
            visibleCount++;
            btn.textContent = "Compra";
            btn.disabled = (gameState.score < data.cost);
            btn.className = "buy-btn enhancement-btn";
        } else {
            el.style.display = 'none';
        }
    }

    const emptyMsg = document.getElementById('enhancement-empty');
    if (emptyMsg) {
        if (hasAnyBuilding && visibleCount === 0) {
            emptyMsg.style.display = 'block';
            emptyMsg.textContent = isFiltering ? "Tutto acquistato!" : "Nessuna miglioria disponibile.";
        } else {
            emptyMsg.style.display = 'none';
        }
    }
}


function updateClickStore() {
    const list = document.getElementById('click-upgrade-list');
    if (!list) return;
    
    const isFiltering = list.classList.contains('hide-purchased-items');
    let visibleCount = 0;

    for (const key in gameData.clickUpgrades) {
        const data = gameData.clickUpgrades[key];
        const state = gameState.clickUpgrades[key];
        const el = document.getElementById(`click-upgrade-${key}`);
        if (!el) continue;

        const btn = el.querySelector('.buy-btn');

        if (state.purchased) {
            // ACQUISTATO
            el.classList.add('purchased'); // Utile per CSS
            if (isFiltering) {
                el.style.display = 'none';
            } else {
                el.style.display = 'flex';
                visibleCount++;
                
                btn.textContent = "Posseduto";
                btn.disabled = true;
                btn.className = "buy-btn owned";
            }
        } else if (gameState.totalClicks >= data.requiredClicks) {
            // DISPONIBILE
            el.classList.remove('purchased');
            el.style.display = 'flex';
            visibleCount++;
            
            btn.textContent = "Compra";
            btn.disabled = (gameState.score < data.cost);
            btn.className = "buy-btn buy-click-btn";
        } else {
            // BLOCCATO
            el.style.display = 'none';
        }
    }
    const emptyMsg = document.getElementById('click-upgrade-empty');
    if (emptyMsg) emptyMsg.style.display = (visibleCount === 0) ? 'block' : 'none';
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
            <span class="stat-label" style="color: #f1c40f;">Highscore (Totale)</span>
            <span class="stat-value" style="color: #f1c40f;">${formatNumber(gameState.lifetimeScore)}</span>
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