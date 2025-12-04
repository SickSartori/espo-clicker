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

function updateSkinsUI() {
    const grid = document.getElementById('skins-grid');
    if (!grid) return;

    grid.innerHTML = '';

    if (!gameState.skins || typeof gameState.skins !== 'object') gameState.skins = { unlocked: ['default'], current: 'default' };
    if (!Array.isArray(gameState.skins.unlocked)) gameState.skins.unlocked = ['default'];

    const unlockedList = gameState.skins.unlocked;
    const currentSkin = gameState.skins.current;

    const rarityMap = {
        'common': 'COMUNE',
        'rare': 'RARA',
        'epic': 'EPICA',
        'legendary': 'LEGGENDARIA'
    };

    for (const key in gameData.skins) {
        const data = gameData.skins[key];
        const isUnlocked = unlockedList.includes(key);
        const isEquipped = currentSkin === key;
        const isBuyable = !isUnlocked && data.cost !== undefined;
        const canAfford = isBuyable && gameState.prestigePoints >= data.cost;

        const rarityLabel = rarityMap[data.rarity] || 'COMUNE';

        const card = document.createElement('div');

        let classes = `skin-card rarity-${data.rarity || 'common'}`;
        if (isUnlocked) classes += ' unlocked';
        else classes += ' locked'; // Bloccata (anche se acquistabile)
        if (isEquipped) classes += ' equipped';
        // NOTA: Rimuoviamo la classe 'buyable' per non farla brillare/pulsare se non in hover
        // if (isBuyable) classes += ' buyable'; 
        if (canAfford) classes += ' can-afford-border'; // Manteniamo questo se vuoi il bordo colorato, o rimuovilo per total stealth

        card.className = classes;

        // Immagine: Sempre nascosta se non sbloccata
        const imgSrc = isUnlocked
            ? (data.img ? `./assets/image/${data.img}` : './assets/image/espo.png')
            : './assets/image/hidden.png';

        // --- MODIFICA STATO VISIVO (Senza Hover) ---
        let statusHtml = '';
        if (isEquipped) {
            // Prima: ✔ -> Ora: FontAwesome
            statusHtml = `<div class="equipped-icon"><i class="fa-solid fa-check"></i></div>`;
        } else if (isUnlocked) {
            // ...
        } else {
            // Prima: 🔒 Bloccata -> Ora: FontAwesome
            statusHtml = `<div class="skin-status-info"><i class="fa-solid fa-lock"></i> Bloccata</div>`;
        }

        // --- MODIFICA OVERLAY (Con Hover) ---
        let overlayContent = '';
        if (!isEquipped) {
            if (isBuyable) {
                const priceText = `<i class="fa-solid fa-flask"></i> ${data.cost} Token`;
                // Classi colore dinamiche
                const actionColor = canAfford ? '#2ecc71' : '#e74c3c';
                const actionMsg = canAfford ? 'CLICCA ORA' : 'INSUFFICIENTI';

                overlayContent = `
                    <h4>${data.name}</h4>
                    <div class="skin-desc">${data.desc || "???"}</div>
                    <div class="skin-price-tag">${priceText}</div>
                    <div class="skin-action-text" style="color: ${actionColor}">${actionMsg}</div>
                `;
            } else if (!isUnlocked) {
                overlayContent = `
                    <h4>${data.name}</h4>
                    <div class="skin-desc">${data.unlockHint || "Segreto"}</div>
                `;
            } else {
                overlayContent = `
                    <h4>${data.name}</h4>
                    <div class="skin-desc">${data.desc}</div>
                    <div class="skin-action-text" style="color:#2ecc71;">USA SKIN</div>
                `;
            }
        }

        card.innerHTML = `
            ${isEquipped ? '<div class="equipped-icon"><i class="fa-solid fa-check"></i></div>' : ''}
            
            <div class="skin-badge">${rarityLabel}</div>
            
            <div class="skin-img-container">
                <img src="${imgSrc}" class="skin-img" alt="${isUnlocked ? data.name : 'Segreto'}">
            </div>
            
            <div class="skin-name-display">${data.name}</div>
            
            ${statusHtml}

            ${!isEquipped ? `<div class="skin-overlay">${overlayContent}</div>` : ''}
        `;

        card.addEventListener('click', () => {
            if (isUnlocked) {
                if (typeof equipSkin === 'function') equipSkin(key);
            } else if (isBuyable) {
                if (typeof buySkin === 'function') buySkin(key);
            } else {
                card.style.transform = "translateX(5px)";
                setTimeout(() => card.style.transform = "translateX(0)", 100);
                if (window.EspooClicker) window.EspooClicker.showToast(data.unlockHint || "Obiettivo richiesto!", "warning");
            }
        });

        grid.appendChild(card);
    }
}


function updateAchievementsUI() {
    const list = document.getElementById('achievement-list');
    if (!list) return;

    list.innerHTML = '';

    const items = [];
    Object.keys(gameData.achievements).forEach(key => {
        const data = gameData.achievements[key];
        const state = gameState.achievements[key] || { unlocked: false, claimed: false };
        if (state.claimed === undefined) state.claimed = false;

        const isUnlocked = state.unlocked;
        const isClaimed = state.claimed;

        let progress = 0;
        let currentVal = 0;

        // Calcolo Valori e Progresso
        if (!isUnlocked) {
            if (data.type === 'click') currentVal = gameState.totalClicks;
            else if (data.type === 'score') currentVal = gameState.totalScore;
            else if (data.type === 'building') currentVal = gameState.teams[data.buildingId] ? gameState.teams[data.buildingId].count : 0;
            else if (data.type === 'time') currentVal = gameState.totalPlayTime;

            if (data.target && data.target > 0) {
                progress = Math.min(100, (currentVal / data.target) * 100);
            }
        } else {
            progress = 100;
        }

        // Sorting Priority: Claimable (4) > In Progress (3, sorted by progress) > Completed (2) > Secret (1)
        let priority = 0;
        if (isUnlocked && !isClaimed && data.reward) { priority = 4; }
        else if (!isUnlocked && !data.isSecret) { priority = 3; }
        else if (isUnlocked) { priority = 2; }
        else if (data.isSecret) { priority = 1; }

        items.push({ key, data, state, isUnlocked, isClaimed, progress, currentVal, priority });
    });

    // --- LOGICA DI ORDINAMENTO (Da Riscattare > Progresso > Completati) ---
    items.sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        if (a.priority === 3 && b.priority === 3) return b.progress - a.progress; // Progresso
        return a.data.name.localeCompare(b.data.name);
    });
    // --- FINE ORDINAMENTO ---


    items.forEach(item => {
        const { key, data, state, isUnlocked, isClaimed, progress, currentVal } = item;

        // Placeholder for Secrets
        if (data.isSecret && !isUnlocked) {
            const secretEl = document.createElement('div');
            secretEl.className = 'achievement achievement-secret';
            secretEl.innerHTML = `<div class="achievement-icon"><i class="fa-solid fa-lock"></i></div>...`;
            list.appendChild(secretEl);
            return;
        }

        const el = document.createElement('div');
        const claimableClass = (isUnlocked && !isClaimed && data.reward) ? 'claimable' : '';
        const statusClass = isUnlocked ? 'unlocked' : 'locked';

        el.className = `achievement ${statusClass} ${claimableClass}`;


        // --- PREPARAZIONE INFORMAZIONI PREMIO (Dettaglio) ---
        let rewardIcon = '<i class="fa-solid fa-trophy"></i>';
        let rewardDisplay = 'Gloria'; // Testo visibile nel bottone/tooltip
        let rewardTooltip = 'Nessun premio materiale.'; // Dettaglio per l'attributo title

        if (data.reward) {
            if (data.reward.type === 'bugs') {
                rewardIcon = '<i class="fa-solid fa-bug"></i>';
                rewardDisplay = `${formatNumber(data.reward.value)} Bug`;
                rewardTooltip = `Ricompensa: ${rewardDisplay}`;
            }
            else if (data.reward.type === 'skin') {
                rewardIcon = '<i class="fa-solid fa-tshirt"></i>';
                const skinName = (gameData.skins && gameData.skins[data.reward.id]) ? gameData.skins[data.reward.id].name : 'Skin Rara';
                rewardDisplay = `Skin: ${skinName}`;
                rewardTooltip = `Sblocca la Skin: ${skinName}`;
            }
            else if (data.reward.type === 'prestige') {
                rewardIcon = '<i class="fa-solid fa-flask"></i>';
                rewardDisplay = `${data.reward.value} Token Lab`;
                rewardTooltip = `Ottieni: ${rewardDisplay}`;
            }
            else if (data.reward.type === 'multiplier') {
                rewardIcon = '<i class="fa-solid fa-laptop"></i>';
                rewardDisplay = `BPS x${data.reward.value}`;
                rewardTooltip = `Bonus BPS Permanente`;
            }
        }

        let actionHtml = '';

        if (isUnlocked && !isClaimed && data.reward) {
            // CASO 1: DA RISCATTARE (con premio)
            actionHtml = `
                <button class="claim-btn" id="claim-${key}" title="Clicca per Riscuotere il premio!">
                    <span class="claim-visible">${rewardIcon} ${rewardDisplay}</span>
                    <span class="claim-hover">RISCATTA ORA!</span>
                </button>
            `;
        } else if (isClaimed || (isUnlocked && !data.reward)) {
            // CASO 2: COMPLETATO / Già Riscattato
            actionHtml = `<div class="achievement-done"><i class="fa-solid fa-check-circle"></i> Completato</div>`;
        } else {
            // CASO 3: IN CORSO (Barra Progresso)
            const progressStatusText = data.target ? (data.type === 'time' ? formatTime(currentVal) : `${formatNumber(currentVal)} / ${formatNumber(data.target)}`) : '';

            // FIX: Mostra il tooltip del premio sulla barra di progresso
            actionHtml = `
                <div class="ach-progress-container" data-tooltip="${rewardTooltip}">
                    <div class="ach-progress-bar" style="width: ${progress}%"></div>
                    <span class="ach-progress-text">${progressStatusText}</span>
                </div>
            `;
        }

        const description = (data.isSecret && !isUnlocked) ? data.desc : (data.realDesc || data.desc);

        el.innerHTML = `
            <div class="achievement-header">
                <span class="achievement-name">${data.name}</span>
                ${data.reward ? `<span class="reward-badge-text" data-tooltip="${rewardTooltip}">${rewardIcon}</span>` : ''}
            </div>
            <div class="achievement-desc">${description}</div>
            ${data.flavor ? `<div class="achievement-flavor">"${data.flavor}"</div>` : ''}
            
            <div class="achievement-footer" style="margin-top: 10px;">
                ${actionHtml}
            </div>
        `;

        list.appendChild(el);

        if (isUnlocked && !isClaimed && data.reward) {
            const claimBtn = document.getElementById(`claim-${key}`);
            if (claimBtn) {
                claimBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (typeof claimAchievementReward === 'function') claimAchievementReward(key);
                });
            }
        }
    });
}

function showClickFeedback(event) {
    // 1. Recupera il contenitore in modo sicuro
    const feedbackContainer = document.getElementById('click-feedback-container');
    if (!feedbackContainer) return;

    const feedback = document.createElement('span');
    feedback.className = 'click-feedback';

    // Logica Evento 404
    const now = Date.now();
    const COOLDOWN_404 = 300000;
    const lastCrash = gameState.lastBluescreenTimestamp || 0;
    const timeSinceLast = now - lastCrash;

    // Controllo esistenza variabili globali (sicurezza)
    const isBlueScreen = (typeof isBluescreenActive !== 'undefined') ? isBluescreenActive : false;
    const currentScore = gameState.score || 0;

    if (timeSinceLast > COOLDOWN_404 && Math.random() < 0.0005 && !isBlueScreen && currentScore >= 404) {
        feedback.textContent = 'Error 404';
        feedback.style.color = '#facc15';
        feedback.style.fontSize = '1.2rem';
        feedback.style.fontWeight = '900';
        feedback.style.zIndex = '100';

        let dynamicMultiplier = Math.floor(2 + Math.random() * 3);
        gameState.lastBluescreenTimestamp = now;

        if (window.EspooClicker) window.EspooClicker.saveGame();
        if (typeof triggerBluescreen === 'function') triggerBluescreen(dynamicMultiplier);
    } else {
        // Calcolo valore click
        let clickBonusPercent = 0.01;
        if (gameState.clickUpgrades.clickDivino && gameState.clickUpgrades.clickDivino.purchased) clickBonusPercent = 0.02;

        // Recupera variabili globali o fallback a 1
        const pBonus = (typeof prestigeBonus !== 'undefined') ? prestigeBonus : 1;
        const bsMult = (typeof bluescreenMultiplier !== 'undefined') ? bluescreenMultiplier : 1;
        const cps = (typeof cookiesPerSecond !== 'undefined') ? cookiesPerSecond : 0;

        let val = (gameState.baseClickValue * pBonus * bsMult);
        if (gameState.clickUpgrades.manoBionica && gameState.clickUpgrades.manoBionica.purchased) {
            val += (cps * clickBonusPercent);
        }

        feedback.textContent = `+${formatNumber(val)}`;
    }

    // Calcolo Posizione
    const rect = feedbackContainer.getBoundingClientRect();
    let x, y;

    if (event && event.clientX && event.clientY) {
        x = event.clientX - rect.left;
        y = event.clientY - rect.top;
    } else {
        x = rect.width / 2;
        y = rect.height / 2;
    }

    // Variazione casuale
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



function showToast(message, type = 'info') { // Aggiunto parametro type
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`; // Classe dinamica

    // Aggiungi Icona/Emoji basata sul tipo
    let icon = '';
    if (type === 'success') icon = '<i class="fa-solid fa-circle-check"></i> ';
    else if (type === 'error') icon = '<i class="fa-solid fa-circle-xmark"></i> ';
    else if (type === 'achievement') icon = '<i class="fa-solid fa-trophy"></i> ';
    else if (type === 'warning') icon = '<i class="fa-solid fa-triangle-exclamation"></i> ';
    else if (type === 'reward') icon = '<i class="fa-solid fa-gift"></i> ';
    else if (type === 'info') icon = '<i class="fa-solid fa-circle-info"></i> ';

    toast.innerHTML = icon + message;
    toastContainer.appendChild(toast);

    // Durata totale dell'animazione (4 secondi)
    setTimeout(() => toast.remove(), 4000);
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
        // Se il dato non esiste (es. vecchio salvataggio o refuso), saltiamo per evitare crash
        if (!data || !state) return null;

        const el = document.getElementById(`upgrade-${id}`);
        const btn = document.getElementById(`buy-${id}`);

        // Se non c'è l'HTML corrispondente, saltiamo
        if (!btn || !el) return null;

        let isCompleted = false;
        // Se è a livelli e ha un max level raggiunto
        if (data.isCounted && data.maxLevel && state.count >= data.maxLevel) isCompleted = true;
        // Se è singolo ed è già comprato
        if (!data.isCounted && state.purchased) isCompleted = true;

        let priority = 0;
        let cost = data.baseCost;

        // Calcolo costo dinamico per i livelli (se serve, altrimenti baseCost)
        // Nota: nel tuo game-logic attuale usi baseCost fisso o logica custom, 
        // qui manteniamo la visualizzazione coerente.

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

        // Aggiorna contatore livelli se esiste
        const countEl = document.getElementById(`count-${id}`);
        if (countEl && state) countEl.textContent = state.count || 0;

        // Aggiorna costo visivo
        const costEl = document.getElementById(`cost-${id}`);
        if (costEl) costEl.textContent = formatNumber(data.baseCost);

        return { el: el, priority: priority, cost: cost };
    };

    const items = [];

    // --- QUESTA È LA LISTA AGGIORNATA DEI NUOVI POTENZIAMENTI ---
    const ids = [
        'sinergia',
        'paracadute',
        'serverAlwaysOn',
        'contrattazione',
        'bugBounty',
        'eredita',
        'ticketPremium',
        'crunchTime'
    ];
    // Nota: Ho rimosso 'outsourcing' e 'accelerazione' che non esistono più nei nuovi dati
    // -------------------------------------------------------------

    ids.forEach(id => {
        // Controllo di sicurezza: passiamo i dati solo se esistono
        if (gameData.prestigeUpgrades[id] && gameState.prestigeUpgrades[id]) {
            const item = updateBtn(id, gameData.prestigeUpgrades[id], gameState.prestigeUpgrades[id]);
            if (item) items.push(item);
        }
    });

    // Ordinamento e Visualizzazione
    items.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.cost - b.cost;
    });

    const mode = gameState.filterSettings.globalFilter || 'available';

    // Nascondi tutti prima
    const allUpgrades = listContainer.querySelectorAll('.prestige-upgrade');
    allUpgrades.forEach(el => el.style.display = 'none');

    items.forEach(item => {
        let show = true;
        if (mode === 'available' && item.priority === 300) show = false;
        if (mode === 'purchased' && item.priority < 300) show = false;

        // Se il filtro lo permette, mostriamo l'elemento e lo riordiniamo
        if (show) {
            item.el.style.display = 'flex';
            listContainer.appendChild(item.el); // Sposta l'elemento in fondo (ordina visivamente)
        }
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
function updateBonusCounter() {
    const counter = document.getElementById('bonus-counter-display');
    const valueSpan = document.getElementById('combined-multiplier-value');

    // La variabile prestigeBonus ora contiene TUTTI i bonus permanenti (prestigio + achievement)
    if (prestigeBonus > 1.05) { // Mostra solo se il bonus è significativo
        if (counter) counter.style.display = 'block';
        if (valueSpan) {
            // Mostra il moltiplicatore totale con 2 decimali
            valueSpan.textContent = `x${prestigeBonus.toFixed(2)}`;

            // Aggiungi anche un po' di stile per farlo risaltare
            valueSpan.style.color = '#f1c40f';
        }
    } else {
        if (counter) counter.style.display = 'none';
    }
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

    const mobileWallets = document.querySelectorAll('.bug-wallet-amount');
    mobileWallets.forEach(el => {
        el.textContent = formatNumber(gameState.score);
    });

    if (gameState.totalResets > 0 || gameState.prestigePoints > 0 || gameState.lifetimePrestigePoints > 0) {
        if (hudContainer) hudContainer.style.display = 'flex';
        let baseBonus = (gameState.lifetimePrestigePoints || 0) * 0.01;
        let synergyCount = gameState.prestigeUpgrades.sinergia ? gameState.prestigeUpgrades.sinergia.count : 0;
        let synergyBonus = synergyCount * gameData.prestigeUpgrades.sinergia.bonusPerLevel * (gameState.lifetimePrestigePoints || 0);
        let totalPercent = ((baseBonus + synergyBonus) * 100);

        if (displayCareer) {
            displayCareer.textContent = `x${formatNumber(prestigeBonus)}`;
            let percent = ((prestigeBonus - 1) * 100).toFixed(0);
            displayCareer.setAttribute('data-tooltip', `Potenza Totale: x${formatNumber(prestigeBonus)}`);
        }
        if (displayTokens) {
            displayTokens.textContent = formatNumber(gameState.prestigePoints);
            displayTokens.setAttribute('data-tooltip', gameState.prestigePoints.toLocaleString('it-IT'));
        }
    } else {
        if (hudContainer) hudContainer.style.display = 'none';
    }
    const labWallet = document.getElementById('lab-wallet-amount');
    if (labWallet) {
        // Usa formatNumber se vuoi "1k", oppure toLocaleString per "1.000"
        labWallet.textContent = formatNumber(gameState.prestigePoints);
    }

    const bugWallet = document.getElementById('bug-wallet-amount');
    if (bugWallet) {
        bugWallet.textContent = formatNumber(gameState.bugWallet);
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
    const tabPrestige = document.getElementById('tab-prestige');
    if (tabPrestige) {
        // Mostra il tab se hai fatto almeno un reset O hai punti prestigio (attuali o storici)
        if (gameState.totalResets > 0 || gameState.prestigePoints > 0 || gameState.lifetimePrestigePoints > 0) {
            // Usa 'block' o 'flex' a seconda di come gestisci i bottoni, solitamente block per i button standard
            if (tabPrestige.style.display === 'none') {
                tabPrestige.style.display = 'block';
            }
        } else {
            tabPrestige.style.display = 'none';
        }
    }

    checkTabNotifications();
    checkOverlayNotifications();
    updateBonusCounter();

}

function updatePrestigeVisuals() {
    const prestigeBtn = document.getElementById('open-prestige-hub-btn');
    if (!prestigeBtn) return;

    const canPrestige = gameState.totalScore >= gameData.PRESTIGE_THRESHOLD;
    const hasPrestiged = gameState.totalResets > 0;

    // Se non deve essere visibile, nascondilo e basta
    if (!canPrestige && !hasPrestiged) {
        if (prestigeBtn.style.display !== 'none') prestigeBtn.style.display = 'none';
        return;
    }

    // Assicuriamoci che sia visibile
    if (prestigeBtn.style.display !== 'flex') prestigeBtn.style.display = 'flex';

    // Recupera (o crea se mancano) gli elementi interni SENZA distruggere tutto
    let icon = prestigeBtn.querySelector('.nav-icon');
    let label = prestigeBtn.querySelector('span');

    // Se il bottone è vuoto (primo avvio), creiamo la struttura una volta sola
    if (!icon || !label) {
        prestigeBtn.innerHTML = '<i class="nav-icon"></i> <span></span>';
        icon = prestigeBtn.querySelector('.nav-icon');
        label = prestigeBtn.querySelector('span');
    }

    if (canPrestige) {
        // --- STATO: PRONTA! (Verde) ---
        // Aggiungiamo la classe solo se non c'è già, per evitare reflow inutili
        if (!prestigeBtn.classList.contains('promotion-ready')) {
            prestigeBtn.classList.add('promotion-ready');
            prestigeBtn.style.cursor = "pointer";

            // Aggiorna icona e testo
            icon.className = 'nav-icon fa-solid fa-circle-check';
            label.textContent = 'PRONTA!';
        }
    } else {
        // --- STATO: IN PROGRESS (Viola/Standard) ---
        if (prestigeBtn.classList.contains('promotion-ready')) {
            prestigeBtn.classList.remove('promotion-ready');
            prestigeBtn.style.cursor = "default";
            icon.className = 'nav-icon fa-solid fa-rocket';
        }

        // Calcolo percentuale
        const progress = Math.min((gameState.totalScore / gameData.PRESTIGE_THRESHOLD) * 100, 99).toFixed(0);
        const newText = `${progress}%`;

        // Aggiorna il testo SOLO se è cambiato (risparmia risorse)
        if (label.textContent !== newText) {
            label.textContent = newText;
        }
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
    // Fallback a default se non esiste i dati
    const skinData = data || gameData.skins['default'];

    const photoNormal = document.getElementById('manager-photo-normal');
    const photoClicked = document.getElementById('manager-photo-clicked');

    // Lista di tutte le classi di sfondo possibili per poterle rimuovere
    const bgClasses = ['bg-common', 'bg-rare', 'bg-epic', 'bg-legendary', 'bg-divine'];

    if (photoNormal) {
        photoNormal.src = `./assets/image/${skinData.img}`;
        photoNormal.style.filter = 'none'; // Reset filtri vecchi

        // Rimuovi vecchi sfondi
        photoNormal.classList.remove(...bgClasses);

        // Aggiungi nuovo sfondo in base alla rarità O ID specifico
        if (skinId === 'jesus') photoNormal.classList.add('bg-divine');
        else if (skinData.rarity) photoNormal.classList.add(`bg-${skinData.rarity}`);
        else photoNormal.classList.add('bg-common');
    }

    if (photoClicked) {
        photoClicked.src = `./assets/image/${skinData.imgClick}`;
        photoClicked.style.filter = 'none';

        // Applica lo stesso sfondo anche all'immagine "cliccata"
        photoClicked.classList.remove(...bgClasses);
        if (skinId === 'jesus') photoClicked.classList.add('bg-divine');
        else if (skinData.rarity) photoClicked.classList.add(`bg-${skinData.rarity}`);
        else photoClicked.classList.add('bg-common');
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

function checkOverlayNotifications() {
    // Controlla se ci sono obiettivi sbloccati MA non riscattati (che hanno un premio)
    let hasClaimable = false;
    for (const key in gameData.achievements) {
        const state = gameState.achievements[key];
        const data = gameData.achievements[key];

        // Se è sbloccato, non ancora reclamato, e ha un premio definito
        if (state && state.unlocked && !state.claimed && data.reward) {
            hasClaimable = true;
            break;
        }
    }

    const achBtn = document.getElementById('open-achievements-btn');
    if (achBtn) {
        if (hasClaimable) achBtn.classList.add('notify-overlay');
        else achBtn.classList.remove('notify-overlay');
    }
}

function updateStatsUI() {
    const statsList = document.getElementById('stats-list');
    if (!statsList) return;

    // --- CALCOLI PRELIMINARI ---
    const progress = Math.min((gameState.totalScore / gameData.PRESTIGE_THRESHOLD) * 100, 100);

    // Calcolo Valore Click
    let clickBonusPercent = 0.01;
    if (gameState.clickUpgrades.clickDivino && gameState.clickUpgrades.clickDivino.purchased) clickBonusPercent = 0.02;
    let clickValuePercentBonus = 0;
    if (gameState.clickUpgrades.manoBionica && gameState.clickUpgrades.manoBionica.purchased) {
        clickValuePercentBonus = (cookiesPerSecond / (prestigeBonus * bluescreenMultiplier)) * clickBonusPercent;
    }
    const currentClickValue = (gameState.baseClickValue * prestigeBonus * bluescreenMultiplier) + clickValuePercentBonus;

    // Dati Offline
    const totalOffline = gameState.totalOfflineScore || 0;

    // --- NUOVO: Calcolo Efficienza Offline ---
    let offlineEff = 0.30; // Base 30%
    if (gameState.prestigeUpgrades.serverAlwaysOn) {
        offlineEff += (gameState.prestigeUpgrades.serverAlwaysOn.count * 0.10);
    }
    if (offlineEff > 1.0) offlineEff = 1.0;
    const offlinePercentText = (offlineEff * 100).toFixed(0) + "%";
    // -----------------------------------------

    // --- GENERAZIONE HTML ---
    statsList.innerHTML = `
        <div class="stats-container">
            
            <div class="stats-section">
                <div class="stats-header"><i class="fa-solid fa-wallet"></i> Economia Aziendale</div>
                <div class="stats-grid">
                    <div class="stat-box">
                        <span class="stat-label">Bug Attuali (Wallet)</span>
                        <span class="stat-value" style="color: #2ecc71;">${formatNumber(gameState.score)}</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label">Totale Run Attuale</span>
                        <span class="stat-value">${formatNumber(gameState.totalScore)}</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label">Totale Carriera</span>
                        <span class="stat-value" style="color: #f1c40f;">${formatNumber(gameState.lifetimeScore)}</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label">Guadagnati Offline</span>
                        <span class="stat-value" style="color: #3498db;">
                            ${formatNumber(totalOffline)} 
                            <span style="font-size: 0.8rem; color: #bdc3c7; font-weight: normal;">(${offlinePercentText})</span>
                        </span>
                    </div>
                </div>
                
                <div class="stat-progress-wrapper">
                    <div class="stat-progress-info">
                        <span>Progresso Promozione</span>
                        <span style="color: ${progress >= 100 ? '#2ecc71' : '#fff'}">${progress.toFixed(2)}%</span>
                    </div>
                    <div class="stat-progress-bg">
                        <div class="stat-progress-fill" style="width: ${progress}%;"></div>
                    </div>
                </div>
            </div>

            <div class="stats-section">
                <div class="stats-header"><i class="fa-solid fa-microchip"></i> Performance & Tech</div>     
                <div class="stats-grid">
                    <div class="stat-box">
                        <span class="stat-label">Produzione (BPS)</span>
                        <span class="stat-value">${formatNumber(cookiesPerSecond)}</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label">Valore Click</span>
                        <span class="stat-value" style="color: #e74c3c;">${formatNumber(currentClickValue)}</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label">Moltiplicatore Globale</span>
                        <span class="stat-value">x${formatNumber(prestigeBonus)}</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label">Crit Chance</span>
                        <span class="stat-value">${(goldenBugChance * 100).toFixed(2)}%</span>
                    </div>
                </div>
            </div>

            <div class="stats-section">
                <div class="stats-header"><i class="fa-solid fa-id-card"></i> Profilo & Visuals</div>
                <div class="stats-grid">
                    <div class="stat-box">
                        <span class="stat-label">Skin Equipaggiata</span>
                        <span class="stat-value" style="text-transform: capitalize; color: #9b59b6;">
                            ${(gameData.skins[gameState.skins.current] ? gameData.skins[gameState.skins.current].name : 'Default')}
                        </span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label">Tempo di Gioco</span>
                        <span class="stat-value">${formatTime(gameState.totalPlayTime)}</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label">Click Totali</span>
                        <span class="stat-value">${formatNumber(gameState.totalClicks)}</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label">Promozioni (Reset)</span>
                        <span class="stat-value">${formatNumber(gameState.totalResets)}</span>
                    </div>
                </div>
            </div>

        </div>
    `;
}
