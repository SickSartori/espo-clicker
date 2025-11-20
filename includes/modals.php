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

<div id="prestige-hub-modal" class="modal-backdrop" style="display: none;">
    <div class="modal-content" style="max-width: 450px; border-color: #9b59b6;"> 
        <button class="modal-close-btn">&times;</button>
        <h2 style="background-color: #4a235a; border-bottom: 1px solid #9b59b6; color: #f1c40f; text-align: center;">
            👑 Ufficio Promozioni
        </h2>
        
        <div class="settings-content" style="text-align: center; padding: 30px 20px;">
            <p style="color: #e0e0e0; font-size: 1.1rem; font-weight: bold; margin-bottom: 10px;">
                Valutazione Carriera
            </p>
            <p style="color: #bdc3c7; font-size: 0.9rem; line-height: 1.5; margin-bottom: 25px;">
                L'azienda è pronta a offrirti una promozione.<br>
                Vuoi visualizzare il contratto?
            </p>
            
            <div style="background: rgba(155, 89, 182, 0.1); border: 1px solid #8e44ad; padding: 20px; border-radius: 12px; margin-bottom: 25px;">
                <p style="margin: 0 0 5px 0; color: #d7bde2; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 1px;">Stima Guadagno</p>
                <p style="margin: 0; line-height: 1;">
                    <span id="prestige-gain-display" style="font-size: 3rem; font-weight: 800; color: #2ecc71; text-shadow: 0 0 10px rgba(46, 204, 113, 0.4);">0</span>
                    <span style="font-size: 1.2rem; color: #2ecc71; font-weight: bold;"> Token</span>
                </p>
            </div>

            <button id="btn-go-to-contract" class="buy-btn" style="background: linear-gradient(135deg, #8e44ad, #9b59b6); border: none; font-size: 1.1rem; padding: 15px; width: 100%; box-shadow: 0 4px 15px rgba(142, 68, 173, 0.4);">
                📄 Visualizza Contratto
            </button>
        </div>
    </div>
</div>

<div id="prestige-modal" class="modal-backdrop" style="display: none;">
    <div class="modal-content contract-modal">
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
            <button id="btn-cancel-contract" class="buy-btn" style="background-color: #7f8c8d; width: auto;">Rifiuta e Torna Indietro</button>
            <button id="btn-confirm-prestige" class="buy-btn prestige-btn signature-btn">
                ✍️ Firma e Accetta Promozione
            </button>
        </div>
    </div>
</div>