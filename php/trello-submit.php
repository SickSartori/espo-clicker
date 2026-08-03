<?php
// ============================================================
// TRELLO SUBMIT — Endpoint creazione card dalla feature "Segnala"
// ============================================================
// Input  (POST JSON): { "type": "idea|bug|improvement",
//                       "title": "...", "description": "...",
//                       "website": "" (honeypot anti-bot),
//                       "meta": { username, version, url, lang, screen } }
// Output (JSON):      { "ok": true, "url": "https://trello.com/c/..." }
//                  o  { "error": "..." } con status HTTP >= 400
// ------------------------------------------------------------
// Il TOKEN Trello vive SOLO in php/trello-config.php (gitignored).
// Nessun segreto raggiunge mai il client.
// ============================================================

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

// ── Solo POST ───────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// ── Config ──────────────────────────────────────────────────
require_once __DIR__ . '/secrets-load.php';

$config = secrets('trello');
if (!$config) {
    http_response_code(500);
    echo json_encode(['error' => 'Trello not configured']);
    exit;
}

// Il kill-switch va prima del controllo credenziali: se la feature è spenta
// di proposito, la risposta giusta è 503, non "credenziali mancanti".
if (empty($config['enabled'])) {
    http_response_code(503);
    echo json_encode(['error' => 'Feedback disabled']);
    exit;
}

if (!secrets_configured('trello')) {
    http_response_code(500);
    echo json_encode(['error' => 'Trello credentials missing']);
    exit;
}

// ── Anti-hotlink: Referer whitelist (stesso pattern di get_asset_urls.php) ──
if (!secrets_referer_allowed($config)) {
    http_response_code(403);
    echo json_encode(['error' => 'Forbidden referer']);
    exit;
}

// ── Parsing input ───────────────────────────────────────────
$raw  = file_get_contents('php://input');
$body = json_decode($raw, true);
if (!is_array($body)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON']);
    exit;
}

// Honeypot: se il campo nascosto è compilato è un bot → finge OK, non crea nulla.
if (!empty($body['website'])) {
    echo json_encode(['ok' => true, 'skipped' => true]);
    exit;
}

$type  = isset($body['type'])        ? (string) $body['type']        : '';
$title = isset($body['title'])       ? trim((string) $body['title']) : '';
$desc  = isset($body['description']) ? trim((string) $body['description']) : '';
$meta  = (isset($body['meta']) && is_array($body['meta'])) ? $body['meta'] : [];

$lists = $config['lists'] ?? [];
if (!isset($lists[$type])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid type']);
    exit;
}
$idList = $lists[$type];

$maxTitle = (int) ($config['max_title_len'] ?? 200);
$maxDesc  = (int) ($config['max_desc_len']  ?? 4000);

if (mb_strlen($title) < 3) {
    http_response_code(400);
    echo json_encode(['error' => 'Title too short']);
    exit;
}
$title = mb_substr($title, 0, $maxTitle);
$desc  = mb_substr($desc, 0, $maxDesc);

// ── Composizione card ───────────────────────────────────────
// Prefisso testuale e non emoji: il titolo resta leggibile ovunque Trello lo
// mostri in riga singola (notifiche, ricerca, export) e si puo' cercare per
// "BUG:" senza copiare un carattere che dalla tastiera non si scrive.
$prefix   = ['idea' => 'NUOVO:', 'bug' => 'BUG:', 'improvement' => 'MIGLIORIA:'];
$cardName = trim(($prefix[$type] ?? '') . ' ' . $title);

$ctxUser   = _fbClean($meta['username'] ?? '', 80);
$ctxVer    = _fbClean($meta['version']  ?? '', 40);
$ctxUrl    = _fbClean($meta['url']      ?? '', 500);
$ctxLang   = _fbClean($meta['lang']     ?? '', 16);
$ctxScreen = _fbClean($meta['screen']   ?? '', 24);

$cardDesc  = $desc . "\n\n";
$cardDesc .= "---\n";
$cardDesc .= "**Contesto tecnico** (allegato automaticamente)\n";
if ($ctxUser   !== '') $cardDesc .= "- 👤 Utente: `" . $ctxUser . "`\n";
if ($ctxVer    !== '') $cardDesc .= "- 🎮 Versione: `" . $ctxVer . "`\n";
if ($ctxLang   !== '') $cardDesc .= "- 🗣️ Lingua: `" . $ctxLang . "`\n";
if ($ctxScreen !== '') $cardDesc .= "- 🖥️ Schermo: `" . $ctxScreen . "`\n";
if ($ctxUrl    !== '') $cardDesc .= "- 🌐 URL: " . $ctxUrl . "\n";
$cardDesc .= "- 🕒 Ricevuto: `" . (new DateTime('now', new DateTimeZone('Europe/Rome')))->format('Y-m-d H:i:s T') . "`\n";

// ── Etichette ───────────────────────────────────────────────
// Una card che arriva dalla produzione non porta etichette: la board le usa
// per il triage manuale (versione, stato) e precompilarle sarebbe rumore.
// Fuori dalla produzione invece si', cosi' le prove non si confondono con le
// segnalazioni vere. Discrimina instanceName e non l'host: l'area di test sta
// sullo stesso dominio della prod, in sottocartella, ed e' la CI a ribaltare
// il valore (test.yml -> 'dev', main.yml -> 'production').
$env      = require __DIR__ . '/config.php';
$isProd   = (($env['instanceName'] ?? '') === 'production');
$labels   = $config['labels'] ?? [];
$idLabels = [];
if (!$isProd && !empty($labels['test'])) {
    $idLabels[] = $labels['test'];
}

// ── Chiamata Trello ─────────────────────────────────────────
$result = _fbTrelloCreateCard($config, $idList, $cardName, $cardDesc, $idLabels);

if (!$result['ok']) {
    http_response_code(502);
    echo json_encode([
        'error'  => 'Trello API error',
        'detail' => $result['detail'] ?? ('HTTP ' . ($result['code'] ?? 0)),
    ]);
    exit;
}

$card = json_decode($result['body'] ?? '', true);
echo json_encode([
    'ok'  => true,
    'id'  => $card['id']       ?? null,
    'url' => $card['shortUrl'] ?? null,
]);

// ============================================================
// Helpers
// ============================================================

/** Rimuove caratteri di controllo e tronca. */
function _fbClean($s, $max) {
    $s = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/u', '', (string) $s);
    return mb_substr($s, 0, $max);
}

/** Crea una card via API Trello. Preferisce cURL, fallback stream context. */
function _fbTrelloCreateCard(array $cfg, $idList, $name, $desc, array $idLabels = []) {
    $url    = 'https://api.trello.com/1/cards';
    // CA bundle nel repo (php/cacert.pem): su MAMP/Windows curl.cainfo è vuoto e la
    // verifica SSL fallirebbe ("unable to get local issuer certificate"). Con questo
    // funziona su MAMP e Altervista mantenendo la verifica del certificato ATTIVA.
    $caBundle = is_file(__DIR__ . '/cacert.pem') ? (__DIR__ . '/cacert.pem') : null;
    $params = [
        'key'    => $cfg['key'],
        'token'  => $cfg['token'],
        'idList' => $idList,
        'name'   => $name,
        'desc'   => $desc,
        'pos'    => 'top',
    ];
    // "Card senza etichette" si esprime omettendo il parametro, non mandandolo
    // vuoto: una stringa vuota e' un valore che l'API puo' rifiutare e che
    // comunque non direbbe niente di diverso.
    if ($idLabels) {
        $params['idLabels'] = implode(',', $idLabels);
    }
    $payload = http_build_query($params);

    // cURL (disponibile su MAMP e Altervista).
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $payload,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/x-www-form-urlencoded',
                'Accept: application/json',
            ],
        ]);
        if ($caBundle) curl_setopt($ch, CURLOPT_CAINFO, $caBundle);
        $bodyResp = curl_exec($ch);
        $code     = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err      = curl_error($ch);
        curl_close($ch);
        if ($bodyResp === false) return ['ok' => false, 'code' => 0, 'detail' => $err];
        return ['ok' => ($code >= 200 && $code < 300), 'code' => $code, 'body' => $bodyResp];
    }

    // Fallback: stream context.
    $ctxOpts = ['http' => [
        'method'        => 'POST',
        'header'        => "Content-Type: application/x-www-form-urlencoded\r\nAccept: application/json\r\n",
        'content'       => $payload,
        'timeout'       => 15,
        'ignore_errors' => true,
    ]];
    if ($caBundle) {
        $ctxOpts['ssl'] = ['cafile' => $caBundle, 'verify_peer' => true, 'verify_peer_name' => true];
    }
    $ctx = stream_context_create($ctxOpts);
    $bodyResp = @file_get_contents($url, false, $ctx);
    $code = 0;
    if (isset($http_response_header[0]) && preg_match('#\s(\d{3})\s#', $http_response_header[0], $m)) {
        $code = (int) $m[1];
    }
    if ($bodyResp === false) return ['ok' => false, 'code' => 0, 'detail' => 'request failed'];
    return ['ok' => ($code >= 200 && $code < 300), 'code' => $code, 'body' => $bodyResp];
}
