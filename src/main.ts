/**
 * Entry V3 (strangler pattern).
 *
 * Espone moduli nuovi su `window.EspoV3` finché il vecchio bundle (dist/game.bundle.min.js)
 * resta in carica. Quando una funzionalità è completamente migrata, il vecchio chiama
 * `window.EspoV3.foo()` invece della propria implementazione, e poi viene cancellata.
 *
 * Caricamento in index.php (condizionale):
 *   <?php if (file_exists('dist-v3/game.modules.js')): ?>
 *   <script type="module" src="dist-v3/game.modules.js?v=<?php echo $cacheVer; ?>"></script>
 *   <?php endif; ?>
 */
import '../styles/ui/index.css';
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
import { installInterop } from './state/interop';
import { installGameData } from './data/index';
import { installVersion } from './lib/version';
import { installErrorHandler } from './app/error-handler';
import { installBackend } from './lib/backend-config';

// Installa Decimal globale prima che il legacy bundle ne crei istanze.
// Drop-in replacement per la CDN break_infinity.
installGlobalDecimal();

// Reorg filone A: lo stato runtime condiviso vive in src/state/store.ts; gli
// accessor window.* (bps, gameState, ...) servono il bundle legacy, che esegue
// DOPO questo modulo (contratto F0). TEMPORANEO fino a fine filone C.
installInterop();

// Reorg filone B: i dati di gioco vivono in src/data/ e vengono installati su
// window.gameData PRIMA del bundle legacy (che li consuma al boot).
installGameData();

// Reorg C-thin: infrastruttura legacy come moduli — stesse API window.*,
// installate PRIMA del bundle (ordine deterministico).
installVersion();
installErrorHandler();
installBackend();

// Bind 3D parallax sul clicker (auto-skip se reduced-motion o mobile)
autoInitClickerParallax();

// Lucide icons — render any [data-lucide] in the page
autoInitLucide();

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
  state: { store, installInterop },
} as const;

declare global {
  interface Window {
    EspoV3: typeof EspoV3;
  }
}

window.EspoV3 = EspoV3;

console.log(`[EspoV3] modules pronti — schema v${CURRENT_SCHEMA_VERSION}`);
