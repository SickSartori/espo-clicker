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
    
    <link rel="icon" type="image/png" href="./image/favicon.png">
</head>
<body>

    <div id="toast-container"></div>

    <?php include 'includes/modals.php'; ?>

    <div id="overlay-buttons-container">
        <button id="open-achievements-btn" class="overlay-btn">🏆 Obiettivi</button>
        <button id="open-stats-btn" class="overlay-btn">📈 Statistiche</button>
        <button id="open-settings-btn" class="overlay-btn">⚙️ Impostazioni</button>
        <button id="open-leaderboard-btn" class="overlay-btn">🏆 Classifica</button>
        <button id="open-prestige-hub-btn" class="overlay-btn" style="display: none; border-color: #9b59b6; color: #e8daef;">👑 Promozione</button>
    </div>

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
        <img src="./image/bug.png" alt="Ticket Critico!">
    </div>  

    <audio id="sound-click" src="./sounds/Click.mp3" preload="auto"></audio>
    <audio id="sound-buy" src="./sounds/Buy.mp3" preload="auto"></audio>
    <audio id="sound-achievement" src="./sounds/Achievement.mp3" preload="auto"></audio>
    <audio id="sound-bluescreen" src="./sounds/bluescreen.mp3" loop preload="auto"></audio>

    <script src="./js/game-data.js" defer></script>
    <script src="./js/ui-functions.js" defer></script>
    <script src="./js/game-logic.js" defer></script>
    <script src="./js/script.js" defer></script> 
    <script src="./js/podio.js" defer></script>
    <script src="./js/modals.js" defer></script>
</body>
</html>