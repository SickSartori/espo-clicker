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

require_once __DIR__ . '/../php/secrets-load.php';

$r2SignPath = __DIR__ . '/../php/r2-sign.php';

// Il controllo sui segnaposto sta in secrets_configured(): prima era una
// copia verbatim di quello in get_asset_urls.php, con l'ovvio rischio di
// aggiornarne una sola.
$cfg   = secrets('r2');
$useR2 = file_exists($r2SignPath) && secrets_configured('r2');

if ($useR2) {
    // Modalità R2: lista da songs.json + signed URLs
    $listPath = __DIR__ . '/songs.json';
    $list = file_exists($listPath) ? json_decode(file_get_contents($listPath), true) : [];

    if (is_array($list)) {
        require_once $r2SignPath;

        // Anti-hotlink: stesso check di get_asset_urls.php, che però qui
        // risponde con un array vuoto invece che con un JSON d'errore —
        // per questo la decisione è condivisa ma la risposta no.
        if (!secrets_referer_allowed($cfg)) {
            http_response_code(403);
            echo '[]';
            exit;
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
