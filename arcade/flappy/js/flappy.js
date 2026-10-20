// arcade/flappy/js/flappy.js
//
// FLAPPY ESPÒÒÒ — un solo tocco, quindici secondi.
//
// Il genere è quello del «vola e schiva» a un tasto, e il nome lo dice. Il resto
// è di questo gioco, non una copia di uno esistente (la lezione di Stack Overflow,
// dev/docs/roadmap.md 3.1: ci si tiene lontani dal clone su più piani, non solo col nome):
//
//   - Il protagonista è la faccia di Espò (l'arte della prima versione, quella col
//     fondo blu), non un uccellino.
//   - Gli ostacoli sono RACK di server con i led che lampeggiano, non tubi verdi.
//   - La partita dura QUINDICI SECONDI dal primo tocco: finito il tempo, finisce
//     — anche senza schiantarsi. È una sessione da telefono, non una maratona.
//   - Nei varchi compaiono a volte dei BUG da raccogliere (+2): il verbo del gioco
//     principale dentro il cabinato, e un motivo per non puntare sempre al centro.
//   - La palette è quella della prima versione (ardesia e azzurro), per il compleanno.
//
// Controlli: tocco/click OVUNQUE nel campo, oppure SPAZIO / ▲ / W. Niente pad
// virtuale (vedi body[data-nopad] in styles/arcade/arcade-fullscreen.css): tutto
// il campo è il tasto, che su un telefono è il bersaglio più grande che ci sia.
// Il tasto tenuto premuto non ripete il battito (e.repeat ignorato).
//
// Il tempo scorre SOLO dopo il primo tocco, e si accumula coi dt del ciclo (non
// con l'orologio): tornando da una scheda in background non si perde partita.

(function () {
    'use strict';

    // ---- Misure logiche ---------------------------------------------------
    // Canvas a dimensione LOGICA fissa, scalato dal CSS (max-width/height:100%):
    // niente da ricalcolare su resize/rotazione, come negli altri cabinati.
    var W = 360, H = 600, GROUND_H = 48;
    var GROUND_Y = H - GROUND_H;

    var RUN_SECONDS = 15;
    var PLAYER_X = 92, PLAYER_R = 17, SPRITE = 44;
    var GRAVITY = 1500, FLAP_V = -430, MAX_FALL = 650;

    var GATE_W = 58, GATE_SPACING = 196, FIRST_GATE_X = W + 110;
    var SPEED_START = 140, SPEED_END = 205;          // px/s, cresce coi secondi
    var GAP_START = 158, GAP_END = 136;              // varco, si stringe un po'
    var GAP_MARGIN = 38;                              // aria fra il varco e soffitto/terra
    var MAX_GAP_SHIFT = 140;                          // salto massimo fra due varchi: sempre raggiungibile
    var BUG_CHANCE = 0.4, BUG_R = 12, BUG_POINTS = 2;

    var COLORS = {
        bgTop: '#2c3e50', bgBottom: '#17212b', grid: 'rgba(93, 124, 154, 0.16)',
        rack: '#34495e', rackEdge: '#5d7c9a', rackDark: '#243342',
        ground: '#34495e', groundLine: '#5d7c9a',
        accent: '#facc15', player: '#3498db'
    };

    // ---- Stato --------------------------------------------------------------
    var canvas, ctx;
    var phase = 'idle';          // idle | ready | playing | over
    var reason = '';             // time | crash
    var t = 0;                   // secondi di gioco (dal primo tocco)
    var clock = 0;               // secondi totali, per le animazioni
    var py = 0, vy = 0;          // posizione e velocità del giocatore
    var gates = [];
    var spawnOn = true;
    var score = 0, gatesPassed = 0, bugsTaken = 0;
    var pops = [];
    var bgX = 0;
    var rafId = null, lastFrame = 0;
    var holder = null;           // #arcade-active-game-container: riceve i tocchi
    var sprite = null, spriteReady = false;

    function T(key, fallback) {
        var tx = window.ARCADE_TXT;
        return (tx && tx[key]) || fallback;
    }

    function loadSprite() {
        if (sprite) return;
        sprite = new Image();
        sprite.onload = function () { spriteReady = true; if (phase !== 'playing') draw(); };
        sprite.src = 'assets/image/skins/espo-v1.webp';
    }

    // ---- Costruzione schermo ------------------------------------------------
    window.initFlappyGame = function () {
        var selector = document.getElementById('arcade-game-selector');
        var gameContainer = document.getElementById('arcade-active-game-container');

        if (selector) selector.style.display = 'none';
        if (gameContainer) {
            gameContainer.style.display = 'flex';
            gameContainer.style.flexDirection = 'column';
            gameContainer.style.alignItems = 'center';
            gameContainer.innerHTML = '';
        } else return;
        holder = gameContainer;
        loadSprite();

        var gs = window.EspooClicker ? window.EspooClicker.getGameState() : null;
        var highScore = Number(gs && gs.arcadeHighScores && gs.arcadeHighScores.flappy) || 0;

        // Costruito con nodi e textContent (niente innerHTML): i testi arrivano dalle
        // etichette tradotte, e non c'è motivo di reinterpretarli come HTML.
        var headerDiv = document.createElement('div');
        headerDiv.className = 'arcade-game-topbar';

        var menuBtn = document.createElement('button');
        menuBtn.className = 'arcade-btn secondary';
        var arrow = document.createElement('i');
        arrow.className = 'fa-solid fa-arrow-left';
        menuBtn.appendChild(arrow);
        menuBtn.appendChild(document.createTextNode(' MENU'));
        menuBtn.addEventListener('click', function () { window.exitFlappyGame(); });
        headerDiv.appendChild(menuBtn);

        var label = document.createElement('span');
        label.className = 'topbar-game-label';
        label.style.color = COLORS.accent;
        label.textContent = 'FLAPPY ESPÒÒÒ';
        headerDiv.appendChild(label);

        var stats = document.createElement('div');
        stats.className = 'arcade-stats-box';
        stats.id = 'flappy-score';
        [['fa-flag-checkered', COLORS.accent, 'val-score', '0'], ['fa-trophy', '#ffce15', 'val-record', String(highScore)]].forEach(function (s) {
            var stat = document.createElement('span');
            stat.className = 'stat';
            var ico = document.createElement('i');
            ico.className = 'fa-solid ' + s[0];
            ico.style.color = s[1];
            ico.style.marginRight = '4px';
            var val = document.createElement('span');
            val.className = s[2];
            val.textContent = s[3];
            stat.appendChild(ico);
            stat.appendChild(val);
            stats.appendChild(stat);
        });
        headerDiv.appendChild(stats);
        gameContainer.appendChild(headerDiv);

        var canvasWrapper = document.createElement('div');
        canvasWrapper.style.position = 'relative';
        canvasWrapper.className = 'crt-turn-on crt-effect';

        canvas = document.createElement('canvas');
        canvas.id = 'flappy-canvas';
        canvas.width = W;
        canvas.height = H;
        ctx = canvas.getContext('2d');
        canvasWrapper.appendChild(canvas);

        var overlay = document.createElement('div');
        overlay.id = 'flappy-overlay';
        overlay.className = 'arcade-ui-overlay';
        function line(text, css) {
            var d = document.createElement('div');
            d.style.cssText = css;
            d.textContent = text;
            overlay.appendChild(d);
        }
        line('FLAPPY ESPÒÒÒ', "font-family:'Press Start 2P',monospace;font-size:1.25rem;color:" + COLORS.accent +
            ";text-shadow:0 0 12px rgba(250,204,21,0.7),0 0 30px rgba(250,204,21,0.25);margin-bottom:20px;letter-spacing:2px;text-align:center;");
        line(T('flappyTagline', 'Un tocco per volare, quindici secondi'),
            "font-family:'Rajdhani',sans-serif;font-size:1rem;color:#9aa8b5;margin-bottom:8px;text-align:center;");
        line(T('flappyHint', 'Tocca (o SPAZIO) per volare. Il tempo parte al primo tocco.'),
            "font-family:'Rajdhani',sans-serif;font-size:0.95rem;color:#3498db;margin-bottom:24px;text-align:center;");
        var startBtn = document.createElement('button');
        startBtn.className = 'arcade-btn';
        startBtn.textContent = T('start', 'INIZIA PARTITA');
        startBtn.addEventListener('click', function () { window.startFlappyRun(); });
        overlay.appendChild(startBtn);
        canvasWrapper.appendChild(overlay);
        gameContainer.appendChild(canvasWrapper);

        resetState();
        draw();

        document.removeEventListener('keydown', handleKey);
        document.addEventListener('keydown', handleKey);
        holder.removeEventListener('pointerdown', handlePointer);
        holder.addEventListener('pointerdown', handlePointer);
    };

    window.exitFlappyGame = function () {
        stopLoop();
        phase = 'idle';

        var selector = document.getElementById('arcade-game-selector');
        var gameContainer = document.getElementById('arcade-active-game-container');
        if (gameContainer) {
            gameContainer.removeEventListener('pointerdown', handlePointer);
            gameContainer.innerHTML = '';
            gameContainer.style.display = 'none';
        }
        if (selector) selector.style.display = 'flex';
        document.removeEventListener('keydown', handleKey);
    };

    window.startFlappyRun = function () {
        resetState();
        var ov = document.getElementById('flappy-overlay');
        if (ov) ov.style.display = 'none';
        phase = 'ready';          // il tempo parte al primo tocco, non qui
        updateScoreUI();
        lastFrame = 0;
        startLoop();
    };

    function resetState() {
        phase = 'idle'; reason = '';
        t = 0; clock = 0;
        py = H * 0.42; vy = 0;
        score = 0; gatesPassed = 0; bugsTaken = 0;
        pops = []; bgX = 0;
        gates = [];
        spawnOn = true;
        spawnGate(FIRST_GATE_X, H * 0.45);
    }

    // ---- Ciclo ----------------------------------------------------------------
    function startLoop() { stopLoop(); rafId = requestAnimationFrame(frame); }
    function stopLoop() { if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; } }

    function frame(now) {
        if (phase === 'idle' || phase === 'over') { rafId = null; return; }
        var dt = lastFrame ? (now - lastFrame) / 1000 : 0;
        lastFrame = now;
        // Tetto sul dt: tornando da una scheda in background il frame successivo
        // arriverebbe dopo secondi, e il giocatore attraverserebbe un rack.
        if (dt > 0.05) dt = 0.05;
        update(dt);
        draw();
        if (phase === 'ready' || phase === 'playing') rafId = requestAnimationFrame(frame);
        else rafId = null;
    }

    // ---- Logica -----------------------------------------------------------------
    function speedNow() {
        var k = Math.min(1, t / RUN_SECONDS);
        return SPEED_START + (SPEED_END - SPEED_START) * k;
    }
    function gapNow() {
        var k = Math.min(1, t / RUN_SECONDS);
        return GAP_START + (GAP_END - GAP_START) * k;
    }

    function spawnGate(x, forcedCenter) {
        var gap = gapNow();
        var half = gap / 2;
        var lo = half + GAP_MARGIN, hi = GROUND_Y - half - GAP_MARGIN;
        var center;
        if (forcedCenter !== undefined) {
            center = forcedCenter;
        } else {
            var prev = gates.length ? gates[gates.length - 1].gapY : H * 0.45;
            var a = Math.max(lo, prev - MAX_GAP_SHIFT), b = Math.min(hi, prev + MAX_GAP_SHIFT);
            center = a + Math.random() * (b - a);
        }
        center = Math.max(lo, Math.min(hi, center));
        gates.push({ x: x, gapY: center, gap: gap, passed: false, bug: Math.random() < BUG_CHANCE ? { taken: false } : null });
    }

    function flap() {
        if (phase === 'ready') phase = 'playing';
        if (phase !== 'playing') return;
        vy = FLAP_V;
        if (window.arcadeSfx && window.arcadeSfx.flap) window.arcadeSfx.flap();
    }

    function update(dt) {
        clock += dt;
        if (phase === 'ready') {
            // In attesa del primo tocco: Espò ondeggia, niente gravità e niente scorrimento.
            py = H * 0.42 + Math.sin(clock * 4) * 8;
            vy = 0;
            return;
        }
        if (phase !== 'playing') return;

        t += dt;
        var sp = speedNow();
        bgX = (bgX + sp * dt * 0.35) % 60;

        vy = Math.min(MAX_FALL, vy + GRAVITY * dt);
        py += vy * dt;
        if (py < PLAYER_R) { py = PLAYER_R; if (vy < 0) vy = 0; }   // il soffitto ferma, non uccide

        for (var i = 0; i < gates.length; i++) gates[i].x -= sp * dt;
        while (gates.length && gates[0].x + GATE_W < -12) gates.shift();
        if (spawnOn && gates.length && gates[gates.length - 1].x < W + 20) {
            spawnGate(gates[gates.length - 1].x + GATE_SPACING);
        }

        // Varchi superati e bug raccolti
        for (var j = 0; j < gates.length; j++) {
            var g = gates[j];
            if (!g.passed && g.x + GATE_W < PLAYER_X - PLAYER_R) {
                g.passed = true;
                gatesPassed++; score += 1;
                addPop('+1', PLAYER_X + 24, py - 26, '#ffffff');
                if (window.arcadeSfx && window.arcadeSfx.pickup) window.arcadeSfx.pickup();
                updateScoreUI();
            }
            if (g.bug && !g.bug.taken) {
                var bx = g.x + GATE_W / 2, by = g.gapY;
                var dx = bx - PLAYER_X, dy = by - py;
                if (dx * dx + dy * dy < (PLAYER_R + BUG_R) * (PLAYER_R + BUG_R)) {
                    g.bug.taken = true;
                    bugsTaken++; score += BUG_POINTS;
                    addPop('+' + BUG_POINTS, bx, by - 18, COLORS.accent);
                    if (window.arcadeSfx && window.arcadeSfx.powerup) window.arcadeSfx.powerup();
                    updateScoreUI();
                }
            }
        }

        // Schianto: terra o rack
        if (py + PLAYER_R >= GROUND_Y) { py = GROUND_Y - PLAYER_R; gameOver('crash'); return; }
        for (var k = 0; k < gates.length; k++) {
            if (hitsGate(gates[k])) { gameOver('crash'); return; }
        }

        // Pops
        for (var p = pops.length - 1; p >= 0; p--) {
            pops[p].age += dt;
            if (pops[p].age > 0.8) pops.splice(p, 1);
        }

        if (t >= RUN_SECONDS) { t = RUN_SECONDS; gameOver('time'); }
    }

    function hitsGate(g) {
        // cerchio del giocatore contro i due rettangoli del rack (sopra e sotto il varco)
        var top = g.gapY - g.gap / 2, bottom = g.gapY + g.gap / 2;
        return circleRect(PLAYER_X, py, PLAYER_R * 0.92, g.x, 0, GATE_W, top) ||
               circleRect(PLAYER_X, py, PLAYER_R * 0.92, g.x, bottom, GATE_W, GROUND_Y - bottom);
    }
    function circleRect(cx, cy, r, rx, ry, rw, rh) {
        var nx = Math.max(rx, Math.min(cx, rx + rw));
        var ny = Math.max(ry, Math.min(cy, ry + rh));
        var dx = cx - nx, dy = cy - ny;
        return dx * dx + dy * dy < r * r;
    }

    function addPop(text, x, y, color) { pops.push({ text: text, x: x, y: y, color: color, age: 0 }); }

    // ---- Input ----------------------------------------------------------------------
    function handleKey(e) {
        if (phase !== 'ready' && phase !== 'playing') return;
        if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
            e.preventDefault();
            if (e.repeat) return;     // il tasto tenuto premuto non ripete il battito
            flap();
        }
    }

    function handlePointer(e) {
        if (phase !== 'ready' && phase !== 'playing') return;
        // I bottoni (MENU, RESTART…) fanno il loro lavoro: non sono battiti d'ala.
        if (e.target && e.target.closest && e.target.closest('button')) return;
        if (e.isTrusted === false) return;   // niente tocchi sintetici da script
        flap();
    }

    // ---- Disegno ------------------------------------------------------------------
    function draw() {
        if (!ctx) return;
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        // Sfondo: ardesia della v1, con una griglia lenta che scorre
        var g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, COLORS.bgTop); g.addColorStop(1, COLORS.bgBottom);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = COLORS.grid;
        ctx.lineWidth = 1;
        for (var x = -bgX; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, GROUND_Y); ctx.stroke(); }
        for (var y = 30; y < GROUND_Y; y += 60) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); ctx.stroke(); }

        for (var i = 0; i < gates.length; i++) drawGate(gates[i]);
        drawGround();
        drawPlayer();
        drawPops();
        drawHud();

        if (phase === 'ready') {
            ctx.save();
            ctx.textAlign = 'center';
            ctx.font = "12px 'Press Start 2P', monospace";
            ctx.globalAlpha = 0.55 + 0.45 * Math.sin(clock * 5);
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = 'rgba(0,0,0,0.6)';
            ctx.lineWidth = 4;
            var txt = T('flappyTap', 'TOCCA PER INIZIARE');
            ctx.strokeText(txt, W / 2, H * 0.62);
            ctx.fillText(txt, W / 2, H * 0.62);
            ctx.restore();
        }
    }

    function drawGate(gt) {
        var top = gt.gapY - gt.gap / 2, bottom = gt.gapY + gt.gap / 2;
        drawRack(gt.x, 0, GATE_W, top, true);
        drawRack(gt.x, bottom, GATE_W, GROUND_Y - bottom, false);
        if (gt.bug && !gt.bug.taken) {
            var bx = gt.x + GATE_W / 2, by = gt.gapY + Math.sin(clock * 4 + gt.x * 0.05) * 3;
            ctx.save();
            ctx.translate(bx, by);
            ctx.fillStyle = '#e74c3c';
            ctx.beginPath(); ctx.ellipse(0, 1, 9, 10, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#17212b';
            ctx.fillRect(-0.7, -8, 1.4, 18);
            [[-4, -2], [4, -2], [-4, 4], [4, 4]].forEach(function (d) { ctx.beginPath(); ctx.arc(d[0], d[1], 1.6, 0, Math.PI * 2); ctx.fill(); });
            ctx.strokeStyle = '#17212b'; ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.moveTo(-2, -9); ctx.lineTo(-5, -13); ctx.moveTo(2, -9); ctx.lineTo(5, -13); ctx.stroke();
            ctx.restore();
        }
    }

    // Un rack da server: corpo ardesia, unità orizzontali con led che lampeggiano.
    // Il bordo del varco ha un cappello più chiaro, così si legge subito dove si passa.
    function drawRack(x, y, w, h, isTop) {
        if (h <= 0) return;
        ctx.fillStyle = COLORS.rack;
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = COLORS.rackEdge;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);

        var UNIT = 22;
        var n = Math.floor((h - 10) / UNIT);
        for (var i = 0; i < n; i++) {
            var uy = isTop ? y + 6 + i * UNIT : y + h - 6 - (i + 1) * UNIT + 3;
            ctx.fillStyle = COLORS.rackDark;
            ctx.fillRect(x + 6, uy, w - 12, UNIT - 6);
            var phaseLed = (i + Math.floor(clock * 3) + Math.floor(x / 40)) % 3;
            ctx.fillStyle = phaseLed === 0 ? '#3498db' : phaseLed === 1 ? '#2ecc71' : '#e74c3c';
            ctx.fillRect(x + w - 14, uy + 4, 5, 5);
            ctx.fillStyle = 'rgba(93,124,154,0.55)';
            ctx.fillRect(x + 10, uy + 4, 18, 2);
            ctx.fillRect(x + 10, uy + 9, 12, 2);
        }
        // cappello sul lato del varco
        ctx.fillStyle = COLORS.rackEdge;
        var capY = isTop ? y + h - 8 : y;
        ctx.fillRect(x - 3, capY, w + 6, 8);
    }

    function drawGround() {
        ctx.fillStyle = COLORS.ground;
        ctx.fillRect(0, GROUND_Y, W, GROUND_H);
        ctx.fillStyle = COLORS.groundLine;
        ctx.fillRect(0, GROUND_Y, W, 3);
        ctx.strokeStyle = 'rgba(93,124,154,0.5)';
        ctx.lineWidth = 2;
        for (var x = -bgX * 1.6; x < W + 24; x += 24) {
            ctx.beginPath(); ctx.moveTo(x, GROUND_Y + 4); ctx.lineTo(x - 14, GROUND_Y + GROUND_H); ctx.stroke();
        }
    }

    function drawPlayer() {
        ctx.save();
        ctx.translate(PLAYER_X, py);
        var tilt = Math.max(-0.5, Math.min(0.9, vy / 650));
        ctx.rotate(tilt * 0.6);
        var r = SPRITE / 2;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.save();
        ctx.clip();
        if (spriteReady) ctx.drawImage(sprite, -r, -r, SPRITE, SPRITE);
        else { ctx.fillStyle = '#2a5d86'; ctx.fillRect(-r, -r, SPRITE, SPRITE); }
        ctx.restore();
        ctx.lineWidth = 3;
        ctx.strokeStyle = COLORS.player;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
    }

    function drawPops() {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = "12px 'Press Start 2P', monospace";
        for (var i = 0; i < pops.length; i++) {
            var p = pops[i];
            ctx.globalAlpha = Math.max(0, 1 - p.age / 0.8);
            ctx.fillStyle = p.color;
            ctx.strokeStyle = 'rgba(0,0,0,0.7)';
            ctx.lineWidth = 3;
            var yy = p.y - p.age * 40;
            ctx.strokeText(p.text, p.x, yy);
            ctx.fillText(p.text, p.x, yy);
        }
        ctx.restore();
    }

    function drawHud() {
        // Barra del tempo: si svuota dal primo tocco; diventa rossa negli ultimi 4 secondi
        var left = Math.max(0, RUN_SECONDS - t);
        var ratio = left / RUN_SECONDS;
        var bx = 14, by = 12, bw = W - 28, bh = 10;
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = left <= 4 ? '#e74c3c' : (left <= 8 ? '#e67e22' : COLORS.accent);
        ctx.fillRect(bx, by, bw * ratio, bh);
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);

        ctx.save();
        ctx.textAlign = 'right';
        ctx.font = "9px 'Press Start 2P', monospace";
        ctx.fillStyle = '#ffffff';
        ctx.fillText(left.toFixed(1) + 's', W - 14, by + bh + 16);

        // Punteggio grande al centro
        ctx.textAlign = 'center';
        ctx.font = "34px 'Press Start 2P', monospace";
        ctx.lineWidth = 6;
        ctx.strokeStyle = 'rgba(0,0,0,0.65)';
        ctx.strokeText(String(score), W / 2, 84);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(String(score), W / 2, 84);
        ctx.restore();
    }

    // ---- Punteggio e fine partita -----------------------------------------------
    function updateScoreUI() {
        var el = document.getElementById('flappy-score');
        if (!el) return;
        var gs = window.EspooClicker ? window.EspooClicker.getGameState() : null;
        var highScore = Number(gs && gs.arcadeHighScores && gs.arcadeHighScores.flappy) || 0;
        var sEl = el.querySelector('.val-score');
        var rEl = el.querySelector('.val-record');
        if (sEl) sEl.textContent = score;
        if (rEl) rEl.textContent = Math.max(score, highScore);
    }

    function gameOver(why) {
        if (phase === 'over') return;   // guard rientranza: niente record/premio doppi
        phase = 'over';
        reason = why;
        stopLoop();

        if (window.EspooClicker) window.EspooClicker.playSound('sound-arcade-gameover');
        if (why === 'crash' && window.arcadeSfx) window.arcadeSfx.hit();
        else if (window.arcadeSfx) window.arcadeSfx.gameover();

        // Stesso premio degli altri cabinati: BPS veri × punteggio × 5%. Con sessioni da
        // quindici secondi non serve altro tetto: a punteggio pieno (~12) e ripartenze
        // immediate rende meno al minuto di una partita media di Stack Overflow, e il
        // tetto sul premio in sospeso (60 × BPS al secondo, src/game/anticheat.ts) vale lo stesso.
        var reward = 0;
        var rewardStr = '0';
        if (typeof bps !== 'undefined' && typeof Decimal !== 'undefined') {
            var bpsVal = (bps && bps.gt && bps.gt(0)) ? bps : new Decimal(1);
            reward = bpsVal.mul(score).mul(0.05);
            rewardStr = window.EspooClicker ? window.EspooClicker.formatNumber(reward) : String(Math.floor(parseFloat(reward.toString())));
        }

        var isNewRecord = false;
        if (window.EspooClicker) {
            var gs = window.EspooClicker.getGameState();
            if (score > 0 && reward) gs.score = gs.score.add(reward);
            if (!gs.arcadeHighScores) gs.arcadeHighScores = {};
            var currentHigh = gs.arcadeHighScores.flappy || 0;
            if (score > currentHigh) {
                gs.arcadeHighScores.flappy = score;
                isNewRecord = true;
            }
            window.EspooClicker.saveGame();
        }
        updateScoreUI();

        draw();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = why === 'crash' ? 'rgba(231, 76, 60, 0.4)' : 'rgba(250, 204, 21, 0.25)';
        ctx.fillRect(0, 0, W, H);

        window.showArcadeGameOver({
            overlay: document.getElementById('flappy-overlay'),
            title: why === 'crash' ? T('flappyCrash', 'SCHIANTO!') : T('flappyTimeUp', 'TEMPO!'),
            titleColor: why === 'crash' ? '#e74c3c' : COLORS.accent,
            score: score,
            rewardStr: (window.EspooClicker && score > 0) ? rewardStr : null,
            isNewRecord: isNewRecord,
            statLabel: T('flappyGates', 'VARCHI'), statValue: gatesPassed, statColor: COLORS.accent,
            onReturn: window.exitFlappyGame,
            onRetry: window.startFlappyRun
        });
    }

    // Esposto per i test: lo stato interno non è altrimenti osservabile.
    window.__flappyDebug = {
        state: function () {
            return {
                phase: phase, reason: reason, t: t, left: RUN_SECONDS - t, y: py, vy: vy,
                score: score, gates: gatesPassed, bugs: bugsTaken,
                list: gates.map(function (g) { return { x: g.x, gapY: g.gapY, gap: g.gap, passed: g.passed, bug: !!(g.bug && !g.bug.taken) }; }),
                w: W, h: H, groundY: GROUND_Y, playerX: PLAYER_X, r: PLAYER_R, gateW: GATE_W, runSeconds: RUN_SECONDS
            };
        },
        flap: flap,
        step: function (dt) { update(dt); draw(); },
        // Ferma il ciclo rAF: così step() è l'UNICA fonte di tempo e la prova è deterministica.
        freeze: stopLoop,
        setGates: function (list) {
            gates = list.map(function (g) { return { x: g.x, gapY: g.gapY, gap: g.gap || 150, passed: !!g.passed, bug: g.bug ? { taken: false } : null }; });
        },
        noSpawn: function (b) { spawnOn = !b; },
        setY: function (y, v) { py = y; vy = v || 0; }
    };
})();
