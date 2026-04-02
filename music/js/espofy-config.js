// Auto-genera la playlist dalle definizioni di gameData.assets.sounds
// Nessuna duplicazione manuale: basta aggiornare assets.js
const musicConfig = {
    // Genera automaticamente da assets.js (type === 'music')
    // Ritorna path pronti relativi alla cartella music/
    get gameMusics() {
        const musics = [];
        if (typeof gameData !== 'undefined' && gameData.assets && gameData.assets.sounds) {
            for (const key in gameData.assets.sounds) {
                const s = gameData.assets.sounds[key];
                if (s.type === 'music') {
                    // Path relativi alla root del progetto → prefisso ../
                    const file = s.file.includes('/')
                        ? '../' + s.file                          // es. arcade/assets/x.mp3 → ../arcade/assets/x.mp3
                        : '../assets/sounds/' + s.file;           // es. bg-music.mp3 → ../assets/sounds/bg-music.mp3
                    musics.push({ name: s.name, file: file });
                }
            }
        }
        return musics;
    },

    // Musiche da link web esterni (opzionali)
    externalMusics: [
        // { name: "Lofi Chill Radio", src: "https://stream.zeno.fm/f3wvbbqmdg8uv" }
    ]
};
