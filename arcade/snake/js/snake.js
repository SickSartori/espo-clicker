// code/arcade/snake/js/snake.js

(function () {
    // --- CONFIGURAZIONE ---
    const CONFIG = {
        gridSize: 20,
        speed: 110, // Leggermente più veloce per divertimento
        colors: {
            body: '#3498db',      // Blu Espò
            head: '#ecf0f1',      // Bianco (Fallback)
            food: '#e74c3c',      // Rosso Bug
            bg: '#050a10',
            grid: 'rgba(52, 152, 219, 0.1)'
        },
        headImageSrc: 'assets/image/espo.webp' // Fallback base
    };

    let canvas, ctx;
    let gameInterval;
    let snake = [];
    let food = {};
    let direction = 'right';
    let nextDirection = 'right';
    let score = 0;
    let isGameRunning = false;

    // Immagine testa dinamica
    const headImg = new Image();
    headImg.src = CONFIG.headImageSrc;

    // --- FUNZIONE PER RECUPERARE LA SKIN ---
    function updateSnakeSkin() {
        if (window.EspooClicker) {
            const gs = window.EspooClicker.getGameState();
            const currentSkin = gs.skins.current || 'default';

            // Accediamo a gameData globalmente
            if (typeof gameData !== 'undefined' && gameData.skins[currentSkin]) {
                const skinImg = gameData.skins[currentSkin].img;
                headImg.src = `assets/image/${skinImg}`;
            } else {
                headImg.src = CONFIG.headImageSrc;
            }
        }
    }

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

        // Aggiorna la skin prima di iniziare
        updateSnakeSkin();

        // 1. Calcolo Larghezza Widescreen
        const maxWidth = Math.min(800, window.innerWidth - 40);
        const canvasWidth = Math.floor(maxWidth / CONFIG.gridSize) * CONFIG.gridSize;

        // 2. Header (Pulsante Menu + Punteggio)
        const headerDiv = document.createElement('div');
        headerDiv.style.width = '100%';
        headerDiv.style.maxWidth = canvasWidth + 'px';
        headerDiv.style.display = 'flex';
        headerDiv.style.justifyContent = 'space-between';
        headerDiv.style.alignItems = 'center';
        headerDiv.style.marginBottom = '10px';

        const exitBtn = document.createElement('button');
        exitBtn.innerHTML = '<i class="fa-solid fa-arrow-left"></i> MENU';
        exitBtn.className = 'arcade-btn secondary';
        exitBtn.onclick = window.exitSnakeGame;
        headerDiv.appendChild(exitBtn);

        const scoreDiv = document.createElement('div');
        scoreDiv.id = 'snake-score';
        scoreDiv.className = 'arcade-score-display';
        scoreDiv.innerHTML = 'BUG RISOLTI: 0';
        headerDiv.appendChild(scoreDiv);

        gameContainer.appendChild(headerDiv);

        // 3. Canvas Wrapper (per Overlay)
        const canvasWrapper = document.createElement('div');
        canvasWrapper.style.position = 'relative';
        canvasWrapper.style.width = canvasWidth + 'px';
        canvasWrapper.style.height = '400px';

        canvas = document.createElement('canvas');
        canvas.id = 'snake-canvas';
        canvas.width = canvasWidth;
        canvas.height = 400;
        ctx = canvas.getContext('2d');
        canvasWrapper.appendChild(canvas);

        // 4. Overlay Start (Nuovo Stile Pulito)
        const overlay = document.createElement('div');
        overlay.id = 'snake-overlay';
        overlay.className = 'arcade-ui-overlay';
        overlay.innerHTML = `
            <div style="color:#fff; font-family:'Rajdhani'; font-size:1.5rem; margin-bottom:15px; text-transform:uppercase; letter-spacing:2px;">
                Snake Protocol
            </div>
            <button class="arcade-btn" onclick="window.startSnakeRun()">GIOCA</button>
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
        if (selector) selector.style.display = 'block';

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
            if (window.EspooClicker) window.EspooClicker.playSound('sound-buy');
            spawnFood();
        } else {
            snake.pop();
        }

        draw();
    }

    function draw() {
        ctx.fillStyle = CONFIG.colors.bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Griglia Sottile
        ctx.strokeStyle = CONFIG.colors.grid;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x <= canvas.width; x += CONFIG.gridSize) { ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); }
        for (let y = 0; y <= canvas.height; y += CONFIG.gridSize) { ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); }
        ctx.stroke();

        // Cibo
        const s = CONFIG.gridSize;
        ctx.fillStyle = CONFIG.colors.food;
        // Piccolo tremolio per il cibo (glitch effect)
        const jitter = Math.random() > 0.9 ? 1 : 0;
        ctx.fillRect((food.x * s) + jitter, (food.y * s) + jitter, s - 2, s - 2);

        // Serpente
        snake.forEach((part, index) => {
            const px = part.x * s;
            const py = part.y * s;

            if (index === 0) {
                // TESTA (SKIN)
                try {
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(px + s / 2, py + s / 2, s / 2 + 1, 0, Math.PI * 2);
                    ctx.closePath();
                    ctx.clip();
                    ctx.drawImage(headImg, px, py, s, s);

                    // Bordo per contrasto
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                    ctx.restore();
                } catch (e) {
                    ctx.fillStyle = CONFIG.colors.head;
                    ctx.fillRect(px, py, s, s);
                }
            } else {
                // CORPO
                ctx.fillStyle = CONFIG.colors.body;
                ctx.fillRect(px + 1, py + 1, s - 2, s - 2);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.fillRect(px + 4, py + 4, s - 8, s - 8);
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

        // Logo Sfondo
        const size = 100;
        try {
            ctx.save();
            ctx.globalAlpha = 0.2;
            ctx.drawImage(headImg, (canvas.width / 2) - (size / 2), (canvas.height / 2) - (size / 2), size, size);
            ctx.restore();
        } catch (e) { }
    }

    function spawnFood() {
        const tilesX = canvas.width / CONFIG.gridSize;
        const tilesY = canvas.height / CONFIG.gridSize;
        let valid = false;
        while (!valid) {
            food = {
                x: Math.floor(Math.random() * tilesX),
                y: Math.floor(Math.random() * tilesY)
            };
            valid = true;
            for (let part of snake) {
                if (part.x === food.x && part.y === food.y) { valid = false; break; }
            }
        }
    }

    function gameOver() {
        clearInterval(gameInterval);
        isGameRunning = false;

        // Usa l'ID condiviso definito in game-data
        if (window.EspooClicker) window.EspooClicker.playSound('sound-arcade-gameover');

        let reward = 0;
        if (typeof bps !== 'undefined') {
            const bpsVal = (bps && bps.gt(0)) ? bps : new Decimal(1);
            const safeReward = bpsVal.mul(score).mul(0.5);
            reward = safeReward;
        }

        if (window.EspooClicker) {
            const gs = window.EspooClicker.getGameState();

            if (score > 0) {
                gs.score = gs.score.add(reward);
                window.EspooClicker.showToast(`🐍 GAME OVER! +${window.EspooClicker.formatNumber(reward)} BUG!`, 'reward');
            }

            if (!gs.arcadeHighScores) gs.arcadeHighScores = {};
            const currentHigh = gs.arcadeHighScores.snake || 0;
            if (score > currentHigh) {
                gs.arcadeHighScores.snake = score;
                window.EspooClicker.showToast(`🏆 NUOVO RECORD: ${score}!`, 'achievement');

                const displayEl = document.getElementById('arcade-high-score');
                if (displayEl) displayEl.textContent = score;
            }

            window.EspooClicker.saveGame();
            if (typeof updateUI === 'function') updateUI();
        }

        const overlay = document.getElementById('snake-overlay');
        overlay.style.display = 'flex'; // Torna flex per centrare
        overlay.innerHTML = `
            <div style="margin-bottom:10px; font-weight:900; color:#e74c3c; font-size:2rem; text-shadow:2px 2px 0 #000; font-family:'Rajdhani';">GAME OVER</div>
            <div style="margin-bottom:20px; color:#fff; font-family:monospace; font-size:1.2rem;">Punteggio: <span style="color:#3498db">${score}</span></div>
            <div style="display:flex; gap:10px; justify-content:center;">
                <button class="arcade-btn secondary" onclick="window.exitSnakeGame()">MENU</button>
                <button class="arcade-btn" onclick="window.startSnakeRun()">RIPROVA</button>
            </div>
        `;
    }

    function updateScoreUI(val) {
        const el = document.getElementById('snake-score');
        if (el) el.textContent = `BUG RISOLTI: ${val}`;
    }

    function handleInput(e) {
        if (!isGameRunning) return;
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(e.code) > -1) e.preventDefault();
        switch (e.key) {
            case 'ArrowUp': case 'w': case 'W': if (direction !== 'down') nextDirection = 'up'; break;
            case 'ArrowDown': case 's': case 'S': if (direction !== 'up') nextDirection = 'down'; break;
            case 'ArrowLeft': case 'a': case 'A': if (direction !== 'right') nextDirection = 'left'; break;
            case 'ArrowRight': case 'd': case 'D': if (direction !== 'left') nextDirection = 'right'; break;
        }
    }

    function setupTouchControls(element) {
        let tsX = 0, tsY = 0;
        element.addEventListener('touchstart', (e) => {
            tsX = e.changedTouches[0].screenX; tsY = e.changedTouches[0].screenY;
            if (isGameRunning) e.preventDefault();
        }, { passive: false });
        element.addEventListener('touchmove', (e) => { if (isGameRunning) e.preventDefault(); }, { passive: false });
        element.addEventListener('touchend', (e) => {
            if (!isGameRunning) return;
            let teX = e.changedTouches[0].screenX; let teY = e.changedTouches[0].screenY;
            let xDiff = teX - tsX; let yDiff = teY - tsY;
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