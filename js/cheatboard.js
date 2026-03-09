(function () {
    // --- 0. Stato Globale Cheat ---
    window.cheatBPSBonus = new Decimal(0);

    // --- 1. Hook nella Logica di Gioco ---
    const originalRecalculateCPS = window.recalculateCPS || function () { };

    window.recalculateCPS = function () {
        originalRecalculateCPS();

        if (typeof bps !== 'undefined') {
            if (!(bps instanceof Decimal)) {
                bps = new Decimal(bps || 0);
            }
            bps = bps.add(window.cheatBPSBonus);
            if (bps.lt(0)) bps = new Decimal(0);
        }
    };

    const styles = `
        #cheatboard-container { 
            position: fixed; 
            top: 0; 
            left: 0; 
            width: 350px; 
            height: 100vh; 
            background-color: rgba(10, 10, 10, 0.95); 
            backdrop-filter: blur(10px); 
            border-right: 1px solid #333; 
            box-shadow: 10px 0 50px rgba(0, 0, 0, 0.6); 
            z-index: 99999; 
            transform: translateX(-100%); 
            transition: transform 0.3s cubic-bezier(0.25, 1, 0.5, 1); 
            color: #e0e0e0; 
            font-family: 'Consolas', 'Monaco', monospace; 
            display: flex; 
            flex-direction: column; 
        }
        #cheatboard-container.open { 
            transform: translateX(0); 
        }
        #cheatboard-handle { 
            position: absolute; 
            top: 120px; 
            right: -40px; 
            width: 40px; 
            height: 40px; 
            background: #111; 
            color: #00ff9d; 
            border: 1px solid #333; 
            border-left: none; 
            border-radius: 0 8px 8px 0; 
            cursor: pointer; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            font-size: 1.2rem; 
            box-shadow: 5px 0 15px rgba(0, 0, 0, 0.3); 
            transition: all 0.3s ease; 
            opacity: 1; 
        }
        #cheatboard-handle:hover { 
            background: #222; 
            right: -45px; 
            color: #fff; 
        }
        #cheatboard-container.open #cheatboard-handle { 
            opacity: 0; 
            pointer-events: none; 
            right: 0; 
        }
        #cheatboard-header { 
            padding: 20px; 
            border-bottom: 1px solid #222; 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            background: rgba(255, 255, 255, 0.02); 
        }
        #cheatboard-title { 
            font-size: 1rem; 
            font-weight: bold; 
            color: #00ff9d; 
            display: flex; 
            align-items: center; 
            gap: 10px; 
            letter-spacing: 1px; 
        }
        #cheatboard-close { 
            cursor: pointer; 
            color: #ff4757; 
            font-size: 1.4rem; 
            padding: 5px; 
            transition: transform 0.2s; 
        }
        #cheatboard-close:hover { 
            transform: scale(1.1); 
            color: #ff6b81; 
        }
        #cheatboard-content { 
            padding: 20px; 
            flex: 1; 
            overflow-y: auto; 
            display: flex; 
            flex-direction: column; 
            gap: 15px; 
            padding-bottom: 80px; 
        }
        .cheat-group { 
            background: rgba(30, 30, 30, 0.3); 
            border: 1px solid #333; 
            border-radius: 8px; 
            padding: 15px; 
            display: flex; 
            flex-direction: column; 
            gap: 12px; 
        }
        .cheat-group-title { 
            font-size: 0.7rem; 
            color: #888; 
            text-transform: uppercase; 
            font-weight: 700; 
            letter-spacing: 1px; 
            border-bottom: 1px solid #444; 
            padding-bottom: 8px; 
            margin-bottom: 5px; 
        }
        .control-row { 
            display: flex; 
            gap: 10px; 
            align-items: center; 
            width: 100%; 
        }
        .cheat-input { 
            background: #080808; 
            border: 1px solid #444; 
            color: #00ff9d; 
            padding: 0 12px; 
            border-radius: 4px; 
            font-family: monospace; 
            font-size: 1.1rem; 
            text-align: right; 
            font-weight: bold; 
            height: 40px; 
            flex: 1; 
            min-width: 0; 
        }
        .cheat-input:focus { 
            border-color: #00ff9d; 
            outline: none; 
            box-shadow: 0 0 8px rgba(0, 255, 157, 0.2); 
        }
        .cheat-btn { 
            background: #222; 
            border: 1px solid #444; 
            color: #eee; 
            padding: 0 15px; 
            border-radius: 4px; 
            cursor: pointer; 
            font-weight: 600; 
            font-size: 0.8rem; 
            text-transform: uppercase; 
            white-space: nowrap; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            gap: 8px; 
            height: 40px; 
            transition: all 0.1s; 
            flex: 1; 
        }
        .cheat-btn:hover { 
            background: #333; 
            border-color: #666; 
        }
        .cheat-btn:active { 
            transform: translateY(1px); 
        }
        .cheat-btn.primary { border-color: #00ff9d; color: #00ff9d; background: rgba(0, 255, 157, 0.05); }
        .cheat-btn.primary:hover { background: rgba(0, 255, 157, 0.15); }
        .cheat-btn.danger { border-color: #ff4757; color: #ff4757; background: rgba(255, 71, 87, 0.05); }
        .cheat-btn.danger:hover { background: rgba(255, 71, 87, 0.15); }
        .cheat-btn.gold { border-color: #f1c40f; color: #f1c40f; background: rgba(241, 196, 15, 0.05); }
        .cheat-btn.gold:hover { background: rgba(241, 196, 15, 0.15); }
        .cheat-btn.matrix { border-color: #0f0; color: #0f0; background: rgba(0, 255, 0, 0.05); }
        .cheat-btn.matrix:hover { background: rgba(0, 255, 0, 0.15); text-shadow: 0 0 5px #0f0; }
        .cheat-btn.info { border-color: #3498db; color: #3498db; background: rgba(52, 152, 219, 0.05); }
        .cheat-btn.info:hover { background: rgba(52, 152, 219, 0.15); }
        .cheat-btn.chaos { border-color: #e67e22; color: #e67e22; background: rgba(230, 126, 34, 0.05); }
        .cheat-btn.chaos:hover { background: rgba(230, 126, 34, 0.15); }
        
        /* NUOVO STILE: QUANTUM */
        .cheat-btn.quantum { border-color: #9b59b6; color: #9b59b6; background: rgba(155, 89, 182, 0.05); }
        .cheat-btn.quantum:hover { background: rgba(155, 89, 182, 0.15); box-shadow: 0 0 10px rgba(155, 89, 182, 0.3); }

        #cheatboard-content::-webkit-scrollbar { width: 5px; }
        #cheatboard-content::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
        @media only screen and (max-width: 768px) {
            #cheatboard-container { width: 92%; max-width: none; }
            #cheatboard-handle { top: 140px; right: -35px; width: 35px; height: 40px; }
            .control-row { flex-wrap: wrap; }
            .cheat-input { flex: 1 1 100%; margin-bottom: 5px; height: 45px; }
            .cheat-btn { flex: 1 1 100%; height: 50px; font-size: 0.9rem; }
            .control-row .cheat-btn:not(:first-child) { flex: 1; }
        }
    `;

    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    // --- 3. Struttura HTML ---
    const container = document.createElement('div');
    container.id = 'cheatboard-container';

    container.innerHTML = `
        <div id="cheatboard-handle"><i class="fa-solid fa-terminal"></i></div>
        <div id="cheatboard-header">
            <span id="cheatboard-title"><i class="fa-solid fa-terminal"></i> Admin Console</span>
            <span id="cheatboard-close"><i class="fa-solid fa-xmark"></i></span>
        </div>
        <div id="cheatboard-content">
            
            <div class="cheat-group">
                <div class="cheat-group-title">Risorse</div>
                <div class="control-row">
                    <input type="text" id="cheat-bugs-input" class="cheat-input" placeholder="Bugs" value="1000000">
                    <button id="btn-bugs-add" class="cheat-btn primary" title="Aggiunge Bug al tuo portafoglio"><i class="fa-solid fa-plus"></i> Bug</button>
                </div>
                <div class="control-row">
                    <input type="text" id="cheat-tokens-input" class="cheat-input" placeholder="Token" value="100">
                    <button id="btn-tokens-add" class="cheat-btn gold" title="Aggiunge Token Prestigio per il Laboratorio"><i class="fa-solid fa-coins"></i> Token</button>
                </div>
                <div class="control-row">
                    <button id="btn-time-warp" class="cheat-btn" title="Simula 1 ora di gioco in avanti"><i class="fa-solid fa-forward"></i> Skip 1h</button>
                </div>
            </div>

            <div class="cheat-group">
                <div class="cheat-group-title">End-Game (NG+)</div>
                <div class="control-row">
                    <input type="text" id="cheat-qbits-input" class="cheat-input" placeholder="Q-Bits" value="10">
                    <button id="btn-qbits-add" class="cheat-btn quantum" title="Aggiunge Quantum Bits"><i class="fa-solid fa-atom"></i> Q-Bits</button>
                </div>
                <div class="control-row">
                    <button id="btn-format-ready" class="cheat-btn quantum" title="Imposta i requisiti per il Riavvio Universo (NG+)"><i class="fa-solid fa-meteor"></i> NG+ Ready</button>
                    <button id="btn-add-format" class="cheat-btn quantum" title="Aggiunge +1 al contatore Formattazioni"><i class="fa-solid fa-plus"></i> Format</button>
                </div>
            </div>

            <div class="cheat-group">
                <div class="cheat-group-title">Statistiche</div>
                <div class="control-row">
                    <input type="number" id="cheat-clicks-input" class="cheat-input" placeholder="Click" value="1000">
                    <button id="btn-clicks-add" class="cheat-btn" title="Aumenta il contatore dei click manuali (utile per sblocchi)">Agg. Click</button>
                </div>
                <div class="control-row">
                    <input type="text" id="cheat-bps-input" class="cheat-input" placeholder="BPS" value="1000">
                    <button id="btn-bps-add" class="cheat-btn" title="Aggiunge un bonus piatto al BPS attuale">Bonus BPS</button>
                </div>
            </div>

            <div class="cheat-group">
                <div class="cheat-group-title">Shop & Power</div>
                <div class="control-row">
                    <button id="btn-unlock-shop" class="cheat-btn primary" title="Compra istantaneamente tutti gli upgrade e team disponibili">Sblocca Shop</button>
                    <button id="btn-lock-shop" class="cheat-btn danger" title="Resetta lo stato di acquisto di tutti gli oggetti"> Blocca Shop</button>
                </div>
                <div class="control-row">
                    <button id="btn-army-100" class="cheat-btn gold" title="Aggiunge +100 unità a tutti i tipi di Team"><i class="fa-solid fa-users"></i> +100 Army</button>
                </div>
                <div class="control-row">
                    <button id="btn-random-chaos" class="cheat-btn chaos" title="Aggiunge risorse casuali e sblocca cose a caso!"><i class="fa-solid fa-dice"></i> RANDOM</button>
                </div>
                <div class="control-row">
                    <button id="btn-god-mode" class="cheat-btn matrix" style="font-weight:900; letter-spacing:2px;" title="Risorse infinite, tutto sbloccato, potenza massima"><i class="fa-solid fa-bolt"></i> GOD MODE</button>
                </div>
            </div>

            <div class="cheat-group">
                <div class="cheat-group-title">Eventi e Glitch</div>
                
                <div class="control-row">
                    <input type="number" id="cheat-404-input" class="cheat-input" placeholder="x" value="5" style="width: 50px; flex: 0.4;">
                    <button id="btn-event-404" class="cheat-btn danger" title="Scatena l'evento Error 404 (Moltiplicatore)">404</button>
                    <button id="btn-event-matrix" class="cheat-btn matrix" title="Attiva l'evento Matrix Hack">Matrix</button>
                </div>
                
                <div class="control-row">
                    <button id="btn-event-rick" class="cheat-btn danger" title="Never gonna give you up...">Rick</button>
                    <button id="btn-event-ricardo" class="cheat-btn danger" title="Attiva il video Ricardo Milos">Ricardo</button>
                </div>

                <div class="control-row">
                    <button id="btn-event-golden" class="cheat-btn gold" title="Fa apparire un Golden Bug istantaneamente"><i class="fa-solid fa-bug"></i> Golden Bug</button>
                    <button id="btn-event-star" class="cheat-btn gold" title="Attiva evento Super Star"><i class="fa-solid fa-star"></i> Super Star</button>
                </div>
                 <div class="control-row">
                    <button id="btn-reset-cooldown" class="cheat-btn" title="Resetta il tempo di attesa di Espo Fury"><i class="fa-solid fa-clock-rotate-left"></i> Reset CD</button>
                </div>
            </div>

            <div class="cheat-group">
                <div class="cheat-group-title">Dev Tools</div>
                <div class="control-row">
                    <button id="btn-prestige-ready" class="cheat-btn gold" title="Imposta lo score appena sopra la soglia per il prestigio"><i class="fa-solid fa-rocket"></i> Prestige Ready</button>
                </div>
                <div class="control-row">
                    <button id="btn-log-state" class="cheat-btn info" title="Stampa lo stato del gioco nella console del browser (F12)"><i class="fa-solid fa-code"></i> Log State</button>
                </div>
            </div>

            <div class="cheat-group">
                <div class="cheat-group-title">Sblocchi & Reset</div>
                <div class="control-row">
                    <button id="btn-unlock-skins" class="cheat-btn primary" title="Sblocca tutte le skin nel guardaroba">Sblocca Skin</button>
                    <button id="btn-unlock-ach" class="cheat-btn primary" title="Sblocca tutti gli obiettivi">Sblocca Ach.</button>
                </div>
                <div class="control-row">
                    <button id="btn-lock-skins" class="cheat-btn danger" title="Blocca tutte le skin e resetta i relativi obiettivi">Blocca Skin</button>
                     <button id="btn-lock-ach" class="cheat-btn danger" title="Blocca tutti gli obiettivi">Blocca Ach.</button>
                </div>
                <div class="control-row" style="margin-top: 10px;">
                    <button id="btn-hard-reset" class="cheat-btn danger" style="border: 1px solid red; color: red;" title="CANCELLA TUTTO il salvataggio e ricarica"><i class="fa-solid fa-triangle-exclamation"></i> HARD RESET</button>
                </div>
            </div>

        </div>
    `;

    document.body.appendChild(container);

    // --- 4. Funzioni Helper ---
    const getVal = (id) => {
        const val = document.getElementById(id).value;
        try {
            return new Decimal(val);
        } catch (e) {
            return new Decimal(0);
        }
    };

    const getIntVal = (id) => parseInt(document.getElementById(id).value) || 0;

    const updateGame = () => { if (typeof updateUI === 'function') updateUI(); };
    const toast = (msg) => { if (window.EspooClicker) window.EspooClicker.showToast('<i class="fa-solid fa-terminal"></i> ' + msg, 'info'); };
    const refreshUI = () => {
        if (typeof recalculateCPS === 'function') recalculateCPS();
        if (typeof refreshAllStores === 'function') refreshAllStores();
        if (typeof updateAchievementsUI === 'function') updateAchievementsUI();
        if (typeof updateSkinsUI === 'function') updateSkinsUI();
        updateGame();
    };

    // --- 5. Event Listeners UI ---
    const handle = document.getElementById('cheatboard-handle');
    const closeBtn = document.getElementById('cheatboard-close');

    const togglePanel = () => container.classList.toggle('open');
    handle.addEventListener('click', togglePanel);
    closeBtn.addEventListener('click', togglePanel);

    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'C') togglePanel();
    });

    // --- 6. LOGICA BOTTONI ---

    // Aggiungi Bug
    document.getElementById('btn-bugs-add').addEventListener('click', () => {
        const val = getVal('cheat-bugs-input'); 
        gameState.score = gameState.score.add(val);
        gameState.totalScore = gameState.totalScore.add(val);
        gameState.lifetimeScore = gameState.lifetimeScore.add(val);
        refreshUI();
        toast(`Aggiunti ${window.EspooClicker.formatNumber(val)} Bug`);
    });

    // Aggiungi Token Lab
    document.getElementById('btn-tokens-add').addEventListener('click', () => {
        const val = getVal('cheat-tokens-input');
        gameState.prestigePoints = gameState.prestigePoints.add(val);
        if (gameState.lifetimePrestigePoints) {
            gameState.lifetimePrestigePoints = gameState.lifetimePrestigePoints.add(val);
        } else {
            gameState.lifetimePrestigePoints = val;
        }
        if (typeof updatePrestigeUI === 'function') updatePrestigeUI();
        refreshUI();
        toast(`Aggiunti ${window.EspooClicker.formatNumber(val)} Token Lab`);
    });

    // --- NUOVA LOGICA END-GAME ---

    // Aggiungi Q-Bits
    document.getElementById('btn-qbits-add').addEventListener('click', () => {
        const val = getVal('cheat-qbits-input');
        if (!gameState.qBits) gameState.qBits = new Decimal(0);
        if (!gameState.lifetimeQBits) gameState.lifetimeQBits = new Decimal(0);
        
        gameState.qBits = gameState.qBits.add(val);
        gameState.lifetimeQBits = gameState.lifetimeQBits.add(val);
        refreshUI();
        toast(`Aggiunti ${window.EspooClicker.formatNumber(val)} Q-Bits`);
    });

    // NG+ Ready
    document.getElementById('btn-format-ready').addEventListener('click', () => {
        if (gameState.totalResets < 20) gameState.totalResets = 20;
        if (!gameState.prestigePoints) gameState.prestigePoints = new Decimal(0);
        gameState.prestigePoints = gameState.prestigePoints.add(1000);
        
        if (typeof updatePrestigeVisuals === 'function') updatePrestigeVisuals();
        refreshUI();
        toast("Requisiti NG+ soddisfatti! Vai nel Lab.");
    });

    // +1 Formattazione
    document.getElementById('btn-add-format').addEventListener('click', () => {
        if (!gameState.totalFormattazioni) gameState.totalFormattazioni = 0;
        gameState.totalFormattazioni += 1;
        if (window.EspooClicker) window.EspooClicker.saveGame();
        refreshUI();
        toast("Contatore Formattazioni aumentato (+1)");
    });

    // Salto Temporale
    document.getElementById('btn-time-warp').addEventListener('click', () => {
        if (bps.lte(0)) { toast("BPS è 0! Impossibile viaggiare."); return; }
        const seconds = 3600;
        const gain = bps.mul(seconds);

        gameState.score = gameState.score.add(gain);
        gameState.totalScore = gameState.totalScore.add(gain);
        gameState.lifetimeScore = gameState.lifetimeScore.add(gain);
        gameState.totalPlayTime += seconds;
        refreshUI();
        toast(`Salto Temporale! (+${window.EspooClicker ? window.EspooClicker.formatNumber(gain) : gain} Bug)`);
    });

    // Aggiungi Click
    document.getElementById('btn-clicks-add').addEventListener('click', () => {
        const val = getIntVal('cheat-clicks-input');
        gameState.totalClicks += val;
        refreshUI();
        toast(`Aggiunti ${val} click manuali`);
    });

    // Aggiungi Bonus BPS
    document.getElementById('btn-bps-add').addEventListener('click', () => {
        const val = getVal('cheat-bps-input');
        window.cheatBPSBonus = window.cheatBPSBonus.add(val);
        refreshUI();
        toast(`Bonus BPS +${window.EspooClicker.formatNumber(val)} attivato`);
    });

    // --- SHOP & POWER ---

    document.getElementById('btn-unlock-shop').addEventListener('click', () => {
        for (let key in gameData.clickUpgrades) {
            if (gameState.clickUpgrades[key]) gameState.clickUpgrades[key].purchased = true;
        }
        for (let key in gameData.buildingEnhancements) {
            if (gameState.buildingEnhancements[key]) gameState.buildingEnhancements[key].purchased = true;
        }
        for (let key in gameData.prestigeUpgrades) {
            const data = gameData.prestigeUpgrades[key];
            if (!data.isCounted && gameState.prestigeUpgrades[key]) {
                gameState.prestigeUpgrades[key].purchased = true;
            }
        }
        // Sblocca anche il Quantum Lab
        for (let key in gameData.superUpgrades) {
            if (gameState.superUpgrades[key]) gameState.superUpgrades[key].purchased = true;
        }
        refreshUI();
        if (window.EspooClicker) window.EspooClicker.saveGame();
        toast("Tutto lo shop è stato sbloccato!");
    });

    document.getElementById('btn-lock-shop').addEventListener('click', () => {
        for (let key in gameData.clickUpgrades) {
            if (gameState.clickUpgrades[key]) gameState.clickUpgrades[key].purchased = false;
        }
        for (let key in gameData.buildingEnhancements) {
            if (gameState.buildingEnhancements[key]) gameState.buildingEnhancements[key].purchased = false;
        }
        for (let key in gameData.prestigeUpgrades) {
            const data = gameData.prestigeUpgrades[key];
            if (!data.isCounted && gameState.prestigeUpgrades[key]) {
                gameState.prestigeUpgrades[key].purchased = false;
            }
        }
        for (let key in gameData.superUpgrades) {
            if (gameState.superUpgrades[key]) gameState.superUpgrades[key].purchased = false;
        }
        refreshUI();
        if (window.EspooClicker) window.EspooClicker.saveGame();
        toast("Tutto lo shop è stato bloccato.");
    });

    document.getElementById('btn-army-100').addEventListener('click', () => {
        for (let key in gameState.teams) {
            if (gameState.teams[key]) gameState.teams[key].count += 100;
        }
        refreshUI();
        toast("Rinforzi arrivati! (+100 unità a tutti)");
    });

    // RANDOM CHAOS
    document.getElementById('btn-random-chaos').addEventListener('click', () => {
        const randBugs = new Decimal("1e9").mul(Math.random());
        const randTokens = new Decimal("5000").mul(Math.random());

        gameState.score = gameState.score.add(randBugs);
        gameState.totalScore = gameState.totalScore.add(randBugs);
        gameState.lifetimeScore = gameState.lifetimeScore.add(randBugs);

        gameState.prestigePoints = gameState.prestigePoints.add(randTokens);
        if (gameState.lifetimePrestigePoints) {
            gameState.lifetimePrestigePoints = gameState.lifetimePrestigePoints.add(randTokens);
        } else {
            gameState.lifetimePrestigePoints = new Decimal(randTokens);
        }

        const randClicks = Math.floor(Math.random() * 5000) + 1000;
        gameState.totalClicks += randClicks;

        const randMult = new Decimal(Math.floor(Math.random() * 500) + 100);
        window.cheatBPSBonus = window.cheatBPSBonus.add(randMult);

        const achKeys = Object.keys(gameData.achievements);
        for (let i = 0; i < 3; i++) {
            const randomKey = achKeys[Math.floor(Math.random() * achKeys.length)];
            if (gameState.achievements[randomKey]) gameState.achievements[randomKey].unlocked = true;
        }

        const skinKeys = Object.keys(gameData.skins);
        const randomSkin = skinKeys[Math.floor(Math.random() * skinKeys.length)];
        if (!gameState.skins.unlocked.includes(randomSkin)) gameState.skins.unlocked.push(randomSkin);

        if (typeof updatePrestigeVisuals === 'function') updatePrestigeVisuals();
        refreshUI();

        toast(`🎲 CHAOS: +${window.EspooClicker.formatNumber(randBugs)} Bug, +${window.EspooClicker.formatNumber(randTokens)} Token!`);
    });

    // GOD MODE
    document.getElementById('btn-god-mode').addEventListener('click', () => {
        gameState.score = new Decimal("1e33"); // 1 Decilione
        gameState.totalScore = new Decimal("1e33");
        gameState.prestigePoints = new Decimal("1e15"); // 1 Quadrilione
        gameState.qBits = new Decimal("1000000"); // 1 Milione di QBits

        document.getElementById('btn-unlock-skins').click();
        document.getElementById('btn-unlock-ach').click();
        document.getElementById('btn-unlock-shop').click();
        document.getElementById('btn-army-100').click();

        refreshUI();
        if (window.EspooClicker) window.EspooClicker.playSound('sound-achievement');
        toast("⚡ GOD MODE ATTIVATA ⚡");
    });

    // --- Eventi ---

    document.getElementById('btn-event-404').addEventListener('click', () => {
        const mult = getIntVal('cheat-404-input');
        if (typeof triggerGameEvent === 'function') {
            triggerGameEvent('bluescreen', mult);
            toast(`BSOD Forzato (x${mult})`);
        }
    });

    document.getElementById('btn-event-matrix').addEventListener('click', () => {
        const mult = getIntVal('cheat-404-input');
        if (typeof triggerGameEvent === 'function') {
            triggerGameEvent('matrix', mult);
            toast(`Matrix Forzato (x${mult})`);
        }
    });

    document.getElementById('btn-event-rick').addEventListener('click', () => {
        if (typeof triggerGameEvent === 'function') triggerGameEvent('rickRoll');
    });

    document.getElementById('btn-event-ricardo').addEventListener('click', () => {
        if (typeof triggerGameEvent === 'function') triggerGameEvent('ricardo');
    });

    document.getElementById('btn-event-golden').addEventListener('click', () => {
        if (typeof spawnGoldenBug === 'function') {
            spawnGoldenBug();
            toast("Golden Bug generato");
        }
    });

    document.getElementById('btn-event-star').addEventListener('click', () => {
        const mult = getIntVal('cheat-404-input'); 
        if (typeof triggerGameEvent === 'function') {
            triggerGameEvent('superStarMode', mult);
            toast(`⭐ Super Star (x${mult}) attivata`);
        }
    });

    document.getElementById('btn-reset-cooldown').addEventListener('click', () => {
        crunchTimeCooldownEnd = 0;
        refreshUI();
        toast("Cooldown resettati!");
    });

    // --- Dev Tools ---

    document.getElementById('btn-prestige-ready').addEventListener('click', () => {
        if (gameData.PRESTIGE_THRESHOLD) {
            const readyScore = gameData.PRESTIGE_THRESHOLD.add(1);
            gameState.totalScore = readyScore;
            gameState.score = readyScore;
            if (typeof updatePrestigeVisuals === 'function') updatePrestigeVisuals();
            refreshUI();
            toast("Prestigio Pronto!");
        }
    });

    document.getElementById('btn-log-state').addEventListener('click', () => {
        console.log("--- GAME STATE ---", gameState);
        console.log("--- GAME DATA ---", gameData);
        toast("Stato stampato in console (F12)");
    });

    // --- Sblocchi & Reset ---

    document.getElementById('btn-unlock-skins').addEventListener('click', () => {
        for (let key in gameData.skins) {
            if (!gameState.skins.unlocked.includes(key)) {
                gameState.skins.unlocked.push(key);
            }
        }
        if (typeof updateSkinsUI === 'function') updateSkinsUI();
        if (window.EspooClicker) window.EspooClicker.saveGame();
        toast("Tutte le skin sbloccate!");
    });

    document.getElementById('btn-lock-skins').addEventListener('click', () => {
        gameState.skins.unlocked = ['default'];
        gameState.skins.current = 'default';
        for (const key in gameData.achievements) {
            const reward = gameData.achievements[key].reward;
            if (reward && reward.type === 'skin') {
                if (gameState.achievements[key]) gameState.achievements[key].claimed = false;
            }
        }
        if (typeof applySkinVisuals === 'function') applySkinVisuals('default');
        if (window.EspooClicker) window.EspooClicker.saveGame();
        refreshUI();
        toast("Skin bloccate e obiettivi resettati.");
    });

    document.getElementById('btn-unlock-ach').addEventListener('click', () => {
        for (let key in gameData.achievements) {
            if (!gameState.achievements[key]) gameState.achievements[key] = {};
            gameState.achievements[key].unlocked = true;
        }
        if (window.EspooClicker) window.EspooClicker.saveGame();
        refreshUI();
        toast("Tutti gli obiettivi sbloccati!");
    });

    document.getElementById('btn-lock-ach').addEventListener('click', () => {
        for (let key in gameData.achievements) {
            if (gameState.achievements[key]) {
                gameState.achievements[key].unlocked = false;
                gameState.achievements[key].claimed = false;
                gameState.achievements[key].unlockTime = 0;
            }
        }
        if (window.EspooClicker) window.EspooClicker.saveGame();
        refreshUI();
        toast("Tutti gli obiettivi bloccati.");
    });

    document.getElementById('btn-hard-reset').addEventListener('click', () => {
        if (!confirm("⚠️ RESET TOTALE DEV MODE? ⚠️\nCancella tutto senza password e ricarica.")) return;
        if (typeof resetGameToDefault === 'function') {
            const tempUser = gameState.user.username;
            resetGameToDefault();
            gameState.user.username = tempUser;
        }
        if (window.EspooClicker) {
            window.EspooClicker.saveGame().then(() => { location.reload(); });
        } else {
            localStorage.removeItem('espotoolClickerSaveV8');
            location.reload();
        }
    });

})();