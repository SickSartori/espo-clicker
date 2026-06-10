// arcade/invaders/js/invaders.js — Space Invaders (Bug Invaders edition)
(function () {
    let canvas, ctx;
    let rafId = null;
    let isRunning = false;
    let lastTime = 0;
    const FPS = 60;

    // Entità
    let player;
    let bullets;
    let enemies;
    let enemyBullets;
    let particles;
    let bunkers;
    let score, lives, wave;

    // Movimento sciame
    let enemyDir;       // 1 = right, -1 = left
    let enemyStepDown;  // pending vertical drop
    let enemyTick;      // ms accumulator
    let enemyShootTick; // ms accumulator

    // Input
    const keys = { ArrowLeft: false, ArrowRight: false, Space: false };

    // Tuning
    const PLAYER_SPEED = 5;
    const BULLET_SPEED = 8;
    const ENEMY_BULLET_SPEED = 4;
    const PLAYER_W = 32;
    const PLAYER_H = 16;
    const ENEMY_W = 24;
    const ENEMY_H = 18;
    const ENEMY_COLS = 9;
    const ENEMY_ROWS = 4;
    const ENEMY_HSPACE = 38;
    const ENEMY_VSPACE = 32;
    const ENEMY_DROP_PX = 18;

    function init() {
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
    }

    function handleKeyDown(e) {
        if (!isRunning) return;
        if (e.code === 'ArrowLeft') keys.ArrowLeft = true;
        if (e.code === 'ArrowRight') keys.ArrowRight = true;
        if (e.code === 'Space' || e.code === 'ArrowUp') {
            if (!keys.Space) shoot();
            keys.Space = true;
        }
        if (['ArrowLeft', 'ArrowRight', 'Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
    }

    function handleKeyUp(e) {
        if (e.code === 'ArrowLeft') keys.ArrowLeft = false;
        if (e.code === 'ArrowRight') keys.ArrowRight = false;
        if (e.code === 'Space' || e.code === 'ArrowUp') keys.Space = false;
    }

    window.startInvadersGame = function () {
        const selector = document.getElementById('arcade-game-selector');
        const gameContainer = document.getElementById('arcade-active-game-container');

        if (selector) selector.style.display = 'none';
        if (!gameContainer) return;

        gameContainer.style.display = 'flex';
        gameContainer.style.flexDirection = 'column';
        gameContainer.style.alignItems = 'center';
        gameContainer.innerHTML = '';

        const gs = window.EspooClicker ? window.EspooClicker.getGameState() : null;
        const highScore = (gs && gs.arcadeHighScores && gs.arcadeHighScores.invaders) ? gs.arcadeHighScores.invaders : 0;

        const headerDiv = document.createElement('div');
        headerDiv.className = 'arcade-game-topbar';
        headerDiv.innerHTML = `
            <button class="arcade-btn secondary" onclick="window.exitInvadersGame()">
                <i class="fa-solid fa-arrow-left"></i> MENU
            </button>
            <span class="topbar-game-label" style="color:#2ecc71">BUG INVADERS</span>
            <div class="arcade-stats-box" id="invaders-score-ui">
                <span class="stat">PUNTI: <span class="val-score">0</span></span>
                <span class="stat">VITE: <span class="val-hp">3</span></span>
                <span class="stat">WAVE: <span class="val-wave">1</span></span>
                <span class="stat">RECORD: <span class="val-record">${highScore}</span></span>
            </div>
        `;
        gameContainer.appendChild(headerDiv);

        const canvasWrapper = document.createElement('div');
        canvasWrapper.style.position = 'relative';
        canvasWrapper.className = 'crt-turn-on crt-effect';

        canvas = document.createElement('canvas');
        canvas.id = 'invaders-canvas';
        const maxWidth = Math.min(1100, window.innerWidth - 60);
        canvas.width = maxWidth;
        canvas.height = 620;
        ctx = canvas.getContext('2d');

        canvasWrapper.appendChild(canvas);

        const overlay = document.createElement('div');
        overlay.id = 'invaders-overlay';
        overlay.className = 'arcade-ui-overlay';
        overlay.innerHTML = `
            <div style="color:#2ecc71; font-family:'Rajdhani'; font-size:2.5rem; margin-bottom:10px; font-weight:900; letter-spacing:3px; text-shadow: 0 0 15px #2ecc71;">
                BUG INVADERS
            </div>
            <div style="color:#bdc3c7; margin-bottom:20px; font-family:monospace; font-size: 0.9rem;">
                ◀ ▶ per muoverti<br>SPAZIO per sparare<br>Difendi i bunker e abbatti lo sciame!
            </div>
            <button class="arcade-btn" onclick="window.startInvadersRun()">AVVIA MISSIONE</button>
        `;
        canvasWrapper.appendChild(overlay);
        gameContainer.appendChild(canvasWrapper);

        if (!window.invadersInitialized) {
            init();
            window.invadersInitialized = true;
        }
        drawStaticScreen();
    };

    window.exitInvadersGame = function () {
        isRunning = false;
        if (rafId) cancelAnimationFrame(rafId);

        const selector = document.getElementById('arcade-game-selector');
        const gameContainer = document.getElementById('arcade-active-game-container');
        if (gameContainer) {
            gameContainer.innerHTML = '';
            gameContainer.style.display = 'none';
        }
        if (selector) selector.style.display = 'flex';

        if (window.EspooClicker) window.EspooClicker.playSound('sound-click');
    };

    window.startInvadersRun = function () {
        const overlay = document.getElementById('invaders-overlay');
        if (overlay) overlay.style.display = 'none';

        player = { x: canvas.width / 2, y: canvas.height - 40, w: PLAYER_W, h: PLAYER_H, cooldown: 0 };
        bullets = [];
        enemies = [];
        enemyBullets = [];
        particles = [];
        bunkers = [];
        score = 0;
        lives = 3;
        wave = 1;

        keys.ArrowLeft = false;
        keys.ArrowRight = false;
        keys.Space = false;

        spawnWave();
        spawnBunkers();
        updateUI();

        if (window.EspooClicker) window.EspooClicker.playSound('sound-arcade-start');

        isRunning = true;
        lastTime = performance.now();
        rafId = requestAnimationFrame(gameLoop);
    };

    function spawnWave() {
        enemies = [];
        const totalW = (ENEMY_COLS - 1) * ENEMY_HSPACE;
        const startX = (canvas.width - totalW) / 2;
        const startY = 60;
        for (let r = 0; r < ENEMY_ROWS; r++) {
            for (let c = 0; c < ENEMY_COLS; c++) {
                const tier = r === 0 ? 3 : (r === 1 ? 2 : 1); // top row = highest pts
                enemies.push({
                    x: startX + c * ENEMY_HSPACE,
                    y: startY + r * ENEMY_VSPACE,
                    w: ENEMY_W,
                    h: ENEMY_H,
                    tier: tier,
                    frame: 0
                });
            }
        }
        enemyDir = 1;
        enemyStepDown = 0;
        enemyTick = 0;
        enemyShootTick = 0;
    }

    function spawnBunkers() {
        bunkers = [];
        const nBunkers = 4;
        const bunkerW = 70;
        const bunkerH = 32;
        const gap = (canvas.width - nBunkers * bunkerW) / (nBunkers + 1);
        const y = canvas.height - 100;
        for (let i = 0; i < nBunkers; i++) {
            const x = gap + i * (bunkerW + gap);
            bunkers.push({ x, y, w: bunkerW, h: bunkerH, hp: 16 });
        }
    }

    function shoot() {
        if (player.cooldown > 0) return;
        if (bullets.length >= 3) return;
        bullets.push({
            x: player.x + player.w / 2 - 2,
            y: player.y,
            w: 4,
            h: 10,
            vy: -BULLET_SPEED
        });
        player.cooldown = 14;
        if (window.EspooClicker) window.EspooClicker.playSound('sound-space-shoot');
        if (window.arcadeSfx) window.arcadeSfx.shoot();
    }

    function enemyShoot() {
        if (enemies.length === 0) return;
        // Find columns with enemies, pick random
        const cols = {};
        enemies.forEach(e => {
            const col = Math.round((e.x) / ENEMY_HSPACE);
            if (!cols[col] || e.y > cols[col].y) cols[col] = e;
        });
        const colKeys = Object.keys(cols);
        if (colKeys.length === 0) return;
        const shooter = cols[colKeys[Math.floor(Math.random() * colKeys.length)]];
        enemyBullets.push({
            x: shooter.x + shooter.w / 2 - 2,
            y: shooter.y + shooter.h,
            w: 4,
            h: 10,
            vy: ENEMY_BULLET_SPEED + wave * 0.3
        });
    }

    function createExplosion(x, y, color) {
        for (let i = 0; i < 14; i++) {
            particles.push({
                x, y,
                xv: (Math.random() - 0.5) * 6,
                yv: (Math.random() - 0.5) * 6,
                life: Math.random() * 25 + 12,
                color
            });
        }
    }

    function rectsOverlap(a, b) {
        return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    }

    function gameLoop(time) {
        if (!isRunning) return;
        rafId = requestAnimationFrame(gameLoop);
        const delta = time - lastTime;
        if (delta < 1000 / FPS) return;
        lastTime = time - (delta % (1000 / FPS));
        update(delta);
        draw();
    }

    function update(delta) {
        if (player.cooldown > 0) player.cooldown--;

        // Player movement
        if (keys.ArrowLeft) player.x -= PLAYER_SPEED;
        if (keys.ArrowRight) player.x += PLAYER_SPEED;
        if (player.x < 8) player.x = 8;
        if (player.x + player.w > canvas.width - 8) player.x = canvas.width - 8 - player.w;

        // Player bullets
        for (let i = bullets.length - 1; i >= 0; i--) {
            const b = bullets[i];
            b.y += b.vy;
            if (b.y < -b.h) { bullets.splice(i, 1); continue; }

            // vs enemies
            let hit = false;
            for (let j = enemies.length - 1; j >= 0; j--) {
                if (rectsOverlap(b, enemies[j])) {
                    const e = enemies[j];
                    score += e.tier * 20;
                    createExplosion(e.x + e.w / 2, e.y + e.h / 2, '#2ecc71');
                    if (window.EspooClicker) window.EspooClicker.playSound('sound-space-boom');
                    if (window.arcadeSfx) window.arcadeSfx.hit();
                    enemies.splice(j, 1);
                    bullets.splice(i, 1);
                    hit = true;
                    updateUI();
                    break;
                }
            }
            if (hit) continue;

            // vs bunkers
            for (let j = 0; j < bunkers.length; j++) {
                if (rectsOverlap(b, bunkers[j]) && bunkers[j].hp > 0) {
                    bunkers[j].hp--;
                    bullets.splice(i, 1);
                    createExplosion(b.x, b.y, '#888');
                    break;
                }
            }
        }

        // Enemy swarm move (tick-based for retro pulse feel)
        const swarmSpeed = Math.max(40, 200 - wave * 18 - (ENEMY_COLS * ENEMY_ROWS - enemies.length) * 4);
        enemyTick += delta;
        if (enemyTick >= swarmSpeed) {
            enemyTick = 0;
            let hitEdge = false;
            for (let i = 0; i < enemies.length; i++) {
                const e = enemies[i];
                e.x += enemyDir * 8;
                e.frame = (e.frame + 1) % 2;
                if (e.x < 6 || e.x + e.w > canvas.width - 6) hitEdge = true;
            }
            if (hitEdge) {
                enemyDir *= -1;
                for (let i = 0; i < enemies.length; i++) enemies[i].y += ENEMY_DROP_PX;
            }
        }

        // Enemy shooting
        enemyShootTick += delta;
        const shootInterval = Math.max(400, 1400 - wave * 100);
        if (enemyShootTick >= shootInterval) {
            enemyShootTick = 0;
            enemyShoot();
        }

        // Enemy bullets
        for (let i = enemyBullets.length - 1; i >= 0; i--) {
            const b = enemyBullets[i];
            b.y += b.vy;
            if (b.y > canvas.height) { enemyBullets.splice(i, 1); continue; }

            // vs player
            if (rectsOverlap(b, player)) {
                createExplosion(player.x + player.w / 2, player.y + player.h / 2, '#ff3d5c');
                if (window.EspooClicker) window.EspooClicker.playSound('sound-space-boom');
                enemyBullets.splice(i, 1);
                lives--;
                if (window.arcadeSfx) window.arcadeSfx.die();
                updateUI();
                if (lives <= 0) { gameOver(); return; }
                player.x = canvas.width / 2 - PLAYER_W / 2;
                continue;
            }

            // vs bunkers
            let hitB = false;
            for (let j = 0; j < bunkers.length; j++) {
                if (rectsOverlap(b, bunkers[j]) && bunkers[j].hp > 0) {
                    bunkers[j].hp--;
                    enemyBullets.splice(i, 1);
                    createExplosion(b.x, b.y, '#888');
                    hitB = true;
                    break;
                }
            }
        }

        // Enemy reach floor → game over
        for (let i = 0; i < enemies.length; i++) {
            if (enemies[i].y + enemies[i].h >= player.y) {
                gameOver();
                return;
            }
        }

        // Wave clear
        if (enemies.length === 0) {
            wave++;
            score += 50;
            if (window.arcadeSfx) window.arcadeSfx.levelup();
            spawnWave();
            // partial bunker restore (every 3 waves)
            if (wave % 3 === 0) spawnBunkers();
            updateUI();
        }

        // Particles
        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].x += particles[i].xv;
            particles[i].y += particles[i].yv;
            particles[i].life--;
            if (particles[i].life <= 0) particles.splice(i, 1);
        }
    }

    function drawStaticScreen() {
        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // stars
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        for (let i = 0; i < 40; i++) {
            const x = (i * 37 + 19) % canvas.width;
            const y = (i * 89 + 11) % canvas.height;
            ctx.fillRect(x, y, 1, 1);
        }
    }

    function draw() {
        // bg
        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // stars (subtle parallax)
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        for (let i = 0; i < 40; i++) {
            const x = (i * 37 + 19) % canvas.width;
            const y = (i * 89 + 11) % canvas.height;
            ctx.fillRect(x, y, 1, 1);
        }

        // ground line
        ctx.strokeStyle = '#2ecc71';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height - 10);
        ctx.lineTo(canvas.width, canvas.height - 10);
        ctx.stroke();

        // player
        drawPlayer(player.x, player.y);

        // bunkers
        for (const b of bunkers) {
            if (b.hp <= 0) continue;
            const alpha = Math.max(0.25, b.hp / 16);
            ctx.fillStyle = `rgba(46, 204, 113, ${alpha})`;
            // dome shape
            ctx.fillRect(b.x, b.y + 6, b.w, b.h - 6);
            ctx.fillRect(b.x + 6, b.y, b.w - 12, 8);
            // notch under
            ctx.fillStyle = '#050505';
            ctx.fillRect(b.x + b.w / 2 - 10, b.y + b.h - 10, 20, 12);
        }

        // enemies (3 tiers different look)
        for (const e of enemies) {
            drawEnemy(e);
        }

        // bullets
        ctx.fillStyle = '#fff';
        for (const b of bullets) ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.fillStyle = '#ff3d5c';
        for (const b of enemyBullets) ctx.fillRect(b.x, b.y, b.w, b.h);

        // particles
        for (const p of particles) {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = Math.max(0, p.life / 30);
            ctx.fillRect(p.x, p.y, 3, 3);
        }
        ctx.globalAlpha = 1;
    }

    function drawPlayer(x, y) {
        ctx.fillStyle = '#00d9ff';
        // base
        ctx.fillRect(x, y + 8, PLAYER_W, 8);
        // turret
        ctx.fillRect(x + PLAYER_W / 2 - 3, y, 6, 10);
        ctx.fillRect(x + 4, y + 4, PLAYER_W - 8, 6);
    }

    function drawEnemy(e) {
        const f = e.frame;
        let color;
        if (e.tier === 3) color = '#a855f7';      // top row purple
        else if (e.tier === 2) color = '#10b981'; // mid green
        else color = '#fbbf24';                    // bottom yellow

        ctx.fillStyle = color;
        const cx = e.x + e.w / 2;
        // body
        ctx.fillRect(e.x + 4, e.y + 4, e.w - 8, e.h - 8);
        // head/horns
        ctx.fillRect(e.x + 6, e.y, 4, 4);
        ctx.fillRect(e.x + e.w - 10, e.y, 4, 4);
        // legs (animated)
        if (f === 0) {
            ctx.fillRect(e.x, e.y + e.h - 4, 4, 4);
            ctx.fillRect(e.x + e.w - 4, e.y + e.h - 4, 4, 4);
        } else {
            ctx.fillRect(e.x + 4, e.y + e.h - 4, 4, 4);
            ctx.fillRect(e.x + e.w - 8, e.y + e.h - 4, 4, 4);
        }
        // eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(e.x + 8, e.y + 8, 3, 3);
        ctx.fillRect(e.x + e.w - 11, e.y + 8, 3, 3);
    }

    function updateUI() {
        const el = document.getElementById('invaders-score-ui');
        const gs = window.EspooClicker ? window.EspooClicker.getGameState() : null;
        const highScore = (gs && gs.arcadeHighScores && gs.arcadeHighScores.invaders) ? gs.arcadeHighScores.invaders : 0;
        if (el) {
            el.innerHTML = `
                <span class="stat">PUNTI: <span class="val-score">${score}</span></span>
                <span class="stat">VITE: <span class="val-hp" style="color:#ff3d5c">${lives}</span></span>
                <span class="stat">WAVE: <span class="val-wave" style="color:#2ecc71">${wave}</span></span>
                <span class="stat">RECORD: <span class="val-record">${Math.max(score, highScore)}</span></span>
            `;
        }
    }

    function gameOver() {
        if (!isRunning) return; // guard rientranza: niente reward/record doppi
        isRunning = false;
        if (rafId) cancelAnimationFrame(rafId);
        if (window.EspooClicker) window.EspooClicker.playSound('sound-arcade-gameover');
        if (window.arcadeSfx) window.arcadeSfx.gameover();

        let reward = (typeof Decimal !== 'undefined') ? new Decimal(0) : 0;
        if (typeof bps !== 'undefined' && typeof Decimal !== 'undefined') {
            const bpsVal = (bps && bps.gt(0)) ? bps : new Decimal(1);
            reward = bpsVal.mul(score).mul(0.04);
        }

        let isNewRecord = false;
        if (window.EspooClicker) {
            const gs = window.EspooClicker.getGameState();
            if (score > 0) gs.score = gs.score.add(reward);
            if (!gs.arcadeHighScores) gs.arcadeHighScores = {};
            if (score > (gs.arcadeHighScores.invaders || 0)) {
                gs.arcadeHighScores.invaders = score;
                isNewRecord = true;
            }
            window.EspooClicker.saveGame();
        }

        // Game Over animato condiviso (stile Snake)
        window.showArcadeGameOver({
            overlay: document.getElementById('invaders-overlay'),
            score: score,
            rewardStr: (window.EspooClicker && score > 0) ? window.EspooClicker.formatNumber(reward) : null,
            isNewRecord: isNewRecord,
            statLabel: 'ONDATE', statValue: wave, statColor: '#2ecc71',
            onReturn: window.exitInvadersGame,
            onRetry: window.startInvadersRun
        });
    }
})();
