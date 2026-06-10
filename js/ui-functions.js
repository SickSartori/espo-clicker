
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
    if (num === undefined || num === null) return "0";

    let decimal;
    if (num instanceof Decimal) {
        decimal = num;
    } else {
        try { decimal = new Decimal(num); }
        catch (e) {
            try { decimal = new Decimal(String(num)); }
            catch (e2) { return "0"; }
        }
    }

    // Per i numeri piccoli standard
    if (decimal.abs().lt(1000)) {
        let val = decimal.toNumber();
        if (Number.isInteger(val)) return val.toLocaleString('it-IT');
        return val.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // 4. Gestione Suffissi (k, M, B, T...)
    /*const suffixes = ["", "k", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc",				// 0 -> 999Dc
                      "Ud", "Dd", "Td", "Qad", "Qid", "Sxd", "Spd", "Ocd", "Nod", "Vg",				// 1Ud -> 999Vg
                      "Uvg", "Dvg", "Tvg", "Qavg", "Qivg", "Sxvg", "Spvg", "Ocvg", "Novg", "Tg",	// 1Uvg -> 999Tg
                      "Utg", "Dtg", "Ttg", "Qatg", "Qitg", "Sxtg", "Sptg", "Octg", "Notg", "Qag"];*/	// 1Utg -> 999Qag

    // Recupero universale e sicuro per Break_infinity
    let exponent = decimal.exponent !== undefined ? decimal.exponent : decimal.e;
    let mantissa = decimal.mantissa !== undefined ? decimal.mantissa : decimal.m;
    let suffixIndex = Math.floor(exponent / 3);

    // 5. Caso: Suffisso Disponibile
    if (suffixIndex > 0 && suffixIndex < gameData.texts.format.suffixes.length) {
        let power = exponent % 3;
        let scaled = mantissa * Math.pow(10, power);

        // Evita che 999.999 diventi "1000,00" forzando lo scatto al suffisso successivo
        if (scaled >= 999.995) {
            scaled /= 1000;
            suffixIndex++;
        }

        // Ulteriore controllo nel caso il "salto" sondi oltre la lunghezza dell'array
        if (suffixIndex < gameData.texts.format.suffixes.length)
            return scaled.toFixed(2).replace('.', ',') + " " + gameData.texts.format.suffixes[suffixIndex];
    }

    // Se andiamo oltre il Qag, usa la notazione scientifica pulita
    return decimal.toExponential(2).replace('.', ',');
}

function formatFullNumber(num) {
    if (num === undefined || num === null) return "0";
    let decimal = new Decimal(num).floor();

    // Evita che la RegExp distrugga la stringa se il numero è in notazione scientifica
    if (decimal.gte(1e21))
        return formatNumber(decimal);

    let str = decimal.toFixed(0);
    return str.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// --- LAZY LOAD CSS ---
const loadedThemes = new Set();

function loadThemeCSS(themeFile) {
    if (!themeFile || loadedThemes.has(themeFile)) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';

    // Cache buster: preferisce il cacheVer PHP (es. "2.0.0") iniettato in index.php
    // per matchare le altre risorse e invalidare correttamente quando si bumpa
    // prodVersion. Fallback a GAME_VERSION.major (granularità grossolana).
    const v = window.CACHE_VER
        || (window.GAME_VERSION ? window.GAME_VERSION.major : Date.now());
    link.href = `css/${themeFile}?v=${v}`;

    document.head.appendChild(link);
    loadedThemes.add(themeFile);
    console.log(`[Tema] Caricato dinamicamente: ${themeFile}`);
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
let matrixResizeHandler = null;

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

    let lastMatrixFrame = 0;
    const MATRIX_FRAME_INTERVAL = 1000 / 30; // 30 FPS reali

    const draw = (timestamp) => {
        matrixFrameId = requestAnimationFrame(draw);

        // Throttle a 30fps reali per risparmiare CPU/batteria
        if (timestamp - lastMatrixFrame < MATRIX_FRAME_INTERVAL) return;
        lastMatrixFrame = timestamp;

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
    };

    // Loop a 30 FPS reali (throttled)
    if (matrixFrameId) cancelAnimationFrame(matrixFrameId);
    matrixFrameId = requestAnimationFrame(draw);

    // Gestione Resize (Rimuovi il precedente per evitare accumuli)
    if (matrixResizeHandler) window.removeEventListener('resize', matrixResizeHandler);
    matrixResizeHandler = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', matrixResizeHandler);
}

function stopMatrixEffect() {
    if (matrixFrameId) {
        cancelAnimationFrame(matrixFrameId);
        matrixFrameId = null;
    }
    // Rimuovi resize listener
    if (matrixResizeHandler) {
        window.removeEventListener('resize', matrixResizeHandler);
        matrixResizeHandler = null;
    }
    // Pulisci il canvas
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
            // 1. Prima per Priorità (Acquistabili -> Bloccati -> Posseduti/MAX)
            // Questo fa in modo che le cose esaurite vadano in fondo, come hai chiesto.
            if (a.sortPriority !== b.sortPriority) return a.sortPriority - b.sortPriority;

            // 2. Poi per Costo BASE (Fisso) invece del Costo Attuale
            // Così le card non saltano quando il prezzo aumenta dopo un acquisto
            const baseCostA = a.data.baseCost !== undefined ? a.data.baseCost : (a.data.cost || 0);
            const baseCostB = b.data.baseCost !== undefined ? b.data.baseCost : (b.data.cost || 0);

            if (baseCostA !== baseCostB) {
                return baseCostA - baseCostB;
            }

            // 3. Sicurezza extra: se due oggetti hanno lo stesso costo base,
            // li teniamo fermi usando l'ordine alfabetico del loro ID (key)
            return a.key.localeCompare(b.key);
        });
    }

    // Onboarding: se in modalita' "available" non c'e' nulla da comprare (es. nuovo
    // giocatore con tutto bloccato), rivela il prossimo obiettivo piu' vicino allo
    // sblocco, con la sua progress bar, cosi' la tab non resta vuota.
    let nextLockedKey = null;
    if (mode === 'available') {
        const hasAvailable = items.some(it => it.status.unlocked && !it.status.purchased && !it.status.isMaxed);
        if (!hasAvailable) {
            let bestProgress = -1;
            items.forEach(it => {
                if (!it.status.unlocked && !it.status.purchased && !it.status.isMaxed &&
                    typeof it.status.progress === 'number' && it.status.progress > bestProgress) {
                    bestProgress = it.status.progress;
                    nextLockedKey = it.key;
                }
            });
        }
    }

    // RENDERING NEL DOM
    items.forEach(item => {
        const { key, data, state, status } = item;
        const domId = `${config.type}-item-${key}`;
        let el = document.getElementById(domId);

        // Filtri Visibilità
        let isVisible = false;

        // NUOVO CONTROLLO CUSTOM: Se l'oggetto ha condizioni speciali, sovrascrivi
        if (data.customVisible && !data.customVisible()) {
            isVisible = false;
        } else {
            if (config.type === 'building') isVisible = true;
            else if (data.alwaysVisible) isVisible = true;
            else if (mode === 'all') isVisible = true;
            else if (mode === 'purchased' && (status.purchased || status.isMaxed)) isVisible = true;
            else if (mode === 'locked' && !status.unlocked && !status.purchased) isVisible = true;
            else if (mode === 'available' && status.unlocked && !status.purchased && !status.isMaxed) isVisible = true;
            else if (mode === 'available' && key === nextLockedKey) isVisible = true;
        }

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

function updateClickStore() {
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
            const targetTeamState = gameState.teams[data.targetTeam];
            const targetTeamData = gameData.teams[data.targetTeam];

            const current = targetTeamState ? targetTeamState.count : 0;
            const teamName = targetTeamData ? targetTeamData.name : "???";

            return {
                purchased: state.purchased,
                unlocked: current >= data.requiredCount,
                canAfford: gameState.score.gte(data.cost),
                label: gameData.texts.ui.buy,
                progress: Math.min((current / data.requiredCount) * 100, 100),
                // Qui avveniva l'errore: ora usiamo la variabile sicura 'teamName'
                progressText: `${teamName}: ${current}/${data.requiredCount}`
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
            const actualCost = data.isCounted ? calculatePrestigeUpgradeCost(key) : data.baseCost;

            return {
                purchased: singlePurchased,
                unlocked: !isMaxed && !singlePurchased,
                isMaxed: isMaxed,
                canAfford: gameState.prestigePoints.gte(actualCost), // Usa actualCost
                label: isMaxed || singlePurchased ? gameData.texts.ui.owned : (isMaxed ? gameData.texts.ui.max : gameData.texts.ui.buy.toUpperCase()),
                costText: `Costo: ${formatNumber(actualCost)} Token`, // Usa actualCost
                currentCost: actualCost, // Usa actualCost
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

                if (!eData) continue;

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

    // NEGOZIO QUANTICO (Q-Lab)
    if (gameState.totalFormattazioni > 0 || gameState.qBits.gt(0)) {
        renderStoreSection({
            type: 'quantum',
            containerId: 'quantum-list-container',
            emptyId: 'quantum-empty',
            dataSource: gameData.superUpgrades,
            stateSource: gameState.superUpgrades,
            cardClass: 'prestige-upgrade quantum-card', // Ricicliamo la struttura lab
            btnClass: 'quantum-btn',
            onBuy: (key) => { if (typeof buySuperUpgrade === 'function') buySuperUpgrade(key); },
            getStatus: (key, data, state) => {
                return {
                    purchased: state.purchased,
                    unlocked: !state.purchased,
                    isMaxed: false,
                    canAfford: gameState.qBits.gte(data.cost),
                    label: state.purchased ? gameData.texts.ui.owned : gameData.texts.ui.buy.toUpperCase(),
                    costText: `Costo: ${formatNumber(data.cost)} qBit`,
                    currentCost: data.cost,
                    progress: 100
                };
            },
            setEmptyMsg: (el, mode) => { el.textContent = "Tecnologia massima raggiunta."; }
        });
    }

    if (typeof updatePrestigeVisuals === 'function') updatePrestigeVisuals();
}

let currentSkinFilter = 'all';
let currentRarityFilter = 'all';
let modernSkinsArray = [];
let modernCurrentIndex = 0;
let lastViewedSkinId = null;

// Listener per i filtri e lo switch (eseguiti una sola volta all'avvio)
document.addEventListener('DOMContentLoaded', () => {
    const toggleUI = document.getElementById('skins-ui-toggle');
    const toggleLabel = document.getElementById('skins-ui-label'); // FIX: Recupero elemento testo

    if (toggleUI) {
        const pref = localStorage.getItem('useModernSkinsUI');
        toggleUI.checked = pref !== 'false'; // Default a true

        // FIX: Imposta il testo iniziale al caricamento
        if (toggleLabel) {
            toggleLabel.textContent = toggleUI.checked ? 'Card' : 'Griglia';
        }

        toggleUI.addEventListener('change', (e) => {
            localStorage.setItem('useModernSkinsUI', e.target.checked);

            // FIX: Aggiorna dinamicamente il testo al cambio di visualizzazione
            if (toggleLabel) {
                toggleLabel.textContent = e.target.checked ? 'Card' : 'Griglia';
            }

            updateSkinsUI();
        });
    }

    // Setup Filtri Stato
    document.querySelectorAll('.skin-filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.skin-filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentSkinFilter = e.target.getAttribute('data-filter');
            updateSkinsUI();
        });
    });

    // Setup Filtro Rarità
    const raritySelect = document.getElementById('skin-rarity-filter');
    if (raritySelect) {
        raritySelect.addEventListener('change', (e) => {
            currentRarityFilter = e.target.value;
            updateSkinsUI();
        });
    }
});

// Funzione principale per aggiornare la modale delle skin
// === Guardaroba unificato (v3) — render grid moderno con sfondo dinamico ===
function updateSkinsUI() {
    if (window.AssetManager) {
        window.AssetManager.load('SKINS_EPIC');
        window.AssetManager.load('SKINS_LEGENDARY');
    }

    const grid = document.getElementById('skins-grid-modern');
    if (!grid) return;

    if (!gameState.skins || typeof gameState.skins !== 'object') gameState.skins = { unlocked: ['default'], current: 'default' };
    if (!Array.isArray(gameState.skins.unlocked)) gameState.skins.unlocked = ['default'];

    const unlockedList = gameState.skins.unlocked;
    const currentSkin = gameState.skins.current;

    const rarityMap = {
        'common': 'COMUNE', 'rare': 'RARA', 'epic': 'EPICA',
        'legendary': 'LEGGENDARIA', 'divine': 'DIVINA', 'christmas': 'FESTIVA'
    };
    const rColors = {
        'common': '#bdc3c7', 'rare': '#3498db', 'epic': '#9b59b6',
        'legendary': '#f1c40f', 'divine': '#ffee90', 'christmas': '#e74c3c'
    };
    const rGlows = {
        'common': 'rgba(189,195,199,0.18)', 'rare': 'rgba(52,152,219,0.25)', 'epic': 'rgba(155,89,182,0.25)',
        'legendary': 'rgba(241,196,15,0.3)', 'divine': 'rgba(255,238,144,0.4)', 'christmas': 'rgba(231,76,60,0.3)'
    };

    const skinToAchievement = {};
    for (const achKey in gameData.achievements) {
        const ach = gameData.achievements[achKey];
        if (ach.reward && ach.reward.type === 'skin') {
            const skinId = ach.reward.id || ach.reward.value;
            skinToAchievement[skinId] = ach;
        }
    }

    let lockedCount = 0;
    for (const key in gameData.skins) {
        if (!unlockedList.includes(key)) lockedCount++;
    }
    const lockedFilterBtn = document.querySelector('.skin-filter-btn[data-filter="locked"]');
    if (lockedFilterBtn) {
        if (lockedCount === 0) {
            lockedFilterBtn.disabled = true;
            lockedFilterBtn.style.pointerEvents = 'none';
            if (currentSkinFilter === 'locked') {
                currentSkinFilter = 'all';
                document.querySelectorAll('.skin-filter-btn').forEach(b => b.classList.remove('active'));
                const allBtn = document.querySelector('.skin-filter-btn[data-filter="all"]');
                if (allBtn) allBtn.classList.add('active');
            }
        } else {
            lockedFilterBtn.disabled = false;
            lockedFilterBtn.style.pointerEvents = 'auto';
        }
    }

    const rarityOrder = { 'common': 0, 'rare': 1, 'epic': 2, 'legendary': 3, 'divine': 4, 'christmas': 5 };
    const skinsArray = [];
    for (const key in gameData.skins) {
        const data = gameData.skins[key];
        const isUnlocked = unlockedList.includes(key);
        const isEquipped = currentSkin === key;
        const isBuyable = !isUnlocked && data.cost !== undefined;
        const canAfford = isBuyable && gameState.prestigePoints.gte(data.cost);

        if (currentSkinFilter === 'unlocked' && !isUnlocked) continue;
        if (currentSkinFilter === 'locked' && isUnlocked) continue;
        if (currentRarityFilter !== 'all' && data.rarity !== currentRarityFilter) continue;

        let requirement = '';
        let baseText = gameData.texts.ui.unknown;
        if (!isUnlocked && !isBuyable) {
            const linkedAch = skinToAchievement[key];
            if (linkedAch) {
                const isSecretLocked = linkedAch.isSecret && !gameState.achievements[linkedAch.id || key]?.unlocked;
                requirement = isSecretLocked ? gameData.texts.ui.secretGoal : (linkedAch.realDesc || linkedAch.desc);
                baseText = linkedAch.name;
            } else if (data.unlockHint) {
                requirement = data.unlockHint;
                baseText = gameData.texts.ui.skinLocked;
            }
        }
        const imgSource = isUnlocked
            ? (data.img ? `assets/image/${data.img}` : 'assets/image/skins/espo.webp')
            : 'assets/image/ui/hidden.webp';

        skinsArray.push({
            id: key, data, isUnlocked, isEquipped, isBuyable, canAfford,
            rarityLabel: rarityMap[data.rarity] || 'COMUNE',
            requirement, baseText, imgSource,
            color: rColors[data.rarity] || rColors['common'],
            glow: rGlows[data.rarity] || rGlows['common']
        });
    }
    skinsArray.sort((a, b) => (rarityOrder[a.data.rarity] || 0) - (rarityOrder[b.data.rarity] || 0));
    modernSkinsArray = skinsArray;

    const equippedSkin = skinsArray.find(s => s.isEquipped) || skinsArray[0];
    if (equippedSkin) {
        grid.style.setProperty('--bg-glow-color', equippedSkin.glow);
        grid.style.setProperty('--bg-rarity-color', equippedSkin.color);
    }

    if (skinsArray.length === 0) {
        grid.innerHTML = '<div class="skins-empty">Nessuna skin corrisponde ai filtri.</div>';
        return;
    }

    grid.innerHTML = skinsArray.map(skin => {
        let stateClass = '';
        if (skin.isEquipped) stateClass = 'equipped';
        else if (skin.isUnlocked) stateClass = 'unlocked';
        else stateClass = 'locked';

        // Mostra sempre il nome skin (anche quando bloccata)
        const nameHtml = skin.data.name || '???';

        // Doppio-click: equip diretto se sbloccata + non equipaggiata.
        // Singolo click: apri preview modal con descrizione.
        const dblHandler = (skin.isUnlocked && !skin.isEquipped)
            ? `ondblclick="event.stopPropagation();equipSkin('${skin.id}')"`
            : '';

        // Quick-equip button: solo per skin sbloccate ma NON equipaggiate
        let quickEquipHtml = '';
        if (skin.isEquipped) {
            quickEquipHtml = '<button class="skin-equip-toggle equipped" title="Equipaggiata" disabled><i class="fa-solid fa-check"></i></button>';
        } else if (skin.isUnlocked) {
            quickEquipHtml = `<button class="skin-equip-toggle" title="Equipaggia subito" onclick="event.stopPropagation();equipSkin('${skin.id}')"><i class="fa-solid fa-circle-play"></i></button>`;
        }

        return `
            <div class="skin-card-v3 rarity-${skin.data.rarity || 'common'} ${stateClass}"
                 style="--r-color:${skin.color};--r-glow:${skin.glow};"
                 onclick="showSkinPreview('${skin.id}')"
                 ${dblHandler}
                 title="${skin.isUnlocked && !skin.isEquipped ? 'Click: dettagli — Doppio click: equipaggia' : 'Click per dettagli'}"
                 role="button" tabindex="0">
                <div class="skin-rarity-badge">${skin.rarityLabel}</div>
                ${quickEquipHtml}
                <div class="skin-img-wrap">
                    <img src="${skin.imgSource}" alt="${skin.data.name}" loading="lazy">
                    ${!skin.isUnlocked ? '<div class="skin-lock-overlay"><i class="fa-solid fa-lock"></i></div>' : ''}
                </div>
                <div class="skin-name-display">${nameHtml}</div>
            </div>
        `;
    }).join('');
}

// === Skin Preview Modal (apre on click su card) ===
function showSkinPreview(skinId) {
    const skin = (typeof modernSkinsArray !== 'undefined' && modernSkinsArray)
        ? modernSkinsArray.find(s => s.id === skinId)
        : null;
    if (!skin) return;

    let modal = document.getElementById('skin-preview-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'skin-preview-modal';
        modal.className = 'modal-backdrop skin-preview-backdrop';
        document.body.appendChild(modal);
    }

    let actionHtml = '';
    if (skin.isEquipped) {
        actionHtml = '<button class="preview-btn equipped-btn" disabled><i class="fa-solid fa-check"></i> EQUIPAGGIATA</button>';
    } else if (skin.isUnlocked) {
        actionHtml = `<button class="preview-btn equip-btn" onclick="equipSkin('${skin.id}'); closeSkinPreview();">EQUIPAGGIA</button>`;
    } else if (skin.isBuyable) {
        const needsFormat = skin.data.requiresFormatting && (gameState.totalFormattazioni || 0) < 1;
        if (needsFormat) {
            actionHtml = `
                <div class="preview-cost format"><i class="fa-solid fa-rotate"></i> Richiede Formattazione</div>
                <div class="preview-cost-value"><i class="fa-solid fa-flask"></i> ${skin.data.cost} Token</div>
                <button class="preview-btn disabled-btn" disabled><i class="fa-solid fa-lock"></i> FORMATTA PRIMA</button>`;
        } else {
            const costClass = skin.canAfford ? 'afford' : 'noafford';
            const btnClass = skin.canAfford ? 'buy-btn' : 'disabled-btn';
            const btnLabel = skin.canAfford ? 'COMPRA SKIN' : 'TOKEN INSUFFICIENTI';
            const onClick = skin.canAfford ? `onclick="buySkin('${skin.id}'); closeSkinPreview();"` : 'disabled';
            actionHtml = `
                <div class="preview-cost-value ${costClass}"><i class="fa-solid fa-flask"></i> ${skin.data.cost} Token</div>
                <button class="preview-btn ${btnClass}" ${onClick}>${btnLabel}</button>`;
        }
    } else {
        const reqHtml = skin.requirement
            ? `<div class="preview-requirement"><i class="fa-solid fa-circle-exclamation"></i> ${skin.requirement}</div>`
            : '';
        actionHtml = `${reqHtml}<button class="preview-btn disabled-btn" disabled><i class="fa-solid fa-lock"></i> BLOCCATA</button>`;
    }

    const descHtml = skin.isUnlocked && skin.data.desc
        ? `<div class="preview-desc">"${skin.data.desc}"</div>`
        : '';

    const nameHtml = skin.data.name || skin.baseText || '???';

    modal.innerHTML = `
        <div class="modal-content skin-preview-content"
             style="--r-color:${skin.color};--r-glow:${skin.glow};">
            <button class="modal-close-btn" onclick="closeSkinPreview()">&times;</button>
            <div class="preview-rarity-banner" data-rarity="${skin.rarityLabel}"></div>
            <div class="preview-img-stage ${!skin.isUnlocked ? 'locked' : ''}">
                <img src="${skin.imgSource}" alt="${skin.data.name}">
                ${!skin.isUnlocked ? '<div class="preview-lock-overlay"><i class="fa-solid fa-lock"></i></div>' : ''}
                ${skin.isEquipped ? '<div class="preview-equipped-flag"><i class="fa-solid fa-check"></i> IN USO</div>' : ''}
            </div>
            <div class="preview-body">
                <h3 class="preview-name">${nameHtml}</h3>
                ${descHtml}
                <div class="preview-action">${actionHtml}</div>
            </div>
        </div>
    `;
    modal.style.display = 'flex';

    // ESC closes
    if (!window._skinPreviewKeyHandler) {
        window._skinPreviewKeyHandler = (e) => {
            const m = document.getElementById('skin-preview-modal');
            if (m && m.style.display !== 'none' && e.key === 'Escape') {
                closeSkinPreview();
            }
        };
        document.addEventListener('keydown', window._skinPreviewKeyHandler);
    }

    // Click backdrop closes
    modal.onclick = (e) => { if (e.target === modal) closeSkinPreview(); };
}

function closeSkinPreview() {
    const modal = document.getElementById('skin-preview-modal');
    if (modal) modal.style.display = 'none';
}

window.showSkinPreview = showSkinPreview;
window.closeSkinPreview = closeSkinPreview;


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

        if (data.season && !window.isSeasonActive(data.season) && !state.unlocked) {
            return; // Salta questo giro del ciclo
        }

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
    const feedbackContainer = document.getElementById('click-feedback-container');
    if (!feedbackContainer) return;

    // --- SUPER STAR MODE ---
    if (document.body.classList.contains('super-star-active')) {
        const feedbackContainer = document.getElementById('click-feedback-container');
        if (!feedbackContainer) return;

        const container = document.createElement('div');
        container.className = 'click-feedback-star';
        container.style.pointerEvents = 'none';
        container.style.position = 'absolute'; // Cambiato da fixed a absolute per seguire i valori
        container.style.zIndex = '10005';

        const img = document.createElement('img');
        img.src = 'assets/image/ui/star.png';
        img.onerror = () => {
            img.remove();
            container.innerHTML = '<i class="fa-solid fa-star" style="color:#f1c40f"></i>';
        };
        container.appendChild(img);

        // Coordinate identiche ai valori numerici
        const rect = feedbackContainer.getBoundingClientRect();
        let startX, startY;
        const size = 18; // Stella piccola come richiesto

        if (event && event.clientX && event.clientY) {
            startX = event.clientX - rect.left - (size / 2);
            startY = event.clientY - rect.top - (size / 2);
        } else {
            const btnRect = document.getElementById('clicker-btn').getBoundingClientRect();
            startX = (btnRect.left + btnRect.width / 2) - rect.left - (size / 2);
            startY = (btnRect.top + btnRect.height / 2) - rect.top - (size / 2);
        }

        container.style.left = `${startX}px`;
        container.style.top = `${startY}px`;
        container.style.width = `${size}px`;
        container.style.height = `${size}px`;

        feedbackContainer.appendChild(container);

        if (typeof gsap !== 'undefined') {
            gsap.fromTo(container,
                { scale: 0.5, opacity: 1, y: 0 },
                {
                    duration: 0.7,
                    y: -150, // Sale verso l'alto come i +1
                    x: (Math.random() - 0.5) * 60,
                    scale: 1.2,
                    rotation: Math.random() * 360,
                    opacity: 0,
                    ease: "power1.out",
                    onComplete: () => container.remove()
                }
            );
        } else {
            container.remove(); // Fallback rapido
        }
        return; // Impedisce la generazione del +1 standard durante l'evento
    }
    const feedback = document.createElement('span');
    feedback.className = 'click-feedback';

    feedback.style.position = 'absolute';
    feedback.style.pointerEvents = 'none';
    feedback.style.userSelect = 'none';
    feedback.style.animation = 'none';

    // --- VARIABILI LOGICA DI GIOCO ---
    const now = Date.now();
    const COOLDOWN_404 = 300000;
    const lastCrash = gameState.lastBluescreenTimestamp || 0;
    const timeSinceLast = now - lastCrash;
    const isBlueScreen = (typeof isBluescreenActive !== 'undefined') ? isBluescreenActive : false;
    const currentScore = gameState.score || 0;

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

        animDuration = 2;
        endScale = 1.5;
        easeType = "elastic.out(1, 0.3)";

        let dynamicMultiplier = Math.floor(2 + Math.random() * 3);
        gameState.lastBluescreenTimestamp = now;
        if (window.EspooClicker) window.EspooClicker.saveGame();
        if (typeof triggerBluescreen === 'function') triggerBluescreen(dynamicMultiplier);
    }
    else {
        // --- CLICK STANDARD ---
        // Usa il valore reale appena guadagnato (include bonus combo) se disponibile,
        // altrimenti ricalcola.
        let val = (typeof window._lastClickValue !== 'undefined' && window._lastClickValue !== null)
            ? window._lastClickValue
            : (typeof calculateClickValue === 'function')
                ? calculateClickValue()
                : gameState.baseClickValue;

        feedback.textContent = `+${formatNumber(val)}`;

        const critChance = (typeof window.goldenBugChance !== 'undefined') ? window.goldenBugChance : 0.001;
        const isCrit = Math.random() < (critChance * 10);

        let color = '#ffffff';
        let size = '1.1rem';
        let weight = 'bold';
        let shadow = '0 0 4px rgba(0,0,0,0.9)';

        if (document.body.classList.contains('theme-christmas')) {
            color = Math.random() > 0.5 ? '#e74c3c' : '#2ecc71';
            shadow = '0 0 5px #fff';
        } else if (isCrit) {
            color = '#f1c40f';
            size = '1.5rem';
            weight = '900';
            shadow = '0 0 15px rgba(241, 196, 15, 0.8)';
            feedback.style.zIndex = '50';

            startScale = 0.5;
            endScale = 1.5;
            easeType = "back.out(2)";
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
        startX = event.clientX - rect.left;
        startY = event.clientY - rect.top;
    } else {
        const btnRect = document.getElementById('clicker-btn').getBoundingClientRect();
        startX = (btnRect.left + btnRect.width / 2) - rect.left;
        startY = (btnRect.top + btnRect.height / 2) - rect.top;
    }

    const randomOffsetX = (Math.random() - 0.5) * 50;
    const randomOffsetY = (Math.random() - 0.5) * 50;

    feedback.style.left = `${startX + randomOffsetX}px`;
    feedback.style.top = `${startY + randomOffsetY}px`;

    feedbackContainer.appendChild(feedback);

    // --- ANIMAZIONE GSAP ---
    if (typeof gsap !== 'undefined') {
        gsap.fromTo(feedback,
            {
                opacity: 1,
                scale: startScale,
                rotation: Math.random() * 30 - 15
            },
            {
                duration: animDuration,
                y: endY,
                x: (Math.random() * 40 - 20),
                opacity: 0,
                scale: endScale,
                rotation: Math.random() * 60 - 30,
                ease: easeType,
                onComplete: () => {
                    if (feedback.parentNode) feedback.remove();
                }
            }
        );
    } else {
        feedback.style.transition = "all 1s ease-out";
        requestAnimationFrame(() => {
            feedback.style.transform = `translateY(-100px)`;
            feedback.style.opacity = 0;
        });
        setTimeout(() => feedback.remove(), 1000);
    }

    // Sparkle particles — usa FX.particleBurst (GSAP) se disponibile, altrimenti fallback CSS
    const px = startX + randomOffsetX;
    const py = startY + randomOffsetY;
    if (typeof FX !== 'undefined' && typeof gsap !== 'undefined') {
        const combo = FX._comboCount || 0;
        const count = combo >= 20 ? 12 : combo >= 10 ? 10 : 6;
        FX.particleBurst(px, py, count);
    } else {
        const sparkCount = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < sparkCount; i++) {
            const spark = document.createElement('div');
            spark.className = 'click-spark';
            const angle = (Math.PI * 2 / sparkCount) * i + (Math.random() * 0.5);
            const dist = 20 + Math.random() * 35;
            spark.style.cssText = `left:${px}px;top:${py}px;` +
                `--spark-x:${Math.cos(angle) * dist}px;--spark-y:${Math.sin(angle) * dist}px;` +
                `--spark-dur:${0.4 + Math.random() * 0.3}s;--spark-color:rgba(255,${100 + Math.floor(Math.random() * 100)},${Math.floor(Math.random() * 80)},0.9)`;
            feedbackContainer.appendChild(spark);
            setTimeout(() => spark.remove(), 800);
        }
    }
}



// --- MINI MARKDOWN PARSER (Sostituisce Marked.js ~20KB) ---
function simpleMarkdown(md) {
    return md
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:12px 0;">')
        .replace(/^### (.+)$/gm, '<h3 style="margin:14px 0 6px;color:#e0e0e0;">$1</h3>')
        .replace(/^## (.+)$/gm, '<h2 style="margin:18px 0 8px;">$1</h2>')
        .replace(/^# (.+)$/gm, '<h1 style="margin:0 0 10px;">$1</h1>')
        .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code style="background:rgba(255,255,255,0.08);padding:1px 5px;border-radius:3px;">$1</code>')
        .replace(/^[\*\-] (.+)$/gm, '<li>$1</li>')
        .replace(/(<li>[\s\S]*?<\/li>)/g, (m) => m)
        .replace(/(<li>.*?<\/li>\n?)+/g, '<ul style="margin:4px 0 4px 16px;padding:0;">$&</ul>')
        .replace(/<\/ul>\s*<ul[^>]*>/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/\n\n/g, '<br>')
        .replace(/\n/g, '<br>');
}

// --- MODALE V2 MIGRATION (Sostituisce SweetAlert2) ---
function showV2MigrationModal(onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop';
    overlay.style.cssText = 'display:flex; z-index:10000; animation: fadeIn 0.3s ease-out;';
    overlay.innerHTML = `
        <div class="modal-content" style="max-width:480px; text-align:center; animation: popIn 0.3s ease-out; padding: 10px">
            <h2 style="color:#f1c40f; letter-spacing:3px; margin-bottom:15px;">BENVENUTO NELLA V2.0</h2>
            <div style="text-align:left; font-size:0.95rem; color:#bdc3c7; margin-bottom:20px;">
                Grazie per aver giocato alla prima versione di <b>Espo Clicker</b>!<br><br>
                Per introdurre il <b>New Game+</b>, la Sala Arcade e riequilibrare la classifica, abbiamo effettuato un <b>Riallineamento Quantico</b> dei server.<br><br>
                <div style="background:rgba(46,204,113,0.1); border-left:4px solid #2ecc71; padding:10px; margin-bottom:10px; border-radius:4px;">
                    <b style="color:#2ecc71;">&#10003; LE TUE SKIN SONO SALVE</b><br>Il tuo guardaroba è intatto.
                </div>
                <div style="background:rgba(155,89,182,0.1); border-left:4px solid #9b59b6; padding:10px; border-radius:4px;">
                    <b style="color:#9b59b6;">&#10003; BONUS VETERANO</b><br>Ti abbiamo accreditato <b>1 Formattazione</b> e <b>1 Q-Bit</b>. Il Quantum Lab è già aperto!
                </div>
            </div>
            <button class="buy-btn" style="padding:12px; font-size:1.1rem;" id="v2-migration-confirm">
                <i class="fa-solid fa-meteor" style="margin-right: 2px;"></i> SCOPRI LE NOVITÀ
            </button>
        </div>`;
    document.body.appendChild(overlay);

    document.getElementById('v2-migration-confirm').addEventListener('click', () => {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.2s ease';
        setTimeout(() => {
            overlay.remove();
            if (onConfirm) onConfirm();
        }, 200);
    });
}

// === TOAST SYSTEM v3 — slot-based, no shift on add/remove ===
const toastQueue = [];                     // Coda messaggi in attesa
const MAX_VISIBLE_TOASTS = 5;              // Limite slot visibili
const TOAST_SLOTS = new Array(MAX_VISIBLE_TOASTS).fill(false); // false = libero
let lastToastMsg = "";
let lastToastTime = 0;

function showToast(message, type = 'info', duration) {
    // Anti-spam: stesso messaggio entro 2s → skip
    const now = Date.now();
    if (message === lastToastMsg && (now - lastToastTime < 2000)) return;
    lastToastMsg = message;
    lastToastTime = now;

    toastQueue.push({ message, type, duration: duration || 3500 });
    processToastQueue();
}

function _findFreeSlot() {
    for (let i = 0; i < TOAST_SLOTS.length; i++) {
        if (!TOAST_SLOTS[i]) return i;
    }
    return -1;
}

function processToastQueue() {
    if (toastQueue.length === 0) return;
    const slot = _findFreeSlot();
    if (slot === -1) return; // tutti slot pieni, aspetta libero

    const data = toastQueue.shift();
    TOAST_SLOTS[slot] = true;
    createToastDOM(data.message, data.type, data.duration, slot);
}

function createToastDOM(message, type, duration, slot) {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.dataset.slot = slot;
    // Posizione fissa via CSS variable — niente flex layout shift
    toast.style.setProperty('--slot-index', slot);

    let icon = '';
    if (type === 'success') icon = '<i class="fa-solid fa-circle-check"></i>';
    else if (type === 'error') icon = '<i class="fa-solid fa-circle-xmark"></i>';
    else if (type === 'achievement') icon = '<i class="fa-solid fa-trophy"></i>';
    else if (type === 'warning') icon = '<i class="fa-solid fa-triangle-exclamation"></i>';
    else if (type === 'reward') icon = '<i class="fa-solid fa-gift"></i>';
    else if (type === 'info') icon = '<i class="fa-solid fa-circle-info"></i>';

    toast.innerHTML = `<span class="toast-icon">${icon}</span><span class="toast-msg">${message}</span><span class="toast-progress" style="--life:${duration}ms"></span>`;

    // Click chiude subito
    toast.addEventListener('click', () => _dismissToast(toast, slot));

    toastContainer.appendChild(toast);

    // Auto-dismiss
    const dismissTimer = setTimeout(() => _dismissToast(toast, slot), duration);
    toast._dismissTimer = dismissTimer;
}

function _dismissToast(toast, slot) {
    if (!toast || toast._dismissed) return;
    toast._dismissed = true;
    if (toast._dismissTimer) clearTimeout(toast._dismissTimer);

    toast.classList.add('toast-leaving');

    // Libera slot DOPO exit anim (350ms)
    setTimeout(() => {
        if (toast.parentNode) toast.remove();
        TOAST_SLOTS[slot] = false;
        processToastQueue();
    }, 360);
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
    for (const key in gameData.buildingEnhancements) {
        const data = gameData.buildingEnhancements[key];
        const state = gameState.buildingEnhancements[key];

        // Se manca lo stato o i dati, salta
        if (!state || !data) continue;

        const targetTeam = gameState.teams[data.targetTeam];

        if (targetTeam && !state.purchased && targetTeam.count >= data.requiredCount && gameState.score.gte(data.cost)) {
            autoNotify = true;
            break;
        }
    }

    const tabAuto = document.getElementById('tab-auto');
    if (tabAuto)
        autoNotify && !tabAuto.classList.contains('active') ? tabAuto.classList.add('notify') : tabAuto.classList.remove('notify');

    // Prestige Tab
    let prestigeNotify = false;
    if (gameState.totalResets > 0 || gameState.prestigePoints.gt(0)) {
        for (const key in gameData.prestigeUpgrades) {
            const data = gameData.prestigeUpgrades[key];
            const state = gameState.prestigeUpgrades[key];

            if (data.isCounted) {
                const scaledCost = (typeof calculatePrestigeUpgradeCost === 'function')
                    ? calculatePrestigeUpgradeCost(key) : data.baseCost;
                if (!(data.maxLevel && state.count >= data.maxLevel) && gameState.prestigePoints.gte(scaledCost))
                    prestigeNotify = true;
            }
            else {
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
    const canPrestige = gameState.totalScore.gte(getPrestigeThreshold());

    if (canPrestige)
        title = gameData.texts.ui.promotionReadyTitle + " - " + title;
    else
        // Mostra i bug correnti
        title = formatNumber(gameState.score) + " " + gameData.texts.ui.bugsTitle + " - " + title;

    if (document.title !== title)
        document.title = title;
}

function updateBonusCounter() {
    const counter = document.getElementById('bonus-counter-display');
    const valueSpan = document.getElementById('combined-multiplier-value');

    // La variabile prestigeBonus ora contiene TUTTI i bonus permanenti (prestigio + achievement)
    if (prestigeBonus.gt(1.05))	// Mostra solo se il bonus è significativo
    {
        if (counter)
            counter.style.display = 'block';

        if (valueSpan) {
            // Mostra il moltiplicatore totale con 2 decimali
            valueSpan.textContent = `x${prestigeBonus.toFixed(2)}`;

            // Aggiungi anche un po' di stile per farlo risaltare
            valueSpan.style.color = '#f1c40f';
        }
    }
    else {
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
// Cache per calculateVisualBPS: evita di ricalcolare 10x/sec se nulla è cambiato
let _cachedVisualBPS = null;
let _lastVisualBPSCalc = 0;
const VISUAL_BPS_CACHE_MS = 150; // Ricalcola max ogni 150ms

function calculateVisualBPS() {
    const now = Date.now();
    if (_cachedVisualBPS && (now - _lastVisualBPSCalc) < VISUAL_BPS_CACHE_MS) {
        return _cachedVisualBPS;
    }

    let active = new Decimal(0);
    // Itera dalla fine (i click recenti sono in fondo) e esci appena trovi uno vecchio
    for (let i = clickHistory.length - 1; i >= 0; i--) {
        if (now - clickHistory[i].time < 1000) {
            active = active.add(clickHistory[i].value);
        } else {
            break; // I precedenti sono ancora più vecchi, esci
        }
    }

    _cachedVisualBPS = bps.add(active);
    _lastVisualBPSCalc = now;
    return _cachedVisualBPS;
}

const scoreAnimState = { value: 0 };
let _scoreTween = null;

function updateScoreBoard(totalBPS) {
    // Se è la prima volta (o reset/promozione), allinea subito senza animazione
    if (Math.abs(scoreAnimState.value - gameState.score) > gameState.score * 0.5)
        scoreAnimState.value = gameState.score;

    // Kill tween precedente per evitare stacking durante rapid clicks
    if (_scoreTween) _scoreTween.kill();

    // GSAP anima il valore "visuale" verso il valore reale
    _scoreTween = gsap.to(scoreAnimState, {
        duration: 0.2,
        value: gameState.score,
        ease: "power1.out",
        onUpdate: () => {
            setTextIfChanged('score-display', formatNumber(Math.trunc(scoreAnimState.value)));
        }
    });

    const scoreEl = getEl('score-display');
    if (scoreEl) {
        scoreEl.setAttribute('data-tooltip', formatFullNumber(gameState.score));
        scoreEl.classList.add('simple-tooltip');
        // Micro-bump visivo quando il punteggio aumenta
        if (gameState.score > scoreAnimState.value * 1.001) {
            scoreEl.classList.add('score-bump');
            clearTimeout(scoreEl._bumpTimer);
            scoreEl._bumpTimer = setTimeout(() => scoreEl.classList.remove('score-bump'), 150);
        }
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

function updateHUD() {
    const leftPanel = document.getElementById('header-left-panel');
    const rightPanel = document.getElementById('header-right-panel');
    const displayCareer = document.getElementById('display-career-bonus');
    const displayTokens = document.getElementById('prestige-points-display');
    const headerQbit = document.getElementById('header-qbit-container');

    const hasPrestige = gameState.totalResets > 0 || gameState.prestigePoints.gt(0) || gameState.lifetimePrestigePoints.gt(0);
    const hasQuantum = gameState.totalFormattazioni > 0 || gameState.qBits.gt(0);

    // Mostra i pannelli se hai fatto almeno un Prestigio O una Formattazione
    if (hasPrestige || hasQuantum) {
        if (leftPanel) leftPanel.classList.remove("header_stat_box_display_none");
        if (rightPanel) rightPanel.classList.remove("header_stat_box_display_none");

        if (displayCareer) setTextIfChanged('display-career-bonus', `x${formatNumber(prestigeBonus)}`);
        if (displayTokens) setTextIfChanged('prestige-points-display', formatNumber(gameState.prestigePoints));

        // Gestione visibilità div specifico dei Q-Bits
        if (headerQbit) headerQbit.style.display = hasQuantum ? 'flex' : 'none';
    }
    else {
        if (leftPanel) leftPanel.classList.add("header_stat_box_display_none");
        if (rightPanel) rightPanel.classList.add("header_stat_box_display_none");
    }
}

function updateWallets() {
    setTextIfChanged('lab-wallet-amount', formatNumber(gameState.prestigePoints));
    setTextIfChanged('bug-wallet-amount', formatNumber(gameState.score.floor()));

    // Aggiorna Q-Bits anche nell'header in alto
    setTextIfChanged('qbit-wallet-amount', formatNumber(gameState.qBits));
    setTextIfChanged('header-qbit-display', formatNumber(gameState.qBits));

    // Aggiorna Q-Bits in attesa nel bottone di formattazione
    document.querySelectorAll('.bug-wallet-amount').forEach(el => {
        if (el.textContent !== formatNumber(gameState.score)) el.textContent = formatNumber(gameState.score);
    });

    // Aggiorna Q-Bits in attesa nel bottone di formattazione (NUOVA FORMULA SQRT)
    if (gameState.prestigePoints) {
        const tokenDiv = gameState.prestigePoints.div(10000);
        let bonusQbits = new Decimal(0);
        if (tokenDiv.gte(1)) {
            bonusQbits = tokenDiv.sqrt().floor();
        }
        const pendingQBits = new Decimal(1).add(bonusQbits);
        setTextIfChanged('pending-qbits-display', `+${formatNumber(pendingQBits)} Q-Bit`);
    }

    // --- NUOVO: GESTIONE REQUISITO FORMATTAZIONE ---
    const formatBtn = document.getElementById('btn-open-format-modal');
    const formatWarning = document.getElementById('format-requirement-warning');
    const currentResetsDisplay = document.getElementById('current-resets-display');

    if (formatBtn && formatWarning && currentResetsDisplay) {
        const currentResets = gameState.totalResets || 0;
        currentResetsDisplay.textContent = currentResets;

        if (currentResets < 20) {
            formatBtn.disabled = true;
            formatBtn.style.opacity = '0.4';
            formatBtn.style.cursor = 'not-allowed';
            formatWarning.style.display = 'block';
        } else {
            formatBtn.disabled = false;
            formatBtn.style.opacity = '1';
            formatBtn.style.cursor = 'pointer';
            formatWarning.style.display = 'none';
        }
    }
}

// Cache per updateStoreButtons: evita di settare disabled su ogni frame
const _btnDisabledCache = {};

function updateStoreButtons() {
    // Teams
    for (const key in gameState.teams) {
        if (!gameData.teams[key]) continue;
        let amountToBuy = window.buyMultiplier;
        let isMax = false;
        if (amountToBuy === 'MAX') {
            const max = calculateMaxAffordable(key);
            amountToBuy = max > 0 ? max : 1;
            isMax = true;
        }
        const currentCost = calculateBulkCost(key, amountToBuy);
        const btnId = `buy-${key}`;
        const shouldDisable = gameState.score.lt(currentCost);

        // Solo se lo stato disabled è cambiato
        if (_btnDisabledCache[btnId] !== shouldDisable) {
            const btn = getEl(btnId);
            if (btn) btn.disabled = shouldDisable;
            _btnDisabledCache[btnId] = shouldDisable;
        }

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
        if (!gameData.clickUpgrades[key]) continue;
        if (!gameState.clickUpgrades[key].purchased) {
            const btnId = `buy-${key}`;
            const shouldDisable = gameState.score.lt(gameData.clickUpgrades[key].cost);
            if (_btnDisabledCache[btnId] !== shouldDisable) {
                const btn = getEl(btnId);
                if (btn && !btn.classList.contains('owned')) {
                    btn.disabled = shouldDisable;
                    _btnDisabledCache[btnId] = shouldDisable;
                }
            }
        }
    }

    // Enhancements
    for (const key in gameState.buildingEnhancements) {
        if (!gameData.buildingEnhancements[key]) continue;
        if (!gameState.buildingEnhancements[key].purchased) {
            const btnId = `buy-${key}`;
            const shouldDisable = gameState.score.lt(gameData.buildingEnhancements[key].cost);
            if (_btnDisabledCache[btnId] !== shouldDisable) {
                const btn = getEl(btnId);
                if (btn && !btn.classList.contains('owned')) {
                    btn.disabled = shouldDisable;
                    _btnDisabledCache[btnId] = shouldDisable;
                }
            }
        }
    }

    // Prestige / Lab
    for (const key in gameState.prestigeUpgrades) {
        const data = gameData.prestigeUpgrades[key];
        const state = gameState.prestigeUpgrades[key];
        if (!data) continue;
        if (data.isCounted && data.maxLevel && state.count >= data.maxLevel) continue;
        if (!data.isCounted && state.purchased) continue;

        const btnId = `buy-${key}`;
        const shouldDisable = gameState.prestigePoints.lt(data.isCounted ? calculatePrestigeUpgradeCost(key) : data.baseCost);
        if (_btnDisabledCache[btnId] !== shouldDisable) {
            const btn = getEl(btnId);
            if (btn && !btn.classList.contains('owned')) {
                btn.disabled = shouldDisable;
                _btnDisabledCache[btnId] = shouldDisable;
            }
        }
    }
}

function updateSkillButton() {
    const btnCrunch = getEl('skill-crunchTime');
    if (!btnCrunch) return;

    if (document.body.classList.contains('rick-rolling') || isBluescreenActive) {
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

function updateTabsVisibility() {
    const tabPrestige = getEl('tab-prestige');
    if (tabPrestige) {
        const show = gameState.totalResets > 0 || gameState.prestigePoints.gt(0) || gameState.lifetimePrestigePoints.gt(0);
        if (show) tabPrestige.classList.remove("tab_promozione");
    }

    const tabQuantum = getEl('tab-quantum');
    const headerQbit = getEl('header-qbit-container');

    // Appare se hai fatto 20 reset, o se hai già formattato, o se hai Q-bits
    const isQuantumUnlocked = gameState.totalResets >= 20 || gameState.totalFormattazioni > 0 || gameState.qBits.gt(0);

    if (tabQuantum) {
        tabQuantum.style.display = isQuantumUnlocked ? 'flex' : 'none';
    }
    if (headerQbit) {
        headerQbit.style.display = isQuantumUnlocked ? 'flex' : 'none';
    }
}

function updatePrestigeVisuals() {
    const prestigeBtn = document.getElementById('open-prestige-hub-btn');
    if (!prestigeBtn) return;

    // Recupera i valori in modo sicuro (gestisce null/undefined)
    const currentScore = gameState.totalScore || new Decimal(0);
    const threshold = getPrestigeThreshold();
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

    // Aggiorna solo lo stato equipaggiato senza ricostruire l'intera UI (evita il flash)
    _refreshEquippedState(skinId);
}

// Aggiorna stato equipped + sfondo dinamico body (rarità skin attiva)
function _refreshEquippedState(newSkinId) {
    // Set body data-attribute per CSS in-game tinted background
    if (gameData?.skins?.[newSkinId]?.rarity) {
        document.body.setAttribute('data-current-skin-rarity', gameData.skins[newSkinId].rarity);
    }
    // Re-render unified grid
    updateSkinsUI();
}

function triggerChristmasOverlay() {
    const overlay = document.getElementById('christmas-overlay');

    const skinsModal = document.getElementById('skins-modal');
    if (skinsModal) {
        skinsModal.style.display = 'none';
    }
    if (overlay) {
        overlay.classList.add("christmas_overlay_flex");
    }
    if (typeof AudioManager !== 'undefined') {
        AudioManager.play('sound-merry', 'sfx');
    }
    setTimeout(() => {
        if (overlay) overlay.classList.remove("christmas_overlay_flex");
    }, 4000);
}

let christmasAudioInitialized = false;

// --- GESTORE UNIFICATO EFFETTI VISIVI (VFX) ---
const VFXManager = {
    intervals: {},
    frames: {},

    stopAll() {
        // Ferma i loop
        for (let key in this.intervals) clearInterval(this.intervals[key]);
        for (let key in this.frames) cancelAnimationFrame(this.frames[key]);
        this.intervals = {};
        this.frames = {};

        // Pulisce il DOM
        const snow = document.getElementById('snow-container');
        if (snow) { snow.innerHTML = ''; snow.classList.remove("snow_container_block"); }

        const fire = document.getElementById('fire-particles-container');
        if (fire) { fire.innerHTML = ''; fire.style.display = 'none'; }

        const matrix = document.getElementById('matrix-canvas');
        if (matrix) {
            const ctx = matrix.getContext('2d');
            ctx.clearRect(0, 0, matrix.width, matrix.height);
        }
    },

    start(effectType) {
        // Non stoppiamo tutto se stiamo per attivare qualcosa, 
        // lo farà applySkinVisuals per gestire layer combinati.

        if (effectType === 'snow') this.spawnSnow();
        if (effectType === 'fire') this.spawnFire();
        if (effectType === 'matrix') this.spawnMatrix();
    },

    spawnSnow() {
        const container = document.getElementById('snow-container');
        if (!container) return;
        container.classList.add("snow_container_block");
        if (container.children.length > 0) return; // Già generata

        for (let i = 0; i < 60; i++) {
            const flake = document.createElement('div');
            flake.className = 'snowflake';
            const size = Math.random() * 5 + 3 + 'px';
            flake.style.width = size; flake.style.height = size;
            flake.style.left = Math.random() * 100 + 'vw';
            flake.style.animationDuration = (Math.random() * 7 + 5) + 's';
            flake.style.animationDelay = (Math.random() * -20) + 's';
            flake.style.opacity = Math.random() * 0.7 + 0.3;
            container.appendChild(flake);
        }
    },

    spawnFire() {
        const container = document.getElementById('fire-particles-container');
        if (!container) return;
        container.style.display = 'block';

        if (this.intervals.fire) clearInterval(this.intervals.fire);

        // La funzione spawnFireParticle è quella esistente in game-logic.js
        this.intervals.fire = setInterval(() => {
            if (typeof spawnFireParticle === 'function') spawnFireParticle(container);
        }, 100);
    },

    spawnMatrix() {
        // La logica esistente di startMatrixEffect in ui-functions.js
        if (typeof startMatrixEffect === 'function') startMatrixEffect();
    }
};

function applySkinVisuals(skinId, forcePlayMusic = false) {
    const data = gameData.skins[skinId];
    const skinData = data || gameData.skins['default'];
    const theme = skinData.themeConfig || {};

    // v3: setta data-current-skin-rarity sul body per sfondo dinamico in-game
    if (skinData.rarity) {
        document.body.setAttribute('data-current-skin-rarity', skinData.rarity);
    }

    const photoNormal = document.getElementById('manager-photo-normal');
    const photoClicked = document.getElementById('manager-photo-clicked');

    // 1. PULIZIA TOTALE (Temi vecchi, Variabili Inline, VFX)
    Array.from(document.body.classList).forEach(cls => {
        if (cls.startsWith('theme-')) document.body.classList.remove(cls);
    });
    document.body.style = ''; // Pulisce le var CSS custom
    VFXManager.stopAll();

    // 2. LAZY LOAD CSS ESTERNI (Per temi strutturali complessi come 8bit o Super)
    if (theme.cssFile) {
        loadThemeCSS(theme.cssFile);
    }

    // 3. APPLICAZIONE VARIABILI CSS CUSTOM (Per varianti di colore leggere)
    if (theme.cssVars) {
        for (const [property, value] of Object.entries(theme.cssVars)) {
            document.body.style.setProperty(property, value);
        }
    }

    // 4. APPLICAZIONE CLASSE BODY
    if (theme.bodyClass) {
        document.body.classList.add(theme.bodyClass);
    }

    // 5. APPLICAZIONE EFFETTI VISIVI (Neve, Fuoco, ecc.)
    if (theme.vfx) {
        VFXManager.start(theme.vfx);
    }

    // (Gestione Golden Bug e Audio invariata...)
    const goldenBugIcon = document.querySelector('#golden-bug i');
    if (goldenBugIcon) {
        goldenBugIcon.className = 'fa-solid';
        goldenBugIcon.style.color = '';
        if (theme.goldenBugIcon) {
            goldenBugIcon.classList.add(theme.goldenBugIcon);
            if (theme.goldenBugColor) goldenBugIcon.style.color = theme.goldenBugColor;
        } else {
            goldenBugIcon.classList.add('fa-bug');
        }
    }

    if (typeof AudioManager !== 'undefined' && AudioManager.updateAmbience)
        AudioManager.updateAmbience();

    // Applica le immagini centrali
    const applyClasses = (element, imgSrc) => {
        if (!element) return;
        element.src = `assets/image/${imgSrc}`;
        Array.from(element.classList).forEach(cls => {
            if (cls.startsWith('bg-')) element.classList.remove(cls);
        });
        element.classList.add(`bg-${skinData.rarity || 'common'}`);
    };

    applyClasses(photoNormal, skinData.img);
    applyClasses(photoClicked, skinData.imgClick);
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
        if (hasClaimable)
            achBtn.classList.add('notify-overlay');
        else
            achBtn.classList.remove('notify-overlay');
    }
}

function updateStatsUI() {
    const statsList = document.getElementById('stats-list');
    if (!statsList) return;

    // 1. Recupera la soglia dinamica attuale
    const threshold = getPrestigeThreshold();

    // 2. Calcola il progresso basandosi sulla soglia
    const progress = gameState.totalScore.div(threshold).mul(100).min(100).toNumber();

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

    // DATI NG+ (End-Game)
    const totalFormats = gameState.totalFormattazioni || 0;
    const totalQBits = gameState.lifetimeQBits || new Decimal(0);

    // --- GENERAZIONE HTML CON TOOLTIP SEMPLICI ---
    statsList.innerHTML = `
        <div class="stats-container">

            <!-- HERO: Progresso Promozione -->
            <div class="stats-section stats-hero">
                <div class="stat-progress-wrapper" style="margin-top: 0; padding-top: 0; border-top: none;">
                    <div class="stat-progress-info">
                        <span>
                            <i class="fa-solid fa-rocket" style="color: #2ecc71; margin-right: 6px;"></i>
                            Progresso Promozione
                            <span style="font-size: 0.75rem; color: #95a5a6; font-weight: normal; margin-left: 5px;">
                                (Obiettivo: <span class="simple-tooltip" data-tooltip="${formatFullNumber(threshold)}">${formatNumber(threshold)}</span>)
                            </span>
                        </span>
                        <span style="color: ${progress >= 100 ? '#2ecc71' : '#fff'}; font-size: 1.1rem; font-weight: 800;">${progress.toFixed(2)}%</span>
                    </div>
                    <div class="stat-progress-bg">
                        <div class="stat-progress-fill" style="width: ${progress}%;"></div>
                    </div>
                </div>
            </div>

            <!-- Economia -->
            <div class="stats-section">
                <div class="stats-header"><i class="fa-solid fa-wallet" style="color: #2ecc71; margin-right: 8px;"></i> Economia Aziendale</div>
                <div class="stats-grid">
                    <div class="stat-box">
                        <span class="stat-label"><i class="fa-solid fa-bug" style="color: #2ecc71; margin-right: 4px; font-size: 0.65rem;"></i> Bug Attuali</span>
                        <span class="stat-value simple-tooltip" style="color: #2ecc71;" data-tooltip="${formatFullNumber(gameState.score)}">
                            ${formatNumber(Math.floor(gameState.score))}
                        </span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label"><i class="fa-solid fa-arrow-trend-up" style="color: #3498db; margin-right: 4px; font-size: 0.65rem;"></i> Totale Run</span>
                        <span class="stat-value simple-tooltip" style="color: #3498db;" data-tooltip="${formatFullNumber(gameState.totalScore)}">
                            ${formatNumber(gameState.totalScore)}
                        </span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label"><i class="fa-solid fa-crown" style="color: #f1c40f; margin-right: 4px; font-size: 0.65rem;"></i> Totale Carriera</span>
                        <span class="stat-value simple-tooltip" style="color: #f1c40f;" data-tooltip="${formatFullNumber(gameState.lifetimeScore)}">
                            ${formatNumber(gameState.lifetimeScore)}
                        </span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label"><i class="fa-solid fa-moon" style="color: #9b59b6; margin-right: 4px; font-size: 0.65rem;"></i> Offline</span>
                        <span class="stat-value simple-tooltip" style="color: #9b59b6;" data-tooltip="${formatFullNumber(totalOffline)}">
                            ${formatNumber(totalOffline)}
                            <span style="font-size: 0.75rem; color: #7f8c8d; font-weight: normal;">(${offlinePercentText})</span>
                        </span>
                    </div>
                </div>
            </div>

            <!-- Performance -->
            <div class="stats-section">
                <div class="stats-header"><i class="fa-solid fa-microchip" style="color: #3498db; margin-right: 8px;"></i> Performance & Tech</div>
                <div class="stats-grid">
                    <div class="stat-box">
                        <span class="stat-label"><i class="fa-solid fa-gauge-high" style="color: #e67e22; margin-right: 4px; font-size: 0.65rem;"></i> BPS</span>
                        <span class="stat-value simple-tooltip" style="color: #e67e22;" data-tooltip="${formatFullNumber(bps)}">
                            ${formatNumber(bps)}
                        </span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label"><i class="fa-solid fa-hand-pointer" style="color: #e74c3c; margin-right: 4px; font-size: 0.65rem;"></i> Click</span>
                        <span class="stat-value" style="color: #e74c3c;">
                            ${formatNumber(rawClick)}
                            <span style="font-size: 0.75rem; color: #7f8c8d; font-weight: normal;">
                                (x${formatNumber(totalClick)})
                            </span>
                        </span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label"><i class="fa-solid fa-bolt" style="color: #f1c40f; margin-right: 4px; font-size: 0.65rem;"></i> Moltiplicatore</span>
                        <span class="stat-value" style="color: #f1c40f;">x${formatNumber(prestigeBonus)}</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label"><i class="fa-solid fa-dice" style="color: #1abc9c; margin-right: 4px; font-size: 0.65rem;"></i> Crit Chance</span>
                        <span class="stat-value" style="color: #1abc9c;">${(goldenBugChance * 100).toFixed(2)}%</span>
                    </div>
                </div>
            </div>

            ${(totalFormats > 0 || totalQBits.gt(0)) ? `
            <!-- Multiverso -->
            <div class="stats-section" style="border-color: rgba(155, 89, 182, 0.3);">
                <div class="stats-header" style="color: #9b59b6;"><i class="fa-solid fa-meteor" style="margin-right: 8px;"></i> Multiverso (NG+)</div>
                <div class="stats-grid">
                    <div class="stat-box">
                        <span class="stat-label"><i class="fa-solid fa-explosion" style="color: #e74c3c; margin-right: 4px; font-size: 0.65rem;"></i> Universi Distrutti</span>
                        <span class="stat-value" style="color: #e74c3c;">${formatNumber(totalFormats)}</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label"><i class="fa-solid fa-atom" style="color: #9b59b6; margin-right: 4px; font-size: 0.65rem;"></i> Energia Quantica</span>
                        <span class="stat-value" style="color: #9b59b6; text-shadow: 0 0 10px rgba(155,89,182,0.3);">${formatNumber(totalQBits)} Q-Bits</span>
                    </div>
                </div>
            </div>
            ` : ''}

            <!-- Profilo -->
            <div class="stats-section">
                <div class="stats-header"><i class="fa-solid fa-id-card" style="color: #9b59b6; margin-right: 8px;"></i> Profilo & Visuals</div>
                <div class="stats-grid">
                    <div class="stat-box">
                        <span class="stat-label"><i class="fa-solid fa-shirt" style="color: #9b59b6; margin-right: 4px; font-size: 0.65rem;"></i> Skin</span>
                        <span class="stat-value" style="text-transform: capitalize; color: #9b59b6;">
                            ${(gameData.skins[gameState.skins.current] ? gameData.skins[gameState.skins.current].name : 'Default')}
                        </span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label"><i class="fa-solid fa-clock" style="color: #95a5a6; margin-right: 4px; font-size: 0.65rem;"></i> Tempo di Gioco</span>
                        <span class="stat-value">${formatTime(gameState.totalPlayTime)}</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label"><i class="fa-solid fa-computer-mouse" style="color: #e74c3c; margin-right: 4px; font-size: 0.65rem;"></i> Click Totali</span>
                        <span class="stat-value">${formatNumber(gameState.totalClicks)}</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label"><i class="fa-solid fa-arrow-up-right-dots" style="color: #f39c12; margin-right: 4px; font-size: 0.65rem;"></i> Promozioni</span>
                        <span class="stat-value">${formatNumber(gameState.totalResets)}</span>
                    </div>
                </div>
            </div>

        </div>
    `;
}