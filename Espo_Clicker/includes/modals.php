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
    <div class="modal-content" style="max-width: 450px;">
        <button class="modal-close-btn">&times;</button>
        <h2>
			<i class="fa-solid fa-id-card-clip"></i>
			<?php echo $labels["modals_profilo_utente_titolo"]; ?>
		</h2>
        <div class="settings-content">
            <div class="settings-group">
                <h3 class="group-title">
					<?php echo $labels["modals_profilo_utente_identita"]; ?>
				</h3>
                <div class="input-group-modern">
                    <div class="input-icon">
						<i class="fa-solid fa-user"></i>
					</div>
                    <input type="text" id="new-username-input" placeholder="<?php echo $labels["modals_profilo_nuovo_utente_placeholder"]; ?>" />
                    <button id="change-username-btn" class="action-btn-small" title="<?php echo $labels["modals_profilo_nuovo_utente_salva"]; ?>">
						<i class="fa-solid fa-floppy-disk"></i>
					</button>
                </div>
            </div>
            <div class="settings-group">
                <h3 class="group-title">
					<?php echo $labels["modals_profilo_sicurezza"]; ?>
				</h3>
                <div class="input-stack">
                    <div class="input-group-modern">
                        <div class="input-icon">
							<i class="fa-solid fa-lock"></i>
						</div>
                        <input type="password" id="old-password-input" placeholder="<?php echo $labels["modals_profilo_sicurezza_vecchia_password"]; ?>">
                        <button class="toggle-pass-btn icon-only" data-target="old-password-input">
							<i class="fa-solid fa-eye"></i>
						</button>
                    </div>
                    <div class="input-group-modern">
                        <div class="input-icon">
							<i class="fa-solid fa-key"></i>
						</div>
                        <input type="password" id="new-password-input" placeholder="<?php echo $labels["modals_profilo_sicurezza_nuova_password"]; ?>" />
                        <button class="toggle-pass-btn icon-only" data-target="new-password-input">
							<i class="fa-solid fa-eye"></i>
						</button>
                    </div>
                    <button id="change-password-btn" class="buy-btn outline-btn" style="margin-top: 5px;">
						<?php echo $labels["modals_profilo_sicurezza_aggiorna_password"]; ?>
					</button>
                </div>
            </div>
            <div style="text-align: center; margin: 15px 0;">
                <button id="logout-btn" class="text-link-btn">
                    <i class="fa-solid fa-right-from-bracket"></i>
					<?php echo $labels["modals_profilo_disconnetti"]; ?>
                </button>
            </div>
            <div class="danger-zone-pro">
                <div class="danger-header">
                    <i class="fa-solid fa-biohazard"></i>
					<?php echo $labels["modals_area_critica_titolo"]; ?>
                </div>
                <div class="input-group-modern danger-input">
                    <div class="input-icon danger">
						<i class="fa-solid fa-shield-halved"></i>
					</div>
                    <input type="password" id="danger-zone-password" placeholder="<?php echo $labels["modals_area_critica_conferma_password"]; ?>" />
                    <button class="toggle-pass-btn icon-only" data-target="danger-zone-password">
						<i class="fa-solid fa-eye"></i>
					</button>
                </div>
                <div class="danger-buttons-row">
                    <button id="reset-progress-btn" class="danger-btn-small orange" title="<?php echo $labels["modals_area_critica_resetta_progressi_placeholder"]; ?>">
                        <i class="fa-solid fa-rotate-left"></i>
						<?php echo $labels["modals_area_critica_resetta_progressi"]; ?>
                    </button>
                    <button id="delete-save-btn" class="danger-btn-small red" title="<?php echo $labels["modals_area_critica_elimina_account_placeholder"]; ?>">
                        <i class="fa-solid fa-trash-can"></i>
						<?php echo $labels["modals_area_critica_elimina_account"]; ?>
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

            <button id="header-back-btn" class="header-action-btn" title="<?php echo $labels["modals_login_titolo"]; ?>Torna alle Opzioni">
                <i class="fa-solid fa-chevron-left"></i>
				<?php echo $labels["modals_login_titolo"]; ?>
				Indietro
            </button>
            <h2 style="margin: 0; padding: 0; font-size: 1.2rem; border: none; background: transparent;">
                <i class="fa-solid fa-sliders"></i>
				<?php echo $labels["modals_login_titolo"]; ?>
				Mixer
            </h2>
            <button id="header-reset-btn" class="header-action-btn reset" title="<?php echo $labels["modals_login_titolo"]; ?>Ripristina Default">
                <i class="fa-solid fa-rotate-left"></i>
				<?php echo $labels["modals_login_titolo"]; ?>
				Reset
            </button>
        </div>
        <div class="settings-content" style="padding: 10px 20px 20px 20px; overflow-y: auto; flex-grow: 1;">
            <p style="font-size: 0.85rem; color: #95a5a6; margin-bottom: 20px; text-align: center; margin-top: 10px;">
				<?php echo $labels["modals_login_titolo"]; ?>
                Regola il volume specifico di ogni sorgente.<br>
                <i style="font-size: 0.75rem;">
					<?php echo $labels["modals_login_titolo"]; ?>
					(Si moltiplica con il volume Master ed Effetti)
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
			<?php echo $labels["modals_login_titolo"]; ?>
			Classifica
		</h2>
        <div id="leaderboard-list"></div>
    </div>
</div>
<div id="prestige-modal" class="modal-backdrop" style="display: none;">
    <div class="modal-content" style="max-width: 400px; text-align: center; border: 1px solid #f1c40f; box-shadow: 0 0 30px rgba(0,0,0,0.8);">
        <button class="modal-close-btn">&times;</button>
        <h2 style="background: #233040; color: #f1c40f; border-bottom: 1px solid rgba(241, 196, 15, 0.2); padding: 20px;">
            <i class="fa-solid fa-certificate"></i>
			<?php echo $labels["modals_login_titolo"]; ?>
			Promozione
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
				<?php echo $labels["modals_login_titolo"]; ?>
				Accettando la promozione, l'azienda resetterà i tuoi Bug e Teams per riassegnarti ad un nuovo progetto.
            </p>

            <div style="background: #1e272e; border-radius: 12px; padding: 20px; margin-bottom: 25px; border: 1px solid #34495e;">
                <div style="font-size: 0.75rem; text-transform: uppercase; color: #7f8c8d; margin-bottom: 5px; letter-spacing: 1px;">
					<?php echo $labels["modals_login_titolo"]; ?>
					OTTERRAI SUBITO
				</div>
                <div style="font-size: 3rem; font-weight: 900; color: #2ecc71; text-shadow: 0 0 20px rgba(46, 204, 113, 0.2); line-height: 1;">
                    <span id="contract-gain-token">+0</span>
                </div>
                <div style="color: #2ecc71; font-weight: bold; font-size: 1.1rem; margin-bottom: 20px;">
					<?php echo $labels["modals_login_titolo"]; ?>
					Token Lab
				</div>
                <div style="border-top: 1px solid rgba(255,255,255,0.05); padding-top: 15px;">
                    <div style="font-size: 0.8rem; color: #bdc3c7;">
						<?php echo $labels["modals_login_titolo"]; ?>
						Bonus Carriera Totale
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
				<?php echo $labels["modals_login_titolo"]; ?>
				Firma e Accetta
            </button>
            
            <p style="font-size: 0.8rem; color: #5d7c9a; margin-top: 20px;">
				<?php echo $labels["modals_login_titolo"]; ?>
                I potenziamenti del Lab e le Skin rimarranno salvati.
            </p>
        </div>
    </div>
</div>

<div id="skins-modal" class="modal-backdrop" style="display: none;">
    <div class="modal-content">
        <button class="modal-close-btn">&times;</button>
        <h2>
			<i class="fa-solid fa-shirt"></i>
			<?php echo $labels["modals_login_titolo"]; ?>
			Guardaroba
		</h2>
        <p class="modal-desc" style="text-align: center; margin-bottom: 15px;">
			<?php echo $labels["modals_login_titolo"]; ?>
            Personalizza il tuo look.<br>Sblocca nuove skin completando obiettivi speciali!
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
			<?php echo $labels["modals_login_titolo"]; ?>
			Manuale del Dipendente
		</h2>
        <div class="settings-content" style="text-align: left; line-height: 1.6;">
            <div style="margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">
                <h3 style="color: #3498db; margin-bottom: 5px;">
					<i class="fa-solid fa-bullseye"></i>
					<?php echo $labels["modals_login_titolo"]; ?>
					1. L'Obiettivo
				</h3>
                <p style="color: #bdc3c7; font-size: 0.95rem; margin: 0;">
					<?php echo $labels["modals_login_titolo"]; ?>
                    Benvenuto alla <strong>Espò Solutions</strong>! Il tuo lavoro è semplice: 
                    risolvi i <strong>Bug</strong> cliccando sulla faccia del Manager. 
                    Più bug risolvi, più budget avrai per assumere aiuti.
                </p>
            </div>
            <div style="margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">
                <h3 style="color: #2ecc71; margin-bottom: 5px;">
					<i class="fa-solid fa-robot"></i>
					<?php echo $labels["modals_login_titolo"]; ?>
					2. Automazione (BPS)
				</h3>
                <p style="color: #bdc3c7; font-size: 0.95rem; margin: 0;">
					<?php echo $labels["modals_login_titolo"]; ?>
                    Cliccare è faticoso. Nel menu <strong>👥 Teams</strong> puoi assumere personale (Assistenti, Team QA, AI) che lavorerà per te.
                    <br>
					<?php echo $labels["modals_login_titolo"]; ?>
                    <strong>BPS (Bug Per Secondo):</strong> Indica quanti bug il tuo team risolve automaticamente ogni secondo, anche se non fai nulla.
                </p>
            </div>
            <div style="margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">
                <h3 style="color: #f1c40f; margin-bottom: 5px;">
					<i class="fa-solid fa-bolt"></i>
					<?php echo $labels["modals_login_titolo"]; ?>
					3. Eventi & Anomalie
				</h3>
                <p style="color: #bdc3c7; font-size: 0.95rem; margin: 0;">
					<?php echo $labels["modals_login_titolo"]; ?>
                    Il sistema è instabile. Tieni gli occhi aperti per:
                </p>
                <ul style="color: #ecf0f1; font-size: 0.9rem; margin-top: 5px; padding-left: 20px; list-style: none;">
                    <li style="margin-bottom: 5px;">
						<i class="fa-solid fa-bug" style="color:#f1c40f; width: 20px;"></i>
						<?php echo $labels["modals_login_titolo"]; ?>
						<strong>Golden Bug:</strong> Appare casualmente. Cliccalo subito!
					</li>
                    <li style="margin-bottom: 5px;">
						<i class="fa-solid fa-display" style="color:#3498db; width: 20px;"></i>
						<?php echo $labels["modals_login_titolo"]; ?>
						<strong>Errore 404:</strong> Il sistema crasha! Produzione moltiplicata
					</li>
                    <li style="margin-bottom: 5px;">
						<i class="fa-solid fa-music" style="color:#e74c3c; width: 20px;"></i>
						<?php echo $labels["modals_login_titolo"]; ?>
						<strong>Eventi Skin:</strong> Alcuni costumi leggendari scatenano eventi musicali
					</li>
                </ul>
            </div>
            <div style="margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">
                <h3 style="color: #9b59b6; margin-bottom: 5px;">
					<i class="fa-solid fa-flask"></i>
					<?php echo $labels["modals_login_titolo"]; ?>
					4. Laboratorio (Prestigio)
				</h3>
                <p style="color: #bdc3c7; font-size: 0.95rem; margin: 0;">
					<?php echo $labels["modals_login_titolo"]; ?>
                    Quando il gioco diventa lento, puoi chiedere una <strong>Promozione</strong>.
                    <br>
					<?php echo $labels["modals_login_titolo"]; ?>
                    <strong>Attenzione:</strong> Resetter&agrave; i tuoi bug e i tuoi Teams, ma in cambio otterrai <strong>Token Lab</strong>.
                    Usa i Token nel Laboratorio per comprare potenziamenti permanenti che renderanno la tua prossima partita velocissima.
                </p>
            </div>
            <div style="margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">
                <h3 style="color: #e67e22; margin-bottom: 5px;">
					<i class="fa-solid fa-calculator"></i>
					<?php echo $labels["modals_login_titolo"]; ?>
					5. Matematica dei Bonus
				</h3>
                <p style="color: #bdc3c7; font-size: 0.95rem; margin: 0;">
					<?php echo $labels["modals_login_titolo"]; ?>
                    Come faccio a fare numeri enormi? Semplice: <strong>I Moltiplicatori si sommano!</strong>
                </p>
                <ul style="color: #ecf0f1; font-size: 0.9rem; margin-top: 5px; padding-left: 20px;">
                    <li>
						<?php echo $labels["modals_login_titolo"]; ?>
						<strong>Bonus Permanente:</strong> Deriva dai tuoi <em>Prestigio</em> e dagli <em>Obiettivi</em> sbloccati. È la tua base (es. x2.0).
					</li>
                    <li>
						<?php echo $labels["modals_login_titolo"]; ?>
						<strong>Bonus Temporanei:</strong> Eventi (es. 404) e Abilità (Crunch Time x7).
					</li>
                    <li>
						<?php echo $labels["modals_login_titolo"]; ?>
						<strong>Il Segreto:</strong> Se attivi tutto insieme, i bonus si moltiplicano!<br>
                    	<em>Esempio:</em> Base (x2) * Crunch Time (x7) = <strong>x14 Totale!</strong>
					</li>
                </ul>
            </div>
            <div style="margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">
                <h3 style="color: #1abc9c; margin-bottom: 5px;">
					<i class="fa-solid fa-user"></i>
					<?php echo $labels["modals_login_titolo"]; ?>
					6. Account & Salvataggi
				</h3>
                <p style="color: #bdc3c7; font-size: 0.95rem; margin: 0;">
					<?php echo $labels["modals_login_titolo"]; ?>
                    I tuoi dati sono al sicuro nel Cloud della Espò Solutions.
                </p>
                <ul style="color: #ecf0f1; font-size: 0.9rem; margin-top: 5px; padding-left: 20px;">
                    <li>
						<?php echo $labels["modals_login_titolo"]; ?>
						Puoi fare <strong>Login</strong> da qualsiasi dispositivo per recuperare i tuoi progressi.
					</li>
                    <li>
						<?php echo $labels["modals_login_titolo"]; ?>
						Il gioco salva automaticamente ogni 10 secondi.
					</li>
                    <li>
						<?php echo $labels["modals_login_titolo"]; ?>
						Se esci dal sito, guadagnerai comunque bug (Efficienza ridotta) fino a 12 ore.
					</li>
                </ul>
            </div>
            <div>
                <h3 style="color: #e74c3c; margin-bottom: 5px;">
					<i class="fa-solid fa-lightbulb"></i>
					<?php echo $labels["modals_login_titolo"]; ?>
					7. Consigli Utili
				</h3>
                <ul style="color: #ecf0f1; font-size: 0.9rem; margin-top: 5px; padding-left: 20px;">
                    <li>
						<?php echo $labels["modals_login_titolo"]; ?>
						Sblocca gli <strong>Obiettivi</strong> per ottenere premi e nuove <strong>Skin</strong>.
					</li>
                    <li>
						<?php echo $labels["modals_login_titolo"]; ?>
						Le Skin non sono solo estetiche: le Leggendarie hanno poteri nascosti.
					</li>
                    <li>
						<?php echo $labels["modals_login_titolo"]; ?>
						Controlla la <strong>Classifica</strong> per vedere chi è il manager migliore!
					</li>
                </ul>
            </div>
        </div>
    </div>
</div>
<div id="arcade-modal" class="modal-backdrop" style="display: none;">
    <div class="modal-content" style="max-width: 500px; text-align: center;">
        <button class="modal-close-btn">&times;</button>
        <h2 style="border-bottom-color: #9b59b6; color: #9b59b6;">
            <i class="fa-solid fa-gamepad"></i>
			<?php echo $labels["modals_login_titolo"]; ?>
			Espò Arcade
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
				<?php echo $labels["modals_login_titolo"]; ?>
                Area in Costruzione
            </h3>
            <p style="color: #bdc3c7; font-size: 0.95rem; line-height: 1.6; margin-bottom: 30px;">
				<?php echo $labels["modals_login_titolo"]; ?>
                Stiamo installando i nuovi cabinati e cablando i server.
				<br>
				<?php echo $labels["modals_login_titolo"]; ?>
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
                <i class="fa-solid fa-code"></i>
				<?php echo $labels["modals_login_titolo"]; ?>
				Status: Sviluppo
            </div>
        </div>
    </div>
</div>