// --------- DATI E STATO DEL GIOCO ---------

// Variabili Globali
var bps = new Decimal(0);
var prestigeBonus = new Decimal(1);
var clickCPSBonus = new Decimal(1);
var isBluescreenActive = false;
var bluescreenMultiplier = new Decimal(1);
var crunchTimeMultiplier = new Decimal(1);
var crunchTimeEndTime = 0;
var crunchTimeCooldownEnd = 0;
var clickHistory = [];
var achievementsBPSBonus = new Decimal(0);

window.goldenBugChance = 0.001;
window.goldenBugSpawnTime = 60000;
window.goldenBugMult = new Decimal(1);
window.gameFlags = {};

window.costScalingBase = 1.20;
window.costScalingReduction = 0;
window.prestigeSynergyFactor = new Decimal(0);
window.clickGlobalMult = new Decimal(1);

function isChristmasSeason() {
    const now = new Date();
    const month = now.getMonth();
    const day = now.getDate();
    if (month === 11) return true;
    if (month === 0 && day <= 8) return true;
    return false;
}

const IS_XMAS_TIME = isChristmasSeason();

let gameState;

// --- DEFINIZIONE DEI DATI ---
const gameData = {
    PRESTIGE_THRESHOLD: new Decimal("50000000"),

    assets: {
        sounds: {
            'bg-music': {
                id: 'sound-bg-music',
                file: 'bg-music.mp3',
                name: 'Musica V1',
                type: 'music',
                category: 'ambiente',
                loop: true,
                defaultVol: 0.3
            },
            'bg-music-v2': {
                id: 'sound-bg-music-v2',
                file: 'bg-music-v2.mp3',
                name: 'Musica V2',
                type: 'music',
                category: 'ambiente',
                loop: true,
                defaultVol: 0.3
            },
            'bg-music-v3': {
                id: 'sound-bg-music-v3',
                file: 'bg-music-v3.mp3',
                name: 'Musica V3',
                type: 'music',
                category: 'ambiente',
                loop: true,
                defaultVol: 0.3
            },
            'snowball': {
                id: 'sound-snowball',
                file: 'nonsnowball.mp3',
                name: 'Natale',
                type: 'music',
                category: 'ambiente',
                loop: true,
                defaultVol: 0.2
            },
            'bluescreen': {
                id: 'sound-bluescreen',
                file: 'bluescreen.mp3',
                name: 'Loop 404',
                type: 'music',
                category: 'ambiente',
                loop: true,
                defaultVol: 0.3
            },
            'matrix': {
                id: 'sound-matrix',
                file: 'matrix.mp3',
                name: 'Matrix Theme',
                type: 'music',
                category: 'ambiente',
                loop: true,
                defaultVol: 0.4
            },
            'fury-theme': {
                id: 'sound-fury-music',
                file: 'fury-theme.mp3',
                name: 'Musica Fury',
                type: 'music',
                category: 'ambiente',
                loop: true,
                defaultVol: 0.2
            },
            'merry': {
                id: 'sound-merry',
                file: 'merry-christmas.mp3',
                name: 'Jingle Natale',
                type: 'sfx',
                category: 'eventi',
                defaultVol: 0.5
            },
            'golden': {
                id: 'sound-golden',
                file: 'golden.mp3',
                name: 'Golden Bug',
                type: 'sfx',
                category: 'eventi',
                defaultVol: 0.6
            },
            'click': {
                id: 'sound-click',
                file: 'click.mp3',
                name: 'Click',
                type: 'sfx',
                category: 'effetti',
                defaultVol: 0.4
            },
            'buy': {
                id: 'sound-buy',
                file: 'buy.mp3',
                name: 'Shop',
                type: 'sfx',
                category: 'effetti',
                defaultVol: 0.4
            },
            'achievement': {
                id: 'sound-achievement',
                file: 'achievement.mp3',
                name: 'Obiettivo',
                type: 'sfx',
                category: 'effetti',
                defaultVol: 0.4
            },
            'error': {
                id: 'sound-error',
                file: 'error.mp3',
                name: 'Errore',
                type: 'sfx',
                category: 'effetti',
                defaultVol: 0.5
            },
            'prestige': {
                id: 'sound-prestige',
                file: 'prestige.mp3',
                name: 'Prestigio',
                type: 'sfx',
                category: 'effetti',
                defaultVol: 0.6
            },
            'hover': {
                id: 'sound-hover',
                file: 'hover.mp3',
                name: 'Hover',
                type: 'sfx',
                category: 'effetti',
                defaultVol: 0.2
            },
            'bg-bit': {
                id: 'sound-bg-bit',
                file: 'bg-music-bit.mp3',
                name: '8-Bit World',
                type: 'music',
                category: 'ambiente',
                loop: true,
                defaultVol: 0.3
            },
            'space-shoot': {
                id: 'sound-space-shoot',
                file: 'arcade/assets/space-shoot.wav', // Percorso centralizzato .wav
                name: 'Space Shoot',
                type: 'sfx',
                category: 'effetti',
                defaultVol: 0.4
            },
            'space-boom': {
                id: 'sound-space-boom',
                file: 'arcade/assets/space-boom.wav', // Percorso centralizzato .wav
                name: 'Space Explosion',
                type: 'sfx',
                category: 'effetti',
                defaultVol: 0.5
            },
            'arcade-gameover': {
                id: 'sound-arcade-gameover',
                file: 'arcade/assets/game-over.mp3', // Condiviso .mp3
                name: 'Arcade Game Over',
                type: 'sfx',
                category: 'effetti',
                defaultVol: 0.6
            },
        },
        videos: {
            'rick-roll-video': {
                id: 'rick-roll-video',
                file: 'rick-espley-video.mp4',
                name: 'Video: Rick',
                category: 'eventi',
                defaultVol: 0.5
            },
            'ricardo-video': {
                id: 'ricardo-video',
                file: 'ricardo-milespo-video.mp4',
                name: 'Video: Ricardo',
                category: 'eventi',
                defaultVol: 0.5
            }
        }
    },

    skins: {
        default: {
            name: "Classico",
            desc: "L'originale inconfondibile.",
            img: "espo.webp",
            imgClick: "espo-click.webp",
            rarity: "common"
        },
        espobit: {
            name: "Espobit",
            desc: "Inserisci il gettone. 1UP!",
            img: "espobit.webp",
            imgClick: "espobit-click.webp",
            rarity: "common",
            cost: new Decimal(5),
            themeConfig: {
                bodyClass: 'theme-8bit',
                specialMusic: 'sound-bg-bit',
                goldenBugIcon: 'fa-gamepad',
                goldenBugColor: '#f1c40f' // Giallo classico (Gold Coin)
            }
        },
        christmas: {
            name: "Espo Natale",
            desc: "Risolviamo questi bug sotto l'albero.",
            img: "esponatale.webp",
            imgClick: "esponatale-click.webp",
            rarity: "christmas",
            unlockHint: IS_XMAS_TIME ? "Riscatta l'obiettivo 'Buon Natale'!" : "Disponibile nello Shop per 5 Token.",
            cost: IS_XMAS_TIME ? undefined : new Decimal(20),
            themeConfig: {
                hasSnow: true,
                specialMusic: 'sound-snowball',
                bodyClass: 'theme-christmas',
                goldenBugIcon: 'fa-gift',
                goldenBugColor: '#e74c3c' // Opzionale: Pacco rosso
            }
        },
        gladiator: {
            name: "Esporator",
            desc: "Al mio segnale, scatenate i click.",
            img: "esporator.webp",
            imgClick: "esporator-click.webp",
            rarity: "rare",
            unlockHint: "Raggiungi 2.000 click manuali."
        },
        geisha: {
            name: "Esponese",
            desc: "Eleganza orientale.",
            img: "esponese.webp",
            imgClick: "esponese-click.webp",
            rarity: "rare",
            unlockHint: "Gioca per 4 ore totali."
        },
        unicorn: {
            name: "Espocorno",
            desc: "Magia pura nel codice.",
            img: "espocorno.webp",
            imgClick: "espocorno-click.webp",
            rarity: "rare",
            unlockHint: "Sblocca l'obiettivo 'Full Stack Agency'"
        },
        esportia: {
            name: "Esportia",
            desc: "My Espo at Portia",
            img: "esportia.webp",
            imgClick: "esportia-click.webp",
            rarity: "rare",
            cost: new Decimal(10)
        },
        // --- EPICHE (Mid Game / Prestige) ---
        king: {
            name: "Espo of Empires",
            desc: "Il Re dei Bug.",
            img: "espofempires.webp",
            imgClick: "espofempires-click.webp",
            rarity: "epic",
            cost: new Decimal(20) // Richiede prestigio
        },
        waifu: {
            name: "Espowaifu",
            desc: "Best girl.",
            img: "espowaifu.webp",
            imgClick: "espowaifu-click.webp",
            rarity: "epic",
            cost: new Decimal(20) // Richiede prestigio avanzato
        },
        bob: {
            name: "EspòngeBob",
            desc: "Sono pronto, Promozione!",
            img: "esponge-bob.webp",
            imgClick: "esponge-bob-click.webp",
            rarity: "epic",
            cost: new Decimal(25) // Richiede prestigio avanzato
        },
        // --- LEGGENDARIE (Late Game - Difficili) ---
        rick: {
            name: "Rick Espley",
            desc: "Never gonna give you up!",
            img: "rick-espley.webp",
            imgClick: "rick-espley-click.webp",
            rarity: "legendary",
            unlockHint: "Raggiungi 25.000 click manuali."
        },
        ricardo: {
            name: "Ricardo Milespo",
            desc: "Non c'è bug che tenga.",
            img: "ricardo-milespo.webp",
            imgClick: "ricardo-milespo-click.webp",
            rarity: "legendary",
            unlockHint: "Sblocca l'obiettivo 'White Hat'"
        },
        dictator: {
            name: "Adolf Espler",
            desc: "Ordine e disciplina.",
            img: "adolf-espler.webp",
            imgClick: "adolf-espler-click.webp",
            rarity: "legendary",
            unlockHint: "Raggiungi 50.000 click manuali."
        },
        espory: {
            name: "Freddy Espory",
            desc: "eeeeeeeespo",
            img: "freddy-espory.webp",
            imgClick: "freddy-espory-click.webp",
            rarity: "legendary",
            cost: new Decimal(50)
        },
        // --- DIVINE ---
        jesus: {
            name: "Gespo",
            desc: "Il salvatore del database.",
            img: "gespo.webp",
            imgClick: "gespo-click.webp",
            rarity: "divine",
            unlockHint: "Sblocca l'obiettivo 'Divinità del Mouse'"
        }
    },

    teams: {
        assistenteQa: {
            name: 'Assistente QA',
            baseCost: new Decimal(15),
            cpsPerUnit: new Decimal(0.1),
            tags: ['helper']
        },
        jiraTicket: {
            name: 'Jira Ticket',
            baseCost: new Decimal(120),
            cpsPerUnit: new Decimal(1)
        },
        teamQa: {
            name: 'Team QA',
            baseCost: new Decimal(1500),
            cpsPerUnit: new Decimal(8)
        },
        automazioneTest: {
            name: 'Automazione Test',
            baseCost: new Decimal(15000),
            cpsPerUnit: new Decimal(47)
        },
        metodologiaAgile: {
            name: 'Metodologia Agile',
            baseCost: new Decimal(200000),
            cpsPerUnit: new Decimal(260)
        },
        aiDebugger: {
            name: 'AI Debugger',
            baseCost: new Decimal(3500000),
            cpsPerUnit: new Decimal(1400)
        },
        quantumServer: {
            name: 'Quantum Server',
            baseCost: new Decimal(55000000),
            cpsPerUnit: new Decimal(7800)
        },
        reteNeuraleGalattica: {
            name: 'Rete Galattica',
            baseCost: new Decimal(850000000),
            cpsPerUnit: new Decimal(44000)
        },
        debugTemporale: {
            name: 'Debug Temporale',
            baseCost: new Decimal(15000000000),
            cpsPerUnit: new Decimal(260000)
        }
    },

    clickUpgrades: {
        caffeForte: {
            name: 'Caffè Forte',
            desc: 'Aggiunge +1 al valore di ogni click.',
            cost: new Decimal(100),
            clickIncrease: new Decimal(1),
            requiredClicks: 10
        },
        tastieraErgonomica: {
            name: 'Tastiera Ergonomica',
            desc: 'Aggiunge +5 al valore di ogni click.',
            cost: new Decimal(500),
            clickIncrease: new Decimal(5),
            requiredClicks: 100
        },
        mouseGaming: {
            name: 'Mouse Gaming',
            desc: 'Aggiunge +10 al valore di ogni click.',
            cost: new Decimal(2000),
            clickIncrease: new Decimal(10),
            requiredClicks: 300
        },
        ergonomiaEstrema: {
            name: 'Ergonomia Estrema',
            desc: 'Aggiunge +50 al valore di ogni click.',
            cost: new Decimal(10000),
            clickIncrease: new Decimal(50),
            requiredClicks: 1000
        },
        aiClick: {
            name: 'Intelligenza Artificiale',
            desc: 'Aggiunge +500 al valore di ogni click.',
            cost: new Decimal(500000),
            clickIncrease: new Decimal(500),
            requiredClicks: 7500
        },

        // --- UPGRADE CON EFFETTI SPECIALI ---
        doppioClick: {
            name: 'Doppio Click',
            desc: 'Raddoppia il valore base dei tuoi click.',
            cost: new Decimal(25000),
            requiredClicks: 1500,
            clickIncrease: new Decimal(0),
            effects: [{
                trigger: 'passive',
                type: 'mult_global',
                stat: 'clickGlobalMult',
                val: new Decimal(2)
            }]
        },
        manoBionica: {
            name: 'Mano Bionica',
            desc: 'Ogni click guadagna anche l\'1% dei tuoi BPS.',
            cost: new Decimal(50000),
            requiredClicks: 2500,
            clickIncrease: new Decimal(0),
            effects: [{
                trigger: 'passive',
                type: 'set_flag',
                flag: 'bionicHand',
                val: true
            }]
        },
        aiClick: {
            name: 'Intelligenza Artificiale',
            desc: 'Aggiunge +500 al valore di ogni click.',
            cost: new Decimal(500000),
            clickIncrease: new Decimal(500),
            requiredClicks: 7500
        },

        clickAutomatico: {
            name: 'Click Automatico',
            desc: 'Aggiunge BPS pari al numero di Assistenti QA.',
            cost: new Decimal(1000000),
            requiredClicks: 10000,
            clickIncrease: new Decimal(0),
            effects: [{
                trigger: 'passive',
                type: 'set_flag',
                flag: 'autoClickQA',
                val: true
            }]
        },

        // --- UPGRADE COSTOSI PER SBLOCCARE LE SKIN ---

        hacking: {
            name: 'Hacking Etico',
            desc: 'Raddoppia la probabilità di trovare Ticket Critici.',
            cost: new Decimal(10000000),
            requiredClicks: 15000,
            clickIncrease: new Decimal(0),
            effects: [{
                trigger: 'passive',
                type: 'mult_global',
                stat: 'goldenBugChance',
                val: new Decimal(2)
            }]
        },

        clickDivino: {
            name: 'Click Divino',
            desc: 'La Mano Bionica ora guadagna il 2% dei BPS.',
            cost: new Decimal(1000000000),
            requiredClicks: 100000,
            clickIncrease: new Decimal(0),
            effects: [{
                trigger: 'passive',
                type: 'set_flag',
                flag: 'divineClick',
                val: true
            }]
        }
    },

    prestigeUpgrades: {
        sinergia: {
            name: 'Sinergia Manageriale',
            desc: 'Ogni punto promozione vale +0.1% in più (Cumulativo).',
            baseCost: new Decimal(5),
            bonusPerLevel: new Decimal(0.001),
            isCounted: true,
            effects: [{
                trigger: 'passive',
                type: 'add_global_stat_per_level',
                stat: 'prestigeSynergyFactor',
                val: new Decimal(0.001)
            }]
        },
        paracadute: {
            name: 'Paracadute d\'Oro',
            desc: 'Inizi la run con +2.000 Bug per livello.',
            baseCost: new Decimal(25),
            isCounted: true,
            bonusPerLevel: new Decimal(2000)
        },
        serverAlwaysOn: {
            name: 'Server Always-On',
            desc: 'Aumenta il guadagno offline dal 30% al 100% (+10%/liv).',
            baseCost: new Decimal(50),
            isCounted: true,
            maxLevel: 7
        },
        contrattazione: {
            name: 'Contrattazione',
            desc: 'Riduce l\'aumento dei costi dei Teams (Scaling).',
            baseCost: new Decimal(500),
            isCounted: true,
            maxLevel: 10,
            effects: [{
                trigger: 'passive',
                type: 'add_global_stat_per_level',
                stat: 'costScalingReduction',
                val: 0.01
            }]
        },
        eredita: {
            name: 'Eredità Strutturale',
            desc: 'Mantieni 1 "Assistente QA" per livello dopo la promozione.',
            baseCost: new Decimal(100),
            isCounted: true
        },
        outsourcing: {
            name: 'Outsourcing',
            desc: 'Riduce i costi base del 5% per livello.',
            baseCost: new Decimal(300),
            isCounted: true,
            maxLevel: 5
        },
        accelerazione: {
            name: 'Accelerazione',
            desc: 'Inizi con +1 Assistente QA.',
            baseCost: new Decimal(15),
            isCounted: false
        },
        crunchTime: {
            id: 'crunchTime',
            name: 'ESPO FURY!',
            desc: 'Abilità Attiva: Espo si infuria! BPS x7 per 30s.',
            baseCost: new Decimal(200),
            isCounted: false,
            furyImage: 'espo-fury.webp',
            furyClickImage: 'espo-fury-click.webp'
        },
        bugBounty: {
            name: 'Bug Bounty',
            desc: 'I Ticket Critici (Golden Bug) valgono il +20% per livello.',
            baseCost: new Decimal(75),
            isCounted: true,
            effects: [{
                trigger: 'passive',
                type: 'add_mult_per_level',
                stat: 'goldenBugMult',
                val: new Decimal(0.2)
            }]
        },
        ticketPremium: {
            name: 'Ticket Premium',
            desc: 'I Ticket Critici appaiono 2 volte più spesso.',
            baseCost: new Decimal(25),
            isCounted: false,
            effects: [{
                trigger: 'passive',
                type: 'mult_global',
                stat: 'goldenBugSpawnTime',
                val: new Decimal(0.5)
            }]
        }
    },

    buildingEnhancements: {
        caffeDoppio: {
            name: 'Caffè Doppio',
            desc: 'Assistenti QA x2 BPS.',
            targetTeam: 'assistenteQa',
            cost: new Decimal(150),
            multiplier: new Decimal(2),
            requiredCount: 1
        },
        caffeTriplo: {
            name: 'Caffè Triplo',
            desc: 'Assistenti QA x2 BPS.',
            targetTeam: 'assistenteQa',
            cost: new Decimal(750),
            multiplier: new Decimal(2),
            requiredCount: 10
        },
        scrivanieErgonomiche: {
            name: 'Scrivanie Ergonomiche',
            desc: 'Assistenti QA x3 BPS.',
            targetTeam: 'assistenteQa',
            cost: new Decimal(5000),
            multiplier: new Decimal(3),
            requiredCount: 25
        },
        formazioneAvanzata: {
            name: 'Formazione Avanzata',
            desc: 'Assistenti QA x3 BPS.',
            targetTeam: 'assistenteQa',
            cost: new Decimal(25000),
            multiplier: new Decimal(3),
            requiredCount: 50
        },
        managerJunior: {
            name: 'Manager Junior',
            desc: 'Assistenti QA x4 BPS.',
            targetTeam: 'assistenteQa',
            cost: new Decimal(100000),
            multiplier: new Decimal(4),
            requiredCount: 100
        },
        jiraAI: {
            name: 'Jira AI',
            desc: 'Jira Ticket x2 BPS.',
            targetTeam: 'jiraTicket',
            cost: new Decimal(1000),
            multiplier: new Decimal(2),
            requiredCount: 1
        },
        jiraCloud: {
            name: 'Jira Cloud',
            desc: 'Jira Ticket x2 BPS.',
            targetTeam: 'jiraTicket',
            cost: new Decimal(5000),
            multiplier: new Decimal(2),
            requiredCount: 10
        },
        jiraDataCenter: {
            name: 'Jira Data Center',
            desc: 'Jira Ticket x3 BPS.',
            targetTeam: 'jiraTicket',
            cost: new Decimal(40000),
            multiplier: new Decimal(3),
            requiredCount: 25
        },
        jiraPremium: {
            name: 'Jira Premium',
            desc: 'Jira Ticket x3 BPS.',
            targetTeam: 'jiraTicket',
            cost: new Decimal(200000),
            multiplier: new Decimal(3),
            requiredCount: 50
        },
        jiraSelfHealing: {
            name: 'Jira Self-Healing',
            desc: 'Jira Ticket x4 BPS.',
            targetTeam: 'jiraTicket',
            cost: new Decimal(1000000),
            multiplier: new Decimal(4),
            requiredCount: 100
        },
        scrum: {
            name: 'Metodologia Scrum',
            desc: 'Team QA x2 BPS.',
            targetTeam: 'teamQa',
            cost: new Decimal(11000),
            multiplier: new Decimal(2),
            requiredCount: 1
        },
        teamLeader: {
            name: 'Team Leader',
            desc: 'Team QA x2 BPS.',
            targetTeam: 'teamQa',
            cost: new Decimal(55000),
            multiplier: new Decimal(2),
            requiredCount: 10
        },
        certificazioneISTQB: {
            name: 'Certificazione ISTQB',
            desc: 'Team QA x3 BPS.',
            targetTeam: 'teamQa',
            cost: new Decimal(440000),
            multiplier: new Decimal(3),
            requiredCount: 25
        },
        bonusProduttivita: {
            name: 'Bonus Produttività',
            desc: 'Team QA x3 BPS.',
            targetTeam: 'teamQa',
            cost: new Decimal(2200000),
            multiplier: new Decimal(3),
            requiredCount: 50
        },
        teamGlobale: {
            name: 'Team Globale 24/7',
            desc: 'Team QA x4 BPS.',
            targetTeam: 'teamQa',
            cost: new Decimal(11000000),
            multiplier: new Decimal(4),
            requiredCount: 100
        },
        selenium: {
            name: 'Framework Selenium',
            desc: 'Automazione x2 BPS.',
            targetTeam: 'automazioneTest',
            cost: new Decimal(120000),
            multiplier: new Decimal(2),
            requiredCount: 1
        },
        cucumber: {
            name: 'Cucumber (BDD)',
            desc: 'Automazione x2 BPS.',
            targetTeam: 'automazioneTest',
            cost: new Decimal(600000),
            multiplier: new Decimal(2),
            requiredCount: 10
        },
        ciCd: {
            name: 'Pipeline CI/CD',
            desc: 'Automazione x3 BPS.',
            targetTeam: 'automazioneTest',
            cost: new Decimal(4800000),
            multiplier: new Decimal(3),
            requiredCount: 25
        },
        docker: {
            name: 'Container Docker',
            desc: 'Automazione x3 BPS.',
            targetTeam: 'automazioneTest',
            cost: new Decimal(24000000),
            multiplier: new Decimal(3),
            requiredCount: 50
        },
        kubernetes: {
            name: 'Orchestrazione Kubernetes',
            desc: 'Automazione x4 BPS.',
            targetTeam: 'automazioneTest',
            cost: new Decimal(120000000),
            multiplier: new Decimal(4),
            requiredCount: 100
        },
        kanban: {
            name: 'Board Kanban',
            desc: 'Metodologia Agile x2 BPS.',
            targetTeam: 'metodologiaAgile',
            cost: new Decimal(1300000),
            multiplier: new Decimal(2),
            requiredCount: 1
        },
        safe: {
            name: 'Framework SAFe',
            desc: 'Metodologia Agile x2 BPS.',
            targetTeam: 'metodologiaAgile',
            cost: new Decimal(6500000),
            multiplier: new Decimal(2),
            requiredCount: 10
        },
        productOwner: {
            name: 'Product Owner Dedicato',
            desc: 'Metodologia Agile x3 BPS.',
            targetTeam: 'metodologiaAgile',
            cost: new Decimal(52000000),
            multiplier: new Decimal(3),
            requiredCount: 25
        },
        releaseTrain: {
            name: 'Release Train',
            desc: 'Metodologia Agile x3 BPS.',
            targetTeam: 'metodologiaAgile',
            cost: new Decimal(260000000),
            multiplier: new Decimal(3),
            requiredCount: 50
        },
        devOps: {
            name: 'Cultura DevOps',
            desc: 'Metodologia Agile x4 BPS.',
            targetTeam: 'metodologiaAgile',
            cost: new Decimal(1300000000),
            multiplier: new Decimal(4),
            requiredCount: 100
        },
        deepLearning: {
            name: 'Deep Learning',
            desc: 'AI Debugger x2 BPS.',
            targetTeam: 'aiDebugger',
            cost: new Decimal(14000000),
            multiplier: new Decimal(2),
            requiredCount: 1
        },
        machineLearning: {
            name: 'Machine Learning',
            desc: 'AI Debugger x2 BPS.',
            targetTeam: 'aiDebugger',
            cost: new Decimal(70000000),
            multiplier: new Decimal(2),
            requiredCount: 10
        },
        retiNeurali: {
            name: 'Reti Neurali',
            desc: 'AI Debugger x3 BPS.',
            targetTeam: 'aiDebugger',
            cost: new Decimal(560000000),
            multiplier: new Decimal(3),
            requiredCount: 25
        },
        quantumComputing: {
            name: 'Quantum Computing',
            desc: 'AI Debugger x3 BPS.',
            targetTeam: 'aiDebugger',
            cost: new Decimal(2800000000),
            multiplier: new Decimal(3),
            requiredCount: 50
        },
        skynet: {
            name: 'Skynet',
            desc: 'AI Debugger x4 BPS.',
            targetTeam: 'aiDebugger',
            cost: new Decimal(14000000000),
            multiplier: new Decimal(4),
            requiredCount: 100
        },
        entanglementLink: {
            name: 'Entanglement Link',
            desc: 'Quantum Server x2 BPS.',
            targetTeam: 'quantumServer',
            cost: new Decimal(550000000),
            multiplier: new Decimal(2),
            requiredCount: 1
        },
        superpositionCores: {
            name: 'Superposition Cores',
            desc: 'Quantum Server x2 BPS.',
            targetTeam: 'quantumServer',
            cost: new Decimal(2750000000),
            multiplier: new Decimal(2),
            requiredCount: 10
        },
        errorCorrection: {
            name: 'Quantum Error Correction',
            desc: 'Quantum Server x3 BPS.',
            targetTeam: 'quantumServer',
            cost: new Decimal(22000000000),
            multiplier: new Decimal(3),
            requiredCount: 25
        },
        quantumSupremacy: {
            name: 'Supremazia Quantistica',
            desc: 'Quantum Server x4 BPS.',
            targetTeam: 'quantumServer',
            cost: new Decimal(110000000000),
            multiplier: new Decimal(4),
            requiredCount: 50
        },
        subspaceTransceiver: {
            name: 'Subspace Transceiver',
            desc: 'Rete Galattica x2 BPS.',
            targetTeam: 'reteNeuraleGalattica',
            cost: new Decimal(8500000000),
            multiplier: new Decimal(2),
            requiredCount: 1
        },
        dysonNodes: {
            name: 'Nodi Dyson',
            desc: 'Rete Galattica x2 BPS.',
            targetTeam: 'reteNeuraleGalattica',
            cost: new Decimal(42500000000),
            multiplier: new Decimal(2),
            requiredCount: 10
        },
        wormholeRouting: {
            name: 'Wormhole Routing',
            desc: 'Rete Galattica x3 BPS.',
            targetTeam: 'reteNeuraleGalattica',
            cost: new Decimal(340000000000),
            multiplier: new Decimal(3),
            requiredCount: 25
        },
        federazioneGalattica: {
            name: 'Federazione Galattica',
            desc: 'Rete Galattica x4 BPS.',
            targetTeam: 'reteNeuraleGalattica',
            cost: new Decimal(1700000000000),
            multiplier: new Decimal(4),
            requiredCount: 50
        },
        paradoxPrevention: {
            name: 'Paradox Prevention',
            desc: 'Debug Temporale x2 BPS.',
            targetTeam: 'debugTemporale',
            cost: new Decimal(150000000000),
            multiplier: new Decimal(2),
            requiredCount: 1
        },
        timelineBranching: {
            name: 'Timeline Branching',
            desc: 'Debug Temporale x2 BPS.',
            targetTeam: 'debugTemporale',
            cost: new Decimal(750000000000),
            multiplier: new Decimal(2),
            requiredCount: 10
        },
        chronosTrigger: {
            name: 'Chronos Trigger',
            desc: 'Debug Temporale x3 BPS.',
            targetTeam: 'debugTemporale',
            cost: new Decimal(6000000000000),
            multiplier: new Decimal(3),
            requiredCount: 25
        },
        immutablePast: {
            name: 'Passato Immutabile',
            desc: 'Debug Temporale x4 BPS.',
            targetTeam: 'debugTemporale',
            cost: new Decimal(30000000000000),
            multiplier: new Decimal(4),
            requiredCount: 50
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
            reward: { type: 'bugs', value: new Decimal(5000) },
            condition: () => gameState.teams.assistenteQa.count >= 10
        },
        jiraWarrior: {
            name: 'Ticketing System',
            desc: 'Gestisci 25 Jira Ticket.',
            type: 'building',
            buildingId: 'jiraTicket',
            target: 25,
            isSecret: false,
            reward: { type: 'bugs', value: new Decimal(2000) },
            condition: () => gameState.teams.jiraTicket.count >= 25
        },
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
            target: new Decimal(50000),
            isSecret: false,
            reward: { type: 'bugs', value: new Decimal(10000) },
            condition: () => gameState.totalScore.gte(50000)
        },
        automationFirst: {
            name: 'Automation First',
            desc: 'Raggiungi 10 Team QA.',
            type: 'building',
            buildingId: 'teamQa',
            target: 10,
            isSecret: false,
            reward: { type: 'bugs', value: new Decimal(15000) },
            condition: () => gameState.teams.teamQa.count >= 10
        },
        clickGod: {
            name: 'Hardcoded Solution',
            desc: 'Raggiungi 2.000 click manuali.',
            type: 'click',
            target: new Decimal(2000),
            isSecret: false,
            reward: { type: 'skin', id: 'gladiator' },
            condition: () => gameState.totalClicks >= 2000
        },
        clickDictator: {
            name: 'Dittatore del Mouse',
            desc: 'Raggiungi 20.000 click manuali.',
            type: 'click',
            target: new Decimal(20000),
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
            reward: { type: 'bugs', value: new Decimal(50000) },
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
        milionario: {
            name: 'Tech Lead',
            desc: 'Accumula 10 Milioni di bug.',
            type: 'score',
            target: new Decimal(10000000),
            isSecret: false,
            reward: { type: 'prestige', value: new Decimal(5) },
            condition: () => gameState.totalScore.gte(10000000)
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
            target: new Decimal(1000000000),
            isSecret: false,
            reward: { type: 'prestige', value: new Decimal(10) },
            condition: () => gameState.totalScore.gte(1000000000)
        },
        errore404: {
            name: 'Page Not Found',
            desc: 'Incontra il Blue Screen of Death.',
            type: 'custom',
            target: 1,
            isSecret: false,
            reward: { type: 'bugs', value: new Decimal(500000) },
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
        waifuUnlock: {
            name: 'AI Supremacy',
            desc: 'Possiedi 100 AI Debugger.',
            type: 'building',
            buildingId: 'aiDebugger',
            target: 100,
            isSecret: false,
            reward: { type: 'prestige', value: new Decimal(5) },
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
            condition: () => IS_XMAS_TIME
        }
    },
    events: {
        rickRoll: {
            name: 'Rick Roll',
            type: 'video',
            videos: ['rick-roll-video'], // ID dei tag <video> HTML
            duration: 60000,             // Durata in ms
            minMult: 5,                  // Moltiplicatore minimo
            maxMult: 13,                 // Moltiplicatore massimo
            audioId: 'rick-roll-video',  // ID per il volume nel mixer
            toast: "🎵 RICK ROLL! (x{mult}) 🎵",
            toastType: "achievement"
        },
        ricardo: {
            name: 'Ricardo Flex',
            type: 'video',
            videos: ['ricardo-video', 'ricardo-metal-video', 'ricardo-dota-video'],
            duration: 45000,
            minMult: 5,
            maxMult: 13,
            audioId: 'ricardo-video',
            toast: "💪 PURE POWER! (x{mult}) 💪",
            toastType: "achievement"
        },
        bluescreen: {
            name: 'System Error 404',
            type: 'css_mode',
            cssClass: 'bluescreen-active',
            audioId: 'sound-bluescreen',
            duration: 30000,
            minMult: 2,
            maxMult: 5,
            toast: "ERRORE DI SISTEMA! x{mult}!",
            toastType: "error"
        },
        matrix: {
            name: 'Matrix Glitch',
            type: 'css_mode',
            cssClass: 'matrix-active',
            audioId: 'sound-matrix',
            duration: 30000,
            minMult: 2,
            maxMult: 5,
            toast: "SYSTEM HACKED! x{mult}!",
            toastType: "error"
        }
    },
    texts: {
        ui: {
            buy: "Compra",
            owned: "POSSEDUTO",
            max: "MAX",
            locked: "BLOCCATO",
            cost: "Costo",
            bps: "BPS",
            clickPower: "Click Power",
            bugsWallet: "Bug Attuali",
            runScore: "Totale Run Attuale",
            careerScore: "Totale Carriera",
            offlineEarned: "Guadagnati Offline",
            promoProgress: "Progresso Promozione",
            equipped: "IN USO",
            useSkin: "USA SKIN",
            noToken: "NO TOKEN",
            skinLocked: "BLOCCATA",
            unknown: "???",
            secretGoal: "Obiettivo Segreto...",
            rewardClaim: "Riscatta",
            rewardDone: "Riscatto",
            loadingData: "Caricamento dati...",
            loadingAssets: "Caricamento risorse...",
            systemStart: "Avvio sistema...",
            promoReady: "PRONTA!",
            promotionReadyTitle: "PROMOZIONE PRONTA!",
            bugsTitle: "Bug",
            furyActive: "🔥 BPS x7 🔥",
            furyCooldown: "Ricarica...",
            furyReady: "🔥 ESPO FURY 🔥",
            clickMe: "CLICCA!",
            labFull: "Laboratorio al completo!",
            noItemsBuy: "Nessun oggetto da comprare al momento.",
            noItemsLock: "Nessun oggetto bloccato in vista.",
            noItemsPurchased: "Ancora nessun acquisto effettuato.",
            nothingToShow: "Niente da mostrare."
        },
        toasts: {
            welcome: "Benvenuto",
            saved: "Salvataggio completato",
            saveError: "Errore durante il salvataggio",
            insufficientBugs: "Bugs insufficienti!",
            insufficientTokens: "Token insufficienti!",
            skinBought: "Skin Acquistata: {name}!",
            skinUnlock: "Nuova Skin: {name}!",
            achievementUnlock: "🏆 Sbloccato: {name}",
            rewardAvailable: " (Premio disponibile!)",
            rewardClaimed: "Riscattato: {message}",
            furyCalm: "Espo si sta calmando: {seconds}s",
            furyActive: "🔥 ESPO FURY ATTIVA! BPS x7! 🔥",
            furyEnded: "Espo si è calmato.",
            promoSuccess: "Promozione completata! Buon lavoro!",
            cloudSync: "Progressi scaricati dal Cloud!",
            backupRestored: "Dati ripristinati dal Backup di sicurezza!",
            fileCorrupt: "File principale corrotto. Caricato Backup.",
            versionMismatch: "⚠️ Versione salvataggio incompatibile!",
            memoryFull: "Memoria piena! Impossibile salvare in locale.",
            prestigeNeedMore: "Devi accumulare più bug per ottenere una promozione!",
            prestigeNeedComplete: "Devi completare il progetto (100%) per la promozione!",
            bugCrit: "Bug Critico Risolto! +{amount} bug!",
            offlineClaim: "Hai riscattato {amount} bug!",
            settingsSaved: "Preferenze Salvate",
            audioReset: "Audio ripristinato ai valori default",
            passChanged: "Password Aggiornata!",
            nameChanged: "Nome Aggiornato!",
            arcadeWelcome: "Benvenuto nella Sala Server (Arcade)!"
        },
        dialogs: {
            logout: "Logout?",
            resetConfirm: "ATTENZIONE: Questo resetterà tutti i progressi al punto di partenza (Hard Reset). I token Lab e le Skin verranno persi. Continuare?",
            deleteConfirm: "SEI SICURO? Questa azione è irreversibile e cancellerà tutto.",
            audioResetConfirm: "Vuoi ripristinare i volumi predefiniti consigliati?",
            enterPass: "Inserisci la password nell'area critica.",
            fillFields: "Compila entrambi i campi.",
            confirmPass: "Conferma password attuale:"
        },
        format: {
            suffixes: ["", "k", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"],
            time: { d: "g", h: "h", m: "m", s: "s" }
        }
    }
};

// --- GENERAZIONE AUTOMATICA DELLO STATO INIZIALE ---
function getInitialGameState() {
    const state =
    {
        version: { major: window.GAME_VERSION.major, minor: window.GAME_VERSION.minor, stage: window.GAME_VERSION.stage },
        arcadeHighScores: {
            snake: 0
        },
        score: new Decimal(0),
        baseClickValue: new Decimal(1),
        totalClicks: 0,
        totalScore: new Decimal(0),
        totalOfflineScore: new Decimal(0),
        prestigePoints: new Decimal(0),
        lifetimePrestigePoints: new Decimal(0),
        totalResets: 0,
        totalGoldenBugsClicked: 0,
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
        buildingEnhancements: {},
        achievements: {},
        user: {
            username: 'Giocatore',
            masterVolume: 0.8,
            sfxVolume: 1.0,
            musicVolume: 0.5,
            audioCustom: {},
            bgMusicSelection: 'sound-bg-music'
        }
    };

    for (const key in gameData.teams) state.teams[key] = { count: 0 };

    for (const key in gameData.clickUpgrades) state.clickUpgrades[key] = { purchased: false };

    for (const key in gameData.buildingEnhancements) state.buildingEnhancements[key] = { purchased: false };

    for (const key in gameData.prestigeUpgrades) {
        if (gameData.prestigeUpgrades[key].isCounted)
            state.prestigeUpgrades[key] = { count: 0 };
        else
            state.prestigeUpgrades[key] = { purchased: false };
    }

    const allAssets = { ...gameData.assets.sounds, ...gameData.assets.videos };

    for (const key in allAssets) {
        if (allAssets[key].defaultVol !== undefined)
            state.user.audioCustom[allAssets[key].id] = allAssets[key].defaultVol;
    }

    return state;
}

gameState = getInitialGameState();

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

    bps = new Decimal(0);
    prestigeBonus = new Decimal(1);
    clickCPSBonus = new Decimal(1);
    clickHistory = [];

    window.goldenBugChance = 0.001;
    window.goldenBugSpawnTime = 60000;
    window.goldenBugMult = new Decimal(1);
    window.gameFlags = {};
}