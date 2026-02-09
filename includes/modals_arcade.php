<div id="arcade-modal" class="modal-backdrop" style="display: none;">
    <div class="modal-content arcade-cabinet">
        
        <div class="arcade-header">
            <button class="modal-close-btn arcade-close">&times;</button>
            <div class="arcade-title-neon">
                ESPÒ <span style="color:#3498db">ARC</span>ADE
            </div>
            <div class="arcade-subtitle">SALA GIOCHI RETRO</div>
        </div>

        <div class="settings-content arcade-screen-container">
            
            <div id="arcade-game-selector">
                <div class="arcade-games-grid">
                    
                    <div class="arcade-game-card snake-theme" onclick="if(window.initSnakeGame) window.initSnakeGame()">
                        <div class="game-thumb snake-thumb">
                            <i class="fa-solid fa-staff-snake"></i>
                        </div>
                        <div class="game-info">
                            <div class="game-title">SNAKE</div>
                            <div class="game-desc">Mangia i Bug, evita i muri!</div>
                        </div>
                        <button class="arcade-play-btn">GIOCA</button>
                    </div>

                    <div class="arcade-game-card space-theme" onclick="if(window.initSpaceGame) window.initSpaceGame()">
                        <div class="game-thumb space-thumb">
                            <i class="fa-solid fa-shuttle-space"></i>
                        </div>
                        <div class="game-info">
                            <div class="game-title">SPACE IMPACT</div>
                            <div class="game-desc">Distruggi i Bug Alieni!</div>
                        </div>
                        <button class="arcade-play-btn">GIOCA</button>
                    </div>

                    <div class="arcade-game-card locked">
                        <div class="game-thumb">
                            <i class="fa-solid fa-meteor"></i>
                        </div>
                        <div class="game-info">
                            <div class="game-title">ASTEROIDS</div>
                            <div class="game-desc">In arrivo</div>
                        </div>
                        <button class="arcade-play-btn" disabled>BLOCCATO</button>
                    </div>

                    <div class="arcade-game-card locked">
                        <div class="game-thumb">
                            <i class="fa-solid fa-gamepad"></i>
                        </div>
                        <div class="game-info">
                            <div class="game-title">ALTRI GIOCHI</div>
                            <div class="game-desc">In Sviluppo ...</div>
                        </div>
                        <button class="arcade-play-btn" disabled>...</button>
                    </div>

                </div>
            </div>

            <div id="arcade-active-game-container"></div>

        </div>

        <div class="arcade-footer">
            <div class="highscore-ticker">
                PUNTEGGIO PIU' ALTO: <span id="arcade-high-score">0</span>
            </div>
        </div>
    </div>
</div>