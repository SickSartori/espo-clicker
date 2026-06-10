<?php
// ============================================================
// CLOUDFLARE R2 — Template di configurazione
// ============================================================
// 1. Copia questo file in: php/r2-config.php
// 2. Compila i placeholder con i tuoi valori
// 3. r2-config.php è in .gitignore — NON committare le chiavi
// ============================================================

return [
    // Endpoint S3-compatible (URL "Default" da dashboard R2)
    'endpoint'    => 'https://<ACCOUNT_ID>.r2.cloudflarestorage.com',

    // Account ID (visibile in dashboard R2 — non segreto)
    'account_id'  => '<ACCOUNT_ID>',

    // Bucket privato dove sono caricati gli asset
    'bucket'      => 'espo-clicker-assets',

    // Region: R2 usa sempre 'auto'
    'region'      => 'auto',

    // Credenziali Account API Token R2 (Object Read & Write o Read only)
    // ⚠️ MAI committare queste chiavi!
    'access_key'  => 'INSERISCI_ACCESS_KEY_ID_QUI',
    'secret_key'  => 'INSERISCI_SECRET_ACCESS_KEY_QUI',

    // Validità degli URL firmati (secondi). 3600 = 1h.
    'url_ttl'     => 3600,

    // Whitelist Referer per get_asset_urls.php (anti-hotlink)
    // Lascia vuoto per disabilitare il check (sconsigliato in production)
    'allowed_referers' => [
        'https://espooclicker.altervista.org/',
        'http://localhost:8888/',
        'http://localhost/',
    ],
];
