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

<div id="achievements-modal" class="modal-backdrop" style="display: none;">
    <div class="modal-content">
        <button class="modal-close-btn">&times;</button>
        <h2>🏆 Obiettivi</h2>
        <div id="achievement-list"></div>
    </div>
</div>

<div id="stats-modal" class="modal-backdrop" style="display: none;">
    <div class="modal-content">
        <button class="modal-close-btn">&times;</button>
        <h2>📈 Statistiche</h2>
        <div id="stats-list"></div>
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
        <div id="leaderboard-list"></div>
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
<div id="prestige-hub-modal" class="modal-backdrop" style="display: none;">
    <div class="modal-content" style="max-width: 500px;"> <button class="modal-close-btn">&times;</button>
        <h2 style="background-color: #4a235a; border-color: #8e44ad; color: #f1c40f;">👑 Ufficio Promozioni</h2>
        
        <div class="settings-content">
            <div id="prestige-section" style="text-align: center; padding: 20px;">
                <p style="color: #bdc3c7; font-size: 1.1rem;">Sei pronto per la promozione?</p>
                <p style="color: #95a5a6; font-size: 0.9rem; margin-bottom: 20px;">
                    Perderai bug ed edifici, ma otterrai Token Lab e Bonus permanenti.
                </p>
                
                <div style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <p style="margin: 0; color: #bdc3c7;">Guadagnerai:</p>
                    <p><span id="prestige-gain-display" style="font-size: 2.5rem; font-weight: bold; color: #2ecc71;">0</span> Token</p>
                </div>

                <button id="prestige-btn" class="buy-btn danger-btn" style="background-color: #8e44ad; font-size: 1.2rem; padding: 15px;">
                    ✍️ Firma e Accetta
                </button>
            </div>
        </div>
    </div>
</div>