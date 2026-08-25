// code/arcade/asteroids/js/asteroids.js

(function () {
    let canvas, ctx;
    let gameInterval;
    let isRunning = false;

    // Entità
    let ship;
    let bullets = [];
    let asteroids = [];
    let particles = [];
    let score = 0;
    let level = 1;

    // Input
    const keys = { ArrowUp: false, ArrowLeft: false, ArrowRight: false, Space: false };

    // Impostazioni
    const FPS = 60;
    const FRICTION = 0.98;
    const SHIP_SIZE = 15;
    const TURN_SPEED = 0.1;
    const THRUST = 0.15;
    const BULLET_SPEED = 7;
    const BULLET_LIFE = 60; // frames

    function init() {
        // Gestione Input Tastiera Globale
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
    }

    function handleKeyDown(e) {
        if (!isRunning) return;
        if (e.code === 'ArrowUp') keys.ArrowUp = true;
        if (e.code === 'ArrowLeft') keys.ArrowLeft = true;
        if (e.code === 'ArrowRight') keys.ArrowRight = true;
        if (e.code === 'Space') {
            if (!keys.Space) shoot();
            keys.Space = true;
        }
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    }

    function handleKeyUp(e) {
        if (e.code === 'ArrowUp') keys.ArrowUp = false;
        if (e.code === 'ArrowLeft') keys.ArrowLeft = false;
        if (e.code === 'ArrowRight') keys.ArrowRight = false;
        if (e.code === 'Space') keys.Space = false;
    }

    // --- INIT UI ---
    window.startAsteroidsGame = function () {
        const selector = document.getElementById('arcade-game-selector');
        const gameContainer = document.getElementById('arcade-active-game-container');

        if (selector) selector.style.display = 'none';

        if (gameContainer) {
            gameContainer.style.display = 'flex';
            gameContainer.style.flexDirection = 'column';
            gameContainer.style.alignItems = 'center';
            gameContainer.innerHTML = '';
        } else return;

        // 1. Header Standardizzato
        const gs = window.EspooClicker ? window.EspooClicker.getGameState() : null;
        const highScore = (gs && gs.arcadeHighScores && gs.arcadeHighScores.asteroids) ? gs.arcadeHighScores.asteroids : 0;

        const headerDiv = document.createElement('div');
        headerDiv.className = 'arcade-game-topbar';

        headerDiv.innerHTML = `
            <button class="arcade-btn secondary" onclick="window.exitAsteroidsGame()">
                <i class="fa-solid fa-arrow-left"></i> MENU
            </button>
            <span class="topbar-game-label" style="color:#e67e22">ESPO-ROIDS</span>
            <div class="arcade-stats-box" id="asteroids-score-ui">
                <span class="stat">${(window.ARCADE_TXT && window.ARCADE_TXT.points) || 'PUNTI'}: <span class="val-score">0</span></span>
                <span class="stat">${(window.ARCADE_TXT && window.ARCADE_TXT.wave) || 'ONDATA'}: <span class="val-hp">1</span></span>
                <span class="stat">RECORD: <span class="val-record">${highScore}</span></span>
            </div>
        `;
        gameContainer.appendChild(headerDiv);

        // 2. Canvas Wrapper (con effetto CRT accensione)
        const canvasWrapper = document.createElement('div');
        canvasWrapper.style.position = 'relative';
        canvasWrapper.className = 'crt-turn-on crt-effect';

        canvas = document.createElement('canvas');
        canvas.id = 'asteroids-canvas';

        // Responsività — canvas più grande per fullscreen arcade
        const maxWidth = Math.min(1100, window.innerWidth - 60);
        canvas.width = maxWidth;
        canvas.height = 540;

        ctx = canvas.getContext('2d');
        canvasWrapper.appendChild(canvas);

        // 3. Overlay Start
        const overlay = document.createElement('div');
        overlay.id = 'asteroids-overlay';
        overlay.className = 'arcade-ui-overlay';
        overlay.innerHTML = `
            <div style="color:#e67e22; font-family:'Rajdhani'; font-size:2.5rem; margin-bottom:10px; font-weight:900; letter-spacing:3px; text-shadow: 0 0 15px #e67e22;">
                ESPO-ROIDS
            </div>
            <div style="color:#bdc3c7; margin-bottom:20px; font-family:monospace; font-size: 0.9rem;">
                Su / Destra / Sinistra per muoverti <br> SPAZIO per sparare
            </div>
            <button class="arcade-btn" onclick="window.startAsteroidsRun()">INIZIA MISSIONE</button>
        `;
        canvasWrapper.appendChild(overlay);
        gameContainer.appendChild(canvasWrapper);

        if (!window.asteroidsInitialized) {
            init();
            window.asteroidsInitialized = true;
        }

        drawStaticScreen(); // Disegna un frame base prima del play
    };

    window.exitAsteroidsGame = function () {
        isRunning = false;
        cancelAnimationFrame(gameInterval);

        // Rimuove i listener globali e riarma il flag init: alla prossima entrata init()
        // li riaggancia (prima restavano attaccati a window per sempre dopo l'uscita).
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        window.asteroidsInitialized = false;

        const selector = document.getElementById('arcade-game-selector');
        const gameContainer = document.getElementById('arcade-active-game-container');

        if (gameContainer) {
            gameContainer.innerHTML = '';
            gameContainer.style.display = 'none';
        }
        if (selector) selector.style.display = 'flex';

        if (window.EspooClicker) window.EspooClicker.playSound('sound-click');
    };

    window.startAsteroidsRun = function () {
        document.getElementById('asteroids-overlay').style.display = 'none';

        // Reset variabili
        ship = {
            x: canvas.width / 2,
            y: canvas.height / 2,
            a: -Math.PI / 2, // Punta in alto
            xv: 0,
            yv: 0,
            radius: SHIP_SIZE
        };
        bullets = [];
        asteroids = [];
        particles = [];
        score = 0;
        level = 1;

        // Forza reset tasti per evitare incastri
        keys.Space = false;
        keys.ArrowUp = false;
        keys.ArrowLeft = false;
        keys.ArrowRight = false;

        spawnAsteroids();
        updateUI();

        if (window.EspooClicker) window.EspooClicker.playSound('sound-arcade-start');

        isRunning = true;
        lastTime = performance.now();
        gameInterval = requestAnimationFrame(gameLoop);
    };

    // --- LOGICA GIOCO ---
    function spawnAsteroids() {
        let numAsteroids = 3 + level;
        for (let i = 0; i < numAsteroids; i++) {
            let x, y;
            do {
                x = Math.random() * canvas.width;
                y = Math.random() * canvas.height;
            } while (distBetweenPoints(ship.x, ship.y, x, y) < 100); // Non spawnare vicino alla nave

            createAsteroid(x, y, Math.ceil(Math.random() * 2) + 1); // Size 2 o 3
        }
    }

    function createAsteroid(x, y, size) {
        let lvlMult = 1 + (level * 0.1);
        let xv = (Math.random() - 0.5) * 3 * lvlMult;
        let yv = (Math.random() - 0.5) * 3 * lvlMult;
        let radius = size * 20;

        // Genera vertici frastagliati
        let vertices = [];
        let numVerts = Math.floor(Math.random() * 5) + 7;
        for (let i = 0; i < numVerts; i++) {
            let offset = radius * 0.4 * (Math.random() * 2 - 1);
            vertices.push(radius + offset);
        }

        asteroids.push({ x, y, xv, yv, r: radius, size, a: Math.random() * Math.PI * 2, vert: vertices, numVerts });
    }

    function shoot() {
        if (bullets.length > 5) return; // Max 5 colpi a schermo
        bullets.push({
            x: ship.x + Math.cos(ship.a) * ship.radius,
            y: ship.y + Math.sin(ship.a) * ship.radius,
            xv: Math.cos(ship.a) * BULLET_SPEED,
            yv: Math.sin(ship.a) * BULLET_SPEED,
            life: BULLET_LIFE
        });
        if (window.EspooClicker) window.EspooClicker.playSound('sound-space-shoot');
        if (window.arcadeSfx) window.arcadeSfx.shoot();
    }

    function createExplosion(x, y, color) {
        for (let i = 0; i < 15; i++) {
            particles.push({
                x, y,
                xv: (Math.random() - 0.5) * 5,
                yv: (Math.random() - 0.5) * 5,
                life: Math.random() * 30 + 10,
                color: color
            });
        }
    }

    function distBetweenPoints(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }

    let lastTime = 0;
    function gameLoop(time) {
        if (!isRunning) return;
        gameInterval = requestAnimationFrame(gameLoop);

        // Controllo FPS
        const delta = time - lastTime;
        if (delta < 1000 / FPS) return;
        lastTime = time - (delta % (1000 / FPS));

        update();
        draw();
    }

    function update() {
        // Movimento Nave
        if (keys.ArrowLeft) ship.a -= TURN_SPEED;
        if (keys.ArrowRight) ship.a += TURN_SPEED;
        if (keys.ArrowUp) {
            ship.xv += Math.cos(ship.a) * THRUST;
            ship.yv += Math.sin(ship.a) * THRUST;
        }

        // Attrito
        ship.xv *= FRICTION;
        ship.yv *= FRICTION;

        // Posizione Nave
        ship.x += ship.xv;
        ship.y += ship.yv;

        // Wrap Schermo Nave
        if (ship.x < 0) ship.x = canvas.width;
        if (ship.x > canvas.width) ship.x = 0;
        if (ship.y < 0) ship.y = canvas.height;
        if (ship.y > canvas.height) ship.y = 0;

        // Movimento Proiettili
        for (let i = bullets.length - 1; i >= 0; i--) {
            bullets[i].x += bullets[i].xv;
            bullets[i].y += bullets[i].yv;
            bullets[i].life--;

            // Wrap Proiettili
            if (bullets[i].x < 0) bullets[i].x = canvas.width;
            if (bullets[i].x > canvas.width) bullets[i].x = 0;
            if (bullets[i].y < 0) bullets[i].y = canvas.height;
            if (bullets[i].y > canvas.height) bullets[i].y = 0;

            if (bullets[i].life <= 0) {
                bullets.splice(i, 1);
            }
        }

        // Particelle
        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].x += particles[i].xv;
            particles[i].y += particles[i].yv;
            particles[i].life--;
            if (particles[i].life <= 0) particles.splice(i, 1);
        }

        // Asteroidi
        for (let i = asteroids.length - 1; i >= 0; i--) {
            let a = asteroids[i];
            a.x += a.xv;
            a.y += a.yv;

            // Wrap Asteroidi
            if (a.x < 0 - a.r) a.x = canvas.width + a.r;
            if (a.x > canvas.width + a.r) a.x = 0 - a.r;
            if (a.y < 0 - a.r) a.y = canvas.height + a.r;
            if (a.y > canvas.height + a.r) a.y = 0 - a.r;

            // Collisione con Proiettili
            let destroyed = false;
            for (let j = bullets.length - 1; j >= 0; j--) {
                if (distBetweenPoints(a.x, a.y, bullets[j].x, bullets[j].y) < a.r) {

                    createExplosion(a.x, a.y, '#e67e22');
                    if (window.EspooClicker) window.EspooClicker.playSound('sound-space-boom');
                    if (window.arcadeSfx) window.arcadeSfx.explode();
                    bullets.splice(j, 1);

                    score += (4 - a.size) * 10;
                    updateUI();

                    // Frammentazione
                    if (a.size > 1) {
                        createAsteroid(a.x, a.y, a.size - 1);
                        createAsteroid(a.x, a.y, a.size - 1);
                    }
                    asteroids.splice(i, 1);
                    destroyed = true;
                    break;
                }
            }
            if (destroyed) continue; // asteroide rimosso: niente collisione-nave con 'a' stale

            // Collisione Nave
            if (distBetweenPoints(ship.x, ship.y, a.x, a.y) < ship.radius + a.r) {
                createExplosion(ship.x, ship.y, '#3498db');
                gameOver();
                return; // un solo gameOver per frame -> niente reward doppio
            }
        }

        // Vittoria Livello
        if (asteroids.length === 0) {
            level++;
            if (window.arcadeSfx) window.arcadeSfx.levelup();
            spawnAsteroids();
            updateUI();
        }
    }

    function drawStaticScreen() {
        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Effetto griglia o scanline
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.beginPath();
        for (let i = 0; i < canvas.width; i += 20) { ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); }
        for (let i = 0; i < canvas.height; i += 20) { ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); }
        ctx.stroke();
    }

    function draw() {
        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Disegna Nave
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(
            ship.x + Math.cos(ship.a) * ship.radius,
            ship.y + Math.sin(ship.a) * ship.radius
        );
        ctx.lineTo(
            ship.x - Math.cos(ship.a + 0.5) * ship.radius,
            ship.y - Math.sin(ship.a + 0.5) * ship.radius
        );
        ctx.lineTo(
            ship.x - Math.cos(ship.a - 0.5) * ship.radius,
            ship.y - Math.sin(ship.a - 0.5) * ship.radius
        );
        ctx.closePath();
        ctx.stroke();

        // Propulsore visivo
        if (keys.ArrowUp) {
            ctx.fillStyle = '#e74c3c';
            ctx.beginPath();
            ctx.arc(
                ship.x - Math.cos(ship.a) * ship.radius,
                ship.y - Math.sin(ship.a) * ship.radius,
                4 + Math.random() * 2, 0, Math.PI * 2
            );
            ctx.fill();
        }

        // Disegna Proiettili
        ctx.fillStyle = '#f1c40f';
        for (let b of bullets) {
            ctx.beginPath();
            ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Disegna Asteroidi (Forma frastagliata)
        ctx.strokeStyle = '#e67e22';
        ctx.lineWidth = 2;
        for (let a of asteroids) {
            ctx.beginPath();
            for (let j = 0; j < a.numVerts; j++) {
                let angle = a.a + (j * Math.PI * 2) / a.numVerts;
                let rx = a.x + Math.cos(angle) * a.vert[j];
                let ry = a.y + Math.sin(angle) * a.vert[j];
                if (j === 0) ctx.moveTo(rx, ry);
                else ctx.lineTo(rx, ry);
            }
            ctx.closePath();
            ctx.stroke();
        }

        // Particelle
        for (let p of particles) {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.life * 0.1, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function updateUI() {
        const el = document.getElementById('asteroids-score-ui');
        const gs = window.EspooClicker ? window.EspooClicker.getGameState() : null;
        const highScore = (gs && gs.arcadeHighScores && gs.arcadeHighScores.asteroids) ? gs.arcadeHighScores.asteroids : 0;

        if (el) {
            el.innerHTML = `
                <span class="stat">${(window.ARCADE_TXT && window.ARCADE_TXT.points) || 'PUNTI'}: <span class="val-score">${score}</span></span>
                <span class="stat">${(window.ARCADE_TXT && window.ARCADE_TXT.wave) || 'ONDATA'}: <span class="val-hp" style="color:#e67e22">${level}</span></span>
                <span class="stat">RECORD: <span class="val-record">${Math.max(score, highScore)}</span></span>
            `;
        }
    }

    function gameOver() {
        if (!isRunning) return; // guard rientranza: niente reward/record doppi
        isRunning = false;
        cancelAnimationFrame(gameInterval);

        if (window.EspooClicker) window.EspooClicker.playSound('sound-arcade-gameover');
        if (window.arcadeSfx) window.arcadeSfx.gameover();

        // CALCOLO RICOMPENSA (SCALING BPS)
        let reward = new Decimal(0);
        let isNewRecord = false;
        if (typeof bps !== 'undefined') {
            const bpsVal = (bps && bps.gt(0)) ? bps : new Decimal(1);
            reward = bpsVal.mul(score).mul(0.05);
        }

        if (window.EspooClicker) {
            const gs = window.EspooClicker.getGameState();
            if (score > 0) gs.score = gs.score.add(reward);
            if (!gs.arcadeHighScores) gs.arcadeHighScores = {};
            if (score > (gs.arcadeHighScores.asteroids || 0)) {
                gs.arcadeHighScores.asteroids = score;
                isNewRecord = true;
            }
            window.EspooClicker.saveGame();
            if (typeof updateGameUI === 'function') updateGameUI();
        }

        // Game Over animato condiviso (stile Snake)
        window.showArcadeGameOver({
            overlay: document.getElementById('asteroids-overlay'),
            score: score,
            rewardStr: (window.EspooClicker && score > 0) ? window.EspooClicker.formatNumber(reward) : null,
            isNewRecord: isNewRecord,
            statLabel: (window.ARCADE_TXT && window.ARCADE_TXT.wave) || 'ONDATA', statValue: level, statColor: '#e67e22',
            onReturn: window.exitAsteroidsGame,
            onRetry: window.startAsteroidsRun
        });
    }

})();