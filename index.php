<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Espòòò Clicker</title>
    

    <!-- CSS -->
    <head>
    <link rel="stylesheet" href="./css/keyframes.css">
    <link rel="stylesheet" href="./css/base.css">
    <link rel="stylesheet" href="./css/layout.css">
    <link rel="stylesheet" href="./css/components.css"> 
    <link rel="stylesheet" href="./css/navbar.css"> 
    <link rel="stylesheet" href="./css/clicker.css">
    <link rel="stylesheet" href="./css/store.css">
    <link rel="stylesheet" href="./css/modals-core.css"> 
    <link rel="stylesheet" href="./css/modals-content.css"> 
    <link rel="stylesheet" href="./css/skins.css">    
    <link rel="stylesheet" href="./css/podio.css">  
    <link rel="stylesheet" href="./css/mobile.css">
    </head>

    
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="icon" type="image/png" href="./assets/image/favicon.webp">
</head>
<body>
    <video id="rick-roll-video" style="display: none;" playsinline preload="none" data-src="./assets/video/rick-espley-video.mp4"></video>
    <video id="ricardo-video" style="display: none;" playsinline preload="none" data-src="./assets/video/ricardo-milespo-video.mp4"></video>
    <video id="ricardo-metal-video" style="display: none;" playsinline preload="none" data-src="./assets/video/ricardo-milespo-metal-video.mp4"></video>
    <video id="ricardo-dota-video" style="display: none;" playsinline preload="none" data-src="./assets/video/ricardo-milespo-dota-video.mp4"></video>

    <div id="toast-container"></div>
    <div id="prestige-transition-overlay" style="display: none;">
        <div class="transition-content">
            <div class="transition-icon">🚀</div>
            <h2>PROMOZIONE IN CORSO...</h2>
            <p>Ricalcolo dei benefit aziendali</p>
        </div>
    </div>
    
    <div id="christmas-overlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #c0392b; z-index: 10000; justify-content: center; align-items: center; flex-direction: column; color: white;">
        <h1 id="christmas-title">🎄 BUON NATALE! 🎄</h1>
        <p id="christmas-subtitle">Skin Espo Natale Equipaggiata!</p>
    </div>

    <div id="snow-container" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1; display: none;"></div>

    <div id="offline-modal" class="modal-backdrop" style="display: none; z-index: 3000;">
    <div class="modal-content" style="text-align: center; border-color: #f39c12;">
        <h2 style="color: #f39c12; border-bottom-color: #f39c12;">💤 Bentornato!</h2>
        <div class="settings-content" style="padding: 30px;">
            <p style="color: #bdc3c7; font-size: 1.1rem;">
                Mentre eri via il team ha lavorato (un po').
            </p>
            
            <div style="margin: 20px 0;">
                <p style="text-transform: uppercase; font-size: 0.8rem; color: #7f8c8d; margin-bottom: 5px;">Efficienza Server</p>
                <div id="offline-efficiency-display" style="font-weight: bold; color: #3498db; font-size: 1.2rem;">30%</div>
            </div>

            <div style="background: rgba(243, 156, 18, 0.1); border: 1px solid #d35400; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <span id="offline-earnings-display" style="font-size: 2.5rem; font-weight: 800; color: #f1c40f; text-shadow: 0 0 10px rgba(243, 156, 18, 0.4);">0</span>
                <span style="font-size: 1.2rem; color: #f1c40f;"> Bug</span>
            </div>

            <button id="btn-claim-offline" class="buy-btn" style="background: linear-gradient(to right, #f1c40f, #e67e22); color: #2c3e50; font-size: 1.2rem; padding: 15px; width: 100%;">
                💰 Riscatta Guadagni
            </button>
        </div>
    </div>
</div>
    <?php include 'includes/modals.php'; ?>
    
    <nav id="game-navbar">
        <div class="nav-group left">
            <button id="open-help-btn" class="nav-item" title="Guida">
                <i class="nav-icon fa-solid fa-circle-question"></i>
                <span class="nav-label">Guida</span>
            </button>
            <button id="open-stats-btn" class="nav-item" title="Statistiche">
                <i class="nav-icon fa-solid fa-chart-pie"></i>
                <span class="nav-label">Stats</span>
            </button>
        </div>

        <div class="nav-group center">
            <button id="open-achievements-btn" class="nav-item" title="Obiettivi">
                <i class="nav-icon fa-solid fa-trophy"></i>
                <span class="nav-label">Obiettivi</span>
            </button>
            <button id="open-skins-btn" class="nav-item" title="Guardaroba">
                <i class="nav-icon fa-solid fa-shirt"></i> <span class="nav-label">Skin</span>
            </button>
            <button id="open-leaderboard-btn" class="nav-item" title="Classifica">
                <i class="nav-icon fa-solid fa-medal"></i>
                <span class="nav-label">Classifica</span>
            </button>
        </div>

        <div class="nav-group right">
            <button id="open-prestige-hub-btn" class="nav-special-btn">
                <i class="nav-icon fa-solid fa-rocket"></i> <span>Promozione</span>
            </button>
            <button id="open-settings-btn" class="nav-item" title="Opzioni">
                <i class="nav-icon fa-solid fa-gear"></i>
                <span class="nav-label">Opzioni</span>
            </button>
        </div>
    </nav>
    <button id="quick-mute-btn" title="Muta Tutto">
        <i class="fa-solid fa-volume-high"></i>
    </button>
    <div id="game-container">

        

        <div id="left-column" class="game-column">
            <div class="tabs-header">
                <button class="tab-btn active" data-target="upgrade-store" id="tab-click">
                    <i class="fa-solid fa-computer-mouse"></i> Click
                </button>
                <button class="tab-btn" data-target="enhancement-store" id="tab-auto">
                    <i class="fa-solid fa-robot"></i> Auto
                </button>
                <button class="tab-btn" data-target="prestige-wrapper" id="tab-prestige" style="display: none;">
                    <i class="fa-solid fa-flask"></i> Lab
                </button>
            </div>
            
            <div id="global-filter-section">
                <select id="global-filter-select">
                    <option value="available">Da Comprare (Disponibili)</option>
                    <option value="locked">In Arrivo (Bloccati)</option>
                    <option value="purchased">Già Presi (Posseduti)</option>
                    <option value="all">Mostra Tutto</option>
                </select>
            </div>

            <?php include 'includes/tab_click.php'; ?>
            <?php include 'includes/tab_auto.php'; ?>
            <?php include 'includes/tab_prestige.php'; ?>
        </div>

        <?php include 'includes/col_center.php'; ?>

        <?php include 'includes/col_buildings.php'; ?>
        
    </div>

    <div id="golden-bug" title="Un Ticket Critico! Clicca!">
        <img src="./assets/image/bug.webp" alt="Ticket Critico!">
    </div>  

    <div id="github-link-container">
        <a href="https://github.com/SickSartori/espo-clicker" target="_blank" title="Repository GitHub">
            <i class="fa-brands fa-github" style="font-size: 2.5rem;"></i>
        </a>
    </div>

    <audio id="sound-click" src="./assets/sounds/click.mp3" preload="metadata"></audio>
    <audio id="sound-buy" src="./assets/sounds/buy.mp3" preload="none"></audio> 
    <audio id="sound-achievement" src="./assets/sounds/achievement.mp3" preload="none"></audio>
    <audio id="sound-bluescreen" src="./assets/sounds/bluescreen.mp3" loop preload="none"></audio>

    <audio id="sound-error" src="./assets/sounds/error.mp3" preload="none"></audio>
    <audio id="sound-golden" src="./assets/sounds/golden.mp3" preload="none"></audio>
    <audio id="sound-prestige" src="./assets/sounds/prestige.mp3" preload="none"></audio>
    <audio id="sound-hover" src="./assets/sounds/hover.mp3" preload="none"></audio>

    <audio id="sound-merry" src="./assets/sounds/merry-christmas.mp3" preload="none"></audio>
    <audio id="sound-snowball" src="./assets/sounds/nonsnowball.mp3" loop preload="none"></audio>
    
    <div id="crunch-overlay"></div>
    <div id="fire-particles-container"></div>
    
    <audio id="sound-fire" src="./assets/sounds/fire-loop.mp3" loop preload="none"></audio>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>

    <script src="./js/version-config.js"></script>
    <script src="./js/game-data.js" defer></script>
    <script src="./js/ui-functions.js" defer></script>
    <script src="./js/game-logic.js" defer></script>
    <script src="./js/script.js" defer></script> 
    <script src="./js/podio.js" defer></script>
    <script src="./js/modals.js" defer></script>

<div id="mobile-nav-bar">
        <button class="mobile-nav-btn" data-target="left-column">
            <i class="fa-solid fa-bolt"></i>
            <span>Upgrade</span>
        </button>
        
        <button class="mobile-nav-btn active" data-target="center-column">
            <i class="fa-solid fa-gamepad"></i>
            <span>Console</span>
        </button>
        
        <button class="mobile-nav-btn" data-target="right-column">
            <i class="fa-solid fa-users"></i>
            <span>Team</span>
        </button>
    </div>
</body>
</html>