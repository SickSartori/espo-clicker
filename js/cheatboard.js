(function () {
    // --- 0. Stato Globale Cheat ---
    window.cheatBPSBonus = 0;

    // --- 1. Hook nella Logica di Gioco ---
    const originalRecalculateCPS = window.recalculateCPS || function () { };

    window.recalculateCPS = function () {
        originalRecalculateCPS();
        if (typeof cookiesPerSecond !== 'undefined') {
            cookiesPerSecond += window.cheatBPSBonus;
            if (cookiesPerSecond < 0) cookiesPerSecond = 0;
        }
    };

    // --- 2. Stili (UI Moderna Dark/Neon) ---
    const styles = `
        #cheatboard-container {
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 400px;
            background-color: rgba(15, 15, 20, 0.98);
            backdrop-filter: blur(15px);
            border-top: 2px solid #00ff9d;
            box-shadow: 0 -10px 40px rgba(0, 255, 157, 0.1);
            z-index: 99999;
            transform: translateY(100%);
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            color: #e0e0e0;
            font-family: 'Consolas', 'Monaco', monospace;
            display: flex;
            flex-direction: column;
        }

        #cheatboard-container.open {
            transform: translateY(0);
        }

        /* Linguetta */
        #cheatboard-handle {
            position: absolute;
            top: -35px;
            left: 50%;
            transform: translateX(-50%);
            width: 160px;
            height: 35px;
            background: #00ff9d; /* Neon Green */
            color: #000;
            border-radius: 8px 8px 0 0;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: 0.9rem;
            letter-spacing: 1px;
            box-shadow: 0 -5px 15px rgba(0, 255, 157, 0.3);
            transition: top 0.2s;
        }
        
        #cheatboard-handle:hover {
            top: -40px; /* Piccolo effetto hover */
        }

        #cheatboard-header {
            padding: 15px 20px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(0,0,0,0.2);
        }

        #cheatboard-title {
            font-size: 1.2rem;
            font-weight: bold;
            color: #00ff9d;
            text-transform: uppercase;
        }

        #cheatboard-close {
            cursor: pointer;
            color: #ff4757;
            font-weight: bold;
            font-size: 1.2rem;
        }

        /* Griglia Contenuto */
        #cheatboard-content {
            padding: 20px;
            flex: 1;
            overflow-y: auto;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); /* Griglia Responsiva */
            gap: 20px;
            align-content: start;
        }

        /* Cards/Gruppi */
        .cheat-group {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            padding: 15px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .cheat-group-title {
            font-size: 0.8rem;
            color: #888;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 5px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            padding-bottom: 5px;
        }

        /* Controlli */
        .control-row {
            display: flex;
            gap: 10px;
            align-items: center;
            flex-wrap: wrap; /* Permette a più bottoni di andare a capo */
        }

        .cheat-input {
            background: rgba(0, 0, 0, 0.4);
            border: 1px solid #333;
            color: #fff;
            padding: 8px;
            border-radius: 4px;
            flex: 1;
            font-family: monospace;
            min-width: 60px;
        }
        
        .cheat-input:focus {
            border-color: #00ff9d;
            outline: none;
        }

        .cheat-btn {
            background: #2c3e50;
            border: 1px solid #34495e;
            color: #fff;
            padding: 8px 15px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            font-size: 0.8rem;
            transition: all 0.2s;
            text-transform: uppercase;
            flex-grow: 1; /* I bottoni si allargano */
            text-align: center;
        }

        .cheat-btn:hover {
            background: #34495e;
            border-color: #5dade2;
        }

        .cheat-btn.primary { background: rgba(0, 255, 157, 0.1); border-color: #00ff9d; color: #00ff9d; }
        .cheat-btn.primary:hover { background: rgba(0, 255, 157, 0.2); }

        .cheat-btn.danger { background: rgba(255, 71, 87, 0.1); border-color: #ff4757; color: #ff4757; }
        .cheat-btn.danger:hover { background: rgba(255, 71, 87, 0.2); }
        
        .cheat-btn.gold { background: rgba(241, 196, 15, 0.1); border-color: #f1c40f; color: #f1c40f; }
        .cheat-btn.gold:hover { background: rgba(241, 196, 15, 0.2); }

        /* Scrollbar */
        #cheatboard-content::-webkit-scrollbar { width: 8px; }
        #cheatboard-content::-webkit-scrollbar-track { background: #111; }
        #cheatboard-content::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
    `;

    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    // 3. Struttura HTML
    const container = document.createElement('div');
    container.id = 'cheatboard-container';

    container.innerHTML = `
        <div id="cheatboard-handle">CONSOLE ADMIN</div>
        <div id="cheatboard-header">
            <span id="cheatboard-title"><i class="fa-solid fa-screwdriver-wrench"></i> Strumenti Sviluppatore v3.1</span>
            <span id="cheatboard-close">✕</span>
        </div>
        <div id="cheatboard-content">
            
            <div class="cheat-group">
                <div class="cheat-group-title">Economia</div>
                
                <div class="control-row">
                    <input type="number" id="cheat-bugs-input" class="cheat-input" placeholder="Quantità Bug" value="1000000">
                    <button id="btn-bugs-add" class="cheat-btn primary">Agg. Bug</button>
                </div>
                
                <div class="control-row">
                    <input type="number" id="cheat-tokens-input" class="cheat-input" placeholder="Token Lab" value="100">
                    <button id="btn-tokens-add" class="cheat-btn gold">Agg. Token</button>
                </div>

                <div class="control-row">
                    <button id="btn-time-warp" class="cheat-btn">⏩ Salto Temporale (1h)</button>
                </div>
            </div>

            <div class="cheat-group">
                <div class="cheat-group-title">Statistiche</div>
                
                <div class="control-row">
                    <input type="number" id="cheat-clicks-input" class="cheat-input" placeholder="Click" value="1000">
                    <button id="btn-clicks-add" class="cheat-btn">Agg. Click</button>
                </div>

                <div class="control-row">
                    <input type="number" id="cheat-bps-input" class="cheat-input" placeholder="Bonus BPS" value="1000">
                    <button id="btn-bps-add" class="cheat-btn">Agg. BPS</button>
                </div>
            </div>

            <div class="cheat-group">
                <div class="cheat-group-title">Eventi & Test</div>
                
                <div class="control-row">
                    <input type="number" id="cheat-404-input" class="cheat-input" placeholder="Molt." value="3" style="width: 50px;">
                    <button id="btn-event-404" class="cheat-btn danger">Avvia 404</button>
                </div>
                
                <div class="control-row">
                    <button id="btn-event-rick" class="cheat-btn danger">Rick Roll</button>
                    <button id="btn-event-ricardo" class="cheat-btn danger">Ricardo</button>
                </div>

                <div class="control-row">
                    <button id="btn-event-golden" class="cheat-btn gold">Genera Golden Bug</button>
                    <button id="btn-reset-cooldown" class="cheat-btn">Resetta Cooldown</button>
                </div>
            </div>

            <div class="cheat-group">
                <div class="cheat-group-title">Sblocchi & Reset</div>
                
                <div class="control-row">
                    <button id="btn-unlock-skins" class="cheat-btn primary">Sblocca Skin</button>
                    <button id="btn-lock-skins" class="cheat-btn danger">Blocca Skin</button>
                </div>
                <div class="control-row">
                    <button id="btn-unlock-ach" class="cheat-btn primary">Sblocca Ach.</button>
                    <button id="btn-lock-ach" class="cheat-btn danger">Blocca Ach.</button>
                </div>
                <div class="control-row" style="margin-top: 10px;">
                    <button id="btn-hard-reset" class="cheat-btn danger" style="border: 1px solid red; color: red;"><i class="fa-solid fa-triangle-exclamation"></i> HARD RESET</button>
                </div>
            </div>

        </div>
    `;

    document.body.appendChild(container);

    // 4. Funzioni Helper
    const getVal = (id) => parseFloat(document.getElementById(id).value) || 0;
    const updateGame = () => { if (typeof updateUI === 'function') updateUI(); };
    const toast = (msg) => { if (window.EspooClicker) window.EspooClicker.showToast('<i class="fa-solid fa-screwdriver-wrench"></i> ' + msg, 'info'); };

    // 5. Event Listeners
    const handle = document.getElementById('cheatboard-handle');
    const closeBtn = document.getElementById('cheatboard-close');

    const togglePanel = () => container.classList.toggle('open');
    handle.addEventListener('click', togglePanel);
    closeBtn.addEventListener('click', togglePanel);

    // Scorciatoia CTRL+SHIFT+C
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'C') togglePanel();
    });

    // --- LOGICA BOTTONI ---

    // Bugs
    document.getElementById('btn-bugs-add').addEventListener('click', () => {
        const val = getVal('cheat-bugs-input');
        gameState.score += val;
        gameState.totalScore += val;
        gameState.lifetimeScore += val;
        updateGame();
        toast(`Aggiunti ${val} Bug`);
    });

    document.getElementById('btn-lock-skins').addEventListener('click', () => {
        // Mantiene solo la skin di default
        gameState.skins.unlocked = ['default'];
        gameState.skins.current = 'default';

        // Applica visivamente
        if (typeof applySkinVisuals === 'function') applySkinVisuals('default');

        // Salva
        if (window.EspooClicker) window.EspooClicker.saveGame();
        updateGame();
        toast("Tutte le skin bloccate (tranne default).");
    });

    // --- NUOVA LOGICA: BLOCCA OBIETTIVI ---
    document.getElementById('btn-lock-ach').addEventListener('click', () => {
        for (let key in gameData.achievements) {
            if (gameState.achievements[key]) {
                gameState.achievements[key].unlocked = false;
                gameState.achievements[key].claimed = false;
                gameState.achievements[key].unlockTime = 0;
            }
        }
        if (window.EspooClicker) window.EspooClicker.saveGame();
        updateGame();
        toast("Tutti gli obiettivi bloccati.");
    });

    // --- NUOVA LOGICA: HARD RESET (Senza Password) ---
    document.getElementById('btn-hard-reset').addEventListener('click', () => {
        if (!confirm("Reset COMPLETO dei progressi? (Dev Mode)")) return;

        // 1. Resetta lo stato in memoria usando la funzione globale
        if (typeof resetGameToDefault === 'function') {
            resetGameToDefault();
            // Mantieni il nome utente attuale però
            const currentUser = sessionStorage.getItem('espooUser') || 'Dev';
            gameState.user.username = currentUser;
        }

        // 2. Forza il salvataggio immediato (sovrascrive il cloud con dati vuoti)
        // Usa la password già in memoria nella sessione, quindi non la chiede.
        if (window.EspooClicker) {
            window.EspooClicker.saveGame().then(() => {
                location.reload();
            });
        } else {
            localStorage.removeItem('espotoolClickerSaveV8');
            location.reload();
        }
    });

    // Tokens (Prestige)
    document.getElementById('btn-tokens-add').addEventListener('click', () => {
        const val = getVal('cheat-tokens-input');
        gameState.prestigePoints += val;
        if (gameState.lifetimePrestigePoints !== undefined) gameState.lifetimePrestigePoints += val;
        if (typeof updatePrestigeUI === 'function') updatePrestigeUI();
        updateGame();
        toast(`Aggiunti ${val} Token Lab`);
    });

    // Time Warp (1 Ora)
    document.getElementById('btn-time-warp').addEventListener('click', () => {
        if (cookiesPerSecond <= 0) { toast("BPS è 0! Impossibile viaggiare."); return; }
        const seconds = 3600;
        const gain = cookiesPerSecond * seconds;
        gameState.score += gain;
        gameState.totalScore += gain;
        gameState.lifetimeScore += gain;
        gameState.totalPlayTime += seconds;
        updateGame();
        toast(`Salto Temporale! (+${formatNumber(gain)} Bug)`);
    });

    // Clicks
    document.getElementById('btn-clicks-add').addEventListener('click', () => {
        const val = getVal('cheat-clicks-input');
        gameState.totalClicks += val;
        updateGame();
        toast(`Aggiunti ${val} click manuali`);
    });

    // BPS Bonus
    document.getElementById('btn-bps-add').addEventListener('click', () => {
        const val = getVal('cheat-bps-input');
        window.cheatBPSBonus += val;
        if (typeof recalculateCPS === 'function') recalculateCPS();
        updateGame();
        toast(`Bonus BPS +${val} attivato`);
    });

    // Eventi
    document.getElementById('btn-event-404').addEventListener('click', () => {
        const mult = getVal('cheat-404-input');
        if (typeof triggerBluescreen === 'function') {
            triggerBluescreen(mult);
            toast(`Evento 404 avviato (x${mult})`);
        }
    });

    document.getElementById('btn-event-rick').addEventListener('click', () => {
        if (typeof triggerRickRoll === 'function') {
            triggerRickRoll(3);
            toast("Rick Roll avviato!");
        }
    });

    // --- NUOVO: TRIGGER RICARDO ---
    document.getElementById('btn-event-ricardo').addEventListener('click', () => {
        if (typeof triggerRicardoEvent === 'function') {
            triggerRicardoEvent();
            toast("Ricardo Flex avviato!");
        } else {
            toast("Funzione triggerRicardoEvent non trovata!");
        }
    });

    document.getElementById('btn-event-golden').addEventListener('click', () => {
        if (typeof spawnGoldenBug === 'function') {
            spawnGoldenBug();
            toast("Golden Bug generato");
        }
    });

    document.getElementById('btn-reset-cooldown').addEventListener('click', () => {
        crunchTimeCooldownEnd = 0;
        if (typeof updateUI === 'function') updateUI();
        toast("Cooldown resettati!");
    });

    // Sblocca Tutto
    document.getElementById('btn-unlock-skins').addEventListener('click', () => {
        for (let key in gameData.skins) {
            if (!gameState.skins.unlocked.includes(key)) {
                gameState.skins.unlocked.push(key);
            }
        }
        if (typeof updateSkinsUI === 'function') updateSkinsUI();
        toast("Tutte le skin sbloccate!");
    });

    document.getElementById('btn-unlock-ach').addEventListener('click', () => {
        for (let key in gameData.achievements) {
            if (!gameState.achievements[key]) gameState.achievements[key] = {};
            gameState.achievements[key].unlocked = true;
        }
        if (typeof updateAchievementsUI === 'function') updateAchievementsUI();
        toast("Tutti gli obiettivi sbloccati!");
    });

})();