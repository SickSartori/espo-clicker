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
        return sign + num.toExponential(4).replace('.', ',');
    }

    // 6. Calcola il numero scalato
    // Esempio: 1.500.000 (Index 2 'M') -> diventa 1.5
    const scaledNum = num / Math.pow(1000, suffixIndex);

    // 7. Formatta con 2 decimali
    let formatted = scaledNum.toFixed(4);

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

    // --- 1. LOGICA EVENTO 404 (BLUESCREEN) ---
    const now = Date.now();
    const COOLDOWN_404 = 300000; // 5 minuti di cooldown
    const lastCrash = gameState.lastBluescreenTimestamp || 0;
    const timeSinceLast = now - lastCrash;

    // Controlla se c'è "404" nei punteggi
    const scoreString = Math.floor(gameState.score).toString();
    const clicksString = gameState.totalClicks.toString();
    const has404 = scoreString.includes('404') || clicksString.includes('404');

    // La probabilità aumenta se hai "404", ma è zero se sei in cooldown o l'evento è già attivo
    // 0.5% se hai 404, 0.05% altrimenti (molto raro)
    let currentChance = has404 ? 0.005 : 0.0005;

    if (timeSinceLast > COOLDOWN_404 && Math.random() < currentChance && !isBluescreenActive && gameState.score >= 404) {

        // --- TRIGGER 404 ---
        feedback.textContent = 'Error 404: Logic Not Found';
        feedback.style.color = '#facc15';
        feedback.style.fontSize = '1.2rem';
        feedback.style.fontWeight = '900';
        feedback.style.zIndex = '100'; // In primo piano

        // Calcolo Bonus Variabile (da 2x a 5x)
        let baseMult = 2;
        let variableMult = Math.random() * 3;
        let dynamicMultiplier = Math.floor(baseMult + variableMult);

        // Aggiorna timestamp e salva per il cooldown
        gameState.lastBluescreenTimestamp = now;
        if (window.EspooClicker) window.EspooClicker.saveGame();

        triggerBluescreen(dynamicMultiplier);

    } else {
        // --- FEEDBACK NORMALE (+Punti) ---
        let clickBonusPercent = 0.01;
        if (gameState.clickUpgrades.clickDivino.purchased) {
            clickBonusPercent = 0.02;
        }

        const currentClickValue = (gameState.baseClickValue * prestigeBonus * bluescreenMultiplier) +
            (gameState.clickUpgrades.manoBionica.purchased ? (cookiesPerSecond * clickBonusPercent) : 0);

        feedback.textContent = `+${formatNumber(currentClickValue)}`;
        // Colore standard (rosso leggero come definito in CSS) o dorato se critico
    }

    // --- 2. POSIZIONAMENTO DINAMICO ---
    const rect = feedbackContainer.getBoundingClientRect();

    // Se clicchi col mouse usa le coordinate, se usi tastiera (Invio) usa il centro
    let x, y;
    if (event.clientX && event.clientY) {
        x = event.clientX - rect.left;
        y = event.clientY - rect.top;
    } else {
        x = rect.width / 2;
        y = rect.height / 2;
    }

    // Aggiungi variazione casuale per non sovrapporre i numeri
    const randomX = (Math.random() - 0.5) * 60; // Spostamento laterale +/- 30px
    const randomY = (Math.random() - 0.5) * 40; // Leggera variazione verticale
    const randomRot = (Math.random() - 0.5) * 30; // Rotazione +/- 15 gradi

    feedback.style.left = `${x + randomX}px`;
    feedback.style.top = `${y + randomY}px`;

    // Imposta variabili CSS per l'animazione (assumi che il CSS usi var(--tx) e var(--rot))
    feedback.style.setProperty('--tx', `${randomX}px`);
    feedback.style.setProperty('--rot', `${randomRot}deg`);

    feedbackContainer.appendChild(feedback);

    // Rimuovi dopo l'animazione
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

function refreshAllStores() {
    // 1. Aggiorna Edifici (Colonna Destra)
    for (const key in gameState.buildings) {

        // --- LOGICA MAX/MOLTIPLICATORE ---
        let amountToBuy = buyMultiplier;
        let isMax = false;

        if (buyMultiplier === 'MAX') {
            const max = calculateMaxAffordable(key);
            // Se max è 0 (non ho soldi), mostriamo il costo di 1 (per far vedere quanto manca)
            amountToBuy = max > 0 ? max : 1;
            isMax = true;
        }

        const currentCost = calculateBulkCost(key, amountToBuy);
        // ----------------------------------

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

        if (costEl) {
            // Se è MAX, mostra quanti ne stai comprando nel testo, es: "Costo (+12): 1.5M"
            // Se non puoi permettertelo (isMax e max=0), mostra solo "Costo" standard
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

        if (countEl) countEl.textContent = gameState.buildings[key].count;

        // Aggiorna stato disabilitato del bottone
        const btn = document.getElementById(`buy-${key}`);
        if (btn) {
            btn.disabled = (gameState.score < currentCost);
        }
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
    // 1. GESTIONE VISIBILITÀ TAB E BOTTONE (Codice invariato)
    const tabLabButton = document.getElementById('tab-prestige');
    if (tabLabButton) {
        if (gameState.totalResets > 0 || gameState.prestigePoints > 0) {
            tabLabButton.style.display = 'inline-block';
        } else {
            tabLabButton.style.display = 'none';
            if (tabLabButton.classList.contains('active')) {
                const clickTab = document.getElementById('tab-click');
                if (clickTab) clickTab.click();
            }
        }
    }

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

    // 2. AGGIORNA CIFRA GUADAGNO
    if (document.getElementById('prestige-gain-display')) {
        const gained = calculatePrestigeGained();
        document.getElementById('prestige-gain-display').textContent = formatNumber(gained);
        document.getElementById('prestige-gain-display').setAttribute('data-tooltip', gained.toLocaleString('it-IT'));
    }

    // 3. AGGIORNA NEGOZIO LAB (Con Ordinamento)
    const listContainer = document.getElementById('prestige-list-container');
    if (!listContainer) return;

    // Funzione helper interna per aggiornare il singolo bottone
    const updateBtn = (id, data, state) => {
        const el = document.getElementById(`upgrade-${id}`);
        const btn = document.getElementById(`buy-${id}`);
        if (!btn || !el) return null;

        let isCompleted = false;
        if (!data.isCounted && state.purchased) isCompleted = true;
        if (data.isCounted && data.maxLevel && state.count >= data.maxLevel) isCompleted = true;

        // Determina Priorità
        let priority = 0;
        let cost = data.baseCost;

        if (isCompleted) {
            btn.textContent = "Posseduto";
            btn.className = "buy-btn prestige-btn owned";
            btn.disabled = true;
            el.classList.add('purchased');
            priority = 300; // In fondo
        } else {
            btn.innerHTML = "Compra";
            btn.className = "buy-btn prestige-btn";
            const canAfford = gameState.prestigePoints >= data.baseCost;
            btn.disabled = !canAfford;
            el.classList.remove('purchased');

            // Prima quelli acquistabili (200), poi quelli costosi (210)
            priority = canAfford ? 200 : 210;
        }

        const countEl = document.getElementById(`count-${id}`);
        if (countEl) countEl.textContent = state.count;

        // Ritorna oggetto per ordinamento
        return { el: el, priority: priority, cost: cost };
    };

    const pData = gameData.prestigeUpgrades;
    const pState = gameState.prestigeUpgrades;
    const items = [];

    // Raccogli elementi aggiornati
    const ids = ['sinergia', 'accelerazione', 'ticketPremium', 'outsourcing', 'paracadute', 'crunchTime'];
    ids.forEach(id => {
        const item = updateBtn(id, pData[id], pState[id]);
        if (item) items.push(item);
    });

    // --- ORDINAMENTO ---
    items.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.cost - b.cost;
    });

    // --- APPLICAZIONE ---
    const mode = gameState.filterSettings.globalFilter || 'available';
    // Nota: Il Lab ignora il filtro "Locked" (mostra tutto in quel caso) o usa "All"

    items.forEach(item => {
        // Gestione visibilità semplice basata sul filtro globale
        // Se "Già Presi" -> mostra solo priority 300
        // Se "Acquistabili" -> mostra priority < 300
        // Se "Tutti" -> mostra tutto
        let show = true;
        if (mode === 'available' && item.priority === 300) show = false;
        if (mode === 'purchased' && item.priority < 300) show = false;

        item.el.style.display = show ? 'flex' : 'none';
        listContainer.appendChild(item.el);
    });
}


function updateEnhancementStore() {
    const list = document.getElementById('enhancement-list');
    if (!list) return;

    const mode = gameState.filterSettings.globalFilter || 'available';
    let visibleCount = 0;

    // Check se esistono edifici
    let hasAnyBuilding = false;
    for (const key in gameState.buildings) {
        if (gameState.buildings[key].count > 0) { hasAnyBuilding = true; break; }
    }

    // Array temporaneo per l'ordinamento
    const items = [];

    for (const key in gameData.buildingEnhancements) {
        const data = gameData.buildingEnhancements[key];
        const state = gameState.buildingEnhancements[key];
        const targetBuilding = gameState.buildings[data.targetBuilding];
        const el = document.getElementById(`enh-upgrade-${key}`);

        if (!el) continue;

        const btn = el.querySelector('.buy-btn');
        const progressBar = el.querySelector('.progress-bar-container');

        // Stato Logico
        const isPurchased = state.purchased;
        const isUnlocked = targetBuilding.count >= data.requiredCount;
        const canAfford = gameState.score >= data.cost;

        // Reset grafico
        el.classList.remove('purchased', 'locked-item');
        btn.style.display = 'none';
        progressBar.style.display = 'none';

        // --- ASSEGNAZIONE PRIORITÀ ---
        // Più basso è il numero, più in alto appare nella lista
        let priority = 0;

        if (isPurchased) {
            // 3. POSSEDUTI -> In Fondo (Priorità 300)
            el.classList.add('purchased');
            btn.textContent = "Posseduto";
            btn.disabled = true;
            btn.className = "buy-btn owned";
            btn.style.display = 'block';
            priority = 300;

        } else if (isUnlocked) {
            // 2. SBLOCCATI -> Al Centro (Priorità 200-210)
            btn.textContent = "Compra";
            btn.disabled = !canAfford;
            btn.className = "buy-btn enhancement-btn";
            btn.style.display = 'block';

            // Mettiamo prima quelli che puoi permetterti (200), poi quelli troppo costosi (210)
            priority = canAfford ? 200 : 210;

        } else {
            // 1. DA COMPIERE (Bloccati) -> In Cima (Priorità 0-100)
            el.classList.add('locked-item');
            progressBar.style.display = 'block';

            const current = targetBuilding.count;
            const target = data.requiredCount;
            const targetName = gameData.buildings[data.targetBuilding].name;
            let percent = Math.min((current / target) * 100, 100);
            if (isNaN(percent)) percent = 0; // Sicurezza extra

            el.querySelector('.progress-bar-fill').style.width = `${percent}%`;

            const text = `${current} / ${target} ${targetName}`;
            el.querySelector('.progress-text').textContent = text;
            el.querySelector('.progress-text').title = text;

            // Ordiniamo i bloccati: quelli quasi finiti (90%) stanno più in alto (10) di quelli appena iniziati (100)
            priority = 100 - percent;
        }

        // Visibilità (rispetta sempre il filtro globale)
        if (shouldItemBeVisible(mode, isPurchased, isUnlocked)) {
            el.style.display = 'flex';
            visibleCount++;
            items.push({ el: el, priority: priority, cost: data.cost });
        } else {
            el.style.display = 'none';
        }
    }

    // --- ORDINAMENTO ---
    items.sort((a, b) => {
        // Prima ordina per gruppo di priorità (Bloccati < Sbloccati < Posseduti)
        if (Math.floor(a.priority) !== Math.floor(b.priority)) {
            return a.priority - b.priority;
        }
        // A parità di gruppo, ordina per costo (più economico prima)
        return a.cost - b.cost;
    });

    // --- APPLICAZIONE AL DOM ---
    items.forEach(item => list.appendChild(item.el));

    // Messaggio vuoto
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

    // Array per l'ordinamento
    const items = [];

    for (const key in gameData.clickUpgrades) {
        const data = gameData.clickUpgrades[key];
        const state = gameState.clickUpgrades[key];
        const el = document.getElementById(`click-upgrade-${key}`);
        if (!el) continue;

        const btn = el.querySelector('.buy-btn');
        const progressBar = el.querySelector('.progress-bar-container');

        // Stato Logico
        const isPurchased = state.purchased;
        const isUnlocked = gameState.totalClicks >= data.requiredClicks;
        const canAfford = gameState.score >= data.cost;

        // Reset Classi
        el.classList.remove('purchased', 'locked-item');
        btn.style.display = 'none';
        progressBar.style.display = 'none';

        // --- ASSEGNAZIONE PRIORITÀ ---
        let priority = 0;

        if (isPurchased) {
            // 3. POSSEDUTI -> In Fondo (300)
            el.classList.add('purchased');
            btn.textContent = "Posseduto";
            btn.disabled = true;
            btn.className = "buy-btn owned";
            btn.style.display = 'block';
            priority = 300;

        } else if (isUnlocked) {
            // 2. SBLOCCATI -> Al Centro (200/210)
            btn.textContent = "Compra";
            btn.disabled = !canAfford;
            btn.className = "buy-btn buy-click-btn";
            btn.style.display = 'block';

            // Prima quelli che puoi permetterti
            priority = canAfford ? 200 : 210;

        } else {
            // 1. DA COMPIERE (Bloccati) -> In Cima (0-100)
            el.classList.add('locked-item');
            progressBar.style.display = 'block';

            // Aggiorna barra
            const current = gameState.totalClicks;
            const target = data.requiredClicks;

            let percent = Math.min((current / target) * 100, 100);
            if (isNaN(percent)) percent = 0; // Sicurezza extra

            el.querySelector('.progress-bar-fill').style.width = `${percent}%`;

            const text = `Sblocco: ${formatNumber(current)} / ${formatNumber(target)}`;
            el.querySelector('.progress-text').textContent = text;
            el.querySelector('.progress-text').title = text;

            // Ordine: Più sei vicino (90%), più in alto stai (10)
            priority = 100 - percent;
        }

        // Visibilità
        if (shouldItemBeVisible(mode, isPurchased, isUnlocked)) {
            el.style.display = 'flex';
            visibleCount++;
            items.push({ el: el, priority: priority, cost: data.cost });
        } else {
            el.style.display = 'none';
        }
    }

    // --- ORDINAMENTO E APPLICAZIONE ---
    items.sort((a, b) => {
        if (Math.floor(a.priority) !== Math.floor(b.priority)) {
            return a.priority - b.priority;
        }
        return a.cost - b.cost;
    });

    items.forEach(item => list.appendChild(item.el));

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