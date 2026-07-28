<?php
// ============================================================
// CONFIG DB + AMBIENTE — Template di riferimento
// ============================================================
// ⚠️ php/config.php NON e' in .gitignore: e' TRACCIATO ed e' gia' nel repo,
//    precompilato con i default MAMP (localhost / root / root).
//
//    Di conseguenza NON metterci credenziali reali ne' segreti: finirebbero
//    nella storia pubblica del repository, dove restano anche se poi li togli.
//    Per i valori sensibili usare un file ignorato da git, come gia' si fa con
//    php/r2-config.php e php/trello-config.php.
//
//    Questo template resta come riferimento dei campi attesi.
//    devVersion/prodVersion in config.php sono riscritti in automatico da
//    scripts/bump-version.js, qui possono essere disallineati.
// ============================================================

return [
    "servername"   => "localhost",
    "username"     => "<DB_USER>",
    "password"     => "<DB_PASSWORD>",
    "dbname"       => "<DB_NAME>",
    "port"         => 3306,
    "instanceName" => "dev", // 'dev' (server di test) oppure 'production'
    "devVersion"   => "3.0.11",
    "prodVersion"  => "3.0.11"
];
?>
