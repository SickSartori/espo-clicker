<div id="quantum-wrapper" class="tab-content" style="display: none;">
    <div id="quantum-store" style="display: block;">
        <div class="section-header">
            <h2 style="color: #9b59b6;">
				<i class="fa-solid fa-atom"></i> Quantum Lab
			</h2>
        </div>
        
        <div style="background: rgba(155, 89, 182, 0.1); border: 2px solid rgba(155, 89, 182, 0.4); border-radius: 8px; padding: 15px; margin: 10px 15px 25px 15px; text-align: center;">
            <h3 style="color: #e74c3c; margin: 0 0 10px 0; font-size: 1.1rem;"><i class="fa-solid fa-triangle-exclamation"></i> <?php echo $labels['quantum_reboot_title']; ?></h3>
            <p style="color: #bdc3c7; font-size: 0.8rem; margin-bottom: 10px;"><?php echo $labels['quantum_reboot_desc']; ?></p>
            <div style="background: rgba(0,0,0,0.3); border-radius: 6px; padding: 10px; margin-bottom: 15px;">
                <span style="color: #7f8c8d; font-size: 0.75rem; font-weight: bold; display: block; margin-bottom: 5px;"><?php echo $labels['quantum_energy']; ?></span>
                <span id="pending-qbits-display" style="color: #9b59b6; font-size: 1.5rem; font-weight: 900; text-shadow: 0 0 10px rgba(155, 89, 182, 0.5);">+0 Q-Bit</span>
            </div>
            
            <div id="format-requirement-warning" style="color: #e74c3c; font-size: 0.85rem; font-weight: bold; margin-bottom: 10px; display: none;">
                <i class="fa-solid fa-lock"></i> <?php echo $labels['quantum_requires']; ?> <span id="current-resets-display">0</span>/20)
            </div>

            <button id="btn-open-format-modal" class="buy-btn quantum-btn" style="width: 100%; height: 45px; font-size: 1rem;"><i class="fa-solid fa-meteor"></i> <?php echo $labels['quantum_start_format']; ?></button>
        </div>

        <div class="section-header">
            <h2 style="color: #9b59b6; font-size: 0.9rem;"><i class="fa-solid fa-microchip"></i> <?php echo $labels['quantum_meta_tech']; ?></h2>
        </div>
        
        <div id="quantum-list-container" style="padding: 10px 15px 40px 15px;"></div> 
        
        <div id="quantum-empty" class="empty-state-msg" style="display: none;">
			<?php echo $labels['quantum_empty']; ?>
        </div>
    </div>
</div>