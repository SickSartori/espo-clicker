// ============================================================
// ESPO CLICKER - Asset Packages v1.1
// Definisce i "pacchetti" di immagini raggruppate per priorità
// e logica di caricamento. Usato da asset-manager.js.
//
// Struttura cartelle:
//   assets/image/skins/  → tutti i personaggi WebP
//   assets/image/ui/     → elementi UI (bug, star, bluescreen…)
//   assets/image/icons/  → icone PWA
//   assets/image/arcade/ → sprite PNG Super-Espo
//
// ⚠️ Nota audio: Howler.js è già lazy-by-design (scarica solo
//    quando .play() viene chiamato). Non serve gestirlo qui.
// ⚠️ Nota video: 31 MB totali → mai pre-caricare,
//    gestiti on-demand singolarmente tramite <video src>.
//
// ============================================================
// STRATEGIA DI CARICAMENTO
// ============================================================
// I file vengono serviti singolarmente (HTTP/2 + cache-first SW).
// Gli ZIP in assets/packs/ sono artefatti di build/distribuzione,
// non vengono usati a runtime — il SW casha i file singoli dopo
// il primo caricamento, rendendo tutto offline-ready.
//
// ============================================================
// AGGIUNGERE UNA NUOVA SKIN
// ============================================================
// 1. Aggiungi il file WebP in:  assets/image/skins/
// 2. Aggiungi l'entry in:       src/data/skins.ts (+ overlay EN in src/data/en/skins.ts)
//      img: 'skins/nome-skin.webp', imgClick: 'skins/nome-skin-click.webp'
// 3. Aggiungi i path al pack giusto qui sotto (es. SKINS_COMMON, THEME_DIVINE)
// 5. Rigenera gli ZIP:          http://localhost:8888/Espo-Clicker/assets/packs/build.php
// 6. Bumpa CACHE_VERSION in:    sw.js
// ============================================================

export const ASSET_PACKAGES: Record<string, any> = {

    // ===========================================================
    // 📦 CORE — Avvio immediato
    // ===========================================================
    CORE: {
        label: 'Core',
        priority: 0,
        trigger: { type: 'immediate' },
        images: [
            'skins/espo.webp',        // ← già preloaded via <head>
            'skins/espo-click.webp',  // ← già preloaded via <head>
            'ui/bug.webp',
            'ui/hidden.webp',
            'ui/super-block.webp',
            'ui/star.png',
            'ui/favicon.webp',
            'icons/icon-192.png',
            'icons/icon-512.png',
        ],
        // Dimensione stimata: ~180 KB
    },

    // ===========================================================
    // 📦 SKINS_COMMON — Caricato 3 secondi dopo il boot
    // ===========================================================
    SKINS_COMMON: {
        label: 'Skin Comuni',
        priority: 1,
        trigger: { type: 'afterBoot', delay: 3000 },
        images: [
            'skins/espo3.webp',
            'skins/espo3-click.webp',
            'skins/espobit.webp',
            'skins/espobit-click.webp',
            'skins/espobit-matrix.webp',
            'skins/espobit-matrix-click.webp',
            'skins/espobit-fury.webp',
            'skins/espobit-fury-click.webp',
            'skins/esponatale.webp',
            'skins/esponatale-click.webp',
            'skins/initiale.webp',
            'skins/initiale-click.webp',
        ],
        // Dimensione stimata: ~358 KB
    },

    // ===========================================================
    // 📦 SKINS_RARE — Caricato 15 secondi dopo il boot
    // ===========================================================
    SKINS_RARE: {
        label: 'Skin Rare',
        priority: 2,
        trigger: { type: 'afterBoot', delay: 15000 },
        images: [
            'skins/esporator.webp',
            'skins/esporator-click.webp',
            'skins/esponese.webp',
            'skins/esponese-click.webp',
            'skins/espocorno.webp',
            'skins/espocorno-click.webp',
            'skins/espoclown.webp',
            'skins/espoclown-click.webp',
            'skins/espoachi.webp',
            'skins/espoachi-click.webp',
        ],
        // Dimensione stimata: ~297 KB
    },

    // ===========================================================
    // 📦 SKINS_EPIC — On-demand (caricato all'apertura della modale)
    // ===========================================================
    SKINS_EPIC: {
        label: 'Skin Epic',
        priority: 3,
        trigger: { type: 'onDemand' },
        images: [
            'skins/espofempires.webp',
            'skins/espofempires-click.webp',
            'skins/espowaifu.webp',
            'skins/espowaifu-click.webp',
            'skins/esponge-bob.webp',
            'skins/esponge-bob-click.webp',
            'skins/espokiss.webp',
            'skins/espokiss-click.webp',
            'skins/esportia.webp',       // ~345 KB
            'skins/esportia-click.webp', // ~292 KB
            'skins/pabloespobar.webp',
            'skins/pabloespobar-click.webp',
            'skins/esposa.webp',
            'skins/esposa-click.webp',
        ],
        // Dimensione stimata: ~643 KB
    },

    // ===========================================================
    // 📦 SKINS_LEGENDARY — On-demand (caricato all'apertura della modale)
    // ===========================================================
    SKINS_LEGENDARY: {
        label: 'Skin Legendary',
        priority: 4,
        trigger: { type: 'onDemand' },
        images: [
            'skins/rick-espley.webp',
            'skins/rick-espley-click.webp',
            'skins/ricardo-milespo.webp',
            'skins/ricardo-milespo-click.webp',
            'skins/adolf-espler.webp',
            'skins/adolf-espler-click.webp',
            'skins/freddy-espory.webp',       // ~165 KB
            'skins/freddy-espory-click.webp', // ~203 KB
            'skins/britney-espoars.webp',
            'skins/britney-espoars-click.webp',
            'skins/super-espo.webp',
            'skins/super-espo-click.webp',
            'skins/carmaespon.webp',
            'skins/carmaespon-click.webp',
            'skins/leonsespedy.webp',
            'skins/leonsespedy-click.webp',
            'skins/espoclicker.webp',
            'skins/espoclicker-click.webp',
        ],
        // Dimensione stimata: ~955 KB
    },

    // ===========================================================
    // 📦 THEME_DIVINE — On-demand
    // ===========================================================
    THEME_DIVINE: {
        label: 'Tema Divine',
        priority: 5,
        trigger: { type: 'onDemand' },
        images: [
            'skins/gespo.webp',
            'skins/gespo-click.webp',
            'skins/founder.webp',        // Fondatore (esclusiva pre-lancio)
            'skins/founder-click.webp',
        ],
        // Dimensione stimata: ~300 KB
    },

    // ===========================================================
    // 📦 THEME_FURY — On-demand
    // ⚠️ ~2.2 MB totali — non pre-caricare mai!
    // ===========================================================
    THEME_FURY: {
        label: 'Tema Fury',
        priority: 6,
        trigger: { type: 'onDemand' },
        images: [
            'skins/espo-fury.webp',         // ~1.1 MB
            'skins/espo-fury-click.webp',   // ~1.1 MB
            'skins/super-espofury.webp',
            'skins/super-espofury-click.webp',
        ],
    },

    // ===========================================================
    // 📦 THEME_MATRIX — On-demand
    // ===========================================================
    THEME_MATRIX: {
        label: 'Tema Matrix',
        priority: 7,
        trigger: { type: 'onDemand' },
        images: [
            'skins/espo-matrix.webp',
            'skins/espo-matrix-click.webp',
        ],
        // Dimensione stimata: ~195 KB
    },

    // ===========================================================
    // 📦 THEME_BLUESCREEN — On-demand
    // ===========================================================
    THEME_BLUESCREEN: {
        label: 'Tema Bluescreen',
        priority: 8,
        trigger: { type: 'onDemand' },
        images: [
            'ui/bluescreen.webp', // ~316 KB
        ],
    },

    // ===========================================================
    // 📦 VIDEO_EVENTS — MAI pre-caricare (31 MB totali)
    // Dichiarativo: i video vengono streamati on-demand.
    //
    //   assets/video/bigbang-espoclicker.mp4          11.2 MB
    //   assets/video/britney-espoars-video.mp4         7.6 MB
    //   assets/video/rick-espley-video.mp4             4.3 MB
    //   assets/video/ricardo-milespo-metal-video.mp4   3.4 MB
    //   assets/video/ricardo-milespo-dota-video.mp4    2.6 MB
    //   assets/video/ricardo-milespo-video.mp4         2.2 MB
    // ===========================================================
    VIDEO_EVENTS: {
        label: 'Video Eventi',
        priority: 9,
        trigger: { type: 'onDemand' },
        images: [],
        note: '⚠️ I video (~31 MB) vengono streamati singolarmente on-demand.'
    },

};
