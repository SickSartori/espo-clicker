<?php
/**
 * Schermata countdown pre-lancio v3.0. Inclusa da index.php/arcade.php quando
 * espo_countdown_active() è true. Self-contained (non carica il bundle del gioco)
 * ma usa i font reali del gioco (Harabara + Rajdhani). Il timer JS è solo visivo:
 * l'ora autoritativa è il SERVER — al reload, se è ancora prima di LAUNCH_TS, il
 * gate ri-serve questa pagina.
 *
 * Richiede in scope: $lang, $labels (da check_language.php) e LAUNCH_TS (launch-gate.php).
 */
if (!headers_sent()) {
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
}
$launchMs = LAUNCH_TS * 1000;
$launchDT = (new DateTime('@' . LAUNCH_TS))->setTimezone(new DateTimeZone('Europe/Rome'));
$releaseHuman = $launchDT->format('d/m/Y') . ' · ' . $launchDT->format('H:i');
?><!DOCTYPE html>
<html lang="<?php echo $lang; ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <meta name="robots" content="noindex">
    <meta name="color-scheme" content="dark">
    <meta name="theme-color" content="#03060a">
    <link rel="icon" type="image/svg+xml" href="assets/image/ico.svg">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&display=swap">
    <title><?php echo $labels["head_titolo"]; ?> — <?php echo $labels["countdown_badge"]; ?></title>
    <style>
        @font-face {
            font-family: 'Harabara';
            src: url('assets/fonts/Harabara.ttf') format('truetype');
            font-weight: normal; font-style: normal; font-display: swap;
        }
        :root {
            --cy: #22d3ee; --cy2: #5cf3ff; --hot: #f1c40f; --ink: #d6eef7;
            --bg: #03060a; --line: rgba(34,211,238,0.16);
            --tech: 'Rajdhani', 'Segoe UI', system-ui, sans-serif;
            --logo: 'Harabara', 'Rajdhani', sans-serif;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; }
        body {
            background: radial-gradient(ellipse 120% 90% at 50% -10%, #0a1622 0%, var(--bg) 60%);
            color: var(--ink); font-family: var(--tech);
            min-height: 100dvh; display: flex; align-items: center; justify-content: center;
            text-align: center; overflow: hidden; position: relative; padding: 24px;
            -webkit-font-smoothing: antialiased;
        }

        /* ============ AMBIENTE CYBER ============ */
        .fx { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
        /* Pavimento a griglia prospettica (tron) */
        .floor {
            position: fixed; left: -25%; right: -25%; bottom: -6%; height: 62%;
            background-image:
                linear-gradient(var(--line) 1px, transparent 1px),
                linear-gradient(90deg, var(--line) 1px, transparent 1px);
            background-size: 48px 48px;
            transform: perspective(340px) rotateX(60deg); transform-origin: bottom center;
            -webkit-mask-image: linear-gradient(to top, #000 6%, transparent 78%);
                    mask-image: linear-gradient(to top, #000 6%, transparent 78%);
            animation: floormove 2.4s linear infinite; opacity: 0.85;
        }
        @keyframes floormove { to { background-position: 0 48px, 0 48px; } }
        /* Griglia superiore tenue (profondità) */
        .mesh {
            position: fixed; inset: 0;
            background-image:
                linear-gradient(rgba(34,211,238,0.05) 1px, transparent 1px),
                linear-gradient(90deg, rgba(34,211,238,0.05) 1px, transparent 1px);
            background-size: 48px 48px;
            -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 38%, #000 30%, transparent 75%);
                    mask-image: radial-gradient(ellipse 70% 60% at 50% 38%, #000 30%, transparent 75%);
        }
        .glow { position: fixed; inset: 0; background: radial-gradient(ellipse 55% 45% at 50% 34%, rgba(34,211,238,0.18), transparent 70%); animation: breathe 7s ease-in-out infinite; }
        .scan { position: fixed; inset: 0; background: repeating-linear-gradient(to bottom, transparent 0 3px, rgba(0,0,0,0.25) 3px 4px); opacity: 0.4; }
        .sweep { position: fixed; left: 0; right: 0; height: 140px; top: -140px; background: linear-gradient(to bottom, transparent, rgba(92,243,255,0.07), transparent); animation: sweep 6s linear infinite; }
        .vig { position: fixed; inset: 0; box-shadow: inset 0 0 220px 40px rgba(0,0,0,0.9); }
        @keyframes breathe { 0%,100% { opacity: 0.55; } 50% { opacity: 1; } }
        @keyframes sweep { to { transform: translateY(calc(100vh + 140px)); } }

        /* ============ CONTENUTO ============ */
        .wrap { position: relative; z-index: 2; width: 100%; max-width: 640px; padding: 34px 26px; }
        /* Cornici HUD ad angolo */
        .wrap::before, .wrap::after, .corner { position: absolute; width: 26px; height: 26px; border: 2px solid rgba(34,211,238,0.55); }
        .wrap::before { content: ''; top: 0; left: 0; border-right: 0; border-bottom: 0; }
        .wrap::after  { content: ''; top: 0; right: 0; border-left: 0; border-bottom: 0; }
        .corner.bl { bottom: 0; left: 0; border-right: 0; border-top: 0; }
        .corner.br { bottom: 0; right: 0; border-left: 0; border-top: 0; }

        .status { font: 600 0.66rem/1 var(--tech); letter-spacing: 3px; color: #6fb9cc; text-transform: uppercase; margin-bottom: 22px; opacity: 0.9; }
        .status .dot { color: var(--cy2); animation: blink 1.3s steps(1) infinite; }

        .logo { width: clamp(170px, 44vw, 320px); height: auto; margin-bottom: 8px; filter: drop-shadow(0 0 30px rgba(34,211,238,0.7)); }

        .badge {
            display: inline-flex; align-items: center; gap: 8px; position: relative;
            font: 700 0.74rem/1 var(--tech); letter-spacing: 5px; color: var(--cy2);
            padding: 8px 18px; margin-bottom: 20px; text-transform: uppercase;
            border: 1px solid rgba(34,211,238,0.5); border-radius: 999px;
            box-shadow: 0 0 22px rgba(34,211,238,0.28) inset, 0 0 16px rgba(34,211,238,0.22);
        }
        .badge::before { content: ''; width: 7px; height: 7px; border-radius: 50%; background: var(--cy2); box-shadow: 0 0 10px var(--cy2); animation: blink 1.3s steps(1) infinite; }

        /* Versione — hero neon Harabara + glitch (il nome è già nel logo) */
        .version {
            position: relative; font-family: var(--logo); font-weight: 400;
            font-size: clamp(3.6rem, 18vw, 7rem); letter-spacing: 2px; line-height: 0.9;
            color: var(--cy2); text-shadow: 0 0 40px rgba(92,243,255,0.85), 0 0 8px rgba(34,211,238,0.9);
            margin: 2px 0 16px;
        }
        .version::before, .version::after {
            content: attr(data-txt); position: absolute; left: 0; top: 0; width: 100%;
            clip-path: inset(0 0 0 0); opacity: 0.75;
        }
        .version::before { color: #ff2e88; transform: translate(-2px, 0); animation: glitch1 3.6s steps(2) infinite; }
        .version::after  { color: #16f2ff; transform: translate(2px, 0);  animation: glitch2 3.6s steps(2) infinite; }
        @keyframes glitch1 { 0%,92%,100% { clip-path: inset(0 0 100% 0); } 93% { clip-path: inset(12% 0 60% 0); transform: translate(-3px,0);} 96% { clip-path: inset(50% 0 20% 0); transform: translate(2px,0);} }
        @keyframes glitch2 { 0%,92%,100% { clip-path: inset(100% 0 0 0); } 94% { clip-path: inset(30% 0 45% 0); transform: translate(3px,0);} 97% { clip-path: inset(65% 0 8% 0); transform: translate(-2px,0);} }

        .sub { color: #7fb0c1; font: 500 clamp(0.95rem,3.4vw,1.12rem)/1.4 var(--tech); letter-spacing: 1px; margin-bottom: 30px; }

        /* ============ TIMER ============ */
        .timer { display: flex; gap: clamp(6px,2vw,14px); justify-content: center; align-items: stretch; margin: 0 auto 26px; }
        .cell {
            position: relative; flex: 1 1 0; max-width: 120px; padding: 16px 6px 12px;
            background: linear-gradient(180deg, rgba(34,211,238,0.08), rgba(6,16,24,0.4));
            border: 1px solid rgba(34,211,238,0.22); border-radius: 12px;
            box-shadow: 0 0 24px rgba(34,211,238,0.08) inset;
            overflow: hidden;
        }
        /* linea scan interna alle tile */
        .cell::after { content: ''; position: absolute; left: 0; right: 0; top: 0; height: 40%; background: linear-gradient(to bottom, rgba(92,243,255,0.16), transparent); animation: tilescan 3.2s ease-in-out infinite; }
        /* tacche angolari */
        .cell::before { content: ''; position: absolute; inset: 5px; border: 1px solid transparent;
            background:
                linear-gradient(var(--cy2),var(--cy2)) left top / 9px 2px no-repeat,
                linear-gradient(var(--cy2),var(--cy2)) left top / 2px 9px no-repeat,
                linear-gradient(var(--cy2),var(--cy2)) right bottom / 9px 2px no-repeat,
                linear-gradient(var(--cy2),var(--cy2)) right bottom / 2px 9px no-repeat;
            opacity: 0.7; pointer-events: none; }
        .num {
            font-family: var(--tech); font-weight: 700; font-variant-numeric: tabular-nums;
            font-size: clamp(2rem, 9vw, 3.4rem); line-height: 1; color: #f2ffff;
            text-shadow: 0 0 18px rgba(34,211,238,0.7); position: relative; z-index: 1;
        }
        .lbl { font: 600 0.6rem/1 var(--tech); letter-spacing: 3px; color: #6fa7b8; text-transform: uppercase; margin-top: 8px; position: relative; z-index: 1; }
        .sep { align-self: center; font: 700 clamp(1.4rem,6vw,2.4rem)/1 var(--tech); color: var(--cy); opacity: 0.55; animation: blink 1s steps(1) infinite; }
        @keyframes tilescan { 0%,100% { transform: translateY(-30%); opacity: .5;} 50% { transform: translateY(220%); opacity: 1;} }

        /* ============ READOUT ============ */
        .readout { font: 600 clamp(0.9rem,3.4vw,1.02rem)/1.5 var(--tech); letter-spacing: 1.5px; color: var(--ink); margin-bottom: 8px; }
        .readout .k { color: #6fa7b8; }
        .readout b { color: var(--cy2); text-shadow: 0 0 14px rgba(92,243,255,0.6); }
        .testing { font: 500 0.82rem/1 var(--tech); letter-spacing: 1px; color: #6f8a95; }
        .testing .d { color: var(--cy2); animation: blink 1.6s steps(1) infinite; }
        .cursor { display: inline-block; width: 9px; height: 1.05em; background: var(--cy2); margin-left: 4px; vertical-align: -2px; animation: blink 1s steps(1) infinite; box-shadow: 0 0 10px var(--cy2); }

        .enter { display: none; margin-top: 14px; }
        .enter a { display: inline-block; text-decoration: none; font: 700 1rem/1 var(--tech); letter-spacing: 4px; color: #041014;
            background: linear-gradient(180deg, #6ef0ff, #12b3d6); padding: 15px 46px; border-radius: 10px; text-transform: uppercase;
            box-shadow: 0 10px 34px rgba(34,211,238,0.45); }
        body.launched .timer, body.launched .readout, body.launched .testing { display: none; }
        body.launched .enter { display: block; }

        @keyframes blink { 0%,49% { opacity: 1; } 50%,100% { opacity: 0.15; } }

        @media (prefers-reduced-motion: reduce) {
            .floor, .glow, .sweep, .cell::after, .version::before, .version::after,
            .badge::before, .status .dot, .sep, .testing .d, .cursor { animation: none !important; }
            .floor { opacity: 0.5; } .sweep { display: none; }
            .version::before, .version::after { display: none; }
        }
        @media (max-width: 460px) { .sep { display: none; } .wrap { padding: 26px 16px; } }
    </style>
</head>
<body>
    <div class="fx mesh"></div>
    <div class="fx floor"></div>
    <div class="fx glow"></div>
    <div class="fx sweep"></div>
    <div class="fx scan"></div>
    <div class="fx vig"></div>

    <main class="wrap">
        <span class="corner bl"></span><span class="corner br"></span>

        <div class="status">// SYSTEM: PRE-LAUNCH <span class="dot">•</span> BUILD v3.0 <span class="dot">•</span> STATUS: STANDBY</div>

        <img class="logo" src="assets/image/logo.svg" alt="<?php echo $labels['head_titolo']; ?>">
        <div class="version" data-txt="3.0">3.0</div>
        <div class="badge"><?php echo $labels["countdown_badge"]; ?></div>
        <p class="sub"><?php echo $labels["countdown_sub"]; ?></p>

        <div class="timer" id="cd">
            <div class="cell"><div class="num" id="cd-d">--</div><div class="lbl"><?php echo $labels["countdown_d"]; ?></div></div>
            <span class="sep">:</span>
            <div class="cell"><div class="num" id="cd-h">--</div><div class="lbl"><?php echo $labels["countdown_h"]; ?></div></div>
            <span class="sep">:</span>
            <div class="cell"><div class="num" id="cd-m">--</div><div class="lbl"><?php echo $labels["countdown_m"]; ?></div></div>
            <span class="sep">:</span>
            <div class="cell"><div class="num" id="cd-s">--</div><div class="lbl"><?php echo $labels["countdown_s"]; ?></div></div>
        </div>

        <p class="readout"><span class="k">&gt; <?php echo $labels["countdown_release"]; ?>:</span> <b><?php echo $releaseHuman; ?></b><span class="cursor"></span></p>
        <p class="testing"><span class="d">●</span> <?php echo $labels["countdown_testing"]; ?></p>

        <div class="enter"><a href="index.php"><?php echo $labels["countdown_enter"]; ?></a></div>
    </main>

    <script>
        (function () {
            /* ⚠️ Anti reload-storm al lancio. Se un visitatore arriva DURANTE il countdown,
               il service worker installa e precacha './index.php' (sw.js: PRECACHE_ASSETS)
               — che in questa finestra restituisce PROPRIO questa schermata. Quella copia
               resta poi il fallback di navigazione (sw.js: caches.match('./index.php')):
               al lancio verrebbe servita dalla cache, vedrebbe diff<=0 e si ricaricherebbe
               ogni 1,5s, amplificando il carico sul picco di apertura.
               Qui de-registriamo il SW e svuotiamo le cache: nessuna countdown resta
               cachata. Bonus: ripulisce anche il SW/cache della v2 dei giocatori storici. */
            try {
                if ('serviceWorker' in navigator && navigator.serviceWorker.getRegistrations) {
                    navigator.serviceWorker.getRegistrations()
                        .then(function (rs) { rs.forEach(function (r) { r.unregister(); }); })
                        .catch(function () {});
                }
                if (window.caches && caches.keys) {
                    caches.keys()
                        .then(function (ks) { ks.forEach(function (k) { caches.delete(k); }); })
                        .catch(function () {});
                }
            } catch (e) {}

            var target = <?php echo $launchMs; ?>;
            var d = document.getElementById('cd-d'), h = document.getElementById('cd-h'),
                m = document.getElementById('cd-m'), s = document.getElementById('cd-s');
            var pad = function (n) { return (n < 10 ? '0' : '') + n; };
            function tick() {
                var diff = target - Date.now();
                if (diff <= 0) {
                    document.body.classList.add('launched');
                    setTimeout(function () { location.reload(); }, 1500); // il server decide se aprire
                    return;
                }
                var sec = Math.floor(diff / 1000);
                d.textContent = Math.floor(sec / 86400);
                h.textContent = pad(Math.floor(sec % 86400 / 3600));
                m.textContent = pad(Math.floor(sec % 3600 / 60));
                s.textContent = pad(sec % 60);
            }
            tick(); setInterval(tick, 1000);
        })();
    </script>
</body>
</html>
