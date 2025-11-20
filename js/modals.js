document.addEventListener('DOMContentLoaded', () => {

    // --- RIFERIMENTI DOM ---

    // Bottoni Apertura Modali Principali
    const openAchievementsBtn = document.getElementById('open-achievements-btn');
    const openStatsBtn = document.getElementById('open-stats-btn');
    const openSettingsBtn = document.getElementById('open-settings-btn');
    const openLeaderboardBtn = document.getElementById('open-leaderboard-btn');

    const openPrestigeHubBtn = document.getElementById('open-prestige-hub-btn');
    const prestigeHubModal = document.getElementById('prestige-hub-modal');

    // Modali
    const achievementsModal = document.getElementById('achievements-modal');
    const statsModal = document.getElementById('stats-modal');
    const settingsModal = document.getElementById('settings-modal');
    const leaderboardModal = document.getElementById('leaderboard-modal');
    const accountModal = document.getElementById('account-modal'); // NUOVO MODALE
    const loginModal = document.getElementById('login-modal');
    const allModals = document.querySelectorAll('.modal-backdrop');

    // Liste Contenuto
    const leaderboardList = document.getElementById('leaderboard-list');

    // Input & Bottoni Interni
    const usernameInput = document.getElementById('username-input');
    const volumeSlider = document.getElementById('volume-slider');
    const volumeDisplay = document.getElementById('volume-display');
    const saveSettingsBtn = document.getElementById('save-settings-btn');

    // Account & Login
    const openAccountBtn = document.getElementById('open-account-btn'); // Bottone dentro Settings
    const loginButton = document.getElementById('login-btn');
    const loginInput = document.getElementById('login-username-input');
    const loginPasswordInput = document.getElementById('login-password-input');
    const logoutBtn = document.getElementById('logout-btn');
    const changePassBtn = document.getElementById('change-password-btn');
    const changeUserBtn = document.getElementById('change-username-btn');
    const deleteSaveBtn = document.getElementById('delete-save-btn');
    const deleteConfirmPass = document.getElementById('delete-confirm-password');
    const currentUsernameDisplay = document.getElementById('current-username-display');

    // API Gioco
    function getGameAPI() { return window.EspooClicker || null; }

    // --- 1. GESTIONE APERTURA/CHIUSURA MODALI ---

    // Funzione generica per aprire
    function openModal(modal) {
        if (modal) modal.style.display = 'flex';
    }

    // Funzione generica per chiudere
    function closeModal(modal) {
        if (modal) modal.style.display = 'none';
    }

    // Listener Apertura
    if (openAchievementsBtn) openAchievementsBtn.addEventListener('click', () => openModal(achievementsModal));

    if (openPrestigeHubBtn) {
        openPrestigeHubBtn.addEventListener('click', () => {
            // Aggiorna la UI del prestigio prima di aprire
            const Game = getGameAPI();
            if (Game && Game.getGameState) {
                // Forza un aggiornamento UI per vedere i punti corretti
                if (typeof updatePrestigeUI === 'function') updatePrestigeUI(); // se globale
                // Oppure
                Game.saveGame(); // Hack rapido per refreshare stati
            }
            openModal(prestigeHubModal);
        });
    }

    if (openStatsBtn) openStatsBtn.addEventListener('click', () => {
        const Game = getGameAPI();
        if (Game) Game.updateStatsUI();
        openModal(statsModal);
    });

    if (openSettingsBtn) openSettingsBtn.addEventListener('click', openSettingsModal);

    if (openLeaderboardBtn) openLeaderboardBtn.addEventListener('click', () => {
        const Game = getGameAPI();
        if (Game && Game.loadLeaderboard) Game.loadLeaderboard();
        openModal(leaderboardModal);
    });

    // NUOVO: Apre il modale credenziali dalle impostazioni
    if (openAccountBtn) openAccountBtn.addEventListener('click', () => {
        closeModal(settingsModal); // Chiude impostazioni
        openModal(accountModal);   // Apre gestione account
    });

    // --- FIX CHIUSURA: Ora chiude SOLO se premi la X o tasti specifici, NON il background ---
    allModals.forEach(modal => {
        modal.addEventListener('click', (e) => {
            // Se clicco sulla X di chiusura
            if (e.target.classList.contains('modal-close-btn')) {
                modal.style.display = 'none';
            }
            // RIMOSSO il check su 'modal-backdrop' così non si chiude cliccando fuori
        });
    });

    // --- 2. LOGICA LOGIN E ACCOUNT ---

    function openSettingsModal() {
        const Game = getGameAPI();
        if (!Game) return;

        const userSettings = Game.getGameState().user;
        if (currentUsernameDisplay) currentUsernameDisplay.textContent = userSettings.username;

        if (volumeSlider) {
            volumeSlider.value = userSettings.masterVolume;
            volumeDisplay.textContent = Math.round(userSettings.masterVolume * 100);
        }
        openModal(settingsModal);
    }

    async function handleLogin() {
        const Game = getGameAPI();
        if (!Game) return;

        const username = loginInput.value.trim();
        const password = loginPasswordInput.value.trim();

        if (!username || !password) {
            alert('Inserisci Nome Utente e Password.');
            return;
        }

        loginButton.disabled = true;
        loginButton.textContent = "Attendere...";

        try {
            const response = await fetch('./php/login_register.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const res = await response.json();

            if (res.status === 'success') {
                Game.getGameState().user.username = username;
                Game.setPassword(password);
                sessionStorage.setItem('espooUser', username);
                sessionStorage.setItem('espooPass', password);

                if (res.action === 'register') {
                    Game.showToast(`Benvenuto ${username}! Account creato.`);
                    Game.saveGame();
                } else if (res.action === 'login') {
                    if (res.save_data) {
                        Game.loadCloudData(res.save_data);
                    } else {
                        Game.saveGame();
                    }
                    Game.showToast(`Bentornato ${username}!`);
                }

                closeModal(loginModal);
                Game.startGameRoutines();
            } else {
                alert("Errore: " + res.message);
            }
        } catch (e) {
            console.error(e);
            alert("Errore di connessione.");
        } finally {
            loginButton.disabled = false;
            loginButton.textContent = "Entra / Registrati";
        }
    }

    function handleLogout() {
        if (confirm("Vuoi cambiare utente? Il gioco verrà ricaricato.")) {
            sessionStorage.clear();
            location.reload();
        }
    }

    async function handleChangeUsername() {
        const Game = getGameAPI();
        const newName = document.getElementById('new-username-input').value.trim();
        const password = Game.getPassword();

        if (!newName) { alert("Inserisci un nuovo nome."); return; }
        if (!password) { alert("Errore sessione."); return; }

        if (!confirm(`Cambiare nome in "${newName}"?`)) return;

        try {
            const response = await fetch('./php/change_username.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: Game.getGameState().user.username,
                    password: password,
                    newUsername: newName
                })
            });
            const res = await response.json();

            if (res.status === 'success') {
                Game.getGameState().user.username = newName;
                sessionStorage.setItem('espooUser', newName);
                Game.saveGame();
                alert("Nome aggiornato!");
                closeModal(accountModal); // Chiude il modale dopo successo
            } else {
                alert("Errore: " + res.message);
            }
        } catch (e) { console.error(e); }
    }

    async function handleChangePassword() {
        const Game = getGameAPI();
        const oldPass = document.getElementById('old-password-input').value;
        const newPass = document.getElementById('new-password-input').value;

        if (!oldPass || !newPass) { alert("Compila le password."); return; }

        try {
            const response = await fetch('./php/change_password.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: Game.getGameState().user.username,
                    oldPassword: oldPass,
                    newPassword: newPass
                })
            });
            const res = await response.json();

            if (res.status === 'success') {
                Game.setPassword(newPass);
                sessionStorage.setItem('espooPass', newPass);
                alert("Password aggiornata!");
                document.getElementById('old-password-input').value = '';
                document.getElementById('new-password-input').value = '';
            } else {
                alert("Errore: " + res.message);
            }
        } catch (e) { console.error(e); }
    }

    async function deleteSave() {
        const Game = getGameAPI();
        const passwordConfirm = deleteConfirmPass.value;

        if (!passwordConfirm) { alert("Serve la password per cancellare."); return; }

        if (confirm('Cancellare DEFINITIVAMENTE account e progressi?')) {
            try {
                const response = await fetch('./php/delete_user.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: Game.getGameState().user.username,
                        password: passwordConfirm
                    })
                });

                const res = await response.json();

                if (res.status === 'success') {
                    const currentState = Game.getGameState();
                    if (currentState) currentState.isDeleting = true;
                    localStorage.removeItem('espotoolClickerSaveV8');
                    sessionStorage.clear();
                    alert("Account eliminato. Addio!");
                    location.reload();
                } else {
                    alert("Errore: " + res.message);
                }
            } catch (e) { console.error(e); }
        }
    }

    // Listener Impostazioni
    if (volumeSlider) {
        volumeSlider.addEventListener('input', () => {
            const Game = getGameAPI();
            if (Game) {
                Game.setMasterVolume(volumeSlider.value);
                volumeDisplay.textContent = Math.round(volumeSlider.value * 100);
            }
        });
    }

    if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', () => {
        const Game = getGameAPI();
        if (Game) {
            Game.saveGame();
            Game.showToast("Preferenze Salvate");
        }
        closeModal(settingsModal);
    });

    // Listener Bottoni Account
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (changePassBtn) changePassBtn.addEventListener('click', handleChangePassword);
    if (changeUserBtn) changeUserBtn.addEventListener('click', handleChangeUsername);
    if (deleteSaveBtn) deleteSaveBtn.addEventListener('click', deleteSave);

    // AUTO-LOGIN
    const checkGameApi = setInterval(() => {
        if (window.EspooClicker) {
            clearInterval(checkGameApi);
            const Game = window.EspooClicker;

            const sessUser = sessionStorage.getItem('espooUser');
            const sessPass = sessionStorage.getItem('espooPass');

            if (sessUser && sessPass) {
                loginInput.value = sessUser;
                loginPasswordInput.value = sessPass;
                handleLogin();
            } else {
                openModal(loginModal);
                loginButton.addEventListener('click', handleLogin);
            }
        }
    }, 50);
});