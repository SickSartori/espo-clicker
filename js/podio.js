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
                const response = await fetch('./php/get_leaderboard.php');
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
                    item.className = 'leaderboard-item';

                    // MODIFICA: Mostra sempre il livello, anche se è 0, per chiarezza
                    // Usa entry.prestigeLevel || 0 per gestire eventuali null
                    let level = entry.prestigeLevel || 0;
                    let prestigeHTML = ` <span style="color: #f1c40f; font-size: 0.8rem;"> (Liv. ${level})</span>`;

                    item.innerHTML = `
                        <span class="leaderboard-rank">#${index + 1}</span>
                        <span class="leaderboard-name">${escapeHTML(entry.username)}${prestigeHTML}</span>
                        <span class="leaderboard-score">${Game.formatNumber(entry.score)}</span>
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