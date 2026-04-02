<?php
header('Content-Type: application/json; charset=utf-8');

$dir = 'songs/';
$songs = [];

if (is_dir($dir)) {
    $files = scandir($dir);
    foreach ($files as $file) {
        $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        if (in_array($ext, ['mp3', 'wav', 'ogg'])) {
            $name = pathinfo($file, PATHINFO_FILENAME);
            
            // FIX: Forza la codifica in UTF-8 per i caratteri accentati (es. "Espòòò")
            $name_utf8 = mb_convert_encoding($name, 'UTF-8', 'UTF-8, ISO-8859-1, Windows-1252');
            
            $songs[] = [
                'name' => str_replace(['_', '-'], ' ', $name_utf8),
                // FIX: Codifica il nome del file nell'URL per far funzionare spazi e accenti
                'file'  => $dir . rawurlencode($file)
            ];
        }
    }
}

// FIX: Restituisce un array vuoto di fallback se json_encode fallisce invece di rompersi
$json = json_encode($songs);
echo $json ? $json : '[]';
?>