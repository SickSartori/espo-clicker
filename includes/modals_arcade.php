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
                    <div class="arcade-menu-item active" data-game="snake" data-title="SNAKE PROTOCOL" data-color="#2ecc71" data-desc="<?php echo $labels['arcade_desc_snake']; ?>" onclick="if(window.initSnakeGame) window.initSnakeGame()">
                        <span class="item-num">01</span><span>SNAKE PROTOCOL</span>
                    </div>
                    <div class="arcade-menu-item" data-game="space" data-title="SPACE IMPACT" data-color="#e74c3c" data-desc="<?php echo $labels['arcade_desc_space']; ?>" onclick="if(window.initSpaceGame) window.initSpaceGame()">
                        <span class="item-num">02</span><span>SPACE IMPACT</span>
                    </div>
                    <div class="arcade-menu-item" data-game="asteroids" data-title="ESPO-ROIDS" data-color="#e67e22" data-desc="<?php echo $labels['arcade_desc_asteroids']; ?>" onclick="if(window.startAsteroidsGame) window.startAsteroidsGame()">
                        <span class="item-num">03</span><span>ESPO-ROIDS</span>
                    </div>
                    <div class="arcade-menu-item" data-game="superespo" data-title="SUPER ESPO" data-color="#9b59b6" data-desc="<?php echo $labels['arcade_desc_superespo']; ?>" onclick="if(window.startSuperEspoGame) window.startSuperEspoGame()">
                        <span class="item-num">04</span><span>SUPER ESPO</span>
                    </div>
                    <div class="arcade-menu-item" data-game="invaders" data-title="BUG INVADERS" data-color="#2ecc71" data-desc="<?php echo $labels['arcade_desc_invaders']; ?>" onclick="if(window.startInvadersGame) window.startInvadersGame()">
                        <span class="item-num">05</span><span>BUG INVADERS</span>
                    </div>
                    <div class="arcade-menu-item" data-game="centipede" data-title="BUG CRAWLER" data-color="#f472b6" data-desc="<?php echo $labels['arcade_desc_centipede']; ?>" onclick="if(window.startCentipedeGame) window.startCentipedeGame()">
                        <span class="item-num">06</span><span>BUG CRAWLER</span>
                    </div>
                    <div class="arcade-menu-item" data-game="stack" data-title="STACK OVERFLOW" data-color="#00d9ff" data-desc="<?php echo $labels['arcade_desc_stack']; ?>" onclick="if(window.initStackGame) window.initStackGame()">
                        <span class="item-num">07</span><span>STACK OVERFLOW</span>
                    </div>
                    <div class="arcade-menu-item locked">
                        <span class="item-num">--</span><span>??? COMING SOON</span>
                    </div>
                </div>

                <div class="arcade-preview-monitor crt-effect">
                    <div class="preview-content">
                        <h3 id="preview-title" style="color: #2ecc71;">SNAKE PROTOCOL</h3>
                        <div class="preview-separator">════════════════</div>
                        <p id="preview-desc"><?php echo $labels['arcade_desc_snake']; ?></p>

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
                        <?php echo $labels['arcade_keys_dir']; ?> <span style="color:#e67e22"><?php echo $labels['arcade_rotate']; ?></span><br>
                        <?php echo $labels['arcade_space_key']; ?> <span style="color:#e67e22"><?php echo $labels['arcade_fire']; ?></span>
                    </p>
                    <button class="arcade-btn" onclick="window.startAsteroidsRun()"><?php echo $labels['arcade_start_mission']; ?></button>
                    <button class="arcade-btn secondary" onclick="window.exitAsteroidsGame()" style="margin-top: 10px;"><?php echo $labels['arcade_exit']; ?></button>
                </div>
            </div>

        </div>
    </div>
</div>