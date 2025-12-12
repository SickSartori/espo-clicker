<?php
require_once 'api_bootstrap.php';

$data = getJsonInput();
$user = authenticate($conn, $data['username'], $data['password']);

$serverSaveData = json_decode($user['save_data'], true);
$realScore = isset($serverSaveData['lifetimeScore']) ? floor($serverSaveData['lifetimeScore']) : 0;
$realPrestige = isset($serverSaveData['totalResets']) ? floor($serverSaveData['totalResets']) : 0;

if ($realScore < 0) $realScore = 0;

$stmt = $conn->prepare("
    INSERT INTO $table_leaderboard (username, score, prestigeLevel) 
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE score = ?, prestigeLevel = ?
");

$stmt->bind_param("sidii", $user['username'], $realScore, $realPrestige, $realScore, $realPrestige);
$stmt->execute();

echo json_encode(["status" => "success", "message" => "Classifica aggiornata."]);
$conn->close();
?>