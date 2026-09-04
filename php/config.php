<?php
// ============================================================
// PARAMETRI D'AMBIENTE — file TRACCIATO (non è un file di secret)
// ============================================================
// Qui stanno solo i parametri che distinguono dev da produzione.
//
// ⚠️ NON metterci credenziali: questo file è nel repo, quindi finirebbero
//    nella storia pubblica, dove restano anche se poi le togli. I secret
//    server-side vivono in php/secrets.php (gitignored) — il template è
//    php/secrets.example.php.
//
// Resta tracciato di proposito: la CI lo muta via sed durante il deploy
// (instanceName in main.yml, instanceName e prodHost in test.yml) e
// scripts/bump-version.js ne riscrive le due versioni. Deve quindi
// esistere nel checkout, e la formattazione delle righe qui sotto non va
// cambiata: quei sed e quelle regex ci fanno match sopra.
// ============================================================
return [
    "instanceName" => "dev", // 'dev' o 'production'
    "prodHost" => "espooclicker.altervista.org", // dominio prod: dev-mode (errori/cheatboard) disattivato qui anche se instanceName='dev'. Aggiornare se si migra dominio.
    "devVersion" => "3.1.6",
    "prodVersion" => "3.1.6"
];
?>
