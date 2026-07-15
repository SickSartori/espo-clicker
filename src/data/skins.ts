import { Decimal } from './decimal';
import { IS_XMAS_TIME } from './season';

export const skins: Record<string, any> = {
    default: {
        name: "Espòòò",
        desc: "L'originale inconfondibile.",
        img: "skins/espo.webp",
        imgClick: "skins/espo-click.webp",
        rarity: "common"
    },
    espobit: {
        name: "Espobit",
        desc: "Inserisci il gettone. 1UP!",
        img: "skins/espobit.webp",
        imgClick: "skins/espobit-click.webp",
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
    espo3: {
        name: "Espò 3.0",
        desc: "Aggiornamento installato: stesso Espò, ora al neon.",
        img: "skins/espo3.webp",
        imgClick: "skins/espo3-click.webp",
        rarity: "common",
        cost: new Decimal(0)
    },
    christmas: {
        name: "Espo Natale",
        desc: "Risolviamo questi bug sotto l'albero.",
        img: "skins/esponatale.webp",
        imgClick: "skins/esponatale-click.webp",
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
        img: "skins/esporator.webp",
        imgClick: "skins/esporator-click.webp",
        rarity: "rare",
        unlockHint: "Raggiungi 2.000 click manuali."
    },
    geisha: {
        name: "Esponese",
        desc: "Eleganza orientale.",
        img: "skins/esponese.webp",
        imgClick: "skins/esponese-click.webp",
        rarity: "rare",
        unlockHint: "Gioca per 4 ore totali."
    },
    unicorn: {
        name: "Espocorno",
        desc: "Magia pura nel codice.",
        img: "skins/espocorno.webp",
        imgClick: "skins/espocorno-click.webp",
        rarity: "rare",
        unlockHint: "Sblocca l'obiettivo 'Full Stack Agency'"
    },
    esportia: {
        name: "Esportia",
        desc: "My Espo at Portia",
        img: "skins/esportia.webp",
        imgClick: "skins/esportia-click.webp",
        rarity: "rare",
        cost: new Decimal(10)
    },

    clown: {
        name: "Espoclown",
        desc: "Ogni crash è uno spettacolo.",
        img: "skins/espoclown.webp",
        imgClick: "skins/espoclown-click.webp",
        rarity: "rare",
        cost: new Decimal(12)
    },
    mariachi: {
        name: "Espariachi",
        desc: "Ay ay ay, canta e compila.",
        img: "skins/espoachi.webp",
        imgClick: "skins/espoachi-click.webp",
        rarity: "rare",
        unlockHint: "Sblocca l'obiettivo 'Collezionista' (15 skin)."
    },

    // --- EPIC ---
    king: {
        name: "Espo of Empires",
        desc: "Il Re dei Bug.",
        img: "skins/espofempires.webp",
        imgClick: "skins/espofempires-click.webp",
        rarity: "epic",
        cost: new Decimal(20)
    },
    waifu: {
        name: "Espowaifu",
        desc: "Best girl.",
        img: "skins/espowaifu.webp",
        imgClick: "skins/espowaifu-click.webp",
        rarity: "epic",
        cost: new Decimal(20)
    },
    bob: {
        name: "EspòngeBob",
        desc: "Sono pronto, Promozione!",
        img: "skins/esponge-bob.webp",
        imgClick: "skins/esponge-bob-click.webp",
        rarity: "epic",
        cost: new Decimal(25)
    },
    initialE: {
        name: "Initial E",
        desc: "Tofu delivery, ma col codice.",
        img: "skins/initiale.webp",
        imgClick: "skins/initiale-click.webp",
        rarity: "epic",
        cost: new Decimal(30),
        requiresFormatting: true,
        unlockHint: "Esegui almeno 1 Formattazione e acquista con 30 Token."
    },
    esposion: {
        name: "Esposion",
        desc: "Più tieni il combo, più esplode.",
        img: "skins/espo.webp",
        imgClick: "skins/espo-click.webp",
        rarity: "epic",
        unlockHint: "Raggiungi una combo di 150 click.",
        comboExplode: true
    },

    pablo: {
        name: "Pablo Espobar",
        desc: "Plata o plomo... o pull request.",
        img: "skins/pabloespobar.webp",
        imgClick: "skins/pabloespobar-click.webp",
        rarity: "epic",
        cost: new Decimal(35),
        requiresFormatting: true,
        unlockHint: "Esegui almeno 1 Formattazione e acquista con 35 Token."
    },
    esposa: {
        name: "Espòsa",
        desc: "Finché codice non ci separi.",
        img: "skins/esposa.webp",
        imgClick: "skins/esposa-click.webp",
        rarity: "epic",
        unlockHint: "Gioca per 24 ore totali."
    },

    // --- LEGENDARY ---
    rick: {
        name: "Rick Espley",
        desc: "Never gonna give you up!",
        img: "skins/rick-espley.webp",
        imgClick: "skins/rick-espley-click.webp",
        rarity: "legendary",
        unlockHint: "Raggiungi 25.000 click manuali."
    },
    ricardo: {
        name: "Ricardo Milespo",
        desc: "Non c'è bug che tenga.",
        img: "skins/ricardo-milespo.webp",
        imgClick: "skins/ricardo-milespo-click.webp",
        rarity: "legendary",
        unlockHint: "Sblocca l'obiettivo 'White Hat'"
    },
    dictator: {
        name: "Adolf Espler",
        desc: "Ordine e disciplina.",
        img: "skins/adolf-espler.webp",
        imgClick: "skins/adolf-espler-click.webp",
        rarity: "legendary",
        unlockHint: "Raggiungi 50.000 click manuali."
    },
    espory: {
        name: "Freddy Espory",
        desc: "eeeeeeeespo",
        img: "skins/freddy-espory.webp",
        imgClick: "skins/freddy-espory-click.webp",
        rarity: "legendary",
        cost: new Decimal(50),
        themeConfig: {
            specialMusic: 'sound-bg-music-espory'
        }
    },
    britneyEspears: {
        name: "Britney Espears",
        desc: "Oops!... I debugged again.",
        img: "skins/britney-espoars.webp",
        imgClick: "skins/britney-espoars-click.webp",
        rarity: "legendary",
        cost: new Decimal(75),
        requiresFormatting: true,
        unlockHint: "Esegui almeno 1 Formattazione e acquista con 75 Token."
    },
    espoKiss: {
        name: "Espo Kiss",
        desc: "Rock 'n' roll all night, debug every day.",
        img: "skins/espokiss.webp",
        imgClick: "skins/espokiss-click.webp",
        rarity: "legendary",
        cost: new Decimal(75),
        requiresFormatting: true,
        unlockHint: "Esegui almeno 1 Formattazione e acquista con 75 Token."
    },
    superespo: {
        name: "Super Espò",
        desc: "It's-a Me, Espò!",
        img: "skins/super-espo.webp",
        imgClick: "skins/super-espo-click.webp",
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

    carmaespon: {
        name: "Carmaespòn",
        desc: "Al semaforo non frena nessuno.",
        img: "skins/carmaespon.webp",
        imgClick: "skins/carmaespon-click.webp",
        rarity: "legendary",
        cost: new Decimal(60),
        themeConfig: {
            specialMusic: 'sound-fury-music',
            goldenBugIcon: 'fa-fire',
            goldenBugColor: '#e74c3c'
        }
    },
    leon: {
        name: "Leon S. Espedy",
        desc: "Dove stanno andando tutti i bug? Al bingo?",
        img: "skins/leonsespedy.webp",
        imgClick: "skins/leonsespedy-click.webp",
        rarity: "legendary",
        unlockHint: "Sblocca l'obiettivo 'R.P.D. Elite' (250 Golden Bug).",
        themeConfig: {
            specialMusic: 'sound-bg-espedy'
        }
    },
    clicker: {
        name: "Espoclicker",
        desc: "Un click ti ha contagiato. Ora il clicker sei tu.",
        img: "skins/espoclicker.webp",
        imgClick: "skins/espoclicker-click.webp",
        rarity: "legendary",
        unlockHint: "Sblocca l'obiettivo 'Paziente Zero' (250.000 click)."
    },

    // --- DIVINE ---
    jesus: {
        name: "Gespo",
        desc: "Il salvatore del database.",
        img: "skins/gespo.webp",
        imgClick: "skins/gespo-click.webp",
        rarity: "divine",
        unlockHint: "Sblocca l'obiettivo 'Divinità del Mouse'",
        themeConfig: {
            specialMusic: 'sound-bg-music-divine',
            goldenBugIcon: 'fa-sun',
            goldenBugColor: '#f1c40f'
        }
    },

    // --- FONDATORE (esclusiva pre-lancio, non ottenibile dai nuovi) ---
    // Concessa solo dalla migrazione di lancio (v2→v3) a chi giocava prima del
    // 03/08/2026. Nessun `cost` e nessun achievement collegato → per i nuovi
    // giocatori resta bloccata e non acquistabile.
    founder: {
        name: "Espò Fondatore",
        desc: "C'eri prima del lancio. Il codice non lo dimentica.",
        img: "skins/founder.webp",
        imgClick: "skins/founder-click.webp",
        rarity: "divine",
        unlockHint: "Riservata ai giocatori pre-lancio. Non più ottenibile.",
        themeConfig: {
            specialMusic: 'sound-bg-music-divine',
            goldenBugIcon: 'fa-crown',
            goldenBugColor: '#f1c40f'
        }
    }
};
