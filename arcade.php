<?php
require_once("php/check_language.php");
require_once("php/check_version.php");
// Cache-bust locale: in dev (localhost) usa timestamp per forzare il reload
// degli asset arcade in iterazione (CSS/JS dedicati). In produzione resta la
// versione stabile ($cacheVer) per sfruttare cache HTTP/SW.
$arcadeAssetVer = preg_match('/(localhost|127\.0\.0\.1|::1|192\.168\.)/', ($_SERVER['HTTP_HOST'] ?? '')) ? time() : $cacheVer;
?>
<!DOCTYPE html>
<html lang="<?php echo $lang; ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <meta name="color-scheme" content="dark">
    <meta name="theme-color" content="#050505">
    <link rel="icon" type="image/svg+xml" href="assets/image/ico.svg">

    <title><?php echo $labels["arcade_page_title"]; ?></title>

    <!-- Font logo -->
    <link rel="preload" as="font" href="assets/fonts/Harabara.ttf" type="font/ttf" crossorigin="anonymous" fetchpriority="high">

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Press+Start+2P&display=swap">

    <!-- Stesso bundle del gioco principale (FA, base CSS) -->
    <link rel="stylesheet" href="dist/styles.bundle.min.css?v=<?php echo assetVer(__DIR__ . '/dist/styles.bundle.min.css', $cacheVer); ?>">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

    <!-- Decimal (break_eternity) — locale per reward calc -->
    <script src="dist/break_eternity.min.js?v=<?php echo assetVer(__DIR__ . '/dist/break_eternity.min.js', $cacheVer); ?>"></script>

    <link rel="stylesheet" href="css/arcade-fullscreen.css?v=<?php echo $arcadeAssetVer; ?>">
</head>
<body>

<div id="arcade-fullscreen">

    <!-- Header bar -->
    <header id="arcade-fs-header">
        <h1 class="fs-title">
            <i class="fa-solid fa-gamepad" style="color:#00d9ff"></i>
            espò arcade
        </h1>

        <div class="fs-wallet" id="fs-wallet">
            <div class="wallet-main" title="<?php echo $labels['arcade_wallet_total']; ?>">
                <i class="fa-solid fa-bug wallet-ico"></i>
                <span class="wallet-total" id="fs-bug-total">--</span>
                <span class="wallet-unit">BUG</span>
            </div>
            <div class="wallet-pending" id="fs-bug-pending" title="<?php echo $labels['arcade_wallet_pending']; ?>">
                <i class="fa-solid fa-coins wallet-ico"></i>
                <span id="fs-pending-val">+0</span>
            </div>
        </div>

        <button id="arcade-fs-close" title="<?php echo $labels['arcade_close_title']; ?>" onclick="window.close(); setTimeout(()=>{ if(!window.closed) window.location.href='index.php'; }, 100);">
            <i class="fa-solid fa-xmark"></i>
        </button>
    </header>

    <!-- Body: persistent sidebar + game area -->
    <div id="arcade-fs-body">
        <div class="arcade-screen-container global-crt-filter">
            <div class="arcade-fs-layout">

                <div class="arcade-menu-list" role="listbox" aria-label="<?php echo $labels['arcade_select_game']; ?>">
                    <div class="arcade-menu-item active" data-game="snake" data-title="SNAKE PROTOCOL" data-color="#2ecc71" data-desc="<?php echo $labels['arcade_desc_snake']; ?>" role="option" tabindex="0" aria-selected="true" aria-label="Snake Protocol — <?php echo $labels['arcade_g_snake_short']; ?>">
                        <span class="item-num">01</span>
                        <div class="item-info"><span class="item-name">SNAKE PROTOCOL</span><span class="item-desc"><?php echo $labels['arcade_g_snake_short']; ?></span></div>
                    </div>
                    <div class="arcade-menu-item" data-game="space" data-title="SPACE IMPACT" data-color="#e74c3c" data-desc="<?php echo $labels['arcade_desc_space']; ?>" role="option" tabindex="-1" aria-selected="false" aria-label="Space Impact — <?php echo $labels['arcade_g_space_short']; ?>">
                        <span class="item-num">02</span>
                        <div class="item-info"><span class="item-name">SPACE IMPACT</span><span class="item-desc"><?php echo $labels['arcade_g_space_short']; ?></span></div>
                    </div>
                    <div class="arcade-menu-item" data-game="asteroids" data-title="ESPO-ROIDS" data-color="#e67e22" data-desc="<?php echo $labels['arcade_desc_asteroids']; ?>" role="option" tabindex="-1" aria-selected="false" aria-label="Espo-Roids — <?php echo $labels['arcade_g_asteroids_short']; ?>">
                        <span class="item-num">03</span>
                        <div class="item-info"><span class="item-name">ESPO-ROIDS</span><span class="item-desc"><?php echo $labels['arcade_g_asteroids_short']; ?></span></div>
                    </div>
                    <div class="arcade-menu-item" data-game="superespo" data-title="SUPER ESPO" data-color="#9b59b6" data-desc="<?php echo $labels['arcade_g_superespo_desc']; ?>" role="option" tabindex="-1" aria-selected="false" aria-label="Super Espo — <?php echo $labels['arcade_g_superespo_short']; ?>">
                        <span class="item-num">04</span>
                        <div class="item-info"><span class="item-name">SUPER ESPO</span><span class="item-desc"><?php echo $labels['arcade_g_superespo_short']; ?></span></div>
                    </div>
                    <div class="arcade-menu-item" data-game="invaders" data-title="BUG INVADERS" data-color="#2ecc71" data-desc="<?php echo $labels['arcade_g_invaders_desc']; ?>" role="option" tabindex="-1" aria-selected="false" aria-label="Bug Invaders — <?php echo $labels['arcade_g_invaders_short']; ?>">
                        <span class="item-num">05</span>
                        <div class="item-info"><span class="item-name">BUG INVADERS</span><span class="item-desc"><?php echo $labels['arcade_g_invaders_short']; ?></span></div>
                    </div>
                    <div class="arcade-menu-item" data-game="centipede" data-title="BUG CRAWLER" data-color="#f472b6" data-desc="<?php echo $labels['arcade_g_centipede_desc']; ?>" role="option" tabindex="-1" aria-selected="false" aria-label="Bug Crawler — <?php echo $labels['arcade_g_centipede_short']; ?>">
                        <span class="item-num">06</span>
                        <div class="item-info"><span class="item-name">BUG CRAWLER</span><span class="item-desc"><?php echo $labels['arcade_g_centipede_short']; ?></span></div>
                    </div>

                    <div class="arcade-menu-item locked" role="option" aria-disabled="true" aria-label="<?php echo $labels['arcade_coming_soon']; ?>">
                        <span class="item-num">--</span>
                        <div class="item-info"><span class="item-name">??? COMING SOON</span></div>
                    </div>

                    <!-- Tabella comandi del gioco attivo (solo desktop, mentre si gioca) -->
                    <div id="arcade-cmd-table" aria-hidden="true"></div>
                </div>

                <div id="arcade-game-selector">
                    <div class="arcade-preview-monitor crt-effect">
                        <div class="preview-content">
                            <h3 id="preview-title" style="color: #2ecc71;">SNAKE PROTOCOL</h3>
                            <div class="preview-separator">════════════════</div>
                            <p id="preview-desc"><?php echo $labels['arcade_desc_snake']; ?></p>

                            <div class="preview-stats">
                                ★ HI-SCORE: <span id="preview-highscore">0</span>
                            </div>

                            <button id="arcade-play-btn" class="arcade-btn" onclick="if(window.launchArcadeGame) window.launchArcadeGame()">
                                <i class="fa-solid fa-play"></i> GIOCA
                            </button>
                        </div>
                    </div>
                    <div id="arcade-active-game-container"></div>
                </div>

            </div>
        </div>
    </div>

    <!-- Virtual flipper controls — appare quando un gioco è attivo -->
    <div id="arcade-virtual-pad">
        <div class="vp-section">
            <div class="vp-label">D-PAD</div>
            <div class="vp-dpad">
                <button class="vp-btn vp-up"    data-key="ArrowUp"    title="<?php echo $labels["arcade_ctrl_up"]; ?>">▲</button>
                <button class="vp-btn vp-left"  data-key="ArrowLeft"  title="<?php echo $labels["arcade_ctrl_left"]; ?>">◀</button>
                <button class="vp-btn vp-down"  data-key="ArrowDown"  title="<?php echo $labels["arcade_ctrl_down"]; ?>">▼</button>
                <button class="vp-btn vp-right" data-key="ArrowRight" title="<?php echo $labels["arcade_ctrl_right"]; ?>">▶</button>
            </div>
        </div>

        <div class="vp-section">
            <div class="vp-label"><?php echo $labels["arcade_actions"]; ?></div>
            <div class="vp-actions">
                <button class="vp-action-btn cyan"   data-key="Space" title="<?php echo $labels["arcade_ctrl_fire"]; ?>">FIRE</button>
                <button class="vp-action-btn yellow" data-key="KeyX"  title="<?php echo $labels["arcade_ctrl_special"]; ?>">X</button>
                <button class="vp-action-btn"        data-key="Enter" title="<?php echo $labels["arcade_ctrl_start"]; ?>">START</button>
            </div>
        </div>
    </div>
</div>

<!-- ============================================================ -->
<!-- ARCADE STANDALONE — EspooClicker stub + virtual pad + init   -->
<!-- Logica estratta in js/arcade-page.js (refactor strutturale). -->
<!-- ============================================================ -->
<script>window.CACHE_VER = '<?php echo $cacheVer; ?>';</script>
<script>window.GAME_VERSION = { major: 3, minor: 0 };</script>
<script>window.APP_LANG='<?php echo $lang; ?>';window.ARCADE_TXT={loading:"<?php echo $labels["arcade_loading"]; ?>",gameUnavailable:"<?php echo $labels["arcade_game_unavailable"]; ?>",score:"<?php echo $labels["arcade_go_score"]; ?>",record:"<?php echo $labels["arcade_go_record"]; ?>",returnRetry:"<?php echo $labels["arcade_go_return_retry"]; ?>",returnMenu:"<?php echo $labels["arcade_go_return"]; ?>"};</script>

<!-- GATE LOGIN: la Sala Giochi è accessibile solo se loggati a Espò Clicker.
     Stato login = sessionStorage['espooUser'] (lo stesso usato dal gioco).
     Aperta via window.open dal gioco → la sessionStorage viene copiata = ok;
     accesso diretto all'URL → sessionStorage vuota = bloccato. -->
<script>
(function () {
    var authed = false;
    try { authed = !!sessionStorage.getItem('espooUser'); } catch (e) {}
    window.__arcadeAuthOk = authed;
    if (authed) return;
    var root = document.getElementById('arcade-fullscreen');
    if (root) root.innerHTML =
        '<div style="position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:18px;background:#05070a;color:#cfe6f5;font-family:Rajdhani,sans-serif;padding:24px;box-sizing:border-box;">'
        + '<div style="font-size:3rem;color:#00d9ff;filter:drop-shadow(0 0 14px rgba(0,217,255,.6));"><i class="fa-solid fa-lock"></i></div>'
        + '<div style="font-family:\'Press Start 2P\',monospace;font-size:1rem;color:#fff;letter-spacing:2px;"><?php echo $labels["arcade_gate_title"]; ?></div>'
        + '<div style="max-width:440px;font-size:1.15rem;color:#8a9aaa;line-height:1.4;"><?php echo $labels["arcade_gate_msg"]; ?></div>'
        + '<button onclick="window.location.href=\'index.php\'" style="margin-top:6px;font-family:\'Press Start 2P\',monospace;font-size:0.7rem;letter-spacing:2px;color:#fff;background:linear-gradient(180deg,#3498db,#2872a8);border:2px solid #1a3a5a;border-radius:6px;padding:14px 28px;cursor:pointer;"><?php echo $labels["arcade_gate_btn"]; ?></button>'
        + '</div>';
})();
</script>
<script src="js/arcade-loader.js?v=<?php echo $arcadeAssetVer; ?>"></script>
<script src="js/arcade-page.js?v=<?php echo $arcadeAssetVer; ?>"></script>

</body>
</html>
