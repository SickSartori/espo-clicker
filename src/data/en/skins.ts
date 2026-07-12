/* EN overlay — skins. Stesse chiavi di js/data/skins.js. */
export const skins: Record<string, any> = {
    default: {
        name: "Espòòò",
        desc: "The unmistakable original."
    },
    espobit: {
        desc: "Insert coin. 1UP!"
    },
    christmas: {
        name: "Espo Claus",
        desc: "Let's squash these bugs under the tree.",
        unlockHint: (window as any).IS_XMAS_TIME ? "Redeem the 'Merry Christmas' achievement!" : "Available in the Shop for 5 Tokens."
    },

    // --- RARE ---
    gladiator: {
        desc: "On my signal, unleash the clicks.",
        unlockHint: "Reach 2,000 manual clicks."
    },
    geisha: {
        name: "Espanese",
        desc: "Eastern elegance.",
        unlockHint: "Play for 4 hours total."
    },
    unicorn: {
        name: "Espocorn",
        desc: "Pure magic in the code.",
        unlockHint: "Unlock the 'Full Stack Agency' achievement."
    },
    esportia: {
        desc: "My Espo at Portia"
    },

    clown: {
        name: "Espoclown",
        desc: "Every crash is a show."
    },
    mariachi: {
        name: "Espariachi",
        desc: "Ay ay ay, sing and compile.",
        unlockHint: "Unlock the 'Collector' achievement (15 skins)."
    },

    // --- EPIC ---
    king: {
        desc: "The King of Bugs."
    },
    waifu: {
        desc: "Best girl."
    },
    bob: {
        desc: "I'm ready, Promotion!"
    },
    initialE: {
        desc: "Tofu delivery, but with code.",
        unlockHint: "Perform at least 1 Format and buy for 30 Token."
    },
    esposion: {
        desc: "The longer the combo, the bigger the blast.",
        unlockHint: "Reach a 150-click combo."
    },

    pablo: {
        name: "Pablo Espobar",
        desc: "Plata o plomo... or pull request.",
        unlockHint: "Perform at least 1 Format and buy for 35 Token."
    },
    esposa: {
        name: "Espòsa",
        desc: "Till code do us part.",
        unlockHint: "Play for 24 hours total."
    },

    // --- LEGENDARY ---
    rick: {
        unlockHint: "Reach 25,000 manual clicks."
    },
    ricardo: {
        desc: "No bug can hold him back.",
        unlockHint: "Unlock the 'White Hat' achievement."
    },
    dictator: {
        desc: "Order and discipline.",
        unlockHint: "Reach 50,000 manual clicks."
    },
    espory: {
        desc: "eeeeeeeespo"
    },
    britneyEspears: {
        unlockHint: "Perform at least 1 Format and buy for 75 Token."
    },
    espoKiss: {
        unlockHint: "Perform at least 1 Format and buy for 75 Token."
    },
    superespo: {
        desc: "It's-a Me, Espò!"
    },

    carmaespon: {
        name: "Carmaespòn",
        desc: "Nobody brakes at the red light."
    },
    leon: {
        name: "Leon S. Espedy",
        desc: "Where's everyone going? Bingo?",
        unlockHint: "Unlock the 'R.P.D. Elite' achievement (250 Golden Bugs)."
    },
    clicker: {
        name: "Espoclicker",
        desc: "A click infected you. Now you're the clicker.",
        unlockHint: "Unlock the 'Patient Zero' achievement (250,000 clicks)."
    },

    // --- DIVINE ---
    jesus: {
        desc: "The savior of the database.",
        unlockHint: "Unlock the 'Mouse Divinity' achievement."
    }
};
