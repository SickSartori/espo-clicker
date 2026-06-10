<?php
// ============================================================
// CONFIG DB + AMBIENTE — Template di configurazione
// ============================================================
// 1. Copia questo file in: php/config.php
// 2. Compila i valori reali del tuo ambiente
// 3. php/config.php e' (o sara') in .gitignore — NON committare le credenziali
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
