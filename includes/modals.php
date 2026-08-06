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
        <!-- Unica finestra senza X: si chiudeva solo con «Chiudi & Salva» in
             fondo, che su mobile richiede di scorrere tutta la lista. La X
             equivale al salva (vedi ui/modals): niente due semantiche di
             chiusura diverse nella stessa finestra. -->
        <button class="modal-close-btn">&times;</button>
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
        <div id="leaderboard-season" style="text-align:center; margin:-4px 0 10px; font:700 0.82rem/1 'Rajdhani',system-ui,sans-serif; letter-spacing:2px; color:#f1c40f; text-transform:uppercase;"></div>
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
<div id="prestige-hub-modal" class="modal-backdrop" style="display: none;">
    <div class="modal-content prestige-hub-content">
        <button class="modal-close-btn">&times;</button>
        <h2>
            <i data-lucide="zap"></i>
            <?php echo $labels["hub_titolo"]; ?>
        </h2>

        <div class="settings-content hub-cards">

            <!-- CARD PROMOZIONE (oro) — stati: is-locked / is-ready -->
            <section id="hub-card-promo" class="hub-card hub-card-promo is-locked">
                <h3 class="hub-card-title"><i class="fa-solid fa-certificate"></i> <?php echo $labels["prestige_titolo"]; ?></h3>

                <p class="hub-card-warning">
                    <i class="fa-solid fa-file-signature" style="color: #f1c40f;"></i> <?php echo $labels["prestige_sign"]; ?><br>
                    <span class="hub-warning-sub"><?php echo $labels["prestige_warning"]; ?></span>
                </p>

                <div class="hub-gain-box">
                    <div class="hub-gain-label"><?php echo $labels["prestige_gain"]; ?></div>
                    <div class="hub-gain-value" id="contract-gain-token">+0</div>
                    <div class="hub-gain-name"><?php echo $labels["prestige_token"]; ?></div>
                    <div class="hub-gain-bonus" id="contract-gain-bonus"><?php echo $labels["prestige_new_mult"]; ?> <span>x1.00</span></div>
                </div>

                <div class="hub-progress">
                    <div class="hub-progress-track"><div class="hub-progress-fill" id="hub-promo-progress-fill"></div></div>
                    <span class="hub-progress-label" id="hub-promo-progress-label">0%</span>
                </div>

                <button id="btn-confirm-prestige" class="buy-btn hub-confirm hub-confirm-promo" disabled>
                    <span class="hub-btn-ready"><i class="fa-solid fa-pen-nib"></i> <?php echo $labels["prestige_sign_btn"]; ?></span>
                    <span class="hub-btn-locked"><i class="fa-solid fa-lock"></i> <?php echo $labels["hub_promo_locked_btn"]; ?></span>
                </button>
            </section>

            <!-- CARD FORMATTAZIONE (viola) — stati: is-mystery / is-locked / is-ready -->
            <section id="hub-card-format" class="hub-card hub-card-format is-mystery">
                <div class="hub-mystery-veil" aria-hidden="true"><i class="fa-solid fa-lock"></i></div>

                <h3 class="hub-card-title">
                    <span class="hub-format-title-real"><i class="fa-solid fa-infinity"></i> <?php echo $labels["format_titolo"]; ?></span>
                    <span class="hub-format-title-mystery">???</span>
                </h3>

                <p class="hub-card-warning">
                    <i class="fa-solid fa-skull" style="color: #e74c3c;"></i> <?php echo $labels["format_warning"]; ?>
                </p>

                <div class="hub-gain-box">
                    <div class="hub-gain-label"><?php echo $labels["format_gain"]; ?></div>
                    <div class="hub-gain-value" id="format-gain-qbit">+0</div>
                    <div class="hub-gain-name"><?php echo $labels["format_qbits"]; ?></div>
                </div>

                <button id="btn-confirm-format" class="buy-btn quantum-btn hub-confirm hub-confirm-format" aria-label="<?php echo $labels['prestige_madeheaven_aria']; ?>" disabled>
                    <span class="hub-btn-ready"><i class="fa-solid fa-meteor"></i>&nbsp;MADE IN HEAVEN
                        <span class="hub-btn-sub"><?php echo $labels["format_subtitle"]; ?></span>
                    </span>
                    <span class="hub-btn-locked"><i class="fa-solid fa-lock"></i> <?php echo $labels["hub_counter_label"]; ?> <span class="hub-format-counter-value">0/20</span></span>
                </button>
            </section>
        </div>
    </div>
</div>

<div id="skins-modal" class="modal-backdrop" style="display: none;">
    <div class="modal-content skins-modal-v3" style="max-width: 1320px; width: 95%;">
        <button class="modal-close-btn">&times;</button>
        <h2>
            <i data-lucide="shirt"></i>
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

<!-- MENU MOBILE — raccoglie le voci secondarie della barra in alto.
     Su mobile le icone sono senza etichetta e da 35px: otto affiancate erano
     illeggibili. Qui ogni voce ha icona E nome.
     Le voci NON duplicano logica: inoltrano il click al pulsante vero della
     navbar (data-opens), che ha già il suo handler. Aggiungere una voce =
     aggiungere un <button> qui. -->
<div id="mobile-menu-modal" class="modal-backdrop" style="display: none;">
    <div class="modal-content" style="max-width: 420px;">
        <button class="modal-close-btn">&times;</button>
        <h2>
            <i class="fa-solid fa-bars"></i>
            <?php echo $labels["navbar_menu"]; ?>
        </h2>
        <div class="settings-content" id="mobile-menu-list">
            <button type="button" class="mm-item" data-opens="open-achievements-btn">
                <i class="mm-icon" data-lucide="award"></i>
                <span class="mm-label"><?php echo $labels["navbar_obiettivi"]; ?></span>
                <span class="mm-dot" aria-hidden="true"></span>
            </button>
            <button type="button" class="mm-item" data-opens="open-skins-btn">
                <i class="mm-icon" data-lucide="shirt"></i>
                <span class="mm-label"><?php echo $labels["navbar_skin"]; ?></span>
            </button>
            <button type="button" class="mm-item" data-opens="open-leaderboard-btn">
                <i class="mm-icon" data-lucide="trophy"></i>
                <span class="mm-label"><?php echo $labels["navbar_classifica"]; ?></span>
            </button>
            <button type="button" class="mm-item" data-opens="open-stats-btn">
                <i class="mm-icon" data-lucide="chart-line"></i>
                <span class="mm-label"><?php echo $labels["navbar_stats"]; ?></span>
            </button>
            <button type="button" class="mm-item" data-opens="open-settings-btn">
                <i class="mm-icon" data-lucide="sliders"></i>
                <span class="mm-label"><?php echo $labels["navbar_opzioni"]; ?></span>
            </button>
            <button type="button" class="mm-item" data-opens="open-help-btn">
                <i class="mm-icon" data-lucide="info"></i>
                <span class="mm-label"><?php echo $labels["help_menu_titolo"]; ?></span>
            </button>
        </div>
    </div>
</div>

<!-- POPUP "COME SI SEGNALA" — una tantum, subito DOPO le note di rilascio.
     Serve a far scoprire la funzione a chi non sa che esiste: niente modulo qui
     dentro, solo dove trovarlo e cosa scriverci. Chi vuole segnalare subito ha
     il pulsante che lo porta dritto alla scheda giusta. -->
<div id="feedback-intro-modal" class="modal-backdrop" style="display: none; z-index: 2600;">
    <div class="modal-content" style="max-width: 520px; border-top: 4px solid #3498db;">
        <button class="modal-close-btn">&times;</button>
        <h2 style="background: #1a1a1a; color: #3498db; border-bottom: 1px solid rgba(52, 152, 219, 0.3);">
            <i class="fa-solid fa-bullhorn"></i> <?php echo $labels["fbintro_titolo"]; ?>
        </h2>
        <div class="settings-content" style="padding: 22px 26px;">

            <p style="color: #bdc3c7; font-size: 0.98rem; line-height: 1.6; margin: 0 0 20px;">
                <?php echo $labels["fbintro_intro"]; ?>
            </p>

            <div style="display: flex; gap: 12px; margin-bottom: 14px; align-items: flex-start;">
                <div style="flex: 0 0 28px; height: 28px; border-radius: 50%; background: rgba(52,152,219,0.15); color: #3498db; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.85rem;">1</div>
                <p style="color: #bdc3c7; font-size: 0.93rem; line-height: 1.5; margin: 3px 0 0;"><?php echo $labels["fbintro_p1"]; ?></p>
            </div>
            <div style="display: flex; gap: 12px; margin-bottom: 14px; align-items: flex-start;">
                <div style="flex: 0 0 28px; height: 28px; border-radius: 50%; background: rgba(52,152,219,0.15); color: #3498db; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.85rem;">2</div>
                <p style="color: #bdc3c7; font-size: 0.93rem; line-height: 1.5; margin: 3px 0 0;"><?php echo $labels["fbintro_p2"]; ?></p>
            </div>
            <div style="display: flex; gap: 12px; margin-bottom: 18px; align-items: flex-start;">
                <div style="flex: 0 0 28px; height: 28px; border-radius: 50%; background: rgba(52,152,219,0.15); color: #3498db; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.85rem;">3</div>
                <p style="color: #bdc3c7; font-size: 0.93rem; line-height: 1.5; margin: 3px 0 0;"><?php echo $labels["fbintro_p3"]; ?></p>
            </div>

            <p style="color: #7f8c8d; font-size: 0.78rem; line-height: 1.5; margin: 0 0 20px; display: flex; align-items: flex-start; gap: 6px;">
                <i class="fa-solid fa-lock" style="margin-top: 2px;"></i>
                <span><?php echo $labels["fbintro_privacy"]; ?></span>
            </p>

            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button type="button" id="fbintro-open" style="flex: 1; min-width: 160px; padding: 12px; border: 1px solid rgba(52,152,219,0.5); border-radius: 8px; background: #3498db; color: #fff; font-size: 0.95rem; font-weight: 600; cursor: pointer;">
                    <i class="fa-solid fa-bullhorn"></i> <?php echo $labels["fbintro_btn_apri"]; ?>
                </button>
                <button type="button" id="fbintro-ok" style="flex: 1; min-width: 130px; padding: 12px; border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; background: rgba(255,255,255,0.04); color: #ecf0f1; font-size: 0.95rem; font-weight: 600; cursor: pointer;">
                    <?php echo $labels["fbintro_btn_ok"]; ?>
                </button>
            </div>

        </div>
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