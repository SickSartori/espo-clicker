import { Decimal } from './decimal';

export const clickUpgrades: Record<string, any> = {
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

    interfacciaNeurale: {
        name: 'Interfaccia Neurale',
        desc: 'Aggiunge +2.000 al valore di ogni click.',
        cost: new Decimal(50000000),
        clickIncrease: new Decimal(2000),
        requiredClicks: 25000
    },
    overclockingCognitivo: {
        name: 'Overclocking Cognitivo',
        desc: 'Triplica il valore base dei tuoi click.',
        cost: new Decimal(250000000),
        requiredClicks: 50000,
        clickIncrease: new Decimal(0),
        effects: [{
            trigger: 'passive',
            type: 'mult_global',
            stat: 'clickGlobalMult',
            val: new Decimal(3)
        }]
    },

    clickDivino: {
        name: 'Click Divino',
        desc: 'La Mano Bionica ora guadagna il 2% dei BPS.',
        cost: new Decimal(1000000000),
        // 100k e non 50k: con 50k si sbloccava nello stesso identico istante di
        // Overclocking Cognitivo (ultimo gradino della scala 10→100→…→25k→50k) e le
        // due card comparivano insieme, lasciando solo il costo a distinguerle.
        requiredClicks: 100000,
        clickIncrease: new Decimal(0),
        effects: [{
            trigger: 'passive',
            type: 'set_flag',
            flag: 'divineClick',
            val: true
        }]
    }
};

export const prestigeUpgrades: Record<string, any> = {
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
        furyImage: 'skins/espo-fury.webp',
        furyClickImage: 'skins/espo-fury-click.webp'
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
    },
    reteContatti: {
        name: 'Rete di Contatti',
        desc: 'Riduce il cooldown di ESPO FURY di 30s per livello.',
        baseCost: new Decimal(150),
        isCounted: true,
        maxLevel: 5
    },
    esperienzaAccumulata: {
        name: 'Esperienza Accumulata',
        desc: 'Aumenta il valore click del +2% per livello (permanente).',
        baseCost: new Decimal(200),
        isCounted: true,
        maxLevel: 10,
        effects: [{
            trigger: 'passive',
            type: 'add_mult_per_level',
            stat: 'clickGlobalMult',
            val: new Decimal(0.02)
        }]
    },
    deadlineStretta: {
        name: 'Deadline Stretta',
        desc: 'keepTeams mantiene +1 livello aggiuntivo per ogni acquisto.',
        baseCost: new Decimal(400),
        isCounted: true,
        maxLevel: 5
    }
};

export const buildingEnhancements: Record<string, any> = {
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
    },
    coscienzaCollettiva: {
        name: 'Coscienza Collettiva Quantistica',
        desc: 'Quantum Server x4 BPS.',
        targetTeam: 'quantumServer',
        cost: new Decimal(550000000000),
        multiplier: new Decimal(4),
        requiredCount: 100
    },
    menteUniverso: {
        name: 'Mente dell\'Universo',
        desc: 'Rete Galattica x4 BPS.',
        targetTeam: 'reteNeuraleGalattica',
        cost: new Decimal(8500000000000),
        multiplier: new Decimal(4),
        requiredCount: 100
    },
    eternitaParallela: {
        name: 'Eternità Parallela',
        desc: 'Debug Temporale x4 BPS.',
        targetTeam: 'debugTemporale',
        cost: new Decimal(150000000000000),
        multiplier: new Decimal(4),
        requiredCount: 100
    },
    menteDivisa: {
        name: 'Mente Divisa',
        desc: 'Singolarità Cosciente x2 BPS.',
        targetTeam: 'singolaritaCosciente',
        cost: new Decimal(2400000000000),
        multiplier: new Decimal(2),
        requiredCount: 1
    },
    neuroniFotonici: {
        name: 'Neuroni Fotonici',
        desc: 'Singolarità Cosciente x2 BPS.',
        targetTeam: 'singolaritaCosciente',
        cost: new Decimal(12000000000000),
        multiplier: new Decimal(2),
        requiredCount: 10
    },
    singolaRete: {
        name: 'Singola Rete',
        desc: 'Singolarità Cosciente x3 BPS.',
        targetTeam: 'singolaritaCosciente',
        cost: new Decimal(96000000000000),
        multiplier: new Decimal(3),
        requiredCount: 25
    },
    overmindProtocol: {
        name: 'Overmind Protocol',
        desc: 'Singolarità Cosciente x3 BPS.',
        targetTeam: 'singolaritaCosciente',
        cost: new Decimal(480000000000000),
        multiplier: new Decimal(3),
        requiredCount: 50
    },
    coscienzaAssoluta: {
        name: 'Coscienza Assoluta',
        desc: 'Singolarità Cosciente x4 BPS.',
        targetTeam: 'singolaritaCosciente',
        cost: new Decimal(2400000000000000),
        multiplier: new Decimal(4),
        requiredCount: 100
    },
    frameworkRealta: {
        name: 'Framework Realtà',
        desc: 'Architettura dell\'Infinito x2 BPS.',
        targetTeam: 'architetturaInfinito',
        cost: new Decimal(38400000000000),
        multiplier: new Decimal(2),
        requiredCount: 1
    },
    compilatoreUniversale: {
        name: 'Compilatore Universale',
        desc: 'Architettura dell\'Infinito x2 BPS.',
        targetTeam: 'architetturaInfinito',
        cost: new Decimal(192000000000000),
        multiplier: new Decimal(2),
        requiredCount: 10
    },
    patchEsistenziale: {
        name: 'Patch Esistenziale',
        desc: 'Architettura dell\'Infinito x3 BPS.',
        targetTeam: 'architetturaInfinito',
        cost: new Decimal(1536000000000000),
        multiplier: new Decimal(3),
        requiredCount: 25
    },
    hotfixDivino: {
        name: 'Hotfix Divino',
        desc: 'Architettura dell\'Infinito x3 BPS.',
        targetTeam: 'architetturaInfinito',
        cost: new Decimal(7680000000000000),
        multiplier: new Decimal(3),
        requiredCount: 50
    },
    deployDelCosmo: {
        name: 'Deploy del Cosmo',
        desc: 'Architettura dell\'Infinito x4 BPS.',
        targetTeam: 'architetturaInfinito',
        cost: new Decimal(38400000000000000),
        multiplier: new Decimal(4),
        requiredCount: 100
    }
};
export const superUpgrades: Record<string, any> = {
    risveglio: {
        name: 'Risveglio Quantico',
        desc: 'La consapevolezza del multiverso raddoppia (x2) la potenza base di tutti i tuoi click per sempre.',
        cost: new Decimal(1),
        isCounted: false,
        effects: [{ trigger: 'passive', type: 'mult_global', stat: 'clickGlobalMult', val: new Decimal(2) }]
    },
    fastStart: {
        name: 'Avvio Rapido',
        desc: 'Inizia ogni Universo con +1 Milione di Bug e 5 Assistenti QA.',
        cost: new Decimal(2),
        isCounted: false
    },
    goldenAura: {
        name: 'Aura Dorata',
        desc: 'La risonanza quantica fa sì che i Ticket Critici (Golden Bug) contengano il triplo (x3) dei Bug.',
        cost: new Decimal(3),
        isCounted: false,
        effects: [{ trigger: 'passive', type: 'mult_global', stat: 'goldenBugMult', val: new Decimal(3) }]
    },
    qDiscount: {
        name: 'Compressione Dati',
        desc: 'Tutti gli upgrade del Laboratorio costano il 15% in meno.',
        cost: new Decimal(5),
        isCounted: false
    },
    tokenDuplicator: {
        name: 'Replicatore di Token',
        desc: 'La macchina estrae un 20% extra di Token Lab ad ogni Promozione.',
        cost: new Decimal(7),
        isCounted: false
    },
    keepTeams: {
        name: 'Persistenza Memoria',
        desc: 'Mantieni i primi 5 livelli dei Team BASE (Assistente, Ticket, QA) dopo una Promozione.',
        cost: new Decimal(12),
        isCounted: false
    },
    overclock: {
        name: 'Overclock',
        desc: 'ESPO FURY dura 60 secondi invece di 30.',
        cost: new Decimal(15),
        isCounted: false
    },
    risonanzaAurea: {
        name: 'Risonanza Aurea',
        desc: 'Golden Bug appare ogni 45s invece di 60s (base).',
        cost: new Decimal(10),
        isCounted: false,
        effects: [{
            trigger: 'passive',
            type: 'mult_global',
            stat: 'goldenBugSpawnTime',
            val: new Decimal(0.75)
        }]
    },
    echoQuantico: {
        name: 'Echo Quantico',
        desc: 'Ogni Formattazione mantieni 1 prestige upgrade già acquistato.',
        cost: new Decimal(20),
        isCounted: false
    }
};