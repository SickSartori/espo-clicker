window.gameData.achievements = {
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
        season: 'christmas',
        reward: { type: 'skin', id: 'christmas' },
        condition: () => IS_XMAS_TIME
    },

    madeInHeaven: {
        name: 'Made in Heaven',
        desc: 'Riavvia l\'universo per la prima volta.',
        flavor: 'Il tempo accelera verso un nuovo inizio.',
        type: 'custom',
        target: 1,
        isSecret: true, // Nascosto finché non lo fai
        reward: { type: 'multiplier', value: 1.10 }, // +10% Produzione Globale
        getCurrent: () => gameState.totalFormattazioni || 0,
        condition: () => gameState.totalFormattazioni >= 1
    },
    timeLord: {
        name: 'Signore del Tempo',
        desc: 'Esegui 5 Formattazioni del sistema.',
        flavor: 'Hai visto la fine e l\'inizio fin troppe volte.',
        type: 'custom',
        target: 5,
        isSecret: true, // Nascosto finché non lo fai
        reward: { type: 'multiplier', value: 1.25 }, // +25% Produzione Globale
        getCurrent: () => gameState.totalFormattazioni || 0,
        condition: () => gameState.totalFormattazioni >= 5
    },
    coscienzaEspansa: {
        name: 'Coscienza Espansa',
        desc: 'Possiedi 1 Singolarità Cosciente.',
        type: 'building',
        buildingId: 'singolaritaCosciente',
        target: 1,
        isSecret: false,
        reward: { type: 'prestige', value: new Decimal(25) },
        condition: () => gameState.teams.singolaritaCosciente.count >= 1
    },
    dioCodice: {
        name: 'Dio del Codice',
        desc: 'Possiedi 100 Architetture dell\'Infinito.',
        type: 'building',
        buildingId: 'architetturaInfinito',
        target: 100,
        isSecret: false,
        reward: { type: 'multiplier', value: 1.15 },
        condition: () => gameState.teams.architetturaInfinito.count >= 100
    },

    // ===== ACHIEVEMENT MEME (nerd & cultura pop) — v3.0 =====
    theAnswer: {
        name: 'La Risposta a Tutto',
        desc: 'Effettua 42 click manuali.',
        flavor: 'Quarantadue. La Domanda, però, resta sconosciuta.',
        type: 'click',
        target: 42,
        isSecret: true,
        reward: null,
        condition: () => gameState.totalClicks >= 42
    },
    over9000: {
        name: 'È OLTRE 9000!',
        desc: 'Supera i 9.000 Bug al secondo (BPS).',
        flavor: 'COSA?! NOVEMILA?!',
        type: 'custom',
        target: 9000,
        isSecret: true,
        reward: null,
        getCurrent: () => bps,
        condition: () => bps.gt(9000)
    },
    leetHaxor: {
        name: 'L33T H4X0R',
        desc: 'Raggiungi 1.337 click manuali.',
        flavor: "Sei ufficialmente d'élite. 0wn3d.",
        type: 'click',
        target: 1337,
        isSecret: false,
        reward: { type: 'bugs', value: new Decimal(1337) },
        condition: () => gameState.totalClicks >= 1337
    },
    shinyHunter: {
        name: 'Cromatico!',
        desc: 'Clicca il tuo primo Golden Bug.',
        flavor: 'Le probabilità? Trascurabili. La gloria? Eterna.',
        type: 'custom',
        target: 1,
        isSecret: false,
        reward: { type: 'bugs', value: new Decimal(5000) },
        getCurrent: () => gameState.totalGoldenBugsClicked || 0,
        condition: () => gameState.totalGoldenBugsClicked >= 1
    },
    comboBreaker: {
        name: 'C-C-COMBO BREAKER!',
        desc: 'Raggiungi una combo di 50 click.',
        flavor: 'Una voce metallica urla in lontananza.',
        type: 'custom',
        target: 50,
        isSecret: true,
        reward: null,
        getCurrent: () => gameState.longestCombo || 0,
        condition: () => (gameState.longestCombo || 0) >= 50
    },
    esposionUnlock: {
        name: 'Esposion!',
        desc: 'Raggiungi una combo di 150 click.',
        flavor: 'Tieni il ritmo finché Espo non regge più la pressione.',
        type: 'custom',
        target: 150,
        isSecret: false,
        reward: { type: 'skin', id: 'esposion' },
        getCurrent: () => gameState.longestCombo || 0,
        condition: () => (gameState.longestCombo || 0) >= 150
    },
    doge: {
        name: 'Such Bug, Much Wow',
        desc: 'Accumula 1 Milione di Bug totali.',
        flavor: 'wow. very click. so debug. much bug.',
        type: 'score',
        target: new Decimal(1000000),
        isSecret: false,
        reward: null,
        condition: () => gameState.totalScore.gte(1000000)
    },
    stonks: {
        name: 'STONKS',
        desc: 'Accumula 100 Milioni di Bug totali.',
        flavor: '↗ Solo crescita. Non chiedere come.',
        type: 'score',
        target: new Decimal(100000000),
        isSecret: false,
        reward: null,
        condition: () => gameState.totalScore.gte(100000000)
    },
    gottaGoFast: {
        name: 'Gotta Go Fast',
        desc: 'Supera i 1.000 Bug al secondo (BPS).',
        flavor: 'Un riccio blu annuisce con approvazione.',
        type: 'custom',
        target: 1000,
        isSecret: false,
        reward: null,
        getCurrent: () => bps,
        condition: () => bps.gt(1000)
    },
    shutUpTakeMoney: {
        name: 'Zitto e Prendi i Miei Soldi',
        desc: 'Possiedi 250 unità Team totali.',
        flavor: "Non m'importa se funziona. Lo voglio.",
        type: 'custom',
        target: 250,
        isSecret: false,
        reward: null,
        getCurrent: () => Object.values(gameState.teams).reduce((s, t) => s + (t.count || 0), 0),
        condition: () => Object.values(gameState.teams).reduce((s, t) => s + (t.count || 0), 0) >= 250
    },
    groundhogDay: {
        name: 'Ricomincio da Capo',
        desc: 'Esegui 10 Promozioni (reset).',
        flavor: 'Ancora? Ancora. ANCORA.',
        type: 'custom',
        target: 10,
        isSecret: false,
        reward: null,
        getCurrent: () => gameState.totalResets || 0,
        condition: () => (gameState.totalResets || 0) >= 10
    },
    quantumLeap: {
        name: 'Quantum Leap',
        desc: 'Accumula 50 Q-bits.',
        flavor: 'Oh boy.',
        type: 'custom',
        target: 50,
        isSecret: false,
        reward: null,
        getCurrent: () => gameState.qBits,
        condition: () => gameState.qBits.gte(50)
    },
    bugClicker: {
        name: 'Bug Clicker',
        desc: 'Raggiungi 100.000 click manuali.',
        flavor: 'Un omaggio al nonno di tutti i clicker.',
        type: 'click',
        target: 100000,
        isSecret: false,
        reward: { type: 'bugs', value: new Decimal(50000) },
        condition: () => gameState.totalClicks >= 100000
    },
    marioCastle: {
        name: 'La Principessa è in un Altro Castello',
        desc: 'Esegui la tua prima Promozione (reset).',
        flavor: 'Grazie per aver giocato! Adesso però si ricomincia.',
        type: 'custom',
        target: 1,
        isSecret: false,
        reward: null,
        getCurrent: () => gameState.totalResets || 0,
        condition: () => (gameState.totalResets || 0) >= 1
    },
    oneUp: {
        name: '1-UP!',
        desc: 'Clicca 100 Golden Bug.',
        flavor: 'Cento monete dorate, una vita in più.',
        type: 'custom',
        target: 100,
        isSecret: false,
        reward: { type: 'bugs', value: new Decimal(10000) },
        getCurrent: () => gameState.totalGoldenBugsClicked || 0,
        condition: () => gameState.totalGoldenBugsClicked >= 100
    },
    bazinga: {
        name: 'Bazinga!',
        desc: 'Accumula 73 Milioni di Bug totali.',
        flavor: '73: il 21º numero primo, e il migliore di tutti. Bazinga.',
        type: 'score',
        target: new Decimal(73000000),
        isSecret: true,
        reward: null,
        condition: () => gameState.totalScore.gte(73000000)
    },
    catchEmAll: {
        name: 'Acchiappali Tutti!',
        desc: 'Possiedi 151 unità di uno stesso Team.',
        flavor: 'Erano solo 151, ai bei vecchi tempi.',
        type: 'custom',
        target: 151,
        isSecret: false,
        reward: null,
        getCurrent: () => Object.values(gameState.teams).reduce((m, t) => Math.max(m, t.count || 0), 0),
        condition: () => Object.values(gameState.teams).some(t => (t.count || 0) >= 151)
    },
    imagination: {
        name: 'Imagination',
        desc: 'Sblocca 5 skin diverse.',
        flavor: '🌈 Im-ma-gi-na-zio-ne.',
        type: 'custom',
        target: 5,
        isSecret: false,
        reward: null,
        getCurrent: () => (gameState.skins.unlocked || []).length,
        condition: () => (gameState.skins.unlocked || []).length >= 5
    },
    moneyMoneyMoney: {
        name: 'Money Money Money',
        desc: 'Guadagna 10 Miliardi di Bug nel corso della vita (lifetime).',
        flavor: "Mr. Krabs ha sentito l'odore dei soldi.",
        type: 'score',
        target: new Decimal(10000000000),
        isSecret: false,
        reward: null,
        condition: () => gameState.lifetimeScore.gte(10000000000)
    },

    // ===== SBLOCCO SKIN v3.0 (Carmaespòn/Pablo/Leon ecc. comprate; queste guadagnate) =====
    pazienteZero: {
        name: 'Paziente Zero',
        desc: 'Raggiungi 250.000 click manuali.',
        flavor: 'Un click ti ha contagiato. Ora il contagio sei tu.',
        type: 'click',
        target: 250000,
        isSecret: false,
        reward: { type: 'skin', id: 'clicker' },
        condition: () => gameState.totalClicks >= 250000
    },
    rpdElite: {
        name: 'R.P.D. Elite',
        desc: 'Clicca 250 Golden Bug.',
        flavor: 'Polizia di Espoon City. Bug, fermi tutti.',
        type: 'custom',
        target: 250,
        isSecret: false,
        reward: { type: 'skin', id: 'leon' },
        getCurrent: () => gameState.totalGoldenBugsClicked || 0,
        condition: () => gameState.totalGoldenBugsClicked >= 250
    },
    esposaUnlock: {
        name: 'Finché Codice non ci Separi',
        desc: 'Gioca per 24 ore totali.',
        flavor: 'Un impegno serio. Col codice.',
        type: 'time',
        target: 86400,
        isSecret: false,
        reward: { type: 'skin', id: 'esposa' },
        condition: () => gameState.totalPlayTime >= 86400
    },
    collezionista: {
        name: 'Collezionista',
        desc: 'Sblocca 15 skin diverse.',
        flavor: 'La festa comincia quando le hai tutte.',
        type: 'custom',
        target: 15,
        isSecret: false,
        reward: { type: 'skin', id: 'mariachi' },
        getCurrent: () => (gameState.skins.unlocked || []).length,
        condition: () => (gameState.skins.unlocked || []).length >= 15
    }
}