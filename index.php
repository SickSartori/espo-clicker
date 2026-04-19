<?php
require_once("php/check_language.php");
require_once("php/check_version.php");
?>
<!DOCTYPE html>
<html lang="it">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">

		<!-- PWA Meta Tags -->
		<meta name="theme-color" content="#3498db">	
		<meta name="mobile-web-app-capable" content="yes">
		<meta name="apple-mobile-web-app-capable" content="yes">
		<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
		<meta name="apple-mobile-web-app-title" content="Espo Clicker">
		<meta name="application-name" content="Espo Clicker">
		<meta name="mobile-web-app-capable" content="yes">
		<meta name="msapplication-TileColor" content="#050505">
		<meta name="msapplication-TileImage" content="assets/image/ico.svg">
		<link rel="manifest" href="manifest.json">
		<link rel="apple-touch-icon" href="assets/image/ico.svg">
		<link rel="icon" type="image/svg+xml" href="assets/image/ico.svg">

		<title>
			<?php echo $labels["head_titolo"]; ?>
		</title>

		<!-- Preload font critici -->
		<link rel="preconnect" href="https://fonts.googleapis.com">
		<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
		<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&display=swap">
		<link rel="preconnect" href="https://cdnjs.cloudflare.com">
		<link rel="preconnect" href="https://cdn.jsdelivr.net">

		<!-- ============================================================ -->
		<!-- CSS BUNDLE (esbuild minificato)                              -->
		<!-- Serviti da dist/ con gzip + cache 1 anno (immutable)        -->
		<!-- ============================================================ -->

		<!-- Bundle Core + UI + all styles -->
		<link rel="stylesheet" href="dist/styles.bundle.min.css?v=<?php echo $cacheVer; ?>">

		<!-- Bundle Mobile: caricato solo sotto 768px -->
		<link rel="stylesheet" href="dist/styles.mobile.min.css?v=<?php echo $cacheVer; ?>" media="(max-width: 768px)">

		<!-- CSS Arcade: NON caricato all'avvio → arcade-loader.js lo inietta on-demand -->

		<!-- ============================================================ -->
		<!-- PRELOAD immagini critiche (above-the-fold)                  -->
		<!-- Accelera il Largest Contentful Paint (LCP)                 -->
		<!-- ============================================================ -->
		<link rel="preload" as="image" href="assets/image/skins/espo.webp" fetchpriority="high">
		<link rel="preload" as="image" href="assets/image/skins/espo-click.webp" fetchpriority="high" imagesrcset="assets/image/skins/espo-click.webp" imagesizes="(max-width: 768px) 120px, 240px">

		<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css?v=<?php echo $cacheVer; ?>">
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

		<!-- ============================================================ -->
		<!-- LIBRERIE ESTERNE (solo quelle necessarie all'avvio)        -->
		<!-- lz-string: ora bundlato in game.bundle.min.js              -->
		<!-- Phaser.js rimosso: caricato on-demand da arcade-loader.js  -->
		<!-- ============================================================ -->
		<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js" defer></script>
		<script src="https://cdn.jsdelivr.net/npm/break_infinity.js@2" defer></script>
		<script src="https://cdnjs.cloudflare.com/ajax/libs/howler/2.2.4/howler.min.js" defer></script>
		<script src="https://cdnjs.cloudflare.com/ajax/libs/hammer.js/2.0.8/hammer.min.js" defer></script>
		<!-- Phaser (~1.5 MB) → caricato SOLO all'apertura dell'Arcade -->

		<!-- ============================================================ -->
		<!-- GAME BUNDLE (esbuild minificato)                            -->
		<!-- 15 file JS → 1 bundle (~90 KB minificato, ~30 KB gzip)      -->
		<!-- Contiene: asset-system, gamedata, game logic, save system   -->
		<!-- ============================================================ -->
		<script src="dist/game.bundle.min.js?v=<?php echo $cacheVer; ?>" defer></script>		
		
		<!-- ============================================================ -->
		<!-- ARCADE LAZY LOADER                                          -->
		<!-- Carica Phaser + CSS + JS arcade solo all'apertura Arcade   -->
		<!-- Risparmio: ~1.5 MB + 9 richieste HTTP sull'avvio          -->
		<!-- ============================================================ -->
		<script src="js/arcade-loader.js?v=<?php echo $cacheVer; ?>" defer></script>
		<!-- Gli script arcade (snake, space, asteroids, super-espo)    -->
		<!-- vengono iniettati dinamicamente da arcade-loader.js        -->
	
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
			// Cattura se c'era già un controller PRIMA della registrazione.
			// Se non c'era (prima installazione), non ricaricare quando il SW
			// prende il controllo: la pagina è già stata caricata fresca.
			const _swHadController = !!navigator.serviceWorker.controller;

			window.addEventListener('load', () => {
				navigator.serviceWorker.register('./sw.js').then(reg => {
					console.log('[PWA] SW registrato:', reg.scope);

					// Polling: controlla aggiornamenti ogni 60 minuti
					setInterval(() => { reg.update(); }, 60 * 60 * 1000);

					// Se c'è un SW in attesa (aggiornamento trovato), chiedi consenso
					if (reg.waiting && _swHadController) {
						if (confirm('🔄 Nuova versione disponibile! Ricarica per aggiornare?')) {
							reg.waiting.postMessage('SKIP_WAITING');
						}
					}

					// Rileva nuovo SW installato → chiedi consenso prima di attivare
					reg.addEventListener('updatefound', () => {
						const newSW = reg.installing;
						if (!newSW) return;
						newSW.addEventListener('statechange', () => {
							if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
								console.log('[PWA] Nuova versione disponibile, attesa consenso...');
								if (confirm('🔄 Nuova versione disponibile! Ricarica per aggiornare?')) {
									newSW.postMessage('SKIP_WAITING');
								}
							}
						});
					});
				}).catch(err => console.warn('[PWA] Registrazione fallita:', err));

				// Ascolta messaggi dal SW — un solo reload anche se arrivano più messaggi
				let _swReloadPending = false;
				navigator.serviceWorker.addEventListener('message', (e) => {
					if (e.data.type === 'SW_UPDATED' || e.data.type === 'SW_FORCE_RELOAD') {
						// Ignora se è la prima installazione (nessun controller precedente)
						if (!_swHadController) return;
						if (_swReloadPending) return;
						_swReloadPending = true;
						console.log('[PWA] Aggiornamento ricevuto, ricarico pagina...');
						window.location.reload();
					}
				});

				// controllerchange e SW_UPDATED scattano entrambi al cambio SW:
				// usiamo lo stesso flag per evitare il doppio reload.
				navigator.serviceWorker.addEventListener('controllerchange', () => {
					// Ignora se è la prima installazione (nessun controller precedente)
					if (!_swHadController) return;
					if (_swReloadPending) return;
					_swReloadPending = true;
					window.location.reload();
				});
			});
		}
		</script>
		<!-- PWA Install Prompt -->
		<script>
		(function() {
			let _deferredInstallPrompt = null;

			const getRow = () => document.getElementById('pwa-install-row');

			const isStandalone = () =>
				window.matchMedia('(display-mode: standalone)').matches ||
				window.navigator.standalone === true;

			const isIOS = () =>
				/iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;

			const showRow = () => {
				const row = getRow();
				if (row) row.style.display = '';
			};

			const hideRow = () => {
				const row = getRow();
				if (row) row.style.display = 'none';
			};

			// Se già installata non mostrare nulla
			if (isStandalone()) return;

			if (isIOS()) {
				// iOS non supporta beforeinstallprompt — mostra sempre il bottone con istruzioni
				showRow();
				document.addEventListener('click', (e) => {
					if (!e.target.closest('#pwa-install-btn')) return;
					alert('Per installare l\'app: tocca l\'icona "Condividi" in Safari e poi "Aggiungi a schermata Home".');
				});
			} else {
				// Android / Desktop Chrome/Edge
				window.addEventListener('beforeinstallprompt', (e) => {
					e.preventDefault();
					_deferredInstallPrompt = e;
					showRow();
				});

				window.addEventListener('appinstalled', () => {
					_deferredInstallPrompt = null;
					hideRow();
				});

				document.addEventListener('click', async (e) => {
					if (!e.target.closest('#pwa-install-btn')) return;
					if (!_deferredInstallPrompt) return;
					_deferredInstallPrompt.prompt();
					const { outcome } = await _deferredInstallPrompt.userChoice;
					if (outcome === 'accepted') {
						_deferredInstallPrompt = null;
						hideRow();
					}
				});
			}
		})();
		</script>
	</body>
</html>