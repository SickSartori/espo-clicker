<?php
header('Content-Type: application/json');

$dir = 'songs/';
$songs = [];

if (is_dir($dir)) {
    $files = scandir($dir);
    foreach ($files as $file) {
        $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        if (in_array($ext, ['mp3', 'wav', 'ogg'])) {
            $name = pathinfo($file, PATHINFO_FILENAME);
            $songs[] = [
                'name' => str_replace(['_', '-'], ' ', $name),
                'file'  => $dir . $file,
                'source' => 'Local Folder'
            ];
        }
    }
}

echo json_encode($songs);
?>