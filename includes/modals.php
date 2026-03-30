<div id="login-modal" class="modal-backdrop" style="display: none;">
    <div class="modal-content" style="max-width: 380px; border-top: 4px solid #3498db;">
        <div style="text-align: center; padding: 30px 20px 10px 20px;">
            <div style="font-size: 3.5rem; color: #3498db; margin-bottom: 15px; text-shadow: 0 0 20px rgba(52, 152, 219, 0.4);">
                <i class="fa-solid fa-gamepad"></i>
            </div>
            <h2 style="background: none; border: none; padding: 0; font-size: 1.8rem; margin-bottom: 5px;">
				<?php echo $labels["modals_login_titolo"]; ?>
			</h2>
            <p style="color: #95a5a6; font-size: 0.9rem; margin: 0;">
				<?php echo $labels["modals_login_label"]; ?>
            </p>
        </div>
        <div class="settings-content" style="padding: 20px 30px 40px 30px;">
            <div class="input-stack">
                <div class="input-group-modern">
                    <div class="input-icon">
						<i class="fa-solid fa-user"></i>
					</div>
                    <input type="text" id="login-username-input" placeholder="<?php echo $labels["modals_login_username_placeholder"]; ?>" />
                </div>
                <div class="input-group-modern">
                    <div class="input-icon">
						<i class="fa-solid fa-lock"></i>
					</div>
                    <input type="password" id="login-password-input" placeholder="<?php echo $labels["modals_login_password_placeholder"]; ?>" />
                    <button class="toggle-pass-btn icon-only" data-target="login-password-input" tabindex="-1">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                </div>
            </div>
            <button id="login-btn" class="buy-btn save-btn" style="margin-top: 25px; height: 50px; font-size: 1rem; box-shadow: 0 4px 15px rgba(46, 204, 113, 0.3); gap: 10px;">
                <i class="fa-solid fa-rocket"></i>
				<?php echo $labels["modals_login_submit"]; ?>
            </button>    
        </div>
    </div>
</div>

<div id="achievements-modal" class="modal-backdrop" style="display: none;">
    <div class="modal-content">
        <button class="modal-close-btn">&times;</button>
        <h2>
			<i class="fa-solid fa-trophy"></i>
			<?php echo $labels["modals_obiettivi_titolo"]; ?>
		</h2>
        <div id="achievement-list"></div>
    </div>
</div>

<div id="stats-modal" class="modal-backdrop" style="display: none;">
    <div class="modal-content">
        <button class="modal-close-btn">&times;</button>
        <h2>
			<i class="fa-solid fa-chart-pie"></i>
			<?php echo $labels["modals_statistiche_titolo"]; ?>
		</h2>
        <div id="stats-list"></div>
    </div>
</div>

<div id="settings-modal" class="modal-backdrop" style="display: none;">
    <div class="modal-content" style="max-width: 400px;">
        <h2>
			<i class="fa-solid fa-sliders"></i>
			<?php echo $labels["modals_opzioni_titolo"]; ?>
		</h2>
        <div class="settings-content">
            <div class="settings-group">
                <h3 class="group-title">
					<?php echo $labels["modals_opzioni_contenuto_audio"]; ?>
				</h3>
                <div class="slider-row" style="margin-top: 15px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px;">
                <span class="slider-icon">
                    <i class="fa-solid fa-compact-disc"></i>
                </span>
                <div class="slider-wrapper" style="width: 100%;">
                    <label><?php echo "Musica di Sfondo"; // O usa una variabile $labels se preferisci ?></label>
                    
                    <select id="bg-music-select" class="clean-input" style="width: 100%; padding: 5px; font-size: 0.85rem; background: rgba(0,0,0,0.3); border: 1px solid #4a6582; color: white; border-radius: 4px;">
                    </select>
                    
                    <div id="bg-music-lock-msg" style="display:none; font-size: 0.7rem; color: #e74c3c; margin-top: 4px;">
                        <i class="fa-solid fa-lock"></i> Bloccato dalla Skin attuale
                    </div>
                </div>
            </div>
                <div class="slider-row">
                    <span class="slider-icon">
						<i class="fa-solid fa-volume-high"></i>
					</span>
                    <div class="slider-wrapper">
                        <label>
							<?php echo $labels["modals_opzioni_contenuto_audio_master"]; ?>
						</label>
                        <input type="range" id="master-slider" class="custom-slider" min="0" max="1" step="0.1" value="1" />
                    </div>
                    <span id="master-vol-display" class="slider-value">100%</span>
                </div>

                <div class="slider-row">
                    <span class="slider-icon">
						<i class="fa-solid fa-bell"></i>
					</span>
                    <div class="slider-wrapper">
                        <label>
							<?php echo $labels["modals_opzioni_contenuto_audio_effetti"]; ?>
						</label>
                        <input type="range" id="sfx-slider" class="custom-slider" min="0" max="1" step="0.1" value="1" />
                    </div>
                    <span id="sfx-vol-display" class="slider-value">100%</span>
                </div>

                <div class="slider-row">
                    <span class="slider-icon">
						<i class="fa-solid fa-music"></i>
					</span>
                    <div class="slider-wrapper">
                        <label>
							<?php echo $labels["modals_opzioni_contenuto_audio_musica"]; ?>
						</label>
                        <input type="range" id="music-slider" class="custom-slider" min="0" max="1" step="0.1" value="0.5" />
                    </div>
                    <span id="music-vol-display" class="slider-value">50%</span>
                </div>

                <button id="open-advanced-audio-btn" class="buy-btn ghost-btn" style="width: 100%; margin-top: 15px; justify-content: center;">
                    <i class="fa-solid fa-sliders"></i>
					<?php echo $labels["modals_opzioni_contenuto_audio_mixer"]; ?>
                </button>
            </div>

            <div class="account-preview-card">
                <div class="acc-details">
                    <small>
						<?php echo $labels["modals_opzioni_account_utente_connesso"]; ?>
					</small>
                    <div id="current-username-display" class="acc-name">...</div>
                </div>
                <button id="open-account-btn" class="buy-btn ghost-btn">
                    <i class="fa-solid fa-user-gear"></i>
					<?php echo $labels["modals_opzioni_account_utente_gestisci"]; ?>
                </button>
            </div>

            <button id="save-settings-btn" class="buy-btn save-btn">
                <i class="fa-solid fa-floppy-disk"></i>
				<p style="margin-left: 5px;">
					<?php echo $labels["modals_opzioni_salva"]; ?>
				</p>
            </button>
        </div>
    </div>
</div>

<div id="account-modal" class="modal-backdrop" style="display: none;">
    <div class="modal-content profile-modern-modal">
        <button class="modal-close-btn">&times;</button>
        
        <div class="profile-header-section minimal">
            <div class="profile-user-info">
                <h2 id="display-username-large">Giocatore</h2>
            </div>
        </div>

        <div class="settings-content profile-body">
            
            <div class="form-section">
                <label class="section-label">Modifica Nome</label>
                <div class="input-group-modern clean-input">
                    <input type="text" id="new-username-input" placeholder="Nuovo nome utente..." />
                    <button id="change-username-btn" class="action-btn-clean">
                        <i class="fa-solid fa-floppy-disk"></i> SALVA
                    </button>
                </div>
            </div>

            <hr class="profile-divider">

            <div class="form-section">
                <label class="section-label">Sicurezza</label>
                <div class="input-stack">
                    <div class="input-group-modern clean-input">
                        <input type="password" id="old-password-input" placeholder="Password Attuale">
                    </div>
                    <div class="input-group-modern clean-input">
                        <input type="password" id="new-password-input" placeholder="Nuova Password">
                        <button class="toggle-pass-btn icon-only" data-target="new-password-input">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                    </div>
                    <button id="change-password-btn" class="buy-btn ghost-btn full-width">
                        Aggiorna Password
                    </button>
                </div>
            </div>

            <div class="danger-zone-minimal">
                <div class="danger-title">Area Critica</div>
                <div class="input-group-modern clean-input danger-border">
                    <input type="password" id="danger-zone-password" placeholder="Password per confermare" />
                </div>

                <div class="danger-actions-grid">
                    <button id="logout-btn" class="danger-action-btn soft">
                        <i class="fa-solid fa-right-from-bracket"></i> Logout
                    </button>
                    <button id="reset-progress-btn" class="danger-action-btn orange">
                        <i class="fa-solid fa-rotate-left"></i> Reset
                    </button>
                    <button id="delete-save-btn" class="danger-action-btn red">
                        <i class="fa-solid fa-trash"></i> Elimina
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
            flex-shrink: 0;">

            <button id="header-back-btn" class="header-action-btn" title="<?php echo $labels["modals_opzioni_audio_avanzate_indietro_titolo"]; ?>">
                <i class="fa-solid fa-chevron-left"></i>
				<?php echo $labels["modals_opzioni_audio_avanzate_indietro"]; ?>
            </button>
            <h2 style="margin: 0; padding: 0; font-size: 1.2rem; border: none; background: transparent;">
                <i class="fa-solid fa-sliders"></i>
				<?php echo $labels["modals_opzioni_audio_avanzate_mixer_titolo"]; ?>
            </h2>
            <button id="header-reset-btn" class="header-action-btn reset" title="<?php echo $labels["modals_opzioni_audio_avanzate_reset_titolo"]; ?>">
                <i class="fa-solid fa-rotate-left"></i>
				<?php echo $labels["modals_opzioni_audio_avanzate_reset"]; ?>
            </button>
        </div>
        <div class="settings-content" style="padding: 10px 20px 20px 20px; overflow-y: auto; flex-grow: 1;">
            <p style="font-size: 0.85rem; color: #95a5a6; margin-bottom: 20px; text-align: center; margin-top: 10px;">
				<?php echo $labels["modals_opzioni_audio_avanzate_label1"]; ?>
                <br>
                <i style="font-size: 0.75rem;">
					<?php echo $labels["modals_opzioni_audio_avanzate_label2"]; ?>
				</i>
            </p>
            <div id="advanced-audio-list" style="display: flex; flex-direction: column; gap: 12px;"></div>
        </div>
    </div>
</div>
<div id="leaderboard-modal" class="modal-backdrop" style="display: none;">
    <div class="modal-content">
        <button class="modal-close-btn">&times;</button>
        <h2>
			<i class="fa-solid fa-medal"></i>
			<?php echo $labels["modals_classifica_titolo"]; ?>
		</h2>
        <div id="leaderboard-list"></div>
    </div>
</div>
<div id="prestige-modal" class="modal-backdrop" style="display: none;">
    <div class="modal-content" style="max-width: 400px; text-align: center; border: 1px solid #f1c40f; box-shadow: 0 0 30px rgba(241,196,15,0.3); padding: 0; overflow: hidden; background: #0a0a0a;">
        <button class="modal-close-btn" id="cancel-prestige-btn" style="z-index: 10;">&times;</button>
        
        <h2 style="background: #1f1905; color: #f1c40f; border-bottom: 1px solid rgba(241, 196, 15, 0.3); padding: 20px; margin: 0;">
            <i class="fa-solid fa-certificate"></i> Promozione Aziendale
        </h2>
        
        <div class="settings-content" style="padding: 30px 25px;">
            <p style="
                color: #fff; 
                background: rgba(241, 196, 15, 0.1); 
                border: 1px solid #f1c40f;
                font-weight: 600; 
                font-size: 0.9rem; 
                margin-bottom: 25px; 
                line-height: 1.5; 
                padding: 12px; 
                border-radius: 8px;">
                <i class="fa-solid fa-file-signature" style="color: #f1c40f;"></i> Firma il contratto per diventare <b>Senior</b>.<br><br>
                <span style="color:#bdc3c7; font-weight:normal; font-size: 0.85rem;">Perderai Bug, Teams e Upgrades, ma sbloccherai il Laboratorio per la ricerca avanzata.</span>
            </p>

            <div style="background: #110f08; border-radius: 12px; padding: 20px; margin-bottom: 20px; border: 1px solid #4a3e12;">
                <div style="font-size: 0.75rem; text-transform: uppercase; color: #7f8c8d; margin-bottom: 5px; letter-spacing: 1px;">
                    OTTERRAI SUBITO
                </div>
                <div style="font-size: 3.5rem; font-weight: 900; color: #3498db; text-shadow: 0 0 20px rgba(52, 152, 219, 0.5); line-height: 1;" id="contract-gain-token">
                    +0
                </div>
                <div style="color: #3498db; font-weight: bold; font-size: 1.1rem; margin-bottom: 5px; margin-top: 5px;">
                    Token Laboratorio
                </div>
                <div id="contract-gain-bonus" style="font-size: 0.9rem; color: #95a5a6; margin-top: 15px; border-top: 1px solid #2a2305; padding-top: 15px;">
                    Nuovo Moltiplicatore: <span style="color: #f1c40f; font-weight: bold;">x1.00</span>
                </div>
            </div>

            <button id="btn-confirm-prestige" class="buy-btn" data-action="prestige" style="
                background: linear-gradient(135deg, #f1c40f, #d35400); 
                color: #000; 
                font-weight: 900; 
                width: 100%; 
                height: 55px; 
                font-size: 1.2rem; 
                box-shadow: 0 4px 15px rgba(241, 196, 15, 0.4);
                border-radius: 8px;
                border: none;
                text-transform: uppercase;
                letter-spacing: 1px;">
                <i class="fa-solid fa-pen-nib"></i> Firma Contratto
            </button>
        </div>
    </div>
</div>

<div id="format-modal" class="modal-backdrop" style="display: none;">
    <div class="modal-content" style="max-width: 400px; text-align: center; border: 1px solid #9b59b6; box-shadow: 0 0 30px rgba(155,89,182,0.6);">
        <button class="modal-close-btn">&times;</button>
        <h2 style="background: #1a0f2e; color: #9b59b6; border-bottom: 1px solid rgba(155, 89, 182, 0.3); padding: 20px;">
            <i class="fa-solid fa-infinity fa-spin"></i> Riavvio Sistema (NG+)
		</h2>
        <div class="settings-content" style="padding: 30px 25px;">    
            <p style="
                color: #fff; 
                background: rgba(155, 89, 182, 0.2); 
                border: 1px solid #9b59b6;
                font-weight: 600; 
                font-size: 0.9rem; 
                margin-bottom: 25px; 
                line-height: 1.5; 
                padding: 12px; 
                border-radius: 8px;">
                <i class="fa-solid fa-skull" style="color: #e74c3c;"></i> ATTENZIONE: Questa azione distruggerà l'universo attuale. Perderai Bug, Teams, Upgrades e Token Lab. <br><br>Conserverai Skin, Obiettivi e Statistiche globali.
            </p>

            <div style="background: #110a1f; border-radius: 12px; padding: 20px; margin-bottom: 25px; border: 1px solid #4a235a;">
                <div style="font-size: 0.75rem; text-transform: uppercase; color: #7f8c8d; margin-bottom: 5px; letter-spacing: 1px;">
					OTTERRAI SUBITO
				</div>
                <div style="font-size: 3rem; font-weight: 900; color: #9b59b6; text-shadow: 0 0 20px rgba(155, 89, 182, 0.4); line-height: 1;">
                    <span id="format-gain-qbit">+0</span>
                </div>
                <div style="color: #9b59b6; font-weight: bold; font-size: 1.1rem; margin-bottom: 10px;">
					Quantum Bits
				</div>
            </div>

            <button id="btn-confirm-format" class="buy-btn quantum-btn" style="
                width: 100%; 
                height: 55px; 
                font-size: 1.2rem; 
                border-radius: 8px;">
                <i class="fa-solid fa-meteor"></i> MADE IN HEAVEN
            </button>
        </div>
    </div>
</div>

<div id="skins-modal" class="modal-backdrop" style="display: none;">
    <div class="modal-content" style="max-width: 850px; width: 95%;"> <button class="modal-close-btn">&times;</button>
        <h2>
			<i class="fa-solid fa-shirt"></i>
			<?php echo $labels["modals_guardaroba_titolo"]; ?>
		</h2>
        
        <div class="skins-controls-bar">
            <div class="skins-filters">
                <button class="skin-filter-btn active" data-filter="all">Tutte</button>
                <button class="skin-filter-btn" data-filter="unlocked">Sbloccate</button>
                <button class="skin-filter-btn" data-filter="locked">Bloccate</button>
                
                <select id="skin-rarity-filter" class="clean-input skin-select-filter">
                    <option value="all">Tutte le Rarità</option>
                    <option value="common">Comune</option>
                    <option value="rare">Rara</option>
                    <option value="epic">Epica</option>
                    <option value="legendary">Leggendaria</option>
                    <option value="divine">Divina</option>
                    <option value="christmas">Festiva</option>
                </select>
            </div>
            
            <div class="skins-toggle-wrapper">
                <span style="font-size: 0.8rem; color: #bdc3c7; margin-right: 8px;">Nuovo UI</span>
                <label class="modern-switch">
                    <input type="checkbox" id="skins-ui-toggle" checked>
                    <span class="modern-slider"></span>
                </label>
            </div>
        </div>

        <div id="skins-grid-legacy" class="skins-grid-container" style="display: none;">
            </div>
        
        <div id="skins-grid-modern" class="skins-grid-container">
            </div>
    </div>
</div>

<div id="release-notes-modal" class="modal-backdrop" style="display: none; z-index: 2500;">
    <div class="modal-content" style="max-width: 700px; border-top: 4px solid #f1c40f;">
        <button class="modal-close-btn">&times;</button>
        <h2 style="background: #1a1a1a; color: #f1c40f; border-bottom: 1px solid rgba(241, 196, 15, 0.3);">
            <i class="fa-solid fa-bullhorn"></i> Novità dell'Aggiornamento
        </h2>
        <div class="settings-content" id="release-notes-content" style="padding: 20px 30px; font-family: 'Inter', sans-serif;">
            <div style="text-align: center; color: #7f8c8d; margin-top: 20px;">
                <i class="fa-solid fa-circle-notch fa-spin fa-2x"></i><br><br>Caricamento novità...
            </div>
        </div>
    </div>
</div>