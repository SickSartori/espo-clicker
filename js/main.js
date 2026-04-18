// External deps bundlati (rimossi dai CDN in index.php)
import LZString from 'lz-string';
window.LZString = LZString;

// Save system V9
import { saveToIndexedDB, loadFromIndexedDB, clearIndexedDB } from './save-db.js';
window.SaveDB = { saveToIndexedDB, loadFromIndexedDB, clearIndexedDB };

// CRITICO: version-config PRIMA di gamestate.js
// gamestate.js:113 chiama getInitialGameState() a top-level → usa window.GAME_VERSION
import './version-config.js';

// Asset system (deve precedere game data)
import './asset-packages.js';
import './asset-manager.js';

// Game data
import './data/core.js';
import './data/gamestate.js';
import './data/assets.js';
import './data/skins.js';
import './data/teams.js';
import './data/upgrades.js';
import './data/achievements.js';
import './data/events.js';
import './data/texts.js';

// UI + logic
import './ui-functions.js';
import './game-logic.js';
import './modals.js';
import './podio.js';

// Arcade lazy loader
import './arcade-loader.js';

// Main (deve essere ultimo — init chiama funzioni definite sopra)
import './script.js';
