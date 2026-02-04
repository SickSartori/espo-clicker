<div id="prestige-wrapper" class="tab-content" style="display: none;">
    <div id="prestige-store" style="display: block;">
        <div class="section-header">
            <h2 style="color: #f1c40f;">
				<i class="fa-solid fa-flask-vial"></i>
				<?php echo $labels["tab_promozione_titolo"]; ?>
			</h2>
        </div>
        <div id="lab-wallet-container">
            <span class="lab-wallet-label">
				<?php echo $labels["tab_promozione_label_mobile"]; ?>
			</span>
            <span id="lab-wallet-amount">0</span>
        </div>
        
        <div id="prestige-list-container"></div> 
        
        <div id="prestige-empty" class="empty-state-msg" style="display: none;">
			<?php echo $labels["tab_promozione_label_tutto_acquistato"]; ?>
        </div>
    </div>
</div>