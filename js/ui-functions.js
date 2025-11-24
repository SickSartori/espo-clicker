// --------- 6. FUNZIONI DI AGGIORNAMENTO UI ---------

function formatNumber(num) {
    if (num === undefined || num === null || isNaN(num)) return "0";
    let sign = "";
    if (num < 0) { sign = "-"; num = Math.abs(num); }
    if (num < 1000) return sign + num.toLocaleString('it-IT', { maximumFractionDigits: 2 });
    const suffixes = ["", "k", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];
    const suffixIndex = Math.floor(Math.log10(num) / 3);
    if (suffixIndex >= suffixes.length) return sign + num.toExponential(2).replace('.', ',');
    const scaledNum = num / Math.pow(1000, suffixIndex);
    let decimals = scaledNum < 10 ? 3 : (scaledNum < 100 ? 2 : 1);
    return sign + scaledNum.toFixed(decimals).replace('.', ',') + " " + suffixes[suffixIndex];
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

// --- FUNZIONE SKIN CORRETTA E ROBUSTA ---
function updateSkinsUI() {
    const grid = document.getElementById('skins-grid');
    if (!grid) return;

    grid.innerHTML = '';

    // 1. Inizializzazione Sicura dell'oggetto
    if (!gameState.skins || typeof gameState.skins !== 'object') {
        gameState.skins = { unlocked: ['default'], current: 'default' };
    }
    // 2. Riparazione array unlocked se mancante
    if (!Array.isArray(gameState.skins.unlocked)) {
        gameState.skins.unlocked = ['default'];
    }
    // 3. Riparazione current skin
    if (!gameState.skins.current) {
        gameState.skins.current = 'default';
    }

    // Creiamo copie locali sicure per evitare letture undefined
    const safeUnlockedList = gameState.skins.unlocked;
    const currentSkin = gameState.skins.current;

    for (const key in gameData.skins) {
        const data = gameData.skins[key];

        // Controllo sicuro
        const isUnlocked = safeUnlockedList.includes(key);
        const isEquipped = currentSkin === key;

        const card = document.createElement('div');
        card.className = `skin-card ${isUnlocked ? 'unlocked' : 'locked'} ${isEquipped ? 'equipped' : ''}`;

        card.style.cssText = `
            border: 2px solid ${isEquipped ? '#2ecc71' : (isUnlocked ? '#bdc3c7' : '#4a6582')};
            border-radius: 8px; padding: 10px; text-align: center;
            opacity: ${isUnlocked ? '1' : '0.5'}; cursor: ${isUnlocked ? 'pointer' : 'default'};
            background-color: ${isEquipped ? 'rgba(46, 204, 113, 0.1)' : 'transparent'};
            transition: all 0.2s;
        `;

        const imgSrc = data.img ? `./image/${data.img}` : './image/espo.png';
        const imgStyle = `width: 50px; height: 50px; border-radius: 50%; object-fit: cover; margin-bottom: 5px;`;
        const filterStyle = isUnlocked ? '' : 'filter: grayscale(100%) blur(1px);';

        card.innerHTML = `
            <img src="${imgSrc}" style="${imgStyle} ${filterStyle}">
            <div style="font-size: 0.8rem; font-weight: bold; color: #fff;">${data.name}</div>
            <div style="font-size: 0.7rem; color: #bdc3c7;">${isEquipped ? 'In uso' : (isUnlocked ? 'Seleziona' : 'Bloccato')}</div>
        `;

        if (isUnlocked) {
            card.addEventListener('click', () => {
                if (typeof equipSkin === 'function') equipSkin(key);
            });
        }
        grid.appendChild(card);
    }
}

function showClickFeedback(event) {
    const feedback = document.createElement('span');
    feedback.className = 'click-feedback';

    // Evento 404
    const now = Date.now();
    const COOLDOWN_404 = 300000;
    const lastCrash = gameState.lastBluescreenTimestamp || 0;
    const timeSinceLast = now - lastCrash;
    const scoreString = Math.floor(gameState.score).toString();
    const clicksString = gameState.totalClicks.toString();
    const has404 = scoreString.includes('404') || clicksString.includes('404');
    let currentChance = has404 ? 0.005 : 0.0005;

    if (timeSinceLast > COOLDOWN_404 && Math.random() < currentChance && !isBluescreenActive && gameState.score >= 404) {
        feedback.textContent = 'Error 404: Logic Not Found';
        feedback.style.color = '#facc15';
        feedback.style.fontSize = '1.2rem';
        feedback.style.fontWeight = '900';
        feedback.style.zIndex = '100';
        let baseMult = 2;
        let variableMult = Math.random() * 3;
        let dynamicMultiplier = Math.floor(baseMult + variableMult);
        gameState.lastBluescreenTimestamp = now;
        if (window.EspooClicker) window.EspooClicker.saveGame();
        if (typeof triggerBluescreen === 'function') triggerBluescreen(dynamicMultiplier);
    } else {
        let clickBonusPercent = 0.01;
        if (gameState.clickUpgrades.clickDivino.purchased) clickBonusPercent = 0.02;
        const currentClickValue = (gameState.baseClickValue * prestigeBonus * bluescreenMultiplier) +
            (gameState.clickUpgrades.manoBionica.purchased ? (cookiesPerSecond * clickBonusPercent) : 0);
        feedback.textContent = `+${formatNumber(currentClickValue)}`;
    }

    const rect = feedbackContainer.getBoundingClientRect();
    let x, y;
    if (event.clientX && event.clientY) {
        x = event.clientX - rect.left;
        y = event.clientY - rect.top;
    } else {
        x = rect.width / 2;
        y = rect.height / 2;
    }
    const randomX = (Math.random() - 0.5) * 60;
    const randomY = (Math.random() - 0.5) * 40;
    const randomRot = (Math.random() - 0.5) * 30;

    feedback.style.left = `${x + randomX}px`;
    feedback.style.top = `${y + randomY}px`;
    feedback.style.setProperty('--tx', `${randomX}px`);
    feedback.style.setProperty('--rot', `${randomRot}deg`);
    feedbackContainer.appendChild(feedback);
    setTimeout(() => feedback.remove(), 1500);
}

function updateAchievementsUI() {
    const list = document.getElementById('achievement-list');
    if (!list || (list.style.display === 'none' && !document.getElementById('achievements-modal').style.display === 'flex')) return;

    list.innerHTML = '';

    const keys = Object.keys(gameData.achievements).sort((a, b) => {
        const stateA = gameState.achievements[a] || { unlocked: false };
        const stateB = gameState.achievements[b] || { unlocked: false };
        if (stateA.unlocked && !stateB.unlocked) return -1;
        if (!stateA.unlocked && stateB.unlocked) return 1;
        return 0;
    });

    keys.forEach(key => {
        const data = gameData.achievements[key];
        const state = gameState.achievements[key] || { unlocked: false };
        const isUnlocked = state.unlocked;

        if (data.isSecret && !isUnlocked) {
            const secretEl = document.createElement('div');
            secretEl.className = 'achievement secret';
            secretEl.innerHTML = `<div class="achievement-icon">🔒</div><div class="achievement-info">??? (Segreto)</div>`;
            list.appendChild(secretEl);
            return;
        }

        let progress = 0;
        let currentVal = 0;
        if (isUnlocked) {
            progress = 100;
        } else {
            if (data.type === 'click') currentVal = gameState.totalClicks;
            else if (data.type === 'score') currentVal = gameState.totalScore;
            else if (data.type === 'building') currentVal = gameState.teams[data.buildingId].count;
            else if (data.type === 'bps') currentVal = cookiesPerSecond;
            else if (data.type === 'time') currentVal = gameState.totalPlayTime;

            if (data.target && data.target > 0) {
                progress = Math.min(100, (currentVal / data.target) * 100);
            }
        }

        const el = document.createElement('div');
        el.className = `achievement ${isUnlocked ? 'unlocked' : 'locked'}`;

        let rewardHtml = '';
        if (data.reward) {
            let icon = '🎁';
            if (data.reward.type === 'bugs') icon = '🐞';
            if (data.reward.type === 'multiplier') icon = '⚡';
            if (data.reward.type === 'prestige') icon = '👑';
            if (data.reward.type === 'skin') icon = '👕';

            let val = data.reward.value;
            if (data.reward.type === 'bugs') val = formatNumber(val);
            if (data.reward.type === 'skin' && gameData.skins[data.reward.id]) val = gameData.skins[data.reward.id].name;

            rewardHtml = `<div class="achievement-reward">${icon} ${val}</div>`;
        }

        const description = (data.isSecret && !isUnlocked) ? data.desc : (data.realDesc || data.desc);

        el.innerHTML = `
            <div class="achievement-header">
                <span class="achievement-name">${data.name}</span>
                ${isUnlocked ? '<span class="check-icon">✅</span>' : ''}
            </div>
            <div class="achievement-desc">${description}</div>
            ${data.flavor ? `<div class="achievement-flavor">"${data.flavor}"</div>` : ''}
            ${!isUnlocked && data.target ? `
                <div class="ach-progress-container">
                    <div class="ach-progress-bar" style="width: ${progress}%"></div>
                    <span class="ach-progress-text">${formatNumber(currentVal)} / ${formatNumber(data.target)}</span>
                </div>
            ` : ''}
            ${rewardHtml}
        `;
        list.appendChild(el);
    });
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

function buildStores() {
    // Click Upgrades
    const clickList = document.getElementById('click-upgrade-list');
    if (clickList) {
        clickList.innerHTML = ''; // Pulizia preventiva
        for (const key in gameData.clickUpgrades) {
            const data = gameData.clickUpgrades[key];
            const el = document.createElement('div');
            el.className = 'click-upgrade';
            el.id = `click-upgrade-${key}`;
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
            clickList.appendChild(el);
        }
    }

    // Enhancements
    const enhList = document.getElementById('enhancement-list');
    if (enhList) {
        enhList.innerHTML = '';
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
            enhList.appendChild(el);
        }
    }
}

function updatePrestigeStore() {
    const listContainer = document.getElementById('prestige-list-container');
    if (!listContainer) return;

    const updateBtn = (id, data, state) => {
        const el = document.getElementById(`upgrade-${id}`);
        const btn = document.getElementById(`buy-${id}`);
        if (!btn || !el) return null;

        let isCompleted = false;
        if (!data.isCounted && state.purchased) isCompleted = true;
        if (data.isCounted && data.maxLevel && state.count >= data.maxLevel) isCompleted = true;

        let priority = 0;
        let cost = data.baseCost;

        if (isCompleted) {
            btn.textContent = "Posseduto";
            btn.className = "buy-btn prestige-btn owned";
            btn.disabled = true;
            el.classList.add('purchased');
            priority = 300;
        } else {
            btn.innerHTML = "Compra";
            btn.className = "buy-btn prestige-btn";
            const canAfford = gameState.prestigePoints >= data.baseCost;
            btn.disabled = !canAfford;
            el.classList.remove('purchased');
            priority = canAfford ? 200 : 210;
        }
        const countEl = document.getElementById(`count-${id}`);
        if (countEl) countEl.textContent = state.count;
        return { el: el, priority: priority, cost: cost };
    };

    const items = [];
    const ids = ['sinergia', 'accelerazione', 'ticketPremium', 'outsourcing', 'paracadute', 'crunchTime'];
    ids.forEach(id => {
        const item = updateBtn(id, gameData.prestigeUpgrades[id], gameState.prestigeUpgrades[id]);
        if (item) items.push(item);
    });

    items.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.cost - b.cost;
    });

    const mode = gameState.filterSettings.globalFilter || 'available';
    items.forEach(item => {
        let show = true;
        if (mode === 'available' && item.priority === 300) show = false;
        if (mode === 'purchased' && item.priority < 300) show = false;
        item.el.style.display = show ? 'flex' : 'none';
        listContainer.appendChild(item.el);
    });
}

function checkTabNotifications() {
    // Click Tab
    let clickNotify = false;
    for (const key in gameData.clickUpgrades) {
        const data = gameData.clickUpgrades[key];
        const state = gameState.clickUpgrades[key];
        if (!state) continue;
        if (!state.purchased && gameState.totalClicks >= data.requiredClicks && gameState.score >= data.cost) {
            clickNotify = true; break;
        }
    }
    const tabClick = document.getElementById('tab-click');
    if (tabClick) clickNotify && !tabClick.classList.contains('active') ? tabClick.classList.add('notify') : tabClick.classList.remove('notify');

    // Auto Tab
    let autoNotify = false;
    for (const key in gameData.buildingEnhancements) {
        const data = gameData.buildingEnhancements[key];
        const state = gameState.buildingEnhancements[key];
        if (!state) continue;
        const targetTeam = gameState.teams[data.targetTeam];
        if (!state.purchased && targetTeam.count >= data.requiredCount && gameState.score >= data.cost) {
            autoNotify = true; break;
        }
    }
    const tabAuto = document.getElementById('tab-auto');
    if (tabAuto) autoNotify && !tabAuto.classList.contains('active') ? tabAuto.classList.add('notify') : tabAuto.classList.remove('notify');

    // Prestige Tab
    let prestigeNotify = false;
    if (gameState.totalResets > 0 || gameState.prestigePoints > 0) {
        for (const key in gameData.prestigeUpgrades) {
            const data = gameData.prestigeUpgrades[key];
            const state = gameState.prestigeUpgrades[key];
            if (data.isCounted) {
                if (gameState.prestigePoints >= data.baseCost) prestigeNotify = true;
            } else {
                if (!state.purchased && gameState.prestigePoints >= data.baseCost) prestigeNotify = true;
            }
            if (prestigeNotify) break;
        }
    }
    const tabPrestige = document.getElementById('tab-prestige');
    if (tabPrestige) prestigeNotify && !tabPrestige.classList.contains('active') ? tabPrestige.classList.add('notify') : tabPrestige.classList.remove('notify');
}

function refreshAllStores() {
    for (const key in gameState.teams) {
        let amountToBuy = buyMultiplier;
        let isMax = false;
        if (buyMultiplier === 'MAX') {
            const max = calculateMaxAffordable(key);
            amountToBuy = max > 0 ? max : 1;
            isMax = true;
        }
        const currentCost = calculateBulkCost(key, amountToBuy);
        let teamBPS = gameData.teams[key].cpsPerUnit;
        for (const enhanceKey in gameState.buildingEnhancements) {
            const eData = gameData.buildingEnhancements[enhanceKey];
            if (eData.targetTeam === key && gameState.buildingEnhancements[enhanceKey].purchased) {
                teamBPS *= eData.multiplier;
            }
        }
        const totalUnitBPS = teamBPS * prestigeBonus * clickCPSBonus * bluescreenMultiplier;

        const costEl = document.getElementById(`cost-${key}`);
        const bpsEl = document.getElementById(`bps-${key}`);
        const countEl = document.getElementById(`count-${key}`);

        if (costEl) {
            let prefix = "Costo";
            if (isMax && amountToBuy > 1) prefix = `Costo (+${formatNumber(amountToBuy)})`;
            else if (!isMax && amountToBuy > 1) prefix = `Costo (${amountToBuy}x)`;
            costEl.textContent = `${prefix}: ${formatNumber(currentCost)}`;
            costEl.setAttribute('data-tooltip', currentCost.toLocaleString('it-IT'));
        }
        if (bpsEl) {
            bpsEl.textContent = `+${formatNumber(totalUnitBPS)} BPS cad.`;
            bpsEl.setAttribute('data-tooltip', totalUnitBPS.toLocaleString('it-IT'));
        }
        if (countEl) countEl.textContent = gameState.teams[key].count;
        const btn = document.getElementById(`buy-${key}`);
        if (btn) btn.disabled = (gameState.score < currentCost);
    }
    updateClickStore();
    updateEnhancementStore();
    updatePrestigeStore();
    updatePrestigeVisuals();
}

function updateUI() {
    let activeBPS = 0;
    const now = Date.now();
    for (let i = 0; i < clickHistory.length; i++) {
        if (now - clickHistory[i].time < 1000) activeBPS += clickHistory[i].value;
    }
    let totalDisplayBPS = cookiesPerSecond + activeBPS;

    scoreDisplay.textContent = formatNumber(gameState.score);
    scoreDisplay.setAttribute('data-tooltip', Math.round(gameState.score).toLocaleString('it-IT'));
    cpsDisplay.textContent = `BPS: ${formatNumber(totalDisplayBPS)}`;
    cpsDisplay.setAttribute('data-tooltip', totalDisplayBPS.toLocaleString('it-IT', { maximumFractionDigits: 1 }));

    const hudContainer = document.getElementById('hud-stats-container');
    const displayCareer = document.getElementById('display-career-bonus');
    const displayTokens = document.getElementById('prestige-points-display');

    if (gameState.totalResets > 0 || gameState.prestigePoints > 0 || gameState.lifetimePrestigePoints > 0) {
        if (hudContainer) hudContainer.style.display = 'flex';
        let baseBonus = (gameState.lifetimePrestigePoints || 0) * 0.01;
        let synergyCount = gameState.prestigeUpgrades.sinergia ? gameState.prestigeUpgrades.sinergia.count : 0;
        let synergyBonus = synergyCount * gameData.prestigeUpgrades.sinergia.bonusPerLevel * (gameState.lifetimePrestigePoints || 0);
        let totalPercent = ((baseBonus + synergyBonus) * 100);
        if (displayCareer) displayCareer.textContent = `+${totalPercent.toFixed(1)}%`;
        if (displayTokens) {
            displayTokens.textContent = formatNumber(gameState.prestigePoints);
            displayTokens.setAttribute('data-tooltip', gameState.prestigePoints.toLocaleString('it-IT'));
        }
    } else {
        if (hudContainer) hudContainer.style.display = 'none';
    }

    for (const key in gameState.teams) {
        let amountToBuy = buyMultiplier;
        let isMax = false;
        if (buyMultiplier === 'MAX') {
            const max = calculateMaxAffordable(key);
            amountToBuy = max > 0 ? max : 1;
            isMax = true;
        }
        const currentCost = calculateBulkCost(key, amountToBuy);
        const btn = document.getElementById(`buy-${key}`);
        if (btn) btn.disabled = (gameState.score < currentCost);
        const costEl = document.getElementById(`cost-${key}`);
        if (costEl) {
            let prefix = "Costo";
            if (isMax && amountToBuy > 1) prefix = `Costo (+${formatNumber(amountToBuy)})`;
            else if (!isMax && amountToBuy > 1) prefix = `Costo (${amountToBuy}x)`;
            costEl.textContent = `${prefix}: ${formatNumber(currentCost)}`;
            costEl.setAttribute('data-tooltip', currentCost.toLocaleString('it-IT'));
        }
    }

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
        if (gameState.prestigeUpgrades.crunchTime && gameState.prestigeUpgrades.crunchTime.purchased) {
            btnCrunch.style.display = 'block';
            const timerDiv = btnCrunch.querySelector('.skill-timer');
            if (now < crunchTimeEndTime) {
                const timeLeft = Math.ceil((crunchTimeEndTime - now) / 1000);
                crunchTimeMultiplier = 3;
                btnCrunch.className = 'skill-btn active';
                btnCrunch.firstChild.textContent = "🔥 IN CORSO 🔥";
                timerDiv.textContent = `${timeLeft}s`;
            } else if (now < crunchTimeCooldownEnd) {
                const timeLeft = Math.ceil((crunchTimeCooldownEnd - now) / 1000);
                crunchTimeMultiplier = 1;
                btnCrunch.className = 'skill-btn cooldown';
                btnCrunch.firstChild.textContent = "Ricarica...";
                const m = Math.floor(timeLeft / 60);
                const s = timeLeft % 60;
                timerDiv.textContent = `${m}:${s < 10 ? '0' + s : s}`;
            } else {
                crunchTimeMultiplier = 1;
                btnCrunch.className = 'skill-btn';
                btnCrunch.firstChild.textContent = "🔥 CRUNCH TIME 🔥";
                timerDiv.textContent = "CLICCA!";
            }
        } else {
            btnCrunch.style.display = 'none';
        }
    }
    checkTabNotifications();
}

function updatePrestigeVisuals() {
    const prestigeHubBtn = document.getElementById('open-prestige-hub-btn');
    const canPrestige = gameState.totalScore >= gameData.PRESTIGE_THRESHOLD;
    const hasPrestiged = gameState.totalResets > 0;

    if (prestigeHubBtn) {
        if (canPrestige || hasPrestiged) {
            prestigeHubBtn.style.display = 'block';
            if (canPrestige) {
                prestigeHubBtn.style.animation = 'pulseButton 1.5s infinite';
                prestigeHubBtn.style.borderColor = '#2ecc71';
                prestigeHubBtn.textContent = "👑 PROMOZIONE PRONTA!";
            } else {
                prestigeHubBtn.style.animation = 'none';
                prestigeHubBtn.style.borderColor = '#9b59b6';
                prestigeHubBtn.textContent = "👑 Promozione";
            }
        } else {
            prestigeHubBtn.style.display = 'none';
        }
    }

    const hubGainDisplay = document.getElementById('prestige-gain-display');
    const btnGoToContract = document.getElementById('btn-go-to-contract');
    if (hubGainDisplay && btnGoToContract) {
        const gained = calculatePrestigeGained();
        hubGainDisplay.textContent = formatNumber(gained);
        hubGainDisplay.setAttribute('data-tooltip', gained.toLocaleString('it-IT'));
        if (gained < 1) {
            btnGoToContract.textContent = "⚠️ Accumula più bug!";
            btnGoToContract.disabled = true;
            btnGoToContract.style.background = "#7f8c8d";
            btnGoToContract.style.cursor = "not-allowed";
            hubGainDisplay.style.color = "#e74c3c";
        } else {
            btnGoToContract.innerHTML = "📄 Visualizza Contratto";
            btnGoToContract.disabled = false;
            btnGoToContract.style.background = "linear-gradient(135deg, #8e44ad, #9b59b6)";
            btnGoToContract.style.cursor = "pointer";
            hubGainDisplay.style.color = "#2ecc71";
        }
    }
    const tabLabButton = document.getElementById('tab-prestige');
    if (tabLabButton) {
        tabLabButton.style.display = (gameState.totalResets > 0 || gameState.prestigePoints > 0) ? 'inline-block' : 'none';
    }
}

function updatePrestigeUI() {
    updatePrestigeVisuals();
    updatePrestigeStore();
}

function updateEnhancementStore() {
    const list = document.getElementById('enhancement-list');
    if (!list) return;
    const mode = gameState.filterSettings.globalFilter || 'available';
    let visibleCount = 0;
    let hasAnyBuilding = false;
    for (const key in gameState.teams) {
        if (gameState.teams[key].count > 0) { hasAnyBuilding = true; break; }
    }
    const items = [];
    for (const key in gameData.buildingEnhancements) {
        const data = gameData.buildingEnhancements[key];
        const state = gameState.buildingEnhancements[key];
        const targetTeam = gameState.teams[data.targetTeam];
        const el = document.getElementById(`enh-upgrade-${key}`);
        if (!el) continue;
        const btn = el.querySelector('.buy-btn');
        const progressBar = el.querySelector('.progress-bar-container');
        const isPurchased = state.purchased;
        const isUnlocked = targetTeam.count >= data.requiredCount;
        const canAfford = gameState.score >= data.cost;
        el.classList.remove('purchased', 'locked-item');
        btn.style.display = 'none';
        progressBar.style.display = 'none';
        let priority = 0;
        if (isPurchased) {
            el.classList.add('purchased');
            btn.textContent = "Posseduto";
            btn.disabled = true;
            btn.className = "buy-btn owned";
            btn.style.display = 'block';
            priority = 300;
        } else if (isUnlocked) {
            btn.textContent = "Compra";
            btn.disabled = !canAfford;
            btn.className = "buy-btn enhancement-btn";
            btn.style.display = 'block';
            priority = canAfford ? 200 : 210;
        } else {
            el.classList.add('locked-item');
            progressBar.style.display = 'block';
            const current = targetTeam.count;
            const target = data.requiredCount;
            const targetName = gameData.teams[data.targetTeam].name;
            let percent = Math.min((current / target) * 100, 100);
            if (isNaN(percent)) percent = 0;
            el.querySelector('.progress-bar-fill').style.width = `${percent}%`;
            const text = `${current} / ${target} ${targetName}`;
            el.querySelector('.progress-text').textContent = text;
            el.querySelector('.progress-text').title = text;
            priority = 100 - percent;
        }
        if (shouldItemBeVisible(mode, isPurchased, isUnlocked)) {
            el.style.display = 'flex';
            visibleCount++;
            items.push({ el: el, priority: priority, cost: data.cost });
        } else {
            el.style.display = 'none';
        }
    }
    items.sort((a, b) => {
        if (Math.floor(a.priority) !== Math.floor(b.priority)) return a.priority - b.priority;
        return a.cost - b.cost;
    });
    items.forEach(item => list.appendChild(item.el));
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
        case 'available': return isUnlocked && !isPurchased;
        case 'locked': return !isUnlocked && !isPurchased;
        case 'purchased': return isPurchased;
        case 'all': return true;
        default: return isUnlocked && !isPurchased;
    }
}

function setEmptyMessage(el, mode) {
    if (mode === 'available') el.textContent = "Nessun oggetto da comprare al momento.";
    else if (mode === 'locked') el.textContent = "Nessun oggetto bloccato in vista.";
    else if (mode === 'purchased') el.textContent = "Ancora nessun acquisto effettuato.";
    else el.textContent = "Niente da mostrare.";
}

// --- HELPERS PER SKIN ---
function equipSkin(skinId) {
    if (!gameState.skins.unlocked.includes(skinId)) return;
    gameState.skins.current = skinId;
    applySkinVisuals(skinId);
    if (typeof playSound === 'function') playSound('sound-click');
    if (window.EspooClicker) window.EspooClicker.saveGame();
    updateSkinsUI();
}

function applySkinVisuals(skinId) {
    const data = gameData.skins[skinId];
    if (!data) { applySkinVisuals('default'); return; }
    const photoNormal = document.getElementById('manager-photo-normal');
    const photoClicked = document.getElementById('manager-photo-clicked');
    if (photoNormal) {
        photoNormal.src = `./image/${data.img}`;
        photoNormal.style.filter = 'none';
    }
    if (photoClicked) {
        photoClicked.src = `./image/${data.imgClick}`;
        photoClicked.style.filter = 'none';
    }
}

function updateClickStore() {
    const list = document.getElementById('click-upgrade-list');
    if (!list) return;
    const mode = gameState.filterSettings.globalFilter || 'available';
    let visibleCount = 0;
    const items = [];
    for (const key in gameData.clickUpgrades) {
        const data = gameData.clickUpgrades[key];
        const state = gameState.clickUpgrades[key];
        const el = document.getElementById(`click-upgrade-${key}`);
        if (!el) continue;
        const btn = el.querySelector('.buy-btn');
        const progressBar = el.querySelector('.progress-bar-container');
        const isPurchased = state.purchased;
        const isUnlocked = gameState.totalClicks >= data.requiredClicks;
        const canAfford = gameState.score >= data.cost;
        el.classList.remove('purchased', 'locked-item');
        btn.style.display = 'none';
        progressBar.style.display = 'none';
        let priority = 0;
        if (isPurchased) {
            el.classList.add('purchased');
            btn.textContent = "Posseduto";
            btn.disabled = true;
            btn.className = "buy-btn owned";
            btn.style.display = 'block';
            priority = 300;
        } else if (isUnlocked) {
            btn.textContent = "Compra";
            btn.disabled = !canAfford;
            btn.className = "buy-btn buy-click-btn";
            btn.style.display = 'block';
            priority = canAfford ? 200 : 210;
        } else {
            el.classList.add('locked-item');
            progressBar.style.display = 'block';
            const current = gameState.totalClicks;
            const target = data.requiredClicks;
            let percent = Math.min((current / target) * 100, 100);
            if (isNaN(percent)) percent = 0;
            el.querySelector('.progress-bar-fill').style.width = `${percent}%`;
            const text = `Sblocco: ${formatNumber(current)} / ${formatNumber(target)}`;
            el.querySelector('.progress-text').textContent = text;
            el.querySelector('.progress-text').title = text;
            priority = 100 - percent;
        }
        if (shouldItemBeVisible(mode, isPurchased, isUnlocked)) {
            el.style.display = 'flex';
            visibleCount++;
            items.push({ el: el, priority: priority, cost: data.cost });
        } else {
            el.style.display = 'none';
        }
    }
    items.sort((a, b) => {
        if (Math.floor(a.priority) !== Math.floor(b.priority)) return a.priority - b.priority;
        return a.cost - b.cost;
    });
    items.forEach(item => list.appendChild(item.el));
    const emptyMsg = document.getElementById('click-upgrade-empty');
    if (emptyMsg) {
        emptyMsg.style.display = (visibleCount === 0) ? 'block' : 'none';
        if (visibleCount === 0) setEmptyMessage(emptyMsg, mode);
    }
}

function updateStatsUI() {
    const statsList = document.getElementById('stats-list');
    if (!statsList) return;
    const progress = Math.min((gameState.totalScore / gameData.PRESTIGE_THRESHOLD) * 100, 100);
    const progressColor = progress >= 100 ? '#2ecc71' : '#e74c3c';
    statsList.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">Tempo di gioco totale</span>
            <span class="stat-value">${formatTime(gameState.totalPlayTime)}</span>
        </div>
        <div style="border-bottom: 1px solid rgba(255,255,255,0.1); margin: 10px 0;"></div>
        <div class="stat-item">
            <span class="stat-label">Bug Attuali (Spendibili)</span>
            <span class="stat-value" style="color: #fff;">${formatNumber(gameState.score)}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label" style="color: #5dade2;">Highscore Livello (Run)</span>
            <span class="stat-value" style="color: #5dade2;">${formatNumber(gameState.totalScore)}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px; padding: 0 10px;">
            <div style="flex-grow: 1; height: 6px; background: #34495e; border-radius: 3px; overflow: hidden;">
                <div style="width: ${progress}%; height: 100%; background: ${progressColor}; transition: width 0.5s;"></div>
            </div>
            <span style="font-size: 0.75rem; color: ${progressColor};">${progress.toFixed(1)}% (Target: 10M)</span>
        </div>
        <div class="stat-item">
            <span class="stat-label" style="color: #f1c40f;">Highscore Carriera (Totale)</span>
            <span class="stat-value" style="color: #f1c40f;">${formatNumber(gameState.lifetimeScore)}</span>
        </div>
        <div style="border-bottom: 1px solid rgba(255,255,255,0.1); margin: 10px 0;"></div>
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