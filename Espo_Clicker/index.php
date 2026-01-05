<?php require_once("php/check_language.php"); ?>
<!DOCTYPE html>
<html lang="it">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>
			<?php echo $labels["head_titolo"]; ?>
		</title>
		<link rel="stylesheet" href="./css/keyframes.css?v=<?php echo time(); ?>">
		<link rel="stylesheet" href="./css/base.css?v=<?php echo time(); ?>">
		<link rel="stylesheet" href="./css/layout.css?v=<?php echo time(); ?>">
		<link rel="stylesheet" href="./css/components.css?v=<?php echo time(); ?>"> 
		<link rel="stylesheet" href="./css/navbar.css?v=<?php echo time(); ?>"> 
		<link rel="stylesheet" href="./css/clicker.css?v=<?php echo time(); ?>">
		<link rel="stylesheet" href="./css/store.css?v=<?php echo time(); ?>">
		<link rel="stylesheet" href="./css/modals-core.css?v=<?php echo time(); ?>"> 
		<link rel="stylesheet" href="./css/modals-content.css?v=<?php echo time(); ?>"> 
		<link rel="stylesheet" href="./css/skins.css?v=<?php echo time(); ?>">    
		<link rel="stylesheet" href="./css/podio.css?v=<?php echo time(); ?>">  
		<link rel="stylesheet" href="./css/mobile.css?v=<?php echo time(); ?>">
		<link rel="stylesheet" href="./css/8bit-theme.css?v=<?php echo time(); ?>">
		<link rel="stylesheet" href="./css/christmas-theme.css?v=<?php echo time(); ?>">
		<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css?v=<?php echo time(); ?>">
		<link rel="icon" type="image/png" href="./assets/image/favicon.webp">
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

		<div id="prestige-transition-overlay" style="display: none;">
			<div class="transition-content">
				<div class="transition-icon">🚀</div>
				<h2>
					<?php echo $labels["prestigio_titolo"]; ?>
				</h2>
				<p>
					<?php echo $labels["prestigio_sottotitolo"]; ?>
				</p>
			</div>
		</div>
		
		<div id="christmas-overlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #c0392b; z-index: 10000; justify-content: center; align-items: center; flex-direction: column; color: white;">
			<h1 id="christmas-title">
				🎄 <?php echo $labels["natale_titolo"]; ?> 🎄
			</h1>
			<p id="christmas-subtitle">
				<?php echo $labels["natale_sottotitolo"]; ?>
			</p>
		</div>

		<div id="snow-container" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1; display: none;"></div>

		<div id="offline-modal" class="modal-backdrop" style="display: none; z-index: 3000;">
			<div class="modal-content" style="text-align: center; border-color: #f39c12;">
				<h2 style="color: #f39c12; border-bottom-color: #f39c12;">
					💤 <?php echo $labels["offline_titolo"]; ?>
				</h2>
				<div class="settings-content" style="padding: 30px;">
					<p style="color: #bdc3c7; font-size: 1.1rem;">
						<?php echo $labels["offline_sottotitolo"]; ?>
					</p>
					<div style="margin: 20px 0;">
						<p style="text-transform: uppercase; font-size: 0.8rem; color: #7f8c8d; margin-bottom: 5px;">
							<?php echo $labels["offline_server"]; ?>
						</p>
						<div id="offline-efficiency-display" style="font-weight: bold; color: #3498db; font-size: 1.2rem;">30%</div>
					</div>
					<div style="background: rgba(243, 156, 18, 0.1); border: 1px solid #d35400; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
						<span id="offline-earnings-display" style="font-size: 2.5rem; font-weight: 800; color: #f1c40f; text-shadow: 0 0 10px rgba(243, 156, 18, 0.4);">0</span>
						<span style="font-size: 1.2rem; color: #f1c40f;">
							<?php echo $labels["offline_bug"]; ?>
						</span>
					</div>
					<button id="btn-claim-offline" class="buy-btn" style="background: linear-gradient(to right, #f1c40f, #e67e22); color: #2c3e50; font-size: 1.2rem; padding: 15px; width: 100%;">
						💰 <?php echo $labels["offline_guadagni"]; ?>
					</button>
				</div>
			</div>
		</div>
		
		<?php include 'includes/modals.php'; ?>
		
		<nav id="game-navbar">
			<div class="nav-group left">
				<button id="open-help-btn" class="nav-item" title="Guida">
					<i class="nav-icon fa-solid fa-circle-question"></i>
					<span class="nav-label">
						<?php echo $labels["navbar_guida"]; ?>
					</span>
				</button>
				<button id="open-stats-btn" class="nav-item" title="Statistiche">
					<i class="nav-icon fa-solid fa-chart-pie"></i>
					<span class="nav-label">
						<?php echo $labels["navbar_stats"]; ?>
					</span>
				</button>
				<button id="open-arcade-btn" class="nav-item" title="Sala Giochi">
					<i class="nav-icon fa-solid fa-gamepad"></i>
					<span class="nav-label">
						<?php echo $labels["navbar_arcade"]; ?>
					</span>
				</button>
			</div>

			<div class="nav-group center">
				<button id="open-achievements-btn" class="nav-item" title="Obiettivi">
					<i class="nav-icon fa-solid fa-trophy"></i>
					<span class="nav-label">
						<?php echo $labels["navbar_obiettivi"]; ?>
					</span>
				</button>
				<button id="open-skins-btn" class="nav-item" title="Guardaroba">
					<i class="nav-icon fa-solid fa-shirt"></i>
					<span class="nav-label">
						<?php echo $labels["navbar_skin"]; ?>
					</span>
				</button>
				<button id="open-leaderboard-btn" class="nav-item" title="Classifica">
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
				<button id="open-settings-btn" class="nav-item" title="Opzioni">
					<i class="nav-icon fa-solid fa-gear"></i>
					<span class="nav-label">
						<?php echo $labels["navbar_opzioni"]; ?>
					</span>
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
						<i class="fa-solid fa-computer-mouse"></i>
						<?php echo $labels["game_container_click_titolo"]; ?>
					</button>
					<button class="tab-btn" data-target="enhancement-store" id="tab-auto">
						<i class="fa-solid fa-robot"></i>
						<?php echo $labels["game_container_auto_titolo"]; ?>
					</button>
					<button class="tab-btn" data-target="prestige-wrapper" id="tab-prestige" style="display: none;">
						<i class="fa-solid fa-flask"></i>
						<?php echo $labels["game_container_lab_titolo"]; ?>
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
			</div>

			<?php include 'includes/col_center.php'; ?>
			<?php include 'includes/col_buildings.php'; ?>
		</div>

		<div id="golden-bug" title="Un Ticket Critico! Clicca!">
			<i class="fa-solid fa-bug"></i>
		</div> 

		<div id="github-link-container">
			<a href="https://github.com/SickSartori/espo-clicker" target="_blank" title="Repository GitHub">
				<i class="fa-brands fa-github" style="font-size: 2.5rem;"></i>
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

		<video id="rick-roll-video" style="display: none;" playsinline preload="none" data-src="./assets/video/rick-espley-video.mp4"></video>
		<video id="ricardo-video" style="display: none;" playsinline preload="none" data-src="./assets/video/ricardo-milespo-video.mp4"></video>
		<video id="ricardo-metal-video" style="display: none;" playsinline preload="none" data-src="./assets/video/ricardo-milespo-metal-video.mp4"></video>
		<video id="ricardo-dota-video" style="display: none;" playsinline preload="none" data-src="./assets/video/ricardo-milespo-dota-video.mp4"></video>

		<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js" defer></script>
		<script src="https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.4.4/lz-string.min.js" defer></script>
		<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js" defer></script>
    	<script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js" defer></script>

		<script src="./js/version-config.js" defer></script>
		<script src="./js/game-data.js" defer></script>
		<script src="./js/ui-functions.js" defer></script>
		<script src="./js/game-logic.js" defer></script>
		<script src="./js/script.js" defer></script> 
		<script src="./js/podio.js" defer></script>
		<script src="./js/modals.js" defer></script>		
		<script src="./js/security_patch.js" defer></script>		
	
		<?php 
			$configFile = __DIR__ . '/php/config.php';

			if (file_exists($configFile))
			{
				$config = require($configFile);

				if (isset($config['instancename']) && $config['instancename'] === 'dev')
				{
					echo '<script src="./js/cheatboard.js" defer></script>';
					echo "<script>console.warn('⚠️ DEV MODE (Config): Cheatboard attiva.');</script>";
				}
			}
		?>
	</body>
</html>