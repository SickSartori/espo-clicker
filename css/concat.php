<?php
// ============================================================
// ESPO CLICKER - CSS Bundle Concatenator
// Uso: css/concat.php?bundle=core&v=2.0.0
//
// Bundle disponibili:
//   core    → keyframes, base, layout, components, navbar, clicker, store
//   ui      → modals-core, modals-content, modals-arcade, skins, skins-modern, podio
//   mobile  → mobile, mobile-simplified
//   arcade  → CSS dei 4 giochi arcade (caricato on-demand)
// ============================================================

define('CSS_BASEPATH', realpath(__DIR__));

$bundles = [
    'core' => [
        'keyframes.css',
        'base.css',
        'layout.css',
        'components.css',
        'navbar.css',
        'clicker.css',
        'store.css',
    ],
    'ui' => [
        'modals-core.css',
        'modals-content.css',
        'modals-arcade.css',
        'skins.css',
        'skins-modern.css',
        'podio.css',
    ],
    'mobile' => [
        'mobile.css',
        'mobile-simplified.css',
    ],
    'arcade' => [
        '../arcade/snake/css/snake.css',
        '../arcade/space/css/space.css',
        '../arcade/asteroids/css/asteroids.css',
        '../arcade/super-espo/css/super-espo.css',
    ],
];

// Sanifica il nome bundle (solo lettere minuscole e trattini)
$bundle = isset($_GET['bundle']) ? preg_replace('/[^a-z\-]/', '', (string)$_GET['bundle']) : 'core';

if (!isset($bundles[$bundle])) {
    http_response_code(404);
    header('Content-Type: text/plain');
    echo 'Bundle non trovato.';
    exit;
}

// Sanifica la versione (solo alfanumerici + punto/trattino)
$version = isset($_GET['v']) ? preg_replace('/[^a-zA-Z0-9.\-]/', '', (string)$_GET['v']) : '1.0';

// Genera ETag basato su bundle + versione
$etag = '"' . md5($bundle . $version) . '"';

// Cache HTTP: 7 giorni, immutabile per quella versione
header('Content-Type: text/css; charset=utf-8');
header('Cache-Control: public, max-age=604800, immutable');
header('ETag: ' . $etag);
header('Vary: Accept-Encoding');

// Risposta 304 se il client ha già la versione corrente
if (isset($_SERVER['HTTP_IF_NONE_MATCH']) && $_SERVER['HTTP_IF_NONE_MATCH'] === $etag) {
    http_response_code(304);
    exit;
}

// Costruisci il CSS concatenato
$output  = "/* ============================================================ */\n";
$output .= "/* ESPO CLICKER - Bundle CSS: [{$bundle}] v{$version}           */\n";
$output .= "/* Generato automaticamente da css/concat.php                  */\n";
$output .= "/* ============================================================ */\n\n";

foreach ($bundles[$bundle] as $file) {
    $filepath = realpath(CSS_BASEPATH . DIRECTORY_SEPARATOR . $file);

    // Sicurezza: il file deve esistere e stare dentro htdocs
    if ($filepath === false || !file_exists($filepath)) {
        $output .= "\n/* [SKIP] File non trovato: {$file} */\n";
        continue;
    }

    // Controllo path traversal: il file deve stare dentro MAMP/htdocs
    $htdocsRoot = realpath(dirname(CSS_BASEPATH));
    if (strpos($filepath, $htdocsRoot) !== 0) {
        $output .= "\n/* [SKIP] Accesso negato: {$file} */\n";
        continue;
    }

    $output .= "\n/* ---- {$file} ---- */\n";
    $output .= file_get_contents($filepath);
    $output .= "\n";
}

// La compressione gzip è gestita da Apache/mod_deflate
// Non comprimiamo manualmente per evitare doppia codifica
echo $output;
?>
