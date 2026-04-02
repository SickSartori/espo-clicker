<?php
require_once("php/check_language.php");
require_once("php/check_version.php");
?>
<!DOCTYPE html>
<html lang="it">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">

		<!-- PWA Meta Tags -->
		<meta name="theme-color" content="#3498db">
		<meta name="apple-mobile-web-app-capable" content="yes">
		<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
		<meta name="apple-mobile-web-app-title" content="Espo Clicker">
		<meta name="application-name" content="Espo Clicker">
		<meta name="mobile-web-app-capable" content="yes">
		<meta name="msapplication-TileColor" content="#050505">
		<meta name="msapplication-TileImage" content="assets/image/icons/icon-144.png">
		<link rel="manifest" href="manifest.json">
		<link rel="apple-touch-icon" href="assets/image/icons/icon-192.png">
		<link rel="apple-touch-icon" sizes="192x192" href="assets/image/icons/icon-192.png">
		<link rel="apple-touch-icon" sizes="152x152" href="assets/image/icons/icon-152.png">
		<link rel="apple-touch-icon" sizes="144x144" href="assets/image/icons/icon-144.png">

		<title>
			<?php echo $labels["head_titolo"]; ?>
		</title>

		<!-- Preload font critici -->
		<link rel="preconnect" href="https://fonts.googleapis.com">
		<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
		<link rel="preconnect" href="https://cdnjs.cloudflare.com">
		<link rel="preconnect" href="https://cdn.jsdelivr.net">

		<!-- CSS Core (render-blocking intenzionale) -->
		<link rel="stylesheet" href="css/keyframes.css?v=<?php echo $cacheVer; ?>">
		<link rel="stylesheet" href="css/base.css?v=<?php echo $cacheVer; ?>">
		<link rel="stylesheet" href="css/layout.css?v=<?php echo $cacheVer; ?>">
		<link rel="stylesheet" href="css/components.css?v=<?php echo $cacheVer; ?>">
		<link rel="stylesheet" href="css/navbar.css?v=<?php echo $cacheVer; ?>">
		<link rel="stylesheet" href="css/clicker.css?v=<?php echo $cacheVer; ?>">
		<link rel="stylesheet" href="css/store.css?v=<?php echo $cacheVer; ?>">

		<!-- CSS Modali e Skins (non bloccanti) -->
		<link rel="stylesheet" href="css/modals-core.css?v=<?php echo $cacheVer; ?>" media="all">
		<link rel="stylesheet" href="css/modals-content.css?v=<?php echo $cacheVer; ?>" media="all">
		<link rel="stylesheet" href="css/modals-arcade.css?v=<?php echo $cacheVer; ?>" media="all">
		<link rel="stylesheet" href="css/skins.css?v=<?php echo $cacheVer; ?>">
		<link rel="stylesheet" href="css/skins-modern.css?v=<?php echo $cacheVer; ?>">
		<link rel="stylesheet" href="css/podio.css?v=<?php echo $cacheVer; ?>">

		<!-- CSS Mobile (caricato solo su mobile) -->
		<link rel="stylesheet" href="css/mobile.css?v=<?php echo $cacheVer; ?>" media="(max-width: 768px)">
		<link rel="stylesheet" href="css/mobile-simplified.css?v=<?php echo $cacheVer; ?>" media="(max-width: 768px)">

		<!-- CSS Arcade (caricato solo su schermi non-mobile) -->
		<link rel="stylesheet" href="arcade/snake/css/snake.css?v=<?php echo $cacheVer; ?>">
		<link rel="stylesheet" href="arcade/space/css/space.css?v=<?php echo $cacheVer; ?>">
		<link rel="stylesheet" href="arcade/asteroids/css/asteroids.css?v=<?php echo $cacheVer; ?>">
		<link rel="stylesheet" href="arcade/super-espo/css/super-espo.css?v=<?php echo $cacheVer; ?>">

		<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css?v=<?php echo $cacheVer; ?>">
		<link rel="icon" type="image/png" href="assets/image/favicon.webp">
	</head>
	<body>
		<canvas id="matrix-canvas"></canvas>

		<div id="game-loader">
			<div class="loader-content">
				<div class="loader-spinner"></div>
				<h2 class="loader-title">
					<?php echo $labels["loader_titolo"]; ?>
				</h2>
				<div class="loader-status" id="loader-status-text">
					<?php echo $labels["loader_status"]; ?>
				</div>
			</div>
		</div>

		<div id="toast-container"></div>

		<div id="prestige-transition-overlay" class="prestige_transition_overlay prestige_transition_overlay_display_none">
			<div class="prestige-anim-container" id="prestige-anim-container">
				<i class="fa-solid fa-certificate fa-flip prestige-anim-icon"></i>
				<h1 class="prestige-anim-title">Promozione in Corso</h1>
				<p class="prestige-anim-subtitle fa-fade">Ristrutturazione Aziendale del Database...</p>

				<div class="prestige-progress-track">
					<div id="prestige-progress-bar" class="prestige-progress-fill"></div>
				</div>
			</div>
		</div>
		
		<div id="christmas-overlay" class="christmas_overlay">
			<h1 id="christmas-title">
				🎄 <?php echo $labels["natale_titolo"]; ?> 🎄
			</h1>
			<p id="christmas-subtitle">
				<?php echo $labels["natale_sottotitolo"]; ?>
			</p>
		</div>

		<div id="snow-container" class="snow_container"></div>

		<div id="offline-modal" class="modal-backdrop modal_backdrop_none">
			<div class="modal-content offline_modal_content">
				<h2>
					💤 <?php echo $labels["offline_titolo"]; ?>
				</h2>
				<div class="offline_content">
					<p class="offline_content_sottotitolo">
						<?php echo $labels["offline_sottotitolo"]; ?>
					</p>
					<div class="offline_content_efficienza_server">
						<p class="offline_content_label_efficienza_server">
							<?php echo $labels["offline_server"]; ?>
						</p>
						<div id="offline-efficiency-display" class="offline_efficiency_display">30%</div>
					</div>
					<div class="offline_content_guadagno">
						<span id="offline-earnings-display" class="offline_earnings_display">0</span>
						<span class="offline_content_guadagno_label">
							<?php echo $labels["offline_bug"]; ?>
						</span>
					</div>
					<button id="btn-claim-offline" class="buy-btn offline_content_button">
						💰 <?php echo $labels["offline_guadagni"]; ?>
					</button>
				</div>
			</div>
		</div>
		
		<?php include 'includes/modals.php'; ?>
		<?php include 'includes/modals_arcade.php'; ?>
		<?php include 'includes/modals_help.php'; ?>

		<nav id="game-navbar">
			<div class="nav-group left">
				<button id="open-help-btn" class="nav-item" title="<?php echo $labels["navbar_guida"]; ?>">
					<i class="nav-icon fa-solid fa-circle-question"></i>
					<span class="nav-label">
						<?php echo $labels["navbar_guida"]; ?>
					</span>
				</button>
				<button id="open-stats-btn" class="nav-item" title="<?php echo $labels["navbar_stats"]; ?>">
					<i class="nav-icon fa-solid fa-chart-pie"></i>
					<span class="nav-label">
						<?php echo $labels["navbar_stats"]; ?>
					</span>
				</button>
				<button id="open-arcade-btn" class="nav-item" title="<?php echo $labels["navbar_arcade"]; ?>">
					<i class="nav-icon fa-solid fa-gamepad"></i>
					<span class="nav-label">
						<?php echo $labels["navbar_arcade"]; ?>
					</span>
				</button>
			</div>

			<div class="nav-group center">
				<button id="open-achievements-btn" class="nav-item" title="<?php echo $labels["navbar_obiettivi"]; ?>">
					<i class="nav-icon fa-solid fa-trophy"></i>
					<span class="nav-label">
						<?php echo $labels["navbar_obiettivi"]; ?>
					</span>
				</button>
				<button id="open-skins-btn" class="nav-item" title="<?php echo $labels["navbar_skin"]; ?>">
					<i class="nav-icon fa-solid fa-shirt"></i>
					<span class="nav-label">
						<?php echo $labels["navbar_skin"]; ?>
					</span>
				</button>
				<button id="open-leaderboard-btn" class="nav-item" title="<?php echo $labels["navbar_classifica"]; ?>">
					<i class="nav-icon fa-solid fa-medal"></i>
					<span class="nav-label">
						<?php echo $labels["navbar_classifica"]; ?>
					</span>
				</button>
			</div>

			<div class="nav-group right">
				<button id="open-prestige-hub-btn" class="nav-special-btn">
					<i class="nav-icon fa-solid fa-rocket"></i>
					<span>
						<?php echo $labels["navbar_promozione"]; ?>
					</span>
				</button>
				<button id="open-settings-btn" class="nav-item" title="<?php echo $labels["navbar_opzioni"]; ?>">
					<i class="nav-icon fa-solid fa-gear"></i>
					<span class="nav-label">
						<?php echo $labels["navbar_opzioni"]; ?>
					</span>
				</button>
			</div>
		</nav>

		<button id="quick-mute-btn" title="<?php echo $labels["index_muta_audio"]; ?>">
			<i class="fa-solid fa-volume-high"></i>
		</button>

		<div id="game-container">
			<div id="left-column" class="game-column">
				<div class="tabs-header">
					<button class="tab-btn active" data-target="upgrade-store" id="tab-click">
						<i class="fa-solid fa-computer-mouse"></i>
						<?php echo $labels["game_container_click_titolo"]; ?>
					</button>
					<button class="tab-btn" data-target="enhancement-store" id="tab-auto">
						<i class="fa-solid fa-robot"></i>
						<?php echo $labels["game_container_auto_titolo"]; ?>
					</button>
					<button class="tab-btn tab_promozione" data-target="prestige-wrapper" id="tab-prestige">
						<i class="fa-solid fa-flask"></i>
						<?php echo $labels["game_container_lab_titolo"]; ?>
					</button>
					<button class="tab-btn" data-target="quantum-wrapper" id="tab-quantum" style="display:none; color: #9b59b6;">
						<i class="fa-solid fa-atom"></i> Q-Lab
					</button>
				</div>
				
				<div id="global-filter-section">
					<select id="global-filter-select">
						<option value="available"><?php echo $labels["game_container_da_comprare"]; ?></option>
						<option value="locked"><?php echo $labels["game_container_in_arrivo"]; ?></option>
						<option value="purchased"><?php echo $labels["game_container_gia_presi"]; ?></option>
						<option value="all"><?php echo $labels["game_container_mostra_tutto"]; ?></option>
					</select>
				</div>

				<?php include 'includes/tab_click.php'; ?>
				<?php include 'includes/tab_auto.php'; ?>
				<?php include 'includes/tab_prestige.php'; ?>
				<?php include 'includes/tab_quantum.php'; ?>
			</div>

			<?php include 'includes/col_center.php'; ?>
			<?php include 'includes/col_buildings.php'; ?>
		</div>

		<div id="golden-bug" title="<?php echo $labels["index_golden_bug_title"]; ?>">
			<i class="fa-solid fa-bug"></i>
		</div> 

		<div id="github-link-container">
			<a href="https://github.com/SickSartori/espo-clicker" target="_blank" title="<?php echo $labels["index_github_title"]; ?>">
				<i class="fa-brands fa-github"></i>
			</a>
		</div>
		
		<div id="crunch-overlay"></div>
		<div id="fire-particles-container"></div>

		<div id="mobile-nav-bar">
			<button class="mobile-nav-btn" data-target="left-column">
				<i class="fa-solid fa-bolt"></i>
				<span><?php echo $labels["mobile_tab_upgrade"]; ?></span>
			</button>
			<button class="mobile-nav-btn active" data-target="center-column">
				<i class="fa-solid fa-gamepad"></i>
				<span><?php echo $labels["mobile_tab_console"]; ?></span>
			</button>
			<button class="mobile-nav-btn" data-target="right-column">
				<i class="fa-solid fa-users"></i>
				<span><?php echo $labels["mobile_tab_team"]; ?></span>
			</button>
		</div>

		<script src="https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.4.4/lz-string.min.js" defer></script>
		<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js" defer></script>
		<script src="https://cdn.jsdelivr.net/npm/break_infinity.js@2" defer></script>
		<script src="https://cdnjs.cloudflare.com/ajax/libs/howler/2.2.4/howler.min.js" defer></script>
		<script src="https://cdnjs.cloudflare.com/ajax/libs/hammer.js/2.0.8/hammer.min.js" defer></script>
		<script src="https://cdnjs.cloudflare.com/ajax/libs/phaser/3.60.0/phaser.min.js" defer></script>

		<!-- Game Version -->
		<script src="js/version-config.js?v=<?php echo $cacheVer; ?>" defer></script>

		<!-- Gamedata -->
		<script src="js/data/core.js?v=<?php echo $cacheVer; ?>" defer></script>
		<script src="js/data/assets.js?v=<?php echo $cacheVer; ?>" defer></script>
		<script src="js/data/skins.js?v=<?php echo $cacheVer; ?>" defer></script>
		<script src="js/data/teams.js?v=<?php echo $cacheVer; ?>" defer></script>
		<script src="js/data/upgrades.js?v=<?php echo $cacheVer; ?>" defer></script>
		<script src="js/data/achievements.js?v=<?php echo $cacheVer; ?>" defer></script>
		<script src="js/data/events.js?v=<?php echo $cacheVer; ?>" defer></script>
		<script src="js/data/texts.js?v=<?php echo $cacheVer; ?>" defer></script>
		<script src="js/data/gamestate.js?v=<?php echo $cacheVer; ?>" defer></script>

		<!-- Game logic -->
		<script src="js/ui-functions.js?v=<?php echo $cacheVer; ?>" defer></script>
		<script src="js/game-logic.js?v=<?php echo $cacheVer; ?>" defer></script>
		<script src="js/script.js?v=<?php echo $cacheVer; ?>" defer></script> 
		<script src="js/podio.js?v=<?php echo $cacheVer; ?>" defer></script>
		<script src="js/modals.js?v=<?php echo $cacheVer; ?>" defer></script>		
		
		<!-- Arcade -->
		<script src="arcade/snake/js/snake.js?v=<?php echo $cacheVer; ?>" defer></script>
		<script src="arcade/space/js/space.js?v=<?php echo $cacheVer; ?>" defer></script>
		<script src="arcade/asteroids/js/asteroids.js?v=<?php echo $cacheVer; ?>" defer></script>
		<script src="arcade/super-espo/js/super-espo.js?v=<?php echo $cacheVer; ?>" defer></script>
	
		<?php
// Uso la stessa variabile usata nella libreria check_version.php
if (isset($config['instanceName']) && $config['instanceName'] === 'dev') {
	echo '<script src="js/cheatboard.js" defer></script>';
	echo "<script>console.warn('⚠️ DEV MODE (Config): Cheatboard attiva.');</script>";
}
?>
		<!-- PWA Service Worker: auto-update + auto-reload -->
		<script>
		if ('serviceWorker' in navigator) {
			window.addEventListener('load', () => {
				navigator.serviceWorker.register('./sw.js').then(reg => {
					console.log('[PWA] SW registrato:', reg.scope);

					// Polling: controlla aggiornamenti ogni 60 minuti
					setInterval(() => { reg.update(); }, 60 * 60 * 1000);

					// Se c'è un SW in attesa (aggiornamento trovato), attivalo
					if (reg.waiting) {
						reg.waiting.postMessage('FORCE_UPDATE');
					}

					// Rileva nuovo SW installato → forza attivazione
					reg.addEventListener('updatefound', () => {
						const newSW = reg.installing;
						if (!newSW) return;
						newSW.addEventListener('statechange', () => {
							if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
								console.log('[PWA] Nuova versione disponibile, ricarico...');
								newSW.postMessage('FORCE_UPDATE');
							}
						});
					});
				}).catch(err => console.warn('[PWA] Registrazione fallita:', err));

				// Ascolta messaggi dal SW
				navigator.serviceWorker.addEventListener('message', (e) => {
					if (e.data.type === 'SW_UPDATED' || e.data.type === 'SW_FORCE_RELOAD') {
						console.log('[PWA] Aggiornamento ricevuto, ricarico pagina...');
						window.location.reload();
					}
				});

				// Rileva cambio controller (nuovo SW ha preso il controllo)
				navigator.serviceWorker.addEventListener('controllerchange', () => {
					window.location.reload();
				});
			});
		}
		</script>
	</body>
</html>