(function () {
    // --- 0. Global Cheat State ---
    window.cheatBPSBonus = 0;

    // --- 1. Hook into Game Logic ---
    // We wrap recalculateCPS to add our cheat bonus
    const originalRecalculateCPS = window.recalculateCPS || function () { };

    window.recalculateCPS = function () {
        // Run original logic to get the "natural" CPS
        originalRecalculateCPS();

        // Apply cheat bonus
        if (typeof cookiesPerSecond !== 'undefined') {
            cookiesPerSecond += window.cheatBPSBonus;
            // Ensure it doesn't go negative
            if (cookiesPerSecond < 0) cookiesPerSecond = 0;
        }

        // Update UI (cpsDisplay is global)
        if (typeof cpsDisplay !== 'undefined' && cpsDisplay) {
            // We rely on the game loop or original function to update text, 
            // but we can force it here if needed. 
            // The original function usually updates the variable, and gameLoop updates UI.
        }
    };

    // --- 2. Define CSS Styles ---
    const styles = `
        /* Cheatboard Container */
        #cheatboard-container {
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 350px; /* Increased height for more controls */
            background-color: rgba(20, 20, 20, 0.98);
            backdrop-filter: blur(10px);
            border-top: 1px solid rgba(0, 212, 255, 0.3);
            box-shadow: 0 -5px 30px rgba(0, 0, 0, 0.8);
            z-index: 99999; /* Very high z-index */
            transform: translateY(100%); /* Hidden by default */
            transition: transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
            color: #fff;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            display: flex;
            flex-direction: column;
        }

        /* Open State */
        #cheatboard-container.open {
            transform: translateY(0);
        }

        /* Toggle Handle/Tab */
        #cheatboard-handle {
            position: absolute;
            top: -30px;
            left: 50%;
            transform: translateX(-50%);
            width: 140px;
            height: 30px;
            background-color: rgba(20, 20, 20, 0.98);
            border-radius: 12px 12px 0 0;
            border-top: 1px solid rgba(0, 212, 255, 0.3);
            border-left: 1px solid rgba(0, 212, 255, 0.3);
            border-right: 1px solid rgba(0, 212, 255, 0.3);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 -5px 15px rgba(0, 0, 0, 0.5);
            transition: background-color 0.2s;
            color: #00d4ff;
            font-weight: bold;
            font-size: 0.8rem;
            letter-spacing: 1px;
        }

        #cheatboard-handle:hover {
            background-color: rgba(40, 40, 40, 1);
            color: #fff;
        }

        /* Content Area */
        #cheatboard-content {
            padding: 20px;
            flex: 1;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

        #cheatboard-title {
            font-size: 1.4rem;
            font-weight: 800;
            color: #00d4ff;
            text-transform: uppercase;
            letter-spacing: 2px;
            border-bottom: 2px solid rgba(0, 212, 255, 0.2);
            padding-bottom: 10px;
            margin-bottom: 10px;
            text-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
        }

        /* Control Rows */
        .cheat-row {
            display: flex;
            align-items: center;
            gap: 15px;
            background: rgba(255, 255, 255, 0.03);
            padding: 15px;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .cheat-label {
            width: 100px;
            font-weight: bold;
            color: #aaa;
            font-size: 1rem;
        }

        .cheat-input {
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: #fff;
            padding: 8px 12px;
            border-radius: 4px;
            width: 150px;
            font-family: monospace;
            font-size: 1.1rem;
        }
        
        .cheat-input:focus {
            outline: none;
            border-color: #00d4ff;
            box-shadow: 0 0 5px rgba(0, 212, 255, 0.5);
        }

        .cheat-btn {
            background: linear-gradient(135deg, #2c3e50, #34495e);
            border: none;
            color: #fff;
            padding: 8px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            transition: all 0.2s;
            text-transform: uppercase;
            font-size: 0.85rem;
            min-width: 80px;
        }

        .cheat-btn:hover {
            background: linear-gradient(135deg, #34495e, #2c3e50);
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        }

        .cheat-btn:active {
            transform: translateY(0);
        }
        
        .cheat-btn.set-btn {
            background: linear-gradient(135deg, #c0392b, #e74c3c);
        }
        
        .cheat-btn.set-btn:hover {
            background: linear-gradient(135deg, #e74c3c, #c0392b);
        }

        /* Scrollbar */
        #cheatboard-content::-webkit-scrollbar {
            width: 8px;
        }
        #cheatboard-content::-webkit-scrollbar-track {
            background: rgba(0,0,0,0.2);
        }
        #cheatboard-content::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,0.2);
            border-radius: 4px;
        }
        #cheatboard-content::-webkit-scrollbar-thumb:hover {
            background: rgba(255,255,255,0.3);
        }
    `;

    // 3. Inject CSS
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    // 4. Create HTML Structure
    const container = document.createElement('div');
    container.id = 'cheatboard-container';

    const handle = document.createElement('div');
    handle.id = 'cheatboard-handle';
    handle.innerText = 'CHEAT BOARD';

    const content = document.createElement('div');
    content.id = 'cheatboard-content';

    content.innerHTML = `
        <div id="cheatboard-title">Admin Console</div>
        
        <!-- Bugs Control -->
        <div class="cheat-row">
            <div class="cheat-label">BUGS</div>
            <input type="number" id="cheat-bugs-input" class="cheat-input" placeholder="Amount" min="0" value="0">
            <button id="btn-bugs-add" class="cheat-btn">Add</button>
            <button id="btn-bugs-set" class="cheat-btn set-btn">Set</button>
        </div>

        <!-- Clicks Control -->
        <div class="cheat-row">
            <div class="cheat-label">CLICKS</div>
            <input type="number" id="cheat-clicks-input" class="cheat-input" placeholder="Amount" min="0" value="0">
            <button id="btn-clicks-add" class="cheat-btn">Add</button>
            <button id="btn-clicks-set" class="cheat-btn set-btn">Set</button>
        </div>

        <!-- BPS Control -->
        <div class="cheat-row">
            <div class="cheat-label">BPS</div>
            <input type="number" id="cheat-bps-input" class="cheat-input" placeholder="Amount" min="0" value="0">
            <button id="btn-bps-add" class="cheat-btn">Add</button>
            <button id="btn-bps-set" class="cheat-btn set-btn">Set</button>
        </div>

        <!-- Events Control -->
        <div class="cheat-row">
            <div class="cheat-label">EVENTS</div>
            <div style="display: flex; gap: 5px;">
                <input type="number" id="cheat-404-input" class="cheat-input" placeholder="Mult (404)" value="2" min="1" max="5" style="width: 140px; background: #e74c3c;">
                <button id="btn-event-404" class="cheat-btn" style="background: #e74c3c;">Trigger 404</button>
            </div>
            <button id="btn-event-golden" class="cheat-btn" style="background: #f1c40f; color: #000;">Golden Bug</button>
        </div>


    `;

    container.appendChild(handle);
    container.appendChild(content);
    document.body.appendChild(container);

    // 5. Helpers
    function getVal(id) {
        const val = parseFloat(document.getElementById(id).value);
        return isNaN(val) ? 0 : val;
    }

    function updateGameUI() {
        if (typeof updateUI === 'function') updateUI();
    }

    // 6. Event Listeners

    // Toggle Panel
    handle.addEventListener('click', () => {
        container.classList.toggle('open');
    });

    // Keyboard Shortcut
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'C') {
            container.classList.toggle('open');
        }
    });

    // --- EVENTS Logic ---
    document.getElementById('btn-event-404').addEventListener('click', () => {
        if (typeof triggerBluescreen === 'function') {
            let mult = getVal('cheat-404-input');
            if (mult === 0) mult = 404; // Default if empty or 0
            triggerBluescreen(mult);
            console.log(`[Cheat] Triggered 404 Bluescreen with multiplier ${mult}.`);
        } else {
            console.error('[Cheat] triggerBluescreen function not found.');
        }
    });

    document.getElementById('btn-event-golden').addEventListener('click', () => {
        if (typeof spawnGoldenBug === 'function') {
            spawnGoldenBug();
            console.log('[Cheat] Spawned Golden Bug.');
        } else {
            console.error('[Cheat] spawnGoldenBug function not found.');
        }
    });



    // --- BUGS Logic ---
    document.getElementById('btn-bugs-add').addEventListener('click', () => {
        if (typeof gameState !== 'undefined') {
            const val = getVal('cheat-bugs-input');
            gameState.score += val;
            gameState.totalScore += val;
            gameState.lifetimeScore += val;
            updateGameUI();
            console.log(`[Cheat] Added ${val} bugs.`);
        }
    });

    document.getElementById('btn-bugs-set').addEventListener('click', () => {
        if (typeof gameState !== 'undefined') {
            const val = getVal('cheat-bugs-input');
            // Calculate difference to update stats correctly
            const diff = val - gameState.score;

            gameState.score = val;
            gameState.totalScore += diff;
            gameState.lifetimeScore += diff;

            updateGameUI();
            console.log(`[Cheat] Set bugs to ${val} (Diff: ${diff}).`);
        }
    });

    // --- CLICKS Logic ---
    document.getElementById('btn-clicks-add').addEventListener('click', () => {
        if (typeof gameState !== 'undefined') {
            const val = getVal('cheat-clicks-input');
            gameState.totalClicks += val;
            updateGameUI();
            console.log(`[Cheat] Added ${val} clicks.`);
        }
    });

    document.getElementById('btn-clicks-set').addEventListener('click', () => {
        if (typeof gameState !== 'undefined') {
            const val = getVal('cheat-clicks-input');
            gameState.totalClicks = val;
            updateGameUI();
            console.log(`[Cheat] Set clicks to ${val}.`);
        }
    });

    // --- BPS Logic ---
    document.getElementById('btn-bps-add').addEventListener('click', () => {
        const val = getVal('cheat-bps-input');
        window.cheatBPSBonus += val;
        if (typeof recalculateCPS === 'function') recalculateCPS();
        updateGameUI();
        console.log(`[Cheat] Added ${val} to BPS bonus.`);
    });

    document.getElementById('btn-bps-set').addEventListener('click', () => {
        const val = getVal('cheat-bps-input');
        // To set BPS to X, we need to know the "natural" BPS.
        // We can temporarily reset bonus to 0, calc, then set bonus.
        const oldBonus = window.cheatBPSBonus;
        window.cheatBPSBonus = 0;
        if (typeof recalculateCPS === 'function') recalculateCPS(); // This sets cookiesPerSecond to natural

        const naturalCPS = cookiesPerSecond;
        window.cheatBPSBonus = val - naturalCPS;

        if (typeof recalculateCPS === 'function') recalculateCPS(); // Re-apply with new bonus
        updateGameUI();
        console.log(`[Cheat] Set BPS to ${val} (Bonus: ${window.cheatBPSBonus}).`);
    });

    // --- Auto-Close Logic ---
    document.querySelectorAll('.cheat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            container.classList.remove('open');
        });
    });

})();
