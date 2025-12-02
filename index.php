<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Espòòò Clicker</title>
    
    <link rel="stylesheet" href="./css/base.css">
    <link rel="stylesheet" href="./css/layout.css">
    <link rel="stylesheet" href="./css/store.css">
    <link rel="stylesheet" href="./css/clicker.css">
    
    <link rel="stylesheet" href="./css/podio.css">
    <link rel="stylesheet" href="./css/modals.css">
    <link rel="stylesheet" href="./css/mobile.css">
    
    <link rel="icon" type="image/png" href="./assets/image/favicon.png">
</head>
<body>
    <video id="rick-roll-video" style="display: none;" playsinline>
        <source src="./assets/video/rick-espley-video.mp4" type="video/mp4">
        Il tuo browser non supporta il video tag.
    </video>
    <video id="ricardo-video" style="display: none;" playsinline>
        <source src="./assets/video/ricardo-milespo-video.mp4" type="video/mp4">
    </video>
    <div id="toast-container"></div>
        <div id="prestige-transition-overlay" style="display: none;">
        <div class="transition-content">
            <div class="transition-icon">🚀</div>
            <h2>PROMOZIONE IN CORSO...</h2>
            <p>Ricalcolo dei benefit aziendali</p>
        </div>
    </div>
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
                <span class="nav-icon">❓</span>
                <span class="nav-label">Guida</span>
            </button>
            <button id="open-stats-btn" class="nav-item" title="Statistiche">
                <span class="nav-icon">📊</span>
                <span class="nav-label">Stats</span>
            </button>
        </div>

        <div class="nav-group center">
            <button id="open-achievements-btn" class="nav-item" title="Obiettivi">
                <span class="nav-icon">🏆</span>
                <span class="nav-label">Obiettivi</span>
            </button>
            <button id="open-skins-btn" class="nav-item" title="Guardaroba">
                <span class="nav-icon">👕</span>
                <span class="nav-label">Skin</span>
            </button>
            <button id="open-leaderboard-btn" class="nav-item" title="Classifica">
                <span class="nav-icon">🥇</span>
                <span class="nav-label">Classifica</span>
            </button>
        </div>

        <div class="nav-group right">
            <button id="open-prestige-hub-btn" class="nav-special-btn">
                <span class="nav-icon">🚀</span> Promozione
            </button>
            <button id="open-settings-btn" class="nav-item" title="Opzioni">
                <span class="nav-icon">⚙️</span>
                <span class="nav-label">Opzioni</span>
            </button>
            
        </div>
    </nav>
    <button id="quick-mute-btn" title="Muta Tutto">🔊</button>
    <div id="game-container">

        

        <div id="left-column" class="game-column">
            <div class="tabs-header">
                <button class="tab-btn active" data-target="upgrade-store" id="tab-click">⚡ Click</button>
                <button class="tab-btn" data-target="enhancement-store" id="tab-auto">⚙️ Auto</button>
                <button class="tab-btn" data-target="prestige-wrapper" id="tab-prestige" style="display: none;">⭐ Lab</button>
            </div>
            
            <div id="global-filter-section">
                <select id="global-filter-select">
                    <option value="available">🛒 Da Comprare (Disponibili)</option>
                    <option value="locked">🔒 In Arrivo (Bloccati)</option>
                    <option value="purchased">✅ Già Presi (Posseduti)</option>
                    <option value="all">👁️ Mostra Tutto</option>
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
        <img src="./assets/image/bug.png" alt="Ticket Critico!">
    </div>  

    <div id="github-link-container">
        <a href="https://github.com/SickSartori/espo-clicker" target="_blank" title="Repository GitHub">
            <img src="./assets/image/github-icon.svg" class="github-icon" alt="GitHub Logo">
        </a>
    </div>

    <audio id="sound-click" src="./assets/sounds/Click.mp3" preload="auto"></audio>
    <audio id="sound-buy" src="./assets/sounds/Buy.mp3" preload="auto"></audio>
    <audio id="sound-achievement" src="./assets/sounds/Achievement.mp3" preload="auto"></audio>
    <audio id="sound-bluescreen" src="./assets/sounds/bluescreen.mp3" loop preload="auto"></audio>
    
    <script src="./js/version-config.js"></script>
    <script src="./js/game-data.js" defer></script>
    <script src="./js/ui-functions.js" defer></script>
    <script src="./js/game-logic.js" defer></script>
    <script src="./js/script.js" defer></script> 
    <script src="./js/podio.js" defer></script>
    <script src="./js/modals.js" defer></script>
</body>
</html>