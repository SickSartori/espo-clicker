<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Espòòò Clicker v16 (Refactor)</title>
    
    <link rel="stylesheet" href="./css/style.css">
    <link rel="stylesheet" href="./css/podio.css">
    <link rel="stylesheet" href="./css/modals.css">
    
    <link rel="icon" type="image/png" href="./image/favicon.png">
    
    <script src="./js/game-data.js" defer></script>
    <script src="./js/ui-functions.js" defer></script>
    <script src="./js/game-logic.js" defer></script>
    <script src="./js/script.js" defer></script> <script src="./js/podio.js" defer></script>
    <script src="./js/modals.js" defer></script>
</head>
<body>

    <div id="toast-container"></div>

    <div id="login-modal" class="modal-backdrop" style="display: none;">
        <div class="modal-content" style="max-width: 400px; height: auto;">
            <h2>Benvenuto!</h2>
            <p style="text-align: center; color: #bdc3c7;">Inserisci il tuo nome utente per iniziare e comparire nel podio.</p>
            <div class="settings-content">
                <div class="setting-item">
                    <label for="login-username-input">Nome Utente</label>
                    <input type="text" id="login-username-input" placeholder="Tuo Nome...">
                </div>
                <button id="login-btn" class="buy-btn">Entra</button>
            </div>
        </div>
    </div>

    <div id="overlay-buttons-container">
        <button id="open-achievements-btn" class="overlay-btn">🏆 Obiettivi</button>
        <button id="open-stats-btn" class="overlay-btn">📈 Statistiche</button>
        <button id="open-settings-btn" class="overlay-btn">⚙️ Impostazioni</button>
        <button id="open-leaderboard-btn" class="overlay-btn">🏆 Podio</button>
    </div>

    <div id="achievements-modal" class="modal-backdrop" style="display: none;">
        <div class="modal-content">
            <button class="modal-close-btn">&times;</button>
            <h2>🏆 Obiettivi</h2>
            <div id="achievement-list">
                </div>
        </div>
    </div>
    
    <div id="stats-modal" class="modal-backdrop" style="display: none;">
        <div class="modal-content">
            <button class="modal-close-btn">&times;</button>
            <h2>📈 Statistiche</h2>
            <div id="stats-list">
                </div>
        </div>
    </div>
    
    <div id="settings-modal" class="modal-backdrop" style="display: none;">
        <div class="modal-content">
            <button class="modal-close-btn">&times;</button>
            <h2>⚙️ Impostazioni</h2>
            
            <div class="settings-content">
                
                <div class="setting-item">
                    <label for="volume-slider">Volume Generale (<span id="volume-display">100</span>%)</label>
                    <input type="range" id="volume-slider" min="0" max="1" step="0.1" value="1">
                </div>
                
                <button id="save-settings-btn" class="buy-btn">Salva Impostazioni</button>
                
                <div class="danger-zone">
                    <h3>Zona Pericolosa</h3>
                    <p>Questa azione è irreversibile e cancellerà tutti i tuoi progressi, inclusi Punti Promozione e Obiettivi, e rimuoverà i tuoi punteggi dal podio.</p>
                    <button id="delete-save-btn" class="buy-btn danger-btn">CANCELLA SALVATAGGIO</button>
                </div>
            </div>
        </div>
    </div>
    
    <div id="leaderboard-modal" class="modal-backdrop" style="display: none;">
        <div class="modal-content">
            <button class="modal-close-btn">&times;</button>
            <h2>🏆 Podio Online</h2>
            <div id="leaderboard-list">
                </div>
        </div>
    </div>


    <div id="game-container">

        <div id="left-column" class="game-column">
            
            <div class="store-section" id="upgrade-store">
                <h2>⚡ Potenzia Te Stesso</h2>
                <div id="click-upgrade-list">
                    </div>
            </div>

            <div class="store-section" id="enhancement-store" style="display: none;">
                <h2>⚙️ Migliorie Edifici</h2>
                <div id="enhancement-list">
                    </div>
            </div>
            
            <div id="prestige-section" style="display: none;"> <h2>🚀 Promozione</h2>
                <div class="prestige-info">
                    <p>Punti Promozione: <span id="prestige-points-display">0</span></p>
                    <p>Resettando, otterrai <span id="prestige-gain-display">0</span> Punti Promozione.</p>
                    <p>Ogni punto aumenta BPS e Click del 1% (cumulativo).</p>
                </div>
                <button id="prestige-btn" class="buy-btn danger-btn">Ottieni Promozione (Reset)</button>
            </div>
        </div>

        <div id="center-column" class="game-column">
            <div id="clicker-section">
                <div id="click-feedback-container"></div>
                <button id="clicker-btn" title="Risolvi un Bug!">
                    <img id="manager-photo-clicked" src="./image/espo-click.png" alt="Click!" draggable="false">
                    <img id="manager-photo-normal" src="./image/espo.png" alt="Espòòò" draggable="false">
                </button>
                <div id="score-label">Bug Risolti</div>
                <div id="score-display">0</div>
                <div id="cps-display">BPS: 0.0</div>
                <div id="event-multiplier-display" style="display: none;"></div>
                <div id="prestige-bonus-display" class="prestige-info" style="display: none;">Bonus: +0%</div>
            </div>
        </div>


        <div id="right-column" class="game-column">
            
            <div class="store-section" id="building-store">
                <h2>📊 Strumenti e Team</h2>
                
                <div class="upgrade" id="item-assistenteQa"><div class="upgrade-details"><span id="name-assistenteQa" class="upgrade-name">Assistente QA</span><div id="bps-assistenteQa" class="upgrade-bps"></div><div id="cost-assistenteQa" class="upgrade-cost"></div></div><div class="upgrade-actions"><span id="count-assistenteQa" class="upgrade-count">0</span><button id="buy-assistenteQa" class="buy-btn buy-building-btn" data-upgrade-name="assistenteQa">Compra</button></div></div>
                <div class="upgrade" id="item-jiraTicket"><div class="upgrade-details"><span id="name-jiraTicket" class="upgrade-name">Jira Ticket</span><div id="bps-jiraTicket" class="upgrade-bps"></div><div id="cost-jiraTicket" class="upgrade-cost"></div></div><div class="upgrade-actions"><span id="count-jiraTicket" class="upgrade-count">0</span><button id="buy-jiraTicket" class="buy-btn buy-building-btn" data-upgrade-name="jiraTicket">Compra</button></div></div>
                <div class="upgrade" id="item-teamQa"><div class="upgrade-details"><span id="name-teamQa" class="upgrade-name">Team QA</span><div id="bps-teamQa" class="upgrade-bps"></div><div id="cost-teamQa" class="upgrade-cost"></div></div><div class="upgrade-actions"><span id="count-teamQa" class="upgrade-count">0</span><button id="buy-teamQa" class="buy-btn buy-building-btn" data-upgrade-name="teamQa">Compra</button></div></div>
                <div class="upgrade" id="item-automazioneTest"><div class="upgrade-details"><span id="name-automazioneTest" class="upgrade-name">Automazione Test</span><div id="bps-automazioneTest" class="upgrade-bps"></div><div id="cost-automazioneTest" class="upgrade-cost"></div></div><div class="upgrade-actions"><span id="count-automazioneTest" class="upgrade-count">0</span><button id="buy-automazioneTest" class="buy-btn buy-building-btn" data-upgrade-name="automazioneTest">Compra</button></div></div>
                <div class="upgrade" id="item-metodologiaAgile"><div class="upgrade-details"><span id="name-metodologiaAgile" class="upgrade-name">Metodologia Agile</span><div id="bps-metodologiaAgile" class="upgrade-bps"></div><div id="cost-metodologiaAgile" class="upgrade-cost"></div></div><div class="upgrade-actions"><span id="count-metodologiaAgile" class="upgrade-count">0</span><button id="buy-metodologiaAgile" class="buy-btn buy-building-btn" data-upgrade-name="metodologiaAgile">Compra</button></div></div>
                <div class="upgrade" id="item-aiDebugger"><div class="upgrade-details"><span id="name-aiDebugger" class="upgrade-name">AI Debugger</span><div id="bps-aiDebugger" class="upgrade-bps"></div><div id="cost-aiDebugger" class="upgrade-cost"></div></div><div class="upgrade-actions"><span id="count-aiDebugger" class="upgrade-count">0</span><button id="buy-aiDebugger" class="buy-btn buy-building-btn" data-upgrade-name="aiDebugger">Compra</button></div></div>
            </div>

            <div class="store-section" id="prestige-store" style="display: none;">
                <h2>⭐ Potenziamenti Promozione</h2>
                
                <div id="upgrade-sinergia" class="prestige-upgrade">
                    <div class="upgrade-details">
                        <span class="upgrade-name">Sinergia Manageriale</span>
                        <div class="upgrade-cost">Costo: <span id="cost-sinergia">1</span> PP</div>
                        <div class="upgrade-desc">Ogni punto promozione vale +0.1% in più.</div>
                    </div>
                    <div class="upgrade-actions">
                        <span id="count-sinergia" class="upgrade-count">0</span>
                        <button id="buy-sinergia" class="buy-btn prestige-btn" data-upgrade-name="sinergia">Compra</button>
                    </div>
                </div>
                
                <div id="upgrade-accelerazione" class="prestige-upgrade">
                    <div class="upgrade-details">
                        <span class="upgrade-name">Accelerazione Iniziale</span>
                        <div class="upgrade-cost">Costo: <span id="cost-accelerazione">2</span> PP</div>
                        <div class="upgrade-desc">Inizia ogni nuova run con 1 Assistente QA gratuito.</div>
                    </div>
                    <button id="buy-accelerazione" class="buy-btn prestige-btn" data-upgrade-name="accelerazione">Compra</button>
                </div>
                
                <div id="upgrade-ticketPremium" class="prestige-upgrade">
                    <div class="upgrade-details">
                        <span class="upgrade-name">Ticket Premium</span>
                        <div class="upgrade-cost">Costo: <span id="cost-ticketPremium">5</span> PP</div>
                        <div class="upgrade-desc">I Ticket Critici appaiono 2 volte più spesso.</div>
                    </div>
                    <button id="buy-ticketPremium" class="buy-btn prestige-btn" data-upgrade-name="ticketPremium">Compra</button>
                </div>
            </div>
        
        </div>

    </div>
    
    <div id="golden-bug" title="Un Ticket Critico! Clicca!">
        <img src="./image/bug.png" alt="Ticket Critico!">
    </div>  

    <audio id="sound-click" src="./sounds/Click.mp3" preload="auto"></audio>
    <audio id="sound-buy" src="./sounds/Buy.mp3" preload="auto"></audio>
    <audio id="sound-achievement" src="./sounds/Achievement.mp3" preload="auto"></audio>
    <audio id="sound-bluescreen" src="./sounds/bluescreen.mp3" loop preload="auto"></audio>

</body>
</html>