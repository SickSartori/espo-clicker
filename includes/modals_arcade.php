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
                    <div class="arcade-menu-item active" data-game="snake" data-title="SNAKE PROTOCOL" data-color="#2ecc71" data-icon="fa-worm" data-desc="Mangia i bug, evita i muri. Un classico intramontabile." onclick="if(window.initSnakeGame) window.initSnakeGame()">
                        <i class="fa-solid fa-worm"></i> 
                        <span>Snake Protocol</span>
                    </div>
                    <div class="arcade-menu-item" data-game="space" data-title="SPACE IMPACT" data-color="#e74c3c" data-icon="fa-shuttle-space" data-desc="Naviga nello spazio e distruggi gli sciami di bug alieni." onclick="if(window.initSpaceGame) window.initSpaceGame()">
                        <i class="fa-solid fa-shuttle-space"></i> 
                        <span>Space Impact</span>
                    </div>
                    <div class="arcade-menu-item" data-game="asteroids" data-title="ESPÒ-ROIDS" data-color="#e67e22" data-icon="fa-meteor" data-desc="Sopravvivi al campo di asteroidi-bug. Attento ai frammenti!" onclick="if(window.startAsteroidsGame) window.startAsteroidsGame()">
                        <i class="fa-solid fa-meteor"></i>
                        <span>Espò-roids</span>
                    </div>
                    <!--<div class="arcade-menu-item locked">
                        <i class="fa-solid fa-lock" style="color: #7f8c8d;"></i> Super Espò
                        <span class="locked-badge">IN ARRIVO...</span>
                    </div>-->
                    <div class="arcade-menu-item" data-game="superespo" data-title="SUPER ESPÒ RUNNER" data-color="#9b59b6" data-icon="fa-person-running" data-desc="Un endless platformer per veri pro. Corri, salta, schiaccia i Goomba-Bug e sopravvivi ai loop per farmare tonnellate di Bug!" onclick="if(window.startSuperEspoGame) window.startSuperEspoGame()">
                        <i class="fa-solid fa-person-running"></i>
                        <span>Super Espò Runner</span>
                    </div>

                    <div class="arcade-menu-item locked">
                        <i class="fa-solid fa-lock" style="color: #7f8c8d;"></i> Altri giochi
                        <span class="locked-badge">PRESTO</span>
                    </div>
                </div>

                <div class="arcade-preview-monitor crt-effect">
                    <div class="preview-content">
                        <i id="preview-icon" class="fa-solid fa-worm" style="color: #2ecc71;"></i>
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

            <div id="asteroids-container" class="arcade-game-container" style="display: none;">
                <canvas id="asteroids-canvas"></canvas>
                <div id="asteroids-overlay" class="arcade-overlay">
                    <h2 style="color: #e67e22; font-size: 2.5rem; margin-bottom: 10px; font-weight: 900; text-shadow: 0 0 10px #e67e22;">ESPÒ-ROIDS</h2>
                    <p style="color: #fff; margin-bottom: 20px; font-size: 1rem;">
                        Tasti Direzionali: <span style="color:#e67e22">Ruota / Accelera</span><br>
                        Spazio: <span style="color:#e67e22">Spara</span>
                    </p>
                    <button class="arcade-btn" onclick="window.startAsteroidsRun()">AVVIA MISSIONE</button>
                    <button class="arcade-btn secondary" onclick="window.exitAsteroidsGame()" style="margin-top: 10px;">ESCI</button>
                </div>
            </div>

        </div>
    </div>
</div>