// arcade/centipede/js/centipede.js — Centipede (Bug Crawler edition)
(function () {
    let canvas, ctx;
    let rafId = null;
    let isRunning = false;
    let lastTime = 0;
    const FPS = 60;

    // Grid (mushrooms snap to cells)
    const CELL = 20;
    let cols, rows;
    let playerZoneRows = 5; // bottom N rows where player can move

    // Entità
    let player;
    let bullets;
    let mushrooms; // 2D grid: { hp, x, y }
    let centipede; // array of segments {x, y, dir(1/-1), pendingDown, isHead}
    let spider;    // optional roaming enemy
    let particles;
    let score, lives, wave;

    // Input
    const keys = { ArrowLeft: false, ArrowRight: false, ArrowUp: false, ArrowDown: false, Space: false };

    // Tuning
    const PLAYER_SPEED = 3;
    const BULLET_SPEED = 9;
    const CENTI_SPEED = 1.5;     // px per frame at base
    const SPIDER_SPEED = 1.8;
    const MUSH_HP = 4;

    function init() {
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
    }

    function handleKeyDown(e) {
        if (!isRunning) return;
        if (e.code === 'ArrowLeft') keys.ArrowLeft = true;
        if (e.code === 'ArrowRight') keys.ArrowRight = true;
        if (e.code === 'ArrowUp') keys.ArrowUp = true;
        if (e.code === 'ArrowDown') keys.ArrowDown = true;
        if (e.code === 'Space') {
            if (!keys.Space) shoot();
            keys.Space = true;
        }
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
    }

    function handleKeyUp(e) {
        if (e.code === 'ArrowLeft') keys.ArrowLeft = false;
        if (e.code === 'ArrowRight') keys.ArrowRight = false;
        if (e.code === 'ArrowUp') keys.ArrowUp = false;
        if (e.code === 'ArrowDown') keys.ArrowDown = false;
        if (e.code === 'Space') keys.Space = false;
    }

    window.startCentipedeGame = function () {
        const selector = document.getElementById('arcade-game-selector');
        const gameContainer = document.getElementById('arcade-active-game-container');
        if (selector) selector.style.display = 'none';
        if (!gameContainer) return;

        gameContainer.style.display = 'flex';
        gameContainer.style.flexDirection = 'column';
        gameContainer.style.alignItems = 'center';
        gameContainer.innerHTML = '';

        const gs = window.EspooClicker ? window.EspooClicker.getGameState() : null;
        const highScore = (gs && gs.arcadeHighScores && gs.arcadeHighScores.centipede) ? gs.arcadeHighScores.centipede : 0;

        const headerDiv = document.createElement('div');
        headerDiv.className = 'arcade-game-topbar';
        headerDiv.innerHTML = `
            <button class="arcade-btn secondary" onclick="window.exitCentipedeGame()">
                <i class="fa-solid fa-arrow-left"></i> MENU
            </button>
            <span class="topbar-game-label" style="color:#f472b6">BUG CRAWLER</span>
            <div class="arcade-stats-box" id="centipede-score-ui">
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
        canvas.id = 'centipede-canvas';
        const maxWidth = Math.min(880, window.innerWidth - 60);
        canvas.width = Math.floor(maxWidth / CELL) * CELL;
        canvas.height = 640;
        ctx = canvas.getContext('2d');

        cols = Math.floor(canvas.width / CELL);
        rows = Math.floor(canvas.height / CELL);

        canvasWrapper.appendChild(canvas);

        const overlay = document.createElement('div');
        overlay.id = 'centipede-overlay';
        overlay.className = 'arcade-ui-overlay';
        overlay.innerHTML = `
            <div style="color:#f472b6; font-family:'Rajdhani'; font-size:2.5rem; margin-bottom:10px; font-weight:900; letter-spacing:3px; text-shadow: 0 0 15px #f472b6;">
                BUG CRAWLER
            </div>
            <div style="color:#bdc3c7; margin-bottom:20px; font-family:monospace; font-size: 0.9rem;">
                Frecce per muoverti<br>SPAZIO per sparare<br>Distruggi il centopiedi prima che ti raggiunga!
            </div>
            <button class="arcade-btn" onclick="window.startCentipedeRun()">AVVIA CACCIA</button>
        `;
        canvasWrapper.appendChild(overlay);
        gameContainer.appendChild(canvasWrapper);

        if (!window.centipedeInitialized) {
            init();
            window.centipedeInitialized = true;
        }
        drawStaticScreen();
    };

    window.exitCentipedeGame = function () {
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

    window.startCentipedeRun = function () {
        const overlay = document.getElementById('centipede-overlay');
        if (overlay) overlay.style.display = 'none';

        // Reset scalari PRIMA della generazione funghi: mushCount usa 'wave',
        // che altrimenti alla prima partita sarebbe undefined -> mushCount NaN -> 0 funghi.
        score = 0;
        lives = 3;
        wave = 1;
        spider = null;

        // grid init
        mushrooms = [];
        for (let r = 0; r < rows; r++) {
            mushrooms[r] = [];
            for (let c = 0; c < cols; c++) mushrooms[r][c] = null;
        }
        // sprinkle starting mushrooms (avoid player zone)
        const mushCount = 25 + wave * 2;
        for (let i = 0; i < mushCount; i++) {
            const r = Math.floor(Math.random() * (rows - playerZoneRows));
            const c = Math.floor(Math.random() * cols);
            if (!mushrooms[r][c]) mushrooms[r][c] = { hp: MUSH_HP };
        }

        // player
        player = {
            x: canvas.width / 2,
            y: canvas.height - CELL * 2,
            w: CELL - 4,
            h: CELL - 4,
            cooldown: 0,
            invuln: 0
        };

        bullets = [];
        particles = [];
        spawnCentipede();
        updateUI();

        keys.ArrowLeft = false;
        keys.ArrowRight = false;
        keys.ArrowUp = false;
        keys.ArrowDown = false;
        keys.Space = false;

        if (window.EspooClicker) window.EspooClicker.playSound('sound-arcade-start');

        isRunning = true;
        lastTime = performance.now();
        rafId = requestAnimationFrame(gameLoop);
    };

    function spawnCentipede() {
        centipede = [];
        const len = 10 + Math.min(wave * 2, 12);
        for (let i = 0; i < len; i++) {
            centipede.push({
                x: (cols - 1 - i) * CELL,
                y: 0,
                dir: -1,         // moving left
                pendingDown: false,
                isHead: i === 0,
                speed: CENTI_SPEED + wave * 0.1
            });
        }
    }

    function maybeSpawnSpider() {
        if (spider || Math.random() > 0.005) return;
        const fromLeft = Math.random() < 0.5;
        spider = {
            x: fromLeft ? -CELL : canvas.width,
            y: canvas.height - CELL * (3 + Math.random() * 3),
            vx: fromLeft ? SPIDER_SPEED : -SPIDER_SPEED,
            vy: 0,
            zigzagTick: 0
        };
    }

    function shoot() {
        if (player.cooldown > 0) return;
        if (bullets.length >= 4) return;
        bullets.push({
            x: player.x + player.w / 2 - 2,
            y: player.y,
            w: 4,
            h: 10,
            vy: -BULLET_SPEED
        });
        player.cooldown = 8;
        if (window.EspooClicker) window.EspooClicker.playSound('sound-space-shoot');
        if (window.arcadeSfx) window.arcadeSfx.shoot();
    }

    function createExplosion(x, y, color) {
        for (let i = 0; i < 12; i++) {
            particles.push({
                x, y,
                xv: (Math.random() - 0.5) * 5,
                yv: (Math.random() - 0.5) * 5,
                life: Math.random() * 25 + 10,
                color
            });
        }
    }

    function rectsOverlap(a, b) {
        return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    }

    function cellAt(x, y) {
        const c = Math.floor(x / CELL);
        const r = Math.floor(y / CELL);
        if (r < 0 || r >= rows || c < 0 || c >= cols) return null;
        return { r, c };
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
        if (player.invuln > 0) player.invuln--;

        // Player movement (4 directions but restricted vertically)
        if (keys.ArrowLeft) player.x -= PLAYER_SPEED;
        if (keys.ArrowRight) player.x += PLAYER_SPEED;
        if (keys.ArrowUp) player.y -= PLAYER_SPEED;
        if (keys.ArrowDown) player.y += PLAYER_SPEED;
        const minY = canvas.height - playerZoneRows * CELL;
        if (player.x < 4) player.x = 4;
        if (player.x + player.w > canvas.width - 4) player.x = canvas.width - 4 - player.w;
        if (player.y < minY) player.y = minY;
        if (player.y + player.h > canvas.height - 4) player.y = canvas.height - 4 - player.h;

        // Block player by mushrooms (gentle push-back)
        const playerCell = cellAt(player.x + player.w / 2, player.y + player.h / 2);
        if (playerCell && mushrooms[playerCell.r] && mushrooms[playerCell.r][playerCell.c]) {
            // push out in last move dir (simple: bounce back)
            if (keys.ArrowLeft) player.x += PLAYER_SPEED;
            if (keys.ArrowRight) player.x -= PLAYER_SPEED;
            if (keys.ArrowUp) player.y += PLAYER_SPEED;
            if (keys.ArrowDown) player.y -= PLAYER_SPEED;
        }

        // Bullets
        for (let i = bullets.length - 1; i >= 0; i--) {
            const b = bullets[i];
            b.y += b.vy;
            if (b.y < -b.h) { bullets.splice(i, 1); continue; }

            // vs mushrooms
            const cellM = cellAt(b.x + b.w / 2, b.y);
            if (cellM && mushrooms[cellM.r] && mushrooms[cellM.r][cellM.c]) {
                mushrooms[cellM.r][cellM.c].hp--;
                bullets.splice(i, 1);
                createExplosion(cellM.c * CELL + CELL / 2, cellM.r * CELL + CELL / 2, '#f472b6');
                if (mushrooms[cellM.r][cellM.c].hp <= 0) {
                    mushrooms[cellM.r][cellM.c] = null;
                    score += 1;
                    updateUI();
                }
                continue;
            }

            // vs centipede
            let hit = false;
            for (let k = 0; k < centipede.length; k++) {
                const seg = centipede[k];
                const segBox = { x: seg.x + 2, y: seg.y + 2, w: CELL - 4, h: CELL - 4 };
                if (rectsOverlap(b, segBox)) {
                    score += seg.isHead ? 100 : 10;
                    createExplosion(seg.x + CELL / 2, seg.y + CELL / 2, '#a855f7');
                    if (window.EspooClicker) window.EspooClicker.playSound('sound-space-boom');
                    if (window.arcadeSfx) window.arcadeSfx.hit();
                    // Drop mushroom where killed
                    const mc = cellAt(seg.x + CELL / 2, seg.y + CELL / 2);
                    if (mc && mushrooms[mc.r] && !mushrooms[mc.r][mc.c]) mushrooms[mc.r][mc.c] = { hp: MUSH_HP };
                    // Split: segment k becomes new head of right half
                    centipede.splice(k, 1);
                    if (centipede[k]) centipede[k].isHead = true;
                    bullets.splice(i, 1);
                    hit = true;
                    updateUI();
                    break;
                }
            }
            if (hit) continue;

            // vs spider
            if (spider) {
                const sBox = { x: spider.x, y: spider.y, w: CELL, h: CELL };
                if (rectsOverlap(b, sBox)) {
                    score += 300;
                    createExplosion(spider.x + CELL / 2, spider.y + CELL / 2, '#fbbf24');
                    if (window.EspooClicker) window.EspooClicker.playSound('sound-space-boom');
                    if (window.arcadeSfx) window.arcadeSfx.explode();
                    spider = null;
                    bullets.splice(i, 1);
                    updateUI();
                    continue;
                }
            }
        }

        // Centipede movement
        for (let i = 0; i < centipede.length; i++) {
            const seg = centipede[i];
            if (seg.pendingDown) {
                seg.y += CELL;
                seg.dir *= -1;
                seg.pendingDown = false;
                continue;
            }
            seg.x += seg.dir * seg.speed;
            // wall / mushroom hit
            const ahead = cellAt(seg.x + (seg.dir > 0 ? CELL : 0), seg.y + CELL / 2);
            const wallHit = seg.x < 0 || seg.x + CELL > canvas.width;
            const mushHit = ahead && mushrooms[ahead.r] && mushrooms[ahead.r][ahead.c];
            if (wallHit || mushHit) {
                // snap x to cell edge
                if (seg.x < 0) seg.x = 0;
                if (seg.x + CELL > canvas.width) seg.x = canvas.width - CELL;
                seg.pendingDown = true;
            }
            // reach bottom → bounce up
            if (seg.y > canvas.height - CELL * 2) {
                seg.y = canvas.height - CELL * 2;
                seg.pendingDown = false;
                seg.dir *= -1;
            }
            // collide with player (salta se invulnerabile dopo un hit recente)
            const segBox = { x: seg.x + 2, y: seg.y + 2, w: CELL - 4, h: CELL - 4 };
            if (player.invuln <= 0 && rectsOverlap(player, segBox)) {
                lives--;
                createExplosion(player.x + player.w / 2, player.y + player.h / 2, '#ff3d5c');
                if (window.EspooClicker) window.EspooClicker.playSound('sound-arcade-gameover');
                if (window.arcadeSfx) window.arcadeSfx.die();
                updateUI();
                if (lives <= 0) { gameOver(); return; }
                player.x = canvas.width / 2;
                player.y = canvas.height - CELL * 2;
                player.invuln = 90; // ~1.5s di grazia: niente vite multiple nello stesso punto
                break;              // esci dal loop segmenti: una sola vita persa per frame
            }
        }

        // Spider
        maybeSpawnSpider();
        if (spider) {
            spider.zigzagTick += delta;
            if (spider.zigzagTick > 300) {
                spider.zigzagTick = 0;
                spider.vy = (Math.random() - 0.5) * SPIDER_SPEED * 2;
            }
            spider.x += spider.vx;
            spider.y += spider.vy;
            // clamp vertical
            const minSy = canvas.height - playerZoneRows * CELL - CELL;
            if (spider.y < minSy) spider.y = minSy;
            if (spider.y > canvas.height - CELL * 2) spider.y = canvas.height - CELL * 2;
            // Eats mushrooms in path
            const sc = cellAt(spider.x + CELL / 2, spider.y + CELL / 2);
            if (sc && mushrooms[sc.r] && mushrooms[sc.r][sc.c]) {
                mushrooms[sc.r][sc.c] = null;
            }
            // Vs player
            if (player.invuln <= 0 && rectsOverlap(player, { x: spider.x, y: spider.y, w: CELL, h: CELL })) {
                lives--;
                createExplosion(player.x + player.w / 2, player.y + player.h / 2, '#ff3d5c');
                if (window.arcadeSfx) window.arcadeSfx.die();
                spider = null;
                updateUI();
                if (lives <= 0) { gameOver(); return; }
                player.x = canvas.width / 2;
                player.y = canvas.height - CELL * 2;
                player.invuln = 90;
            }
            // Off-screen (verify spider still exists dopo collision check)
            if (spider && (spider.x < -CELL * 2 || spider.x > canvas.width + CELL * 2)) spider = null;
        }

        // Wave clear
        if (centipede.length === 0) {
            wave++;
            score += 100;
            if (window.arcadeSfx) window.arcadeSfx.levelup();
            spawnCentipede();
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
    }

    function draw() {
        ctx.fillStyle = '#0a0a14';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // player zone tint
        ctx.fillStyle = 'rgba(244, 114, 182, 0.04)';
        ctx.fillRect(0, canvas.height - playerZoneRows * CELL, canvas.width, playerZoneRows * CELL);

        // mushrooms
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const m = mushrooms[r][c];
                if (!m) continue;
                drawMushroom(c * CELL, r * CELL, m.hp);
            }
        }

        // centipede
        for (let i = 0; i < centipede.length; i++) drawCentiSegment(centipede[i]);

        // spider
        if (spider) drawSpider(spider.x, spider.y);

        // player
        drawPlayer(player.x, player.y);

        // bullets
        ctx.fillStyle = '#fff';
        for (const b of bullets) ctx.fillRect(b.x, b.y, b.w, b.h);

        // particles
        for (const p of particles) {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = Math.max(0, p.life / 30);
            ctx.fillRect(p.x, p.y, 3, 3);
        }
        ctx.globalAlpha = 1;
    }

    function drawMushroom(x, y, hp) {
        const alpha = 0.35 + (hp / MUSH_HP) * 0.65;
        ctx.fillStyle = `rgba(244, 114, 182, ${alpha})`;
        // cap
        ctx.fillRect(x + 3, y + 4, CELL - 6, 8);
        ctx.fillRect(x + 5, y + 2, CELL - 10, 2);
        // stem
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
        ctx.fillRect(x + CELL / 2 - 2, y + 12, 4, CELL - 14);
    }

    function drawCentiSegment(seg) {
        ctx.fillStyle = seg.isHead ? '#fbbf24' : '#a855f7';
        ctx.fillRect(seg.x + 2, seg.y + 2, CELL - 4, CELL - 4);
        // antennae for head
        if (seg.isHead) {
            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(seg.x + 5, seg.y - 3, 2, 4);
            ctx.fillRect(seg.x + CELL - 7, seg.y - 3, 2, 4);
        }
        // legs
        ctx.fillStyle = '#000';
        ctx.fillRect(seg.x + 1, seg.y + CELL / 2 - 1, 2, 2);
        ctx.fillRect(seg.x + CELL - 3, seg.y + CELL / 2 - 1, 2, 2);
    }

    function drawSpider(x, y) {
        ctx.fillStyle = '#10b981';
        ctx.fillRect(x + 4, y + 6, CELL - 8, CELL - 12);
        // legs
        ctx.fillStyle = '#10b981';
        ctx.fillRect(x, y + 8, 4, 2);
        ctx.fillRect(x + CELL - 4, y + 8, 4, 2);
        ctx.fillRect(x, y + CELL - 10, 4, 2);
        ctx.fillRect(x + CELL - 4, y + CELL - 10, 4, 2);
        // eyes
        ctx.fillStyle = '#ff3d5c';
        ctx.fillRect(x + 6, y + 8, 2, 2);
        ctx.fillRect(x + CELL - 8, y + 8, 2, 2);
    }

    function drawPlayer(x, y) {
        ctx.fillStyle = '#00d9ff';
        // ship body
        ctx.fillRect(x, y + 6, player.w, player.h - 6);
        ctx.fillRect(x + player.w / 2 - 3, y, 6, 8);
        // wing tips
        ctx.fillRect(x - 2, y + player.h - 4, 4, 4);
        ctx.fillRect(x + player.w - 2, y + player.h - 4, 4, 4);
    }

    function updateUI() {
        const el = document.getElementById('centipede-score-ui');
        const gs = window.EspooClicker ? window.EspooClicker.getGameState() : null;
        const highScore = (gs && gs.arcadeHighScores && gs.arcadeHighScores.centipede) ? gs.arcadeHighScores.centipede : 0;
        if (el) {
            el.innerHTML = `
                <span class="stat">PUNTI: <span class="val-score">${score}</span></span>
                <span class="stat">VITE: <span class="val-hp" style="color:#ff3d5c">${lives}</span></span>
                <span class="stat">WAVE: <span class="val-wave" style="color:#f472b6">${wave}</span></span>
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
            reward = bpsVal.mul(score).mul(0.05);
        }

        let isNewRecord = false;
        if (window.EspooClicker) {
            const gs = window.EspooClicker.getGameState();
            if (score > 0) gs.score = gs.score.add(reward);
            if (!gs.arcadeHighScores) gs.arcadeHighScores = {};
            if (score > (gs.arcadeHighScores.centipede || 0)) {
                gs.arcadeHighScores.centipede = score;
                isNewRecord = true;
            }
            window.EspooClicker.saveGame();
        }

        // Game Over animato condiviso (stile Snake)
        window.showArcadeGameOver({
            overlay: document.getElementById('centipede-overlay'),
            score: score,
            rewardStr: (window.EspooClicker && score > 0) ? window.EspooClicker.formatNumber(reward) : null,
            isNewRecord: isNewRecord,
            statLabel: 'WAVE', statValue: wave, statColor: '#f472b6',
            onReturn: window.exitCentipedeGame,
            onRetry: window.startCentipedeRun
        });
    }
})();
