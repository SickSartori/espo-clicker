/**
 * Rendering / HUD / store / skins / stats / toast-DOM.
 *
 * Migrato da js/ui-functions.js (classic script) a modulo ESM — Blocco #1 kill-legacy.
 * Le 44 funzioni sono dichiarazioni top-level (non eseguono nulla alla definizione).
 * I 2 loader V3 (`_v3themeLoader`, `_v3toastQueue`) sono resi LAZY perché questo
 * modulo è importato da main.ts PRIMA che `window.EspoV3` sia costruito. I riferimenti
 * a global legacy passano da `window.*` (alias `w`) perché un modulo strict non vede
 * lo scope-bundle. Le funzioni consumate da altri file/`onclick` inline sono ri-esposte
 * `window.X = X` (shim TEMPORANEI, rimossi a fine migrazione).
 */
const w = window as any;
import { store } from '../../state/store';

// --- HELPER DI OTTIMIZZAZIONE (Cache & Text Check) ---
const domCache = new Map<string, any>();

/**
 * Recupera un elemento dal DOM usando una cache interna.
 * Riduce le chiamate lente a document.getElementById.
 */
function getEl(id: any) {
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
function setTextIfChanged(elementId: any, newText: any) {
    let el = getEl(elementId);

    if (el && el.textContent !== String(newText)) {
        el.textContent = newText;
        return true;
    }

    return false;
}

// ---------  FUNZIONI DI FORMATTORE ---------

function formatNumber(num: any) {
    // F5 -> F8: formattazione pura in EspoV3.format (suffissi localizzati da store.gameData).
    return window.EspoV3.format.formatNumber(num, store.gameData.texts.format.suffixes);
}

function formatFullNumber(num: any) {
    // F5 -> F8: floor + separatori in EspoV3.format (esatto anche oltre 2^53).
    return window.EspoV3.format.formatFullNumber(num, store.gameData.texts.format.suffixes);
}

// --- LAZY LOAD CSS (F5 -> F8) ---
// dedup, coalescing e failsafe vivono in EspoV3.theme (puro, testato); qui resta
// solo l'iniezione DOM del <link>. Il fallback legacy inline e stato rimosso.
// Lazy: questo modulo è importato da main.ts PRIMA che window.EspoV3 sia costruito.
let _themeLoaderInstance: any;
function themeLoader(): any {
    return (_themeLoaderInstance ??= (window as any).EspoV3.theme.createCssLoader({
        inject: (href: any, onDone: any) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.onload = onDone;
            link.onerror = onDone; // CSS irraggiungibile: applica comunque la classe
            document.head.appendChild(link);
        },
        cssBase: 'styles/themes/', // reorg D1: i temi lazy vivono in styles/themes (ex css/)
        cacheVer: () => w.CACHE_VER || (w.GAME_VERSION ? w.GAME_VERSION.major : Date.now()),
        onLog: (m: any) => console.log(m),
        onWarn: (m: any, e: any) => console.warn(m, e),
    }));
}

function loadThemeCSS(themeFile: any, onReady?: any) {
    return themeLoader().load(themeFile, onReady);
}

function formatTime(totalSeconds: any) {
    // F5 -> F8: logica pura in EspoV3.format, etichette (d/h/m/s) da store.gameData.
    return window.EspoV3.format.formatTime(totalSeconds, store.gameData.texts.format.time);
}


let matrixFrameId: any = null;
let matrixResizeHandler: any = null;

function startMatrixEffect() {
    const canvas = document.getElementById('matrix-canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;

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

    const drops: any[] = [];
    // Inizializza le gocce (tutte partono da y=1)
    for (let index = 0; index < columns; index++) {
        drops[index] = 1;
    }

    let lastMatrixFrame = 0;
    const MATRIX_FRAME_INTERVAL = 1000 / 30; // 30 FPS reali

    const draw = (timestamp: any) => {
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
    const canvas = document.getElementById('matrix-canvas') as HTMLCanvasElement | null;
    if (canvas) {
        const ctx = canvas.getContext('2d')!;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

// --- GENERATORE UNIVERSALE DI CARD ---
function renderStoreSection(config: any) {
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

    const mode = store.gameState.filterSettings.globalFilter || 'available';
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
    let nextLockedKey: any = null;
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
        let el: any = document.getElementById(domId);

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
                    <button class="buy-btn" id="buy-${key}" data-upgrade-name="${key}" aria-label="${status.label} ${data.name}">${status.label}</button>
                </div>
                <div class="progress-bar-container" style="display:none;">
                    <div class="progress-bar-fill"></div>
                    <span class="progress-text">Locked</span>
                </div>
            `;

            // Listener con PreventDefault per evitare focus jump
            const btn = el.querySelector('.buy-btn');
            btn.addEventListener('click', (e: any) => {
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
                txt = `${store.gameData.texts.ui.cost}: ${formatNumber(val)}`;
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
            const label = status.isMaxed ? "MAX" : store.gameData.texts.ui.owned;
            if (btn.textContent !== label) btn.textContent = label;
            btn.className = "buy-btn owned";
            btn.disabled = true;
            btn.style.display = 'block';
            if (costWrapper) costWrapper.style.display = 'none';
            if (progressContainer) progressContainer.style.display = 'none';

        } else if (status.unlocked) {
            const label = status.label || store.gameData.texts.ui.buy;
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
        dataSource: store.gameData.clickUpgrades,
        stateSource: store.gameState.clickUpgrades,
        cardClass: 'click-upgrade',
        btnClass: 'buy-click-btn',
        onBuy: (key: any) => w.buyClickUpgrade(key),
        getStatus: (key: any, data: any, state: any) => {
            const isUnlocked = store.gameState.totalClicks >= data.requiredClicks;

            return {
                purchased: state.purchased,
                unlocked: isUnlocked,
                canAfford: store.gameState.score.gte(data.cost),
                label: store.gameData.texts.ui.buy,
                progress: Math.min((store.gameState.totalClicks / data.requiredClicks) * 100, 100),   // Calcolo preciso della barra di progresso
                progressText: `Click: ${formatNumber(store.gameState.totalClicks)} / ${formatNumber(data.requiredClicks)}`
            };
        },
        setEmptyMsg: (el: any, mode: any) => setEmptyMessage(el, mode)
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
        dataSource: store.gameData.buildingEnhancements,
        stateSource: store.gameState.buildingEnhancements,
        cardClass: 'enhancement-upgrade',
        btnClass: 'enhancement-btn',
        onBuy: (key: any) => w.buyTeamEnhancement(key),
        getStatus: (key: any, data: any, state: any) => {
            const targetTeamState = store.gameState.teams[data.targetTeam];
            const targetTeamData = store.gameData.teams[data.targetTeam];

            const current = targetTeamState ? targetTeamState.count : 0;
            const teamName = targetTeamData ? targetTeamData.name : "???";

            return {
                purchased: state.purchased,
                unlocked: current >= data.requiredCount,
                canAfford: store.gameState.score.gte(data.cost),
                label: store.gameData.texts.ui.buy,
                progress: Math.min((current / data.requiredCount) * 100, 100),
                // Qui avveniva l'errore: ora usiamo la variabile sicura 'teamName'
                progressText: `${teamName}: ${current}/${data.requiredCount}`
            };
        },
        setEmptyMsg: (el: any, mode: any) => setEmptyMessage(el, mode)
    });

    // NEGOZIO PRESTIGIO
    renderStoreSection({
        type: 'prestige',
        containerId: 'prestige-list-container',
        emptyId: 'prestige-empty',
        dataSource: store.gameData.prestigeUpgrades,
        stateSource: store.gameState.prestigeUpgrades,
        cardClass: 'prestige-upgrade',
        btnClass: 'prestige-btn',
        onBuy: (key: any) => w.buyPrestigeUpgrade(key),
        getStatus: (key: any, data: any, state: any) => {
            const isMaxed = data.maxLevel && state.count >= data.maxLevel;
            const singlePurchased = !data.isCounted && state.purchased;
            const actualCost = data.isCounted ? w.calculatePrestigeUpgradeCost(key) : data.baseCost;

            return {
                purchased: singlePurchased,
                unlocked: !isMaxed && !singlePurchased,
                isMaxed: isMaxed,
                canAfford: store.gameState.prestigePoints.gte(actualCost), // Usa actualCost
                label: isMaxed || singlePurchased ? store.gameData.texts.ui.owned : (isMaxed ? store.gameData.texts.ui.max : store.gameData.texts.ui.buy.toUpperCase()),
                costText: `${store.gameData.texts.ui.cost}: ${formatNumber(actualCost)} Token`, // Usa actualCost
                currentCost: actualCost, // Usa actualCost
                progress: 100
            };
        },
        setEmptyMsg: (el: any, mode: any) => { el.textContent = store.gameData.texts.ui.labFull; }
    });

    // NEGOZIO TEAMS
    renderStoreSection({
        type: 'building',
        containerId: 'building-list-container',
        emptyId: 'building-empty',
        dataSource: store.gameData.teams,
        stateSource: store.gameState.teams,
        cardClass: 'upgrade',
        btnClass: 'buy-building-btn',
        useCustomBody: true,
        showCount: true,
        fixedOrder: true,
        onBuy: (key: any) => w.buyTeam(key),
        getStatus: (key: any, data: any, state: any) => {
            let amountToBuy = w.buyMultiplier;
            let isMax = false;

            if (amountToBuy === 'MAX') {
                const max = w.calculateMaxAffordable(key);
                amountToBuy = max > 0 ? max : 1;
                isMax = true;
            }

            const currentCost = w.calculateBulkCost(key, amountToBuy);

            let teamBPS = data.cpsPerUnit;
            for (const enhanceKey in store.gameState.buildingEnhancements) {
                const eData = store.gameData.buildingEnhancements[enhanceKey];
                const eState = store.gameState.buildingEnhancements[enhanceKey];

                if (!eData) continue;

                if (eData.targetTeam === key && eState.purchased) {
                    teamBPS *= eData.multiplier;
                }
            }
            const totalUnitBPS = teamBPS * store.prestigeBonus * store.clickCPSBonus * store.bluescreenMultiplier;

            let prefix = store.gameData.texts.ui.cost;
            if (isMax && amountToBuy > 1) prefix = `${store.gameData.texts.ui.cost} (+${formatNumber(amountToBuy)})`;
            else if (!isMax && amountToBuy > 1) prefix = `${store.gameData.texts.ui.cost} (${amountToBuy}x)`;

            return {
                unlocked: true,
                purchased: false,
                canAfford: store.gameState.score.gte(currentCost),
                label: store.gameData.texts.ui.buy,
                costText: `${prefix}: ${formatNumber(currentCost)}`,
                bpsText: `+${formatNumber(totalUnitBPS)} ${store.gameData.texts.ui.bpsEach}`,
                currentCost: currentCost
            };
        }
    });

    // NEGOZIO QUANTICO (Q-Lab)
    if (store.gameState.totalFormattazioni > 0 || store.gameState.qBits.gt(0)) {
        renderStoreSection({
            type: 'quantum',
            containerId: 'quantum-list-container',
            emptyId: 'quantum-empty',
            dataSource: store.gameData.superUpgrades,
            stateSource: store.gameState.superUpgrades,
            cardClass: 'prestige-upgrade quantum-card', // Ricicliamo la struttura lab
            btnClass: 'quantum-btn',
            onBuy: (key: any) => { if (typeof w.buySuperUpgrade === 'function') w.buySuperUpgrade(key); },
            getStatus: (key: any, data: any, state: any) => {
                return {
                    purchased: state.purchased,
                    unlocked: !state.purchased,
                    isMaxed: false,
                    canAfford: store.gameState.qBits.gte(data.cost),
                    label: state.purchased ? store.gameData.texts.ui.owned : store.gameData.texts.ui.buy.toUpperCase(),
                    costText: `${store.gameData.texts.ui.cost}: ${formatNumber(data.cost)} qBit`,
                    currentCost: data.cost,
                    progress: 100
                };
            },
            setEmptyMsg: (el: any, mode: any) => { el.textContent = "Tecnologia massima raggiunta."; }
        });
    }

    if (typeof updatePrestigeVisuals === 'function') updatePrestigeVisuals();
}

let currentSkinFilter = 'all';
let currentRarityFilter = 'all';
let modernSkinsArray: any[] = [];
let modernCurrentIndex = 0;
let lastViewedSkinId = null;

// Listener per i filtri e lo switch (eseguiti una sola volta all'avvio)
document.addEventListener('DOMContentLoaded', () => {
    const toggleUI = document.getElementById('skins-ui-toggle') as HTMLInputElement | null;
    const toggleLabel = document.getElementById('skins-ui-label'); // FIX: Recupero elemento testo

    if (toggleUI) {
        const pref = localStorage.getItem('useModernSkinsUI');
        toggleUI.checked = pref !== 'false'; // Default a true

        // FIX: Imposta il testo iniziale al caricamento
        if (toggleLabel) {
            toggleLabel.textContent = toggleUI.checked ? 'Card' : 'Griglia';
        }

        toggleUI.addEventListener('change', (e: any) => {
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
        btn.addEventListener('click', (e: any) => {
            document.querySelectorAll('.skin-filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentSkinFilter = e.target.getAttribute('data-filter');
            updateSkinsUI();
        });
    });

    // Setup Filtro Rarità
    const raritySelect = document.getElementById('skin-rarity-filter');
    if (raritySelect) {
        raritySelect.addEventListener('change', (e: any) => {
            currentRarityFilter = e.target.value;
            updateSkinsUI();
        });
    }
});

// Funzione principale per aggiornare la modale delle skin
// === Guardaroba unificato (v3) — render grid moderno con sfondo dinamico ===
function updateSkinsUI() {
    if (w.AssetManager) {
        w.AssetManager.load('SKINS_EPIC');
        w.AssetManager.load('SKINS_LEGENDARY');
    }

    const grid = document.getElementById('skins-grid-modern');
    if (!grid) return;

    if (!store.gameState.skins || typeof store.gameState.skins !== 'object') store.gameState.skins = { unlocked: ['default'], current: 'default' };
    if (!Array.isArray(store.gameState.skins.unlocked)) store.gameState.skins.unlocked = ['default'];

    const unlockedList = store.gameState.skins.unlocked;
    const currentSkin = store.gameState.skins.current;

    // Etichette rarità: da store.gameData.texts.rarities (tradotte via overlay i18n),
    // con fallback IT hardcoded se il dizionario non è disponibile.
    const rarityMap: any = (store.gameData.texts && store.gameData.texts.rarities) || {
        'common': 'COMUNE', 'rare': 'RARA', 'epic': 'EPICA',
        'legendary': 'LEGGENDARIA', 'divine': 'DIVINA', 'christmas': 'FESTIVA'
    };
    const rColors: any = {
        'common': '#bdc3c7', 'rare': '#3498db', 'epic': '#9b59b6',
        'legendary': '#f1c40f', 'divine': '#ffee90', 'christmas': '#e74c3c'
    };
    const rGlows: any = {
        'common': 'rgba(189,195,199,0.18)', 'rare': 'rgba(52,152,219,0.25)', 'epic': 'rgba(155,89,182,0.25)',
        'legendary': 'rgba(241,196,15,0.3)', 'divine': 'rgba(255,238,144,0.4)', 'christmas': 'rgba(231,76,60,0.3)'
    };

    const T = (store.gameData.texts && store.gameData.texts.ui) || {};

    const skinToAchievement: any = {};
    for (const achKey in store.gameData.achievements) {
        const ach = store.gameData.achievements[achKey];
        if (ach.reward && ach.reward.type === 'skin') {
            const skinId = ach.reward.id || ach.reward.value;
            skinToAchievement[skinId] = ach;
        }
    }

    let lockedCount = 0;
    for (const key in store.gameData.skins) {
        if (!unlockedList.includes(key)) lockedCount++;
    }
    const lockedFilterBtn = document.querySelector('.skin-filter-btn[data-filter="locked"]') as HTMLButtonElement | null;
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

    const rarityOrder: any = { 'common': 0, 'rare': 1, 'epic': 2, 'legendary': 3, 'divine': 4, 'christmas': 5 };
    const skinsArray: any[] = [];
    for (const key in store.gameData.skins) {
        const data = store.gameData.skins[key];
        const isUnlocked = unlockedList.includes(key);
        const isEquipped = currentSkin === key;
        const isBuyable = !isUnlocked && data.cost !== undefined;
        const canAfford = isBuyable && store.gameState.prestigePoints.gte(data.cost);

        if (currentSkinFilter === 'unlocked' && !isUnlocked) continue;
        if (currentSkinFilter === 'locked' && isUnlocked) continue;
        if (currentRarityFilter !== 'all' && data.rarity !== currentRarityFilter) continue;

        let requirement = '';
        let baseText = store.gameData.texts.ui.unknown;
        if (!isUnlocked && !isBuyable) {
            const linkedAch = skinToAchievement[key];
            if (linkedAch) {
                const isSecretLocked = linkedAch.isSecret && !store.gameState.achievements[linkedAch.id || key]?.unlocked;
                requirement = isSecretLocked ? store.gameData.texts.ui.secretGoal : (linkedAch.realDesc || linkedAch.desc);
                baseText = linkedAch.name;
            } else if (data.unlockHint) {
                requirement = data.unlockHint;
                baseText = store.gameData.texts.ui.skinLocked;
            }
        }
        // Le skin ottenibili dallo shop (comprabili, gratis, o dietro formattazione)
        // rivelano l'arte reale; solo quelle da obiettivo restano "mistero" (hidden.webp).
        const isFree = isBuyable && data.cost && typeof data.cost.lte === 'function' && data.cost.lte(0);
        const needsFormat = isBuyable && data.requiresFormatting && (store.gameState.totalFormattazioni || 0) < 1;
        // NON possedute → SEMPRE silhouette-mistero + lucchetto, anche le comprabili:
        // così non si spoilera l'arte. Le info stanno nel chip (gratis/prezzo/formatta/obiettivo).
        const imgSource = isUnlocked
            ? (data.img ? `assets/image/${data.img}` : 'assets/image/skins/espo.webp')
            : 'assets/image/ui/hidden.webp';

        skinsArray.push({
            id: key, data, isUnlocked, isEquipped, isBuyable, canAfford, isFree, needsFormat,
            isSilhouette: !isUnlocked, showLock: !isUnlocked,
            rarityLabel: rarityMap[data.rarity] || rarityMap.common || 'COMUNE',
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
        let stateClass;
        if (skin.isEquipped) stateClass = 'equipped';
        else if (skin.isUnlocked) stateClass = 'unlocked';
        else if (skin.isBuyable) {
            stateClass = 'buyable';
            if (skin.needsFormat) stateClass += ' format';
            else if (!skin.canAfford) stateClass += ' noafford';
        } else {
            stateClass = 'locked';
        }
        if (skin.isSilhouette) stateClass += ' silhouette';

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

        // Chip di stato (in basso a sx sull'arte): prezzo / gratis / formatta / obiettivo / in uso.
        // Comunica a colpo d'occhio cosa puoi fare, senza dover aprire il preview.
        let chipHtml = '';
        if (skin.isEquipped) {
            chipHtml = `<div class="skin-status-chip inuse"><i class="fa-solid fa-check"></i>${T.equipped || 'IN USO'}</div>`;
        } else if (skin.isUnlocked) {
            chipHtml = '';
        } else if (skin.isFree) {
            // Riscatto 1-tap direttamente dalla card (niente preview)
            chipHtml = `<button class="skin-status-chip free" title="${T.skinRedeemTip || 'Riscatta gratis'}" onclick="event.stopPropagation();buySkin('${skin.id}')"><i class="fa-solid fa-gift"></i>${T.skinFree || 'GRATIS'}</button>`;
        } else if (skin.needsFormat) {
            chipHtml = `<div class="skin-status-chip format"><i class="fa-solid fa-rotate"></i>${T.skinFormat || 'FORMATTA'} · ${skin.data.cost}</div>`;
        } else if (skin.isBuyable) {
            const affCls = skin.canAfford ? 'afford' : 'noafford';
            chipHtml = `<div class="skin-status-chip price ${affCls}"><i class="fa-solid fa-flask"></i>${skin.data.cost}</div>`;
        } else {
            chipHtml = `<div class="skin-status-chip objective"><i class="fa-solid fa-bullseye"></i>${T.skinObjective || 'OBIETTIVO'}</div>`;
        }

        // Requisito in hover: solo per le skin da obiettivo (mistero) che hanno un hint.
        const reqHoverHtml = (!skin.isUnlocked && !skin.isBuyable && skin.requirement)
            ? `<div class="skin-req-hover"><i class="fa-solid fa-circle-info"></i><span>${skin.requirement}</span></div>`
            : '';

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
                    <img src="${skin.imgSource}" alt="${skin.data.name}" loading="lazy"${skin.isSilhouette ? ' class="is-silhouette"' : ''}>
                    ${skin.showLock ? '<div class="skin-lock-overlay"><i class="fa-solid fa-lock"></i></div>' : ''}
                    ${chipHtml}
                    ${reqHoverHtml}
                </div>
                <div class="skin-name-display">${nameHtml}</div>
            </div>
        `;
    }).join('');
}

// === Skin Preview Modal (apre on click su card) ===
function showSkinPreview(skinId: any) {
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
        const needsFormat = skin.data.requiresFormatting && (store.gameState.totalFormattazioni || 0) < 1;
        if (needsFormat) {
            actionHtml = `
                <div class="preview-cost format"><i class="fa-solid fa-rotate"></i> Richiede Formattazione</div>
                <div class="preview-cost-value"><i class="fa-solid fa-flask"></i> ${skin.data.cost} Token</div>
                <button class="preview-btn disabled-btn" disabled><i class="fa-solid fa-lock"></i> FORMATTA PRIMA</button>`;
        } else if (skin.data.cost && typeof skin.data.cost.lte === 'function' && skin.data.cost.lte(0)) {
            // Skin gratuita (cost 0): claim diretto, niente "0 Token"
            actionHtml = `
                <div class="preview-cost-value afford"><i class="fa-solid fa-gift"></i> GRATIS</div>
                <button class="preview-btn buy-btn" onclick="buySkin('${skin.id}'); closeSkinPreview();">OTTIENI GRATIS</button>`;
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
    if (!w._skinPreviewKeyHandler) {
        w._skinPreviewKeyHandler = (e: any) => {
            const m = document.getElementById('skin-preview-modal');
            if (m && m.style.display !== 'none' && e.key === 'Escape') {
                closeSkinPreview();
            }
        };
        document.addEventListener('keydown', w._skinPreviewKeyHandler);
    }

    // Click backdrop closes
    modal.onclick = (e) => { if (e.target === modal) closeSkinPreview(); };
}

function closeSkinPreview() {
    const modal = document.getElementById('skin-preview-modal');
    if (modal) modal.style.display = 'none';
}

w.showSkinPreview = showSkinPreview;
w.closeSkinPreview = closeSkinPreview;


function updateAchievementsUI() {
    const list = document.getElementById('achievement-list');
    if (!list) return;

    list.innerHTML = '';
    const items: any[] = [];

    const typeIcons = {
        'click': 'fa-computer-mouse',
        'building': 'fa-building',
        'score': 'fa-coins',
        'time': 'fa-hourglass-half',
        'custom': 'fa-star'
    };

    Object.keys(store.gameData.achievements).forEach(key => {
        const data = store.gameData.achievements[key];
        const state = store.gameState.achievements[key] || { unlocked: false, claimed: false };
        if (state.claimed === undefined) state.claimed = false;

        if (data.season && !w.isSeasonActive(data.season) && !state.unlocked) {
            return; // Salta questo giro del ciclo
        }

        const isUnlocked = state.unlocked;
        const isClaimed = state.claimed;
        let progress = 0;
        let currentVal = 0;

        // Calcolo Progresso
        if (!isUnlocked) {
            // Sorgente del valore mostrato. Un achievement può dichiarare la propria
            // via getCurrent(): indispensabile per i type:'custom' (Golden Bug, combo,
            // formattazioni, reset, BPS, Q-bit, skin…) che altrimenti restano
            // hardcoded a 0 nella card, pur avendo lo stato corretto.
            if (typeof data.getCurrent === 'function') currentVal = data.getCurrent();
            else if (data.type === 'click') currentVal = store.gameState.totalClicks;
            else if (data.type === 'score') currentVal = store.gameState.totalScore;
            else if (data.type === 'building') currentVal = store.gameState.teams[data.buildingId] ? store.gameState.teams[data.buildingId].count : 0;
            else if (data.type === 'time') currentVal = store.gameState.totalPlayTime;

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
            let rewardText = store.gameData.texts.ui.rewardClaim;

            if (data.reward.type === 'bugs') {
                rewardText = `+${formatNumber(data.reward.value)} BUG`;
            } else if (data.reward.type === 'skin') {
                const skinId = data.reward.id || data.reward.value;
                const skinName = store.gameData.skins[skinId] ? store.gameData.skins[skinId].name : "Skin Speciale";

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

        let desc = (data.isSecret && !isUnlocked) ? store.gameData.texts.ui.secretGoal : (data.realDesc || data.desc);
        let name = (data.isSecret && !isUnlocked) ? store.gameData.texts.ui.unknown : data.name;

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
                    if (typeof w.claimAchievementReward === 'function') w.claimAchievementReward(key);
                });
            }
        }
    });
}

function showClickFeedback(event: any) {
    const feedbackContainer = document.getElementById('click-feedback-container') as any;
    if (!feedbackContainer) return;

    // PERF (clic a raffica): gli effetti decorativi (+N, particelle, tween GSAP) si
    // accumulavano senza limite saturando main-thread e renderer -> freeze. Backstop:
    // se ce ne sono gia' troppi a schermo salta tutto. Il punteggio e' gia' stato
    // aggiunto in resolveBug, quindi il click conta comunque.
    if (feedbackContainer.childElementCount > 28) return; // era 80: troppi nodi animati saturavano il renderer (freeze + combo persa)

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
            const btnRect = document.getElementById('clicker-btn')!.getBoundingClientRect();
            startX = (btnRect.left + btnRect.width / 2) - rect.left - (size / 2);
            startY = (btnRect.top + btnRect.height / 2) - rect.top - (size / 2);
        }

        container.style.left = `${startX}px`;
        container.style.top = `${startY}px`;
        container.style.width = `${size}px`;
        container.style.height = `${size}px`;

        feedbackContainer.appendChild(container);

        if (typeof w.gsap !== 'undefined') {
            w.gsap.fromTo(container,
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
    const lastCrash = store.gameState.lastBluescreenTimestamp || 0;
    const timeSinceLast = now - lastCrash;
    const isBlueScreen = (typeof store.isBluescreenActive !== 'undefined') ? store.isBluescreenActive : false;
    const currentScore = store.gameState.score || 0;

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
        store.gameState.lastBluescreenTimestamp = now;
        if (w.EspooClicker) w.EspooClicker.saveGame();
        if (typeof w.triggerBluescreen === 'function') w.triggerBluescreen(dynamicMultiplier);
    }
    else {
        // --- CLICK STANDARD ---
        // Usa il valore reale appena guadagnato (include bonus combo) se disponibile,
        // altrimenti ricalcola.
        let val = (typeof w._lastClickValue !== 'undefined' && w._lastClickValue !== null)
            ? w._lastClickValue
            : (typeof w.calculateClickValue === 'function')
                ? w.calculateClickValue()
                : store.gameState.baseClickValue;

        feedback.textContent = `+${formatNumber(val)}`;

        const critChance = (typeof w.goldenBugChance !== 'undefined') ? w.goldenBugChance : 0.001;
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
    // PERF: getBoundingClientRect forza un reflow sincrono; a raffica (con decine di +N
    // animati e append/remove continui) è una delle "task lunghe" che bucano il frame.
    // Lo cachiamo ~500ms: il container non si sposta mentre clicchi.
    const _rectNow = Date.now();
    if (!feedbackContainer._rectCache || _rectNow - (feedbackContainer._rectCacheT || 0) > 500) {
        feedbackContainer._rectCache = feedbackContainer.getBoundingClientRect();
        feedbackContainer._rectCacheT = _rectNow;
    }
    const rect = feedbackContainer._rectCache;
    let startX, startY;

    if (event && event.clientX && event.clientY) {
        startX = event.clientX - rect.left;
        startY = event.clientY - rect.top;
    } else {
        const btnRect = document.getElementById('clicker-btn')!.getBoundingClientRect();
        startX = (btnRect.left + btnRect.width / 2) - rect.left;
        startY = (btnRect.top + btnRect.height / 2) - rect.top;
    }

    const randomOffsetX = (Math.random() - 0.5) * 50;
    const randomOffsetY = (Math.random() - 0.5) * 50;

    feedback.style.left = `${startX + randomOffsetX}px`;
    feedback.style.top = `${startY + randomOffsetY}px`;

    feedbackContainer.appendChild(feedback);

    // --- ANIMAZIONE GSAP ---
    if (typeof w.gsap !== 'undefined') {
        w.gsap.fromTo(feedback,
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
            feedback.style.opacity = '0';
        });
        setTimeout(() => feedback.remove(), 1000);
    }

    // Sparkle particles — usa w.FX.particleBurst (GSAP) se disponibile, altrimenti fallback CSS
    const px = startX + randomOffsetX;
    const py = startY + randomOffsetY;
    if (typeof w.FX !== 'undefined' && typeof w.gsap !== 'undefined') {
        // PERF: le particelle (6-12 elementi+tween a click) sono il costo dominante;
        // durante i clic a raffica le saltiamo quando il contenitore e' gia' carico,
        // tenendo comunque il +N. Evita l'accumulo che causava il freeze.
        // Le particelle (6-12 nodi+tween a click) sono il costo dominante: spawniamo
        // SOLO a contenitore leggero (era <=40). Sopra, teniamo il +N e saltiamo le
        // particelle — così non si arriva mai a saturare il renderer durante lo spam.
        if (feedbackContainer.childElementCount <= 14) {
            const combo = w.FX._comboCount || 0;
            const count = combo >= 20 ? 12 : combo >= 10 ? 10 : 6;
            w.FX.particleBurst(px, py, count);
        }
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
function simpleMarkdown(md: any) {
    // Parser a blocchi. Niente <br> a tappeto (prima ogni \n diventava <br>:
    // spaziatura doppia e incoerente sopra ai margini dei blocchi). Qui generiamo
    // HTML semantico e lasciamo gestire lo spazio ai margini di ogni blocco.
    const esc = (s: any) => s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    const inline = (s: any) => esc(s)
        .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#fff;">$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code style="background:rgba(255,255,255,0.08);padding:1px 6px;border-radius:4px;font-family:monospace;font-size:0.9em;">$1</code>');

    const lines = md.replace(/\r\n/g, '\n').split('\n');
    let out = '';
    let inList = false;
    const closeList = () => { if (inList) { out += '</ul>'; inList = false; } };

    for (const raw of lines) {
        const line = raw.trim();
        if (!line) { closeList(); continue; }   // riga vuota = solo separatore di blocchi

        let m;
        if (line === '---') {
            closeList();
            out += '<hr style="border:0;border-top:1px solid rgba(255,255,255,0.12);margin:14px 0;">';
        } else if ((m = line.match(/^###\s+(.+)$/))) {
            closeList();
            out += '<h3 style="margin:16px 0 8px;font-size:1.1rem;color:#2ecc71;">' + inline(m[1]) + '</h3>';
        } else if ((m = line.match(/^##\s+(.+)$/))) {
            closeList();
            out += '<h2 style="margin:20px 0 10px;font-size:1.3rem;color:#3498db;">' + inline(m[1]) + '</h2>';
        } else if ((m = line.match(/^#\s+(.+)$/))) {
            closeList();
            out += '<h1 style="margin:0 0 14px;font-size:1.6rem;color:#f1c40f;text-align:center;border-bottom:1px solid rgba(241,196,15,0.3);padding-bottom:10px;">' + inline(m[1]) + '</h1>';
        } else if ((m = line.match(/^[*\-]\s+(.+)$/))) {
            if (!inList) { out += '<ul style="margin:0 0 12px;padding-left:20px;">'; inList = true; }
            out += '<li style="margin:0 0 6px;line-height:1.55;">' + inline(m[1]) + '</li>';
        } else {
            closeList();
            out += '<p style="margin:0 0 10px;line-height:1.6;">' + inline(line) + '</p>';
        }
    }
    closeList();
    return out;
}

// --- MODALE V2 MIGRATION (Sostituisce SweetAlert2) ---
function showV2MigrationModal(onConfirm: any) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop';
    overlay.style.cssText = 'display:flex; z-index:10000; animation: fadeIn 0.3s ease-out;';
    overlay.innerHTML = `
        <div class="modal-content" style="max-width:480px; text-align:center; animation: popIn 0.3s ease-out; padding: 10px">
            <h2 style="color:#f1c40f; letter-spacing:3px; margin-bottom:15px;">${store.gameData.texts.v2.title}</h2>
            <div style="text-align:left; font-size:0.95rem; color:#bdc3c7; margin-bottom:20px;">
                ${store.gameData.texts.v2.thanks}<br><br>
                ${store.gameData.texts.v2.intro}<br><br>
                <div style="background:rgba(46,204,113,0.1); border-left:4px solid #2ecc71; padding:10px; margin-bottom:10px; border-radius:4px;">
                    <b style="color:#2ecc71;">&#10003; ${store.gameData.texts.v2.skinsSafe}</b><br>${store.gameData.texts.v2.wardrobeIntact}
                </div>
                <div style="background:rgba(155,89,182,0.1); border-left:4px solid #9b59b6; padding:10px; border-radius:4px;">
                    <b style="color:#9b59b6;">&#10003; ${store.gameData.texts.v2.veteranBonus}</b><br>${store.gameData.texts.v2.credited}
                </div>
            </div>
            <button class="buy-btn" style="padding:12px; font-size:1.1rem;" id="v2-migration-confirm">
                <i class="fa-solid fa-meteor" style="margin-right: 2px;"></i> ${store.gameData.texts.v2.discover}
            </button>
        </div>`;
    document.body.appendChild(overlay);

    document.getElementById('v2-migration-confirm')!.addEventListener('click', () => {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.2s ease';
        setTimeout(() => {
            overlay.remove();
            if (onConfirm) onConfirm();
        }, 200);
    });
}

// --- MODALE LANCIO PRODUZIONE V3 (Season 1 + Fondatore + skin-picker) ---
// Mostrato dal cascade di boot/modals quando `triggerLaunchMigrationModal` è true
// oppure quando è rimasta pendente una scelta skin Fondatore (`pendingFounderChoice`,
// es. reload a metà scelta). Se ci sono più di 5 skin non-default da salvare, rende
// un picker (max 5) e FINALIZZA la scelta al conferma; altrimenti è solo un benvenuto.
const FOUNDER_MAX_KEPT = 5;
function showLaunchMigrationModal(onConfirm: any) {
    const t = store.gameData.texts.launch || {};
    const gs: any = store.gameState;
    const isFounder = !!gs.isFounder;
    // Filtro al catalogo skin noto: gli id vengono dal save (manomettibile) e
    // finiscono in innerHTML → tenere solo skin reali rende id/nome valori fidati
    // (niente XSS) ed evita celle rotte per skin id rimossi nei vecchi salvataggi.
    const candidates: string[] = (Array.isArray(gs.founderCandidateSkins) ? gs.founderCandidateSkins : [])
        .filter((id: string) => !!id && id !== 'default' && !!store.gameData.skins[id]);
    const needsPicker = isFounder && !!gs.pendingFounderChoice && candidates.length > FOUNDER_MAX_KEPT;
    // Rete di sicurezza. `pendingFounderChoice` lo decide boot.ts contando le skin GREZZE
    // del vecchio save; qui invece si conta dopo il filtro sul catalogo. Se una skin è
    // stata rimossa dal gioco tra la 2.x e la 3.0, i due conteggi divergono: boot.ts non
    // sblocca nulla (delega al picker) e il picker non viene reso (candidati ≤ 5)
    // → il Fondatore resterebbe con la sola `founder`, perdendo tutto il resto.
    // In quel caso non c'è niente da scegliere: si assegnano d'ufficio quelle rimaste.
    const autoGrant = isFounder && !!gs.pendingFounderChoice && !needsPicker && candidates.length > 0;

    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop';
    overlay.style.cssText = 'display:flex; z-index:10000; animation: fadeIn 0.3s ease-out;';

    const founderBlock = isFounder ? `
        <div style="background:rgba(241,196,15,0.1); border-left:4px solid #f1c40f; padding:10px; margin-bottom:10px; border-radius:4px;">
            <b style="color:#f1c40f;">&#128081; ${t.founderTitle}</b><br>${t.founderSkin}
        </div>` : '';

    let choiceBlock = '';
    if (needsPicker) {
        const cells = candidates.map((id) => {
            const skin = store.gameData.skins[id] || {};
            const name = skin.name || id;
            const img = skin.img ? `assets/image/${skin.img}` : '';
            return `<button type="button" class="launch-skin-cell" data-skin="${id}" title="${name}"
                        style="position:relative; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.12); border-radius:8px; padding:6px 4px; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:4px; transition:outline 0.12s ease;">
                        <img src="${img}" alt="${name}" loading="lazy" style="width:56px; height:56px; object-fit:contain; pointer-events:none;">
                        <span style="font-size:0.68rem; color:#bdc3c7; line-height:1.1; pointer-events:none; max-width:76px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${name}</span>
                    </button>`;
        }).join('');
        choiceBlock = `
            <div style="margin-bottom:8px;">${t.pickIntro}</div>
            <div id="launch-skin-counter" style="font-weight:700; color:#2ecc71; margin-bottom:8px;">${(t.pickCounter || '{n}/5').replace('{n}', '0')}</div>
            <div id="launch-skin-grid" style="display:grid; grid-template-columns:repeat(auto-fill,minmax(84px,1fr)); gap:8px; max-height:44vh; overflow-y:auto; padding:4px; border:1px solid rgba(255,255,255,0.08); border-radius:8px;">${cells}</div>`;
    } else if (isFounder) {
        choiceBlock = `
            <div style="background:rgba(46,204,113,0.1); border-left:4px solid #2ecc71; padding:10px; border-radius:4px;">
                <b style="color:#2ecc71;">&#10003; ${t.keepAll}</b>
            </div>`;
    }

    const confirmLabel = needsPicker ? (t.confirmPick || t.confirm) : t.confirm;

    overlay.innerHTML = `
        <div class="modal-content" style="max-width:520px; text-align:center; animation:popIn 0.3s ease-out; padding:16px;">
            <h2 style="color:#f1c40f; letter-spacing:3px; margin-bottom:12px;">${t.title}</h2>
            <div style="text-align:left; font-size:0.95rem; color:#bdc3c7; margin-bottom:16px;">
                ${t.thanks}<br><br>
                ${t.intro}<br><br>
                ${founderBlock}
                ${choiceBlock}
            </div>
            <button class="buy-btn" style="padding:12px; font-size:1.1rem;" id="launch-migration-confirm">
                <i class="fa-solid fa-rocket" style="margin-right:4px;"></i> ${confirmLabel}
            </button>
        </div>`;
    document.body.appendChild(overlay);

    // Selezione picker (max 5)
    const selected = new Set<string>();
    if (needsPicker) {
        const counter = overlay.querySelector('#launch-skin-counter');
        const updateCounter = () => {
            if (counter) counter.textContent = (t.pickCounter || '{n}/5').replace('{n}', String(selected.size));
        };
        overlay.querySelectorAll('.launch-skin-cell').forEach((cell) => {
            cell.addEventListener('click', () => {
                const el = cell as HTMLElement;
                const id = el.dataset.skin!;
                if (selected.has(id)) {
                    selected.delete(id);
                    el.style.outline = 'none';
                } else {
                    if (selected.size >= FOUNDER_MAX_KEPT) return; // blocca oltre 5
                    selected.add(id);
                    el.style.outline = '3px solid #2ecc71';
                }
                updateCounter();
            });
        });
    }

    const finalize = () => {
        // Skin da sbloccare: quelle scelte nel picker, oppure tutte le superstiti quando
        // la scelta era pendente ma il picker non serviva più (vedi `autoGrant`).
        const toGrant: string[] = needsPicker ? Array.from(selected) : (autoGrant ? candidates : []);
        if (toGrant.length) {
            const unlocked: string[] = Array.isArray(gs.skins.unlocked) ? gs.skins.unlocked : ['default'];
            toGrant.forEach((id) => { if (!unlocked.includes(id)) unlocked.push(id); });
            gs.skins.unlocked = unlocked;
        }
        // In ogni caso di Fondatore chiudiamo la fase di scelta
        if (isFounder) {
            gs.pendingFounderChoice = false;
            delete gs.founderCandidateSkins;
            if (w.EspooClicker && typeof w.EspooClicker.saveGame === 'function') w.EspooClicker.saveGame();
            if (typeof w.refreshAllStores === 'function') w.refreshAllStores();
        }
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.2s ease';
        setTimeout(() => {
            overlay.remove();
            if (onConfirm) onConfirm();
        }, 200);
    };

    document.getElementById('launch-migration-confirm')!.addEventListener('click', finalize);
}

// === TOAST SYSTEM v3 — slot-based (F5 -> F8: coda/slot in EspoV3.toast) ===
const MAX_VISIBLE_TOASTS = 5;

// gate, anti-spam, coda e slot vivono in EspoV3.toast (puro, testato); qui resta
// il rendering DOM (createToastDOM) e l'exit animation. Fallback legacy rimosso.
// Lazy: questo modulo è importato da main.ts PRIMA che window.EspoV3 sia costruito.
let _toastQueueInstance: any;
function toastQueue(): any {
    return (_toastQueueInstance ??= (window as any).EspoV3.toast.createQueue({
        maxVisible: MAX_VISIBLE_TOASTS,
        render: (t: any, slot: any) => createToastDOM(t.message, t.type, t.duration, slot),
        canShow: () => !!sessionStorage.getItem('espooUser'),
    }));
}

function showToast(message: any, type: any = 'info', duration?: any) {
    return toastQueue().push(message, type, duration);
}

function createToastDOM(message: any, type: any, duration: any, slot: any) {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

    const toast: any = document.createElement('div');
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

function _dismissToast(toast: any, slot: any) {
    if (!toast || toast._dismissed) return;
    toast._dismissed = true;
    if (toast._dismissTimer) clearTimeout(toast._dismissTimer);

    toast.classList.add('toast-leaving');

    // Libera lo slot DOPO l'exit animation (~350ms)
    setTimeout(() => {
        if (toast.parentNode) toast.remove();
        toastQueue().releaseSlot(slot);
    }, 360);
}

function checkTabNotifications() {
    // F5 -> F8: i predicati di disponibilita vivono in EspoV3.rules (puri,
    // big-number via stringa); qui restano il mapping dei dati, i costi scalati
    // (formule game-logic, F6) e il DOM.
    const rules = window.EspoV3.rules;

    // Click Tab
    const clickNotify = rules.anyClickUpgradeAvailable(
        store.gameState.totalClicks,
        String(store.gameState.score),
        Object.keys(store.gameData.clickUpgrades)
            .filter(k => store.gameState.clickUpgrades[k])
            .map(k => ({
                purchased: !!store.gameState.clickUpgrades[k].purchased,
                requiredClicks: store.gameData.clickUpgrades[k].requiredClicks,
                cost: store.gameData.clickUpgrades[k].cost,
            }))
    );

    const tabClick = document.getElementById('tab-click');
    if (tabClick) clickNotify && !tabClick.classList.contains('active') ? tabClick.classList.add('notify') : tabClick.classList.remove('notify');

    // Auto Tab
    const autoNotify = rules.anyEnhancementAvailable(
        String(store.gameState.score),
        Object.keys(store.gameData.buildingEnhancements)
            .filter(k => store.gameState.buildingEnhancements[k] && store.gameData.buildingEnhancements[k]
                && store.gameState.teams[store.gameData.buildingEnhancements[k].targetTeam])
            .map(k => ({
                purchased: !!store.gameState.buildingEnhancements[k].purchased,
                requiredCount: store.gameData.buildingEnhancements[k].requiredCount,
                teamCount: store.gameState.teams[store.gameData.buildingEnhancements[k].targetTeam].count,
                cost: store.gameData.buildingEnhancements[k].cost,
            }))
    );

    const tabAuto = document.getElementById('tab-auto');
    if (tabAuto)
        autoNotify && !tabAuto.classList.contains('active') ? tabAuto.classList.add('notify') : tabAuto.classList.remove('notify');

    // Prestige Tab
    let prestigeNotify = false;
    if (store.gameState.totalResets > 0 || store.gameState.prestigePoints.gt(0)) {
        prestigeNotify = rules.anyPrestigeUpgradeAvailable(
            true, // gate gia valutato sopra
            String(store.gameState.prestigePoints),
            Object.keys(store.gameData.prestigeUpgrades).map(k => {
                const d = store.gameData.prestigeUpgrades[k];
                const st = store.gameState.prestigeUpgrades[k];
                return d.isCounted
                    ? {
                        counted: true, count: st.count, maxLevel: d.maxLevel,
                        // costo scalato = formula game-logic (F6): resta qui
                        cost: String((typeof w.calculatePrestigeUpgradeCost === 'function')
                            ? w.calculatePrestigeUpgradeCost(k) : d.baseCost),
                    }
                    : { counted: false, purchased: !!st.purchased, cost: d.baseCost };
            })
        );
    }

    let tabPrestige = document.getElementById('tab-prestige');
    if (tabPrestige)
        prestigeNotify && !tabPrestige.classList.contains('active') ? tabPrestige.classList.add('notify') : tabPrestige.classList.remove('notify');

    // --- AGGIORNAMENTO TITOLO BROWSER ---
    let title = "Espòòò Clicker";
    const canPrestige = store.gameState.totalScore.gte(w.getPrestigeThreshold());
    if (canPrestige)
        title = store.gameData.texts.ui.promotionReadyTitle + " - " + title;
    else
        title = formatNumber(store.gameState.score) + " " + store.gameData.texts.ui.bugsTitle + " - " + title;
    if (document.title !== title)
        document.title = title;
}

function updateBonusCounter() {
    const counter = document.getElementById('bonus-counter-display');
    const valueSpan = document.getElementById('combined-multiplier-value');

    // La variabile store.prestigeBonus ora contiene TUTTI i bonus permanenti (prestigio + achievement)
    if (store.prestigeBonus.gt(1.05))	// Mostra solo se il bonus è significativo
    {
        if (counter)
            counter.style.display = 'block';

        if (valueSpan) {
            // Mostra il moltiplicatore totale con 2 decimali
            valueSpan.textContent = `x${store.prestigeBonus.toFixed(2)}`;

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
let _cachedVisualBPS: any = null;
let _lastVisualBPSCalc = 0;
const VISUAL_BPS_CACHE_MS = 150; // Ricalcola max ogni 150ms

function calculateVisualBPS() {
    const now = Date.now();
    if (_cachedVisualBPS && (now - _lastVisualBPSCalc) < VISUAL_BPS_CACHE_MS) {
        return _cachedVisualBPS;
    }

    // F5 -> F8: somma pura in EspoV3.rules (big-number via stringa); cache 150ms sopra.
    _cachedVisualBPS = new w.Decimal(window.EspoV3.rules.visualBps(
        String(store.bps),
        store.clickHistory.map((c: any) => ({ time: c.time, value: String(c.value) })),
        now
    ));
    _lastVisualBPSCalc = now;
    return _cachedVisualBPS;
}

const scoreAnimState = { value: 0 };
let _scoreTween: any = null;
let _scoreFastRaf: any = null;

// Aggiornamento reattivo del solo #score-display durante il click attivo: scrive il
// valore reale (rAF-throttle, max 1 write/frame) bypassando il count-up GSAP, che
// inseguendo un bersaglio che salta ogni 100ms restava indietro (lag percepito).
// Il count-up resta per l'income passivo (BPS), quando non si clicca.
function bumpScoreDisplay() {
    if (typeof store.gameState === 'undefined' || !store.gameState.score) return;
    if (_scoreFastRaf) return;
    _scoreFastRaf = requestAnimationFrame(() => {
        _scoreFastRaf = null;
        if (_scoreTween) { _scoreTween.kill(); _scoreTween = null; }
        const n = store.gameState.score.toNumber();
        scoreAnimState.value = isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
        if (typeof setTextIfChanged === 'function') setTextIfChanged('score-display', formatNumber(store.gameState.score));
    });
}

// Oltre questa soglia i JS Number perdono la precisione intera (2^53): animare con
// GSAP un Number verso un w.Decimal enorme produce lag e valori spuri (es. il contatore
// che "si ferma"/glitcha attorno a 100,00 Sxd ≈ 1e53). Sopra la soglia scriviamo
// direttamente il w.Decimal formattato — l'animazione count-up a quelle scale non è
// comunque percepibile. Sotto, manteniamo l'animazione fluida (Number esatti).
const SCORE_ANIM_MAX = Number.MAX_SAFE_INTEGER; // ~9.007e15

function updateScoreBoard(totalBPS: any) {
    const scoreNum = store.gameState.score.toNumber(); // Infinity se oltre il range Number

    if (!isFinite(scoreNum) || scoreNum > SCORE_ANIM_MAX) {
        // Numero troppo grande per un'animazione affidabile: scrittura diretta dal w.Decimal
        if (_scoreTween) { _scoreTween.kill(); _scoreTween = null; }
        scoreAnimState.value = scoreNum; // mantiene coerente lo stato per i confronti
        setTextIfChanged('score-display', formatNumber(store.gameState.score));
    } else {
        // Se è la prima volta (o reset/promozione), allinea subito senza animazione
        if (Math.abs(scoreAnimState.value - scoreNum) > scoreNum * 0.5)
            scoreAnimState.value = scoreNum;

        // Durante il click attivo NON animiamo: il count-up inseguirebbe un bersaglio
        // che salta ogni 100ms e resterebbe indietro (lag). bumpScoreDisplay ha già
        // scritto il valore reale; qui sincronizziamo. Il count-up resta per l'income
        // passivo (BPS), quando non si clicca da un po'.
        const activeClicking = (Date.now() - (w._lastClickAt || 0)) < 250;
        if (activeClicking) {
            if (_scoreTween) { _scoreTween.kill(); _scoreTween = null; }
            scoreAnimState.value = scoreNum;
            setTextIfChanged('score-display', formatNumber(store.gameState.score));
        } else {
            // Kill tween precedente per evitare stacking
            if (_scoreTween) _scoreTween.kill();
            // GSAP anima il valore "visuale" (Number) verso il valore reale (Number)
            _scoreTween = w.gsap.to(scoreAnimState, {
                duration: 0.2,
                value: scoreNum,
                ease: "power1.out",
                onUpdate: () => {
                    setTextIfChanged('score-display', formatNumber(Math.trunc(scoreAnimState.value)));
                }
            });
        }
    }

    const scoreEl = getEl('score-display');
    if (scoreEl) {
        scoreEl.setAttribute('data-tooltip', formatFullNumber(store.gameState.score));
        scoreEl.classList.add('simple-tooltip');
        // Micro-bump visivo quando il punteggio aumenta
        if (scoreNum > scoreAnimState.value * 1.001) {
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

    if (typeof w.calculateRawClickValue === 'function') {
        const rawClick = w.calculateRawClickValue();
        setTextIfChanged('raw-click-display', `Click Power: ${formatNumber(rawClick)}`);
    }
}

function updateHUD() {
    const leftPanel = document.getElementById('header-left-panel');
    const rightPanel = document.getElementById('header-right-panel');
    const displayCareer = document.getElementById('display-career-bonus');
    const displayTokens = document.getElementById('prestige-points-display');
    const headerQbit = document.getElementById('header-qbit-container');

    const hasPrestige = store.gameState.totalResets > 0 || store.gameState.prestigePoints.gt(0) || store.gameState.lifetimePrestigePoints.gt(0);
    const hasQuantum = store.gameState.totalFormattazioni > 0 || store.gameState.qBits.gt(0);

    // Mostra i pannelli se hai fatto almeno un Prestigio O una Formattazione
    if (hasPrestige || hasQuantum) {
        if (leftPanel) leftPanel.classList.remove("header_stat_box_display_none");
        if (rightPanel) rightPanel.classList.remove("header_stat_box_display_none");

        if (displayCareer) setTextIfChanged('display-career-bonus', `x${formatNumber(store.prestigeBonus)}`);
        if (displayTokens) setTextIfChanged('prestige-points-display', formatNumber(store.gameState.prestigePoints));

        // Gestione visibilità div specifico dei Q-Bits
        if (headerQbit) headerQbit.style.display = hasQuantum ? 'flex' : 'none';
    }
    else {
        if (leftPanel) leftPanel.classList.add("header_stat_box_display_none");
        if (rightPanel) rightPanel.classList.add("header_stat_box_display_none");
    }
}

function updateWallets() {
    setTextIfChanged('lab-wallet-amount', formatNumber(store.gameState.prestigePoints));
    setTextIfChanged('bug-wallet-amount', formatNumber(store.gameState.score.floor()));

    // Aggiorna Q-Bits anche nell'header in alto
    setTextIfChanged('qbit-wallet-amount', formatNumber(store.gameState.qBits));
    setTextIfChanged('header-qbit-display', formatNumber(store.gameState.qBits));

    // Aggiorna i wallet bug replicati (elementi .bug-wallet-amount sparsi nella UI)
    document.querySelectorAll('.bug-wallet-amount').forEach(el => {
        if (el.textContent !== formatNumber(store.gameState.score)) el.textContent = formatNumber(store.gameState.score);
    });

    // Hub Prestigio: aggiorna le card solo quando il modal è aperto
    const hubModal = document.getElementById('prestige-hub-modal');
    if (hubModal && hubModal.style.display === 'flex' && typeof renderPrestigeHubCards === 'function') {
        renderPrestigeHubCards();
    }
}

// --- HUB PRESTIGIO (Promozione + Formattazione) ---
// Aggiorna le card dell'hub: chiamata all'apertura (openPrestigeHub) e dal
// loop UI via updateWallets SOLO a modal aperto. Non ricostruisce il DOM:
// testi/classi aggiornati solo se cambiati (stesso pattern di setTextIfChanged).
function renderPrestigeHubCards() {
    const promoCard = document.getElementById('hub-card-promo');
    const formatCard = document.getElementById('hub-card-format');
    if (!promoCard || !formatCard) return;

    const currentScore = store.gameState.totalScore || new w.Decimal(0);
    const threshold = w.getPrestigeThreshold();
    const resets = store.gameState.totalResets || 0;

    // ---- CARD PROMOZIONE ----
    const gained = w.calculatePrestigeGained();
    const canPrestige = currentScore.gte(threshold) && gained.gte(1);

    setCardState(promoCard, canPrestige ? 'is-ready' : 'is-locked');

    if (canPrestige) {
        const dupOn = !!(store.gameState.superUpgrades && store.gameState.superUpgrades.tokenDuplicator && store.gameState.superUpgrades.tokenDuplicator.purchased);
        const finalGained = window.EspoV3.prestige.applyTokenDuplicator(gained, dupOn);
        setTextIfChanged('contract-gain-token', `+${formatNumber(finalGained)}`);

        // Anteprima nuovo moltiplicatore (stessi calcoli del vecchio openPrestigeContract)
        const estimatedLifetime = (store.gameState.lifetimePrestigePoints || new w.Decimal(0)).add(finalGained);
        const baseBonus = estimatedLifetime.mul(0.01);
        const synergyCount = store.gameState.prestigeUpgrades.sinergia ? store.gameState.prestigeUpgrades.sinergia.count : 0;
        const synergyPerLevel = store.gameData.prestigeUpgrades.sinergia.bonusPerLevel || new w.Decimal(0.001);
        const synergyBonus = new w.Decimal(synergyCount).mul(synergyPerLevel).mul(estimatedLifetime);
        const rawMultiplier = baseBonus.add(synergyBonus).add(store.achievementsBPSBonus);
        const totalMultiplier = new w.Decimal(1).add(w.applyBonusSoftcap(rawMultiplier));

        const bonusEl = document.getElementById('contract-gain-bonus');
        const bonusHtml = `${store.gameData.texts.ui.newMultiplier} <span>x${formatNumber(totalMultiplier)}</span>`;
        if (bonusEl && bonusEl.innerHTML !== bonusHtml) bonusEl.innerHTML = bonusHtml;
    } else {
        let progress = 0;
        if (currentScore.gt(0)) progress = currentScore.div(threshold).mul(100).toNumber();
        const pct = `${Math.min(progress, 99).toFixed(0)}%`;
        const fill = document.getElementById('hub-promo-progress-fill');
        if (fill && fill.style.width !== pct) fill.style.width = pct;
        setTextIfChanged('hub-promo-progress-label', pct);
    }

    const btnPromo = document.getElementById('btn-confirm-prestige') as HTMLButtonElement | null;
    if (btnPromo && btnPromo.disabled === canPrestige) btnPromo.disabled = !canPrestige;

    // ---- CARD FORMATTAZIONE ----
    // resets >= 20 implica Quantum sbloccato (è uno dei rami OR della regola).
    const isQ = window.EspoV3.rules.isQuantumUnlocked({
        totalResets: resets,
        totalFormattazioni: store.gameState.totalFormattazioni || 0,
        qBits: String(store.gameState.qBits || 0),
    });
    const canFormat = resets >= 20;

    setCardState(formatCard, canFormat ? 'is-ready' : (isQ ? 'is-locked' : 'is-mystery'));

    if (canFormat) {
        // Formula INVARIATA (era in updateWallets/openFormatHandler):
        // qbit = 1 + floor(sqrt(prestigePoints / 10000))
        const tokenDiv = (store.gameState.prestigePoints || new w.Decimal(0)).div(10000);
        const bonusQbits = tokenDiv.gte(1) ? tokenDiv.sqrt().floor() : new w.Decimal(0);
        const qBitsEarned = new w.Decimal(1).add(bonusQbits);
        setTextIfChanged('format-gain-qbit', `+${formatNumber(qBitsEarned)}`);
    } else {
        const counterText = `${Math.min(resets, 20)}/20`;
        document.querySelectorAll('.hub-format-counter-value').forEach(el => {
            if (el.textContent !== counterText) el.textContent = counterText;
        });
    }

    const btnFormat = document.getElementById('btn-confirm-format') as HTMLButtonElement | null;
    if (btnFormat && btnFormat.disabled === canFormat) btnFormat.disabled = !canFormat;
}

// Applica UNA classe di stato alla card togliendo le altre (niente churn nel loop UI)
function setCardState(card: any, state: any) {
    if (card.classList.contains(state)) return;
    card.classList.remove('is-ready', 'is-locked', 'is-mystery');
    card.classList.add(state);
}

// Cache per updateStoreButtons: evita di settare disabled su ogni frame
const _btnDisabledCache: any = {};

function updateStoreButtons() {
    // Teams
    for (const key in store.gameState.teams) {
        if (!store.gameData.teams[key]) continue;
        let amountToBuy = w.buyMultiplier;
        let isMax = false;
        if (amountToBuy === 'MAX') {
            const max = w.calculateMaxAffordable(key);
            amountToBuy = max > 0 ? max : 1;
            isMax = true;
        }
        const currentCost = w.calculateBulkCost(key, amountToBuy);
        const btnId = `buy-${key}`;
        const shouldDisable = store.gameState.score.lt(currentCost);

        // Solo se lo stato disabled è cambiato
        if (_btnDisabledCache[btnId] !== shouldDisable) {
            const btn = getEl(btnId);
            if (btn) btn.disabled = shouldDisable;
            _btnDisabledCache[btnId] = shouldDisable;
        }

        const costEl = getEl(`cost-${key}`);
        if (costEl) {
            let prefix = isMax && amountToBuy > 1 ? `${store.gameData.texts.ui.cost} (+${formatNumber(amountToBuy)})` :
                (!isMax && amountToBuy > 1) ? `${store.gameData.texts.ui.cost} (${amountToBuy}x)` : store.gameData.texts.ui.cost;
            const costText = `${prefix}: ${formatNumber(currentCost)}`;
            if (costEl.textContent !== costText) costEl.textContent = costText;
        }
    }

    // Click Upgrades
    for (const key in store.gameState.clickUpgrades) {
        if (!store.gameData.clickUpgrades[key]) continue;
        if (!store.gameState.clickUpgrades[key].purchased) {
            const btnId = `buy-${key}`;
            const shouldDisable = store.gameState.score.lt(store.gameData.clickUpgrades[key].cost);
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
    for (const key in store.gameState.buildingEnhancements) {
        if (!store.gameData.buildingEnhancements[key]) continue;
        if (!store.gameState.buildingEnhancements[key].purchased) {
            const btnId = `buy-${key}`;
            const shouldDisable = store.gameState.score.lt(store.gameData.buildingEnhancements[key].cost);
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
    for (const key in store.gameState.prestigeUpgrades) {
        const data = store.gameData.prestigeUpgrades[key];
        const state = store.gameState.prestigeUpgrades[key];
        if (!data) continue;
        if (data.isCounted && data.maxLevel && state.count >= data.maxLevel) continue;
        if (!data.isCounted && state.purchased) continue;

        const btnId = `buy-${key}`;
        const shouldDisable = store.gameState.prestigePoints.lt(data.isCounted ? w.calculatePrestigeUpgradeCost(key) : data.baseCost);
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

    if (document.body.classList.contains('rick-rolling') || store.isBluescreenActive) {
        btnCrunch.style.display = 'none';
        return;
    }

    if (store.gameState.prestigeUpgrades.crunchTime && store.gameState.prestigeUpgrades.crunchTime.purchased) {
        if (btnCrunch.style.display === 'none') btnCrunch.style.display = 'block';

        const timerDiv = btnCrunch.querySelector('.skill-timer');
        const now = Date.now();

        if (now < store.crunchTimeEndTime) {
            // ATTIVO
            const timeLeft = Math.ceil((store.crunchTimeEndTime - now) / 1000);
            if (btnCrunch.className !== 'skill-btn active') btnCrunch.className = 'skill-btn active';
            btnCrunch.childNodes[0].textContent = store.gameData.texts.ui.furyActive;
            if (timerDiv) timerDiv.textContent = `${timeLeft}s`;
        } else if (now < store.crunchTimeCooldownEnd) {
            // COOLDOWN
            const timeLeft = Math.ceil((store.crunchTimeCooldownEnd - now) / 1000);
            if (btnCrunch.className !== 'skill-btn cooldown') btnCrunch.className = 'skill-btn cooldown';
            btnCrunch.childNodes[0].textContent = store.gameData.texts.ui.furyCooldown;
            const m = Math.floor(timeLeft / 60);
            const s = timeLeft % 60;
            if (timerDiv) timerDiv.textContent = `${m}:${s < 10 ? '0' + s : s}`;
        } else {
            // PRONTO
            if (btnCrunch.className !== 'skill-btn') btnCrunch.className = 'skill-btn';
            btnCrunch.childNodes[0].textContent = store.gameData.texts.ui.furyReady;
            if (timerDiv) timerDiv.textContent = store.gameData.texts.ui.clickMe;
        }
    } else {
        if (btnCrunch.style.display !== 'none') btnCrunch.style.display = 'none';
    }
}

function updateTabsVisibility() {
    const tabPrestige = getEl('tab-prestige');
    if (tabPrestige) {
        const _pp = store.gameState.prestigePoints || new w.Decimal(0);
        const _lpp = store.gameState.lifetimePrestigePoints || new w.Decimal(0);
        // F5 -> F8: predicato in EspoV3.rules
        if (window.EspoV3.rules.isPrestigeTabVisible({
            totalResets: store.gameState.totalResets,
            prestigePoints: String(_pp),
            lifetimePrestigePoints: String(_lpp),
            totalFormattazioni: store.gameState.totalFormattazioni || 0,
        })) tabPrestige.classList.remove("tab_promozione");
    }

    const tabQuantum = getEl('tab-quantum');
    const headerQbit = getEl('header-qbit-container');

    // Appare se hai fatto 20 reset, o se hai già formattato, o se hai Q-bits
    const isQuantumUnlocked = window.EspoV3.rules.isQuantumUnlocked({
        totalResets: store.gameState.totalResets,
        totalFormattazioni: store.gameState.totalFormattazioni,
        qBits: String(store.gameState.qBits),
    });

    if (tabQuantum) {
        tabQuantum.style.display = isQuantumUnlocked ? 'flex' : 'none';
    }
    if (headerQbit) {
        headerQbit.style.display = isQuantumUnlocked ? 'flex' : 'none';
    }
}

// Swap REALE dell'icona del bottone prestigio: al boot Lucide sostituisce
// l'<i data-lucide="zap"> con un <svg>, e su SVGElement `className` è un
// accessor di sola lettura → assegnargli una stringa è un no-op silenzioso
// (l'icona non cambiava mai). Rimpiazziamo il nodo con un <i> Font Awesome
// fresco; la classe .nav-icon resta così i querySelector successivi funzionano.
// Idempotente: se il nodo è già l'<i> target non tocca il DOM (stessa identità
// di nodo tra i tick) → chiamabile incondizionatamente nel loop a 10fps.
function swapPrestigeIcon(oldIcon: any, className: any) {
    if (oldIcon.tagName === 'I' && oldIcon.className === className) return oldIcon;
    const fresh = document.createElement('i');
    fresh.className = className;
    oldIcon.replaceWith(fresh);
    return fresh;
}

// Toast one-shot quando promo/format DIVENTANO pronte (fronte di salita in
// sessione). Baseline al primo tick + finestra di grazia: il sync cloud può
// alzare score/resets nei primi secondi dopo il boot e non deve annunciare.
let _hubReadyPrev: { promo: boolean; format: boolean } | null = null;
let _hubToastArmedAt = 0;

function updatePrestigeVisuals() {
    const prestigeBtn = document.getElementById('open-prestige-hub-btn');
    if (!prestigeBtn) return;

    // Recupera i valori in modo sicuro (gestisce null/undefined)
    const currentScore = store.gameState.totalScore || new w.Decimal(0);
    const threshold = w.getPrestigeThreshold();
    const resets = store.gameState.totalResets || 0;
    const prestigePoints = store.gameState.prestigePoints || new w.Decimal(0);
    const lifetimePoints = store.gameState.lifetimePrestigePoints || new w.Decimal(0);

    const canPrestige = currentScore.gte(threshold);
    const hasFormatted = (store.gameState.totalFormattazioni || 0) > 0;

    // Mostra il bottone SE:
    // 1. Puoi fare prestigio ORA (canPrestige)
    // 2. OPPURE hai già fatto prestigio in passato (resets > 0)
    // 3. OPPURE hai dei token da spendere (prestigePoints > 0)
    // 4. OPPURE hai già formattato: la formattazione azzera resets/prestigePoints,
    //    ma chi ha formattato ha ovviamente sbloccato la promozione → resta visibile.
    const shouldShow = canPrestige || resets > 0 || prestigePoints.gt(0) || lifetimePoints.gt(0) || hasFormatted;

    if (!shouldShow) {
        if (prestigeBtn.style.display !== 'none') prestigeBtn.style.display = 'none';
        return;
    }

    // Se deve essere mostrato, forza il flex
    if (prestigeBtn.style.display !== 'flex') prestigeBtn.style.display = 'flex';

    let icon: any = prestigeBtn.querySelector('.nav-icon');
    let label: any = prestigeBtn.querySelector('span');

    // Ricrea contenuto interno se manca (sicurezza)
    if (!icon || !label) {
        prestigeBtn.innerHTML = '<i class="nav-icon"></i> <span></span>';
        icon = prestigeBtn.querySelector('.nav-icon');
        label = prestigeBtn.querySelector('span');
        // DOM ricostruito: invalida il guard di stato così icona/label vengono
        // riapplicate al prossimo blocco (altrimenti resterebbe l'<i> vuoto).
        delete prestigeBtn.dataset.hubState;
    }

    // Con l'hub a 2 meccaniche, promo e format possono essere pronte INSIEME
    // (resets >= 20 + score >= soglia). Niente più priorità "format vince":
    // il bottone sfuma tra i colori delle card in base allo stato.
    //   'both'     → promo E format pronte → sfumato oro→viola (.hub-both-ready)
    //   'format'   → solo format           → viola (.format-ready)
    //   'promo'    → solo promo            → oro   (.promotion-ready)
    //   'progress' → nessuna azionabile    → grigio spento + % (apre comunque l'hub)
    // resets >= 20 implica Quantum sbloccato (ramo OR della regola).
    const canFormat = resets >= 20;

    // Preload del video Big Bang appena la formattazione è raggiungibile.
    // L'mp4 (~11 MB) è faststart (remux 2026-07): il 1° frame parte subito,
    // ma scaricarlo in background da quando resets≥20 (end-game, raro) evita
    // comunque il buffering al click "MADE IN HEAVEN" su reti lente.
    // Guard: una sola volta per sessione.
    if (canFormat && !w._bigbangPreloaded) {
        const bb = document.getElementById('video-bigbang') as HTMLVideoElement | null;
        if (bb) {
            if (!bb.getAttribute('src')) {
                const local = bb.getAttribute('data-src-local');
                const direct = bb.getAttribute('data-src');
                const sync = (w.CDN && w.CDN.urlSync) ? w.CDN.urlSync(local) : null;
                const resolved = direct || sync || local || '';
                if (resolved) bb.setAttribute('src', resolved);
            }
            bb.preload = 'auto';
            try { if (typeof bb.load === 'function') bb.load(); } catch { /* buffering best-effort */ }
            w._bigbangPreloaded = true;
        }
    }

    const hubState = (canFormat && canPrestige) ? 'both'
        : canFormat ? 'format'
        : canPrestige ? 'promo'
        : 'progress';

    // Annuncio via toast SOLO sui fronti di salita della prontezza (non sul
    // cambio di stato render: both→format dopo una promozione non deve
    // ri-annunciare la formattazione, era già pronta).
    if (_hubReadyPrev === null) {
        _hubReadyPrev = { promo: canPrestige, format: canFormat };
        _hubToastArmedAt = Date.now() + 8000;
    } else if (canPrestige !== _hubReadyPrev.promo || canFormat !== _hubReadyPrev.format) {
        const promoEdge = canPrestige && !_hubReadyPrev.promo;
        const formatEdge = canFormat && !_hubReadyPrev.format;
        _hubReadyPrev = { promo: canPrestige, format: canFormat };
        if ((promoEdge || formatEdge) && Date.now() >= _hubToastArmedAt) {
            const t = store.gameData.texts.toasts;
            const msg = (hubState === 'both') ? t.hubBothReady
                : formatEdge ? t.hubFormatReady
                : t.hubPromoReady;
            showToast(msg, 'success', 5000);
        }
    }

    // Icona/label/classi cambiano SOLO al cambio di stato → zero churn nel loop.
    // Guard via dataset: a cold boot dataset.hubState è undefined ≠ ogni stato,
    // quindi la prima entrata applica sempre icona/classi (niente zap residua).
    if (prestigeBtn.dataset.hubState !== hubState) {
        prestigeBtn.dataset.hubState = hubState;
        prestigeBtn.classList.toggle('promotion-ready', hubState === 'promo');
        prestigeBtn.classList.toggle('format-ready', hubState === 'format');
        prestigeBtn.classList.toggle('hub-both-ready', hubState === 'both');
        prestigeBtn.style.cursor = 'pointer';

        if (hubState === 'both') {
            icon = swapPrestigeIcon(icon, 'nav-icon fa-solid fa-bolt');
            label.textContent = store.gameData.texts.ui.hubBothReady;
            prestigeBtn.title = store.gameData.texts.ui.hubTitleBoth;
        } else if (hubState === 'format') {
            icon = swapPrestigeIcon(icon, 'nav-icon fa-solid fa-meteor');
            label.textContent = store.gameData.texts.ui.formatReady;
            prestigeBtn.title = store.gameData.texts.ui.hubTitleFormat;
        } else if (hubState === 'promo') {
            icon = swapPrestigeIcon(icon, 'nav-icon fa-solid fa-circle-check');
            label.textContent = store.gameData.texts.ui.promoReady;
            prestigeBtn.title = store.gameData.texts.ui.hubTitlePromo;
        } else {
            icon = swapPrestigeIcon(icon, 'nav-icon fa-solid fa-rocket');
            // title di 'progress' impostato sotto, cambia col tick (percentuale)
        }
    }

    // La percentuale va rinfrescata a ogni tick finché siamo in 'progress'.
    if (hubState === 'progress') {
        let progress = 0;
        if (currentScore.gt(0)) {
            progress = currentScore.div(threshold).mul(100).toNumber();
        }
        // Cap a 99% perché a 100% scatta canPrestige (→ stato 'promo').
        const pct = Math.min(progress, 99).toFixed(0);
        const newText = `${pct}%`;
        if (label.textContent !== newText) label.textContent = newText;

        const newTitle = store.gameData.texts.ui.hubTitleProgress
            .replace('{percent}', pct)
            .replace('{resets}', String(resets));
        if (prestigeBtn.title !== newTitle) prestigeBtn.title = newTitle;
    }
}


function updatePrestigeUI() {
    updatePrestigeVisuals();
}


function setEmptyMessage(el: any, mode: any) {
    if (mode === 'available') el.textContent = store.gameData.texts.ui.noItemsBuy;
    else if (mode === 'locked') el.textContent = store.gameData.texts.ui.noItemsLock;
    else if (mode === 'purchased') el.textContent = store.gameData.texts.ui.noItemsPurchased;
    else el.textContent = store.gameData.texts.ui.nothingToShow;
}

// --- HELPERS PER SKIN ---
function equipSkin(skinId: any) {
    if (!store.gameState.skins.unlocked.includes(skinId)) return;

    if (skinId === 'christmas' && typeof w.isChristmasSeason === 'function' && w.isChristmasSeason()) {
        triggerChristmasOverlay();
    }

    store.gameState.skins.current = skinId;

    // Applica grafica e suoni loop (questo funziona sempre, anche fuori stagione)
    applySkinVisuals(skinId, true);

    if (typeof w.playSound === 'function') w.playSound('sound-click');
    if (w.EspooClicker) w.EspooClicker.saveGame();

    // Aggiorna solo lo stato equipaggiato senza ricostruire l'intera UI (evita il flash)
    _refreshEquippedState(skinId);
}

// Aggiorna stato equipped + sfondo dinamico body (rarità skin attiva)
function _refreshEquippedState(newSkinId: any) {
    // Set body data-attribute per CSS in-game tinted background
    if (store.gameData?.skins?.[newSkinId]?.rarity) {
        document.body.setAttribute('data-current-skin-rarity', store.gameData.skins[newSkinId].rarity);
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
    if (typeof w.AudioManager !== 'undefined') {
        w.AudioManager.play('sound-merry', 'sfx');
    }
    setTimeout(() => {
        if (overlay) overlay.classList.remove("christmas_overlay_flex");
    }, 4000);
}

let christmasAudioInitialized = false;

// --- GESTORE UNIFICATO EFFETTI VISIVI (VFX) ---
const VFXManager: any = {
    intervals: {},
    frames: {},
    _revealed: false,       // gioco visibile (post login + intro)?
    _pendingVfx: null,      // VFX ambientale skin in attesa del reveal

    stopAll() {
        // Ferma i loop
        for (let key in this.intervals) clearInterval(this.intervals[key]);
        for (let key in this.frames) cancelAnimationFrame(this.frames[key]);
        this.intervals = {};
        this.frames = {};

        // Azzera anche la coda VFX pre-reveal: applySkinVisuals chiama stopAll()
        // e poi start() solo se la skin ha un vfx. Senza questo, una skin con neve
        // in coda resterebbe pendente anche dopo lo switch a una skin senza vfx.
        this._pendingVfx = null;

        // Pulisce il DOM
        const snow = document.getElementById('snow-container');
        if (snow) { snow.innerHTML = ''; snow.classList.remove("snow_container_block"); }

        const fire = document.getElementById('fire-particles-container');
        if (fire) { fire.innerHTML = ''; fire.style.display = 'none'; }

        const matrix = document.getElementById('matrix-canvas') as HTMLCanvasElement | null;
        if (matrix) {
            const ctx = matrix.getContext('2d')!;
            ctx.clearRect(0, 0, matrix.width, matrix.height);
        }
    },

    start(effectType: any) {
        // Non stoppiamo tutto se stiamo per attivare qualcosa,
        // lo farà applySkinVisuals per gestire layer combinati.

        // Gating: i VFX ambientali della skin (neve/fuoco/matrix) NON devono
        // comparire sulla schermata di login né durante l'intro cinematica.
        // Finché il gioco non è rivelato (releaseAmbientVfx, a fine intro/login)
        // mettiamo in coda l'ultimo VFX richiesto e lo avviamo a reveal avvenuto.
        if (!this._revealed) {
            this._pendingVfx = effectType;
            return;
        }

        if (effectType === 'snow') this.spawnSnow();
        if (effectType === 'fire') this.spawnFire();
        if (effectType === 'matrix') this.spawnMatrix();
    },

    // Chiamata a fine login/intro: sblocca i VFX ambientali e avvia quello in coda.
    releaseAmbientVfx() {
        this._revealed = true;
        if (this._pendingVfx) {
            const fx = this._pendingVfx;
            this._pendingVfx = null;
            this.start(fx);
        }
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
            flake.style.opacity = (Math.random() * 0.7 + 0.3) as any;
            container.appendChild(flake);
        }
    },

    spawnFire() {
        const container = document.getElementById('fire-particles-container');
        if (!container) return;
        container.style.display = 'block';

        if (this.intervals.fire) clearInterval(this.intervals.fire);

        // La funzione w.spawnFireParticle è quella esistente in game-logic.js
        this.intervals.fire = setInterval(() => {
            if (typeof w.spawnFireParticle === 'function') w.spawnFireParticle(container);
        }, 100);
    },

    spawnMatrix() {
        // La logica esistente di startMatrixEffect in ui-functions.js
        if (typeof startMatrixEffect === 'function') startMatrixEffect();
    }
};

// Reveal del gioco (post login + intro): sblocca i VFX ambientali della skin
// messi in coda durante login/intro. Esposto su window per modals.js.
w.releaseAmbientVfx = function () {
    if (typeof VFXManager !== 'undefined') VFXManager.releaseAmbientVfx();
};

function applySkinVisuals(skinId: any, forcePlayMusic = false) {
    if (!(applySkinVisuals as any)._token) (applySkinVisuals as any)._token = 0;
    const data = store.gameData.skins[skinId];
    const skinData = data || store.gameData.skins['default'];
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
    // Pulisce SOLO le CSS custom properties (--*) lasciate dai temi, non tutti
    // gli inline style del body: `body.style = ''` azzerava anche stili impostati
    // da altri sistemi (es. effetti transitori), non solo le var del tema.
    for (let i = document.body.style.length - 1; i >= 0; i--) {
        const prop = document.body.style[i];
        if (prop!.startsWith('--')) document.body.style.removeProperty(prop!);
    }
    VFXManager.stopAll();

    // 3. APPLICAZIONE VARIABILI CSS CUSTOM (Per varianti di colore leggere)
    if (theme.cssVars) {
        for (const [property, value] of Object.entries(theme.cssVars)) {
            document.body.style.setProperty(property, value as string);
        }
    }

    // 2+4. LAZY LOAD CSS ESTERNI + CLASSE BODY
    // La classe body si applica solo a CSS caricato (link.onload): al primo
    // equip evita il flash di tema rotto (FOUC). Il token scarta i callback
    // di un equip ormai superato da uno più recente.
    const applyToken = ++(applySkinVisuals as any)._token;
    if (theme.bodyClass) {
        if (theme.cssFile) {
            loadThemeCSS(theme.cssFile, () => {
                if (applyToken !== (applySkinVisuals as any)._token) return;
                document.body.classList.add(theme.bodyClass);
            });
        } else {
            document.body.classList.add(theme.bodyClass);
        }
    } else if (theme.cssFile) {
        loadThemeCSS(theme.cssFile);
    }

    // 5. APPLICAZIONE EFFETTI VISIVI (Neve, Fuoco, ecc.)
    if (theme.vfx) {
        VFXManager.start(theme.vfx);
    }

    // (Gestione Golden Bug e Audio invariata...)
    const goldenBugIcon = document.querySelector('#golden-bug i') as HTMLElement | null;
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

    if (typeof w.AudioManager !== 'undefined' && w.AudioManager.updateAmbience)
        w.AudioManager.updateAmbience();

    // Applica le immagini centrali
    const applyClasses = (element: any, imgSrc: any) => {
        if (!element) return;
        element.src = `assets/image/${imgSrc}`;
        Array.from(element.classList).forEach((cls: any) => {
            if (cls.startsWith('bg-')) element.classList.remove(cls);
        });
        element.classList.add(`bg-${skinData.rarity || 'common'}`);
    };

    applyClasses(photoNormal, skinData.img);
    applyClasses(photoClicked, skinData.imgClick);

    // Esposion: attiva/disattiva la skin dinamica (effetti combo->esplosione).
    if (typeof w.EsposionFX !== 'undefined') {
        if (skinId === 'esposion') w.EsposionFX.start(); else w.EsposionFX.stop();
    }
}



function checkOverlayNotifications() {
    // Controlla se ci sono obiettivi sbloccati MA non riscattati (che hanno un premio)
    // F5 -> F8: predicato in EspoV3.rules
    const hasClaimable = window.EspoV3.rules.anyClaimableAchievement(
        Object.keys(store.gameData.achievements)
            .filter(k => store.gameState.achievements[k])
            .map(k => ({
                unlocked: !!store.gameState.achievements[k].unlocked,
                claimed: !!store.gameState.achievements[k].claimed,
                hasReward: !!store.gameData.achievements[k].reward,
            }))
    );

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
    const threshold = w.getPrestigeThreshold();

    // 2. Calcola il progresso basandosi sulla soglia
    const progress = store.gameState.totalScore.div(threshold).mul(100).min(100).toNumber();

    // Recupera ENTRAMBI i valori
    const rawClick = (typeof w.calculateRawClickValue === 'function') ? w.calculateRawClickValue() : store.gameState.baseClickValue;
    const totalClick = (typeof w.calculateClickValue === 'function') ? w.calculateClickValue() : rawClick;

    // Dati Offline
    const totalOffline = store.gameState.totalOfflineScore || 0;

    // Calcolo Efficienza Offline
    let offlineEff = 0.30;
    if (store.gameState.prestigeUpgrades && store.gameState.prestigeUpgrades.serverAlwaysOn)
        offlineEff += (store.gameState.prestigeUpgrades.serverAlwaysOn.count * 0.10);

    if (offlineEff > 1.0)
        offlineEff = 1.0;

    const offlinePercentText = (offlineEff * 100).toFixed(0) + "%";

    // DATI NG+ (End-Game)
    const totalFormats = store.gameState.totalFormattazioni || 0;
    const totalQBits = store.gameState.lifetimeQBits || new w.Decimal(0);

    // --- STRUTTURA (costruita UNA SOLA VOLTA) ---
    // Prima si riscriveva tutto l'innerHTML a ogni tick (10x/s): i nodi venivano
    // distrutti e ricreati, resettando hover e tooltip a meta'. Ora la struttura
    // si genera una volta e a ogni tick aggiorniamo SOLO i valori in place.
    if (!document.getElementById('st-score')) {
        statsList.innerHTML = `
        <div class="stats-container">

            <!-- HERO: Progresso Promozione -->
            <div class="stats-section stats-hero">
                <div class="stat-progress-wrapper" style="margin-top: 0; padding-top: 0; border-top: none;">
                    <div class="stat-progress-info">
                        <span>
                            <i class="fa-solid fa-rocket" style="color: #2ecc71; margin-right: 6px;"></i>
                            ${store.gameData.texts.stats.promoProgress}
                            <span style="font-size: 0.75rem; color: #95a5a6; font-weight: normal; margin-left: 5px;">
                                (${store.gameData.texts.stats.goal} <span id="st-threshold" class="simple-tooltip" data-tooltip=""></span>)
                            </span>
                        </span>
                        <span id="st-progress-pct" style="font-size: 1.1rem; font-weight: 800;"></span>
                    </div>
                    <div class="stat-progress-bg">
                        <div id="st-progress-fill" class="stat-progress-fill" style="width: 0%;"></div>
                    </div>
                </div>
            </div>

            <!-- Economia -->
            <div class="stats-section">
                <div class="stats-header"><i class="fa-solid fa-wallet" style="color: #2ecc71; margin-right: 8px;"></i> ${store.gameData.texts.stats.economy}</div>
                <div class="stats-grid">
                    <div class="stat-box">
                        <span class="stat-label"><i class="fa-solid fa-bug" style="color: #2ecc71; margin-right: 4px; font-size: 0.65rem;"></i> ${store.gameData.texts.stats.bugsNow}</span>
                        <span id="st-score" class="stat-value simple-tooltip" style="color: #2ecc71;" data-tooltip=""></span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label"><i class="fa-solid fa-arrow-trend-up" style="color: #3498db; margin-right: 4px; font-size: 0.65rem;"></i> ${store.gameData.texts.stats.runTotal}</span>
                        <span id="st-total" class="stat-value simple-tooltip" style="color: #3498db;" data-tooltip=""></span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label"><i class="fa-solid fa-crown" style="color: #f1c40f; margin-right: 4px; font-size: 0.65rem;"></i> ${store.gameData.texts.stats.careerTotal}</span>
                        <span id="st-lifetime" class="stat-value simple-tooltip" style="color: #f1c40f;" data-tooltip=""></span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label"><i class="fa-solid fa-moon" style="color: #9b59b6; margin-right: 4px; font-size: 0.65rem;"></i> ${store.gameData.texts.stats.offline}</span>
                        <span id="st-offline" class="stat-value simple-tooltip" style="color: #9b59b6;" data-tooltip="">
                            <span id="st-offline-val"></span>
                            <span id="st-offline-pct" style="font-size: 0.75rem; color: #7f8c8d; font-weight: normal;"></span>
                        </span>
                    </div>
                </div>
            </div>

            <!-- Performance -->
            <div class="stats-section">
                <div class="stats-header"><i class="fa-solid fa-microchip" style="color: #3498db; margin-right: 8px;"></i> ${store.gameData.texts.stats.performance}</div>
                <div class="stats-grid">
                    <div class="stat-box">
                        <span class="stat-label"><i class="fa-solid fa-gauge-high" style="color: #e67e22; margin-right: 4px; font-size: 0.65rem;"></i> BPS</span>
                        <span id="st-bps" class="stat-value simple-tooltip" style="color: #e67e22;" data-tooltip=""></span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label"><i class="fa-solid fa-hand-pointer" style="color: #e74c3c; margin-right: 4px; font-size: 0.65rem;"></i> Click</span>
                        <span class="stat-value" style="color: #e74c3c;">
                            <span id="st-click"></span>
                            <span id="st-click-mult" style="font-size: 0.75rem; color: #7f8c8d; font-weight: normal;"></span>
                        </span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label"><i class="fa-solid fa-bolt" style="color: #f1c40f; margin-right: 4px; font-size: 0.65rem;"></i> ${store.gameData.texts.stats.multiplier}</span>
                        <span id="st-mult" class="stat-value" style="color: #f1c40f;"></span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label"><i class="fa-solid fa-dice" style="color: #1abc9c; margin-right: 4px; font-size: 0.65rem;"></i> Crit Chance</span>
                        <span id="st-crit" class="stat-value" style="color: #1abc9c;"></span>
                    </div>
                </div>
            </div>

            <!-- Multiverso (NG+) -->
            <div id="st-multiverse" class="stats-section" style="border-color: rgba(155, 89, 182, 0.3); display: none;">
                <div class="stats-header" style="color: #9b59b6;"><i class="fa-solid fa-meteor" style="margin-right: 8px;"></i> ${store.gameData.texts.stats.multiverse}</div>
                <div class="stats-grid">
                    <div class="stat-box">
                        <span class="stat-label"><i class="fa-solid fa-explosion" style="color: #e74c3c; margin-right: 4px; font-size: 0.65rem;"></i> ${store.gameData.texts.stats.universesDestroyed}</span>
                        <span id="st-formats" class="stat-value" style="color: #e74c3c;"></span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label"><i class="fa-solid fa-atom" style="color: #9b59b6; margin-right: 4px; font-size: 0.65rem;"></i> ${store.gameData.texts.stats.quantumEnergy}</span>
                        <span id="st-qbits" class="stat-value" style="color: #9b59b6; text-shadow: 0 0 10px rgba(155,89,182,0.3);"></span>
                    </div>
                </div>
            </div>

            <!-- Profilo -->
            <div class="stats-section">
                <div class="stats-header"><i class="fa-solid fa-id-card" style="color: #9b59b6; margin-right: 8px;"></i> ${store.gameData.texts.stats.profile}</div>
                <div class="stats-grid">
                    <div class="stat-box">
                        <span class="stat-label"><i class="fa-solid fa-trophy" style="color: #f1c40f; margin-right: 4px; font-size: 0.65rem;"></i> ${store.gameData.texts.stats.season || 'Season'}</span>
                        <span id="st-season" class="stat-value" style="color: #f1c40f;"></span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label"><i class="fa-solid fa-shirt" style="color: #9b59b6; margin-right: 4px; font-size: 0.65rem;"></i> Skin</span>
                        <span id="st-skin" class="stat-value" style="text-transform: capitalize; color: #9b59b6;"></span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label"><i class="fa-solid fa-clock" style="color: #95a5a6; margin-right: 4px; font-size: 0.65rem;"></i> ${store.gameData.texts.stats.playtime}</span>
                        <span id="st-playtime" class="stat-value"></span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label"><i class="fa-solid fa-computer-mouse" style="color: #e74c3c; margin-right: 4px; font-size: 0.65rem;"></i> ${store.gameData.texts.stats.totalClicks}</span>
                        <span id="st-clicks" class="stat-value"></span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label"><i class="fa-solid fa-fire" style="color: #ff4757; margin-right: 4px; font-size: 0.65rem;"></i> ${store.gameData.texts.stats.comboRecord}</span>
                        <span id="st-combo" class="stat-value" style="color: #ff4757;"></span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label"><i class="fa-solid fa-arrow-up-right-dots" style="color: #f39c12; margin-right: 4px; font-size: 0.65rem;"></i> ${store.gameData.texts.stats.promotions}</span>
                        <span id="st-resets" class="stat-value"></span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label"><i class="fa-solid fa-bug" style="color: #f1c40f; margin-right: 4px; font-size: 0.65rem;"></i> ${store.gameData.texts.stats.goldenBugs}</span>
                        <span id="st-golden" class="stat-value" style="color: #f1c40f;"></span>
                    </div>
                </div>
            </div>

        </div>
    `;
    }

    // --- VALORI (aggiornati in place: niente rebuild, hover/tooltip preservati) ---
    const _set = (id: any, txt: any) => { const e = document.getElementById(id); if (e && e.textContent !== String(txt)) e.textContent = String(txt); };
    const _attr = (id: any, name: any, val: any) => { const e = document.getElementById(id); if (e && e.getAttribute(name) !== String(val)) e.setAttribute(name, String(val)); };

    _attr('st-threshold', 'data-tooltip', formatFullNumber(threshold));
    _set('st-threshold', formatNumber(threshold));
    const _pct = document.getElementById('st-progress-pct');
    if (_pct) { _pct.textContent = progress.toFixed(2) + '%'; _pct.style.color = progress >= 100 ? '#2ecc71' : '#fff'; }
    const _fill = document.getElementById('st-progress-fill');
    if (_fill) _fill.style.width = progress + '%';

    _attr('st-score', 'data-tooltip', formatFullNumber(store.gameState.score));
    _set('st-score', formatNumber(store.gameState.score.floor()));
    _attr('st-total', 'data-tooltip', formatFullNumber(store.gameState.totalScore));
    _set('st-total', formatNumber(store.gameState.totalScore));
    _attr('st-lifetime', 'data-tooltip', formatFullNumber(store.gameState.lifetimeScore));
    _set('st-lifetime', formatNumber(store.gameState.lifetimeScore));
    _attr('st-offline', 'data-tooltip', formatFullNumber(totalOffline));
    _set('st-offline-val', formatNumber(totalOffline));
    _set('st-offline-pct', '(' + offlinePercentText + ')');

    _attr('st-bps', 'data-tooltip', formatFullNumber(store.bps));
    _set('st-bps', formatNumber(store.bps));
    _set('st-click', formatNumber(rawClick));
    _set('st-click-mult', '(x' + formatNumber(totalClick) + ')');
    _set('st-mult', 'x' + formatNumber(store.prestigeBonus));
    _set('st-crit', (w.goldenBugChance * 100).toFixed(2) + '%');

    const _mv = document.getElementById('st-multiverse');
    if (_mv) {
        const _show = (totalFormats > 0 || totalQBits.gt(0));
        _mv.style.display = _show ? '' : 'none';
        if (_show) {
            _set('st-formats', formatNumber(totalFormats));
            _set('st-qbits', formatNumber(totalQBits) + ' Q-Bits');
        }
    }

    _set('st-skin', (store.gameData.skins[store.gameState.skins.current] ? store.gameData.skins[store.gameState.skins.current].name : 'Default'));
    _set('st-playtime', formatTime(store.gameState.totalPlayTime));
    _set('st-clicks', formatNumber(store.gameState.totalClicks));
    _set('st-combo', 'x' + formatNumber(store.gameState.longestCombo || 0));
    _set('st-resets', formatNumber(store.gameState.totalResets));
    _set('st-season', String(store.gameState.season || 1));
    _set('st-golden', formatNumber(store.gameState.totalGoldenBugsClicked || 0));
}

// === shim outbound kill-legacy (TEMPORANEI, rimossi a fine migrazione) ===
Object.assign(window as any, {
    formatNumber, showToast, updateUI, updateSkinsUI, applySkinVisuals,
    updatePrestigeVisuals, updatePrestigeUI, updateStatsUI, updateAchievementsUI,
    refreshAllStores, updateClickStore, renderPrestigeHubCards, showClickFeedback,
    bumpScoreDisplay, startMatrixEffect, stopMatrixEffect, showV2MigrationModal,
    showLaunchMigrationModal,
    simpleMarkdown, checkTabNotifications, equipSkin,
    // Extra (non nella lista dei 20 del brief/RENDER_GLOBALS, ma richieste da
    // dev/tests/e2e/integration.spec.ts, F5 pre-esistente): erano globali implicite
    // via classic-script prima della migrazione, qui vanno ri-esposte esplicitamente.
    formatFullNumber, formatTime, loadThemeCSS, updateTabsVisibility, checkOverlayNotifications,
});

// Forza questo file come modulo ESM agli occhi di tsc (nessuna riga import/export
// top-level altrimenti): senza questo, le 44 funzioni diventerebbero dichiarazioni
// globali ambient condivise con l'intero programma TS (typeof globalThis), mascherando
// per errore assegnazioni window.* non qualificate come valide. Zero impatto runtime.
export {};
