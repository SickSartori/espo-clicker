// --------- 10. FUNZIONI MODALI E IMPOSTAZIONI ---------
document.addEventListener('DOMContentLoaded', () => {
    
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

    // Assicura che l'API del gioco sia pronta
    function getGameAPI() {
        if (window.EspooClicker) {
            return window.EspooClicker;
        } else {
            console.error("Game API non trovata!");
            return null; // Gestire questo caso se necessario
        }
    }

    function openSettingsModal() {
        const Game = getGameAPI();
        if (!Game) return;
        
        const userSettings = Game.getGameState().user;
        // usernameInput.value = userSettings.username; // Rimosso
        volumeSlider.value = userSettings.masterVolume;
        volumeDisplay.textContent = Math.round(userSettings.masterVolume * 100);
        settingsModal.style.display = 'flex';
    }
    
    function updateVolume() {
        const Game = getGameAPI();
        if (!Game) return;
        
        Game.setMasterVolume(volumeSlider.value);
        volumeDisplay.textContent = Math.round(volumeSlider.value * 100);
        Game.playSound('sound-buy'); // Suona un "ding" per testare il volume
    }
    
    function saveSettings() {
        const Game = getGameAPI();
        if (!Game) return;
        
        Game.setMasterVolume(parseFloat(volumeSlider.value));
        Game.saveGame();
        Game.showToast('Impostazioni salvate!');
        settingsModal.style.display = 'none';
    }
    
    async function deleteSave() {
        const Game = getGameAPI();
        if (!Game) return;

        if (confirm('SEI SICURO? Questa azione è irreversibile e cancellerà tutti i tuoi progressi, inclusi Punti Promozione e Obiettivi.')) {
            if (confirm('CONFERMA DEFINITIVA. Vuoi davvero cancellare tutto?')) {
                
                // Chiama il PHP per cancellare i punteggi dal podio
                try {
                    await fetch('./php/delete_user.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username: Game.getGameState().user.username })
                    });
                } catch (e) {
                    console.error("Impossibile cancellare i punteggi sul server:", e);
                }
                
                // Cancella i dati locali
                localStorage.removeItem('espotoolClickerSaveV8');
                localStorage.removeItem('espooClickerUsername'); // Rimuove l'utente
                
                Game.showToast('Salvataggio cancellato. Riavvio in corso...');
                settingsModal.style.display = 'none';
                
                setTimeout(() => {
                    location.reload(true);
                }, 1000); 
            }
        }
    }
    
    function handleLogin() {
        const Game = getGameAPI();
        if (!Game) return;

        const username = loginInput.value;
        if (!username || username.trim() === '') {
            alert('Per favore, inserisci un nome utente.');
            return;
        }
        
        // Salva il nome utente
        localStorage.setItem('espooClickerUsername', username);
        Game.getGameState().user.username = username;
        Game.saveGame(); // Salva lo stato iniziale con il nome utente
        
        // Nascondi il modale e avvia il gioco
        loginModal.style.display = 'none';
        Game.startGameRoutines();
    }

    // Aggiungi listener solo quando il DOM è pronto
    
    // Listener per i MODALI
    openAchievementsBtn.addEventListener('click', () => {
        achievementsModal.style.display = 'flex';
    });
    
    openStatsBtn.addEventListener('click', () => {
        const Game = getGameAPI();
        if (Game) Game.updateStatsUI(); 
        statsModal.style.display = 'flex';
    });
    
    openSettingsBtn.addEventListener('click', openSettingsModal);
    
    allModals.forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-backdrop') || e.target.classList.contains('modal-close-btn')) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Listener Modale Impostazioni
    saveSettingsBtn.addEventListener('click', saveSettings);
    deleteSaveBtn.addEventListener('click', deleteSave);
    volumeSlider.addEventListener('input', updateVolume);

    // Listener Modale Login
    // Assicurati che l'API del gioco esista prima di aggiungere questi listener
    const checkGameApi = setInterval(() => {
        if(window.EspooClicker) {
            clearInterval(checkGameApi);
            
            const Game = window.EspooClicker;
            const savedUsername = localStorage.getItem('espooClickerUsername');
            
            if (savedUsername) {
                Game.getGameState().user.username = savedUsername;
                Game.startGameRoutines();
            } else {
                loginModal.style.display = 'flex';
                loginButton.addEventListener('click', handleLogin);
                // Listener per Invio rimosso
            }
        }
    }, 50); // Controlla se l'API è pronta
});