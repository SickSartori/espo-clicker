<div id="login-modal" class="modal-backdrop" style="display: none;">

    <!-- Layer 1: debug data-stream (riempito da modals.js, width-based) -->
    <div class="login-stream" id="login-stream" aria-hidden="true"></div>
    <!-- Layer 2: hex grid + scanline + vignette (puro CSS) -->
    <div class="login-fx" aria-hidden="true"></div>

    <!-- Layer 3: HUD (.modal-content così GSAP anima scale/opacity all'apertura) -->
    <div class="modal-content login-hud">
        <span class="login-corner tl" aria-hidden="true"></span>
        <span class="login-corner tr" aria-hidden="true"></span>
        <span class="login-corner bl" aria-hidden="true"></span>
        <span class="login-corner br" aria-hidden="true"></span>

        <div class="login-bar" aria-hidden="true">
            <span>[ secure channel ]</span>
            <span><span class="login-dot">&#9679;</span> online</span>
        </div>

        <div class="login-logo-wrap">
            <img src="assets/image/logo.svg" class="login-logo" alt="Espòòò Clicker Logo">
        </div>

        <p class="login-tagline">
            <span class="login-pp" aria-hidden="true">&gt;</span><?php echo $labels["modals_login_label"]; ?><span class="login-caret" aria-hidden="true"></span>
        </p>

        <div class="input-stack">
            <div class="input-group-modern">
                <div class="input-icon">
					<i class="fa-solid fa-user"></i>
				</div>
                <input type="text" id="login-username-input" placeholder="<?php echo $labels["modals_login_username_placeholder"]; ?>" autocomplete="username" />
            </div>
            <div class="input-group-modern">
                <div class="input-icon">
					<i class="fa-solid fa-lock"></i>
				</div>
                <input type="password" id="login-password-input" placeholder="<?php echo $labels["modals_login_password_placeholder"]; ?>" autocomplete="current-password" />
                <button class="toggle-pass-btn icon-only" data-target="login-password-input" tabindex="-1" aria-label="Toggle password">
                    <i class="fa-solid fa-eye"></i>
                </button>
            </div>
        </div>

        <button id="login-btn" class="buy-btn save-btn login-submit">
            <i class="fa-solid fa-rocket"></i>
			<?php echo $labels["modals_login_submit"]; ?>
        </button>

        <div class="login-foot">
            <span class="login-stat"><span class="login-dot warn">&#9679;</span> cloud link: standby</span>
            <a href="https://github.com/SickSartori/espo-clicker" target="_blank" rel="noopener" title="<?php echo $labels["index_github_title"]; ?>">
                <i class="fa-brands fa-github"></i> GitHub
            </a>
        </div>
    </div>

    <div class="login-build" aria-hidden="true">espòò clicker · v3.0</div>
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
            <!-- Selettore lingua (IT/EN). Label bilingue per restare leggibile in entrambe le lingue. -->
            <div class="settings-group">
                <h3 class="group-title">
                    <i class="fa-solid fa-language"></i> Lingua / Language
                </h3>
                <div class="slider-row" style="margin-top: 15px;">
                    <span class="slider-icon"><i class="fa-solid fa-globe"></i></span>
                    <div class="slider-wrapper" style="width: 100%;">
                        <select id="lang-select" class="clean-input" style="width: 100%; padding: 5px; font-size: 0.85rem; background: rgba(0,0,0,0.3); border: 1px solid #4a6582; color: white; border-radius: 4px;">
                            <option value="it"<?php echo ($lang === 'it') ? ' selected' : ''; ?>>Italiano</option>
                            <option value="en"<?php echo ($lang === 'en') ? ' selected' : ''; ?>>English</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="settings-group">
                <h3 class="group-title">
					<?php echo $labels["modals_opzioni_contenuto_audio"]; ?>
				</h3>
                <div class="slider-row" style="margin-top: 15px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px;">
                <span class="slider-icon">
                    <i class="fa-solid fa-compact-disc"></i>
                </span>
                <div class="slider-wrapper" style="width: 100%;">
                    <label><?php echo $labels["opt_bg_music"]; ?></label>
                    
                    <select id="bg-music-select" class="clean-input" style="width: 100%; padding: 5px; font-size: 0.85rem; background: rgba(0,0,0,0.3); border: 1px solid #4a6582; color: white; border-radius: 4px;">
                    </select>
                    
                    <div id="bg-music-lock-msg" style="display:none; font-size: 0.7rem; color: #e74c3c; margin-top: 4px;">
                        <i class="fa-solid fa-lock"></i> <?php echo $labels["opt_music_locked"]; ?>
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

            <div id="pwa-install-row" style="display:none; margin-bottom: 10px;">
                <button id="pwa-install-btn" class="buy-btn ghost-btn" style="width:100%; justify-content:center; gap:8px;">
                    <i class="fa-solid fa-download"></i> <?php echo $labels["opt_install_app"]; ?>
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

<div id="user-hub-modal" class="modal-backdrop" style="display: none;">
    <div class="modal-content profile-modern-modal user-hub-modal">
        <button class="modal-close-btn">&times;</button>

        <div class="profile-header-section minimal">
            <div class="profile-user-info">
                <h2 id="display-username-large"><?php echo $labels["account_default_name"]; ?></h2>
            </div>
        </div>

        <div class="hub-tabs" role="tablist">
            <button class="hub-tab active" data-hubtab="account" role="tab" aria-selected="true">
                <i class="fa-solid fa-user-gear"></i> <span><?php echo $labels["hub_tab_account"]; ?></span>
            </button>
            <button class="hub-tab" data-hubtab="amici" role="tab" aria-selected="false">
                <i class="fa-solid fa-user-group"></i> <span><?php echo $labels["hub_tab_amici"]; ?></span>
                <span class="hub-tab-badge" id="hub-amici-badge" hidden></span>
            </button>
        </div>

        <div class="settings-content profile-body hub-pane active" data-hubpane="account">

            <button id="logout-btn" class="buy-btn ghost-btn hub-logout-btn">
                <i class="fa-solid fa-right-from-bracket"></i> <?php echo $labels["account_logout"]; ?>
            </button>

            <div class="form-section">
                <label class="section-label"><?php echo $labels["account_edit_name"]; ?></label>
                <div class="input-group-modern clean-input">
                    <input type="text" id="new-username-input" placeholder="<?php echo $labels["account_new_name_ph"]; ?>" />
                    <button id="change-username-btn" class="action-btn-clean">
                        <i class="fa-solid fa-floppy-disk"></i> <?php echo $labels["account_save"]; ?>
                    </button>
                </div>
            </div>

            <hr class="profile-divider">

            <div class="form-section">
                <label class="section-label"><?php echo $labels["account_security"]; ?></label>
                <div class="input-stack">
                    <div class="input-group-modern clean-input">
                        <input type="password" id="old-password-input" placeholder="<?php echo $labels["account_old_pass_ph"]; ?>">
                    </div>
                    <div class="input-group-modern clean-input">
                        <input type="password" id="new-password-input" placeholder="<?php echo $labels["account_new_pass_ph"]; ?>">
                        <button class="toggle-pass-btn icon-only" data-target="new-password-input">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                    </div>
                    <button id="change-password-btn" class="buy-btn ghost-btn full-width">
                        <?php echo $labels["account_update_pass"]; ?>
                    </button>
                </div>
            </div>

            <details class="danger-zone-minimal danger-collapsible">
                <summary class="danger-title"><?php echo $labels["account_critical"]; ?><i class="fa-solid fa-chevron-down danger-chevron"></i></summary>
                <div class="danger-collapsible-body">
                    <div class="input-group-modern clean-input danger-border">
                        <input type="password" id="danger-zone-password" placeholder="<?php echo $labels["account_confirm_pass_ph"]; ?>" />
                    </div>

                    <div class="danger-actions-grid two">
                        <button id="reset-progress-btn" class="danger-action-btn orange">
                            <i class="fa-solid fa-rotate-left"></i> Reset
                        </button>
                        <button id="delete-save-btn" class="danger-action-btn red">
                            <i class="fa-solid fa-trash"></i> <?php echo $labels["account_delete"]; ?>
                        </button>
                    </div>
                </div>
            </details>

        </div>

        <div class="settings-content profile-body hub-pane" data-hubpane="amici" style="display:none;">
            <div id="friends-view">
                <div class="friends-add-bar">
                    <i class="fa-solid fa-magnifying-glass friends-search-lead"></i>
                    <input type="text" id="friend-search-input" class="friends-search-input" maxlength="20" autocomplete="off" />
                    <button id="friend-search-clear" class="friends-search-clear" aria-label="Pulisci" hidden>
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                <div id="friend-search-result"></div>
                <div id="friends-requests"></div>
                <div class="friends-section-title" id="friends-list-title" style="display:none;"></div>
                <div id="friends-list"></div>
                <div id="friends-empty" class="hub-soon friends-empty" style="display:none;">
                    <i class="fa-solid fa-user-group hub-soon-icon"></i>
                    <h3 class="fe-title"></h3>
                    <p class="fe-desc"></p>
                </div>
            </div>
            <div id="friend-profile-panel" class="friend-profile-panel" style="display:none;"></div>
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
        <div class="lb-scope-toggle" role="tablist">
            <button class="lb-scope-btn active" data-scope="global" role="tab">
                <i class="fa-solid fa-globe"></i> <?php echo $labels["lb_scope_global"]; ?>
            </button>
            <button class="lb-scope-btn" data-scope="friends" role="tab">
                <i class="fa-solid fa-user-group"></i> <?php echo $labels["lb_scope_friends"]; ?>
            </button>
        </div>
        <div id="leaderboard-list"></div>
    </div>
</div>
<div id="prestige-modal" class="modal-backdrop" style="display: none;">
    <div class="modal-content" style="max-width: 400px; text-align: center; border: 1px solid #f1c40f; box-shadow: 0 0 30px rgba(241,196,15,0.3); padding: 0; overflow: hidden; background: #0a0a0a;">
        <button class="modal-close-btn" id="cancel-prestige-btn" style="z-index: 10;">&times;</button>
        
        <h2 style="background: #1f1905; color: #f1c40f; border-bottom: 1px solid rgba(241, 196, 15, 0.3); padding: 20px; margin: 0;">
            <i class="fa-solid fa-certificate"></i> <?php echo $labels["prestige_titolo"]; ?>
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
                <i class="fa-solid fa-file-signature" style="color: #f1c40f;"></i> <?php echo $labels["prestige_sign"]; ?><br><br>
                <span style="color:#bdc3c7; font-weight:normal; font-size: 0.85rem;"><?php echo $labels["prestige_warning"]; ?></span>
            </p>

            <div style="background: #110f08; border-radius: 12px; padding: 20px; margin-bottom: 20px; border: 1px solid #4a3e12;">
                <div style="font-size: 0.75rem; text-transform: uppercase; color: #7f8c8d; margin-bottom: 5px; letter-spacing: 1px;">
                    <?php echo $labels["prestige_gain"]; ?>
                </div>
                <div style="font-size: 3.5rem;font-family: var(--font-heading); font-weight: 900; color: #3498db; text-shadow: 0 0 20px rgba(52, 152, 219, 0.5); line-height: 1;" id="contract-gain-token">
                    +0
                </div>
                <div style="color: #3498db; font-weight: bold; font-size: 1.1rem; margin-bottom: 5px; margin-top: 5px;">
                    <?php echo $labels["prestige_token"]; ?>
                </div>
                <div id="contract-gain-bonus" style="font-size: 0.9rem; color: #95a5a6; margin-top: 15px; border-top: 1px solid #2a2305; padding-top: 15px;">
                    <?php echo $labels["prestige_new_mult"]; ?> <span style="color: #f1c40f; font-weight: bold;">x1.00</span>
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
                <i class="fa-solid fa-pen-nib"></i> <?php echo $labels["prestige_sign_btn"]; ?>
            </button>
        </div>
    </div>
</div>

<div id="format-modal" class="modal-backdrop" style="display: none;">
    <div class="modal-content" style="max-width: 400px; text-align: center; border: 1px solid #9b59b6; box-shadow: 0 0 30px rgba(155,89,182,0.6);">
        <button class="modal-close-btn">&times;</button>
        <h2 style="background: #1a0f2e; color: #9b59b6; border-bottom: 1px solid rgba(155, 89, 182, 0.3); padding: 20px;">
            <i class="fa-solid fa-infinity fa-spin"></i> <?php echo $labels["format_titolo"]; ?>
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
                <i class="fa-solid fa-skull" style="color: #e74c3c;"></i> <?php echo $labels["format_warning"]; ?>
            </p>

            <div style="background: #110a1f; border-radius: 12px; padding: 20px; margin-bottom: 25px; border: 1px solid #4a235a;">
                <div style="font-size: 0.75rem; text-transform: uppercase; color: #7f8c8d; margin-bottom: 5px; letter-spacing: 1px;">
					<?php echo $labels["format_gain"]; ?>
				</div>
                <div style="font-size: 3rem; font-weight: 900; color: #9b59b6; text-shadow: 0 0 20px rgba(155, 89, 182, 0.4); line-height: 1;">
                    <span id="format-gain-qbit">+0</span>
                </div>
                <div style="color: #9b59b6; font-weight: bold; font-size: 1.1rem; margin-bottom: 10px;">
					<?php echo $labels["format_qbits"]; ?>
				</div>
            </div>

            <button id="btn-confirm-format" class="buy-btn quantum-btn" aria-label="<?php echo $labels['prestige_madeheaven_aria']; ?>" style="
                width: 100%;
                height: 55px;
                font-size: 1.2rem;
                border-radius: 8px;">
                <i class="fa-solid fa-meteor"></i> MADE IN HEAVEN
                <span style="display:block; font-size:0.7rem; font-weight:normal; opacity:0.85; margin-top:2px;"><?php echo $labels["format_subtitle"]; ?></span>
            </button>
        </div>
    </div>
</div>

<div id="skins-modal" class="modal-backdrop" style="display: none;">
    <div class="modal-content skins-modal-v3" style="max-width: 1320px; width: 95%;">
        <button class="modal-close-btn">&times;</button>
        <h2>
            <i data-lucide="palette"></i>
            <?php echo $labels["modals_guardaroba_titolo"]; ?>
        </h2>

        <div class="skins-controls-bar">
            <div class="skins-filters">
                <button class="skin-filter-btn active" data-filter="all"><?php echo $labels["skins_filter_all"]; ?></button>
                <button class="skin-filter-btn" data-filter="unlocked"><?php echo $labels["skins_filter_unlocked"]; ?></button>
                <button class="skin-filter-btn" data-filter="locked"><?php echo $labels["skins_filter_locked"]; ?></button>

                <select id="skin-rarity-filter" class="clean-input skin-select-filter">
                    <option value="all"><?php echo $labels["skins_rarity_all"]; ?></option>
                    <option value="common"><?php echo $labels["skins_rarity_common"]; ?></option>
                    <option value="rare"><?php echo $labels["skins_rarity_rare"]; ?></option>
                    <option value="epic"><?php echo $labels["skins_rarity_epic"]; ?></option>
                    <option value="legendary"><?php echo $labels["skins_rarity_legendary"]; ?></option>
                    <option value="divine"><?php echo $labels["skins_rarity_divine"]; ?></option>
                    <option value="christmas"><?php echo $labels["skins_rarity_christmas"]; ?></option>
                </select>
            </div>
        </div>

        <!-- Singolo container unificato (no più toggle / carousel / legacy) -->
        <div id="skins-grid-modern" class="skins-grid-container skins-unified-grid"></div>
    </div>
</div>

<div id="release-notes-modal" class="modal-backdrop" style="display: none; z-index: 2500;">
    <div class="modal-content" style="max-width: 700px; border-top: 4px solid #f1c40f;">
        <button class="modal-close-btn">&times;</button>
        <h2 style="background: #1a1a1a; color: #f1c40f; border-bottom: 1px solid rgba(241, 196, 15, 0.3);">
            <i class="fa-solid fa-bullhorn"></i> <?php echo $labels["news_titolo"]; ?>
        </h2>
        <div class="settings-content" id="release-notes-content" style="padding: 20px 30px; font-family: 'Inter', sans-serif;">
            <div style="text-align: center; color: #7f8c8d; margin-top: 20px;">
                <i class="fa-solid fa-circle-notch fa-spin fa-2x"></i><br><br><?php echo $labels["news_loading"]; ?>
            </div>
        </div>
    </div>
</div>