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

    // --- 2. Stili (Sidebar Mobile Optimized & Touch Friendly) ---
    const styles = `
        #cheatboard-container {
            position: fixed;
            top: 0;
            left: 0;
            /* Larghezza dinamica: 85% dello schermo su mobile, max 320px su desktop */
            width: min(85vw, 320px);
            height: 100vh; /* Tutta l'altezza */
            background-color: rgba(10, 10, 18, 0.98); /* Sfondo molto scuro */
            backdrop-filter: blur(12px);
            border-right: 2px solid #00ff9d;
            box-shadow: 10px 0 40px rgba(0, 255, 157, 0.15);
            z-index: 99999; /* Sopra a tutto */
            transform: translateX(-100%); /* Nascosto a sinistra di default */
            transition: transform 0.3s cubic-bezier(0.25, 1, 0.5, 1);
            color: #e0e0e0;
            font-family: 'Consolas', 'Monaco', monospace;
            display: flex;
            flex-direction: column;
        }

        #cheatboard-container.open {
            transform: translateX(0); /* Mostra */
        }

        /* Linguetta (Trigger Laterale) - Grande per il dito */
        #cheatboard-handle {
            position: absolute;
            top: 20%; /* Posizione ergonomica */
            right: -40px; /* Esce a destra del pannello */
            width: 40px;  /* Più largo per facilitare il tocco */
            height: 120px; /* Più lungo */
            background: #00ff9d;
            color: #000;
            border-radius: 0 12px 12px 0;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            writing-mode: vertical-rl; /* Testo verticale */
            text-orientation: mixed;
            font-weight: 900;
            font-size: 0.8rem;
            letter-spacing: 2px;
            box-shadow: 4px 0 15px rgba(0, 255, 157, 0.4);
            transition: right 0.2s;
        }
        
        #cheatboard-handle:active {
            right: -35px; /* Feedback visivo al tocco */
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
            font-size: 1rem; 
            font-weight: bold; 
            color: #00ff9d; 
            display: flex;
            align-items: center;
            gap: 10px;
        }

        #cheatboard-close { 
            cursor: pointer; 
            color: #ff4757; 
            font-size: 1.5rem; /* X più grande */
            padding: 5px;
        }

        /* Griglia Contenuto */
        #cheatboard-content {
            padding: 15px;
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
            display: flex;
            flex-direction: column;
            gap: 15px;
            /* Padding extra in fondo per non coprire l'ultimo elemento su mobile (dietro navbar browser) */
            padding-bottom: 100px; 
        }

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
            font-size: 0.75rem; 
            color: #888; 
            text-transform: uppercase; 
            margin-bottom: 5px; 
            font-weight: 700;
        }
        
        .control-row { 
            display: flex; 
            gap: 8px; 
            align-items: center;
            flex-wrap: wrap; /* Fondamentale su schermi stretti per mandare a capo se serve */
        }
        
        /* Input ottimizzati per mobile */
        .cheat-input {
            background: rgba(0, 0, 0, 0.4);
            border: 1px solid #444;
            color: #fff;
            padding: 10px; /* Più spazio per digitare */
            border-radius: 6px;
            flex: 1;
            font-size: 1rem; /* Font 16px evita lo zoom automatico su iOS */
            min-width: 60px;
        }
        
        .cheat-input:focus {
            border-color: #00ff9d;
            outline: none;
        }
        
        /* Bottoni ottimizzati per il tocco */
        .cheat-btn {
            background: #2c3e50;
            border: 1px solid #34495e;
            color: #fff;
            padding: 12px 15px; /* Area di tocco generosa */
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
            font-size: 0.85rem;
            text-transform: uppercase;
            text-align: center;
            white-space: nowrap;
            flex-grow: 1; /* Si espandono per riempire la riga */
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }
        
        .cheat-btn:active {
            transform: scale(0.96);
        }
        
        .cheat-btn.primary { background: rgba(0, 255, 157, 0.15); border-color: #00ff9d; color: #00ff9d; }
        .cheat-btn.danger { background: rgba(255, 71, 87, 0.15); border-color: #ff4757; color: #ff4757; }
        .cheat-btn.gold { background: rgba(241, 196, 15, 0.15); border-color: #f1c40f; color: #f1c40f; }

        /* Scrollbar personalizzata sottile */
        #cheatboard-content::-webkit-scrollbar { width: 4px; }
        #cheatboard-content::-webkit-scrollbar-track { background: #111; }
        #cheatboard-content::-webkit-scrollbar-thumb { background: #444; border-radius: 4px; }
    `;

    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    // --- 3. Struttura HTML ---
    const container = document.createElement('div');
    container.id = 'cheatboard-container';

    container.innerHTML = `
        <div id="cheatboard-handle">DEV TOOLS</div>
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
        if (typeof triggerBluescreen === 'function') {
            triggerBluescreen(mult);
            toast(`Evento 404 avviato (x${mult})`);
        }
    });

    // Evento Rick Roll
    document.getElementById('btn-event-rick').addEventListener('click', () => {
        if (typeof triggerRickRoll === 'function') {
            triggerRickRoll(3);
            toast("Rick Roll avviato!");
        }
    });

    // Evento Ricardo
    document.getElementById('btn-event-ricardo').addEventListener('click', () => {
        if (typeof triggerRicardoEvent === 'function') {
            triggerRicardoEvent();
            toast("Ricardo Flex avviato!");
        } else {
            toast("Funzione triggerRicardoEvent non trovata!");
        }
    });

    // Golden Bug
    document.getElementById('btn-event-golden').addEventListener('click', () => {
        if (typeof spawnGoldenBug === 'function') {
            spawnGoldenBug();
            toast("Golden Bug generato");
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