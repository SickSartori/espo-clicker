/**
 * SECURITY PATCH per Espo Clicker
 * Sovrascrive la funzione di salvataggio originale per includere l'hashing SHA-256.
 */

(function () {
    const CLIENT_SECRET_KEY = 'EspoClicker_Secret_X7k9P2mN5qR8vW1zY4cB6dE0fG3hJ';

    // Funzione helper per creare l'hash SHA-256
    async function generateHash(message) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    // Nuova funzione di salvataggio sicura
    async function secureSaveGame() {
        // Riferimento allo stato globale (assumendo che sia accessibile o esposto)
        // Se gameState non è globale, lo recuperiamo dall'istanza EspooClicker se disponibile
        let state = (window.EspooClicker && window.EspooClicker.getGameState)
            ? window.EspooClicker.getGameState()
            : window.gameState;

        if (!state || state.isDeleting) return;

        // SANITY CHECK
        if (isNaN(state.score) || state.score === null) state.score = 0;
        if (isNaN(state.totalScore)) state.totalScore = state.score;

        state.lastSaveTimestamp = Date.now();

        // COMPRESSIONE (Richiede LZString, già presente nel progetto)
        let compressed = null;
        try {
            const stateJSON = JSON.stringify(state);
            compressed = LZString.compressToUTF16(stateJSON);
        } catch (e) {
            console.error("❌ Errore compressione:", e);
            return;
        }

        // BACKUP LOCALE
        localStorage.setItem('espotoolClickerSaveV8', compressed);

        // SALVATAGGIO CLOUD SICURO
        const password = window.EspooClicker ? window.EspooClicker.getPassword() : null;

        if (state.user.username && password) {
            try {
                // Dati per la classifica
                let scoreToSend = Math.floor(state.lifetimeScore);
                if (!scoreToSend || scoreToSend <= 0) scoreToSend = Math.floor(state.totalScore);
                const prestigeToSend = Math.floor(state.totalResets || 0);

                // --- GENERAZIONE FIRMA DIGITALE (HASH) ---
                // Formato: Punteggio-Prestigio-Chiave
                const dataString = `${scoreToSend}-${prestigeToSend}-${CLIENT_SECRET_KEY}`;
                const signature = await generateHash(dataString);
                // -----------------------------------------

                const response = await fetch('./php/save_progress.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    keepalive: true, // Importante per salvataggio alla chiusura
                    body: JSON.stringify({
                        username: state.user.username,
                        password: password,
                        saveData: compressed,
                        score: scoreToSend,
                        prestige: prestigeToSend,
                        hash: signature // Inviamo la firma
                    })
                });

                // Opzionale: Log response per debug
                // const resData = await response.json();
                // console.log("Secure Save:", resData);

            } catch (e) {
                console.warn("Cloud save warning:", e);
            }
        }
    }

    // Sovrascrivi la funzione globale e quella dell'API quando pronta
    // Usiamo un intervallo per assicurarci di sovrascrivere dopo il caricamento di script.js
    const installPatch = setInterval(() => {
        if (window.EspooClicker) {
            console.log("🔒 Security Patch: Funzione di salvataggio blindata installata.");

            // 1. Sovrascrivi il metodo dell'API pubblica
            window.EspooClicker.saveGame = secureSaveGame;

            // 2. Se possibile, sovrascriviamo anche il listener 'beforeunload' 
            // (Nota: difficile rimuovere listener anonimi, ma il nuovo metodo sarà usato dalle chiamate manuali/auto)

            clearInterval(installPatch);
        }
    }, 100);

})();