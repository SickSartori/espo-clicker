// code/arcade/super-espo/js/super-espo.js

(function () {
    let espoGame = null;

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
            <div class="arcade-stats-box" id="super-espo-score-ui">
                <span class="stat">LOOP: <span class="val-level" style="color:#e74c3c; font-weight:bold;">1</span></span>
                <span class="stat">SCORE: <span class="val-score">0</span></span>
                <span class="stat">RECORD: <span class="val-record">${highScore}</span></span>
            </div>
        `;
        gameContainer.appendChild(headerDiv);

        const canvasWrapper = document.createElement('div');
        canvasWrapper.id = 'phaser-espo-container';
        canvasWrapper.className = 'crt-turn-on crt-effect';
        canvasWrapper.style.position = 'relative';
        canvasWrapper.style.width = '800px';
        canvasWrapper.style.height = '400px';

        const mobileControls = document.createElement('div');
        mobileControls.id = 'super-espo-mobile-controls';
        mobileControls.innerHTML = `
            <div style="display:flex; gap:10px;">
                <button onpointerdown="window.espoCustomKeys.left=true" onpointerup="window.espoCustomKeys.left=false" onpointerleave="window.espoCustomKeys.left=false">◀</button>
                <button onpointerdown="window.espoCustomKeys.down=true" onpointerup="window.espoCustomKeys.down=false" onpointerleave="window.espoCustomKeys.down=false">▼</button>
                <button onpointerdown="window.espoCustomKeys.right=true" onpointerup="window.espoCustomKeys.right=false" onpointerleave="window.espoCustomKeys.right=false">▶</button>
            </div>
            <button onpointerdown="window.espoCustomKeys.up=true" onpointerup="window.espoCustomKeys.up=false" onpointerleave="window.espoCustomKeys.up=false">▲</button>
        `;
        canvasWrapper.appendChild(mobileControls);

        const overlay = document.createElement('div');
        overlay.id = 'super-espo-overlay';
        overlay.className = 'arcade-ui-overlay';
        overlay.innerHTML = `
            <div class="super-espo-title">SUPER ESPÒ</div>
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
        if (espoGame) { espoGame.destroy(true); espoGame = null; }
        const selector = document.getElementById('arcade-game-selector');
        const gameContainer = document.getElementById('arcade-active-game-container');
        if (gameContainer) { gameContainer.innerHTML = ''; gameContainer.style.display = 'none'; }
        if (selector) selector.style.display = 'flex';
        if (window.EspooClicker) window.EspooClicker.playSound('sound-click');
    };

    window.startSuperEspoRun = function () {
        if (document.activeElement) document.activeElement.blur();
        window.focus();

        document.getElementById('super-espo-overlay').style.display = 'none';
        
        if (espoGame) espoGame.destroy(true);

        window.espoCustomKeys = { left: false, right: false, down: false, up: false };

        const config = {
            type: Phaser.AUTO,
            width: 800,
            height: 400,
            backgroundColor: '#5c94fc', 
            parent: 'phaser-espo-container',
            pixelArt: true,
            physics: {
                default: 'arcade',
                arcade: { gravity: { y: 720 }, debug: false }
            },
            scene: { preload: preload, create: create, update: update }
        };

        espoGame = new Phaser.Game(config);
    };

    let player, cursors, wasdKeys, platforms, blocks, enemies, enemyBlockers, coins;
    let bgMountains, bgClouds, decorations;
    let lastChunkX = 0;
    let lastTierIndex = 0; // Traccia il tier precedente per transizioni graduali
    
    let currentScore = 0;
    let maxDist = 0;
    let bonusScore = 0;
    let currentLevel = 1;
    let upWasDown = false; 

    function preload() {
        const basePath = 'arcade/super-espo/assets/';
        const v = '?v=' + Date.now();

        this.load.spritesheet('super-espo', basePath + 'espo-grown.png' + v, { frameWidth: 250, frameHeight: 424 });
        this.load.image('floorbricks', basePath + 'floorbricks.png' + v);
        this.load.image('emptyBlock', basePath + 'emptyBlock.png' + v);
        this.load.spritesheet('misteryBlock', basePath + 'misteryBlock.png' + v, { frameWidth: 16, frameHeight: 16 });
        this.load.spritesheet('goomba', basePath + 'goomba.png' + v, { frameWidth: 16, frameHeight: 16 });
        this.load.image('bush1', basePath + 'bush1.png' + v);
        this.load.image('bush2', basePath + 'bush2.png' + v);
        this.load.image('mountain1', basePath + 'mountain1.png' + v);
        this.load.image('mountain2', basePath + 'mountain2.png' + v);
        this.load.image('cloud1', basePath + 'cloud1.png' + v);
        this.load.image('cloud2', basePath + 'cloud2.png' + v);
        this.load.image('fence', basePath + 'fence.png' + v);
        this.load.spritesheet('coin', basePath + 'coin.png' + v, { frameWidth: 16, frameHeight: 16 });
        this.load.image('pipe-small', basePath + 'vertical-small-tube.png' + v);
        this.load.image('pipe-medium', basePath + 'vertical-medium-tube.png' + v);

        this.load.audio('snd-jump', basePath + 'jump.wav' + v);
        this.load.audio('snd-gameover', basePath + 'gameover.mp3' + v);
        this.load.audio('snd-coin', basePath + 'coin.mp3' + v);
        this.load.audio('snd-stomp', basePath + 'goomba-stomp.wav' + v);
    }

    function create() {
        this.physics.world.setBounds(0, 0, Number.MAX_SAFE_INTEGER, 1000);
        this.physics.world.checkCollision.down = false; 

        this.anims.create({ key: 'goomba-walk', frames: this.anims.generateFrameNumbers('goomba', { start: 0, end: 1 }), frameRate: 6, repeat: -1 });
        this.anims.create({ key: 'goomba-dead', frames: [{ key: 'goomba', frame: 2 }] });
        this.anims.create({ key: 'block-flash', frames: this.anims.generateFrameNumbers('misteryBlock', { start: 0, end: 2 }), frameRate: 6, repeat: -1, yoyo: true });
        this.anims.create({ key: 'coin-spin', frames: this.anims.generateFrameNumbers('coin', { start: 0, end: 3 }), frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'espo-stop', frames: this.anims.generateFrameNumbers('super-espo', { start: 0, end: 0 }), frameRate: 1 });
        this.anims.create({ key: 'espo-run', frames: this.anims.generateFrameNumbers('super-espo', { start: 1, end: 3 }), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'espo-crouch', frames: [{ key: 'super-espo', frame: 4 }], frameRate: 1 });
        this.anims.create({ key: 'espo-jump', frames: this.anims.generateFrameNumbers('super-espo', { start: 5, end: 5 }), frameRate: 1 });

        bgMountains = this.add.group();
        bgClouds = this.add.group();

        for (let i = 0; i < 4; i++) {
            let mKey = i % 2 === 0 ? 'mountain1' : 'mountain2';
            let mt = this.add.image(i * 350, 450, mKey).setScale(2).setOrigin(0.5, 1).setScrollFactor(0.2, 1);
            bgMountains.add(mt);
        }

        for (let i = 0; i < 6; i++) {
            let cKey = i % 2 === 0 ? 'cloud1' : 'cloud2';
            let cloud = this.add.image(i * 200, Phaser.Math.Between(80, 180), cKey)
                            .setScale(Phaser.Math.FloatBetween(0.15, 0.4)).setScrollFactor(0.4, 1);
            bgClouds.add(cloud);
        }

        platforms = this.physics.add.staticGroup();
        blocks = this.physics.add.staticGroup();
        enemyBlockers = this.physics.add.staticGroup();
        enemies = this.physics.add.group();
        coins = this.physics.add.group({ allowGravity: false });
        decorations = this.add.group();

        let groundWidth = 1500;
        let startPlatformTop = 360; 
        let groundHeight = 500 - startPlatformTop; 
        
        let ground = this.add.tileSprite(groundWidth / 2, startPlatformTop + (groundHeight / 2), groundWidth, groundHeight, 'floorbricks');
        ground.tileScaleX = 2; ground.tileScaleY = 2;
        this.physics.add.existing(ground, true);
        platforms.add(ground);

        // Decorazioni iniziali sulla piattaforma di partenza
        const startDecos = [
            { key: 'bush2', x: 350, scale: 0.7 },
            { key: 'fence', x: 700, scale: 0.55 },
            { key: 'bush1', x: 1100, scale: 0.5 }
        ];
        startDecos.forEach(d => {
            const deco = this.add.image(d.x, startPlatformTop, d.key)
                .setScale(d.scale).setOrigin(0.5, 1).setDepth(1).setAlpha(0.9);
            decorations.add(deco);
        });

        lastChunkX = groundWidth;
        lastTierIndex = 0;
        currentScore = 0; maxDist = 0; bonusScore = 0; currentLevel = 1;

        player = this.physics.add.sprite(100, 100, 'super-espo', 0);
        player.setCollideWorldBounds(true);
        player.setScale(42 / player.height); // ~13% dello schermo visibile (stile Mario NES)
        player.setDepth(20);
        player.isDead = false;

        this.cameras.main.setZoom(1.25);
        const offsetX = -(this.sys.game.config.width * 0.3); 
        this.cameras.main.setBounds(0, 80, Number.MAX_SAFE_INTEGER, 320);
        this.cameras.main.startFollow(player, true, 1, 0, offsetX, 0); 

        cursors = this.input.keyboard.createCursorKeys();
        wasdKeys = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W, left: Phaser.Input.Keyboard.KeyCodes.A,
            down: Phaser.Input.Keyboard.KeyCodes.S, right: Phaser.Input.Keyboard.KeyCodes.D
        });

        this.input.keyboard.addCapture('UP,DOWN,LEFT,RIGHT,W,A,S,D');
        this.physics.add.collider(player, platforms);
        this.physics.add.collider(player, blocks, hitBlock, null, this);
        this.physics.add.overlap(player, coins, collectCoin, null, this);
        this.physics.add.collider(enemies, platforms);
        this.physics.add.collider(player, enemies, hitEnemy, null, this);
        this.physics.add.collider(enemies, enemyBlockers);
    }

    function update() {
        if (player.isDead) return;

        let distScore = Math.floor(Math.max(0, player.x - 100) / 10);
        if (distScore > maxDist) maxDist = distScore;
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

        let isGrounded = player.body.blocked.down || player.body.touching.down || player.body.onFloor();

        let moveSpeed = 180 + (Math.pow(currentLevel, 1.2) * 6);
        let currentVel = 0; 

        if (downDown && isGrounded) {
            currentVel = 0; 
        } else if (leftDown) { 
            currentVel = -moveSpeed; player.flipX = true; 
        } else if (rightDown) { 
            currentVel = moveSpeed; player.flipX = false; 
        }

        player.setVelocityX(currentVel);

        if (isGrounded) {
            if (downDown) {
                player.anims.play('espo-crouch', true);
            } else if (currentVel !== 0) {
                player.anims.play('espo-run', true);
            } else {
                player.anims.play('espo-stop', true);
            }
        } else {
            player.anims.play('espo-jump', true);
        }

        if (jumpJustPressed && isGrounded && !downDown) {
            player.setVelocityY(-420);
            playSoundEffect(this, 'snd-jump');
        }

        if (player.x + 1200 > lastChunkX) {
            spawnChunkImproved(this);
        }

        if (player.y > 450) die.call(this);

        bgMountains.getChildren().forEach(mt => {
            let screenX = mt.x - (this.cameras.main.scrollX * mt.scrollFactorX);
            if (screenX < -200) mt.x = (this.cameras.main.scrollX * mt.scrollFactorX) + 1000;
        });

        bgClouds.getChildren().forEach(c => {
            let screenX = c.x - (this.cameras.main.scrollX * c.scrollFactorX);
            if (screenX < -150) {
                c.x = (this.cameras.main.scrollX * c.scrollFactorX) + 900 + Phaser.Math.Between(0, 150);
                c.y = Phaser.Math.Between(80, 180);
                c.setTexture(Math.random() > 0.5 ? 'cloud1' : 'cloud2');
            }
        });

        const destroyLimitX = this.cameras.main.scrollX - 300;
        [enemies, enemyBlockers, platforms, blocks, coins].forEach(group => {
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

        let widthMin = Math.max(180, 320 - currentLevel * 10);
        let widthMax = Math.max(260, 480 - currentLevel * 8);
        let width = Phaser.Math.Between(widthMin, widthMax);

        const tiers = [380, 365, 345, 320, 300];
        // Transizione graduale: max ±1 tier per volta
        let tierStep = Phaser.Math.Between(-1, 1);
        let newTierIndex = Phaser.Math.Clamp(lastTierIndex + tierStep, 0, tiers.length - 1);
        // Forte bias verso il basso: piattaforme alte sono rare e tornano giù
        if (newTierIndex >= 3 && Math.random() > 0.3) newTierIndex--;
        if (newTierIndex >= 2 && Math.random() > 0.5) newTierIndex--;
        // Gap grandi forzano piattaforme allo stesso livello o più basse (raggiungibili)
        if (gap > 120) newTierIndex = Math.min(newTierIndex, Math.max(0, lastTierIndex));
        lastTierIndex = newTierIndex;
        let platformTop = tiers[newTierIndex];

        if (chunkType <= 2) {
            width = Phaser.Math.Between(120, 180); // Piattaforme piccole ma non impossibili
        }

        const newX = lastChunkX + gap + width / 2;
        const platHeight = 500 - platformTop;
        const platCenterY = platformTop + (platHeight / 2);

        const plat = scene.add.tileSprite(newX, platCenterY, width, platHeight, 'floorbricks');
        plat.tileScaleX = 2; plat.tileScaleY = 2;
        scene.physics.add.existing(plat, true);
        platforms.add(plat);

        let leftB = scene.add.rectangle(newX - width/2, platformTop - 32, 2, 64, 0x000000, 0);
        scene.physics.add.existing(leftB, true); enemyBlockers.add(leftB);
        let rightB = scene.add.rectangle(newX + width/2, platformTop - 32, 2, 64, 0x000000, 0);
        scene.physics.add.existing(rightB, true); enemyBlockers.add(rightB);

        // FIX: Aggiunta variabile per monitorare la presenza di una piattaforma sospesa
        let isFloating = false;

        if (chunkType >= 8 && width > 250) {
            isFloating = true;
            const floatWidth = Phaser.Math.Between(100, width - 60);
            const floatTop = platformTop - Phaser.Math.Between(100, 140);
            const floatPlat = scene.add.tileSprite(newX, floatTop + 16, floatWidth, 32, 'floorbricks');
            floatPlat.tileScaleX = 2; floatPlat.tileScaleY = 2;
            scene.physics.add.existing(floatPlat, true);
            platforms.add(floatPlat);

            if (Math.random() > 0.3) spawnCoinsList(scene, newX, floatTop - 40, Phaser.Math.Between(2, 4));
        }

        let hasObstacle = false;
        let randObstacle = Math.random();
        
        if (width > 200 && randObstacle > 0.5 && chunkType < 8) {
            hasObstacle = true;
            const obstacles = ['pipe-small', 'pipe-medium', 'emptyBlock'];
            const obstacleKey = Phaser.Utils.Array.GetRandom(obstacles);
            const obj = platforms.create(newX, platformTop, obstacleKey).setScale(1.2).setOrigin(0.5, 1);
            obj.refreshBody();
        }

        // FIX: Condizione `!isFloating` aggiunta per evitare il posizionamento di blocchi nei mattoni sospesi
        if (!hasObstacle && !isFloating) {
            if (Math.random() > 0.4) {
                const numBlocks = Phaser.Math.Between(1, 3);
                const blockHeight = platformTop - 120; 
                for (let i = 0; i < numBlocks; i++) {
                    const bx = newX - ((numBlocks-1)*16) + (i * 32);
                    const b = blocks.create(bx, blockHeight, 'misteryBlock').setScale(2).refreshBody();
                    b.anims.play('block-flash', true);
                    b.used = false;
                }
            } else if (Math.random() > 0.4) {
                spawnCoinsList(scene, newX, platformTop - 40, Phaser.Math.Between(2, 4));
            }
        }

        // Decorazioni: bush e fence (solo su piattaforme larghe, senza ostacoli)
        if (!hasObstacle && width > 180 && Math.random() > 0.5) {
            // Fence solo su piattaforme a livello terra (tier alto), bush ovunque
            const isGroundLevel = platformTop >= 350;
            let decoKey, decoScale;
            if (isGroundLevel && Math.random() > 0.6) {
                decoKey = 'fence';
                decoScale = 0.55;
            } else {
                decoKey = Math.random() > 0.5 ? 'bush1' : 'bush2';
                decoScale = decoKey === 'bush1' ? 0.5 : 0.7;
            }
            // Piazza vicino al bordo della piattaforma, non al centro (stile Mario)
            const side = Math.random() > 0.5 ? 1 : -1;
            const decoX = newX + side * Phaser.Math.Between(width / 6, width / 3);
            const deco = scene.add.image(decoX, platformTop, decoKey)
                .setScale(decoScale).setOrigin(0.5, 1).setDepth(1).setAlpha(0.9);
            decorations.add(deco);
        }

        const enemyChance = Math.min(0.9, 0.4 + currentLevel * 0.08);
        if (Math.random() < enemyChance) {
            spawnEnemy(newX + (Math.random() > 0.5 ? width/4 : -width/4), platformTop - 16);
            if (width > 350 && Math.random() > 0.5) {
                spawnEnemy(newX - width/3, platformTop - 16);
            }
        }

        lastChunkX += gap + width;
    }

    function spawnCoinsList(scene, centerX, yPos, numCoins) {
        for (let i = 0; i < numCoins; i++) {
            const cx = centerX - ((numCoins-1)*16) + (i * 32);
            let coin = coins.create(cx, yPos, 'coin').setScale(1.5);
            coin.anims.play('coin-spin', true); 
            scene.tweens.add({ targets: coin, y: coin.y - 8, yoyo: true, repeat: -1, duration: 800 });
        }
    }

    function spawnEnemy(x, y) {
        const enemy = enemies.create(x, y, 'goomba').setScale(1.5);
        enemy.setBounceX(1);
        let eSpeed = Phaser.Math.Between(50, 100) + (currentLevel * 5);
        if (Math.random() > 0.5) eSpeed = -eSpeed;
        enemy.setVelocityX(eSpeed);
        enemy.anims.play('goomba-walk', true);
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

    function hitBlock(player, block) {
        if (player.body.touching.up && block.body.touching.down && !block.used) {
            block.used = true;
            block.anims.stop();
            block.setTexture('emptyBlock');
            bonusScore += 150;

            playSoundEffect(this, 'snd-coin');
            this.tweens.add({ targets: block, y: block.y - 10, yoyo: true, duration: 100 });

            // Moneta visiva che esce dal blocco (stile Mario)
            const popCoin = this.add.sprite(block.x, block.y - 20, 'coin').setScale(1.5).setDepth(30);
            popCoin.anims.play('coin-spin', true);
            this.tweens.add({
                targets: popCoin, y: block.y - 80, alpha: 0, duration: 600, ease: 'Power2',
                onComplete: () => popCoin.destroy()
            });
        }
    }

    function hitEnemy(player, enemy) {
        if (player.body.bottom <= enemy.body.y + 10) {
            enemy.body.enable = false;
            enemy.setVelocityX(0);
            enemy.anims.play('goomba-dead');
            this.time.delayedCall(500, () => {
                enemy.destroy();
            });
            player.setVelocityY(-300);

            playSoundEffect(this, 'snd-stomp');
        } else {
            die.call(this); 
        }
    }

    function playSoundEffect(scene, key) {
        if (window.EspooClicker) {
            const gs = window.EspooClicker.getGameState();
            if (gs && gs.user) {
                const vol = (gs.user.masterVolume !== undefined ? gs.user.masterVolume : 1) * (gs.user.sfxVolume !== undefined ? gs.user.sfxVolume : 1) * 0.5;
                if (vol > 0.01) scene.sound.play(key, { volume: vol });
            }
        } else {
            scene.sound.play(key, { volume: 0.5 });
        }
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
                const gs = window.EspooClicker ? window.EspooClicker.getGameState() : null;
                const saved = (gs && gs.arcadeHighScores) ? (gs.arcadeHighScores.superespo || 0) : 0;
                recordEl.innerText = Math.max(saved, currentScore);
            }
        }
    }

    function die() {
        if (player.isDead) return;
        player.isDead = true;
        
        player.setTint(0xff0000);
        player.setVelocityX(0);
        player.setVelocityY(-350);
        player.setCollideWorldBounds(false); 
        player.body.checkCollision.none = true; 
        
        enemies.getChildren().forEach(e => e.setVelocityX(0)); 

        playSoundEffect(this, 'snd-gameover');

        let reward = 0;
        if (typeof window.Decimal !== 'undefined' && typeof window.bps !== 'undefined' && typeof window.bps.gt === 'function') {
            const bpsVal = window.bps.gt(0) ? window.bps : new window.Decimal(1);
            let multiplier = new window.Decimal(0.05).mul(currentLevel); 
            reward = bpsVal.mul(currentScore).mul(multiplier).floor();
        }

        if (window.EspooClicker) {
            const gs = window.EspooClicker.getGameState();
            let hasReward = typeof reward.gt === 'function' ? reward.gt(0) : reward > 0;
            
            if (currentScore > 0 && hasReward) {
                gs.score = gs.score.add(reward);
                window.EspooClicker.showToast(`🔥 RUN COMPLETATA! +${window.EspooClicker.formatNumber(reward)} BUG!`, 'reward');
            }
            if (!gs.arcadeHighScores) gs.arcadeHighScores = {};
            if (currentScore > (gs.arcadeHighScores.superespo || 0)) {
                gs.arcadeHighScores.superespo = currentScore;
                window.EspooClicker.showToast(`🏆 NUOVO RECORD: ${currentScore}!`, 'achievement');
            }
            window.EspooClicker.saveGame();
            window.updateUI?.();
        }

        setTimeout(() => {
            const overlay = document.getElementById('super-espo-overlay');
            if (overlay) {
                overlay.style.display = 'flex';
                overlay.innerHTML = `
                    <div class="super-espo-dead-title">GAME OVER</div>
                    <div style="color:#fff; margin-bottom:10px;">Score: <span style="color:#f1c40f">${currentScore}</span></div>
                    <div style="color:#bdc3c7; font-size:1.2rem; margin-bottom:20px;">Loop: <span style="color:#e74c3c; font-weight:bold;">${currentLevel}</span></div>
                    <div style="display:flex; gap:10px; justify-content:center;">
                        <button class="arcade-btn secondary" onclick="window.exitSuperEspoGame()">MENU</button>
                        <button class="arcade-btn" onclick="window.startSuperEspoRun()" style="background:#9b59b6; color:#fff; border-color:#8e44ad;">RIPROVA</button>
                    </div>
                `;
            }
        }, 1800); 
    }

})();