// arcade/snake/js/snake.js

(function () {
    const CONFIG = {
        gridSize: 20,
        speed: 110,
        colors: {
            head: '#2ecc71',
            body: '#3498db',
            food: '#e74c3c',
            bg: '#050a10',
            grid: 'rgba(52, 152, 219, 0.1)'
        }
    };

    let canvas, ctx;
    let gameInterval;
    let snake = [];
    let food = {};
    let direction = 'right';
    let nextDirection = 'right';
    let score = 0;
    let isGameRunning = false;

    // --- INIT ---
    window.initSnakeGame = function () {
        const selector = document.getElementById('arcade-game-selector');
        const gameContainer = document.getElementById('arcade-active-game-container');

        if (selector) selector.style.display = 'none';
        if (gameContainer) {
            gameContainer.style.display = 'flex';
            gameContainer.style.flexDirection = 'column';
            gameContainer.style.alignItems = 'center';
            gameContainer.innerHTML = '';
        } else return;

        const maxWidth = Math.min(1100, window.innerWidth - 60);
        const canvasWidth = Math.floor(maxWidth / CONFIG.gridSize) * CONFIG.gridSize;

        const gs = window.EspooClicker ? window.EspooClicker.getGameState() : null;
        const highScore = (gs && gs.arcadeHighScores && gs.arcadeHighScores.snake) ? gs.arcadeHighScores.snake : 0;

        // Topbar with game name
        const headerDiv = document.createElement('div');
        headerDiv.className = 'arcade-game-topbar';
        headerDiv.innerHTML = `
            <button class="arcade-btn secondary" onclick="window.exitSnakeGame()">
                <i class="fa-solid fa-arrow-left"></i> MENU
            </button>
            <span class="topbar-game-label" style="color:#2ecc71">SNAKE PROTOCOL</span>
            <div class="arcade-stats-box" id="snake-score">
                <span class="stat"><i class="fa-solid fa-crosshairs" style="color:#00d9ff;margin-right:4px"></i><span class="val-score">0</span></span>
                <span class="stat"><i class="fa-solid fa-trophy" style="color:#ffce15;margin-right:4px"></i><span class="val-record">${highScore}</span></span>
            </div>
        `;
        gameContainer.appendChild(headerDiv);

        // Canvas wrapper
        const canvasWrapper = document.createElement('div');
        canvasWrapper.style.position = 'relative';
        canvasWrapper.className = 'crt-turn-on crt-effect';

        canvas = document.createElement('canvas');
        canvas.id = 'snake-canvas';
        canvas.width = canvasWidth;
        canvas.height = 540;
        // NON fissare width/height inline sul wrapper: lo lasciamo al layout flex condiviso
        // (.crt-effect = width:100% + flex:1) come gli altri giochi, così il canvas SCALA
        // sempre per stare nel contenitore (CSS max-width/height:100%) e si adatta al
        // ridimensionamento finestra/rotazione/barra-indirizzi. Con le dimensioni inline
        // rigide, dopo un resize più stretto il wrapper restava largo e il contenitore
        // (overflow:hidden) tagliava i lati → "non si vede tutto il campo, sparisce lo snake".
        ctx = canvas.getContext('2d');
        canvasWrapper.appendChild(canvas);

        // Start overlay
        const overlay = document.createElement('div');
        overlay.id = 'snake-overlay';
        overlay.className = 'arcade-ui-overlay';
        overlay.innerHTML = `
            <div style="font-family:'Press Start 2P',monospace;font-size:1.4rem;color:#2ecc71;text-shadow:0 0 12px rgba(46,204,113,0.8),0 0 30px rgba(46,204,113,0.3);margin-bottom:20px;letter-spacing:2px;">
                SNAKE PROTOCOL
            </div>
            <div style="font-family:'Rajdhani',sans-serif;font-size:1rem;color:#7a8a9a;margin-bottom:24px;">Mangia i bug, evita i muri</div>
            <button class="arcade-btn" onclick="window.startSnakeRun()">INIZIA PARTITA</button>
        `;
        canvasWrapper.appendChild(overlay);
        gameContainer.appendChild(canvasWrapper);

        drawStaticScreen();

        document.removeEventListener('keydown', handleInput);
        document.addEventListener('keydown', handleInput);
        setupTouchControls(canvas);
    };

    window.exitSnakeGame = function () {
        if (gameInterval) clearInterval(gameInterval);
        isGameRunning = false;

        const selector = document.getElementById('arcade-game-selector');
        const gameContainer = document.getElementById('arcade-active-game-container');

        if (gameContainer) {
            gameContainer.innerHTML = '';
            gameContainer.style.display = 'none';
        }
        if (selector) selector.style.display = 'flex';

        document.removeEventListener('keydown', handleInput);
    };

    window.startSnakeRun = function () {

        const startY = Math.floor((canvas.height / CONFIG.gridSize) / 2);
        const startX = Math.floor((canvas.width / CONFIG.gridSize) / 2) - 2;
        snake = [{ x: startX, y: startY }, { x: startX - 1, y: startY }, { x: startX - 2, y: startY }];

        direction = 'right';
        nextDirection = 'right';
        score = 0;
        isGameRunning = true;

        document.getElementById('snake-overlay').style.display = 'none';
        updateScoreUI(0);
        spawnFood();

        if (gameInterval) clearInterval(gameInterval);
        gameInterval = setInterval(gameLoop, CONFIG.speed);
    };

    function gameLoop() {
        direction = nextDirection;
        const head = { ...snake[0] };

        if (direction === 'right') head.x++;
        else if (direction === 'left') head.x--;
        else if (direction === 'up') head.y--;
        else if (direction === 'down') head.y++;

        const tilesX = canvas.width / CONFIG.gridSize;
        const tilesY = canvas.height / CONFIG.gridSize;

        if (head.x < 0 || head.x >= tilesX || head.y < 0 || head.y >= tilesY) {
            gameOver(); return;
        }

        for (let part of snake) {
            if (head.x === part.x && head.y === part.y) {
                gameOver(); return;
            }
        }

        snake.unshift(head);

        if (head.x === food.x && head.y === food.y) {
            score++;
            updateScoreUI(score);
            if (window.arcadeSfx) window.arcadeSfx.pickup();
            spawnFood();
        } else {
            snake.pop();
        }

        draw();
    }

    function draw() {
        const s = CONFIG.gridSize;
        ctx.fillStyle = CONFIG.colors.bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Grid
        ctx.strokeStyle = CONFIG.colors.grid;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x <= canvas.width; x += s) { ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); }
        for (let y = 0; y <= canvas.height; y += s) { ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); }
        ctx.stroke();

        // Food — glitch jitter
        ctx.fillStyle = CONFIG.colors.food;
        const jitter = Math.random() > 0.9 ? 1 : 0;
        ctx.shadowColor = CONFIG.colors.food;
        ctx.shadowBlur = 6;
        ctx.fillRect((food.x * s) + jitter + 1, (food.y * s) + jitter + 1, s - 2, s - 2);
        ctx.shadowBlur = 0;

        // Snake
        snake.forEach(function (part, index) {
            const px = part.x * s;
            const py = part.y * s;

            if (index === 0) {
                // Head — bright with glow
                ctx.fillStyle = CONFIG.colors.head;
                ctx.shadowColor = CONFIG.colors.head;
                ctx.shadowBlur = 8;
                ctx.fillRect(px + 1, py + 1, s - 2, s - 2);
                ctx.shadowBlur = 0;
                // Inner highlight
                ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
                ctx.fillRect(px + 3, py + 3, Math.floor(s / 2) - 2, Math.floor(s / 2) - 2);
            } else {
                // Body
                var fade = Math.max(0.4, 1 - (index / (snake.length + 5)));
                ctx.globalAlpha = fade;
                ctx.fillStyle = CONFIG.colors.body;
                ctx.fillRect(px + 1, py + 1, s - 2, s - 2);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
                ctx.fillRect(px + 3, py + 3, s - 6, s - 6);
                ctx.globalAlpha = 1;
            }
        });
    }

    function drawStaticScreen() {
        ctx.fillStyle = CONFIG.colors.bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = CONFIG.colors.grid;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x <= canvas.width; x += CONFIG.gridSize) { ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); }
        for (let y = 0; y <= canvas.height; y += CONFIG.gridSize) { ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); }
        ctx.stroke();

        // Retro pixel snake in center
        var cx = Math.floor(canvas.width / 2 / CONFIG.gridSize);
        var cy = Math.floor(canvas.height / 2 / CONFIG.gridSize);
        var s = CONFIG.gridSize;
        ctx.globalAlpha = 0.15;
        for (var i = 0; i < 6; i++) {
            ctx.fillStyle = i === 0 ? CONFIG.colors.head : CONFIG.colors.body;
            ctx.fillRect((cx - i) * s + 1, cy * s + 1, s - 2, s - 2);
        }
        ctx.globalAlpha = 1;
    }

    function spawnFood() {
        var tilesX = canvas.width / CONFIG.gridSize;
        var tilesY = canvas.height / CONFIG.gridSize;
        var valid = false;
        while (!valid) {
            food = {
                x: Math.floor(Math.random() * tilesX),
                y: Math.floor(Math.random() * tilesY)
            };
            valid = true;
            for (var p = 0; p < snake.length; p++) {
                if (snake[p].x === food.x && snake[p].y === food.y) { valid = false; break; }
            }
        }
    }

    // --- GAME OVER — animated overlay + auto-return ---
    function gameOver() {
        if (!isGameRunning) return; // guard rientranza: niente reward/record doppi
        clearInterval(gameInterval);
        isGameRunning = false;

        // Due suoni, come negli altri cabinati: il campione vero più il bip
        // sintetizzato. Qui mancava il primo.
        if (window.EspooClicker) window.EspooClicker.playSound('sound-arcade-gameover');
        if (window.arcadeSfx) window.arcadeSfx.gameover();

        // Calculate reward
        var reward = 0;
        var rewardStr = '0';
        if (typeof bps !== 'undefined' && typeof Decimal !== 'undefined') {
            var bpsVal = (bps && bps.gt && bps.gt(0)) ? bps : new Decimal(1);
            reward = bpsVal.mul(score).mul(0.05);
            rewardStr = window.EspooClicker ? window.EspooClicker.formatNumber(reward) : String(Math.floor(parseFloat(reward.toString())));
        }

        // Save score + reward
        var isNewRecord = false;
        if (window.EspooClicker) {
            var gs = window.EspooClicker.getGameState();
            if (score > 0) gs.score = gs.score.add(reward);
            if (!gs.arcadeHighScores) gs.arcadeHighScores = {};
            var currentHigh = gs.arcadeHighScores.snake || 0;
            if (score > currentHigh) {
                gs.arcadeHighScores.snake = score;
                isNewRecord = true;
            }
            window.EspooClicker.saveGame();
        }

        // Flash canvas red
        ctx.fillStyle = 'rgba(231, 76, 60, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Riquadro di fine partita CONDIVISO (js/arcade-page.js), come gli altri
        // cabinati. Prima era ricopiato qui: ~95 righe che avevano gia' preso
        // strade diverse dall'originale — colore delle etichette, barra a durata
        // fissa invece che legata al delay, e i testi "torna al menu" in italiano
        // fisso, quindi non tradotti.
        window.showArcadeGameOver({
            overlay: document.getElementById('snake-overlay'),
            score: score,
            rewardStr: (window.EspooClicker && score > 0) ? rewardStr : null,
            isNewRecord: isNewRecord,
            onReturn: window.exitSnakeGame,
            onRetry: window.startSnakeRun
        });
    }

    function updateScoreUI(val) {
        var el = document.getElementById('snake-score');
        var gs = window.EspooClicker ? window.EspooClicker.getGameState() : null;
        var highScore = (gs && gs.arcadeHighScores && gs.arcadeHighScores.snake) ? gs.arcadeHighScores.snake : 0;

        if (el) {
            el.querySelector('.val-score').textContent = val;
            el.querySelector('.val-record').textContent = Math.max(val, highScore);
        }
    }

    function handleInput(e) {
        if (!isGameRunning) return;
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.code) > -1) e.preventDefault();
        switch (e.key) {
            case 'ArrowUp': case 'w': case 'W': if (direction !== 'down') nextDirection = 'up'; break;
            case 'ArrowDown': case 's': case 'S': if (direction !== 'up') nextDirection = 'down'; break;
            case 'ArrowLeft': case 'a': case 'A': if (direction !== 'right') nextDirection = 'left'; break;
            case 'ArrowRight': case 'd': case 'D': if (direction !== 'left') nextDirection = 'right'; break;
        }
    }

    function setupTouchControls(element) {
        var tsX = 0, tsY = 0;
        element.addEventListener('touchstart', function (e) {
            tsX = e.changedTouches[0].screenX; tsY = e.changedTouches[0].screenY;
            if (isGameRunning) e.preventDefault();
        }, { passive: false });
        element.addEventListener('touchmove', function (e) { if (isGameRunning) e.preventDefault(); }, { passive: false });
        element.addEventListener('touchend', function (e) {
            if (!isGameRunning) return;
            var teX = e.changedTouches[0].screenX, teY = e.changedTouches[0].screenY;
            var xDiff = teX - tsX, yDiff = teY - tsY;
            if (Math.abs(xDiff) > Math.abs(yDiff)) {
                if (xDiff > 0 && direction !== 'left') nextDirection = 'right';
                else if (xDiff < 0 && direction !== 'right') nextDirection = 'left';
            } else {
                if (yDiff > 0 && direction !== 'up') nextDirection = 'down';
                else if (yDiff < 0 && direction !== 'down') nextDirection = 'up';
            }
        }, { passive: false });
    }
})();
