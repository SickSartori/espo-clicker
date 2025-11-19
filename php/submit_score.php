<?php
include 'db_connect.php';

// Prende i dati inviati dal JavaScript
$data = json_decode(file_get_contents('php://input'), true);

$username = $data['username'];
$score = $data['score'];
$prestigeLevel = $data['prestigeLevel'];

if (empty($username) || !isset($score) || !isset($prestigeLevel)) {
    die(json_encode(["status" => "error", "message" => "Dati invalidi."]));
}

// Inserimento o aggiornamento nella LEADERBOARD dinamica
$stmt = $conn->prepare("
    INSERT INTO $table_leaderboard (username, score, prestigeLevel) 
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE 
    score = GREATEST(score, VALUES(score)),
    prestigeLevel = VALUES(prestigeLevel)
");

$stmt->bind_param("sii", $username, $score, $prestigeLevel);

if ($stmt->execute()) {
    echo json_encode(["status" => "success", "message" => "Punteggio aggiornato!"]);
} else {
    echo json_encode(["status" => "error", "message" => $stmt->error]);
}

$stmt->close();
$conn->close();
?>