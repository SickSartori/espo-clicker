<div id="arcade-modal" class="modal-backdrop" style="display: none;">
    <div class="modal-content arcade-cabinet">
        
        <div class="arcade-header">
            <button class="modal-close-btn arcade-close">&times;</button>
            <div class="arcade-title-neon">
                <i class="fa-solid fa-gamepad" style="color: #3498db; margin-right: 10px;"></i>ESPÒ ARCADE
            </div>
        </div>

        <div class="settings-content arcade-screen-container global-crt-filter">
            
            <div id="arcade-game-selector" class="arcade-split-layout">
                
                <div class="arcade-menu-list">
                    <div class="arcade-menu-item active" data-game="snake" data-title="SNAKE PROTOCOL" data-color="#2ecc71" data-icon="fa-staff-snake" data-desc="Mangia i bug, evita i muri. Un classico intramontabile." onclick="if(window.initSnakeGame) window.initSnakeGame()">
                        <i class="fa-solid fa-staff-snake"></i> Snake
                    </div>
                    <div class="arcade-menu-item" data-game="space" data-title="SPACE IMPACT" data-color="#e74c3c" data-icon="fa-shuttle-space" data-desc="Naviga nello spazio e distruggi gli sciami di bug alieni." onclick="if(window.initSpaceGame) window.initSpaceGame()">
                        <i class="fa-solid fa-shuttle-space"></i> Space Impact
                    </div>
                    
                    <div class="arcade-menu-item locked">
                        <i class="fa-solid fa-lock" style="color: #7f8c8d;"></i> Asteroids
                        <span class="locked-badge">IN ARRIVO...</span>
                    </div>
                    <div class="arcade-menu-item locked">
                        <i class="fa-solid fa-lock" style="color: #7f8c8d;"></i> Altri giochi
                        <span class="locked-badge">PRESTO</span>
                    </div>
                </div>

                <div class="arcade-preview-monitor crt-effect">
                    <div class="preview-content">
                        <i id="preview-icon" class="fa-solid fa-staff-snake" style="color: #2ecc71;"></i>
                        <h3 id="preview-title" style="color: #2ecc71;">SNAKE PROTOCOL</h3>
                        <p id="preview-desc">Mangia i bug, evita i muri. Un classico intramontabile.</p>
                        
                        <div class="preview-stats">
                            <i class="fa-solid fa-trophy"></i> RECORD: <span id="preview-highscore">0</span>
                        </div>

                        <div class="insert-coin-text">PREMI START</div>
                    </div>
                </div>

            </div>

            <div id="arcade-active-game-container"></div>

        </div>
    </div>
</div>