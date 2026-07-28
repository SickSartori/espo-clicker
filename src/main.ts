/**
 * Entry V3 (unico bundle — il vecchio bundle legacy classic è stato eliminato,
 * kill-legacy periferici). Espone i moduli su `window.EspoV3` e installa su
 * `window` tutto ciò che i residui classic (js/cheatboard.js dev-only, e
 * js/arcade-page.js sulla pagina standalone arcade.php) si aspettano di trovare.
 *
 * Caricamento in index.php (bundle dell'app, dopo break_infinity):
 *   <?php $v3JsVer = assetVer(__DIR__ . '/dist/game.modules.js', $cacheVer); ?>
 *   <script type="module" src="dist/game.modules.js?v=<?php echo $v3JsVer; ?>"></script>
 */
import '../styles/ui/index.css';
import LZString from 'lz-string';
import { sha256, hmacSha256, randomHex } from './core/crypto';
import { SaveDB, defaultSaveDB } from './core/save/db';
import { encodeSave, decodeSave } from './core/save/codec';
import {
  decideRollback,
  decideRollbackFromSaves,
  compareDecimalStrings,
} from './core/save/anti-rollback';
import { migrate, detectSchemaVersion } from './core/migrations';
import { CURRENT_SCHEMA_VERSION } from './types/save';
import { Scheduler } from './core/loop';
import { computeOfflineAsync, encodeSaveAsync, encodeSaveStringAsync, decodeSaveAsync, terminateWorkers } from './workers/client';
import { Decimal, installGlobalDecimal, gt, gte, eq } from './core/bignum';
import { autoInitClickerParallax, enableClickerParallax } from './ui/interactions/clicker-parallax';
import { autoInitLucide, renderLucideIcons } from './ui/icons/lucide-init';
import { applyLanguage, deepOverlay, overlayById, I18N_COLLECTIONS } from './core/i18n/overlay';
import { formatNumber, formatFullNumber } from './ui/format/number-format';
import { formatTime } from './ui/format/time-format';
import { createThemeCssLoader, ThemeCssLoader } from './ui/theme/css-loader';
import { createToastQueue, ToastQueue } from './ui/toast/queue';
import { initModals } from './ui/modals';
import { initPodio } from './ui/podio';
import { initSocial } from './ui/social';
import { initBoot } from './app/boot';
import './ui/render'; // rendering/HUD/toast — ex js/ui-functions.js (side-effect: ri-esposizioni su window)
import './game/logic'; // economia/eventi/achievement/audio — ex js/game-logic.js (side-effect: ri-esposizioni su window)
import './ui/intro'; // EspoIntro — ex js/intro.js (side-effect: window.EspoIntro)
import './ui/fx/esposion'; // EsposionFX — ex js/esposion.js (side-effect: window.EsposionFX)
import './lib/arcade-loader'; // ArcadeLoader — ex js/arcade-loader.js (side-effect: window.ArcadeLoader, unica istanza)
import {
  anyClickUpgradeAvailable,
  anyEnhancementAvailable,
  anyPrestigeUpgradeAvailable,
  anyClaimableAchievement,
  isPrestigeTabVisible,
  isQuantumUnlocked,
  visualBps,
} from './ui/rules/progression';
import {
  applyBonusSoftcap,
  computePrestigeBonus,
  computeBps,
  computeClickValue,
  computeRawClickValue,
  prestigeUpgradeCost,
  prestigeThreshold,
  teamBulkCost,
  maxAffordableTeams,
  milestoneReached,
} from './game/economy';
import {
  prestigeGained,
  applyTokenDuplicator,
  prestigeStartingBugs,
  prestigeTeamCarryover,
  formatQbitsEarned,
} from './game/prestige';
import {
  goldenBugReward,
  dailyStreak,
  dailyReward,
  crunchDuration,
  crunchCooldownFromEnd,
} from './game/events';
import { createAssetManager, AssetManager } from './core/assets/manager';
import { store } from './state/store';
import { installGameData } from './data/index';
import { installVersion } from './lib/version';
import { installErrorHandler } from './app/error-handler';
import { installBackend } from './lib/backend-config';
import { installSaveDb } from './state/save-db';
import { installI18n } from './lib/i18n';
import { installAssetManager } from './lib/asset-manager';
import { initGameState } from './state/game-state';

// Installa Decimal globale prima che il legacy bundle ne crei istanze.
// Drop-in replacement per la CDN break_infinity.
installGlobalDecimal();

// Reorg filone B: i dati di gioco vivono in src/data/ e vengono installati su
// window.gameData PRIMA del bundle legacy (che li consuma al boot).
installGameData();

// Reorg C-thin: infrastruttura legacy come moduli — stesse API window.*,
// installate PRIMA del bundle (ordine deterministico).
installVersion();
installErrorHandler();
installBackend();
installSaveDb();
installI18n();
installAssetManager();

// Bind 3D parallax sul clicker (auto-skip se reduced-motion o mobile)
autoInitClickerParallax();

// Lucide icons — render any [data-lucide] in the page
autoInitLucide();

// Modali migrate (ex js/modals.js) — registra il wiring su DOMContentLoaded.
initModals();

const EspoV3 = {
  version: '3.0.0-alpha',
  schema: { current: CURRENT_SCHEMA_VERSION, detect: detectSchemaVersion },
  crypto: { sha256, hmacSha256, randomHex },
  save: {
    SaveDB,
    db: defaultSaveDB,
    encode: encodeSave,
    decode: decodeSave,
    antiRollback: {
      decide: decideRollback,
      decideFromSaves: decideRollbackFromSaves,
      compare: compareDecimalStrings,
    },
  },
  migrations: { migrate },
  bignum: { Decimal, gt, gte, eq },
  loop: { Scheduler },
  i18n: { applyLanguage, deepOverlay, overlayById, collections: I18N_COLLECTIONS },
  format: { formatNumber, formatFullNumber, formatTime },
  theme: { createCssLoader: createThemeCssLoader, ThemeCssLoader },
  economy: {
    applyBonusSoftcap,
    computePrestigeBonus,
    computeBps,
    computeClickValue,
    computeRawClickValue,
    prestigeUpgradeCost,
    prestigeThreshold,
    teamBulkCost,
    maxAffordableTeams,
    milestoneReached,
  },
  prestige: {
    prestigeGained,
    applyTokenDuplicator,
    prestigeStartingBugs,
    prestigeTeamCarryover,
    formatQbitsEarned,
  },
  events: {
    goldenBugReward,
    dailyStreak,
    dailyReward,
    crunchDuration,
    crunchCooldownFromEnd,
  },
  rules: {
    anyClickUpgradeAvailable,
    anyEnhancementAvailable,
    anyPrestigeUpgradeAvailable,
    anyClaimableAchievement,
    isPrestigeTabVisible,
    isQuantumUnlocked,
    visualBps,
  },
  toast: { createQueue: createToastQueue, ToastQueue },
  assets: { createManager: createAssetManager, AssetManager },
  workers: {
    computeOffline: computeOfflineAsync,
    encodeSave: encodeSaveAsync,
    encodeSaveString: encodeSaveStringAsync,
    decodeSave: decodeSaveAsync,
    terminate: terminateWorkers,
  },
  // Lazy chunks — caricati solo quando chiamati (Vite splitta automatico)
  fx: {
    /** import('motion') wrapper. */
    animations: () => import('./ui/animations/index'),
    /** import('pixi.js') particle FX. */
    particles: () => import('./ui/particles/pixi-particles'),
  },
  ui: {
    enableClickerParallax,
    renderLucideIcons,
  },
  state: { store },
} as const;

declare global {
  interface Window {
    EspoV3: typeof EspoV3;
  }
}

window.EspoV3 = EspoV3;

console.log(`[EspoV3] modules pronti — schema v${CURRENT_SCHEMA_VERSION}`);

// Stato iniziale (ex js/data/gamestate.js) — DOPO installGameData/installVersion
// e dopo EspoV3, PRIMA del boot che lo consuma.
initGameState();

(window as any).LZString = LZString; // ex vendor classic — consumato da boot.ts e cheatboard (dev)

// Boot del gioco (ex js/script.js) — registra il DOMContentLoaded che costruisce
// window.EspooClicker, carica il save e avvia lo Scheduler.
initBoot();

// Classifica e tab Amici (ex js/podio.js, js/social.js) — registrati DOPO initBoot()
// così i loro handler DOMContentLoaded girano dopo quello del boot, come nell'ordine
// originale del bundle legacy. Entrambi restano order-independent verso EspooClicker
// grazie alla guardia di polling preservata al loro interno.
initPodio();  // classifica — ex js/podio.js
initSocial(); // tab Amici — ex js/social.js
