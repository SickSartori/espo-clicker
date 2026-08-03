<?php
// ============================================================
// SECRETS — Template unico della configurazione server-side
// ============================================================
// 1. Copia questo file in: php/secrets.php
// 2. Compila i segnaposto con i valori veri
// 3. php/secrets.php è in .gitignore — committa solo questo .example
//
// ⚠️ php/secrets.php NON esiste nel checkout: essendo gitignored non è nel
//    repo e la CI non lo deploya. Va caricato A MANO su Altervista via FTP,
//    e ri-caricato quando cambia. Se manca, in produzione: il signer R2
//    risponde 500 e gli asset (suoni, video, jukebox) vanno in 404, perché
//    quei file sono esclusi dall'FTP e stanno solo su R2.
//
// Sostituisce i due file storici php/r2-config.php e php/trello-config.php.
// Finché sul server ci sono ancora quelli, il caricatore li usa come
// fallback (vedi php/secrets-load.php): il passaggio si può quindi fare
// con calma, ma va fatto — il fallback verrà rimosso.
//
// NON ci finisce la configurazione Supabase (src/lib/backend-config.ts):
// la anon key DEVE stare nel bundle client ed è pubblica by design,
// protetta da RLS. È configurazione client, non un segreto server-side:
// tenerle separate è voluto.
// ============================================================

return [

    // ────────────────────────────────────────────────────────
    // Whitelist Referer condivisa (anti-hotlink)
    // ────────────────────────────────────────────────────────
    // Dichiarata UNA volta e iniettata in ogni sezione che non ne abbia
    // una propria. Prima era duplicata nei due template, che avevano già
    // iniziato a divergere: quello Trello includeva la variante 'www.',
    // quello R2 no. Lascia [] per disattivare il check (sconsigliato in
    // produzione). Una sezione può comunque dichiararne una propria.
    'allowed_referers' => [
        'https://www.espooclicker.altervista.org/',
        'https://espooclicker.altervista.org/',
        'http://localhost:8888/',
        'http://localhost/',
    ],

    // ────────────────────────────────────────────────────────
    // Cloudflare R2 — asset serviti via presigned URL
    // ────────────────────────────────────────────────────────
    'r2' => [
        // Endpoint S3-compatible (URL "Default" dalla dashboard R2)
        'endpoint'   => 'https://<ACCOUNT_ID>.r2.cloudflarestorage.com',

        // Account ID (visibile in dashboard — non segreto)
        'account_id' => '<ACCOUNT_ID>',

        // Bucket privato con gli asset
        'bucket'     => 'espo-clicker-assets',

        // R2 usa sempre 'auto'
        'region'     => 'auto',

        // Credenziali Account API Token R2 (Object Read & Write o Read only)
        // ⚠️ MAI committare queste chiavi
        'access_key' => 'INSERISCI_ACCESS_KEY_ID_QUI',
        'secret_key' => 'INSERISCI_SECRET_ACCESS_KEY_QUI',

        // Validità degli URL firmati, in secondi (3600 = 1h)
        'url_ttl'    => 3600,
    ],

    // ────────────────────────────────────────────────────────
    // Trello — feature "Segnala" (idee, bug, migliorie)
    // ────────────────────────────────────────────────────────
    'trello' => [
        // Kill-switch lato server: false = endpoint disattivato (503)
        'enabled' => true,

        // Chiave API (semi-pubblica)
        'key'     => 'INSERISCI_TRELLO_KEY_QUI',

        // Token: SEGRETO, dà scrittura sulla board. Mai in git, mai nel client.
        'token'   => 'INSERISCI_TRELLO_TOKEN_QUI',

        // Board "Espòòò Clicker" (identificatore, non segreto)
        'board'   => '691c51303a2c6f44216b9a67',

        // Tipo segnalazione -> ID lista (identificatori, non segreti)
        'lists'   => [
            'idea'        => '691c5227c6e874d96ae21314', // NEW
            'bug'         => '691c521b793036a9d990e7ed', // BUG
            'improvement' => '691c52209e3ceacc465bfe8f', // IMPROVED
        ],

        // Etichette applicate in automatico (identificatori, non segreti).
        // 'test' finisce sulle card create FUORI dalla produzione (locale e
        // area di test): in produzione la card nasce senza etichette, il
        // triage le mette a mano. Togli la voce per disattivare del tutto.
        // Gli ID delle etichette esistenti si leggono aprendo nel browser:
        // https://api.trello.com/1/boards/<board>/labels?key=<key>&token=<token>
        'labels'  => [
            'test' => '6990452738e3477fc17cbc81', // TEST
        ],

        // Limiti anti-spam (troncamento server-side)
        'max_title_len' => 200,
        'max_desc_len'  => 4000,
    ],

];
