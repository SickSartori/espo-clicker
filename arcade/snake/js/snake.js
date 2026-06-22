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
    let _goTimer = null;

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
        canvasWrapper.style.width = canvasWidth + 'px';
        canvasWrapper.className = 'crt-turn-on crt-effect';

        canvas = document.createElement('canvas');
        canvas.id = 'snake-canvas';
        canvas.width = canvasWidth;
        canvas.height = 540;
        // Il wrapper deve essere alto quanto il canvas: prima era fisso a 400px mentre
        // il canvas è 540 → gli ultimi ~140px di campo (muri/cibo/serpente) restavano
        // fuori dall'area visibile pur essendo giocabili.
        canvasWrapper.style.height = canvas.height + 'px';
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
        if (_goTimer) { clearTimeout(_goTimer); _goTimer = null; }
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
        if (_goTimer) { clearTimeout(_goTimer); _goTimer = null; }

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

        // Build game over overlay
        var overlay = document.getElementById('snake-overlay');
        overlay.style.display = 'flex';
        overlay.style.background = 'rgba(5, 7, 9, 0.92)';
        overlay.style.animation = 'arcadeGoFadeIn 0.4s ease forwards';
        overlay.innerHTML = '';

        var wrap = document.createElement('div');
        wrap.style.cssText = 'text-align:center;width:100%;max-width:400px;';

        // GAME OVER title
        var title = document.createElement('div');
        title.textContent = 'GAME OVER';
        title.style.cssText = "font-family:'Press Start 2P',monospace;font-size:1.6rem;color:#e74c3c;text-shadow:0 0 20px rgba(231,76,60,0.8),0 0 40px rgba(231,76,60,0.3);animation:arcadeGoGlitch 0.4s ease;margin-bottom:20px;letter-spacing:3px;";
        wrap.appendChild(title);

        // Separator
        var sep = document.createElement('div');
        sep.textContent = '════════════════';
        sep.style.cssText = 'color:rgba(231,76,60,0.25);letter-spacing:2px;margin-bottom:18px;font-family:monospace;';
        wrap.appendChild(sep);

        // Score label
        var sLabel = document.createElement('div');
        sLabel.textContent = (window.ARCADE_TXT && window.ARCADE_TXT.score) || 'PUNTEGGIO';
        sLabel.style.cssText = "font-family:'Press Start 2P',monospace;font-size:0.5rem;color:#5a6a7a;letter-spacing:3px;margin-bottom:6px;";
        wrap.appendChild(sLabel);

        // Score value (count-up)
        var sVal = document.createElement('div');
        sVal.id = 'snake-go-score';
        sVal.textContent = '0';
        sVal.style.cssText = "font-family:'Press Start 2P',monospace;font-size:2.2rem;color:#00d9ff;text-shadow:0 0 12px rgba(0,217,255,0.8);margin-bottom:18px;animation:arcadeGoCountPulse 1.2s ease-in-out infinite;";
        wrap.appendChild(sVal);

        // Reward (fade in after count-up)
        if (score > 0) {
            var rDiv = document.createElement('div');
            rDiv.textContent = '+' + rewardStr + ' BUG';
            rDiv.style.cssText = "font-family:'Press Start 2P',monospace;font-size:0.75rem;color:#2ecc71;text-shadow:0 0 12px rgba(46,204,113,0.8);margin-bottom:14px;opacity:0;animation:arcadeGoFadeUp 0.4s ease 0.9s forwards;";
            wrap.appendChild(rDiv);
        }

        // New record
        if (isNewRecord) {
            var recDiv = document.createElement('div');
            recDiv.textContent = (window.ARCADE_TXT && window.ARCADE_TXT.record) || '★ NUOVO RECORD! ★';
            recDiv.style.cssText = "font-family:'Press Start 2P',monospace;font-size:0.65rem;color:#ffce15;animation:arcadeGoRecordShine 1s ease-in-out infinite,arcadeGoFadeUp 0.4s ease 1.2s forwards;opacity:0;margin-bottom:14px;";
            wrap.appendChild(recDiv);
        }

        // Bottone RESTART: ricomincia subito (annulla il ritorno automatico)
        var bRetry = document.createElement('button');
        bRetry.className = 'arcade-btn';
        bRetry.innerHTML = '<i class="fa-solid fa-rotate-right"></i> RESTART';
        bRetry.style.cssText = 'margin-top:18px;opacity:0;animation:arcadeGoFadeUp 0.3s ease 1.0s forwards;';
        bRetry.onclick = function () {
            if (_goTimer) { clearTimeout(_goTimer); _goTimer = null; }
            window.startSnakeRun();
        };
        wrap.appendChild(bRetry);

        // Auto-return label + barra (ritorno al menu se non clicchi RESTART)
        var retLabel = document.createElement('div');
        retLabel.textContent = '▸ o torna al menu… ◂';
        retLabel.style.cssText = "font-family:'Rajdhani',sans-serif;font-size:0.85rem;color:#4a5a6a;letter-spacing:1px;margin-top:16px;opacity:0;animation:arcadeGoFadeUp 0.3s ease 1.5s forwards;";
        wrap.appendChild(retLabel);

        // Progress bar (3s, fino al ritorno automatico)
        var bar = document.createElement('div');
        bar.style.cssText = 'width:50%;height:3px;background:#1a2530;border-radius:2px;margin:10px auto 0;overflow:hidden;opacity:0;animation:arcadeGoFadeUp 0.3s ease 1.5s forwards;';
        var barFill = document.createElement('div');
        barFill.style.cssText = 'width:0;height:100%;background:linear-gradient(90deg,#e74c3c,#e67e22);border-radius:2px;animation:arcadeGoBarFill 3s linear 1.5s forwards;';
        bar.appendChild(barFill);
        wrap.appendChild(bar);

        overlay.appendChild(wrap);

        // Score count-up animation
        var countTarget = score;
        var countStart = Date.now();
        var countDuration = 700;
        var countIv = setInterval(function () {
            var elapsed = Date.now() - countStart;
            var progress = Math.min(elapsed / countDuration, 1);
            var val = Math.round(progress * countTarget);
            var el = document.getElementById('snake-go-score');
            if (el) el.textContent = val;
            if (progress >= 1) clearInterval(countIv);
        }, 25);

        // Ritorno automatico al menu dopo 4.5s (se non si clicca RESTART)
        _goTimer = setTimeout(function () {
            _goTimer = null;
            window.exitSnakeGame();
        }, 4500);
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
