<div id="login-modal" class="modal-backdrop" style="display: none;">
    <div class="modal-content" style="max-width: 380px; border-top: 4px solid #3498db;">
        
        <div style="text-align: center; padding: 30px 20px 10px 20px;">
            <div style="font-size: 3.5rem; color: #3498db; margin-bottom: 15px; text-shadow: 0 0 20px rgba(52, 152, 219, 0.4);">
                <i class="fa-solid fa-gamepad"></i>
            </div>
            <h2 style="background: none; border: none; padding: 0; font-size: 1.8rem; margin-bottom: 5px;">Espòòò Clicker</h2>
            <p style="color: #95a5a6; font-size: 0.9rem; margin: 0;">
                Accedi o crea un account per salvare i progressi nel cloud.
            </p>
        </div>

        <div class="settings-content" style="padding: 20px 30px 40px 30px;">
            
            <div class="input-stack">
                <div class="input-group-modern">
                    <div class="input-icon"><i class="fa-solid fa-user"></i></div>
                    <input type="text" id="login-username-input" placeholder="Nome Utente">
                </div>

                <div class="input-group-modern">
                    <div class="input-icon"><i class="fa-solid fa-lock"></i></div>
                    <input type="password" id="login-password-input" placeholder="Password">
                    <button class="toggle-pass-btn icon-only" data-target="login-password-input" tabindex="-1">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                </div>
            </div>

            <button id="login-btn" class="buy-btn save-btn" style="margin-top: 25px; height: 50px; font-size: 1rem; box-shadow: 0 4px 15px rgba(46, 204, 113, 0.3); gap: 10px;">
                <i class="fa-solid fa-rocket"></i> Entra / Registrati
            </button>
            
            </div>
    </div>
</div>

<div id="achievements-modal" class="modal-backdrop" style="display: none;">
    <div class="modal-content">
        <button class="modal-close-btn">&times;</button>
        <h2><i class="fa-solid fa-trophy"></i> Obiettivi</h2>
        <div id="achievement-list"></div>
    </div>
</div>

<div id="stats-modal" class="modal-backdrop" style="display: none;">
    <div class="modal-content">
        <button class="modal-close-btn">&times;</button>
        <h2><i class="fa-solid fa-chart-pie"></i> Statistiche</h2>
        <div id="stats-list"></div>
    </div>
</div>

<div id="settings-modal" class="modal-backdrop" style="display: none;">
    <div class="modal-content" style="max-width: 400px;">
        <button class="modal-close-btn">&times;</button>
        <h2><i class="fa-solid fa-sliders"></i> Configurazione</h2>
        
        <div class="settings-content">
            <div class="settings-group">
                <h3 class="group-title">Audio & Suoni</h3>
                
                <div class="slider-row">
                    <span class="slider-icon"><i class="fa-solid fa-volume-high"></i></span>
                    <div class="slider-wrapper">
                        <label>Master</label>
                        <input type="range" id="master-slider" class="custom-slider" min="0" max="1" step="0.1" value="1">
                    </div>
                    <span id="master-vol-display" class="slider-value">100%</span>
                </div>

                <div class="slider-row">
                    <span class="slider-icon"><i class="fa-solid fa-bell"></i></span>
                    <div class="slider-wrapper">
                        <label>Effetti</label>
                        <input type="range" id="sfx-slider" class="custom-slider" min="0" max="1" step="0.1" value="1">
                    </div>
                    <span id="sfx-vol-display" class="slider-value">100%</span>
                </div>

                <div class="slider-row">
                    <span class="slider-icon"><i class="fa-solid fa-music"></i></span>
                    <div class="slider-wrapper">
                        <label>Musica</label>
                        <input type="range" id="music-slider" class="custom-slider" min="0" max="1" step="0.1" value="0.5">
                    </div>
                    <span id="music-vol-display" class="slider-value">50%</span>
                </div>
            </div>

            <div class="account-preview-card">
                <div class="acc-details">
                    <small>Utente connesso</small>
                    <div id="current-username-display" class="acc-name">...</div>
                </div>
                <button id="open-account-btn" class="buy-btn ghost-btn">
                    <i class="fa-solid fa-user-gear"></i> Gestisci
                </button>
            </div>

            <button id="save-settings-btn" class="buy-btn save-btn">
                <i class="fa-solid fa-check"></i> Salva Configurazione
            </button>
        </div>
    </div>
</div>

<div id="account-modal" class="modal-backdrop" style="display: none;">
    <div class="modal-content" style="max-width: 450px;">
        <button class="modal-close-btn">&times;</button>
        <h2><i class="fa-solid fa-id-card-clip"></i> Profilo Utente</h2>
        
        <div class="settings-content">
            
            <div class="settings-group">
                <h3 class="group-title">Identità</h3>
                <div class="input-group-modern">
                    <div class="input-icon"><i class="fa-solid fa-user"></i></div>
                    <input type="text" id="new-username-input" placeholder="Nuovo Nome Utente">
                    <button id="change-username-btn" class="action-btn-small" title="Salva Nome"><i class="fa-solid fa-floppy-disk"></i></button>
                </div>
            </div>

            <div class="settings-group">
                <h3 class="group-title">Sicurezza</h3>
                <div class="input-stack">
                    <div class="input-group-modern">
                        <div class="input-icon"><i class="fa-solid fa-lock"></i></div>
                        <input type="password" id="old-password-input" placeholder="Vecchia Password">
                        <button class="toggle-pass-btn icon-only" data-target="old-password-input"><i class="fa-solid fa-eye"></i></button>
                    </div>
                    <div class="input-group-modern">
                        <div class="input-icon"><i class="fa-solid fa-key"></i></div>
                        <input type="password" id="new-password-input" placeholder="Nuova Password">
                        <button class="toggle-pass-btn icon-only" data-target="new-password-input"><i class="fa-solid fa-eye"></i></button>
                    </div>
                    <button id="change-password-btn" class="buy-btn outline-btn" style="margin-top: 5px;">Aggiorna Password</button>
                </div>
            </div>

            <div style="text-align: center; margin: 15px 0;">
                <button id="logout-btn" class="text-link-btn">
                    <i class="fa-solid fa-right-from-bracket"></i> Disconnetti (Logout)
                </button>
            </div>

            <div class="danger-zone-pro">
                <div class="danger-header">
                    <i class="fa-solid fa-biohazard"></i> AREA CRITICA
                </div>
                
                <div class="input-group-modern danger-input">
                    <div class="input-icon danger"><i class="fa-solid fa-shield-halved"></i></div>
                    <input type="password" id="danger-zone-password" placeholder="Password per confermare">
                    <button class="toggle-pass-btn icon-only" data-target="danger-zone-password"><i class="fa-solid fa-eye"></i></button>
                </div>

                <div class="danger-buttons-row">
                    <button id="reset-progress-btn" class="danger-btn-small orange" title="Resetta Progressi">
                        <i class="fa-solid fa-rotate-left"></i> Reset
                    </button>
                    <button id="delete-save-btn" class="danger-btn-small red" title="Elimina Account">
                        <i class="fa-solid fa-trash-can"></i> Elimina
                    </button>
                </div>
            </div>

        </div>
    </div>
</div>

<div id="leaderboard-modal" class="modal-backdrop" style="display: none;">
    <div class="modal-content">
        <button class="modal-close-btn">&times;</button>
        <h2><i class="fa-solid fa-medal"></i> Classifica</h2>
        <div id="leaderboard-list"></div>
    </div>
</div>

<div id="prestige-hub-modal" class="modal-backdrop" style="display: none;">
    <div class="modal-content" style="max-width: 450px; border-color: #9b59b6;"> 
        <button class="modal-close-btn">&times;</button>
        <h2 style="background-color: #4a235a; border-bottom: 1px solid #9b59b6; color: #f1c40f; text-align: center;">
            <i class="fa-solid fa-rocket"></i> Ufficio Promozioni
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
                <i class="fa-solid fa-file-signature"></i> Visualizza Contratto
            </button>
        </div>
    </div>
</div>

<div id="prestige-modal" class="modal-backdrop" style="display: none;">
    <div class="modal-content contract-modal">
        <div class="contract-header">
            <h2><i class="fa-solid fa-file-contract"></i> Contratto di Promozione</h2>
            <p>L'azienda ha notato il tuo eccellente lavoro.</p>
        </div>

        <div class="contract-body">
            <div class="contract-columns">
                <div class="contract-column loss">
                    <h3><i class="fa-solid fa-arrow-trend-down"></i> Cedi al Dipartimento</h3>
                    <ul>
                        <li> Tutti i Bug attuali</li>
                        <li> Tutti i teams</li>
                        <li> Potenziamenti Click/Auto</li>
                    </ul>
                </div>

                <div class="contract-separator">
                    <span>vs</span>
                </div>

                <div class="contract-column gain">
                    <h3><i class="fa-solid fa-arrow-trend-up"></i> Il tuo Nuovo Pacchetto</h3>
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
                <i class="fa-solid fa-signature"></i> Firma e Accetta Promozione
            </button>
        </div>
    </div>
</div>

<div id="skins-modal" class="modal-backdrop" style="display: none;">
    <div class="modal-content">
        <button class="modal-close-btn">&times;</button>
        <h2><i class="fa-solid fa-shirt"></i> Guardaroba</h2>
        <p class="modal-desc" style="text-align: center; margin-bottom: 15px;">
            Personalizza il tuo look.<br>Sblocca nuove skin completando obiettivi speciali!
        </p>
        
        <div id="skins-grid" style="
            display: grid; 
            grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); 
            gap: 15px; 
            padding: 20px; 
            overflow-y: auto; 
            max-height: 60vh;
        "></div>
    </div>
</div>

<div id="help-modal" class="modal-backdrop" style="display: none;">
    <div class="modal-content" style="max-width: 600px;">
        <button class="modal-close-btn">&times;</button>
        <h2><i class="fa-solid fa-book-open"></i> Manuale del Dipendente</h2>
        
        <div class="settings-content" style="text-align: left; line-height: 1.6;">
            
            <div style="margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">
                <h3 style="color: #3498db; margin-bottom: 5px;"><i class="fa-solid fa-bullseye"></i> 1. L'Obiettivo</h3>
                <p style="color: #bdc3c7; font-size: 0.95rem; margin: 0;">
                    Benvenuto alla <strong>Espò Solutions</strong>! Il tuo lavoro è semplice: 
                    risolvi i <strong>Bug</strong> cliccando sulla faccia del Manager. 
                    Più bug risolvi, più budget avrai per assumere aiuti.
                </p>
            </div>

            <div style="margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">
                <h3 style="color: #2ecc71; margin-bottom: 5px;"><i class="fa-solid fa-robot"></i> 2. Automazione (BPS)</h3>
                <p style="color: #bdc3c7; font-size: 0.95rem; margin: 0;">
                    Cliccare è faticoso. Nel menu <strong>👥 Teams</strong> puoi assumere personale (Assistenti, Team QA, AI) che lavorerà per te.
                    <br>
                    <strong>BPS (Bug Per Secondo):</strong> Indica quanti bug il tuo team risolve automaticamente ogni secondo, anche se non fai nulla.
                </p>
            </div>

            <div style="margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">
                <h3 style="color: #f1c40f; margin-bottom: 5px;"><i class="fa-solid fa-bolt"></i> 3. Eventi & Anomalie</h3>
                <p style="color: #bdc3c7; font-size: 0.95rem; margin: 0;">
                    Il sistema è instabile. Tieni gli occhi aperti per:
                </p>
                <ul style="color: #ecf0f1; font-size: 0.9rem; margin-top: 5px; padding-left: 20px; list-style: none;">
                    <li style="margin-bottom: 5px;"><i class="fa-solid fa-bug" style="color:#f1c40f; width: 20px;"></i> <strong>Golden Bug:</strong> Appare casualmente. Cliccalo subito!</li>
                    
                    <li style="margin-bottom: 5px;"><i class="fa-solid fa-display" style="color:#3498db; width: 20px;"></i> <strong>Errore 404:</strong> Il sistema crasha! Produzione moltiplicata.</li>
                    
                    <li style="margin-bottom: 5px;"><i class="fa-solid fa-music" style="color:#e74c3c; width: 20px;"></i> <strong>Eventi Skin:</strong> Alcuni costumi leggendari scatenano eventi musicali.</li>
                </ul>
            </div>

            <div style="margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">
                <h3 style="color: #9b59b6; margin-bottom: 5px;"><i class="fa-solid fa-flask"></i> 4. Laboratorio (Prestigio)</h3>
                <p style="color: #bdc3c7; font-size: 0.95rem; margin: 0;">
                    Quando il gioco diventa lento, puoi chiedere una <strong>Promozione</strong>.
                    <br>
                    <strong>Attenzione:</strong> Resettera i tuoi bug e i tuoi edifici, ma in cambio otterrai <strong>Token Lab</strong>.
                    Usa i Token nel Laboratorio per comprare potenziamenti permanenti che renderanno la tua prossima partita velocissima.
                </p>
            </div>

            <div style="margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">
                <h3 style="color: #e67e22; margin-bottom: 5px;"><i class="fa-solid fa-calculator"></i> 5. Matematica dei Bonus</h3>
                <p style="color: #bdc3c7; font-size: 0.95rem; margin: 0;">
                    Come faccio a fare numeri enormi? Semplice: <strong>I Moltiplicatori si sommano!</strong>
                </p>
                <ul style="color: #ecf0f1; font-size: 0.9rem; margin-top: 5px; padding-left: 20px;">
                    <li><strong>Bonus Permanente:</strong> Deriva dai tuoi <em>Prestigio</em> e dagli <em>Obiettivi</em> sbloccati. È la tua base (es. x2.0).</li>
                    <li><strong>Bonus Temporanei:</strong> Eventi (es. 404) e Abilità (Crunch Time x7).</li>
                    <li><strong>Il Segreto:</strong> Se attivi tutto insieme, i bonus si moltiplicano!<br>
                    <em>Esempio:</em> Base (x2) * Crunch Time (x7) = <strong>x14 Totale!</strong></li>
                </ul>
            </div>

            <div style="margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">
                <h3 style="color: #1abc9c; margin-bottom: 5px;"><i class="fa-solid fa-user"></i> 6. Account & Salvataggi</h3>
                <p style="color: #bdc3c7; font-size: 0.95rem; margin: 0;">
                    I tuoi dati sono al sicuro nel Cloud della Espò Solutions.
                </p>
                <ul style="color: #ecf0f1; font-size: 0.9rem; margin-top: 5px; padding-left: 20px;">
                    <li>Puoi fare <strong>Login</strong> da qualsiasi dispositivo per recuperare i tuoi progressi.</li>
                    <li>Il gioco salva automaticamente ogni 10 secondi.</li>
                    <li>Se esci dal sito, guadagnerai comunque bug (Efficienza ridotta) fino a 12 ore.</li>
                </ul>
            </div>

            <div>
                <h3 style="color: #e74c3c; margin-bottom: 5px;"><i class="fa-solid fa-lightbulb"></i> 7. Consigli Utili</h3>
                <ul style="color: #ecf0f1; font-size: 0.9rem; margin-top: 5px; padding-left: 20px;">
                    <li>Sblocca gli <strong>Obiettivi</strong> per ottenere premi e nuove <strong>Skin</strong>.</li>
                    <li>Le Skin non sono solo estetiche: le Leggendarie hanno poteri nascosti.</li>
                    <li>Controlla la <strong>Classifica</strong> per vedere chi è il manager migliore!</li>
                </ul>
            </div>

        </div>
    </div>
</div>