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
            reward: { type: 'skin', id: 'christmas' },
            condition: () => IS_XMAS_TIME
        }
}   