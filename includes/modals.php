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
            background-color: #34495e; 
            border-bottom: 1px solid #4a6582;
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
    <div class="modal-content" style="max-width: 400px; text-align: center; border: 1px solid #f1c40f; box-shadow: 0 0 30px rgba(0,0,0,0.8);">
        <button class="modal-close-btn">&times;</button>
        <h2 style="background: #233040; color: #f1c40f; border-bottom: 1px solid rgba(241, 196, 15, 0.2); padding: 20px;">
            <i class="fa-solid fa-certificate"></i>
			<?php echo $labels["modals_promozione_titolo"]; ?>
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

                <i class="fa-solid fa-triangle-exclamation"></i>
				<?php echo $labels["modals_promozione_label"]; ?>
            </p>

            <div style="background: #1e272e; border-radius: 12px; padding: 20px; margin-bottom: 25px; border: 1px solid #34495e;">
                <div style="font-size: 0.75rem; text-transform: uppercase; color: #7f8c8d; margin-bottom: 5px; letter-spacing: 1px;">
					<?php echo $labels["modals_promozione_token_lab_label1"]; ?>
				</div>
                <div style="font-size: 3rem; font-weight: 900; color: #2ecc71; text-shadow: 0 0 20px rgba(46, 204, 113, 0.2); line-height: 1;">
                    <span id="contract-gain-token">+0</span>
                </div>
                <div style="color: #2ecc71; font-weight: bold; font-size: 1.1rem; margin-bottom: 20px;">
					<?php echo $labels["modals_promozione_token_lab_label2"]; ?>
				</div>
                <div style="border-top: 1px solid rgba(255,255,255,0.05); padding-top: 15px;">
                    <div style="font-size: 0.8rem; color: #bdc3c7;">
						<?php echo $labels["modals_promozione_carriera_label"]; ?>
					</div>
                    <div id="contract-gain-bonus" style="font-size: 1.2rem; color: #f1c40f; font-weight: 800;">
						Nuovo Totale: +0%
					</div>
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
                <i class="fa-solid fa-signature"></i>
				<?php echo $labels["modals_promozione_firma_accetta"]; ?>
            </button>
            
            <p style="font-size: 0.8rem; color: #5d7c9a; margin-top: 20px;">
				<?php echo $labels["modals_promozione_label2"]; ?>
            </p>
        </div>
    </div>
</div>

<div id="skins-modal" class="modal-backdrop" style="display: none;">
    <div class="modal-content">
        <button class="modal-close-btn">&times;</button>
        <h2>
			<i class="fa-solid fa-shirt"></i>
			<?php echo $labels["modals_guardaroba_titolo"]; ?>
		</h2>
        <p class="modal-desc" style="text-align: center; margin-bottom: 15px;">
			<?php echo $labels["modals_guardaroba_label1"]; ?>
            <br>
			<?php echo $labels["modals_guardaroba_label2"]; ?>
        </p>
        <div id="skins-grid" style="
            display: grid; 
            grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); 
            gap: 15px; 
            padding: 20px; 
            overflow-y: auto; 
            max-height: 60vh;">
		</div>
    </div>
</div>

<div id="help-modal" class="modal-backdrop" style="display: none;">
    <div class="modal-content" style="max-width: 600px;">
        <button class="modal-close-btn">&times;</button>
        <h2>
			<i class="fa-solid fa-book-open"></i>
			<?php echo $labels["modals_manuale_titolo"]; ?>
		</h2>
        <div class="settings-content" style="text-align: left; line-height: 1.6;">
            <div style="margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">
                <h3 style="color: #3498db; margin-bottom: 5px;">
					<i class="fa-solid fa-bullseye"></i>
					<?php echo $labels["modals_manuale_punto_1_titolo"]; ?>
				</h3>
                <p style="color: #bdc3c7; font-size: 0.95rem; margin: 0;">
					<?php echo $labels["modals_manuale_punto_1_label"]; ?>
                </p>
            </div>
            <div style="margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">
                <h3 style="color: #2ecc71; margin-bottom: 5px;">
					<i class="fa-solid fa-robot"></i>
					<?php echo $labels["modals_manuale_punto_2_titolo"]; ?>
				</h3>
                <p style="color: #bdc3c7; font-size: 0.95rem; margin: 0;">
					<?php echo $labels["modals_manuale_punto_2_label1"]; ?>
                    <br>
					<?php echo $labels["modals_manuale_punto_2_label2"]; ?>
                </p>
            </div>
            <div style="margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">
                <h3 style="color: #f1c40f; margin-bottom: 5px;">
					<i class="fa-solid fa-bolt"></i>
					<?php echo $labels["modals_manuale_punto_3_titolo"]; ?>
				</h3>
                <p style="color: #bdc3c7; font-size: 0.95rem; margin: 0;">
					<?php echo $labels["modals_manuale_punto_3_label1"]; ?>
                </p>
                <ul style="color: #ecf0f1; font-size: 0.9rem; margin-top: 5px; padding-left: 20px; list-style: none;">
                    <li style="margin-bottom: 5px;">
						<i class="fa-solid fa-bug" style="color:#f1c40f; width: 20px;"></i>
						<?php echo $labels["modals_manuale_punto_3_label2"]; ?>
					</li>
                    <li style="margin-bottom: 5px;">
						<i class="fa-solid fa-display" style="color:#3498db; width: 20px;"></i>
						<?php echo $labels["modals_manuale_punto_3_label3"]; ?>
					</li>
                    <li style="margin-bottom: 5px;">
						<i class="fa-solid fa-music" style="color:#e74c3c; width: 20px;"></i>
						<?php echo $labels["modals_manuale_punto_3_label4"]; ?>
					</li>
                </ul>
            </div>
            <div style="margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">
                <h3 style="color: #9b59b6; margin-bottom: 5px;">
					<i class="fa-solid fa-flask"></i>
					<?php echo $labels["modals_manuale_punto_4_titolo"]; ?>
				</h3>
                <p style="color: #bdc3c7; font-size: 0.95rem; margin: 0;">
					<?php echo $labels["modals_manuale_punto_4_label1"]; ?>
                    <br>
					<?php echo $labels["modals_manuale_punto_4_label2"]; ?>
				</p>
            </div>
            <div style="margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">
                <h3 style="color: #e67e22; margin-bottom: 5px;">
					<i class="fa-solid fa-calculator"></i>
					<?php echo $labels["modals_manuale_punto_5_titolo"]; ?>
				</h3>
                <p style="color: #bdc3c7; font-size: 0.95rem; margin: 0;">
					<?php echo $labels["modals_manuale_punto_5_label1"]; ?>
                </p>
                <ul style="color: #ecf0f1; font-size: 0.9rem; margin-top: 5px; padding-left: 20px;">
                    <li>
						<?php echo $labels["modals_manuale_punto_5_label2"]; ?>
					</li>
                    <li>
						<?php echo $labels["modals_manuale_punto_5_label3"]; ?>
					</li>
                    <li>
						<?php echo $labels["modals_manuale_punto_5_label4"]; ?>
						<br>
						<?php echo $labels["modals_manuale_punto_5_label5"]; ?>
					</li>
                </ul>
            </div>
            <div style="margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">
                <h3 style="color: #1abc9c; margin-bottom: 5px;">
					<i class="fa-solid fa-user"></i>
					<?php echo $labels["modals_manuale_punto_6_titolo"]; ?>
				</h3>
                <p style="color: #bdc3c7; font-size: 0.95rem; margin: 0;">
					<?php echo $labels["modals_manuale_punto_6_label1"]; ?>
                </p>
                <ul style="color: #ecf0f1; font-size: 0.9rem; margin-top: 5px; padding-left: 20px;">
                    <li>
						<?php echo $labels["modals_manuale_punto_6_label2"]; ?>
					</li>
                    <li>
						<?php echo $labels["modals_manuale_punto_6_label3"]; ?>
					</li>
                    <li>
						<?php echo $labels["modals_manuale_punto_6_label4"]; ?>
					</li>
                </ul>
            </div>
            <div>
                <h3 style="color: #e74c3c; margin-bottom: 5px;">
					<i class="fa-solid fa-lightbulb"></i>
					<?php echo $labels["modals_manuale_punto_7_titolo"]; ?>
				</h3>
                <ul style="color: #ecf0f1; font-size: 0.9rem; margin-top: 5px; padding-left: 20px;">
                    <li>
						<?php echo $labels["modals_manuale_punto_7_label1"]; ?>
					</li>
                    <li>
						<?php echo $labels["modals_manuale_punto_7_label2"]; ?>
					</li>
                    <li>
						<?php echo $labels["modals_manuale_punto_7_label3"]; ?>
					</li>
                </ul>
            </div>
        </div>
    </div>
</div>