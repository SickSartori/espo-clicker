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

                <button id="open-advanced-audio-btn" class="buy-btn ghost-btn" style="width: 100%; margin-top: 15px; justify-content: center;">
                    <i class="fa-solid fa-sliders"></i> Mixer Audio & Video
                </button>
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
                <i class="fa-solid fa-floppy-disk"></i> <p style="margin-left: 5px;"> Chiudi & Salva</p>
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

<div id="advanced-audio-modal" class="modal-backdrop" style="display: none; z-index: 2200;">
    <div class="modal-content" style="max-width: 500px; max-height: 85vh; display: flex; flex-direction: column; overflow: hidden;">
        
        <div class="modal-header-custom" style="
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            padding: 15px 20px; 
            background-color: #34495e; 
            border-bottom: 1px solid #4a6582;
            flex-shrink: 0;">
            
            <button id="header-back-btn" class="header-action-btn" title="Torna alle Opzioni">
                <i class="fa-solid fa-chevron-left"></i> Indietro
            </button>

            <h2 style="margin: 0; padding: 0; font-size: 1.2rem; border: none; background: transparent;">
                <i class="fa-solid fa-sliders"></i> Mixer
            </h2>

            <button id="header-reset-btn" class="header-action-btn reset" title="Ripristina Default">
                <i class="fa-solid fa-rotate-left"></i> Reset
            </button>
        </div>
        
        <div class="settings-content" style="padding: 10px 20px 20px 20px; overflow-y: auto; flex-grow: 1;">
            <p style="font-size: 0.85rem; color: #95a5a6; margin-bottom: 20px; text-align: center; margin-top: 10px;">
                Regola il volume specifico di ogni sorgente.<br>
                <i style="font-size: 0.75rem;">(Si moltiplica con il volume Master ed Effetti)</i>
            </p>
            
            <div id="advanced-audio-list" style="display: flex; flex-direction: column; gap: 12px;">
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

<div id="prestige-modal" class="modal-backdrop" style="display: none;">
    <div class="modal-content" style="max-width: 400px; text-align: center; border: 1px solid #f1c40f; box-shadow: 0 0 30px rgba(0,0,0,0.8);">
        
        <button class="modal-close-btn">&times;</button>
        
        <h2 style="background: #233040; color: #f1c40f; border-bottom: 1px solid rgba(241, 196, 15, 0.2); padding: 20px;">
            <i class="fa-solid fa-certificate"></i> Promozione
        </h2>

        <div class="settings-content" style="padding: 30px 25px;">
            
            <p style="
                color: #ff6b6b; 
                font-weight: 800; 
                font-size: 0.95rem; 
                margin-bottom: 25px; 
                line-height: 1.5; 
                background: rgba(255, 0, 0, 0.1); 
                padding: 10px; 
                border-radius: 8px; 
                border: 1px solid rgba(255, 107, 107, 0.3);">
                <i class="fa-solid fa-triangle-exclamation"></i> Accettando la promozione, l'azienda resetterà i tuoi Bug ed Edifici per riassegnarti ad un nuovo progetto.
            </p>

            <div style="background: #1e272e; border-radius: 12px; padding: 20px; margin-bottom: 25px; border: 1px solid #34495e;">
                <div style="font-size: 0.75rem; text-transform: uppercase; color: #7f8c8d; margin-bottom: 5px; letter-spacing: 1px;">OTTERRAI SUBITO</div>
                
                <div style="font-size: 3rem; font-weight: 900; color: #2ecc71; text-shadow: 0 0 20px rgba(46, 204, 113, 0.2); line-height: 1;">
                    <span id="contract-gain-token">+0</span>
                </div>
                <div style="color: #2ecc71; font-weight: bold; font-size: 1.1rem; margin-bottom: 20px;">Token Lab</div>

                <div style="border-top: 1px solid rgba(255,255,255,0.05); padding-top: 15px;">
                    <div style="font-size: 0.8rem; color: #bdc3c7;">Bonus Carriera Totale</div>
                    <div id="contract-gain-bonus" style="font-size: 1.2rem; color: #f1c40f; font-weight: 800;">Nuovo Totale: +0%</div>
                </div>
            </div>

            <button id="btn-confirm-prestige" class="buy-btn" style="
                background: linear-gradient(135deg, #f1c40f, #e67e22); 
                color: #2c3e50; 
                font-weight: 800; 
                width: 100%; 
                height: 55px; 
                font-size: 1.2rem; 
                box-shadow: 0 4px 15px rgba(243, 156, 18, 0.3);
                border-radius: 8px;">
                <i class="fa-solid fa-signature"></i> Firma e Accetta
            </button>
            
            <p style="font-size: 0.8rem; color: #5d7c9a; margin-top: 20px;">
                I potenziamenti del Lab e le Skin rimarranno salvati.
            </p>
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
<div id="arcade-modal" class="modal-backdrop" style="display: none;">
    <div class="modal-content" style="max-width: 500px; text-align: center;">
        <button class="modal-close-btn">&times;</button>
        
        <h2 style="border-bottom-color: #9b59b6; color: #9b59b6;">
            <i class="fa-solid fa-gamepad"></i> Espò Arcade
        </h2>
        
        <div class="settings-content" style="padding: 40px 30px;">
            
            <div style="margin-bottom: 25px;">
                <i class="fa-solid fa-helmet-safety" style="
                    font-size: 4rem; 
                    color: #f1c40f; 
                    /* Questo crea l'alone che segue la forma del casco */
                    filter: drop-shadow(0 0 15px rgba(241, 196, 15, 0.6));
                    /* Questa animazione fa solo 'respirare' l'icona senza creare box */
                    animation: pulseButton 2s infinite ease-in-out;">
                </i>
            </div>

            <h3 style="color: #fff; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px;">
                Area in Costruzione
            </h3>

            <p style="color: #bdc3c7; font-size: 0.95rem; line-height: 1.6; margin-bottom: 30px;">
                Stiamo installando i nuovi cabinati e cablando i server.<br>
                La sala giochi aprirà presto le porte!
            </p>

            <div style="
                display: inline-block;
                padding: 8px 16px;
                background: rgba(155, 89, 182, 0.1); 
                border: 1px dashed #9b59b6; 
                border-radius: 6px; 
                color: #9b59b6; 
                font-size: 0.75rem; 
                font-weight: 800;
                text-transform: uppercase;">
                <i class="fa-solid fa-code"></i> Status: Sviluppo
            </div>

        </div>
    </div>
</div>