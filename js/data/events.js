window.gameData.events = {
    rickRoll: {
        name: 'Rick Roll',
        type: 'video',
        videos: ['rick-roll-video'], // ID dei tag <video> HTML
        duration: 60000,             // Durata in ms
        minMult: 5,                  // Moltiplicatore minimo
        maxMult: 13,                 // Moltiplicatore massimo
        audioId: 'rick-roll-video',  // ID per il volume nel mixer
        toast: "🎵 RICK ROLL! (x{mult}) 🎵",
        toastType: "achievement"
    },
    ricardo: {
        name: 'Ricardo Flex',
        type: 'video',
        videos: ['ricardo-video', 'ricardo-metal-video', 'ricardo-dota-video'],
        duration: 45000,
        minMult: 5,
        maxMult: 13,
        audioId: 'ricardo-video',
        toast: "💪 PURE POWER! (x{mult}) 💪",
        toastType: "achievement"
    },
    bluescreen: {
        name: 'System Error 404',
        type: 'css_mode',
        cssClass: 'bluescreen-active',
        audioId: 'sound-bluescreen',
        duration: 30000,
        minMult: 2,
        maxMult: 5,
        toast: "ERRORE DI SISTEMA! x{mult}!",
        toastType: "error"
    },
    matrix: {
        name: 'Matrix Glitch',
        type: 'css_mode',
        cssClass: 'matrix-active',
        audioId: 'sound-matrix',
        duration: 30000,
        minMult: 2,
        maxMult: 5,
        toast: "SYSTEM HACKED! x{mult}!",
        toastType: "error"
    },
    superStarMode: {
        name: 'Super Star Mode',
        type: 'css_mode',
        cssClass: 'super-star-active',
        audioId: 'sound-star',
        duration: 30000,
        minMult: 5,
        maxMult: 10,
        toast: "⭐ SUPER STAR! x{mult}! ⭐",
        toastType: "achievement"
    }
}