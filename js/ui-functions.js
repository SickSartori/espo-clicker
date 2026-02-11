
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
    let el = getEl(elementId);

    if (el && el.textContent !== String(newText)) {
        el.textContent = newText;
        return true;
    }

    return false;
}

// ---------  FUNZIONI DI FORMATTORE ---------

function formatNumber(num) {
    // 1. Gestione sicurezza: se è null/undefined restituisce "0"
    if (num === undefined || num === null) return "0";

    // 2. Conversione Universale Protetta
    let decimal;

    // Se è già un'istanza valida di Decimal, usala direttamente
    if (num instanceof Decimal) {
        decimal = num;
    } else {
        // Se è un numero puro, una stringa o un oggetto "sporco" dal JSON
        try {
            // Tentativo di creazione standard
            decimal = new Decimal(num);
        } catch (e) {
            // Se fallisce (es. errore t.indexOf), prova a forzare la stringa o restituisci 0
            try {
                decimal = new Decimal(String(num));
            } catch (e2) {
                console.warn("Errore formattazione numero:", num);
                return "0";
            }
        }
    }

    // 3. Gestione Numeri Piccoli (< 1000)
    if (decimal.abs().lt(1000)) {
        let val = decimal.toNumber();
        if (Number.isInteger(val)) return val.toLocaleString('it-IT');
        return val.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // 4. Gestione Suffissi (k, M, B, T...)
    const suffixes = ["", "k", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];

    // L'esponente ci dice quanto è grande il numero (es. 1e6 ha esponente 6)
    let exponent = decimal.e;

    // L'indice del suffisso è l'esponente diviso 3 (es. 6/3 = indice 2 -> "M")
    let suffixIndex = Math.floor(exponent / 3);

    // 5. Caso: Suffisso Disponibile
    if (suffixIndex < suffixes.length) {
        // Dividiamo per 1000^indice per ottenere il numero "base" (es. 1.500.000 / 1e6 = 1.5)
        let scaled = decimal.div(new Decimal("1e" + (suffixIndex * 3)));
        return scaled.toFixed(2).replace('.', ',') + " " + suffixes[suffixIndex];
    }

    // 6. Caso: Numero Enorme (Notazione Scientifica Pulita)
    return decimal.toExponential(2).replace('.', ',');
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
    if (days > 0) timeString += `${days}${gameData.texts.format.time.d} `;
    if (hours > 0 || days > 0) timeString += `${hours}${gameData.texts.format.time.h} `;
    if (minutes > 0 || hours > 0 || days > 0) timeString += `${minutes}${gameData.texts.format.time.m} `;
    timeString += `${seconds}${gameData.texts.format.time.s}`;
    return timeString;
}


let matrixFrameId = null;

function startMatrixEffect() {
    const canvas = document.getElementById('matrix-canvas');
    const ctx = canvas.getContext('2d');

    // Adatta il canvas a tutto lo schermo
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Caratteri Matrix (Katakana + Numeri + Lettere)
    const katakana = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン';
    const latin = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const nums = '0123456789';
    const alphabet = katakana + latin + nums;

    const fontSize = 16;
    const columns = canvas.width / fontSize; // Numero di colonne

    const drops = [];
    // Inizializza le gocce (tutte partono da y=1)
    for (let index = 0; index < columns; index++) {
        drops[index] = 1;
    }

    const draw = () => {
        // Sfondo nero semitrasparente per creare l'effetto scia
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#0F0'; // Verde Matrix
        ctx.font = fontSize + 'px monospace';

        for (let i = 0; i < drops.length; i++) {
            const text = alphabet.charAt(Math.floor(Math.random() * alphabet.length));
            ctx.fillText(text, i * fontSize, drops[i] * fontSize);

            // Reset casuale della goccia o loop
            if (drops[i] * fontSize > canvas.height && Math.random() > 0.975)
                drops[i] = 0;

            // Incrementa Y
            drops[i]++;
        }
        matrixFrameId = requestAnimationFrame(draw);
    };

    // Loop a 30 FPS
    if (matrixFrameId) cancelAnimationFrame(matrixFrameId);
    draw();

    // Gestione Resize
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}

function stopMatrixEffect() {
    if (matrixFrameId) {
        cancelAnimationFrame(matrixFrameId);
        matrixFrameId = null;
    }
    // Pulisci il canvas (opzionale, ma pulito)
    const canvas = document.getElementById('matrix-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

// --- GENERATORE UNIVERSALE DI CARD ---
function renderStoreSection(config) {
    const list = document.getElementById(config.containerId);
    if (!list) return;

    // Cerca il genitore scrollabile corretto in base al contesto (Tab, Store o Colonna)
    let scrollParent = list.closest('.tab-content'); // 1. Prova Tab (Left Column Desktop)
    if (!scrollParent) scrollParent = list.closest('#building-store'); // 2. Prova Store Teams (Right Column Desktop)
    if (!scrollParent) scrollParent = list.closest('.game-column'); // 3. Prova Colonna (Mobile o fallback)

    let previousScrollTop = 0;
    if (scrollParent) {
        previousScrollTop = scrollParent.scrollTop;
    }

    const mode = gameState.filterSettings.globalFilter || 'available';
    let visibleCount = 0;

    // MAPPING DATI
    let items = Object.keys(config.dataSource).map(key => {
        const data = config.dataSource[key];
        const state = config.stateSource[key];
        const status = config.getStatus(key, data, state);

        // Calcolo Priorità (Solo per ordinamento dinamico)
        let sortPriority = 0;

        // Ordine richiesto:
        // 1. Acquistabili (Available)
        // 2. Bloccati (Locked)
        // 3. Posseduti (Owned/Maxed)

        if (status.isMaxed || (status.purchased && !data.isCounted)) {
            sortPriority = 3; // Posseduti in fondo
        } else if (status.unlocked) {
            sortPriority = 1; // Acquistabili in cima
        } else {
            sortPriority = 2; // Bloccati nel mezzo
        }

        return { key, data, state, status, sortPriority };
    });

    // ORDINAMENTO
    if (config.fixedOrder || config.type === 'building') {
        // --- ORDINAMENTO FISSO (Per Teams) ---
        items.sort((a, b) => {
            const baseA = a.data.baseCost !== undefined ? a.data.baseCost : (a.data.cost || 0);
            const baseB = b.data.baseCost !== undefined ? b.data.baseCost : (b.data.cost || 0);
            return baseA - baseB;
        });
    } else {
        // --- ORDINAMENTO DINAMICO (Per Upgrade, Skin, Lab) ---
        items.sort((a, b) => {
            // Prima per Priorità (Acquistabili -> Bloccati -> Posseduti)
            if (a.sortPriority !== b.sortPriority) return a.sortPriority - b.sortPriority;

            // Poi per Costo (dal più economico)
            const costA = a.status.currentCost || a.data.baseCost || a.data.cost || 0;
            const costB = b.status.currentCost || b.data.baseCost || b.data.cost || 0;
            return costA - costB;
        });
    }

    // RENDERING NEL DOM
    items.forEach(item => {
        const { key, data, state, status } = item;
        const domId = `${config.type}-item-${key}`;
        let el = document.getElementById(domId);

        // Filtri Visibilità
        let isVisible = false;
        if (config.type === 'building') isVisible = true;
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

            // Listener con PreventDefault per evitare focus jump
            const btn = el.querySelector('.buy-btn');
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                config.onBuy(key);
            });

            list.appendChild(el);
        } else {
            // RIORDINO: Se non è ordine fisso, sposta l'elemento nella nuova posizione corretta
            if (!config.fixedOrder) {
                list.appendChild(el);
            }
        }

        el.style.display = 'flex';

        // Aggiornamenti Testuali
        const costDisplay = el.querySelector('.cost-val');
        const countEl = document.getElementById(`count-${key}`);

        if (countEl && state.count !== undefined) {
            const countText = String(state.count);
            if (countEl.textContent !== countText) countEl.textContent = countText;

            if (config.type === 'building') {
                countEl.style.display = 'inline-block';
                countEl.style.opacity = state.count > 0 ? '1' : '0.5';
            } else {
                countEl.style.display = '';
            }
        }

        if (costDisplay) {
            let txt = '';
            if (status.costText) {
                txt = status.costText;
            } else {
                const val = status.currentCost || data.cost || 0;
                txt = `Costo: ${formatNumber(val)}`;
            }
            if (costDisplay.textContent !== txt) costDisplay.textContent = txt;
        }

        if (config.type === 'building') {
            const bpsEl = document.getElementById(`bps-${key}`);
            if (bpsEl && bpsEl.textContent !== status.bpsText) bpsEl.textContent = status.bpsText;
        }

        const btn = el.querySelector('.buy-btn');
        const costWrapper = el.querySelector('.upgrade-cost');
        const progressContainer = el.querySelector('.progress-bar-container');

        // Stati CSS
        if (el.classList.contains('purchased') !== status.purchased) el.classList.toggle('purchased', status.purchased);
        const isLockedItem = !status.unlocked && !status.purchased;
        if (el.classList.contains('locked-item') !== isLockedItem) el.classList.toggle('locked-item', isLockedItem);

        // Stati UI
        if (status.isMaxed || (status.purchased && !data.isCounted && config.type !== 'building')) {
            const label = status.isMaxed ? "MAX" : "Posseduto";
            if (btn.textContent !== label) btn.textContent = label;
            btn.className = "buy-btn owned";
            btn.disabled = true;
            btn.style.display = 'block';
            if (costWrapper) costWrapper.style.display = 'none';
            if (progressContainer) progressContainer.style.display = 'none';

        } else if (status.unlocked) {
            const label = status.label || "Compra";
            if (btn.textContent !== label) btn.textContent = label;

            const newClass = `buy-btn ${config.btnClass || ''}`;
            if (btn.className !== newClass) btn.className = newClass;

            btn.disabled = !status.canAfford;
            btn.style.display = 'block';
            if (costWrapper) costWrapper.style.display = 'block';
            if (progressContainer) progressContainer.style.display = 'none';

        } else {
            // Bloccato
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

    // --- RIPRISTINA POSIZIONE SCROLL ---
    if (scrollParent) {
        scrollParent.scrollTop = previousScrollTop;
    }
}

function updateClickStore()
{
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
                canAfford: gameState.score.gte(data.cost),
                label: gameData.texts.ui.buy,
                progress: Math.min((gameState.totalClicks / data.requiredClicks) * 100, 100),   // Calcolo preciso della barra di progresso
                progressText: `Click: ${formatNumber(gameState.totalClicks)} / ${formatNumber(data.requiredClicks)}`
            };
        },
        setEmptyMsg: (el, mode) => setEmptyMessage(el, mode)
    });
}

// --- FUNZIONE PRINCIPALE UNICA DI AGGIORNAMENTO NEGOZI ---
function refreshAllStores() {

    // NEGOZIO CLICK (Richiama la funzione ottimizzata sopra)
    updateClickStore();

    // NEGOZIO AUTO (MIGLIORIE)
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
                canAfford: gameState.prestigePoints.gte(data.baseCost),
                label: gameData.texts.ui.buy,
                progress: Math.min((current / data.requiredCount) * 100, 100),
                progressText: `${gameData.teams[data.targetTeam].name}: ${current}/${data.requiredCount}`
            };
        },
        setEmptyMsg: (el, mode) => setEmptyMessage(el, mode)
    });

    // NEGOZIO PRESTIGIO
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
            const singlePurchased = !data.isCounted && state.purchased;
            return {
                purchased: singlePurchased,
                unlocked: !isMaxed && !singlePurchased,
                isMaxed: isMaxed,
                canAfford: gameState.prestigePoints.gte(data.baseCost),
                label: isMaxed || singlePurchased ? gameData.texts.ui.owned : (isMaxed ? gameData.texts.ui.max : gameData.texts.ui.buy.toUpperCase()),
                costText: `Costo: ${formatNumber(data.baseCost)} Token`,
                currentCost: data.baseCost,
                progress: 100
            };
        },
        setEmptyMsg: (el, mode) => { el.textContent = gameData.texts.ui.labFull; }
    });

    // NEGOZIO TEAMS
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
            let amountToBuy = window.buyMultiplier;
            let isMax = false;

            if (amountToBuy === 'MAX') {
                const max = calculateMaxAffordable(key);
                amountToBuy = max > 0 ? max : 1;
                isMax = true;
            }

            const currentCost = calculateBulkCost(key, amountToBuy);

            let teamBPS = data.cpsPerUnit;
            for (const enhanceKey in gameState.buildingEnhancements) {
                const eData = gameData.buildingEnhancements[enhanceKey];
                const eState = gameState.buildingEnhancements[enhanceKey];
                if (eData.targetTeam === key && eState.purchased) {
                    teamBPS *= eData.multiplier;
                }
            }
            const totalUnitBPS = teamBPS * prestigeBonus * clickCPSBonus * bluescreenMultiplier;

            let prefix = "Costo";
            if (isMax && amountToBuy > 1) prefix = `Costo (+${formatNumber(amountToBuy)})`;
            else if (!isMax && amountToBuy > 1) prefix = `Costo (${amountToBuy}x)`;

            return {
                unlocked: true,
                purchased: false,
                canAfford: gameState.score.gte(currentCost),
                label: gameData.texts.ui.buy,
                costText: `${prefix}: ${formatNumber(currentCost)}`,
                bpsText: `+${formatNumber(totalUnitBPS)} BPS cad.`,
                currentCost: currentCost
            };
        }
    });

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
        'common': 'COMUNE', 'rare': 'RARA', 'epic': 'EPICA',
        'legendary': 'LEGGENDARIA', 'divine': 'DIVINA', 'christmas': 'NATALE'
    };

    // Mappatura Skin ID -> Obiettivo
    const skinToAchievement = {};
    for (const achKey in gameData.achievements) {
        const ach = gameData.achievements[achKey];
        if (ach.reward && ach.reward.type === 'skin') {
            const skinId = ach.reward.id || ach.reward.value;
            skinToAchievement[skinId] = ach;
        }
    }

    for (const key in gameData.skins) {
        const data = gameData.skins[key];
        const isUnlocked = unlockedList.includes(key);
        const isEquipped = currentSkin === key;
        const isBuyable = !isUnlocked && data.cost !== undefined;
        const canAfford = isBuyable && gameState.prestigePoints.gte(data.cost);
        const rarityLabel = rarityMap[data.rarity] || 'COMUNE';

        // --- LOGICA DESCRIZIONE CON TRANSIZIONE ---
        let displayDescHTML = "";

        if (isUnlocked) {
            // Skin sbloccata: Lore fissa
            displayDescHTML = `<div class="skin-lore">${data.desc || "..."}</div>`;
        } else if (isBuyable) {
            // Skin acquistabile: Rimuoviamo scritte descrittive per non tagliare il layout
            // Il prezzo e il tasto COMPRA sono già presenti nel footer della card
            displayDescHTML = `<div class="skin-lore"></div>`;
        } else {
            // Skin BLOCCATA da obiettivo: Struttura per dissolvenza
            const linkedAch = skinToAchievement[key];
            let requirement = "";
            let baseText = gameData.texts.ui.unknown;

            if (linkedAch) {
                const isSecretLocked = linkedAch.isSecret && !gameState.achievements[linkedAch.id || key]?.unlocked;
                requirement = isSecretLocked ? gameData.texts.ui.secretGoal : (linkedAch.realDesc || linkedAch.desc);
                baseText = linkedAch.name;
            } else if (data.unlockHint) {
                requirement = data.unlockHint;
                baseText = gameData.texts.ui.skinLocked;
            }

            displayDescHTML = `
        <div class="skin-fade-wrapper">
            <div class="desc-base">${baseText}</div>
            <div class="desc-hover">${requirement}</div>
        </div>
    `;
        }

        // Elemento Footer (Bottone)
        let footerHtml = '';
        if (isEquipped) {
            footerHtml = `<div class="skin-btn equipped"><i class="fa-solid fa-check"></i> ${gameData.texts.ui.equipped}</div>`;
        } else if (isUnlocked) {
            footerHtml = `<div class="skin-btn action" onclick="equipSkin('${key}')">${gameData.texts.ui.useSkin}</div>`;
        } else if (isBuyable) {
            const priceClass = canAfford ? '#f1c40f' : '#e74c3c';
            const btnText = canAfford ? gameData.texts.ui.buy.toUpperCase() : gameData.texts.ui.noToken;
            const btnStyle = canAfford ? 'background:#f1c40f; color:#000;' : 'background:#333; color:#777; cursor:not-allowed;';
            const clickAction = canAfford ? `onclick="buySkin('${key}')"` : '';

            footerHtml = `
                <div class="skin-price" style="color:${priceClass}"><i class="fa-solid fa-flask"></i> ${data.cost}</div>
                <div class="skin-btn" style="${btnStyle}" ${clickAction}>${btnText}</div>
            `;
        } else {
            footerHtml = `<div class="skin-btn locked"><i class="fa-solid fa-lock"></i> ${gameData.texts.ui.skinLocked}</div>`;
        }

        const card = document.createElement('div');
        let classes = `skin-card rarity-${data.rarity || 'common'}`;
        if (isUnlocked) classes += ' unlocked'; else classes += ' locked';
        if (isEquipped) classes += ' equipped';
        card.className = classes;

        const imgSource = isUnlocked ? (data.img ? `assets/image/${data.img}` : 'assets/image/espo.webp') : 'assets/image/hidden.webp';

        card.innerHTML = `
            <div class="skin-badge">${rarityLabel}</div>
            <div class="skin-img-container">
                <img src="${imgSource}" class="skin-img">
            </div>
            <div class="skin-name-display" title="${data.name}">${data.name}</div>
            <div class="skin-desc">${displayDescHTML}</div>
            <div class="skin-card-spacer"></div>
            <div class="skin-footer">${footerHtml}</div>
        `;

        grid.appendChild(card);
    }
}


function updateAchievementsUI() {
    const list = document.getElementById('achievement-list');
    if (!list) return;

    list.innerHTML = '';
    const items = [];

    const typeIcons = {
        'click': 'fa-computer-mouse',
        'building': 'fa-building',
        'score': 'fa-coins',
        'time': 'fa-hourglass-half',
        'custom': 'fa-star'
    };

    Object.keys(gameData.achievements).forEach(key => {
        const data = gameData.achievements[key];
        const state = gameState.achievements[key] || { unlocked: false, claimed: false };
        if (state.claimed === undefined) state.claimed = false;

        const isUnlocked = state.unlocked;
        const isClaimed = state.claimed;
        let progress = 0;
        let currentVal = 0;

        // Calcolo Progresso
        if (!isUnlocked) {
            if (data.type === 'click') currentVal = gameState.totalClicks;
            else if (data.type === 'score') currentVal = gameState.totalScore;
            else if (data.type === 'building') currentVal = gameState.teams[data.buildingId] ? gameState.teams[data.buildingId].count : 0;
            else if (data.type === 'time') currentVal = gameState.totalPlayTime;

            if (data.target && data.target > 0) progress = Math.min(100, (currentVal / data.target) * 100);
        } else { progress = 100; }

        // Priorità
        let priority = 0;
        if (isUnlocked && !isClaimed && data.reward) priority = 4;
        else if (!isUnlocked && !data.isSecret) priority = 3;
        else if (isUnlocked) priority = 2;
        else if (data.isSecret) priority = 1;

        items.push({ key, data, state, isUnlocked, isClaimed, progress, currentVal, priority, typeIcons });
    });

    items.sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        if (a.priority === 3 && b.priority === 3) return b.progress - a.progress;
        return a.data.name.localeCompare(b.data.name);
    });

    items.forEach(item => {
        const { key, data, state, isUnlocked, isClaimed, progress, currentVal, typeIcons } = item;

        let statusClass = 'locked';
        if (isUnlocked) statusClass = isClaimed ? 'completed' : 'unclaimed';
        if (data.isSecret && !isUnlocked) statusClass = 'secret';

        const el = document.createElement('div');
        el.className = `trophy-row ${statusClass}`;

        let iconClass = typeIcons[data.type] || 'fa-trophy';
        let iconHTML = `<i class="fa-solid ${iconClass}"></i>`;
        if (!isUnlocked) iconHTML = `<i class="fa-solid fa-lock"></i>`;
        if (data.isSecret && !isUnlocked) iconHTML = `<i class="fa-solid fa-question"></i>`;
        if (isUnlocked && !isClaimed) iconHTML = `<i class="fa-solid fa-gift fa-bounce"></i>`;

        let actionHtml = '';
        let tooltipAttr = '';

        if (isUnlocked && !isClaimed && data.reward) {
            let rewardText = gameData.texts.ui.rewardClaim;

            if (data.reward.type === 'bugs') {
                rewardText = `+${formatNumber(data.reward.value)} BUG`;
            } else if (data.reward.type === 'skin') {
                const skinId = data.reward.id || data.reward.value;
                const skinName = gameData.skins[skinId] ? gameData.skins[skinId].name : "Skin Speciale";

                rewardText = "SKIN SPECIALE";

                // Imposta il tooltip con il nome della skin
                tooltipAttr = `data-tooltip="Sblocca: ${skinName}"`;
            } else if (data.reward.type === 'prestige') {
                rewardText = `+${data.reward.value} TOKEN`;
            }

            // Aggiunto ${tooltipAttr} al tag button
            actionHtml = `
                <button class="trophy-claim-btn" id="claim-${key}" ${tooltipAttr}>
                    <span class="claim-icon"><i class="fa-solid fa-gift"></i></span>
                    <span class="claim-text">${rewardText}</span>
                </button>`;

        } else if (isClaimed) {
            actionHtml = `<div class="trophy-done"><i class="fa-solid fa-check"></i></div>`;
        } else {
            if (!data.isSecret) {
                const valText = data.type === 'time' ? formatTime(currentVal) : formatNumber(currentVal);
                const targetText = data.type === 'time' ? formatTime(data.target) : formatNumber(data.target);
                const fullText = `${Math.floor(progress)}% (${valText} / ${targetText})`;

                actionHtml = `
                    <div class="trophy-progress">
                        <div class="t-prog-bar" style="width: ${progress}%"></div>
                        <span class="t-prog-text">${fullText}</span>
                    </div>
                `;
            }
        }

        let desc = (data.isSecret && !isUnlocked) ? gameData.texts.ui.secretGoal : (data.realDesc || data.desc);
        let name = (data.isSecret && !isUnlocked) ? gameData.texts.ui.unknown : data.name;

        el.innerHTML = `
            <div class="trophy-icon-wrapper">
                ${iconHTML}
            </div>
            <div class="trophy-content">
                <div class="trophy-title">${name}</div>
                <div class="trophy-desc">${desc}</div>
                ${data.flavor ? `<div class="trophy-flavor">"${data.flavor}"</div>` : ''}
            </div>
            <div class="trophy-action">
                ${actionHtml}
            </div>
        `;

        if (isUnlocked) el.style.borderColor = '#f1c40f';

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

    // Impostazioni base CSS per evitare che interferiscano
    feedback.style.position = 'absolute';
    feedback.style.pointerEvents = 'none';
    feedback.style.userSelect = 'none';
    // Rimuoviamo l'animazione CSS se presente nella classe, lasciando fare a GSAP
    feedback.style.animation = 'none';

    // --- VARIABILI LOGICA DI GIOCO ---
    const now = Date.now();
    const COOLDOWN_404 = 300000;
    const lastCrash = gameState.lastBluescreenTimestamp || 0;
    const timeSinceLast = now - lastCrash;
    const isBlueScreen = (typeof isBluescreenActive !== 'undefined') ? isBluescreenActive : false;
    const currentScore = gameState.score || 0;

    // Variabili per l'animazione GSAP
    let animDuration = 1.2;
    let startScale = 0.5;
    let endScale = 1.0;
    let easeType = "power2.out";
    let endY = -120;

    // --- EVENTO 404 (Glitch) ---
    if (timeSinceLast > COOLDOWN_404 && Math.random() < 0.0005 && !isBlueScreen && currentScore >= 404) {
        feedback.textContent = 'Error 404';
        feedback.style.color = '#facc15';
        feedback.style.fontSize = '1.2rem';
        feedback.style.fontWeight = '900';
        feedback.style.zIndex = '100';
        feedback.style.textShadow = '2px 2px 0px red';

        // Animazione "Glitchy" elastica
        animDuration = 2;
        endScale = 1.5;
        easeType = "elastic.out(1, 0.3)";

        // Trigger Logica 404
        let dynamicMultiplier = Math.floor(2 + Math.random() * 3);
        gameState.lastBluescreenTimestamp = now;
        if (window.EspooClicker) window.EspooClicker.saveGame();
        if (typeof triggerBluescreen === 'function') triggerBluescreen(dynamicMultiplier);
    }
    else {
        // --- CLICK STANDARD ---
        let val = (typeof calculateClickValue === 'function')
            ? calculateClickValue()
            : gameState.baseClickValue;

        feedback.textContent = `+${formatNumber(val)}`;

        // Calcolo Critico Visivo
        const critChance = (typeof window.goldenBugChance !== 'undefined') ? window.goldenBugChance : 0.001;
        const isCrit = Math.random() < (critChance * 10);

        // Stili di Base
        let color = '#ffffff';
        let size = '1.1rem';
        let weight = 'bold';
        let shadow = '0 0 4px rgba(0,0,0,0.9)';

        // Varianti Tema
        if (document.body.classList.contains('theme-christmas')) {
            color = Math.random() > 0.5 ? '#e74c3c' : '#2ecc71';
            shadow = '0 0 5px #fff';
        } else if (isCrit) {
            // Colpo Critico
            color = '#f1c40f';
            size = '1.5rem';
            weight = '900';
            shadow = '0 0 15px rgba(241, 196, 15, 0.8)';
            feedback.style.zIndex = '50';

            // Animazione "Pop" Esplosiva
            startScale = 0.5;
            endScale = 1.5;
            easeType = "back.out(2)"; // Rimbalzo accentuato
        }

        feedback.style.color = color;
        feedback.style.fontSize = size;
        feedback.style.fontWeight = weight;
        feedback.style.textShadow = shadow;
    }

    // --- POSIZIONAMENTO ---
    const rect = feedbackContainer.getBoundingClientRect();
    let startX, startY;

    if (event && event.clientX && event.clientY) {
        // Click del mouse: posizione esatta del cursore relativa al container
        startX = event.clientX - rect.left;
        startY = event.clientY - rect.top;
    } else {
        // Click simulato o touch impreciso: centro del bottone
        const btnRect = document.getElementById('clicker-btn').getBoundingClientRect();
        startX = (btnRect.left + btnRect.width / 2) - rect.left;
        startY = (btnRect.top + btnRect.height / 2) - rect.top;
    }

    // Aggiungi variazione casuale per non sovrapporre i numeri
    const randomOffsetX = (Math.random() - 0.5) * 50;
    const randomOffsetY = (Math.random() - 0.5) * 50;

    // Posiziona l'elemento inizialmente (invisibile o quasi)
    feedback.style.left = `${startX + randomOffsetX}px`;
    feedback.style.top = `${startY + randomOffsetY}px`;

    feedbackContainer.appendChild(feedback);

    // --- ANIMAZIONE GSAP ---
    if (typeof gsap !== 'undefined') {
        gsap.fromTo(feedback,
            {
                opacity: 1,
                scale: startScale,
                rotation: Math.random() * 30 - 15 // Rotazione iniziale casuale
            },
            {
                duration: animDuration,
                y: endY, // Sale verso l'alto
                x: (Math.random() * 40 - 20), // Leggera deriva laterale tipo fumo
                opacity: 0,
                scale: endScale,
                rotation: Math.random() * 60 - 30, // Ruota mentre sale
                ease: easeType,
                onComplete: () => {
                    if (feedback.parentNode) feedback.remove();
                }
            }
        );
    } else {
        // Fallback di sicurezza se la libreria non è caricata
        console.warn("GSAP non trovato. Uso fallback semplice.");
        feedback.style.transition = "all 1s ease-out";
        requestAnimationFrame(() => {
            feedback.style.transform = `translateY(-100px)`;
            feedback.style.opacity = 0;
        });
        setTimeout(() => feedback.remove(), 1000);
    }
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
        if (!state.purchased && gameState.totalClicks >= data.requiredClicks && gameState.score.gte(data.cost)) {
            clickNotify = true; break;
        }
    }

    const tabClick = document.getElementById('tab-click');
    if (tabClick) clickNotify && !tabClick.classList.contains('active') ? tabClick.classList.add('notify') : tabClick.classList.remove('notify');

    // Auto Tab
    let autoNotify = false;
    for (const key in gameData.buildingEnhancements)
	{
        const data = gameData.buildingEnhancements[key];
        const state = gameState.buildingEnhancements[key];

        if (!state)
			continue;

        const targetTeam = gameState.teams[data.targetTeam];
        if (!state.purchased && targetTeam.count >= data.requiredCount && gameState.score.gte(data.cost))
		{
            autoNotify = true;
			break;
        }
    }

    const tabAuto = document.getElementById('tab-auto');
    if (tabAuto)
		autoNotify && !tabAuto.classList.contains('active') ? tabAuto.classList.add('notify') : tabAuto.classList.remove('notify');

    // Prestige Tab
    let prestigeNotify = false;
    if (gameState.totalResets > 0 || gameState.prestigePoints.gt(0))
	{
        for (const key in gameData.prestigeUpgrades)
		{
            const data = gameData.prestigeUpgrades[key];
            const state = gameState.prestigeUpgrades[key];

            if (data.isCounted)
			{
                if (gameState.prestigePoints.gte(data.baseCost))
					prestigeNotify = true;
            }
			else
			{
                if (!state.purchased && gameState.prestigePoints.gte(data.baseCost))
					prestigeNotify = true;
            }

            if (prestigeNotify)
				break;
        }
    }

    let tabPrestige = document.getElementById('tab-prestige');
    if (tabPrestige)
        prestigeNotify && !tabPrestige.classList.contains('active') ? tabPrestige.classList.add('notify') : tabPrestige.classList.remove('notify');

    // --- AGGIORNAMENTO TITOLO BROWSER ---
    let title = "Espòòò Clicker";

    // Controlliamo se abbiamo raggiunto il PRESTIGE_THRESHOLD
    const canPrestige = gameState.totalScore.gte(gameData.PRESTIGE_THRESHOLD);

    if (canPrestige)
        title = gameData.texts.ui.promotionReadyTitle + " - " + title;
    else
        // Mostra i bug correnti
        title = formatNumber(gameState.score) + " " + gameData.texts.ui.bugsTitle + " - " + title;

    if (document.title !== title)
        document.title = title;
}

function updateBonusCounter()
{
    const counter = document.getElementById('bonus-counter-display');
    const valueSpan = document.getElementById('combined-multiplier-value');

    // La variabile prestigeBonus ora contiene TUTTI i bonus permanenti (prestigio + achievement)
    if (prestigeBonus.gt(1.05))	// Mostra solo se il bonus è significativo
    {
        if (counter)
            counter.style.display = 'block';

        if (valueSpan)
        {
            // Mostra il moltiplicatore totale con 2 decimali
            valueSpan.textContent = `x${prestigeBonus.toFixed(2)}`;

            // Aggiungi anche un po' di stile per farlo risaltare
            valueSpan.style.color = '#f1c40f';
        }
    }
    else
    {
        if (counter)
            counter.style.display = 'none';
    }
}

function updateUI() {
    // Calcoli Preliminari (BPS Visivo)
    const activeBPS = calculateVisualBPS();

    // Aggiornamenti Sezioni
    updateScoreBoard(activeBPS);
    updateHUD();
    updateWallets();
    updateStoreButtons(); // Gestisce i costi e i tasti "enabled/disabled"
    updateSkillButton();  // Gestisce Espo Fury / Crunch Time
    updateTabsVisibility();

    // Notifiche e Extra
    checkOverlayNotifications();
    updateBonusCounter();
}

// --- SOTTO-FUNZIONI (Copia queste sotto updateUI) ---
function calculateVisualBPS() {
    let active = new Decimal(0);
    const now = Date.now();

    for (let i = 0; i < clickHistory.length; i++) {
        if (now - clickHistory[i].time < 1000)
            active = active.add(clickHistory[i].value);
    }

    // Somma BPS base (Decimal) + Click attivi (Decimal)
    return bps.add(active);
}

const scoreAnimState = { value: 0 };

function formatFullNumber(num) {
    if (num === undefined || num === null) return "0";
    let str = new Decimal(num).floor().toFixed(0);
    return str.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function updateScoreBoard(totalBPS) {
    // Se è la prima volta (o reset/promozione), allinea subito senza animazione
    if (Math.abs(scoreAnimState.value - gameState.score) > gameState.score * 0.5)
        scoreAnimState.value = gameState.score;

    // GSAP anima il valore "visuale" verso il valore reale
    gsap.to(scoreAnimState, {
        duration: 0.2,
        value: gameState.score,
        ease: "power1.out",
        onUpdate: () => {
            setTextIfChanged('score-display', formatNumber(Math.floor(scoreAnimState.value + Number.EPSILON)));
        }
    });

    const scoreEl = getEl('score-display');
    if (scoreEl) {
        scoreEl.setAttribute('data-tooltip', formatFullNumber(gameState.score));
        scoreEl.classList.add('simple-tooltip');
    }

    setTextIfChanged('cps-display', `BPS: ${formatNumber(totalBPS)}`);
    const cpsEl = getEl('cps-display');
    if (cpsEl) {
        cpsEl.setAttribute('data-tooltip', formatFullNumber(totalBPS));
        cpsEl.classList.add('simple-tooltip');
    }

    if (typeof calculateRawClickValue === 'function') {
        const rawClick = calculateRawClickValue();
        setTextIfChanged('raw-click-display', `Click Power: ${formatNumber(rawClick)}`);
    }
}

function updateHUD()
{
    // Riferimenti ai nuovi pannelli nell'header
    const leftPanel = document.getElementById('header-left-panel');
    const rightPanel = document.getElementById('header-right-panel');

    // Riferimenti ai valori di testo
    const displayCareer = document.getElementById('display-career-bonus');
    const displayTokens = document.getElementById('prestige-points-display');

    // Condizione: Mostra solo se il giocatore ha fatto almeno un prestigio
    if (gameState.totalResets > 0 || gameState.prestigePoints.gt(0) || gameState.lifetimePrestigePoints.gt(0))
    {
        // Mostra i pannelli laterali
        if (leftPanel) leftPanel.classList.remove("header_stat_box_display_none");
        if (rightPanel) rightPanel.classList.remove("header_stat_box_display_none");

        // Aggiorna i testi
        if (displayCareer)
            setTextIfChanged('display-career-bonus', `x${formatNumber(prestigeBonus)}`);

        if (displayTokens)
            setTextIfChanged('prestige-points-display', formatNumber(gameState.prestigePoints));
    }
    else
    {
        // Nascondi se è la prima run
        if (leftPanel)
            leftPanel.classList.add("header_stat_box_display_none");

        if (rightPanel)
            rightPanel.classList.add("header_stat_box_display_none");
    }
}

function updateWallets() {
    setTextIfChanged('lab-wallet-amount', formatNumber(gameState.prestigePoints));
    setTextIfChanged('bug-wallet-amount', formatNumber(gameState.score.floor()));

    // Mobile Wallets (Aggiornamento di gruppo)
    document.querySelectorAll('.bug-wallet-amount').forEach(el => {
        if (el.textContent !== formatNumber(gameState.score)) el.textContent = formatNumber(gameState.score);
    });
}

function updateStoreButtons() {
    // Teams
    for (const key in gameState.teams) {
        // Logica Costi
        let amountToBuy = window.buyMultiplier;
        let isMax = false;
        if (amountToBuy === 'MAX') {
            const max = calculateMaxAffordable(key);
            amountToBuy = max > 0 ? max : 1;
            isMax = true;
        }
        const currentCost = calculateBulkCost(key, amountToBuy);
        const btn = getEl(`buy-${key}`);

        if (btn) btn.disabled = (gameState.score.lt(currentCost));
        const costEl = getEl(`cost-${key}`);
        if (costEl) {
            let prefix = isMax && amountToBuy > 1 ? `Costo (+${formatNumber(amountToBuy)})` :
                (!isMax && amountToBuy > 1) ? `Costo (${amountToBuy}x)` : "Costo";
            const costText = `${prefix}: ${formatNumber(currentCost)}`;
            if (costEl.textContent !== costText) costEl.textContent = costText;
        }
    }

    // Click Upgrades
    for (const key in gameState.clickUpgrades) {
        if (!gameState.clickUpgrades[key].purchased) {
            const container = getEl(`click-upgrade-${key}`); // Usa ID contenitore se btn ID è ambiguo
            // Fallback diretto al bottone se l'ID è univoco
            const btn = getEl(`buy-${key}`);
            if (btn && !btn.classList.contains('owned')) {
                btn.disabled = (gameState.score.lt(gameData.clickUpgrades[key].cost));
            }
        }
    }

    // Enhancements
    for (const key in gameState.buildingEnhancements) {
        if (!gameState.buildingEnhancements[key].purchased) {
            const btn = getEl(`buy-${key}`);
            if (btn && !btn.classList.contains('owned')) {
                btn.disabled = (gameState.score.lt(gameData.buildingEnhancements[key].cost));
            }
        }
    }
    // Prestige / Lab
    for (const key in gameState.prestigeUpgrades) {
        const data = gameData.prestigeUpgrades[key];
        const state = gameState.prestigeUpgrades[key];

        // Se è già maxato o posseduto (non contato), il bottone è gestito come 'owned' dal render, lo ignoriamo
        if (data.isCounted && data.maxLevel && state.count >= data.maxLevel) continue;
        if (!data.isCounted && state.purchased) continue;

        const btn = getEl(`buy-${key}`);
        if (btn && !btn.classList.contains('owned')) {
            // Controlla Token invece di Score
            btn.disabled = (gameState.prestigePoints.lt(data.baseCost));
        }
    }
}

function updateSkillButton() {
    const btnCrunch = getEl('skill-crunchTime');
    if (!btnCrunch) return;

    if (document.body.classList.contains('rick-rolling')) {
        btnCrunch.style.display = 'none';
        return;
    }
    if (gameState.prestigeUpgrades.crunchTime && gameState.prestigeUpgrades.crunchTime.purchased) {
        if (btnCrunch.style.display === 'none') btnCrunch.style.display = 'block';

        const timerDiv = btnCrunch.querySelector('.skill-timer');
        const now = Date.now();

        if (now < crunchTimeEndTime) {
            // ATTIVO
            const timeLeft = Math.ceil((crunchTimeEndTime - now) / 1000);
            if (btnCrunch.className !== 'skill-btn active') btnCrunch.className = 'skill-btn active';
            btnCrunch.childNodes[0].textContent = gameData.texts.ui.furyActive;
            if (timerDiv) timerDiv.textContent = `${timeLeft}s`;
        } else if (now < crunchTimeCooldownEnd) {
            // COOLDOWN
            const timeLeft = Math.ceil((crunchTimeCooldownEnd - now) / 1000);
            if (btnCrunch.className !== 'skill-btn cooldown') btnCrunch.className = 'skill-btn cooldown';
            btnCrunch.childNodes[0].textContent = gameData.texts.ui.furyCooldown;
            const m = Math.floor(timeLeft / 60);
            const s = timeLeft % 60;
            if (timerDiv) timerDiv.textContent = `${m}:${s < 10 ? '0' + s : s}`;
        } else {
            // PRONTO
            if (btnCrunch.className !== 'skill-btn') btnCrunch.className = 'skill-btn';
            btnCrunch.childNodes[0].textContent = gameData.texts.ui.furyReady;
            if (timerDiv) timerDiv.textContent = gameData.texts.ui.clickMe;
        }
    } else {
        if (btnCrunch.style.display !== 'none') btnCrunch.style.display = 'none';
    }
}

function updateTabsVisibility()
{
    const tabPrestige = getEl('tab-prestige');

    if (tabPrestige)
    {
        const show = gameState.totalResets > 0 || gameState.prestigePoints.gt(0) || gameState.lifetimePrestigePoints.gt(0);

        if (show)
            tabPrestige.classList.remove("tab_promozione");
    }
}

function updatePrestigeVisuals() {
    const prestigeBtn = document.getElementById('open-prestige-hub-btn');
    if (!prestigeBtn) return;

    // Recupera i valori in modo sicuro (gestisce null/undefined)
    const currentScore = gameState.totalScore || new Decimal(0);
    const threshold = gameData.PRESTIGE_THRESHOLD || new Decimal("50000000");
    const resets = gameState.totalResets || 0;
    const prestigePoints = gameState.prestigePoints || new Decimal(0);
    const lifetimePoints = gameState.lifetimePrestigePoints || new Decimal(0);

    const canPrestige = currentScore.gte(threshold);

    // Mostra il bottone SE:
    // 1. Puoi fare prestigio ORA (canPrestige)
    // 2. OPPURE hai già fatto prestigio in passato (resets > 0)
    // 3. OPPURE hai dei token da spendere (prestigePoints > 0)
    const shouldShow = canPrestige || resets > 0 || prestigePoints.gt(0) || lifetimePoints.gt(0);

    if (!shouldShow) {
        if (prestigeBtn.style.display !== 'none') prestigeBtn.style.display = 'none';
        return;
    }

    // Se deve essere mostrato, forza il flex
    if (prestigeBtn.style.display !== 'flex') prestigeBtn.style.display = 'flex';

    let icon = prestigeBtn.querySelector('.nav-icon');
    let label = prestigeBtn.querySelector('span');

    // Ricrea contenuto interno se manca (sicurezza)
    if (!icon || !label) {
        prestigeBtn.innerHTML = '<i class="nav-icon"></i> <span></span>';
        icon = prestigeBtn.querySelector('.nav-icon');
        label = prestigeBtn.querySelector('span');
    }

    if (canPrestige) {
        // STATO: PRONTA!
        if (!prestigeBtn.classList.contains('promotion-ready')) {
            prestigeBtn.classList.add('promotion-ready');
            prestigeBtn.style.cursor = "pointer";
            icon.className = 'nav-icon fa-solid fa-circle-check';
            label.textContent = gameData.texts.ui.promoReady;
        }
    } else {
        // STATO: IN PROGRESS (Percentuale)
        if (prestigeBtn.classList.contains('promotion-ready')) {
            prestigeBtn.classList.remove('promotion-ready');
            prestigeBtn.style.cursor = "default"; // Non cliccabile se non pronta
            icon.className = 'nav-icon fa-solid fa-rocket';
        }

        // Calcolo percentuale sicuro
        let progress = 0;
        if (currentScore.gt(0)) {
            progress = currentScore.div(threshold).mul(100).toNumber();
        }

        // Cap a 99% perché a 100% scatta il "canPrestige"
        const finalPercent = Math.min(progress, 99).toFixed(0);

        const newText = `${finalPercent}%`;

        if (label.textContent !== newText) {
            label.textContent = newText;
        }
    }
}


function updatePrestigeUI()
{
    updatePrestigeVisuals();
}


function shouldItemBeVisible(mode, isPurchased, isUnlocked)
{
    switch (mode)
    {
        case 'available': return isUnlocked && !isPurchased;
        case 'locked': return !isUnlocked && !isPurchased;
        case 'purchased': return isPurchased;
        case 'all': return true;
        default: return isUnlocked && !isPurchased;
    }
}

function setEmptyMessage(el, mode) {
    if (mode === 'available') el.textContent = gameData.texts.ui.noItemsBuy;
    else if (mode === 'locked') el.textContent = gameData.texts.ui.noItemsLock;
    else if (mode === 'purchased') el.textContent = gameData.texts.ui.noItemsPurchased;
    else el.textContent = gameData.texts.ui.nothingToShow;
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
        overlay.classList.add("christmas_overlay_flex");
    }
    if (soundMerry) {
        soundMerry.volume = gameState.user.masterVolume * gameState.user.sfxVolume;
        soundMerry.currentTime = 0;
        soundMerry.play().catch(e => { });
    }
    setTimeout(() => {
        if (overlay) overlay.classList.remove("christmas_overlay_flex");
    }, 4000);
}

let christmasAudioInitialized = false;


function applySkinVisuals(skinId, forcePlayMusic = false) {
    const data = gameData.skins[skinId];
    const skinData = data || gameData.skins['default'];

    const photoNormal = document.getElementById('manager-photo-normal');
    const photoClicked = document.getElementById('manager-photo-clicked');
    const snowContainer = document.getElementById('snow-container');

    // Lista classi di sfondo (rarità) da rimuovere per pulizia
    const bgClasses = ['bg-common', 'bg-rare', 'bg-epic', 'bg-legendary', 'bg-divine', 'bg-christmas'];
    const bodyThemes = ['theme-christmas', 'theme-8bit', 'theme-super']; 

    const theme = skinData.themeConfig || {};


    document.body.classList.remove(...bodyThemes);

    // Applica il nuovo tema se previsto dalla skin
    if (theme.bodyClass) {
        document.body.classList.add(theme.bodyClass);
    }

    // GESTIONE NEVE
    if (snowContainer) {
        if (theme.hasSnow) {
            snowContainer.classList.add("snow_container_block");

            if (snowContainer.innerHTML === '')
                createSnowflakes(snowContainer);
        }
        else {
            snowContainer.classList.remove("snow_container_block");
        }
    }

    // GOLDEN BUG ICONA (Personalizzazione Tematica)
    const goldenBugIcon = document.querySelector('#golden-bug i');
    if (goldenBugIcon) {
        goldenBugIcon.className = 'fa-solid'; // Reset base FontAwesome
        goldenBugIcon.style.color = '';       // Reset colore inline

        if (theme.goldenBugIcon) {
            goldenBugIcon.classList.add(theme.goldenBugIcon);
            if (theme.goldenBugColor) goldenBugIcon.style.color = theme.goldenBugColor;
        } else {
            // Default icon
            goldenBugIcon.classList.add('fa-bug');
        }
    }

    // AUDIO MANAGER (Logica Centralizzata)
    // Invece di gestire play/pause qui, diciamo al Manager di aggiornare l'ambiente.
    // Lui guarderà la skin corrente e deciderà quale traccia suonare e quali spegnere.
    if (typeof AudioManager !== 'undefined' && AudioManager.updateAmbience)
        AudioManager.updateAmbience();

    // APPLICAZIONE IMMAGINI MANAGER E CLASSI RARITÀ
    const applyClasses = (element, imgSrc) =>
    {
        if (!element) return;

        // Aggiorna immagine
        element.src = `assets/image/${imgSrc}`;

        // Rimuovi vecchie classi di sfondo rarità
        element.classList.remove(...bgClasses);

        // Applica nuova classe sfondo in base alla rarità
        if (skinData.rarity)
            element.classList.add(`bg-${skinData.rarity}`);
        else
            element.classList.add('bg-common');
    };

    applyClasses(photoNormal, skinData.img);
    applyClasses(photoClicked, skinData.imgClick);
}


// Nuova funzione helper per creare i fiocchi
function createSnowflakes(snowContainer)
{
    if (!snowContainer)
        return;

    const numberOfSnowflakes = 60;

    for (let index = 0; index < numberOfSnowflakes; index++)
    {
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

        snowContainer.appendChild(snowflake);
    }
}

function checkOverlayNotifications()
{
    // Controlla se ci sono obiettivi sbloccati MA non riscattati (che hanno un premio)
    let hasClaimable = false;
    for (const key in gameData.achievements)
    {
        const state = gameState.achievements[key];
        const data = gameData.achievements[key];

        // Se è sbloccato, non ancora reclamato, e ha un premio definito
        if (state && state.unlocked && !state.claimed && data.reward)
        {
            hasClaimable = true;
            break;
        }
    }

    const achBtn = document.getElementById('open-achievements-btn');
    if (achBtn)
    {
        if (hasClaimable)
            achBtn.classList.add('notify-overlay');
        else
            achBtn.classList.remove('notify-overlay');
    }
}

function updateStatsUI()
{
    const statsList = document.getElementById('stats-list');
    if (!statsList) return;

    // --- CALCOLI PRELIMINARI ---
    const progress = gameState.totalScore.div(gameData.PRESTIGE_THRESHOLD).mul(100).min(100).toNumber();

    // Recupera ENTRAMBI i valori
    const rawClick = (typeof calculateRawClickValue === 'function') ? calculateRawClickValue() : gameState.baseClickValue;
    const totalClick = (typeof calculateClickValue === 'function') ? calculateClickValue() : rawClick;

    // Dati Offline
    const totalOffline = gameState.totalOfflineScore || 0;

    // Calcolo Efficienza Offline
    let offlineEff = 0.30;
    if (gameState.prestigeUpgrades && gameState.prestigeUpgrades.serverAlwaysOn)
        offlineEff += (gameState.prestigeUpgrades.serverAlwaysOn.count * 0.10);

    if (offlineEff > 1.0)
        offlineEff = 1.0;

    const offlinePercentText = (offlineEff * 100).toFixed(0) + "%";

    // --- GENERAZIONE HTML CON TOOLTIP SEMPLICI ---
    statsList.innerHTML = `
        <div class="stats-container">
            
            <div class="stats-section">
                <div class="stats-header"><i class="fa-solid fa-wallet"></i> Economia Aziendale</div>
                <div class="stats-grid">
                    <div class="stat-box">
                        <span class="stat-label">Bug Attuali (Wallet)</span>
                        <span class="stat-value simple-tooltip" style="color: #2ecc71;" data-tooltip="${formatFullNumber(gameState.score)}">
                            ${formatNumber(Math.floor(gameState.score))}
                        </span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label">Totale Run Attuale</span>
                        <span class="stat-value simple-tooltip" data-tooltip="${formatFullNumber(gameState.totalScore)}">
                            ${formatNumber(gameState.totalScore)}
                        </span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label">Totale Carriera</span>
                        <span class="stat-value simple-tooltip" style="color: #f1c40f;" data-tooltip="${formatFullNumber(gameState.lifetimeScore)}">
                            ${formatNumber(gameState.lifetimeScore)}
                        </span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label">Guadagnati Offline</span>
                        <span class="stat-value simple-tooltip" style="color: #3498db;" data-tooltip="${formatFullNumber(totalOffline)}">
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
                        <span class="stat-value simple-tooltip" data-tooltip="${formatFullNumber(bps)}">
                            ${formatNumber(bps)}
                        </span>
                    </div>
                    
                    <div class="stat-box">
                        <span class="stat-label">Valore Click (Base / Totale)</span>
                        <span class="stat-value" style="color: #e74c3c;">
                            ${formatNumber(rawClick)}
                            <span style="font-size: 0.75rem; color: #95a5a6; font-weight: normal;">
                                (Tot: ${formatNumber(totalClick)})
                            </span>
                        </span>
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