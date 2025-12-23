<?php
require_once 'api_bootstrap.php';

$data = getJsonInput();
$user = authenticate($conn, $data['username'], $data['password']);

$serverSaveData = json_decode($user['save_data'], true);
$realScore = isset($serverSaveData['lifetimeScore']) ? floor($serverSaveData['lifetimeScore']) : 0;
$realPrestige = isset($serverSaveData['totalResets']) ? floor($serverSaveData['totalResets']) : 0;

if ($realScore < 0) $realScore = 0;

$stmt = $conn->prepare("
    INSERT INTO $table_leaderboard (username, score, prestigeLevel, timestamp) 
    VALUES (?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE 
        score = GREATEST(score, VALUES(score)), 
        prestigeLevel = GREATEST(prestigeLevel, VALUES(prestigeLevel)),
        timestamp = NOW()
");

$stmt->bind_param("sii", $user['username'], $realScore, $realPrestige);
$stmt->execute();

echo json_encode(["status" => "success", "message" => "Classifica aggiornata."]);
$conn->close();
?>