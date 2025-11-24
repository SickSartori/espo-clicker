// --------- 1. DATI E STATO DEL GIOCO ---------

function getInitialGameState() {
    return {
        score: 0,
        baseClickValue: 1,
        totalClicks: 0,
        totalScore: 0,
        prestigePoints: 0,
        lifetimePrestigePoints: 0,
        totalResets: 0,
        totalGoldenBugsClicked: 0,
        totalPlayTime: 0,
        lifetimeScore: 0,
        lastSaveTimestamp: Date.now(),
        lastBluescreenTimestamp: 0,
        crunchTimeEndTime: 0,
        crunchTimeCooldownEnd: 0,

        // --- GESTIONE SKIN (Solo Stato) ---
        skins: {
            current: 'default',
            unlocked: ['default']
        },

        user: {
            username: 'Giocatore',
            masterVolume: 1.0
        },
        filterSettings: {
            globalFilter: 'available'
        },

        teams: {
            assistenteQa: { count: 0 },
            jiraTicket: { count: 0 },
            teamQa: { count: 0 },
            automazioneTest: { count: 0 },
            metodologiaAgile: { count: 0 },
            aiDebugger: { count: 0 },
            quantumServer: { count: 0 },
            reteNeuraleGalattica: { count: 0 },
            debugTemporale: { count: 0 }
        },
        clickUpgrades: {
            caffeForte: { purchased: false },
            tastieraErgonomica: { purchased: false },
            mouseGaming: { purchased: false },
            manoBionica: { purchased: false },
            ergonomiaEstrema: { purchased: false },
            hacking: { purchased: false },
            doppioClick: { purchased: false },
            aiClick: { purchased: false },
            clickAutomatico: { purchased: false },
            clickDivino: { purchased: false }
        },
        prestigeUpgrades: {
            sinergia: { count: 0 },
            accelerazione: { purchased: false },
            ticketPremium: { purchased: false },
            outsourcing: { count: 0 },
            paracadute: { purchased: false },
            crunchTime: { purchased: false }
        },
        buildingEnhancements: {
            caffeDoppio: { purchased: false }, caffeTriplo: { purchased: false },
            scrivanieErgonomiche: { purchased: false }, formazioneAvanzata: { purchased: false },
            managerJunior: { purchased: false }, jiraAI: { purchased: false },
            jiraCloud: { purchased: false }, jiraDataCenter: { purchased: false },
            jiraPremium: { purchased: false }, jiraSelfHealing: { purchased: false },
            scrum: { purchased: false }, teamLeader: { purchased: false },
            certificazioneISTQB: { purchased: false }, bonusProduttivita: { purchased: false },
            teamGlobale: { purchased: false }, selenium: { purchased: false },
            cucumber: { purchased: false }, ciCd: { purchased: false },
            docker: { purchased: false }, kubernetes: { purchased: false },
            kanban: { purchased: false }, safe: { purchased: false },
            productOwner: { purchased: false }, releaseTrain: { purchased: false },
            devOps: { purchased: false }, deepLearning: { purchased: false },
            machineLearning: { purchased: false }, retiNeurali: { purchased: false },
            quantumComputing: { purchased: false }, skynet: { purchased: false }
        },
        // Inizializziamo achievements vuoti, verranno riempiti dalla logica di caricamento
        achievements: {}
    };
}

let gameState = getInitialGameState();

function resetGameToDefault() {
    const freshState = getInitialGameState();
    Object.assign(gameState, freshState);

    // Deep copy per oggetti annidati
    gameState.teams = JSON.parse(JSON.stringify(freshState.teams));
    gameState.clickUpgrades = JSON.parse(JSON.stringify(freshState.clickUpgrades));
    gameState.prestigeUpgrades = JSON.parse(JSON.stringify(freshState.prestigeUpgrades));
    gameState.buildingEnhancements = JSON.parse(JSON.stringify(freshState.buildingEnhancements));
    gameState.achievements = {};
    gameState.skins = JSON.parse(JSON.stringify(freshState.skins));
    gameState.user = JSON.parse(JSON.stringify(freshState.user));

    cookiesPerSecond = 0;
    prestigeBonus = 1;
    clickCPSBonus = 1;
    clickHistory = [];
}

const gameData = {
    PRESTIGE_THRESHOLD: 50000000,

    // --- DEFINIZIONE SKIN (Immagini) ---
    skins: {
        // Base
        default: {
            name: "Classico",
            desc: "L'originale inconfondibile.",
            img: "espo.png",
            imgClick: "espo-click.png"
        },
        // Meme & Fun
        ricardo: {
            name: "Flexpo",
            desc: "Non c'è bug che tenga.",
            img: "ricardo-milespo.png",
            imgClick: "ricardo-milespo-click.png"
        },
        rick: {
            name: "Rick Espley",
            desc: "Never gonna give you up.",
            img: "rick-espley.png",
            imgClick: "rick-espley-click.png"
        },
        unicorn: {
            name: "Espocorno",
            desc: "Magia pura nel codice.",
            img: "espocorno.png",
            imgClick: "espocorno-click.png"
        },

        // Storici / Epici
        gladiator: {
            name: "Esporator",
            desc: "Al mio segnale, scatenate i click.",
            img: "esporator.png",
            imgClick: "esporator-click.png"
        },
        king: {
            name: "Espo of Empires",
            desc: "Il Re dei Bug.",
            img: "espofempires.png",
            imgClick: "espofempires-click.png"
        },
        geisha: {
            name: "Esponese",
            desc: "Eleganza orientale.",
            img: "esponese.png",
            imgClick: "esponese-click.png"
        },

        // Speciali
        jesus: {
            name: "Gespo",
            desc: "Il salvatore del database.",
            img: "gespo.png",
            imgClick: "gespo-click.png"
        },
        waifu: {
            name: "Espowaifu",
            desc: "Best girl.",
            img: "espowaifu.png",
            imgClick: "espowaifu-click.png"
        },
        dictator: {
            name: "Adolf Espler",
            desc: "Ordine e disciplina nel codice.",
            img: "adolf-espler.png",
            imgClick: "adolf-espler-click.png"
        }
    },

    teams: {
        assistenteQa: { name: 'Assistente QA', baseCost: 15, cpsPerUnit: 0.1 },
        jiraTicket: { name: 'Jira Ticket', baseCost: 120, cpsPerUnit: 1 },
        teamQa: { name: 'Team QA', baseCost: 1500, cpsPerUnit: 8 },
        automazioneTest: { name: 'Automazione Test', baseCost: 15000, cpsPerUnit: 47 },
        metodologiaAgile: { name: 'Metodologia Agile', baseCost: 200000, cpsPerUnit: 260 },
        aiDebugger: { name: 'AI Debugger', baseCost: 3500000, cpsPerUnit: 1400 },
        quantumServer: { name: 'Quantum Server', baseCost: 55000000, cpsPerUnit: 7800 },
        reteNeuraleGalattica: { name: 'Rete Galattica', baseCost: 850000000, cpsPerUnit: 44000 },
        debugTemporale: { name: 'Debug Temporale', baseCost: 15000000000, cpsPerUnit: 260000 }
    },

    clickUpgrades: {
        caffeForte: { name: 'Caffè Forte', desc: 'Aggiunge +1 al valore di ogni click.', cost: 100, clickIncrease: 1, requiredClicks: 10 },
        tastieraErgonomica: { name: 'Tastiera Ergonomica', desc: 'Aggiunge +5 al valore di ogni click.', cost: 500, clickIncrease: 5, requiredClicks: 100 },
        mouseGaming: { name: 'Mouse Gaming', desc: 'Aggiunge +10 al valore di ogni click.', cost: 2000, clickIncrease: 10, requiredClicks: 300 },
        ergonomiaEstrema: { name: 'Ergonomia Estrema', desc: 'Aggiunge +50 al valore di ogni click.', cost: 10000, clickIncrease: 50, requiredClicks: 1000 },
        doppioClick: { name: 'Doppio Click', desc: 'Raddoppia il valore base dei tuoi click.', cost: 25000, clickIncrease: 0, requiredClicks: 1500 },
        manoBionica: { name: 'Mano Bionica', desc: 'Ogni click guadagna anche l\'1% dei tuoi BPS.', cost: 50000, clickIncrease: 0, requiredClicks: 2500 },
        hacking: { name: 'Hacking Etico', desc: 'Raddoppia la probabilità di trovare Ticket Critici.', cost: 100000, clickIncrease: 0, requiredClicks: 5000 },
        aiClick: { name: 'Intelligenza Artificiale', desc: 'Aggiunge +500 al valore di ogni click.', cost: 500000, clickIncrease: 500, requiredClicks: 7500 },
        clickAutomatico: { name: 'Click Automatico', desc: 'Aggiunge BPS pari al numero di Assistenti QA.', cost: 250000, clickIncrease: 0, requiredClicks: 10000 },
        clickDivino: { name: 'Click Divino', desc: 'La Mano Bionica ora guadagna il 2% dei BPS.', cost: 1000000, clickIncrease: 0, requiredClicks: 50000 }
    },

    // --- OBIETTIVI CON PREMI SKIN ---
    achievements: {
        // --- CLICK ---
        primoClick: {
            name: 'Hello World!', desc: 'Effettua il tuo primo click manuale.', flavor: 'Tutto inizia da un singolo bit.',
            type: 'click', target: 1, isSecret: false, reward: null,
            condition: () => gameState.totalClicks >= 1
        },
        centoClick: {
            name: 'Dita Calde', desc: 'Raggiungi 100 click totali.',
            type: 'click', target: 100, isSecret: false,
            reward: { type: 'skin', id: 'rick' }, // Skin Rick Roll
            condition: () => gameState.totalClicks >= 100
        },
        clickMaster: {
            name: 'Tastiera Fumante', desc: 'Raggiungi 10.000 click totali.',
            type: 'click', target: 10000, isSecret: false,
            reward: { type: 'skin', id: 'gladiator' }, // Skin Gladiatore
            condition: () => gameState.totalClicks >= 10000
        },

        // --- PRODUZIONE & TEAMS ---
        primoTeam: {
            name: 'Startupper', desc: 'Possiedi 10 Assistenti QA.',
            type: 'building', buildingId: 'assistenteQa', target: 10, isSecret: false,
            reward: { type: 'multiplier', value: 1.1 },
            condition: () => gameState.teams.assistenteQa.count >= 10
        },
        middleManagement: {
            name: 'Middle Management', desc: 'Assumi 50 Assistenti QA.',
            type: 'building', buildingId: 'assistenteQa', target: 50, isSecret: false,
            reward: { type: 'skin', id: 'waifu' }, // Skin Waifu
            condition: () => gameState.teams.assistenteQa.count >= 50
        },
        fullStack: {
            name: 'Full Stack Agency', desc: 'Possiedi almeno 1 unità di ogni Team.',
            type: 'custom', target: 1, isSecret: false,
            reward: { type: 'skin', id: 'unicorn' }, // Skin Unicorno
            condition: () => {
                for (const key in gameState.teams) { if (gameState.teams[key].count === 0) return false; }
                return true;
            }
        },

        // --- SCORE ---
        milleBug: {
            name: 'Junior Dev', desc: 'Accumula 1.000 bug.', type: 'score', target: 1000, isSecret: false, reward: null,
            condition: () => gameState.totalScore >= 1000
        },
        milionario: {
            name: 'Tech Lead', desc: 'Accumula 1.000.000 di bug.', type: 'score', target: 1000000, isSecret: false,
            reward: { type: 'skin', id: 'king' }, // Skin Re
            condition: () => gameState.totalScore >= 1000000
        },
        miliardario: {
            name: 'Unicorno', desc: 'Accumula 1 Miliardo di bug.', type: 'score', target: 1000000000, isSecret: false,
            reward: { type: 'prestige', value: 10 },
            condition: () => gameState.totalScore >= 1000000000
        },

        // --- SPECIALI ---
        errore404: {
            name: 'Pagina Non Trovata', desc: '???', realDesc: 'Incontra il Blue Screen of Death.',
            type: 'custom', target: 1, isSecret: true,
            reward: { type: 'skin', id: 'dictator' }, // Skin Generale (Punizione)
            condition: () => gameState.lastBluescreenTimestamp > 0
        },
        hacker: {
            name: 'Hackerino', desc: '???', realDesc: 'Usa la Cheatboard.',
            type: 'custom', target: 1, isSecret: true,
            reward: { type: 'skin', id: 'ricardo' }, // Skin Ricardo (Flex)
            condition: () => false
        },
        clickGod: {
            name: 'Divinità del Mouse', desc: 'Raggiungi 100.000 click totali.',
            type: 'click', target: 100000, isSecret: false,
            reward: { type: 'skin', id: 'jesus' }, // Skin Gespo
            condition: () => gameState.totalClicks >= 100000
        },
        geishaUnlock: {
            name: 'Zen Master', desc: 'Gioca per 4 ore totali.',
            type: 'time', target: 14400, isSecret: false,
            reward: { type: 'skin', id: 'geisha' },
            condition: () => gameState.totalPlayTime >= 14400
        }
    },

    prestigeUpgrades: {
        sinergia: { name: 'Sinergia Manageriale', desc: 'Ogni punto promozione vale +0.1% in più (Cumulativo).', baseCost: 5, bonusPerLevel: 0.001, isCounted: true },
        accelerazione: { name: 'Accelerazione Iniziale', desc: 'Inizia ogni nuova run con 1 Assistente QA gratuito.', baseCost: 10, isCounted: false },
        ticketPremium: { name: 'Ticket Premium', desc: 'I Ticket Critici appaiono 2 volte più spesso.', baseCost: 25, isCounted: false },
        outsourcing: { name: 'Outsourcing Selvaggio', desc: 'Riduce il costo base dei Teams dell\'1% per livello.', baseCost: 50, isCounted: true, maxLevel: 10 },
        paracadute: { name: 'Paracadute d\'Oro', desc: 'Inizi con il 5% dei bug della run precedente.', baseCost: 100, isCounted: false },
        crunchTime: { name: 'Crunch Time', desc: 'Abilità Attiva: BPS x3 per 30s (Cooldown 5m).', baseCost: 200, isCounted: false }
    },
    buildingEnhancements: {
        caffeDoppio: { name: 'Caffè Doppio', desc: 'Assistenti QA x2 BPS.', targetTeam: 'assistenteQa', cost: 150, multiplier: 2, requiredCount: 1 },
        caffeTriplo: { name: 'Caffè Triplo', desc: 'Assistenti QA x2 BPS.', targetTeam: 'assistenteQa', cost: 750, multiplier: 2, requiredCount: 10 },
        scrivanieErgonomiche: { name: 'Scrivanie Ergonomiche', desc: 'Assistenti QA x3 BPS.', targetTeam: 'assistenteQa', cost: 5000, multiplier: 3, requiredCount: 25 },
        formazioneAvanzata: { name: 'Formazione Avanzata', desc: 'Assistenti QA x3 BPS.', targetTeam: 'assistenteQa', cost: 25000, multiplier: 3, requiredCount: 50 },
        managerJunior: { name: 'Manager Junior', desc: 'Assistenti QA x4 BPS.', targetTeam: 'assistenteQa', cost: 100000, multiplier: 4, requiredCount: 100 },
        jiraAI: { name: 'Jira AI', desc: 'Jira Ticket x2 BPS.', targetTeam: 'jiraTicket', cost: 1000, multiplier: 2, requiredCount: 1 },
        jiraCloud: { name: 'Jira Cloud', desc: 'Jira Ticket x2 BPS.', targetTeam: 'jiraTicket', cost: 5000, multiplier: 2, requiredCount: 10 },
        jiraDataCenter: { name: 'Jira Data Center', desc: 'Jira Ticket x3 BPS.', targetTeam: 'jiraTicket', cost: 40000, multiplier: 3, requiredCount: 25 },
        jiraPremium: { name: 'Jira Premium', desc: 'Jira Ticket x3 BPS.', targetTeam: 'jiraTicket', cost: 200000, multiplier: 3, requiredCount: 50 },
        jiraSelfHealing: { name: 'Jira Self-Healing', desc: 'Jira Ticket x4 BPS.', targetTeam: 'jiraTicket', cost: 1000000, multiplier: 4, requiredCount: 100 },
        scrum: { name: 'Metodologia Scrum', desc: 'Team QA x2 BPS.', targetTeam: 'teamQa', cost: 11000, multiplier: 2, requiredCount: 1 },
        teamLeader: { name: 'Team Leader', desc: 'Team QA x2 BPS.', targetTeam: 'teamQa', cost: 55000, multiplier: 2, requiredCount: 10 },
        certificazioneISTQB: { name: 'Certificazione ISTQB', desc: 'Team QA x3 BPS.', targetTeam: 'teamQa', cost: 440000, multiplier: 3, requiredCount: 25 },
        bonusProduttivita: { name: 'Bonus Produttività', desc: 'Team QA x3 BPS.', targetTeam: 'teamQa', cost: 2200000, multiplier: 3, requiredCount: 50 },
        teamGlobale: { name: 'Team Globale 24/7', desc: 'Team QA x4 BPS.', targetTeam: 'teamQa', cost: 11000000, multiplier: 4, requiredCount: 100 },
        selenium: { name: 'Framework Selenium', desc: 'Automazione x2 BPS.', targetTeam: 'automazioneTest', cost: 120000, multiplier: 2, requiredCount: 1 },
        cucumber: { name: 'Cucumber (BDD)', desc: 'Automazione x2 BPS.', targetTeam: 'automazioneTest', cost: 600000, multiplier: 2, requiredCount: 10 },
        ciCd: { name: 'Pipeline CI/CD', desc: 'Automazione x3 BPS.', targetTeam: 'automazioneTest', cost: 4800000, multiplier: 3, requiredCount: 25 },
        docker: { name: 'Container Docker', desc: 'Automazione x3 BPS.', targetTeam: 'automazioneTest', cost: 24000000, multiplier: 3, requiredCount: 50 },
        kubernetes: { name: 'Orchestrazione Kubernetes', desc: 'Automazione x4 BPS.', targetTeam: 'automazioneTest', cost: 120000000, multiplier: 4, requiredCount: 100 },
        kanban: { name: 'Board Kanban', desc: 'Metodologia Agile x2 BPS.', targetTeam: 'metodologiaAgile', cost: 1300000, multiplier: 2, requiredCount: 1 },
        safe: { name: 'Framework SAFe', desc: 'Metodologia Agile x2 BPS.', targetTeam: 'metodologiaAgile', cost: 6500000, multiplier: 2, requiredCount: 10 },
        productOwner: { name: 'Product Owner Dedicato', desc: 'Metodologia Agile x3 BPS.', targetTeam: 'metodologiaAgile', cost: 52000000, multiplier: 3, requiredCount: 25 },
        releaseTrain: { name: 'Release Train', desc: 'Metodologia Agile x3 BPS.', targetTeam: 'metodologiaAgile', cost: 260000000, multiplier: 3, requiredCount: 50 },
        devOps: { name: 'Cultura DevOps', desc: 'Metodologia Agile x4 BPS.', targetTeam: 'metodologiaAgile', cost: 1300000000, multiplier: 4, requiredCount: 100 },
        deepLearning: { name: 'Deep Learning', desc: 'AI Debugger x2 BPS.', targetTeam: 'aiDebugger', cost: 14000000, multiplier: 2, requiredCount: 1 },
        machineLearning: { name: 'Machine Learning', desc: 'AI Debugger x2 BPS.', targetTeam: 'aiDebugger', cost: 70000000, multiplier: 2, requiredCount: 10 },
        retiNeurali: { name: 'Reti Neurali', desc: 'AI Debugger x3 BPS.', targetTeam: 'aiDebugger', cost: 560000000, multiplier: 3, requiredCount: 25 },
        quantumComputing: { name: 'Quantum Computing', desc: 'AI Debugger x3 BPS.', targetTeam: 'aiDebugger', cost: 2800000000, multiplier: 3, requiredCount: 50 },
        skynet: { name: 'Skynet', desc: 'AI Debugger x4 BPS.', targetTeam: 'aiDebugger', cost: 14000000000, multiplier: 4, requiredCount: 100 }
    }
};

// Variabili calcolate (non salvate)
let cookiesPerSecond = 0;
let prestigeBonus = 0;
let clickCPSBonus = 1;
let isBluescreenActive = false;
let bluescreenMultiplier = 1;
let goldenBugChance = 0.001;
let goldenBugSpawnTime = 60000 + Math.random() * 120000;
let crunchTimeMultiplier = 1;
let crunchTimeEndTime = 0;
let crunchTimeCooldownEnd = 0;

var clickHistory = [];