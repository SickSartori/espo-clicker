(function () {
    // =====================================================================
    //  ADMIN CONSOLE / CHEATBOARD  (dev-only — rimossa in produzione)
    //  Layout: cruscotto live fisso in alto + tab a colori + ricerca.
    //  Ogni sezione ha un colore-firma (vedi TABS) per orientarsi a colpo
    //  d'occhio. I nomi dei bottoni sono "parlanti".
    // =====================================================================

    // --- 0. Stato Globale Cheat + Hook BPS ---
    window.cheatBPSBonus = new Decimal(0);
    const originalRecalculateCPS = window.recalculateCPS || function () { };
    window.recalculateCPS = function () {
        originalRecalculateCPS();
        if (typeof bps !== 'undefined') {
            if (!(bps instanceof Decimal)) bps = new Decimal(bps || 0);
            bps = bps.add(window.cheatBPSBonus);
            if (bps.lt(0)) bps = new Decimal(0);
        }
    };

    // Colori-firma delle sezioni
    const TABS = [
        { id: 'risorse',  label: 'Risorse',  icon: 'fa-coins',               color: '#00ff9d' },
        { id: 'prestige', label: 'Prestige', icon: 'fa-rocket',              color: '#f1c40f' },
        { id: 'eventi',   label: 'Eventi',   icon: 'fa-bolt',               color: '#e67e22' },
        { id: 'scenari',  label: 'Scenari',  icon: 'fa-layer-group',        color: '#b27ad6' },
        { id: 'sistema',  label: 'Sistema',  icon: 'fa-screwdriver-wrench', color: '#ff5566' }
    ];

    // --- i18n cheat (dev-only): overlay EN via window.APP_LANG. Mappa frasi IT->EN
    //     applicata all'HTML del pannello e ai toast. 'it' = default (nessuna mappa).
    //     Le valute (Bug/Token/Q-bits) restano invariate anche in EN. ---
    const CB_EN = (window.APP_LANG === 'en');
    const CB_MAP = !CB_EN ? [] : [
        ['>Risorse<', '>Resources<'], ['>Eventi<', '>Events<'], ['>Scenari<', '>Scenarios<'], ['>Sistema<', '>System<'],
        ['>Livello<', '>Level<'], ['>Gain ora<', '>Gain/h<'], ['>Soglia<', '>Threshold<'], ['>Prossimo prestige<', '>Next prestige<'],
        ['>Controllo<', '>Control<'], ['>Sblocchi<', '>Unlocks<'],
        ['Aggiungi valute', 'Add currencies'], ['Aggiungi Bug', 'Add Bugs'], ['Aggiungi Token', 'Add Tokens'], ['Aggiungi Q-bits', 'Add Q-bits'],
        ['Imposta valore esatto', 'Set exact value'], ['Imposta Score', 'Set Score'], ['Imposta Token', 'Set Tokens'], ['Imposta Q-bits', 'Set Q-bits'],
        ['Aggiungi Click', 'Add Clicks'], ['Azzera Bonus BPS', 'Reset BPS Bonus'], ['Risorse casuali (Chaos)', 'Random resources (Chaos)'],
        ['Livello & Formattazione', 'Level & Format'], ['Vai al Livello', 'Go to Level'], ['Imposta Formattazioni', 'Set Formats'],
        ['Scorciatoie progressione', 'Progression shortcuts'], ['Rendi Prestige pronto', 'Make Prestige ready'], ['Lab al massimo', 'Max out Lab'],
        ['Pronto Formattazione (NG+)', 'Format ready (NG+)'], ['Aggiungi 1 Formattazione', 'Add 1 Format'],
        ['Errore 404', 'Error 404'], ['Video meme', 'Meme videos'], ['Attiva Espo Fury', 'Activate Espo Fury'], ['Azzera Cooldown', 'Reset Cooldown'],
        ['Ferma evento in corso', 'Stop current event'],
        ['Carica uno stato di test', 'Load a test state'], ['Nuovo giocatore', 'New player'], ['Stato pulito, early game', 'Clean state, early game'],
        ['Pronto 1° Prestige', 'Ready for 1st Prestige'], ['Score appena sopra soglia · Liv 0', 'Score just above threshold · Lv 0'],
        ['≈ Liv 5 · team e token medi', '≈ Lv 5 · medium teams & tokens'], ['Endgame / pre-Formattazione', 'Endgame / pre-Format'],
        ['Liv 25 · Q-bits · NG+ ready', 'Lv 25 · Q-bits · NG+ ready'], ['Punto bilanciamento', 'Balance point'],
        ['Liv 3 "Medio" · score 0, osserva il ritmo', 'Lv 3 "Medium" · score 0, watch the pace'],
        ['Sblocca Negozio', 'Unlock Shop'], ['Blocca Negozio', 'Lock Shop'], ['Sblocca Skin', 'Unlock Skins'], ['Blocca Skin', 'Lock Skins'],
        ['Sblocca Obiettivi', 'Unlock Achievements'], ['Blocca Obiettivi', 'Lock Achievements'], ['+100 a tutti i Team', '+100 to all Teams'],
        ['Onnipotenza', 'Omnipotence'], ['Stampa Stato', 'Print State'], ['Salva Ora', 'Save Now'], ['Zona pericolosa', 'Danger zone'],
        ['Test Migrazione V2', 'Test V2 Migration'], ['RESET TOTALE', 'FULL RESET'],
        ['cerca cheat', 'search cheats'], ['cerca…', 'search…'], ['Apri Admin Console (trascina per spostare)', 'Open Admin Console (drag to move)'],
        ['Aggiunti ', 'Added '], ['Score impostato a ', 'Score set to '], ['Token impostati a ', 'Tokens set to '], ['Q-bits impostati a ', 'Q-bits set to '],
        ['Bonus BPS azzerato', 'BPS Bonus reset'], ['Bonus BPS +', 'BPS Bonus +'], ['BPS è 0, impossibile saltare', 'BPS is 0, cannot skip'],
        ['Salto +1h (+', 'Skip +1h (+'], ['Salto +1h', 'Skip +1h'], ['Sei al Livello ', 'You are at Level '], ['Formattazioni impostate a ', 'Formats set to '],
        ['Formattazioni +1', 'Formats +1'], ['Prestige pronto (soglia ', 'Prestige ready (threshold '], ['(soglia ', '(threshold '], [', prestige pronto)', ', prestige ready)'], ['Requisiti NG+ soddisfatti! Vai nel Lab', 'NG+ requirements met! Go to the Lab'],
        ['BSOD forzato (x', 'BSOD forced (x'], ['Matrix forzato (x', 'Matrix forced (x'], ['Britney Espears attivata', 'Britney Espears activated'],
        ['Golden Bug generato', 'Golden Bug spawned'], ['Cooldown azzerati', 'Cooldowns reset'], ['Espo Fury attivata', 'Espo Fury activated'],
        ['activateCrunchTime non disponibile', 'activateCrunchTime not available'], ['Nessun evento attivo', 'No active event'], ['Scenario caricato: ', 'Scenario loaded: '],
        ['Negozio sbloccato', 'Shop unlocked'], ['Negozio bloccato', 'Shop locked'], ['+100 a tutti i team', '+100 to all teams'],
        ['GOD MODE attivata', 'GOD MODE activated'], ['Tutte le skin sbloccate', 'All skins unlocked'], ['Skin bloccate', 'Skins locked'],
        ['Tutti gli obiettivi sbloccati', 'All achievements unlocked'], ['Tutti gli obiettivi bloccati', 'All achievements locked'],
        ['Stato stampato in console (F12)', 'State printed to console (F12)'], ['Salvataggio forzato', 'Forced save'], ['saveGame non disponibile', 'saveGame not available'],
        ['Simulare migrazione V2? Crea un falso salvataggio V1 e ricarica.', 'Simulate V2 migration? Creates a fake V1 save and reloads.'],
        ['RESET TOTALE DEV', 'FULL DEV RESET'], ['Cancella tutto senza password e ricarica.', 'Wipes everything without a password and reloads.']
    ].sort((a, b) => b[0].length - a[0].length);
    const cbT = (s) => { if (!CB_EN || s == null) return s; for (let i = 0; i < CB_MAP.length; i++) s = s.split(CB_MAP[i][0]).join(CB_MAP[i][1]); return s; };

    // --- 1. Stili ---
    const styles = `
        #cheatboard-container {
            position: fixed; top: 0; left: 0; width: 390px; height: 100vh; height: 100dvh;
            padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom);
            background-color: rgba(8,9,8,0.96); backdrop-filter: blur(12px);
            border-right: 1px solid #1f2a1f; box-shadow: 10px 0 50px rgba(0,0,0,0.6);
            z-index: 99999; transform: translateX(-100%);
            transition: transform 0.3s cubic-bezier(0.25,1,0.5,1);
            color: #d7e0d7; font-family: 'Consolas','Monaco',monospace;
            display: flex; flex-direction: column; box-sizing: border-box;
        }
        #cheatboard-container.cb-right { left: auto; right: 0; border-right: none; border-left: 1px solid #1f2a1f; box-shadow: -10px 0 50px rgba(0,0,0,0.6); transform: translateX(100%); }
        #cheatboard-container.open { transform: translateX(0); }
        #cheatboard-container * { box-sizing: border-box; }

        #cheatboard-handle {
            position: fixed; top: 120px; left: 0; width: 40px; height: 44px;
            background: #0d100d; color: #00ff9d; border: 1px solid #1f2a1f;
            display: flex; align-items: center; justify-content: center; font-size: 1.2rem;
            cursor: grab; z-index: 100000; touch-action: none;
            box-shadow: 0 4px 15px rgba(0,0,0,0.4); transition: background 0.2s, color 0.2s;
            -webkit-user-select: none; user-select: none;
        }
        #cheatboard-handle:hover { background: #16201a; color: #fff; }
        #cheatboard-handle.dragging { cursor: grabbing; opacity: 0.9; transition: none; }
        #cheatboard-handle.cb-dock-left { border-left: none; border-radius: 0 8px 8px 0; }
        #cheatboard-handle.cb-dock-right { border-right: none; border-radius: 8px 0 0 8px; }
        #cheatboard-handle.cb-hidden { opacity: 0; pointer-events: none; }

        #cheatboard-header {
            display: flex; align-items: center; gap: 8px; padding: 11px 12px;
            border-bottom: 1px solid #1c261c; background: rgba(255,255,255,0.02); flex: 0 0 auto;
        }
        #cheatboard-title {
            display: flex; align-items: center; gap: 7px; color: #00ff9d;
            font-size: 0.92rem; font-weight: bold; letter-spacing: 0.5px; white-space: nowrap;
        }
        #cb-search {
            display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0;
            background: #050705; border: 1px solid #243024; border-radius: 6px; padding: 0 9px; height: 32px;
        }
        #cb-search i { color: #4f6b56; font-size: 0.8rem; }
        #cb-search input {
            flex: 1; min-width: 0; background: transparent; border: none; outline: none;
            color: #bfeede; font-family: inherit; font-size: 0.8rem;
        }
        #cheatboard-close {
            cursor: pointer; color: #ff4757; font-size: 1.6rem;
            min-width: 40px; min-height: 40px; display: flex; align-items: center; justify-content: center;
            transition: transform 0.2s; border-radius: 6px;
        }
        #cheatboard-close:hover, #cheatboard-close:active { transform: scale(1.1); color: #ff6b81; }

        /* --- Cruscotto live --- */
        #cb-dash {
            flex: 0 0 auto; margin: 10px; padding: 11px;
            background: #0a1318; border: 1px solid #14323c; border-radius: 8px;
        }
        .cb-dash-top { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 9px; gap: 8px; }
        .cb-pill { display: flex; align-items: baseline; gap: 6px; min-width: 0; }
        .cb-pill b { color: #4cc9f0; font-size: 1.05rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cb-pill span { color: #6f8a93; font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.5px; }
        .cb-track { height: 6px; background: #0c1c22; border-radius: 4px; overflow: hidden; margin: 8px 0; }
        .cb-fill { height: 100%; width: 0%; background: #4cc9f0; border-radius: 4px; transition: width 0.3s; }
        .cb-dash-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 14px; margin-top: 6px; }
        .cb-met { display: flex; justify-content: space-between; gap: 8px; font-size: 0.72rem; min-width: 0; }
        .cb-met span { color: #6f8a93; text-transform: uppercase; letter-spacing: 0.4px; }
        .cb-met b { color: #cfe9f2; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cb-dash-foot { display: flex; justify-content: space-between; align-items: center; margin-top: 9px; padding-top: 8px; border-top: 1px solid #14323c; font-size: 0.7rem; color: #8fb6c0; }
        .cb-dash-foot b { color: #4cc9f0; font-weight: 700; }

        /* --- Tab --- */
        #cb-tabs { display: flex; gap: 2px; padding: 0 8px; border-bottom: 1px solid #1c261c; flex: 0 0 auto; }
        .cb-tab {
            flex: 1; min-width: 0; height: 36px; background: transparent; border: none;
            border-bottom: 2px solid transparent; color: #7f8c7f; cursor: pointer;
            font-family: inherit; font-size: 0.66rem; font-weight: 700; text-transform: uppercase;
            letter-spacing: 0.5px; display: flex; align-items: center; justify-content: center; gap: 5px;
        }
        .cb-tab i { color: var(--c); opacity: 0.45; font-size: 0.85rem; }
        .cb-tab:hover { color: #b7c4b7; }
        .cb-tab.on { color: var(--c); border-bottom-color: var(--c); background: rgba(255,255,255,0.03); }
        .cb-tab.on i { opacity: 1; }

        /* --- Body scrollabile --- */
        #cb-body {
            --cb-sec: #00ff9d; flex: 1; overflow-y: auto; padding: 12px;
            display: flex; flex-direction: column; gap: 12px; border-top: 2px solid var(--cb-sec);
            padding-bottom: 90px;
        }
        #cb-body::-webkit-scrollbar { width: 5px; }
        #cb-body::-webkit-scrollbar-thumb { background: #2a382a; border-radius: 3px; }
        .cb-sec { display: none; flex-direction: column; gap: 12px; }
        .cb-sec.on { display: flex; }

        .cb-group { background: rgba(30,30,30,0.25); border: 1px solid #28342a; border-radius: 8px; padding: 13px; display: flex; flex-direction: column; gap: 9px; }
        .cb-gt { font-size: 0.66rem; color: var(--cb-sec); text-transform: uppercase; font-weight: 700; letter-spacing: 1px; border-bottom: 1px solid #2c3a2c; padding-bottom: 7px; }
        .cb-row { display: flex; gap: 8px; align-items: center; width: 100%; }

        .cb-in { background: #050705; border: 1px solid #2a382a; color: #00ff9d; padding: 0 11px; border-radius: 6px; font-family: inherit; font-size: 1rem; text-align: right; font-weight: 700; height: 36px; flex: 1; min-width: 0; }
        .cb-in:focus { border-color: #00ff9d; outline: none; box-shadow: 0 0 8px rgba(0,255,157,0.2); }

        .cb-btn { background: #18201a; border: 1px solid #2c3a2c; color: #d7e0d7; padding: 0 10px; border-radius: 6px; cursor: pointer; font-family: inherit; font-weight: 600; font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.3px; white-space: nowrap; display: flex; align-items: center; justify-content: center; gap: 7px; height: 36px; flex: 1; min-width: 0; transition: all 0.1s; }
        .cb-btn:hover { background: #222c24; border-color: #3a4c3a; }
        .cb-btn:active { transform: translateY(1px); }
        .cb-btn.green  { border-color: #00ff9d; color: #00ff9d; background: rgba(0,255,157,0.05); }
        .cb-btn.green:hover  { background: rgba(0,255,157,0.15); }
        .cb-btn.gold   { border-color: #f1c40f; color: #f1c40f; background: rgba(241,196,15,0.05); }
        .cb-btn.gold:hover   { background: rgba(241,196,15,0.15); }
        .cb-btn.red    { border-color: #ff5566; color: #ff5566; background: rgba(255,85,102,0.05); }
        .cb-btn.red:hover    { background: rgba(255,85,102,0.15); }
        .cb-btn.purple { border-color: #b27ad6; color: #b27ad6; background: rgba(178,122,214,0.05); }
        .cb-btn.purple:hover { background: rgba(178,122,214,0.15); }
        .cb-btn.cyan   { border-color: #4cc9f0; color: #4cc9f0; background: rgba(76,201,240,0.05); }
        .cb-btn.cyan:hover   { background: rgba(76,201,240,0.15); }
        .cb-btn.chaos  { border-color: #e6843a; color: #e6843a; background: rgba(230,132,58,0.05); }
        .cb-btn.chaos:hover  { background: rgba(230,132,58,0.15); }
        .cb-btn.matrix { border-color: #33ff66; color: #33ff66; background: rgba(51,255,102,0.05); }
        .cb-btn.matrix:hover { background: rgba(51,255,102,0.15); text-shadow: 0 0 5px #0f0; }

        /* --- Scenari (preset) --- */
        .cb-scen { display: flex; align-items: center; gap: 11px; width: 100%; padding: 11px 12px; background: #12181a; border: 1px solid #243430; border-radius: 8px; color: #dfeae6; font-family: inherit; cursor: pointer; text-align: left; transition: all 0.1s; }
        .cb-scen:hover { background: #19211f; border-color: #3a5650; }
        .cb-scen:active { transform: translateY(1px); }
        .cb-scen > i:first-child { font-size: 1.15rem; width: 24px; text-align: center; flex: 0 0 auto; }
        .cb-scen-tx { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .cb-scen-tx b { font-size: 0.78rem; font-weight: 700; }
        .cb-scen-tx small { font-size: 0.68rem; color: #7f8c7f; }
        .cb-scen-go { margin-left: auto; color: #00ff9d; font-size: 0.85rem; flex: 0 0 auto; }

        @media only screen and (max-width: 768px) {
            #cheatboard-container { width: 94%; max-width: none; }
            .cb-tab i { display: none; }
            .cb-tab { font-size: 0.7rem; }
            .cb-row { flex-wrap: wrap; gap: 6px; }
            .cb-in { flex: 1 1 100%; height: 42px; }
            .cb-btn { flex: 1 1 calc(50% - 5px); height: 42px; font-size: 0.78rem; padding: 0 8px; letter-spacing: 0.3px; gap: 5px; }
        }
    `;
    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    // --- 2. HTML ---
    const scen = (id, icon, color, title, desc) =>
        `<button id="${id}" class="cb-scen"><i class="fa-solid ${icon}" style="color:${color}"></i><span class="cb-scen-tx"><b>${title}</b><small>${desc}</small></span><i class="fa-solid fa-arrow-right cb-scen-go"></i></button>`;

    const tabBar = TABS.map(t =>
        `<button class="cb-tab" data-tab="${t.id}" data-c="${t.color}" style="--c:${t.color}" role="tab" aria-selected="false"><i class="fa-solid ${t.icon}"></i><span>${t.label}</span></button>`
    ).join('');

    const container = document.createElement('div');
    container.id = 'cheatboard-container';
    container.innerHTML = cbT(`
        <div id="cheatboard-header">
            <span id="cheatboard-title"><i class="fa-solid fa-terminal"></i> Admin Console</span>
            <div id="cb-search"><i class="fa-solid fa-magnifying-glass"></i><input id="cb-search-input" placeholder="cerca…" aria-label="cerca cheat"></div>
            <span id="cheatboard-close"><i class="fa-solid fa-xmark"></i></span>
        </div>

        <div id="cb-dash">
            <div class="cb-dash-top">
                <div class="cb-pill"><b id="cb-d-lvl">0</b><span>Livello</span></div>
                <div class="cb-pill"><b id="cb-d-fmt">0</b><span>Format</span></div>
                <div class="cb-pill"><b id="cb-d-gain">+0</b><span>Gain ora</span></div>
            </div>
            <div class="cb-track"><div class="cb-fill" id="cb-d-fill"></div></div>
            <div class="cb-dash-grid">
                <div class="cb-met"><span>Score</span><b id="cb-d-score">0</b></div>
                <div class="cb-met"><span>Soglia</span><b id="cb-d-thr">0</b></div>
                <div class="cb-met"><span>BPS</span><b id="cb-d-bps">0</b></div>
                <div class="cb-met"><span>Click</span><b id="cb-d-click">0</b></div>
                <div class="cb-met"><span>Token</span><b id="cb-d-tok">0</b></div>
                <div class="cb-met"><span>Q-bits</span><b id="cb-d-qb">0</b></div>
            </div>
            <div class="cb-dash-foot"><span><i class="fa-solid fa-stopwatch"></i> Prossimo prestige</span><b id="cb-d-eta">—</b></div>
        </div>

        <div id="cb-tabs" role="tablist">${tabBar}</div>

        <div id="cb-body">

            <section class="cb-sec" data-tab="risorse">
                <div class="cb-group">
                    <div class="cb-gt">Aggiungi valute</div>
                    <div class="cb-row"><input id="cb-bugs" class="cb-in" value="1000000"><button id="cb-add-bugs" class="cb-btn green"><i class="fa-solid fa-plus"></i> Aggiungi Bug</button></div>
                    <div class="cb-row"><input id="cb-tokens" class="cb-in" value="100"><button id="cb-add-tokens" class="cb-btn gold"><i class="fa-solid fa-coins"></i> Aggiungi Token</button></div>
                    <div class="cb-row"><input id="cb-qbits" class="cb-in" value="10"><button id="cb-add-qbits" class="cb-btn purple"><i class="fa-solid fa-atom"></i> Aggiungi Q-bits</button></div>
                </div>
                <div class="cb-group">
                    <div class="cb-gt">Imposta valore esatto</div>
                    <div class="cb-row"><input id="cb-set-score" class="cb-in" value="1e8"><button id="cb-set-score-btn" class="cb-btn cyan"><i class="fa-solid fa-equals"></i> Imposta Score</button></div>
                    <div class="cb-row"><input id="cb-set-tokens" class="cb-in" value="50"><button id="cb-set-tokens-btn" class="cb-btn cyan"><i class="fa-solid fa-equals"></i> Imposta Token</button></div>
                    <div class="cb-row"><input id="cb-set-qbits" class="cb-in" value="5"><button id="cb-set-qbits-btn" class="cb-btn cyan"><i class="fa-solid fa-equals"></i> Imposta Q-bits</button></div>
                </div>
                <div class="cb-group">
                    <div class="cb-gt">Extra</div>
                    <div class="cb-row"><input id="cb-clicks" class="cb-in" value="1000"><button id="cb-add-clicks" class="cb-btn"><i class="fa-solid fa-hand-pointer"></i> Aggiungi Click</button></div>
                    <div class="cb-row"><input id="cb-bps" class="cb-in" value="1000"><button id="cb-add-bps" class="cb-btn"><i class="fa-solid fa-gauge-high"></i> Bonus BPS</button></div>
                    <div class="cb-row"><button id="cb-reset-bps" class="cb-btn red"><i class="fa-solid fa-rotate-left"></i> Azzera Bonus BPS</button><button id="cb-skip" class="cb-btn"><i class="fa-solid fa-forward"></i> Salto +1h</button></div>
                    <div class="cb-row"><button id="cb-chaos" class="cb-btn chaos"><i class="fa-solid fa-dice"></i> Risorse casuali (Chaos)</button></div>
                </div>
            </section>

            <section class="cb-sec" data-tab="prestige">
                <div class="cb-group">
                    <div class="cb-gt">Livello & Formattazione</div>
                    <div class="cb-row"><input id="cb-level" class="cb-in" value="5"><button id="cb-goto-level" class="cb-btn gold"><i class="fa-solid fa-bullseye"></i> Vai al Livello</button></div>
                    <div class="cb-row"><input id="cb-set-format" class="cb-in" value="1"><button id="cb-set-format-btn" class="cb-btn cyan"><i class="fa-solid fa-equals"></i> Imposta Formattazioni</button></div>
                </div>
                <div class="cb-group">
                    <div class="cb-gt">Scorciatoie progressione</div>
                    <div class="cb-row"><button id="cb-prestige-ready" class="cb-btn gold"><i class="fa-solid fa-rocket"></i> Rendi Prestige pronto</button></div>
                    <div class="cb-row"><button id="cb-max-lab" class="cb-btn gold"><i class="fa-solid fa-flask-vial"></i> Lab al massimo</button></div>
                    <div class="cb-row"><button id="cb-ngplus" class="cb-btn purple"><i class="fa-solid fa-meteor"></i> Pronto Formattazione (NG+)</button></div>
                    <div class="cb-row"><button id="cb-add-format" class="cb-btn purple"><i class="fa-solid fa-plus"></i> Aggiungi 1 Formattazione</button></div>
                </div>
            </section>

            <section class="cb-sec" data-tab="eventi">
                <div class="cb-group">
                    <div class="cb-gt">Glitch</div>
                    <div class="cb-row"><input id="cb-evt-mult" class="cb-in" value="5"><button id="cb-evt-404" class="cb-btn red">Errore 404</button><button id="cb-evt-matrix" class="cb-btn matrix">Matrix Hack</button></div>
                </div>
                <div class="cb-group">
                    <div class="cb-gt">Video meme</div>
                    <div class="cb-row"><button id="cb-evt-rick" class="cb-btn red">Rick Roll</button><button id="cb-evt-ricardo" class="cb-btn red">Ricardo</button><button id="cb-evt-britney" class="cb-btn red">Britney</button></div>
                </div>
                <div class="cb-group">
                    <div class="cb-gt">Spawn & Buff</div>
                    <div class="cb-row"><button id="cb-evt-golden" class="cb-btn gold"><i class="fa-solid fa-bug"></i> Golden Bug</button><button id="cb-evt-star" class="cb-btn gold"><i class="fa-solid fa-star"></i> Super Star</button></div>
                    <div class="cb-row"><button id="cb-fury" class="cb-btn chaos"><i class="fa-solid fa-fire"></i> Attiva Espo Fury</button><button id="cb-reset-cd" class="cb-btn"><i class="fa-solid fa-clock-rotate-left"></i> Azzera Cooldown</button></div>
                </div>
                <div class="cb-group">
                    <div class="cb-gt">Controllo</div>
                    <div class="cb-row"><button id="cb-stop-evt" class="cb-btn red"><i class="fa-solid fa-stop"></i> Ferma evento in corso</button></div>
                </div>
            </section>

            <section class="cb-sec" data-tab="scenari">
                <div class="cb-group">
                    <div class="cb-gt">Carica uno stato di test</div>
                    ${scen('cb-preset-new', 'fa-wand-magic-sparkles', '#00ff9d', 'Nuovo giocatore', 'Stato pulito, early game')}
                    ${scen('cb-preset-prestige', 'fa-rocket', '#f1c40f', 'Pronto 1° Prestige', 'Score appena sopra soglia · Liv 0')}
                    ${scen('cb-preset-mid', 'fa-gauge', '#4cc9f0', 'Mid-game', '≈ Liv 5 · team e token medi')}
                    ${scen('cb-preset-end', 'fa-meteor', '#b27ad6', 'Endgame / pre-Formattazione', 'Liv 25 · Q-bits · NG+ ready')}
                    ${scen('cb-preset-balance', 'fa-scale-balanced', '#e6843a', 'Punto bilanciamento', 'Liv 3 "Medio" · score 0, osserva il ritmo')}
                </div>
            </section>

            <section class="cb-sec" data-tab="sistema">
                <div class="cb-group">
                    <div class="cb-gt">Sblocchi</div>
                    <div class="cb-row"><button id="cb-unlock-shop" class="cb-btn green">Sblocca Negozio</button><button id="cb-lock-shop" class="cb-btn red">Blocca Negozio</button></div>
                    <div class="cb-row"><button id="cb-unlock-skins" class="cb-btn green">Sblocca Skin</button><button id="cb-lock-skins" class="cb-btn red">Blocca Skin</button></div>
                    <div class="cb-row"><button id="cb-unlock-ach" class="cb-btn green">Sblocca Obiettivi</button><button id="cb-lock-ach" class="cb-btn red">Blocca Obiettivi</button></div>
                    <div class="cb-row"><button id="cb-army" class="cb-btn gold"><i class="fa-solid fa-users"></i> +100 a tutti i Team</button></div>
                </div>
                <div class="cb-group">
                    <div class="cb-gt">Onnipotenza</div>
                    <div class="cb-row"><button id="cb-god" class="cb-btn matrix" style="font-weight:900;letter-spacing:2px;"><i class="fa-solid fa-bolt"></i> GOD MODE</button></div>
                </div>
                <div class="cb-group">
                    <div class="cb-gt">Debug</div>
                    <div class="cb-row"><button id="cb-debug" class="cb-btn red"><i class="fa-solid fa-bug"></i> Debug Log: <span id="cb-debug-label">OFF</span></button><button id="cb-log" class="cb-btn cyan"><i class="fa-solid fa-code"></i> Stampa Stato</button></div>
                    <div class="cb-row"><button id="cb-save" class="cb-btn cyan"><i class="fa-solid fa-cloud-arrow-up"></i> Salva Ora</button></div>
                </div>
                <div class="cb-group">
                    <div class="cb-gt">Zona pericolosa</div>
                    <div class="cb-row"><button id="cb-v2" class="cb-btn purple"><i class="fa-solid fa-backward-fast"></i> Test Migrazione V2</button><button id="cb-hardreset" class="cb-btn red" style="border-color:red;color:red;"><i class="fa-solid fa-triangle-exclamation"></i> RESET TOTALE</button></div>
                </div>
            </section>

        </div>
    `);
    document.body.appendChild(container);

    // --- 3. Helper ---
    const $ = (id) => document.getElementById(id);
    const D = (id) => { try { return new Decimal($(id).value); } catch (e) { return new Decimal(0); } };
    const I = (id) => parseInt($(id).value) || 0;
    const FMT = (v) => { try { return (window.EspooClicker && window.EspooClicker.formatNumber) ? window.EspooClicker.formatNumber(v) : (v && v.toString ? v.toString() : String(v)); } catch (e) { return '—'; } };
    const fmtTime = (s) => {
        if (!isFinite(s) || s < 0) return '—';
        s = Math.round(s);
        if (s < 60) return s + 's';
        if (s < 3600) return Math.floor(s / 60) + 'm ' + (s % 60) + 's';
        if (s < 86400) return Math.floor(s / 3600) + 'h ' + Math.floor((s % 3600) / 60) + 'm';
        return Math.floor(s / 86400) + 'g ' + Math.floor((s % 86400) / 3600) + 'h';
    };
    const toast = (msg) => { if (window.EspooClicker) window.EspooClicker.showToast('<i class="fa-solid fa-terminal"></i> ' + cbT(msg), 'info'); };
    const updateGame = () => { if (typeof updateUI === 'function') updateUI(); };
    const refreshUI = () => {
        if (typeof recalculateCPS === 'function') recalculateCPS();
        if (typeof refreshAllStores === 'function') refreshAllStores();
        if (typeof updateAchievementsUI === 'function') updateAchievementsUI();
        if (typeof updateSkinsUI === 'function') updateSkinsUI();
        updateGame();
    };
    const setTeams = (map) => { for (const k in gameState.teams) { if (gameState.teams[k]) gameState.teams[k].count = map[k] || 0; } };

    // --- 4. Azioni: Risorse ---
    function addBugs() {
        const v = D('cb-bugs');
        gameState.score = gameState.score.add(v);
        gameState.totalScore = gameState.totalScore.add(v);
        gameState.lifetimeScore = gameState.lifetimeScore.add(v);
        refreshUI(); toast('Aggiunti ' + FMT(v) + ' Bug');
    }
    function addTokens() {
        const v = D('cb-tokens');
        gameState.prestigePoints = gameState.prestigePoints.add(v);
        gameState.lifetimePrestigePoints = (gameState.lifetimePrestigePoints || new Decimal(0)).add(v);
        if (typeof updatePrestigeUI === 'function') updatePrestigeUI();
        refreshUI(); toast('Aggiunti ' + FMT(v) + ' Token');
    }
    function addQbits() {
        const v = D('cb-qbits');
        if (!gameState.qBits) gameState.qBits = new Decimal(0);
        if (!gameState.lifetimeQBits) gameState.lifetimeQBits = new Decimal(0);
        gameState.qBits = gameState.qBits.add(v);
        gameState.lifetimeQBits = gameState.lifetimeQBits.add(v);
        refreshUI(); toast('Aggiunti ' + FMT(v) + ' Q-bits');
    }
    function setScore() {
        const v = D('cb-set-score');
        gameState.score = v; gameState.totalScore = v;
        if (gameState.lifetimeScore.lt(v)) gameState.lifetimeScore = v;
        if (typeof updatePrestigeVisuals === 'function') updatePrestigeVisuals();
        refreshUI(); toast('Score impostato a ' + FMT(v));
    }
    function setTokens() {
        const v = D('cb-set-tokens');
        gameState.prestigePoints = v;
        if (!gameState.lifetimePrestigePoints || gameState.lifetimePrestigePoints.lt(v)) gameState.lifetimePrestigePoints = v;
        if (typeof updatePrestigeUI === 'function') updatePrestigeUI();
        refreshUI(); toast('Token impostati a ' + FMT(v));
    }
    function setQbits() {
        const v = D('cb-set-qbits');
        gameState.qBits = v;
        if (!gameState.lifetimeQBits || gameState.lifetimeQBits.lt(v)) gameState.lifetimeQBits = v;
        refreshUI(); toast('Q-bits impostati a ' + FMT(v));
    }
    function addClicks() { gameState.totalClicks += I('cb-clicks'); refreshUI(); toast('Aggiunti ' + I('cb-clicks') + ' click'); }
    function addBps() { const v = D('cb-bps'); window.cheatBPSBonus = window.cheatBPSBonus.add(v); refreshUI(); toast('Bonus BPS +' + FMT(v)); }
    function resetBps() { window.cheatBPSBonus = new Decimal(0); if (typeof recalculateCPS === 'function') recalculateCPS(); updateGame(); toast('Bonus BPS azzerato'); }
    function skip1h() {
        if (typeof bps === 'undefined' || bps.lte(0)) { toast('BPS è 0, impossibile saltare'); return; }
        const gain = bps.mul(3600);
        gameState.score = gameState.score.add(gain);
        gameState.totalScore = gameState.totalScore.add(gain);
        gameState.lifetimeScore = gameState.lifetimeScore.add(gain);
        gameState.totalPlayTime += 3600;
        refreshUI(); toast('Salto +1h (+' + FMT(gain) + ' Bug)');
    }
    function chaos() {
        const randBugs = new Decimal('1e9').mul(Math.random());
        const randTokens = new Decimal('5000').mul(Math.random());
        gameState.score = gameState.score.add(randBugs);
        gameState.totalScore = gameState.totalScore.add(randBugs);
        gameState.lifetimeScore = gameState.lifetimeScore.add(randBugs);
        gameState.prestigePoints = gameState.prestigePoints.add(randTokens);
        gameState.lifetimePrestigePoints = (gameState.lifetimePrestigePoints || new Decimal(0)).add(randTokens);
        gameState.totalClicks += Math.floor(Math.random() * 5000) + 1000;
        window.cheatBPSBonus = window.cheatBPSBonus.add(new Decimal(Math.floor(Math.random() * 500) + 100));
        const achKeys = Object.keys(gameData.achievements);
        for (let i = 0; i < 3; i++) { const k = achKeys[Math.floor(Math.random() * achKeys.length)]; if (gameState.achievements[k]) gameState.achievements[k].unlocked = true; }
        const skinKeys = Object.keys(gameData.skins); const rs = skinKeys[Math.floor(Math.random() * skinKeys.length)];
        if (!gameState.skins.unlocked.includes(rs)) gameState.skins.unlocked.push(rs);
        if (typeof updatePrestigeVisuals === 'function') updatePrestigeVisuals();
        refreshUI(); toast('CHAOS: +' + FMT(randBugs) + ' Bug, +' + FMT(randTokens) + ' Token');
    }

    // --- 5. Azioni: Prestige ---
    function gotoLevel() {
        const n = Math.max(0, I('cb-level'));
        gameState.totalResets = n;
        const thr = (typeof getPrestigeThreshold === 'function') ? getPrestigeThreshold() : new Decimal('50000000');
        gameState.score = thr; gameState.totalScore = thr;
        if (gameState.lifetimeScore.lt(thr)) gameState.lifetimeScore = thr;
        if (typeof reapplyAllEffects === 'function') reapplyAllEffects();
        if (typeof updatePrestigeVisuals === 'function') updatePrestigeVisuals();
        refreshUI(); toast('Sei al Livello ' + n + ' (soglia ' + FMT(thr) + ', prestige pronto)');
    }
    function setFormat() { gameState.totalFormattazioni = I('cb-set-format'); if (window.EspooClicker) window.EspooClicker.saveGame(); refreshUI(); toast('Formattazioni impostate a ' + I('cb-set-format')); }
    function prestigeReady() {
        if (typeof getPrestigeThreshold !== 'function') return;
        const thr = getPrestigeThreshold(); const rs = thr.add(1);
        gameState.totalScore = rs; gameState.score = rs;
        if (typeof updatePrestigeVisuals === 'function') updatePrestigeVisuals();
        refreshUI(); toast('Prestige pronto (soglia ' + FMT(thr) + ')');
    }
    function maxLab() {
        for (const k in gameData.prestigeUpgrades) {
            const d = gameData.prestigeUpgrades[k];
            if (d.isCounted && d.maxLevel && gameState.prestigeUpgrades[k]) gameState.prestigeUpgrades[k].count = d.maxLevel;
        }
        if (typeof reapplyAllEffects === 'function') reapplyAllEffects();
        refreshUI(); if (window.EspooClicker) window.EspooClicker.saveGame(); toast('Lab al massimo');
    }
    function ngPlus() {
        if (gameState.totalResets < 20) gameState.totalResets = 20;
        if (!gameState.prestigePoints) gameState.prestigePoints = new Decimal(0);
        gameState.prestigePoints = gameState.prestigePoints.add(1000);
        if (typeof updatePrestigeVisuals === 'function') updatePrestigeVisuals();
        refreshUI(); toast('Requisiti NG+ soddisfatti! Vai nel Lab');
    }
    function addFormat() { if (!gameState.totalFormattazioni) gameState.totalFormattazioni = 0; gameState.totalFormattazioni += 1; if (window.EspooClicker) window.EspooClicker.saveGame(); refreshUI(); toast('Formattazioni +1'); }

    // --- 6. Azioni: Eventi ---
    function evt404() { const m = I('cb-evt-mult'); if (typeof triggerGameEvent === 'function') { triggerGameEvent('bluescreen', m); toast('BSOD forzato (x' + m + ')'); } }
    function evtMatrix() { const m = I('cb-evt-mult'); if (typeof triggerGameEvent === 'function') { triggerGameEvent('matrix', m); toast('Matrix forzato (x' + m + ')'); } }
    function evtRick() { if (typeof triggerGameEvent === 'function') triggerGameEvent('rickRoll'); }
    function evtRicardo() { if (typeof triggerGameEvent === 'function') triggerGameEvent('ricardo'); }
    function evtBritney() { if (typeof triggerGameEvent === 'function') { triggerGameEvent('britneyEspears'); toast('Britney Espears attivata'); } }
    function evtGolden() { if (typeof spawnGoldenBug === 'function') { spawnGoldenBug(); toast('Golden Bug generato'); } }
    function evtStar() { const m = I('cb-evt-mult'); if (typeof triggerGameEvent === 'function') { triggerGameEvent('superStarMode', m); toast('Super Star (x' + m + ') attivata'); } }
    function resetCd() { crunchTimeCooldownEnd = 0; crunchTimeEndTime = 0; gameState.crunchTimeCooldownEnd = 0; gameState.crunchTimeEndTime = 0; refreshUI(); toast('Cooldown azzerati'); }
    function fury() { if (typeof crunchTimeCooldownEnd !== 'undefined') crunchTimeCooldownEnd = 0; if (typeof activateCrunchTime === 'function') { activateCrunchTime(); toast('Espo Fury attivata'); } else { toast('activateCrunchTime non disponibile'); } }
    function stopEvt() {
        if (!window.currentActiveEvent) { toast('Nessun evento attivo'); return; }
        const evtName = window.currentActiveEvent;
        if (typeof stopBluescreenEffect === 'function') stopBluescreenEffect();
        ['rick-roll-video', 'ricardo-video', 'ricardo-metal-video', 'ricardo-dota-video', 'britney-espoars-video', 'video-bigbang'].forEach(id => { const v = document.getElementById(id); if (v) { v.pause(); v.classList.add('video_display_none'); } });
        if (document.body.classList.contains('crunch-active')) {
            crunchTimeMultiplier = new Decimal(1); crunchTimeEndTime = 0; crunchTimeCooldownEnd = 0;
            gameState.crunchTimeEndTime = 0; gameState.crunchTimeCooldownEnd = 0;
            const co = document.getElementById('crunch-overlay'); if (co) co.style.display = 'none';
            if (typeof fireParticleInterval !== 'undefined' && fireParticleInterval) { clearInterval(fireParticleInterval); fireParticleInterval = null; }
        }
        document.body.classList.remove('rick-rolling', 'bluescreen-active', 'matrix-active', 'super-star-active', 'crunch-active');
        if (typeof clearActiveEvent === 'function') clearActiveEvent();
        window.currentActiveEvent = null;
        if (typeof AudioManager !== 'undefined') AudioManager.updateAmbience();
        refreshUI(); toast('Evento "' + evtName + '" fermato');
    }

    // --- 7. Azioni: Scenari (preset) ---
    function loadPreset(builder, name) {
        const user = JSON.parse(JSON.stringify(gameState.user || {}));
        const arcade = JSON.parse(JSON.stringify(gameState.arcadeHighScores || {}));
        if (typeof resetGameToDefault === 'function') resetGameToDefault();
        gameState.user = user; gameState.arcadeHighScores = arcade;
        window.cheatBPSBonus = new Decimal(0);
        try { builder(); } catch (e) { console.warn('Preset error:', e); }
        if (typeof reapplyAllEffects === 'function') reapplyAllEffects();
        refreshUI();
        if (window.EspooClicker) window.EspooClicker.saveGame();
        toast('Scenario caricato: ' + name);
    }
    function presetNew() { /* stato pulito: nessun delta */ }
    function presetPrestige() {
        setTeams({ assistenteQa: 150, jiraTicket: 80, teamQa: 40, automazioneTest: 15, metodologiaAgile: 3 });
        gameState.baseClickValue = new Decimal(5);
        const t = (typeof getPrestigeThreshold === 'function') ? getPrestigeThreshold() : new Decimal('50000000');
        const s = t.mul(1.1);
        gameState.score = s; gameState.totalScore = s; gameState.lifetimeScore = s;
    }
    function presetMid() {
        gameState.totalResets = 5;
        gameState.prestigePoints = new Decimal(8000); gameState.lifetimePrestigePoints = new Decimal(50000);
        setTeams({ assistenteQa: 300, jiraTicket: 250, teamQa: 200, automazioneTest: 150, metodologiaAgile: 100, aiDebugger: 50, quantumServer: 10 });
        gameState.baseClickValue = new Decimal(500);
        const t = (typeof getPrestigeThreshold === 'function') ? getPrestigeThreshold() : new Decimal(0);
        gameState.totalScore = t.mul(0.5); gameState.score = t.mul(0.5); gameState.lifetimeScore = t.mul(6);
    }
    function presetEnd() {
        gameState.totalResets = 25; gameState.totalFormattazioni = 0;
        gameState.prestigePoints = new Decimal('1e6'); gameState.lifetimePrestigePoints = new Decimal('5e6');
        gameState.qBits = new Decimal(50); gameState.lifetimeQBits = new Decimal(50);
        setTeams({ assistenteQa: 1000, jiraTicket: 800, teamQa: 700, automazioneTest: 600, metodologiaAgile: 500, aiDebugger: 400, quantumServer: 300, reteNeuraleGalattica: 200, debugTemporale: 100, singolaritaCosciente: 50, architetturaInfinito: 20 });
        gameState.baseClickValue = new Decimal('1e6');
        const t = (typeof getPrestigeThreshold === 'function') ? getPrestigeThreshold() : new Decimal(0);
        gameState.totalScore = t.mul(1.2); gameState.score = t.mul(1.2); gameState.lifetimeScore = t.mul(50);
    }
    function presetBalance() {
        // Stato "Medio" riproducibile: Liv 3, loadout fisso, score azzerato
        // per misurare quanto ci mette a raggiungere la prossima soglia.
        gameState.totalResets = 3;
        gameState.prestigePoints = new Decimal(2000); gameState.lifetimePrestigePoints = new Decimal(8000);
        setTeams({ assistenteQa: 250, jiraTicket: 200, teamQa: 150, automazioneTest: 100, metodologiaAgile: 60, aiDebugger: 20 });
        gameState.baseClickValue = new Decimal(120);
        gameState.score = new Decimal(0); gameState.totalScore = new Decimal(0);
        gameState.lifetimeScore = new Decimal('5e9');
    }

    // --- 8. Azioni: Sistema ---
    function unlockShop() {
        for (const k in gameData.clickUpgrades) if (gameState.clickUpgrades[k]) gameState.clickUpgrades[k].purchased = true;
        for (const k in gameData.buildingEnhancements) if (gameState.buildingEnhancements[k]) gameState.buildingEnhancements[k].purchased = true;
        for (const k in gameData.prestigeUpgrades) { const d = gameData.prestigeUpgrades[k]; if (!d.isCounted && gameState.prestigeUpgrades[k]) gameState.prestigeUpgrades[k].purchased = true; }
        for (const k in gameData.superUpgrades) if (gameState.superUpgrades[k]) gameState.superUpgrades[k].purchased = true;
        refreshUI(); if (window.EspooClicker) window.EspooClicker.saveGame(); toast('Negozio sbloccato');
    }
    function lockShop() {
        for (const k in gameData.clickUpgrades) if (gameState.clickUpgrades[k]) gameState.clickUpgrades[k].purchased = false;
        for (const k in gameData.buildingEnhancements) if (gameState.buildingEnhancements[k]) gameState.buildingEnhancements[k].purchased = false;
        for (const k in gameData.prestigeUpgrades) { const d = gameData.prestigeUpgrades[k]; if (!d.isCounted && gameState.prestigeUpgrades[k]) gameState.prestigeUpgrades[k].purchased = false; }
        for (const k in gameData.superUpgrades) if (gameState.superUpgrades[k]) gameState.superUpgrades[k].purchased = false;
        for (const k in gameData.prestigeUpgrades) { const d = gameData.prestigeUpgrades[k]; if (d.isCounted && gameState.prestigeUpgrades[k]) gameState.prestigeUpgrades[k].count = 0; }
        refreshUI(); if (window.EspooClicker) window.EspooClicker.saveGame(); toast('Negozio bloccato');
    }
    function army100() { for (const k in gameState.teams) if (gameState.teams[k]) gameState.teams[k].count += 100; refreshUI(); toast('+100 a tutti i team'); }
    function godMode() {
        gameState.score = new Decimal('1e33'); gameState.totalScore = new Decimal('1e33'); gameState.lifetimeScore = gameState.lifetimeScore.add(new Decimal('1e33'));
        gameState.prestigePoints = new Decimal('1e15'); gameState.lifetimePrestigePoints = new Decimal('1e15');
        gameState.qBits = new Decimal('1000000'); gameState.lifetimeQBits = new Decimal('1000000');
        unlockSkins(); unlockAch(); unlockShop(); army100();
        refreshUI(); if (window.EspooClicker) window.EspooClicker.playSound('sound-achievement'); toast('⚡ GOD MODE attivata');
    }
    function unlockSkins() {
        for (const k in gameData.skins) if (!gameState.skins.unlocked.includes(k)) gameState.skins.unlocked.push(k);
        if (typeof updateSkinsUI === 'function') updateSkinsUI();
        if (window.EspooClicker) window.EspooClicker.saveGame(); toast('Tutte le skin sbloccate');
    }
    function lockSkins() {
        gameState.skins.unlocked = ['default']; gameState.skins.current = 'default';
        for (const k in gameData.achievements) { const r = gameData.achievements[k].reward; if (r && r.type === 'skin' && gameState.achievements[k]) gameState.achievements[k].claimed = false; }
        if (typeof applySkinVisuals === 'function') applySkinVisuals('default');
        if (window.EspooClicker) window.EspooClicker.saveGame(); refreshUI(); toast('Skin bloccate');
    }
    function unlockAch() {
        for (const k in gameData.achievements) { if (!gameState.achievements[k]) gameState.achievements[k] = {}; gameState.achievements[k].unlocked = true; gameState.achievements[k].claimed = true; }
        if (window.EspooClicker) window.EspooClicker.saveGame(); refreshUI(); toast('Tutti gli obiettivi sbloccati');
    }
    function lockAch() {
        for (const k in gameData.achievements) { if (gameState.achievements[k]) { gameState.achievements[k].unlocked = false; gameState.achievements[k].claimed = false; gameState.achievements[k].unlockTime = 0; } }
        if (window.EspooClicker) window.EspooClicker.saveGame(); refreshUI(); toast('Tutti gli obiettivi bloccati');
    }
    const debugLabel = () => $('cb-debug-label');
    function updateDebugUI() {
        const l = debugLabel(), b = $('cb-debug'); if (!l || !b) return;
        l.textContent = window.DEBUG_MODE ? 'ON' : 'OFF';
        b.classList.toggle('matrix', !!window.DEBUG_MODE);
        b.classList.toggle('red', !window.DEBUG_MODE);
    }
    function debugToggle() { window.DEBUG_MODE = !window.DEBUG_MODE; updateDebugUI(); toast('Debug Log: ' + (window.DEBUG_MODE ? 'ON' : 'OFF')); }
    function logState() {
        const c = window._console || console;
        c.log('--- GAME STATE ---', JSON.parse(JSON.stringify(gameState)));
        c.log('--- GAME DATA ---', gameData);
        c.log('--- AUDIO ---', typeof AudioManager !== 'undefined' ? AudioManager._sounds : 'N/A');
        toast('Stato stampato in console (F12)');
    }
    async function forceSave() { if (window.EspooClicker && window.EspooClicker.saveGame) { await window.EspooClicker.saveGame(); toast('Salvataggio forzato'); } else toast('saveGame non disponibile'); }
    function forceV2() {
        if (!confirm(cbT('Simulare migrazione V2? Crea un falso salvataggio V1 e ricarica.'))) return;
        const fake = { version: { major: 1, minor: 4, stage: 'stable' }, user: { username: gameState.user.username }, skins: { unlocked: gameState.skins.unlocked, current: gameState.skins.current }, score: '1000000000000000', totalScore: '1000000000000000', lifetimeScore: '1000000000000000', totalClicks: 50000 };
        localStorage.setItem('espotoolClickerSaveV8', LZString.compressToUTF16(JSON.stringify(fake)));
        gameState.isDeleting = true; location.reload();
    }
    async function hardReset() {
        if (!confirm(cbT('⚠️ RESET TOTALE DEV? ⚠️\nCancella tutto senza password e ricarica.'))) return;
        gameState.isDeleting = true;
        if (window.SaveDB && typeof window.SaveDB.clearIndexedDB === 'function') { try { await window.SaveDB.clearIndexedDB(); } catch (e) { console.warn('IndexedDB clear failed:', e); } }
        localStorage.removeItem('espotoolClickerSaveV9');
        localStorage.removeItem('espotoolClickerSaveV9_Backup');
        location.reload();
    }

    // --- 9. Cruscotto live ---
    function updateDash() {
        if (!container.classList.contains('open')) return;
        try {
            const gs = window.gameState; if (!gs) return;
            const thr = (typeof getPrestigeThreshold === 'function') ? getPrestigeThreshold() : new Decimal(0);
            const ts = gs.totalScore || new Decimal(0);
            $('cb-d-lvl').textContent = gs.totalResets || 0;
            $('cb-d-fmt').textContent = gs.totalFormattazioni || 0;
            const gain = (typeof calculatePrestigeGained === 'function') ? calculatePrestigeGained() : new Decimal(0);
            $('cb-d-gain').textContent = '+' + FMT(gain);
            $('cb-d-score').textContent = FMT(ts);
            $('cb-d-thr').textContent = FMT(thr);
            $('cb-d-bps').textContent = FMT(typeof bps !== 'undefined' ? bps : 0);
            const cv = (typeof calculateClickValue === 'function') ? calculateClickValue() : (gs.baseClickValue || new Decimal(0));
            $('cb-d-click').textContent = FMT(cv);
            $('cb-d-tok').textContent = FMT(gs.prestigePoints || 0);
            $('cb-d-qb').textContent = FMT(gs.qBits || 0);
            let pct = 0; try { pct = ts.div(thr).mul(100).toNumber(); } catch (e) { }
            if (!isFinite(pct)) pct = 0; pct = Math.max(0, Math.min(100, pct));
            $('cb-d-fill').style.width = pct.toFixed(1) + '%';
            let eta = '—';
            if (ts.gte(thr)) eta = 'PRONTO ✓';
            else if (typeof bps !== 'undefined' && bps.gt(0)) eta = 'fra ' + fmtTime(thr.minus(ts).div(bps).toNumber());
            $('cb-d-eta').textContent = eta;
        } catch (e) { }
    }

    // --- 10. Tab + Ricerca ---
    const tabs = container.querySelectorAll('.cb-tab');
    const secs = container.querySelectorAll('.cb-sec');
    const body = $('cb-body');
    function activate(id) {
        let color = '#00ff9d';
        tabs.forEach(t => { const on = t.getAttribute('data-tab') === id; t.classList.toggle('on', on); t.setAttribute('aria-selected', on ? 'true' : 'false'); if (on) color = t.getAttribute('data-c'); });
        secs.forEach(s => s.classList.toggle('on', s.getAttribute('data-tab') === id));
        body.style.setProperty('--cb-sec', color);
        body.scrollTop = 0;
        const si = $('cb-search-input'); if (si) { si.value = ''; filter(''); }
    }
    function filter(q) {
        q = (q || '').trim().toLowerCase();
        const sec = container.querySelector('.cb-sec.on'); if (!sec) return;
        sec.querySelectorAll('.cb-group').forEach(g => {
            let any = false;
            g.querySelectorAll('.cb-row, .cb-scen').forEach(r => { const m = !q || r.textContent.toLowerCase().indexOf(q) > -1; r.style.display = m ? '' : 'none'; if (m) any = true; });
            g.style.display = any ? '' : 'none';
        });
    }
    tabs.forEach(t => t.addEventListener('click', () => activate(t.getAttribute('data-tab'))));
    $('cb-search-input').addEventListener('input', e => filter(e.target.value));

    // --- 11. Handle trascinabile (aggancio Sx/Dx) + Toggle + Login gate ---
    const handle = document.createElement('div');
    handle.id = 'cheatboard-handle';
    handle.setAttribute('role', 'button');
    handle.setAttribute('tabindex', '0');
    handle.setAttribute('aria-label', cbT('Apri Admin Console (trascina per spostare)'));
    handle.innerHTML = '<i class="fa-solid fa-terminal"></i>';
    document.body.appendChild(handle);

    const loadPos = () => { try { const p = JSON.parse(localStorage.getItem('cheatboardHandlePos')); if (p && (p.side === 'left' || p.side === 'right') && typeof p.top === 'number') return p; } catch (e) { } return { side: 'left', top: 120 }; };
    let handlePos = loadPos();
    const savePos = () => { try { localStorage.setItem('cheatboardHandlePos', JSON.stringify(handlePos)); } catch (e) { } };
    function applyHandlePos() {
        const max = Math.max(0, window.innerHeight - handle.offsetHeight);
        if (handlePos.top > max) handlePos.top = max;
        handle.classList.toggle('cb-dock-left', handlePos.side === 'left');
        handle.classList.toggle('cb-dock-right', handlePos.side === 'right');
        handle.style.top = handlePos.top + 'px';
        handle.style.left = handlePos.side === 'left' ? '0px' : 'auto';
        handle.style.right = handlePos.side === 'right' ? '0px' : 'auto';
        container.classList.toggle('cb-right', handlePos.side === 'right');
    }

    const togglePanel = () => {
        const willOpen = !container.classList.contains('open');
        container.classList.toggle('open', willOpen);
        handle.classList.toggle('cb-hidden', willOpen);
        if (willOpen) updateDash();
    };

    // Drag: distingue click (apre) da trascinamento (sposta e si aggancia al bordo)
    let dragging = false, moved = false, sx = 0, sy = 0, hw = 40, hh = 44;
    handle.addEventListener('pointerdown', (e) => {
        if (e.button && e.button !== 0) return;
        dragging = true; moved = false; sx = e.clientX; sy = e.clientY;
        const r = handle.getBoundingClientRect(); hw = r.width; hh = r.height;
        try { handle.setPointerCapture(e.pointerId); } catch (_) { }
        handle.classList.add('dragging');
        e.preventDefault();
    });
    handle.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        if (!moved && (Math.abs(e.clientX - sx) > 4 || Math.abs(e.clientY - sy) > 4)) moved = true;
        if (moved) {
            const x = Math.max(0, Math.min(window.innerWidth - hw, e.clientX - hw / 2));
            const y = Math.max(0, Math.min(window.innerHeight - hh, e.clientY - hh / 2));
            handle.classList.remove('cb-dock-left', 'cb-dock-right');
            handle.style.left = x + 'px'; handle.style.right = 'auto'; handle.style.top = y + 'px';
        }
    });
    const endDrag = (e) => {
        if (!dragging) return;
        dragging = false; handle.classList.remove('dragging');
        try { handle.releasePointerCapture(e.pointerId); } catch (_) { }
        if (moved) {
            handlePos = { side: (e.clientX < window.innerWidth / 2) ? 'left' : 'right', top: Math.max(0, Math.min(window.innerHeight - hh, e.clientY - hh / 2)) };
            applyHandlePos(); savePos();
        } else {
            togglePanel();
        }
    };
    handle.addEventListener('pointerup', endDrag);
    handle.addEventListener('pointercancel', () => { dragging = false; handle.classList.remove('dragging'); applyHandlePos(); });
    handle.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePanel(); } });

    $('cheatboard-close').addEventListener('click', togglePanel);
    document.addEventListener('keydown', (e) => { if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c')) togglePanel(); });
    window.addEventListener('resize', applyHandlePos);

    // Login gate: cheatboard visibile SOLO se c'è sessione utente E il modale di login è chiuso.
    // (Guardare solo espooUser non basta: può essere presente mentre il login è ancora mostrato
    //  — es. ri-login per token scaduto o password mancante — e la cheatboard apparirebbe sopra.)
    function applyLoginGate() {
        const lm = document.getElementById('login-modal');
        const loginShowing = lm && getComputedStyle(lm).display !== 'none';
        const logged = !!sessionStorage.getItem('espooUser') && !loginShowing;
        container.style.display = logged ? '' : 'none';
        handle.style.display = logged ? '' : 'none';
        if (!logged) { container.classList.remove('open'); handle.classList.remove('cb-hidden'); }
    }

    // --- 12. Wiring ---
    const on = (id, fn) => { const el = $(id); if (el) el.addEventListener('click', fn); };
    // Risorse
    on('cb-add-bugs', addBugs); on('cb-add-tokens', addTokens); on('cb-add-qbits', addQbits);
    on('cb-set-score-btn', setScore); on('cb-set-tokens-btn', setTokens); on('cb-set-qbits-btn', setQbits);
    on('cb-add-clicks', addClicks); on('cb-add-bps', addBps); on('cb-reset-bps', resetBps); on('cb-skip', skip1h); on('cb-chaos', chaos);
    // Prestige
    on('cb-goto-level', gotoLevel); on('cb-set-format-btn', setFormat); on('cb-prestige-ready', prestigeReady); on('cb-max-lab', maxLab); on('cb-ngplus', ngPlus); on('cb-add-format', addFormat);
    // Eventi
    on('cb-evt-404', evt404); on('cb-evt-matrix', evtMatrix); on('cb-evt-rick', evtRick); on('cb-evt-ricardo', evtRicardo); on('cb-evt-britney', evtBritney); on('cb-evt-golden', evtGolden); on('cb-evt-star', evtStar); on('cb-fury', fury); on('cb-reset-cd', resetCd); on('cb-stop-evt', stopEvt);
    // Scenari
    on('cb-preset-new', () => loadPreset(presetNew, 'Nuovo giocatore'));
    on('cb-preset-prestige', () => loadPreset(presetPrestige, 'Pronto 1° Prestige'));
    on('cb-preset-mid', () => loadPreset(presetMid, 'Mid-game'));
    on('cb-preset-end', () => loadPreset(presetEnd, 'Endgame'));
    on('cb-preset-balance', () => loadPreset(presetBalance, 'Punto bilanciamento'));
    // Sistema
    on('cb-unlock-shop', unlockShop); on('cb-lock-shop', lockShop); on('cb-unlock-skins', unlockSkins); on('cb-lock-skins', lockSkins); on('cb-unlock-ach', unlockAch); on('cb-lock-ach', lockAch); on('cb-army', army100);
    on('cb-god', godMode);
    on('cb-debug', debugToggle); on('cb-log', logState); on('cb-save', forceSave);
    on('cb-v2', forceV2); on('cb-hardreset', hardReset);

    // --- 13. Init ---
    activate('risorse');
    updateDebugUI();
    applyHandlePos();
    applyLoginGate();
    updateDash();
    setInterval(() => { applyLoginGate(); if (container.classList.contains('open')) updateDash(); }, 400);

})();
