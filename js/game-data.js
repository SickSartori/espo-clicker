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

        user: {
            username: 'Giocatore',
            masterVolume: 1.0
        },
        filterSettings: {
            globalFilter: 'available'
        },

        buildings: {
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
            // ... (Qui vanno tutte le tue 30 migliorie come prima) ...
            // Per brevità, copiale dal tuo file originale, la struttura è identica
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
        achievements: {
            primoClick: { unlocked: false },
            centoClick: { unlocked: false },
            milleBug: { unlocked: false },
            primoAssistente: { unlocked: false },
            dieciAssistenti: { unlocked: false },
            unJira: { unlocked: false },
            unodiTutto: { unlocked: false }
        }
    };
}

let gameState = getInitialGameState();

function resetGameToDefault() {
    // Sovrascriviamo le proprietà dell'oggetto esistente per non rompere i riferimenti
    const freshState = getInitialGameState();

    // Reset ricorsivo (Deep copy manuale o assegnazione)
    // Nota: Assegniamo le proprietà principali
    Object.assign(gameState, freshState);

    // Poiché buildings e upgrades sono oggetti annidati, dobbiamo assicurarci che vengano resettati profondamente
    // Il metodo più sicuro e brutale:
    gameState.buildings = JSON.parse(JSON.stringify(freshState.buildings));
    gameState.clickUpgrades = JSON.parse(JSON.stringify(freshState.clickUpgrades));
    gameState.prestigeUpgrades = JSON.parse(JSON.stringify(freshState.prestigeUpgrades));
    gameState.buildingEnhancements = JSON.parse(JSON.stringify(freshState.buildingEnhancements));
    gameState.achievements = JSON.parse(JSON.stringify(freshState.achievements));
    gameState.user = JSON.parse(JSON.stringify(freshState.user));

    // Pulisce anche variabili calcolate globali in game-data
    cookiesPerSecond = 0;
    prestigeBonus = 1;
    clickCPSBonus = 1;
    clickHistory = [];
}

// Dati statici (costi, nomi, ecc.)
const gameData = {
    PRESTIGE_THRESHOLD: 10000000,

    buildings: {
        assistenteQa: { name: 'Assistente QA', baseCost: 10, cpsPerUnit: 0.1 },
        jiraTicket: { name: 'Jira Ticket', baseCost: 50, cpsPerUnit: 1 },
        teamQa: { name: 'Team QA', baseCost: 500, cpsPerUnit: 8 },
        automazioneTest: { name: 'Automazione Test', baseCost: 6000, cpsPerUnit: 47 },
        metodologiaAgile: { name: 'Metodologia Agile', baseCost: 50000, cpsPerUnit: 260 },
        aiDebugger: { name: 'AI Debugger', baseCost: 400000, cpsPerUnit: 1400 },
        quantumServer: { name: 'Quantum Server', baseCost: 6000000, cpsPerUnit: 7800 },
        reteNeuraleGalattica: { name: 'Rete Galattica', baseCost: 80000000, cpsPerUnit: 44000 },
        debugTemporale: { name: 'Debug Temporale', baseCost: 1500000000, cpsPerUnit: 260000 }
    },
    clickUpgrades: {
        caffeForte: { name: 'Caffè Forte', desc: 'Aggiunge +1 al valore di ogni click.', cost: 100, clickIncrease: 1, requiredClicks: 10 },
        tastieraErgonomica: { name: 'Tastiera Ergonomica', desc: 'Aggiunge +5 al valore di ogni click.', cost: 500, clickIncrease: 5, requiredClicks: 100 },
        mouseGaming: { name: 'Mouse Gaming', desc: 'Aggiunge +10 al valore di ogni click.', cost: 2000, clickIncrease: 10, requiredClicks: 300 }, // REQUISITO: 300 Click
        ergonomiaEstrema: { name: 'Ergonomia Estrema', desc: 'Aggiunge +50 al valore di ogni click.', cost: 10000, clickIncrease: 50, requiredClicks: 1000 }, // REQUISITO: 1,500 Click
        doppioClick: { name: 'Doppio Click', desc: 'Raddoppia il valore base dei tuoi click.', cost: 25000, clickIncrease: 0, requiredClicks: 1500 },
        manoBionica: { name: 'Mano Bionica', desc: 'Ogni click guadagna anche l\'1% dei tuoi BPS.', cost: 50000, clickIncrease: 0, requiredClicks: 2500 },
        hacking: { name: 'Hacking Etico', desc: 'Raddoppia la probabilità di trovare Ticket Critici.', cost: 100000, clickIncrease: 0, requiredClicks: 5000 },
        aiClick: { name: 'Intelligenza Artificiale', desc: 'Aggiunge +500 al valore di ogni click.', cost: 500000, clickIncrease: 500, requiredClicks: 7500 }, // REQUISITO: 7,500 Click
        clickAutomatico: { name: 'Click Automatico', desc: 'Aggiunge BPS pari al numero di Assistenti QA.', cost: 250000, clickIncrease: 0, requiredClicks: 10000 },
        clickDivino: { name: 'Click Divino', desc: 'La Mano Bionica ora guadagna il 2% dei BPS.', cost: 1000000, clickIncrease: 0, requiredClicks: 50000 }
    },
    achievements: {
        primoClick: { name: 'Primo Click!', desc: 'Hai risolto il tuo primo bug.', condition: () => gameState.totalClicks >= 1 },
        centoClick: { name: 'Dita Veloci', desc: 'Risolvi 100 bug manually.', condition: () => gameState.totalClicks >= 100 },
        milleBug: { name: 'Manager Serio', desc: 'Accumula 1.000 bug.', condition: () => gameState.score >= 1000 },
        primoAssistente: { name: 'Assunzione', desc: 'Compra il tuo primo Assistente QA.', condition: () => gameState.buildings.assistenteQa.count >= 1 },
        dieciAssistenti: { name: 'Piccolo Team', desc: 'Assumi 10 Assistenti QA.', condition: () => gameState.buildings.assistenteQa.count >= 10 },
        unJira: { name: 'Organizzato', desc: 'Installa Jira.', condition: () => gameState.buildings.jiraTicket.count >= 1 },
        unodiTutto: {
            name: 'Full Stack!', desc: 'Possiedi almeno uno di ogni strumento/team.', condition: () => {
                for (const key in gameState.buildings) {
                    if (gameState.buildings[key].count === 0) return false;
                }
                return true;
            }
        }
    },
    prestigeUpgrades: {
        sinergia: { name: 'Sinergia Manageriale', desc: 'Ogni punto promozione vale +0.1% in più.', baseCost: 1, bonusPerLevel: 0.001, isCounted: true },
        accelerazione: { name: 'Accelerazione Iniziale', desc: 'Inizia ogni nuova run con 1 Assistente QA gratuito.', baseCost: 2, isCounted: false },
        ticketPremium: { name: 'Ticket Premium', desc: 'I Ticket Critici appaiono 2 volte più spesso.', baseCost: 5, isCounted: false },

        // --- NUOVI POTENZIAMENTI ---
        outsourcing: {
            name: 'Outsourcing Selvaggio',
            desc: 'Riduce il costo base di tutti gli edifici dell\'1% per livello (Max 10).',
            baseCost: 10,
            isCounted: true,
            maxLevel: 10 // Limite opzionale che gestiremo nella logica
        },
        paracadute: {
            name: 'Paracadute d\'Oro',
            desc: 'Inizi la nuova run conservando il 5% dei bug totali della run precedente.',
            baseCost: 25,
            isCounted: false
        },
        crunchTime: {
            name: 'Crunch Time',
            desc: 'Sblocca abilità attiva: x3 BPS per 30s (Cooldown 5m).',
            baseCost: 50,
            isCounted: false
        }
    },
    buildingEnhancements: {
        caffeDoppio: {
            name: 'Caffè Doppio', desc: 'Assistenti QA x2 BPS.',
            targetBuilding: 'assistenteQa', cost: 150, multiplier: 2, requiredCount: 1
        },
        caffeTriplo: {
            name: 'Caffè Triplo', desc: 'Assistenti QA x2 BPS.',
            targetBuilding: 'assistenteQa', cost: 750, multiplier: 2, requiredCount: 10
        },
        scrivanieErgonomiche: {
            name: 'Scrivanie Ergonomiche', desc: 'Assistenti QA x3 BPS.',
            targetBuilding: 'assistenteQa', cost: 5000, multiplier: 3, requiredCount: 25
        },
        formazioneAvanzata: {
            name: 'Formazione Avanzata', desc: 'Assistenti QA x3 BPS.',
            targetBuilding: 'assistenteQa', cost: 25000, multiplier: 3, requiredCount: 50
        },
        managerJunior: {
            name: 'Manager Junior', desc: 'Assistenti QA x4 BPS.',
            targetBuilding: 'assistenteQa', cost: 100000, multiplier: 4, requiredCount: 100
        },
        jiraAI: {
            name: 'Jira AI', desc: 'Jira Ticket x2 BPS.',
            targetBuilding: 'jiraTicket', cost: 1000, multiplier: 2, requiredCount: 1
        },
        jiraCloud: {
            name: 'Jira Cloud', desc: 'Jira Ticket x2 BPS.',
            targetBuilding: 'jiraTicket', cost: 5000, multiplier: 2, requiredCount: 10
        },
        jiraDataCenter: {
            name: 'Jira Data Center', desc: 'Jira Ticket x3 BPS.',
            targetBuilding: 'jiraTicket', cost: 40000, multiplier: 3, requiredCount: 25
        },
        jiraPremium: {
            name: 'Jira Premium', desc: 'Jira Ticket x3 BPS.',
            targetBuilding: 'jiraTicket', cost: 200000, multiplier: 3, requiredCount: 50
        },
        jiraSelfHealing: {
            name: 'Jira Self-Healing', desc: 'Jira Ticket x4 BPS.',
            targetBuilding: 'jiraTicket', cost: 1000000, multiplier: 4, requiredCount: 100
        },
        scrum: {
            name: 'Metodologia Scrum', desc: 'Team QA x2 BPS.',
            targetBuilding: 'teamQa', cost: 11000, multiplier: 2, requiredCount: 1
        },
        teamLeader: {
            name: 'Team Leader', desc: 'Team QA x2 BPS.',
            targetBuilding: 'teamQa', cost: 55000, multiplier: 2, requiredCount: 10
        },
        certificazioneISTQB: {
            name: 'Certificazione ISTQB', desc: 'Team QA x3 BPS.',
            targetBuilding: 'teamQa', cost: 440000, multiplier: 3, requiredCount: 25
        },
        bonusProduttivita: {
            name: 'Bonus Produttività', desc: 'Team QA x3 BPS.',
            targetBuilding: 'teamQa', cost: 2200000, multiplier: 3, requiredCount: 50
        },
        teamGlobale: {
            name: 'Team Globale 24/7', desc: 'Team QA x4 BPS.',
            targetBuilding: 'teamQa', cost: 11000000, multiplier: 4, requiredCount: 100
        },
        selenium: {
            name: 'Framework Selenium', desc: 'Automazione x2 BPS.',
            targetBuilding: 'automazioneTest', cost: 120000, multiplier: 2, requiredCount: 1
        },
        cucumber: {
            name: 'Cucumber (BDD)', desc: 'Automazione x2 BPS.',
            targetBuilding: 'automazioneTest', cost: 600000, multiplier: 2, requiredCount: 10
        },
        ciCd: {
            name: 'Pipeline CI/CD', desc: 'Automazione x3 BPS.',
            targetBuilding: 'automazioneTest', cost: 4800000, multiplier: 3, requiredCount: 25
        },
        docker: {
            name: 'Container Docker', desc: 'Automazione x3 BPS.',
            targetBuilding: 'automazioneTest', cost: 24000000, multiplier: 3, requiredCount: 50
        },
        kubernetes: {
            name: 'Orchestrazione Kubernetes', desc: 'Automazione x4 BPS.',
            targetBuilding: 'automazioneTest', cost: 120000000, multiplier: 4, requiredCount: 100
        },
        kanban: {
            name: 'Board Kanban', desc: 'Metodologia Agile x2 BPS.',
            targetBuilding: 'metodologiaAgile', cost: 1300000, multiplier: 2, requiredCount: 1
        },
        safe: {
            name: 'Framework SAFe', desc: 'Metodologia Agile x2 BPS.',
            targetBuilding: 'metodologiaAgile', cost: 6500000, multiplier: 2, requiredCount: 10
        },
        productOwner: {
            name: 'Product Owner Dedicato', desc: 'Metodologia Agile x3 BPS.',
            targetBuilding: 'metodologiaAgile', cost: 52000000, multiplier: 3, requiredCount: 25
        },
        releaseTrain: {
            name: 'Release Train', desc: 'Metodologia Agile x3 BPS.',
            targetBuilding: 'metodologiaAgile', cost: 260000000, multiplier: 3, requiredCount: 50
        },
        devOps: {
            name: 'Cultura DevOps', desc: 'Metodologia Agile x4 BPS.',
            targetBuilding: 'metodologiaAgile', cost: 1300000000, multiplier: 4, requiredCount: 100
        },
        deepLearning: {
            name: 'Deep Learning', desc: 'AI Debugger x2 BPS.',
            targetBuilding: 'aiDebugger', cost: 14000000, multiplier: 2, requiredCount: 1
        },
        machineLearning: {
            name: 'Machine Learning', desc: 'AI Debugger x2 BPS.',
            targetBuilding: 'aiDebugger', cost: 70000000, multiplier: 2, requiredCount: 10
        },
        retiNeurali: {
            name: 'Reti Neurali', desc: 'AI Debugger x3 BPS.',
            targetBuilding: 'aiDebugger', cost: 560000000, multiplier: 3, requiredCount: 25
        },
        quantumComputing: {
            name: 'Quantum Computing', desc: 'AI Debugger x3 BPS.',
            targetBuilding: 'aiDebugger', cost: 2800000000, multiplier: 3, requiredCount: 50
        },
        skynet: {
            name: 'Skynet', desc: 'AI Debugger x4 BPS.',
            targetBuilding: 'aiDebugger', cost: 14000000000, multiplier: 4, requiredCount: 100
        }
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
let crunchTimeMultiplier = 1; // 1 = normale, 3 = attivo
let crunchTimeEndTime = 0;    // Timestamp fine effetto
let crunchTimeCooldownEnd = 0; // Timestamp fine ricarica

var clickHistory = [];