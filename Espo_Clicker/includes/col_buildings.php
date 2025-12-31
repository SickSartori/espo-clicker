<div id="right-column" class="game-column">
    <div class="column-header-aligned">
        <h2>
			<i class="fa-solid fa-users"></i>
			<?php echo $labels["col_buildings_titolo"]; ?>
		</h2>
    </div>
    <div id="teams-sticky-header">
        <div class="mobile-bug-wallet">
            <span class="label">
				<?php echo $labels["col_buildings_bug_label"]; ?>
			</span>
            <span class="bug-wallet-amount">0</span>
        </div>
        <div id="buy-controls">
            <button id="btn-1x" class="buy-btn" style="background-color: var(--success);">1x</button>
            <button id="btn-5x" class="buy-btn" style="background-color: var(--bg-panel);">5x</button>
            <button id="btn-10x" class="buy-btn" style="background-color: var(--bg-panel);">10x</button>
            <button id="btn-max" class="buy-btn" style="background-color: var(--bg-panel);">MAX</button>
        </div>
    </div>
    <div class="store-section" id="building-store">
        <div id="building-list-container"></div>
    </div>
</div>