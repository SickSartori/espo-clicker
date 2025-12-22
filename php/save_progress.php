<?php
require_once 'api_bootstrap.php';

$data = getJsonInput();
$user = authenticate($conn, $data['username'], $data['password']);

if (!isset($data['saveData'])) {
    echo json_encode(["status" => "error", "message" => "Nessun dato."]);
    exit;
}

// 1. Aggiorna il salvataggio compresso
$saveJson = json_encode($data['saveData']);
$stmt = $conn->prepare("UPDATE $table_users SET save_data = ? WHERE id = ?");
$stmt->bind_param("si", $saveJson, $user['id']);
$stmt->execute();

// 2. Aggiorna la Classifica
// La chiave qui è usare $data['score'], NON cercare nel saveData compresso
if (isset($data['score'])) {
    $score = floor($data['score']); // Assicurati sia intero
    $prestige = isset($data['prestige']) ? floor($data['prestige']) : 0;
    
    // Query INSERT ... ON DUPLICATE KEY UPDATE
    $stmtLb = $conn->prepare("
        INSERT INTO $table_leaderboard (username, score, prestigeLevel, timestamp) 
        VALUES (?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE 
            score = GREATEST(score, VALUES(score)), 
            prestigeLevel = GREATEST(prestigeLevel, VALUES(prestigeLevel)),
            timestamp = NOW()
    ");
    
    $stmtLb->bind_param("sii", $user['username'], $score, $prestige);
    $stmtLb->execute();
}

echo json_encode(["status" => "success", "message" => "Salvato"]);
$conn->close();
?>