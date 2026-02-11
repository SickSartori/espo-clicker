window.gameData.clickUpgrades = {
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
};

window.gameData.prestigeUpgrades= {
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
};

window.gameData.buildingEnhancements = {
        caffeDoppio: {
            name: 'Caffè Doppio',
            desc: 'Aumenta la produzione di Assistenti QA del 10%.',
            cost: new Decimal(1000),
            team: 'assistenteQa',
            type: 'mult',
            val: new Decimal(1.1)
        },
        testSuMacchineDiverse: {
            name: 'Test su Macchine Diverse',
            desc: 'Aumenta la produzione di Team QA del 10%.',
            cost: new Decimal(10000),
            team: 'teamQa',
            type: 'mult',
            val: new Decimal(1.1)
        },
        frameworkAvanzato: {
            name: 'Framework Avanzato',
            desc: 'Aumenta la produzione di Automazione Test del 10%.',
            cost: new Decimal(100000),
            team: 'automazioneTest',
            type: 'mult',
            val: new Decimal(1.1)
        },
        riunioniEfficaci: {
            name: 'Riunioni Efficaci',
            desc: 'Aumenta la produzione di Metodologia Agile del 10%.',
            cost: new Decimal(1000000),
            team: 'metodologiaAgile',
            type: 'mult',
            val: new Decimal(1.1)
        },
        debugProfondo: {
            name: 'Debug Profondo',
            desc: 'Aumenta la produzione di AI Debugger del 10%.',
            cost: new Decimal(100000000),
            team: 'aiDebugger',
            type: 'mult',
            val: new Decimal(1.1)
        },
        cloudIbrido: {
            name: 'Cloud Ibrido',
            desc: 'Aumenta la produzione di Quantum Server del 10%.',
            cost: new Decimal(10000000000),
            team: 'quantumServer',
            type: 'mult',
            val: new Decimal(1.1)
        },
        connessioneGalattica: {
            name: 'Connessione Galattica',
            desc: 'Aumenta la produzione di Rete Galattica del 10%.',
            cost: new Decimal(1000000000000),
            team: 'reteNeuraleGalattica',
            type: 'mult',
            val: new Decimal(1.1)
        },
        timeTravelDebugging: {
            name: 'Time Travel Debugging',
            desc: 'Aumenta la produzione di Debug Temporale del 10%.',
            cost: new Decimal(100000000000000),
            team: 'debugTemporale',
            type: 'mult',
            val: new Decimal(1.1)
        }
    };