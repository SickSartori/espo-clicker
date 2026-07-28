// code/arcade/super-espo/js/super-espo.js

(function () {
    let espoGame = null;
    let espoRunToken = 0; // invalida le run in volo (prefetch async) se l'utente esce/riavvia
    let _suRecordCache = -1; // record letto una volta per run (vedi updateUI)
    let _suDieTimer = null;  // timeout del game-over, da cancellare se si esce prima

    window.espoCustomKeys = { left: false, right: false, down: false, up: false }; 

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
            <span class="topbar-game-label" style="color:#9b59b6">SUPER ESPO</span>
            <div class="arcade-stats-box" id="super-espo-score-ui">
                <span class="stat">LOOP: <span class="val-level">1</span></span>
                <span class="stat">SCORE: <span class="val-score">0</span></span>
                <span class="stat">RECORD: <span class="val-record">${highScore}</span></span>
            </div>
        `;
        gameContainer.appendChild(headerDiv);

        const canvasWrapper = document.createElement('div');
        canvasWrapper.id = 'phaser-espo-container';
        canvasWrapper.className = 'crt-turn-on crt-effect';
        canvasWrapper.style.position = 'relative';
        // Il wrapper riempie il contenitore via flex:1 (CSS .crt-effect). NON impostare
        // height:100% qui: con la topbar presente causerebbe overflow e il canvas
        // finirebbe troppo in basso invece che centrato verticalmente.
        canvasWrapper.style.width = '100%';

        // I controlli touch sono forniti dal virtual pad globale di arcade.php, che
        // imposta window.espoCustomKeys (up/down/left/right + JUMP/FIRE). Niente pad
        // legacy: su mobile comparivano due set di controlli sovrapposti.

        const overlay = document.createElement('div');
        overlay.id = 'super-espo-overlay';
        overlay.className = 'arcade-ui-overlay';
        overlay.innerHTML = `
            <div class="super-espo-title">SUPER ESPO</div>
            <div class="super-espo-instructions">
                Frecce/WASD per muoverti, SU per saltare, GIÙ per abbassarti.<br>
                Schiaccia i Bug, raccogli monete e non cadere!
            </div>
            <button class="arcade-btn" onclick="window.startSuperEspoRun()" style="background:#9b59b6; color:#fff; border-color:#8e44ad;">AVVIA PARTITA</button>
        `;
        
        canvasWrapper.appendChild(overlay);
        gameContainer.appendChild(canvasWrapper);
    };

    window.exitSuperEspoGame = function () {
        espoRunToken++; // invalida eventuali prefetch/run in volo
        if (_suDieTimer) { clearTimeout(_suDieTimer); _suDieTimer = null; }
        if (window._espoLoaderTimeout) { clearTimeout(window._espoLoaderTimeout); window._espoLoaderTimeout = null; }
        if (espoGame) { espoGame.destroy(true); espoGame = null; }
        // Reset state singletons (texture refs distrutti col game)
        fireHintText = null;
        stuckHintText = null;
        const selector = document.getElementById('arcade-game-selector');
        const gameContainer = document.getElementById('arcade-active-game-container');
        if (gameContainer) { gameContainer.innerHTML = ''; gameContainer.style.display = 'none'; }
        if (selector) selector.style.display = 'flex';
        if (window.EspooClicker) window.EspooClicker.playSound('sound-click');
    };

    // Lista centralizzata degli audio dell'arcade Super Espò.
    // Su Altervista vengono pre-fetchati come signed URL R2; in dev/MAMP
    // restano path locali. Phaser preload() legge la mappa risolta.
    const SUPER_ESPO_AUDIO = {
        'snd-jump':         'assets/sounds/arcade/super-espo/jump.wav',
        'snd-gameover':     'assets/sounds/arcade/super-espo/gameover.mp3',
        'snd-coin':         'assets/sounds/arcade/super-espo/coin.mp3',
        'snd-stomp':        'assets/sounds/arcade/super-espo/goomba-stomp.wav',
        'snd-star-appears': 'assets/sounds/arcade/super-espo/star-appears.mp3',
        'snd-star-collect': 'assets/sounds/arcade/super-espo/star-collect.mp3',
    };

    // Mostra il loading screen dentro #super-espo-overlay.
    // Le 2 fasi:
    //   1. "CONNESSIONE..." → durante CDN.prefetch (signed URL R2). Spinner only.
    //   2. "CARICAMENTO..."  → durante Phaser preload. Progress bar reale.
    function _showLoader(phase) {
        const overlay = document.getElementById('super-espo-overlay');
        if (!overlay) return;
        if (phase === 'connecting') {
            overlay.innerHTML = `
                <div class="super-espo-loader">
                    <div class="loader-spinner"></div>
                    <div class="loader-text">${(window.ARCADE_TXT && window.ARCADE_TXT.connecting) || 'CONNESSIONE…'}</div>
                    <div class="loader-sub">${(window.ARCADE_TXT && window.ARCADE_TXT.connectingSub) || 'Collegamento al server CDN'}</div>
                </div>`;
            overlay.style.display = 'flex';
        } else if (phase === 'loading') {
            overlay.innerHTML = `
                <div class="super-espo-loader">
                    <div class="loader-spinner"></div>
                    <div class="loader-text">${(window.ARCADE_TXT && window.ARCADE_TXT.loadingPhase) || 'CARICAMENTO…'}</div>
                    <div class="loader-bar"><div class="loader-bar-fill" id="super-espo-loader-fill"></div></div>
                    <div class="loader-sub" id="super-espo-loader-percent">0%</div>
                </div>`;
            overlay.style.display = 'flex';
        }
    }

    function _updateLoaderProgress(value) {
        const fill = document.getElementById('super-espo-loader-fill');
        const pct  = document.getElementById('super-espo-loader-percent');
        const v = Math.round(value * 100);
        if (fill) fill.style.width = v + '%';
        if (pct)  pct.textContent  = v + '%';
    }

    function _hideLoader() {
        const overlay = document.getElementById('super-espo-overlay');
        if (overlay) overlay.style.display = 'none';
    }

    window.startSuperEspoRun = function () {
        if (document.activeElement) document.activeElement.blur();
        window.focus();

        // Sostituiamo i contenuti dell'overlay col loader: rimane visibile
        // come "schermata di caricamento" finché Phaser non è pronto.
        _showLoader('connecting');

        if (espoGame) { espoGame.destroy(true); espoGame = null; }
        const myToken = ++espoRunToken; // questa run; se ne parte un'altra, la invalida
        _suRecordCache = -1; // forza la rilettura del record per la nuova partita

        window.espoCustomKeys = { left: false, right: false, down: false, up: false };
        // FIX: reset stato edge-detection del salto. Senza questo, se la run
        // precedente è terminata con UP premuto, il primo salto della nuova
        // partita non scatta finché l'utente non rilascia e ripreme il tasto.
        upWasDown = false;
        lastGroundedTime = -1e9;
        lastJumpPressTime = -1e9;

        // Safety net: se la pagina perde focus (notifica, switch app, ecc.)
        // azzeriamo TUTTI i tasti virtuali. Lo registriamo una sola volta.
        if (!window._espoKeysSafetyNet) {
            const releaseAll = () => {
                if (window.espoCustomKeys) {
                    window.espoCustomKeys.left = false;
                    window.espoCustomKeys.right = false;
                    window.espoCustomKeys.up = false;
                    window.espoCustomKeys.down = false;
                }
            };
            window.addEventListener('blur', releaseAll);
            window.addEventListener('pagehide', releaseAll);
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState !== 'visible') releaseAll();
            });
            window._espoKeysSafetyNet = true;
        }

        // Safety net: timeout assoluto per evitare loader bloccato a 100%
        // (es. asset 404 silenzioso, evento complete non emesso).
        if (window._espoLoaderTimeout) clearTimeout(window._espoLoaderTimeout);
        window._espoLoaderTimeout = setTimeout(() => {
            console.warn('[super-espo] Loader timeout 5s — force hide');
            _hideLoader();
        }, 5000);

        // Wrapper di preload che aggancia gli eventi di progresso al loader UI.
        // Phaser emette 'progress' (0..1) ad ogni file caricato + 'complete' quando finisce.
        function _preloadWithProgress() {
            this.load.on('progress', _updateLoaderProgress);
            this.load.on('complete', () => {
                if (window._espoLoaderTimeout) {
                    clearTimeout(window._espoLoaderTimeout);
                    window._espoLoaderTimeout = null;
                }
                _hideLoader();
            });
            // loaderror: continua comunque (asset failed → log + skip)
            this.load.on('loaderror', (file) => {
                console.warn('[super-espo] Asset load fail:', file.key, file.src);
            });
            preload.call(this);
        }

        const config = {
            type: Phaser.AUTO,
            backgroundColor: '#5c94fc',
            pixelArt: true,
            // Scale.FIT: il canvas si ridimensiona per riempire il contenitore
            // (wrapper flex) mantenendo l'aspect ratio, centrato. Elimina gli
            // spazi vuoti laterali/inferiori della vecchia dimensione fissa.
            scale: {
                mode: Phaser.Scale.FIT,
                autoCenter: Phaser.Scale.CENTER_BOTH,
                parent: 'phaser-espo-container',
                // Su mobile (portrait) una larghezza di design minore = canvas FIT
                // più ALTO (riempie il vuoto verticale), mostrando meno mondo ai lati.
                // Il player è ancorato a cam.width*0.2 (relativo) → resta visibile.
                width: (window.matchMedia && window.matchMedia('(max-width: 768px)').matches) ? 800 : 1280,
                height: 560
            },
            physics: {
                default: 'arcade',
                arcade: { gravity: { y: 720 }, debug: false }
            },
            scene: { preload: _preloadWithProgress, create: create, update: update }
        };

        // Pre-fetch in batch delle URL R2 firmate (no-op in dev/MAMP).
        // Quando la promise risolve, le URL sono cachate e CDN.urlSync()
        // chiamato dentro preload() le ritorna immediatamente senza
        // round-trip aggiuntivi.
        const audioPaths = Object.values(SUPER_ESPO_AUDIO);
        const prefetch = (window.CDN && window.CDN.prefetch)
            ? window.CDN.prefetch(audioPaths).catch((e) => {
                console.warn('[SuperEspo] CDN prefetch fallito, fallback locale:', e);
                return {};
            })
            : Promise.resolve({});

        prefetch.then(() => {
            // Guard: l'utente potrebbe aver premuto MENU/RIAVVIA durante il prefetch.
            // Se nel frattempo e' partita un'altra run (token diverso) o il container
            // e' stato smontato, annulla per non creare un Phaser.Game orfano (loop/input doppi).
            if (myToken !== espoRunToken) return;
            if (!document.getElementById('phaser-espo-container')) return;
            if (espoGame) { espoGame.destroy(true); espoGame = null; }
            // Passa alla fase 2: barra di progresso reale durante Phaser preload
            _showLoader('loading');
            espoGame = new Phaser.Game(config);

            // FIX "schermo nero all'avvio": con Scale.FIT, se Phaser misura il
            // contenitore mentre non ha ancora la dimensione definitiva (animazione
            // CRT "turn-on" che parte da transform:scale(1,0.001), oppure layout flex
            // non ancora assestato), il canvas nasce a ~0px e resta NERO finché un
            // resize della finestra non forza il ricalcolo. Nessun evento resize
            // arriva da solo → restava nero fino a quando l'utente ridimensionava.
            // Ri-applichiamo noi il fit appena il layout è assestato: stesso effetto
            // del resize manuale, ma automatico. Più tentativi coprono sia il boot
            // rapido sia la fine dell'animazione CRT (0.5s).
            const _refitEspo = () => { if (espoGame && espoGame.scale) espoGame.scale.refresh(); };
            espoGame.events.once('ready', _refitEspo);
            requestAnimationFrame(_refitEspo);
            setTimeout(_refitEspo, 150);
            setTimeout(_refitEspo, 650); // oltre la fine dell'animazione crt-turn-on
        });
    };

    let player, cursors, wasdKeys, platforms, blocks, enemies, enemyBlockers, coins;
    let bgHills, bgMountains, bgClouds, decorations, groundFill;
    let powerUps;                    // gruppo fisico per la Super Stella (e futuri power-up)
    let fireballs;                   // gruppo proiettili fireball
    let shootKeys;                   // tasti X / F per sparare
    let lastChunkX = 0;
    let lastTierIndex = 0; // Traccia il tier precedente per transizioni graduali
    let camScrollMax = -1e9;         // scroll X massimo raggiunto → camera runner (solo avanti)

    let currentScore = 0;
    let maxDist = 0;
    let bonusScore = 0;
    let currentLevel = 1;
    let upWasDown = false;

    // ---- Feel del movimento (stile Mario): inerzia + salto variabile ----------
    const RUN_ACCEL      = 1100; // accelerazione a terra (px/s²)
    const RUN_TURN_ACCEL = 2200; // accelerazione in inversione (skid, più reattivo)
    const RUN_AIR_ACCEL  = 750;  // controllo ridotto in aria
    const RUN_FRICTION    = 1500; // attrito a terra (decelerazione quando rilasci)
    const JUMP_VEL        = 480;  // spinta salto piena (tenendo premuto)
    const JUMP_CUT_VEL    = 320;  // velocità minima se rilasci subito (salto corto ma "vero")
    const EXTRA_FALL      = 420;  // gravità extra in caduta → discesa secca, meno galleggiamento
    const COYOTE_MS       = 100;  // tolleranza salto dopo aver lasciato il bordo
    const JUMP_BUFFER_MS  = 130;  // pre-input salto poco prima di atterrare
    let lastGroundedTime = -1e9;
    let lastJumpPressTime = -1e9;

    // ---- Watchdog anti soft-lock --------------------------------------------
    // Se Espò resta fermo contro un ostacolo (o incollato al bordo sinistro della
    // camera tenendo SINISTRA) senza avanzare per qualche secondo, mostriamo un
    // hint direzionale. Rete di sicurezza per la segnalazione "bloccato dal blocco".
    const STUCK_HINT_MS = 3000;  // fermo per 3s in stato bloccato → mostra hint
    let lastProgressTime = 0;    // ultimo istante (ms) in cui maxDist è aumentato
    // "Calcio dal bordo": quando salti incollato al bordo sinistro o contro un muro,
    // il salto ti proietta in avanti e sopprime la SINISTRA FINO ALL'ATTERRAGGIO, così
    // lo slancio porta Espò oltre l'ostacolo invece di farlo rimbalzare sul posto
    // (anti soft-lock meccanico — segnalazione "bloccato dal blocco tenendo sinistra").
    let backKicking = false;     // true mentre un calcio-dal-bordo è in volo

    // ---- Stomp grace --------------------------------------------------------
    // Subito dopo aver schiacciato un nemico (rimbalzo verso l'alto), un contatto
    // ravvicinato con un SECONDO nemico (es. due affiancati) non deve uccidere:
    // si rimbalza e si potrà schiacciare il secondo ricadendoci sopra.
    const STOMP_GRACE_MS = 150;
    let stompGraceUntil = 0;     // timestamp (ms) fino a cui il contatto laterale in salita è ignorato

    // ---- Super Star (invincibility power-up) -------------------------------
    const STAR_DROP_CHANCE  = 0.18;  // 18% per blocco mistero
    const STAR_DURATION_MS  = 12000; // 12 secondi di invincibilità
    const STAR_TINT_CYCLE   = [0xfff44f, 0xff6ec7, 0x6ec3ff, 0x9bff6e]; // giallo / rosa / azzurro / verde
    const STOMP_SCORE       = 100;   // schiacciata semplice
    const STAR_KILL_SCORE   = 200;   // nemico ucciso in modalità stella
    const SHELL_SPEED       = 320;   // velocità del guscio koopa calciato
    const SHELL_KILL_SCORE  = 150;   // nemico ucciso dal guscio in movimento
    const SHELL_GRACE_MS    = 300;   // tempo prima che un guscio fermo possa essere calciato
    const SHELL_LIFE_MS     = 6000;  // auto-despawn guscio (fermo o in movimento)
    // I mattoni di terreno/piattaforme si estendono fin quaggiù: riempiono il
    // fondo del canvas (niente striscia di cielo sotto) e danno un look "pieno".
    const GROUND_BOTTOM     = 760;
    let invincibleUntil = 0;         // timestamp ms (scene.time.now) di scadenza

    // ---- Fire Flower (1-hit protection power-up) ---------------------------
    const FIRE_DROP_CHANCE     = 0.22;   // 22% per blocco mistero
    const FIRE_HIT_INVUL_MS    = 1500;   // dopo power-down: 1.5s invulnerabilità + lampeggio
    const FIRE_COLLECT_SCORE   = 200;
    let playerForm = 'small';            // 'small' | 'grown' | 'fire' (modello Mario classico)
    let firePowerDownUntil = 0;          // timestamp iframes invulnerabilità dopo downgrade
    const PLAYER_SCALE = 0.32;           // scala sprite player → ~30px small / ~61px grown (frame 95/190px)
    const MUSH_DROP_CHANCE = 0.5;        // se small: prob. fungo dal blocco mistero
    const MUSH_COLLECT_SCORE = 200;

    function preload() {
        const imgPath   = 'assets/image/arcade/';
        // Versione STABILE per build (non Date.now()): senza, ogni partita riscaricava
        // ~30 sprite bypassando la cache HTTP. window.CACHE_VER e' iniettato da arcade.php.
        const v = '?v=' + (window.CACHE_VER || (window.GAME_VERSION ? window.GAME_VERSION.major + '.' + window.GAME_VERSION.minor : '3.0'));

        // Le immagini sono servite dal server (non sono in CDN_PREFIXES).
        // Tutti gli sprite sono in formato WebP — riduzione ~70% rispetto ai PNG originali.
        // Player: 3 forme (sprite aggiornati). Convenzione frame: 0=stop, 1-3=run, 5=jump.
        // Confini frame verificati via scan colonne trasparenti.
        this.load.spritesheet('espo-small', imgPath + 'espo.webp'        + v, { frameWidth: 83,  frameHeight: 95 });   // 6 frame
        this.load.spritesheet('espo-grown', imgPath + 'mario-grown.webp' + v, { frameWidth: 100, frameHeight: 190 });  // 6 frame
        this.load.spritesheet('espo-fire',  imgPath + 'mario-fire.webp'  + v, { frameWidth: 100, frameHeight: 190 });  // 7 frame
        this.load.image('floorbricks', imgPath + 'floorbricks.webp' + v);
        this.load.image('emptyBlock', imgPath + 'emptyBlock.webp' + v);
        this.load.image('brick', imgPath + 'brick.webp' + v);           // mattone (blocco solido decorativo)
        this.load.image('hardblock', imgPath + 'hardblock.webp' + v);   // blocco solido per scalinate
        this.load.spritesheet('misteryBlock', imgPath + 'misteryBlock.webp' + v, { frameWidth: 16, frameHeight: 16 });
        this.load.spritesheet('goomba', imgPath + 'goomba.webp' + v, { frameWidth: 16, frameHeight: 16 });
        this.load.image('bush1', imgPath + 'bush1.webp' + v);
        this.load.image('bush2', imgPath + 'bush2.webp' + v);
        this.load.image('mountain1', imgPath + 'mountain1.webp' + v);
        this.load.image('mountain2', imgPath + 'mountain2.webp' + v);
        this.load.image('cloud1', imgPath + 'cloud1.webp' + v);
        this.load.image('cloud2', imgPath + 'cloud2.webp' + v);
        this.load.image('fence', imgPath + 'fence.webp' + v);
        this.load.spritesheet('coin', imgPath + 'coin.webp' + v, { frameWidth: 16, frameHeight: 16 });
        this.load.image('pipe-small', imgPath + 'vertical-small-tube.webp' + v);
        this.load.image('pipe-medium', imgPath + 'vertical-medium-tube.webp' + v);
        this.load.image('pipe-large', imgPath + 'vertical-large-tube.webp' + v);
        // Fire flower è una spritesheet 4 frames 16x16 (animazione spin)
        this.load.spritesheet('fire-flower', imgPath + 'fire-flower.webp' + v, { frameWidth: 16, frameHeight: 16 });
        // Fireball proiettile (4 frame 8x8) + esplosione impatto (3 frame 16x16) — da super-midu-bros
        this.load.spritesheet('fireball', imgPath + 'fireball.png' + v, { frameWidth: 8, frameHeight: 8 });
        this.load.spritesheet('fireball-explosion', imgPath + 'fireball-explosion.png' + v, { frameWidth: 16, frameHeight: 16 });
        // Power-up fungo (cresci) + nemico koopa/shell — da super-midu-bros
        this.load.image('super-mushroom', imgPath + 'super-mushroom.png' + v);
        this.load.spritesheet('koopa', imgPath + 'koopa.png' + v, { frameWidth: 16, frameHeight: 24 });
        this.load.spritesheet('shell', imgPath + 'shell.png' + v, { frameWidth: 16, frameHeight: 15 });

        // Audio: su Altervista CDN.urlSync() ritorna la signed URL R2 già
        // pre-fetchata in startSuperEspoRun(). Le signed URL hanno query
        // string AWS — non aggiungiamo ?v= che invaliderebbe la firma.
        for (const key in SUPER_ESPO_AUDIO) {
            const path = SUPER_ESPO_AUDIO[key];
            const resolved = (window.CDN && window.CDN.urlSync) ? window.CDN.urlSync(path) : null;
            const url = resolved || path;
            const finalUrl = url.indexOf('?') >= 0 ? url : url + v;
            this.load.audio(key, finalUrl);
        }
    }

    function create() {
        // Belt-and-suspenders: hide loader anche da create() in caso evento complete saltato
        _hideLoader();
        if (window._espoLoaderTimeout) {
            clearTimeout(window._espoLoaderTimeout);
            window._espoLoaderTimeout = null;
        }

        this.physics.world.setBounds(0, 0, Number.MAX_SAFE_INTEGER, 1000);
        this.physics.world.checkCollision.down = false;
        this.physics.world.checkCollision.up = false; // niente "soffitto del cielo": si può saltare oltre il bordo alto

        this.anims.create({ key: 'goomba-walk', frames: this.anims.generateFrameNumbers('goomba', { start: 0, end: 1 }), frameRate: 6, repeat: -1 });
        this.anims.create({ key: 'goomba-dead', frames: [{ key: 'goomba', frame: 2 }] });
        this.anims.create({ key: 'block-flash', frames: this.anims.generateFrameNumbers('misteryBlock', { start: 0, end: 2 }), frameRate: 6, repeat: -1, yoyo: true });
        this.anims.create({ key: 'coin-spin', frames: this.anims.generateFrameNumbers('coin', { start: 0, end: 3 }), frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'fire-flower-spin', frames: this.anims.generateFrameNumbers('fire-flower', { start: 0, end: 3 }), frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'fireball-spin', frames: this.anims.generateFrameNumbers('fireball', { start: 0, end: 3 }), frameRate: 14, repeat: -1 });
        this.anims.create({ key: 'fireball-explode', frames: this.anims.generateFrameNumbers('fireball-explosion', { start: 0, end: 2 }), frameRate: 18, repeat: 0 });
        // Anim player per forma (small/grown/fire): 0=stop, 1-3=run, 5=jump.
        [['espo-small', 'small'], ['espo-grown', 'grown'], ['espo-fire', 'fire']].forEach(([key, form]) => {
            this.anims.create({ key: form + '-stop', frames: this.anims.generateFrameNumbers(key, { start: 0, end: 0 }), frameRate: 1 });
            this.anims.create({ key: form + '-run',  frames: this.anims.generateFrameNumbers(key, { start: 1, end: 3 }), frameRate: 12, repeat: -1 });
            this.anims.create({ key: form + '-jump', frames: this.anims.generateFrameNumbers(key, { start: 5, end: 5 }), frameRate: 1 });
        });
        // Crouch (solo forma grande): frame 4 dello spritesheet grown/fire.
        this.anims.create({ key: 'grown-crouch', frames: [{ key: 'espo-grown', frame: 4 }], frameRate: 1 });
        this.anims.create({ key: 'fire-crouch',  frames: [{ key: 'espo-fire',  frame: 4 }], frameRate: 1 });

        // Koopa cammina (2 frame); guscio statico
        this.anims.create({ key: 'koopa-walk', frames: this.anims.generateFrameNumbers('koopa', { start: 0, end: 1 }), frameRate: 6, repeat: -1 });
        this.anims.create({ key: 'shell-idle', frames: [{ key: 'shell', frame: 0 }], frameRate: 1 });
        this.anims.create({ key: 'shell-spin', frames: this.anims.generateFrameNumbers('shell', { start: 0, end: 1 }), frameRate: 18, repeat: -1 });

        bgHills = this.add.group();
        bgMountains = this.add.group();
        bgClouds = this.add.group();

        // STRATO LONTANO — colline grandi, parallax molto lento, tinta azzurrata
        // (effetto foschia/profondità). Stanno dietro a tutto (depth -3).
        for (let i = 0; i < 5; i++) {
            let hKey = i % 2 === 0 ? 'mountain2' : 'mountain1';
            let hill = this.add.image(i * 360, 415, hKey)
                .setScale(Phaser.Math.FloatBetween(2.6, 3.4))
                .setOrigin(0.5, 1).setScrollFactor(0.12, 1)
                .setTint(0x7fa0e0).setDepth(-3);
            bgHills.add(hill);
        }

        // STRATO MEDIO — montagne con altezze e scale variate (depth -2).
        // Base alzata (400, vicino al livello del suolo 360) così emergono dietro
        // al pavimento e restano ben visibili (prima erano troppo nascoste).
        for (let i = 0; i < 5; i++) {
            let mKey = i % 2 === 0 ? 'mountain1' : 'mountain2';
            let mt = this.add.image(i * 300, 400, mKey)
                .setScale(Phaser.Math.FloatBetween(1.5, 2.4))
                .setOrigin(0.5, 1).setScrollFactor(0.25, 1).setDepth(-2);
            bgMountains.add(mt);
        }

        // NUVOLE — più numerose, quote e dimensioni varie (depth -1)
        for (let i = 0; i < 9; i++) {
            let cKey = i % 2 === 0 ? 'cloud1' : 'cloud2';
            let cloud = this.add.image(i * 150, Phaser.Math.Between(10, 250), cKey)
                .setScale(Phaser.Math.FloatBetween(0.14, 0.42))
                .setScrollFactor(Phaser.Math.FloatBetween(0.35, 0.5), 1).setDepth(-1);
            bgClouds.add(cloud);
        }

        // RIEMPIMENTO "TERRA" — banda scura sotto la linea del suolo (y360 in giù).
        // Sta DIETRO le piattaforme (depth -0.5) e DAVANTI a cielo/montagne, così i
        // "pozzi" tra le piattaforme mostrano terra scura invece del cielo azzurro.
        // Riposizionata in update() per seguire la camera.
        groundFill = this.add.rectangle(0, 360, 1700, 480, 0x352515)
            .setOrigin(0, 0).setDepth(-0.5);

        platforms = this.physics.add.staticGroup();
        blocks = this.physics.add.staticGroup();
        enemyBlockers = this.physics.add.staticGroup();
        enemies = this.physics.add.group();
        coins = this.physics.add.group({ allowGravity: false });
        powerUps = this.physics.add.group();
        decorations = this.add.group();

        // Genera la texture della Super Stella runtime (24x24, 5 punte gialle bordo nero).
        // Usiamo canvas + textures.addCanvas per evitare di aggiungere un nuovo PNG.
        if (!this.textures.exists('super-star')) {
            const c = document.createElement('canvas');
            c.width = 24; c.height = 24;
            const cx = c.getContext('2d');
            const cxX = 12, cxY = 12, ro = 11, ri = 5;
            cx.beginPath();
            for (let i = 0; i < 10; i++) {
                const r = (i % 2 === 0) ? ro : ri;
                const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
                const x = cxX + Math.cos(a) * r;
                const y = cxY + Math.sin(a) * r;
                if (i === 0) cx.moveTo(x, y); else cx.lineTo(x, y);
            }
            cx.closePath();
            cx.fillStyle = '#ffd83d';
            cx.fill();
            cx.lineWidth = 1.5;
            cx.strokeStyle = '#000';
            cx.stroke();
            // Riflesso (occhio bianco) per effetto cartoon
            cx.fillStyle = '#fff';
            cx.fillRect(8, 8, 2, 2);
            this.textures.addCanvas('super-star', c);
        }

        let groundWidth = 720;
        let startPlatformTop = 360;
        let groundHeight = GROUND_BOTTOM - startPlatformTop; // estende il brick fino in fondo

        let ground = this.add.tileSprite(groundWidth / 2, startPlatformTop + (groundHeight / 2), groundWidth, groundHeight, 'floorbricks');
        ground.tileScaleX = 2; ground.tileScaleY = 2;
        this.physics.add.existing(ground, true);
        platforms.add(ground);

        // Decorazioni iniziali sulla piattaforma di partenza
        const startDecos = [
            { key: 'bush2', x: 240, scale: 0.7 },
            { key: 'fence', x: 440, scale: 0.55 },
            { key: 'bush1', x: 640, scale: 0.5 }
        ];
        startDecos.forEach(d => {
            const deco = this.add.image(d.x, startPlatformTop, d.key)
                .setScale(d.scale).setOrigin(0.5, 1).setDepth(1).setAlpha(0.9);
            decorations.add(deco);
        });

        lastChunkX = groundWidth;
        lastTierIndex = 0;
        camScrollMax = -1e9; // reset camera runner (si riaggancia al primo frame)
        currentScore = 0; maxDist = 0; bonusScore = 0; currentLevel = 1;
        lastProgressTime = 0; stuckHintText = null; backKicking = false; stompGraceUntil = 0; // reset watchdog anti soft-lock
        invincibleUntil = 0; // reset stato stella ad ogni nuova partita
        playerForm = 'small';   // parte piccolo (cresce col fungo)
        firePowerDownUntil = 0;

        player = this.physics.add.sprite(100, 100, 'espo-small', 0);
        player.setCollideWorldBounds(true);
        setPlayerForm(this, 'small'); // texture + scala + body coerenti con la forma
        player.setDepth(20);
        player.isDead = false;

        this.cameras.main.setZoom(1.25);
        // CAMERA RUNNER: niente startFollow. Lo scroll X è gestito a mano in update()
        // in modo MONOTÒNO (solo avanti, mai indietro): così il player può arretrare
        // fino al bordo sinistro del canvas e lì fermarsi (fuori vista), e appena
        // riprende ad avanzare la camera si riaggancia. Finestra verticale FISSA.
        this.cameras.main.setBounds(0, -1000, Number.MAX_SAFE_INTEGER, 100000);
        const _viewBottomY = 408; // più in basso → più zona cielo sopra
        const _camAnchor0 = this.cameras.main.width * 0.2; // posizione di aggancio del player
        this.cameras.main.setScroll(player.x - _camAnchor0, _viewBottomY - (this.cameras.main.height / 1.25));

        cursors = this.input.keyboard.createCursorKeys();
        wasdKeys = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W, left: Phaser.Input.Keyboard.KeyCodes.A,
            down: Phaser.Input.Keyboard.KeyCodes.S, right: Phaser.Input.Keyboard.KeyCodes.D
        });

        this.input.keyboard.addCapture('UP,DOWN,LEFT,RIGHT,W,A,S,D,X,F');
        shootKeys = this.input.keyboard.addKeys({
            x: Phaser.Input.Keyboard.KeyCodes.X,
            f: Phaser.Input.Keyboard.KeyCodes.F
        });

        // Fireballs group: proiettili Fire mode
        fireballs = this.physics.add.group();

        this.physics.add.collider(player, platforms, onPlayerPlatform, null, this);
        this.physics.add.collider(player, blocks, hitBlock, null, this);
        this.physics.add.overlap(player, coins, collectCoin, null, this);
        this.physics.add.collider(enemies, platforms);
        // OVERLAP (non collider): il contatto col nemico NON spinge fisicamente il
        // nemico — gestisce solo stomp/danno via hitEnemy (come in Super Mario).
        this.physics.add.overlap(player, enemies, hitEnemy, null, this);
        this.physics.add.collider(enemies, enemyBlockers);
        // Guscio koopa in movimento che travolge altri nemici (overlap = non fisico,
        // i nemici normali continuano a non spingersi tra loro).
        this.physics.add.overlap(enemies, enemies, shellVsEnemy, null, this);
        // I power-up rimbalzano su tutto il terreno e vengono raccolti al contatto.
        // Il dispatcher collectPowerUp() instrada Star vs Fire Flower in base a item.kind.
        this.physics.add.collider(powerUps, platforms);
        this.physics.add.collider(powerUps, blocks);
        this.physics.add.collider(powerUps, enemyBlockers);
        this.physics.add.overlap(player, powerUps, collectPowerUp, null, this);

        // Fireball collisions
        this.physics.add.collider(fireballs, platforms, fireballHitGround, null, this);
        this.physics.add.collider(fireballs, blocks, fireballHitGround, null, this);
        // NIENTE collider fireballs↔enemyBlockers: quei rettangoli invisibili ai bordi
        // servono SOLO a tenere i nemici/power-up sulla piattaforma. Coi fireball facevano
        // da "muro invisibile" che li bloccava al bordo invece di farli cadere giù.
        this.physics.add.overlap(fireballs, enemies, fireballHitEnemy, null, this);
    }

    // Cambia forma player (small/grown/fire): texture + scala + body + anim.
    // Tiene i piedi piantati (cresce verso l'alto, si rimpicciolisce verso il basso).
    function setPlayerForm(scene, form) {
        if (!player) return;
        const wasH = player.displayHeight || 0;
        playerForm = form;
        const spec = form === 'small'
            ? { tex: 'espo-small', fw: 83, fh: 95 }
            : { tex: form === 'fire' ? 'espo-fire' : 'espo-grown', fw: 100, fh: 190 };
        player.anims.stop();
        if (scene.textures.exists(spec.tex)) player.setTexture(spec.tex, 0);
        player.setScale(PLAYER_SCALE);
        if (player.body) {
            // hitbox ~metà larghezza frame (sprite centrato con padding), ~82% altezza, piedi in basso
            const bw = Math.round(spec.fw * 0.5);
            const bh = Math.round(spec.fh * 0.82);
            player.body.setSize(bw, bh);
            player.body.setOffset(Math.round((spec.fw - bw) / 2), spec.fh - bh);
        }
        const newH = player.displayHeight;
        if (wasH) player.y -= (newH - wasH) / 2;
        const onGround = !!(player.body && (player.body.blocked.down || player.body.touching.down));
        const moving = !!(player.body && Math.abs(player.body.velocity.x) > 5);
        const a = !onGround ? form + '-jump' : (moving ? form + '-run' : form + '-stop');
        if (scene.anims.exists(a)) player.anims.play(a, true);
    }

    function update(time, delta) {
        if (player.isDead) return;

        // ---- Stato Super Stella (invincibility) -----------------------------
        // Tint ciclico arcobaleno + auto-reset alla scadenza.
        const inStar = (this.time.now < invincibleUntil);
        if (inStar) {
            const i = Math.floor(this.time.now / 80) % STAR_TINT_CYCLE.length;
            player.setTint(STAR_TINT_CYCLE[i]);
        } else if (this.time.now < firePowerDownUntil) {
            // Lampeggio post power-down: alpha alterna 0.4/1.0 ogni 80ms
            player.setAlpha(Math.floor(this.time.now / 80) % 2 === 0 ? 0.4 : 1.0);
            if (player.tintTopLeft !== 0xffffff) player.clearTint();
        } else {
            if (player.tintTopLeft !== 0xffffff) player.clearTint();
            if (player.alpha !== 1) player.setAlpha(1);
        }

        // Seed del watchdog: `time` è un timestamp performance.now() grande, quindi
        // lastProgressTime=0 renderebbe (time - lastProgressTime) sempre >> soglia (hint
        // immediato). Lo agganciamo al primo frame così il debounce di 3s parte davvero.
        if (lastProgressTime === 0) lastProgressTime = time;

        let distScore = Math.floor(Math.max(0, player.x - 100) / 10);
        if (distScore > maxDist) {
            maxDist = distScore;
            lastProgressTime = time;   // avanzamento → resetta il watchdog anti soft-lock
            hideStuckHint();
        }
        currentScore = maxDist + bonusScore;

        let newLevel = Math.floor(currentScore / 1000) + 1;
        if (newLevel > currentLevel) {
            currentLevel = newLevel;
            showLevelUp(this, currentLevel);
        }

        updateUI();

        this.physics.world.bounds.left = this.cameras.main.scrollX;
        if (player.x < this.cameras.main.scrollX) {
            player.x = this.cameras.main.scrollX;
        }

        let leftDown = cursors.left.isDown || wasdKeys.left.isDown || window.espoCustomKeys.left;
        let rightDown = cursors.right.isDown || wasdKeys.right.isDown || window.espoCustomKeys.right;
        let downDown = cursors.down.isDown || wasdKeys.down.isDown || window.espoCustomKeys.down;

        let jumpPressed = cursors.up.isDown || wasdKeys.up.isDown || window.espoCustomKeys.up;
        let jumpJustPressed = jumpPressed && !upWasDown;
        upWasDown = jumpPressed;

        // Fire mode: spara con X o F + gestione caricatore/ricarica + HUD munizioni
        if (playerForm === 'fire') {
            // Ricarica completata → rifornisci il caricatore
            if (fireballAmmo <= 0 && this.time.now >= fireballReloadUntil) fireballAmmo = MAX_FIREBALLS;
            if (shootKeys && (shootKeys.x.isDown || shootKeys.f.isDown)) shootFireball(this);
            // Aggiorna l'indicatore munizioni (pallini) / "RICARICA…"
            if (fireHintText && fireHintText.scene) {
                if (fireballAmmo <= 0) {
                    fireHintText.setText('🔥 RICARICA…');
                } else {
                    let dots = '';
                    for (let i = 0; i < MAX_FIREBALLS; i++) dots += (i < fireballAmmo) ? '●' : '○';
                    fireHintText.setText('🔥 X/F  ' + dots);
                }
            }
        }

        const dt = Math.min(delta || 16.7, 50) / 1000; // secondi (cap anti-salti)
        // "A terra" SOLO da contatto reale col suolo = blocked.down (collisione con un
        // corpo immovable: platforms/blocks). NON usare touching.down: Phaser lo setta
        // anche durante l'OVERLAP con una moneta presa IN CADUTA (getOverlapY, corpo che
        // scende dentro un altro), creando un falso "a terra" che ri-armava il coyote-time
        // → DOPPIO SALTO premendo salto nell'istante in cui si raccoglie una moneta.
        // onFloor() === blocked.down (i bordi del mondo non bloccano: checkCollision.down=false).
        let isGrounded = player.body.blocked.down;
        if (isGrounded) backKicking = false; // il calcio-dal-bordo finisce all'atterraggio

        // Crouch possibile solo da grande (grown/fire); small non si abbassa.
        const crouching = downDown && isGrounded && playerForm !== 'small';

        // ---- CAMERA RUNNER (solo avanti) + bordo sinistro invisibile ----
        // La camera scorre solo in avanti (camScrollMax non cala mai). Se il player
        // arretra, la camera resta ferma e lui scivola verso il bordo SINISTRO del
        // canvas, dove si ferma (fuori vista) — niente muro a metà schermo. Appena
        // riavanza fino all'anchor, la camera si riaggancia. atBackLimit va calcolato
        // PRIMA del movimento per azzerare vx in tempo (no corsa sul posto al bordo).
        const _cam = this.cameras.main;
        const _halfHidden = (_cam.width - _cam.width / _cam.zoom) / 2; // px nascosti a sx dallo zoom
        const _anchor = _cam.width * 0.2;                              // dove agganciare il player
        // IMPORTANTE: usa la posizione del BODY (gia' integrato in questo frame), non
        // player.x (lo sprite viene sincronizzato col body solo in postupdate, quindi
        // in update() e' ancora alla posizione del frame precedente). Seguendo lo sprite
        // vecchio la camera restava indietro di velocita'×dt per frame → tremolio mentre
        // si avanza. Il body.center e' dove lo sprite verra' effettivamente disegnato.
        let _desiredScroll = (player.body ? player.body.center.x : player.x) - _anchor;
        if (_desiredScroll < -_halfHidden) _desiredScroll = -_halfHidden; // worldView.x >= bounds.x (0)
        if (_desiredScroll > camScrollMax) camScrollMax = _desiredScroll; // monotòno: mai indietro
        _cam.scrollX = camScrollMax;
        const minPlayerX = camScrollMax + _halfHidden + player.body.halfWidth; // bordo sx visibile
        const atBackLimit = player.x <= minPlayerX + 1;

        // ---- MOVIMENTO CON INERZIA (accelera / decelera / skid in inversione) ----
        const maxSpeed = 180 + (Math.pow(currentLevel, 1.2) * 6);
        let vx = player.body.velocity.x;
        let dir = 0;
        if (!crouching) { if (leftDown) dir = -1; else if (rightDown) dir = 1; }
        // Durante il calcio-dal-bordo ignora la SINISTRA: la spinta in avanti del
        // salto non deve essere annullata dal controllo aereo (anti soft-lock).
        if (backKicking && dir < 0) dir = 0;

        if (dir !== 0) {
            const turning = (dir > 0 && vx < 0) || (dir < 0 && vx > 0);
            const accel = isGrounded ? (turning ? RUN_TURN_ACCEL : RUN_ACCEL) : RUN_AIR_ACCEL;
            vx += dir * accel * dt;
            vx = Phaser.Math.Clamp(vx, -maxSpeed, maxSpeed);
            player.flipX = dir < 0;
        } else if (isGrounded) {
            // Attrito a terra: decelera fino a fermarsi (in aria mantiene la quantità di moto)
            const fr = RUN_FRICTION * dt;
            if (Math.abs(vx) <= fr) vx = 0; else vx -= Math.sign(vx) * fr;
        }
        // Al limite: niente spinta verso sinistra (no velocità → no corsa sul posto)
        if (atBackLimit && vx < 0) vx = 0;
        player.setVelocityX(vx);

        // Clamp posizione: non uscire dal bordo sinistro visibile (resta fuori vista)
        if (player.x < minPlayerX) player.x = minPlayerX;

        // ---- SALTO AD ALTEZZA VARIABILE + coyote time + jump buffer ----
        if (isGrounded) lastGroundedTime = time;
        if (jumpJustPressed) lastJumpPressTime = time;
        const canCoyote = (time - lastGroundedTime) <= COYOTE_MS;
        const jumpBuffered = (time - lastJumpPressTime) <= JUMP_BUFFER_MS;

        // Salta se a terra (o coyote) + input bufferizzato. Spingere contro un muro NON
        // impedisce il salto. Vincolo velocity.y >= 0: non si può accatastare un salto
        // mentre si sta GIÀ salendo (es. dopo il rimbalzo di uno stomp con coyote ancora
        // attivo) → niente doppio salto da nessun rimbalzo. Il doppio salto è inoltre
        // evitato consumando coyote/buffer qui sotto.
        if (jumpBuffered && canCoyote && !crouching && player.body.velocity.y >= 0) {
            player.setVelocityY(-JUMP_VEL);
            // Anti soft-lock: SOLO se sei davvero incastrato — incollato al bordo sinistro
            // della camera (atBackLimit) E fermo da STUCK_HINT_MS senza avanzare — il salto
            // ti PROIETTA in avanti (sopprimendo la SINISTRA fino all'atterraggio) per
            // superare l'ostacolo. Gating sul "fermo da un po'" (stesso dell'hint): così un
            // salto normale mentre vai INDIETRO non viene dirottato in avanti.
            if (atBackLimit && (time - lastProgressTime) > STUCK_HINT_MS) {
                player.setVelocityX(maxSpeed);
                backKicking = true;
            }
            lastJumpPressTime = -1e9; // consuma il buffer
            lastGroundedTime = -1e9;  // niente doppio salto
            playSoundEffect(this, 'snd-jump');
        }
        // Jump cut: se rilasci mentre sali → salto più corto (altezza variabile)
        if (!jumpPressed && player.body.velocity.y < -JUMP_CUT_VEL) {
            player.setVelocityY(-JUMP_CUT_VEL);
        }
        // Gravità extra in CADUTA (solo in aria): discesa più "secca" e reattiva
        // → il salto si sente come un platform vero, non come gravità lenta.
        if (!isGrounded && player.body.velocity.y > 0) {
            player.body.velocity.y += EXTRA_FALL * dt;
        }

        // ---- Watchdog anti soft-lock: Espò fermo a terra contro un muro (blocked.right)
        // o incollato al bordo sinistro della camera (atBackLimit) senza avanzare per
        // qualche secondo → hint direzionale. Le scale ora sono sempre salibili; questo
        // copre ogni residuo (es. chi tiene SINISTRA contro il bordo). Niente assist
        // fisico: guida soltanto, non tocca la posizione del player.
        if (!player.isDead && isGrounded && (atBackLimit || player.body.blocked.right)
            && (time - lastProgressTime) > STUCK_HINT_MS) {
            showStuckHint(this);
        }

        // ---- ANIMAZIONI per forma corrente (small/grown/fire) ----
        // Se spinge contro un muro (bloccato in quella direzione) NON è in corsa →
        // anim ferma, niente "corsa sul posto" contro il muro.
        const pushingWall = (player.body.blocked.left && leftDown) || (player.body.blocked.right && rightDown) || (atBackLimit && leftDown);
        const movingX = Math.abs(player.body.velocity.x) > 8 && !pushingWall;
        const prefix = playerForm;
        if (!isGrounded) {
            player.anims.play(prefix + '-jump', true);
        } else if (crouching) {
            const ck = prefix + '-crouch';
            if (this.anims.exists(ck)) player.anims.play(ck, true);
            else { player.anims.stop(); player.setFrame(4); }
        } else {
            player.anims.play(prefix + (movingX ? '-run' : '-stop'), true);
        }

        if (player.x + 1200 > lastChunkX) {
            spawnChunkImproved(this);
        }

        if (player.y > 450) die.call(this);

        // ---- Recycle parallax: riposiziona l'elemento uscito a sinistra DOPO
        //      il più a destra del suo gruppo → spaziatura sempre uniforme ----
        const _recycle = (group, offLeftScreen, spacing, onRecycle) => {
            const cam = this.cameras.main;
            group.getChildren().forEach(item => {
                const screenX = item.x - (cam.scrollX * item.scrollFactorX);
                if (screenX < offLeftScreen) {
                    let maxX = -Infinity;
                    group.getChildren().forEach(o => { if (o !== item && o.x > maxX) maxX = o.x; });
                    item.x = (maxX === -Infinity ? item.x : maxX) + spacing;
                    if (onRecycle) onRecycle(item);
                }
            });
        };
        // La banda "terra" segue la camera così copre sempre i pozzi nella vista
        if (groundFill) groundFill.x = this.cameras.main.scrollX - 200;

        _recycle(bgHills, -900, 360);
        _recycle(bgMountains, -500, 300);
        _recycle(bgClouds, -300, 150, (c) => {
            c.y = Phaser.Math.Between(10, 250);
            c.setScale(Phaser.Math.FloatBetween(0.14, 0.42));
            c.setTexture(Math.random() > 0.5 ? 'cloud1' : 'cloud2');
        });

        // Nemici: orientamento secondo la direzione + animazioni di camminata.
        // Salta i nemici morti/disabilitati (body.enable=false): altrimenti la loro
        // animazione di morte verrebbe sovrascritta da quella di camminata.
        enemies.getChildren().forEach(e => {
            if (!e.active || (e.body && e.body.enable === false)) return;
            const vx = e.body ? e.body.velocity.x : 0;
            if (e.kind === 'shell') {
                // Il guscio in movimento ruota; lo orientiamo nella direzione di marcia.
                if (e.shellState === 'moving' && Math.abs(vx) > 5) e.flipX = vx > 0;
                return;
            }
            // Koopa/goomba: guardano dove camminano (sprite di default rivolto a sinistra).
            if (Math.abs(vx) > 5) e.flipX = vx > 0;
            const want = e.kind === 'koopa' ? 'koopa-walk' : 'goomba-walk';
            if (this.anims.exists(want)) {
                const cur = (e.anims && e.anims.currentAnim) ? e.anims.currentAnim.key : null;
                if (cur !== want) e.anims.play(want, true);
            }
        });

        const destroyLimitX = this.cameras.main.scrollX - 300;
        [enemies, enemyBlockers, platforms, blocks, coins, powerUps].forEach(group => {
            group.getChildren().forEach(item => {
                if ((item.x + (item.width || 0)) < destroyLimitX) {
                    item.destroy();
                }
            });
        });
        // Pulizia decorazioni (non-physics, gruppo separato)
        decorations.getChildren().forEach(deco => {
            if ((deco.x + (deco.width || 0)) < destroyLimitX) deco.destroy();
        });
    }

    function spawnChunkImproved(scene) {
        // Gap: cresce col livello ma con cap ragionevole per salti sempre fattibili
        const gapMin = 30 + (currentLevel * 3);
        const gapMax = Math.min(180, 70 + (currentLevel * 12));
        const gap = Phaser.Math.Between(gapMin, gapMax);

        const chunkType = Phaser.Math.Between(1, 10);

        let widthMin = Math.max(140, 240 - currentLevel * 10);
        let widthMax = Math.max(220, 380 - currentLevel * 8);
        let width = Phaser.Math.Between(widthMin, widthMax);

        // Range di quota più ampio (6 livelli, ~135px) per uno skyline vario.
        // Indice basso = piattaforma bassa (vicino al suolo); alto = elevata.
        const tiers = [385, 360, 335, 305, 275, 250];
        // Passo fino a ±2 tier → dislivelli marcati ma sempre saltabili (~54px/2tier
        // contro ~143px di altezza salto).
        let tierStep = Phaser.Math.Between(-2, 2);
        let newTierIndex = Phaser.Math.Clamp(lastTierIndex + tierStep, 0, tiers.length - 1);
        // Bias verso il basso SOLO sui tier più alti, leggero → la quota varia davvero
        if (newTierIndex >= 4 && Math.random() > 0.55) newTierIndex--;
        // Gap grandi: non salire oltre il tier corrente (raggiungibilità garantita)
        if (gap > 120) newTierIndex = Math.min(newTierIndex, Math.max(0, lastTierIndex));
        lastTierIndex = newTierIndex;
        let platformTop = tiers[newTierIndex];

        if (chunkType <= 2) {
            width = Phaser.Math.Between(100, 160); // Piattaforme piccole ma non impossibili
        }

        const newX = lastChunkX + gap + width / 2;
        const platHeight = GROUND_BOTTOM - platformTop; // colonna di mattoni fino in fondo
        const platCenterY = platformTop + (platHeight / 2);

        const plat = scene.add.tileSprite(newX, platCenterY, width, platHeight, 'floorbricks');
        plat.tileScaleX = 2; plat.tileScaleY = 2;
        scene.physics.add.existing(plat, true);
        platforms.add(plat);

        let leftB = scene.add.rectangle(newX - width/2, platformTop - 32, 2, 64, 0x000000, 0);
        scene.physics.add.existing(leftB, true); enemyBlockers.add(leftB);
        let rightB = scene.add.rectangle(newX + width/2, platformTop - 32, 2, 64, 0x000000, 0);
        scene.physics.add.existing(rightB, true); enemyBlockers.add(rightB);

        // ---- CONTENUTO: set-piece riconoscibili (scalinate, tubi, file di blocchi,
        //      mini-piattaforme di mattoni, archi di monete) invece di roba random ----
        const piece = buildSetPiece(scene, newX, width, platformTop);

        // Decorazioni di scenario (cespugli / recinto a livello terra)
        if (width > 170 && Math.random() > 0.45) {
            const pool = [{ key: 'bush1', scale: 0.5 }, { key: 'bush2', scale: 0.7 }];
            if (platformTop >= 350) pool.push({ key: 'fence', scale: 0.55 });
            const pick = Phaser.Utils.Array.GetRandom(pool);
            const side = Math.random() > 0.5 ? 1 : -1;
            const decoX = newX + side * Phaser.Math.Between(width / 6, width / 2.5);
            const deco = scene.add.image(decoX, platformTop, pick.key)
                .setScale(pick.scale).setOrigin(0.5, 1).setDepth(1).setAlpha(0.92);
            decorations.add(deco);
        }

        // Niente nemico su set-piece con ostacoli SOLIDI a terra (tubi/scalinate):
        // resterebbe intrappolato a rimbalzare in loop tra l'ostacolo e il bordo.
        const groundObstacle = (piece === 'pipes' || piece === 'stairs');
        const enemyChance = Math.min(0.95, 0.7 + currentLevel * 0.06);
        if (!groundObstacle && Math.random() < enemyChance) {
            spawnEnemy(newX + (Math.random() > 0.5 ? width/4 : -width/4), platformTop - 16);
            // 2° nemico già su piattaforme medie (prima solo > 350)
            if (width > 240 && Math.random() < 0.6) {
                spawnEnemy(newX - width/3, platformTop - 16);
            }
            // 3° nemico su piattaforme molto larghe ai livelli avanzati
            if (width > 340 && currentLevel >= 2 && Math.random() < 0.5) {
                spawnEnemy(newX, platformTop - 16);
            }
        }

        lastChunkX += gap + width;
    }

    // ====================================================================
    // SET-PIECE: strutture riconoscibili costruite sulla piattaforma.
    // Scelte pesate da larghezza/quota/livello → livello "disegnato".
    // ====================================================================
    function buildSetPiece(scene, x, width, top) {
        const pool = ['blocks', 'coins', 'plain', 'plain'];
        if (width > 220) pool.push('brickrow', 'pipes');
        if (width > 200 && top >= 320) pool.push('stairs'); // scalinate su piattaforme non troppo alte
        if (currentLevel >= 2 && width > 220) pool.push('pipes', 'brickrow');
        const kind = Phaser.Utils.Array.GetRandom(pool);
        switch (kind) {
            case 'stairs':   buildStairs(scene, x, width, top); break;
            case 'pipes':    buildPipeRow(scene, x, width, top); break;
            case 'brickrow': buildBrickRow(scene, x, width, top); break;
            case 'blocks':   buildBlockRow(scene, x, width, top); break;
            case 'coins':    spawnCoinArc(scene, x, top - 50, Phaser.Math.Between(4, 6)); break;
            default: break;  // plain → solo decorazioni (gestite fuori)
        }
        return kind;
    }

    // Scalinata di blocchi solidi (hardblock), SEMPRE ascendente nel verso di corsa
    // (gradino basso a sinistra → alto a destra). Una scalinata "discendente" avrebbe
    // la colonna più alta a sinistra: per chi corre verso destra è un muro di 2-4
    // blocchi (64-128px, al limite del salto da ~160px) che, se ti trovi sul bordo
    // sinistro della camera tenendo SINISTRA, manda Espò in soft-lock (vedi segnalazione
    // "bloccato dal blocco"). Ascendente = salibile gradino per gradino, sempre.
    function buildStairs(scene, x, width, top) {
        const bs = 32; // blocco 16px * scala 2
        const maxSteps = Math.max(2, Math.min(4, Math.floor(width / 52)));
        const steps = Phaser.Math.Between(2, maxSteps);
        const ascending = true;
        const startX = x - (steps * bs) / 2 + bs / 2;
        for (let s = 0; s < steps; s++) {
            const h = ascending ? (s + 1) : (steps - s);
            const colX = startX + s * bs;
            for (let b = 0; b < h; b++) {
                const blk = platforms.create(colX, top - 16 - b * bs, 'hardblock').setScale(2);
                blk.refreshBody();
            }
        }
    }

    // Tubi sulla piattaforma → ostacoli da scavalcare. Spaziatura FISSA (>=120px)
    // così non si accatastano mai; numero limitato dalla larghezza.
    function buildPipeRow(scene, x, width, top) {
        const PIPE_GAP = 120;
        const maxN = Math.max(1, Math.min(3, Math.floor(width / PIPE_GAP)));
        const n = (maxN <= 1) ? 1 : Phaser.Math.Between(2, maxN);
        const totalW = (n - 1) * PIPE_GAP;
        const startX = x - totalW / 2;
        for (let i = 0; i < n; i++) {
            const k = Math.random() > 0.5 ? 'pipe-medium' : 'pipe-small';
            const obj = platforms.create(startX + i * PIPE_GAP, top, k).setScale(1.2).setOrigin(0.5, 1);
            obj.refreshBody();
        }
    }

    // Callback collisione player↔platforms: serve SOLO a gestire i mattoni rompibili.
    // Tutte le altre piattaforme restano solide senza logica extra (early return).
    function onPlayerPlatform(player, plat) {
        if (!plat.isBrick) return;
        // Testata DAL BASSO: il player colpisce il mattone con la testa mentre sale.
        // (in piedi SOPRA invece è blocked.down + touching.up → non si rompe).
        if (!(player.body.blocked.up && plat.body.touching.down)) return;
        if (playerForm !== 'small') {
            breakBrick(this, plat);            // potenziato (Super/Fire) → spacca il mattone
        } else {
            // Piccolo: il mattone rimbalza ma resta solido (come Mario).
            this.tweens.add({ targets: plat, y: plat.y - 5, yoyo: true, duration: 90 });
        }
    }

    // Distrugge un mattone in 4 frammenti (stile Mario) + suono + punti.
    function breakBrick(scene, brick) {
        const x = brick.x, y = brick.y;
        brick.destroy();                       // non più solido: il player può proseguire
        bonusScore += 50;
        playSoundEffect(scene, 'snd-stomp');
        showPopupScore(scene, x, y - 14, '+50', '#e08a4a', 600);
        const frag = (dx, dy) => {
            const f = scene.add.rectangle(x, y, 10, 10, 0xb5532a).setDepth(18);
            scene.physics.add.existing(f);
            f.body.setVelocity(dx, dy);
            f.body.setGravityY(900);
            scene.tweens.add({ targets: f, alpha: 0, angle: dx >= 0 ? 360 : -360,
                duration: 700, onComplete: () => { if (f && f.destroy) f.destroy(); } });
        };
        frag(-120, -260); frag(120, -260); frag(-70, -150); frag(70, -150);
    }

    // Mini-piattaforma di mattoni solidi all'altezza di salto + monete sopra.
    function buildBrickRow(scene, x, width, top) {
        const maxN = Math.max(3, Math.min(6, Math.floor(width / 36)));
        const n = Phaser.Math.Between(3, maxN);
        const by = top - Phaser.Math.Between(95, 120);
        const startX = x - ((n - 1) * 32) / 2;
        for (let i = 0; i < n; i++) {
            const blk = platforms.create(startX + i * 32, by, 'brick').setScale(2);
            blk.isBrick = true; // rompibile dal basso quando Espò è potenziato (Super/Fire)
            blk.refreshBody();
        }
        if (Math.random() > 0.4) spawnCoinsList(scene, x, by - 40, Math.min(n, 4));
    }

    // Fila di blocchi mistero (colpibili da sotto) all'altezza di salto.
    function buildBlockRow(scene, x, width, top) {
        const n = Phaser.Math.Between(1, 3);
        const by = top - 120;
        for (let i = 0; i < n; i++) {
            const bx = x - ((n - 1) * 32) / 2 + i * 32;
            const b = blocks.create(bx, by, 'misteryBlock').setScale(2).refreshBody();
            b.anims.play('block-flash', true);
            b.used = false;
        }
    }

    function spawnCoinsList(scene, centerX, yPos, numCoins) {
        for (let i = 0; i < numCoins; i++) {
            const cx = centerX - ((numCoins-1)*16) + (i * 32);
            let coin = coins.create(cx, yPos, 'coin').setScale(1.5);
            coin.anims.play('coin-spin', true);
            scene.tweens.add({ targets: coin, y: coin.y - 8, yoyo: true, repeat: -1, duration: 800 });
        }
    }

    // Arco di monete (curva verso l'alto) — varietà rispetto alla fila dritta.
    function spawnCoinArc(scene, centerX, baseY, numCoins) {
        for (let i = 0; i < numCoins; i++) {
            const t = numCoins > 1 ? (i / (numCoins - 1)) : 0.5; // 0..1
            const cx = centerX - ((numCoins - 1) * 16) + (i * 32);
            const cy = baseY - Math.sin(t * Math.PI) * 46;       // apice al centro
            const coin = coins.create(cx, cy, 'coin').setScale(1.5);
            coin.anims.play('coin-spin', true);
        }
    }

    function spawnEnemy(x, y) {
        // Koopa (più alto, un filo più lento) può comparire da subito per varietà.
        // Stomp → guscio. ~32% dei nemici sono Koopa.
        const isKoopa = Math.random() < 0.32;
        const enemy = enemies.create(x, isKoopa ? y - 10 : y, isKoopa ? 'koopa' : 'goomba').setScale(1.5);
        enemy.kind = isKoopa ? 'koopa' : 'goomba';
        enemy.setDepth(5); // sopra le decorazioni (depth 1), sotto il player (20)
        enemy.setBounceX(1);
        let eSpeed = Phaser.Math.Between(50, 100) + (currentLevel * 5);
        if (isKoopa) eSpeed = Math.round(eSpeed * 0.8);
        if (Math.random() > 0.5) eSpeed = -eSpeed;
        enemy.setVelocityX(eSpeed);
        enemy.anims.play(isKoopa ? 'koopa-walk' : 'goomba-walk', true);
    }

    function showLevelUp(scene, level) {
        let text = scene.add.text(scene.cameras.main.centerX, 100, `LOOP ${level}`, {
            fontFamily: 'Rajdhani', fontSize: '48px', color: '#f1c40f', stroke: '#000', strokeThickness: 6
        }).setOrigin(0.5).setScrollFactor(0); 
        scene.tweens.add({ targets: text, y: 50, alpha: 0, duration: 2000, ease: 'Power2', onComplete: () => text.destroy() });
    }

    function collectCoin(player, coin) {
        coin.destroy();
        bonusScore += 20;
        playSoundEffect(this, 'snd-coin');
    }

    // Dispatcher: in base a powerUp.kind decide se dare invincibilità o fire mode
    function collectPowerUp(player, item) {
        if (item.kind === 'fire') collectFireFlower.call(this, player, item);
        else if (item.kind === 'mushroom') collectMushroom.call(this, player, item);
        else collectStar.call(this, player, item);
    }

    function collectStar(player, star) {
        star.destroy();
        bonusScore += 250; // bonus immediato
        invincibleUntil = this.time.now + STAR_DURATION_MS;
        playSoundEffect(this, 'snd-star-collect');

        // Mini-toast in-game tipo "INVINCIBLE!" sopra il personaggio
        showPopupScore(this, player.x, player.y - 50, '⭐ INVINCIBILE! ⭐', '#ffd83d', 1100);

        // Notifica anche fuori dal canvas (sistema toast del gioco principale)
        if (window.EspooClicker && window.EspooClicker.showToast) {
            window.EspooClicker.showToast('⭐ SUPER STELLA! Sei invincibile per ' + (STAR_DURATION_MS / 1000) + 's', 'reward');
        }
    }

    function collectFireFlower(player, flower) {
        try {
            if (flower && flower.destroy) flower.destroy();
            bonusScore += FIRE_COLLECT_SCORE;
            playSoundEffect(this, 'snd-star-collect');
            setPlayerForm(this, 'fire');   // diventa Fire (da qualsiasi forma)
            fireballAmmo = MAX_FIREBALLS;   // caricatore pieno alla raccolta
            fireballReloadUntil = 0;
            player.setTint(0xffcc00);
            this.time.delayedCall(200, () => { if (player && player.clearTint) player.clearTint(); });
            showPopupScore(this, player.x, player.y - 50, '🔥 FIRE ESPO! 🔥', '#ff6347', 1100);
            showFireHint(this);
            if (window.EspooClicker && window.EspooClicker.showToast) {
                window.EspooClicker.showToast((window.ARCADE_TXT && window.ARCADE_TXT.fireFlower) || '🔥 FIRE FLOWER! Premi X o F per sparare palle di fuoco', 'reward');
            }
        } catch (err) {
            console.error('[super-espo] collectFireFlower fail:', err);
        }
    }

    // Super Mushroom: small → grown. Se già grown/fire → bonus punti.
    function collectMushroom(player, mush) {
        if (mush && mush.destroy) mush.destroy();
        bonusScore += MUSH_COLLECT_SCORE;
        playSoundEffect(this, 'snd-star-collect');
        if (playerForm === 'small') {
            setPlayerForm(this, 'grown');
            player.setTint(0x9cff7a);
            this.time.delayedCall(200, () => { if (player && player.clearTint) player.clearTint(); });
            showPopupScore(this, player.x, player.y - 50, '🍄 SUPER ESPO!', '#9cff7a', 1100);
            if (window.EspooClicker && window.EspooClicker.showToast) {
                window.EspooClicker.showToast('🍄 SUPER MUSHROOM! Sei cresciuto', 'reward');
            }
        } else {
            bonusScore += 150;
            showPopupScore(this, player.x, player.y - 50, '🍄 +' + (MUSH_COLLECT_SCORE + 150), '#9cff7a', 900);
        }
    }

    // ---- Fire Hint UI ----------------------------------------------------
    let fireHintText = null;
    function showFireHint(scene) {
        if (fireHintText && fireHintText.scene) return; // già visibile
        fireHintText = scene.add.text(
            scene.cameras.main.width - 20, 20,
            '🔥 X / F → SPARA',
            {
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: '16px',
                color: '#ff6347',
                stroke: '#000',
                strokeThickness: 4,
                fontStyle: 'bold'
            }
        ).setOrigin(1, 0).setScrollFactor(0).setDepth(100);
        scene.tweens.add({
            targets: fireHintText, alpha: 0.6, duration: 600, yoyo: true, repeat: -1
        });
    }
    function hideFireHint() {
        if (fireHintText && fireHintText.destroy) {
            fireHintText.destroy();
            fireHintText = null;
        }
    }

    // ---- Stuck Hint UI (anti soft-lock) ----------------------------------
    // Banner pulsante, fisso a schermo, che resta finché Espò non riprende ad
    // avanzare (poi viene nascosto dal tracciamento di maxDist in update()).
    let stuckHintText = null;
    function showStuckHint(scene) {
        if (stuckHintText && stuckHintText.scene) return; // già visibile
        const msg = (window.ARCADE_TXT && window.ARCADE_TXT.hint && window.ARCADE_TXT.hint.stuck)
            || 'Vai a destra e salta per superare l\'ostacolo';
        stuckHintText = scene.add.text(scene.cameras.main.centerX, 150, '→  ' + msg, {
            fontFamily: 'Rajdhani, sans-serif', fontSize: '20px', color: '#ffe066',
            stroke: '#000', strokeThickness: 5, fontStyle: 'bold', align: 'center'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(120);
        scene.tweens.add({ targets: stuckHintText, alpha: 0.4, duration: 500, yoyo: true, repeat: -1 });
    }
    function hideStuckHint() {
        if (stuckHintText && stuckHintText.destroy) {
            stuckHintText.destroy();
            stuckHintText = null;
        }
    }

    // ---- Fireball shooting ----------------------------------------------
    const FIREBALL_SPEED = 320;
    const FIREBALL_BOUNCE_Y = -220;
    const FIREBALL_GRAVITY_Y = 600;
    const FIREBALL_COOLDOWN_MS = 280;  // gap minimo tra un colpo e l'altro
    const FIREBALL_LIFE_MS = 2400;
    const MAX_FIREBALLS = 3;           // colpi per "caricatore"
    const FIREBALL_RELOAD_MS = 2500;   // attesa di ricarica a caricatore vuoto
    let lastFireballTime = 0;
    let fireballAmmo = MAX_FIREBALLS;
    let fireballReloadUntil = 0;

    // Esplosione one-shot all'impatto del fireball (nemico o fine vita).
    function spawnExplosion(scene, x, y) {
        if (!scene.anims.exists('fireball-explode')) return;
        const ex = scene.add.sprite(x, y, 'fireball-explosion', 0).setScale(2.5).setDepth(16);
        ex.play('fireball-explode');
        ex.once('animationcomplete', () => { if (ex && ex.destroy) ex.destroy(); });
    }

    function shootFireball(scene) {
        if (playerForm !== 'fire' || !player || player.isDead) return;
        const now = scene.time.now;
        if (fireballAmmo <= 0) return;                              // caricatore vuoto → in ricarica
        if (now - lastFireballTime < FIREBALL_COOLDOWN_MS) return;  // gap tra colpi
        lastFireballTime = now;

        fireballAmmo--;
        // Esaurito il caricatore → avvia il timer di ricarica
        if (fireballAmmo <= 0) fireballReloadUntil = now + FIREBALL_RELOAD_MS;

        const dir = player.flipX ? -1 : 1;
        const fb = fireballs.create(
            player.x + dir * 22,
            player.y - 4,
            'fireball',
            0
        );
        fb.setScale(2.5);
        fb.setDepth(15);
        fb.body.setSize(6, 6).setOffset(1, 1);
        fb.body.allowGravity = true;
        fb.body.setGravityY(FIREBALL_GRAVITY_Y);
        fb.body.setVelocityX(dir * FIREBALL_SPEED);
        fb.body.setVelocityY(-150);
        fb.body.setBounceY(0.85);
        fb.body.setBounceX(0);
        fb.dir = dir;
        fb.bornAt = now;

        // Anim spin (4 frame fireball). Lo sprite è già arancio: niente tint né rotation extra.
        if (scene.anims.exists('fireball-spin')) fb.anims.play('fireball-spin');

        // Auto-despawn con piccola esplosione finale
        scene.time.delayedCall(FIREBALL_LIFE_MS, () => {
            if (fb && fb.active) { spawnExplosion(scene, fb.x, fb.y); fb.destroy(); }
        });

        playSoundEffect(scene, 'snd-jump');
    }

    function fireballHitEnemy(fb, enemy) {
        if (!fb || !enemy) return;
        spawnExplosion(this, fb.x, fb.y);
        if (fb.destroy) fb.destroy();
        // Riusa logica stomp
        if (enemy.body) enemy.body.enable = false;
        if (enemy.anims) enemy.anims.play('goomba-dead');
        bonusScore += 50;
        playSoundEffect(this, 'snd-stomp');
        const scene = this;
        scene.tweens.add({
            targets: enemy, y: enemy.y + 30, alpha: 0, duration: 400,
            onComplete: () => { if (enemy.destroy) enemy.destroy(); }
        });
        showPopupScore(scene, enemy.x, enemy.y - 20, '+50', '#ff6347', 600);
    }

    function fireballHitGround(fb) {
        // Sul PAVIMENTO (blocked.down) rimbalza: lo gestisce la physics, e oltre il bordo
        // la palla cade nel vuoto. Contro un MURO/gradino verticale (blocked.left/right)
        // invece ESPLODE come in Mario, così non resta incastrata a rimbalzare sul posto
        // al piede della parete (segnalazione: "le fireball non cadono / restano sul bordo").
        if (!fb || !fb.body) return;
        if (fb.body.blocked.left || fb.body.blocked.right) {
            spawnExplosion(this, fb.x, fb.y);
            if (fb.destroy) fb.destroy();
            return;
        }
        // Despawn quando esce dalla vista orizzontalmente
        if (fb.x < this.cameras.main.scrollX - 100 || fb.x > this.cameras.main.scrollX + this.cameras.main.width + 100) {
            if (fb.destroy) fb.destroy();
        }
    }

    // Mostra un testo "+100" che fluttua verso l'alto e svanisce. Utile per il
    // feedback visivo immediato di stomp/kill goomba e raccolta stella.
    function showPopupScore(scene, x, y, text, color, duration) {
        const txt = scene.add.text(x, y, text, {
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: '20px',
            color: color || '#ffffff',
            stroke: '#000',
            strokeThickness: 4,
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(40);
        scene.tweens.add({
            targets: txt,
            y: y - 40,
            alpha: 0,
            duration: duration || 700,
            ease: 'Power2',
            onComplete: () => txt.destroy()
        });
    }

    function hitBlock(player, block) {
        if (player.body.touching.up && block.body.touching.down && !block.used) {
            block.used = true;
            block.anims.stop();
            block.setTexture('emptyBlock');
            this.tweens.add({ targets: block, y: block.y - 10, yoyo: true, duration: 100 });

            const isInvincible = (this.time.now < invincibleUntil);
            const roll = Math.random();

            // Roll a 3 vie:
            //   [0, STAR_DROP_CHANCE)              → Super Stella (se non già invincibile)
            //   [STAR_DROP_CHANCE, +FIRE)          → Fire Flower (se non già fire)
            //   [resto]                            → Moneta
            // Lo skip dei power-up duplicati promuove automaticamente la moneta.
            // Se small → priorità fungo (cresci). Poi stella, poi fiore, poi moneta.
            if (playerForm === 'small' && roll < MUSH_DROP_CHANCE) {
                bonusScore += 50;
                spawnMushroom(this, block.x, block.y - 20);
                playSoundEffect(this, 'snd-star-appears');
                return;
            }
            if (!isInvincible && roll < STAR_DROP_CHANCE) {
                bonusScore += 50;
                spawnStar(this, block.x, block.y - 20);
                playSoundEffect(this, 'snd-star-appears');
                return;
            }
            if (playerForm !== 'fire' && roll < STAR_DROP_CHANCE + FIRE_DROP_CHANCE) {
                bonusScore += 50;
                spawnFireFlower(this, block.x, block.y - 20);
                playSoundEffect(this, 'snd-star-appears');
                return;
            }

            // Comportamento standard: moneta + bonus score
            bonusScore += 150;
            playSoundEffect(this, 'snd-coin');

            const popCoin = this.add.sprite(block.x, block.y - 20, 'coin').setScale(1.5).setDepth(30);
            popCoin.anims.play('coin-spin', true);
            this.tweens.add({
                targets: popCoin, y: block.y - 80, alpha: 0, duration: 600, ease: 'Power2',
                onComplete: () => popCoin.destroy()
            });
        }
    }

    // Fa uscire la Super Stella da un blocco e la mette in moto come Mario classic:
    // emerge dal blocco con un piccolo tween, poi prende fisica e rimbalza orizzontalmente.
    function spawnStar(scene, x, y) {
        const star = powerUps.create(x, y, 'super-star').setDepth(25);
        star.kind = 'star';
        star.setBounce(1, 0.8);          // rimbalza in orizzontale e verticale come Mario
        star.body.allowGravity = false;  // gravity disattivata durante l'emersione
        star.body.setSize(20, 20).setOffset(2, 2);

        // Animazione di emersione: sale di 24 px sopra il blocco prima di prendere vita
        scene.tweens.add({
            targets: star, y: y - 24, duration: 400, ease: 'Power2',
            onComplete: () => {
                star.body.allowGravity = true;
                star.setVelocityX(120);  // si muove a destra
                star.setVelocityY(-260); // primo balzo verticale
            }
        });

        // Rotazione visiva continua
        scene.tweens.add({ targets: star, angle: 360, duration: 900, repeat: -1 });
    }

    // Fire Flower: emerge dal blocco e si ferma. Niente rimbalzo come la stella;
    // il giocatore deve correrci dentro per raccoglierla.
    function spawnFireFlower(scene, x, y) {
        const flower = powerUps.create(x, y, 'fire-flower').setDepth(25).setScale(1.6);
        flower.kind = 'fire';
        flower.body.allowGravity = false;
        flower.body.immovable = true;
        flower.body.setSize(14, 14).setOffset(1, 1);

        // Anim 4 frames spritesheet (sprite Mario-style)
        if (scene.anims.exists('fire-flower-spin')) {
            flower.anims.play('fire-flower-spin');
        }

        // Emersione: sale dal blocco e si POSA sopra (non più flottante). y = block.y - 20,
        // quindi il tetto del blocco è a y+4; con metà fiore (~13px a scala 1.6) il centro
        // a riposo va a ~y-9 perché il bordo inferiore appoggi sul blocco.
        scene.tweens.add({ targets: flower, y: y - 10, duration: 500, ease: 'Power2' });

        // Pulsazione scale per attirare attenzione
        scene.tweens.add({
            targets: flower, scale: 1.9, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });
    }

    // Super Mushroom: emerge dal blocco, poi cammina e rimbalza (stile Mario).
    function spawnMushroom(scene, x, y) {
        const m = powerUps.create(x, y, 'super-mushroom').setDepth(25).setScale(1.5);
        m.kind = 'mushroom';
        m.body.allowGravity = false;
        m.body.setSize(14, 14).setOffset(1, 1);
        scene.tweens.add({
            targets: m, y: y - 22, duration: 400, ease: 'Power2',
            onComplete: () => {
                if (!m.active) return;
                m.body.allowGravity = true;
                m.setBounceX(1);
                m.setVelocityX(90);
            }
        });
    }

    function hitEnemy(player, enemy) {
        const isInvincible = (this.time.now < invincibleUntil);
        const inPowerDownIframes = (this.time.now < firePowerDownUntil);

        // Modalità Super Stella: qualsiasi contatto uccide il nemico.
        if (isInvincible) {
            bonusScore += STAR_KILL_SCORE;
            showPopupScore(this, enemy.x, enemy.y - 18, '+' + STAR_KILL_SCORE, '#ffd83d');
            enemy.body.enable = false;
            enemy.setVelocityX(0);
            // Effetto "knockback" del nemico in stile Mario star kill
            enemy.setVelocityY(-260);
            enemy.body.allowGravity = false; // evitiamo di farlo cadere troppo veloce
            this.tweens.add({ targets: enemy, alpha: 0, angle: 180, y: enemy.y + 80, duration: 500, onComplete: () => enemy.destroy() });
            playSoundEffect(this, 'snd-stomp');
            return;
        }

        // Iframes post-powerdown: ignora il contatto col nemico
        if (inPowerDownIframes) return;

        // Stomp grace: appena schiacciato un nemico, mentre si rimbalza in SU, ignora il
        // contatto ravvicinato con un secondo nemico → niente morte istantanea con 2
        // nemici affiancati. Ricadendoci sopra (vy>0) lo si schiaccia normalmente.
        if (this.time.now < stompGraceUntil && player.body.velocity.y < 0) return;

        // ---- GUSCIO KOOPA (kind 'shell') --------------------------------
        if (enemy.kind === 'shell') {
            if (enemy.shellState === 'moving') {
                // Stomp dall'alto su un guscio in corsa → lo ferma di nuovo
                const stomped = (player.body.bottom <= enemy.body.y + 12) && (player.body.velocity.y >= 0);
                if (stomped) {
                    stopShell(this, enemy);
                    player.setVelocityY(-300);
                    stompGraceUntil = this.time.now + STOMP_GRACE_MS;
                    bonusScore += STOMP_SCORE;
                    showPopupScore(this, enemy.x, enemy.y - 16, '+' + STOMP_SCORE, '#fff');
                    playSoundEffect(this, 'snd-stomp');
                } else {
                    // Colpito di lato da un guscio in corsa → danno
                    playerTakeHit(this);
                }
            } else {
                // Guscio fermo: calcialo (dopo il breve grace period)
                if (this.time.now >= (enemy.shellReadyAt || 0)) kickShell(this, enemy, player);
            }
            return;
        }

        // Schiacciata dall'alto (robusta con overlap): il player sta CADENDO e i suoi
        // piedi sono sopra la metà del nemico. Vale anche in fire mode.
        const stompFromAbove = player.body.velocity.y > 0 &&
            player.body.bottom <= enemy.body.y + (enemy.body.height * 0.5);
        if (stompFromAbove) {
            bonusScore += STOMP_SCORE;
            showPopupScore(this, enemy.x, enemy.y - 18, '+' + STOMP_SCORE, '#ffffff');
            player.setVelocityY(-300);
            stompGraceUntil = this.time.now + STOMP_GRACE_MS;
            playSoundEffect(this, 'snd-stomp');
            if (enemy.kind === 'koopa') {
                // Koopa schiacciato → guscio FERMO che resta calciabile (come in Mario)
                stopShell(this, enemy);
            } else {
                enemy.body.enable = false;
                enemy.setVelocityX(0);
                enemy.anims.play('goomba-dead');
                this.time.delayedCall(500, () => enemy.destroy());
            }
            return;
        }

        // Hit laterale/dal basso: downgrade forma (fire→grown→small→morte) + iframes invuln.
        playerTakeHit(this);
    }

    // Player colpito di lato/dal basso: power-down (fire→grown→small) o morte.
    function playerTakeHit(scene) {
        if (playerForm === 'fire' || playerForm === 'grown') {
            setPlayerForm(scene, playerForm === 'fire' ? 'grown' : 'small');
            firePowerDownUntil = scene.time.now + FIRE_HIT_INVUL_MS;
            hideFireHint();
            playSoundEffect(scene, 'snd-stomp');
            showPopupScore(scene, player.x, player.y - 30, 'POWER DOWN!', '#ff6347', 800);
            return;
        }
        die.call(scene);
    }

    // Koopa schiacciato/fermato → guscio immobile, calciabile dopo il grace period.
    function stopShell(scene, shell) {
        shell.kind = 'shell';
        shell.shellState = 'idle';
        shell.shellReadyAt = scene.time.now + SHELL_GRACE_MS;
        if (shell.body) { shell.body.enable = true; shell.setVelocityX(0); }
        if (scene.anims.exists('shell-idle')) shell.anims.play('shell-idle');
        else if (scene.textures.exists('shell')) shell.setTexture('shell', 0);
        if (shell._expireEvt) shell._expireEvt.remove(false);
        shell._expireEvt = scene.time.delayedCall(SHELL_LIFE_MS, () => {
            if (shell && shell.active && shell.shellState === 'idle') {
                scene.tweens.add({ targets: shell, alpha: 0, duration: 400, onComplete: () => { if (shell.destroy) shell.destroy(); } });
            }
        });
    }

    // Guscio calciato → scivola veloce nella direzione opposta al player.
    function kickShell(scene, shell, byPlayer) {
        shell.shellState = 'moving';
        const dir = (shell.x >= byPlayer.x) ? 1 : -1;
        if (shell.body) { shell.body.enable = true; shell.setVelocityX(dir * SHELL_SPEED); }
        shell.flipX = dir > 0;
        if (scene.anims.exists('shell-spin')) shell.anims.play('shell-spin', true);
        playSoundEffect(scene, 'snd-stomp');
        showPopupScore(scene, shell.x, shell.y - 16, 'KICK!', '#ffffff', 500);
        if (shell._expireEvt) shell._expireEvt.remove(false);
        shell._expireEvt = scene.time.delayedCall(SHELL_LIFE_MS, () => {
            if (shell && shell.active) {
                scene.tweens.add({ targets: shell, alpha: 0, duration: 400, onComplete: () => { if (shell.destroy) shell.destroy(); } });
            }
        });
    }

    // Overlap nemici↔nemici: un guscio in movimento travolge i nemici normali.
    function shellVsEnemy(a, b) {
        let shell = null, victim = null;
        if (a.kind === 'shell' && a.shellState === 'moving') { shell = a; victim = b; }
        else if (b.kind === 'shell' && b.shellState === 'moving') { shell = b; victim = a; }
        if (!shell || !victim || !victim.active || victim.kind === 'shell') return;
        if (victim.body) victim.body.enable = false;
        victim.setVelocityX(0);
        if (victim.kind === 'goomba' && this.anims.exists('goomba-dead')) victim.anims.play('goomba-dead');
        bonusScore += SHELL_KILL_SCORE;
        showPopupScore(this, victim.x, victim.y - 18, '+' + SHELL_KILL_SCORE, '#ffd83d');
        playSoundEffect(this, 'snd-stomp');
        this.tweens.add({ targets: victim, alpha: 0, angle: 180, y: victim.y + 40, duration: 450, onComplete: () => { if (victim.destroy) victim.destroy(); } });
    }

    // Volumi di FALLBACK (il valore vero arriva dal mixer, vedi sotto).
    // I file sorgente sono stati normalizzati a ~-23.9 LUFS, lo stesso livello di
    // sound-arcade-start: prima fra loro correvano 32 dB, con star-collect a
    // -4.9 LUFS e picco oltre il fondo scala e goomba-stomp a -36.6 quasi
    // inudibile. Nessun volume di riproduzione poteva raddrizzare una forbice
    // simile, per questo si è intervenuti sui file.
    // Ora che sono uniformi questi numeri esprimono solo l'intento di design:
    // basso ciò che suona di continuo, alto ciò che è un evento.
    // Devono restare allineati ai defaultVol in src/data/assets.ts.
    const SUPER_ESPO_VOLUMES = {
        'snd-jump':         0.13,  // ogni salto e ogni fireball: il più frequente in assoluto
        'snd-coin':         0.22,
        'snd-stomp':        0.30,  // nemici, blocchi rotti, colpi di guscio
        'snd-star-appears': 0.35,  // comparsa di fungo, stella o fiore
        'snd-star-collect': 0.45,  // raccolta power-up: momento premiante
        // Non normalizzato: è lo stesso file di game-over.mp3, condiviso con
        // asteroids/centipede/invaders/space. Toccarlo avrebbe cambiato il suono
        // a 4 giochi estranei, quindi resta a -19.9 LUFS e allineato al
        // defaultVol di sound-arcade-gameover.
        'snd-gameover':     0.50,
    };

    // Chiave Phaser → id nel mixer del gioco principale (src/data/assets.ts).
    // Il gameover riusa sound-arcade-gameover: è lo stesso identico file (md5
    // uguale a assets/sounds/arcade/game-over.mp3), inutile una voce doppia.
    const SUPER_ESPO_MIXER_IDS = {
        'snd-jump':         'sound-espo-jump',
        'snd-coin':         'sound-espo-coin',
        'snd-stomp':        'sound-espo-stomp',
        'snd-gameover':     'sound-arcade-gameover',
        'snd-star-appears': 'sound-espo-star-appears',
        'snd-star-collect': 'sound-espo-star-collect',
    };

    // master × canale SFX × livello del singolo suono — la stessa formula del
    // gioco principale (AudioManager._calcVolume). I valori arrivano dallo stub
    // di arcade-page.js, che li legge dalla fotografia in localStorage.
    function playSoundEffect(scene, key) {
        const fallback = SUPER_ESPO_VOLUMES[key] !== undefined ? SUPER_ESPO_VOLUMES[key] : 0.2;
        let master = 1, sfx = 1, custom = fallback;

        const gs = window.EspooClicker ? window.EspooClicker.getGameState() : null;
        const u = gs && gs.user;
        if (u) {
            if (typeof u.masterVolume === 'number') master = u.masterVolume;
            if (typeof u.sfxVolume === 'number') sfx = u.sfxVolume;
            const id = SUPER_ESPO_MIXER_IDS[key];
            const c = (id && u.audioCustom) ? u.audioCustom[id] : undefined;
            if (typeof c === 'number') custom = c;
        }

        // NB: prima, se lo stub non esponeva gs.user, questo ramo usciva senza
        // suonare nulla; ora il fallback vale sempre e l'audio non sparisce mai.
        const vol = Math.max(0, Math.min(1, master * sfx * custom));
        if (vol > 0.005) scene.sound.play(key, { volume: vol });
    }

    function updateUI() {
        const el = document.getElementById('super-espo-score-ui');
        if (el) {
            const levelEl = el.querySelector('.val-level');
            const scoreEl = el.querySelector('.val-score');
            const recordEl = el.querySelector('.val-record');
            if (levelEl) levelEl.innerText = currentLevel;
            if (scoreEl) scoreEl.innerText = currentScore;
            if (recordEl) {
                // Record letto UNA volta per run (cambia solo in die()): evita
                // getGameState() — alloc oggetto + Proxy + read localStorage — a ogni frame.
                if (_suRecordCache < 0) {
                    const gs = window.EspooClicker ? window.EspooClicker.getGameState() : null;
                    _suRecordCache = (gs && gs.arcadeHighScores) ? (gs.arcadeHighScores.superespo || 0) : 0;
                }
                recordEl.innerText = Math.max(_suRecordCache, currentScore);
            }
        }
    }

    function die() {
        if (player.isDead) return;
        player.isDead = true;
        playerForm = 'small';
        hideFireHint();
        hideStuckHint();
        if (fireballs && fireballs.clear) fireballs.clear(true, true);

        player.setTint(0xff0000);
        player.setVelocityX(0);
        player.setVelocityY(-350);
        player.setCollideWorldBounds(false);
        player.body.checkCollision.none = true;
        
        enemies.getChildren().forEach(e => e.setVelocityX(0)); 

        playSoundEffect(this, 'snd-gameover');
        if (window.arcadeSfx) window.arcadeSfx.gameover();

        let reward = 0;
        if (typeof window.Decimal !== 'undefined' && typeof window.bps !== 'undefined' && typeof window.bps.gt === 'function') {
            const bpsVal = window.bps.gt(0) ? window.bps : new window.Decimal(1);
            let multiplier = new window.Decimal(0.05).mul(currentLevel); 
            reward = bpsVal.mul(currentScore).mul(multiplier).floor();
        }

        let isNewRecord = false;
        let rewardStr = null;
        if (window.EspooClicker) {
            const gs = window.EspooClicker.getGameState();
            let hasReward = typeof reward.gt === 'function' ? reward.gt(0) : reward > 0;
            if (currentScore > 0 && hasReward) {
                gs.score = gs.score.add(reward);
                rewardStr = window.EspooClicker.formatNumber(reward);
            }
            if (!gs.arcadeHighScores) gs.arcadeHighScores = {};
            if (currentScore > (gs.arcadeHighScores.superespo || 0)) {
                gs.arcadeHighScores.superespo = currentScore;
                isNewRecord = true;
            }
            window.EspooClicker.saveGame();
            window.updateUI?.();
        }

        // Game Over animato condiviso (stile Snake), dopo l'animazione di morte.
        // Salviamo l'id: se l'utente esce (MENU) entro 1800ms, exitSuperEspoGame lo annulla
        // per non aprire l'overlay su un container gia' svuotato.
        if (_suDieTimer) clearTimeout(_suDieTimer);
        _suDieTimer = setTimeout(() => {
            _suDieTimer = null;
            if (typeof window.showArcadeGameOver === 'function') {
                window.showArcadeGameOver({
                    overlay: document.getElementById('super-espo-overlay'),
                    score: currentScore,
                    rewardStr: rewardStr,
                    isNewRecord: isNewRecord,
                    statLabel: 'LOOP', statValue: currentLevel, statColor: '#9b59b6',
                    onReturn: window.exitSuperEspoGame,
                    onRetry: window.startSuperEspoRun
                });
            }
        }, 1800);
    }

})();