<?php
// ============================================================
// PARAMETRI D'AMBIENTE — Template di riferimento
// ============================================================
// ⚠️ php/config.php NON e' in .gitignore: e' TRACCIATO ed e' gia' nel repo.
//
//    Di conseguenza NON metterci credenziali reali ne' segreti: finirebbero
//    nella storia pubblica del repository, dove restano anche se poi li togli.
//    I secret server-side stanno in php/secrets.php, che e' ignorato da git —
//    vedi php/secrets.example.php.
//
//    Questo template resta come riferimento dei campi attesi.
//    devVersion/prodVersion in config.php sono riscritti in automatico da
//    scripts/bump-version.js, qui possono essere disallineati.
//
// NOTA STORICA: fino alla 3.0 questo file portava anche servername/username/
// password/dbname/port. Erano credenziali MORTE — nessun mysqli ne' PDO nel
// repo le ha mai aperte — precompilate coi default MAMP, e la loro presenza
// faceva credere che il file fosse un file di secret (e quindi gitignored,
// cosa che non e' mai stata). Rimosse nella 3.1: se un giorno servira' un
// database, le credenziali andranno in php/secrets.php, non qui.
// ============================================================

return [
    "instanceName" => "dev", // 'dev' (server di test) oppure 'production'
    "prodHost"     => "espooclicker.altervista.org", // dominio prod
    "devVersion"   => "3.1.0",
    "prodVersion"  => "3.1.0"
];
?>
