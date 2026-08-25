/**
 * Stato iniziale del gioco + reset (ex js/data/gamestate.js) — Blocco periferici kill-legacy.
 *
 * ⚠️ ORDINE: `initGameState()` DEVE essere chiamata da main.ts DOPO
 * `installGameData()`/`installVersion()`. Motivo: legge `store.gameData.*` e
 * `window.GAME_VERSION.*`, che devono già essere popolati. Per questo NON è un
 * import side-effect: gli import ESM sono hoisted.
 */
import { store } from './store';

const w = window as any;

// --- FUNZIONE GENERAZIONE STATO ---
function getInitialGameState() {
    const state: any = {
        version: { major: w.GAME_VERSION.major, minor: w.GAME_VERSION.minor, stage: w.GAME_VERSION.stage },
        // Schema del SAVE (≠ version del GIOCO): consumato dal framework migrazioni
        // V3 (EspoV3.migrations, detectSchemaVersion). I save senza questo campo
        // sono trattati come schema 1 e migrati via gate legacy version.major.
        // schemaVersion 3 = lancio produzione: un nuovo giocatore nasce già in
        // Season 1 e non passa mai dalla migrazione Fondatore (v2→v3).
        schemaVersion: 3,
        season: 1,
        arcadeHighScores: { snake: 0, space: 0, superespo: 0, asteroids: 0, invaders: 0, centipede: 0, stack: 0 },
        // Popup "come si segnala": una tantum, mostrato dopo le note di rilascio.
        // Sta nel save (e non in localStorage) apposta: così viaggia col cloud e
        // non ricompare cambiando dispositivo. I save vecchi non hanno il campo,
        // che è undefined = falsy = lo vedono una volta, come voluto.
        seenFeedbackIntro: false,
        score: new w.Decimal(0),
        baseClickValue: new w.Decimal(1),
        totalClicks: 0,
        totalScore: new w.Decimal(0),
        totalOfflineScore: new w.Decimal(0),
        prestigePoints: new w.Decimal(0),
        lifetimePrestigePoints: new w.Decimal(0),
        totalResets: 0,
        totalFormattazioni: 0,
        qBits: new w.Decimal(0),
        lifetimeQBits: new w.Decimal(0),
        totalGoldenBugsClicked: 0,
        longestCombo: 0,
        totalPlayTime: 0,
        lifetimeScore: new w.Decimal(0),
        lastSaveTimestamp: Date.now(),
        lastBluescreenTimestamp: 0,
        crunchTimeEndTime: 0,
        crunchTimeCooldownEnd: 0,
        skins: { current: 'default', unlocked: ['default'] },
        filterSettings: { globalFilter: 'available' },
        teams: {},
        clickUpgrades: {},
        prestigeUpgrades: {},
        superUpgrades: {},
        buildingEnhancements: {},
        achievements: {},
        user: {
            username: 'Giocatore',
            masterVolume: 1.0,
            sfxVolume: 1.0,
            musicVolume: 0.5,
            audioCustom: {},
            bgMusicSelection: 'sound-bg-music-v3'
        }
    };

    // Popolamento dinamico basato sui dati caricati in store.gameData
    if (store.gameData.teams) {
        for (const key in store.gameData.teams) state.teams[key] = { count: 0 };
    }

    if (store.gameData.clickUpgrades) {
        for (const key in store.gameData.clickUpgrades) state.clickUpgrades[key] = { purchased: false };
    }

    if (store.gameData.buildingEnhancements) {
        for (const key in store.gameData.buildingEnhancements) state.buildingEnhancements[key] = { purchased: false };
    }

    if (store.gameData.prestigeUpgrades) {
        for (const key in store.gameData.prestigeUpgrades) {
            if (store.gameData.prestigeUpgrades[key].isCounted)
                state.prestigeUpgrades[key] = { count: 0 };
            else
                state.prestigeUpgrades[key] = { purchased: false };
        }
    }

    if (store.gameData.achievements) {
        for (const key in store.gameData.achievements) {
            state.achievements[key] = { unlocked: false, claimed: false };
        }
    }

    // Inizializzazione Audio Custom
    if (store.gameData.assets && store.gameData.assets.sounds) {
        const allAssets = { ...store.gameData.assets.sounds, ...store.gameData.assets.videos };
        for (const key in allAssets) {
            if (allAssets[key].defaultVol !== undefined)
                state.user.audioCustom[allAssets[key].id] = allAssets[key].defaultVol;
        }
    }
    if (store.gameData.superUpgrades) {
        for (const key in store.gameData.superUpgrades) {
            state.superUpgrades[key] = { purchased: false };
        }
    }

    return state;
}

// --- FUNZIONE RESET ---
function resetGameToDefault() {
    const freshState = getInitialGameState();
    // Reset profondo dell'oggetto gameState esistente
    Object.assign(store.gameState, freshState);

    // Deep copy per oggetti annidati per evitare riferimenti condivisi
    store.gameState.teams = JSON.parse(JSON.stringify(freshState.teams));
    store.gameState.clickUpgrades = JSON.parse(JSON.stringify(freshState.clickUpgrades));
    store.gameState.prestigeUpgrades = JSON.parse(JSON.stringify(freshState.prestigeUpgrades));
    store.gameState.buildingEnhancements = JSON.parse(JSON.stringify(freshState.buildingEnhancements));
    store.gameState.achievements = JSON.parse(JSON.stringify(freshState.achievements));
    store.gameState.skins = JSON.parse(JSON.stringify(freshState.skins));
    store.gameState.user = JSON.parse(JSON.stringify(freshState.user));

    // Reset Variabili Runtime
    store.bps = new w.Decimal(0);
    store.prestigeBonus = new w.Decimal(1);
    store.clickCPSBonus = new w.Decimal(1);
    store.clickHistory = [];
    w.goldenBugChance = 0.001;
    w.goldenBugSpawnTime = 60000;
    w.goldenBugMult = new w.Decimal(1);
    w.gameFlags = {};
}

/**
 * Codice eseguibile al load (ex top-level di js/data/gamestate.js): guard di
 * contratto EspoV3, window.* legacy e generazione dello stato iniziale.
 * Chiamata da main.ts — vedi ⚠️ ORDINE in testa al file.
 */
export function initGameState(): void {
  // Guard di contratto (ex js/save-db.js, F8 → qui dal reorg C-thin): la build
  // V3 è un requisito HARD. gamestate.js era il PRIMO file bundlato che dipendeva
  // da EspoV3/gameData: segnala UNA volta e in chiaro l'assenza dei moduli invece
  // di far esplodere TypeError criptici sparsi. Non lancia.
  (function () {
    const req = ['save', 'economy', 'prestige', 'events', 'format', 'theme',
      'toast', 'rules', 'i18n', 'assets', 'workers', 'loop', 'migrations', 'state'];
    const missing = !w.EspoV3 ? ['(nessun modulo)'] : req.filter((k: string) => !w.EspoV3[k]);
    if (missing.length) {
      console.error('[EspoV3] build V3 mancante o incompleta — moduli assenti: ' +
        missing.join(', ') + '. Il legacy non ha fallback: esegui `npm run build`.');
    }
  })();

  // Variabili Window Globali
  w.goldenBugChance = 0.001;
  w.goldenBugSpawnTime = 60000;
  w.goldenBugMult = new w.Decimal(1);
  w.gameFlags = {};
  w.costScalingBase = 1.22;
  w.costScalingReduction = 0;
  w.prestigeSynergyFactor = new w.Decimal(0);
  w.clickGlobalMult = new w.Decimal(1);

  // Inizializza lo stato subito dopo aver caricato questo modulo
  store.gameState = getInitialGameState();
}

// === shim outbound (TEMPORANEI, rimossi a fine migrazione) ===
Object.assign(window as any, { getInitialGameState, resetGameToDefault });
export {};
