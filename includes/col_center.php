<div id="center-column" class="game-column">
    <div class="column-header-center">
        <div id="header-left-panel" class="header-stat-box header_stat_box_display_none">
            <span class="header-label">
				<i class="fa-solid fa-bolt"></i>
				<?php echo $labels["col_center_moltiplicatore_label"]; ?>
			</span>
            <span id="display-career-bonus" class="header-value" style="color: #f1c40f;">x1.00</span>
        </div>
        <div class="header-main-score">
            <span class="header-label-main">
				<i class="fa-solid fa-bug"></i>
				<?php echo $labels["col_center_bug_risolti_label"]; ?>
			</span>
            <div id="score-display">0</div>
        </div>
        <div id="header-right-panel" class="header-stat-box header_right_panel header_stat_box_display_none">
            <div style="display: flex; gap: 20px; justify-content: flex-end; align-items: center;">
                <div style="display: flex; flex-direction: column; align-items: flex-end;">
                    <span class="header-label">
                        <i class="fa-solid fa-coins"></i> <?php echo $labels["col_center_token_label"]; ?>
                    </span>
                    <span id="prestige-points-display" class="header-value" style="color: #3498db;">0</span>
                </div>
                <div id="header-qbit-container" style="display: none; flex-direction: column; align-items: flex-end;">
                    <span class="header-label"><i class="fa-solid fa-atom"></i> Q-BITS</span>
                    <span id="header-qbit-display" class="header-value" style="color: #9b59b6;">0</span>
                </div>
            </div>
        </div>
    </div>

    <div id="clicker-section">
        <div id="click-feedback-container"></div>
        <button id="clicker-btn" title="<?php echo $labels["col_center_bottone_clicker_titolo"]; ?>">
            <img id="manager-photo-clicked" src="assets/image/skins/espo-click.webp" alt="Click!" draggable="false">
            <img id="manager-photo-normal" src="assets/image/skins/espo.webp" alt="Espòòò" draggable="false">
        </button>
        <div id="cps-display">BPS: 0.0</div>
        <button id="skill-crunchTime" class="skill-btn" style="display: none;">
            🔥 <?php echo $labels["col_center_espo_fury_titolo"]; ?> 🔥
            <div class="skill-timer">
				<?php echo $labels["col_center_espo_fury_bottone_label"]; ?>
			</div>
        </button>
        <div id="event-multiplier-display" style="display: none;"></div>
        <div id="prestige-bonus-display" class="prestige-info" style="display: none;">Bonus: +0%</div>
        <div id="version-display"></div>
    </div>
</div>