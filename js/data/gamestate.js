// Guard di contratto (ex js/save-db.js, F8 → qui dal reorg C-thin): la build
// V3 è un requisito HARD. gamestate.js è ora il PRIMO file bundlato che
// dipende da EspoV3/gameData: segnala UNA volta e in chiaro l'assenza dei
// moduli invece di far esplodere TypeError criptici sparsi. Non lancia.
(function () {
  var req = ['save', 'economy', 'prestige', 'events', 'format', 'theme',
    'toast', 'rules', 'i18n', 'assets', 'workers', 'loop', 'migrations', 'state'];
  var missing = !window.EspoV3 ? ['(nessun modulo)'] : req.filter(function (k) { return !window.EspoV3[k]; });
  if (missing.length) {
    console.error('[EspoV3] build V3 mancante o incompleta — moduli assenti: ' +
      missing.join(', ') + '. Il legacy non ha fallback: esegui `npm run build`.');
  }
})();

// --- STATO GLOBALE CONDIVISO (reorg filone A, 2026-07-12) ---
// Le 11 variabili runtime (gameState, bps, prestigeBonus, clickCPSBonus,
// isBluescreenActive, bluescreenMultiplier, crunchTimeMultiplier,
// crunchTimeEndTime, crunchTimeCooldownEnd, clickHistory,
// achievementsBPSBonus) vivono in src/state/store.ts (EspoV3.state.store),
// esposte come ACCESSOR su window da src/state/interop.ts — installato dal
// modulo V3, che esegue PRIMA di questo bundle. Le assegnazioni bare qui e
// negli altri file (es. `gameState = getInitialGameState()`) passano dal
// setter → store. Qui restano le window.* legacy e la generazione stato
// (getInitialGameState/resetGameToDefault, accoppiate a gameData → filone B).

// Variabili Window Globali
window.goldenBugChance = 0.001;
window.goldenBugSpawnTime = 60000;
window.goldenBugMult = new Decimal(1);
window.gameFlags = {};
window.costScalingBase = 1.22;
window.costScalingReduction = 0;
window.prestigeSynergyFactor = new Decimal(0);
window.clickGlobalMult = new Decimal(1);

// --- FUNZIONE GENERAZIONE STATO ---
function getInitialGameState() {
    const state = {
        version: { major: window.GAME_VERSION.major, minor: window.GAME_VERSION.minor, stage: window.GAME_VERSION.stage },
        // Schema del SAVE (≠ version del GIOCO): consumato dal framework migrazioni
        // V3 (EspoV3.migrations, detectSchemaVersion). I save senza questo campo
        // sono trattati come schema 1 e migrati via gate legacy version.major.
        schemaVersion: 2,
        arcadeHighScores: { snake: 0, space: 0, superespo: 0, asteroids: 0 },
        score: new Decimal(0),
        baseClickValue: new Decimal(1),
        totalClicks: 0,
        totalScore: new Decimal(0),
        totalOfflineScore: new Decimal(0),
        prestigePoints: new Decimal(0),
        lifetimePrestigePoints: new Decimal(0),
        totalResets: 0,
        totalFormattazioni: 0,
        qBits: new Decimal(0),
        lifetimeQBits: new Decimal(0),
        totalGoldenBugsClicked: 0,
        longestCombo: 0,
        totalPlayTime: 0,
        lifetimeScore: new Decimal(0),
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
            masterVolume: 0.8,
            sfxVolume: 1.0,
            musicVolume: 0.5,
            audioCustom: {},
            bgMusicSelection: 'sound-bg-music-v3'
        }
    };

    // Popolamento dinamico basato sui dati caricati in window.gameData
    if (window.gameData.teams) {
        for (const key in window.gameData.teams) state.teams[key] = { count: 0 };
    }

    if (window.gameData.clickUpgrades) {
        for (const key in window.gameData.clickUpgrades) state.clickUpgrades[key] = { purchased: false };
    }

    if (window.gameData.buildingEnhancements) {
        for (const key in window.gameData.buildingEnhancements) state.buildingEnhancements[key] = { purchased: false };
    }

    if (window.gameData.prestigeUpgrades) {
        for (const key in window.gameData.prestigeUpgrades) {
            if (window.gameData.prestigeUpgrades[key].isCounted)
                state.prestigeUpgrades[key] = { count: 0 };
            else
                state.prestigeUpgrades[key] = { purchased: false };
        }
    }

    if (window.gameData.achievements) {
        for (const key in window.gameData.achievements) {
            state.achievements[key] = { unlocked: false, claimed: false };
        }
    }

    // Inizializzazione Audio Custom
    if (window.gameData.assets && window.gameData.assets.sounds) {
        const allAssets = { ...window.gameData.assets.sounds, ...window.gameData.assets.videos };
        for (const key in allAssets) {
            if (allAssets[key].defaultVol !== undefined)
                state.user.audioCustom[allAssets[key].id] = allAssets[key].defaultVol;
        }
    }
    if (window.gameData.superUpgrades) {
        for (const key in window.gameData.superUpgrades) {
            state.superUpgrades[key] = { purchased: false };
        }
    }
    
    return state;
}

// Inizializza lo stato subito dopo aver caricato questo file
gameState = getInitialGameState();

// --- FUNZIONE RESET ---
function resetGameToDefault() {
    const freshState = getInitialGameState();
    // Reset profondo dell'oggetto gameState esistente
    Object.assign(gameState, freshState);
    
    // Deep copy per oggetti annidati per evitare riferimenti condivisi
    gameState.teams = JSON.parse(JSON.stringify(freshState.teams));
    gameState.clickUpgrades = JSON.parse(JSON.stringify(freshState.clickUpgrades));
    gameState.prestigeUpgrades = JSON.parse(JSON.stringify(freshState.prestigeUpgrades));
    gameState.buildingEnhancements = JSON.parse(JSON.stringify(freshState.buildingEnhancements));
    gameState.achievements = JSON.parse(JSON.stringify(freshState.achievements));
    gameState.skins = JSON.parse(JSON.stringify(freshState.skins));
    gameState.user = JSON.parse(JSON.stringify(freshState.user));

    // Reset Variabili Runtime
    bps = new Decimal(0);
    prestigeBonus = new Decimal(1);
    clickCPSBonus = new Decimal(1);
    clickHistory = [];
    window.goldenBugChance = 0.001;
    window.goldenBugSpawnTime = 60000;
    window.goldenBugMult = new Decimal(1);
    window.gameFlags = {};
}