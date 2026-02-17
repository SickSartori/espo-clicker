// code/arcade/space/js/space.js

(function () {
    const CONFIG = {
        width: 800,
        height: 400,
        playerSpeed: 2,
        bulletSpeed: 10,
        enemySpeed: 3,
        spawnRate: 60, // frames
        colors: {
            bg: '#000000',
            player: '#3498db', // Blu
            bullet: '#f1c40f', // Giallo
            enemy1: '#e74c3c', // Rosso
            enemy2: '#9b59b6', // Viola
            text: '#ecf0f1'
        }
    };

    let canvas, ctx, gameInterval;
    let isRunning = false;
    let frameCount = 0;
    let score = 0;
    let lives = 3;

    // Entità
    let player = { x: 50, y: 200, w: 30, h: 20, dy: 0, dx: 0, hp: 1 };
    let bullets = [];
    let enemies = [];
    let particles = [];
    let stars = []; // Per lo sfondo animato

    // Input
    let keys = {};

    // --- DISEGNO PIXEL ART (Helper) ---
    // Disegna forme basate su matrici di 0 e 1
    const sprites = {
        ship: [
            [1, 0, 0, 0, 0],
            [1, 1, 1, 0, 0],
            [1, 1, 1, 1, 1], // Punta a destra
            [1, 1, 1, 0, 0],
            [1, 0, 0, 0, 0]
        ],
        enemy1: [
            [0, 0, 1, 1, 0],
            [0, 1, 1, 1, 1],
            [1, 1, 0, 1, 1], // Alieno tipo space invader
            [1, 1, 1, 1, 1],
            [0, 1, 0, 1, 0]
        ],
        bullet: [
            [1, 1, 1]
        ]
    };

    function drawSprite(ctx, matrix, x, y, size, color) {
        ctx.fillStyle = color;
        for (let r = 0; r < matrix.length; r++) {
            for (let c = 0; c < matrix[r].length; c++) {
                if (matrix[r][c] === 1) {
                    ctx.fillRect(x + c * size, y + r * size, size, size);
                }
            }
        }
    }

    // --- INIT ---
    window.initSpaceGame = function () {
        const selector = document.getElementById('arcade-game-selector');
        const gameContainer = document.getElementById('arcade-active-game-container');

        if (selector) selector.style.display = 'none';
        if (gameContainer) {
            gameContainer.style.display = 'flex';
            gameContainer.style.flexDirection = 'column';
            gameContainer.style.alignItems = 'center';
            gameContainer.innerHTML = '';
        } else return;

        // Header Standardizzato
        const gs = window.EspooClicker ? window.EspooClicker.getGameState() : null;
        const highScore = (gs && gs.arcadeHighScores && gs.arcadeHighScores.space) ? gs.arcadeHighScores.space : 0;

        const headerDiv = document.createElement('div');
        headerDiv.className = 'arcade-game-topbar';

        headerDiv.innerHTML = `
            <button class="arcade-btn secondary" onclick="window.exitSpaceGame()">
                <i class="fa-solid fa-arrow-left"></i> MENU
            </button>
            <div class="arcade-stats-box" id="space-score-ui">
                <span class="stat">PUNTI: <span class="val-score">0</span></span>
                <span class="stat">VITA: <span class="val-hp">3</span></span>
                <span class="stat">RECORD: <span class="val-record">${highScore}</span></span>
            </div>
        `;
        gameContainer.appendChild(headerDiv);

        // Canvas Wrapper (con effetto CRT accensione)
        const canvasWrapper = document.createElement('div');
        canvasWrapper.style.position = 'relative';
        canvasWrapper.className = 'crt-turn-on crt-effect';

        canvas = document.createElement('canvas');
        canvas.id = 'space-canvas';
        canvas.width = CONFIG.width;
        canvas.height = CONFIG.height;
        ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        canvasWrapper.appendChild(canvas);

        // Overlay Start
        const overlay = document.createElement('div');
        overlay.id = 'space-overlay';
        overlay.className = 'arcade-ui-overlay';
        overlay.innerHTML = `
            <div style="color:#e74c3c; font-family:'Rajdhani'; font-size:2.5rem; margin-bottom:10px; font-weight:900; letter-spacing:3px; text-shadow: 0 0 15px #e74c3c;">
                SPACE IMPACT
            </div>
            <div style="color:#bdc3c7; margin-bottom:20px; font-family:monospace; font-size: 0.9rem;">
                WASD / Frecce per muoverti <br> SPAZIO per sparare
            </div>
            <button class="arcade-btn" onclick="window.startSpaceRun()">INIZIA MISSIONE</button>
        `;
        canvasWrapper.appendChild(overlay);
        gameContainer.appendChild(canvasWrapper);

        // Mobile Controls
        const mobileControls = document.createElement('div');
        mobileControls.id = 'space-mobile-controls';
        mobileControls.innerHTML = `
            <div class="d-pad">
                <button class="ctrl-btn btn-up" data-key="ArrowUp"><i class="fa-solid fa-caret-up"></i></button>
                <button class="ctrl-btn btn-left" data-key="ArrowLeft"><i class="fa-solid fa-caret-left"></i></button>
                <button class="ctrl-btn btn-down" data-key="ArrowDown"><i class="fa-solid fa-caret-down"></i></button>
                <button class="ctrl-btn btn-right" data-key="ArrowRight"><i class="fa-solid fa-caret-right"></i></button>
            </div>
            <div class="fire-btn-group">
                <button class="ctrl-btn btn-fire" data-key="Space">FIRE</button>
            </div>
        `;
        gameContainer.appendChild(mobileControls);

        setupInputs(mobileControls);
        initStars();
        draw(); // Primo render statico
    };

    window.exitSpaceGame = function () {
        isRunning = false;
        cancelAnimationFrame(gameInterval);
        const selector = document.getElementById('arcade-game-selector');
        const gameContainer = document.getElementById('arcade-active-game-container');
        if (gameContainer) { gameContainer.innerHTML = ''; gameContainer.style.display = 'none'; }
        if (selector) selector.style.display = 'flex'; // O block a seconda del tuo CSS

        // Rimuovi listener tastiera specifici
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('keyup', handleKeyUp);
    };

    window.startSpaceRun = function () {
        document.getElementById('space-overlay').style.display = 'none';
        resetGame();
        isRunning = true;
        gameLoop();
    };

    function resetGame() {
        player = { x: 50, y: CONFIG.height / 2, w: 40, h: 25, speed: CONFIG.playerSpeed, cooldown: 0 };
        bullets = [];
        enemies = [];
        particles = [];
        score = 0;
        lives = 3;
        frameCount = 0;
        keys = {};
        updateUI();
    }

    function initStars() {
        stars = [];
        for (let i = 0; i < 100; i++) {
            stars.push({
                x: Math.random() * CONFIG.width,
                y: Math.random() * CONFIG.height,
                size: Math.random() * 2 + 1,
                speed: Math.random() * 3 + 0.5
            });
        }
    }

    function spawnEnemy() {
        const type = Math.random() > 0.8 ? 2 : 1; // 20% nemico forte
        const size = type === 1 ? 30 : 20;
        const hp = type === 1 ? 1 : 2;

        enemies.push({
            x: CONFIG.width + 50,
            y: Math.random() * (CONFIG.height - 50) + 25,
            w: size,
            h: size,
            type: type,
            hp: hp,
            // --- MODIFICA VELOCITÀ ---
            // Prima era: Math.random() * 2 + 2 + (score / 1000)
            // Adesso: Base più lenta (1-3 px) e aumenta ogni 2000 punti invece di 1000
            speed: Math.random() * 2 + 1 + (score / 2000)
        });
    }

    function createExplosion(x, y, color) {
        for (let i = 0; i < 8; i++) {
            particles.push({
                x: x, y: y,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                life: 20,
                color: color
            });
        }
    }

    function update() {
        // Starfield background
        stars.forEach(s => {
            s.x -= s.speed;
            if (s.x < 0) s.x = CONFIG.width;
        });

        // Player Movement
        if (keys['ArrowUp'] || keys['w']) player.y -= player.speed;
        if (keys['ArrowDown'] || keys['s']) player.y += player.speed;
        if (keys['ArrowLeft'] || keys['a']) player.x -= player.speed;
        if (keys['ArrowRight'] || keys['d']) player.x += player.speed;

        // Clamp Player
        player.x = Math.max(0, Math.min(player.x, CONFIG.width - player.w));
        player.y = Math.max(0, Math.min(player.y, CONFIG.height - player.h));

        // Shooting
        if (player.cooldown > 0) player.cooldown--;
        if ((keys[' '] || keys['Space']) && player.cooldown <= 0) {
            bullets.push({ x: player.x + player.w, y: player.y + player.h / 2 - 2, w: 10, h: 4 });
            player.cooldown = 15; // Rate of fire
            if (window.EspooClicker) window.EspooClicker.playSound('sound-space-shoot');
        }

        // Bullets
        for (let i = bullets.length - 1; i >= 0; i--) {
            bullets[i].x += CONFIG.bulletSpeed;
            if (bullets[i].x > CONFIG.width) bullets.splice(i, 1);
        }

        // Enemies
        if (frameCount % CONFIG.spawnRate === 0) spawnEnemy();

        for (let i = enemies.length - 1; i >= 0; i--) {
            let e = enemies[i];
            e.x -= e.speed;

            // Collision Bullet-Enemy
            for (let b = bullets.length - 1; b >= 0; b--) {
                let bullet = bullets[b];
                if (rectIntersect(bullet, e)) {
                    bullets.splice(b, 1);
                    e.hp--;
                    if (e.hp <= 0) {
                        createExplosion(e.x, e.y, CONFIG.colors.enemy1);
                        if (window.EspooClicker) window.EspooClicker.playSound('sound-space-boom');
                        score += (e.type === 1 ? 10 : 50);
                        enemies.splice(i, 1);
                        updateUI();
                        // Premio in Bug Clicker?
                        if (window.EspooClicker) window.EspooClicker.getGameState().score = window.EspooClicker.getGameState().score.add(1);
                    }
                    break;
                }
            }

            // Collision Player-Enemy
            if (rectIntersect(player, e)) {
                createExplosion(player.x, player.y, CONFIG.colors.player);
                enemies.splice(i, 1);
                lives--;
                updateUI();
                if (lives <= 0) {
                    gameOver();
                    return;
                }
            }

            if (e.x + e.w < 0) enemies.splice(i, 1);
        }

        // Particles
        for (let i = particles.length - 1; i >= 0; i--) {
            let p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            if (p.life <= 0) particles.splice(i, 1);
        }

        frameCount++;
    }

    function draw() {
        // Clear
        ctx.fillStyle = CONFIG.colors.bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Stars
        ctx.fillStyle = '#555';
        stars.forEach(s => ctx.fillRect(s.x, s.y, s.size, s.size));

        // Player (Disegno usando la matrice sprite scalata)
        drawSprite(ctx, sprites.ship, player.x, player.y, 6, CONFIG.colors.player);

        // Bullets
        ctx.fillStyle = CONFIG.colors.bullet;
        bullets.forEach(b => ctx.fillRect(b.x, b.y, b.w, b.h));

        // Enemies
        enemies.forEach(e => {
            let col = e.type === 1 ? CONFIG.colors.enemy1 : CONFIG.colors.enemy2;
            let size = e.type === 1 ? 5 : 4;
            drawSprite(ctx, sprites.enemy1, e.x, e.y, size, col);
        });

        // Particles
        particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, 3, 3);
        });
    }

    function gameLoop() {
        if (!isRunning) return;
        update();
        draw();
        gameInterval = requestAnimationFrame(gameLoop);
    }

    function gameOver() {
        isRunning = false;
        cancelAnimationFrame(gameInterval);

        // Usa l'ID condiviso definito in game-data
        if (window.EspooClicker) window.EspooClicker.playSound('sound-arcade-gameover');
        // Save Highscore
        if (window.EspooClicker) {
            const gs = window.EspooClicker.getGameState();
            if (!gs.arcadeHighScores) gs.arcadeHighScores = {};

            if (score > (gs.arcadeHighScores.space || 0)) {
                gs.arcadeHighScores.space = score;
                window.EspooClicker.showToast(`🏆 RECORD SPACE: ${score}!`, 'achievement');
            }
            window.EspooClicker.saveGame();
        }

        const overlay = document.getElementById('space-overlay');
        overlay.style.display = 'flex';
        overlay.innerHTML = `
            <div style="color:#e74c3c; font-size:2rem; font-weight:900;">GAME OVER</div>
            <div style="margin-bottom:20px;">Score: <span style="color:#fff">${score}</span></div>
            <button class="arcade-btn" onclick="window.startSpaceRun()">RIPROVA</button>
            <button class="arcade-btn secondary" onclick="window.exitSpaceGame()" style="margin-top:10px">ESCI</button>
        `;
    }

    function updateUI() {
        const el = document.getElementById('space-score-ui');
        const gs = window.EspooClicker ? window.EspooClicker.getGameState() : null;
        const highScore = (gs && gs.arcadeHighScores && gs.arcadeHighScores.space) ? gs.arcadeHighScores.space : 0;

        if (el) {
            const hpColor = lives > 1 ? '#f1c40f' : '#e74c3c';
            el.innerHTML = `
                <span class="stat">PUNTI: <span class="val-score">${score}</span></span>
                <span class="stat">VITA: <span class="val-hp" style="color:${hpColor}">${lives}</span></span>
                <span class="stat">RECORD: <span class="val-record">${Math.max(score, highScore)}</span></span>
            `;
        }
    }

    function rectIntersect(r1, r2) {
        return !(r2.x > r1.x + r1.w ||
            r2.x + r2.w < r1.x ||
            r2.y > r1.y + r1.h ||
            r2.y + r2.h < r1.y);
    }

    // Input Handlers
    function handleKeyDown(e) { keys[e.key] = true; if (e.key === ' ') e.preventDefault(); }
    function handleKeyUp(e) { keys[e.key] = false; }

    function setupInputs(container) {
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);

        // Touch handlers per bottoni HTML
        const btns = container.querySelectorAll('.ctrl-btn');
        btns.forEach(btn => {
            btn.addEventListener('touchstart', (e) => { e.preventDefault(); keys[btn.dataset.key] = true; });
            btn.addEventListener('touchend', (e) => { e.preventDefault(); keys[btn.dataset.key] = false; });
            // Mouse fallback per test desktop
            btn.addEventListener('mousedown', () => keys[btn.dataset.key] = true);
            btn.addEventListener('mouseup', () => keys[btn.dataset.key] = false);
        });
    }

})();