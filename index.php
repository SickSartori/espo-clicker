<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Espòòò Clicker</title>
    
    <link rel="stylesheet" href="./css/style.css">
    <link rel="stylesheet" href="./css/podio.css">
    <link rel="stylesheet" href="./css/modals.css">
    <link rel="stylesheet" href="./css/mobile.css">
    
    <link rel="icon" type="image/png" href="./image/favicon.png">
    
    
</head>
<body>

    <div id="toast-container"></div>

    <div id="login-modal" class="modal-backdrop" style="display: none;">
        <div class="modal-content">
            <h2>Accesso Account</h2>
            <p class="modal-desc">
                Inserisci le credenziali per giocare.<br>Se non hai un account, verrà creato ora.
            </p>
            <div class="settings-content">
                <div class="setting-item">
                    <label>Nome Utente</label>
                    <input type="text" id="login-username-input" placeholder="Es. MasterBug">
                </div>
                <div class="setting-item">
                    <label>Password</label>
                    <input type="password" id="login-password-input" placeholder="••••••••">
                </div>
                <button id="login-btn" class="buy-btn">Entra / Registrati</button>
            </div>
        </div>
    </div>

    <div id="overlay-buttons-container">
        <button id="open-achievements-btn" class="overlay-btn">🏆 Obiettivi</button>
        <button id="open-stats-btn" class="overlay-btn">📈 Statistiche</button>
        <button id="open-settings-btn" class="overlay-btn">⚙️ Impostazioni</button>
        <button id="open-leaderboard-btn" class="overlay-btn">🏆 Classifica</button>
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
                    <label>Volume Generale (<span id="volume-display">100</span>%)</label>
                    <input type="range" id="volume-slider" min="0" max="1" step="0.1" value="1">
                </div>
                
                <button id="save-settings-btn" class="buy-btn" style="background-color: #27ae60;">Salva e Chiudi</button>

                <div class="account-section">
                    <h3>Account</h3>
                    <p style="margin: 5px 0 10px 0; color: #bdc3c7;">
                        Utente: <span id="current-username-display" style="color: #3498db; font-weight: bold;">...</span>
                    </p>
                    <button id="open-account-btn" class="buy-btn" style="background-color: #34495e; border: 1px solid #5d7c9a;">
                        Gestione Credenziali & Logout
                    </button>
                </div>
            </div>
        </div>
    </div>

    <div id="account-modal" class="modal-backdrop" style="display: none;">
        <div class="modal-content">
            <button class="modal-close-btn">&times;</button>
            <h2>🔐 Gestione Account</h2>
            
            <div class="settings-content">
                
                <div class="setting-item">
                    <label>Cambia Nome Utente</label>
                    <div class="input-group-row">
                        <input type="text" id="new-username-input" placeholder="Nuovo Nome">
                        <button id="change-username-btn" class="buy-btn" style="width: auto; margin: 0;">Salva</button>
                    </div>
                </div>

                <div class="setting-item" style="margin-top: 10px;">
                    <label>Cambia Password</label>
                    <input type="password" id="old-password-input" placeholder="Vecchia Password" style="margin-bottom: 5px;">
                    <input type="password" id="new-password-input" placeholder="Nuova Password">
                    <button id="change-password-btn" class="buy-btn" style="margin-top: 5px;">Aggiorna Password</button>
                </div>

                <div style="border-top: 1px solid rgba(255,255,255,0.1); margin: 15px 0;"></div>

                <button id="logout-btn" class="buy-btn logout-btn">Cambia Utente (Logout)</button>

                <div class="danger-zone">
                    <h3>⚠️ Zona Pericolosa</h3>
                    <p>Eliminazione definitiva account.</p>
                    <input type="password" id="delete-confirm-password" placeholder="Password di conferma">
                    <button id="delete-save-btn" class="buy-btn danger-btn" style="margin-top: 10px;">ELIMINA ACCOUNT</button>
                </div>
            </div>
        </div>
    </div>
    
    <div id="leaderboard-modal" class="modal-backdrop" style="display: none;">
        <div class="modal-content">
            <button class="modal-close-btn">&times;</button>
            <h2>🏆 Classifica</h2>
            <div id="leaderboard-list">
            </div>
        </div>
    </div>
    <div id="prestige-modal" class="modal-backdrop" style="display: none;">
        <div class="modal-content contract-modal">
            <button class="modal-close-btn">&times;</button>
            
            <div class="contract-header">
                <h2>📜 Contratto di Promozione</h2>
                <p>L'azienda ha notato il tuo eccellente lavoro.</p>
            </div>

            <div class="contract-body">
                <div class="contract-columns">
                    <div class="contract-column loss">
                        <h3>📉 Cedi al Dipartimento</h3>
                        <ul>
                            <li>❌ Tutti i Bug attuali</li>
                            <li>❌ Tutti gli Edifici</li>
                            <li>❌ Potenziamenti Click/Auto</li>
                        </ul>
                    </div>

                    <div class="contract-separator">
                        <span>vs</span>
                    </div>

                    <div class="contract-column gain">
                        <h3>📈 Il tuo Nuovo Pacchetto</h3>
                        <div class="gain-item">
                            <span class="gain-label">Nuovi Token Lab</span>
                            <span id="contract-gain-token" class="gain-value">+0</span>
                        </div>
                        <div class="gain-item">
                            <span class="gain-label">Nuovo Bonus Carriera</span>
                            <span id="contract-gain-bonus" class="gain-value">+0%</span>
                        </div>
                        <p class="gain-note">Il Bonus Carriera è permanente!</p>
                    </div>
                </div>
            </div>

            <div class="contract-footer">
                <button id="cancel-prestige-btn" class="buy-btn" style="background-color: #7f8c8d; width: auto;">Rifiuta Offerta</button>
                <button id="confirm-prestige-btn" class="buy-btn prestige-btn signature-btn">
                    ✍️ Firma e Accetta Promozione
                </button>
            </div>
        </div>
    </div>


    <div id="game-container">

        <div id="left-column" class="game-column">
    
    <div class="tabs-header">
        <button class="tab-btn active" data-target="upgrade-store" id="tab-click">
            ⚡ Click
        </button>
        <button class="tab-btn" data-target="enhancement-store" id="tab-auto">
            ⚙️ Auto
        </button>
        <button class="tab-btn" data-target="prestige-wrapper" id="tab-prestige">
            ⭐ Lab
        </button>
    </div>

    <div id="upgrade-store" class="tab-content active-tab">
        <div class="section-header">
            <h2>Potenziamenti Click</h2>
            <button id="filter-btn-click" class="filter-btn" data-list="click-upgrade-list">
                <span class="icon">👁️</span> <span class="text">Tutti</span>
            </button>
        </div>
        <div id="click-upgrade-list"></div>
        <div id="click-upgrade-empty" class="empty-state-msg" style="display: none;">
            Nessun potenziamento disponibile.
        </div>
    </div>

    <div id="enhancement-store" class="tab-content" style="display: none;">
        <div class="section-header">
            <h2>Migliorie Assistenti</h2>
            <button id="filter-btn-auto" class="filter-btn" data-list="enhancement-list">
                <span class="icon">👁️</span> <span class="text">Tutti</span>
            </button>
        </div>
        <div id="enhancement-list"></div>
        <div id="enhancement-empty" class="empty-state-msg" style="display: none;">
            Nessuna miglioria disponibile.
        </div>
    </div>

    <div id="prestige-wrapper" class="tab-content" style="display: none;">
        
        <div id="prestige-section" class="store-section" style="display: none; border-bottom: 2px solid rgba(74, 101, 130, 0.5); margin-bottom: 15px;">
            <div class="prestige-info" style="text-align: center;">
                <p style="font-size: 0.9rem; color: #bdc3c7;">Resettando ora otterrai:</p>
                <p><span id="prestige-gain-display" style="font-size: 1.4rem; font-weight: bold; color: #2ecc71;">0</span> Punti</p>
            </div>
            <button id="prestige-btn" class="buy-btn danger-btn" style="margin-top: 10px;">Ottieni Promozione</button>
        </div>

        <div id="prestige-store" style="display: block;">
            <div class="section-header">
                <h2 style="color: #f1c40f;">Laboratorio</h2>
                <button id="filter-btn-lab" class="filter-btn" data-list="prestige-list-container">
                    <span class="icon">👁️</span> <span class="text">Tutti</span>
                </button>
            </div>
            
            <div id="prestige-list-container">
                <div id="upgrade-sinergia" class="prestige-upgrade">
                    <div class="upgrade-details">
                        <span class="upgrade-name">Sinergia Manageriale</span>
                        <div class="upgrade-desc">Bonus Carriera sale più velocemente.</div>
                        <div class="upgrade-cost">Costo: <span id="cost-sinergia">1</span> Pt</div>
                    </div>
                    <div class="upgrade-actions">
                        <span id="count-sinergia" class="upgrade-count">0</span>
                        <button id="buy-sinergia" class="buy-btn prestige-btn" data-upgrade-name="sinergia">Compra</button>
                    </div>
                </div>
                
                <div id="upgrade-accelerazione" class="prestige-upgrade">
                    <div class="upgrade-details">
                        <span class="upgrade-name">Accelerazione Iniziale</span>
                        <div class="upgrade-desc">Start con 1 Assistente QA.</div>
                        <div class="upgrade-cost">Costo: <span id="cost-accelerazione">2</span> Pt</div>
                    </div>
                    <button id="buy-accelerazione" class="buy-btn prestige-btn" data-upgrade-name="accelerazione">Compra</button>
                </div>
                
                <div id="upgrade-ticketPremium" class="prestige-upgrade">
                    <div class="upgrade-details">
                        <span class="upgrade-name">Ticket Premium</span>
                        <div class="upgrade-desc">Critici x2 più frequenti.</div>
                        <div class="upgrade-cost">Costo: <span id="cost-ticketPremium">5</span> Pt</div>
                    </div>
                    <button id="buy-ticketPremium" class="buy-btn prestige-btn" data-upgrade-name="ticketPremium">Compra</button>
                </div>

                <div id="upgrade-outsourcing" class="prestige-upgrade">
                    <div class="upgrade-details">
                        <span class="upgrade-name">Outsourcing</span>
                        <div class="upgrade-desc">-1% Costo Edifici/liv.</div>
                        <div class="upgrade-cost">Costo: <span id="cost-outsourcing">10</span> Pt</div>
                    </div>
                    <div class="upgrade-actions">
                        <span id="count-outsourcing" class="upgrade-count">0</span>
                        <button id="buy-outsourcing" class="buy-btn prestige-btn" data-upgrade-name="outsourcing">Compra</button>
                    </div>
                </div>

                <div id="upgrade-paracadute" class="prestige-upgrade">
                    <div class="upgrade-details">
                        <span class="upgrade-name">Paracadute d'Oro</span>
                        <div class="upgrade-desc">Start con 5% bug precedenti.</div>
                         <div class="upgrade-cost">Costo: <span id="cost-paracadute">25</span> Pt</div>
                    </div>
                    <button id="buy-paracadute" class="buy-btn prestige-btn" data-upgrade-name="paracadute">Compra</button>
                </div>

                <div id="upgrade-crunchTime" class="prestige-upgrade">
                    <div class="upgrade-details">
                        <span class="upgrade-name">Crunch Time</span>
                        <div class="upgrade-desc">Abilità Attiva: BPS x3.</div>
                         <div class="upgrade-cost">Costo: <span id="cost-crunchTime">50</span> Pt</div>
                    </div>
                    <button id="buy-crunchTime" class="buy-btn prestige-btn" data-upgrade-name="crunchTime">Compra</button>
                </div>
            </div> 
            
            <div id="prestige-empty" class="empty-state-msg" style="display: none;">
                Tutti i potenziamenti Lab acquisiti!
            </div>
        </div>
    </div>
</div>

    <div id="center-column" class="game-column">
    <div id="clicker-section">

        <div id="hud-stats-container" class="hud-stats-bar" style="display: none; animation: fadeIn 1s;">
            
            <div class="hud-item">
                <span class="hud-label">Bonus Attivo</span>
                <span id="display-career-bonus" class="hud-value" style="color: #f1c40f;">+0%</span>
            </div>

            <div class="hud-separator"></div>

            <div class="hud-item">
                <span class="hud-label">Token Lab</span>
                <span id="display-spendable-points" class="hud-value">0</span>
            </div>
            
        </div>

        <div id="click-feedback-container"></div>
        <button id="clicker-btn" title="Risolvi un Bug!">
            <img id="manager-photo-clicked" src="./image/espo-click.png" alt="Click!" draggable="false">
            <img id="manager-photo-normal" src="./image/espo.png" alt="Espòòò" draggable="false">
        </button>
        
        <div id="score-label">Bug Risolti</div>
        <div id="score-display">0</div>
        <div id="cps-display">BPS: 0.0</div>

        <button id="skill-crunchTime" class="skill-btn" style="display: none;">
            🔥 CRUNCH TIME 🔥
            <div class="skill-timer">Pronto!</div>
        </button>

        <div id="event-multiplier-display" style="display: none;"></div>
        <div id="prestige-bonus-display" class="prestige-info" style="display: none;">Bonus: +0%</div>
    </div>
</div>



        <div id="right-column" class="game-column">
            
            <div class="store-section" id="building-store">
                <h2>👥 Assistenti</h2>
                
                <div id="buy-controls" style="display: flex; gap: 10px; margin-bottom: 15px; justify-content: center;">
                    <button id="btn-1x" class="buy-btn" style="background-color: #27ae60; flex: 1;">1x</button>
                    <button id="btn-10x" class="buy-btn" style="background-color: #34495e; flex: 1;">10x</button>
                </div>

                <div class="upgrade" id="item-assistenteQa">
                    <div class="upgrade-details">
                        <span id="name-assistenteQa" class="upgrade-name">Assistente QA</span>
                        <div id="bps-assistenteQa" class="upgrade-bps"></div>
                        <div id="cost-assistenteQa" class="upgrade-cost"></div>
                    </div>
                    <div class="upgrade-actions">
                        <span id="count-assistenteQa" class="upgrade-count">0</span>
                        <button id="buy-assistenteQa" class="buy-btn buy-building-btn" data-upgrade-name="assistenteQa">Compra</button>
                    </div>
                </div>

                <div class="upgrade" id="item-jiraTicket">
                    <div class="upgrade-details">
                        <span id="name-jiraTicket" class="upgrade-name">Jira Ticket</span>
                        <div id="bps-jiraTicket" class="upgrade-bps"></div>
                        <div id="cost-jiraTicket" class="upgrade-cost"></div>
                    </div>
                    <div class="upgrade-actions">
                        <span id="count-jiraTicket" class="upgrade-count">0</span>
                        <button id="buy-jiraTicket" class="buy-btn buy-building-btn" data-upgrade-name="jiraTicket">Compra</button>
                    </div>
                </div>

                <div class="upgrade" id="item-teamQa">
                    <div class="upgrade-details">
                        <span id="name-teamQa" class="upgrade-name">Team QA</span>
                        <div id="bps-teamQa" class="upgrade-bps"></div>
                        <div id="cost-teamQa" class="upgrade-cost"></div>
                    </div>
                    <div class="upgrade-actions">
                        <span id="count-teamQa" class="upgrade-count">0</span>
                        <button id="buy-teamQa" class="buy-btn buy-building-btn" data-upgrade-name="teamQa">Compra</button>
                    </div>
                </div>

                <div class="upgrade" id="item-automazioneTest">
                    <div class="upgrade-details">
                        <span id="name-automazioneTest" class="upgrade-name">Automazione Test</span>
                        <div id="bps-automazioneTest" class="upgrade-bps"></div>
                        <div id="cost-automazioneTest" class="upgrade-cost"></div>
                    </div>
                    <div class="upgrade-actions">
                        <span id="count-automazioneTest" class="upgrade-count">0</span>
                        <button id="buy-automazioneTest" class="buy-btn buy-building-btn" data-upgrade-name="automazioneTest">Compra</button>
                    </div>
                </div>

                <div class="upgrade" id="item-metodologiaAgile">
                    <div class="upgrade-details">
                        <span id="name-metodologiaAgile" class="upgrade-name">Metodologia Agile</span>
                        <div id="bps-metodologiaAgile" class="upgrade-bps"></div>
                        <div id="cost-metodologiaAgile" class="upgrade-cost"></div>
                    </div>
                    <div class="upgrade-actions">
                        <span id="count-metodologiaAgile" class="upgrade-count">0</span>
                        <button id="buy-metodologiaAgile" class="buy-btn buy-building-btn" data-upgrade-name="metodologiaAgile">Compra</button>
                    </div>
                </div>

                <div class="upgrade" id="item-aiDebugger">
                    <div class="upgrade-details">
                        <span id="name-aiDebugger" class="upgrade-name">AI Debugger</span>
                        <div id="bps-aiDebugger" class="upgrade-bps"></div>
                        <div id="cost-aiDebugger" class="upgrade-cost"></div>
                    </div>
                    <div class="upgrade-actions">
                        <span id="count-aiDebugger" class="upgrade-count">0</span>
                        <button id="buy-aiDebugger" class="buy-btn buy-building-btn" data-upgrade-name="aiDebugger">Compra</button>
                    </div>
                </div>
                
                <div class="upgrade" id="item-quantumServer">
                    <div class="upgrade-details">
                        <span id="name-quantumServer" class="upgrade-name">Quantum Server</span>
                        <div id="bps-quantumServer" class="upgrade-bps"></div>
                        <div id="cost-quantumServer" class="upgrade-cost"></div>
                    </div>
                    <div class="upgrade-actions">
                        <span id="count-quantumServer" class="upgrade-count">0</span>
                        <button id="buy-quantumServer" class="buy-btn buy-building-btn" data-upgrade-name="quantumServer">Compra</button>
                    </div>
                </div>
                
                <div class="upgrade" id="item-reteNeuraleGalattica">
                    <div class="upgrade-details">
                        <span id="name-reteNeuraleGalattica" class="upgrade-name">Rete Galattica</span>
                        <div id="bps-reteNeuraleGalattica" class="upgrade-bps"></div>
                        <div id="cost-reteNeuraleGalattica" class="upgrade-cost"></div>
                    </div>
                    <div class="upgrade-actions">
                        <span id="count-reteNeuraleGalattica" class="upgrade-count">0</span>
                        <button id="buy-reteNeuraleGalattica" class="buy-btn buy-building-btn" data-upgrade-name="reteNeuraleGalattica">Compra</button>
                    </div>
                </div>
                
                <div class="upgrade" id="item-debugTemporale">
                    <div class="upgrade-details">
                        <span id="name-debugTemporale" class="upgrade-name">Debug Temporale</span>
                        <div id="bps-debugTemporale" class="upgrade-bps"></div>
                        <div id="cost-debugTemporale" class="upgrade-cost"></div>
                    </div>
                    <div class="upgrade-actions">
                        <span id="count-debugTemporale" class="upgrade-count">0</span>
                        <button id="buy-debugTemporale" class="buy-btn buy-building-btn" data-upgrade-name="debugTemporale">Compra</button>
                    </div>
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

    <script src="./js/game-data.js" defer></script>
    <script src="./js/ui-functions.js" defer></script>
    <script src="./js/game-logic.js" defer></script>
    <script src="./js/script.js" defer></script> 
    <script src="./js/podio.js" defer></script>
    <script src="./js/modals.js" defer></script>
</body>
</html>