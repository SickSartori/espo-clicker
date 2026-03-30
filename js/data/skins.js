window.gameData.skins = {
    default: {
        name: "Classico",
        desc: "L'originale inconfondibile.",
        img: "espo.webp",
        imgClick: "espo-click.webp",
        rarity: "common"
    },
    espobit: {
        name: "Espobit",
        desc: "Inserisci il gettone. 1UP!",
        img: "espobit.webp",
        imgClick: "espobit-click.webp",
        rarity: "common",
        cost: new Decimal(5),
        themeConfig: {
            cssFile: '8bit-theme.css',
            bodyClass: 'theme-8bit',
            specialMusic: 'sound-bg-bit',
            goldenBugIcon: 'fa-gamepad',
            goldenBugColor: '#f1c40f'
        }
    },
    christmas: {
        name: "Espo Natale",
        desc: "Risolviamo questi bug sotto l'albero.",
        img: "esponatale.webp",
        imgClick: "esponatale-click.webp",
        rarity: "christmas",
        unlockHint: IS_XMAS_TIME ? "Riscatta l'obiettivo 'Buon Natale'!" : "Disponibile nello Shop per 5 Token.",
        cost: IS_XMAS_TIME ? undefined : new Decimal(20),
        themeConfig: {
            cssFile: 'christmas-theme.css',
            vfx: 'snow',
            specialMusic: 'sound-snowball',
            bodyClass: 'theme-christmas',
            goldenBugIcon: 'fa-gift',
            goldenBugColor: '#e74c3c'
        }
    },

    // --- RARE ---
    gladiator: {
        name: "Esporator",
        desc: "Al mio segnale, scatenate i click.",
        img: "esporator.webp",
        imgClick: "esporator-click.webp",
        rarity: "rare",
        unlockHint: "Raggiungi 2.000 click manuali."
    },
    geisha: {
        name: "Esponese",
        desc: "Eleganza orientale.",
        img: "esponese.webp",
        imgClick: "esponese-click.webp",
        rarity: "rare",
        unlockHint: "Gioca per 4 ore totali."
    },
    unicorn: {
        name: "Espocorno",
        desc: "Magia pura nel codice.",
        img: "espocorno.webp",
        imgClick: "espocorno-click.webp",
        rarity: "rare",
        unlockHint: "Sblocca l'obiettivo 'Full Stack Agency'"
    },
    esportia: {
        name: "Esportia",
        desc: "My Espo at Portia",
        img: "esportia.webp",
        imgClick: "esportia-click.webp",
        rarity: "rare",
        cost: new Decimal(10)
    },

    // --- EPIC ---
    king: {
        name: "Espo of Empires",
        desc: "Il Re dei Bug.",
        img: "espofempires.webp",
        imgClick: "espofempires-click.webp",
        rarity: "epic",
        cost: new Decimal(20)
    },
    waifu: {
        name: "Espowaifu",
        desc: "Best girl.",
        img: "espowaifu.webp",
        imgClick: "espowaifu-click.webp",
        rarity: "epic",
        cost: new Decimal(20)
    },
    bob: {
        name: "EspòngeBob",
        desc: "Sono pronto, Promozione!",
        img: "esponge-bob.webp",
        imgClick: "esponge-bob-click.webp",
        rarity: "epic",
        cost: new Decimal(25)
    },
    initialE: {
        name: "Initial E",
        desc: "Tofu delivery, ma col codice.",
        img: "initiale.webp",
        imgClick: "initiale-click.webp",
        rarity: "epic",
        cost: new Decimal(30),
        requiresFormatting: true,
        unlockHint: "Esegui almeno 1 Formattazione e acquista con 30 Token."
    },

    // --- LEGENDARY ---
    rick: {
        name: "Rick Espley",
        desc: "Never gonna give you up!",
        img: "rick-espley.webp",
        imgClick: "rick-espley-click.webp",
        rarity: "legendary",
        unlockHint: "Raggiungi 25.000 click manuali."
    },
    ricardo: {
        name: "Ricardo Milespo",
        desc: "Non c'è bug che tenga.",
        img: "ricardo-milespo.webp",
        imgClick: "ricardo-milespo-click.webp",
        rarity: "legendary",
        unlockHint: "Sblocca l'obiettivo 'White Hat'"
    },
    dictator: {
        name: "Adolf Espler",
        desc: "Ordine e disciplina.",
        img: "adolf-espler.webp",
        imgClick: "adolf-espler-click.webp",
        rarity: "legendary",
        unlockHint: "Raggiungi 50.000 click manuali."
    },
    espory: {
        name: "Freddy Espory",
        desc: "eeeeeeeespo",
        img: "freddy-espory.webp",
        imgClick: "freddy-espory-click.webp",
        rarity: "legendary",
        cost: new Decimal(50),
        themeConfig: {
            specialMusic: 'bg-music-espory'
        }
    },
    britneyEspears: {
        name: "Britney Espears",
        desc: "Oops!... I debugged again.",
        img: "britney-espoars.webp",
        imgClick: "britney-espoars-click.webp",
        rarity: "legendary",
        cost: new Decimal(75),
        requiresFormatting: true,
        unlockHint: "Esegui almeno 1 Formattazione e acquista con 75 Token."
    },
    espoKiss: {
        name: "Espo Kiss",
        desc: "Rock 'n' roll all night, debug every day.",
        img: "espokiss.webp",
        imgClick: "espokiss-click.webp",
        rarity: "legendary",
        cost: new Decimal(75),
        requiresFormatting: true,
        unlockHint: "Esegui almeno 1 Formattazione e acquista con 75 Token."
    },
    superespo: {
        name: "Super Espò",
        desc: "It's-a Me, Espò!",
        img: "super-espo.webp",
        imgClick: "super-espo-click.webp",
        rarity: "legendary",
        cost: new Decimal(100),
        themeConfig: {
            cssFile: 'super-theme.css',
            bodyClass: 'theme-super',
            specialMusic: 'sound-bg-music-super',
            goldenBugIcon: 'fa-question',
            goldenBugColor: '#ffffff'
        }
    },

    // --- DIVINE ---
    jesus: {
        name: "Gespo",
        desc: "Il salvatore del database.",
        img: "gespo.webp",
        imgClick: "gespo-click.webp",
        rarity: "divine",
        unlockHint: "Sblocca l'obiettivo 'Divinità del Mouse'",
        themeConfig: {
            specialMusic: 'bg-music-divine',
            goldenBugIcon: 'fa-sun',
            goldenBugColor: '#f1c40f'
        }
    }
};
