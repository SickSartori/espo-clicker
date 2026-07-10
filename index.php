<?php
require_once("php/check_language.php");
require_once("php/check_version.php");
?>
<!DOCTYPE html>
<html lang="<?php echo $lang; ?>">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
		<!-- v3 a11y: rimossi maximum-scale=1.0 e user-scalable=no (WCAG 1.4.4) -->

		<!-- color-scheme dichiarato → riduce flash su prefers-color-scheme cambio -->
		<meta name="color-scheme" content="dark light">

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

		<!-- Preload font logo (massima priorità — usato dal loader)
		     ⚠️ URL deve matchare ESATTAMENTE quello in @font-face (base.css):
		     senza il ?v= sennò il browser segnala "preloaded but not used"
		     perché considera i due URL distinti. -->
		<link rel="preload" as="font" href="assets/fonts/Harabara.ttf" type="font/ttf" crossorigin="anonymous" fetchpriority="high">

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
		<!-- Cache-bust come il JS bundle: in dev (localhost) filemtime → CSS fresca a
		     ogni `npm run build` (vite) senza bumpare la versione, in dev e in prod (come il bundle V3). -->
		<?php
		// $cacheVer resta solo come fallback se il file non esiste (build non ancora eseguita).
		$stylesVer = assetVer(__DIR__ . '/dist/styles.bundle.min.css', $cacheVer);
		$mobileVer = assetVer(__DIR__ . '/dist/styles.mobile.min.css', $cacheVer);
		?>
		<link rel="stylesheet" href="dist/styles.bundle.min.css?v=<?php echo $stylesVer; ?>">

		<!-- Bundle Mobile: caricato solo sotto 768px -->
		<link rel="stylesheet" href="dist/styles.mobile.min.css?v=<?php echo $mobileVer; ?>" media="(max-width: 768px)">

		<!-- V3 styles (tokens, primitives, skip-link a11y). Solo se build V3 presente.
		     Cache buster via filemtime() — ogni rebuild Vite invalida cache SW automaticamente. -->
		<?php
		$v3CssPath = __DIR__ . '/dist-v3/assets/v3-styles.css';
		if (file_exists($v3CssPath)):
			$v3CssVer = filemtime($v3CssPath);
		?>
		<link rel="stylesheet" href="dist-v3/assets/v3-styles.css?v=<?php echo $v3CssVer; ?>">
		<?php endif; ?>

		<!-- CSS Arcade: NON caricato all'avvio → arcade-loader.js lo inietta on-demand -->

		<!-- ============================================================ -->
		<!-- PRELOAD immagini critiche (above-the-fold)                  -->
		<!-- Accelera il Largest Contentful Paint (LCP)                 -->
		<!-- ============================================================ -->
		<link rel="preload" as="image" href="assets/image/skins/espo.webp" fetchpriority="high">
		<link rel="preload" as="image" href="assets/image/skins/espo-click.webp" fetchpriority="high" imagesrcset="assets/image/skins/espo-click.webp" imagesizes="(max-width: 768px) 120px, 240px">

		<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
	</head>
	<body>
		<a href="#center-column" class="v3-skip-link"><?php echo $labels["idx_skip_content"]; ?></a>
		<canvas id="matrix-canvas" aria-hidden="true"></canvas>

		<div id="game-loader">
			<div class="loader-content">
				<div class="loader-spinner"></div>
				<h2 class="loader-title">
					<?php echo $labels["loader_titolo"]; ?>
				</h2>
				<div class="loader-status" id="loader-status-text">
					<?php echo $labels["loader_status"]; ?>
				</div>

				<div class="loader-progress-track" aria-hidden="true">
					<div id="loader-progress-fill" class="loader-progress-fill"></div>
				</div>

				<div class="loader-meta">
					<span id="loader-percent" class="loader-percent">0%</span>
					<span id="loader-counter" class="loader-counter"></span>
				</div>

				<div id="loader-current-file" class="loader-current-file"></div>

				<div id="loader-tip" class="loader-tip"></div>

				<div id="loader-slow-hint" class="loader-slow-hint" hidden>
					<i class="fa-solid fa-triangle-exclamation"></i>
					<span><?php echo isset($labels["loader_slow_hint"]) ? $labels["loader_slow_hint"] : "Connessione lenta — caricamento in corso, attendere..."; ?></span>
				</div>
			</div>
		</div>

		<div id="toast-container" role="status" aria-live="polite" aria-atomic="true"></div>

		<div id="prestige-transition-overlay" class="prestige_transition_overlay prestige_transition_overlay_display_none">
			<div class="prestige-anim-container" id="prestige-anim-container">
				<i class="fa-solid fa-certificate fa-flip prestige-anim-icon"></i>
				<h1 class="prestige-anim-title"><?php echo $labels["idx_promo_title"]; ?></h1>
				<p class="prestige-anim-subtitle fa-fade"><?php echo $labels["idx_promo_subtitle"]; ?></p>

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
					<i class="fa-solid fa-bed"></i> <?php echo $labels["offline_titolo"]; ?>
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
						<i class="fa-solid fa-sack-dollar"></i> <?php echo $labels["offline_guadagni"]; ?>
					</button>
				</div>
			</div>
		</div>
		
		<?php include 'includes/modals.php'; ?>
		<?php include 'includes/modals_arcade.php'; ?>
		<?php include 'includes/modals_help.php'; ?>

		<nav id="game-navbar" aria-label="<?php echo $labels["idx_main_menu_aria"]; ?>">
			<div class="nav-group left">
				<button id="open-help-btn" class="nav-item" title="<?php echo $labels["navbar_guida"]; ?>">
					<i class="nav-icon" data-lucide="book-open"></i>
					<span class="nav-label">
						<?php echo $labels["navbar_guida"]; ?>
					</span>
				</button>
				<button id="open-stats-btn" class="nav-item" title="<?php echo $labels["navbar_stats"]; ?>">
					<i class="nav-icon" data-lucide="chart-line"></i>
					<span class="nav-label">
						<?php echo $labels["navbar_stats"]; ?>
					</span>
				</button>
				<button id="open-arcade-btn" class="nav-item" title="<?php echo $labels["navbar_arcade"]; ?>">
					<i class="nav-icon" data-lucide="gamepad-2"></i>
					<span class="nav-label">
						<?php echo $labels["navbar_arcade"]; ?>
					</span>
				</button>
			</div>

			<div class="nav-group center">
				<button id="open-achievements-btn" class="nav-item" title="<?php echo $labels["navbar_obiettivi"]; ?>">
					<i class="nav-icon" data-lucide="award"></i>
					<span class="nav-label">
						<?php echo $labels["navbar_obiettivi"]; ?>
					</span>
				</button>
				<button id="open-skins-btn" class="nav-item" title="<?php echo $labels["navbar_skin"]; ?>">
					<i class="nav-icon" data-lucide="shirt"></i>
					<span class="nav-label">
						<?php echo $labels["navbar_skin"]; ?>
					</span>
				</button>
				<button id="open-leaderboard-btn" class="nav-item" title="<?php echo $labels["navbar_classifica"]; ?>">
					<i class="nav-icon" data-lucide="trophy"></i>
					<span class="nav-label">
						<?php echo $labels["navbar_classifica"]; ?>
					</span>
				</button>
			</div>

			<div class="nav-group right">
				<button id="open-prestige-hub-btn" class="nav-special-btn">
					<i class="nav-icon" data-lucide="zap"></i>
					<span>
						<?php echo $labels["navbar_promozione"]; ?>
					</span>
				</button>
				<button id="open-user-hub-btn" class="nav-item" title="<?php echo $labels["navbar_account_title"]; ?>">
					<i class="nav-icon" data-lucide="users"></i>
					<span class="nav-label" id="navbar-username-label"><?php echo $labels["account_default_name"]; ?></span>
					<span id="user-hub-badge" class="user-hub-badge" hidden></span>
				</button>
				<button id="open-settings-btn" class="nav-item" title="<?php echo $labels["navbar_opzioni"]; ?>">
					<i class="nav-icon" data-lucide="sliders"></i>
					<span class="nav-label">
						<?php echo $labels["navbar_opzioni"]; ?>
					</span>
				</button>
			</div>
		</nav>

		<button id="quick-mute-btn" title="<?php echo $labels["index_muta_audio"]; ?>" aria-label="<?php echo $labels["index_muta_audio"]; ?>">
			<span class="qm-icon"><i class="fa-solid fa-volume-high"></i></span>
			<!-- Etichetta sblocco audio (.is-blocked). TODO i18n: "Attiva audio" -> $labels. -->
			<span class="qm-hint" aria-hidden="true">Attiva audio</span>
		</button>

		<div id="game-container"><h1 style="position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;padding:0;">Espò Clicker</h1>
			<div id="left-column" class="game-column" role="region" aria-label="<?php echo $labels["idx_upgrades_aria"]; ?>">
				<div class="tabs-header" role="tablist" aria-label="<?php echo $labels["idx_shop_cat_aria"]; ?>">
					<button class="tab-btn active" data-target="upgrade-store" id="tab-click" role="tab" aria-selected="true" aria-controls="upgrade-store">
						<i data-lucide="mouse-pointer-2"></i>
						<?php echo $labels["game_container_click_titolo"]; ?>
					</button>
					<button class="tab-btn" data-target="enhancement-store" id="tab-auto" role="tab" aria-selected="false" aria-controls="enhancement-store">
						<i data-lucide="cog"></i>
						<?php echo $labels["game_container_auto_titolo"]; ?>
					</button>
					<button class="tab-btn tab_promozione" data-target="prestige-wrapper" id="tab-prestige" role="tab" aria-selected="false" aria-controls="prestige-wrapper">
						<i data-lucide="flask-conical"></i>
						<?php echo $labels["game_container_lab_titolo"]; ?>
					</button>
					<button class="tab-btn" data-target="quantum-wrapper" id="tab-quantum" role="tab" aria-selected="false" aria-controls="quantum-wrapper" style="display:none; color: #9b59b6;">
						<i data-lucide="atom"></i> Q-Lab
					</button>
				</div>
				
				<div id="global-filter-section">
					<select id="global-filter-select" aria-label="<?php echo $labels["idx_shop_filter_aria"]; ?>">
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

		<div id="golden-bug" role="button" tabindex="0" aria-label="<?php echo $labels["index_golden_bug_title"]; ?>" title="<?php echo $labels["index_golden_bug_title"]; ?>">
			<i class="fa-solid fa-bug" aria-hidden="true"></i>
		</div>

		<div id="github-link-container">
			<a href="https://github.com/SickSartori/espo-clicker" target="_blank" title="<?php echo $labels["index_github_title"]; ?>">
				<i class="fa-brands fa-github"></i>
				GitHub
			</a>
		</div>
		
		<div id="crunch-overlay"></div>
		<div id="fire-particles-container"></div>

		<div id="mobile-nav-bar" role="navigation" aria-label="<?php echo $labels['idx_mobile_nav_aria']; ?>">
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
			<button id="mobile-arcade-btn" class="mobile-nav-btn mobile-nav-arcade" title="<?php echo $labels["navbar_arcade"]; ?>">
				<i class="fa-solid fa-ghost"></i>
				<span><?php echo $labels["navbar_arcade"]; ?></span>
			</button>
		</div>

		<!-- ============================================================ -->
		<!-- LIBRERIE ESTERNE (solo quelle necessarie all'avvio)        -->
		<!-- lz-string: ora bundlato in game.bundle.min.js              -->
		<!-- Phaser.js rimosso: caricato on-demand da arcade-loader.js  -->
		<!-- ============================================================ -->
		<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js" defer></script>
		<?php $biVer = assetVer(__DIR__ . '/dist/break_infinity.min.js', $cacheVer); ?>
		<script src="dist/break_infinity.min.js?v=<?php echo $biVer; ?>" defer></script>
		<script src="https://cdnjs.cloudflare.com/ajax/libs/howler/2.2.4/howler.min.js" defer></script>
		<script src="https://cdnjs.cloudflare.com/ajax/libs/hammer.js/2.0.8/hammer.min.js" defer></script>
		<!-- Phaser (~1.5 MB) → caricato SOLO all'apertura dell'Arcade -->

		<!-- ============================================================ -->
		<!-- V3 MODULES (Vite ESM, strangler pattern)                     -->
		<!-- Espone window.EspoV3 con i moduli TS migrati progressivamente -->
		<!-- Caricato solo se dist-v3/ esiste (build:v3 eseguita)         -->
		<!-- Cache buster via filemtime() per invalidare SW ad ogni build -->
		<!--                                                              -->
		<!-- ORDINE (Fase 0 migrazione): defer e module eseguono in ordine -->
		<!-- di documento, quindi qui — DOPO la CDN break_infinity, PRIMA  -->
		<!-- del bundle legacy — vale il contratto:                        -->
		<!--  1. window.Decimal = break_infinity (CDN); se la CDN fallisce  -->
		<!--     installGlobalDecimal() installa break_eternity (fallback)  -->
		<!--  2. window.EspoV3 è GIÀ pronto quando il legacy esegue → le    -->
		<!--     deleghe `window.EspoV3?.x ?? legacy` sono sync e sicure    -->
		<!-- Se dist-v3/ manca il tag non viene emesso → il legacy usa i   -->
		<!-- propri fallback. Niente eventi "ready" asincroni.             -->
		<!-- ============================================================ -->
		<?php
		$v3JsPath = __DIR__ . '/dist-v3/game.modules.js';
		if (file_exists($v3JsPath)):
			$v3JsVer = filemtime($v3JsPath);
		?>
		<script type="module" src="dist-v3/game.modules.js?v=<?php echo $v3JsVer; ?>"></script>
		<?php endif; ?>

		<!-- ============================================================ -->
		<!-- GAME BUNDLE (esbuild minificato)                            -->
		<!-- 15 file JS → 1 bundle (~90 KB minificato, ~30 KB gzip)      -->
		<!-- Contiene: asset-system, gamedata, game logic, save system   -->
		<!-- ============================================================ -->
		<!-- Cache buster condiviso: usato per i theme CSS lazy-load
		     (loadThemeCSS in ui-functions.js). Senza questo gli aggiornamenti
		     ai temi non venivano serviti perché ?v=2 (solo major) restava fisso. -->
		<script>window.CACHE_VER = '<?php echo $cacheVer; ?>';</script>
		<!-- Lingua attiva: cookie validato da checkLanguage() in php/check_language.php.
		     Letta dall'overlay i18n nel bundle (js/i18n.js) per applicare EN sui dati. -->
		<script>window.APP_LANG = '<?php echo $lang; ?>';</script>
		<?php
		// Cache-bust del bundle via filemtime (dev E prod) → ogni rebuild
		// (npm run build = vite build) viene servito fresco senza bumpare la versione.
		// $cacheVer resta solo come fallback se il file non esiste (build non fatta).
		$bundleVer = assetVer(__DIR__ . '/dist/game.bundle.min.js', $cacheVer);
		?>
		<script src="dist/game.bundle.min.js?v=<?php echo $bundleVer; ?>" defer></script>

		<!-- ============================================================ -->
		<!-- ARCADE LAZY LOADER                                          -->
		<!-- Carica Phaser + CSS + JS arcade solo all'apertura Arcade   -->
		<!-- Risparmio: ~1.5 MB + 9 richieste HTTP sull'avvio          -->
		<!-- ============================================================ -->
		<script src="js/arcade-loader.js?v=<?php echo $cacheVer; ?>" defer></script>
		<!-- Gli script arcade (snake, space, asteroids, super-espo)    -->
		<!-- vengono iniettati dinamicamente da arcade-loader.js        -->
	
		<!-- Cheatboard/Admin Console: ora caricata da js/backend-config.js
		     (gattata su EspoBackend.env === 'dev'), non più da PHP qui. -->
		<?php
		// DEV/TEST (instanceName=dev): NIENTE service worker. Evita che la cache
		// stale del SW serva CSS/JS vecchi dopo ogni rebuild (causa #1 di "non
		// vedo le modifiche" in sviluppo). In produzione il SW resta attivo.
		$swIsDev = isset($config['instanceName']) && $config['instanceName'] === 'dev'
			&& ($_SERVER['HTTP_HOST'] ?? '') !== ($config['prodHost'] ?? '');
		?>
		<!-- PWA Service Worker: auto-update + auto-reload (solo produzione) -->
		<script>
		if ('serviceWorker' in navigator) {
		<?php if ($swIsDev): ?>
			// DEV/TEST: disinstalla eventuali SW e svuota le cache → codice sempre fresco.
			navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister())).catch(function(){});
			if (self.caches) caches.keys().then(ks => ks.forEach(k => caches.delete(k))).catch(function(){});
		<?php else: ?>
			// Cattura se c'era già un controller PRIMA della registrazione.
			// Se non c'era (prima installazione), non ricaricare quando il SW
			// prende il controllo: la pagina è già stata caricata fresca.
			const _swHadController = !!navigator.serviceWorker.controller;

			// Flag: il game loader è ancora visibile? Se sì, gli aggiornamenti
			// vengono applicati SILENZIOSAMENTE (auto-skipWaiting + reload),
			// così l'utente non vede prompt mentre è già sullo splash screen.
			// Quando il loader scompare passiamo al flusso "confirm()" per
			// non interrompere il gameplay con un reload silenzioso.
			let _swSilentMode = true;
			window.addEventListener('gameBootComplete', () => { _swSilentMode = false; });

			let _swReloadPending = false;
			const _doReload = () => {
				if (_swReloadPending) return;
				_swReloadPending = true;
				console.log('[PWA] Aggiornamento ricevuto, ricarico pagina...');
				window.location.reload();
			};

			const _activateUpdate = (sw) => {
				if (!sw) return;
				if (_swSilentMode) {
					// Loader visibile → applica subito, niente prompt
					console.log('[PWA] Update silenzioso durante splash');
					sw.postMessage('SKIP_WAITING');
				} else {
					// Game UI attiva → chiedi consenso per non interrompere
					if (confirm(<?php echo json_encode($labels["idx_sw_update"], JSON_UNESCAPED_UNICODE); ?>)) {
						sw.postMessage('SKIP_WAITING');
					}
				}
			};

			// Registrazione IMMEDIATA (no attesa load): la SW update check parte
			// in parallelo al boot della pagina. Costo: trascurabile (HEAD su sw.js
			// + diff ~10KB) — beneficio: aggiornamento applicato prima del login
			// senza prompt al primo paint.
			navigator.serviceWorker.register('./sw.js').then(reg => {
				console.log('[PWA] SW registrato:', reg.scope);

				// Polling: controlla aggiornamenti ogni 60 minuti
				setInterval(() => { reg.update(); }, 60 * 60 * 1000);

				// SW già in waiting da una precedente visita → applica subito
				if (reg.waiting && _swHadController) {
					_activateUpdate(reg.waiting);
				}

				// Nuovo SW trovato durante questa sessione
				reg.addEventListener('updatefound', () => {
					const newSW = reg.installing;
					if (!newSW) return;
					newSW.addEventListener('statechange', () => {
						if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
							console.log('[PWA] Nuova versione installata');
							_activateUpdate(newSW);
						}
					});
				});
			}).catch(err => console.warn('[PWA] Registrazione fallita:', err));

			// Messaggi dal SW (SW_UPDATED, SW_FORCE_RELOAD) → reload pagina
			navigator.serviceWorker.addEventListener('message', (e) => {
				if (e.data.type === 'SW_UPDATED' || e.data.type === 'SW_FORCE_RELOAD') {
					if (!_swHadController) return; // prima installazione: skip
					_doReload();
				}
			});

			// controllerchange: dopo skipWaiting, il nuovo SW prende il controllo
			navigator.serviceWorker.addEventListener('controllerchange', () => {
				if (!_swHadController) return;
				_doReload();
			});
		<?php endif; ?>
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
					alert(<?php echo json_encode($labels["idx_pwa_install"], JSON_UNESCAPED_UNICODE); ?>);
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