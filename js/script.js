// Aggiunge un listener per assicurarsi che l'HTML sia caricato prima di eseguire lo script
document.addEventListener('DOMContentLoaded', () => {

    // --------- 1. DATI E STATO DEL GIOCO ---------
    
    let gameState = {
        score: 0,
        baseClickValue: 1,
        totalClicks: 0,
        totalScore: 0,
        prestigePoints: 0,
        totalResets: 0,
        totalGoldenBugsClicked: 0,
        totalPlayTime: 0,
        lifetimeScore: 0,
        
        user: {
            username: 'Giocatore',
            masterVolume: 1.0
        },
        
        buildings: {
            assistenteQa: { count: 0 },
            jiraTicket: { count: 0 },
            teamQa: { count: 0 },
            automazioneTest: { count: 0 },
            metodologiaAgile: { count: 0 },
            aiDebugger: { count: 0 }
        },
        clickUpgrades: {
            caffeForte: { purchased: false },
            tastieraErgonomica: { purchased: false },
            manoBionica: { purchased: false },
            hacking: { purchased: false },
            doppioClick: { purchased: false }, 
            clickAutomatico: { purchased: false }, 
            clickDivino: { purchased: false } 
        },
        prestigeUpgrades: {
            sinergia: { count: 0 },
            accelerazione: { purchased: false },
            ticketPremium: { purchased: false }
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

    // Dati statici (costi, nomi, ecc.)
    const gameData = {
        PRESTIGE_THRESHOLD: 1000000, // 1 Milione
        
        buildings: {
            assistenteQa:       { name: 'Assistente QA',       baseCost: 15,    cpsPerUnit: 0.1 },
            jiraTicket:         { name: 'Jira Ticket',         baseCost: 100,   cpsPerUnit: 1 },
            teamQa:             { name: 'Team QA',             baseCost: 1100,  cpsPerUnit: 8 },
            automazioneTest:    { name: 'Automazione Test',    baseCost: 12000, cpsPerUnit: 47 },
            metodologiaAgile:   { name: 'Metodologia Agile',   baseCost: 130000,cpsPerUnit: 260 },
            aiDebugger:         { name: 'AI Debugger',         baseCost: 1400000,cpsPerUnit: 1400 }
        },
        clickUpgrades: {
            caffeForte:           { name: 'Caffè Forte', desc: 'Aggiunge +1 al valore di ogni click.', cost: 100,  clickIncrease: 1, requiredClicks: 10 },
            tastieraErgonomica:   { name: 'Tastiera Ergonomica', desc: 'Aggiunge +5 al valore di ogni click.', cost: 500,  clickIncrease: 5, requiredClicks: 100 },
            manoBionica:          { name: 'Mano Bionica', desc: 'Ogni click guadagna anche l\'1% dei tuoi BPS.', cost: 10000, clickIncrease: 0, requiredClicks: 1000 },
            doppioClick:          { name: 'Doppio Click', desc: 'Raddoppia il valore base dei tuoi click.', cost: 50000, clickIncrease: 0, requiredClicks: 2500 },
            hacking:              { name: 'Hacking Etico', desc: 'Raddoppia la probabilità di trovare Ticket Critici.', cost: 100000, clickIncrease: 0, requiredClicks: 5000 },
            clickAutomatico:      { name: 'Click Automatico', desc: 'Aggiunge BPS pari al numero di Assistenti QA.', cost: 250000, clickIncrease: 0, requiredClicks: 10000 },
            clickDivino:          { name: 'Click Divino', desc: 'La Mano Bionica ora guadagna il 2% dei BPS.', cost: 1000000, clickIncrease: 0, requiredClicks: 50000 }
        },
        achievements: {
            primoClick:    { name: 'Primo Click!', desc: 'Hai risolto il tuo primo bug.', condition: () => gameState.totalClicks >= 1 },
            centoClick:    { name: 'Dita Veloci', desc: 'Risolvi 100 bug manually.', condition: () => gameState.totalClicks >= 100 },
            milleBug:      { name: 'Manager Serio', desc: 'Accumula 1.000 bug.', condition: () => gameState.score >= 1000 },
            primoAssistente: { name: 'Assunzione', desc: 'Compra il tuo primo Assistente QA.', condition: () => gameState.buildings.assistenteQa.count >= 1 },
            dieciAssistenti: { name: 'Piccolo Team', desc: 'Assumi 10 Assistenti QA.', condition: () => gameState.buildings.assistenteQa.count >= 10 },
            unJira:        { name: 'Organizzato', desc: 'Installa Jira.', condition: () => gameState.buildings.jiraTicket.count >= 1 },
            unodiTutto:    { name: 'Full Stack!', desc: 'Possiedi almeno uno di ogni strumento/team.', condition: () => {
                for(const key in gameState.buildings) {
                    if (gameState.buildings[key].count === 0) return false;
                }
                return true;
            }}
        },
        prestigeUpgrades: {
            sinergia: { name: 'Sinergia Manageriale', desc: 'Ogni punto promozione vale +0.1% in più.', baseCost: 1, bonusPerLevel: 0.001, isCounted: true },
            accelerazione: { name: 'Accelerazione Iniziale', desc: 'Inizia ogni nuova run con 1 Assistente QA gratuito.', baseCost: 2, isCounted: false },
            ticketPremium: { name: 'Ticket Premium', desc: 'I Ticket Critici appaiono 2 volte più spesso.', baseCost: 5, isCounted: false }
        },
        buildingEnhancements: {
            caffeDoppio: { name: 'Caffè Doppio', desc: 'Assistenti QA x2 BPS.',
                targetBuilding: 'assistenteQa', cost: 150, multiplier: 2, requiredCount: 1
            },
            caffeTriplo: { name: 'Caffè Triplo', desc: 'Assistenti QA x2 BPS.',
                targetBuilding: 'assistenteQa', cost: 750, multiplier: 2, requiredCount: 10
            },
            scrivanieErgonomiche: { name: 'Scrivanie Ergonomiche', desc: 'Assistenti QA x3 BPS.',
                targetBuilding: 'assistenteQa', cost: 5000, multiplier: 3, requiredCount: 25
            },
            formazioneAvanzata: { name: 'Formazione Avanzata', desc: 'Assistenti QA x3 BPS.',
                targetBuilding: 'assistenteQa', cost: 25000, multiplier: 3, requiredCount: 50
            },
            managerJunior: { name: 'Manager Junior', desc: 'Assistenti QA x4 BPS.',
                targetBuilding: 'assistenteQa', cost: 100000, multiplier: 4, requiredCount: 100
            },
            jiraAI: { name: 'Jira AI', desc: 'Jira Ticket x2 BPS.',
                targetBuilding: 'jiraTicket', cost: 1000, multiplier: 2, requiredCount: 1
            },
            jiraCloud: { name: 'Jira Cloud', desc: 'Jira Ticket x2 BPS.',
                targetBuilding: 'jiraTicket', cost: 5000, multiplier: 2, requiredCount: 10
            },
            jiraDataCenter: { name: 'Jira Data Center', desc: 'Jira Ticket x3 BPS.',
                targetBuilding: 'jiraTicket', cost: 40000, multiplier: 3, requiredCount: 25
            },
            jiraPremium: { name: 'Jira Premium', desc: 'Jira Ticket x3 BPS.',
                targetBuilding: 'jiraTicket', cost: 200000, multiplier: 3, requiredCount: 50
            },
            jiraSelfHealing: { name: 'Jira Self-Healing', desc: 'Jira Ticket x4 BPS.',
                targetBuilding: 'jiraTicket', cost: 1000000, multiplier: 4, requiredCount: 100
            },
            scrum: { name: 'Metodologia Scrum', desc: 'Team QA x2 BPS.',
                targetBuilding: 'teamQa', cost: 11000, multiplier: 2, requiredCount: 1
            },
            teamLeader: { name: 'Team Leader', desc: 'Team QA x2 BPS.',
                targetBuilding: 'teamQa', cost: 55000, multiplier: 2, requiredCount: 10
            },
            certificazioneISTQB: { name: 'Certificazione ISTQB', desc: 'Team QA x3 BPS.',
                targetBuilding: 'teamQa', cost: 440000, multiplier: 3, requiredCount: 25
            },
            bonusProduttivita: { name: 'Bonus Produttività', desc: 'Team QA x3 BPS.',
                targetBuilding: 'teamQa', cost: 2200000, multiplier: 3, requiredCount: 50
            },
            teamGlobale: { name: 'Team Globale 24/7', desc: 'Team QA x4 BPS.',
                targetBuilding: 'teamQa', cost: 11000000, multiplier: 4, requiredCount: 100
            },
            selenium: { name: 'Framework Selenium', desc: 'Automazione x2 BPS.',
                targetBuilding: 'automazioneTest', cost: 120000, multiplier: 2, requiredCount: 1
            },
            cucumber: { name: 'Cucumber (BDD)', desc: 'Automazione x2 BPS.',
                targetBuilding: 'automazioneTest', cost: 600000, multiplier: 2, requiredCount: 10
            },
            ciCd: { name: 'Pipeline CI/CD', desc: 'Automazione x3 BPS.',
                targetBuilding: 'automazioneTest', cost: 4800000, multiplier: 3, requiredCount: 25
            },
            docker: { name: 'Container Docker', desc: 'Automazione x3 BPS.',
                targetBuilding: 'automazioneTest', cost: 24000000, multiplier: 3, requiredCount: 50
            },
            kubernetes: { name: 'Orchestrazione Kubernetes', desc: 'Automazione x4 BPS.',
                targetBuilding: 'automazioneTest', cost: 120000000, multiplier: 4, requiredCount: 100
            },
            kanban: { name: 'Board Kanban', desc: 'Metodologia Agile x2 BPS.',
                targetBuilding: 'metodologiaAgile', cost: 1300000, multiplier: 2, requiredCount: 1
            },
            safe: { name: 'Framework SAFe', desc: 'Metodologia Agile x2 BPS.',
                targetBuilding: 'metodologiaAgile', cost: 6500000, multiplier: 2, requiredCount: 10
            },
            productOwner: { name: 'Product Owner Dedicato', desc: 'Metodologia Agile x3 BPS.',
                targetBuilding: 'metodologiaAgile', cost: 52000000, multiplier: 3, requiredCount: 25
            },
            releaseTrain: { name: 'Release Train', desc: 'Metodologia Agile x3 BPS.',
                targetBuilding: 'metodologiaAgile', cost: 260000000, multiplier: 3, requiredCount: 50
            },
            devOps: { name: 'Cultura DevOps', desc: 'Metodologia Agile x4 BPS.',
                targetBuilding: 'metodologiaAgile', cost: 1300000000, multiplier: 4, requiredCount: 100
            },
            deepLearning: { name: 'Deep Learning', desc: 'AI Debugger x2 BPS.',
                targetBuilding: 'aiDebugger', cost: 14000000, multiplier: 2, requiredCount: 1
            },
            machineLearning: { name: 'Machine Learning', desc: 'AI Debugger x2 BPS.',
                targetBuilding: 'aiDebugger', cost: 70000000, multiplier: 2, requiredCount: 10
            },
            retiNeurali: { name: 'Reti Neurali', desc: 'AI Debugger x3 BPS.',
                targetBuilding: 'aiDebugger', cost: 560000000, multiplier: 3, requiredCount: 25
            },
            quantumComputing: { name: 'Quantum Computing', desc: 'AI Debugger x3 BPS.',
                targetBuilding: 'aiDebugger', cost: 2800000000, multiplier: 3, requiredCount: 50
            },
            skynet: { name: 'Skynet', desc: 'AI Debugger x4 BPS.',
                targetBuilding: 'aiDebugger', cost: 14000000000, multiplier: 4, requiredCount: 100
            }
        }
    };

    // Variabili calcolate (non salvate)
    let cookiesPerSecond = 0;
    let prestigeBonus = 0;
    let isBluescreenActive = false;
    let bluescreenMultiplier = 1;
    let goldenBugChance = 0.001; 
    let goldenBugSpawnTime = 60000 + Math.random() * 120000; 

    // --------- 2. RIFERIMENTI AGLI ELEMENTI HTML ---------
    const clickerButton = document.getElementById('clicker-btn');
    const scoreDisplay = document.getElementById('score-display');
    const cpsDisplay = document.getElementById('cps-display');
    const feedbackContainer = document.getElementById('click-feedback-container');
    const achievementList = document.getElementById('achievement-list');
    const toastContainer = document.getElementById('toast-container');
    const goldenBug = document.getElementById('golden-bug');
    const gameContainer = document.getElementById('game-container');
    const soundBluescreen = document.getElementById('sound-bluescreen');
    
    // Riferimenti Prestigio
    const prestigeSection = document.getElementById('prestige-section');
    const prestigePointsDisplay = document.getElementById('prestige-points-display');
    const prestigeGainDisplay = document.getElementById('prestige-gain-display');
    const prestigeBtn = document.getElementById('prestige-btn');
    const prestigeBonusDisplay = document.getElementById('prestige-bonus-display');
    const eventMultiplierDisplay = document.getElementById('event-multiplier-display');
    
    // Riferimenti Negozi (Destra)
    const storeNav = document.getElementById('store-nav');
    const storeContent = document.getElementById('store-content');
    const allStoreTabs = document.querySelectorAll('.store-tab-btn');
    const allStoreSections = document.querySelectorAll('#store-content .store-section');
    
    const prestigeStore = document.getElementById('prestige-store');
    const enhancementStoreSection = document.getElementById('enhancement-store');
    const enhancementList = document.getElementById('enhancement-list');
    const clickUpgradeList = document.getElementById('click-upgrade-list');
    
    // Riferimenti Colonne Principali
    const leftColumn = document.getElementById('left-column');
    const rightColumn = document.getElementById('right-column');
    const statsList = document.getElementById('stats-list'); 
    
    // Riferimenti Modali
    const openAchievementsBtn = document.getElementById('open-achievements-btn');
    const openStatsBtn = document.getElementById('open-stats-btn');
    const openSettingsBtn = document.getElementById('open-settings-btn'); 
    const achievementsModal = document.getElementById('achievements-modal');
    const statsModal = document.getElementById('stats-modal');
    const settingsModal = document.getElementById('settings-modal'); 
    const allModals = document.querySelectorAll('.modal-backdrop');
    
    // Riferimenti Impostazioni
    const usernameInput = document.getElementById('username-input');
    const volumeSlider = document.getElementById('volume-slider');
    const volumeDisplay = document.getElementById('volume-display');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const deleteSaveBtn = document.getElementById('delete-save-btn');
    
    // Riferimenti Login Modale
    const loginModal = document.getElementById('login-modal');
    const loginButton = document.getElementById('login-btn');
    const loginInput = document.getElementById('login-username-input');


    // --------- 3. FUNZIONI AUDIO ---------
    function playSound(id) {
        try {
            const sound = document.getElementById(id);
            sound.volume = gameState.user.masterVolume; // Applica volume
            sound.currentTime = 0;
            sound.play();
        } catch (e) {
            // console.warn("Impossibile riprodurre il suono:", id);
        }
    }

    // --------- 4. FUNZIONI DI GIOCO PRINCIPALI ---------

    function formatNumber(num) {
        return Math.floor(num).toLocaleString('it-IT');
    }

    function formatTime(totalSeconds) {
        totalSeconds = Math.floor(totalSeconds);
        const days = Math.floor(totalSeconds / (3600 * 24));
        totalSeconds %= (3600 * 24);
        const hours = Math.floor(totalSeconds / 3600);
        totalSeconds %= 3600;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        let timeString = "";
        if (days > 0) timeString += `${days}g `;
        if (hours > 0 || days > 0) timeString += `${hours}h `;
        if (minutes > 0 || hours > 0 || days > 0) timeString += `${minutes}m `;
        timeString += `${seconds}s`;
        
        return timeString;
    }
    
    function calculateBuildingCost(buildingKey) {
        const data = gameData.buildings[buildingKey];
        const state = gameState.buildings[buildingKey];
        return Math.floor(data.baseCost * Math.pow(1.15, state.count));
    }
    
    function calculatePrestigeBonus() {
        const pData = gameData.prestigeUpgrades;
        const pState = gameState.prestigeUpgrades;
        
        let baseBonus = gameState.prestigePoints * 0.01;
        let synergyBonus = pState.sinergia.count * pData.sinergia.bonusPerLevel * gameState.prestigePoints;
        
        prestigeBonus = 1 + baseBonus + synergyBonus;
    }
    
    function recalculateCPS() {
        let baseCPS = 0;
        
        for (const key in gameState.buildings) {
            const state = gameState.buildings[key];
            const data = gameData.buildings[key];
            
            let buildingBPS = state.count * data.cpsPerUnit;

            for (const enhanceKey in gameState.buildingEnhancements) {
                const enhancementState = gameState.buildingEnhancements[enhanceKey];
                const enhancementData = gameData.buildingEnhancements[enhanceKey];
                
                if (enhancementState.purchased && enhancementData.targetBuilding === key) {
                    buildingBPS *= enhancementData.multiplier;
                }
            }
            baseCPS += buildingBPS;
        }
        
        if (gameState.clickUpgrades.clickAutomatico.purchased) {
            baseCPS += gameState.buildings.assistenteQa.count; 
        }
        
        cookiesPerSecond = baseCPS * prestigeBonus * bluescreenMultiplier;
    }

    function showClickFeedback(event) {
        const feedback = document.createElement('span');
        feedback.className = 'click-feedback';

        let currentChance = 0.01; 
        const scoreString = Math.floor(gameState.score).toString();
        const clicksString = gameState.totalClicks.toString();
        if (scoreString.includes('404') || clicksString.includes('404')) {
            currentChance *= 2;
        }

        if (Math.random() < currentChance && !isBluescreenActive && gameState.score >= 404) { 
            feedback.textContent = '404 Bug Not Found';
            feedback.style.color = '#facc15';
            feedback.style.fontSize = '1rem';
            
            let dynamicMultiplier = 2;
            if (gameState.totalScore >= 100000000) { 
                dynamicMultiplier = 3;
            } else if (gameState.totalScore >= 1000000) {
                dynamicMultiplier = 2.5;
            }
            triggerBluescreen(dynamicMultiplier);
        } else {
            let clickBonusPercent = 0.01;
            if (gameState.clickUpgrades.clickDivino.purchased) {
                clickBonusPercent = 0.02;
            }
            
            const currentClickValue = (gameState.baseClickValue * prestigeBonus * bluescreenMultiplier) + 
                                  (gameState.clickUpgrades.manoBionica.purchased ? (cookiesPerSecond * clickBonusPercent) : 0);
                                  
            feedback.textContent = `+${formatNumber(currentClickValue)}`;
        }
        
        const rect = feedbackContainer.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        feedback.style.left = `${x + (Math.random() - 0.5) * 40}px`;
        feedback.style.top = `${y + (Math.random() - 0.5) * 40}px`;

        feedbackContainer.appendChild(feedback);
        
        setTimeout(() => feedback.remove(), 1500);
    }
    
    function triggerBluescreen(multiplier) {
        isBluescreenActive = true;
        bluescreenMultiplier = multiplier;
        document.body.classList.add('bluescreen-active');
        recalculateCPS();
        
        eventMultiplierDisplay.textContent = `ERRORE DI SISTEMA! x${multiplier}!`;
        eventMultiplierDisplay.style.display = 'block';

        playSound('sound-bluescreen'); 

        setTimeout(() => {
            isBluescreenActive = false;
            bluescreenMultiplier = 1;
            document.body.classList.remove('bluescreen-active');
            eventMultiplierDisplay.style.display = 'none'; 
            recalculateCPS();
            try {
                soundBluescreen.pause(); 
                soundBluescreen.currentTime = 0;
            } catch(e) { /* fallisce silenziosamente */ }
        }, 30000);
    }


    function clickCookie(event) {
        playSound('sound-click');
        
        let clickBonusPercent = 0.01;
        if (gameState.clickUpgrades.clickDivino.purchased) {
            clickBonusPercent = 0.02;
        }
        
        let clickValuePercentBonus = 0;
        if (gameState.clickUpgrades.manoBionica.purchased) {
            clickValuePercentBonus = (cookiesPerSecond / (prestigeBonus * bluescreenMultiplier)) * clickBonusPercent; 
        }
        
        const currentClickValue = (gameState.baseClickValue * prestigeBonus * bluescreenMultiplier) + clickValuePercentBonus;
        
        gameState.score += currentClickValue;
        gameState.totalScore += currentClickValue;
        gameState.lifetimeScore += currentClickValue;
        gameState.totalClicks++;
        
        showClickFeedback(event);
        
        clickerButton.classList.add('clicked');
        setTimeout(() => {
            clickerButton.classList.remove('clicked');
        }, 100);

        updateUI();
    }

    function buyBuilding(buildingKey) {
        const state = gameState.buildings[buildingKey];
        const currentCost = calculateBuildingCost(buildingKey);

        if (gameState.score >= currentCost) {
            playSound('sound-buy');
            gameState.score -= currentCost;
            state.count++;
            recalculateCPS();
            updateUI();
        }
    }
    
    function buyClickUpgrade(upgradeKey) {
        const state = gameState.clickUpgrades[upgradeKey];
        const data = gameData.clickUpgrades[upgradeKey];
        
        if (gameState.score >= data.cost && !state.purchased) {
            playSound('sound-buy');
            gameState.score -= data.cost;
            gameState.baseClickValue += data.clickIncrease;
            
            if (upgradeKey === 'hacking') {
                goldenBugChance *= 2;
            }
            if (upgradeKey === 'doppioClick') {
                gameState.baseClickValue *= 2;
            }
            if (upgradeKey === 'clickAutomatico') {
                recalculateCPS();
            }
            
            state.purchased = true;
            updateUI();
        }
    }
    
    function buyBuildingEnhancement(enhanceKey) {
        const state = gameState.buildingEnhancements[enhanceKey];
        const data = gameData.buildingEnhancements[enhanceKey];

        if (gameState.score >= data.cost && !state.purchased) {
            playSound('sound-buy');
            gameState.score -= data.cost;
            state.purchased = true;
            recalculateCPS();
            updateUI();
        }
    }
    
    function buyPrestigeUpgrade(upgradeKey) {
        const state = gameState.prestigeUpgrades[upgradeKey];
        const data = gameData.prestigeUpgrades[upgradeKey];
        const cost = data.baseCost;

        if (data.isCounted) {
             if (gameState.prestigePoints >= cost) {
                playSound('sound-buy');
                gameState.prestigePoints -= cost;
                state.count++;
                calculatePrestigeBonus();
                recalculateCPS();
                updateUI();
            }
        } else {
            if (gameState.prestigePoints >= cost && !state.purchased) {
                playSound('sound-buy');
                gameState.prestigePoints -= cost;
                state.purchased = true;
                
                if (upgradeKey === 'ticketPremium') {
                    goldenBugSpawnTime *= 0.5; 
                }
                
                calculatePrestigeBonus();
                recalculateCPS();
                updateUI();
            }
        }
    }
    
    // --------- 5. FUNZIONI DI PRESTIGIO ---------

    function calculatePrestigeGained() {
        return Math.floor(Math.sqrt(gameState.totalScore / 1000000) * 1.5);
    }

    async function performPrestige() {
        const gained = calculatePrestigeGained();
        if (gained < 1) {
            alert("Non guadagneresti nessun Punto Promozione. Continua a produrre!");
            return;
        }

        if (confirm(`Sei sicuro di voler resettare?
Guadagnerai ${gained} Punti Promozione.
Perderai tutti i bug, strumenti, e potenziamenti click, ma manterrai i tuoi obiettivi, punti e potenziamenti promozione.`)) {
            
            // RIMOSSO INVIO AL PODIO DA QUI
            
            let newPrestigePoints = gameState.prestigePoints + gained;
            let oldAchievements = gameState.achievements;
            let oldPrestigeUpgrades = gameState.prestigeUpgrades;
            let oldTotalResets = gameState.totalResets + 1;
            let oldGoldenBugs = gameState.totalGoldenBugsClicked;
            let oldPlayTime = gameState.totalPlayTime;
            let oldLifetimeScore = gameState.lifetimeScore;
            let oldUser = gameState.user; 
            
            let newState = createNewGameState(); 
            
            newState.prestigePoints = newPrestigePoints;
            newState.achievements = oldAchievements;
            newState.prestigeUpgrades = oldPrestigeUpgrades;
            newState.totalResets = oldTotalResets;
            newState.totalGoldenBugsClicked = oldGoldenBugs;
            newState.totalPlayTime = oldPlayTime;
            newState.lifetimeScore = oldLifetimeScore;
            newState.user = oldUser; 
            
            if (newState.prestigeUpgrades.accelerazione.purchased) {
                newState.buildings.assistenteQa.count = 1;
            }
            
            gameState = newState;
            
            saveGame();
            location.reload();
        }
    }
    
    async function submitScoreToLeaderboard(username, score, prestigeLevel) {
        if (score < 1000) return; // Non invia punteggi bassi

        try {
            const response = await fetch('./php/submit_score.php', { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: username,
                    score: Math.floor(score),
                    prestigeLevel: prestigeLevel // Invia anche il livello
                })
            });
            if (response.ok) {
                console.log("Punteggio inviato al Podio!");
            } else {
                throw new Error('Risposta negativa dal server');
            }
        } catch (error) {
            console.error("Impossibile inviare il punteggio al podio:", error);
            // Non mostrare un toast qui per non infastidire l'utente ogni 5 min
        }
    }
    
    function createNewGameState() {
        return {
            score: 0,
            baseClickValue: 1,
            totalClicks: 0,
            totalScore: 0,
            prestigePoints: 0,
            totalResets: 0,
            totalGoldenBugsClicked: 0,
            totalPlayTime: 0,
            lifetimeScore: 0,
            user: { username: 'Giocatore', masterVolume: 1.0 },
            buildings: {
                assistenteQa: { count: 0 }, jiraTicket: { count: 0 },
                teamQa: { count: 0 }, automazioneTest: { count: 0 },
                metodologiaAgile: { count: 0 }, aiDebugger: { count: 0 }
            },
            clickUpgrades: {
                caffeForte: { purchased: false }, tastieraErgonomica: { purchased: false },
                manoBionica: { purchased: false }, hacking: { purchased: false },
                doppioClick: { purchased: false }, clickAutomatico: { purchased: false },
                clickDivino: { purchased: false }
            },
            prestigeUpgrades: {
                sinergia: { count: 0 },
                accelerazione: { purchased: false },
                ticketPremium: { purchased: false }
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
            achievements: gameState.achievements
        };
    }
    
    // --------- 6. FUNZIONI DI AGGIORNAMENTO UI ---------

    function updateUI() {
        // 1. Aggiorna Punteggio e BPS
        scoreDisplay.textContent = formatNumber(gameState.score);
        cpsDisplay.textContent = `BPS: ${cookiesPerSecond.toFixed(1).replace('.', ',')}`;

        // 2. Aggiorna gli Edifici (sempre, per i requisiti)
        for (const key in gameState.buildings) {
            const currentCost = calculateBuildingCost(key);
            
            let buildingBPS = gameData.buildings[key].cpsPerUnit;
            for (const enhanceKey in gameState.buildingEnhancements) {
                const eData = gameData.buildingEnhancements[enhanceKey];
                if (eData.targetBuilding === key && gameState.buildingEnhancements[enhanceKey].purchased) {
                    buildingBPS *= eData.multiplier;
                }
            }
            
            document.getElementById(`name-${key}`).textContent = gameData.buildings[key].name;
            document.getElementById(`cost-${key}`).textContent = `Costo: ${formatNumber(currentCost)}`;
            document.getElementById(`bps-${key}`).textContent = `+${(buildingBPS * prestigeBonus * bluescreenMultiplier).toFixed(1).replace('.', ',')} BPS cad.`;
            document.getElementById(`count-${key}`).textContent = gameState.buildings[key].count;
            document.getElementById(`buy-${key}`).disabled = (gameState.score < currentCost);
        }
        
        // 3. Aggiorna i Potenziamenti Click (sempre, per i requisiti)
         updateClickStore();
        
        // 4. Aggiorna UI Prestigio (sempre, per i requisiti)
        updatePrestigeUI();
        
        // 5. Aggiorna UI Migliorie (sempre, per i requisiti)
        updateEnhancementStore();
        
        // 6. Aggiorna UI Statistiche (solo se la scheda è attiva)
        if (statsModal.style.display === 'flex') {
            updateStatsUI();
        }
    }
    
    function updatePrestigeUI() {
        if (gameState.totalScore >= gameData.PRESTIGE_THRESHOLD) {
            prestigeSection.style.display = 'block';
        } else {
             prestigeSection.style.display = 'none';
        }
        
        if (gameState.prestigePoints > 0) {
            prestigeStore.style.display = 'block'; 
        } else {
            prestigeStore.style.display = 'none';
        }
        
        let baseBonus = gameState.prestigePoints * 0.01;
        let synergyBonus = gameState.prestigeUpgrades.sinergia.count * gameData.prestigeUpgrades.sinergia.bonusPerLevel * gameState.prestigePoints;
        let totalBonusPercent = (baseBonus + synergyBonus) * 100;
        
        prestigeBonusDisplay.style.display = (totalBonusPercent > 0) ? 'block' : 'none';
        prestigeBonusDisplay.textContent = `Bonus: +${totalBonusPercent.toFixed(1)}%`;
        
        prestigePointsDisplay.textContent = gameState.prestigePoints;
        prestigeGainDisplay.textContent = calculatePrestigeGained();
        
        // Sinergia (a conteggio)
        const pDataS = gameData.prestigeUpgrades.sinergia;
        const pStateS = gameState.prestigeUpgrades.sinergia;
        document.getElementById('cost-sinergia').textContent = `${pDataS.baseCost} PP`;
        document.getElementById('count-sinergia').textContent = pStateS.count;
        document.getElementById('buy-sinergia').disabled = (gameState.prestigePoints < pDataS.baseCost);
        
        // Accelerazione (acquisto singolo)
        const pDataA = gameData.prestigeUpgrades.accelerazione;
        const pStateA = gameState.prestigeUpgrades.accelerazione;
        const btnA = document.getElementById('buy-accelerazione');
        document.getElementById('cost-accelerazione').textContent = `${pDataA.baseCost} PP`;
        if (pStateA.purchased) {
            btnA.textContent = 'Acquistato';
            btnA.disabled = true;
        } else {
            btnA.disabled = (gameState.prestigePoints < pDataA.baseCost);
        }
        
        // Ticket Premium (acquisto singolo)
        const pDataT = gameData.prestigeUpgrades.ticketPremium;
        const pStateT = gameState.prestigeUpgrades.ticketPremium;
        const btnT = document.getElementById('buy-ticketPremium');
        document.getElementById('cost-ticketPremium').textContent = `${pDataT.baseCost} PP`;
        if (pStateT.purchased) {
            btnT.textContent = 'Acquistato';
            btnT.disabled = true;
        } else {
            btnT.disabled = (gameState.prestigePoints < pDataT.baseCost);
        }
    }
    
    // FUNZIONE ANTI-FLICKER
    function updateEnhancementStore() {
        let storeHasItems = false;
        
        for (const key in gameData.buildingEnhancements) {
            const data = gameData.buildingEnhancements[key];
            const state = gameState.buildingEnhancements[key];
            const targetBuilding = gameState.buildings[data.targetBuilding];
            
            const el = document.getElementById(`enh-upgrade-${key}`);
            if (!el) continue; 

            if (!state.purchased && targetBuilding.count >= data.requiredCount) {
                storeHasItems = true;
                const canBuy = gameState.score >= data.cost;
                
                el.style.display = 'flex';
                el.querySelector('.buy-btn').disabled = !canBuy;
                
            } else {
                el.style.display = 'none';
            }
        }
        
        enhancementStoreSection.style.display = storeHasItems ? 'block' : 'none';
    }
    
    // FUNZIONE ANTI-FLICKER
    function updateClickStore() {
        for (const key in gameData.clickUpgrades) {
            const data = gameData.clickUpgrades[key];
            const state = gameState.clickUpgrades[key];

            const el = document.getElementById(`click-upgrade-${key}`);
            if (!el) continue;

            if (!state.purchased && gameState.totalClicks >= data.requiredClicks) {
                const canBuy = gameState.score >= data.cost;
                
                el.style.display = 'flex';
                el.querySelector('.buy-btn').disabled = !canBuy;
                el.querySelector('.buy-btn').textContent = 'Compra';
                el.querySelector('.upgrade-cost').textContent = `Costo: ${formatNumber(data.cost)} bug`;
                el.classList.remove('purchased');
                
            } else if (state.purchased) {
                el.style.display = 'flex';
                el.querySelector('.buy-btn').disabled = true;
                el.querySelector('.buy-btn').textContent = 'Acquistato';
                el.querySelector('.upgrade-cost').textContent = '✅ Posseduto';
                el.classList.add('purchased');
            } else {
                el.style.display = 'none';
            }
        }
    }

    function updateStatsUI() {
        statsList.innerHTML = `
            <div class="stat-item">
                <span class="stat-label">Tempo di gioco totale</span>
                <span class="stat-value">${formatTime(gameState.totalPlayTime)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Bug (Run attuale)</span>
                <span class="stat-value">${formatNumber(gameState.totalScore)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Bug (Totali di sempre)</span>
                <span class="stat-value">${formatNumber(gameState.lifetimeScore)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Click totali</span>
                <span class="stat-value">${formatNumber(gameState.totalClicks)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Ticket Critici cliccati</span>
                <span class="stat-value">${formatNumber(gameState.totalGoldenBugsClicked)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Promozioni effettuate</span>
                <span class="stat-value">${formatNumber(gameState.totalResets)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Punti Promozione</span>
                <span class="stat-value">${formatNumber(gameState.prestigePoints)}</span>
            </div>
        `;
    }

    // --------- 7. LOOP DI GIOCO E OBIETTIVI ---------

    setInterval(() => {
        gameState.totalPlayTime += 1;
    }, 1000);

    function gameLoop() {
        const scoreToAdd = cookiesPerSecond / 10;
        gameState.score += scoreToAdd;
        gameState.totalScore += scoreToAdd;
        gameState.lifetimeScore += scoreToAdd;
        
        checkAchievements();
        updateUI();
    }

    function checkAchievements() {
        for (const key in gameData.achievements) {
            const data = gameData.achievements[key];
            const state = gameState.achievements[key];
            if (!state.unlocked && data.condition()) {
                unlockAchievement(key);
            }
        }
    }

    function unlockAchievement(key) {
        playSound('sound-achievement');
        gameState.achievements[key].unlocked = true;
        showToast(`Obiettivo Sbloccato: ${gameData.achievements[key].name}`);
        renderAchievement(key);
    }
    
    function renderAchievement(key) {
        const data = gameData.achievements[key];
        const achElement = document.createElement('div');
        achElement.className = 'achievement unlocked';
        achElement.id = `ach-${key}`;
        achElement.innerHTML = `
            <div class="achievement-name">${data.name}</div>
            <div class="achievement-desc">${data.desc}</div>`;
        achievementList.prepend(achElement);
    }
    
    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        toastContainer.appendChild(toast);
        
        setTimeout(() => toast.remove(), 3500); 
    }

    // --------- 8. TICKET CRITICO (GOLDEN BUG) ---------
    
    let goldenBugTimer; 
    
    function scheduleGoldenBug() {
        if (goldenBugTimer) clearTimeout(goldenBugTimer);
        
        const nextSpawnTime = goldenBugSpawnTime + Math.random() * goldenBugSpawnTime;
        goldenBugTimer = setTimeout(spawnGoldenBug, nextSpawnTime);
    }

    function spawnGoldenBug() {
        goldenBug.style.display = 'none';
        const rect = gameContainer.getBoundingClientRect();
        
        const spawnWidth = document.getElementById('left-column').clientWidth + document.getElementById('center-column').clientWidth;
        const spawnHeight = document.getElementById('left-column').clientHeight;
        
        const x = Math.random() * (spawnWidth - 50); 
        const y = Math.random() * (spawnHeight - 50);

        goldenBug.style.left = `${rect.left + x}px`;
        goldenBug.style.top = `${rect.top + y}px`;
        goldenBug.style.display = 'block';

        setTimeout(() => {
            goldenBug.style.display = 'none';
        }, 10000); 
        
        scheduleGoldenBug(); 
    }

    function clickGoldenBug() {
        playSound('sound-achievement');
        gameState.totalGoldenBugsClicked++;
        
        let clickBonusPercent = 0.01;
        if (gameState.clickUpgrades.clickDivino.purchased) {
            clickBonusPercent = 0.02;
        }
        
        let clickValuePercentBonus = 0;
        if (gameState.clickUpgrades.manoBionica.purchased) {
            clickValuePercentBonus = (cookiesPerSecond / (prestigeBonus * bluescreenMultiplier)) * clickBonusPercent;
        }
        const currentClickValue = (gameState.baseClickValue * prestigeBonus * bluescreenMultiplier) + clickValuePercentBonus;
        
        const bonus = (cookiesPerSecond * 30) + (currentClickValue * 10) + 10;
        gameState.score += bonus;
        gameState.totalScore += bonus;
        gameState.lifetimeScore += bonus;
        
        showToast(`Ticket Critico Risolto! +${formatNumber(bonus)} bug!`);
        goldenBug.style.display = 'none';
        updateUI();
    }


    // --------- 9. SALVATAGGIO E CARICAMENTO ---------
    
    const SAVE_KEY = 'espotoolClickerSaveV8'; 

    function saveGame() {
        localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
    }
    
    function loadGame() {
        const savedState = localStorage.getItem(SAVE_KEY);
        
        if (savedState) {
            try {
                const parsedState = JSON.parse(savedState);
                deepMerge(gameState, parsedState);
                
            } catch (e) {
                console.error("Errore nel caricamento del salvataggio:", e);
            }
        }
        
        // Carica il nome utente salvato separatamente (per il login)
        const savedUsername = localStorage.getItem('espooClickerUsername');
        if (savedUsername) {
            gameState.user.username = savedUsername;
        }
        
        calculatePrestigeBonus();
        recalculateCPS();
        
        if (gameState.clickUpgrades.hacking.purchased) {
            goldenBugChance *= 2;
        }
        if (gameState.prestigeUpgrades.ticketPremium.purchased) {
            goldenBugSpawnTime *= 0.5;
        }
        
        for (const key in gameState.achievements) {
            if (gameState.achievements[key].unlocked) {
                renderAchievement(key);
            }
        }
    }
    
    function deepMerge(target, source) {
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (source[key] instanceof Object && !Array.isArray(source[key]) && target[key]) {
                    deepMerge(target[key], source[key]);
                } else if (target.hasOwnProperty(key)) {
                    target[key] = source[key];
                }
            }
        }
    }

    // --------- 10. FUNZIONI MODALI E IMPOSTAZIONI (ORA INCLUSE QUI) ---------

    function openSettingsModal() {
        // Carica i valori attuali nel modale
        // usernameInput.value = gameState.user.username; // Rimosso
        volumeSlider.value = gameState.user.masterVolume;
        volumeDisplay.textContent = Math.round(gameState.user.masterVolume * 100);
        settingsModal.style.display = 'flex';
    }
    
    function updateVolume() {
        gameState.user.masterVolume = volumeSlider.value;
        volumeDisplay.textContent = Math.round(volumeSlider.value * 100);
        // Applica il volume a tutti i suoni
        document.querySelectorAll('audio').forEach(audio => {
            audio.volume = gameState.user.masterVolume;
        });
        playSound('sound-buy'); // Suona un "ding" per testare il volume
    }
    
    function saveSettings() {
        // gameState.user.username = usernameInput.value || 'Giocatore'; // Rimosso
        gameState.user.masterVolume = parseFloat(volumeSlider.value); // Assicura che sia un numero
        saveGame();
        showToast('Impostazioni salvate!');
        settingsModal.style.display = 'none';
    }
    
    async function deleteSave() {
        if (confirm('SEI SICURO? Questa azione è irreversibile e cancellerà tutti i tuoi progressi, inclusi Punti Promozione e Obiettivi.')) {
            if (confirm('CONFERMA DEFINITIVA. Vuoi davvero cancellare tutto?')) {
                
                // Chiama il PHP per cancellare i punteggi dal podio
                try {
                    await fetch('./php/delete_user.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username: gameState.user.username })
                    });
                } catch (e) {
                    console.error("Impossibile cancellare i punteggi sul server:", e);
                }
                
                // Cancella i dati locali
                localStorage.removeItem(SAVE_KEY);
                localStorage.removeItem('espooClickerUsername'); // Rimuove l'utente
                
                showToast('Salvataggio cancellato. Riavvio in corso...');
                settingsModal.style.display = 'none';
                
                setTimeout(() => {
                    location.reload(true);
                }, 1000); 
            }
        }
    }

    // --------- 11. EASTER EGG E INIZIALIZZAZIONE ---------

    let originalTitle = document.title;
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            document.title = 'I bug si accumulano... 🐞';
        } else {
            document.title = originalTitle;
        }
    });

    // FUNZIONE ANTI-FLICKER
    function buildStores() {
        for (const key in gameData.clickUpgrades) {
            const data = gameData.clickUpgrades[key];
            const el = document.createElement('div');
            el.className = 'click-upgrade';
            el.id = `click-upgrade-${key}`;
            el.style.display = 'none';
            
            el.innerHTML = `
                <div class="upgrade-details">
                    <span class="upgrade-name">${data.name}</span>
                    <div class="upgrade-desc">${data.desc}</div>
                    <div class="upgrade-cost">Costo: ${formatNumber(data.cost)} bug</div>
                </div>
                <button class="buy-btn buy-click-btn" data-upgrade-name="${key}">Compra</button>
            `;
            clickUpgradeList.appendChild(el);
        }
        
        for (const key in gameData.buildingEnhancements) {
            const data = gameData.buildingEnhancements[key];
            const el = document.createElement('div');
            el.className = 'enhancement-upgrade';
            el.id = `enh-upgrade-${key}`;
            el.style.display = 'none';
            
            el.innerHTML = `
                <div class="upgrade-details">
                    <span class="upgrade-name">${data.name}</span>
                    <div class="upgrade-desc">${data.desc}</div>
                    <div class="upgrade-cost">Costo: ${formatNumber(data.cost)} bug</div>
                </div>
                <button class="buy-btn enhancement-btn" data-upgrade-name="${key}">Compra</button>
            `;
            enhancementList.appendChild(el);
        }
    }

    // Funzione che fa partire il gioco
    function startGameRoutines() {
        // Imposta il volume iniziale
        document.querySelectorAll('audio').forEach(audio => {
            audio.volume = gameState.user.masterVolume;
        });
        
        // Loop di gioco (10 volte al secondo)
        setInterval(gameLoop, 100);
        // Loop di salvataggio (ogni 5 secondi)
        setInterval(saveGame, 5000);
        
        // NUOVO: Loop di invio punteggio (ogni 5 minuti)
        setInterval(() => {
            submitScoreToLeaderboard(gameState.user.username, gameState.score, gameState.prestigePoints);
        }, 300000); // 300000 ms = 5 minuti

        // Avvio spawn "Ticket Critico"
        scheduleGoldenBug();
    }
    
    function handleLogin() {
        const username = loginInput.value;
        if (!username || username.trim() === '') {
            alert('Per favore, inserisci un nome utente.');
            return;
        }
        
        // Salva il nome utente
        localStorage.setItem('espooClickerUsername', username);
        gameState.user.username = username;
        saveGame(); // Salva lo stato iniziale con il nome utente
        
        // Nascondi il modale e avvia il gioco
        loginModal.style.display = 'none';
        startGameRoutines();
    }

    function initializeGame() {
        buildStores(); 
        loadGame();
        updateUI(); 
        
        // Listener Principali
        clickerButton.addEventListener('click', clickCookie);
        goldenBug.addEventListener('click', clickGoldenBug);
        prestigeBtn.addEventListener('click', performPrestige);
        
        // Listener per i MODALI
        openAchievementsBtn.addEventListener('click', () => {
            achievementsModal.style.display = 'flex';
        });
        openStatsBtn.addEventListener('click', () => {
            updateStatsUI(); 
            statsModal.style.display = 'flex';
        });
        openSettingsBtn.addEventListener('click', openSettingsModal);
        
        allModals.forEach(modal => {
            modal.addEventListener('click', (e) => {
                // Modificato per non chiudersi se si clicca sul contenuto
                if (e.target.classList.contains('modal-backdrop') || e.target.classList.contains('modal-close-btn')) {
                    modal.style.display = 'none';
                }
            });
        });
        
        // Listener Modale Impostazioni
        saveSettingsBtn.addEventListener('click', saveSettings);
        deleteSaveBtn.addEventListener('click', deleteSave);
        volumeSlider.addEventListener('input', updateVolume);
        
        // Delegazione eventi per le COLONNE NEGOZIO
        leftColumn.addEventListener('click', (e) => {
            const btn = e.target.closest('button.buy-btn');
            if (!btn) return;
            e.stopPropagation();

            if (btn.classList.contains('buy-click-btn')) {
                buyClickUpgrade(btn.dataset.upgradeName);
            }
            else if (btn.classList.contains('enhancement-btn')) {
                buyBuildingEnhancement(btn.dataset.upgradeName);
            }
        });
        
        rightColumn.addEventListener('click', (e) => {
            const btn = e.target.closest('button.buy-btn');
            if (!btn) return;
            e.stopPropagation();

            if (btn.classList.contains('buy-building-btn')) {
                buyBuilding(btn.dataset.upgradeName);
            }
            else if (btn.classList.contains('prestige-btn')) {
                buyPrestigeUpgrade(btn.dataset.upgradeName);
            }
        });

        // NUOVA LOGICA DI AVVIO/LOGIN
        const savedUsername = localStorage.getItem('espooClickerUsername');
        if (savedUsername) {
            gameState.user.username = savedUsername;
            startGameRoutines();
        } else {
            loginModal.style.display = 'flex';
            loginButton.addEventListener('click', handleLogin);
            loginInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    handleLogin();
                }
            });
        }
    }

    // ESPONE LE FUNZIONI NECESSARIE AI MODALI (per podio.js)
    window.EspooClicker = {
        getGameState: () => gameState,
        saveGame: saveGame,
        showToast: showToast,
        playSound: playSound,
        updateStatsUI: updateStatsUI,
        formatNumber: formatNumber, // Esponi per il podio
        setMasterVolume: (volume) => {
            gameState.user.masterVolume = parseFloat(volume);
            document.querySelectorAll('audio').forEach(audio => {
                audio.volume = gameState.user.masterVolume;
            });
        }
    };

    // Avvia il gioco!
    initializeGame();

}); // Fine del listener DOMContentLoaded