// --------- 1. DATI E STATO DEL GIOCO ---------

// Variabili Globali
let cookiesPerSecond = 0;
let prestigeBonus = 1;
let clickCPSBonus = 1;
let isBluescreenActive = false;
let bluescreenMultiplier = 1;
let goldenBugChance = 0.001;
let goldenBugSpawnTime = 60000 + Math.random() * 120000;
let crunchTimeMultiplier = 1;
let crunchTimeEndTime = 0;
let crunchTimeCooldownEnd = 0;
var clickHistory = [];
let achievementsBPSBonus = 0;

function isChristmasSeason() {
    const now = new Date();
    const month = now.getMonth(); // 0 = Gennaio, 11 = Dicembre
    const day = now.getDate();

    // È Dicembre (Mese 11) OPPURE è Gennaio (Mese 0) fino al giorno 8
    if (month === 11) return true;
    if (month === 0 && day <= 8) return true;

    return false;
}

// Calcoliamo lo stato attuale una volta all'avvio
const IS_XMAS_TIME = isChristmasSeason();

function getInitialGameState() {
    return {
        version: {
            major: window.GAME_VERSION.major,
            minor: window.GAME_VERSION.minor,
            stage: window.GAME_VERSION.stage
        },
        score: 0,
        baseClickValue: 1,
        totalClicks: 0,
        totalScore: 0,
        totalOfflineScore: 0,
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

        skins: {
            current: 'default',
            unlocked: ['default']
        },

        user: {
            username: 'Giocatore',
            masterVolume: 0.8,
            sfxVolume: 1.0,
            musicVolume: 0.5,

            // --- MODIFICA QUI I VALORI DI DEFAULT (0.0 a 1.0) ---
            audioCustom: {
                // Suoni SFX
                'sound-click': 0.4,
                'sound-buy': 0.4,
                'sound-achievement': 0.4,
                'sound-error': 0.5,
                'sound-golden': 0.6,
                'sound-prestige': 0.6,
                'sound-hover': 0.2,

                // Loop e Ambienti
                'sound-bluescreen': 0.3,
                'sound-fire': 0.5,
                'sound-snowball': 0.2,
                'sound-merry': 0.5,
                'sound-bg-music': 0.05,

                // Video (Default 50%)
                'video-rick': 0.5,
                'video-ricardo': 0.5
            }
        },
        filterSettings: {
            globalFilter: 'available'
        },

        teams: {
            assistenteQa: {
                count: 0
            },
            jiraTicket: {
                count: 0
            },
            teamQa: {
                count: 0
            },
            automazioneTest: {
                count: 0
            },
            metodologiaAgile: {
                count: 0
            },
            aiDebugger: {
                count: 0
            },
            quantumServer: {
                count: 0
            },
            reteNeuraleGalattica: {
                count: 0
            },
            debugTemporale: { count: 0 }
        },
        clickUpgrades: {
            caffeForte: {
                purchased: false
            },
            tastieraErgonomica: {
                purchased: false
            },
            mouseGaming: {
                purchased: false
            },
            manoBionica: {
                purchased: false
            },
            ergonomiaEstrema: {
                purchased: false
            },
            hacking: {
                purchased: false
            },
            doppioClick: {
                purchased: false
            },
            aiClick: {
                purchased: false
            },
            clickAutomatico: {
                purchased: false
            },
            clickDivino: {
                purchased: false
            }
        },
        prestigeUpgrades: {
            sinergia: {
                count: 0
            },
            paracadute: {
                count: 0
            },
            serverAlwaysOn: {
                count: 0
            },
            contrattazione: {
                count: 0
            },
            bugBounty: {
                count: 0
            },
            eredita: {
                count: 0
            },
            ticketPremium: {
                purchased: false
            },
            crunchTime: {
                purchased: false
            },
            outsourcing: {
                count: 0
            },
            accelerazione: {
                purchased: false
            }
        },
        buildingEnhancements: {
            caffeDoppio: {
                purchased: false
            },
            caffeTriplo: {
                purchased: false
            },
            scrivanieErgonomiche: {
                purchased: false
            },
            formazioneAvanzata: {
                purchased: false
            },
            managerJunior: {
                purchased: false
            },
            jiraAI: {
                purchased: false
            },
            jiraCloud: {
                purchased: false
            },
            jiraDataCenter: {
                purchased: false
            },
            jiraPremium: {
                purchased: false
            },
            jiraSelfHealing: {
                purchased: false
            },
            scrum: {
                purchased: false
            },
            teamLeader: {
                purchased: false
            },
            certificazioneISTQB: {
                purchased: false
            },
            bonusProduttivita: {
                purchased: false
            },
            teamGlobale: {
                purchased: false
            },
            selenium: {
                purchased: false
            },
            cucumber: {
                purchased: false
            },
            ciCd: {
                purchased: false
            },
            docker: {
                purchased: false
            },
            kubernetes: {
                purchased: false
            },
            kanban: {
                purchased: false
            },
            safe: {
                purchased: false
            },
            productOwner: {
                purchased: false
            },
            releaseTrain: {
                purchased: false
            },
            devOps: {
                purchased: false
            },
            deepLearning: {
                purchased: false
            },
            machineLearning: {
                purchased: false
            },
            retiNeurali: {
                purchased: false
            },
            quantumComputing: {
                purchased: false
            },
            skynet: {
                purchased: false
            }
        },
        achievements: {}
    };
}

let gameState = getInitialGameState();

function resetGameToDefault() {
    const freshState = getInitialGameState();
    Object.assign(gameState, freshState);

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

    skins: {
        default: {
            name: "Classico",
            desc: "L'originale inconfondibile.",
            img: "espo.webp",
            imgClick: "espo-click.webp",
            rarity: "common",
            clickEffect: "normal"
        },

        // UNLOCKABLE SKINS (Achievement Based)
        christmas: {
            name: "Espo Natale",
            desc: "Oh Oh Oh! Risolviamo questi bug sotto l'albero.",
            img: "esponatale.webp",
            imgClick: "esponatale-click.webp",
            rarity: "christmas",
            unlockHint: "Riscatta l'obiettivo 'Buon Natale'!",
            clickEffect: "snow",
            cost: IS_XMAS_TIME ? undefined : 20,
            unlockHint: IS_XMAS_TIME ? "Riscatta l'obiettivo 'Buon Natale'!" : "Disponibile nello Shop per 5 Token."
        },
        gladiator: {
            name: "Esporator",
            desc: "Al mio segnale, scatenate i click.",
            img: "esporator.webp",
            imgClick: "esporator-click.webp",
            rarity: "rare",
            unlockHint: "Raggiungi 2.000 click manuali.",
            clickEffect: "fire"
        },
        geisha: {
            name: "Esponese",
            desc: "Eleganza orientale.",
            img: "esponese.webp",
            imgClick: "esponese-click.webp",
            rarity: "rare",
            unlockHint: "Gioca per 4 ore totali.",
        },
        unicorn: {
            name: "Espocorno",
            desc: "Magia pura nel codice.",
            img: "espocorno.webp",
            imgClick: "espocorno-click.webp",
            rarity: "rare",
            unlockHint: "Sblocca l'obiettivo 'Full Stack Agency'",
            clickEffect: "rainbow"
        },

        // PREMIUM SKINS (Token Based - NO Unlock Hint, solo Costo)

        king: {
            name: "Espo of Empires",
            desc: "Il Re dei Bug.",
            img: "espofempires.webp",
            imgClick: "espofempires-click.webp",
            rarity: "epic",
            cost: 10,
            clickEffect: "gold"
        },
        waifu: {
            name: "Espowaifu",
            desc: "Best girl.",
            img: "espowaifu.webp",
            imgClick: "espowaifu-click.webp",
            rarity: "epic",
            cost: 15,
            clickEffect: "flowers"
        }, // Rimosso unlockHint

        jesus: {
            name: "Gespo",
            desc: "Il salvatore del database.",
            img: "gespo.webp",
            imgClick: "gespo-click.webp",
            rarity: "epic",
            unlockHint: "Sblocca l'obiettivo 'Divinità del Mouse'",
            clickEffect: "divine"
        },

        // LEGENDARY SKINS (Hardcore Grind)
        rick: {
            name: "Rick Espley",
            desc: "Never gonna give you up.",
            img: "rick-espley.webp",
            imgClick: "rick-espley-click.webp",
            rarity: "legendary",
            unlockHint: "Raggiungi 10.000 click manuali.",
            clickEffect: "hearts"
        },
        ricardo: {
            name: "Ricardo Milespo",
            desc: "Non c'è bug che tenga.",
            img: "ricardo-milespo.webp",
            imgClick: "ricardo-milespo-click.webp",
            rarity: "legendary",
            unlockHint: "Sblocca l'obiettivo 'White Hat'",
            clickEffect: "fire"
        },
        dictator: {
            name: "Adolf Espler",
            desc: "Ordine e disciplina.",
            img: "adolf-espler.webp",
            imgClick: "adolf-espler-click.webp",
            rarity: "legendary",
            unlockHint: "Raggiungi 20.000 click manuali.",
            clickEffect: "error"
        }
    },

    teams: {
        assistenteQa: {
            name: 'Assistente QA',
            baseCost: 15,
            cpsPerUnit: 0.1
        },
        jiraTicket: {
            name: 'Jira Ticket',
            baseCost: 120,
            cpsPerUnit: 1
        },
        teamQa: {
            name: 'Team QA',
            baseCost: 1500,
            cpsPerUnit: 8
        },
        automazioneTest: {
            name: 'Automazione Test',
            baseCost: 15000,
            cpsPerUnit: 47
        },
        metodologiaAgile: {
            name: 'Metodologia Agile',
            baseCost: 200000,
            cpsPerUnit: 260
        },
        aiDebugger: {
            name: 'AI Debugger',
            baseCost: 3500000,
            cpsPerUnit: 1400
        },
        quantumServer: {
            name: 'Quantum Server',
            baseCost: 55000000,
            cpsPerUnit: 7800
        },
        reteNeuraleGalattica: {
            name: 'Rete Galattica',
            baseCost: 850000000,
            cpsPerUnit: 44000
        },
        debugTemporale: {
            name: 'Debug Temporale',
            baseCost: 15000000000,
            cpsPerUnit: 260000
        }
    },

    clickUpgrades: {
        caffeForte: {
            name: 'Caffè Forte',
            desc: 'Aggiunge +1 al valore di ogni click.',
            cost: 100,
            clickIncrease: 1,
            requiredClicks: 10
        },
        tastieraErgonomica: {
            name: 'Tastiera Ergonomica',
            desc: 'Aggiunge +5 al valore di ogni click.',
            cost: 500,
            clickIncrease: 5,
            requiredClicks: 100
        },
        mouseGaming: {
            name: 'Mouse Gaming',
            desc: 'Aggiunge +10 al valore di ogni click.',
            cost: 2000,
            clickIncrease: 10,
            requiredClicks: 300
        },
        ergonomiaEstrema: {
            name: 'Ergonomia Estrema',
            desc: 'Aggiunge +50 al valore di ogni click.',
            cost: 10000,
            clickIncrease: 50,
            requiredClicks: 1000
        },
        doppioClick: {
            name: 'Doppio Click',
            desc: 'Raddoppia il valore base dei tuoi click.',
            cost: 25000,
            clickIncrease: 0,
            requiredClicks: 1500
        },
        manoBionica: {
            name: 'Mano Bionica',
            desc: 'Ogni click guadagna anche l\'1% dei tuoi BPS.',
            cost: 50000,
            clickIncrease: 0,
            requiredClicks: 2500
        },
        hacking: {
            name: 'Hacking Etico',
            desc: 'Raddoppia la probabilità di trovare Ticket Critici.',
            cost: 100000,
            clickIncrease: 0,
            requiredClicks: 5000
        },
        aiClick: {
            name: 'Intelligenza Artificiale',
            desc: 'Aggiunge +500 al valore di ogni click.',
            cost: 500000,
            clickIncrease: 500,
            requiredClicks: 7500
        },
        clickAutomatico: {
            name: 'Click Automatico',
            desc: 'Aggiunge BPS pari al numero di Assistenti QA.',
            cost: 250000,
            clickIncrease: 0,
            requiredClicks: 10000
        },
        clickDivino: {
            name: 'Click Divino',
            desc: 'La Mano Bionica ora guadagna il 2% dei BPS.',
            cost: 1000000,
            clickIncrease: 0,
            requiredClicks: 50000
        }
    },

    achievements: {
        primoClick: {
            name: 'Hello World!',
            desc: 'Effettua il tuo primo click manuale.',
            flavor: 'Il primo bug è sempre il più facile.',
            type: 'click',
            target: 1,
            isSecret: false,
            reward: null,
            condition: () => gameState.totalClicks >= 1
        },

        primoTeam: {
            name: 'Inception',
            desc: 'Possiedi 10 Assistenti QA.',
            type: 'building',
            buildingId: 'assistenteQa',
            target: 10,
            isSecret: false,
            reward: { type: 'bugs', value: 5000 },
            condition: () => gameState.teams.assistenteQa.count >= 10
        },

        jiraWarrior: {
            name: 'Ticketing System',
            desc: 'Gestisci 25 Jira Ticket.',
            type: 'building',
            buildingId: 'jiraTicket',
            target: 25,
            isSecret: false,
            reward: { type: 'bugs', value: 2000 },
            condition: () => gameState.teams.jiraTicket.count >= 25
        },

        // MODIFICATO: 10k Click per Rick Roll
        clickMaster: {
            name: 'Rick Roll Patch',
            desc: 'Raggiungi 10.000 click manuali.',
            type: 'click',
            target: 10000,
            isSecret: false,
            reward: { type: 'skin', id: 'rick' },
            condition: () => gameState.totalClicks >= 10000
        },

        codeMonkey: {
            name: 'Code Monkey',
            desc: 'Accumula 50.000 bug totali.',
            type: 'score',
            target: 50000,
            isSecret: false,
            reward: { type: 'bugs', value: 10000 },
            condition: () => gameState.totalScore >= 50000
        },

        automationFirst: {
            name: 'Automation First',
            desc: 'Raggiungi 10 Team QA.',
            type: 'building',
            buildingId: 'teamQa',
            target: 10,
            isSecret: false,
            reward: { type: 'bugs', value: 15000 },
            condition: () => gameState.teams.teamQa.count >= 10
        },

        // MODIFICATO: 2k Click per Gladiator
        clickGod: {
            name: 'Hardcoded Solution',
            desc: 'Raggiungi 2.000 click manuali.',
            type: 'click',
            target: 2000,
            isSecret: false,
            reward: { type: 'skin', id: 'gladiator' },
            condition: () => gameState.totalClicks >= 2000
        },

        // NUOVO: 50k Click per Adolf (Dictator)
        clickDictator: {
            name: 'Dittatore del Mouse',
            desc: 'Raggiungi 20.000 click manuali.',
            type: 'click',
            target: 20000,
            isSecret: false,
            reward: { type: 'skin', id: 'dictator' },
            condition: () => gameState.totalClicks >= 20000
        },

        middleManagement: {
            name: 'Middle Management',
            desc: 'Assumi 100 Assistenti QA.',
            type: 'building',
            buildingId: 'assistenteQa',
            target: 100,
            isSecret: false,
            reward: { type: 'bugs', value: 50000 },
            condition: () => gameState.teams.assistenteQa.count >= 100
        },

        fullStack: {
            name: 'Full Stack Agency',
            desc: 'Possiedi almeno 1 unità di ogni Team.',
            type: 'custom',
            target: 1,
            isSecret: false,
            reward: { type: 'skin', id: 'unicorn' },
            condition: () => { for (const key in gameState.teams) { if (gameState.teams[key].count === 0) return false; } return true; }
        },

        // MODIFICATO: Tech Lead ora da 5 Token invece della skin King (che è a pagamento)
        milionario: {
            name: 'Tech Lead',
            desc: 'Accumula 10 Milioni di bug.',
            type: 'score',
            target: 10000000,
            isSecret: false,
            reward: { type: 'prestige', value: 5 },
            condition: () => gameState.totalScore >= 10000000
        },

        geishaUnlock: {
            name: 'Zen Master',
            desc: 'Gioca per 4 ore totali.',
            type: 'time',
            target: 14400,
            isSecret: false,
            reward: { type: 'skin', id: 'geisha' },
            condition: () => gameState.totalPlayTime >= 14400
        },

        miliardario: {
            name: 'System Architect',
            desc: 'Accumula 1 Miliardo di bug.',
            type: 'score',
            target: 1000000000,
            isSecret: false,
            reward: { type: 'prestige', value: 10 },
            condition: () => gameState.totalScore >= 1000000000
        },

        // 404 ora da solo Bug, non più la skin leggendaria
        errore404: {
            name: 'Page Not Found',
            desc: 'Incontra il Blue Screen of Death.',
            type: 'custom',
            target: 1,
            isSecret: false,
            reward: { type: 'bugs', value: 500000 },
            condition: () => gameState.lastBluescreenTimestamp > 0
        },

        hacker: {
            name: 'White Hat',
            desc: 'Acquista il potenziamento Hacking Etico.',
            type: 'custom',
            target: 1,
            isSecret: false,
            reward: { type: 'skin', id: 'ricardo' },
            condition: () => gameState.clickUpgrades.hacking && gameState.clickUpgrades.hacking.purchased
        },

        // MODIFICATO: AI Supremacy ora da 5 Token invece della skin Waifu (che è a pagamento)
        waifuUnlock: {
            name: 'AI Supremacy',
            desc: 'Possiedi 100 AI Debugger.',
            type: 'building',
            buildingId: 'aiDebugger',
            target: 100,
            isSecret: false,
            reward: { type: 'prestige', value: 5 },
            condition: () => gameState.teams.aiDebugger.count >= 100
        },
        divinitaMouse: {
            name: 'Divinità del Mouse',
            desc: 'Acquista il potenziamento "Click Divino".',
            type: 'custom',
            target: 1,
            isSecret: false,
            reward: { type: 'skin', id: 'jesus' },
            condition: () => gameState.clickUpgrades.clickDivino && gameState.clickUpgrades.clickDivino.purchased
        },
        natale: {
            name: 'Buon Natale',
            desc: 'Un regalo speciale per te!',
            flavor: 'A Natale siamo tutti più buoni (tranne i bug).',
            type: 'custom',
            target: 1,
            isSecret: false,
            reward: { type: 'skin', id: 'christmas' },
            // Condizione sempre vera per renderlo riscattabile subito
            condition: () => IS_XMAS_TIME
        }
    },

    prestigeUpgrades: {
        sinergia: {
            name: 'Sinergia Manageriale',
            desc: 'Ogni punto promozione vale +0.1% in più (Cumulativo).',
            baseCost: 5,
            bonusPerLevel: 0.001,
            isCounted: true
        },
        paracadute: {
            name: 'Paracadute d\'Oro',
            desc: 'Inizi la run con +2.000 Bug per livello.',
            baseCost: 25,
            isCounted: true,
            bonusPerLevel: 2000
        },
        serverAlwaysOn: {
            name: 'Server Always-On',
            desc: 'Aumenta il guadagno offline dal 30% al 100% (+10%/liv).',
            baseCost: 50,
            isCounted: true,
            maxLevel: 7
        },
        contrattazione: {
            name: 'Contrattazione',
            desc: 'Riduce l\'aumento dei costi dei Teams (Scaling).',
            baseCost: 500,
            isCounted: true,
            maxLevel: 10
        },
        bugBounty: {
            name: 'Bug Bounty',
            desc: 'I Ticket Critici (Golden Bug) valgono il +20% per livello.',
            baseCost: 75,
            isCounted: true
        },
        eredita: {
            name: 'Eredità Strutturale',
            desc: 'Mantieni 1 "Assistente QA" per livello dopo il reset.',
            baseCost: 100,
            isCounted: true
        },
        ticketPremium: {
            name: 'Ticket Premium',
            desc: 'I Ticket Critici appaiono 2 volte più spesso.',
            baseCost: 25,
            isCounted: false
        },
        crunchTime: {
            name: 'Crunch Time',
            desc: 'Abilità Attiva: BPS x3 per 30s (Cooldown 5m).',
            baseCost: 200,
            isCounted: false
        }
    },

    buildingEnhancements: {
        caffeDoppio: {
            name: 'Caffè Doppio',
            desc: 'Assistenti QA x2 BPS.',
            targetTeam: 'assistenteQa',
            cost: 150,
            multiplier: 2,
            requiredCount: 1
        },
        caffeTriplo: {
            name: 'Caffè Triplo',
            desc: 'Assistenti QA x2 BPS.',
            targetTeam: 'assistenteQa',
            cost: 750,
            multiplier: 2,
            requiredCount: 10
        },
        scrivanieErgonomiche: {
            name: 'Scrivanie Ergonomiche',
            desc: 'Assistenti QA x3 BPS.',
            targetTeam: 'assistenteQa',
            cost: 5000,
            multiplier: 3,
            requiredCount: 25
        },
        formazioneAvanzata: {
            name: 'Formazione Avanzata',
            desc: 'Assistenti QA x3 BPS.',
            targetTeam: 'assistenteQa',
            cost: 25000,
            multiplier: 3,
            requiredCount: 50
        },
        managerJunior: {
            name: 'Manager Junior',
            desc: 'Assistenti QA x4 BPS.',
            targetTeam: 'assistenteQa',
            cost: 100000,
            multiplier: 4,
            requiredCount: 100
        },
        jiraAI: {
            name: 'Jira AI',
            desc: 'Jira Ticket x2 BPS.',
            targetTeam: 'jiraTicket',
            cost: 1000,
            multiplier: 2,
            requiredCount: 1
        },
        jiraCloud: {
            name: 'Jira Cloud',
            desc: 'Jira Ticket x2 BPS.',
            targetTeam: 'jiraTicket',
            cost: 5000,
            multiplier: 2,
            requiredCount: 10
        },
        jiraDataCenter: {
            name: 'Jira Data Center',
            desc: 'Jira Ticket x3 BPS.',
            targetTeam: 'jiraTicket',
            cost: 40000,
            multiplier: 3,
            requiredCount: 25
        },
        jiraPremium: {
            name: 'Jira Premium',
            desc: 'Jira Ticket x3 BPS.',
            targetTeam: 'jiraTicket',
            cost: 200000,
            multiplier: 3,
            requiredCount: 50
        },
        jiraSelfHealing: {
            name: 'Jira Self-Healing',
            desc: 'Jira Ticket x4 BPS.',
            targetTeam: 'jiraTicket',
            cost: 1000000,
            multiplier: 4,
            requiredCount: 100
        },
        scrum: {
            name: 'Metodologia Scrum',
            desc: 'Team QA x2 BPS.',
            targetTeam: 'teamQa',
            cost: 11000,
            multiplier: 2,
            requiredCount: 1
        },
        teamLeader: {
            name: 'Team Leader',
            desc: 'Team QA x2 BPS.',
            targetTeam: 'teamQa',
            cost: 55000,
            multiplier: 2,
            requiredCount: 10
        },
        certificazioneISTQB: {
            name: 'Certificazione ISTQB',
            desc: 'Team QA x3 BPS.',
            targetTeam: 'teamQa',
            cost: 440000,
            multiplier: 3,
            requiredCount: 25
        },
        bonusProduttivita: {
            name: 'Bonus Produttività',
            desc: 'Team QA x3 BPS.',
            targetTeam: 'teamQa',
            cost: 2200000,
            multiplier: 3,
            requiredCount: 50
        },
        teamGlobale: {
            name: 'Team Globale 24/7',
            desc: 'Team QA x4 BPS.',
            targetTeam: 'teamQa',
            cost: 11000000,
            multiplier: 4,
            requiredCount: 100
        },
        selenium: {
            name: 'Framework Selenium',
            desc: 'Automazione x2 BPS.',
            targetTeam: 'automazioneTest',
            cost: 120000,
            multiplier: 2,
            requiredCount: 1
        },
        cucumber: {
            name: 'Cucumber (BDD)',
            desc: 'Automazione x2 BPS.',
            targetTeam: 'automazioneTest',
            cost: 600000,
            multiplier: 2,
            requiredCount: 10
        },
        ciCd: {
            name: 'Pipeline CI/CD',
            desc: 'Automazione x3 BPS.',
            targetTeam: 'automazioneTest',
            cost: 4800000,
            multiplier: 3,
            requiredCount: 25
        },
        docker: {
            name: 'Container Docker',
            desc: 'Automazione x3 BPS.',
            targetTeam: 'automazioneTest',
            cost: 24000000,
            multiplier: 3,
            requiredCount: 50
        },
        kubernetes: {
            name: 'Orchestrazione Kubernetes',
            desc: 'Automazione x4 BPS.',
            targetTeam: 'automazioneTest',
            cost: 120000000,
            multiplier: 4,
            requiredCount: 100
        },
        kanban: {
            name: 'Board Kanban',
            desc: 'Metodologia Agile x2 BPS.',
            targetTeam: 'metodologiaAgile',
            cost: 1300000,
            multiplier: 2,
            requiredCount: 1
        },
        safe: {
            name: 'Framework SAFe',
            desc: 'Metodologia Agile x2 BPS.',
            targetTeam: 'metodologiaAgile',
            cost: 6500000,
            multiplier: 2,
            requiredCount: 10
        },
        productOwner: {
            name: 'Product Owner Dedicato',
            desc: 'Metodologia Agile x3 BPS.',
            targetTeam: 'metodologiaAgile',
            cost: 52000000,
            multiplier: 3,
            requiredCount: 25
        },
        releaseTrain: {
            name: 'Release Train',
            desc: 'Metodologia Agile x3 BPS.',
            targetTeam: 'metodologiaAgile',
            cost: 260000000,
            multiplier: 3,
            requiredCount: 50
        },
        devOps: {
            name: 'Cultura DevOps',
            desc: 'Metodologia Agile x4 BPS.',
            targetTeam: 'metodologiaAgile',
            cost: 1300000000,
            multiplier: 4,
            requiredCount: 100
        },
        deepLearning: {
            name: 'Deep Learning',
            desc: 'AI Debugger x2 BPS.',
            targetTeam: 'aiDebugger',
            cost: 14000000,
            multiplier: 2,
            requiredCount: 1
        },
        machineLearning: {
            name: 'Machine Learning',
            desc: 'AI Debugger x2 BPS.',
            targetTeam: 'aiDebugger',
            cost: 70000000,
            multiplier: 2,
            requiredCount: 10
        },
        retiNeurali: {
            name: 'Reti Neurali',
            desc: 'AI Debugger x3 BPS.',
            targetTeam: 'aiDebugger',
            cost: 560000000,
            multiplier: 3,
            requiredCount: 25
        },
        quantumComputing: {
            name: 'Quantum Computing',
            desc: 'AI Debugger x3 BPS.',
            targetTeam: 'aiDebugger',
            cost: 2800000000,
            multiplier: 3,
            requiredCount: 50
        },
        skynet: {
            name: 'Skynet',
            desc: 'AI Debugger x4 BPS.',
            targetTeam: 'aiDebugger',
            cost: 14000000000,
            multiplier: 4,
            requiredCount: 100
        }
    }
};