<div id="arcade-modal" class="modal-backdrop" style="display: none;">
    <div class="modal-content arcade-cabinet">

        <div class="arcade-header">
            <button class="modal-close-btn arcade-close">&times;</button>
            <div class="arcade-title-neon">
                <i class="fa-solid fa-gamepad" style="color: #3498db; margin-right: 10px;"></i>espò arcade
            </div>
            <div class="arcade-wallet">
                <div class="arcade-wallet-item">
                    <i class="fa-solid fa-bug"></i>
                    <span id="arcade-wallet-bugs" class="arcade-wallet-val">0</span>
                </div>
                <div class="arcade-wallet-item arcade-wallet-bps">
                    <i class="fa-solid fa-bolt"></i>
                    <span id="arcade-wallet-bps">0/s</span>
                </div>
            </div>
        </div>

        <div class="settings-content arcade-screen-container global-crt-filter">

            <div id="arcade-game-selector" class="arcade-split-layout">

                <div class="arcade-menu-list">
                    <div class="arcade-menu-item active" data-game="snake" data-title="SNAKE PROTOCOL" data-color="#2ecc71" data-desc="Mangia i bug, evita i muri. Un classico intramontabile." onclick="if(window.initSnakeGame) window.initSnakeGame()">
                        <span class="item-num">01</span><span>SNAKE PROTOCOL</span>
                    </div>
                    <div class="arcade-menu-item" data-game="space" data-title="SPACE IMPACT" data-color="#e74c3c" data-desc="Naviga nello spazio e distruggi gli sciami di bug alieni." onclick="if(window.initSpaceGame) window.initSpaceGame()">
                        <span class="item-num">02</span><span>SPACE IMPACT</span>
                    </div>
                    <div class="arcade-menu-item" data-game="asteroids" data-title="ESPO-ROIDS" data-color="#e67e22" data-desc="Sopravvivi al campo di asteroidi-bug. Attento ai frammenti!" onclick="if(window.startAsteroidsGame) window.startAsteroidsGame()">
                        <span class="item-num">03</span><span>ESPO-ROIDS</span>
                    </div>
                    <div class="arcade-menu-item" data-game="superespo" data-title="SUPER ESPO" data-color="#9b59b6" data-desc="Un endless platformer per veri pro. Corri, salta, schiaccia i Goomba-Bug e sopravvivi ai loop per farmare tonnellate di Bug!" onclick="if(window.startSuperEspoGame) window.startSuperEspoGame()">
                        <span class="item-num">04</span><span>SUPER ESPO</span>
                    </div>
                    <div class="arcade-menu-item" data-game="invaders" data-title="BUG INVADERS" data-color="#2ecc71" data-desc="Difendi i bunker, abbatti lo sciame di alieni-bug prima che ti raggiunga." onclick="if(window.startInvadersGame) window.startInvadersGame()">
                        <span class="item-num">05</span><span>BUG INVADERS</span>
                    </div>
                    <div class="arcade-menu-item" data-game="centipede" data-title="BUG CRAWLER" data-color="#f472b6" data-desc="Distruggi il centopiedi-bug nel campo dei funghi prima che ti raggiunga al suolo." onclick="if(window.startCentipedeGame) window.startCentipedeGame()">
                        <span class="item-num">06</span><span>BUG CRAWLER</span>
                    </div>
                    <div class="arcade-menu-item locked">
                        <span class="item-num">--</span><span>??? COMING SOON</span>
                    </div>
                </div>

                <div class="arcade-preview-monitor crt-effect">
                    <div class="preview-content">
                        <h3 id="preview-title" style="color: #2ecc71;">SNAKE PROTOCOL</h3>
                        <div class="preview-separator">════════════════</div>
                        <p id="preview-desc">Mangia i bug, evita i muri. Un classico intramontabile.</p>

                        <div class="preview-stats">
                            ★ HI-SCORE: <span id="preview-highscore">0</span>
                        </div>

                        <div class="insert-coin-text">▶ INSERT COIN ◀</div>
                    </div>
                </div>

            </div>

            <div id="arcade-active-game-container"></div>

            <div id="asteroids-container" class="arcade-game-container" style="display: none;">
                <canvas id="asteroids-canvas"></canvas>
                <div id="asteroids-overlay" class="arcade-overlay">
                    <h2 style="color: #e67e22; font-size: 2.5rem; margin-bottom: 10px; font-weight: 900; text-shadow: 0 0 10px #e67e22;">ESPO-ROIDS</h2>
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