(function () {
    // --- 0. Stato Globale Cheat ---
    window.cheatBPSBonus = 0;

    // --- 1. Hook nella Logica di Gioco ---
    // Intercetta il calcolo del BPS per aggiungere il bonus cheat
    const originalRecalculateCPS = window.recalculateCPS || function () { };

    window.recalculateCPS = function () {
        originalRecalculateCPS();
        if (typeof cookiesPerSecond !== 'undefined') {
            cookiesPerSecond += window.cheatBPSBonus;
            if (cookiesPerSecond < 0) cookiesPerSecond = 0;
        }
    };

    // --- 2. Stili ---
    const styles = `
        /* --- CONTAINER PRINCIPALE --- */
        #cheatboard-container {
            position: fixed;
            top: 0;
            left: 0;
            width: 350px;
            height: 100vh;
            background-color: rgba(10, 10, 10, 0.95); /* Nero profondo semitrasparente */
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

        /* --- LINGUETTA (HANDLE) --- */
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

        /* --- HEADER & CONTENT --- */
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
            display: flex; align-items: center; gap: 10px;
            letter-spacing: 1px;
        }

        #cheatboard-close { 
            cursor: pointer; color: #ff4757; font-size: 1.4rem; padding: 5px; transition: transform 0.2s;
        }
        #cheatboard-close:hover { transform: scale(1.1); color: #ff6b81; }

        #cheatboard-content {
            padding: 20px;
            flex: 1;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 15px;
            padding-bottom: 80px; 
        }

        /* --- GRUPPI --- */
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
            width: 100%; /* Occupa tutto lo spazio */
        }
        
        /* --- INPUT --- */
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
            height: 40px; /* Altezza fissa uniforme */
            
            /* FLEX: 1 qui è importante per bilanciare input e bottoni */
            flex: 1; 
            min-width: 0; /* Previene overflow */
        }
        
        .cheat-input:focus { 
            border-color: #00ff9d; 
            outline: none; 
            box-shadow: 0 0 8px rgba(0, 255, 157, 0.2);
        }
        
        /* --- BOTTONI --- */
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
            display: flex; align-items: center; justify-content: center; gap: 8px;
            height: 40px; /* Stessa altezza degli input */
            transition: all 0.1s;
            
            /* LA MODIFICA CHIAVE PER DESKTOP: */
            flex: 1; 
        }
        
        .cheat-btn:hover { background: #333; border-color: #666; }
        .cheat-btn:active { transform: translateY(1px); }
        
        /* Varianti Colore */
        .cheat-btn.primary { border-color: #00ff9d; color: #00ff9d; background: rgba(0, 255, 157, 0.05); }
        .cheat-btn.primary:hover { background: rgba(0, 255, 157, 0.15); }
        
        .cheat-btn.danger { border-color: #ff4757; color: #ff4757; background: rgba(255, 71, 87, 0.05); }
        .cheat-btn.danger:hover { background: rgba(255, 71, 87, 0.15); }
        
        .cheat-btn.gold { border-color: #f1c40f; color: #f1c40f; background: rgba(241, 196, 15, 0.05); }
        .cheat-btn.gold:hover { background: rgba(241, 196, 15, 0.15); }

        /* Scrollbar sottile */
        #cheatboard-content::-webkit-scrollbar { width: 5px; }
        #cheatboard-content::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }

        /* --- MOBILE MEDIA QUERY (Invariato, ma essenziale) --- */
        @media only screen and (max-width: 768px) {
            #cheatboard-container {
                width: 92%; 
                max-width: none;
            }

            #cheatboard-handle {
                top: 140px;
                right: -35px;
                width: 35px;
                height: 40px;
                font-size: 1rem;
                background: rgba(20, 20, 20, 0.9);
                border-left: 1px solid #00ff9d;
            }

            .control-row { flex-wrap: wrap; }
            
            .cheat-input { 
                flex: 1 1 100%; 
                margin-bottom: 5px;
                height: 45px;
            }
            
            .cheat-btn { 
                flex: 1 1 100%; 
                height: 50px;
                font-size: 0.9rem;
            }
            
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
                    <input type="number" id="cheat-bugs-input" class="cheat-input" placeholder="Bugs" value="1000000">
                    <button id="btn-bugs-add" class="cheat-btn primary"><i class="fa-solid fa-plus"></i> Bug</button>
                </div>
                
                <div class="control-row">
                    <input type="number" id="cheat-tokens-input" class="cheat-input" placeholder="Token" value="100">
                    <button id="btn-tokens-add" class="cheat-btn gold"><i class="fa-solid fa-coins"></i> Token</button>
                </div>

                <div class="control-row">
                    <button id="btn-time-warp" class="cheat-btn"><i class="fa-solid fa-forward"></i> Skip 1h</button>
                </div>
            </div>

            <div class="cheat-group">
                <div class="cheat-group-title">Statistiche</div>
                
                <div class="control-row">
                    <input type="number" id="cheat-clicks-input" class="cheat-input" placeholder="Click" value="1000">
                    <button id="btn-clicks-add" class="cheat-btn">Agg. Click</button>
                </div>

                <div class="control-row">
                    <input type="number" id="cheat-bps-input" class="cheat-input" placeholder="BPS" value="1000">
                    <button id="btn-bps-add" class="cheat-btn">Bonus BPS</button>
                </div>
            </div>

            <div class="cheat-group">
                <div class="cheat-group-title">Eventi</div>
                
                <div class="control-row">
                    <input type="number" id="cheat-404-input" class="cheat-input" placeholder="x" value="5" style="width: 60px; flex: 0.5;">
                    <button id="btn-event-404" class="cheat-btn danger">404</button>
                    <button id="btn-event-rick" class="cheat-btn danger">Rick</button>
                </div>
                
                <div class="control-row">
                    <button id="btn-event-ricardo" class="cheat-btn danger">Ricardo Flex</button>
                </div>

                <div class="control-row">
                    <button id="btn-event-golden" class="cheat-btn gold"><i class="fa-solid fa-bug"></i> Golden Bug</button>
                </div>
                 <div class="control-row">
                    <button id="btn-reset-cooldown" class="cheat-btn"><i class="fa-solid fa-clock-rotate-left"></i> Reset CD</button>
                </div>
            </div>

            <div class="cheat-group">
                <div class="cheat-group-title">Sblocchi & Reset</div>
                
                <div class="control-row">
                    <button id="btn-unlock-skins" class="cheat-btn primary">Sblocca Skin</button>
                    <button id="btn-unlock-ach" class="cheat-btn primary">Sblocca Ach.</button>
                </div>
                <div class="control-row">
                    <button id="btn-lock-skins" class="cheat-btn danger">Blocca Skin</button>
                     <button id="btn-lock-ach" class="cheat-btn danger">Blocca Ach.</button>
                </div>
                <div class="control-row" style="margin-top: 10px;">
                    <button id="btn-hard-reset" class="cheat-btn danger" style="border: 1px solid red; color: red;"><i class="fa-solid fa-triangle-exclamation"></i> HARD RESET</button>
                </div>
            </div>

        </div>
    `;

    document.body.appendChild(container);

    // --- 4. Funzioni Helper ---
    const getVal = (id) => parseFloat(document.getElementById(id).value) || 0;
    const updateGame = () => { if (typeof updateUI === 'function') updateUI(); };
    const toast = (msg) => { if (window.EspooClicker) window.EspooClicker.showToast('<i class="fa-solid fa-terminal"></i> ' + msg, 'info'); };

    // --- 5. Event Listeners UI ---
    const handle = document.getElementById('cheatboard-handle');
    const closeBtn = document.getElementById('cheatboard-close');

    const togglePanel = () => container.classList.toggle('open');
    handle.addEventListener('click', togglePanel);
    closeBtn.addEventListener('click', togglePanel);

    // Scorciatoia Tastiera (CTRL+SHIFT+C)
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'C') togglePanel();
    });

    // --- 6. LOGICA BOTTONI ---

    // Aggiungi Bug
    document.getElementById('btn-bugs-add').addEventListener('click', () => {
        const val = getVal('cheat-bugs-input');
        gameState.score += val;
        gameState.totalScore += val;
        gameState.lifetimeScore += val;
        updateGame();
        toast(`Aggiunti ${val} Bug`);
    });

    // Aggiungi Token Lab
    document.getElementById('btn-tokens-add').addEventListener('click', () => {
        const val = getVal('cheat-tokens-input');
        gameState.prestigePoints += val;
        if (gameState.lifetimePrestigePoints !== undefined) gameState.lifetimePrestigePoints += val;
        if (typeof updatePrestigeUI === 'function') updatePrestigeUI();
        updateGame();
        toast(`Aggiunti ${val} Token Lab`);
    });

    // Salto Temporale (1 Ora)
    document.getElementById('btn-time-warp').addEventListener('click', () => {
        if (cookiesPerSecond <= 0) { toast("BPS è 0! Impossibile viaggiare."); return; }
        const seconds = 3600;
        const gain = cookiesPerSecond * seconds;
        gameState.score += gain;
        gameState.totalScore += gain;
        gameState.lifetimeScore += gain;
        gameState.totalPlayTime += seconds;
        updateGame();
        toast(`Salto Temporale! (+${window.EspooClicker ? window.EspooClicker.formatNumber(gain) : gain} Bug)`);
    });

    // Aggiungi Click
    document.getElementById('btn-clicks-add').addEventListener('click', () => {
        const val = getVal('cheat-clicks-input');
        gameState.totalClicks += val;
        updateGame();
        toast(`Aggiunti ${val} click manuali`);
    });

    // Aggiungi Bonus BPS (Temporaneo)
    document.getElementById('btn-bps-add').addEventListener('click', () => {
        const val = getVal('cheat-bps-input');
        window.cheatBPSBonus += val;
        if (typeof recalculateCPS === 'function') recalculateCPS();
        updateGame();
        toast(`Bonus BPS +${val} attivato`);
    });

    // --- Eventi ---

    // Evento 404
    document.getElementById('btn-event-404').addEventListener('click', () => {
        const mult = getVal('cheat-404-input');
        // Usa la funzione dispatcher per mantenere la sorpresa delle skin, 
        // oppure usa triggerGameEvent('bluescreen', mult) per forzare il 404 puro.
        if (typeof triggerBluescreen === 'function') {
            triggerBluescreen(mult);
            toast(`Evento avviato (x${mult})`);
        }
    });

    // Evento Rick Roll
    document.getElementById('btn-event-rick').addEventListener('click', () => {
        if (typeof triggerGameEvent === 'function') {
            triggerGameEvent('rickRoll');
        }
    });

    // Evento Ricardo
    document.getElementById('btn-event-ricardo').addEventListener('click', () => {
        if (typeof triggerGameEvent === 'function') {
            triggerGameEvent('ricardo');
        }
    });

    // Golden Bug
    document.getElementById('btn-event-golden').addEventListener('click', () => {
        if (typeof spawnGoldenBug === 'function') {
            spawnGoldenBug();
            toast("Golden Bug generato");
        } else {
            toast("Funzione spawnGoldenBug non trovata!");
        }
    });

    // Reset Cooldown
    document.getElementById('btn-reset-cooldown').addEventListener('click', () => {
        crunchTimeCooldownEnd = 0;
        if (typeof updateUI === 'function') updateUI();
        toast("Cooldown resettati!");
    });

    // --- Sblocchi & Reset ---

    // Sblocca Tutte le Skin
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

    // Blocca Skin (Reset alle default)
    document.getElementById('btn-lock-skins').addEventListener('click', () => {
        gameState.skins.unlocked = ['default'];
        gameState.skins.current = 'default';
        if (typeof applySkinVisuals === 'function') applySkinVisuals('default');
        if (window.EspooClicker) window.EspooClicker.saveGame();
        if (typeof updateSkinsUI === 'function') updateSkinsUI();
        updateGame();
        toast("Tutte le skin bloccate (tranne default).");
    });

    // Sblocca Obiettivi
    document.getElementById('btn-unlock-ach').addEventListener('click', () => {
        for (let key in gameData.achievements) {
            if (!gameState.achievements[key]) gameState.achievements[key] = {};
            gameState.achievements[key].unlocked = true;
            // Non le segniamo come claimed per permettere il riscatto
        }
        if (window.EspooClicker) window.EspooClicker.saveGame();
        if (typeof updateAchievementsUI === 'function') updateAchievementsUI();
        toast("Tutti gli obiettivi sbloccati!");
    });

    // Blocca Obiettivi
    document.getElementById('btn-lock-ach').addEventListener('click', () => {
        for (let key in gameData.achievements) {
            if (gameState.achievements[key]) {
                gameState.achievements[key].unlocked = false;
                gameState.achievements[key].claimed = false;
                gameState.achievements[key].unlockTime = 0;
            }
        }
        if (window.EspooClicker) window.EspooClicker.saveGame();
        if (typeof updateAchievementsUI === 'function') updateAchievementsUI();
        toast("Tutti gli obiettivi bloccati.");
    });

    // Hard Reset (Senza Password - Dev Only)
    document.getElementById('btn-hard-reset').addEventListener('click', () => {
        if (!confirm("⚠️ RESET TOTALE DEV MODE? ⚠️\nCancella tutto senza password e ricarica.")) return;

        // 1. Reset RAM
        if (typeof resetGameToDefault === 'function') {
            const tempUser = gameState.user.username; // Mantiene username per comodità
            resetGameToDefault();
            gameState.user.username = tempUser;
        }

        // 2. Forza Salvataggio Immediato (Sovrascrive il cloud con dati vuoti)
        // Usa la password già in memoria nella sessione
        if (window.EspooClicker) {
            window.EspooClicker.saveGame().then(() => {
                location.reload();
            });
        } else {
            // Fallback se l'API non è pronta
            localStorage.removeItem('espotoolClickerSaveV8');
            location.reload();
        }
    });

})();