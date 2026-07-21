<?php
// ============================================================
// TRELLO — Template di configurazione (feature "Segnala")
// ============================================================
// 1. Copia questo file in: php/trello-config.php
// 2. Incolla KEY e TOKEN generati da https://trello.com/power-ups/admin
//    ⚠️ Il TOKEN è SEGRETO (dà scrittura sulla board): MAI committarlo.
// 3. php/trello-config.php è in .gitignore — commit solo di questo .example
// ------------------------------------------------------------
// Board: "Espòòò Clicker" (691c51303a2c6f44216b9a67)
// Liste già pre-compilate: NEW / BUG / IMPROVED.
// ============================================================

return [
    // Kill-switch lato server: false = endpoint disattivato (503).
    'enabled' => true,

    // Chiave API (semi-pubblica).
    'key'   => 'INSERISCI_TRELLO_KEY_QUI',

    // Token (SEGRETO! dà scrittura sulla board) — MAI in git, mai nel client.
    'token' => 'INSERISCI_TRELLO_TOKEN_QUI',

    // Board delle segnalazioni (identificatore, non segreto).
    'board' => '691c51303a2c6f44216b9a67',

    // Mappa tipo-segnalazione -> ID lista Trello (identificatori, non segreti).
    'lists' => [
        'idea'        => '691c5227c6e874d96ae21314', // NEW
        'bug'         => '691c521b793036a9d990e7ed', // BUG
        'improvement' => '691c52209e3ceacc465bfe8f', // IMPROVED
    ],

    // Anti-abuse: accetta solo richieste da questi Referer (come get_asset_urls.php).
    // Lascia [] per disabilitare il check (sconsigliato in produzione).
    'allowed_referers' => [
        'https://www.espooclicker.altervista.org/',
        'https://espooclicker.altervista.org/',
        'http://localhost:8888/',
        'http://localhost/',
    ],

    // Limiti anti-spam (troncamento server-side).
    'max_title_len' => 200,
    'max_desc_len'  => 4000,
];
