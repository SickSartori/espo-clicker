document.addEventListener('DOMContentLoaded', () => {

    function initPodio() {
        // Riferimenti API dal gioco principale
        const Game = window.EspooClicker;
        if (!Game) {
            console.error("Errore critico: EspooClicker non è definito.");
            return;
        }

        // Riferimenti Modale
        const openLeaderboardBtn = document.getElementById('open-leaderboard-btn');
        const leaderboardModal = document.getElementById('leaderboard-modal');
        const leaderboardList = document.getElementById('leaderboard-list');

        // Apertura modale
        openLeaderboardBtn.addEventListener('click', () => {
            loadLeaderboard();
            leaderboardModal.style.display = 'flex';
        });

        // Funzione per caricare e mostrare la classifica
        async function loadLeaderboard() {
            leaderboardList.innerHTML = '<div class="stat-item"><span class="stat-label">Caricamento...</span></div>';

            try {
                const response = await fetch('php/get_leaderboard.php?nocache=' + Date.now());
                if (!response.ok) {
                    throw new Error(`Errore di rete: ${response.statusText}`);
                }
                const scores = await response.json();

                if (scores.length === 0) {
                    leaderboardList.innerHTML = '<div class="stat-item"><span class="stat-label">Nessun punteggio. Sii il primo!</span></div>';
                    return;
                }

                // Costruisci la lista HTML
                leaderboardList.innerHTML = ''; // Pulisci
                const currentUsername = sessionStorage.getItem('espooUser');
                scores.forEach((entry, index) => {
                    const item = document.createElement('div');
                    let rankClass = '';
                    if (index === 0) rankClass = 'rank-1';
                    else if (index === 1) rankClass = 'rank-2';
                    else if (index === 2) rankClass = 'rank-3';

                    item.className = `leaderboard-item ${rankClass}`;

                    // Gestione Icona Rango
                    let rankDisplay = `#${index + 1}`;
                    if (index === 0) rankDisplay = '<i class="fa-solid fa-trophy" style="color: #f1c40f;"></i>';
                    if (index === 1) rankDisplay = '<i class="fa-solid fa-medal" style="color: #bdc3c7;"></i>';
                    if (index === 2) rankDisplay = '<i class="fa-solid fa-medal" style="color: #cd7f32;"></i>';

                    // Gestione Livello
                    let level = entry.prestigeLevel || 0;
                    let prestigeBadge = `<span class="level-badge">LIV. ${level}</span>`;

                    // ---  GESTIONE FOTO PROFILO (SKIN) ---
                    let skinId = entry.equippedSkin || 'default';

                    // Per l'utente corrente, usa la skin locale (potrebbe non essere ancora salvata nel DB)
                    if (entry.username === currentUsername && Game.getGameState) {
                        const localState = Game.getGameState();
                        if (localState && localState.skins && localState.skins.current) {
                            skinId = localState.skins.current;
                        }
                    }

                    // Recuperiamo i dati della skin (se esiste, altrimenti default)
                    let skinData = window.gameData.skins[skinId] || window.gameData.skins['default'];
                    let avatarImg = skinData.img ? `assets/image/${skinData.img}` : 'assets/image/espo.webp';

                    // Colore del bordo in base alla rarità
                    const rColors = {
                        'common': '#bdc3c7', 'rare': '#3498db', 'epic': '#9b59b6',
                        'legendary': '#f1c40f', 'divine': '#ffee90', 'christmas': '#e74c3c'
                    };
                    let borderColor = rColors[skinData.rarity] || rColors['common'];

                    let avatarHTML = `<img src="${avatarImg}" class="leaderboard-avatar" style="border-color: ${borderColor};">`;
                    // ----------------------------------------

                    // Gestione Formattazioni (NG+)
                    let formattazioni = entry.totalFormattazioni ? parseInt(entry.totalFormattazioni) : 0;
                    let formatBadge = '';
                    if (formattazioni > 0) {
                        formatBadge = `<span class="level-badge" style="background-color: rgba(155, 89, 182, 0.2); color: #9b59b6; border-color: #8e44ad; margin-left: 5px;" title="Formattazioni (NG+)"><i class="fa-solid fa-atom"></i> ${formattazioni}</span>`;
                    }

                    if (entry.username === currentUsername) {
                        item.classList.add('is-me');
                    }

                    item.innerHTML = `
                        <div class="lb-left">
                            <span class="leaderboard-rank">${rankDisplay}</span>
                            ${avatarHTML}
                            <div class="lb-user-info">
                                <span class="leaderboard-name">${escapeHTML(entry.username)}</span>
                                <div class="lb-badges">
                                    ${prestigeBadge}
                                    ${formatBadge}
                                </div>
                            </div>
                        </div>
                        <span class="leaderboard-score">${Game.formatNumber(entry.score)} <i class="fa-solid fa-bug"></i></span>
                    `;
                    leaderboardList.appendChild(item);
                });

            } catch (error) {
                console.error('Impossibile caricare la classifica:', error);
                leaderboardList.innerHTML = '<div class="stat-item"><span class="stat-label" style="color: #e74c3c;">Impossibile caricare la classifica.</span></div>';
            }
        }

        // Funzione di utilità per la sicurezza (evita XSS)
        function escapeHTML(str) {
            if (typeof str !== 'string') return '';
            return str.replace(/[&<>"']/g, function (m) {
                return {
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#039;'
                }[m];
            });
        }

        // Esponi la funzione di caricamento
        if (window.EspooClicker) {
            window.EspooClicker.loadLeaderboard = loadLeaderboard;
        }
    }

    // Assicura che lo script principale sia stato caricato
    if (window.EspooClicker) {
        initPodio();
    } else {
        // Aspetta che l'oggetto EspooClicker sia disponibile
        const checkInterval = setInterval(() => {
            if (window.EspooClicker) {
                clearInterval(checkInterval);
                initPodio();
            }
        }, 50); // Controlla ogni 50ms
    }
});