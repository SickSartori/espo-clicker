<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

// ============================================================
// GET_SONGS.PHP
// ------------------------------------------------------------
// Modalità A (locale, MAMP/dev): scandir di songs/ → URL relative
// Modalità B (Altervista, R2 configurato): legge songs.json e
//   genera signed URL R2 per ogni traccia.
// ============================================================

$songs = [];

$r2ConfigPath = __DIR__ . '/../php/r2-config.php';
$r2SignPath   = __DIR__ . '/../php/r2-sign.php';

$useR2 = false;
if (file_exists($r2ConfigPath) && file_exists($r2SignPath)) {
    $cfg = require $r2ConfigPath;
    if (
        !empty($cfg['access_key']) && $cfg['access_key'] !== 'INSERISCI_ACCESS_KEY_ID_QUI' &&
        !empty($cfg['secret_key']) && $cfg['secret_key'] !== 'INSERISCI_SECRET_ACCESS_KEY_QUI'
    ) {
        $useR2 = true;
    }
}

if ($useR2) {
    // Modalità R2: lista da songs.json + signed URLs
    $listPath = __DIR__ . '/songs.json';
    $list = file_exists($listPath) ? json_decode(file_get_contents($listPath), true) : [];

    if (is_array($list)) {
        require_once $r2SignPath;

        // Anti-hotlink: stesso check di get_asset_urls.php
        if (!empty($cfg['allowed_referers'])) {
            $referer = $_SERVER['HTTP_REFERER'] ?? '';
            $ok = false;
            foreach ($cfg['allowed_referers'] as $allowed) {
                if (strpos($referer, $allowed) === 0) { $ok = true; break; }
            }
            if (!$ok) {
                http_response_code(403);
                echo '[]';
                exit;
            }
        }

        try {
            $signer = new R2Signer($cfg);
            $ttl = (int)($cfg['url_ttl'] ?? 3600);

            foreach ($list as $filename) {
                $name = pathinfo($filename, PATHINFO_FILENAME);
                $key  = 'music/songs/' . $filename;
                $songs[] = [
                    'name' => str_replace(['_', '-'], ' ', $name),
                    'file' => $signer->presignedGetUrl($key, $ttl),
                ];
            }
        } catch (Throwable $e) {
            // Se il signing fallisce, restituisci array vuoto
            $songs = [];
        }
    }
} else {
    // Modalità locale: scandir cartella songs/
    $dir = 'songs/';
    if (is_dir($dir)) {
        $files = scandir($dir);
        foreach ($files as $file) {
            $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
            if (in_array($ext, ['mp3', 'wav', 'ogg'])) {
                $name = pathinfo($file, PATHINFO_FILENAME);
                $name_utf8 = mb_convert_encoding($name, 'UTF-8', 'UTF-8, ISO-8859-1, Windows-1252');

                $songs[] = [
                    'name' => str_replace(['_', '-'], ' ', $name_utf8),
                    'file' => $dir . rawurlencode($file),
                ];
            }
        }
    }
}

$json = json_encode($songs);
echo $json ? $json : '[]';
