<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Espofy</title>
    <link rel="icon" href="data:,">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="css/espofy.css">
    <link rel="icon" type="image/png" href="../assets/image/ui/favicon.webp">
</head>
<body>

    <div class="app-layout">
        <div class="sidebar">
            <div class="logo">
                <h2><img src="ico.svg" class="custom-logo" alt="Espofy Logo"> Espofy</h2>
            </div>
            <ul class="nav-links">
                <li><a href="../index.php" class="back-btn"><i class="fas fa-arrow-left"></i> Torna al Gioco</a></li>
                <li class="active"><i class="fas fa-music"></i> La tua libreria</li>
            </ul>
        </div>

        <div class="main-view">
            <div class="main-header">
                <h2>Espòò Clicker OST</h2>
            </div>
            <div class="playlist-content">
                <table class="playlist-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Titolo</th>
                            <th><i class="far fa-clock"></i></th>
                        </tr>
                    </thead>
                    <tbody id="playlist-body">
                        </tbody>
                </table>
            </div>
        </div>
    </div>

    <div class="player-bar">
        <div class="track-info">
            <div class="track-details">
                <h4 id="current-track-name">Nessun brano</h4>
            </div>
        </div>
        
        <div class="player-controls-wrapper">
            <div class="controls">
                <button onclick="toggleRandom()" id="random-btn" class="ctrl-btn"><i class="fas fa-random"></i></button>
                <button onclick="prevTrack()" class="ctrl-btn"><i class="fas fa-step-backward"></i></button>
                
                <button onclick="playPauseTrack()" id="play-pause-btn" class="play-btn"><i class="fas fa-play"></i></button>
                
                <button onclick="nextTrack()" class="ctrl-btn"><i class="fas fa-step-forward"></i></button>
                <button onclick="toggleLoop()" id="loop-btn" class="ctrl-btn"><i class="fas fa-redo-alt"></i></button>
            </div>
            <div class="progress-container">
                <span id="time-current">0:00</span>
                <input type="range" id="track-progress" value="0" min="0" max="100" oninput="updateSliderVisuals('track-progress')" onchange="seekTrack()">
                <span id="time-total">0:00</span>
            </div>
        </div>
        
        <div class="volume-control">
            <span class="vol-icon"><i class="fas fa-volume-up"></i></span>
            <input type="range" id="volume-slider" value="30" min="0" max="100" oninput="changeVolume()">
        </div>
    </div>

    <!-- gameData resta un oggetto vuoto: js/data/assets.js era un modulo dati della v2,
         rimosso col passaggio alla v3 (i dati vivono nel bundle). espofy-config.js legge
         gameData.assets.sounds solo per musicConfig.gameMusics, che espofy.js non usa:
         le tracce arrivano da window.espofyConfig.externalMusics e da get_songs.php. -->
    <script>window.gameData = { assets: {} };</script>

    <script src="js/espofy-config.js"></script>
    <script src="js/espofy.js"></script>
</body>
</html>