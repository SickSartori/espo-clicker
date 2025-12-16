
// --- HELPER DI OTTIMIZZAZIONE (Cache & Text Check) ---
const domCache = new Map();

/**
 * Recupera un elemento dal DOM usando una cache interna.
 * Riduce le chiamate lente a document.getElementById.
 */
function getEl(id) {
    if (!domCache.has(id)) {
        const el = document.getElementById(id);
        if (el) domCache.set(id, el);
        else return null;
    }
    return domCache.get(id);
}

/**
 * Aggiorna il testo di un elemento solo se è cambiato.
 * Evita il "Layout Thrashing" del browser.
 */
function setTextIfChanged(elementId, newText) {
    const el = getEl(elementId);
    // Nota: String(newText) assicura che confrontiamo stringhe (es. "100" vs 100)
    if (el && el.textContent !== String(newText)) {
        el.textContent = newText;
        return true;
    }
    return false;
}

// ---------  FUNZIONI DI FORMATTORE ---------

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

// --- GENERATORE UNIVERSALE DI CARD (Nuovo Motore UI) ---

function renderStoreSection(config) {
    const list = document.getElementById(config.containerId);
    if (!list) return;

    const mode = gameState.filterSettings.globalFilter || 'available';
    let visibleCount = 0;

    // 1. MAPPING DATI
    let items = Object.keys(config.dataSource).map(key => {
        const data = config.dataSource[key];
        const state = config.stateSource[key];
        const status = config.getStatus(key, data, state);

        // Calcolo Priorità (Solo per ordinamento dinamico)
        let sortPriority = 0;
        if (status.isMaxed || (status.purchased && !data.isCounted)) sortPriority = 3;
        else if (status.unlocked) sortPriority = 1;
        else sortPriority = 2;

        return { key, data, state, status, sortPriority };
    });

    // 2. ORDINAMENTO (LOGICA RAFFORZATA)
    // Se è attivo 'fixedOrder' OPPURE siamo nei 'building' (Teams), usiamo l'ordine statico.
    if (config.fixedOrder || config.type === 'building') {
        // --- ORDINAMENTO FISSO (Per Costo Base Originale) ---
        items.sort((a, b) => {
            // Usa baseCost se esiste, altrimenti cost
            const baseA = a.data.baseCost !== undefined ? a.data.baseCost : (a.data.cost || 0);
            const baseB = b.data.baseCost !== undefined ? b.data.baseCost : (b.data.cost || 0);
            return baseA - baseB;
        });
    } else {
        // --- ORDINAMENTO DINAMICO (Per Upgrade, Skin, Lab) ---
        // Ordina per Disponibilità > Prezzo Attuale
        items.sort((a, b) => {
            if (a.sortPriority !== b.sortPriority) return a.sortPriority - b.sortPriority;

            const costA = a.status.currentCost || a.data.baseCost || a.data.cost || 0;
            const costB = b.status.currentCost || b.data.baseCost || b.data.cost || 0;
            return costA - costB;
        });
    }

    // 3. RENDERING NEL DOM
    items.forEach(item => {
        const { key, data, state, status } = item;
        const domId = `${config.type}-item-${key}`;
        let el = document.getElementById(domId);

        // Filtri Visibilità
        let isVisible = false;
        if (config.type === 'building') isVisible = true; // Teams sempre visibili
        else if (data.alwaysVisible) isVisible = true;
        else if (mode === 'all') isVisible = true;
        else if (mode === 'purchased' && (status.purchased || status.isMaxed)) isVisible = true;
        else if (mode === 'locked' && !status.unlocked && !status.purchased) isVisible = true;
        else if (mode === 'available' && status.unlocked && !status.purchased && !status.isMaxed) isVisible = true;

        if (!isVisible) { if (el) el.style.display = 'none'; return; }
        visibleCount++;

        // Creazione Elemento (Se non esiste)
        if (!el) {
            el = document.createElement('div');
            el.id = domId;
            el.className = config.cardClass || 'upgrade';

            const middleContent = config.useCustomBody
                ? `<div class="upgrade-bps" id="bps-${key}"></div>`
                : `<div class="upgrade-desc">${data.desc}</div>`;

            const shouldShowCount = config.showCount || (config.type === 'prestige' && data.isCounted);
            const countBadge = shouldShowCount ? `<span id="count-${key}" class="upgrade-count"></span>` : '';

            el.innerHTML = `
                <div class="upgrade-details">
                    <span class="upgrade-name">${data.name}</span>
                    ${middleContent}
                    <div class="upgrade-cost" id="cost-${key}-wrapper"><span class="cost-val" id="cost-${key}"></span></div>
                </div>
                <div class="upgrade-actions">
                    ${countBadge}
                    <button class="buy-btn" id="buy-${key}" data-upgrade-name="${key}">${status.label}</button>
                </div>
                <div class="progress-bar-container" style="display:none;">
                    <div class="progress-bar-fill"></div>
                    <span class="progress-text">Locked</span>
                </div>
            `;
            el.querySelector('.buy-btn').addEventListener('click', () => config.onBuy(key));

            // Appende l'elemento alla lista
            list.appendChild(el);
        } else {
            // FONDAMENTALE: Ri-appende l'elemento esistente per forzare l'ordine visivo calcolato dal sort()
            list.appendChild(el);
        }

        el.style.display = 'flex';

        // Aggiornamenti Testuali
        const costDisplay = el.querySelector('.cost-val');
        const countEl = document.getElementById(`count-${key}`);
        if (countEl && state.count !== undefined) {
            countEl.textContent = state.count;
            countEl.style.display = '';
        }

        if (costDisplay) {
            if (status.costText) costDisplay.textContent = status.costText;
            else {
                const val = status.currentCost || data.cost || 0;
                costDisplay.textContent = `Costo: ${formatNumber(val)}`;
            }
        }

        if (config.type === 'building') {
            const bpsEl = document.getElementById(`bps-${key}`);
            if (bpsEl) bpsEl.textContent = status.bpsText;
        }

        const btn = el.querySelector('.buy-btn');
        const costWrapper = el.querySelector('.upgrade-cost');
        const progressContainer = el.querySelector('.progress-bar-container');

        // Stati CSS (Purchased/Locked)
        el.classList.toggle('purchased', status.purchased);
        el.classList.toggle('locked-item', !status.unlocked && !status.purchased);

        // Logica Stati UI (Posseduto / Disponibile / Bloccato)
        if (status.isMaxed || (status.purchased && !data.isCounted && config.type !== 'building')) {
            btn.textContent = status.isMaxed ? "MAX" : "Posseduto";
            btn.className = "buy-btn owned";
            btn.disabled = true;
            btn.style.display = 'block';

            if (costWrapper) costWrapper.style.display = 'none';
            if (progressContainer) progressContainer.style.display = 'none';

        } else if (status.unlocked) {

            btn.textContent = status.label || "Compra";
            btn.className = `buy-btn ${config.btnClass || ''}`;
            btn.disabled = !status.canAfford;
            btn.style.display = 'block';
            if (costWrapper) costWrapper.style.display = 'block';
            if (progressContainer) progressContainer.style.display = 'none';

        } else {
            // BLOCCATO
            btn.style.display = 'none';
            if (costWrapper) costWrapper.style.display = 'none';

            if (progressContainer && status.progress !== undefined) {
                progressContainer.style.display = 'block';
                const fill = el.querySelector('.progress-bar-fill');
                const txt = el.querySelector('.progress-text');
                if (fill) fill.style.width = `${status.progress}%`;
                if (txt) txt.textContent = status.progressText || `${Math.floor(status.progress)}%`;
            }
        }
    });

    const emptyMsg = document.getElementById(config.emptyId);
    if (emptyMsg) {
        emptyMsg.style.display = (visibleCount === 0) ? 'block' : 'none';
        if (visibleCount === 0 && config.setEmptyMsg) config.setEmptyMsg(emptyMsg, mode);
    }
}

function refreshAllStores() {
    // 1. CLICK (Ordinamento Dinamico attivo di default)
    renderStoreSection({
        type: 'click',
        containerId: 'click-upgrade-list',
        emptyId: 'click-upgrade-empty',
        dataSource: gameData.clickUpgrades,
        stateSource: gameState.clickUpgrades,
        cardClass: 'click-upgrade',
        btnClass: 'buy-click-btn',

        onBuy: (key) => buyClickUpgrade(key),
        getStatus: (key, data, state) => {
            return {
                purchased: state.purchased,
                unlocked: gameState.totalClicks >= data.requiredClicks,
                canAfford: gameState.score >= data.cost,
                label: "Compra",
                currentCost: data.cost,
                progress: Math.min((gameState.totalClicks / data.requiredClicks) * 100, 100),
                progressText: `Click: ${formatNumber(gameState.totalClicks)} / ${formatNumber(data.requiredClicks)}`
            };
        },
        setEmptyMsg: (el, mode) => setEmptyMessage(el, mode)
    });

    // 2. MIGLIORIE (Ordinamento Dinamico)
    renderStoreSection({
        type: 'enhancement',
        containerId: 'enhancement-list',
        emptyId: 'enhancement-empty',
        dataSource: gameData.buildingEnhancements,
        stateSource: gameState.buildingEnhancements,
        cardClass: 'enhancement-upgrade',
        btnClass: 'enhancement-btn',
        onBuy: (key) => buyTeamEnhancement(key),
        getStatus: (key, data, state) => {
            const current = gameState.teams[data.targetTeam] ? gameState.teams[data.targetTeam].count : 0;
            return {
                purchased: state.purchased,
                unlocked: current >= data.requiredCount,
                canAfford: gameState.score >= data.cost,
                label: "Compra",
                currentCost: data.cost,
                progress: Math.min((current / data.requiredCount) * 100, 100),
                progressText: `${gameData.teams[data.targetTeam].name}: ${current}/${data.requiredCount}`
            };
        },
        setEmptyMsg: (el, mode) => setEmptyMessage(el, mode)
    });

    // 3. PRESTIGIO (Ordinamento Dinamico)
    renderStoreSection({
        type: 'prestige',
        containerId: 'prestige-list-container',
        emptyId: 'prestige-empty',
        dataSource: gameData.prestigeUpgrades,
        stateSource: gameState.prestigeUpgrades,
        cardClass: 'prestige-upgrade',
        btnClass: 'prestige-btn',
        onBuy: (key) => buyPrestigeUpgrade(key),
        getStatus: (key, data, state) => {
            const isMaxed = data.maxLevel && state.count >= data.maxLevel;
            // Se è un oggetto singolo (es. Fury) ed è comprato, è maxed
            const singlePurchased = !data.isCounted && state.purchased;

            return {
                purchased: singlePurchased,
                unlocked: !isMaxed && !singlePurchased,
                isMaxed: isMaxed,
                canAfford: gameState.prestigePoints >= data.baseCost,
                label: isMaxed || singlePurchased ? "Posseduto" : "Compra",
                costText: `Costo: ${formatNumber(data.baseCost)} Token`,
                currentCost: data.baseCost,
                progress: 100
            };
        },
        setEmptyMsg: (el, mode) => { el.textContent = "Laboratorio al completo!"; }
    });

    // 4. TEAMS (ORDINE FISSO!)
    renderStoreSection({
        type: 'building',
        containerId: 'building-list-container',
        emptyId: 'building-empty',
        dataSource: gameData.teams,
        stateSource: gameState.teams,
        cardClass: 'upgrade',
        btnClass: 'buy-building-btn',
        useCustomBody: true,
        showCount: true,
        fixedOrder: true,

        onBuy: (key) => buyTeam(key),
        getStatus: (key, data, state) => {
            let amountToBuy = buyMultiplier;
            let isMax = false;
            if (buyMultiplier === 'MAX') {
                const max = calculateMaxAffordable(key);
                amountToBuy = max > 0 ? max : 1;
                isMax = true;
            }
            const currentCost = calculateBulkCost(key, amountToBuy);
            let teamBPS = data.cpsPerUnit;
            for (const enhanceKey in gameState.buildingEnhancements) {
                const eData = gameData.buildingEnhancements[enhanceKey];
                const eState = gameState.buildingEnhancements[enhanceKey];
                if (eData.targetTeam === key && eState.purchased) teamBPS *= eData.multiplier;
            }
            const totalUnitBPS = teamBPS * prestigeBonus * clickCPSBonus * bluescreenMultiplier;

            let prefix = "Costo";
            if (isMax && amountToBuy > 1) prefix = `Costo (+${formatNumber(amountToBuy)})`;
            else if (!isMax && amountToBuy > 1) prefix = `Costo (${amountToBuy}x)`;

            return {
                unlocked: true,
                purchased: false,
                canAfford: gameState.score >= currentCost,
                label: "Compra",
                costText: `${prefix}: ${formatNumber(currentCost)}`,
                bpsText: `+${formatNumber(totalUnitBPS)} BPS cad.`,
                currentCost: currentCost
            };
        }
    });

    if (typeof updatePrestigeVisuals === 'function') updatePrestigeVisuals();
}

// --- AGGIORNA refreshAllStores PER PASSARE costText AL PRESTIGIO ---
function refreshAllStores() {
    // ... (Click e Enhancement rimangono uguali) ...
    renderStoreSection({
        type: 'click',
        containerId: 'click-upgrade-list',
        emptyId: 'click-upgrade-empty',
        dataSource: gameData.clickUpgrades,
        stateSource: gameState.clickUpgrades,
        cardClass: 'click-upgrade',
        btnClass: 'buy-click-btn',
        onBuy: (key) => buyClickUpgrade(key),
        getStatus: (key, data, state) => {
            return {
                purchased: state.purchased,
                unlocked: gameState.totalClicks >= data.requiredClicks,
                canAfford: gameState.score >= data.cost,
                label: "Compra",
                currentCost: data.cost // RenderStoreSection aggiungerà "Costo:"
            };
        },
        setEmptyMsg: (el, mode) => setEmptyMessage(el, mode)
    });

    renderStoreSection({
        type: 'prestige',
        containerId: 'prestige-list-container',
        emptyId: 'prestige-empty',
        dataSource: gameData.prestigeUpgrades,
        stateSource: gameState.prestigeUpgrades,
        cardClass: 'prestige-upgrade',
        btnClass: 'prestige-btn',
        onBuy: (key) => buyPrestigeUpgrade(key),
        getStatus: (key, data, state) => {
            const isMaxed = data.maxLevel && state.count >= data.maxLevel;
            return {
                purchased: !data.isCounted && state.purchased,
                unlocked: !isMaxed,
                isMaxed: isMaxed,
                canAfford: gameState.prestigePoints >= data.baseCost,
                label: isMaxed ? "MAX" : "Compra",
                // FIX: Aggiunta etichetta "Costo:" esplicita
                costText: `Costo: ${formatNumber(data.baseCost)} Token`,
                currentCost: data.baseCost
            };
        },
        setEmptyMsg: (el, mode) => { el.textContent = "Laboratorio al completo!"; }
    });

    // --- AGGIORNAMENTO PRESTIGIO ---
    renderStoreSection({
        type: 'prestige',
        containerId: 'prestige-list-container',
        emptyId: 'prestige-empty',
        dataSource: gameData.prestigeUpgrades,
        stateSource: gameState.prestigeUpgrades,
        cardClass: 'prestige-upgrade',
        btnClass: 'prestige-btn',
        onBuy: (key) => buyPrestigeUpgrade(key),
        getStatus: (key, data, state) => {
            const isMaxed = data.maxLevel && state.count >= data.maxLevel;
            return {
                purchased: !data.isCounted && state.purchased,
                unlocked: !isMaxed,
                isMaxed: isMaxed,
                canAfford: gameState.prestigePoints >= data.baseCost,
                label: isMaxed ? "MAX" : "Compra",
                // QUI LA MODIFICA: Specifica il testo esatto per il costo
                costText: `Costo: ${formatNumber(data.baseCost)} Token`,
                currentCost: data.baseCost
            };
        },
        setEmptyMsg: (el, mode) => { el.textContent = "Laboratorio al completo!"; }
    });

    // ... (Teams rimane uguale, ha già costText custom) ...
    renderStoreSection({
        type: 'building',
        containerId: 'building-list-container',
        emptyId: 'building-empty',
        dataSource: gameData.teams,
        stateSource: gameState.teams,
        cardClass: 'upgrade',
        btnClass: 'buy-building-btn',
        useCustomBody: true,
        showCount: true,
        onBuy: (key) => buyTeam(key),
        getStatus: (key, data, state) => {
            let amountToBuy = buyMultiplier;
            let isMax = false;
            if (buyMultiplier === 'MAX') {
                const max = calculateMaxAffordable(key);
                amountToBuy = max > 0 ? max : 1;
                isMax = true;
            }
            const currentCost = calculateBulkCost(key, amountToBuy);
            let teamBPS = data.cpsPerUnit;
            // Applica moltiplicatori delle migliorie...
            for (const enhanceKey in gameState.buildingEnhancements) {
                const eData = gameData.buildingEnhancements[enhanceKey];
                const eState = gameState.buildingEnhancements[enhanceKey];
                if (eData.targetTeam === key && eState.purchased) teamBPS *= eData.multiplier;
            }
            const totalUnitBPS = teamBPS * prestigeBonus * clickCPSBonus * bluescreenMultiplier;

            let prefix = "Costo";
            if (isMax && amountToBuy > 1) prefix = `Costo (+${formatNumber(amountToBuy)})`;
            else if (!isMax && amountToBuy > 1) prefix = `Costo (${amountToBuy}x)`;

            return {
                unlocked: true,
                purchased: false,
                canAfford: gameState.score >= currentCost,
                label: "Compra",
                costText: `${prefix}: ${formatNumber(currentCost)}`,
                bpsText: `+${formatNumber(totalUnitBPS)} BPS cad.`,
                currentCost: currentCost
            };
        }
    });

    if (typeof updatePrestigeVisuals === 'function') updatePrestigeVisuals();
}

// --- NUOVA FUNZIONE PRINCIPALE DI AGGIORNAMENTO ---
function refreshAllStores() {

    // 1. NEGOZIO CLICK
    renderStoreSection({
        type: 'click',
        containerId: 'click-upgrade-list',
        emptyId: 'click-upgrade-empty',
        dataSource: gameData.clickUpgrades,
        stateSource: gameState.clickUpgrades,
        cardClass: 'click-upgrade',
        btnClass: 'buy-click-btn',
        onBuy: (key) => buyClickUpgrade(key),
        getStatus: (key, data, state) => {
            const isUnlocked = gameState.totalClicks >= data.requiredClicks;
            return {
                purchased: state.purchased,
                unlocked: isUnlocked,
                canAfford: gameState.score >= data.cost,
                label: "Compra",
                progress: Math.min((gameState.totalClicks / data.requiredClicks) * 100, 100),
                progressText: `Click: ${formatNumber(gameState.totalClicks)} / ${formatNumber(data.requiredClicks)}`
            };
        },
        setEmptyMsg: (el, mode) => setEmptyMessage(el, mode)
    });

    // 2. NEGOZIO AUTO (MIGLIORIE)
    renderStoreSection({
        type: 'enhancement',
        containerId: 'enhancement-list',
        emptyId: 'enhancement-empty',
        dataSource: gameData.buildingEnhancements,
        stateSource: gameState.buildingEnhancements,
        cardClass: 'enhancement-upgrade',
        btnClass: 'enhancement-btn',
        onBuy: (key) => buyTeamEnhancement(key),
        getStatus: (key, data, state) => {
            const targetTeam = gameState.teams[data.targetTeam];
            const current = targetTeam ? targetTeam.count : 0;
            return {
                purchased: state.purchased,
                unlocked: current >= data.requiredCount,
                canAfford: gameState.score >= data.cost,
                label: "Compra",
                progress: Math.min((current / data.requiredCount) * 100, 100),
                progressText: `${gameData.teams[data.targetTeam].name}: ${current}/${data.requiredCount}`
            };
        },
        setEmptyMsg: (el, mode) => setEmptyMessage(el, mode)
    });

    // 3. NEGOZIO PRESTIGIO
    renderStoreSection({
        type: 'prestige',
        containerId: 'prestige-list-container',
        emptyId: 'prestige-empty',
        dataSource: gameData.prestigeUpgrades,
        stateSource: gameState.prestigeUpgrades,
        cardClass: 'prestige-upgrade',
        btnClass: 'prestige-btn',
        onBuy: (key) => buyPrestigeUpgrade(key),
        getStatus: (key, data, state) => {
            const isMaxed = data.maxLevel && state.count >= data.maxLevel;
            return {
                purchased: !data.isCounted && state.purchased,
                unlocked: !isMaxed,
                isMaxed: isMaxed,
                canAfford: gameState.prestigePoints >= data.baseCost,
                label: isMaxed ? "MAX" : "Compra",
                currentCost: data.baseCost,
                progress: 100
            };
        },
        setEmptyMsg: (el, mode) => { el.textContent = "Laboratorio al completo!"; }
    });

    // 4. NEGOZIO TEAMS (Nuovo!)
    renderStoreSection({
        type: 'building', // Usa prefisso 'building-item-'
        containerId: 'building-list-container',
        emptyId: 'building-empty', // Aggiungi questo div nel HTML se vuoi, opzionale
        dataSource: gameData.teams,
        stateSource: gameState.teams,
        cardClass: 'upgrade',
        btnClass: 'buy-building-btn',
        useCustomBody: true, // Attiva BPS display
        showCount: true,     // Attiva badge numero
        onBuy: (key) => buyTeam(key),
        getStatus: (key, data, state) => {
            // Calcoli specifici per edifici
            let amountToBuy = buyMultiplier;
            let isMax = false;

            if (buyMultiplier === 'MAX') {
                const max = calculateMaxAffordable(key);
                amountToBuy = max > 0 ? max : 1;
                isMax = true;
            }

            const currentCost = calculateBulkCost(key, amountToBuy);

            // Calcolo BPS Dinamico per visualizzazione
            let teamBPS = data.cpsPerUnit;
            // Applica moltiplicatori delle migliorie
            for (const enhanceKey in gameState.buildingEnhancements) {
                const eData = gameData.buildingEnhancements[enhanceKey];
                const eState = gameState.buildingEnhancements[enhanceKey];
                if (eData.targetTeam === key && eState.purchased) {
                    teamBPS *= eData.multiplier;
                }
            }
            const totalUnitBPS = teamBPS * prestigeBonus * clickCPSBonus * bluescreenMultiplier;

            // Formattazione etichetta costo
            let prefix = "Costo";
            if (isMax && amountToBuy > 1) prefix = `Costo (+${formatNumber(amountToBuy)})`;
            else if (!isMax && amountToBuy > 1) prefix = `Costo (${amountToBuy}x)`;

            return {
                unlocked: true, // Gli edifici sono sempre sbloccati nella logica attuale
                purchased: false,
                canAfford: gameState.score >= currentCost,
                label: "Compra",
                costText: `${prefix}: ${formatNumber(currentCost)}`,
                bpsText: `+${formatNumber(totalUnitBPS)} BPS cad.`,
                currentCost: currentCost // Fallback
            };
        }
    });

    // Aggiorna Visuals Extra
    if (typeof updatePrestigeVisuals === 'function') updatePrestigeVisuals();
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
        'legendary': 'LEGGENDARIA',
        'christmas': 'NATALE'
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
            ? (data.img ? `./assets/image/${data.img}` : './assets/image/espo.webp')
            : './assets/image/hidden.webp';

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

    // Logica Evento 404 (Rimane invariata per gestire l'easter egg)
    const now = Date.now();
    const COOLDOWN_404 = 300000;
    const lastCrash = gameState.lastBluescreenTimestamp || 0;
    const timeSinceLast = now - lastCrash;

    // Controllo esistenza variabili globali (sicurezza)
    const isBlueScreen = (typeof isBluescreenActive !== 'undefined') ? isBluescreenActive : false;
    const currentScore = gameState.score || 0;

    if (timeSinceLast > COOLDOWN_404 && Math.random() < 0.0005 && !isBlueScreen && currentScore >= 404) {
        // --- LOGICA EVENTO 404 ---
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
        // --- LOGICA CLICK STANDARD (Aggiornata con Calcolo Centralizzato) ---

        // Usa la funzione centralizzata se disponibile, altrimenti fallback sicuro
        let val = (typeof calculateClickValue === 'function')
            ? calculateClickValue()
            : gameState.baseClickValue;

        feedback.textContent = `+${formatNumber(val)}`;

        // Gestione Colori Tema Natale vs Standard
        if (document.body.classList.contains('theme-christmas')) {
            // Alterna casualmente tra Rosso Natale e Verde Pino
            feedback.style.color = Math.random() > 0.5 ? '#e74c3c' : '#2ecc71';
            feedback.style.textShadow = '0 0 5px #fff'; // Alone bianco neve
        } else {
            // Colore Standard
            feedback.style.color = 'rgba(239, 68, 68, 0.7)';
        }
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

    // Variazione casuale per rendere l'effetto più naturale
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



const toastQueue = [];          // Coda dei messaggi in attesa
let visibleToasts = 0;          // Contatore messaggi attualmente a schermo
const MAX_VISIBLE_TOASTS = 3;   // Limite massimo richiesto
let lastToastMsg = "";          // Memoria ultimo messaggio (per anti-spam)
let lastToastTime = 0;          // Timestamp ultimo messaggio

function showToast(message, type = 'info') {
    // 1. ANTI-SPAM: Evita messaggi identici consecutivi
    // Se il messaggio è uguale all'ultimo ed è passato meno di 2 secondi, ignoralo.
    const now = Date.now();
    if (message === lastToastMsg && (now - lastToastTime < 2000)) {
        return;
    }

    // Aggiorna memoria
    lastToastMsg = message;
    lastToastTime = now;

    // 2. Aggiungi alla Coda
    toastQueue.push({ message, type });

    // 3. Prova a processare la coda
    processToastQueue();
}

function processToastQueue() {
    // Se abbiamo già raggiunto il limite o non c'è nulla in coda, fermati
    if (visibleToasts >= MAX_VISIBLE_TOASTS || toastQueue.length === 0) return;

    // Estrai il prossimo messaggio (FIFO)
    const data = toastQueue.shift();
    visibleToasts++; // Occupa uno slot

    createToastDOM(data.message, data.type);
}

function createToastDOM(message, type) {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    // Icone
    let icon = '';
    if (type === 'success') icon = '<i class="fa-solid fa-circle-check"></i> ';
    else if (type === 'error') icon = '<i class="fa-solid fa-circle-xmark"></i> ';
    else if (type === 'achievement') icon = '<i class="fa-solid fa-trophy"></i> ';
    else if (type === 'warning') icon = '<i class="fa-solid fa-triangle-exclamation"></i> ';
    else if (type === 'reward') icon = '<i class="fa-solid fa-gift"></i> ';
    else if (type === 'info') icon = '<i class="fa-solid fa-circle-info"></i> ';

    toast.innerHTML = icon + message;
    toastContainer.appendChild(toast);

    // Rimozione Automatica
    // Il CSS gestisce l'animazione di uscita a 3.5s, noi rimuoviamo il nodo a 4s
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }

        visibleToasts--; // Libera uno slot

        // Appena si libera un posto, controlla se c'è qualcun altro in fila
        // Usiamo un piccolo timeout per dare fluidità visiva
        setTimeout(processToastQueue, 100);
    }, 4000);
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
    // 1. Calcoli Preliminari (BPS Visivo)
    const activeBPS = calculateVisualBPS();

    // 2. Aggiornamenti Sezioni
    updateScoreBoard(activeBPS);
    updateHUD();
    updateWallets();
    updateStoreButtons(); // Gestisce i costi e i tasti "enabled/disabled"
    updateSkillButton();  // Gestisce Espo Fury / Crunch Time
    updateTabsVisibility();

    // 3. Notifiche e Extra
    checkOverlayNotifications();
    updateBonusCounter();
}

// --- SOTTO-FUNZIONI (Copia queste sotto updateUI) ---

function calculateVisualBPS() {
    let active = 0;
    const now = Date.now();
    for (let i = 0; i < clickHistory.length; i++) {
        if (now - clickHistory[i].time < 1000) active += clickHistory[i].value;
    }
    return cookiesPerSecond + active;
}

function updateScoreBoard(totalBPS) {
    setTextIfChanged('score-display', formatNumber(gameState.score));

    const scoreEl = getEl('score-display');
    if (scoreEl) scoreEl.setAttribute('data-tooltip', Math.round(gameState.score).toLocaleString('it-IT'));

    setTextIfChanged('cps-display', `BPS: ${formatNumber(totalBPS)}`);
    const cpsEl = getEl('cps-display');
    if (cpsEl) cpsEl.setAttribute('data-tooltip', totalBPS.toLocaleString('it-IT', { maximumFractionDigits: 1 }));
}

function updateHUD() {
    const hudContainer = getEl('hud-stats-container');
    const displayCareer = getEl('display-career-bonus');
    const displayTokens = getEl('prestige-points-display');

    if (gameState.totalResets > 0 || gameState.prestigePoints > 0 || gameState.lifetimePrestigePoints > 0) {
        if (hudContainer && hudContainer.style.display === 'none') hudContainer.style.display = 'flex';
        if (displayCareer) setTextIfChanged('display-career-bonus', `x${formatNumber(prestigeBonus)}`);
        if (displayTokens) setTextIfChanged('prestige-points-display', formatNumber(gameState.prestigePoints));
    } else {
        if (hudContainer && hudContainer.style.display !== 'none') hudContainer.style.display = 'none';
    }
}

function updateWallets() {
    setTextIfChanged('lab-wallet-amount', formatNumber(gameState.prestigePoints));
    setTextIfChanged('bug-wallet-amount', formatNumber(gameState.score));

    // Mobile Wallets (Aggiornamento di gruppo)
    document.querySelectorAll('.bug-wallet-amount').forEach(el => {
        if (el.textContent !== formatNumber(gameState.score)) el.textContent = formatNumber(gameState.score);
    });
}

function updateStoreButtons() {
    // A. Teams
    for (const key in gameState.teams) {
        // Logica Costi
        let amountToBuy = buyMultiplier;
        let isMax = false;
        if (buyMultiplier === 'MAX') {
            const max = calculateMaxAffordable(key);
            amountToBuy = max > 0 ? max : 1;
            isMax = true;
        }
        const currentCost = calculateBulkCost(key, amountToBuy);

        // UI Aggiornamento
        const btn = getEl(`buy-${key}`);
        if (btn) btn.disabled = (gameState.score < currentCost);

        const costEl = getEl(`cost-${key}`);
        if (costEl) {
            let prefix = isMax && amountToBuy > 1 ? `Costo (+${formatNumber(amountToBuy)})` :
                (!isMax && amountToBuy > 1) ? `Costo (${amountToBuy}x)` : "Costo";
            const costText = `${prefix}: ${formatNumber(currentCost)}`;
            if (costEl.textContent !== costText) costEl.textContent = costText;
        }
    }

    // B. Click Upgrades
    for (const key in gameState.clickUpgrades) {
        if (!gameState.clickUpgrades[key].purchased) {
            const container = getEl(`click-upgrade-${key}`);
            if (container) {
                const btn = container.querySelector('.buy-btn');
                if (btn) btn.disabled = (gameState.score < gameData.clickUpgrades[key].cost);
            }
        }
    }

    // C. Enhancements
    for (const key in gameState.buildingEnhancements) {
        if (!gameState.buildingEnhancements[key].purchased) {
            const container = getEl(`enh-upgrade-${key}`) || getEl(`enhancement-item-${key}`);
            if (container) {
                const btn = container.querySelector('.buy-btn');
                if (btn) btn.disabled = (gameState.score < gameData.buildingEnhancements[key].cost);
            }
        }
    }
}

function updateSkillButton() {
    const btnCrunch = getEl('skill-crunchTime');
    if (!btnCrunch) return;

    if (gameState.prestigeUpgrades.crunchTime && gameState.prestigeUpgrades.crunchTime.purchased) {
        if (btnCrunch.style.display === 'none') btnCrunch.style.display = 'block';

        const timerDiv = btnCrunch.querySelector('.skill-timer');
        const now = Date.now();

        if (now < crunchTimeEndTime) {
            // ATTIVO
            const timeLeft = Math.ceil((crunchTimeEndTime - now) / 1000);
            if (btnCrunch.className !== 'skill-btn active') btnCrunch.className = 'skill-btn active';
            btnCrunch.childNodes[0].textContent = '🔥 BPS x7 🔥';
            if (timerDiv) timerDiv.textContent = `${timeLeft}s`;
        } else if (now < crunchTimeCooldownEnd) {
            // COOLDOWN
            const timeLeft = Math.ceil((crunchTimeCooldownEnd - now) / 1000);
            if (btnCrunch.className !== 'skill-btn cooldown') btnCrunch.className = 'skill-btn cooldown';
            btnCrunch.childNodes[0].textContent = 'Ricarica...';
            const m = Math.floor(timeLeft / 60);
            const s = timeLeft % 60;
            if (timerDiv) timerDiv.textContent = `${m}:${s < 10 ? '0' + s : s}`;
        } else {
            // PRONTO
            if (btnCrunch.className !== 'skill-btn') btnCrunch.className = 'skill-btn';
            btnCrunch.childNodes[0].textContent = '🔥 ESPO FURY 🔥';
            if (timerDiv) timerDiv.textContent = 'CLICCA!';
        }
    } else {
        if (btnCrunch.style.display !== 'none') btnCrunch.style.display = 'none';
    }
}

function updateTabsVisibility() {
    const tabPrestige = getEl('tab-prestige');
    if (tabPrestige) {
        const show = gameState.totalResets > 0 || gameState.prestigePoints > 0 || gameState.lifetimePrestigePoints > 0;
        tabPrestige.style.display = show ? 'block' : 'none';
    }
}

function updatePrestigeVisuals() {
    const prestigeBtn = document.getElementById('open-prestige-hub-btn');
    if (!prestigeBtn) return;

    const canPrestige = gameState.totalScore >= gameData.PRESTIGE_THRESHOLD;
    const hasPrestiged = gameState.totalResets > 0;

    if (!canPrestige && !hasPrestiged) {
        if (prestigeBtn.style.display !== 'none') prestigeBtn.style.display = 'none';
        return;
    }

    if (prestigeBtn.style.display !== 'flex') prestigeBtn.style.display = 'flex';

    let icon = prestigeBtn.querySelector('.nav-icon');
    let label = prestigeBtn.querySelector('span');

    if (!icon || !label) {
        prestigeBtn.innerHTML = '<i class="nav-icon"></i> <span></span>';
        icon = prestigeBtn.querySelector('.nav-icon');
        label = prestigeBtn.querySelector('span');
    }

    if (canPrestige) {
        if (!prestigeBtn.classList.contains('promotion-ready')) {
            prestigeBtn.classList.add('promotion-ready');
            prestigeBtn.style.cursor = "pointer";
            icon.className = 'nav-icon fa-solid fa-circle-check';
            label.textContent = 'PRONTA!';
        }
    } else {
        if (prestigeBtn.classList.contains('promotion-ready')) {
            prestigeBtn.classList.remove('promotion-ready');
            prestigeBtn.style.cursor = "default";
            icon.className = 'nav-icon fa-solid fa-rocket';
        }

        const progress = Math.min((gameState.totalScore / gameData.PRESTIGE_THRESHOLD) * 100, 99).toFixed(0);
        const newText = `${progress}%`;

        if (label.textContent !== newText) {
            label.textContent = newText;
        }
    }
}


function updatePrestigeUI() {
    updatePrestigeVisuals();
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

    if (skinId === 'christmas' && typeof isChristmasSeason === 'function' && isChristmasSeason()) {
        triggerChristmasOverlay();
    }

    gameState.skins.current = skinId;

    // Applica grafica e suoni loop (questo funziona sempre, anche fuori stagione)
    applySkinVisuals(skinId, true);

    if (typeof playSound === 'function') playSound('sound-click');
    if (window.EspooClicker) window.EspooClicker.saveGame();
    updateSkinsUI();
}

function triggerChristmasOverlay() {
    const overlay = document.getElementById('christmas-overlay');
    const soundMerry = document.getElementById('sound-merry');

    const skinsModal = document.getElementById('skins-modal');
    if (skinsModal) {
        skinsModal.style.display = 'none';
    }
    if (overlay) {
        overlay.style.display = 'flex';
        overlay.style.animation = 'fadeIn 0.5s';
    }
    if (soundMerry) {
        soundMerry.volume = gameState.user.masterVolume * gameState.user.sfxVolume;
        soundMerry.currentTime = 0;
        soundMerry.play().catch(e => { });
    }
    setTimeout(() => {
        if (overlay) overlay.style.display = 'none';
    }, 4000);
}

let christmasAudioInitialized = false;


function applySkinVisuals(skinId, forcePlayMusic = false) {
    const data = gameData.skins[skinId];
    const skinData = data || gameData.skins['default'];

    const photoNormal = document.getElementById('manager-photo-normal');
    const photoClicked = document.getElementById('manager-photo-clicked');
    const snowContainer = document.getElementById('snow-container');
    const snowAudio = document.getElementById('sound-snowball');

    // Riferimento alla musica di background standard
    const bgMusic = document.getElementById('sound-bg-music');

    const goldenBugImg = document.querySelector('#golden-bug img');
    const bgClasses = ['bg-common', 'bg-rare', 'bg-epic', 'bg-legendary', 'bg-divine', 'bg-christmas'];

    const theme = skinData.themeConfig || {}; // Carica config o usa vuoto

    // 1. Gestione Classi Body (Pulizia e Applicazione)
    document.body.classList.remove('theme-christmas'); // Rimuovi vecchie classi note
    if (theme.bodyClass) {
        document.body.classList.add(theme.bodyClass);
    }

    // 2. Gestione Neve
    if (snowContainer) {
        if (theme.hasSnow) {
            snowContainer.style.display = 'block';
            if (snowContainer.innerHTML === '') createSnowflakes();
        } else {
            snowContainer.style.display = 'none';
        }
    }

    // 3. Gestione Immagine Golden Bug
    if (goldenBugImg) {
        goldenBugImg.src = theme.goldenBugImg || './assets/image/bug.webp';
    }

    // 4. Gestione Audio Intelligente
    // Identifica la traccia da suonare (Default: Musica Base)
    let targetAudio = bgMusic;
    let targetAudioId = 'sound-bg-music';

    // Se la skin ha una musica speciale, usala
    if (theme.specialMusic) {
        const specialEl = document.getElementById(theme.specialMusic);
        if (specialEl) {
            targetAudio = specialEl;
            targetAudioId = theme.specialMusic;
        }
    }

    // FERMA tutto ciò che stava suonando (per evitare sovrapposizioni)
    if (bgMusic) { bgMusic.pause(); bgMusic.currentTime = 0; }
    if (snowAudio) { snowAudio.pause(); snowAudio.currentTime = 0; }

    // AVVIA la nuova traccia (se non ci sono eventi bloccanti come Fury o Video)
    if (targetAudio && !window.currentActiveEvent) {
        targetAudio.loop = true;

        // Recupera il volume corretto dal Mixer (Salvataggio Utente)
        let customVol = 0.3; // Fallback di sicurezza
        if (gameState.user.audioCustom && gameState.user.audioCustom[targetAudioId] !== undefined) {
            customVol = gameState.user.audioCustom[targetAudioId];
        }

        // Applica volume calcolato
        targetAudio.volume = gameState.user.masterVolume * gameState.user.musicVolume * customVol;

        // Play (se il volume è > 0 o se forzato dal cambio skin)
        if (forcePlayMusic || (gameState.user.masterVolume > 0 && gameState.user.musicVolume > 0)) {
            targetAudio.play().catch(e => { /* Autoplay bloccato, normale su refresh */ });
        }
    }

    // ... (Il resto della funzione per gestire le immagini rimane invariato) ...
    if (photoNormal) {
        photoNormal.src = `./assets/image/${skinData.img}`;
        photoNormal.style.filter = 'none';
        photoNormal.classList.remove(...bgClasses);
        // ... switch classi bg ...
        if (skinId === 'jesus') photoNormal.classList.add('bg-divine');
        else if (skinData.rarity) photoNormal.classList.add(`bg-${skinData.rarity}`);
        else if (skinId === 'christmas') photoNormal.classList.add('bg-christmas');
        else photoNormal.classList.add('bg-common');
    }

    if (photoClicked) {
        photoClicked.src = `./assets/image/${skinData.imgClick}`;
        photoClicked.style.filter = 'none';
        photoClicked.classList.remove(...bgClasses);
        // ... switch classi bg ...
        if (skinId === 'jesus') photoClicked.classList.add('bg-divine');
        else if (skinData.rarity) photoClicked.classList.add(`bg-${skinData.rarity}`);
        else if (skinId === 'christmas') photoClicked.classList.add('bg-christmas');
        else photoClicked.classList.add('bg-common');
    }
}


// Nuova funzione helper per creare i fiocchi (Aggiungila alla fine del file ui-functions.js)
function createSnowflakes() {
    const container = document.getElementById('snow-container');
    if (!container) return;

    const numberOfSnowflakes = 60; // Numero fiocchi

    for (let i = 0; i < numberOfSnowflakes; i++) {
        const snowflake = document.createElement('div');
        snowflake.className = 'snowflake';

        const size = Math.random() * 5 + 3 + 'px';
        snowflake.style.width = size;
        snowflake.style.height = size;

        snowflake.style.left = Math.random() * 100 + 'vw';
        const duration = Math.random() * 7 + 5;
        snowflake.style.animationDuration = duration + 's';
        snowflake.style.animationDelay = (Math.random() * -20) + 's';
        snowflake.style.opacity = Math.random() * 0.7 + 0.3;

        container.appendChild(snowflake);
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

    // Calcolo Valore Click (Aggiornato con Calcolo Centralizzato)
    const currentClickValue = (typeof calculateClickValue === 'function')
        ? calculateClickValue()
        : (gameState.baseClickValue * (typeof prestigeBonus !== 'undefined' ? prestigeBonus : 1));

    // Dati Offline
    const totalOffline = gameState.totalOfflineScore || 0;

    // Calcolo Efficienza Offline
    let offlineEff = 0.30; // Base 30%
    if (gameState.prestigeUpgrades && gameState.prestigeUpgrades.serverAlwaysOn) {
        offlineEff += (gameState.prestigeUpgrades.serverAlwaysOn.count * 0.10);
    }
    if (offlineEff > 1.0) offlineEff = 1.0;
    const offlinePercentText = (offlineEff * 100).toFixed(0) + "%";

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