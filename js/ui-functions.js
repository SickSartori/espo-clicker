// --------- 6. FUNZIONI DI AGGIORNAMENTO UI ---------

function formatNumber(num) {
    // 1. Controllo validità
    if (num === undefined || num === null || isNaN(num)) return "0";

    // 2. Gestione numeri negativi (utile per debug o errori di calcolo)
    let sign = "";
    if (num < 0) {
        sign = "-";
        num = Math.abs(num);
    }

    // 3. Se il numero è piccolo (< 1000), mostralo normale senza decimali
    if (num < 1000) {
        return sign + Math.floor(num).toString();
    }

    // 4. Array dei suffissi (Standard Internazionale per giochi Idle)
    // k=Mille, M=Milioni, B=Miliardi, T=Trilioni, Qa=Quadrilioni...
    const suffixes = ["", "k", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];

    // Calcola l'indice del suffisso (ogni 3 zeri = +1 indice)
    // Math.max(0, ...) serve per sicurezza su numeri 0-999 gestiti sopra
    const suffixIndex = Math.floor(Math.log10(num) / 3);

    // 5. Se il numero è ENORME (oltre i Decilioni), usa notazione scientifica
    if (suffixIndex >= suffixes.length) {
        return sign + num.toExponential(2).replace('.', ',');
    }

    // 6. Calcola il numero scalato
    // Esempio: 1.500.000 (Index 2 'M') -> diventa 1.5
    const scaledNum = num / Math.pow(1000, suffixIndex);

    // 7. Formatta con 2 decimali
    let formatted = scaledNum.toFixed(2);

    // Pulizia opzionale: se finisce con ",00" lo togliamo per pulizia
    if (formatted.endsWith('.00')) {
        formatted = formatted.slice(0, -3);
    }

    // Sostituisci il punto con la virgola (stile italiano) e aggiungi suffisso
    return sign + formatted.replace('.', ',') + " " + suffixes[suffixIndex];
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
    // 1. Costruisci Potenziamenti Click
    for (const key in gameData.clickUpgrades) {
        const data = gameData.clickUpgrades[key];
        const el = document.createElement('div');
        el.className = 'click-upgrade';
        el.id = `click-upgrade-${key}`;
        // Nota: Rimuoviamo 'display: none' qui, la visibilità la gestisce l'update

        el.innerHTML = `
            <div class="upgrade-details">
                <span class="upgrade-name">${data.name}</span>
                <div class="upgrade-desc">${data.desc}</div>
                <div class="upgrade-cost">Costo: ${formatNumber(data.cost)} bug</div>
            </div>
            
            <button class="buy-btn buy-click-btn" data-upgrade-name="${key}">Compra</button>
            
            <div class="progress-bar-container">
                <div class="progress-bar-fill"></div>
                <span class="progress-text">Locked</span>
            </div>
        `;
        clickUpgradeList.appendChild(el);
    }

    // 2. Costruisci Migliorie Assistenti (Auto)
    for (const key in gameData.buildingEnhancements) {
        const data = gameData.buildingEnhancements[key];
        const el = document.createElement('div');
        el.className = 'enhancement-upgrade';
        el.id = `enh-upgrade-${key}`;

        el.innerHTML = `
            <div class="upgrade-details">
                <span class="upgrade-name">${data.name}</span>
                <div class="upgrade-desc">${data.desc}</div>
                <div class="upgrade-cost">Costo: ${formatNumber(data.cost)} bug</div>
            </div>
            
            <button class="buy-btn enhancement-btn" data-upgrade-name="${key}">Compra</button>
            
             <div class="progress-bar-container">
                <div class="progress-bar-fill"></div>
                <span class="progress-text">Locked</span>
            </div>
        `;
        enhancementList.appendChild(el);
    }
}

function checkTabNotifications() {
    // 1. Check Tab CLICK (Potenziamenti)
    let clickNotify = false;
    for (const key in gameData.clickUpgrades) {
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
    for (const key in gameData.buildingEnhancements) {
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
        for (const key in gameData.prestigeUpgrades) {
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
            if (prestigeNotify) break;
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
    // 1. Aggiorna Edifici (Colonna Destra)
    for (const key in gameState.buildings) {
        const currentCost = calculateBulkCost(key, buyMultiplier);

        // Calcolo BPS
        let buildingBPS = gameData.buildings[key].cpsPerUnit;
        for (const enhanceKey in gameState.buildingEnhancements) {
            const eData = gameData.buildingEnhancements[enhanceKey];
            if (eData.targetBuilding === key && gameState.buildingEnhancements[enhanceKey].purchased) {
                buildingBPS *= eData.multiplier;
            }
        }
        const totalUnitBPS = buildingBPS * prestigeBonus * clickCPSBonus * bluescreenMultiplier;

        const costEl = document.getElementById(`cost-${key}`);
        const bpsEl = document.getElementById(`bps-${key}`);
        const countEl = document.getElementById(`count-${key}`);

        // --- MODIFICA: Usa setAttribute 'data-tooltip' ---
        if (costEl) {
            costEl.textContent = `Costo: ${formatNumber(currentCost)}`;
            costEl.setAttribute('data-tooltip', currentCost.toLocaleString('it-IT'));
        }

        if (bpsEl) {
            bpsEl.textContent = `+${formatNumber(totalUnitBPS)} BPS cad.`;
            bpsEl.setAttribute('data-tooltip', totalUnitBPS.toLocaleString('it-IT'));
        }
        // -------------------------------------------------

        if (countEl) countEl.textContent = gameState.buildings[key].count;
    }

    updateClickStore();
    updateEnhancementStore();
    updatePrestigeUI();
}

function updateUI() {
    // 1. Calcolo BPS Dinamico (Passivo + Attivo nell'ultimo secondo)
    let activeBPS = 0;
    const now = Date.now();
    for (let i = 0; i < clickHistory.length; i++) {
        if (now - clickHistory[i].time < 1000) activeBPS += clickHistory[i].value;
    }
    let totalDisplayBPS = cookiesPerSecond + activeBPS;

    // Aggiorna Score e BPS
    scoreDisplay.textContent = formatNumber(gameState.score);
    scoreDisplay.setAttribute('data-tooltip', Math.floor(gameState.score).toLocaleString('it-IT'));

    // Aggiorna BPS
    cpsDisplay.textContent = `BPS: ${formatNumber(totalDisplayBPS)}`;
    cpsDisplay.setAttribute('data-tooltip', totalDisplayBPS.toLocaleString('it-IT'));

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

    const displaySpendable = document.getElementById('display-spendable-points');
    if (displaySpendable) {
        displaySpendable.textContent = formatNumber(gameState.prestigePoints);
        displaySpendable.setAttribute('data-tooltip', gameState.prestigePoints.toLocaleString('it-IT'));
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
                timerDiv.textContent = `${m}:${s < 10 ? '0' + s : s}`;
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
    // 1. GESTIONE VISIBILITÀ TAB LAB (Menu Sinistro)
    // Appare solo se hai fatto almeno un reset o hai punti (cioè sei entrato nel mid-game)
    const tabLabButton = document.getElementById('tab-prestige');
    if (tabLabButton) {
        if (gameState.totalResets > 0 || gameState.prestigePoints > 0) {
            tabLabButton.style.display = 'inline-block';
        } else {
            tabLabButton.style.display = 'none';
            // Se era attivo, switcha al primo tab
            if (tabLabButton.classList.contains('active')) {
                const clickTab = document.getElementById('tab-click');
                if (clickTab) clickTab.click();
            }
        }
    }

    // 2. GESTIONE VISIBILITÀ BOTTONE PROMOZIONE (Barra in alto)
    // Appare quando puoi fare prestigio
    const prestigeHubBtn = document.getElementById('open-prestige-hub-btn');
    const canPrestige = gameState.totalScore >= gameData.PRESTIGE_THRESHOLD;
    const hasPrestiged = gameState.totalResets > 0;

    if (prestigeHubBtn) {
        // Lo mostriamo se puoi fare prestigio O se lo hai già fatto (per abitudine)
        if (canPrestige || hasPrestiged) {
            prestigeHubBtn.style.display = 'block';

            // Effetto speciale se c'è una nuova promozione pronta
            if (canPrestige) {
                prestigeHubBtn.style.animation = 'pulseButton 1.5s infinite';
                prestigeHubBtn.style.borderColor = '#2ecc71'; // Verde acceso
                prestigeHubBtn.textContent = "👑 PROMOZIONE PRONTA!";
            } else {
                prestigeHubBtn.style.animation = 'none';
                prestigeHubBtn.style.borderColor = '#9b59b6'; // Viola normale
                prestigeHubBtn.textContent = "👑 Promozione";
            }
        } else {
            prestigeHubBtn.style.display = 'none';
        }
    }

    // 3. AGGIORNA CIFRA GUADAGNO (Nel Modale in alto)
    if (document.getElementById('prestige-gain-display')) {
        const gained = calculatePrestigeGained();
        document.getElementById('prestige-gain-display').textContent = formatNumber(gained);
        document.getElementById('prestige-gain-display').title = gained.toLocaleString('it-IT');
    }

    // 4. AGGIORNA NEGOZIO LAB (Nel Tab Sinistro)
    // La logica dei bottoni rimane identica
    const listContainer = document.getElementById('prestige-list-container');
    if (!listContainer) return;

    const updateBtn = (id, data, state) => {
        const el = document.getElementById(`upgrade-${id}`);
        const btn = document.getElementById(`buy-${id}`);
        if (!btn || !el) return;

        let isCompleted = false;
        if (!data.isCounted && state.purchased) isCompleted = true;
        if (data.isCounted && data.maxLevel && state.count >= data.maxLevel) isCompleted = true;

        if (isCompleted) {
            btn.textContent = "Posseduto";
            btn.className = "buy-btn prestige-btn owned";
            btn.disabled = true;
        } else {
            btn.innerHTML = "Compra";
            btn.className = "buy-btn prestige-btn";
            btn.disabled = (gameState.prestigePoints < data.baseCost);
        }
        const countEl = document.getElementById(`count-${id}`);
        if (countEl) countEl.textContent = state.count;
    };

    const pData = gameData.prestigeUpgrades;
    const pState = gameState.prestigeUpgrades;

    updateBtn('sinergia', pData.sinergia, pState.sinergia);
    updateBtn('accelerazione', pData.accelerazione, pState.accelerazione);
    updateBtn('ticketPremium', pData.ticketPremium, pState.ticketPremium);
    updateBtn('outsourcing', pData.outsourcing, pState.outsourcing);
    updateBtn('paracadute', pData.paracadute, pState.paracadute);
    updateBtn('crunchTime', pData.crunchTime, pState.crunchTime);
}


function updateEnhancementStore() {
    const list = document.getElementById('enhancement-list');
    if (!list) return;

    const mode = gameState.filterSettings.globalFilter || 'available';
    let visibleCount = 0;

    // Check se esistono edifici (per evitare msg vuoto all'inizio)
    let hasAnyBuilding = false;
    for (const key in gameState.buildings) {
        if (gameState.buildings[key].count > 0) { hasAnyBuilding = true; break; }
    }

    for (const key in gameData.buildingEnhancements) {
        const data = gameData.buildingEnhancements[key];
        const state = gameState.buildingEnhancements[key];
        const targetBuilding = gameState.buildings[data.targetBuilding];
        const el = document.getElementById(`enh-upgrade-${key}`);
        if (!el) continue;

        const btn = el.querySelector('.buy-btn');
        const progressBar = el.querySelector('.progress-bar-container');

        // Stato
        const isPurchased = state.purchased;
        const isUnlocked = targetBuilding.count >= data.requiredCount;

        // 1. Reset
        el.classList.remove('purchased', 'locked-item');
        btn.style.display = 'none';
        progressBar.style.display = 'none';

        // 2. Configura
        if (isPurchased) {
            el.classList.add('purchased');
            btn.textContent = "Posseduto";
            btn.disabled = true;
            btn.className = "buy-btn owned";
            btn.style.display = 'block';
        } else if (isUnlocked) {
            btn.textContent = "Compra";
            btn.disabled = (gameState.score < data.cost);
            btn.className = "buy-btn enhancement-btn";
            btn.style.display = 'block';
        } else {
            el.classList.add('locked-item');
            progressBar.style.display = 'block';
            const current = targetBuilding.count;
            const target = data.requiredCount;
            const targetName = gameData.buildings[data.targetBuilding].name;
            let percent = Math.min((current / target) * 100, 100);
            el.querySelector('.progress-bar-fill').style.width = `${percent}%`;
            el.querySelector('.progress-text').textContent = `${current} / ${target} ${targetName}`;
        }

        // 3. Visibilità
        if (shouldItemBeVisible(mode, isPurchased, isUnlocked)) {
            el.style.display = 'flex';
            visibleCount++;
        } else {
            el.style.display = 'none';
        }
    }

    const emptyMsg = document.getElementById('enhancement-empty');
    if (emptyMsg) {
        if (visibleCount === 0 && hasAnyBuilding) {
            emptyMsg.style.display = 'block';
            setEmptyMessage(emptyMsg, mode);
        } else {
            emptyMsg.style.display = 'none';
        }
    }
}

function shouldItemBeVisible(mode, isPurchased, isUnlocked) {
    switch (mode) {
        case 'available': // 🛒 DA COMPRARE: Sbloccato E Non Acquistato
            return isUnlocked && !isPurchased;
        case 'locked':    // 🔒 IN ARRIVO: Non Sbloccato E Non Acquistato
            return !isUnlocked && !isPurchased;
        case 'purchased': // ✅ GIÀ PRESI: Solo Acquistati
            return isPurchased;
        case 'all':       // 👁️ TUTTO: Mostra sempre
            return true;
        default:
            return isUnlocked && !isPurchased;
    }
}

function setEmptyMessage(el, mode) {
    if (mode === 'available') el.textContent = "Nessun oggetto da comprare al momento.";
    else if (mode === 'locked') el.textContent = "Nessun oggetto bloccato in vista.";
    else if (mode === 'purchased') el.textContent = "Ancora nessun acquisto effettuato.";
    else el.textContent = "Niente da mostrare.";
}

function updateClickStore() {
    const list = document.getElementById('click-upgrade-list');
    if (!list) return;

    const mode = gameState.filterSettings.globalFilter || 'available';
    let visibleCount = 0;

    for (const key in gameData.clickUpgrades) {
        const data = gameData.clickUpgrades[key];
        const state = gameState.clickUpgrades[key];
        const el = document.getElementById(`click-upgrade-${key}`);
        if (!el) continue;

        const btn = el.querySelector('.buy-btn');
        const progressBar = el.querySelector('.progress-bar-container');

        // Stato
        const isPurchased = state.purchased;
        const isUnlocked = gameState.totalClicks >= data.requiredClicks;

        // 1. Reset Classi
        el.classList.remove('purchased', 'locked-item');
        btn.style.display = 'none';
        progressBar.style.display = 'none';

        // 2. Configura Elemento (Grafica)
        if (isPurchased) {
            el.classList.add('purchased');
            btn.textContent = "Posseduto";
            btn.disabled = true;
            btn.className = "buy-btn owned";
            btn.style.display = 'block';
        } else if (isUnlocked) {
            btn.textContent = "Compra";
            btn.disabled = (gameState.score < data.cost);
            btn.className = "buy-btn buy-click-btn";
            btn.style.display = 'block';
        } else {
            el.classList.add('locked-item');
            progressBar.style.display = 'block';
            // Aggiorna barra
            const current = gameState.totalClicks;
            const target = data.requiredClicks;
            let percent = Math.min((current / target) * 100, 100);
            el.querySelector('.progress-bar-fill').style.width = `${percent}%`;
            el.querySelector('.progress-text').textContent = `Sblocco: ${formatNumber(current)} / ${formatNumber(target)}`;
        }

        // 3. Visibilità (Usa helper)
        if (shouldItemBeVisible(mode, isPurchased, isUnlocked)) {
            el.style.display = 'flex';
            visibleCount++;
        } else {
            el.style.display = 'none';
        }
    }

    // Empty State
    const emptyMsg = document.getElementById('click-upgrade-empty');
    if (emptyMsg) {
        emptyMsg.style.display = (visibleCount === 0) ? 'block' : 'none';
        if (visibleCount === 0) setEmptyMessage(emptyMsg, mode);
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