<?php
require_once 'db_connect.php';

$input = file_get_contents('php://input');
$data = json_decode($input, true);

$username = $data['username'] ?? '';
$password = $data['password'] ?? ''; // Nuova richiesta
$score = $data['score'] ?? 0;
$prestigeLevel = $data['prestigeLevel'] ?? 0;

if (empty($username) || empty($password)) {
    die(json_encode(["status" => "error", "message" => "Autenticazione mancante."]));
}

// 1. VERIFICA IDENTITÀ (Cruciale)
$check = $conn->prepare("SELECT password_hash FROM $table_users WHERE username = ?");
$check->bind_param("s", $username);
$check->execute();
$res = $check->get_result();

if ($row = $res->fetch_assoc()) {
    if (password_verify($password, $row['password_hash'])) {
        // Password corretta: Possiamo aggiornare la classifica
        
        $stmt = $conn->prepare("
            INSERT INTO $table_leaderboard (username, score, prestigeLevel) 
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE 
            score = GREATEST(score, VALUES(score)),
            prestigeLevel = GREATEST(prestigeLevel, VALUES(prestigeLevel))
        ");
        // Nota: ho aggiunto GREATEST anche per il livello prestigio per sicurezza

        $stmt->bind_param("sii", $username, $score, $prestigeLevel);

        if ($stmt->execute()) {
            echo json_encode(["status" => "success", "message" => "Punteggio salvato."]);
        } else {
            echo json_encode(["status" => "error", "message" => "Errore DB."]);
        }
        $stmt->close();
        
    } else {
        echo json_encode(["status" => "error", "message" => "Password errata - Score rifiutato."]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Utente non trovato."]);
}

$check->close();
$conn->close();
?>