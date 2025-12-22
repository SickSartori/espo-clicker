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
                const response = await fetch('./php/get_leaderboard.php?nocache=' + Date.now());
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
                scores.forEach((entry, index) => {
                    const item = document.createElement('div');
                    // Aggiungi una classe speciale se è la top 3 per lo styling CSS
                    let rankClass = '';
                    if (index === 0) rankClass = 'rank-1';
                    else if (index === 1) rankClass = 'rank-2';
                    else if (index === 2) rankClass = 'rank-3';

                    item.className = `leaderboard-item ${rankClass}`;

                    // Gestione Icona Rango
                    let rankDisplay = `#${index + 1}`;
                    if (index === 0) rankDisplay = '<i class="fa-solid fa-trophy" style="color: #f1c40f;"></i>'; // Oro
                    if (index === 1) rankDisplay = '<i class="fa-solid fa-medal" style="color: #bdc3c7;"></i>'; // Argento
                    if (index === 2) rankDisplay = '<i class="fa-solid fa-medal" style="color: #cd7f32;"></i>'; // Bronzo

                    // Gestione Livello (Prestigio)
                    let level = entry.prestigeLevel || 0;
                    // Badge colorato per il livello
                    let prestigeBadge = `<span class="level-badge">LIV. ${level}</span>`;

                    // Controlla se è l'utente corrente (opzionale, richiede di sapere l'username locale)
                    const currentUsername = sessionStorage.getItem('espooUser');
                    if (entry.username === currentUsername) {
                        item.classList.add('is-me');
                    }

                    item.innerHTML = `
                        <div class="lb-left">
                            <span class="leaderboard-rank">${rankDisplay}</span>
                            <div class="lb-user-info">
                                <span class="leaderboard-name">${escapeHTML(entry.username)}</span>
                                ${prestigeBadge}
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