// arcade/stack/js/stack.js
//
// STACK OVERFLOW — falling blocks, ma NON un clone.
//
// Vincolo di progetto (dev/docs/roadmap.md, 3.1): niente clone 1:1 di Tetris.
// Il trade dress è protetto (caso *Tetris v. Xio*, 2012), quindi qui sono
// diversi il nome, l'estetica, il set di pezzi — che include pezzi da 3 celle,
// non è la settima canonica di tetromini — e soprattutto le meccaniche:
//
//   1. DEBITO TECNICO: ogni N pezzi una riga risale dal fondo e spinge su la
//      pila. Non si accumula per colpa dell'avversario: matura da sola, come
//      il debito vero. È la pressione del gioco.
//   2. BUG DA SCHIACCIARE: alcune celle sono bug. Una riga completa che
//      contiene un bug NON si chiude: prima il bug va schiacciato COL CLICK.
//      È il verbo del gioco principale portato dentro il cabinato.
//
// Il game over si chiama STACK OVERFLOW: la pila arriva in cima.

(function () {
    'use strict';

    // ---- Campo e geometria ---------------------------------------------
    // Canvas a dimensione LOGICA fissa: il wrapper .crt-effect lo scala via
    // CSS (max-width/height:100%), come negli altri cabinati. Così non serve
    // ricalcolare il layout su resize/rotazione — che è la trappola in cui
    // era caduto snake.js (vedi il suo commento sul wrapper).
    var COLS = 10, ROWS = 18, CELL = 28;
    var CANVAS_W = 760, CANVAS_H = 540;
    var FIELD_W = COLS * CELL;                       // 280
    var FIELD_H = ROWS * CELL;                       // 504
    var FIELD_X = Math.floor((CANVAS_W - FIELD_W) / 2);
    var FIELD_Y = Math.floor((CANVAS_H - FIELD_H) / 2);

    var COLORS = {
        bg: '#050a10',
        grid: 'rgba(0, 217, 255, 0.07)',
        frame: '#00d9ff',
        debt: '#5a4a2a',
        bug: '#e74c3c',
        ghost: 'rgba(255, 255, 255, 0.13)',
        panel: '#4a5a6a'
    };

    // ---- Set di pezzi ---------------------------------------------------
    // Sette forme da 4 celle NON sono la lista canonica: qui ce ne sono due da
    // 3 celle (PATCH, HOTFIX), e i nomi/colori sono di questo gioco.
    var PIECES = [
        { id: 'PIPELINE', color: '#00d9ff', cells: [[0, 0], [1, 0], [2, 0], [3, 0]] },
        { id: 'STRUCT',   color: '#ffce15', cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
        { id: 'MERGE',    color: '#9b59b6', cells: [[0, 0], [1, 0], [2, 0], [1, 1]] },
        { id: 'BRANCH',   color: '#2ecc71', cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },
        { id: 'REBASE',   color: '#e67e22', cells: [[2, 0], [0, 1], [1, 1], [2, 1]] },
        { id: 'CONFLICT', color: '#e84393', cells: [[1, 0], [2, 0], [0, 1], [1, 1]] },
        { id: 'PATCH',    color: '#1abc9c', cells: [[0, 0], [0, 1], [1, 1]] },
        { id: 'HOTFIX',   color: '#f39c12', cells: [[0, 0], [1, 0], [0, 1]] }
    ];

    // ---- Stato ----------------------------------------------------------
    var canvas, ctx;
    var board;              // board[r][c] = null | { color, bug }
    var piece;              // { cells, color, id, x, y, bugAt }
    var nextPiece;
    var score, lines, level, bugsSquashed;
    var dropMs, dropAcc, lastFrame;
    var piecesToDebt;       // pezzi mancanti alla prossima riga di debito
    var isRunning, isPaused;
    var rafId = null, _goTimer = null;
    var shakeUntil = 0;     // scossa quando risale il debito
    var flashRows = [];     // righe che lampeggiano perché bloccate da un bug

    function T(key, fallback) {
        var t = window.ARCADE_TXT;
        return (t && t[key]) || fallback;
    }

    // ---- Costruzione schermo -------------------------------------------
    window.initStackGame = function () {
        var selector = document.getElementById('arcade-game-selector');
        var gameContainer = document.getElementById('arcade-active-game-container');

        if (selector) selector.style.display = 'none';
        if (gameContainer) {
            gameContainer.style.display = 'flex';
            gameContainer.style.flexDirection = 'column';
            gameContainer.style.alignItems = 'center';
            gameContainer.innerHTML = '';
        } else return;

        var gs = window.EspooClicker ? window.EspooClicker.getGameState() : null;
        var highScore = (gs && gs.arcadeHighScores && gs.arcadeHighScores.stack) ? gs.arcadeHighScores.stack : 0;

        var headerDiv = document.createElement('div');
        headerDiv.className = 'arcade-game-topbar';
        headerDiv.innerHTML =
            '<button class="arcade-btn secondary" onclick="window.exitStackGame()">' +
                '<i class="fa-solid fa-arrow-left"></i> MENU' +
            '</button>' +
            '<span class="topbar-game-label" style="color:#00d9ff">STACK OVERFLOW</span>' +
            '<div class="arcade-stats-box" id="stack-score">' +
                '<span class="stat"><i class="fa-solid fa-crosshairs" style="color:#00d9ff;margin-right:4px"></i><span class="val-score">0</span></span>' +
                '<span class="stat"><i class="fa-solid fa-trophy" style="color:#ffce15;margin-right:4px"></i><span class="val-record">' + highScore + '</span></span>' +
            '</div>';
        gameContainer.appendChild(headerDiv);

        var canvasWrapper = document.createElement('div');
        canvasWrapper.style.position = 'relative';
        canvasWrapper.className = 'crt-turn-on crt-effect';

        canvas = document.createElement('canvas');
        canvas.id = 'stack-canvas';
        canvas.width = CANVAS_W;
        canvas.height = CANVAS_H;
        ctx = canvas.getContext('2d');
        canvasWrapper.appendChild(canvas);

        var overlay = document.createElement('div');
        overlay.id = 'stack-overlay';
        overlay.className = 'arcade-ui-overlay';
        overlay.innerHTML =
            '<div style="font-family:\'Press Start 2P\',monospace;font-size:1.4rem;color:#00d9ff;text-shadow:0 0 12px rgba(0,217,255,0.8),0 0 30px rgba(0,217,255,0.3);margin-bottom:20px;letter-spacing:2px;">' +
                'STACK OVERFLOW' +
            '</div>' +
            '<div style="font-family:\'Rajdhani\',sans-serif;font-size:1rem;color:#7a8a9a;margin-bottom:8px;">' +
                T('stackTagline', 'Impila il codice, spedisci le righe') +
            '</div>' +
            '<div style="font-family:\'Rajdhani\',sans-serif;font-size:0.95rem;color:#e74c3c;margin-bottom:24px;">' +
                T('stackBugHint', 'I bug bloccano la riga: schiacciali col click') +
            '</div>' +
            '<button class="arcade-btn" onclick="window.startStackRun()">' + T('start', 'INIZIA PARTITA') + '</button>';
        canvasWrapper.appendChild(overlay);
        gameContainer.appendChild(canvasWrapper);

        resetState();
        draw();

        document.removeEventListener('keydown', handleInput);
        document.addEventListener('keydown', handleInput);
        canvas.removeEventListener('pointerdown', handleSquash);
        canvas.addEventListener('pointerdown', handleSquash);
    };

    window.exitStackGame = function () {
        stopLoop();
        if (_goTimer) { clearTimeout(_goTimer); _goTimer = null; }
        isRunning = false;

        var selector = document.getElementById('arcade-game-selector');
        var gameContainer = document.getElementById('arcade-active-game-container');

        if (gameContainer) {
            gameContainer.innerHTML = '';
            gameContainer.style.display = 'none';
        }
        if (selector) selector.style.display = 'flex';

        document.removeEventListener('keydown', handleInput);
    };

    window.startStackRun = function () {
        if (_goTimer) { clearTimeout(_goTimer); _goTimer = null; }
        resetState();

        var ov = document.getElementById('stack-overlay');
        if (ov) ov.style.display = 'none';

        isRunning = true;
        spawnPiece();
        updateScoreUI();

        lastFrame = 0;
        dropAcc = 0;
        startLoop();
    };

    function resetState() {
        board = [];
        for (var r = 0; r < ROWS; r++) {
            var row = [];
            for (var c = 0; c < COLS; c++) row.push(null);
            board.push(row);
        }
        score = 0; lines = 0; level = 1; bugsSquashed = 0;
        dropMs = 700; dropAcc = 0;
        piecesToDebt = debtInterval();
        piece = null;
        nextPiece = randomPiece();
        isRunning = false; isPaused = false;
        shakeUntil = 0; flashRows = [];
    }

    // ---- Ciclo ----------------------------------------------------------
    function startLoop() {
        stopLoop();
        rafId = requestAnimationFrame(frame);
    }
    function stopLoop() {
        if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    }

    function frame(ts) {
        rafId = requestAnimationFrame(frame);
        if (!isRunning) { draw(); return; }

        if (!lastFrame) lastFrame = ts;
        var dt = ts - lastFrame;
        lastFrame = ts;
        // Salto temporale (tab in background): non far precipitare la pila
        if (dt > 250) dt = 250;

        dropAcc += dt;
        while (dropAcc >= dropMs) {
            dropAcc -= dropMs;
            stepDown();
        }
        draw();
    }

    // ---- Pezzi ----------------------------------------------------------
    function randomPiece() {
        var def = PIECES[Math.floor(Math.random() * PIECES.length)];
        var cells = def.cells.map(function (c) { return [c[0], c[1]]; });
        // Un bug ogni tanto dentro al pezzo: la probabilità sale col livello,
        // ma resta bassa — il grosso dei bug arriva col debito tecnico.
        var bugAt = -1;
        if (Math.random() < Math.min(0.05 + level * 0.02, 0.22)) {
            bugAt = Math.floor(Math.random() * cells.length);
        }
        return { id: def.id, color: def.color, cells: cells, bugAt: bugAt, x: 0, y: 0 };
    }

    function spawnPiece() {
        piece = nextPiece;
        nextPiece = randomPiece();
        var w = pieceWidth(piece.cells);
        piece.x = Math.floor((COLS - w) / 2);
        piece.y = 0;
        // Non c'è spazio nemmeno per entrare: la pila ha toccato il tetto.
        if (collides(piece.cells, piece.x, piece.y)) {
            gameOver();
            return false;
        }
        return true;
    }

    function pieceWidth(cells) {
        var max = 0;
        for (var i = 0; i < cells.length; i++) if (cells[i][0] > max) max = cells[i][0];
        return max + 1;
    }

    function rotateCells(cells) {
        var maxY = 0;
        for (var i = 0; i < cells.length; i++) if (cells[i][1] > maxY) maxY = cells[i][1];
        var out = cells.map(function (c) { return [maxY - c[1], c[0]]; });
        var minX = Infinity, minY = Infinity;
        for (var j = 0; j < out.length; j++) {
            if (out[j][0] < minX) minX = out[j][0];
            if (out[j][1] < minY) minY = out[j][1];
        }
        return out.map(function (c) { return [c[0] - minX, c[1] - minY]; });
    }

    function collides(cells, px, py) {
        for (var i = 0; i < cells.length; i++) {
            var x = px + cells[i][0];
            var y = py + cells[i][1];
            if (x < 0 || x >= COLS || y >= ROWS) return true;
            if (y >= 0 && board[y][x]) return true;
        }
        return false;
    }

    // ---- Movimento ------------------------------------------------------
    function move(dx) {
        if (!piece || !isRunning) return;
        if (!collides(piece.cells, piece.x + dx, piece.y)) piece.x += dx;
    }

    function rotate() {
        if (!piece || !isRunning) return;
        var rotated = rotateCells(piece.cells);
        // Wall kick minimale: prova sul posto, poi scostamenti laterali. Senza,
        // ruotare contro il bordo o contro la pila semplicemente non funziona
        // e il gioco sembra rotto.
        var kicks = [0, -1, 1, -2, 2];
        for (var i = 0; i < kicks.length; i++) {
            if (!collides(rotated, piece.x + kicks[i], piece.y)) {
                piece.cells = rotated;
                piece.x += kicks[i];
                return;
            }
        }
    }

    function stepDown() {
        if (!piece || !isRunning) return;
        if (!collides(piece.cells, piece.x, piece.y + 1)) {
            piece.y++;
        } else {
            lockPiece();
        }
    }

    function softDrop() {
        if (!piece || !isRunning) return;
        if (!collides(piece.cells, piece.x, piece.y + 1)) {
            piece.y++;
            score += 1;
            dropAcc = 0;
            updateScoreUI();
        }
    }

    function hardDrop() {
        if (!piece || !isRunning) return;
        var dropped = 0;
        while (!collides(piece.cells, piece.x, piece.y + 1)) { piece.y++; dropped++; }
        score += dropped * 2;
        lockPiece();
    }

    // ---- Fissaggio, righe, debito ---------------------------------------
    function lockPiece() {
        for (var i = 0; i < piece.cells.length; i++) {
            var x = piece.x + piece.cells[i][0];
            var y = piece.y + piece.cells[i][1];
            if (y < 0) { gameOver(); return; }
            board[y][x] = { color: piece.color, bug: (i === piece.bugAt) };
        }
        if (window.arcadeSfx) window.arcadeSfx.hit();

        clearRows();

        piecesToDebt--;
        if (piecesToDebt <= 0) {
            raiseDebtRow();
            piecesToDebt = debtInterval();
        }

        if (isRunning) spawnPiece();
        updateScoreUI();
    }

    function rowFull(r) {
        for (var c = 0; c < COLS; c++) if (!board[r][c]) return false;
        return true;
    }
    function rowHasBug(r) {
        for (var c = 0; c < COLS; c++) if (board[r][c] && board[r][c].bug) return true;
        return false;
    }

    function clearRows() {
        var cleared = [];
        var blocked = [];
        for (var r = ROWS - 1; r >= 0; r--) {
            if (!rowFull(r)) continue;
            // Meccanica propria: la riga è completa ma un bug la tiene aperta.
            // Non si chiude finché non lo schiacci col click.
            if (rowHasBug(r)) { blocked.push(r); continue; }
            cleared.push(r);
        }

        flashRows = blocked;

        if (!cleared.length) return;

        // Rimuove dall'alto verso il basso per non sfalsare gli indici
        cleared.sort(function (a, b) { return a - b; });
        for (var i = 0; i < cleared.length; i++) {
            board.splice(cleared[i], 1);
            var empty = [];
            for (var c2 = 0; c2 < COLS; c2++) empty.push(null);
            board.unshift(empty);
        }

        lines += cleared.length;
        // Più righe insieme valgono di più: 1→100, 2→300, 3→600, 4→1000
        var table = [0, 100, 300, 600, 1000];
        var gain = (table[cleared.length] || (cleared.length * 250)) * level;
        score += gain;

        if (window.arcadeSfx) {
            if (cleared.length >= 3) window.arcadeSfx.powerup();
            else window.arcadeSfx.pickup();
        }

        var newLevel = Math.floor(lines / 10) + 1;
        if (newLevel > level) {
            level = newLevel;
            dropMs = Math.max(120, 700 - (level - 1) * 55);
            if (window.arcadeSfx) window.arcadeSfx.levelup();
        }
    }

    function debtInterval() {
        // Il debito matura più in fretta salendo di livello, ma non oltre un
        // limite: sotto i 4 pezzi diventa ingiocabile.
        return Math.max(4, 9 - Math.floor(level / 2));
    }

    function raiseDebtRow() {
        // Tutto sale di una riga. Se la cima è occupata, la pila è arrivata
        // in cima: STACK OVERFLOW.
        for (var c = 0; c < COLS; c++) {
            if (board[0][c]) { gameOver(); return; }
        }
        board.shift();

        var gap = Math.floor(Math.random() * COLS);
        var bugCol = gap;
        while (bugCol === gap) bugCol = Math.floor(Math.random() * COLS);

        var row = [];
        for (var i = 0; i < COLS; i++) {
            row.push(i === gap ? null : { color: COLORS.debt, bug: (i === bugCol), debt: true });
        }
        board.push(row);

        // Il pezzo in volo deve salire con la pila, o si ritrova incastrato
        // dentro alla riga appena comparsa.
        if (piece && piece.y > 0 && !collides(piece.cells, piece.x, piece.y - 1)) piece.y--;

        shakeUntil = (typeof performance !== 'undefined' ? performance.now() : Date.now()) + 260;
        if (window.arcadeSfx) window.arcadeSfx.hit();
    }

    // ---- Schiacciare i bug ----------------------------------------------
    function handleSquash(e) {
        if (!isRunning || !canvas) return;
        var rect = canvas.getBoundingClientRect();
        // Il canvas è scalato dal CSS: riporta il click alle coordinate logiche.
        var sx = CANVAS_W / rect.width;
        var sy = CANVAS_H / rect.height;
        var px = (e.clientX - rect.left) * sx;
        var py = (e.clientY - rect.top) * sy;

        var c = Math.floor((px - FIELD_X) / CELL);
        var r = Math.floor((py - FIELD_Y) / CELL);
        if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return;

        var cell = board[r][c];
        if (!cell || !cell.bug) return;

        e.preventDefault();
        cell.bug = false;
        bugsSquashed++;
        score += 50;
        if (window.arcadeSfx) window.arcadeSfx.explode();

        // Schiacciato l'ultimo bug la riga può finalmente chiudersi.
        clearRows();
        updateScoreUI();
    }

    // ---- Input ----------------------------------------------------------
    function handleInput(e) {
        if (!isRunning) return;
        var code = e.code || e.key;
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].indexOf(code) > -1) e.preventDefault();

        switch (code) {
            case 'ArrowLeft':  case 'KeyA': move(-1); break;
            case 'ArrowRight': case 'KeyD': move(1); break;
            case 'ArrowDown':  case 'KeyS': softDrop(); break;
            case 'ArrowUp':    case 'KeyW': rotate(); break;
            case 'Space':      hardDrop(); break;
        }
    }

    // ---- Disegno ---------------------------------------------------------
    function draw() {
        if (!ctx) return;
        var now = (typeof performance !== 'undefined' ? performance.now() : Date.now());

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = COLORS.bg;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // Scossa quando risale il debito
        if (now < shakeUntil) {
            var k = (shakeUntil - now) / 260;
            ctx.translate((Math.random() - 0.5) * 6 * k, (Math.random() - 0.5) * 6 * k);
        }

        drawField();
        drawPanels();

        ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    function drawField() {
        var now = (typeof performance !== 'undefined' ? performance.now() : Date.now());

        // Cornice
        ctx.strokeStyle = COLORS.frame;
        ctx.lineWidth = 2;
        ctx.shadowColor = COLORS.frame;
        ctx.shadowBlur = 10;
        ctx.strokeRect(FIELD_X - 2, FIELD_Y - 2, FIELD_W + 4, FIELD_H + 4);
        ctx.shadowBlur = 0;

        // Griglia
        ctx.strokeStyle = COLORS.grid;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (var x = 0; x <= COLS; x++) {
            ctx.moveTo(FIELD_X + x * CELL, FIELD_Y);
            ctx.lineTo(FIELD_X + x * CELL, FIELD_Y + FIELD_H);
        }
        for (var y = 0; y <= ROWS; y++) {
            ctx.moveTo(FIELD_X, FIELD_Y + y * CELL);
            ctx.lineTo(FIELD_X + FIELD_W, FIELD_Y + y * CELL);
        }
        ctx.stroke();

        // Blocchi fissati
        for (var r = 0; r < ROWS; r++) {
            var flashing = flashRows.indexOf(r) > -1;
            for (var c = 0; c < COLS; c++) {
                var cell = board[r][c];
                if (!cell) continue;
                drawCell(FIELD_X + c * CELL, FIELD_Y + r * CELL, cell.color, cell.bug, flashing, now);
            }
        }

        // Proiezione del pezzo (dove atterrerebbe)
        if (piece && isRunning) {
            var gy = piece.y;
            while (!collides(piece.cells, piece.x, gy + 1)) gy++;
            if (gy !== piece.y) {
                // Contorno, non riempimento: riempita, la proiezione si legge
                // come un blocco già posato e confonde la lettura della pila.
                ctx.strokeStyle = piece.color;
                ctx.globalAlpha = 0.45;
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 3]);
                for (var i = 0; i < piece.cells.length; i++) {
                    ctx.strokeRect(
                        FIELD_X + (piece.x + piece.cells[i][0]) * CELL + 3.5,
                        FIELD_Y + (gy + piece.cells[i][1]) * CELL + 3.5,
                        CELL - 7, CELL - 7
                    );
                }
                ctx.setLineDash([]);
                ctx.globalAlpha = 1;
            }
            // Pezzo in volo
            for (var j = 0; j < piece.cells.length; j++) {
                var cy = piece.y + piece.cells[j][1];
                if (cy < 0) continue;
                drawCell(
                    FIELD_X + (piece.x + piece.cells[j][0]) * CELL,
                    FIELD_Y + cy * CELL,
                    piece.color, j === piece.bugAt, false, now
                );
            }
        }
    }

    function drawCell(px, py, color, isBug, flashing, now) {
        if (isBug) {
            // I bug pulsano: devono saltare all'occhio, sono l'unica cosa che
            // chiede un'azione diversa dai tasti.
            var pulse = 0.55 + 0.45 * Math.sin(now / 130);
            ctx.fillStyle = COLORS.bug;
            ctx.globalAlpha = pulse;
            ctx.shadowColor = COLORS.bug;
            ctx.shadowBlur = 12;
            ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
            // Zampette, così è un bug e non un quadrato rosso
            ctx.strokeStyle = '#2b0a08';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(px + 7, py + 9);  ctx.lineTo(px + CELL - 7, py + CELL - 9);
            ctx.moveTo(px + CELL - 7, py + 9); ctx.lineTo(px + 7, py + CELL - 9);
            ctx.stroke();
            return;
        }

        if (flashing) {
            ctx.globalAlpha = 0.45 + 0.55 * Math.abs(Math.sin(now / 110));
        }
        ctx.fillStyle = color;
        ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
        // Smusso: luce in alto a sinistra, ombra in basso a destra
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.fillRect(px + 2, py + 2, CELL - 4, 3);
        ctx.fillRect(px + 2, py + 2, 3, CELL - 4);
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.fillRect(px + 2, py + CELL - 5, CELL - 4, 3);
        ctx.fillRect(px + CELL - 5, py + 2, 3, CELL - 4);
        ctx.globalAlpha = 1;
    }

    function drawPanels() {
        ctx.textAlign = 'left';

        // --- Pannello sinistro: statistiche ---
        var lx = 28, ly = FIELD_Y + 10;
        panelLabel(T('stackLevel', 'LIVELLO'), lx, ly);
        panelValue(String(level), lx, ly + 26, '#ffce15');

        panelLabel(T('stackLines', 'RIGHE'), lx, ly + 76);
        panelValue(String(lines), lx, ly + 102, '#2ecc71');

        panelLabel(T('stackBugs', 'BUG SCHIACCIATI'), lx, ly + 152);
        panelValue(String(bugsSquashed), lx, ly + 178, '#e74c3c');

        panelLabel(T('score', 'PUNTEGGIO'), lx, ly + 228);
        panelValue(String(score), lx, ly + 254, '#00d9ff');

        // --- Pannello destro: prossimo pezzo + debito ---
        var rx = FIELD_X + FIELD_W + 40, ry = FIELD_Y + 10;
        panelLabel(T('stackNext', 'PROSSIMO'), rx, ry);
        if (nextPiece) {
            var w = pieceWidth(nextPiece.cells);
            var ox = rx + Math.floor((4 - w) * CELL / 2);
            for (var i = 0; i < nextPiece.cells.length; i++) {
                drawCell(
                    ox + nextPiece.cells[i][0] * CELL,
                    ry + 22 + nextPiece.cells[i][1] * CELL,
                    nextPiece.color, false, false, 0
                );
            }
            ctx.fillStyle = COLORS.panel;
            ctx.font = "9px 'Press Start 2P', monospace";
            ctx.fillText(nextPiece.id, rx, ry + 120);
        }

        // Debito tecnico: quanti pezzi mancano alla prossima riga
        panelLabel(T('stackDebt', 'DEBITO TECNICO'), rx, ry + 165);
        var barW = 150, barH = 12;
        var total = debtInterval();
        var filled = Math.max(0, Math.min(1, 1 - (piecesToDebt / total)));
        ctx.fillStyle = '#1a2530';
        ctx.fillRect(rx, ry + 185, barW, barH);
        ctx.fillStyle = filled > 0.75 ? '#e74c3c' : '#e67e22';
        ctx.fillRect(rx, ry + 185, Math.floor(barW * filled), barH);
        ctx.strokeStyle = 'rgba(230,126,34,0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(rx + 0.5, ry + 185.5, barW, barH);

        ctx.fillStyle = COLORS.panel;
        ctx.font = "8px 'Press Start 2P', monospace";
        ctx.fillText(piecesToDebt + ' ' + T('stackPiecesLeft', 'PEZZI'), rx, ry + 215);
    }

    function panelLabel(text, x, y) {
        ctx.fillStyle = '#5a6a7a';
        ctx.font = "8px 'Press Start 2P', monospace";
        ctx.fillText(text, x, y);
    }
    function panelValue(text, x, y, color) {
        ctx.fillStyle = color;
        ctx.font = "16px 'Press Start 2P', monospace";
        ctx.fillText(text, x, y);
    }

    function updateScoreUI() {
        var el = document.getElementById('stack-score');
        if (!el) return;
        var gs = window.EspooClicker ? window.EspooClicker.getGameState() : null;
        var highScore = (gs && gs.arcadeHighScores && gs.arcadeHighScores.stack) ? gs.arcadeHighScores.stack : 0;
        var sEl = el.querySelector('.val-score');
        var rEl = el.querySelector('.val-record');
        if (sEl) sEl.textContent = score;
        if (rEl) rEl.textContent = Math.max(score, highScore);
    }

    // ---- Game over -------------------------------------------------------
    function gameOver() {
        if (!isRunning) return;   // guard rientranza: niente record/reward doppi
        isRunning = false;
        stopLoop();

        if (window.arcadeSfx) window.arcadeSfx.gameover();

        var reward = 0;
        var rewardStr = '0';
        if (typeof bps !== 'undefined' && typeof Decimal !== 'undefined') {
            var bpsVal = (bps && bps.gt && bps.gt(0)) ? bps : new Decimal(1);
            reward = bpsVal.mul(score).mul(0.04);
            rewardStr = window.EspooClicker ? window.EspooClicker.formatNumber(reward) : String(Math.floor(parseFloat(reward.toString())));
        }

        var isNewRecord = false;
        if (window.EspooClicker) {
            var gs = window.EspooClicker.getGameState();
            if (score > 0 && reward) gs.score = gs.score.add(reward);
            if (!gs.arcadeHighScores) gs.arcadeHighScores = {};
            var currentHigh = gs.arcadeHighScores.stack || 0;
            if (score > currentHigh) {
                gs.arcadeHighScores.stack = score;
                isNewRecord = true;
            }
            window.EspooClicker.saveGame();
        }

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = 'rgba(231, 76, 60, 0.45)';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        var overlay = document.getElementById('stack-overlay');
        if (!overlay) return;
        overlay.style.display = 'flex';
        overlay.style.background = 'rgba(5, 7, 9, 0.92)';
        overlay.style.animation = 'arcadeGoFadeIn 0.4s ease forwards';
        overlay.innerHTML = '';

        var wrap = document.createElement('div');
        wrap.style.cssText = 'text-align:center;width:100%;max-width:420px;';

        var title = document.createElement('div');
        title.textContent = 'STACK OVERFLOW';
        title.style.cssText = "font-family:'Press Start 2P',monospace;font-size:1.25rem;color:#e74c3c;text-shadow:0 0 20px rgba(231,76,60,0.8),0 0 40px rgba(231,76,60,0.3);animation:arcadeGoGlitch 0.4s ease;margin-bottom:18px;letter-spacing:2px;";
        wrap.appendChild(title);

        var sep = document.createElement('div');
        sep.textContent = '════════════════';
        sep.style.cssText = 'color:rgba(231,76,60,0.25);letter-spacing:2px;margin-bottom:18px;font-family:monospace;';
        wrap.appendChild(sep);

        var sLabel = document.createElement('div');
        sLabel.textContent = T('score', 'PUNTEGGIO');
        sLabel.style.cssText = "font-family:'Press Start 2P',monospace;font-size:0.5rem;color:#5a6a7a;letter-spacing:3px;margin-bottom:6px;";
        wrap.appendChild(sLabel);

        var sVal = document.createElement('div');
        sVal.id = 'stack-go-score';
        sVal.textContent = '0';
        sVal.style.cssText = "font-family:'Press Start 2P',monospace;font-size:2.2rem;color:#00d9ff;text-shadow:0 0 12px rgba(0,217,255,0.8);margin-bottom:12px;animation:arcadeGoCountPulse 1.2s ease-in-out infinite;";
        wrap.appendChild(sVal);

        var detail = document.createElement('div');
        detail.textContent = lines + ' ' + T('stackLines', 'RIGHE') + '  ·  ' + bugsSquashed + ' ' + T('stackBugsShort', 'BUG');
        detail.style.cssText = "font-family:'Rajdhani',sans-serif;font-size:1rem;color:#7a8a9a;margin-bottom:14px;";
        wrap.appendChild(detail);

        if (score > 0) {
            var rDiv = document.createElement('div');
            rDiv.textContent = '+' + rewardStr + ' BUG';
            rDiv.style.cssText = "font-family:'Press Start 2P',monospace;font-size:0.75rem;color:#2ecc71;text-shadow:0 0 12px rgba(46,204,113,0.8);margin-bottom:14px;opacity:0;animation:arcadeGoFadeUp 0.4s ease 0.9s forwards;";
            wrap.appendChild(rDiv);
        }

        if (isNewRecord) {
            var recDiv = document.createElement('div');
            recDiv.textContent = T('record', '★ NUOVO RECORD! ★');
            recDiv.style.cssText = "font-family:'Press Start 2P',monospace;font-size:0.65rem;color:#ffce15;animation:arcadeGoRecordShine 1s ease-in-out infinite,arcadeGoFadeUp 0.4s ease 1.2s forwards;opacity:0;margin-bottom:14px;";
            wrap.appendChild(recDiv);
        }

        var bRetry = document.createElement('button');
        bRetry.className = 'arcade-btn';
        bRetry.innerHTML = '<i class="fa-solid fa-rotate-right"></i> RESTART';
        bRetry.style.cssText = 'margin-top:14px;opacity:0;animation:arcadeGoFadeUp 0.3s ease 1.0s forwards;';
        bRetry.onclick = function () {
            if (_goTimer) { clearTimeout(_goTimer); _goTimer = null; }
            window.startStackRun();
        };
        wrap.appendChild(bRetry);

        var retLabel = document.createElement('div');
        retLabel.textContent = '▸ ' + T('backToMenu', 'o torna al menu…') + ' ◂';
        retLabel.style.cssText = "font-family:'Rajdhani',sans-serif;font-size:0.85rem;color:#4a5a6a;letter-spacing:1px;margin-top:16px;opacity:0;animation:arcadeGoFadeUp 0.3s ease 1.5s forwards;";
        wrap.appendChild(retLabel);

        var bar = document.createElement('div');
        bar.style.cssText = 'width:50%;height:3px;background:#1a2530;border-radius:2px;margin:10px auto 0;overflow:hidden;opacity:0;animation:arcadeGoFadeUp 0.3s ease 1.5s forwards;';
        var barFill = document.createElement('div');
        barFill.style.cssText = 'width:0;height:100%;background:linear-gradient(90deg,#e74c3c,#e67e22);border-radius:2px;animation:arcadeGoBarFill 3s linear 1.5s forwards;';
        bar.appendChild(barFill);
        wrap.appendChild(bar);

        overlay.appendChild(wrap);

        var countTarget = score, countStart = Date.now(), countDuration = 700;
        var countIv = setInterval(function () {
            var progress = Math.min((Date.now() - countStart) / countDuration, 1);
            var el = document.getElementById('stack-go-score');
            if (el) el.textContent = Math.round(progress * countTarget);
            if (progress >= 1) clearInterval(countIv);
        }, 25);

        _goTimer = setTimeout(function () {
            _goTimer = null;
            window.exitStackGame();
        }, 4500);
    }

    // Esposto per i test: lo stato interno non è altrimenti osservabile.
    window.__stackDebug = {
        state: function () {
            return {
                score: score, lines: lines, level: level, bugs: bugsSquashed,
                piecesToDebt: piecesToDebt, running: isRunning,
                board: board, piece: piece
            };
        },
        setBoard: function (b) { board = b; },
        setPiece: function (p) { piece = p; },
        clearRows: clearRows,
        raiseDebt: raiseDebtRow,
        lock: lockPiece,
        rotateCells: rotateCells,
        collides: collides,
        fieldOrigin: function () { return { x: FIELD_X, y: FIELD_Y, cell: CELL, cols: COLS, rows: ROWS }; }
    };
})();
