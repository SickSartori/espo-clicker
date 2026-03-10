// code/arcade/super-espo/js/super-espo.js

(function () {
    let canvas, ctx;
    let gameInterval;
    let isRunning = false;

    const FPS = 60;
    const GRAVITY = 0.5;
    const JUMP_FORCE = -10.5;
    const BASE_SPEED = 3.2;
    const MAX_SPEED = 6;
    const TILE_SIZE = 40;

    let speed = BASE_SPEED;
    let cameraX = 0;
    let score = 0;
    let gameScore = 0;

    let keys = { ArrowLeft: false, ArrowRight: false, Space: false };
    let spaceReleased = true;

    // FIX: Aggiunto "facing" per ribaltare lo sprite
    let player = {
        x: 100, y: 100, width: 32, height: 32,
        vx: 0, vy: 0,
        isGrounded: false,
        scaleX: 1, scaleY: 1, rotation: 0, walkCycle: 0,
        facing: 1
    };

    let platforms = [];
    let enemies = [];
    let rewardBlocks = [];
    let particles = [];
    let deadlyTraps = [];

    // FIX: Caricamento dei nuovi sprite specifici
    const imgStop = new Image(); imgStop.src = 'assets/super-espo-stop.png';
    const imgRun = new Image(); imgRun.src = 'assets/super-espo-run.png';
    const imgJump = new Image(); imgJump.src = 'assets/super-espo-jump.png';

    const imgBlock = new Image(); imgBlock.src = 'assets/image/super-block.webp';
    const imgBrick = new Image(); imgBrick.src = 'assets/image/super-brick.webp';

    function handleKeyDown(e) {
        if (!isRunning) return;
        if (e.code === 'ArrowLeft') keys.ArrowLeft = true;
        if (e.code === 'ArrowRight') keys.ArrowRight = true;
        if (e.code === 'Space') {
            keys.Space = true;
            if (player.isGrounded && spaceReleased) {
                player.vy = JUMP_FORCE;
                player.isGrounded = false;
                spaceReleased = false;
                player.scaleX = 0.7;
                player.scaleY = 1.3;
                if (window.EspooClicker) window.EspooClicker.playSound('sound-jump');
            }
        }
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    }

    function handleKeyUp(e) {
        if (e.code === 'ArrowLeft') keys.ArrowLeft = false;
        if (e.code === 'ArrowRight') keys.ArrowRight = false;
        if (e.code === 'Space') {
            keys.Space = false;
            spaceReleased = true;
        }
    }

    window.startSuperEspoGame = function () {
        const selector = document.getElementById('arcade-game-selector');
        const gameContainer = document.getElementById('arcade-active-game-container');

        if (selector) selector.style.display = 'none';

        if (gameContainer) {
            gameContainer.style.display = 'flex';
            gameContainer.style.flexDirection = 'column';
            gameContainer.style.alignItems = 'center';
            gameContainer.innerHTML = '';
        } else return;

        const gs = window.EspooClicker ? window.EspooClicker.getGameState() : null;
        const highScore = (gs && gs.arcadeHighScores && gs.arcadeHighScores.superespo) ? gs.arcadeHighScores.superespo : 0;

        const headerDiv = document.createElement('div');
        headerDiv.className = 'arcade-game-topbar';
        headerDiv.innerHTML = `
            <button class="arcade-btn secondary" onclick="window.exitSuperEspoGame()">
                <i class="fa-solid fa-arrow-left"></i> MENU
            </button>
            <div class="arcade-stats-box" id="super-espo-score-ui">
                <span class="stat">SCORE: <span class="val-score">0</span></span>
                <span class="stat">RECORD: <span class="val-record">${highScore}</span></span>
            </div>
        `;
        gameContainer.appendChild(headerDiv);

        const canvasWrapper = document.createElement('div');
        canvasWrapper.style.position = 'relative';
        canvasWrapper.className = 'crt-turn-on crt-effect';

        canvas = document.createElement('canvas');
        canvas.id = 'super-espo-canvas';
        canvas.width = Math.min(800, window.innerWidth - 40);
        canvas.height = 400;
        canvas.style.imageRendering = 'pixelated';
        ctx = canvas.getContext('2d');
        canvasWrapper.appendChild(canvas);

        const overlay = document.createElement('div');
        overlay.id = 'super-espo-overlay';
        overlay.className = 'arcade-ui-overlay';
        overlay.innerHTML = `
            <div style="color:#9b59b6; font-family:'Rajdhani'; font-size:2.5rem; margin-bottom:10px; font-weight:900; text-shadow: 0 0 15px #9b59b6;">SUPER ESPÒ</div>
            <div style="color:#fff; margin-bottom:20px; font-family:monospace;">Frecce per muoverti, SPAZIO per saltare.<br>Colpisci i blocchi gialli da sotto. Evita i Bug.</div>
            <button class="arcade-btn" onclick="window.startSuperEspoRun()" style="background:#9b59b6; color:#fff; border-color:#8e44ad;">AVVIA PARTITA</button>
        `;
        canvasWrapper.appendChild(overlay);
        gameContainer.appendChild(canvasWrapper);

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);

        drawStaticScreen();
    };

    window.exitSuperEspoGame = function () {
        isRunning = false;
        cancelAnimationFrame(gameInterval);
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('keyup', handleKeyUp);

        const selector = document.getElementById('arcade-game-selector');
        const gameContainer = document.getElementById('arcade-active-game-container');
        if (gameContainer) { gameContainer.innerHTML = ''; gameContainer.style.display = 'none'; }
        if (selector) selector.style.display = 'flex';
        if (window.EspooClicker) window.EspooClicker.playSound('sound-click');
    };

    window.startSuperEspoRun = function () {
        document.getElementById('super-espo-overlay').style.display = 'none';

        player = { x: 100, y: 100, width: 32, height: 32, vx: 0, vy: 0, isGrounded: false, scaleX: 1, scaleY: 1, rotation: 0, walkCycle: 0, facing: 1 };
        cameraX = 0;
        score = 0;
        speed = BASE_SPEED;
        spaceReleased = true;

        platforms = [{ x: 0, y: 300, w: 1000, h: 400 }];
        enemies = [];
        rewardBlocks = [];
        particles = [];
        deadlyTraps = [];

        isRunning = true;
        lastTime = performance.now();
        gameInterval = requestAnimationFrame(gameLoop);
    };

    function spawnChunk() {
        let lastP = platforms[platforms.length - 1];

        let gap = Math.random() * 80 + 40;
        let width = Math.random() * 250 + 150;

        let yChange = (Math.random() - 0.5) * 80;
        let newY = lastP.y + yChange;

        if (newY < 150) newY = 150;
        if (newY > 360) newY = 360;

        let newX = lastP.x + lastP.w + gap;

        platforms.push({ x: newX, y: newY, w: width, h: 400 });

        if (Math.random() > 0.5) {
            let blockX = newX + width / 2 - 20;
            let blockY = newY - 100 - Math.random() * 20;
            rewardBlocks.push({ x: blockX, y: blockY, w: 40, h: 40, used: false, popY: 0 });
        }

        if (Math.random() > 0.4) {
            enemies.push({ x: newX + width / 2, y: newY - 24, w: 32, h: 24, vx: 1.5, startX: newX, range: width });
        }

        if (Math.random() > 0.85) {
            enemies.push({ x: newX + 20, y: -50, w: 32, h: 24, vx: 0, vy: 3, isTroll: true });
        }

        if (Math.random() > 0.8) {
            deadlyTraps.push({ x: newX + width - 40, y: newY, w: 30, h: 30, active: false });
        }
    }

    let lastTime = 0;
    function gameLoop(time) {
        if (!isRunning) return;
        gameInterval = requestAnimationFrame(gameLoop);

        const delta = time - lastTime;
        if (delta < 1000 / FPS) return;
        lastTime = time - (delta % (1000 / FPS));

        update();
        draw();
    }

    function checkCollision(r1, r2) {
        return r1.x < r2.x + r2.w &&
            r1.x + r1.width > r2.x &&
            r1.y < r2.y + r2.h &&
            r1.y + r1.height > r2.y;
    }

    function update() {
        cameraX += speed;
        if (speed < MAX_SPEED) speed += 0.0002;

        gameScore = Math.floor(cameraX / 50) + score;
        updateUI();

        player.scaleX += (1 - player.scaleX) * 0.1;
        player.scaleY += (1 - player.scaleY) * 0.1;

        player.vx = 0;
        if (keys.ArrowLeft) {
            player.vx = -4;
            player.rotation = -0.1;
            player.walkCycle += 0.2;
            player.facing = -1; // FIX: Aggiorna direzione sx
        } else if (keys.ArrowRight) {
            player.vx = 4;
            player.rotation = 0.1;
            player.walkCycle += 0.2;
            player.facing = 1; // FIX: Aggiorna direzione dx
        } else {
            player.rotation = 0;
            player.walkCycle = 0;
        }

        if (!player.isGrounded) player.rotation = 0;

        player.x += player.vx;

        let allSolids = [...platforms, ...rewardBlocks.map(b => ({ ...b, width: b.w, height: b.h }))];

        for (let p of allSolids) {
            let px = p.x - cameraX;
            let solidBox = { x: px, y: p.y, w: p.w || p.width, h: p.h || p.height };

            if (checkCollision(player, solidBox)) {
                if (player.vx > 0) player.x = solidBox.x - player.width;
                else if (player.vx < 0) player.x = solidBox.x + solidBox.w;
            }
        }

        if (player.x < -player.width) die();
        if (player.x > canvas.width - player.width) player.x = canvas.width - player.width;

        player.vy += GRAVITY;
        if (player.vy > 12) player.vy = 12;
        player.y += player.vy;
        player.isGrounded = false;

        for (let p of platforms) {
            let px = p.x - cameraX;
            let solidBox = { x: px, y: p.y, w: p.w, h: p.h };

            if (checkCollision(player, solidBox)) {
                if (player.vy > 0) {
                    player.y = solidBox.y - player.height;
                    player.vy = 0;
                    player.isGrounded = true;
                    if (player.scaleX < 1.1) {
                        player.scaleX = 1.3;
                        player.scaleY = 0.7;
                    }
                } else if (player.vy < 0) {
                    player.y = solidBox.y + solidBox.h;
                    player.vy = 0;
                }
            }
        }

        for (let b of rewardBlocks) {
            let bx = b.x - cameraX;
            let solidBox = { x: bx, y: b.y, w: b.w, h: b.h };

            if (checkCollision(player, solidBox)) {
                if (player.vy > 0) {
                    player.y = solidBox.y - player.height;
                    player.vy = 0;
                    player.isGrounded = true;
                } else if (player.vy < 0) {
                    player.y = solidBox.y + solidBox.h;
                    player.vy = 0;

                    if (!b.used) {
                        b.used = true;
                        b.popY = -10;
                        score += 100;
                        particles.push({ x: bx + 20, y: b.y, vy: -5, life: 1, text: '+100' });
                        if (window.EspooClicker) window.EspooClicker.playSound('sound-click');
                    }
                }
            }
            if (b.popY < 0) b.popY += 1;
        }

        for (let trap of deadlyTraps) {
            let tx = trap.x - cameraX;
            if (player.x < tx + 80 && player.x + player.width > tx - 80) trap.active = true;

            if (trap.active) {
                if (player.x < tx + trap.w - 5 && player.x + player.width > tx + 5 &&
                    player.y + player.height > trap.y - trap.h) {
                    die();
                }
            }
        }

        for (let i = enemies.length - 1; i >= 0; i--) {
            let e = enemies[i];

            if (e.isTroll) {
                e.y += e.vy;
            } else {
                e.x -= e.vx;
                if (e.x < e.startX || e.x > e.startX + e.range - e.w) e.vx *= -1;
            }

            let ex = e.x - cameraX;
            if (ex + e.w < -100 || e.y > canvas.height + 100) { enemies.splice(i, 1); continue; }

            let enemyBox = { x: ex + 4, y: e.y + 4, w: e.w - 8, h: e.h - 8 };

            if (checkCollision(player, enemyBox)) {
                if (player.vy > 0 && player.y + player.height - player.vy <= enemyBox.y + 10) {
                    enemies.splice(i, 1);
                    player.vy = JUMP_FORCE * 0.7;
                    score += 50;
                    particles.push({ x: ex + e.w / 2, y: e.y, vy: -3, life: 1, text: 'SQUASH!' });
                    if (window.EspooClicker) window.EspooClicker.playSound('sound-space-boom');
                } else {
                    die();
                }
            }
        }

        for (let i = particles.length - 1; i >= 0; i--) {
            let p = particles[i];
            p.y += p.vy;
            p.life -= 0.02;
            if (p.life <= 0) particles.splice(i, 1);
        }

        let lastP = platforms[platforms.length - 1];
        if (lastP.x - cameraX < canvas.width + 300) {
            spawnChunk();
        }

        if (platforms[0].x + platforms[0].w - cameraX < -300) {
            platforms.shift();
        }

        if (player.y > canvas.height) {
            die();
        }
    }

    // FIX: Render ottimizzato con gli sprite separati
    function drawPlayer() {
        ctx.save();
        ctx.translate(player.x + player.width / 2, player.y + player.height);

        let bob = player.vx !== 0 && player.isGrounded ? Math.abs(Math.sin(player.walkCycle)) * 3 : 0;
        ctx.translate(0, -player.height / 2 - bob);

        ctx.rotate(player.rotation);
        ctx.scale(player.scaleX * player.facing, player.scaleY);

        let currentImg = imgStop;
        if (!player.isGrounded) {
            currentImg = imgJump;
        } else if (player.vx !== 0) {
            currentImg = imgRun;
        }

        if (currentImg.complete && currentImg.naturalWidth !== 0) {
            ctx.drawImage(currentImg, -player.width / 2, -player.height / 2, player.width, player.height);
        } else {
            ctx.fillStyle = '#3498db';
            ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);
        }
        ctx.restore();
    }

    function drawTiledBlock(img, x, y, w, h) {
        if (img.complete && img.naturalWidth !== 0) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(x, y, w, h);
            ctx.clip();
            for (let i = 0; i < w; i += TILE_SIZE) {
                for (let j = 0; j < h; j += TILE_SIZE) {
                    ctx.drawImage(img, x + i, y + j, TILE_SIZE, TILE_SIZE);
                }
            }
            ctx.restore();
        } else {
            ctx.fillStyle = '#d35400';
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = '#000';
            ctx.strokeRect(x, y, w, h);
        }
    }

    function drawBug(ex, ey, w, h, isTroll) {
        ctx.fillStyle = isTroll ? '#8e44ad' : '#2ecc71';
        ctx.fillRect(ex, ey + 8, w, h - 8);

        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(ex + 4, ey + 10, 6, 6);
        ctx.fillRect(ex + w - 10, ey + 10, 6, 6);

        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ex + 8, ey + 8); ctx.lineTo(ex, ey);
        ctx.moveTo(ex + w - 8, ey + 8); ctx.lineTo(ex + w, ey);
        ctx.stroke();

        let legOffset = Math.sin(performance.now() / 100) * 3;
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(ex - 2, ey + 14 + legOffset, 4, 2);
        ctx.fillRect(ex + w - 2, ey + 14 - legOffset, 4, 2);
    }

    function draw() {
        ctx.fillStyle = '#5c94fc';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (let p of platforms) {
            let px = p.x - cameraX;
            drawTiledBlock(imgBrick, px, p.y, p.w, p.h);
        }

        for (let trap of deadlyTraps) {
            let tx = trap.x - cameraX;
            if (trap.active) {
                ctx.fillStyle = '#bdc3c7';
                ctx.beginPath();
                ctx.moveTo(tx, trap.y);
                ctx.lineTo(tx + trap.w / 2, trap.y - trap.h);
                ctx.lineTo(tx + trap.w, trap.y);
                ctx.fill();
            }
        }

        for (let b of rewardBlocks) {
            let bx = b.x - cameraX;
            let drawY = b.y + b.popY;

            if (b.used) {
                ctx.fillStyle = '#7f8c8d';
                ctx.fillRect(bx, drawY, b.w, b.h);
                ctx.strokeStyle = '#2c3e50';
                ctx.strokeRect(bx, drawY, b.w, b.h);
            } else {
                drawTiledBlock(imgBlock, bx, drawY, b.w, b.h);
            }
        }

        for (let e of enemies) {
            let ex = e.x - cameraX;
            drawBug(ex, e.y, e.w, e.h, e.isTroll);
        }

        drawPlayer();

        for (let p of particles) {
            ctx.fillStyle = `rgba(241, 196, 15, ${p.life})`;
            ctx.font = "bold 16px 'Rajdhani', sans-serif";
            ctx.fillText(p.text, p.x, p.y);
        }
    }

    function updateUI() {
        const el = document.getElementById('super-espo-score-ui');
        const gs = window.EspooClicker ? window.EspooClicker.getGameState() : null;
        const highScore = (gs && gs.arcadeHighScores && gs.arcadeHighScores.superespo) ? gs.arcadeHighScores.superespo : 0;

        if (el) {
            el.innerHTML = `
                <span class="stat">SCORE: <span class="val-score">${gameScore}</span></span>
                <span class="stat">RECORD: <span class="val-record">${Math.max(gameScore, highScore)}</span></span>
            `;
        }
    }

    function die() {
        if (!isRunning) return;
        isRunning = false;
        cancelAnimationFrame(gameInterval);
        if (window.EspooClicker) window.EspooClicker.playSound('sound-error');

        let reward = new Decimal(0);
        if (typeof bps !== 'undefined') {
            const bpsVal = (bps && bps.gt(0)) ? bps : new Decimal(1);
            reward = bpsVal.mul(gameScore).mul(0.02);
        }

        if (window.EspooClicker) {
            const gs = window.EspooClicker.getGameState();

            if (gameScore > 0) {
                gs.score = gs.score.add(reward);
                window.EspooClicker.showToast(`💥 SCHIACCIATO! +${window.EspooClicker.formatNumber(reward)} BUG!`, 'reward');
            }

            if (!gs.arcadeHighScores) gs.arcadeHighScores = {};
            if (gameScore > (gs.arcadeHighScores.superespo || 0)) {
                gs.arcadeHighScores.superespo = gameScore;
                window.EspooClicker.showToast(`🏆 RECORD SUPER ESPÒ: ${gameScore}!`, 'achievement');
            }

            window.EspooClicker.saveGame();
            if (typeof updateUI === 'function') window.updateUI();
        }

        const overlay = document.getElementById('super-espo-overlay');
        overlay.style.display = 'flex';
        overlay.innerHTML = `
            <div style="color:#e74c3c; font-size:2rem; font-weight:900; margin-bottom:10px; font-family:'Rajdhani';">SEI MORTO.</div>
            <div style="color:#fff; margin-bottom:20px;">Score: <span style="color:#f1c40f">${gameScore}</span></div>
            <div style="display:flex; gap:10px; justify-content:center;">
                <button class="arcade-btn secondary" onclick="window.exitSuperEspoGame()">MENU</button>
                <button class="arcade-btn" onclick="window.startSuperEspoRun()" style="background:#9b59b6; color:#fff; border-color:#8e44ad;">RIPROVA</button>
            </div>
        `;
    }

    function drawStaticScreen() {
        ctx.fillStyle = '#5c94fc';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawTiledBlock(imgBrick, 0, 300, 800, 100);

        if (imgStop.complete && imgStop.naturalWidth !== 0) {
            ctx.drawImage(imgStop, 100, 268, 32, 32);
        }
    }

})();