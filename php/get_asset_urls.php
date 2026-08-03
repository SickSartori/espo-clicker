<?php
// ============================================================
// GET ASSET URLs — Endpoint batch presigned URL R2
// ============================================================
// Input  (POST JSON): { "paths": ["assets/sounds/click.mp3", ...] }
//                  o (GET)    : ?paths[]=assets/sounds/click.mp3&paths[]=...
// Output (JSON):      { "urls": { "assets/sounds/click.mp3": "https://..." }, "ttl": 3600 }
// ============================================================

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

require_once __DIR__ . '/secrets-load.php';

$config = secrets('r2');

// I due casi restano distinti di proposito: "manca il file" e "il file c'è
// ma non è compilato" hanno rimedi diversi, e questo endpoint è il primo
// posto dove si guarda quando in produzione gli asset vanno in 404.
if (!$config) {
    http_response_code(500);
    echo json_encode(['error' => 'R2 not configured']);
    exit;
}

if (!secrets_configured('r2')) {
    http_response_code(500);
    echo json_encode(['error' => 'R2 credentials missing']);
    exit;
}

// ────────────────────────────────────────────────────────────
// Anti-hotlink: validazione Referer
// ────────────────────────────────────────────────────────────
if (!secrets_referer_allowed($config)) {
    http_response_code(403);
    echo json_encode(['error' => 'Forbidden referer']);
    exit;
}

// ────────────────────────────────────────────────────────────
// Whitelist prefissi: blocca path arbitrari (security)
// ────────────────────────────────────────────────────────────
$ALLOWED_PREFIXES = [
    'assets/sounds/',
    'assets/video/',
    'music/songs/',
];

function _isAllowedPath($path, $prefixes) {
    if (strpos($path, '..') !== false) return false;
    foreach ($prefixes as $p) {
        if (strpos($path, $p) === 0) return true;
    }
    return false;
}

// ────────────────────────────────────────────────────────────
// Parsing input
// ────────────────────────────────────────────────────────────
$paths = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = file_get_contents('php://input');
    $body = json_decode($raw, true);
    if (is_array($body) && isset($body['paths']) && is_array($body['paths'])) {
        $paths = $body['paths'];
    }
} else {
    if (!empty($_GET['paths']) && is_array($_GET['paths'])) {
        $paths = $_GET['paths'];
    }
}

if (empty($paths)) {
    http_response_code(400);
    echo json_encode(['error' => 'No paths provided']);
    exit;
}

// Limite per evitare abuse (ricalibra se serve)
if (count($paths) > 200) {
    http_response_code(400);
    echo json_encode(['error' => 'Too many paths']);
    exit;
}

// ────────────────────────────────────────────────────────────
// Genera signed URLs
// ────────────────────────────────────────────────────────────
require_once __DIR__ . '/r2-sign.php';

try {
    $signer = new R2Signer($config);
    $ttl = (int)($config['url_ttl'] ?? 3600);
    $urls = [];

    foreach ($paths as $p) {
        $p = (string)$p;
        if (!_isAllowedPath($p, $ALLOWED_PREFIXES)) {
            continue; // Skip silenziosamente i path non autorizzati
        }
        $urls[$p] = $signer->presignedGetUrl($p, $ttl);
    }

    echo json_encode([
        'urls'    => $urls,
        'ttl'     => $ttl,
        'expires' => time() + $ttl,
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Signing failed', 'detail' => $e->getMessage()]);
}
