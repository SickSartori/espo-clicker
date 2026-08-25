// ============================================================
// arcade-page.js
// Estratto da arcade.php (refactor strutturale, behavior-preserving).
// Ordine d'esecuzione invariato: stub EspooClicker -> virtual pad -> init.
// Dipendenze caricate prima: break_eternity (Decimal), arcade-loader (ArcadeLoader).
// ============================================================

// ----- Rilevamento touch robusto -----
// La media query (hover:none) and (pointer:coarse) NON matcha su diversi telefoni
// (browser che riportano hover:hover), e il virtual pad non compariva mai.
// Aggiungiamo una classe su <html> come fallback affidabile lato CSS.
(function () {
    try {
        var isTouch = ('ontouchstart' in window) ||
            (navigator.maxTouchPoints > 0) ||
            (navigator.msMaxTouchPoints > 0) ||
            (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
        if (isTouch) document.documentElement.classList.add('touch-device');
    } catch (e) {}
})();

// ----- Stub minimo EspooClicker per arcade (score sync via localStorage) -----
(function () {
    const STORAGE_KEY = 'espo_arcade_pending_rewards';
    const HIGHSCORE_KEY = 'espo_arcade_highscores';
    const AUDIO_KEY = 'espo_arcade_audio';

    // ----- Volumi dal gioco principale -------------------------------------
    // arcade.php e' un documento separato: niente store, niente AudioManager.
    // Il gioco principale pubblica qui la fotografia del mixer
    // (AudioManager._publishArcadeAudio in src/game/logic.ts); senza di essa
    // i giochi suonerebbero a volume pieno ignorando i cursori dell'utente.
    // Cache in memoria, invalidata dall'evento 'storage': il browser lo emette
    // nelle ALTRE finestre quando il gioco principale scrive, quindi muovere un
    // cursore nel mixer si sente subito anche nell'arcade gia' aperto.
    let _audioCache = null;
    function _readAudio() {
        if (_audioCache) return _audioCache;
        let a = null;
        try { a = JSON.parse(localStorage.getItem(AUDIO_KEY) || 'null'); } catch (e) {}
        if (!a || typeof a !== 'object') a = {};
        _audioCache = {
            masterVolume: typeof a.masterVolume === 'number' ? a.masterVolume : 1,
            sfxVolume:    typeof a.sfxVolume    === 'number' ? a.sfxVolume    : 1,
            musicVolume:  typeof a.musicVolume  === 'number' ? a.musicVolume  : 0.5,
            audioCustom:  (a.audioCustom && typeof a.audioCustom === 'object') ? a.audioCustom : {}
        };
        return _audioCache;
    }
    try {
        window.addEventListener('storage', function (e) {
            // e.key === null = storage svuotato in blocco → invalida comunque.
            if (!e || e.key === null || e.key === AUDIO_KEY) _audioCache = null;
        });
    } catch (e) {}

    function _readPending() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : { score: '0', scoreNum: 0 };
        } catch { return { score: '0', scoreNum: 0 }; }
    }

    function _writePending(score) {
        try {
            const cur = _readPending();
            // Accumula reward (Decimal compatible)
            const newScore = (typeof Decimal !== 'undefined')
                ? new Decimal(cur.score || '0').add(score).toString()
                : String(parseFloat(cur.score || '0') + parseFloat(score));
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                score: newScore,
                scoreNum: parseFloat(newScore),
                updated: Date.now()
            }));
        } catch (e) { console.warn('arcade reward write fail', e); }
    }

    function _readHighScores() {
        try {
            const raw = localStorage.getItem(HIGHSCORE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch { return {}; }
    }

    function _writeHighScores(hs) {
        try { localStorage.setItem(HIGHSCORE_KEY, JSON.stringify(hs)); } catch {}
    }

    // Stub minimo EspooClicker per arcade
    window.EspooClicker = {
        getGameState: function () {
            const scoreObj = {
                add: function (val) {
                    _writePending(typeof val === 'object' && val.toString ? val.toString() : val);
                    return scoreObj;
                },
                toString: function () { return '0'; }
            };
            return {
                score: scoreObj,
                // Skin state stub (default — gioco principale ha la skin equipaggiata vera)
                skins: { current: 'default', unlocked: ['default'] },
                arcadeHighScores: _readHighScores(),
                totalGoldenBugsClicked: 0,
                // Volumi reali dal mixer, non piu' uno stub con il solo username:
                // super-espo.js legge masterVolume/sfxVolume/audioCustom da qui.
                user: Object.assign({ username: 'Player' }, _readAudio())
            };
        },
        saveGame: function () {
            // High scores già salvati on-the-fly da update arcadeHighScores
            const gs = window._lastGameState;
            if (gs && gs.arcadeHighScores) _writeHighScores(gs.arcadeHighScores);
        },
        // Allineato a EspoV3.format.formatNumber (src/ui/format/number-format.ts):
        // stessa scala di suffissi e stessa semantica (2 decimali con virgola,
        // esponenziale oltre l'ultimo suffisso). La vecchia scala si fermava a "B"
        // e oltre 1e12 il wallet mostrava il numero esteso. Parsing in stringa:
        // regge anche i Decimal break_eternity oltre 1e308 (parseFloat → Infinity).
        formatNumber: function (n) {
            var SUFFIXES = ["", "k", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc",
                "Ud", "Dd", "Td", "Qad", "Qid", "Sxd", "Spd", "Ocd", "Nod", "Vg",
                "Uvg", "Dvg", "Tvg", "Qavg", "Qivg", "Sxvg", "Spvg", "Ocvg", "Novg", "Tg",
                "Utg", "Dtg", "Ttg", "Qatg", "Qitg", "Sxtg", "Sptg", "Octg", "Notg", "Qag"];
            var raw = (n === null || n === undefined) ? '' : String(n).trim();
            var m = /^([+-]?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(raw);
            if (!m) return '0';
            var base = Number(m[1] + m[2] + (m[3] ? '.' + m[3] : ''));
            if (base === 0) return '0';
            var shift = Math.floor(Math.log10(Math.abs(base)));
            var mant = base / Math.pow(10, shift);
            var exp = shift + (m[4] ? Number(m[4]) : 0);
            if (exp < 3) {
                var val = mant * Math.pow(10, exp);
                return Number.isInteger(val) ? val.toLocaleString('it-IT')
                    : val.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            }
            var idx = Math.floor(exp / 3);
            if (idx > 0 && idx < SUFFIXES.length) {
                var scaled = mant * Math.pow(10, exp % 3);
                if (scaled >= 999.995) { scaled /= 1000; idx++; }
                if (idx < SUFFIXES.length) return scaled.toFixed(2).replace('.', ',') + ' ' + SUFFIXES[idx];
            }
            if (Math.abs(Number(mant.toFixed(2))) >= 10) { mant /= 10; exp++; }
            return mant.toFixed(2).replace('.', ',') + 'e+' + exp;
        },
        showToast: function (msg, type) {
            // Toast DEDICATO dell'arcade: mostrato DENTRO il canvas del gioco attivo,
            // colorato in base al GIOCO (non posizione fissa di pagina). Stack in alto-centro.
            var host = document.getElementById('arcade-active-game-container');
            if (!host) return;

            var GAME_COLORS = { snake: '#2ecc71', space: '#e74c3c', asteroids: '#e67e22', superespo: '#9b59b6', invaders: '#2ecc71', centipede: '#f472b6' };
            var icons = { reward: '▸', achievement: '★', info: '◆', error: '✕', warning: '⚠' };
            var color = GAME_COLORS[window._arcadeActiveGame] || '#00d9ff';
            var icon = icons[type] || icons.info;
            var rgb = parseInt(color.slice(1, 3), 16) + ',' + parseInt(color.slice(3, 5), 16) + ',' + parseInt(color.slice(5, 7), 16);

            // Layer (creato on-demand) centrato in alto dentro il container del gioco
            var layer = host.querySelector('#arcade-toast-layer');
            if (!layer) {
                layer = document.createElement('div');
                layer.id = 'arcade-toast-layer';
                layer.style.cssText = 'position:absolute;top:14px;left:50%;transform:translateX(-50%);z-index:60;display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none;width:92%;';
                host.appendChild(layer);
            }

            var cleanMsg = msg.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{200D}]/gu, '').trim();

            var t = document.createElement('div');
            t.style.cssText =
                "font-family:'Press Start 2P',monospace;font-size:0.58rem;color:#fff;" +
                'padding:9px 15px;background:rgba(5,7,9,0.92);' +
                'border:2px solid ' + color + ';border-left-width:5px;border-radius:5px;' +
                'box-shadow:0 0 14px rgba(' + rgb + ',0.55);text-shadow:0 0 8px rgba(' + rgb + ',0.9);' +
                'letter-spacing:1px;line-height:1.5;max-width:100%;text-align:center;' +
                'animation:arcadeCanvasToastIn 0.3s ease forwards;';
            t.textContent = icon + ' ' + cleanMsg;
            layer.appendChild(t);

            setTimeout(function () {
                t.style.animation = 'arcadeCanvasToastOut 0.35s ease forwards';
                setTimeout(function () { if (t && t.remove) t.remove(); }, 350);
            }, 2400);
        },
        playSound: function () { /* no-op standalone (audio nel main game) */ },
        getGameStateRaw: function () { return _readHighScores(); }
    };

    // High score sync: intercetta updates → scrivi su localStorage
    const _origGS = window.EspooClicker.getGameState;
    window.EspooClicker.getGameState = function () {
        const gs = _origGS.call(this);
        window._lastGameState = gs;
        // Wrap arcadeHighScores per auto-save su modifica
        const hsObj = gs.arcadeHighScores;
        gs.arcadeHighScores = new Proxy(hsObj, {
            set(target, prop, value) {
                target[prop] = value;
                _writeHighScores(target);
                return true;
            }
        });
        return gs;
    };

    // Wallet header: Bug totali (saldo gioco principale + guadagni arcade) + pending.
    // Il saldo principale è mirrorato in localStorage ('espo_main_bugs') all'apertura
    // dell'arcade dal gioco main (vedi modals.js). Fallback: solo pending.
    function _readMainBugs() {
        try { return localStorage.getItem('espo_main_bugs') || null; } catch { return null; }
    }
    let _prevPendingVal = 0;
    let _walletPrimed = false; // primo updateWallet stabilisce la baseline senza popup

    function _showScorePopup(amount) {
        const wallet = document.getElementById('fs-wallet');
        if (!wallet || amount <= 0) return;
        const el = document.createElement('div');
        el.className = 'arcade-score-popup';
        el.textContent = '+' + window.EspooClicker.formatNumber(String(amount)) + ' BUG';
        const rect = wallet.getBoundingClientRect();
        el.style.left = rect.left + rect.width / 2 - 60 + 'px';
        el.style.top = rect.bottom + 6 + 'px';
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 2000);
    }

    function _flashWallet() {
        const main = document.querySelector('.wallet-main');
        const total = document.getElementById('fs-bug-total');
        if (main) {
            main.classList.remove('flash');
            void main.offsetWidth;
            main.classList.add('flash');
            setTimeout(() => main.classList.remove('flash'), 600);
        }
        if (total) {
            total.classList.add('counting');
            setTimeout(() => total.classList.remove('counting'), 500);
        }
    }

    function updateWallet() {
        const pending = _readPending();
        const pendStr = pending.score || '0';
        const mainStr = _readMainBugs() || '0';
        let totalStr;
        if (typeof Decimal !== 'undefined') {
            try { totalStr = new Decimal(mainStr).add(pendStr).toString(); }
            catch { totalStr = mainStr; }
        } else {
            totalStr = String((parseFloat(mainStr) || 0) + (parseFloat(pendStr) || 0));
        }
        const totalEl = document.getElementById('fs-bug-total');
        const pendValEl = document.getElementById('fs-pending-val');
        const pendBox = document.getElementById('fs-bug-pending');
        if (totalEl) totalEl.textContent = window.EspooClicker.formatNumber(totalStr);
        if (pendValEl) pendValEl.textContent = '+' + window.EspooClicker.formatNumber(pendStr);
        if (pendBox) pendBox.classList.toggle('has-pending', (parseFloat(pendStr) || 0) > 0);

        const curPending = parseFloat(pendStr) || 0;
        if (!_walletPrimed) {
            // Primo giro: stabilisce la baseline (niente popup "fantasma" per pending
            // residuo da una sessione precedente).
            _walletPrimed = true;
        } else if (curPending > _prevPendingVal && _prevPendingVal >= 0) {
            const delta = curPending - _prevPendingVal;
            _showScorePopup(delta);
            _flashWallet();
            if (window._arcadeSfxReward) window._arcadeSfxReward();
        } else if (curPending === 0 && _prevPendingVal > 0) {
            // Pending incassato dal gioco principale (mirror gia' aggiornato → il totale
            // NON cala): flash morbido sul totale come conferma dell'incasso.
            _flashWallet();
        }
        _prevPendingVal = curPending;
    }
    updateWallet();
    setInterval(updateWallet, 1500);

    // bps stub per reward calc
    window.bps = (typeof Decimal !== 'undefined') ? new Decimal(1) : 1;

    // Storage listener: se main game salva nuovo BPS, leggi
    window.addEventListener('storage', (e) => {
        if (e.key === 'espo_main_bps' && e.newValue && typeof Decimal !== 'undefined') {
            try { window.bps = new Decimal(e.newValue); } catch {}
        }
    });
    // Initial read
    try {
        const mainBps = localStorage.getItem('espo_main_bps');
        if (mainBps && typeof Decimal !== 'undefined') window.bps = new Decimal(mainBps);
    } catch {}
})();

// ----- VIRTUAL FLIPPER PAD — sintetizza KeyboardEvent + super-espo -----
(function () {
    const KEY_TO_CODE = {
        'ArrowUp':    { key: 'ArrowUp',    code: 'ArrowUp',    keyCode: 38 },
        'ArrowDown':  { key: 'ArrowDown',  code: 'ArrowDown',  keyCode: 40 },
        'ArrowLeft':  { key: 'ArrowLeft',  code: 'ArrowLeft',  keyCode: 37 },
        'ArrowRight': { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
        'Space':      { key: ' ',          code: 'Space',      keyCode: 32 },
        'KeyX':       { key: 'x',          code: 'KeyX',       keyCode: 88 },
        'Enter':      { key: 'Enter',      code: 'Enter',      keyCode: 13 }
    };

    // Super Espò Phaser usa window.espoCustomKeys per touch input
    const SUPER_ESPO_MAP = {
        'ArrowUp':    'up',
        'ArrowDown':  'down',
        'ArrowLeft':  'left',
        'ArrowRight': 'right'
    };

    // Web Audio click synth — no asset needed
    let _audioCtx = null;
    function _ensureAudio() {
        if (_audioCtx) return _audioCtx;
        try {
            _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {}
        return _audioCtx;
    }

    function playClick(type) {
        const ctx = _ensureAudio();
        if (!ctx) return;
        try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            // Profile diverso per tipo
            if (type === 'down') {
                osc.type = 'square';
                osc.frequency.setValueAtTime(380, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.04);
                gain.gain.setValueAtTime(0.12, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
                osc.start();
                osc.stop(ctx.currentTime + 0.07);
            } else {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(220, ctx.currentTime);
                gain.gain.setValueAtTime(0.06, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
                osc.start();
                osc.stop(ctx.currentTime + 0.05);
            }
        } catch (e) {}
    }

    function fireKey(type, descriptor) {
        // 1) KeyboardEvent sintetico → la maggior parte dei giochi
        try {
            const ev = new KeyboardEvent(type, {
                key: descriptor.key,
                code: descriptor.code,
                keyCode: descriptor.keyCode,
                which: descriptor.keyCode,
                bubbles: true,
                cancelable: true
            });
            window.dispatchEvent(ev);
            document.dispatchEvent(ev);
        } catch (e) {}

        // 2) Super-espò custom keys
        if (!window.espoCustomKeys) window.espoCustomKeys = {};
        const mapped = SUPER_ESPO_MAP[descriptor.code];
        if (mapped) {
            window.espoCustomKeys[mapped] = (type === 'keydown');
        }

        // 3) Click sound feedback
        playClick(type === 'keydown' ? 'down' : 'up');
    }

    // ----- Tasto START del pad: a cosa è collegato ------------------------
    // Era un tasto finto. Sintetizzava un Enter su window/document, ma nessuno
    // dei sette cabinati ascolta Enter (verificato: la stringa non compare in
    // nessun arcade/*/js/*.js), e l'unico Enter gestito nella shell — quello
    // che avvia il gioco dal menu — esce subito se si sta giocando. Risultato:
    // su telefono il pad mostrava un bottone grosso e rosso che non faceva
    // niente, cioè peggio di un bottone assente, perché insegna che i comandi
    // non rispondono.
    //
    // Nasconderlo era la via corta, ma sul telefono serve davvero: è l'unico
    // tasto che può ricominciare una partita senza costringere a centrare col
    // dito il RESTART disegnato dentro al canvas, che a fine partita è
    // rimpicciolito dalla scala del canvas stesso. Lo si collega quindi al
    // bottone principale dell'overlay del gioco attivo — INIZIA PARTITA prima
    // di cominciare, RESTART dopo il game over — che è esattamente ciò che un
    // tasto START fa su un cabinato vero.
    //
    // Restava il caso "partita in corso": lì non c'è nessun overlay e quindi
    // niente da premere. Invece di far finta di funzionare, il tasto si spegne
    // (disabled + opacità ridotta) e si riaccende da solo quando compare
    // l'overlay — lo stato viene rinfrescato da configurePad, che il polling
    // di syncPadVisibility richiama ogni 400ms.
    function overlayPrimaryBtn() {
        const host = document.getElementById('arcade-active-game-container');
        if (!host || !host.style.display || host.style.display === 'none') return null;
        const overlays = host.querySelectorAll('.arcade-ui-overlay');
        for (let i = 0; i < overlays.length; i++) {
            const ov = overlays[i];
            // I giochi nascondono l'overlay con style.display='none' quando si gioca.
            if (getComputedStyle(ov).display === 'none') continue;
            // .secondary è il MENU della topbar: non è dentro l'overlay, ma la
            // esclusione costa nulla e protegge da futuri riusi della classe.
            const btn = ov.querySelector('.arcade-btn:not(.secondary)');
            if (btn) return btn;
        }
        return null;
    }

    function bindBtn(btn) {
        const keyName = btn.getAttribute('data-key');
        const desc = KEY_TO_CODE[keyName];
        if (!desc) return;

        let active = false;
        const press = (e) => {
            if (e) e.preventDefault();
            if (active) return;
            active = true;
            btn.classList.add('pressed');
            if (navigator.vibrate) navigator.vibrate(10); /* aptico; no-op dove non supportato (iOS) */
            fireKey('keydown', desc);
            // START: l'Enter sintetico resta (se un domani un gioco lo ascolta,
            // funziona da solo), ma l'azione vera è premere il bottone
            // dell'overlay — lo stesso click che farebbe il dito sul canvas.
            if (keyName === 'Enter') {
                const target = overlayPrimaryBtn();
                if (target) target.click();
            }
        };
        const release = (e) => {
            if (e) e.preventDefault();
            if (!active) return;
            active = false;
            btn.classList.remove('pressed');
            fireKey('keyup', desc);
        };

        btn.addEventListener('pointerdown', press);
        btn.addEventListener('pointerup', release);
        btn.addEventListener('pointerleave', release);
        btn.addEventListener('pointercancel', release);
        btn.addEventListener('lostpointercapture', release);
    }

    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('#arcade-virtual-pad .vp-btn, #arcade-virtual-pad .vp-action-btn').forEach(bindBtn);
    });

    // --- Per-game control config ---
    const GAME_CONTROLS = {
        snake:     { dpad: ['up','down','left','right'], actions: [],                          labels: {} },
        space:     { dpad: ['up','down','left','right'], actions: ['fire'],                    labels: { fire: 'FIRE' } },
        asteroids: { dpad: ['up','left','right'],        actions: ['fire'],                    labels: { fire: 'FIRE', up: 'BOOST' } },
        superespo: { dpad: ['up','down','left','right'], actions: ['x'],                       labels: { x: 'FIRE' } },
        invaders:  { dpad: ['left','right'],             actions: ['fire'],                    labels: { fire: 'FIRE' } },
        centipede: { dpad: ['up','down','left','right'], actions: ['fire'],                    labels: { fire: 'FIRE' } },
        // Stack Overflow: ▲ ruota, ▼ scende, SPAZIO tuffo. I bug si schiacciano
        // toccandoli direttamente sul campo, non serve un tasto sul pad.
        stack:     { dpad: ['up','down','left','right'], actions: ['fire'],                    labels: { fire: 'DROP', up: 'RUOTA' } }
    };

    // Legenda comandi da TASTIERA per la tabella desktop (a sinistra).
    const _h = (window.ARCADE_TXT && window.ARCADE_TXT.hint) || {};
    const _sp = _h.space || 'SPAZIO';
    const GAME_LEGEND = {
        snake:     [['◀ ▲ ▶ ▼', _h.moveSnake || 'Muovi il serpente']],
        space:     [['◀ ▶ ▲ ▼', _h.moveShip || 'Muovi la nave'], [_sp, _h.fire || 'Spara']],
        asteroids: [['◀ ▶', _h.rotate || 'Ruota'], ['▲', _h.thrust || 'Spinta'], [_sp, _h.fire || 'Spara']],
        superespo: [['◀ ▶', _h.run || 'Corri'], ['▲', _h.jump || 'Salta'], ['▼', _h.crouch || 'Abbassati'], ['X / F', _h.fireball || 'Palla di fuoco']],
        invaders:  [['◀ ▶', _h.move || 'Muovi'], [_sp, _h.fire || 'Spara']],
        centipede: [['◀ ▲ ▶ ▼', _h.move || 'Muovi'], [_sp, _h.fire || 'Spara']],
        stack:     [['◀ ▶', _h.move || 'Muovi'], ['▲', _h.rotate || 'Ruota'], ['▼', _h.softDrop || 'Scendi'], [_sp, _h.hardDrop || 'Tuffo'], ['CLICK', _h.squash || 'Schiaccia i bug']]
    };

    // Popola/aggiorna la tabella comandi (desktop). La visibilità è gestita via CSS
    // (body.playing + media desktop). Aggiorna solo quando cambia il gioco attivo.
    function updateCmdTable(gameActive, gameKey) {
        const tbl = document.getElementById('arcade-cmd-table');
        if (!tbl) return;
        if (!gameActive || !gameKey) { tbl.removeAttribute('data-game'); return; }
        if (tbl.getAttribute('data-game') === gameKey) return;
        const legend = GAME_LEGEND[gameKey] || [];
        let html = '<div class="cmd-title">COMANDI</div>';
        legend.forEach(function (row) {
            html += '<div class="cmd-row"><span class="cmd-key">' + row[0] + '</span><span class="cmd-act">' + row[1] + '</span></div>';
        });
        tbl.innerHTML = html;
        tbl.setAttribute('data-game', gameKey);
    }

    window._arcadeActiveGame = null;
    window._arcadeSelectedGame = 'snake'; // gioco SELEZIONATO (su click) — è ciò che GIOCA avvia
    window._arcadeRunningGame = null;    // gioco effettivamente avviato

    // Mappe funzioni per-gioco: build (costruisce schermo) + run (avvia) + exit (chiude)
    const GAME_BUILD = { snake: 'initSnakeGame', space: 'initSpaceGame', asteroids: 'startAsteroidsGame', superespo: 'startSuperEspoGame', invaders: 'startInvadersGame', centipede: 'startCentipedeGame', stack: 'initStackGame' };
    const GAME_RUN   = { snake: 'startSnakeRun', space: 'startSpaceRun', asteroids: 'startAsteroidsRun', superespo: 'startSuperEspoRun', invaders: 'startInvadersRun', centipede: 'startCentipedeRun', stack: 'startStackRun' };
    const GAME_EXIT  = { snake: 'exitSnakeGame', space: 'exitSpaceGame', asteroids: 'exitAsteroidsGame', superespo: 'exitSuperEspoGame', invaders: 'exitInvadersGame', centipede: 'exitCentipedeGame', stack: 'exitStackGame' };

    // Chiude il gioco attualmente in esecuzione (se presente).
    window.exitArcadeCurrentGame = function () {
        // Il game over lascia un timer di ritorno automatico: se non lo si
        // annulla qui, scade DOPO che l'utente ha avviato un altro cabinato e
        // chiude quello, non questo.
        if (typeof window._arcadeCancelGameOver === 'function') window._arcadeCancelGameOver();
        const k = window._arcadeRunningGame;
        if (k && GAME_EXIT[k] && typeof window[GAME_EXIT[k]] === 'function') {
            try { window[GAME_EXIT[k]](); } catch (e) {}
        }
        window._arcadeRunningGame = null;
        // Torna subito all'anteprima (no attesa del polling)
        const previewMon = document.querySelector('#arcade-game-selector > .arcade-preview-monitor');
        if (previewMon) previewMon.classList.remove('hidden');
    };

    // Avvia il gioco attualmente in ANTEPRIMA (chiamato dal bottone GIOCA).
    // build() costruisce lo schermo, run() avvia subito la partita (salta l'AVVIA).
    window.launchArcadeGame = function () {
        // Come sopra: si puo' arrivare qui anche senza passare da exit (click
        // diretto su un'altra voce del menu mentre e' a schermo un game over).
        if (typeof window._arcadeCancelGameOver === 'function') window._arcadeCancelGameOver();
        const key = window._arcadeSelectedGame;
        if (!key || !GAME_BUILD[key]) return;
        const buildFn = window[GAME_BUILD[key]];
        const runFn = window[GAME_RUN[key]];
        if (typeof buildFn !== 'function') {
            // Gioco non ancora caricato (es. Super Espò se la CDN di Phaser e' giu').
            // Niente piu' return silenzioso: diamo feedback nell'anteprima.
            const descEl = document.getElementById('preview-desc');
            const stillLoading = window.ArcadeLoader && window.ArcadeLoader.isLoading && window.ArcadeLoader.isLoading();
            if (descEl) {
                descEl.textContent = stillLoading
                    ? ((window.ARCADE_TXT && window.ARCADE_TXT.loading) || 'Caricamento in corso, riprova tra un istante…')
                    : ((window.ARCADE_TXT && window.ARCADE_TXT.gameUnavailable) || 'Gioco non disponibile (connessione assente?). Riprova piu\' tardi.');
                descEl.style.color = '#ff8a8a';
            }
            return;
        }
        // Nascondi subito la preview (classe + body.playing) → niente "doppio form"
        const previewMon = document.querySelector('#arcade-game-selector > .arcade-preview-monitor');
        if (previewMon) previewMon.classList.add('hidden');
        document.body.classList.add('playing');
        window._arcadeActiveGame = key;
        window._arcadeRunningGame = key;
        buildFn();
        // Il build dei giochi nasconde il selector (legacy): riannullalo subito così il
        // canvas resta visibile senza attendere il polling (niente blink).
        const selector = document.getElementById('arcade-game-selector');
        if (selector) selector.style.display = '';
        if (previewMon) previewMon.classList.add('hidden');
        // run() sincrono (mantiene il gesto utente per l'audio). Se fallisce, resta l'AVVIA.
        if (typeof runFn === 'function') {
            try { runFn(); } catch (e) { console.warn('[arcade] run() fallita, resta il pulsante AVVIA', e); }
        }
    };

    function configurePad(gameKey) {
        const pad = document.getElementById('arcade-virtual-pad');
        if (!pad) return;
        const cfg = GAME_CONTROLS[gameKey];
        if (!cfg) return;

        const dpadMap = { up: '.vp-up', down: '.vp-down', left: '.vp-left', right: '.vp-right' };
        Object.keys(dpadMap).forEach(dir => {
            const btn = pad.querySelector(dpadMap[dir]);
            if (btn) btn.style.display = cfg.dpad.includes(dir) ? '' : 'none';
        });

        const fireBtn = pad.querySelector('.vp-action-btn.cyan');
        const xBtn = pad.querySelector('.vp-action-btn.yellow');
        const startBtn = pad.querySelector('.vp-action-btn[data-key="Enter"]');
        if (fireBtn) {
            fireBtn.style.display = cfg.actions.includes('fire') ? '' : 'none';
            fireBtn.textContent = (cfg.labels && cfg.labels.fire) || 'FIRE';
        }
        if (xBtn) {
            xBtn.style.display = cfg.actions.includes('x') ? '' : 'none';
            xBtn.textContent = (cfg.labels && cfg.labels.x) || 'X';
        }
        if (startBtn) {
            startBtn.style.display = '';
            // Acceso solo quando c'è davvero qualcosa da avviare (vedi il
            // commento su overlayPrimaryBtn): durante la partita non c'è
            // overlay, e un tasto spento è un'informazione, non un guasto.
            const armed = !!overlayPrimaryBtn();
            startBtn.disabled = !armed;   // disabled = i pointer event non partono
            startBtn.style.opacity = armed ? '' : '0.35';
            startBtn.style.cursor = armed ? '' : 'default';
        }

        // Update D-pad labels if custom
        if (cfg.labels) {
            Object.keys(dpadMap).forEach(dir => {
                const btn = pad.querySelector(dpadMap[dir]);
                if (btn && cfg.labels[dir]) {
                    btn.setAttribute('title', cfg.labels[dir]);
                }
            });
        }
    }

    // Sul telefono in verticale lo spazio è tutto altezza, e il nome del gioco
    // costava una riga intera di topbar: dentro la barra ha 79px, mentre
    // "STACK OVERFLOW" ne chiede 132 e uscirebbe troncato. Nell'header, dove il
    // portafoglio si toglie di mezzo mentre si gioca, ce ne sono 299 e ci sta
    // intero. Lo scambio vale ovunque, non solo su telefono: l'header che dice
    // a cosa stai giocando è un miglioramento anche su desktop.
    let fsTitleOrig = null;
    function syncHeaderTitle(gameActive) {
        const fsTitle = document.querySelector('.fs-title');
        if (!fsTitle) return;
        // L'originale si conserva una volta sola: syncPadVisibility gira ogni
        // 400ms e rileggerlo a ogni giro salverebbe il nome del gioco come
        // "originale", lasciando l'header sbagliato per sempre dopo l'uscita.
        if (fsTitleOrig === null) fsTitleOrig = fsTitle.innerHTML;

        if (gameActive) {
            const label = document.querySelector('.topbar-game-label');
            const nome = label ? label.textContent.trim() : '';
            if (!nome || fsTitle.dataset.game === nome) return;
            // textContent e non innerHTML: il nome arriva dal markup del gioco,
            // e non c'è motivo di reinterpretarlo come HTML.
            fsTitle.textContent = nome;
            const ico = document.createElement('i');
            ico.className = 'fa-solid fa-gamepad';
            ico.style.color = '#00d9ff';
            fsTitle.prepend(ico, ' ');
            fsTitle.dataset.game = nome;
        } else if (fsTitle.dataset.game) {
            fsTitle.innerHTML = fsTitleOrig;
            delete fsTitle.dataset.game;
        }
    }

    function syncPadVisibility() {
        const pad = document.getElementById('arcade-virtual-pad');
        const gc = document.getElementById('arcade-active-game-container');
        const selector = document.getElementById('arcade-game-selector');
        const previewMon = document.querySelector('#arcade-game-selector > .arcade-preview-monitor');
        if (!gc) return;
        const gameActive = gc.style.display && gc.style.display !== 'none';

        if (pad) pad.classList.toggle('active', !!gameActive);
        document.body.classList.toggle('playing', !!gameActive);

        // Partita finita (es. game over → ritorno automatico): azzera il gioco in corso
        if (!gameActive) window._arcadeRunningGame = null;

        // Keep selector visible (games try to hide it) — toggle preview instead
        if (selector && selector.style.display === 'none') selector.style.display = '';
        if (previewMon) previewMon.classList.toggle('hidden', !!gameActive);

        // Stato "running": il gioco avviato resta evidenziato e visibile nella lista.
        const activeGame = window._arcadeActiveGame;
        document.querySelectorAll('.arcade-menu-item').forEach(it => {
            it.classList.toggle('running', !!gameActive && it.getAttribute('data-game') === activeGame);
        });

        // Tabella comandi (desktop): aggiorna col gioco attivo
        updateCmdTable(!!gameActive, activeGame);

        // Header: mentre si gioca dice il nome del gioco, fuori torna il marchio
        syncHeaderTitle(!!gameActive);

        if (gameActive && window._arcadeActiveGame) {
            configurePad(window._arcadeActiveGame);
        }
    }
    setInterval(syncPadVisibility, 400);
})();

// ----- Inizializza arcade (no lazy: pagina dedicata) -----
document.addEventListener('DOMContentLoaded', () => {
    // Gate login: se non loggato a Espò Clicker, non avviare la Sala Giochi
    // (la schermata "riservata" è già stata mostrata dallo script gate in arcade.php).
    if (window.__arcadeAuthOk === false) {
        console.warn('[arcade.php] Accesso negato: login richiesto.');
        return;
    }
    if (window.ArcadeLoader && window.ArcadeLoader.load) {
        window.ArcadeLoader.load().then(() => {
            console.log('[arcade.php] Arcade caricato OK');

            // Hover/click logica menu (come in modals.js originale)
            // --- Arcade SFX (Web Audio synth — no assets) ---
            let _sfxCtx = null;
            function _sfx() {
                if (_sfxCtx) return _sfxCtx;
                try { _sfxCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
                return _sfxCtx;
            }
            function sfxHover() {
                const c = _sfx(); if (!c) return;
                const o = c.createOscillator(), g = c.createGain();
                o.connect(g); g.connect(c.destination);
                o.type = 'square';
                o.frequency.setValueAtTime(1200, c.currentTime);
                o.frequency.exponentialRampToValueAtTime(800, c.currentTime + 0.04);
                g.gain.setValueAtTime(0.06, c.currentTime);
                g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.05);
                o.start(); o.stop(c.currentTime + 0.06);
            }
            function sfxCoin() {
                const c = _sfx(); if (!c) return;
                [880, 1320].forEach((freq, i) => {
                    const o = c.createOscillator(), g = c.createGain();
                    o.connect(g); g.connect(c.destination);
                    o.type = 'square';
                    const t = c.currentTime + i * 0.08;
                    o.frequency.setValueAtTime(freq, t);
                    g.gain.setValueAtTime(0.10, t);
                    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
                    o.start(t); o.stop(t + 0.13);
                });
            }
            function sfxReward() {
                const c = _sfx(); if (!c) return;
                [523, 659, 784, 1047].forEach((freq, i) => {
                    const o = c.createOscillator(), g = c.createGain();
                    o.connect(g); g.connect(c.destination);
                    o.type = 'triangle';
                    const t = c.currentTime + i * 0.07;
                    o.frequency.setValueAtTime(freq, t);
                    g.gain.setValueAtTime(0.08, t);
                    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
                    o.start(t); o.stop(t + 0.16);
                });
            }
            window._arcadeSfxReward = sfxReward;

            let selectedItem = null;

            // Aggiorna SOLO il contenuto dell'anteprima (titolo/desc/hi-score/colore).
            // Non tocca la selezione: usato sia per l'hover (peek) sia per la selezione.
            function renderPreview(item) {
                if (!item) return;
                const gameKey = item.getAttribute('data-game');
                const title = item.getAttribute('data-title');
                const color = item.getAttribute('data-color') || '#00d9ff';
                const desc = item.getAttribute('data-desc');
                const titleEl = document.getElementById('preview-title');
                const descEl = document.getElementById('preview-desc');
                const scoreEl = document.getElementById('preview-highscore');
                if (titleEl) { titleEl.textContent = title; titleEl.style.color = color; }
                if (descEl) descEl.textContent = desc;
                const hs = (window.EspooClicker.getGameState().arcadeHighScores || {})[gameKey] || 0;
                if (scoreEl) scoreEl.textContent = hs;
                const r = parseInt(color.slice(1, 3), 16), g = parseInt(color.slice(3, 5), 16), b = parseInt(color.slice(5, 7), 16);
                document.documentElement.style.setProperty('--game-color', color);
                document.documentElement.style.setProperty('--game-rgb', r + ', ' + g + ', ' + b);
            }

            // SELEZIONE (solo su click): è il gioco che GIOCA avvierà + evidenziato (.active).
            function selectItem(item) {
                if (!item) return;
                selectedItem = item;
                document.querySelectorAll('.arcade-menu-item').forEach(i => {
                    i.classList.remove('active');
                    // A11y: roving tabindex + stato selezione per screen reader (solo sulle voci option, non sulla locked)
                    if (i.getAttribute('role') === 'option' && i.getAttribute('aria-disabled') !== 'true') {
                        i.setAttribute('aria-selected', 'false');
                        i.setAttribute('tabindex', '-1');
                    }
                });
                item.classList.add('active');
                if (item.getAttribute('role') === 'option') {
                    item.setAttribute('aria-selected', 'true');
                    item.setAttribute('tabindex', '0');
                }
                window._arcadeSelectedGame = item.getAttribute('data-game');
                const color = item.getAttribute('data-color') || '#00d9ff';
                const r = parseInt(color.slice(1, 3), 16), g = parseInt(color.slice(3, 5), 16), b = parseInt(color.slice(5, 7), 16);
                item.style.setProperty('--game-color', color);
                item.style.setProperty('--game-rgb', r + ', ' + g + ', ' + b);
                renderPreview(item);
            }

            document.querySelectorAll('.arcade-menu-item:not(.locked)').forEach(item => {
                // HOVER = solo anteprima (peek): NON cambia la selezione.
                item.addEventListener('mouseenter', () => { renderPreview(item); sfxHover(); });
                // CLICK = selezione: è ciò che il bottone GIOCA avvia.
                item.addEventListener('click', () => {
                    if (window._arcadeRunningGame) window.exitArcadeCurrentGame();
                    selectItem(item);
                    sfxCoin();
                    item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                });
            });

            // Uscendo dalla lista, l'anteprima torna al gioco SELEZIONATO (annulla il peek).
            const menuList = document.querySelector('.arcade-menu-list');
            if (menuList) menuList.addEventListener('mouseleave', () => renderPreview(selectedItem));

            // Selezione iniziale = primo gioco
            const firstGame = document.querySelector('.arcade-menu-item:not(.locked)');
            if (firstGame) selectItem(firstGame);

            // A11y: navigazione del menu da tastiera (frecce su/giu' per scegliere, Invio per giocare).
            // Attiva solo quando NON si sta giocando: durante una partita i tasti vanno al gioco.
            const navItems = Array.from(document.querySelectorAll('.arcade-menu-item:not(.locked)'));
            if (navItems.length) {
                document.addEventListener('keydown', (e) => {
                    if (window._arcadeRunningGame || document.body.classList.contains('playing')) return;
                    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                        e.preventDefault();
                        let idx = navItems.indexOf(selectedItem);
                        if (idx < 0) idx = 0;
                        idx = (e.key === 'ArrowDown') ? (idx + 1) % navItems.length
                                                      : (idx - 1 + navItems.length) % navItems.length;
                        selectItem(navItems[idx]);
                        sfxHover();
                        navItems[idx].scrollIntoView({ block: 'nearest' });
                        // A11y: porta il focus reale sulla voce così lo screen reader annuncia la selezione
                        if (typeof navItems[idx].focus === 'function') navItems[idx].focus();
                    } else if (e.key === 'Enter') {
                        e.preventDefault();
                        if (window.launchArcadeGame) window.launchArcadeGame();
                    }
                });
            }
        }).catch(err => {
            console.error('[arcade.php] Caricamento fallito:', err);
        });
    }
});

// ============================================================
// SHARED ARCADE SFX — Web Audio synth, no external assets
// Games call: arcadeSfx.shoot(), arcadeSfx.hit(), etc.
// ============================================================
(function () {
    let _ctx = null;
    function ctx() {
        if (_ctx) return _ctx;
        try { _ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
        return _ctx;
    }
    function tone(freq, dur, type, vol, ramp) {
        const c = ctx(); if (!c) return;
        const o = c.createOscillator(), g = c.createGain();
        o.connect(g); g.connect(c.destination);
        o.type = type || 'square';
        o.frequency.setValueAtTime(freq, c.currentTime);
        if (ramp) o.frequency.exponentialRampToValueAtTime(ramp, c.currentTime + dur);
        g.gain.setValueAtTime(vol || 0.08, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
        o.start(); o.stop(c.currentTime + dur + 0.01);
    }

    window.arcadeSfx = {
        shoot: function () { tone(880, 0.06, 'square', 0.07, 440); },
        hit: function () { tone(200, 0.15, 'sawtooth', 0.09, 60); },
        explode: function () {
            const c = ctx(); if (!c) return;
            const buf = c.createBuffer(1, c.sampleRate * 0.2, c.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
            const s = c.createBufferSource(), g = c.createGain();
            s.buffer = buf; s.connect(g); g.connect(c.destination);
            g.gain.setValueAtTime(0.10, c.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2);
            s.start(); s.stop(c.currentTime + 0.21);
        },
        die: function () {
            [400, 300, 200, 120].forEach(function (f, i) {
                setTimeout(function () { tone(f, 0.12, 'square', 0.08); }, i * 80);
            });
        },
        pickup: function () { tone(660, 0.05, 'square', 0.06); tone(880, 0.08, 'square', 0.06); },
        powerup: function () {
            [523, 659, 784, 1047].forEach(function (f, i) {
                setTimeout(function () { tone(f, 0.1, 'triangle', 0.07); }, i * 60);
            });
        },
        levelup: function () {
            [440, 554, 659, 880].forEach(function (f, i) {
                setTimeout(function () { tone(f, 0.15, 'square', 0.06); }, i * 100);
            });
        },
        gameover: function () {
            [440, 415, 392, 349, 330, 200].forEach(function (f, i) {
                setTimeout(function () { tone(f, 0.2, 'square', 0.07); }, i * 150);
            });
        },
        menuBack: function () { tone(300, 0.06, 'triangle', 0.06, 200); }
    };
})();

// ============================================================
// SHARED GAME OVER — overlay animato in stile "Snake" per TUTTI i giochi.
// Le keyframes (arcadeGo*) sono definite in snake.css, caricato globalmente.
// opts: { overlay, score, rewardStr, isNewRecord, statLabel, statValue,
//         statColor, onReturn, onRetry, delay }
//   - se onRetry è fornito → mostra bottone RESTART (ricomincia) + auto-ritorno al menu
//   - se NON clicchi RESTART entro `delay` → ritorno automatico al menu (con barra)
// ============================================================
window.showArcadeGameOver = function (opts) {
    opts = opts || {};
    var overlay = opts.overlay;
    var score = opts.score || 0;
    var rewardStr = opts.rewardStr || null;
    var isNewRecord = !!opts.isNewRecord;
    var statLabel = (opts.statLabel != null) ? opts.statLabel : null;
    var statValue = (opts.statValue != null) ? opts.statValue : null;
    var statColor = opts.statColor || '#e67e22';
    var onReturn = (typeof opts.onReturn === 'function') ? opts.onReturn : function () {};
    var onRetry = (typeof opts.onRetry === 'function') ? opts.onRetry : null;
    var delay = opts.delay || 4500;
    // Titolo personalizzabile: serve a chi ha una battuta finale propria
    // (Stack Overflow si chiama così apposta). Chi non lo passa resta com'era.
    var title = opts.title || 'GAME OVER';
    var titleColor = opts.titleColor || '#e74c3c';

    if (!overlay) { onReturn(); return; }

    overlay.style.display = 'flex';
    overlay.style.background = 'rgba(5, 7, 9, 0.92)';
    overlay.style.animation = 'arcadeGoFadeIn 0.4s ease forwards';
    overlay.innerHTML = '';

    var wrap = document.createElement('div');
    wrap.style.cssText = 'text-align:center;width:100%;max-width:420px;';

    var titleEl = document.createElement('div');
    titleEl.textContent = title;
    // I titoli lunghi (es. STACK OVERFLOW) non devono uscire dal riquadro:
    // font leggermente più piccolo oltre i 10 caratteri.
    var titleSize = title.length > 10 ? '1.25rem' : '1.6rem';
    titleEl.style.cssText = "font-family:'Press Start 2P',monospace;font-size:" + titleSize + ";color:" + titleColor +
        ";text-shadow:0 0 20px " + titleColor + ",0 0 40px rgba(0,0,0,0.3);animation:arcadeGoGlitch 0.4s ease;margin-bottom:18px;letter-spacing:3px;";
    wrap.appendChild(titleEl);

    var sep = document.createElement('div');
    sep.textContent = '════════════════';
    sep.style.cssText = 'color:rgba(231,76,60,0.25);letter-spacing:2px;margin-bottom:16px;font-family:monospace;';
    wrap.appendChild(sep);

    if (statLabel != null && statValue != null) {
        var st = document.createElement('div');
        st.innerHTML = statLabel + ': <span style="color:' + statColor + '">' + statValue + '</span>';
        st.style.cssText = "font-family:'Press Start 2P',monospace;font-size:11px;color:#9aa8b5;letter-spacing:2px;margin-bottom:14px;";
        wrap.appendChild(st);
    }

    var sLabel = document.createElement('div');
    sLabel.textContent = (window.ARCADE_TXT && window.ARCADE_TXT.score) || 'PUNTEGGIO';
    sLabel.style.cssText = "font-family:'Press Start 2P',monospace;font-size:11px;color:#9aa8b5;letter-spacing:3px;margin-bottom:6px;";
    wrap.appendChild(sLabel);

    var sVal = document.createElement('div');
    sVal.textContent = '0';
    sVal.style.cssText = "font-family:'Press Start 2P',monospace;font-size:2.2rem;color:#00d9ff;text-shadow:0 0 12px rgba(0,217,255,0.8);margin-bottom:16px;animation:arcadeGoCountPulse 1.2s ease-in-out infinite;";
    wrap.appendChild(sVal);

    if (rewardStr) {
        var rDiv = document.createElement('div');
        rDiv.textContent = '+' + rewardStr + ' BUG';
        rDiv.style.cssText = "font-family:'Press Start 2P',monospace;font-size:0.75rem;color:#2ecc71;text-shadow:0 0 12px rgba(46,204,113,0.8);margin-bottom:12px;opacity:0;animation:arcadeGoFadeUp 0.4s ease 0.9s forwards;";
        wrap.appendChild(rDiv);
    }

    if (isNewRecord) {
        var recDiv = document.createElement('div');
        recDiv.textContent = (window.ARCADE_TXT && window.ARCADE_TXT.record) || '★ NUOVO RECORD! ★';
        recDiv.style.cssText = "font-family:'Press Start 2P',monospace;font-size:0.65rem;color:#ffce15;animation:arcadeGoRecordShine 1s ease-in-out infinite,arcadeGoFadeUp 0.4s ease 1.2s forwards;opacity:0;margin-bottom:12px;";
        wrap.appendChild(recDiv);
    }

    var autoTimer = null;

    // Bottone RESTART: se cliccato, annulla il ritorno automatico e ricomincia.
    if (onRetry) {
        var bRetry = document.createElement('button');
        bRetry.className = 'arcade-btn';
        bRetry.innerHTML = '<i class="fa-solid fa-rotate-right"></i> RESTART';
        bRetry.style.cssText = 'margin-top:18px;opacity:0;animation:arcadeGoFadeUp 0.3s ease 1.0s forwards;';
        bRetry.onclick = function () {
            if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
            try { onRetry(); } catch (e) {}
        };
        wrap.appendChild(bRetry);
    }

    // Etichetta + barra: ritorno automatico al menu se non si clicca RESTART.
    var retLabel = document.createElement('div');
    retLabel.textContent = onRetry
        ? ((window.ARCADE_TXT && window.ARCADE_TXT.returnRetry) || '▸ o torna al menu… ◂')
        : ((window.ARCADE_TXT && window.ARCADE_TXT.returnMenu) || '▸ ritorno al menu ◂');
    retLabel.style.cssText = "font-family:'Rajdhani',sans-serif;font-size:0.95rem;color:#9aa8b5;letter-spacing:1px;margin-top:16px;opacity:0;animation:arcadeGoFadeUp 0.3s ease 1.5s forwards;";
    wrap.appendChild(retLabel);

    var bar = document.createElement('div');
    bar.style.cssText = 'width:50%;height:3px;background:#1a2530;border-radius:2px;margin:10px auto 0;overflow:hidden;opacity:0;animation:arcadeGoFadeUp 0.3s ease 1.5s forwards;';
    var barFill = document.createElement('div');
    var barDur = Math.max(0.8, (delay - 1500) / 1000); // la barra si riempie fino al ritorno auto
    barFill.style.cssText = 'width:0;height:100%;background:linear-gradient(90deg,#e74c3c,#e67e22);border-radius:2px;animation:arcadeGoBarFill ' + barDur + 's linear 1.5s forwards;';
    bar.appendChild(barFill);
    wrap.appendChild(bar);

    overlay.appendChild(wrap);

    // Count-up del punteggio
    var start = Date.now();
    var dur = 700;
    var iv = setInterval(function () {
        var p = Math.min((Date.now() - start) / dur, 1);
        sVal.textContent = Math.round(p * score);
        if (p >= 1) clearInterval(iv);
    }, 25);

    // Ritorno automatico al menu. Annullabile da RESTART (sopra) e da chi
    // cambia gioco: senza, il timer di una partita finita sopravvive
    // all'uscita e, scadendo, chiude il cabinato avviato NEL FRATTEMPO
    // rispedendo l'utente al menu senza spiegazione. Percorso reale:
    // game over -> tocco un'altra voce -> dopo qualche secondo si chiude.
    // Il conteggio del punteggio va fermato con lui, o continua a scrivere
    // su un overlay che non e' piu' suo.
    autoTimer = setTimeout(function () {
        window._arcadeCancelGameOver = null;
        try { onReturn(); } catch (e) {}
    }, delay);

    window._arcadeCancelGameOver = function () {
        if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
        clearInterval(iv);
        window._arcadeCancelGameOver = null;
    };
};
